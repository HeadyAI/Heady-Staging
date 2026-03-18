'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-meridian';
const PORT = 3425;
const EARTH_R = 6371; // km

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta }) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) { this.name = name; this.state = 'CLOSED'; this.failures = 0; this.threshold = opts.threshold || FIB[8]; this.resetTimeout = opts.resetTimeout || FIB[10] * 1000; this.lastFailure = 0; }
  async execute(fn) {
    if (this.state === 'OPEN') { const elapsed = Date.now() - this.lastFailure; if (elapsed < this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]))) throw new Error(`Circuit ${this.name} OPEN`); this.state = 'HALF_OPEN'; }
    try { const r = await fn(); this.failures = 0; this.state = 'CLOSED'; return r; } catch (e) { this.failures++; this.lastFailure = Date.now(); if (this.failures >= this.threshold) this.state = 'OPEN'; throw e; }
  }
}

const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) { log('info', `${signal} received, graceful shutdown`); while (shutdownHandlers.length) await shutdownHandlers.pop()(); process.exit(0); }
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

class BaseHeadyBee {
  constructor(name) { this.name = name; this.startedAt = Date.now(); this.status = 'idle'; }
  async spawn() { this.status = 'spawned'; log('info', `${this.name} spawned`); }
  async execute() { this.status = 'executing'; }
  async report() { this.status = 'reporting'; }
  async retire() { this.status = 'retired'; log('info', `${this.name} retired`); }
}

/**
 * Haversine distance between two geographic points in kilometers.
 * @param {number} lat1 - Latitude 1 (degrees). @param {number} lon1 - Longitude 1 (degrees).
 * @param {number} lat2 - Latitude 2 (degrees). @param {number} lon2 - Longitude 2 (degrees).
 * @returns {number} Distance in km.
 */
function haversine(lat1, lon1, lat2, lon2) {
  const r = (d) => d * Math.PI / 180;
  const dLat = r(lat2 - lat1), dLon = r(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return parseFloat((EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(3));
}

/**
 * MeridianBee — Global traffic routing with geo-aware load balancing, data residency
 * enforcement, and phi-weighted latency optimization. Route score = 1 / (latency * PHI^loadFactor).
 * Load distributed via phi-weighted pools (Hot=34%, Warm=21%, Cold=13%, Reserve=8%, Governance=5%).
 * @class MeridianBee
 * @extends BaseHeadyBee
 */
class MeridianBee extends BaseHeadyBee {
  constructor() { super('MeridianBee'); this.regions = new Map(); this.residencyRules = new Map(); this.routeHistory = []; }

  /** Register region with endpoints, latency, capacity, and residency rules. */
  registerRegion(data) {
    const id = data.id || crypto.randomUUID();
    const region = { id, name: data.name, lat: data.lat, lon: data.lon, endpoints: data.endpoints || [], latencyMs: data.latencyMs || FIB[8], capacity: data.capacity || FIB[12], currentLoad: 0, residencyRules: data.residencyRules || [], pools: { hot: 0, warm: 0, cold: 0, reserve: 0, governance: 0 }, registeredAt: Date.now() };
    this.regions.set(id, region);
    for (const dc of region.residencyRules) { if (!this.residencyRules.has(dc)) this.residencyRules.set(dc, new Set()); this.residencyRules.get(dc).add(id); }
    log('info', `Region registered: ${region.name}`, { regionId: id });
    return region;
  }

  /** Phi-weighted route score: 1 / (latencyMs * PHI^loadFactor). Higher = better. */
  _score(region) { return parseFloat((1 / (region.latencyMs * Math.pow(PHI, Math.min(region.currentLoad / Math.max(region.capacity, 1), 1)))).toFixed(8)); }

  /**
   * Route request to optimal region. Enforces data residency, scores by geo-proximity and phi-weighted latency.
   * @param {number} clientLat - Client latitude. @param {number} clientLon - Client longitude.
   * @param {string} [dataClass] - Data classification for residency enforcement.
   * @returns {Object} Routing decision with selected region, score, and alternatives.
   */
  routeRequest(clientLat, clientLon, dataClass = null) {
    let candidates = [...this.regions.values()];
    if (dataClass && this.residencyRules.has(dataClass)) {
      const allowed = this.residencyRules.get(dataClass);
      candidates = candidates.filter(r => allowed.has(r.id));
      if (candidates.length === 0) return { error: 'No regions available for data class', dataClass, violation: true };
    }
    const scored = candidates.map(r => {
      const dist = haversine(clientLat, clientLon, r.lat, r.lon);
      const combined = parseFloat((this._score(r) * (1 - (dist / (EARTH_R * Math.PI)) * PSI)).toFixed(8));
      return { region: r, distance: dist, combinedScore: combined };
    }).sort((a, b) => b.combinedScore - a.combinedScore);
    const sel = scored[0];
    this._addLoad(sel.region);
    this.routeHistory.push({ clientLat, clientLon, dataClass, regionId: sel.region.id, score: sel.combinedScore, timestamp: Date.now() });
    if (this.routeHistory.length > FIB[13]) this.routeHistory = this.routeHistory.slice(-FIB[12]);
    return {
      selectedRegion: { id: sel.region.id, name: sel.region.name, lat: sel.region.lat, lon: sel.region.lon },
      distance: sel.distance, score: sel.combinedScore, latencyMs: sel.region.latencyMs, dataClass,
      alternatives: scored.slice(1, FIB[5]).map(s => ({ id: s.region.id, name: s.region.name, score: s.combinedScore, distance: s.distance })),
      routedAt: Date.now(),
    };
  }

  /** Distribute load across phi-weighted pools within a region. */
  _addLoad(r) { r.currentLoad++; const t = r.currentLoad; r.pools = { hot: Math.floor(t * POOLS.HOT), warm: Math.floor(t * POOLS.WARM), cold: Math.floor(t * POOLS.COLD), reserve: Math.floor(t * POOLS.RESERVE), governance: Math.floor(t * POOLS.GOVERNANCE) }; }

  listRegions() { const l = []; for (const r of this.regions.values()) l.push({ id: r.id, name: r.name, lat: r.lat, lon: r.lon, latencyMs: r.latencyMs, capacity: r.capacity, currentLoad: r.currentLoad, loadPercent: parseFloat((r.currentLoad / Math.max(r.capacity, 1) * 100).toFixed(2)), pools: r.pools, endpointCount: r.endpoints.length, residencyRules: r.residencyRules }); return l; }

  /** Get allowed regions for a data class. */
  getResidency(dataClass) {
    const ids = this.residencyRules.get(dataClass);
    if (!ids) return { dataClass, allowedRegions: [], message: 'No residency rules for this data class' };
    const regions = []; for (const id of ids) { const r = this.regions.get(id); if (r) regions.push({ id: r.id, name: r.name, lat: r.lat, lon: r.lon }); }
    return { dataClass, allowedRegions: regions };
  }

  /** Global routing topology with phi-weighted scores and inter-region edges. */
  getTopology() {
    const nodes = [];
    for (const r of this.regions.values()) nodes.push({ id: r.id, name: r.name, lat: r.lat, lon: r.lon, score: this._score(r), latencyMs: r.latencyMs, loadFactor: parseFloat((r.currentLoad / Math.max(r.capacity, 1)).toFixed(4)), pools: r.pools, capacity: r.capacity });
    nodes.sort((a, b) => b.score - a.score);
    const edges = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const d = haversine(nodes[i].lat, nodes[i].lon, nodes[j].lat, nodes[j].lon); edges.push({ from: nodes[i].id, to: nodes[j].id, distance: d, phiWeight: parseFloat((1 / (d * PSI + 1)).toFixed(6)) }); }
    return { nodes, edges, totalRegions: nodes.length, totalRoutes: this.routeHistory.length, generatedAt: Date.now() };
  }

  async execute() { await super.execute(); log('info', 'MeridianBee executing'); }
  async report() { await super.report(); return this.getTopology(); }
  async retire() { await super.retire(); }
}

const app = express();
app.use(express.json());
const bee = new MeridianBee();
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

/** @route GET /health — Service health check with coherence. */
app.get('/health', (_req, res) => {
  const uptime = (Date.now() - bee.startedAt) / 1000;
  res.json({ status: 'ok', service: SERVICE_NAME, uptime, coherence: parseFloat(Math.min(CSL.HIGH, CSL.MEDIUM + (uptime / (uptime + FIB[10])) * (CSL.HIGH - CSL.MEDIUM)).toFixed(6)), timestamp: new Date().toISOString() });
});

/** @route POST /regions — Register region with endpoints and residency rules. */
app.post('/regions', (req, res) => { const { name, lat, lon } = req.body; if (!name || lat === undefined || lon === undefined) return res.status(400).json({ error: 'name, lat, lon required' }); res.status(201).json(bee.registerRegion(req.body)); });

/** @route POST /route — Route request to optimal region (geo + phi-latency + residency). */
app.post('/route', (req, res) => { const { clientLat, clientLon, dataClass } = req.body; if (clientLat === undefined || clientLon === undefined) return res.status(400).json({ error: 'clientLat and clientLon required' }); const d = bee.routeRequest(clientLat, clientLon, dataClass); if (d.violation) return res.status(403).json(d); res.json(d); });

/** @route GET /regions — List all regions with load and latency. */
app.get('/regions', (_req, res) => { res.json(bee.listRegions()); });

/** @route GET /residency/:dataClass — Allowed regions for data class. */
app.get('/residency/:dataClass', (req, res) => { res.json(bee.getResidency(req.params.dataClass)); });

/** @route GET /topology — Global routing topology with phi-weighted scores. */
app.get('/topology', (_req, res) => { res.json(bee.getTopology()); });

bee.spawn().then(() => { bee.execute(); const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening on port ${PORT}`)); onShutdown(() => new Promise(r => server.close(r))); onShutdown(() => bee.retire()); });

module.exports = { MeridianBee, CircuitBreaker, app };
