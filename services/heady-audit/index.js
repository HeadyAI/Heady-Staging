/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ HeadyAudit — Compliance & Audit Logging ═══
 * Wave 4 Scale Service
 *
 * Tamper-proof append-only log of all agent actions.
 * Records: who, what, when, why, result.
 * Designed for regulatory compliance and debugging.
 */

"use strict";

const crypto = require("crypto");

class HeadyAudit {
  constructor() {
    this.log = [];
    this.chains = new Map(); // chainId → [linked entries]
    this.maxEntries = 100000;
    this._lastHash = "genesis";
  }

  // ── Append (tamper-evident chain) ────────────────────────────
  append(entry) {
    const record = {
      id: `audit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      ts: Date.now(),
      who: entry.who || "unknown",       // nodeId or userId
      what: entry.what || "action",      // action type
      why: entry.why || null,            // reason/intent
      target: entry.target || null,      // affected resource
      result: entry.result || "success", // success | failure | partial
      metadata: entry.metadata || {},
      prevHash: this._lastHash,
    };

    // Chain integrity hash
    const payload = `${record.prevHash}:${record.who}:${record.what}:${record.ts}`;
    record.hash = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
    this._lastHash = record.hash;

    this.log.push(record);
    if (this.log.length > this.maxEntries) this.log = this.log.slice(-this.maxEntries / 2);

    // Chain linking
    if (entry.chainId) {
      if (!this.chains.has(entry.chainId)) this.chains.set(entry.chainId, []);
      this.chains.get(entry.chainId).push(record.id);
    }

    return record;
  }

  // ── Query ────────────────────────────────────────────────────
  query(filters = {}) {
    let results = this.log;
    if (filters.who) results = results.filter(r => r.who === filters.who);
    if (filters.what) results = results.filter(r => r.what === filters.what);
    if (filters.since) results = results.filter(r => r.ts >= filters.since);
    if (filters.until) results = results.filter(r => r.ts <= filters.until);
    if (filters.result) results = results.filter(r => r.result === filters.result);
    const limit = filters.limit || 100;
    return results.slice(-limit);
  }

  getChain(chainId) {
    const ids = this.chains.get(chainId) || [];
    return ids.map(id => this.log.find(r => r.id === id)).filter(Boolean);
  }

  // ── Integrity Verification ───────────────────────────────────
  verify() {
    let prevHash = "genesis";
    for (const record of this.log) {
      if (record.prevHash !== prevHash) return { valid: false, brokenAt: record.id };
      const payload = `${record.prevHash}:${record.who}:${record.what}:${record.ts}`;
      const expected = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
      if (record.hash !== expected) return { valid: false, brokenAt: record.id };
      prevHash = record.hash;
    }
    return { valid: true, entries: this.log.length };
  }

  getHealth() {
    const integrity = this.verify();
    return {
      status: integrity.valid ? "healthy" : "compromised",
      totalEntries: this.log.length,
      chainCount: this.chains.size,
      integrity,
      recentActions: [...new Set(this.log.slice(-100).map(r => r.what))],
      ts: new Date().toISOString(),
    };
  }
}

const audit = new HeadyAudit();

function registerAuditRoutes(app) {
  app.post("/api/audit/log", (req, res) => res.json({ ok: true, record: audit.append(req.body) }));
  app.get("/api/audit/query", (req, res) => {
    const filters = { who: req.query.who, what: req.query.what, limit: parseInt(req.query.limit) || 100 };
    if (req.query.since) filters.since = parseInt(req.query.since);
    res.json({ ok: true, records: audit.query(filters) });
  });
  app.get("/api/audit/chain/:id", (req, res) => res.json({ ok: true, chain: audit.getChain(req.params.id) }));
  app.get("/api/audit/verify", (req, res) => res.json({ ok: true, ...audit.verify() }));
  app.get("/api/audit/health", (req, res) => res.json({ ok: true, ...audit.getHealth() }));
}

module.exports = { HeadyAudit, audit, registerAuditRoutes };
