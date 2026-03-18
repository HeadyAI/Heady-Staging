'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };

const SERVICE_NAME = 'heady-prism-service';
const PORT = 3406;
const startTime = Date.now();

/** Structured JSON logger with correlation ID support. */
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

/** Priority queue entry with phi-weighted ordering. */
class PriorityQueue {
  constructor() { this.items = []; }
  enqueue(item, basePriority, urgencyTier) {
    const effectivePriority = basePriority * Math.pow(PHI, urgencyTier);
    this.items.push({ item, priority: effectivePriority, enqueuedAt: Date.now() });
    this.items.sort((a, b) => b.priority - a.priority);
  }
  dequeue() { return this.items.shift() || null; }
  size() { return this.items.length; }
  peek() { return this.items[0] || null; }
}

/** Escapes special XML characters in a string. */
function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Converts a JSON object to an XML string. */
function jsonToXml(obj, rootTag = 'root') {
  function serialize(value, tag) {
    if (value === null || value === undefined) return `<${tag}/>`;
    if (Array.isArray(value)) return value.map((v, i) => serialize(v, 'item')).join('');
    if (typeof value === 'object') {
      const inner = Object.entries(value).map(([k, v]) => serialize(v, k)).join('');
      return `<${tag}>${inner}</${tag}>`;
    }
    return `<${tag}>${escapeXml(value)}</${tag}>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>${serialize(obj, rootTag)}`;
}

/** Parses a simple XML string into a JSON object. */
function xmlToJson(xml) {
  const stripped = xml.replace(/<\?xml[^?]*\?>/g, '').trim();
  function parse(str) {
    const tagMatch = str.match(/^<([^>/\s]+)([^>]*)>([\s\S]*)<\/\1>$/);
    if (!tagMatch) { const selfClose = str.match(/^<([^>/\s]+)\s*\/>$/); return selfClose ? null : str; }
    const [, tag, , inner] = tagMatch;
    const childPattern = /<([^>/\s]+)(?:[^>]*)>[\s\S]*?<\/\1>|<([^>/\s]+)\s*\/>/g;
    const children = []; let m;
    while ((m = childPattern.exec(inner)) !== null) children.push(m[0]);
    if (children.length === 0) return isNaN(inner) ? inner : Number(inner);
    const result = {};
    for (const child of children) {
      const cTag = child.match(/^<([^>/\s]+)/)[1];
      const parsed = parse(child);
      if (result[cTag] !== undefined) {
        if (!Array.isArray(result[cTag])) result[cTag] = [result[cTag]];
        result[cTag].push(parsed);
      } else { result[cTag] = parsed; }
    }
    return result;
  }
  return parse(stripped);
}

/** Converts a JSON array of objects to a CSV string. */
function jsonToCsv(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => { const v = row[h] === undefined ? '' : String(row[h]); return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v; }).join(','));
  return [headers.join(','), ...rows].join('\n');
}

/** Parses a CSV string into a JSON array of objects. */
function csvToJson(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; } else if (line[i] === ',' && !inQuotes) { values.push(current.trim()); current = ''; } else { current += line[i]; }
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = isNaN(values[idx]) ? values[idx] : Number(values[idx]); });
    return obj;
  });
}

const TRANSFORMERS = {
  'json-csv': { fn: jsonToCsv, coherence: CSL.HIGH },
  'csv-json': { fn: csvToJson, coherence: CSL.HIGH },
  'json-xml': { fn: jsonToXml, coherence: CSL.MEDIUM },
  'xml-json': { fn: xmlToJson, coherence: CSL.MEDIUM },
};

/**
 * PrismBee — Multi-modal data transformation bee.
 * Converts between JSON, XML, CSV formats with phi-weighted priority queues.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class PrismBee {
  constructor() {
    this.queue = new PriorityQueue();
    this.stats = { totalTransforms: 0, totalBytes: 0, avgCoherence: 0 };
    this.breaker = new CircuitBreaker('prism-transform');
  }
  /** Initialize the bee, set up internal state. */
  spawn() { log('info', 'PrismBee spawned', { phase: 'spawn' }); this.spawnedAt = Date.now(); }
  /** Execute a single transformation task from the queue. */
  async execute(task) {
    const key = `${task.fromFormat}-${task.toFormat}`;
    const transformer = TRANSFORMERS[key];
    if (!transformer) throw new Error(`Unsupported format pair: ${key}`);
    return this.breaker.execute(() => {
      const inputSize = JSON.stringify(task.data).length;
      const result = transformer.fn(task.data);
      const outputSize = typeof result === 'string' ? result.length : JSON.stringify(result).length;
      const ratio = outputSize / Math.max(inputSize, 1);
      this.stats.totalTransforms++;
      this.stats.totalBytes += inputSize + outputSize;
      this.stats.avgCoherence = ((this.stats.avgCoherence * (this.stats.totalTransforms - 1)) + transformer.coherence) / this.stats.totalTransforms;
      log('info', 'Transformation complete', { key, inputSize, outputSize, ratio: ratio.toFixed(4), coherence: transformer.coherence });
      return { result, inputSize, outputSize, ratio, coherence: transformer.coherence };
    });
  }
  /** Return current statistics report. */
  report() { return { ...this.stats, queueDepth: this.queue.size(), uptime: Date.now() - this.spawnedAt }; }
  /** Gracefully retire the bee. */
  retire() { log('info', 'PrismBee retiring', { stats: this.stats }); }
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

const bee = new PrismBee();
bee.spawn();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: Date.now() - startTime, coherence: bee.stats.avgCoherence || CSL.HIGH, timestamp: new Date().toISOString() });
});

/** POST /transform — Queue and execute a single data transformation. */
app.post('/transform', async (req, res) => {
  const { data, fromFormat, toFormat, priority } = req.body;
  const cid = req.correlationId;
  if (!data || !fromFormat || !toFormat) return res.status(400).json({ error: 'Missing data, fromFormat, or toFormat' });
  const key = `${fromFormat}-${toFormat}`;
  if (!TRANSFORMERS[key]) return res.status(400).json({ error: `Unsupported format pair: ${key}`, supported: Object.keys(TRANSFORMERS) });
  try {
    const basePriority = priority || FIB[5];
    const urgencyTier = priority >= FIB[8] ? 3 : priority >= FIB[7] ? 2 : priority >= FIB[5] ? 1 : 0;
    bee.queue.enqueue({ data, fromFormat, toFormat, correlationId: cid }, basePriority, urgencyTier);
    const task = bee.queue.dequeue();
    const output = await bee.execute(task.item);
    log('info', 'Transform request processed', { correlationId: cid, fromFormat, toFormat });
    res.json({ id: crypto.randomUUID(), fromFormat, toFormat, ...output, correlationId: cid });
  } catch (err) {
    log('error', 'Transform failed', { correlationId: cid, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/** GET /formats — List all supported format pairs with coherence estimates. */
app.get('/formats', (_req, res) => {
  const formats = Object.entries(TRANSFORMERS).map(([key, val]) => {
    const [from, to] = key.split('-');
    return { from, to, coherence: val.coherence };
  });
  res.json({ formats, count: formats.length });
});

/** POST /batch — Batch transformation with phi-scaled concurrency. */
app.post('/batch', async (req, res) => {
  const { transformations } = req.body;
  const cid = req.correlationId;
  if (!Array.isArray(transformations)) return res.status(400).json({ error: 'transformations must be an array' });
  const maxParallel = FIB[8]; // 21
  const results = [];
  for (let i = 0; i < transformations.length; i += maxParallel) {
    const batch = transformations.slice(i, i + maxParallel);
    const batchResults = await Promise.allSettled(batch.map(t => bee.execute({ data: t.data, fromFormat: t.fromFormat, toFormat: t.toFormat })));
    for (const r of batchResults) {
      results.push(r.status === 'fulfilled' ? { status: 'success', ...r.value } : { status: 'error', error: r.reason.message });
    }
  }
  log('info', 'Batch transform complete', { correlationId: cid, total: transformations.length, succeeded: results.filter(r => r.status === 'success').length });
  res.json({ results, total: results.length, batchCoherence: bee.stats.avgCoherence });
});

const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening`, { port: PORT }));
onShutdown(() => new Promise(resolve => { bee.retire(); server.close(resolve); }));

module.exports = { app, PrismBee, PriorityQueue };
