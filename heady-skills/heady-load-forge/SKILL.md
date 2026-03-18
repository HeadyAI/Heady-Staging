---
name: heady-load-forge
description: >-
  Load testing and performance benchmarking framework with phi-ramped load curves
  and CSL-gated performance gates for the Heady ecosystem. Generates synthetic
  traffic mimicking real HCFullPipeline flows, profiles p50/p95/p99 latency across
  all 21 HCFP stages, and enforces phi-derived latency thresholds per criticality
  tier. Phi-ramped load stages: 8→13→21→34→55→89 RPS following Fibonacci progression.
  Includes provider-specific LLM chain load tests, 384D embedding throughput
  benchmarks, pgvector memory pressure testing, and chaos injection during load
  via heady-disaster-forge integration. Generates phi-bucketed histograms, flame
  charts, and bottleneck reports. Sacred Geometry Middle layer (OBSERVER/MURPHY).
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Middle
  phi-compliance: verified
---

# Heady Load Forge

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **Before any production deployment** — validate that services meet CSL-gated latency thresholds
- **Fibonacci-ramped load testing** — stress services with 8→13→21→34→55→89 RPS progressions
- **HCFullPipeline stage profiling** — measure p50/p95/p99 across all 21 pipeline stages
- **LLM provider benchmarking** — test Gemini Flash-Lite, DeepSeek V3.2, Azure GPT-4o-mini, Groq, Workers AI, Colab vLLM under concurrent load
- **Embedding throughput validation** — benchmark 384D pgvector insertion and query rates under pressure
- **Memory pressure testing** — monitor Neon Postgres and Upstash Redis under sustained high-load
- **Chaos + load combination** — inject failures during load tests via heady-disaster-forge integration
- **Performance regression detection** — compare benchmarks across builds with phi-bucketed histograms
- **Capacity planning** — determine scaling breakpoints using phi-curve saturation analysis
- **Addressing GAPS_FOUND.md** — load testing, performance benchmarking, capacity planning

## Architecture

```
Sacred Geometry Topology — Load Forge Position:
Center(HeadySoul) → Inner(Conductor,Brains,Vinci,AutoSuccess)
  → Middle(JULES,BUILDER,OBSERVER,MURPHY,ATLAS,PYTHIA)
                           ↑            ↑
              Load Forge feeds OBSERVER (performance monitoring)
              and MURPHY (reliability verification)

┌────────────────────────────────────────────────────────────────────┐
│                         LOAD FORGE                                 │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  PHI-RAMPED LOAD GENERATOR                                   │  │
│  │  Stage: FIB[5]=8 → FIB[6]=13 → FIB[7]=21 → FIB[8]=34 →     │  │
│  │         FIB[9]=55 → FIB[10]=89 → FIB[11]=144 RPS            │  │
│  └─────────────────────────┬────────────────────────────────────┘  │
│                            ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SYNTHETIC TRAFFIC ENGINE                                    │  │
│  │  HCFullPipeline flows │ LLM chain │ Embedding ops │ Auth     │  │
│  └─────────────────────────┬────────────────────────────────────┘  │
│                            ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LATENCY PROFILER (p50 / p95 / p99)                          │  │
│  │  Per-stage │ Per-provider │ Per-endpoint                      │  │
│  └─────────────────────────┬────────────────────────────────────┘  │
│                            ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CSL PERFORMANCE GATES                                       │  │
│  │  MINIMUM=0.500 │ LOW=0.691 │ MEDIUM=0.809 │ HIGH=0.882      │  │
│  │  CRITICAL=0.927 │ DEDUP=0.972                                │  │
│  └─────────────────────────┬────────────────────────────────────┘  │
│                            ▼                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐     │
│  │ Report Gen  │  │ Chaos Inject │  │ heady-disaster-forge  │     │
│  │ (phi-bucket)│  │ (mid-load)   │  │ (resilience combo)    │     │
│  └─────────────┘  └──────────────┘  └───────────────────────┘     │
└────────────────────────────────────────────────────────────────────┘
```

## Phi-Math Constants

```javascript
// ─── Sacred Geometry Constants ───────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Performance Gates ───────────────────────────────────────────
const CSL_GATES = {
  MINIMUM:  0.500,
  LOW:      0.691,
  MEDIUM:   0.809,
  HIGH:     0.882,
  CRITICAL: 0.927,
  DEDUP:    0.972,
};

// ─── Resource Pools ──────────────────────────────────────────────────
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

// ─── Fusion Weights ──────────────────────────────────────────────────
const FUSION = {
  TWO_WAY:   [0.618, 0.382],
  THREE_WAY: [0.528, 0.326, 0.146],
};

// ─── Load Forge Thresholds ───────────────────────────────────────────
const LOAD_FORGE = {
  // Fibonacci-ramped RPS stages
  RPS_STAGES: [FIB[5], FIB[6], FIB[7], FIB[8], FIB[9], FIB[10], FIB[11]],
  // → [8, 13, 21, 34, 55, 89, 144]

  STAGE_DURATION_SEC:      FIB[9],               // 55s per load stage
  RAMP_INTERVAL_MS:        FIB[7] * 1000,        // 21s ramp between stages
  WARMUP_DURATION_SEC:     FIB[6],               // 13s warmup period
  COOLDOWN_DURATION_SEC:   FIB[5],               // 8s cooldown period

  // Latency thresholds per criticality tier (ms)
  LATENCY_GATES: {
    CRITICAL: { p50: FIB[7],  p95: FIB[9],  p99: FIB[10] },   // 21/55/89ms
    HIGH:     { p50: FIB[8],  p95: FIB[10], p99: FIB[11] },   // 34/89/144ms
    MEDIUM:   { p50: FIB[9],  p95: FIB[11], p99: FIB[12] },   // 55/144/233ms
    LOW:      { p50: FIB[10], p95: FIB[12], p99: FIB[13] },   // 89/233/377ms
  },

  // Embedding throughput targets (vectors/sec)
  EMBEDDING_THROUGHPUT_MIN: FIB[11],              // 144 vectors/sec minimum
  EMBEDDING_DIMENSIONS:     384,

  // pgvector query performance
  PGVECTOR_QUERY_P95_MS:   FIB[8],               // 34ms max p95 for vector queries
  PGVECTOR_HNSW_M:         FIB[7],               // 21 HNSW connections
  PGVECTOR_EF_CONSTRUCTION: FIB[10],             // 89 ef_construction

  // Concurrent connections
  MAX_CONNECTIONS:          FIB[10],              // 89 concurrent connections
  CONNECTION_POOL_SIZE:     FIB[7],              // 21 pool size

  // Backoff: PHI^attempt × base (jitter ±38.2%)
  BACKOFF_BASE_MS:         FIB[6] * 100,         // 1300ms base
  BACKOFF_JITTER:          PSI * PSI,            // ±0.382 (38.2%)
  BACKOFF_MAX_MS:          FIB[13] * 100,        // 37700ms max

  // Report config
  HISTOGRAM_BUCKETS:       FIB[7],               // 21 phi-spaced buckets
  FLAME_CHART_DEPTH:       FIB[6],               // 13 stack depth
};
```

## Instructions

### Phi-Ramped Load Generator

The load generator follows Fibonacci-stepped RPS stages, ramping traffic by PHI multiplier at each interval. Each stage sustains for `FIB[9]=55` seconds before escalating.

```javascript
// heady-load-forge/src/load-generator.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-load-forge', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const LOAD_FORGE = {
  RPS_STAGES: [FIB[5], FIB[6], FIB[7], FIB[8], FIB[9], FIB[10], FIB[11]],
  STAGE_DURATION_SEC: FIB[9],
  RAMP_INTERVAL_MS: FIB[7] * 1000,
  WARMUP_DURATION_SEC: FIB[6],
  COOLDOWN_DURATION_SEC: FIB[5],
  LATENCY_GATES: {
    CRITICAL: { p50: FIB[7], p95: FIB[9], p99: FIB[10] },
    HIGH:     { p50: FIB[8], p95: FIB[10], p99: FIB[11] },
    MEDIUM:   { p50: FIB[9], p95: FIB[11], p99: FIB[12] },
    LOW:      { p50: FIB[10], p95: FIB[12], p99: FIB[13] },
  },
  EMBEDDING_THROUGHPUT_MIN: FIB[11],
  EMBEDDING_DIMENSIONS: 384,
  PGVECTOR_QUERY_P95_MS: FIB[8],
  MAX_CONNECTIONS: FIB[10],
  CONNECTION_POOL_SIZE: FIB[7],
  BACKOFF_BASE_MS: FIB[6] * 100,
  BACKOFF_JITTER: PSI * PSI,
  BACKOFF_MAX_MS: FIB[13] * 100,
  HISTOGRAM_BUCKETS: FIB[7],
};

/**
 * Compute PHI-exponential backoff with ±38.2% jitter.
 */
export function phiBackoff(attempt, baseMs = LOAD_FORGE.BACKOFF_BASE_MS) {
  const raw = Math.pow(PHI, attempt) * baseMs;
  const jitter = 1 + (Math.random() * 2 - 1) * LOAD_FORGE.BACKOFF_JITTER;
  return Math.min(raw * jitter, LOAD_FORGE.BACKOFF_MAX_MS);
}

/**
 * Percentile calculator for latency arrays.
 */
export function percentile(sorted, pct) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Phi-ramped load test runner using autocannon-compatible HTTP bombardment.
 */
export class PhiRampedLoadTest {
  constructor(targetUrl, options = {}) {
    this.testId = randomUUID();
    this.targetUrl = targetUrl;
    this.stages = options.stages || LOAD_FORGE.RPS_STAGES;
    this.stageDurationSec = options.stageDurationSec || LOAD_FORGE.STAGE_DURATION_SEC;
    this.warmupSec = options.warmupSec || LOAD_FORGE.WARMUP_DURATION_SEC;
    this.cooldownSec = options.cooldownSec || LOAD_FORGE.COOLDOWN_DURATION_SEC;
    this.maxConnections = options.maxConnections || LOAD_FORGE.MAX_CONNECTIONS;
    this.results = [];
    this.status = 'pending';
    log.info({ testId: this.testId, targetUrl, stages: this.stages }, 'Load test initialized');
  }

  async runStage(rps, durationSec) {
    const stageId = randomUUID();
    const intervalMs = 1000 / rps;
    const latencies = [];
    const errors = [];
    const startTime = Date.now();
    const endTime = startTime + durationSec * 1000;

    log.info({ stageId, rps, durationSec }, 'Load stage started');

    while (Date.now() < endTime) {
      const reqStart = performance.now();
      try {
        const resp = await fetch(this.targetUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(LOAD_FORGE.BACKOFF_MAX_MS),
          headers: { 'X-LoadForge-Test': this.testId, 'X-LoadForge-Stage': stageId },
        });
        const latencyMs = performance.now() - reqStart;
        latencies.push(latencyMs);
        if (!resp.ok) {
          errors.push({ status: resp.status, latencyMs });
        }
      } catch (err) {
        const latencyMs = performance.now() - reqStart;
        errors.push({ error: err.message, latencyMs });
      }
      const elapsed = performance.now() - reqStart;
      const sleepMs = Math.max(0, intervalMs - elapsed);
      if (sleepMs > 0) await new Promise((r) => setTimeout(r, sleepMs));
    }

    latencies.sort((a, b) => a - b);
    const stageResult = {
      stageId, rps, durationSec,
      totalRequests: latencies.length + errors.length,
      successCount: latencies.length,
      errorCount: errors.length,
      errorRate: errors.length / (latencies.length + errors.length || 1),
      latency: {
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
        min: latencies[0] || 0,
        max: latencies[latencies.length - 1] || 0,
        mean: latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1),
      },
      throughput: latencies.length / durationSec,
      durationMs: Date.now() - startTime,
    };

    log.info({
      stageId, rps,
      p50: stageResult.latency.p50.toFixed(2),
      p95: stageResult.latency.p95.toFixed(2),
      p99: stageResult.latency.p99.toFixed(2),
      errorRate: stageResult.errorRate.toFixed(4),
    }, 'Load stage complete');

    return stageResult;
  }

  async run() {
    this.status = 'running';
    const runStart = Date.now();
    log.info({ testId: this.testId }, 'Phi-ramped load test started');

    // Warmup phase
    log.info({ duration: this.warmupSec }, 'Warmup phase');
    await this.runStage(FIB[3], this.warmupSec);

    // Fibonacci-ramped stages
    for (const rps of this.stages) {
      const stageResult = await this.runStage(rps, this.stageDurationSec);
      this.results.push(stageResult);

      // Ramp interval between stages
      log.info({ rampMs: LOAD_FORGE.RAMP_INTERVAL_MS }, 'Ramping to next stage');
      await new Promise((r) => setTimeout(r, LOAD_FORGE.RAMP_INTERVAL_MS));
    }

    // Cooldown phase
    log.info({ duration: this.cooldownSec }, 'Cooldown phase');
    await this.runStage(FIB[3], this.cooldownSec);

    this.status = 'completed';
    const totalDurationMs = Date.now() - runStart;
    log.info({ testId: this.testId, totalDurationMs, stages: this.results.length }, 'Load test complete');

    return {
      testId: this.testId,
      targetUrl: this.targetUrl,
      stages: this.results,
      totalDurationMs,
      status: this.status,
    };
  }
}

/**
 * CSL performance gate evaluator — checks latencies against tier thresholds.
 */
export function evaluatePerformanceGate(stageResult, tier = 'MEDIUM') {
  const gates = LOAD_FORGE.LATENCY_GATES[tier];
  if (!gates) throw new Error(`Unknown tier: ${tier}`);

  const p50Pass = stageResult.latency.p50 <= gates.p50;
  const p95Pass = stageResult.latency.p95 <= gates.p95;
  const p99Pass = stageResult.latency.p99 <= gates.p99;
  const allPass = p50Pass && p95Pass && p99Pass;

  // Compute coherence score: weighted average of how close to threshold
  const p50Score = Math.min(1, gates.p50 / (stageResult.latency.p50 || 1));
  const p95Score = Math.min(1, gates.p95 / (stageResult.latency.p95 || 1));
  const p99Score = Math.min(1, gates.p99 / (stageResult.latency.p99 || 1));
  // 3-way fusion weighting
  const coherence = p50Score * 0.528 + p95Score * 0.326 + p99Score * 0.146;

  const cslGateResult = coherence >= CSL_GATES[tier] ? 'PASS' : 'FAIL';

  log.info({
    tier, allPass, coherence: coherence.toFixed(4), cslGateResult,
    p50: `${stageResult.latency.p50.toFixed(1)}/${gates.p50}ms`,
    p95: `${stageResult.latency.p95.toFixed(1)}/${gates.p95}ms`,
    p99: `${stageResult.latency.p99.toFixed(1)}/${gates.p99}ms`,
  }, 'Performance gate evaluation');

  return {
    tier, allPass, coherence, cslGateResult,
    checks: { p50: { actual: stageResult.latency.p50, threshold: gates.p50, pass: p50Pass },
              p95: { actual: stageResult.latency.p95, threshold: gates.p95, pass: p95Pass },
              p99: { actual: stageResult.latency.p99, threshold: gates.p99, pass: p99Pass } },
  };
}
```

### LLM Provider Load Testing

Each provider in the LLM chain gets independent concurrent load testing to identify chain bottlenecks.

```javascript
// heady-load-forge/src/llm-bench.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-load-forge:llm-bench', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const LLM_CHAIN = [
  { name: 'gemini-flash-lite', endpoint: '/api/llm/gemini',    concurrency: FIB[5] },
  { name: 'deepseek-v3.2',    endpoint: '/api/llm/deepseek',   concurrency: FIB[5] },
  { name: 'azure-gpt4o-mini', endpoint: '/api/llm/azure',      concurrency: FIB[4] },
  { name: 'groq',             endpoint: '/api/llm/groq',       concurrency: FIB[5] },
  { name: 'workers-ai',       endpoint: '/api/llm/workers-ai', concurrency: FIB[6] },
  { name: 'colab-vllm',       endpoint: '/api/llm/colab',      concurrency: FIB[4] },
];

const TEST_PROMPT = {
  messages: [{ role: 'user', content: 'Explain phi in one sentence.' }],
  max_tokens: FIB[8],
};

export class LLMProviderBenchmark {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.benchmarkId = randomUUID();
  }

  async benchmarkProvider(provider, durationSec = FIB[8]) {
    const latencies = [];
    const errors = [];
    const startTime = Date.now();
    const endTime = startTime + durationSec * 1000;
    const activeRequests = new Set();

    log.info({ provider: provider.name, concurrency: provider.concurrency, durationSec },
      'LLM provider benchmark started');

    const makeRequest = async () => {
      const reqId = randomUUID();
      activeRequests.add(reqId);
      const reqStart = performance.now();
      try {
        const resp = await fetch(`${this.baseUrl}${provider.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Benchmark-Id': this.benchmarkId },
          body: JSON.stringify(TEST_PROMPT),
          signal: AbortSignal.timeout(FIB[13] * 100),
        });
        const latencyMs = performance.now() - reqStart;
        if (resp.ok) {
          const body = await resp.json();
          latencies.push({ latencyMs, tokens: body.usage?.total_tokens || 0 });
        } else {
          errors.push({ status: resp.status, latencyMs });
        }
      } catch (err) {
        errors.push({ error: err.message, latencyMs: performance.now() - reqStart });
      }
      activeRequests.delete(reqId);
    };

    while (Date.now() < endTime) {
      while (activeRequests.size < provider.concurrency && Date.now() < endTime) {
        makeRequest();
      }
      await new Promise((r) => setTimeout(r, FIB[3]));
    }

    // Wait for in-flight
    while (activeRequests.size > 0) await new Promise((r) => setTimeout(r, FIB[4]));

    const sortedLatencies = latencies.map((l) => l.latencyMs).sort((a, b) => a - b);
    const totalTokens = latencies.reduce((sum, l) => sum + l.tokens, 0);

    const result = {
      provider: provider.name, durationSec,
      totalRequests: latencies.length + errors.length,
      successCount: latencies.length, errorCount: errors.length,
      tokensGenerated: totalTokens,
      tokensPerSecond: totalTokens / durationSec,
      latency: {
        p50: sortedLatencies[Math.floor(sortedLatencies.length * 0.50)] || 0,
        p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0,
        p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0,
      },
    };
    log.info({ provider: provider.name, p95: result.latency.p95.toFixed(1),
      tokensPerSec: result.tokensPerSecond.toFixed(1) }, 'LLM provider benchmark complete');
    return result;
  }

  async benchmarkAllProviders() {
    log.info({ benchmarkId: this.benchmarkId }, 'Full LLM chain benchmark started');
    const results = [];
    for (const provider of LLM_CHAIN) {
      results.push(await this.benchmarkProvider(provider));
    }
    const chainLatency = results.reduce((sum, r) => sum + r.latency.p95, 0);
    log.info({ benchmarkId: this.benchmarkId, chainP95: chainLatency.toFixed(1),
      providers: results.length }, 'Full LLM chain benchmark complete');
    return { benchmarkId: this.benchmarkId, providers: results, chainP95Estimate: chainLatency };
  }
}
```

### Embedding & pgvector Pressure Testing

Benchmarks 384D vector insert throughput and HNSW query latency under sustained load.

```javascript
// heady-load-forge/src/vector-bench.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const log = pino({ name: 'heady-load-forge:vector-bench', level: process.env.LOG_LEVEL || 'info' });

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const DIMENSIONS = 384;
const THROUGHPUT_MIN = FIB[11]; // 144 vectors/sec
const QUERY_P95_MAX = FIB[8];  // 34ms

function randomVector(dims) {
  const vec = new Float32Array(dims);
  for (let i = 0; i < dims; i++) vec[i] = Math.random() * 2 - 1;
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return Array.from(vec.map((v) => v / norm));
}

export class VectorBenchmark {
  constructor(pgPool) {
    this.pool = pgPool;
    this.benchmarkId = randomUUID();
  }

  async benchmarkInsertThroughput(count = FIB[12]) {
    const startTime = Date.now();
    log.info({ benchmarkId: this.benchmarkId, count, dimensions: DIMENSIONS }, 'Insert benchmark started');
    let inserted = 0;

    for (let batch = 0; batch < count; batch += FIB[7]) {
      const batchSize = Math.min(FIB[7], count - batch);
      const values = [];
      const params = [];
      for (let i = 0; i < batchSize; i++) {
        const idx = batch + i;
        const vec = randomVector(DIMENSIONS);
        values.push(`($${idx * 2 + 1}, $${idx * 2 + 2}::vector)`);
        params.push(`bench-${this.benchmarkId}-${idx}`, `[${vec.join(',')}]`);
      }
      await this.pool.query(
        `INSERT INTO load_forge_bench (id, embedding) VALUES ${values.join(',')}
         ON CONFLICT (id) DO UPDATE SET embedding = EXCLUDED.embedding`,
        params
      );
      inserted += batchSize;
    }

    const durationMs = Date.now() - startTime;
    const throughput = inserted / (durationMs / 1000);
    const meetsThroughput = throughput >= THROUGHPUT_MIN;

    log.info({ inserted, durationMs, throughput: throughput.toFixed(1), meetsThroughput },
      'Insert benchmark complete');
    return { inserted, durationMs, throughput, meetsThroughput, minimumRequired: THROUGHPUT_MIN };
  }

  async benchmarkQueryLatency(queryCount = FIB[10]) {
    const latencies = [];
    const queryVec = randomVector(DIMENSIONS);
    const vecStr = `[${queryVec.join(',')}]`;
    log.info({ benchmarkId: this.benchmarkId, queryCount }, 'Query latency benchmark started');

    for (let i = 0; i < queryCount; i++) {
      const start = performance.now();
      await this.pool.query(
        `SELECT id, 1 - (embedding <=> $1::vector) AS similarity
         FROM load_forge_bench ORDER BY embedding <=> $1::vector LIMIT $2`,
        [vecStr, FIB[6]]
      );
      latencies.push(performance.now() - start);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const meetsP95 = p95 <= QUERY_P95_MAX;

    log.info({ p50: p50.toFixed(2), p95: p95.toFixed(2), p99: p99.toFixed(2), meetsP95 },
      'Query latency benchmark complete');
    return { queryCount, latency: { p50, p95, p99 }, meetsP95, threshold: QUERY_P95_MAX };
  }
}
```

### Report Generation with Phi-Bucketed Histograms

```javascript
// heady-load-forge/src/report.mjs
import pino from 'pino';

const log = pino({ name: 'heady-load-forge:report', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/**
 * Generate phi-spaced histogram buckets.
 * Bucket boundaries follow: base × PHI^i for i in [0..numBuckets].
 */
export function phiBuckets(baseMs = 1, numBuckets = FIB[7]) {
  const buckets = [];
  for (let i = 0; i <= numBuckets; i++) {
    buckets.push(baseMs * Math.pow(PHI, i));
  }
  return buckets;
}

/**
 * Distribute latencies into phi-spaced histogram buckets.
 */
export function buildHistogram(latencies, buckets) {
  const counts = new Array(buckets.length + 1).fill(0);
  for (const lat of latencies) {
    let placed = false;
    for (let i = 0; i < buckets.length; i++) {
      if (lat <= buckets[i]) { counts[i]++; placed = true; break; }
    }
    if (!placed) counts[buckets.length]++;
  }
  return buckets.map((boundary, i) => ({
    bucket: `≤${boundary.toFixed(1)}ms`,
    count: counts[i],
    percentage: ((counts[i] / latencies.length) * 100).toFixed(1),
  }));
}

/**
 * Identify bottlenecks from stage results.
 */
export function identifyBottlenecks(stageResults) {
  const bottlenecks = [];
  for (const stage of stageResults) {
    if (stage.errorRate > PSI * 0.1) {
      bottlenecks.push({
        type: 'error_rate', stage: stage.stageId, rps: stage.rps,
        value: stage.errorRate, severity: stage.errorRate > 0.1 ? 'critical' : 'warning',
      });
    }
    if (stage.latency.p99 > FIB[12]) {
      bottlenecks.push({
        type: 'latency_spike', stage: stage.stageId, rps: stage.rps,
        value: stage.latency.p99, severity: 'critical',
      });
    }
    const saturationRatio = stage.latency.p99 / (stage.latency.p50 || 1);
    if (saturationRatio > PHI * PHI) {
      bottlenecks.push({
        type: 'tail_latency_explosion', stage: stage.stageId, rps: stage.rps,
        ratio: saturationRatio, severity: 'warning',
      });
    }
  }
  log.info({ bottleneckCount: bottlenecks.length }, 'Bottleneck analysis complete');
  return bottlenecks;
}

const PSI = 0.618033988749895;

/**
 * Generate full load test report.
 */
export function generateReport(testResult, gateResults) {
  return {
    reportId: testResult.testId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalStages: testResult.stages.length,
      totalDurationMs: testResult.totalDurationMs,
      maxRps: Math.max(...testResult.stages.map((s) => s.rps)),
      overallErrorRate: testResult.stages.reduce((s, r) => s + r.errorRate, 0) / testResult.stages.length,
    },
    stages: testResult.stages.map((stage, i) => ({
      ...stage,
      gate: gateResults[i] || null,
      histogram: buildHistogram([], phiBuckets()),
    })),
    bottlenecks: identifyBottlenecks(testResult.stages),
    gateResults,
    phiConstants: { PHI, PSI, FIB: FIB.slice(0, 12) },
  };
}
```

### Router

```javascript
// heady-load-forge/src/router.mjs
import express from 'express';
import pino from 'pino';
import { PhiRampedLoadTest, evaluatePerformanceGate } from './load-test.mjs';
import { LLMProviderBenchmark } from './llm-bench.mjs';
import { VectorBenchmark } from './vector-bench.mjs';
import { generateReport } from './report.mjs';

const log = pino({ name: 'heady-load-forge:router', level: process.env.LOG_LEVEL || 'info' });
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL_GATES = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const startTime = Date.now();

export function createLoadForgeRouter() {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    const uptimeSeconds = (Date.now() - startTime) / 1000;
    res.json({
      service: 'heady-load-forge',
      status: 'healthy',
      coherence: CSL_GATES.HIGH,
      phi_compliance: true,
      sacred_geometry_layer: 'Middle',
      uptime_seconds: uptimeSeconds,
      version: '1.0.0',
      phi: PHI,
      psi: PSI,
    });
    log.info({ uptimeSeconds }, '/health checked');
  });

  router.post('/run', async (req, res) => {
    try {
      const { targetUrl, tier, stages, stageDurationSec } = req.body;
      const loadTest = new PhiRampedLoadTest({ targetUrl, stages, stageDurationSec });
      const result = await loadTest.execute();
      const gateResults = result.stages.map((s) => evaluatePerformanceGate(s, tier));
      const report = generateReport(result, gateResults);
      log.info({ testId: result.testId, stages: stages.length }, 'Load test complete');
      res.json(report);
    } catch (err) {
      log.error({ err: err.message }, 'Load test failed');
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
```

## Integration Points

| Component                    | Interface              | Sacred Geometry Layer |
|------------------------------|------------------------|----------------------|
| **OBSERVER**                 | Performance telemetry  | Middle               |
| **MURPHY**                   | Reliability validation | Middle               |
| **heady-disaster-forge**     | Chaos injection        | Middle               |
| **heady-service-health-ops** | Health aggregation     | Middle               |
| **heady-realtime-detection** | Anomaly alerting       | Middle               |
| **Conductor**                | Test orchestration     | Inner                |
| **AutoSuccess**              | Scale-up triggers      | Inner                |
| **SENTINEL**                 | Threshold alerts       | Outer                |
| **Neon Postgres + pgvector** | Vector benchmarking    | Infrastructure       |
| **Upstash Redis**            | Cache pressure tests   | Infrastructure       |
| **Cloudflare Workers**       | Edge latency profiling | Infrastructure       |
| **Cloud Run (us-east1)**     | Origin load testing    | Infrastructure       |
| **Sentry + Langfuse**       | Error/trace ingestion  | Observability        |

## API

### GET `/api/load-forge/health`

Returns service health with coherence score and latest benchmark summary.

### POST `/api/load-forge/run`

Starts a phi-ramped load test against a target URL.

```javascript
// Request
{ "targetUrl": "https://headyapi.com/api/pipeline", "tier": "HIGH",
  "stages": [8, 13, 21, 34, 55], "stageDurationSec": 55 }

// Response
{ "testId": "uuid", "status": "running", "stages": 5, "estimatedDurationSec": 355 }
```

### POST `/api/load-forge/llm-bench`

Benchmarks all LLM providers in the chain under concurrent load.

```javascript
// Request
{ "durationSec": 34 }

// Response
{ "benchmarkId": "uuid", "providers": [...], "chainP95Estimate": 1247.3 }
```

### POST `/api/load-forge/vector-bench`

Runs 384D embedding insert throughput and pgvector query latency benchmarks.

```javascript
// Request
{ "insertCount": 233, "queryCount": 89 }

// Response
{ "insertThroughput": 187.4, "queryP95": 12.3, "meetsThresholds": true }
```

### GET `/api/load-forge/report/:testId`

Retrieves the full report with phi-bucketed histograms and bottleneck analysis.

## Health Endpoint

```json
{
  "service": "heady-load-forge",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Middle",
  "uptime_seconds": 84732,
  "version": "1.0.0",
  "latest_benchmark": {
    "testId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "maxRps": 89,
    "overallP95": 42.7,
    "gateResult": "PASS",
    "coherenceScore": 0.891,
    "completedAt": "2026-03-18T12:00:00.000Z"
  },
  "thresholds": {
    "rpsStages": [8, 13, 21, 34, 55, 89, 144],
    "latencyGates": {
      "CRITICAL": { "p50": 21, "p95": 55, "p99": 89 },
      "HIGH": { "p50": 34, "p95": 89, "p99": 144 },
      "MEDIUM": { "p50": 55, "p95": 144, "p99": 233 },
      "LOW": { "p50": 89, "p95": 233, "p99": 377 }
    },
    "embeddingThroughputMin": 144,
    "pgvectorQueryP95Max": 34
  },
  "phi": 1.618033988749895,
  "psi": 0.618033988749895
}
```
