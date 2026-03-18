---
name: heady-mirror-dimension
description: >-
  Heady Mirror Dimension — parallel sandbox universe system creating isolated replicas of the Heady ecosystem for safe experimentation and chaos engineering. Each mirror is a copy-on-write fork using Neon Postgres branches, Upstash Redis namespacing, and Cloudflare Worker routing. Dimensions are compared against production via phi-weighted scoring and promoted or discarded. Uses CSL-gated thresholds and Fibonacci-limited dimension count. Use when implementing sandbox environments, chaos engineering, canary testing, or architectural A/B tests. Keywords: mirror, dimension, sandbox, chaos engineering, A/B testing, canary, fork, experiment, isolation, promotion, Neon branch.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Mirror Dimension

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Testing major architectural changes without risking production (new pipeline stages, new bee types)
- Running chaos engineering experiments (what happens if 3 services go down simultaneously?)
- A/B testing different LLM routing chains (e.g., Gemini Flash-Lite vs DeepSeek V3.2 as primary)
- Exploring what-if scenarios for capacity planning or Sacred Geometry topology changes
- Canary-deploying new HeadyBee populations before promoting to the main swarm
- Training new agent behaviors in isolation before merging into production
- Validating HCFullPipeline configuration changes across all 21 stages safely
- Testing Firebase Auth SSO changes across all 9 domains without breaking production auth

## Architecture

```
Production Universe (Heady-Main)
  │ Vector Memory, 120+ Services, 89 Bee Types, 21 Pipeline Stages
  │
  ▼
Mirror Forge (dimension creation engine)
  │ Creates isolated copy-on-write forks:
  ├─→ Neon Postgres Branch (zero-copy DB fork)
  ├─→ Upstash Redis Namespace (tenant:{dimensionId}:*)
  ├─→ Cloudflare Worker Namespace (dimension-specific routing)
  └─→ Config Snapshot (hcfullpipeline.json, heady-registry.json, cognitive-config)
        │
        ▼
Mirror Dimension Instance
  ├─→ Isolated vector memory (384D, same pgvector schema)
  ├─→ Isolated agent population (cloned bee registry)
  ├─→ Isolated pipeline (own HCFullPipeline state)
  ├─→ Isolated LLM routing (can test different provider chains)
  └─→ Shared read-only: embedding models, base configs
        │
        ▼
Experiment Runner
  ├─→ Inject mutations: config changes, chaos faults, load patterns
  ├─→ Run workloads: replay production traffic or synthetic load
  └─→ Collect metrics: latency, error rate, coherence score, cost
        │
        ▼
Dimension Comparator (φ-weighted scoring)
  │ Production vs Mirror metrics compared:
  │   Coherence weight = PHI (1.618)
  │   Latency weight = 1.0
  │   Error rate weight = PSI (0.618)
  │   Cost weight = PSI² (0.382)
  │
  ▼
Promotion Gate (CSL ≥ 0.882 to promote)
  ├─→ Promote: merge dimension state into production
  ├─→ Hold: keep running for more data
  └─→ Discard: tear down dimension, log learnings
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Mirror Dimension Constants
const MAX_DIMENSIONS = FIB[5];                    // 5 concurrent mirror dimensions
const DIMENSION_TTL_HOURS = FIB[8];               // 21 hours max lifetime
const DIMENSION_CHECKPOINT_INTERVAL_MS = FIB[7] * 1000; // 13s checkpoint cycle
const PROMOTION_THRESHOLD = 0.882;                // CSL HIGH — must clearly outperform
const DISCARD_THRESHOLD = 0.500;                  // CSL MINIMUM — clearly worse
const HOLD_RANGE = [0.500, 0.882];                // Between discard and promote

// Comparison Weights (φ-derived)
const WEIGHT_COHERENCE = PHI;                     // 1.618 — most important
const WEIGHT_LATENCY = 1.0;                       // Baseline
const WEIGHT_ERROR_RATE = PSI;                    // 0.618
const WEIGHT_COST = PSI * PSI;                    // 0.382

// Chaos Engineering Constants
const CHAOS_FAULT_PROBABILITY = PSI * PSI;        // 38.2% chance per service
const CHAOS_RECOVERY_TIMEOUT_MS = FIB[6] * 1000;  // 8s recovery window
const CHAOS_MAX_SIMULTANEOUS_FAULTS = FIB[4];     // 3 faults at once
const TRAFFIC_REPLAY_SPEED_MULTIPLIER = PHI;       // 1.618x speed for faster testing

// Resource Limits per Dimension
const DIMENSION_VECTOR_LIMIT = FIB[12] * FIB[8];  // 144 × 21 = 3024 vectors max per dimension
const DIMENSION_BEE_LIMIT = FIB[8];               // 21 bees per dimension
const DIMENSION_PIPELINE_STAGES = FIB[8];          // 21 stages (full pipeline)
```

## Instructions

### 1. Dimension Creation

Fork production into an isolated mirror:

```javascript
class MirrorForge {
  constructor({ neonClient, upstashClient, cfClient, configStore, logger }) {
    this.neon = neonClient;
    this.upstash = upstashClient;
    this.cf = cfClient;
    this.configStore = configStore;
    this.logger = logger;
    this.activeDimensions = new Map();
  }

  async createDimension(name, options = {}) {
    if (this.activeDimensions.size >= MAX_DIMENSIONS) {
      throw new Error(`Max dimensions reached (${MAX_DIMENSIONS})`);
    }

    const dimensionId = `dim-${name}-${Date.now().toString(36)}`;

    // 1. Fork Neon Postgres database (zero-copy branch)
    const dbBranch = await this.neon.createBranch({
      projectId: process.env.NEON_PROJECT_ID,
      parentBranchId: 'main',
      name: dimensionId,
      endpoints: [{ type: 'read_write' }],
    });

    // 2. Create Upstash Redis namespace
    const redisNamespace = `tenant:${dimensionId}`;
    await this.upstash.set(`${redisNamespace}:meta:created`, Date.now());
    await this.upstash.set(`${redisNamespace}:meta:ttl`, DIMENSION_TTL_HOURS * 3600000);

    // 3. Snapshot production configs
    const configSnapshot = await this.snapshotConfigs();

    // 4. Clone agent population registry
    const agentSnapshot = await this.snapshotAgents();

    const dimension = {
      id: dimensionId,
      name,
      status: 'active',
      createdAt: Date.now(),
      expiresAt: Date.now() + DIMENSION_TTL_HOURS * 3600000,
      dbBranch: dbBranch.id,
      dbConnectionString: dbBranch.endpoints[0]?.connectionString,
      redisNamespace,
      configSnapshot,
      agentSnapshot,
      mutations: options.mutations || [],
      metrics: { latency: [], errorRate: [], coherence: [], cost: [] },
    };

    // 5. Apply requested mutations
    if (options.mutations?.length > 0) {
      await this.applyMutations(dimension, options.mutations);
    }

    this.activeDimensions.set(dimensionId, dimension);
    this.logger.info({ dimensionId, name, mutations: options.mutations?.length || 0 }, 'dimension-created');

    return dimension;
  }

  async snapshotConfigs() {
    return {
      hcfullpipeline: await this.configStore.get('hcfullpipeline.json'),
      headyRegistry: await this.configStore.get('heady-registry.json'),
      cognitiveConfig: await this.configStore.get('heady-cognitive-config.json'),
      timestamp: Date.now(),
    };
  }

  async snapshotAgents() {
    const agents = await this.configStore.get('agent-registry');
    return agents.slice(0, DIMENSION_BEE_LIMIT); // Limit to 21 bees
  }

  async applyMutations(dimension, mutations) {
    for (const mutation of mutations) {
      switch (mutation.type) {
        case 'config-override':
          dimension.configSnapshot[mutation.target] = {
            ...dimension.configSnapshot[mutation.target],
            ...mutation.values,
          };
          break;
        case 'llm-chain-swap':
          // Swap LLM provider ordering in this dimension
          dimension.configSnapshot.llmChain = mutation.chain;
          break;
        case 'topology-change':
          // Modify Sacred Geometry node placement
          dimension.configSnapshot.topology = mutation.topology;
          break;
        case 'bee-population':
          // Change agent mix
          dimension.agentSnapshot = mutation.agents;
          break;
        default:
          this.logger.warn({ type: mutation.type }, 'unknown-mutation-type');
      }
    }
  }

  async destroyDimension(dimensionId) {
    const dimension = this.activeDimensions.get(dimensionId);
    if (!dimension) return;

    // Tear down in reverse order
    await this.neon.deleteBranch({ branchId: dimension.dbBranch });

    // Clean up Redis namespace
    const keys = await this.upstash.keys(`${dimension.redisNamespace}:*`);
    if (keys.length > 0) await this.upstash.del(...keys);

    dimension.status = 'destroyed';
    this.activeDimensions.delete(dimensionId);
    this.logger.info({ dimensionId }, 'dimension-destroyed');
  }
}
```

### 2. Chaos Engineering Engine

Inject controlled faults into mirror dimensions:

```javascript
class ChaosEngine {
  constructor({ dimension, serviceRegistry, logger }) {
    this.dimension = dimension;
    this.serviceRegistry = serviceRegistry;
    this.logger = logger;
    this.activeFaults = [];
  }

  async injectFault(faultSpec) {
    if (this.activeFaults.length >= CHAOS_MAX_SIMULTANEOUS_FAULTS) {
      return { injected: false, reason: 'max-faults-reached' };
    }

    const fault = {
      id: crypto.randomUUID(),
      type: faultSpec.type,
      target: faultSpec.target,
      injectedAt: Date.now(),
      recoveryAt: Date.now() + CHAOS_RECOVERY_TIMEOUT_MS,
      params: faultSpec.params || {},
    };

    switch (fault.type) {
      case 'service-down':
        await this.simulateServiceFailure(fault.target);
        break;
      case 'latency-spike':
        await this.injectLatency(fault.target, fault.params.delayMs || FIB[6] * 100);
        break;
      case 'memory-pressure':
        await this.simulateMemoryPressure(fault.target, fault.params.percentFull || PSI);
        break;
      case 'network-partition':
        await this.simulatePartition(fault.target, fault.params.isolatedServices || []);
        break;
      case 'embedding-drift':
        await this.injectEmbeddingDrift(fault.params.driftMagnitude || PSI * PSI);
        break;
      default:
        return { injected: false, reason: 'unknown-fault-type' };
    }

    this.activeFaults.push(fault);
    this.logger.info({ faultId: fault.id, type: fault.type, target: fault.target }, 'fault-injected');
    return { injected: true, faultId: fault.id };
  }

  async simulateServiceFailure(serviceId) {
    // Mark service as failed in dimension's registry
    const config = this.dimension.configSnapshot.headyRegistry;
    const service = config.services?.find(s => s.id === serviceId);
    if (service) service.status = 'failed';
  }

  async injectLatency(serviceId, delayMs) {
    // Add artificial latency to service calls within dimension
    this.dimension.injectedLatency = this.dimension.injectedLatency || {};
    this.dimension.injectedLatency[serviceId] = delayMs;
  }

  async simulateMemoryPressure(serviceId, percentFull) {
    this.dimension.memoryPressure = this.dimension.memoryPressure || {};
    this.dimension.memoryPressure[serviceId] = percentFull;
  }

  async simulatePartition(serviceId, isolatedFrom) {
    this.dimension.partitions = this.dimension.partitions || [];
    this.dimension.partitions.push({ service: serviceId, isolatedFrom });
  }

  async injectEmbeddingDrift(magnitude) {
    // Shift embedding centroids to simulate semantic drift
    this.dimension.embeddingDrift = magnitude;
  }

  async recoverExpiredFaults() {
    const now = Date.now();
    const expired = this.activeFaults.filter(f => now >= f.recoveryAt);
    for (const fault of expired) {
      await this.removeFault(fault.id);
    }
  }

  async removeFault(faultId) {
    this.activeFaults = this.activeFaults.filter(f => f.id !== faultId);
    this.logger.info({ faultId }, 'fault-recovered');
  }
}
```

### 3. Dimension Comparator

Compare mirror dimension performance against production:

```javascript
class DimensionComparator {
  constructor({ productionMetrics, logger }) {
    this.productionMetrics = productionMetrics;
    this.logger = logger;
  }

  async compare(dimension) {
    const prodMetrics = await this.productionMetrics.getCurrent();
    const dimMetrics = this.aggregateMetrics(dimension.metrics);

    // Compute φ-weighted comparison score
    const coherenceDelta = this.normalizedDelta(dimMetrics.coherence, prodMetrics.coherence);
    const latencyDelta = this.normalizedDelta(prodMetrics.latency, dimMetrics.latency); // Lower is better
    const errorDelta = this.normalizedDelta(prodMetrics.errorRate, dimMetrics.errorRate); // Lower is better
    const costDelta = this.normalizedDelta(prodMetrics.cost, dimMetrics.cost); // Lower is better

    const weightSum = WEIGHT_COHERENCE + WEIGHT_LATENCY + WEIGHT_ERROR_RATE + WEIGHT_COST;
    const compositeScore = (
      coherenceDelta * WEIGHT_COHERENCE +
      latencyDelta * WEIGHT_LATENCY +
      errorDelta * WEIGHT_ERROR_RATE +
      costDelta * WEIGHT_COST
    ) / weightSum;

    // Map to 0-1 range (0.5 = equal to production)
    const normalizedScore = (compositeScore + 1) / 2;

    const verdict = normalizedScore >= PROMOTION_THRESHOLD ? 'promote'
      : normalizedScore <= DISCARD_THRESHOLD ? 'discard'
      : 'hold';

    return {
      dimensionId: dimension.id,
      dimensionName: dimension.name,
      score: normalizedScore,
      verdict,
      breakdown: {
        coherence: { dimension: dimMetrics.coherence, production: prodMetrics.coherence, delta: coherenceDelta },
        latency: { dimension: dimMetrics.latency, production: prodMetrics.latency, delta: latencyDelta },
        errorRate: { dimension: dimMetrics.errorRate, production: prodMetrics.errorRate, delta: errorDelta },
        cost: { dimension: dimMetrics.cost, production: prodMetrics.cost, delta: costDelta },
      },
      recommendation: this.generateRecommendation(verdict, normalizedScore),
    };
  }

  normalizedDelta(better, worse) {
    if (better === 0 && worse === 0) return 0;
    return (better - worse) / Math.max(Math.abs(better), Math.abs(worse), 0.001);
  }

  aggregateMetrics(metrics) {
    const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    return {
      coherence: avg(metrics.coherence),
      latency: avg(metrics.latency),
      errorRate: avg(metrics.errorRate),
      cost: avg(metrics.cost),
    };
  }

  generateRecommendation(verdict, score) {
    if (verdict === 'promote') return `Dimension outperforms production (score: ${score.toFixed(3)}). Recommended for promotion.`;
    if (verdict === 'discard') return `Dimension underperforms production (score: ${score.toFixed(3)}). Recommended for teardown.`;
    return `Dimension is comparable to production (score: ${score.toFixed(3)}). Continue collecting data.`;
  }
}
```

### 4. Promotion Engine

Merge winning dimension changes back to production:

```javascript
class PromotionEngine {
  constructor({ forge, comparator, configStore, logger }) {
    this.forge = forge;
    this.comparator = comparator;
    this.configStore = configStore;
    this.logger = logger;
  }

  async evaluateAndPromote(dimensionId) {
    const dimension = this.forge.activeDimensions.get(dimensionId);
    if (!dimension) throw new Error('Dimension not found');

    const comparison = await this.comparator.compare(dimension);

    if (comparison.verdict !== 'promote') {
      return { promoted: false, comparison };
    }

    // Promote: merge dimension configs into production
    const mutations = dimension.mutations;
    for (const mutation of mutations) {
      switch (mutation.type) {
        case 'config-override':
          await this.configStore.merge(mutation.target, mutation.values);
          break;
        case 'llm-chain-swap':
          await this.configStore.set('llm-chain', mutation.chain);
          break;
        case 'topology-change':
          await this.configStore.set('topology', mutation.topology);
          break;
        case 'bee-population':
          await this.configStore.set('agent-registry', mutation.agents);
          break;
      }
    }

    // Merge Neon branch into main
    await this.forge.neon.mergeBranch({
      sourceBranchId: dimension.dbBranch,
      targetBranchId: 'main',
    });

    // Destroy dimension after promotion
    await this.forge.destroyDimension(dimensionId);

    this.logger.info({
      dimensionId,
      score: comparison.score,
      mutations: mutations.length,
    }, 'dimension-promoted');

    return { promoted: true, comparison };
  }
}
```

## Integration Points

| Heady Component | Mirror Dimension Role |
|---|---|
| HCFullPipeline | Each dimension runs its own 21-stage pipeline instance |
| HeadyBee Swarm | Bee populations are cloned and can evolve independently |
| Neon Postgres | Zero-copy branching provides instant database forks |
| Upstash Redis | Namespaced keys isolate cache state per dimension |
| Cloudflare Workers | Worker routing namespace directs traffic to dimension |
| TimeCrystal | Dimension states become time crystal branches automatically |
| GhostProtocol | Ghost simulations run inside mirror dimensions |
| OracleChain | Dimension experiments produce auditable reasoning chains |

## API

```javascript
const { MirrorDimension } = require('@heady/mirror-dimension');

const mirror = new MirrorDimension({
  neonClient, upstashClient, cfClient, configStore,
  productionMetrics, logger: pinoLogger,
});

const dim = await mirror.create('llm-experiment', {
  mutations: [{ type: 'llm-chain-swap', chain: ['deepseek-v3.2', 'gemini-flash', 'groq'] }],
});

await mirror.injectChaos(dim.id, { type: 'service-down', target: 'heady-api' });
const comparison = await mirror.compare(dim.id);
const result = await mirror.promote(dim.id);

mirror.health();
await mirror.shutdown();
```

## Health Endpoint

```json
{
  "status": "mirroring",
  "coherenceScore": 0.876,
  "activeDimensions": 3,
  "totalCreated": 21,
  "totalPromoted": 8,
  "totalDiscarded": 10,
  "oldestDimension": "dim-llm-test-abc123",
  "oldestDimensionAge": "14.2 hours",
  "chaosExperimentsRun": 34,
  "averagePromotionScore": 0.891,
  "version": "1.0.0"
}
```
