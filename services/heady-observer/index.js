/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ HeadyObserver — AIOps Observability ═══
 * Wave 2 Core Intelligence Service
 *
 * Fourth-pillar observability: behavioral signals for AI systems.
 * Tracks TTFT, token usage, cost attribution, error correlation,
 * agent decision quality, and response groundedness.
 */

"use strict";

const PHI = 1.618033988749895;
const MAX_EVENTS = Math.round(PHI * 10000); // 16180

class HeadyObserver {
  constructor() {
    this.events = [];
    this.spans = new Map();     // spanId → span data
    this.alerts = [];
    this.counters = { totalCalls: 0, totalTokens: 0, totalCost: 0, errors: 0, latencySum: 0 };
    this.perNode = {};          // nodeId → { calls, tokens, cost, errors, avgLatency }
    this.perModel = {};         // model → { calls, tokens, cost, ttftSum }
    this.started = Date.now();
  }

  // ── Record an AI operation ───────────────────────────────────
  record(event) {
    const entry = {
      id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      node: event.node || "unknown",
      model: event.model || "unknown",
      skill: event.skill || null,
      tokensIn: event.tokensIn || 0,
      tokensOut: event.tokensOut || 0,
      cost: event.cost || 0,
      latencyMs: event.latencyMs || 0,
      ttftMs: event.ttftMs || null,
      success: event.success !== false,
      error: event.error || null,
      quality: event.quality || null,   // 0-1 quality score
      grounded: event.grounded || null, // 0-1 groundedness score
    };

    this.events.push(entry);
    if (this.events.length > MAX_EVENTS) this.events.shift();

    // Aggregate counters
    this.counters.totalCalls++;
    this.counters.totalTokens += entry.tokensIn + entry.tokensOut;
    this.counters.totalCost += entry.cost;
    this.counters.latencySum += entry.latencyMs;
    if (!entry.success) this.counters.errors++;

    // Per-node
    if (!this.perNode[entry.node]) this.perNode[entry.node] = { calls: 0, tokens: 0, cost: 0, errors: 0, latencySum: 0 };
    const n = this.perNode[entry.node];
    n.calls++; n.tokens += entry.tokensIn + entry.tokensOut; n.cost += entry.cost; n.latencySum += entry.latencyMs;
    if (!entry.success) n.errors++;

    // Per-model
    if (!this.perModel[entry.model]) this.perModel[entry.model] = { calls: 0, tokens: 0, cost: 0, ttftSum: 0, ttftCount: 0 };
    const m = this.perModel[entry.model];
    m.calls++; m.tokens += entry.tokensIn + entry.tokensOut; m.cost += entry.cost;
    if (entry.ttftMs) { m.ttftSum += entry.ttftMs; m.ttftCount++; }

    // Check alert thresholds
    this._checkAlerts(entry);
    return entry.id;
  }

  // ── Tracing (spans) ──────────────────────────────────────────
  startSpan(name, meta = {}) {
    const spanId = `span-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.spans.set(spanId, { name, meta, startTs: Date.now(), endTs: null, children: [] });
    return spanId;
  }

  endSpan(spanId, result = {}) {
    const span = this.spans.get(spanId);
    if (span) { span.endTs = Date.now(); span.result = result; span.durationMs = span.endTs - span.startTs; }
  }

  // ── Alerts ───────────────────────────────────────────────────
  _checkAlerts(entry) {
    if (entry.latencyMs > 30000) this.alerts.push({ type: "high-latency", entry, ts: Date.now() });
    if (entry.cost > 1.0) this.alerts.push({ type: "high-cost", entry, ts: Date.now() });
    if (entry.quality !== null && entry.quality < 0.382) this.alerts.push({ type: "low-quality", entry, ts: Date.now() });
    if (this.alerts.length > 1000) this.alerts = this.alerts.slice(-500);
  }

  // ── Dashboard Data ───────────────────────────────────────────
  getDashboard(windowMs = 3600000) {
    const cutoff = Date.now() - windowMs;
    const recent = this.events.filter(e => e.ts > cutoff);
    const errorRate = recent.length > 0 ? recent.filter(e => !e.success).length / recent.length : 0;

    return {
      window: `${windowMs / 60000}min`,
      totalEvents: recent.length,
      errorRate: Math.round(errorRate * 10000) / 100,
      avgLatencyMs: recent.length > 0 ? Math.round(recent.reduce((s, e) => s + e.latencyMs, 0) / recent.length) : 0,
      totalCost: Math.round(recent.reduce((s, e) => s + e.cost, 0) * 10000) / 10000,
      totalTokens: recent.reduce((s, e) => s + e.tokensIn + e.tokensOut, 0),
      perNode: this.perNode,
      perModel: Object.fromEntries(Object.entries(this.perModel).map(([k, v]) => [k, {
        ...v, avgTTFT: v.ttftCount > 0 ? Math.round(v.ttftSum / v.ttftCount) : null,
      }])),
      recentAlerts: this.alerts.slice(-20),
    };
  }

  getHealth() {
    const errorRate = this.counters.totalCalls > 0 ? this.counters.errors / this.counters.totalCalls : 0;
    return {
      status: errorRate > 0.1 ? "degraded" : "healthy",
      uptime: Date.now() - this.started,
      counters: this.counters,
      activeSpans: [...this.spans.values()].filter(s => !s.endTs).length,
      alertCount: this.alerts.length,
      ts: new Date().toISOString(),
    };
  }
}

const observer = new HeadyObserver();

function registerObserverRoutes(app) {
  app.post("/api/observer/record", (req, res) => {
    const id = observer.record(req.body);
    res.json({ ok: true, id });
  });
  app.get("/api/observer/dashboard", (req, res) => {
    const windowMs = parseInt(req.query.window) || 3600000;
    res.json({ ok: true, ...observer.getDashboard(windowMs) });
  });
  app.get("/api/observer/health", (req, res) => res.json({ ok: true, ...observer.getHealth() }));
  app.get("/api/observer/alerts", (req, res) => res.json({ ok: true, alerts: observer.alerts.slice(-50) }));
}

module.exports = { HeadyObserver, observer, registerObserverRoutes };
