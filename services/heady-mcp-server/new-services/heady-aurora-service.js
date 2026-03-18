'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-aurora';
const PORT = 3423;

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

/** Generate phi-scaled bucket sizes: 1s, 1.618s, 2.618s, 4.236s, 6.854s... */
function phiBuckets(baseMs, count) { const b = []; let s = baseMs; for (let i = 0; i < count; i++) { b.push(Math.round(s)); s *= PHI; } return b; }

/**
 * AuroraBee — Real-time dashboard aggregation. Collects metrics from all services,
 * stores phi-bucketed time-series data, supports sum/avg/min/max/count/p50/p99.
 * @class AuroraBee
 * @extends BaseHeadyBee
 */
class AuroraBee extends BaseHeadyBee {
  constructor() { super('AuroraBee'); this.metrics = new Map(); this.dashboards = new Map(); this.services = new Map(); this.buckets = phiBuckets(1000, FIB[7]); }

  /** Ingest a batch of metrics: [{ name, value, tags, timestamp }]. */
  ingestBatch(batch) {
    let ingested = 0;
    for (const { name, value, tags, timestamp } of batch) {
      if (!name || value === undefined) continue;
      if (!this.metrics.has(name)) this.metrics.set(name, { name, points: [], tags: new Set(), firstSeen: Date.now() });
      const series = this.metrics.get(name);
      series.points.push({ value: parseFloat(value), timestamp: timestamp || Date.now(), tags: tags || {} });
      if (tags) { Object.keys(tags).forEach(t => series.tags.add(t)); if (tags.service) this.services.set(tags.service, { name: tags.service, lastSeen: Date.now(), metricCount: (this.services.get(tags.service)?.metricCount || 0) + 1 }); }
      ingested++;
    }
    this._downsample();
    return { ingested, dropped: batch.length - ingested };
  }

  /** Query metrics with aggregation over phi-bucketed time windows. */
  queryMetrics(metric, from, to, aggregation = 'avg', bucketSize = null) {
    const series = this.metrics.get(metric);
    if (!series) return { metric, buckets: [], total: 0 };
    const pts = series.points.filter(p => p.timestamp >= from && p.timestamp <= to);
    const bSize = bucketSize || this._selectBucket(to - from);
    const result = [];
    for (let start = from; start < to; start += bSize) {
      const end = Math.min(start + bSize, to);
      const vals = pts.filter(p => p.timestamp >= start && p.timestamp < end).map(p => p.value);
      result.push({ start, end, value: this._agg(vals, aggregation), count: vals.length });
    }
    return { metric, from, to, aggregation, bucketSize: bSize, buckets: result, total: pts.length };
  }

  _selectBucket(rangeMs) { const ideal = rangeMs / FIB[8]; let best = this.buckets[0]; for (const b of this.buckets) { if (b <= ideal) best = b; else break; } return best; }

  /** Aggregation: sum, avg, min, max, count, p50, p99. */
  _agg(vals, fn) {
    if (vals.length === 0) return null;
    const sorted = [...vals].sort((a, b) => a - b);
    switch (fn) {
      case 'sum': return parseFloat(vals.reduce((a, b) => a + b, 0).toFixed(6));
      case 'avg': return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(6));
      case 'min': return sorted[0];
      case 'max': return sorted[sorted.length - 1];
      case 'count': return vals.length;
      case 'p50': return sorted[Math.floor(sorted.length * PSI)];
      case 'p99': return sorted[Math.min(Math.floor(sorted.length * CSL.DEDUP), sorted.length - 1)];
      default: return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(6));
    }
  }

  /** Phi-bucketed downsampling: older data gets coarser buckets. */
  _downsample() {
    const now = Date.now();
    const hotWindow = FIB[13] * 1000; // 233s
    for (const [, series] of this.metrics) {
      if (series.points.length <= FIB[10] * FIB[8]) continue;
      const hot = series.points.filter(p => now - p.timestamp < hotWindow);
      const cold = series.points.filter(p => now - p.timestamp >= hotWindow);
      if (cold.length <= FIB[8]) continue;
      const coarse = this.buckets[Math.min(FIB[5], this.buckets.length - 1)];
      const ds = [];
      for (let s = cold[0].timestamp; s < cold[cold.length - 1].timestamp; s += coarse) {
        const inB = cold.filter(p => p.timestamp >= s && p.timestamp < s + coarse);
        if (inB.length > 0) ds.push({ value: parseFloat((inB.reduce((a, p) => a + p.value, 0) / inB.length).toFixed(6)), timestamp: s + coarse / 2, tags: inB[0].tags });
      }
      series.points = [...ds, ...hot];
    }
  }

  /** Create a dashboard configuration with metric queries. */
  createDashboard(name, queries, layout = {}) {
    const id = crypto.randomUUID();
    const d = { id, name, queries: queries || [], layout, createdAt: Date.now() };
    this.dashboards.set(id, d);
    return d;
  }

  /** Get dashboard with resolved metric data for each query. */
  resolveDashboard(id) {
    const d = this.dashboards.get(id);
    if (!d) throw new Error(`Dashboard ${id} not found`);
    const now = Date.now();
    const resolved = d.queries.map(q => ({ ...q, data: this.queryMetrics(q.metric, q.from || now - FIB[12] * 1000, q.to || now, q.aggregation, q.bucketSize) }));
    return { ...d, resolvedQueries: resolved };
  }

  listServices() { const list = []; for (const [, s] of this.services) list.push({ ...s, stale: Date.now() - s.lastSeen > FIB[10] * 1000 }); return list; }
  async execute() { await super.execute(); log('info', 'AuroraBee executing'); }
  async report() { await super.report(); return { metricsCount: this.metrics.size, dashboardsCount: this.dashboards.size, servicesCount: this.services.size }; }
  async retire() { await super.retire(); }
}

const app = express();
app.use(express.json());
const bee = new AuroraBee();
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

/** @route GET /health — Service health check with coherence. */
app.get('/health', (_req, res) => {
  const uptime = (Date.now() - bee.startedAt) / 1000;
  res.json({ status: 'ok', service: SERVICE_NAME, uptime, coherence: parseFloat(Math.min(CSL.HIGH, CSL.MEDIUM + (uptime / (uptime + FIB[10])) * (CSL.HIGH - CSL.MEDIUM)).toFixed(6)), timestamp: new Date().toISOString() });
});

/** @route POST /metrics — Ingest metric data points batch. */
app.post('/metrics', (req, res) => { res.json(bee.ingestBatch(Array.isArray(req.body) ? req.body : [req.body])); });

/** @route GET /query — Query metrics with aggregation and bucketing. */
app.get('/query', (req, res) => {
  const { metric, from, to, aggregation, bucketSize } = req.query;
  if (!metric) return res.status(400).json({ error: 'Metric name required' });
  res.json(bee.queryMetrics(metric, parseInt(from) || Date.now() - FIB[12] * 1000, parseInt(to) || Date.now(), aggregation || 'avg', bucketSize ? parseInt(bucketSize) : null));
});

/** @route POST /dashboards — Create dashboard config. */
app.post('/dashboards', (req, res) => { if (!req.body.name) return res.status(400).json({ error: 'Dashboard name required' }); res.status(201).json(bee.createDashboard(req.body.name, req.body.queries, req.body.layout)); });

/** @route GET /dashboards/:id — Get dashboard with resolved metric data. */
app.get('/dashboards/:id', (req, res) => { try { res.json(bee.resolveDashboard(req.params.id)); } catch (e) { res.status(404).json({ error: e.message }); } });

/** @route GET /services — List all services reporting metrics. */
app.get('/services', (_req, res) => { res.json(bee.listServices()); });

bee.spawn().then(() => { bee.execute(); const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening on port ${PORT}`)); onShutdown(() => new Promise(r => server.close(r))); onShutdown(() => bee.retire()); });

module.exports = { AuroraBee, CircuitBreaker, app };
