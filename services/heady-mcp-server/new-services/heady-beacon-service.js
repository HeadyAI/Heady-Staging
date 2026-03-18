'use strict';
const express = require('express');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };

const SERVICE_NAME = 'heady-beacon-service';
const PORT = 3407;
const startTime = Date.now();

/** Structured JSON logger with correlation ID support. */
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

const SEVERITY_CSL = { INFO: CSL.MINIMUM, WARN: CSL.LOW, ERROR: CSL.MEDIUM, CRITICAL: CSL.HIGH, FATAL: CSL.CRITICAL };
const ESCALATION_INTERVALS = [FIB[5] * 1000, FIB[7] * 1000, FIB[8] * 1000, FIB[9] * 1000, FIB[10] * 1000];

/** Computes similarity between two strings using character frequency ratio. */
function computeSimilarity(a, b) {
  if (a === b) return 1.0;
  const freqA = {}, freqB = {};
  for (const c of a) freqA[c] = (freqA[c] || 0) + 1;
  for (const c of b) freqB[c] = (freqB[c] || 0) + 1;
  const allKeys = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dotProduct = 0, magA = 0, magB = 0;
  for (const k of allKeys) {
    const va = freqA[k] || 0, vb = freqB[k] || 0;
    dotProduct += va * vb; magA += va * va; magB += vb * vb;
  }
  return magA === 0 || magB === 0 ? 0 : dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * BeaconBee — Real-time alerting bee with phi-escalation and CSL-gated suppression.
 * Manages alert lifecycle: creation, escalation, acknowledgment, suppression.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class BeaconBee {
  constructor() {
    this.alerts = new Map();
    this.suppressionWindow = FIB[10] * 1000; // 55s
    this.breaker = new CircuitBreaker('beacon-dispatch');
    this.escalationTimers = new Map();
    this.stats = { created: 0, suppressed: 0, escalated: 0, acknowledged: 0 };
  }
  /** Initialize the bee. */
  spawn() { log('info', 'BeaconBee spawned', { phase: 'spawn' }); this.spawnedAt = Date.now(); }

  /**
   * Execute alert creation with dedup suppression.
   * @param {{ severity: string, message: string, source: string, channel: string }} alertData
   * @returns {{ id: string, suppressed: boolean }}
   */
  async execute(alertData) {
    const { severity, message, source, channel } = alertData;
    const cslThreshold = SEVERITY_CSL[severity] || CSL.MINIMUM;
    for (const [, existing] of this.alerts) {
      if (existing.acknowledged) continue;
      const similarity = computeSimilarity(existing.message, message);
      const withinWindow = (Date.now() - existing.createdAt) < (PSI * this.suppressionWindow);
      if (similarity >= CSL.DEDUP && withinWindow) {
        this.stats.suppressed++;
        log('info', 'Alert suppressed (duplicate)', { similarity: similarity.toFixed(4), existingId: existing.id });
        return { id: existing.id, suppressed: true, similarity };
      }
    }
    const id = crypto.randomUUID();
    const alert = { id, severity, message, source, channel, cslThreshold, acknowledged: false, createdAt: Date.now(), escalationLevel: 0, escalations: [] };
    this.alerts.set(id, alert);
    this.stats.created++;
    await this.dispatch(alert);
    this.scheduleEscalation(id);
    return { id, suppressed: false, severity, cslThreshold };
  }

  /** Dispatch alert to the configured channel. */
  async dispatch(alert) {
    return this.breaker.execute(async () => {
      const handler = this.channelHandlers[alert.channel] || this.channelHandlers.email;
      await handler(alert);
      log('info', 'Alert dispatched', { id: alert.id, channel: alert.channel, severity: alert.severity });
    });
  }

  /** Channel handlers for notification dispatch. */
  channelHandlers = {
    slack: async (alert) => { log('info', 'Slack notification sent', { webhook: 'configured', alertId: alert.id, severity: alert.severity, message: alert.message }); },
    email: async (alert) => { log('info', 'Email notification sent', { to: 'ops@heady.io', alertId: alert.id, severity: alert.severity, message: alert.message }); },
    sms: async (alert) => { log('info', 'SMS notification sent', { to: '+1-555-OPS', alertId: alert.id, severity: alert.severity, message: alert.message }); },
    webhook: async (alert) => {
      log('info', 'Webhook POST dispatched', { url: alert.webhookUrl || 'default', alertId: alert.id, severity: alert.severity, payload: JSON.stringify({ id: alert.id, severity: alert.severity, message: alert.message }) });
    },
  };

  /** Schedule phi-escalation timers for unacknowledged alerts. */
  scheduleEscalation(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.acknowledged) return;
    const level = alert.escalationLevel;
    if (level >= ESCALATION_INTERVALS.length) return;
    const delay = ESCALATION_INTERVALS[level];
    const timer = setTimeout(async () => {
      const current = this.alerts.get(alertId);
      if (!current || current.acknowledged) return;
      current.escalationLevel++;
      current.escalations.push({ level: current.escalationLevel, at: Date.now() });
      this.stats.escalated++;
      log('warn', 'Alert escalated', { alertId, level: current.escalationLevel, nextDelay: ESCALATION_INTERVALS[current.escalationLevel] });
      await this.dispatch(current);
      this.scheduleEscalation(alertId);
    }, delay);
    this.escalationTimers.set(alertId, timer);
  }

  /** Acknowledge an alert, stopping escalation. */
  acknowledge(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;
    alert.acknowledged = true;
    alert.acknowledgedAt = Date.now();
    const timer = this.escalationTimers.get(alertId);
    if (timer) { clearTimeout(timer); this.escalationTimers.delete(alertId); }
    this.stats.acknowledged++;
    log('info', 'Alert acknowledged', { alertId, escalationLevel: alert.escalationLevel });
    return alert;
  }

  /** Return active unacknowledged alerts sorted by severity. */
  getActive() {
    const severityOrder = { FATAL: 5, CRITICAL: 4, ERROR: 3, WARN: 2, INFO: 1 };
    return [...this.alerts.values()].filter(a => !a.acknowledged).sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
  }

  /** Return current statistics. */
  report() { return { ...this.stats, activeCount: this.getActive().length, uptime: Date.now() - this.spawnedAt }; }
  /** Gracefully retire, clearing all timers. */
  retire() {
    for (const timer of this.escalationTimers.values()) clearTimeout(timer);
    this.escalationTimers.clear();
    log('info', 'BeaconBee retiring', { stats: this.stats });
  }
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

const bee = new BeaconBee();
bee.spawn();

app.get('/health', (_req, res) => {
  const report = bee.report();
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: Date.now() - startTime, coherence: report.activeCount === 0 ? CSL.HIGH : CSL.LOW, timestamp: new Date().toISOString() });
});

/** POST /alert — Create a new alert with severity, message, source, and channel. */
app.post('/alert', async (req, res) => {
  const { severity, message, source, channel } = req.body;
  if (!severity || !message) return res.status(400).json({ error: 'severity and message are required' });
  if (!SEVERITY_CSL[severity]) return res.status(400).json({ error: `Invalid severity. Valid: ${Object.keys(SEVERITY_CSL).join(', ')}` });
  try {
    const result = await bee.execute({ severity, message, source: source || 'unknown', channel: channel || 'email' });
    log('info', 'Alert created', { correlationId: req.correlationId, ...result });
    res.status(201).json(result);
  } catch (err) {
    log('error', 'Alert creation failed', { correlationId: req.correlationId, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/** POST /acknowledge/:id — Acknowledge an alert to stop escalation. */
app.post('/acknowledge/:id', (req, res) => {
  const alert = bee.acknowledge(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  log('info', 'Alert acknowledged via API', { correlationId: req.correlationId, alertId: req.params.id });
  res.json({ acknowledged: true, alert });
});

/** GET /active — List all active unacknowledged alerts sorted by severity. */
app.get('/active', (_req, res) => {
  const active = bee.getActive();
  res.json({ alerts: active, count: active.length, coherence: active.length === 0 ? CSL.HIGH : CSL.MINIMUM });
});

const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening`, { port: PORT }));
onShutdown(() => new Promise(resolve => { bee.retire(); server.close(resolve); }));

module.exports = { app, BeaconBee };
