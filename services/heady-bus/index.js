/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ HeadyBus — Event Bus / Message Queue ═══
 * Wave 1 Foundation Service
 *
 * In-process event bus with pub/sub + queue semantics.
 * Provides both broadcast (events) and directed (tasks) messaging.
 * Production: swap backend to Redis Streams or Apache Pulsar.
 *
 * Architecture:
 *   publish(channel, payload)  → fan-out to all subscribers
 *   enqueue(queue, task)       → competing-consumer delivery
 *   subscribe(channel, handler)→ receive broadcast events
 *   consume(queue, handler)    → pull tasks one-at-a-time
 */

"use strict";

const EventEmitter = require("events");
const crypto = require("crypto");

const PHI = 1.618033988749895;
const MAX_QUEUE_SIZE = Math.round(PHI * 1000); // 1618
const MAX_RETRY = 5;
const DEAD_LETTER_CHANNEL = "heady:dead-letter";

class HeadyBus extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.setMaxListeners(100);
    this.queues = new Map();          // queue name → { items: [], consumers: [] }
    this.channels = new Map();        // channel → Set<handler>
    this.deadLetter = [];
    this.metrics = { published: 0, enqueued: 0, delivered: 0, failed: 0, deadLettered: 0 };
    this.started = Date.now();
    this._pollInterval = null;
    this._pollMs = opts.pollMs || 100;
  }

  // ── Pub/Sub (broadcast) ──────────────────────────────────────
  publish(channel, payload) {
    const envelope = {
      id: crypto.randomUUID(),
      channel,
      payload,
      ts: Date.now(),
      source: payload?.source || "unknown",
    };
    this.metrics.published++;
    this.emit(channel, envelope);
    this.emit("*", envelope); // wildcard listeners
    return envelope.id;
  }

  subscribe(channel, handler) {
    this.on(channel, handler);
    if (!this.channels.has(channel)) this.channels.set(channel, new Set());
    this.channels.get(channel).add(handler);
    return () => { this.off(channel, handler); this.channels.get(channel)?.delete(handler); };
  }

  // ── Queue (competing-consumer) ───────────────────────────────
  enqueue(queue, task) {
    if (!this.queues.has(queue)) this.queues.set(queue, { items: [], consumers: [] });
    const q = this.queues.get(queue);
    if (q.items.length >= MAX_QUEUE_SIZE) {
      this.metrics.failed++;
      throw new Error(`Queue '${queue}' full (${MAX_QUEUE_SIZE})`);
    }
    const envelope = {
      id: crypto.randomUUID(),
      queue,
      task,
      ts: Date.now(),
      attempts: 0,
    };
    q.items.push(envelope);
    this.metrics.enqueued++;
    this._drainQueue(queue);
    return envelope.id;
  }

  consume(queue, handler) {
    if (!this.queues.has(queue)) this.queues.set(queue, { items: [], consumers: [] });
    this.queues.get(queue).consumers.push(handler);
    this._drainQueue(queue);
    return () => {
      const q = this.queues.get(queue);
      if (q) q.consumers = q.consumers.filter(h => h !== handler);
    };
  }

  async _drainQueue(queue) {
    const q = this.queues.get(queue);
    if (!q || q.consumers.length === 0 || q.items.length === 0) return;
    while (q.items.length > 0 && q.consumers.length > 0) {
      const item = q.items.shift();
      const consumer = q.consumers[item.attempts % q.consumers.length];
      item.attempts++;
      try {
        await consumer(item);
        this.metrics.delivered++;
      } catch (err) {
        if (item.attempts < MAX_RETRY) {
          q.items.push(item); // retry
        } else {
          this.deadLetter.push({ ...item, error: err.message, deadAt: Date.now() });
          this.metrics.deadLettered++;
          this.publish(DEAD_LETTER_CHANNEL, { item, error: err.message });
        }
        this.metrics.failed++;
      }
    }
  }

  // ── Management ───────────────────────────────────────────────
  getHealth() {
    const queueStats = {};
    for (const [name, q] of this.queues) {
      queueStats[name] = { pending: q.items.length, consumers: q.consumers.length };
    }
    return {
      status: this.metrics.deadLettered > 10 ? "degraded" : "healthy",
      uptime: Date.now() - this.started,
      channels: this.channels.size,
      queues: queueStats,
      metrics: { ...this.metrics },
      deadLetterSize: this.deadLetter.length,
      ts: new Date().toISOString(),
    };
  }

  start() {
    if (this._pollInterval) return;
    this._pollInterval = setInterval(() => {
      for (const queue of this.queues.keys()) this._drainQueue(queue);
    }, this._pollMs);
  }

  stop() {
    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
  }
}

// ── Singleton ──────────────────────────────────────────────────
const bus = new HeadyBus();

// ── Express Routes ─────────────────────────────────────────────
function registerBusRoutes(app) {
  app.post("/api/bus/publish", (req, res) => {
    const { channel, payload } = req.body;
    if (!channel) return res.status(400).json({ ok: false, error: "channel required" });
    const id = bus.publish(channel, payload);
    res.json({ ok: true, id, channel });
  });

  app.post("/api/bus/enqueue", (req, res) => {
    const { queue, task } = req.body;
    if (!queue) return res.status(400).json({ ok: false, error: "queue required" });
    try {
      const id = bus.enqueue(queue, task);
      res.json({ ok: true, id, queue });
    } catch (err) {
      res.status(429).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/bus/health", (req, res) => res.json({ ok: true, ...bus.getHealth() }));
  app.get("/api/bus/dead-letter", (req, res) => res.json({ ok: true, items: bus.deadLetter.slice(-50) }));
}

module.exports = { HeadyBus, bus, registerBusRoutes };
