'use strict';
const express = require('express');
const crypto = require('crypto');
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-weaver', PORT = 3419, startTime = Date.now();
/** Structured JSON logger with correlation ID support. */
function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta }) + '\n');
}
/** Circuit breaker with phi-scaled exponential backoff. */
class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name; this.state = 'CLOSED'; this.failures = 0;
    this.threshold = opts.threshold || FIB[8]; this.resetTimeout = opts.resetTimeout || FIB[10] * 1000; this.lastFailure = 0;
  }
  async execute(fn) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailure;
      const backoff = this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]));
      if (elapsed < backoff) throw new Error(`Circuit ${this.name} OPEN`);
      this.state = 'HALF_OPEN';
    }
    try { const result = await fn(); this.failures = 0; this.state = 'CLOSED'; return result; } catch (err) {
      this.failures++; this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'OPEN'; throw err;
    }
  }
}
const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) {
  log('info', `${signal} received, graceful shutdown`);
  while (shutdownHandlers.length) await shutdownHandlers.pop()(); process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
/** BaseHeadyBee lifecycle: spawn() -> execute() -> report() -> retire(). */
class BaseHeadyBee {
  constructor(name) { this.name = name; this.status = 'IDLE'; this.spawnedAt = null; }
  async spawn() { this.status = 'SPAWNED'; this.spawnedAt = Date.now(); log('info', `${this.name} spawned`); }
  async execute() { this.status = 'EXECUTING'; }
  async report() { this.status = 'REPORTING'; return { name: this.name, status: this.status, uptime: Date.now() - this.spawnedAt }; }
  async retire() { this.status = 'RETIRED'; log('info', `${this.name} retired`); }
}
/** Cosine similarity between two vectors. Returns 0 for zero-magnitude. @param {number[]} a @param {number[]} b @returns {number} */
function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  magA = Math.sqrt(magA); magB = Math.sqrt(magB);
  return (magA === 0 || magB === 0) ? 0 : dot / (magA * magB);
}
/**
 * WeaverBee — Context assembly agent.
 * Weaves optimal context windows for agents/tasks using phi-weighted priority scoring,
 * cosine-similarity deduplication (CSL.DEDUP threshold), and greedy knapsack packing.
 * @extends BaseHeadyBee
 */
class WeaverBee extends BaseHeadyBee {
  constructor() {
    super('WeaverBee'); this.fragments = new Map(); this.assemblyCount = 0;
    this.breaker = new CircuitBreaker('weaver-assemble');
  }
  /**
   * Add a context fragment. Deduplicates if cosine similarity >= CSL.DEDUP (0.972).
   * @param {string} taskId - Task this fragment belongs to
   * @param {object} fragment - { content, type, priority, tokens, embedding, relevanceBoost }
   * @returns {object} Stored fragment info or dedup notice
   */
  addFragment(taskId, fragment) {
    const id = fragment.id || crypto.randomUUID(), now = Date.now();
    const entry = { id, taskId, content: fragment.content, type: fragment.type || 'text', basePriority: fragment.priority || PSI, tokens: fragment.tokens || 0, embedding: fragment.embedding || [], createdAt: now, relevanceBoost: fragment.relevanceBoost || 0 };
    if (!this.fragments.has(taskId)) this.fragments.set(taskId, []);
    const taskFragments = this.fragments.get(taskId);
    const isDuplicate = taskFragments.some(existing => {
      if (existing.embedding.length > 0 && entry.embedding.length > 0) return cosineSimilarity(existing.embedding, entry.embedding) >= CSL.DEDUP;
      return existing.content === entry.content;
    });
    if (isDuplicate) return { id, taskId, deduplicated: true, reason: `Cosine similarity >= ${CSL.DEDUP}` };
    taskFragments.push(entry);
    if (taskFragments.length > FIB[13]) taskFragments.splice(0, taskFragments.length - FIB[13]);
    return { id, taskId, tokens: entry.tokens, type: entry.type, deduplicated: false };
  }
  /** Phi-weighted priority: basePriority * PHI^relevanceBoost * PSI^ageDecay. */
  _computePriority(fragment) {
    const ageDecay = Math.floor((Date.now() - fragment.createdAt) / (FIB[10] * 1000));
    return fragment.basePriority * Math.pow(PHI, fragment.relevanceBoost) * Math.pow(PSI, Math.min(ageDecay, FIB[7]));
  }
  /**
   * Assemble optimal context via phi-weighted greedy knapsack.
   * @param {string} taskId @param {number} tokenBudget @param {number} minCoherence
   * @returns {object} Assembly result with ordered fragments, token usage, coherence
   */
  assemble(taskId, tokenBudget, minCoherence = CSL.MINIMUM) {
    this.assemblyCount++;
    const available = this.fragments.get(taskId);
    if (!available || !available.length) return { taskId, fragments: [], totalTokens: 0, coherence: 0, tokenBudget, message: 'No fragments available' };
    const scored = available.map(f => ({ ...f, priority: this._computePriority(f), ratio: f.tokens > 0 ? this._computePriority(f) / f.tokens : 0 })).sort((a, b) => b.ratio - a.ratio);
    const selected = []; let usedTokens = 0;
    for (const c of scored) {
      if (c.tokens <= 0 || usedTokens + c.tokens > tokenBudget) continue;
      if (selected.length > 0 && c.embedding.length > 0) {
        const embSel = selected.filter(s => s.embedding.length > 0);
        if (embSel.length > 0) {
          const avgSim = embSel.reduce((sum, s) => sum + cosineSimilarity(s.embedding, c.embedding), 0) / embSel.length;
          if (avgSim < minCoherence && selected.length >= FIB[4]) continue;
        }
      }
      selected.push(c); usedTokens += c.tokens;
    }
    let contextCoherence = 1.0;
    const embFrags = selected.filter(f => f.embedding.length > 0);
    if (embFrags.length >= 2) {
      let totalSim = 0, pairs = 0;
      for (let i = 0; i < embFrags.length; i++) for (let j = i + 1; j < embFrags.length; j++) { totalSim += cosineSimilarity(embFrags[i].embedding, embFrags[j].embedding); pairs++; }
      contextCoherence = pairs > 0 ? Math.round((totalSim / pairs) * 1000) / 1000 : 1.0;
    }
    return {
      taskId, tokenBudget, totalTokens: usedTokens, utilization: Math.round((usedTokens / tokenBudget) * 1000) / 1000,
      coherence: contextCoherence, fragmentCount: selected.length,
      fragments: selected.map(f => ({ id: f.id, type: f.type, tokens: f.tokens, priority: Math.round(f.priority * 1000) / 1000, content: f.content }))
    };
  }
  /** List available fragments for a task with priority scores and content preview. */
  getFragments(taskId) {
    const frags = this.fragments.get(taskId);
    if (!frags) return [];
    return frags.map(f => ({ id: f.id, type: f.type, tokens: f.tokens, priority: Math.round(this._computePriority(f) * 1000) / 1000, createdAt: f.createdAt, contentPreview: f.content.substring(0, FIB[12]) }));
  }
  /** Compute overall weaver coherence from fragment embedding similarity. */
  computeCoherence() {
    let totalCoherence = 0, count = 0;
    for (const [, frags] of this.fragments) {
      const embedded = frags.filter(f => f.embedding.length > 0);
      if (embedded.length < 2) continue;
      let sim = 0, pairs = 0;
      for (let i = 0; i < Math.min(embedded.length, FIB[6]); i++) for (let j = i + 1; j < Math.min(embedded.length, FIB[6]); j++) { sim += cosineSimilarity(embedded[i].embedding, embedded[j].embedding); pairs++; }
      if (pairs > 0) { totalCoherence += sim / pairs; count++; }
    }
    return count > 0 ? Math.round((totalCoherence / count) * 1000) / 1000 : 1.0;
  }
  async execute() { await super.execute(); log('info', 'WeaverBee executing context maintenance'); return { tasks: this.fragments.size, assemblies: this.assemblyCount, coherence: this.computeCoherence() }; }
  async report() { const base = await super.report(); return { ...base, tasks: this.fragments.size, assemblies: this.assemblyCount, coherence: this.computeCoherence() }; }
}
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });
const weaver = new WeaverBee();
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: Date.now() - startTime, coherence: weaver.computeCoherence(), timestamp: new Date().toISOString() });
});
app.post('/fragments', (req, res) => {
  const { taskId, content, type, priority, tokens, embedding, relevanceBoost, id } = req.body;
  if (!taskId || !content) return res.status(400).json({ error: 'taskId and content required' });
  const result = weaver.addFragment(taskId, { id, content, type, priority, tokens: tokens || 0, embedding: embedding || [], relevanceBoost: relevanceBoost || 0 });
  log('info', 'Fragment added', { correlationId: req.correlationId, taskId, deduplicated: result.deduplicated });
  res.status(result.deduplicated ? 200 : 201).json(result);
});
app.post('/assemble', (req, res) => {
  const { task, tokenBudget, minCoherence } = req.body;
  if (!task || !tokenBudget) return res.status(400).json({ error: 'task and tokenBudget required' });
  const result = weaver.assemble(task, tokenBudget, minCoherence || CSL.MINIMUM);
  log('info', 'Context assembled', { correlationId: req.correlationId, task, fragments: result.fragmentCount, tokens: result.totalTokens }); res.json(result);
});
app.get('/fragments/:taskId', (req, res) => {
  const fragments = weaver.getFragments(req.params.taskId);
  log('info', 'Fragments listed', { correlationId: req.correlationId, taskId: req.params.taskId, count: fragments.length });
  res.json({ taskId: req.params.taskId, fragments, count: fragments.length, timestamp: new Date().toISOString() });
});
const server = app.listen(PORT, async () => { await weaver.spawn(); log('info', `${SERVICE_NAME} listening on port ${PORT}`); });
onShutdown(() => new Promise(resolve => server.close(resolve)));
onShutdown(() => weaver.retire());
module.exports = { app, WeaverBee, cosineSimilarity, CircuitBreaker };
