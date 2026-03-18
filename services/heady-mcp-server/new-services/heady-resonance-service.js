'use strict';
const express = require('express');
const crypto = require('crypto');
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-resonance', PORT = 3418, startTime = Date.now();
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
/**
 * Compute cosine similarity between two numeric vectors (supports up to 384D).
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Cosine similarity in [-1, 1], 0 for zero-magnitude vectors
 */
function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  magA = Math.sqrt(magA); magB = Math.sqrt(magB);
  return (magA === 0 || magB === 0) ? 0 : dot / (magA * magB);
}
/**
 * ResonanceBee — Cross-service coherence monitoring agent.
 * Computes system-wide coherence as average pairwise cosine similarity
 * of all service state vectors and detects drift beyond CSL thresholds.
 * @extends BaseHeadyBee
 */
class ResonanceBee extends BaseHeadyBee {
  constructor() {
    super('ResonanceBee'); this.serviceStates = new Map(); this.coherenceHistory = [];
    this.breaker = new CircuitBreaker('resonance-compute');
  }
  /** Submit or update a service state vector. */
  submitState(service, vector, timestamp) {
    const entry = { service, vector, timestamp: timestamp || Date.now(), receivedAt: Date.now() };
    if (!this.serviceStates.has(service)) this.serviceStates.set(service, []);
    const history = this.serviceStates.get(service); history.push(entry);
    if (history.length > FIB[12]) history.splice(0, history.length - FIB[12]);
    return entry;
  }
  /** Get the latest state vector for each service. */
  _latestStates() {
    const latest = new Map();
    for (const [svc, entries] of this.serviceStates) { if (entries.length) latest.set(svc, entries[entries.length - 1]); }
    return latest;
  }
  /** Compute per-service coherence scores (avg cosine similarity to all other services). */
  computePerServiceCoherence() {
    const latest = this._latestStates(), services = [...latest.keys()], scores = {};
    if (services.length < 2) { for (const svc of services) scores[svc] = 1.0; return scores; }
    for (const svc of services) {
      const vecA = latest.get(svc).vector; let total = 0, count = 0;
      for (const other of services) { if (other !== svc) { total += cosineSimilarity(vecA, latest.get(other).vector); count++; } }
      scores[svc] = count > 0 ? Math.round((total / count) * 1000) / 1000 : 1.0;
    }
    return scores;
  }
  /** Compute system-wide coherence as average of all pairwise cosine similarities. */
  computeSystemCoherence() {
    const latest = this._latestStates(), services = [...latest.keys()];
    if (services.length < 2) return 1.0;
    let totalSim = 0, pairCount = 0;
    for (let i = 0; i < services.length; i++) {
      for (let j = i + 1; j < services.length; j++) {
        totalSim += cosineSimilarity(latest.get(services[i]).vector, latest.get(services[j]).vector); pairCount++;
      }
    }
    const coherence = pairCount > 0 ? Math.round((totalSim / pairCount) * 1000) / 1000 : 1.0;
    this.coherenceHistory.push({ coherence, timestamp: Date.now(), serviceCount: services.length });
    if (this.coherenceHistory.length > FIB[14]) this.coherenceHistory.splice(0, this.coherenceHistory.length - FIB[14]);
    return coherence;
  }
  /** Detect services that have drifted beyond CSL.MEDIUM from the system mean vector. */
  detectDrift() {
    const latest = this._latestStates(), services = [...latest.keys()];
    if (services.length < 2) return [];
    const dimCount = latest.get(services[0]).vector.length, mean = new Array(dimCount).fill(0);
    for (const svc of services) { const vec = latest.get(svc).vector; for (let i = 0; i < dimCount; i++) mean[i] += vec[i] / services.length; }
    const drifted = [];
    for (const svc of services) {
      const sim = cosineSimilarity(latest.get(svc).vector, mean);
      if (sim < CSL.MEDIUM) {
        const severity = sim < CSL.MINIMUM ? 'CRITICAL' : sim < CSL.LOW ? 'HIGH' : 'MEDIUM';
        drifted.push({ service: svc, similarity: Math.round(sim * 1000) / 1000, threshold: CSL.MEDIUM, severity, deviation: Math.round((CSL.MEDIUM - sim) * 1000) / 1000 });
      }
    }
    return drifted.sort((a, b) => a.similarity - b.similarity);
  }
  /** Return coherence history in phi-bucketed time windows (FIB[5], FIB[7], FIB[9], FIB[11], FIB[13] seconds). */
  getHistory() {
    const now = Date.now();
    const buckets = [FIB[5], FIB[7], FIB[9], FIB[11], FIB[13]];
    return buckets.map(fibVal => {
      const durationMs = fibVal * 1000;
      const entries = this.coherenceHistory.filter(e => (now - e.timestamp) <= durationMs);
      return {
        window: `last_${fibVal}s`, durationMs, count: entries.length,
        avgCoherence: entries.length ? Math.round((entries.reduce((s, e) => s + e.coherence, 0) / entries.length) * 1000) / 1000 : null,
        minCoherence: entries.length ? Math.min(...entries.map(e => e.coherence)) : null,
        maxCoherence: entries.length ? Math.max(...entries.map(e => e.coherence)) : null
      };
    });
  }
  async execute() { await super.execute(); const coherence = this.computeSystemCoherence(); const drift = this.detectDrift(); log('info', 'ResonanceBee coherence check', { coherence, driftCount: drift.length }); return { coherence, drift }; }
  async report() { const base = await super.report(); return { ...base, coherence: this.computeSystemCoherence(), services: this.serviceStates.size }; }
}
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });
const resonance = new ResonanceBee();
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: Date.now() - startTime, coherence: resonance.computeSystemCoherence(), timestamp: new Date().toISOString() });
});
app.post('/state', (req, res) => {
  const { service, vector, timestamp } = req.body;
  if (!service || !Array.isArray(vector)) return res.status(400).json({ error: 'service and vector array required' });
  if (vector.length === 0 || vector.length > FIB[11] * FIB[5]) return res.status(400).json({ error: `vector length must be 1 to ${FIB[11] * FIB[5]}` });
  const entry = resonance.submitState(service, vector, timestamp);
  log('info', 'State vector submitted', { correlationId: req.correlationId, service, dimensions: vector.length });
  res.status(201).json({ service: entry.service, dimensions: entry.vector.length, timestamp: entry.timestamp });
});
app.get('/coherence', (req, res) => {
  const systemCoherence = resonance.computeSystemCoherence(), perService = resonance.computePerServiceCoherence();
  log('info', 'Coherence queried', { correlationId: req.correlationId, systemCoherence });
  res.json({ systemCoherence, perService, serviceCount: Object.keys(perService).length, timestamp: new Date().toISOString() });
});
app.get('/drift', (req, res) => {
  const drifted = resonance.detectDrift();
  log('info', 'Drift check', { correlationId: req.correlationId, driftedCount: drifted.length });
  res.json({ drifted, count: drifted.length, threshold: CSL.MEDIUM, timestamp: new Date().toISOString() });
});
app.get('/history', (req, res) => {
  log('info', 'History queried', { correlationId: req.correlationId });
  res.json({ windows: resonance.getHistory(), timestamp: new Date().toISOString() });
});
const server = app.listen(PORT, async () => { await resonance.spawn(); log('info', `${SERVICE_NAME} listening on port ${PORT}`); });
onShutdown(() => new Promise(resolve => server.close(resolve)));
onShutdown(() => resonance.retire());
module.exports = { app, ResonanceBee, cosineSimilarity, CircuitBreaker };
