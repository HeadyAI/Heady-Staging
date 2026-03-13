/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ HeadyFlags — Feature Flags & Progressive Delivery ═══
 * Wave 3 Operational Maturity Service
 *
 * Kill switches, A/B testing, model selection, shadow mode,
 * cost-tier routing, and progressive rollout with auto-rollback.
 */

"use strict";

const PHI = 1.618033988749895;

class HeadyFlags {
  constructor() {
    this.flags = new Map();    // flagId → flag definition
    this.overrides = new Map();// userId → { flagId → value }
    this.evaluations = { total: 0, hits: {}, variants: {} };
  }

  // ── Flag CRUD ────────────────────────────────────────────────
  create(flag) {
    const def = {
      id: flag.id,
      name: flag.name || flag.id,
      type: flag.type || "boolean",       // boolean | variant | percentage | json
      enabled: flag.enabled !== false,
      defaultValue: flag.defaultValue ?? false,
      variants: flag.variants || {},       // { variantName: value }
      rolloutPercent: flag.rolloutPercent ?? 100,
      targetSkills: flag.targetSkills || [],// skill IDs this flag applies to
      description: flag.description || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.flags.set(def.id, def);
    return def;
  }

  update(flagId, changes) {
    const flag = this.flags.get(flagId);
    if (!flag) throw new Error(`Flag not found: ${flagId}`);
    Object.assign(flag, changes, { updatedAt: Date.now() });
    return flag;
  }

  delete(flagId) { return this.flags.delete(flagId); }

  // ── Evaluation ───────────────────────────────────────────────
  evaluate(flagId, context = {}) {
    this.evaluations.total++;
    this.evaluations.hits[flagId] = (this.evaluations.hits[flagId] || 0) + 1;

    // Check overrides first
    if (context.userId && this.overrides.has(context.userId)) {
      const ov = this.overrides.get(context.userId);
      if (ov[flagId] !== undefined) return ov[flagId];
    }

    const flag = this.flags.get(flagId);
    if (!flag || !flag.enabled) return flag?.defaultValue ?? false;

    // Skill targeting
    if (flag.targetSkills.length > 0 && context.skillId && !flag.targetSkills.includes(context.skillId)) {
      return flag.defaultValue;
    }

    // Percentage rollout (deterministic hash)
    if (flag.rolloutPercent < 100) {
      const hash = this._hash(`${flagId}:${context.userId || context.sessionId || "anon"}`);
      if (hash > flag.rolloutPercent) return flag.defaultValue;
    }

    // Variant selection
    if (flag.type === "variant" && Object.keys(flag.variants).length > 0) {
      const keys = Object.keys(flag.variants);
      const idx = this._hash(`${flagId}:variant:${context.userId || ""}`) % keys.length;
      const selected = keys[idx];
      this.evaluations.variants[`${flagId}:${selected}`] = (this.evaluations.variants[`${flagId}:${selected}`] || 0) + 1;
      return flag.variants[selected];
    }

    return flag.type === "json" ? flag.defaultValue : true;
  }

  // ── Overrides ────────────────────────────────────────────────
  setOverride(userId, flagId, value) {
    if (!this.overrides.has(userId)) this.overrides.set(userId, {});
    this.overrides.get(userId)[flagId] = value;
  }

  clearOverride(userId, flagId) {
    const ov = this.overrides.get(userId);
    if (ov) { delete ov[flagId]; if (Object.keys(ov).length === 0) this.overrides.delete(userId); }
  }

  // ── Helpers ──────────────────────────────────────────────────
  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0; }
    return Math.abs(hash) % 100;
  }

  list() { return [...this.flags.values()]; }

  getHealth() {
    return {
      status: "healthy",
      totalFlags: this.flags.size,
      enabledFlags: [...this.flags.values()].filter(f => f.enabled).length,
      evaluations: this.evaluations,
      ts: new Date().toISOString(),
    };
  }
}

const flags = new HeadyFlags();

// Seed default flags for Heady
const DEFAULT_FLAGS = [
  { id: "model-v2", name: "Model V2 Rollout", type: "boolean", rolloutPercent: 10, description: "Progressive rollout of new model version" },
  { id: "shadow-mode", name: "Shadow Mode", type: "boolean", enabled: false, description: "Run new model in parallel, compare outputs" },
  { id: "cost-tier", name: "Cost Tier Routing", type: "variant", variants: { premium: "claude", standard: "gemini", economy: "groq" } },
  { id: "imagination-engine", name: "Imagination Engine", type: "boolean", enabled: true, description: "Enable imagination seeding in evolution" },
  { id: "kill-openai", name: "OpenAI Kill Switch", type: "boolean", enabled: false, description: "Emergency disable OpenAI" },
];
DEFAULT_FLAGS.forEach(f => flags.create(f));

function registerFlagsRoutes(app) {
  app.get("/api/flags", (req, res) => res.json({ ok: true, flags: flags.list() }));
  app.post("/api/flags", (req, res) => { try { res.json({ ok: true, flag: flags.create(req.body) }); } catch(e) { res.status(400).json({ ok: false, error: e.message }); } });
  app.put("/api/flags/:id", (req, res) => { try { res.json({ ok: true, flag: flags.update(req.params.id, req.body) }); } catch(e) { res.status(404).json({ ok: false, error: e.message }); } });
  app.delete("/api/flags/:id", (req, res) => { flags.delete(req.params.id); res.json({ ok: true }); });
  app.post("/api/flags/evaluate", (req, res) => {
    const { flagId, context } = req.body;
    res.json({ ok: true, flagId, value: flags.evaluate(flagId, context || {}) });
  });
  app.get("/api/flags/health", (req, res) => res.json({ ok: true, ...flags.getHealth() }));
}

module.exports = { HeadyFlags, flags, registerFlagsRoutes };
