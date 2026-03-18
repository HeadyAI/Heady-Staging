---
name: heady-observability-mesh
description: >-
  Unified AI observability mesh weaving Langfuse LLM tracing, Sentry error tracking,
  and OpenTelemetry distributed tracing into a single coherent fabric for the Heady
  ecosystem. Every HCFullPipeline stage (all 21) is wrapped in OTel spans with a
  single correlation ID flowing edge (Cloudflare) → origin (Cloud Run) → DB (Neon) →
  LLM providers. Phi-scaled sampling rates: Hot 100%, Warm 61.8%, Cold 38.2%, Reserve
  23.6%. CSL-gated alerting: latency at p95 > PHI^5 ms (~11.1s), error rate > PSI^3
  (~0.236). Tracks per-provider LLM cost with phi-bucketed tiers, prompt versioning,
  and agent decision-tree visualization. Integrates with telemetry-bee, health-bee,
  OBSERVER, and all Sacred Geometry layers as the Governance-level witness.
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Governance
  phi-compliance: verified
---

# Heady Observability Mesh

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **LLM call tracing** — track latency, tokens, cost, and model for every call in the 6-provider LLM chain
- **Prompt versioning** — Langfuse prompt registry with coherence-scored A/B evaluation
- **Error classification** — Sentry events tagged with CSL severity levels and Sacred Geometry layer
- **Distributed trace correlation** — single correlation ID across Cloudflare → Cloud Run → Neon → LLM
- **HCFullPipeline stage profiling** — OTel spans for each of the 21 HCFP stages
- **Cost analytics** — phi-bucketed per-provider cost dashboards (Gemini, DeepSeek, Azure, Groq, Workers AI, Colab)
- **Agent decision-tree visualization** — trace HeadyBee decision paths through Sacred Geometry topology
- **Alerting** — CSL-gated thresholds for latency, error rates, cost spikes, and coherence drift
- **Sampling optimization** — phi-scaled sampling rates to balance observability vs. overhead
- **Health coherence** — continuous coherence scoring across all monitored services

## Architecture

```
Sacred Geometry Topology — Observability Mesh Position:
Center(HeadySoul) → Inner(Conductor,Brains,Vinci,AutoSuccess)
   → Middle(JULES,BUILDER,OBSERVER,MURPHY,ATLAS,PYTHIA)
   → Outer(BRIDGE,MUSE,SENTINEL,NOVA,JANITOR,SOPHIA,CIPHER,LENS)
   → Governance ← OBSERVABILITY MESH (watches ALL layers)

┌──────────────────────────────────────────────────────────────────┐
│                     OBSERVABILITY MESH                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  TRACE CORRELATOR                                          │  │
│  │  Cloudflare Edge → Cloud Run Origin → Neon DB → LLM Chain  │  │
│  │  Single correlation_id across all hops                      │  │
│  └───────────────────────┬────────────────────────────────────┘  │
│                          ▼                                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │ Langfuse │  │ OpenTelemetry│  │ Sentry                    │  │
│  │ LLM Trace│  │ Dist. Spans  │  │ Error Track + CSL Severity│  │
│  │ + Prompt │  │ 21 HCFP Stgs │  │ + Sacred Geometry Tags    │  │
│  │ Registry │  │ + Sampling   │  │                           │  │
│  └─────┬────┘  └──────┬───────┘  └────────────┬──────────────┘  │
│        └───────────────┼───────────────────────┘                 │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  UNIFIED DASHBOARD                                         │  │
│  │  Cost Tiers │ Latency Heatmap │ Agent Trees │ Coherence    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Bees: telemetry-bee │ health-bee │ cost-bee                     │
└──────────────────────────────────────────────────────────────────┘
```

## Phi-Math Constants

```javascript
// ─── Sacred Geometry Constants ─────────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Confidence Gates ──────────────────────────────────────────────
const CSL_GATES = {
  MINIMUM:  0.500,
  LOW:      0.691,
  MEDIUM:   0.809,
  HIGH:     0.882,
  CRITICAL: 0.927,
  DEDUP:    0.972,
};

// ─── Pool Allocations ──────────────────────────────────────────────────
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

// ─── Observability Mesh Constants ──────────────────────────────────────
const MESH = {
  HCFP_STAGE_COUNT:       FIB[7],                           // 21 pipeline stages
  SAMPLING_RATES: {
    Hot:     1.0,                                            // 100% — critical paths
    Warm:    PSI,                                            // 0.618 — normal paths
    Cold:    PSI ** 2,                                       // 0.382 — background paths
    Reserve: PSI ** 3,                                       // 0.236 — low-priority
  },
  LATENCY_ALERT_MS:       PHI ** 5,                          // ~11.09s p95 threshold
  ERROR_RATE_ALERT:       PSI ** 3,                          // ~0.236 error rate threshold
  COST_BUCKET_TIERS:      FIB.slice(0, 8),                   // [1,1,2,3,5,8,13,21] cent tiers
  TRACE_BATCH_SIZE:       FIB[7],                            // 21 traces per flush
  FLUSH_INTERVAL_MS:      FIB[6] * 1000,                     // 13000ms flush cycle
  SPAN_NAME_PREFIX:       'heady.hcfp',
  MAX_SPANS_PER_TRACE:    FIB[9],                            // 55 max spans
  COHERENCE_WINDOW_SIZE:  FIB[7],                            // 21-sample rolling window
  BACKOFF_BASE_MS:        FIB[4] * 100,                      // 300ms base backoff
  BACKOFF_JITTER:         PSI ** 2,                          // ±0.382 jitter
  PROMPT_VERSION_TTL_S:   FIB[13] * 60,                      // 377 min prompt cache TTL
  COST_ALERT_PHI_MULT:    PHI ** 3,                          // ~4.236 cost spike multiplier
};

// ─── LLM Provider Registry ─────────────────────────────────────────────
const LLM_PROVIDERS = [
  { name: 'gemini-flash-lite', tier: 1, costPer1kTokens: 0.01 },
  { name: 'deepseek-v3.2',    tier: 2, costPer1kTokens: 0.02 },
  { name: 'azure-gpt4o-mini', tier: 3, costPer1kTokens: 0.05 },
  { name: 'groq',             tier: 4, costPer1kTokens: 0.03 },
  { name: 'workers-ai',       tier: 5, costPer1kTokens: 0.008 },
  { name: 'colab-vllm',       tier: 6, costPer1kTokens: 0.015 },
];

// ─── HCFP Stage Names ──────────────────────────────────────────────────
const HCFP_STAGES = [
  'intake', 'classify', 'route', 'enrich', 'validate',
  'embed', 'search', 'rank', 'fuse', 'generate',
  'review', 'refine', 'format', 'cache', 'deliver',
  'log', 'evaluate', 'learn', 'archive', 'audit', 'report',
];
```

## Instructions

### Trace Correlation Engine

The Trace Correlator assigns a single `correlation_id` at the Cloudflare edge and propagates it through every downstream hop — Cloud Run origin, Neon Postgres queries, Upstash Redis lookups, and LLM provider calls. This ID ties together OTel spans, Langfuse traces, and Sentry breadcrumbs.

```javascript
// heady-observability-mesh/src/correlator.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-observability-mesh', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const MESH = {
  HCFP_STAGE_COUNT: FIB[7],
  SAMPLING_RATES: { Hot: 1.0, Warm: PSI, Cold: PSI ** 2, Reserve: PSI ** 3 },
  LATENCY_ALERT_MS: PHI ** 5,
  ERROR_RATE_ALERT: PSI ** 3,
  TRACE_BATCH_SIZE: FIB[7],
  FLUSH_INTERVAL_MS: FIB[6] * 1000,
  MAX_SPANS_PER_TRACE: FIB[9],
  COHERENCE_WINDOW_SIZE: FIB[7],
  BACKOFF_BASE_MS: FIB[4] * 100,
  BACKOFF_JITTER: PSI ** 2,
  COST_ALERT_PHI_MULT: PHI ** 3,
};

/**
 * Generates a correlation context propagated across all service boundaries.
 */
export function createCorrelationContext(incomingHeaders = {}) {
  const correlationId = incomingHeaders['x-heady-correlation-id'] || randomUUID();
  const parentSpanId = incomingHeaders['x-heady-parent-span'] || null;
  const pool = incomingHeaders['x-heady-pool'] || 'Warm';
  const samplingRate = MESH.SAMPLING_RATES[pool] ?? MESH.SAMPLING_RATES.Warm;
  const sampled = Math.random() < samplingRate;

  const ctx = {
    correlationId,
    parentSpanId,
    pool,
    samplingRate,
    sampled,
    sacredGeometryLayer: 'Governance',
    createdAt: Date.now(),
  };

  log.info({ correlationId, pool, sampled, samplingRate }, 'Correlation context created');
  return ctx;
}

/**
 * Express middleware injecting correlation context into every request.
 */
export function correlationMiddleware(req, res, next) {
  const ctx = createCorrelationContext(req.headers);
  req.correlationCtx = ctx;
  res.setHeader('x-heady-correlation-id', ctx.correlationId);
  res.setHeader('x-heady-pool', ctx.pool);
  next();
}

/**
 * Propagation headers for outbound requests (Cloud Run → Neon, Redis, LLM).
 */
export function propagationHeaders(ctx, spanId) {
  return {
    'x-heady-correlation-id': ctx.correlationId,
    'x-heady-parent-span': spanId || ctx.parentSpanId,
    'x-heady-pool': ctx.pool,
    'x-heady-sacred-layer': ctx.sacredGeometryLayer,
  };
}
```

### OpenTelemetry Span Wrapper for HCFP Stages

Each of the 21 HCFullPipeline stages is wrapped in an OTel span capturing timing, status, and phi-scored metrics.

```javascript
// heady-observability-mesh/src/otel-hcfp.mjs
import { trace, SpanStatusCode, context, propagation } from '@opentelemetry/api';
import pino from 'pino';

const log = pino({ name: 'heady-otel-hcfp', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const HCFP_STAGES = [
  'intake', 'classify', 'route', 'enrich', 'validate',
  'embed', 'search', 'rank', 'fuse', 'generate',
  'review', 'refine', 'format', 'cache', 'deliver',
  'log', 'evaluate', 'learn', 'archive', 'audit', 'report',
];

const tracer = trace.getTracer('heady-observability-mesh', '1.0.0');

/**
 * Wraps an HCFP stage execution in an OpenTelemetry span.
 */
export async function traceHCFPStage(stageIndex, correlationId, executeFn) {
  const stageName = HCFP_STAGES[stageIndex];
  if (!stageName) throw new Error(`Invalid HCFP stage index: ${stageIndex}`);

  return tracer.startActiveSpan(`heady.hcfp.${stageName}`, async (span) => {
    const startMs = performance.now();
    span.setAttribute('heady.correlation_id', correlationId);
    span.setAttribute('heady.hcfp.stage_index', stageIndex);
    span.setAttribute('heady.hcfp.stage_name', stageName);
    span.setAttribute('heady.sacred_geometry_layer', 'Governance');
    span.setAttribute('heady.phi', PHI);

    try {
      const result = await executeFn();
      const durationMs = performance.now() - startMs;
      span.setAttribute('heady.hcfp.duration_ms', durationMs);
      span.setAttribute('heady.hcfp.phi_score', durationMs / (PHI ** 5));
      span.setStatus({ code: SpanStatusCode.OK });

      log.info({ stage: stageName, stageIndex, durationMs: durationMs.toFixed(2),
        correlationId }, 'HCFP stage traced');
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      log.error({ stage: stageName, stageIndex, err: err.message, correlationId },
        'HCFP stage failed');
      throw err;
    } finally {
      span.end();
    }
  });
}

/**
 * Traces the full 21-stage pipeline, returning per-stage timing.
 */
export async function traceFullPipeline(correlationId, stageExecutors) {
  const timings = [];
  for (let i = 0; i < HCFP_STAGES.length; i++) {
    const executor = stageExecutors[i] || stageExecutors[HCFP_STAGES[i]];
    if (!executor) continue;
    const start = performance.now();
    await traceHCFPStage(i, correlationId, executor);
    timings.push({ stage: HCFP_STAGES[i], index: i, durationMs: performance.now() - start });
  }
  return timings;
}
```

### Langfuse LLM Tracing and Cost Analytics

Wraps every LLM call in the chain with Langfuse trace generation tracking model, tokens, latency, and cost per provider.

```javascript
// heady-observability-mesh/src/langfuse-tracer.mjs
import { Langfuse } from 'langfuse';
import pino from 'pino';

const log = pino({ name: 'heady-langfuse-tracer', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const LLM_PROVIDERS = [
  { name: 'gemini-flash-lite', tier: 1, costPer1kTokens: 0.01 },
  { name: 'deepseek-v3.2',    tier: 2, costPer1kTokens: 0.02 },
  { name: 'azure-gpt4o-mini', tier: 3, costPer1kTokens: 0.05 },
  { name: 'groq',             tier: 4, costPer1kTokens: 0.03 },
  { name: 'workers-ai',       tier: 5, costPer1kTokens: 0.008 },
  { name: 'colab-vllm',       tier: 6, costPer1kTokens: 0.015 },
];

export class LangfuseTracer {
  constructor() {
    this.langfuse = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    });
    this.costAccumulator = new Map();
    for (const p of LLM_PROVIDERS) this.costAccumulator.set(p.name, 0);
    log.info('Langfuse tracer initialized');
  }

  async traceLLMCall({ correlationId, provider, model, prompt, completion, inputTokens, outputTokens, durationMs }) {
    const providerMeta = LLM_PROVIDERS.find((p) => p.name === provider);
    const totalTokens = inputTokens + outputTokens;
    const cost = providerMeta
      ? (totalTokens / 1000) * providerMeta.costPer1kTokens
      : 0;

    const langfuseTrace = this.langfuse.trace({
      id: correlationId,
      name: `llm-call-${provider}`,
      metadata: {
        sacred_geometry_layer: 'Governance',
        phi_compliance: true,
        provider_tier: providerMeta?.tier || 0,
      },
    });

    langfuseTrace.generation({
      name: model,
      model,
      input: prompt,
      output: completion,
      usage: { input: inputTokens, output: outputTokens, total: totalTokens, unit: 'TOKENS' },
      metadata: {
        provider,
        cost_usd: cost,
        duration_ms: durationMs,
        phi_latency_ratio: durationMs / (PHI ** 5),
      },
    });

    if (providerMeta) {
      const prev = this.costAccumulator.get(provider) || 0;
      this.costAccumulator.set(provider, prev + cost);
    }

    log.info({ correlationId, provider, model, totalTokens, cost: cost.toFixed(6),
      durationMs }, 'LLM call traced in Langfuse');
    return { correlationId, provider, cost, totalTokens, durationMs };
  }

  getCostReport() {
    const report = {};
    let totalCost = 0;
    for (const [provider, cost] of this.costAccumulator.entries()) {
      report[provider] = { cost, phiBucket: this.phiBucketCost(cost) };
      totalCost += cost;
    }
    return { providers: report, totalCost, phiBucketTotal: this.phiBucketCost(totalCost) };
  }

  phiBucketCost(cost) {
    const tiers = [1, 1, 2, 3, 5, 8, 13, 21];
    const costCents = cost * 100;
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (costCents >= tiers[i]) return { tier: i, label: `φ-tier-${i}`, threshold: tiers[i] };
    }
    return { tier: 0, label: 'φ-tier-0', threshold: 0 };
  }

  async flush() {
    await this.langfuse.flushAsync();
    log.info('Langfuse traces flushed');
  }
}
```

### Sentry Error Tracking with CSL Severity

Wraps Sentry to classify errors by CSL confidence levels and tag them with Sacred Geometry metadata.

```javascript
// heady-observability-mesh/src/sentry-classifier.mjs
import * as Sentry from '@sentry/node';
import pino from 'pino';

const log = pino({ name: 'heady-sentry-classifier', level: process.env.LOG_LEVEL || 'info' });

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const CSL_SEVERITY_MAP = {
  MINIMUM:  'info',
  LOW:      'warning',
  MEDIUM:   'error',
  HIGH:     'error',
  CRITICAL: 'fatal',
};

export class SentryClassifier {
  constructor() {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 1.0,
    });
    log.info('Sentry classifier initialized');
  }

  classifyError(error, context = {}) {
    const coherenceScore = context.coherenceScore ?? 0;
    let cslLevel = 'MINIMUM';
    for (const [level, threshold] of Object.entries(CSL_GATES)) {
      if (coherenceScore >= threshold) cslLevel = level;
    }
    return { cslLevel, sentryLevel: CSL_SEVERITY_MAP[cslLevel] || 'error' };
  }

  captureWithCSL(error, context = {}) {
    const { cslLevel, sentryLevel } = this.classifyError(error, context);

    Sentry.withScope((scope) => {
      scope.setLevel(sentryLevel);
      scope.setTag('heady.csl_level', cslLevel);
      scope.setTag('heady.sacred_geometry_layer', context.sacredGeometryLayer || 'unknown');
      scope.setTag('heady.correlation_id', context.correlationId || 'none');
      scope.setTag('heady.pool', context.pool || 'Warm');

      if (context.hcfpStage) scope.setTag('heady.hcfp_stage', context.hcfpStage);
      if (context.provider) scope.setTag('heady.llm_provider', context.provider);

      scope.setContext('heady_observability', {
        coherenceScore: context.coherenceScore,
        cslLevel,
        phiCompliance: true,
        sacredGeometryLayer: context.sacredGeometryLayer,
      });

      Sentry.captureException(error);
    });

    log.warn({ cslLevel, sentryLevel, err: error.message,
      correlationId: context.correlationId }, 'Error captured with CSL classification');
    return { cslLevel, sentryLevel };
  }
}
```

### Coherence Scorer and Alerting Engine

Rolls up trace data, error rates, and latency into a single phi-weighted coherence score with CSL-gated alerting.

```javascript
// heady-observability-mesh/src/coherence.mjs
import pino from 'pino';

const log = pino({ name: 'heady-coherence', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const FUSION_2WAY = [PSI, 1 - PSI];        // [0.618, 0.382]
const FUSION_3WAY = [0.528, 0.326, 0.146]; // 3-way phi fusion

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const MESH = {
  LATENCY_ALERT_MS: PHI ** 5,
  ERROR_RATE_ALERT: PSI ** 3,
  COHERENCE_WINDOW_SIZE: FIB[7],
  COST_ALERT_PHI_MULT: PHI ** 3,
};

export class CoherenceScorer {
  constructor() {
    this.latencyWindow = [];
    this.errorWindow = [];
    this.costBaseline = 0;
    this.currentCoherence = CSL_GATES.HIGH;
    this.alerts = [];
  }

  pushLatency(durationMs) {
    this.latencyWindow.push(durationMs);
    if (this.latencyWindow.length > MESH.COHERENCE_WINDOW_SIZE) this.latencyWindow.shift();
  }

  pushError(isError) {
    this.errorWindow.push(isError ? 1 : 0);
    if (this.errorWindow.length > MESH.COHERENCE_WINDOW_SIZE) this.errorWindow.shift();
  }

  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, idx)];
  }

  computeCoherence() {
    const p95 = this.percentile(this.latencyWindow, 0.95);
    const errorRate = this.errorWindow.length > 0
      ? this.errorWindow.reduce((a, b) => a + b, 0) / this.errorWindow.length
      : 0;

    const latencyScore = Math.max(0, 1 - (p95 / (MESH.LATENCY_ALERT_MS * 1000)));
    const errorScore = Math.max(0, 1 - (errorRate / MESH.ERROR_RATE_ALERT));

    const coherence = FUSION_2WAY[0] * latencyScore + FUSION_2WAY[1] * errorScore;
    this.currentCoherence = Math.min(1, Math.max(0, coherence));

    this.checkAlerts(p95, errorRate);

    log.info({ coherence: this.currentCoherence.toFixed(4), p95: p95.toFixed(2),
      errorRate: errorRate.toFixed(4) }, 'Coherence computed');
    return { coherence: this.currentCoherence, p95, errorRate, latencyScore, errorScore };
  }

  checkAlerts(p95, errorRate) {
    if (p95 > MESH.LATENCY_ALERT_MS * 1000) {
      const alert = { type: 'latency', level: 'CRITICAL',
        message: `p95 latency ${p95.toFixed(0)}ms exceeds PHI^5 threshold ${(MESH.LATENCY_ALERT_MS * 1000).toFixed(0)}ms`,
        timestamp: Date.now() };
      this.alerts.push(alert);
      log.warn(alert, 'Latency alert fired');
    }
    if (errorRate > MESH.ERROR_RATE_ALERT) {
      const alert = { type: 'error_rate', level: 'HIGH',
        message: `Error rate ${errorRate.toFixed(4)} exceeds PSI^3 threshold ${MESH.ERROR_RATE_ALERT.toFixed(4)}`,
        timestamp: Date.now() };
      this.alerts.push(alert);
      log.warn(alert, 'Error rate alert fired');
    }
  }

  getStatus() {
    return {
      coherence: this.currentCoherence,
      latencySamples: this.latencyWindow.length,
      errorSamples: this.errorWindow.length,
      recentAlerts: this.alerts.slice(-FIB[4]),
      cslGate: this.currentCoherence >= CSL_GATES.HIGH ? 'HIGH'
        : this.currentCoherence >= CSL_GATES.MEDIUM ? 'MEDIUM'
        : this.currentCoherence >= CSL_GATES.LOW ? 'LOW' : 'MINIMUM',
    };
  }
}
```

### Express Router and Health Endpoint

```javascript
// heady-observability-mesh/src/router.mjs
import express from 'express';
import pino from 'pino';
import { correlationMiddleware } from './correlator.mjs';
import { LangfuseTracer } from './langfuse-tracer.mjs';
import { SentryClassifier } from './sentry-classifier.mjs';
import { CoherenceScorer } from './coherence.mjs';

const log = pino({ name: 'heady-observability-mesh', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

export function createObservabilityRouter() {
  const router = express.Router();
  const langfuse = new LangfuseTracer();
  const sentry = new SentryClassifier();
  const coherence = new CoherenceScorer();
  let totalTraces = 0;
  let totalErrors = 0;

  router.use(correlationMiddleware);

  router.get('/health', (req, res) => {
    const status = coherence.getStatus();
    const costReport = langfuse.getCostReport();
    res.json({
      service: 'heady-observability-mesh',
      status: status.coherence >= 0.500 ? 'healthy' : 'degraded',
      coherence: parseFloat(status.coherence.toFixed(4)),
      phi_compliance: true,
      sacred_geometry_layer: 'Governance',
      uptime_seconds: parseFloat(process.uptime().toFixed(2)),
      version: '1.0.0',
      phi: PHI,
      psi: PSI,
      csl_gates: { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 },
      sampling_rates: { Hot: 1.0, Warm: PSI.toFixed(3), Cold: (PSI ** 2).toFixed(3), Reserve: (PSI ** 3).toFixed(3) },
      traces: { total: totalTraces, errors: totalErrors, errorRate: totalTraces > 0 ? (totalErrors / totalTraces).toFixed(4) : '0' },
      cost: costReport,
      alerts: status.recentAlerts,
      csl_gate: status.cslGate,
    });
  });

  router.post('/trace/llm', async (req, res) => {
    try {
      const result = await langfuse.traceLLMCall({ ...req.body, correlationId: req.correlationCtx.correlationId });
      coherence.pushLatency(result.durationMs);
      coherence.pushError(false);
      totalTraces++;
      coherence.computeCoherence();
      res.json(result);
    } catch (err) {
      coherence.pushError(true);
      totalErrors++;
      sentry.captureWithCSL(err, { correlationId: req.correlationCtx.correlationId,
        sacredGeometryLayer: 'Governance', coherenceScore: coherence.currentCoherence });
      log.error({ err: err.message }, 'LLM trace failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/trace/error', (req, res) => {
    const { error, context: ctx } = req.body;
    const err = new Error(error?.message || 'Unknown error');
    const result = sentry.captureWithCSL(err, {
      ...ctx, correlationId: req.correlationCtx.correlationId,
      sacredGeometryLayer: ctx?.sacredGeometryLayer || 'Governance',
    });
    coherence.pushError(true);
    totalErrors++;
    coherence.computeCoherence();
    res.json(result);
  });

  router.get('/coherence', (req, res) => {
    const report = coherence.computeCoherence();
    res.json(report);
  });

  router.get('/cost', (req, res) => {
    res.json(langfuse.getCostReport());
  });

  return router;
}
```

## Integration Points

| Component          | Interface                          | Sacred Geometry Layer |
|--------------------|------------------------------------|----------------------|
| **OBSERVER**       | Receives span data and coherence   | Middle               |
| **MURPHY**         | Security event classification      | Middle               |
| **Conductor**      | Pipeline orchestration traces      | Inner                |
| **Brains**         | LLM call tracing per provider      | Inner                |
| **SENTINEL**       | Alert propagation                  | Outer                |
| **telemetry-bee**  | HeadyBee collecting OTel spans     | Bee                  |
| **health-bee**     | HeadyBee polling /health endpoints | Bee                  |
| **cost-bee**       | HeadyBee aggregating LLM costs    | Bee                  |
| **Cloudflare Edge** | Correlation ID injection          | Edge                 |
| **Cloud Run**      | Origin server span context         | Origin               |
| **Neon Postgres**  | Query performance tracing          | Database             |
| **Upstash Redis**  | Cache hit/miss telemetry           | Cache                |
| **Langfuse**       | LLM trace ingestion                | External             |
| **Sentry**         | Error event ingestion              | External             |
| **heady-disaster-forge** | Resilience test observability | Governance           |
| **heady-load-forge** | Load test metrics collection     | Governance           |
| **heady-service-health-ops** | Health aggregation        | Governance           |

## API

### GET /health

Returns service health with coherence scores, trace statistics, and cost summary.

### POST /trace/llm

Traces an LLM call through Langfuse with cost tracking.

**Request:**
```json
{
  "provider": "gemini-flash-lite",
  "model": "gemini-2.0-flash-lite",
  "prompt": "...",
  "completion": "...",
  "inputTokens": 150,
  "outputTokens": 200,
  "durationMs": 342
}
```

### POST /trace/error

Captures an error with CSL severity classification via Sentry.

**Request:**
```json
{
  "error": { "message": "LLM timeout" },
  "context": { "coherenceScore": 0.75, "sacredGeometryLayer": "Inner", "hcfpStage": "generate" }
}
```

### GET /coherence

Returns current coherence score with phi-fused latency and error metrics.

### GET /cost

Returns per-provider LLM cost breakdown with phi-bucketed tiers.

## Health Endpoint

```json
{
  "service": "heady-observability-mesh",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Governance",
  "uptime_seconds": 84732.41,
  "version": "1.0.0",
  "phi": 1.618033988749895,
  "psi": 0.618033988749895,
  "csl_gates": { "MINIMUM": 0.500, "LOW": 0.691, "MEDIUM": 0.809, "HIGH": 0.882, "CRITICAL": 0.927, "DEDUP": 0.972 },
  "sampling_rates": { "Hot": 1.0, "Warm": "0.618", "Cold": "0.382", "Reserve": "0.236" },
  "traces": { "total": 14420, "errors": 89, "errorRate": "0.0062" },
  "cost": {
    "providers": {
      "gemini-flash-lite": { "cost": 1.23, "phiBucket": { "tier": 6, "label": "φ-tier-6" } },
      "deepseek-v3.2": { "cost": 0.87, "phiBucket": { "tier": 5, "label": "φ-tier-5" } },
      "azure-gpt4o-mini": { "cost": 2.15, "phiBucket": { "tier": 6, "label": "φ-tier-6" } },
      "groq": { "cost": 0.45, "phiBucket": { "tier": 4, "label": "φ-tier-4" } },
      "workers-ai": { "cost": 0.12, "phiBucket": { "tier": 2, "label": "φ-tier-2" } },
      "colab-vllm": { "cost": 0.33, "phiBucket": { "tier": 4, "label": "φ-tier-4" } }
    },
    "totalCost": 5.15
  },
  "alerts": [],
  "csl_gate": "HIGH"
}
```
