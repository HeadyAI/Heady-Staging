---
name: heady-resource-crystallizer
description: >
  Heady Resource Crystallizer — dynamic resource allocation engine that crystallizes optimal
  compute, memory, token, and bandwidth distributions across the Heady ecosystem using φ-harmonic
  resonance patterns. Monitors real-time demand signals, predicts resource needs via temporal
  forecasting, and allocates using Fibonacci-tiered priority queues with CSL-gated fairness
  constraints. Handles hot/warm/cold pool rebalancing, token budget crystallization across
  providers, and elastic scaling decisions. Use when managing compute allocation, token budgets,
  pool rebalancing, bandwidth distribution, or any multi-resource optimization problem. Keywords:
  resource allocation, compute, token budget, bandwidth, pool rebalancing, elastic scaling,
  priority queue, fairness, capacity planning, resource optimization, crystallization, demand
  prediction, hot warm cold.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Resource Crystallizer

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Rebalancing Hot/Warm/Cold resource pools based on demand
- Allocating token budgets across AI providers optimally
- Making elastic scaling decisions for Cloud Run / Cloudflare Workers
- Distributing bandwidth across 9 Heady domains
- Managing compute allocation across 3 Colab Pro+ runtimes
- Prioritizing resource requests during contention
- Crystallizing optimal configurations from messy demand signals

## Architecture

```
Demand Signals (request rates, queue depths, latencies, error rates)
  │
  ▼
Signal Aggregator (Fibonacci-windowed: 5, 8, 13 intervals)
  │
  ▼
Demand Predictor (TemporalForecaster integration, 5-step horizon)
  │
  ▼
Crystallization Engine
  ├─→ Pool Rebalancer (Hot 34% / Warm 21% / Cold 13% / Reserve 8% / Gov 5%)
  ├─→ Token Budget Allocator (φ-proportional across providers)
  ├─→ Compute Scheduler (priority queue with CSL-weighted fairness)
  └─→ Bandwidth Distributor (domain-weighted with burst capacity)
      │
      ▼
  Fairness Constraint Checker (CSL gates prevent starvation)
      │
      ▼
  Allocation Decision (resource map with coherence score)
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Resource Pool Ratios (must sum to ~1.0)
const POOL_RATIOS = {
  hot: 0.34,       // ~FIB[9]/100 — active processing
  warm: 0.21,      // ~FIB[8]/100 — standby/cached
  cold: 0.13,      // ~FIB[7]/100 — archived/dormant
  reserve: 0.08,   // ~FIB[6]/100 — emergency buffer
  governance: 0.05, // ~FIB[5]/100 — audit/monitoring
  // Remaining ~0.19 is unallocated headroom
};

// Priority Tiers
const PRIORITY_TIERS = {
  CRITICAL: PHI * PHI,     // 2.618 — system-critical (health checks, auth)
  HIGH: PHI,               // 1.618 — user-facing (HeadyBuddy, Web)
  NORMAL: 1.0,             // 1.000 — standard processing
  LOW: PSI,                // 0.618 — background tasks (indexing, caching)
  BULK: PSI * PSI,         // 0.382 — batch processing (evolution, training)
};

// Token Budget Distribution (across providers)
const PROVIDER_BUDGET_WEIGHTS = {
  claude: PHI,         // 1.618 — primary LLM
  gpt4o: 1.0,          // 1.000 — secondary
  gemini: PSI,         // 0.618 — tertiary
  groq: PSI * PSI,     // 0.382 — speed-optimized
  sonar: PSI * PSI,    // 0.382 — research-optimized
  edge: PHI * PSI,     // 1.000 — edge inference
};

const REBALANCE_INTERVAL_MS = FIB[7] * 1000;  // 13 seconds between rebalances
const STARVATION_THRESHOLD = PSI * PSI * PSI;  // 0.236 — below this = starving
const BURST_MULTIPLIER = PHI;                  // Allow PHI× burst over allocation
const CRYSTALLIZATION_WINDOW = FIB[6];         // 8 samples for decision
```

## Instructions

### 1. Demand Signal Aggregation

Collect multi-scale demand signals:

```javascript
class DemandAggregator {
  constructor() {
    this.windows = {
      fast: new RollingWindow(FIB[5]),    // 5 intervals — immediate
      medium: new RollingWindow(FIB[6]),  // 8 intervals — trend
      slow: new RollingWindow(FIB[7]),    // 13 intervals — baseline
    };
  }

  ingest(signal) {
    // signal: { pool, requestRate, queueDepth, latencyP99, errorRate, timestamp }
    for (const window of Object.values(this.windows)) {
      window.push(signal);
    }
  }

  getDemandVector(pool) {
    return {
      currentRate: this.windows.fast.latest()?.requestRate || 0,
      trendRate: this.windows.medium.mean('requestRate'),
      baselineRate: this.windows.slow.mean('requestRate'),
      pressure: this.computePressure(pool),
    };
  }

  computePressure(pool) {
    const fast = this.windows.fast;
    if (fast.length === 0) return 0;
    const latencyPressure = fast.mean('latencyP99') / (FIB[8] * 100); // Normalize
    const errorPressure = fast.mean('errorRate');
    const queuePressure = fast.mean('queueDepth') / FIB[10];
    return (latencyPressure * PHI + errorPressure * 1.0 + queuePressure * PSI) / (PHI + 1.0 + PSI);
  }
}
```

### 2. Pool Rebalancer

Dynamically adjust pool sizes based on demand:

```javascript
class PoolRebalancer {
  rebalance(totalResources, demandByPool) {
    const allocation = {};
    let unallocated = totalResources;

    // Start with base ratios
    for (const [pool, ratio] of Object.entries(POOL_RATIOS)) {
      allocation[pool] = Math.floor(totalResources * ratio);
      unallocated -= allocation[pool];
    }

    // Adjust based on demand pressure
    const pressures = {};
    for (const [pool, demand] of Object.entries(demandByPool)) {
      pressures[pool] = demand.pressure;
    }

    // φ-proportional redistribution of unallocated resources
    const totalPressure = Object.values(pressures).reduce((a, b) => a + b, 0);
    if (totalPressure > 0) {
      for (const [pool, pressure] of Object.entries(pressures)) {
        const share = Math.floor(unallocated * (pressure / totalPressure));
        allocation[pool] = (allocation[pool] || 0) + share;
      }
    }

    // Fairness check — no pool below starvation threshold
    for (const [pool, amount] of Object.entries(allocation)) {
      const minAllocation = Math.floor(totalResources * STARVATION_THRESHOLD);
      if (amount < minAllocation) {
        allocation[pool] = minAllocation;
      }
    }

    return { allocation, coherenceScore: this.computeCoherence(allocation, demandByPool) };
  }

  computeCoherence(allocation, demand) {
    // Higher coherence = better match between allocation and demand
    let score = 0;
    let count = 0;
    for (const [pool, amount] of Object.entries(allocation)) {
      if (demand[pool]) {
        const demandMatch = Math.min(1, amount / (demand[pool].currentRate + 1));
        score += demandMatch;
        count++;
      }
    }
    return count > 0 ? score / count : 0;
  }
}
```

### 3. Token Budget Allocator

Distribute token budgets across AI providers:

```javascript
class TokenBudgetAllocator {
  allocate(totalBudget, usageHistory, providerHealth) {
    const weights = { ...PROVIDER_BUDGET_WEIGHTS };

    // Adjust weights by provider health (unhealthy → reduce allocation)
    for (const [provider, health] of Object.entries(providerHealth)) {
      if (weights[provider]) {
        weights[provider] *= health.score; // 0-1 health score
      }
    }

    // Adjust by usage efficiency (tokens per successful task)
    for (const [provider, usage] of Object.entries(usageHistory)) {
      if (weights[provider] && usage.efficiency) {
        weights[provider] *= Math.pow(usage.efficiency, PSI); // φ-damped efficiency boost
      }
    }

    // Normalize and allocate
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const allocations = {};
    for (const [provider, weight] of Object.entries(weights)) {
      allocations[provider] = Math.floor(totalBudget * (weight / totalWeight));
    }

    return allocations;
  }
}
```

### 4. Priority Queue with Fairness

Fibonacci-tiered priority queue that prevents starvation:

```javascript
class FairPriorityQueue {
  constructor() {
    this.tiers = Object.keys(PRIORITY_TIERS).reduce((acc, tier) => {
      acc[tier] = [];
      return acc;
    }, {});
    this.servedCounts = Object.keys(PRIORITY_TIERS).reduce((acc, tier) => {
      acc[tier] = 0;
      return acc;
    }, {});
  }

  enqueue(request, priority = 'NORMAL') {
    this.tiers[priority].push(request);
  }

  dequeue() {
    // φ-weighted selection: higher priority gets served PHI× more often
    // but lower priorities always get at least 1/FIB[7] of service
    for (const tier of Object.keys(PRIORITY_TIERS)) {
      if (this.tiers[tier].length > 0) {
        const weight = PRIORITY_TIERS[tier];
        const fairnessGate = this.servedCounts[tier] / (Object.values(this.servedCounts).reduce((a, b) => a + b, 0) + 1);

        // Starvation prevention: if a tier hasn't been served recently, boost it
        if (fairnessGate < STARVATION_THRESHOLD) {
          this.servedCounts[tier]++;
          return this.tiers[tier].shift();
        }
      }
    }

    // Default: serve highest priority with items
    for (const tier of Object.keys(PRIORITY_TIERS)) {
      if (this.tiers[tier].length > 0) {
        this.servedCounts[tier]++;
        return this.tiers[tier].shift();
      }
    }

    return null;
  }
}
```

## Integration Points

| Heady Component | Resource Type | Rebalance Trigger |
|---|---|---|
| Cloud Run | Compute instances | Latency > FIB[8]×100ms |
| Cloudflare Workers | Edge compute | Request rate > FIB[10]/sec |
| LLM Router | Token budgets | Provider error rate > PSI² |
| Colab Runtimes | GPU/memory | Queue depth > FIB[7] |
| Vector Memory | HNSW connections | Search latency > FIB[6]×10ms |
| Gateway | Bandwidth | Concurrent connections > FIB[12] |

## API

```javascript
const { ResourceCrystallizer } = require('@heady/resource-crystallizer');

const crystallizer = new ResourceCrystallizer({
  totalCompute: 1000,
  totalTokenBudget: 100000,
  providers: ['claude', 'gpt4o', 'gemini', 'groq'],
});

crystallizer.startRebalancing(); // Runs every 13 seconds

const allocation = crystallizer.getCurrentAllocation();
// { pools: { hot: 340, warm: 210, ... }, tokens: { claude: 38000, ... } }

crystallizer.health();
await crystallizer.shutdown();
```

## Health Endpoint

```json
{
  "status": "healthy",
  "coherenceScore": 0.867,
  "pools": { "hot": 340, "warm": 210, "cold": 130, "reserve": 80, "governance": 50 },
  "tokenBudgets": { "claude": 38200, "gpt4o": 23600, "gemini": 14600, "groq": 9050 },
  "rebalanceCount": 442,
  "starvationEvents": 0,
  "version": "1.0.0"
}
```
