---
name: heady-dream-engine
description: >-
  Heady Dream Engine — autonomous background ideation system inspired by how the brain consolidates memories during sleep. When idle, traverses 384D vector memory finding unexpected semantic bridges between distant knowledge clusters, generating novel feature proposals. Uses phi-scaled random walks, CSL-gated novelty detection, Monte Carlo divergent search, and Fibonacci-timed dream cycles. Dreams are scored for novelty and utility, then surfaced as insights. Use when implementing background creativity, autonomous improvement, or insight generation. Keywords: dream, ideation, creativity, background processing, novelty detection, random walk, insight generation, memory consolidation, divergent thinking.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Dream Engine

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Building autonomous self-improvement into the Heady ecosystem
- The system has idle cycles and should use them productively
- Generating novel feature proposals from existing knowledge
- Finding unexpected connections between unrelated services/concepts
- Implementing "memory consolidation" — strengthening important knowledge, pruning noise
- Creating a system that gets smarter even when nobody is using it

## Architecture

```
Idle Detection (system load < PSI² = 38.2%)
  │
  ▼
Dream Cycle Scheduler (Fibonacci-timed: 5min, 8min, 13min cycles)
  │
  ▼
Dream Phases
  ├─→ Phase 1: Memory Consolidation
  │   └─→ Strengthen high-access embeddings, prune decayed ones
  ├─→ Phase 2: Divergent Walk
  │   └─→ φ-scaled random walk through 384D space
  │   └─→ Find semantically distant clusters (cosine < 0.500)
  │   └─→ Generate bridge hypotheses between clusters
  ├─→ Phase 3: Novelty Scoring
  │   └─→ CSL gate: Is this connection genuinely new?
  │   └─→ Utility scoring: Is this connection useful?
  └─→ Phase 4: Dream Report
      └─→ Package top insights for human or system consumption
          │
          ▼
  Dream Journal (persistent log of all generated insights)
          │
          ▼
  Insight Router
    ├─→ High utility + high novelty → Surface to user as suggestion
    ├─→ High utility + low novelty → Feed to AutoSuccess for optimization
    └─→ Low utility → Archive for future cross-reference
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Dream Cycle Constants
const IDLE_THRESHOLD = PSI * PSI;               // 0.382 — system load below this triggers dreaming
const DREAM_CYCLE_DURATIONS_MIN = [FIB[5], FIB[6], FIB[7]]; // 5, 8, 13 minutes
const WALK_STEPS_PER_CYCLE = FIB[8];            // 21 random walk steps
const WALK_STEP_MAGNITUDE = PSI;                // 0.618 — how far each step jumps
const BRIDGE_DISTANCE_MIN = 1 - 0.500;          // Cosine distance > 0.5 to be "distant"
const NOVELTY_THRESHOLD = 0.809;                // CSL MEDIUM — must be genuinely new
const UTILITY_THRESHOLD = 0.691;                // CSL LOW — must have some use
const MAX_INSIGHTS_PER_CYCLE = FIB[5];          // 5 insights per dream cycle
const CONSOLIDATION_STRENGTHEN = PHI * 0.01;    // 1.618% boost to frequently-accessed memories
const CONSOLIDATION_DECAY = PSI * PSI * 0.01;   // 0.382% decay to cold memories
const DREAM_JOURNAL_MAX = FIB[12];              // 144 stored dreams max
```

## Instructions

### 1. Idle Detection

Monitor system load to know when to dream:

```javascript
class IdleDetector {
  constructor(metrics) {
    this.metrics = metrics;
    this.idleStartTime = null;
  }

  isIdle() {
    const load = this.metrics.getCurrentLoad(); // 0-1 normalized
    if (load < IDLE_THRESHOLD) {
      if (!this.idleStartTime) this.idleStartTime = Date.now();
      const idleDuration = Date.now() - this.idleStartTime;
      return idleDuration > FIB[5] * 60 * 1000; // Idle for at least 5 minutes
    }
    this.idleStartTime = null;
    return false;
  }

  shouldWakeUp() {
    return this.metrics.getCurrentLoad() >= PSI; // Wake if load rises above 61.8%
  }
}
```

### 2. Memory Consolidation Phase

Strengthen important memories, decay unimportant ones:

```javascript
class MemoryConsolidator {
  async consolidate(vectorMemory) {
    const allMemories = await vectorMemory.scan({ limit: FIB[12] });
    const now = Date.now();

    for (const memory of allMemories) {
      const accessFrequency = memory.accessCount / ((now - memory.createdAt) / 3600000);
      const recency = Math.pow(PSI, (now - memory.lastAccessed) / (3600000 * FIB[8]));

      if (accessFrequency > PHI && recency > PSI) {
        // Strengthen: frequently accessed and recently touched
        await vectorMemory.boost(memory.id, CONSOLIDATION_STRENGTHEN);
      } else if (accessFrequency < PSI * PSI && recency < PSI * PSI) {
        // Decay: rarely accessed and old
        await vectorMemory.decay(memory.id, CONSOLIDATION_DECAY);
      }
    }
  }
}
```

### 3. Divergent Walk Phase

Random walk through 384D space to find unexpected bridges:

```javascript
class DivergentWalker {
  constructor(vectorMemory, embeddingProvider) {
    this.vectorMemory = vectorMemory;
    this.embeddingProvider = embeddingProvider;
  }

  async walk() {
    const bridges = [];

    // Pick a random starting point from existing memories
    const start = await this.vectorMemory.randomSample();
    let currentPosition = new Float32Array(start.embedding);

    for (let step = 0; step < WALK_STEPS_PER_CYCLE; step++) {
      // Take a φ-scaled random step in embedding space
      const perturbation = this.randomDirection(384);
      for (let d = 0; d < 384; d++) {
        currentPosition[d] += perturbation[d] * WALK_STEP_MAGNITUDE;
      }
      this.normalize(currentPosition);

      // Find nearest real memory to where we walked
      const nearest = await this.vectorMemory.search(currentPosition, { topK: FIB[4] });

      // Check if we've bridged two distant clusters
      for (const neighbor of nearest) {
        const distFromStart = 1 - cosineSimilarity(start.embedding, neighbor.embedding);
        if (distFromStart > BRIDGE_DISTANCE_MIN) {
          bridges.push({
            source: start,
            target: neighbor,
            bridgePoint: new Float32Array(currentPosition),
            distance: distFromStart,
            step,
          });
        }
      }

      // Occasionally teleport to a distant region (exploration)
      if (step % FIB[5] === 0) {
        const teleport = await this.vectorMemory.randomSample();
        currentPosition = new Float32Array(teleport.embedding);
      }
    }

    return bridges;
  }

  randomDirection(dimensions) {
    const dir = new Float32Array(dimensions);
    for (let d = 0; d < dimensions; d++) {
      dir[d] = (Math.random() - 0.5) * 2;
    }
    this.normalize(dir);
    return dir;
  }

  normalize(vec) {
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (mag > 0) for (let d = 0; d < vec.length; d++) vec[d] /= mag;
  }
}
```

### 4. Novelty and Utility Scoring

Score each bridge for genuineness and practical value:

```javascript
class InsightScorer {
  async score(bridge, vectorMemory) {
    // Novelty: Has this connection been made before?
    const existingBridges = await vectorMemory.search(bridge.bridgePoint, { topK: FIB[5] });
    const closestExisting = existingBridges[0];
    const novelty = closestExisting
      ? 1 - cosineSimilarity(bridge.bridgePoint, closestExisting.embedding)
      : 1.0;

    // Utility: Are both endpoints high-value memories?
    const sourceValue = bridge.source.accessCount / FIB[8]; // Normalized
    const targetValue = bridge.target.accessCount / FIB[8];
    const utility = Math.min(1, (sourceValue + targetValue) * PSI);

    // Composite dream score
    const dreamScore = (novelty * PHI + utility * 1.0) / (PHI + 1.0);

    return {
      ...bridge,
      novelty,
      utility,
      dreamScore,
      isInsight: novelty >= NOVELTY_THRESHOLD && utility >= UTILITY_THRESHOLD,
    };
  }
}
```

### 5. Dream Report Generation

Package insights into actionable reports:

```javascript
class DreamReporter {
  async generateReport(scoredBridges) {
    const insights = scoredBridges
      .filter(b => b.isInsight)
      .sort((a, b) => b.dreamScore - a.dreamScore)
      .slice(0, MAX_INSIGHTS_PER_CYCLE);

    return {
      cycleTimestamp: Date.now(),
      insightCount: insights.length,
      insights: insights.map(insight => ({
        sourceCluster: insight.source.metadata?.label || insight.source.id,
        targetCluster: insight.target.metadata?.label || insight.target.id,
        connection: `Unexpected bridge between "${insight.source.content?.slice(0, 100)}" and "${insight.target.content?.slice(0, 100)}"`,
        noveltyScore: insight.novelty,
        utilityScore: insight.utility,
        dreamScore: insight.dreamScore,
        suggestedAction: this.suggestAction(insight),
      })),
      consolidationStats: { strengthened: 0, decayed: 0 },
    };
  }

  suggestAction(insight) {
    if (insight.dreamScore > 0.882) return 'Investigate immediately — high-value novel connection';
    if (insight.dreamScore > 0.809) return 'Queue for next active session review';
    return 'Archive for future reference';
  }
}
```

## Integration Points

| Heady Component | Dream Contribution |
|---|---|
| HeadySoul | Dreams contribute to soul's self-model evolution |
| AutoSuccess | Dream insights feed into pipeline optimization |
| WisdomStore | High-scoring dreams become persistent wisdom |
| HeadyBuddy | Surface dream insights as proactive suggestions |
| SwarmEvolution | Dream-discovered patterns seed new populations |
| ReputationEngine | Dream cycle validates dormant agents for reactivation |

## API

```javascript
const { DreamEngine } = require('@heady/dream-engine');

const engine = new DreamEngine({ vectorMemory, embeddingProvider, metrics });

engine.startDreamCycle(); // Runs automatically when idle

// Manual trigger
const report = await engine.dreamNow();
const journal = engine.getDreamJournal({ limit: FIB[8] });

engine.health();
await engine.shutdown();
```

## Health Endpoint

```json
{
  "status": "dreaming",
  "coherenceScore": 0.867,
  "totalDreamCycles": 89,
  "insightsGenerated": 233,
  "highValueInsights": 34,
  "memoriesConsolidated": 1597,
  "currentPhase": "divergent-walk",
  "lastDreamTimestamp": "2026-03-17T23:30:00Z",
  "version": "1.0.0"
}
```
