/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ HeadyMeter — Usage Metering & Cost Attribution ═══
 * Wave 4 Scale Service
 *
 * Answers: "How much does HeadyBuddy cost per conversation?"
 * Tracks tokens, GPU-seconds, storage, and bandwidth per node/skill/user.
 */

"use strict";

class HeadyMeter {
  constructor() {
    this.events = [];
    this.buckets = {};    // dimension → accumulated totals
    this.budgetAlerts = [];
    this.maxEvents = 50000;
  }

  record(event) {
    const entry = {
      ts: Date.now(),
      dimension: event.dimension || "unknown",  // node, skill, user, model
      dimensionId: event.dimensionId || "unknown",
      metric: event.metric || "tokens",          // tokens, gpu_seconds, storage_bytes, bandwidth_bytes, cost_usd
      value: event.value || 0,
      metadata: event.metadata || {},
    };
    this.events.push(entry);
    if (this.events.length > this.maxEvents) this.events = this.events.slice(-this.maxEvents / 2);

    const key = `${entry.dimension}:${entry.dimensionId}:${entry.metric}`;
    this.buckets[key] = (this.buckets[key] || 0) + entry.value;
    return entry;
  }

  getUsage(dimension, dimensionId, metric = null, windowMs = null) {
    const cutoff = windowMs ? Date.now() - windowMs : 0;
    return this.events
      .filter(e => e.dimension === dimension && e.dimensionId === dimensionId && (!metric || e.metric === metric) && e.ts > cutoff)
      .reduce((sum, e) => sum + e.value, 0);
  }

  getSummary(windowMs = 3600000) {
    const cutoff = Date.now() - windowMs;
    const recent = this.events.filter(e => e.ts > cutoff);
    const summary = {};
    for (const e of recent) {
      const key = `${e.dimension}:${e.dimensionId}`;
      if (!summary[key]) summary[key] = {};
      summary[key][e.metric] = (summary[key][e.metric] || 0) + e.value;
    }
    return summary;
  }

  getTopConsumers(metric = "cost_usd", limit = 10) {
    const consumers = {};
    for (const e of this.events) {
      if (e.metric !== metric) continue;
      const key = `${e.dimension}:${e.dimensionId}`;
      consumers[key] = (consumers[key] || 0) + e.value;
    }
    return Object.entries(consumers).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k, v]) => ({ key: k, total: v }));
  }

  getHealth() {
    return {
      status: "healthy",
      totalEvents: this.events.length,
      uniqueBuckets: Object.keys(this.buckets).length,
      topCostConsumers: this.getTopConsumers("cost_usd", 5),
      ts: new Date().toISOString(),
    };
  }
}

const meter = new HeadyMeter();

function registerMeterRoutes(app) {
  app.post("/api/meter/record", (req, res) => res.json({ ok: true, event: meter.record(req.body) }));
  app.get("/api/meter/summary", (req, res) => {
    const windowMs = parseInt(req.query.window) || 3600000;
    res.json({ ok: true, summary: meter.getSummary(windowMs) });
  });
  app.get("/api/meter/top", (req, res) => {
    res.json({ ok: true, top: meter.getTopConsumers(req.query.metric || "cost_usd", parseInt(req.query.limit) || 10) });
  });
  app.get("/api/meter/usage/:dimension/:id", (req, res) => {
    const total = meter.getUsage(req.params.dimension, req.params.id, req.query.metric);
    res.json({ ok: true, dimension: req.params.dimension, id: req.params.id, total });
  });
  app.get("/api/meter/health", (req, res) => res.json({ ok: true, ...meter.getHealth() }));
}

module.exports = { HeadyMeter, meter, registerMeterRoutes };
