'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };

const SERVICE_NAME = 'heady-echo';
const PORT = 3413;

/** Phi-bucketed percentile thresholds */
const PHI_PERCENTILES = { p50: 0.500, 'p61.8': PSI, 'p80.9': CSL.MEDIUM, 'p88.2': CSL.HIGH, 'p92.7': CSL.CRITICAL, p99: 0.990 };

/**
 * Structured JSON logger with correlation ID support.
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [meta={}] - Additional metadata
 */
function log(level, msg, meta = {}) {
  const entry = { timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failures = 0;
    this.threshold = opts.threshold || FIB[8];
    this.resetTimeout = opts.resetTimeout || FIB[10] * 1000;
    this.lastFailure = 0;
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
      this.failures++;
      this.lastFailure = Date.now();
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
 * Compute the value at a given percentile from a sorted array.
 * @param {number[]} sorted - Sorted array of durations
 * @param {number} p - Percentile as a fraction (0-1)
 * @returns {number} The value at that percentile
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

/**
 * EchoBee - Distributed tracing aggregator bee.
 * Collects OpenTelemetry-style spans, builds dependency maps,
 * and computes phi-bucketed latency percentiles.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class EchoBee {
  constructor() {
    this.spans = [];
    this.traceIndex = new Map();
    this.serviceLatencies = new Map();
    this.dependencies = new Map();
    this.circuit = new CircuitBreaker('echo-ingest');
    this.startTime = Date.now();
    this.coherence = CSL.HIGH;
  }

  spawn() { log('info', 'EchoBee spawned', { phase: 'spawn' }); }
  execute() { log('info', 'EchoBee executing — trace collection active', { phase: 'execute' }); }
  report() {
    return { service: SERVICE_NAME, totalSpans: this.spans.length, traceCount: this.traceIndex.size, servicesTracked: this.serviceLatencies.size, uptime: Date.now() - this.startTime };
  }
  retire() { log('info', 'EchoBee retiring', { phase: 'retire' }); }

  ingestSpans(batch) {
    const results = [];
    for (const span of batch) {
      const { traceId, spanId, parentSpanId, service, operation, startTime, duration, status } = span;
      if (!traceId || !spanId || !service || !operation) continue;
      const normalized = { traceId, spanId, parentSpanId: parentSpanId || null, service, operation, startTime: startTime || Date.now(), duration: duration || 0, status: status || 'OK' };
      this.spans.push(normalized);
      if (!this.traceIndex.has(traceId)) this.traceIndex.set(traceId, []);
      this.traceIndex.get(traceId).push(normalized);
      if (!this.serviceLatencies.has(service)) this.serviceLatencies.set(service, []);
      this.serviceLatencies.get(service).push(normalized.duration);
      if (parentSpanId) {
        const parentSpan = this._findSpan(traceId, parentSpanId);
        if (parentSpan) {
          const depKey = `${parentSpan.service}->${service}`;
          if (!this.dependencies.has(depKey)) {
            this.dependencies.set(depKey, { source: parentSpan.service, target: service, callCount: 0, totalDuration: 0 });
          }
          const dep = this.dependencies.get(depKey);
          dep.callCount++;
          dep.totalDuration += normalized.duration;
        }
      }
      results.push({ spanId: normalized.spanId, traceId: normalized.traceId, ingested: true });
    }
    log('info', `Ingested ${results.length} spans`, { count: results.length });
    return results;
  }

  _findSpan(traceId, spanId) {
    const traceSpans = this.traceIndex.get(traceId);
    if (!traceSpans) return null;
    return traceSpans.find(s => s.spanId === spanId) || null;
  }

  getTrace(traceId) {
    const spans = this.traceIndex.get(traceId);
    if (!spans || spans.length === 0) throw new Error(`Trace ${traceId} not found`);
    const spanMap = new Map();
    for (const s of spans) spanMap.set(s.spanId, { ...s, children: [] });
    const roots = [];
    for (const s of spanMap.values()) {
      if (s.parentSpanId && spanMap.has(s.parentSpanId)) {
        spanMap.get(s.parentSpanId).children.push(s);
      } else {
        roots.push(s);
      }
    }
    const totalDuration = spans.reduce((max, s) => Math.max(max, s.duration), 0);
    return { traceId, spanCount: spans.length, totalDuration, roots };
  }

  getLatencyPercentiles(service) {
    const durations = this.serviceLatencies.get(service);
    if (!durations || durations.length === 0) throw new Error(`No latency data for service ${service}`);
    const sorted = durations.slice().sort((a, b) => a - b);
    const result = {};
    for (const [label, p] of Object.entries(PHI_PERCENTILES)) {
      result[label] = Math.round(percentile(sorted, p) * 1000) / 1000;
    }
    result.count = sorted.length;
    result.mean = Math.round((sorted.reduce((s, v) => s + v, 0) / sorted.length) * 1000) / 1000;
    return result;
  }

  getDependencies() {
    const deps = [];
    for (const dep of this.dependencies.values()) {
      deps.push({ source: dep.source, target: dep.target, callCount: dep.callCount, avgDuration: Math.round((dep.totalDuration / dep.callCount) * 1000) / 1000 });
    }
    return deps;
  }

  getSlowTraces() {
    const slow = [];
    for (const [traceId, spans] of this.traceIndex) {
      for (const span of spans) {
        const svcDurations = this.serviceLatencies.get(span.service);
        if (!svcDurations || svcDurations.length < 2) continue;
        const sorted = svcDurations.slice().sort((a, b) => a - b);
        const threshold = percentile(sorted, CSL.HIGH);
        if (span.duration > threshold) {
          slow.push({ traceId, spanId: span.spanId, service: span.service, operation: span.operation, duration: span.duration, threshold, exceededBy: Math.round((span.duration - threshold) * 1000) / 1000 });
        }
      }
    }
    return slow.sort((a, b) => b.exceededBy - a.exceededBy);
  }
}

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

const bee = new EchoBee();
bee.spawn();
bee.execute();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: process.uptime(), coherence: bee.coherence, timestamp: new Date().toISOString() });
});

app.post('/spans', async (req, res) => {
  try {
    const spans = Array.isArray(req.body) ? req.body : [req.body];
    const results = await bee.circuit.execute(() => bee.ingestSpans(spans));
    log('info', 'Spans ingested', { count: results.length, correlationId: req.correlationId });
    res.status(201).json({ ingested: results.length, spans: results });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

app.get('/traces/:traceId', (req, res) => {
  try {
    res.json(bee.getTrace(req.params.traceId));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get('/latency/:service', (req, res) => {
  try {
    res.json(bee.getLatencyPercentiles(req.params.service));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get('/dependencies', (_req, res) => { res.json(bee.getDependencies()); });

app.get('/slow', (_req, res) => { res.json(bee.getSlowTraces()); });

onShutdown(() => { bee.retire(); return Promise.resolve(); });
const server = app.listen(PORT, () => {
  log('info', `${SERVICE_NAME} listening on port ${PORT}`, { port: PORT, pools: POOLS });
});
onShutdown(() => new Promise(resolve => server.close(resolve)));

module.exports = { app, EchoBee, percentile };
