'use strict';
const express = require('express');
const crypto = require('crypto');
const PORT = 3401;
const SERVICE_NAME = 'heady-cortex';
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
/**
 * Structured JSON logger with correlation ID support.
 * @param {'info'|'warn'|'error'|'debug'} level - Log severity level.
 * @param {string} msg - Human-readable log message.
 * @param {Object} [meta={}] - Additional structured metadata.
 */
function log(level, msg, meta = {}) {
  const entry = { timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
}
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
    try {
      const result = await fn();
      this.failures = 0; this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures++; this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'OPEN';
      throw err;
    }
  }
}
const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) {
  log('info', `${signal} received, graceful shutdown`);
  while (shutdownHandlers.length) await shutdownHandlers.pop()();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
/**
 * SynapseMap — stores phi-scaled weighted connections between service pairs.
 * Keys are "source->target" strings, values are { weight, lastUsed, successes, failures }.
 */
class SynapseMap {
  constructor() { this.synapses = new Map(); }
  key(source, target) { return `${source}->${target}`; }
  get(source, target) { return this.synapses.get(this.key(source, target)); }
  set(source, target, data) { this.synapses.set(this.key(source, target), data); }
  ensure(source, target) {
    const k = this.key(source, target);
    if (!this.synapses.has(k)) this.synapses.set(k, { weight: PSI, lastUsed: Date.now(), successes: 0, failures: 0 });
    return this.synapses.get(k);
  }
  strengthen(source, target, latencyRatio) {
    const syn = this.ensure(source, target);
    syn.weight = Math.min(syn.weight + PSI * latencyRatio, PHI);
    syn.successes++; syn.lastUsed = Date.now();
  }
  decay(source, target) {
    const syn = this.ensure(source, target);
    syn.weight = Math.max(syn.weight - PSI * PSI, 0);
    syn.failures++; syn.lastUsed = Date.now();
  }
  prune(threshold) {
    let pruned = 0;
    for (const [k, v] of this.synapses) { if (v.weight < threshold) { this.synapses.delete(k); pruned++; } }
    return pruned;
  }
  allNodes() {
    const nodes = new Set();
    for (const k of this.synapses.keys()) { const [s, t] = k.split('->'); nodes.add(s); nodes.add(t); }
    return [...nodes];
  }
  neighbors(node) {
    const result = [];
    for (const [k, v] of this.synapses) { const [s, t] = k.split('->'); if (s === node) result.push({ target: t, weight: v.weight }); }
    return result;
  }
  toJSON() { const o = {}; for (const [k, v] of this.synapses) o[k] = v; return o; }
}
/**
 * CortexBee — Neural routing cortex that learns optimal service-to-service paths
 * from traffic patterns using Hebbian learning with phi-weighted synapse strengthening.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class CortexBee {
  constructor() {
    this.synapseMap = new SynapseMap(); this.breaker = new CircuitBreaker('cortex-route');
    this.pruneInterval = null; this.routeCount = 0; this.startTime = Date.now();
  }
  /** Initialize the cortex: start the prune timer. */
  spawn() {
    log('info', 'CortexBee spawning');
    this.pruneInterval = setInterval(() => {
      const pruned = this.synapseMap.prune(CSL.MINIMUM);
      if (pruned > 0) log('info', `Pruned ${pruned} synapses below CSL.MINIMUM`);
    }, FIB[10] * 1000);
    onShutdown(() => { clearInterval(this.pruneInterval); log('info', 'Prune interval cleared'); });
  }
  /**
   * Dijkstra over synapse map. Edge cost = PHI/weight so stronger synapses are cheaper.
   * @param {string} source - Origin service name.
   * @param {string} target - Destination service name.
   * @returns {{ path: string[], cost: number, coherence: number }}
   */
  findOptimalPath(source, target) {
    const nodes = this.synapseMap.allNodes();
    if (!nodes.includes(source) || !nodes.includes(target)) return { path: [source, target], cost: PHI, coherence: CSL.MINIMUM };
    const dist = {}; const prev = {}; const visited = new Set();
    for (const n of nodes) { dist[n] = Infinity; prev[n] = null; }
    dist[source] = 0;
    while (true) {
      let u = null; let best = Infinity;
      for (const n of nodes) { if (!visited.has(n) && dist[n] < best) { best = dist[n]; u = n; } }
      if (u === null || u === target) break;
      visited.add(u);
      for (const { target: v, weight } of this.synapseMap.neighbors(u)) {
        const cost = weight > 0 ? (PHI / weight) : Infinity;
        if (dist[u] + cost < dist[v]) { dist[v] = dist[u] + cost; prev[v] = u; }
      }
    }
    const path = []; let cur = target;
    while (cur) { path.unshift(cur); cur = prev[cur]; }
    if (path[0] !== source) return { path: [source, target], cost: PHI, coherence: CSL.MINIMUM };
    const coherence = Math.min(PHI / (dist[target] || PHI), CSL.CRITICAL);
    return { path, cost: dist[target], coherence: parseFloat(coherence.toFixed(6)) };
  }
  /**
   * Record a route outcome — Hebbian learning step.
   * @param {string} source - Origin service.
   * @param {string} target - Destination service.
   * @param {boolean} success - Whether the route succeeded.
   * @param {number} latencyMs - Observed latency in milliseconds.
   */
  learn(source, target, success, latencyMs) {
    const latencyRatio = Math.max(0.01, 1 - (latencyMs / (FIB[10] * 1000)));
    if (success) this.synapseMap.strengthen(source, target, latencyRatio);
    else this.synapseMap.decay(source, target);
    this.routeCount++;
  }
  execute() { log('info', 'CortexBee executing'); }
  report() {
    return { service: SERVICE_NAME, routeCount: this.routeCount, synapseCount: this.synapseMap.synapses.size,
      uptime: Date.now() - this.startTime, breakerState: this.breaker.state };
  }
  retire() { log('info', 'CortexBee retiring'); clearInterval(this.pruneInterval); }
}
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });
const cortex = new CortexBee();
cortex.spawn();
cortex.execute();
app.get('/health', (_req, res) => {
  const r = cortex.report();
  res.json({ status: 'healthy', service: SERVICE_NAME, uptime: r.uptime, coherence: CSL.HIGH, timestamp: new Date().toISOString() });
});
app.post('/route', async (req, res) => {
  const { source, target, context } = req.body;
  if (!source || !target) return res.status(400).json({ error: 'source and target required' });
  try {
    const result = await cortex.breaker.execute(() => {
      const optimal = cortex.findOptimalPath(source, target);
      cortex.learn(source, target, true, context && context.latencyMs ? context.latencyMs : FIB[7]);
      return optimal;
    });
    log('info', 'Route computed', { correlationId: req.correlationId, source, target });
    res.json({ correlationId: req.correlationId, ...result });
  } catch (err) {
    cortex.learn(source, target, false, FIB[10] * 1000);
    log('error', 'Route failed', { correlationId: req.correlationId, error: err.message });
    res.status(503).json({ error: err.message });
  }
});
app.get('/topology', (_req, res) => {
  res.json({ synapses: cortex.synapseMap.toJSON(), nodes: cortex.synapseMap.allNodes(), meta: cortex.report() });
});
const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening on port ${PORT}`));
onShutdown(() => new Promise(resolve => server.close(resolve)));
module.exports = { CortexBee, SynapseMap, CircuitBreaker };
