'use strict';
const express = require('express');
const crypto = require('crypto');
const PORT = 3402;
const SERVICE_NAME = 'heady-chronicle';
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SNAPSHOT_FIBS = FIB.filter(n => n >= FIB[8]);
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
/** @param {string} data - Input to hash. @returns {string} Hex SHA-256 digest. */
function sha256(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
/**
 * ChronicleBee — Event sourcing service with an immutable, hash-chained event log
 * and phi-scaled snapshot intervals at Fibonacci event counts (21, 55, 144, 377...).
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class ChronicleBee {
  constructor() {
    this.events = []; this.snapshots = new Map(); this.sequence = 0;
    this.lastHash = sha256('genesis'); this.breaker = new CircuitBreaker('chronicle-append');
    this.startTime = Date.now(); this.nextSnapshotIdx = 0;
  }
  spawn() { log('info', 'ChronicleBee spawning'); }
  /**
   * Append an event to the immutable log. Computes hash chain and triggers snapshots.
   * @param {string} type - Event type identifier.
   * @param {Object} payload - Event payload data.
   * @param {string} [correlationId] - Optional correlation ID.
   * @returns {{ id: string, sequence: number, hash: string, timestamp: string }}
   */
  appendEvent(type, payload, correlationId) {
    this.sequence++;
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const hash = sha256(`${this.lastHash}:${this.sequence}:${type}:${JSON.stringify(payload)}:${timestamp}`);
    this.events.push({ id, type, payload, timestamp, sequence: this.sequence, hash, previousHash: this.lastHash });
    this.lastHash = hash;
    log('info', `Event appended: ${type} seq=${this.sequence}`, { correlationId });
    this.checkSnapshot();
    return { id, sequence: this.sequence, hash, timestamp };
  }
  /** Check if current sequence matches a Fibonacci snapshot threshold and take snapshot if so. */
  checkSnapshot() {
    const threshold = SNAPSHOT_FIBS[this.nextSnapshotIdx];
    if (threshold !== undefined && this.sequence >= threshold) { this.takeSnapshot(threshold); this.nextSnapshotIdx++; }
  }
  /**
   * Materialize a snapshot of event state at the given sequence.
   * @param {number} atSequence - The triggering sequence number.
   */
  takeSnapshot(atSequence) {
    const typeCounts = {};
    for (const evt of this.events) typeCounts[evt.type] = (typeCounts[evt.type] || 0) + 1;
    const snapshotId = crypto.randomUUID();
    this.snapshots.set(snapshotId, {
      id: snapshotId, sequence: atSequence, timestamp: new Date().toISOString(),
      eventCount: this.events.length, typeCounts, lastHash: this.lastHash, coherence: this.computeCoherence()
    });
    log('info', `Snapshot taken at sequence ${atSequence}`, { snapshotId });
  }
  /** @param {number} since - Replay events from this sequence (inclusive). @returns {Array} */
  replayEvents(since) { return this.events.filter(e => e.sequence >= since); }
  /**
   * Verify the integrity of the entire hash chain.
   * @returns {{ valid: boolean, coherence: number, checked: number, brokenAt: number|null }}
   */
  verifyChain() {
    let prevHash = sha256('genesis');
    for (let i = 0; i < this.events.length; i++) {
      const evt = this.events[i];
      const expected = sha256(`${prevHash}:${evt.sequence}:${evt.type}:${JSON.stringify(evt.payload)}:${evt.timestamp}`);
      if (expected !== evt.hash) return { valid: false, coherence: CSL.MINIMUM, checked: i, brokenAt: evt.sequence };
      prevHash = evt.hash;
    }
    return { valid: true, coherence: this.computeCoherence(), checked: this.events.length, brokenAt: null };
  }
  /** Compute coherence score based on chain integrity ratio scaled by PHI. */
  computeCoherence() {
    if (this.events.length === 0) return CSL.HIGH;
    let prevHash = sha256('genesis'); let valid = 0;
    for (const evt of this.events) {
      const expected = sha256(`${prevHash}:${evt.sequence}:${evt.type}:${JSON.stringify(evt.payload)}:${evt.timestamp}`);
      if (expected === evt.hash) valid++;
      prevHash = evt.hash;
    }
    return parseFloat(Math.min((valid / this.events.length) * PHI, CSL.CRITICAL).toFixed(6));
  }
  execute() { log('info', 'ChronicleBee executing'); }
  report() {
    return { service: SERVICE_NAME, eventCount: this.events.length, snapshotCount: this.snapshots.size,
      sequence: this.sequence, uptime: Date.now() - this.startTime, breakerState: this.breaker.state };
  }
  retire() { log('info', 'ChronicleBee retiring'); }
}
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });
const chronicle = new ChronicleBee();
chronicle.spawn();
chronicle.execute();
app.get('/health', (_req, res) => {
  const r = chronicle.report();
  res.json({ status: 'healthy', service: SERVICE_NAME, uptime: r.uptime, coherence: CSL.HIGH, timestamp: new Date().toISOString() });
});
app.post('/events', async (req, res) => {
  const { type, payload } = req.body;
  if (!type) return res.status(400).json({ error: 'type is required' });
  try {
    const result = await chronicle.breaker.execute(() => chronicle.appendEvent(type, payload || {}, req.correlationId));
    res.status(201).json({ correlationId: req.correlationId, ...result });
  } catch (err) {
    log('error', 'Event append failed', { correlationId: req.correlationId, error: err.message });
    res.status(503).json({ error: err.message });
  }
});
app.get('/events', (req, res) => {
  const since = parseInt(req.query.since, 10) || 1;
  res.json({ correlationId: req.correlationId, count: chronicle.replayEvents(since).length, events: chronicle.replayEvents(since) });
});
app.get('/snapshots/:id', (req, res) => {
  const snapshot = chronicle.snapshots.get(req.params.id);
  if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
  res.json({ correlationId: req.correlationId, snapshot });
});
app.get('/verify', (_req, res) => { res.json(chronicle.verifyChain()); });
const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening on port ${PORT}`));
onShutdown(() => new Promise(resolve => server.close(resolve)));
module.exports = { ChronicleBee, CircuitBreaker };
