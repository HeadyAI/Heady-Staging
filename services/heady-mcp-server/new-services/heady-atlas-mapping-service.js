'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-atlas-mapping-service';
const PORT = 3410;
const startTime = Date.now();

/** Structured JSON logger with correlation ID support. */
function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta }) + '\n');
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
    try { const result = await fn(); this.failures = 0; this.state = 'CLOSED'; return result; }
    catch (err) { this.failures++; this.lastFailure = Date.now(); if (this.failures >= this.threshold) this.state = 'OPEN'; throw err; }
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
 * AtlasMappingBee — Dependency graph mapper with phi-weighted edge costs.
 * Maps inter-service dependencies, detects cycles, computes topology and critical paths.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class AtlasMappingBee {
  constructor() {
    this.adjacency = new Map();
    this.nodes = new Set();
    this.breaker = new CircuitBreaker('atlas-graph');
    this.stats = { dependencies: 0, queries: 0, cycleChecks: 0 };
  }
  /** Initialize the bee. */
  spawn() { log('info', 'AtlasMappingBee spawned', { phase: 'spawn' }); this.spawnedAt = Date.now(); }
  /**
   * Execute dependency registration.
   * @param {{ from: string, to: string, type: string, weight: number }} dep
   * @returns {object} Registered dependency with phi-weighted cost.
   */
  async execute(dep) {
    const { from, to, type, weight } = dep;
    this.nodes.add(from); this.nodes.add(to);
    if (!this.adjacency.has(from)) this.adjacency.set(from, []);
    const phiWeight = (weight || 1) * PHI;
    const existing = this.adjacency.get(from).find(e => e.to === to);
    if (existing) { existing.type = type || existing.type; existing.weight = weight || existing.weight; existing.phiWeight = phiWeight; }
    else { this.adjacency.get(from).push({ to, type: type || 'depends_on', weight: weight || 1, phiWeight, createdAt: Date.now() }); this.stats.dependencies++; }
    if (!this.adjacency.has(to)) this.adjacency.set(to, []);
    log('info', 'Dependency registered', { from, to, type, phiWeight: phiWeight.toFixed(4) });
    return { from, to, type: type || 'depends_on', weight: weight || 1, phiWeight: parseFloat(phiWeight.toFixed(6)) };
  }
  /** Return the full dependency graph as adjacency list with metadata. */
  getGraph() {
    const graph = {};
    for (const [node, edges] of this.adjacency) graph[node] = edges.map(e => ({ to: e.to, type: e.type, weight: e.weight, phiWeight: parseFloat(e.phiWeight.toFixed(6)) }));
    const totalEdges = this.stats.dependencies;
    const cycles = this.detectCycles();
    const coherence = totalEdges > 0 ? 1 - (cycles.length / totalEdges) : 1.0;
    return { nodes: [...this.nodes], edges: graph, totalNodes: this.nodes.size, totalEdges, cycles: cycles.length, coherence: parseFloat(Math.max(0, coherence).toFixed(6)), healthy: coherence >= CSL.HIGH };
  }
  /**
   * Shortest path using Dijkstra with phi-weighted edges.
   * @param {string} from - Source node.
   * @param {string} to - Target node.
   * @returns {object|null} Path with nodes, total cost, and hop count.
   */
  shortestPath(from, to) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return null;
    this.stats.queries++;
    const dist = new Map(), prev = new Map(), visited = new Set();
    for (const node of this.nodes) dist.set(node, Infinity);
    dist.set(from, 0);
    while (true) {
      let current = null, minDist = Infinity;
      for (const [node, d] of dist) { if (!visited.has(node) && d < minDist) { current = node; minDist = d; } }
      if (current === null || current === to) break;
      visited.add(current);
      for (const edge of (this.adjacency.get(current) || [])) {
        const alt = dist.get(current) + edge.phiWeight;
        if (alt < dist.get(edge.to)) { dist.set(edge.to, alt); prev.set(edge.to, current); }
      }
    }
    if (dist.get(to) === Infinity) return { from, to, path: null, reachable: false };
    const path = []; let step = to;
    while (step !== undefined) { path.unshift(step); step = prev.get(step); }
    return { from, to, path, totalCost: parseFloat(dist.get(to).toFixed(6)), hops: path.length - 1, reachable: true };
  }
  /**
   * Detect all circular dependencies using DFS-based cycle detection.
   * @returns {string[][]} Array of cycles, each cycle is an array of node names.
   */
  detectCycles() {
    this.stats.cycleChecks++;
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map(), parent = new Map(), cycles = [];
    for (const node of this.nodes) color.set(node, WHITE);
    const dfs = (u) => {
      color.set(u, GRAY);
      for (const edge of (this.adjacency.get(u) || [])) {
        const v = edge.to;
        if (color.get(v) === GRAY) {
          const cycle = [v]; let cur = u;
          while (cur !== v) { cycle.unshift(cur); cur = parent.get(cur); if (cur === undefined) break; }
          cycle.push(v); cycles.push(cycle);
        } else if (color.get(v) === WHITE) { parent.set(v, u); dfs(v); }
      }
      color.set(u, BLACK);
    };
    for (const node of this.nodes) { if (color.get(node) === WHITE) dfs(node); }
    return cycles;
  }
  /**
   * Identify critical path services by weighted degree centrality.
   * Score = (inDegree + outDegree) * PHI + sum(phi-weighted edges).
   * @returns {object[]} Services sorted by criticality score.
   */
  getCriticalServices() {
    const scores = new Map();
    for (const node of this.nodes) scores.set(node, { node, inDegree: 0, outDegree: 0, totalPhiWeight: 0, score: 0 });
    for (const [from, edges] of this.adjacency) {
      const fs = scores.get(from); fs.outDegree += edges.length;
      for (const edge of edges) { fs.totalPhiWeight += edge.phiWeight; const ts = scores.get(edge.to); if (ts) ts.inDegree++; }
    }
    for (const [, d] of scores) d.score = parseFloat(((d.inDegree + d.outDegree) * PHI + d.totalPhiWeight).toFixed(6));
    return [...scores.values()].sort((a, b) => b.score - a.score);
  }
  /**
   * Topological sort using Kahn's algorithm. Detects layers for parallel execution.
   * @returns {{ layers: string[][], sorted: string[], hasCycles: boolean }}
   */
  topologicalSort() {
    const inDegree = new Map();
    for (const node of this.nodes) inDegree.set(node, 0);
    for (const [, edges] of this.adjacency) { for (const edge of edges) inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1); }
    const queue = [], layers = [], sorted = [];
    for (const [node, deg] of inDegree) { if (deg === 0) queue.push(node); }
    while (queue.length > 0) {
      const layer = [...queue]; layers.push(layer); queue.length = 0;
      for (const node of layer) {
        sorted.push(node);
        for (const edge of (this.adjacency.get(node) || [])) { inDegree.set(edge.to, inDegree.get(edge.to) - 1); if (inDegree.get(edge.to) === 0) queue.push(edge.to); }
      }
    }
    return { layers, sorted, hasCycles: sorted.length < this.nodes.size, totalNodes: this.nodes.size, processedNodes: sorted.length };
  }
  /** Return statistics report. */
  report() { const g = this.getGraph(); return { ...this.stats, totalNodes: this.nodes.size, coherence: g.coherence, healthy: g.healthy, uptime: Date.now() - this.spawnedAt }; }
  /** Retire the bee. */
  retire() { log('info', 'AtlasMappingBee retiring', { stats: this.stats }); }
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });
const bee = new AtlasMappingBee();
bee.spawn();

app.get('/health', (_req, res) => {
  const r = bee.report();
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: Date.now() - startTime, coherence: r.coherence, timestamp: new Date().toISOString() });
});
/** POST /dependency — Register a service dependency with phi-weighted cost. */
app.post('/dependency', async (req, res) => {
  const { from, to, type, weight } = req.body;
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
  try { const result = await bee.execute({ from, to, type, weight }); log('info', 'Dependency registered via API', { correlationId: req.correlationId, from, to }); res.status(201).json(result); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
/** GET /graph — Return full dependency graph with adjacency list and metadata. */
app.get('/graph', (_req, res) => { res.json(bee.getGraph()); });
/** GET /path/:from/:to — Shortest path using Dijkstra with phi-weights. */
app.get('/path/:from/:to', (req, res) => {
  const result = bee.shortestPath(req.params.from, req.params.to);
  if (!result) return res.status(404).json({ error: 'One or both nodes not found' });
  res.json(result);
});
/** GET /cycles — Detect and return all circular dependencies (DFS-based). */
app.get('/cycles', (_req, res) => {
  const cycles = bee.detectCycles();
  const totalEdges = bee.stats.dependencies;
  const coherence = totalEdges > 0 ? 1 - (cycles.length / totalEdges) : 1.0;
  res.json({ cycles, count: cycles.length, coherence: parseFloat(Math.max(0, coherence).toFixed(6)), healthy: coherence >= CSL.HIGH });
});
/** GET /critical — Identify critical path services weighted by phi-degree centrality. */
app.get('/critical', (_req, res) => { res.json({ services: bee.getCriticalServices(), count: bee.nodes.size }); });
/** GET /topology — Topological sort of all services with layer detection. */
app.get('/topology', (_req, res) => { res.json(bee.topologicalSort()); });

const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening`, { port: PORT }));
onShutdown(() => new Promise(resolve => { bee.retire(); server.close(resolve); }));
module.exports = { app, AtlasMappingBee };
