/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ HeadyIdentity — Agent Identity & Access Management ═══
 * Wave 3 Operational Maturity Service
 *
 * RBAC for Heady nodes. Each node has distinct permissions.
 * HeadySoul: decision authority. HeadyConductor: dispatch.
 * HeadyBuddy: user-facing only. HeadyBrains: compute only.
 */

"use strict";

// ── Node Roles & Permissions ───────────────────────────────────
const ROLES = {
  sovereign:  { level: 10, label: "Sovereign (HeadySoul)",    permissions: ["*"] },
  conductor:  { level: 8,  label: "Conductor (Orchestrator)", permissions: ["dispatch", "read", "write", "schedule", "monitor"] },
  brain:      { level: 6,  label: "Brain (Compute)",          permissions: ["compute", "read", "inference", "embed"] },
  agent:      { level: 5,  label: "Agent (Skill Worker)",     permissions: ["read", "write", "execute"] },
  buddy:      { level: 4,  label: "Buddy (User-facing)",      permissions: ["read", "chat", "history"] },
  observer:   { level: 3,  label: "Observer (Monitor)",       permissions: ["read", "monitor", "alert"] },
  service:    { level: 2,  label: "Service (Background)",     permissions: ["read", "execute"] },
  readonly:   { level: 1,  label: "Read Only",                permissions: ["read"] },
};

// ── Default Node Assignments ───────────────────────────────────
const NODE_ROLES = {
  HeadySoul:      "sovereign",
  HeadyConductor: "conductor",
  HeadyBrains:    "brain",
  HeadyImagination: "brain",
  HeadyBuddy:     "buddy",
  HeadyBee:       "agent",
  HeadyGuard:     "observer",
  HeadyEval:      "observer",
  HeadyMCP:       "service",
  HeadyVault:     "service",
};

class HeadyIdentity {
  constructor() {
    this.identities = new Map(); // nodeId → { role, apiKey, permissions, lastSeen }
    this.sessions = new Map();   // sessionId → { nodeId, createdAt, expiresAt }
    this.auditLog = [];
    this.metrics = { authAttempts: 0, authSuccesses: 0, authFailures: 0, permDenied: 0 };

    // Seed default identities
    for (const [nodeId, role] of Object.entries(NODE_ROLES)) {
      this.register(nodeId, role);
    }
  }

  // ── Registration ─────────────────────────────────────────────
  register(nodeId, role) {
    const r = ROLES[role];
    if (!r) throw new Error(`Unknown role: ${role}`);
    const apiKey = `heady-${nodeId.toLowerCase()}-${Date.now().toString(36)}`;
    this.identities.set(nodeId, {
      nodeId, role, level: r.level, label: r.label,
      permissions: [...r.permissions], apiKey,
      registeredAt: Date.now(), lastSeen: null,
    });
    return { nodeId, role, apiKey };
  }

  // ── Authentication ───────────────────────────────────────────
  authenticate(nodeId, apiKey) {
    this.metrics.authAttempts++;
    const identity = this.identities.get(nodeId);
    if (!identity || identity.apiKey !== apiKey) {
      this.metrics.authFailures++;
      this._audit("auth_failure", nodeId, { reason: "invalid credentials" });
      return null;
    }
    identity.lastSeen = Date.now();
    this.metrics.authSuccesses++;
    this._audit("auth_success", nodeId);
    return { nodeId, role: identity.role, permissions: identity.permissions };
  }

  // ── Authorization ────────────────────────────────────────────
  authorize(nodeId, permission) {
    const identity = this.identities.get(nodeId);
    if (!identity) return false;
    if (identity.permissions.includes("*")) return true;
    if (!identity.permissions.includes(permission)) {
      this.metrics.permDenied++;
      this._audit("perm_denied", nodeId, { permission });
      return false;
    }
    return true;
  }

  // ── Grant/Revoke ─────────────────────────────────────────────
  grant(nodeId, permission) {
    const identity = this.identities.get(nodeId);
    if (!identity) throw new Error(`Node not found: ${nodeId}`);
    if (!identity.permissions.includes(permission)) identity.permissions.push(permission);
    this._audit("grant", nodeId, { permission });
  }

  revoke(nodeId, permission) {
    const identity = this.identities.get(nodeId);
    if (!identity) throw new Error(`Node not found: ${nodeId}`);
    identity.permissions = identity.permissions.filter(p => p !== permission);
    this._audit("revoke", nodeId, { permission });
  }

  // ── Audit ────────────────────────────────────────────────────
  _audit(action, nodeId, meta = {}) {
    this.auditLog.push({ action, nodeId, meta, ts: Date.now() });
    if (this.auditLog.length > 5000) this.auditLog = this.auditLog.slice(-2500);
  }

  list() {
    return [...this.identities.values()].map(i => ({
      nodeId: i.nodeId, role: i.role, level: i.level, label: i.label,
      permissions: i.permissions, lastSeen: i.lastSeen,
    }));
  }

  getHealth() {
    return {
      status: "healthy",
      totalIdentities: this.identities.size,
      roles: Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [k, v.label])),
      metrics: this.metrics,
      recentAudit: this.auditLog.slice(-10),
      ts: new Date().toISOString(),
    };
  }
}

const identity = new HeadyIdentity();

function registerIdentityRoutes(app) {
  app.get("/api/identity/nodes", (req, res) => res.json({ ok: true, nodes: identity.list() }));
  app.post("/api/identity/register", (req, res) => {
    try { res.json({ ok: true, ...identity.register(req.body.nodeId, req.body.role) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });
  app.post("/api/identity/auth", (req, res) => {
    const result = identity.authenticate(req.body.nodeId, req.body.apiKey);
    if (!result) return res.status(401).json({ ok: false, error: "Authentication failed" });
    res.json({ ok: true, ...result });
  });
  app.post("/api/identity/authorize", (req, res) => {
    res.json({ ok: true, authorized: identity.authorize(req.body.nodeId, req.body.permission) });
  });
  app.get("/api/identity/audit", (req, res) => res.json({ ok: true, log: identity.auditLog.slice(-100) }));
  app.get("/api/identity/health", (req, res) => res.json({ ok: true, ...identity.getHealth() }));
}

module.exports = { HeadyIdentity, identity, registerIdentityRoutes, ROLES };
