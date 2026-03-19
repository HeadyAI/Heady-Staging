// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY SYSTEMS — Sentry CSL-Classified Error Tracking          ║
// ║  ∞ Every error φ-classified · Every trace Sacred Geometry      ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

'use strict';

const { PHI, PSI, FIB, CSL, POOLS } = require('../heady-phi-constants');

// ─── CSL Severity Mapping ─────────────────────────────────────────────
const CSL_SEVERITY_MAP = {
  MINIMUM:  'info',
  LOW:      'warning',
  MEDIUM:   'error',
  HIGH:     'error',
  CRITICAL: 'fatal',
};

// ─── Sacred Geometry Layer Registry ───────────────────────────────────
const SACRED_LAYERS = {
  CENTER:     { name: 'HeadySoul', ring: 0 },
  INNER:      { name: 'Conductor/Brains/Vinci', ring: 1 },
  MIDDLE:     { name: 'JULES/BUILDER/OBSERVER/MURPHY/ATLAS/PYTHIA', ring: 2 },
  OUTER:      { name: 'BRIDGE/MUSE/SENTINEL/NOVA/JANITOR/SOPHIA/CIPHER/LENS', ring: 3 },
  GOVERNANCE: { name: 'HeadyCheck/HeadyAssure/HeadyAware/HeadyPatterns', ring: 4 },
};

// ─── HCFP Stage Names (21 stages) ────────────────────────────────────
const HCFP_STAGES = [
  'intake', 'classify', 'route', 'enrich', 'validate',
  'embed', 'search', 'rank', 'fuse', 'generate',
  'review', 'refine', 'format', 'cache', 'deliver',
  'log', 'evaluate', 'learn', 'archive', 'audit', 'report',
];

// ─── LLM Provider Registry ───────────────────────────────────────────
const LLM_PROVIDERS = [
  { name: 'gemini-flash-lite', tier: 1, costPer1kTokens: 0.01 },
  { name: 'deepseek-v3.2',    tier: 2, costPer1kTokens: 0.02 },
  { name: 'azure-gpt4o-mini', tier: 3, costPer1kTokens: 0.05 },
  { name: 'groq',             tier: 4, costPer1kTokens: 0.03 },
  { name: 'workers-ai',       tier: 5, costPer1kTokens: 0.008 },
  { name: 'colab-vllm',       tier: 6, costPer1kTokens: 0.015 },
];

/**
 * SentryCslIntegration — Wraps Sentry SDK with CSL-classified severity,
 * Sacred Geometry layer tagging, HCFP stage context, and phi-scaled
 * sampling rates.
 */
class SentryCslIntegration {
  constructor(config = {}) {
    this._dsn = config.dsn || process.env.SENTRY_DSN || '';
    this._environment = config.environment || process.env.NODE_ENV || 'production';
    this._sentry = null;
    this._initialized = false;
    this._captureCount = 0;
    this._costAccumulator = new Map();
    this._startTime = Date.now();

    // Initialize cost tracking per provider
    for (const p of LLM_PROVIDERS) {
      this._costAccumulator.set(p.name, { cost: 0, calls: 0, tokens: 0 });
    }

    // Phi-scaled sampling rates per pool
    this._samplingRates = {
      Hot:     1.0,
      Warm:    PSI,
      Cold:    PSI * PSI,
      Reserve: PSI * PSI * PSI,
    };
  }

  /**
   * Initialize Sentry SDK with CSL-aware configuration.
   */
  async init() {
    if (this._initialized) return this;
    if (!this._dsn) {
      console.warn('[SentryCsl] No SENTRY_DSN configured — operating in dry-run mode');
      this._initialized = true;
      return this;
    }

    try {
      this._sentry = require('@sentry/node');
      this._sentry.init({
        dsn: this._dsn,
        environment: this._environment,
        release: process.env.npm_package_version || '4.1.0',
        tracesSampleRate: PSI, // 0.618 — phi-derived trace sampling
        profilesSampleRate: PSI * PSI, // 0.382 — lower for profiles
        integrations: [],
        beforeSend: (event) => this._enrichEvent(event),
      });
      this._initialized = true;
    } catch (err) {
      // Sentry not installed — operate in dry-run mode
      console.warn('[SentryCsl] @sentry/node not available — dry-run mode');
      this._initialized = true;
    }

    return this;
  }

  /**
   * Enrich every Sentry event with Sacred Geometry metadata.
   */
  _enrichEvent(event) {
    event.tags = event.tags || {};
    event.tags['heady.phi_compliance'] = 'true';
    event.tags['heady.version'] = '4.1.0';
    event.contexts = event.contexts || {};
    event.contexts.heady = {
      phi: PHI,
      psi: PSI,
      sacred_geometry: true,
      csl_gates: CSL,
    };
    return event;
  }

  /**
   * Classify error severity using CSL confidence gates.
   * @param {number} coherenceScore — Current system coherence (0-1)
   * @returns {{ cslLevel: string, sentryLevel: string }}
   */
  classifyError(coherenceScore = 0) {
    let cslLevel = 'MINIMUM';
    if (coherenceScore >= CSL.CRITICAL) cslLevel = 'CRITICAL';
    else if (coherenceScore >= CSL.HIGH) cslLevel = 'HIGH';
    else if (coherenceScore >= CSL.MEDIUM) cslLevel = 'MEDIUM';
    else if (coherenceScore >= CSL.LOW) cslLevel = 'LOW';

    return {
      cslLevel,
      sentryLevel: CSL_SEVERITY_MAP[cslLevel] || 'error',
    };
  }

  /**
   * Capture an error with CSL severity classification and Sacred Geometry context.
   * @param {Error} error — The error to capture
   * @param {Object} context — Additional context
   */
  captureWithCsl(error, context = {}) {
    const coherenceScore = context.coherenceScore || 0;
    const { cslLevel, sentryLevel } = this.classifyError(coherenceScore);

    this._captureCount++;

    if (this._sentry) {
      this._sentry.withScope((scope) => {
        scope.setLevel(sentryLevel);
        scope.setTag('heady.csl_level', cslLevel);
        scope.setTag('heady.sacred_geometry_layer', context.sacredGeometryLayer || 'unknown');
        scope.setTag('heady.correlation_id', context.correlationId || 'none');
        scope.setTag('heady.pool', context.pool || 'Warm');

        if (context.hcfpStage) {
          scope.setTag('heady.hcfp_stage', context.hcfpStage);
          scope.setTag('heady.hcfp_stage_index', String(HCFP_STAGES.indexOf(context.hcfpStage)));
        }
        if (context.provider) {
          scope.setTag('heady.llm_provider', context.provider);
        }
        if (context.beeType) {
          scope.setTag('heady.bee_type', context.beeType);
        }

        scope.setContext('heady_csl', {
          coherenceScore,
          cslLevel,
          sentryLevel,
          phiCompliance: true,
          pool: context.pool || 'Warm',
          sacredGeometryLayer: context.sacredGeometryLayer,
          hcfpStage: context.hcfpStage,
          samplingRate: this._samplingRates[context.pool] || PSI,
        });

        this._sentry.captureException(error);
      });
    }

    return { cslLevel, sentryLevel, captureId: this._captureCount };
  }

  /**
   * Record an LLM call cost for tracking.
   */
  recordLlmCost(provider, inputTokens, outputTokens, durationMs) {
    const providerMeta = LLM_PROVIDERS.find((p) => p.name === provider);
    const totalTokens = inputTokens + outputTokens;
    const cost = providerMeta
      ? (totalTokens / 1000) * providerMeta.costPer1kTokens
      : 0;

    const existing = this._costAccumulator.get(provider) || { cost: 0, calls: 0, tokens: 0 };
    existing.cost += cost;
    existing.calls += 1;
    existing.tokens += totalTokens;
    this._costAccumulator.set(provider, existing);

    return { provider, cost, totalTokens, durationMs };
  }

  /**
   * Get phi-bucketed cost report across all providers.
   */
  getCostReport() {
    const providers = {};
    let totalCost = 0;
    for (const [name, data] of this._costAccumulator.entries()) {
      providers[name] = {
        cost: parseFloat(data.cost.toFixed(6)),
        calls: data.calls,
        tokens: data.tokens,
        phiBucket: this._phiBucketCost(data.cost),
      };
      totalCost += data.cost;
    }
    return {
      providers,
      totalCost: parseFloat(totalCost.toFixed(6)),
      phiBucketTotal: this._phiBucketCost(totalCost),
    };
  }

  /**
   * Phi-bucket classification for costs.
   */
  _phiBucketCost(cost) {
    const tiers = FIB.slice(1, 9); // [1, 1, 2, 3, 5, 8, 13, 21]
    const costCents = cost * 100;
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (costCents >= tiers[i]) {
        return { tier: i, label: `phi-tier-${i}`, threshold: tiers[i] };
      }
    }
    return { tier: 0, label: 'phi-tier-0', threshold: 0 };
  }

  /**
   * Health check for the Sentry integration.
   */
  health() {
    const uptimeMs = Date.now() - this._startTime;
    return {
      service: 'sentry-csl-integration',
      status: this._initialized ? 'healthy' : 'uninitialized',
      mode: this._sentry ? 'live' : 'dry-run',
      coherence: this._initialized ? CSL.HIGH : CSL.MINIMUM,
      phi_compliance: true,
      sacred_geometry_layer: 'Governance',
      uptime_seconds: parseFloat((uptimeMs / 1000).toFixed(2)),
      captures: this._captureCount,
      cost: this.getCostReport(),
      csl_gates: CSL,
      sampling_rates: this._samplingRates,
    };
  }

  /**
   * Flush pending events and shut down.
   */
  async shutdown() {
    if (this._sentry) {
      await this._sentry.close(FIB[5] * 1000); // 5 seconds
    }
  }
}

// ─── Express Router ───────────────────────────────────────────────────
function createSentryRouter(integration) {
  const express = require('express');
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json(integration.health());
  });

  router.post('/capture', (req, res) => {
    const { message, context } = req.body || {};
    const error = new Error(message || 'Unknown error');
    const result = integration.captureWithCsl(error, context || {});
    res.json(result);
  });

  router.post('/cost', (req, res) => {
    const { provider, inputTokens, outputTokens, durationMs } = req.body || {};
    const result = integration.recordLlmCost(
      provider || 'unknown',
      inputTokens || 0,
      outputTokens || 0,
      durationMs || 0
    );
    res.json(result);
  });

  router.get('/cost', (req, res) => {
    res.json(integration.getCostReport());
  });

  return router;
}

module.exports = {
  SentryCslIntegration,
  createSentryRouter,
  CSL_SEVERITY_MAP,
  SACRED_LAYERS,
  HCFP_STAGES,
  LLM_PROVIDERS,
};
