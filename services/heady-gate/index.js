/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ HeadyGate — AI Gateway ═══
 * Wave 1 Foundation Service
 *
 * Centralizes all LLM/AI model routing through a single gateway.
 * Features: model routing, token budget enforcement, prompt caching,
 * failover chains, cost tracking, and kill switches.
 *
 * Providers: Claude, OpenAI, Gemini, Groq, Perplexity, HuggingFace, Local
 */

"use strict";

const crypto = require("crypto");

const PHI = 1.618033988749895;

// ── Provider Registry ──────────────────────────────────────────
const PROVIDERS = {
  claude:     { label: "Anthropic Claude",   costPer1kIn: 0.003,  costPer1kOut: 0.015,  maxTokens: 200000, envKey: "ANTHROPIC_API_KEY" },
  openai:     { label: "OpenAI GPT",         costPer1kIn: 0.005,  costPer1kOut: 0.015,  maxTokens: 128000, envKey: "OPENAI_API_KEY" },
  gemini:     { label: "Google Gemini",       costPer1kIn: 0.001,  costPer1kOut: 0.002,  maxTokens: 1000000, envKey: "GEMINI_API_KEY" },
  groq:       { label: "Groq Fast LLM",      costPer1kIn: 0.0003, costPer1kOut: 0.001,  maxTokens: 32000,  envKey: "GROQ_API_KEY" },
  perplexity: { label: "Perplexity Sonar",   costPer1kIn: 0.001,  costPer1kOut: 0.005,  maxTokens: 128000, envKey: "PERPLEXITY_API_KEY" },
  huggingface:{ label: "HuggingFace",        costPer1kIn: 0.0001, costPer1kOut: 0.0005, maxTokens: 32000,  envKey: "HF_TOKEN" },
  local:      { label: "Local Model",        costPer1kIn: 0,      costPer1kOut: 0,      maxTokens: 32000,  envKey: null },
};

// ── Failover Chains ────────────────────────────────────────────
const FAILOVER_CHAINS = {
  default:    ["claude", "openai", "gemini", "groq"],
  fast:       ["groq", "gemini", "claude"],
  cheap:      ["groq", "huggingface", "gemini"],
  research:   ["perplexity", "claude", "openai"],
  creative:   ["claude", "openai", "gemini"],
};

class HeadyGate {
  constructor() {
    this.cache = new Map();       // prompt hash → { response, ts, tokens }
    this.budgets = new Map();     // skillId → { limit, used }
    this.killSwitches = new Set();// disabled providers
    this.metrics = {
      requests: 0, cached: 0, routed: 0, failed: 0,
      tokensByProvider: {}, costByProvider: {},
      tokensBySkill: {}, costBySkill: {},
    };
    this.maxCacheSize = Math.round(PHI * 1000); // 1618 entries
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  // ── Model Routing ────────────────────────────────────────────
  selectProvider(opts = {}) {
    const chain = FAILOVER_CHAINS[opts.strategy || "default"] || FAILOVER_CHAINS.default;
    for (const provider of chain) {
      if (this.killSwitches.has(provider)) continue;
      const cfg = PROVIDERS[provider];
      if (!cfg) continue;
      if (cfg.envKey && !process.env[cfg.envKey]) continue;
      return provider;
    }
    return null;
  }

  // ── Prompt Cache ─────────────────────────────────────────────
  _hashPrompt(prompt, provider) {
    return crypto.createHash("sha256").update(`${provider}:${prompt}`).digest("hex").slice(0, 32);
  }

  getCached(prompt, provider) {
    const key = this._hashPrompt(prompt, provider);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.cacheTTL) { this.cache.delete(key); return null; }
    this.metrics.cached++;
    return entry;
  }

  setCache(prompt, provider, response, tokens) {
    if (this.cache.size >= this.maxCacheSize) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    const key = this._hashPrompt(prompt, provider);
    this.cache.set(key, { response, tokens, ts: Date.now(), provider });
  }

  // ── Budget Enforcement ───────────────────────────────────────
  setBudget(skillId, limitTokens) {
    this.budgets.set(skillId, { limit: limitTokens, used: 0 });
  }

  checkBudget(skillId, estimatedTokens) {
    const budget = this.budgets.get(skillId);
    if (!budget) return true; // no budget = unlimited
    return (budget.used + estimatedTokens) <= budget.limit;
  }

  recordUsage(skillId, provider, tokensIn, tokensOut) {
    const cfg = PROVIDERS[provider] || {};
    const costIn = (tokensIn / 1000) * (cfg.costPer1kIn || 0);
    const costOut = (tokensOut / 1000) * (cfg.costPer1kOut || 0);
    const totalCost = costIn + costOut;
    const totalTokens = tokensIn + tokensOut;

    // Provider metrics
    this.metrics.tokensByProvider[provider] = (this.metrics.tokensByProvider[provider] || 0) + totalTokens;
    this.metrics.costByProvider[provider] = (this.metrics.costByProvider[provider] || 0) + totalCost;

    // Skill metrics
    if (skillId) {
      this.metrics.tokensBySkill[skillId] = (this.metrics.tokensBySkill[skillId] || 0) + totalTokens;
      this.metrics.costBySkill[skillId] = (this.metrics.costBySkill[skillId] || 0) + totalCost;
      const budget = this.budgets.get(skillId);
      if (budget) budget.used += totalTokens;
    }

    this.metrics.routed++;
  }

  // ── Route Request ────────────────────────────────────────────
  async route(request) {
    this.metrics.requests++;
    const { prompt, skillId, strategy, forceProvider, useCache = true } = request;

    // Select provider
    const provider = forceProvider || this.selectProvider({ strategy });
    if (!provider) {
      this.metrics.failed++;
      return { ok: false, error: "No available provider", killSwitches: [...this.killSwitches] };
    }

    // Check cache
    if (useCache) {
      const cached = this.getCached(prompt, provider);
      if (cached) return { ok: true, provider, cached: true, ...cached };
    }

    // Check budget
    const estimatedTokens = Math.ceil(prompt.length / 4) * 2; // rough estimate
    if (skillId && !this.checkBudget(skillId, estimatedTokens)) {
      return { ok: false, error: `Budget exceeded for skill '${skillId}'`, provider };
    }

    // Route to provider (actual API call would happen here)
    // In production, this dispatches to the appropriate provider SDK
    return {
      ok: true,
      provider,
      cached: false,
      status: "routed",
      message: `Request routed to ${PROVIDERS[provider]?.label || provider}`,
      estimatedCost: (estimatedTokens / 1000) * ((PROVIDERS[provider]?.costPer1kIn || 0) + (PROVIDERS[provider]?.costPer1kOut || 0)),
    };
  }

  // ── Kill Switches ────────────────────────────────────────────
  disableProvider(provider) { this.killSwitches.add(provider); }
  enableProvider(provider) { this.killSwitches.delete(provider); }

  // ── Health ───────────────────────────────────────────────────
  getHealth() {
    const available = Object.entries(PROVIDERS)
      .filter(([id, cfg]) => !this.killSwitches.has(id) && (!cfg.envKey || process.env[cfg.envKey]))
      .map(([id]) => id);

    return {
      status: available.length > 0 ? "healthy" : "critical",
      availableProviders: available,
      disabledProviders: [...this.killSwitches],
      cacheSize: this.cache.size,
      budgets: Object.fromEntries(this.budgets),
      metrics: this.metrics,
      ts: new Date().toISOString(),
    };
  }
}

// ── Singleton ──────────────────────────────────────────────────
const gate = new HeadyGate();

// ── Express Routes ─────────────────────────────────────────────
function registerGateRoutes(app) {
  app.post("/api/gate/route", async (req, res) => {
    try {
      const result = await gate.route(req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/gate/providers", (req, res) => {
    const providers = Object.entries(PROVIDERS).map(([id, cfg]) => ({
      id, label: cfg.label, available: !gate.killSwitches.has(id) && (!cfg.envKey || !!process.env[cfg.envKey]),
      costPer1kIn: cfg.costPer1kIn, costPer1kOut: cfg.costPer1kOut,
    }));
    res.json({ ok: true, providers });
  });

  app.post("/api/gate/kill/:provider", (req, res) => {
    gate.disableProvider(req.params.provider);
    res.json({ ok: true, disabled: req.params.provider });
  });

  app.post("/api/gate/enable/:provider", (req, res) => {
    gate.enableProvider(req.params.provider);
    res.json({ ok: true, enabled: req.params.provider });
  });

  app.post("/api/gate/budget", (req, res) => {
    const { skillId, limitTokens } = req.body;
    gate.setBudget(skillId, limitTokens);
    res.json({ ok: true, skillId, limitTokens });
  });

  app.get("/api/gate/health", (req, res) => res.json({ ok: true, ...gate.getHealth() }));
}

module.exports = { HeadyGate, gate, registerGateRoutes, PROVIDERS, FAILOVER_CHAINS };
