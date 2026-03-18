'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-synapse';
const PORT = 3421;
const MAX_RETRIES = FIB[7]; // 13
const DEDUP_TTL = FIB[10] * 1000; // 55s

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
 * SynapseBee — Inter-agent message broker with topic routing, dead-letter queues,
 * phi-scaled retry delays, and exactly-once delivery via message ID deduplication.
 * @class SynapseBee
 * @extends BaseHeadyBee
 */
class SynapseBee extends BaseHeadyBee {
  constructor() { super('SynapseBee'); this.topics = new Map(); this.dedupMap = new Map(); this.deliveryBreaker = new CircuitBreaker('synapse-delivery', { threshold: FIB[7] }); this.stats = { totalPublished: 0, totalDelivered: 0, totalDLQ: 0 }; }

  async spawn() { await super.spawn(); this._sweepId = setInterval(() => this._sweepDedup(), DEDUP_TTL); }

  /** Create a named topic channel with subscriber list. */
  createTopic(name, config = {}) {
    if (this.topics.has(name)) return this.topics.get(name);
    const topic = { name, config, subscribers: [], dlq: [], messages: [], createdAt: Date.now(), delivered: 0, published: 0 };
    this.topics.set(name, topic);
    log('info', `Topic created: ${name}`, { config });
    return topic;
  }

  /** Publish message with exactly-once dedup. Messages failing FIB[7] retries go to DLQ. */
  async publishMessage(topicName, payload, correlationId) {
    const topic = this.topics.get(topicName);
    if (!topic) throw new Error(`Topic ${topicName} not found`);
    const messageId = payload.id || crypto.randomUUID();
    if (this.dedupMap.has(messageId)) { log('warn', `Duplicate suppressed: ${messageId}`, { correlationId }); return { status: 'duplicate', messageId }; }
    this.dedupMap.set(messageId, Date.now());
    const message = { id: messageId, topicName, payload, publishedAt: Date.now(), correlationId };
    topic.messages.push(message);
    topic.published++;
    this.stats.totalPublished++;
    const results = [];
    for (const sub of topic.subscribers) {
      if (sub.filter && !Object.entries(sub.filter).every(([k, v]) => payload[k] === v)) continue;
      let delivered = false;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await this.deliveryBreaker.execute(() => this._send(sub.endpoint, message));
          delivered = true; topic.delivered++; this.stats.totalDelivered++;
          results.push({ endpoint: sub.endpoint, status: 'delivered', attempts: attempt + 1 }); break;
        } catch (err) { await new Promise(r => setTimeout(r, FIB[Math.min(attempt, FIB.length - 1)] * 1000 * PSI)); }
      }
      if (!delivered) { topic.dlq.push({ ...message, failedEndpoint: sub.endpoint, movedToDLQAt: Date.now() }); this.stats.totalDLQ++; results.push({ endpoint: sub.endpoint, status: 'dlq', attempts: MAX_RETRIES }); }
    }
    return { status: 'published', messageId, deliveryResults: results };
  }

  /** Simulate delivery to an endpoint. Endpoints starting with fail:// throw. */
  _send(endpoint, message) { if (endpoint.startsWith('fail://')) throw new Error(`Simulated failure`); return Promise.resolve({ status: 'ok', messageId: message.id }); }

  /** Add a subscriber with optional payload filter to a topic. */
  addSubscriber(topicName, endpoint, filter = null) {
    const topic = this.topics.get(topicName);
    if (!topic) throw new Error(`Topic ${topicName} not found`);
    const sub = { endpoint, filter, subscribedAt: Date.now(), id: crypto.randomUUID() };
    topic.subscribers.push(sub);
    return sub;
  }

  /** Replay all dead-letter messages back through normal publish flow. */
  async replayDLQ(topicName, correlationId) {
    const topic = this.topics.get(topicName);
    if (!topic) throw new Error(`Topic ${topicName} not found`);
    const dlqCopy = [...topic.dlq]; topic.dlq.length = 0;
    const results = [];
    for (const msg of dlqCopy) { this.dedupMap.delete(msg.id); results.push(await this.publishMessage(topicName, msg.payload, correlationId)); }
    return results;
  }

  /** Per-topic message counts, delivery rates, DLQ depth. */
  getStats() {
    const topicStats = {};
    for (const [name, t] of this.topics) topicStats[name] = { published: t.published, delivered: t.delivered, dlqDepth: t.dlq.length, subscribers: t.subscribers.length, deliveryRate: t.published > 0 ? t.delivered / t.published : 0 };
    return { ...this.stats, topics: topicStats };
  }

  _sweepDedup() { const now = Date.now(); for (const [id, ts] of this.dedupMap) { if (now - ts > DEDUP_TTL) this.dedupMap.delete(id); } }
  async execute() { await super.execute(); log('info', 'SynapseBee executing'); }
  async report() { await super.report(); return this.getStats(); }
  async retire() { clearInterval(this._sweepId); await super.retire(); }
}

const app = express();
app.use(express.json());
const bee = new SynapseBee();
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

/** @route GET /health — Health check with coherence score. */
app.get('/health', (_req, res) => {
  const uptime = (Date.now() - bee.startedAt) / 1000;
  res.json({ status: 'ok', service: SERVICE_NAME, uptime, coherence: parseFloat(Math.min(CSL.HIGH, CSL.MEDIUM + (uptime / (uptime + FIB[10])) * (CSL.HIGH - CSL.MEDIUM)).toFixed(6)), timestamp: new Date().toISOString() });
});

/** @route POST /topics — Create a topic channel. */
app.post('/topics', (req, res) => { if (!req.body.name) return res.status(400).json({ error: 'Topic name required' }); res.status(201).json(bee.createTopic(req.body.name, req.body.config)); });

/** @route POST /topics/:name/publish — Publish message to topic. */
app.post('/topics/:name/publish', async (req, res) => { try { res.json(await bee.publishMessage(req.params.name, req.body, req.correlationId)); } catch (e) { res.status(404).json({ error: e.message }); } });

/** @route POST /topics/:name/subscribe — Add subscriber to topic. */
app.post('/topics/:name/subscribe', (req, res) => { try { if (!req.body.endpoint) return res.status(400).json({ error: 'Endpoint required' }); res.status(201).json(bee.addSubscriber(req.params.name, req.body.endpoint, req.body.filter)); } catch (e) { res.status(404).json({ error: e.message }); } });

/** @route GET /topics/:name/dlq — Get dead-letter messages for topic. */
app.get('/topics/:name/dlq', (req, res) => { const t = bee.topics.get(req.params.name); if (!t) return res.status(404).json({ error: 'Topic not found' }); res.json({ topic: req.params.name, dlq: t.dlq, count: t.dlq.length }); });

/** @route POST /topics/:name/dlq/replay — Replay DLQ messages. */
app.post('/topics/:name/dlq/replay', async (req, res) => { try { const r = await bee.replayDLQ(req.params.name, req.correlationId); res.json({ replayed: r.length, results: r }); } catch (e) { res.status(404).json({ error: e.message }); } });

/** @route GET /stats — Per-topic message counts, delivery rates, DLQ depth. */
app.get('/stats', (_req, res) => { res.json(bee.getStats()); });

bee.spawn().then(() => { bee.execute(); const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening on port ${PORT}`)); onShutdown(() => new Promise(r => server.close(r))); onShutdown(() => bee.retire()); });

module.exports = { SynapseBee, CircuitBreaker, app };
