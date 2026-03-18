'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };

const SERVICE_NAME = 'heady-flux';
const PORT = 3411;
const BACKPRESSURE_LIMIT = FIB[12]; // 144
const IDEMPOTENCY_TTL = FIB[10] * 1000; // 55s base, phi-decayed

/**
 * Structured JSON logger with correlation ID support.
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [meta={}] - Additional metadata
 */
function log(level, msg, meta = {}) {
  const entry = { timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta };
  delete entry.correlationId;
  entry.correlationId = meta.correlationId || 'system';
  process.stdout.write(JSON.stringify(entry) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failures = 0;
    this.threshold = opts.threshold || FIB[8]; // 21
    this.resetTimeout = opts.resetTimeout || FIB[10] * 1000; // 55s
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
 * Window types with phi-scaled durations.
 * @param {string} type - tumbling | sliding | session
 * @param {number} baseSize - Base window size in ms
 * @returns {number} Phi-scaled window duration in ms
 */
function phiWindowDuration(type, baseSize) {
  const multipliers = { tumbling: PHI, sliding: PSI, session: PHI * PHI };
  return Math.round(baseSize * (multipliers[type] || PHI));
}

/**
 * FluxBee - Stream processing bee for real-time data pipelines.
 * Manages backpressure, phi-scaled windowing, and exactly-once semantics.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class FluxBee {
  constructor() {
    this.streams = new Map();
    this.processedIds = new Map();
    this.circuit = new CircuitBreaker('flux-stream');
    this.startTime = Date.now();
    this.coherence = CSL.HIGH;
  }
  /** Initialize the bee and prepare stream infrastructure. */
  spawn() { log('info', 'FluxBee spawned', { phase: 'spawn' }); }
  /** Main execution loop — managed by Express route handlers. */
  execute() { log('info', 'FluxBee executing', { phase: 'execute' }); }
  /** Generate service report with stream stats. */
  report() {
    const streamStats = {};
    for (const [name, s] of this.streams) {
      streamStats[name] = { queueSize: s.queue.length, windowCount: s.windows.length, throughput: s.throughput };
    }
    return { service: SERVICE_NAME, streams: this.streams.size, stats: streamStats, uptime: Date.now() - this.startTime };
  }
  /** Graceful retirement of the bee. */
  retire() { log('info', 'FluxBee retiring', { phase: 'retire' }); }

  createStream(name, windowType, windowSize) {
    if (this.streams.has(name)) throw new Error(`Stream ${name} already exists`);
    const duration = phiWindowDuration(windowType, windowSize);
    const stream = {
      name, windowType, windowSize: duration, queue: [], windows: [],
      currentWindow: { start: Date.now(), events: [], aggregate: { count: 0, sum: 0, avg: 0, min: Infinity, max: -Infinity } },
      throughput: 0, totalProcessed: 0, backpressure: 0, createdAt: Date.now()
    };
    this.streams.set(name, stream);
    log('info', `Stream created: ${name}`, { windowType, windowSize: duration });
    return stream;
  }

  pushEvent(name, event, idempotencyKey) {
    const stream = this.streams.get(name);
    if (!stream) throw new Error(`Stream ${name} not found`);
    if (idempotencyKey && this.processedIds.has(idempotencyKey)) {
      return { position: -1, deduplicated: true };
    }
    if (idempotencyKey) {
      const ttl = IDEMPOTENCY_TTL * Math.pow(PSI, Math.min(stream.backpressure, FIB[6]));
      this.processedIds.set(idempotencyKey, Date.now() + ttl);
    }
    if (stream.queue.length >= BACKPRESSURE_LIMIT) {
      stream.backpressure = Math.min(stream.backpressure + 1, FIB[7]);
      const acceptRate = Math.pow(PSI, stream.backpressure);
      if (Math.random() > acceptRate) {
        log('warn', `Backpressure drop on ${name}`, { backpressure: stream.backpressure, acceptRate });
        return { position: -1, dropped: true, backpressure: stream.backpressure };
      }
    } else if (stream.backpressure > 0) {
      stream.backpressure = Math.max(0, stream.backpressure - 1);
    }
    const value = typeof event.value === 'number' ? event.value : 0;
    const now = Date.now();
    if (now - stream.currentWindow.start >= stream.windowSize) {
      stream.windows.push({ ...stream.currentWindow, end: now });
      stream.currentWindow = { start: now, events: [], aggregate: { count: 0, sum: 0, avg: 0, min: Infinity, max: -Infinity } };
    }
    stream.queue.push({ ...event, value, timestamp: now });
    const agg = stream.currentWindow.aggregate;
    stream.currentWindow.events.push({ ...event, value, timestamp: now });
    agg.count++;
    agg.sum += value;
    agg.avg = agg.sum / agg.count;
    agg.min = Math.min(agg.min, value);
    agg.max = Math.max(agg.max, value);
    stream.totalProcessed++;
    const elapsed = (now - stream.createdAt) / 1000 || 1;
    stream.throughput = stream.totalProcessed / elapsed;
    this._cleanIdempotencyKeys();
    return { position: stream.totalProcessed, backpressure: stream.backpressure };
  }

  getWindow(name) {
    const stream = this.streams.get(name);
    if (!stream) throw new Error(`Stream ${name} not found`);
    return { windowType: stream.windowType, windowSize: stream.windowSize, current: stream.currentWindow.aggregate, windowStart: stream.currentWindow.start, eventCount: stream.currentWindow.events.length };
  }

  getStats(name) {
    const stream = this.streams.get(name);
    if (!stream) throw new Error(`Stream ${name} not found`);
    return { name: stream.name, throughput: Math.round(stream.throughput * 1000) / 1000, backpressure: stream.backpressure, windowCount: stream.windows.length + 1, totalProcessed: stream.totalProcessed, queueSize: stream.queue.length, acceptRate: Math.pow(PSI, stream.backpressure) };
  }

  _cleanIdempotencyKeys() {
    const now = Date.now();
    for (const [key, expiry] of this.processedIds) {
      if (now > expiry) this.processedIds.delete(key);
    }
  }
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

const bee = new FluxBee();
bee.spawn();
bee.execute();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: process.uptime(), coherence: bee.coherence, timestamp: new Date().toISOString() });
});

app.post('/stream', (req, res) => {
  try {
    const { name, windowType, windowSize } = req.body;
    if (!name || !windowType || !windowSize) return res.status(400).json({ error: 'name, windowType, windowSize required' });
    if (!['tumbling', 'sliding', 'session'].includes(windowType)) return res.status(400).json({ error: 'windowType must be tumbling, sliding, or session' });
    const stream = bee.createStream(name, windowType, windowSize);
    log('info', 'Stream created', { name, correlationId: req.correlationId });
    res.status(201).json({ name: stream.name, windowType: stream.windowType, windowSize: stream.windowSize });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

app.post('/stream/:name/push', async (req, res) => {
  try {
    const result = await bee.circuit.execute(() => {
      const idempotencyKey = req.headers['x-idempotency-key'] || null;
      return bee.pushEvent(req.params.name, req.body, idempotencyKey);
    });
    log('info', 'Event pushed', { stream: req.params.name, correlationId: req.correlationId, position: result.position });
    res.json(result);
  } catch (err) {
    log('error', 'Push failed', { stream: req.params.name, error: err.message, correlationId: req.correlationId });
    res.status(err.message.includes('not found') ? 404 : 503).json({ error: err.message });
  }
});

app.get('/stream/:name/window', (req, res) => {
  try {
    res.json(bee.getWindow(req.params.name));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get('/stream/:name/stats', (req, res) => {
  try {
    res.json(bee.getStats(req.params.name));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

onShutdown(() => { bee.retire(); return Promise.resolve(); });

const server = app.listen(PORT, () => {
  log('info', `${SERVICE_NAME} listening on port ${PORT}`, { port: PORT, pools: POOLS });
});
onShutdown(() => new Promise(resolve => server.close(resolve)));

module.exports = { app, FluxBee, CircuitBreaker, phiWindowDuration };
