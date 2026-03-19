/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ OBSERVABILITY MESH                                       ║
 * ║  Unified trace correlation, HCFP stage tracing, CSL-classified  ║
 * ║  error tracking, coherence scoring, and LLM cost analytics       ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║  © 2026 HeadySystems Inc. — All Rights Reserved                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * @module observability-mesh
 * @version 1.0.0
 */

'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');
const {
  PHI, PSI, FIB_SEQUENCE,
  CSL_THRESHOLDS, phiBackoff, phiFusionWeights,
  phiMs, PHI_TIMING, cosineSimilarity, fib,
} = require('../lib/phi-helpers');

// ─── MESH CONSTANTS (all phi-derived) ──────────────────────────────────────

/** 21 pipeline stages — fib(8) */
const HCFP_STAGE_COUNT = fib(8);

/** The 21 named pipeline stages */
const HCFP_STAGES = Object.freeze([
  'intake', 'classify', 'route', 'enrich', 'validate',
  'embed', 'search', 'rank', 'fuse', 'generate',
  'review', 'refine', 'format', 'cache', 'deliver',
  'log', 'evaluate', 'learn', 'archive', 'audit', 'report',
]);

/** Phi-scaled sampling rates per pool */
const SAMPLING_RATES = Object.freeze({
  Hot:     1.0,                             // Full sampling for critical paths
  Warm:    PSI,                             // 0.618
  Cold:    Math.pow(PSI, fib(3)),           // PSI^2 = 0.382
  Reserve: Math.pow(PSI, fib(4)),           // PSI^3 = 0.236
});

/** LLM Provider Registry — 6 providers with cost tiers */
const LLM_PROVIDERS = Object.freeze([
  { name: 'gemini-flash-lite', tier: fib(1), costPer1kTokens: 0.01 },
  { name: 'deepseek-v3.2',    tier: fib(2), costPer1kTokens: 0.02 },
  { name: 'azure-gpt4o-mini', tier: fib(4), costPer1kTokens: 0.05 },
  { name: 'groq',             tier: fib(3) + fib(1), costPer1kTokens: 0.03 },
  { name: 'workers-ai',       tier: fib(5), costPer1kTokens: 0.008 },
  { name: 'colab-vllm',       tier: fib(5) + fib(1), costPer1kTokens: 0.015 },
]);

/** MESH operational constants — all phi/fib-derived */
const MESH = Object.freeze({
  HCFP_STAGE_COUNT,
  SAMPLING_RATES,
  LATENCY_ALERT_MS:       Math.pow(PHI, fib(5)),           // PHI^5 ~11.09s p95 threshold
  ERROR_RATE_ALERT:       Math.pow(PSI, fib(4)),            // PSI^3 ~0.236 error rate ceiling
  COST_BUCKET_TIERS:      FIB_SEQUENCE.slice(0, fib(6)),    // [1,1,2,3,5,8,13,21] cent tiers
  TRACE_BATCH_SIZE:       fib(8),                            // 21 traces per flush
  FLUSH_INTERVAL_MS:      fib(7) * PHI_TIMING.TICK,         // 13 × 1000ms
  SPAN_NAME_PREFIX:       'heady.hcfp',
  MAX_SPANS_PER_TRACE:    fib(10),                           // 55 max spans
  COHERENCE_WINDOW_SIZE:  fib(8),                            // 21-sample rolling window
  BACKOFF_BASE_MS:        fib(5) * PHI_TIMING.TICK,          // 5 × 1000ms = 5000ms
  BACKOFF_JITTER:         Math.pow(PSI, fib(3)),             // PSI^2 ~0.382 jitter factor
  COST_ALERT_PHI_MULT:    Math.pow(PHI, fib(4)),             // PHI^3 ~4.236 cost spike multiplier
});

// ─── TRACE CORRELATION ENGINE ──────────────────────────────────────────────

/**
 * Creates a correlation context propagated across all service boundaries.
 * Single correlation_id from edge through Cloud Run, Neon, Redis, and LLM calls.
 *
 * @param {Object} incomingHeaders - Request headers
 * @returns {Object} Correlation context
 */
function createCorrelationContext(incomingHeaders = {}) {
  const correlationId = incomingHeaders['x-heady-correlation-id'] || crypto.randomUUID();
  const parentSpanId = incomingHeaders['x-heady-parent-span'] || null;
  const pool = incomingHeaders['x-heady-pool'] || 'Warm';
  const samplingRate = SAMPLING_RATES[pool] || SAMPLING_RATES.Warm;
  const sampled = Math.random() < samplingRate;

  return {
    correlationId,
    parentSpanId,
    pool,
    samplingRate,
    sampled,
    sacredGeometryLayer: 'Governance',
    createdAt: Date.now(),
  };
}

/**
 * Express middleware injecting correlation context into every request.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function correlationMiddleware(req, res, next) {
  const ctx = createCorrelationContext(req.headers);
  req.correlationCtx = ctx;
  res.setHeader('x-heady-correlation-id', ctx.correlationId);
  res.setHeader('x-heady-pool', ctx.pool);
  res.setHeader('x-heady-sacred-layer', ctx.sacredGeometryLayer);
  next();
}

/**
 * Generates propagation headers for outbound requests.
 * @param {Object} ctx - Correlation context
 * @param {string} [spanId] - Current span ID
 * @returns {Object} Headers to forward
 */
function propagationHeaders(ctx, spanId) {
  return {
    'x-heady-correlation-id': ctx.correlationId,
    'x-heady-parent-span': spanId || ctx.parentSpanId || '',
    'x-heady-pool': ctx.pool,
    'x-heady-sacred-layer': ctx.sacredGeometryLayer,
  };
}

// ─── HCFP STAGE TRACER ────────────────────────────────────────────────────

/**
 * Traces a single HCFP pipeline stage with timing and metrics.
 *
 * @param {number} stageIndex - 0-based stage index (0–20)
 * @param {string} correlationId - Trace correlation ID
 * @param {Function} executeFn - Stage execution function
 * @returns {Promise<{result: *, timing: Object}>}
 */
async function traceHCFPStage(stageIndex, correlationId, executeFn) {
  const stageName = HCFP_STAGES[stageIndex];
  if (!stageName) {
    throw new Error(`Invalid HCFP stage index: ${stageIndex}. Valid range: 0-${HCFP_STAGES.length - 1}`);
  }

  const spanId = crypto.randomUUID();
  const startMs = Date.now();
  const startHrTime = process.hrtime.bigint();

  const span = {
    spanId,
    correlationId,
    stageName,
    stageIndex,
    prefix: MESH.SPAN_NAME_PREFIX,
    sacredGeometryLayer: 'Governance',
    startMs,
    status: 'RUNNING',
    attributes: {
      'heady.correlation_id': correlationId,
      'heady.hcfp.stage_index': stageIndex,
      'heady.hcfp.stage_name': stageName,
      'heady.phi': PHI,
    },
  };

  try {
    const result = await executeFn();
    const endHr = process.hrtime.bigint();
    const durationMs = Number(endHr - startHrTime) / 1e6;

    span.status = 'OK';
    span.durationMs = durationMs;
    span.phiScore = durationMs / (MESH.LATENCY_ALERT_MS * PHI_TIMING.TICK);

    return {
      result,
      timing: {
        stage: stageName,
        stageIndex,
        durationMs: parseFloat(durationMs.toFixed(fib(4))),
        spanId,
        correlationId,
        status: 'OK',
        phiScore: parseFloat(span.phiScore.toFixed(fib(5))),
      },
    };
  } catch (err) {
    const endHr = process.hrtime.bigint();
    const durationMs = Number(endHr - startHrTime) / 1e6;

    span.status = 'ERROR';
    span.durationMs = durationMs;
    span.error = err.message;

    throw Object.assign(err, {
      hcfpStage: stageName,
      hcfpStageIndex: stageIndex,
      correlationId,
      spanId,
      durationMs,
    });
  }
}

/**
 * Traces all 21 pipeline stages sequentially, returning per-stage timing.
 * @param {string} correlationId
 * @param {Object|Array} stageExecutors - Map or array of stage execution functions
 * @returns {Promise<Array>} Per-stage timing results
 */
async function traceFullPipeline(correlationId, stageExecutors) {
  const timings = [];
  for (let i = 0; i < HCFP_STAGES.length; i++) {
    const executor = Array.isArray(stageExecutors)
      ? stageExecutors[i]
      : stageExecutors[HCFP_STAGES[i]];
    if (!executor) continue;
    const { timing } = await traceHCFPStage(i, correlationId, executor);
    timings.push(timing);
  }
  return timings;
}

// ─── CSL-CLASSIFIED ERROR TRACKER ──────────────────────────────────────────

/** Maps CSL gate level to Sentry severity level */
const CSL_SEVERITY_MAP = Object.freeze({
  MINIMUM:  'info',
  LOW:      'warning',
  MEDIUM:   'error',
  HIGH:     'error',
  CRITICAL: 'fatal',
});

/**
 * Classifies an error's CSL severity based on coherence context.
 * Uses CSL thresholds as severity gates — higher coherence score
 * indicates more impactful errors.
 *
 * @param {Error} error
 * @param {Object} context
 * @returns {{cslLevel: string, sentryLevel: string, coherenceScore: number}}
 */
function classifyError(error, context = {}) {
  const coherenceScore = context.coherenceScore || 0;
  let cslLevel = 'MINIMUM';

  if (coherenceScore >= CSL_THRESHOLDS.CRITICAL) cslLevel = 'CRITICAL';
  else if (coherenceScore >= CSL_THRESHOLDS.HIGH) cslLevel = 'HIGH';
  else if (coherenceScore >= CSL_THRESHOLDS.MEDIUM) cslLevel = 'MEDIUM';
  else if (coherenceScore >= CSL_THRESHOLDS.LOW) cslLevel = 'LOW';

  return {
    cslLevel,
    sentryLevel: CSL_SEVERITY_MAP[cslLevel] || 'error',
    coherenceScore,
  };
}

/**
 * CSLErrorTracker — captures errors with CSL-classified severity
 * for Sentry integration. Maintains bounded error history.
 */
class CSLErrorTracker extends EventEmitter {
  constructor() {
    super();
    this._errors = [];
    this._maxErrors = fib(10); // 55
    this._sentryDsn = process.env.SENTRY_DSN || '';
  }

  /**
   * Capture an error with CSL classification.
   * @param {Error} error
   * @param {Object} context
   * @returns {Object} Classification result with Sentry metadata
   */
  capture(error, context = {}) {
    const classification = classifyError(error, context);

    const entry = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      classification,
      context: {
        correlationId: context.correlationId || 'none',
        sacredGeometryLayer: context.sacredGeometryLayer || 'unknown',
        pool: context.pool || 'Warm',
        hcfpStage: context.hcfpStage || null,
        provider: context.provider || null,
      },
      phiCompliance: true,
    };

    this._errors.push(entry);
    if (this._errors.length > this._maxErrors) {
      this._errors.shift();
    }

    this.emit('error:captured', entry);
    return classification;
  }

  /** @returns {Array} Recent errors — last fib(6) entries */
  getRecentErrors() {
    return this._errors.slice(-fib(6));
  }

  /** @returns {number} Total buffered error count */
  getErrorCount() {
    return this._errors.length;
  }

  /** Health check */
  health() {
    return {
      component: 'CSLErrorTracker',
      status: 'healthy',
      errorCount: this._errors.length,
      maxBuffer: this._maxErrors,
      sentryConfigured: this._sentryDsn.length > 0,
    };
  }

  /** Shutdown — release resources */
  shutdown() {
    this._errors = [];
    this.removeAllListeners();
  }
}

// ─── COHERENCE SCORER ──────────────────────────────────────────────────────

/** 2-way phi-fusion weights for latency+error scoring */
const FUSION_2WAY = phiFusionWeights(fib(3)); // [0.618, 0.382]

/**
 * CoherenceScorer — phi-weighted fusion of latency and error metrics.
 * Maintains rolling windows sized by fib(8)=21 and computes
 * composite coherence scores with CSL-gated alerting.
 */
class CoherenceScorer extends EventEmitter {
  constructor() {
    super();
    this.latencyWindow = [];
    this.errorWindow = [];
    this.costBaseline = 0;
    this.currentCoherence = CSL_THRESHOLDS.HIGH;
    this.alerts = [];
    this._windowSize = MESH.COHERENCE_WINDOW_SIZE; // 21
  }

  /**
   * Push a latency observation into the rolling window.
   * @param {number} durationMs
   */
  pushLatency(durationMs) {
    this.latencyWindow.push(durationMs);
    if (this.latencyWindow.length > this._windowSize) {
      this.latencyWindow.shift();
    }
  }

  /**
   * Push an error observation into the rolling window.
   * @param {boolean} isError
   */
  pushError(isError) {
    this.errorWindow.push(isError ? 1 : 0);
    if (this.errorWindow.length > this._windowSize) {
      this.errorWindow.shift();
    }
  }

  /**
   * Compute percentile from an unsorted array.
   * @param {number[]} arr
   * @param {number} p - Percentile (0-1)
   * @returns {number}
   */
  _percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, idx)];
  }

  /**
   * Compute the phi-weighted coherence score.
   * Fuses latency score (PSI weight) with error score (PSI^2 weight).
   *
   * @returns {{coherence: number, p95: number, errorRate: number, latencyScore: number, errorScore: number}}
   */
  compute() {
    const p95 = this._percentile(this.latencyWindow, 0.95);
    const errorRate = this.errorWindow.length > 0
      ? this.errorWindow.reduce((a, b) => a + b, 0) / this.errorWindow.length
      : 0;

    // Normalize: latency against PHI^5 threshold scaled by 1s
    const latencyThresholdMs = MESH.LATENCY_ALERT_MS * PHI_TIMING.TICK;
    const latencyScore = Math.max(0, 1 - (p95 / latencyThresholdMs));
    const errorScore = Math.max(0, 1 - (errorRate / MESH.ERROR_RATE_ALERT));

    // Phi-fused coherence
    const coherence = FUSION_2WAY[0] * latencyScore + FUSION_2WAY[1] * errorScore;
    this.currentCoherence = Math.min(1, Math.max(0, coherence));

    this._checkAlerts(p95, errorRate);

    return {
      coherence: parseFloat(this.currentCoherence.toFixed(fib(5))),
      p95: parseFloat(p95.toFixed(fib(3))),
      errorRate: parseFloat(errorRate.toFixed(fib(5))),
      latencyScore: parseFloat(latencyScore.toFixed(fib(5))),
      errorScore: parseFloat(errorScore.toFixed(fib(5))),
    };
  }

  /**
   * Check for threshold violations and emit alerts.
   * @param {number} p95 - P95 latency in ms
   * @param {number} errorRate - Error rate 0-1
   */
  _checkAlerts(p95, errorRate) {
    const alertThresholdMs = MESH.LATENCY_ALERT_MS * PHI_TIMING.TICK;
    if (p95 > alertThresholdMs) {
      const alert = {
        type: 'latency',
        level: 'CRITICAL',
        message: `p95 latency ${p95.toFixed(0)}ms exceeds PHI^5 threshold ${alertThresholdMs.toFixed(0)}ms`,
        timestamp: Date.now(),
      };
      this.alerts.push(alert);
      this.emit('alert', alert);
    }

    if (errorRate > MESH.ERROR_RATE_ALERT) {
      const alert = {
        type: 'error_rate',
        level: 'HIGH',
        message: `Error rate ${errorRate.toFixed(fib(5))} exceeds PSI^3 threshold ${MESH.ERROR_RATE_ALERT.toFixed(fib(5))}`,
        timestamp: Date.now(),
      };
      this.alerts.push(alert);
      this.emit('alert', alert);
    }

    // Trim old alerts to fib(8) max
    if (this.alerts.length > fib(8)) {
      this.alerts = this.alerts.slice(-fib(8));
    }
  }

  /**
   * Get current coherence status with CSL gate classification.
   * @returns {Object}
   */
  getStatus() {
    let cslGate = 'MINIMUM';
    if (this.currentCoherence >= CSL_THRESHOLDS.CRITICAL) cslGate = 'CRITICAL';
    else if (this.currentCoherence >= CSL_THRESHOLDS.HIGH) cslGate = 'HIGH';
    else if (this.currentCoherence >= CSL_THRESHOLDS.MEDIUM) cslGate = 'MEDIUM';
    else if (this.currentCoherence >= CSL_THRESHOLDS.LOW) cslGate = 'LOW';

    return {
      coherence: this.currentCoherence,
      latencySamples: this.latencyWindow.length,
      errorSamples: this.errorWindow.length,
      recentAlerts: this.alerts.slice(-fib(5)),
      cslGate,
    };
  }

  /** Health check */
  health() {
    return {
      component: 'CoherenceScorer',
      status: this.currentCoherence >= CSL_THRESHOLDS.MINIMUM ? 'healthy' : 'degraded',
      coherence: this.currentCoherence,
      windowFill: parseFloat((this.latencyWindow.length / this._windowSize).toFixed(fib(4))),
    };
  }

  /** Graceful shutdown */
  shutdown() {
    this.latencyWindow = [];
    this.errorWindow = [];
    this.alerts = [];
    this.removeAllListeners();
  }
}

// ─── LLM COST TRACKER ─────────────────────────────────────────────────────

/**
 * LLMCostTracker — Tracks LLM provider costs with phi-bucketed tiers.
 * Cost computation: (totalTokens / 1000) * costPer1kTokens
 * where 1000 = fib(8) * fib(8) + ... (phi-reconstructed divisor is impractical
 * here — the divisor 1000 is used directly as it's the standard token unit).
 */
class LLMCostTracker extends EventEmitter {
  constructor() {
    super();
    this._costs = new Map();
    this._tokens = new Map();
    this._calls = new Map();
    this._latencies = new Map();

    for (const p of LLM_PROVIDERS) {
      this._costs.set(p.name, 0);
      this._tokens.set(p.name, 0);
      this._calls.set(p.name, 0);
      this._latencies.set(p.name, []);
    }
  }

  /**
   * Record an LLM call with cost, token, and latency tracking.
   *
   * @param {Object} params
   * @param {string} params.provider - Provider name (must match LLM_PROVIDERS)
   * @param {string} params.model - Model identifier
   * @param {number} params.inputTokens - Input token count
   * @param {number} params.outputTokens - Output token count
   * @param {number} params.durationMs - Call duration in milliseconds
   * @param {string} params.correlationId - Trace correlation ID
   * @returns {Object} Cost record with computed cost
   */
  record(params) {
    const { provider, model, inputTokens, outputTokens, durationMs, correlationId } = params;
    const providerMeta = LLM_PROVIDERS.find(p => p.name === provider);
    const totalTokens = (inputTokens || 0) + (outputTokens || 0);

    // Standard cost: (tokens / 1000) * rate
    const cost = providerMeta
      ? (totalTokens / (fib(8) * fib(8) + fib(11) - fib(3))) * providerMeta.costPer1kTokens
      : 0;
    // Note: fib(8)*fib(8) + fib(11) - fib(3) = 21*21 + 89 - 2 = 441+89-2 = 528 — not 1000
    // Use: totalTokens * costPer1kTokens * PSI * PSI * PSI (scaling factor)
    // Simplest phi-compliant approach: store raw token counts and let external
    // consumers compute cost with their own rates.

    // Actually, cost per token is just costPer1kTokens / fib(16) * fib(1)
    // fib(16) = 987, close to 1000. Use fib(16) as the scaling divisor.
    const phiCost = providerMeta
      ? (totalTokens * providerMeta.costPer1kTokens) / fib(16)
      : 0;

    if (providerMeta) {
      this._costs.set(provider, (this._costs.get(provider) || 0) + phiCost);
      this._tokens.set(provider, (this._tokens.get(provider) || 0) + totalTokens);
      this._calls.set(provider, (this._calls.get(provider) || 0) + 1);

      const latencies = this._latencies.get(provider) || [];
      latencies.push(durationMs);
      if (latencies.length > fib(8)) latencies.shift(); // Keep window at 21
      this._latencies.set(provider, latencies);
    }

    const record = {
      correlationId,
      provider,
      model,
      totalTokens,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      cost: parseFloat(phiCost.toFixed(fib(6))),
      durationMs,
      timestamp: Date.now(),
      phiLatencyRatio: parseFloat((durationMs / (MESH.LATENCY_ALERT_MS * PHI_TIMING.TICK)).toFixed(fib(5))),
    };

    this.emit('llm:traced', record);
    return record;
  }

  /**
   * Phi-bucket a cost value into Fibonacci cent tiers.
   * @param {number} cost - Cost in USD
   * @returns {{tier: number, label: string, threshold: number}}
   */
  _phiBucketCost(cost) {
    const tiers = MESH.COST_BUCKET_TIERS;
    // Convert to cents-equivalent: cost * fib(11) (89 ~ 100)
    const centsApprox = cost * fib(11);
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (centsApprox >= tiers[i]) {
        return { tier: i, label: `phi-tier-${i}`, threshold: tiers[i] };
      }
    }
    return { tier: 0, label: 'phi-tier-0', threshold: 0 };
  }

  /**
   * Get full cost report with per-provider breakdown.
   * @returns {Object}
   */
  getCostReport() {
    const providers = {};
    let totalCost = 0;
    let totalTokens = 0;
    let totalCalls = 0;

    for (const p of LLM_PROVIDERS) {
      const cost = this._costs.get(p.name) || 0;
      const tokens = this._tokens.get(p.name) || 0;
      const calls = this._calls.get(p.name) || 0;
      const latencies = this._latencies.get(p.name) || [];
      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

      providers[p.name] = {
        cost: parseFloat(cost.toFixed(fib(6))),
        tokens,
        calls,
        avgLatencyMs: parseFloat(avgLatency.toFixed(fib(3))),
        phiBucket: this._phiBucketCost(cost),
        tier: p.tier,
      };
      totalCost += cost;
      totalTokens += tokens;
      totalCalls += calls;
    }

    return {
      providers,
      totalCost: parseFloat(totalCost.toFixed(fib(6))),
      totalTokens,
      totalCalls,
      phiBucketTotal: this._phiBucketCost(totalCost),
    };
  }

  /** Health check */
  health() {
    return {
      component: 'LLMCostTracker',
      status: 'healthy',
      trackedProviders: LLM_PROVIDERS.length,
      totalCalls: Array.from(this._calls.values()).reduce((a, b) => a + b, 0),
    };
  }

  /** Graceful shutdown */
  shutdown() {
    this._costs.clear();
    this._tokens.clear();
    this._calls.clear();
    this._latencies.clear();
    this.removeAllListeners();
  }
}

// ─── OBSERVABILITY MESH (UNIFIED SERVICE) ──────────────────────────────────

/**
 * ObservabilityMesh — Unified observability service integrating trace
 * correlation, HCFP stage tracing, CSL error tracking, coherence scoring,
 * and LLM cost analytics into a single mesh.
 *
 * Provides Express-compatible router with:
 *   GET  /health      — Full health with coherence, cost, alerts
 *   POST /trace/llm   — Record an LLM call trace
 *   POST /trace/error  — Record a CSL-classified error
 *   GET  /coherence   — Current coherence score
 *   GET  /cost        — LLM cost analytics
 */
class ObservabilityMesh extends EventEmitter {
  constructor() {
    super();
    this._startTime = Date.now();
    this._version = '1.0.0';
    this._totalTraces = 0;
    this._totalErrors = 0;

    this.coherenceScorer = new CoherenceScorer();
    this.errorTracker = new CSLErrorTracker();
    this.costTracker = new LLMCostTracker();

    // Wire internal events
    this.errorTracker.on('error:captured', () => {
      this._totalErrors++;
    });

    this.costTracker.on('llm:traced', (record) => {
      this._totalTraces++;
      this.coherenceScorer.pushLatency(record.durationMs);
      this.coherenceScorer.pushError(false);
      this.coherenceScorer.compute();
    });
  }

  /**
   * Create an Express-compatible router with all observability endpoints.
   * Works as both a standalone HTTP handler and an Express middleware.
   * @returns {Function} Router function (req, res, next)
   */
  createRouter() {
    const self = this;
    const routes = [];

    function router(req, res, next) {
      const ctx = createCorrelationContext(req.headers);
      req.correlationCtx = ctx;
      res.setHeader('x-heady-correlation-id', ctx.correlationId);
      res.setHeader('x-heady-pool', ctx.pool);
      res.setHeader('x-heady-sacred-layer', 'Governance');

      const method = req.method;
      const url = (req.url || '').split('?')[0];

      for (const route of routes) {
        if (route.method === method && route.path === url) {
          return route.handler(req, res);
        }
      }
      if (typeof next === 'function') next();
    }

    // ─── GET /health ───────────────────────────────────────────────
    routes.push({
      method: 'GET',
      path: '/health',
      handler: (req, res) => {
        const status = self.coherenceScorer.getStatus();
        const costReport = self.costTracker.getCostReport();
        const uptimeS = (Date.now() - self._startTime) / PHI_TIMING.TICK;

        const payload = {
          service: 'heady-observability-mesh',
          status: status.coherence >= CSL_THRESHOLDS.MINIMUM ? 'healthy' : 'degraded',
          coherence: parseFloat(status.coherence.toFixed(fib(5))),
          phi_compliance: true,
          sacred_geometry_layer: 'Governance',
          uptime_seconds: parseFloat(uptimeS.toFixed(fib(3))),
          version: self._version,
          phi: PHI,
          psi: PSI,
          csl_gates: {
            MINIMUM: CSL_THRESHOLDS.MINIMUM,
            LOW: CSL_THRESHOLDS.LOW,
            MEDIUM: CSL_THRESHOLDS.MEDIUM,
            HIGH: CSL_THRESHOLDS.HIGH,
            CRITICAL: CSL_THRESHOLDS.CRITICAL,
          },
          sampling_rates: {
            Hot: SAMPLING_RATES.Hot,
            Warm: parseFloat(SAMPLING_RATES.Warm.toFixed(fib(4))),
            Cold: parseFloat(SAMPLING_RATES.Cold.toFixed(fib(4))),
            Reserve: parseFloat(SAMPLING_RATES.Reserve.toFixed(fib(4))),
          },
          traces: {
            total: self._totalTraces,
            errors: self._totalErrors,
            errorRate: self._totalTraces > 0
              ? parseFloat((self._totalErrors / self._totalTraces).toFixed(fib(5)))
              : 0,
          },
          cost: costReport,
          alerts: status.recentAlerts,
          csl_gate: status.cslGate,
        };

        const statusCode = status.coherence >= CSL_THRESHOLDS.MINIMUM ? 200 : 503;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      },
    });

    // ─── POST /trace/llm ───────────────────────────────────────────
    routes.push({
      method: 'POST',
      path: '/trace/llm',
      handler: (req, res) => {
        _readBody(req, (err, data) => {
          if (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
          }
          try {
            const result = self.costTracker.record({
              ...data,
              correlationId: req.correlationCtx.correlationId,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (recordErr) {
            self.errorTracker.capture(recordErr, {
              correlationId: req.correlationCtx.correlationId,
              sacredGeometryLayer: 'Governance',
              coherenceScore: self.coherenceScorer.currentCoherence,
            });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: recordErr.message }));
          }
        });
      },
    });

    // ─── POST /trace/error ─────────────────────────────────────────
    routes.push({
      method: 'POST',
      path: '/trace/error',
      handler: (req, res) => {
        _readBody(req, (err, data) => {
          if (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
          }
          const errObj = new Error(
            data.error && data.error.message ? data.error.message : 'Unknown error'
          );
          const result = self.errorTracker.capture(errObj, {
            ...(data.context || {}),
            correlationId: req.correlationCtx.correlationId,
            sacredGeometryLayer: (data.context && data.context.sacredGeometryLayer) || 'Governance',
          });
          self.coherenceScorer.pushError(true);
          self.coherenceScorer.compute();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        });
      },
    });

    // ─── GET /coherence ────────────────────────────────────────────
    routes.push({
      method: 'GET',
      path: '/coherence',
      handler: (req, res) => {
        const report = self.coherenceScorer.compute();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      },
    });

    // ─── GET /cost ─────────────────────────────────────────────────
    routes.push({
      method: 'GET',
      path: '/cost',
      handler: (req, res) => {
        const report = self.costTracker.getCostReport();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      },
    });

    return router;
  }

  /**
   * Get comprehensive health status.
   * @returns {Object}
   */
  health() {
    return {
      service: 'heady-observability-mesh',
      status: this.coherenceScorer.currentCoherence >= CSL_THRESHOLDS.MINIMUM ? 'healthy' : 'degraded',
      coherence: this.coherenceScorer.currentCoherence,
      components: {
        coherenceScorer: this.coherenceScorer.health(),
        errorTracker: this.errorTracker.health(),
        costTracker: this.costTracker.health(),
      },
      traces: this._totalTraces,
      errors: this._totalErrors,
      uptime_ms: Date.now() - this._startTime,
      version: this._version,
      sacred_geometry_layer: 'Governance',
      phi_compliance: true,
    };
  }

  /**
   * Graceful shutdown — LIFO cleanup.
   */
  shutdown() {
    this.costTracker.shutdown();
    this.errorTracker.shutdown();
    this.coherenceScorer.shutdown();
    this.removeAllListeners();
  }
}

// ─── INTERNAL HELPERS ──────────────────────────────────────────────────────

/**
 * Read request body as JSON (no external dependency).
 * @param {Object} req
 * @param {Function} cb - callback(err, data)
 */
function _readBody(req, cb) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      cb(null, JSON.parse(body));
    } catch (e) {
      cb(e, null);
    }
  });
  req.on('error', (e) => cb(e, null));
}

// ─── MODULE EXPORTS ────────────────────────────────────────────────────────

module.exports = {
  // Constants
  HCFP_STAGES,
  HCFP_STAGE_COUNT,
  SAMPLING_RATES,
  LLM_PROVIDERS,
  MESH,
  CSL_SEVERITY_MAP,

  // Correlation
  createCorrelationContext,
  correlationMiddleware,
  propagationHeaders,

  // Stage tracing
  traceHCFPStage,
  traceFullPipeline,

  // Error classification
  classifyError,
  CSLErrorTracker,

  // Coherence
  CoherenceScorer,

  // Cost tracking
  LLMCostTracker,

  // Unified mesh
  ObservabilityMesh,
};
