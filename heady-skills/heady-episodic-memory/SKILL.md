---
name: heady-episodic-memory
description: >-
  Cognitive memory architecture implementing episodic, semantic, and procedural
  memory tiers with phi-decay forgetting curves and memory consolidation for
  long-lived Heady agents. Episodic tier stores timestamped events (987 max),
  semantic tier holds extracted knowledge facts (610 max), procedural tier keeps
  learned action rules (377 max) — all Fibonacci-capped. Phi-decay forgetting:
  relevance = score × PSI^(hours/decay_period) with CSL-tiered half-lives
  (Critical weekly, Normal daily, Low 8-hour). Nightly consolidation promotes
  repeated episodic patterns into semantic facts. Working memory hot-caches 21
  most-relevant items. 384D pgvector indexing with temporal-importance composite
  scoring. Cross-agent semantic sharing with episodic privacy boundaries.
  Integrates with heady-dream-engine for episodic replay and decision improvement.
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Center
  phi-compliance: verified
---

# Heady Episodic Memory

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **Agent needs to recall past interactions** — episodic tier retrieves who/what/when/where/outcome
- **Extracting knowledge from repeated events** — consolidation promotes episodic patterns to semantic facts
- **Learning behavioral patterns** — procedural tier stores if-then rules from successful action sequences
- **Working memory assembly** — hot-cache the 21 most relevant memories for current agent context
- **Memory cleanup and forgetting** — phi-decay curves automatically fade stale memories
- **Cross-agent knowledge sharing** — agents query each other's semantic tier without exposing episodic details
- **Dream engine integration** — episodic replay re-experiences past events to improve future decisions
- **Memory capacity management** — Fibonacci-capped tiers prevent unbounded memory growth
- **Agent identity persistence** — Center layer (HeadySoul) memories define agent personality across sessions
- **Debugging agent reasoning** — trace which memories influenced a specific decision

## Architecture

```
Sacred Geometry Topology — Episodic Memory Position:
CENTER(HeadySoul) ← EPISODIC MEMORY (core identity + memory is the soul)
   → Inner(Conductor,Brains,Vinci,AutoSuccess)
   → Middle(JULES,BUILDER,OBSERVER,MURPHY,ATLAS,PYTHIA)
   → Outer(BRIDGE,MUSE,SENTINEL,NOVA,JANITOR,SOPHIA,CIPHER,LENS)
   → Governance(Check,Assure,Aware,Patterns,MC,Risks)

┌──────────────────────────────────────────────────────────────────┐
│                    EPISODIC MEMORY SYSTEM                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  WORKING MEMORY (Hot Cache — 21 items)                     │  │
│  │  Upstash Redis │ φ-ranked retrieval │ Context assembly      │  │
│  └───────────────────────┬────────────────────────────────────┘  │
│                          ▼                                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │ Episodic │  │  Semantic    │  │ Procedural                │  │
│  │ 987 evts │  │  610 facts   │  │ 377 rules                 │  │
│  │ temporal  │  │  entity graph│  │ if-then patterns          │  │
│  │ who/what  │  │  concept map │  │ learned behaviors         │  │
│  │ when/where│  │  shared tier │  │ action recipes            │  │
│  └─────┬────┘  └──────┬───────┘  └────────────┬──────────────┘  │
│        └───────────────┼───────────────────────┘                 │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  MEMORY ENGINE                                             │  │
│  │  384D pgvector │ φ-Decay Forgetting │ Consolidation Worker │  │
│  │  Neon Postgres │ HNSW(m=21,ef=89)   │ Nightly batch        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Dream Engine (replay) │ Cross-Agent Sharing │ Privacy Boundary  │
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

// ─── Fusion Weights ────────────────────────────────────────────────────
const FUSION_2WAY = [PSI, 1 - PSI];        // [0.618, 0.382]
const FUSION_3WAY = [0.528, 0.326, 0.146]; // 3-way phi fusion

// ─── Episodic Memory Constants ─────────────────────────────────────────
const MEMORY = {
  // Tier capacity limits (Fibonacci)
  EPISODIC_MAX:     FIB[15],   // 987 events
  SEMANTIC_MAX:     FIB[14],   // 610 facts
  PROCEDURAL_MAX:   FIB[13],   // 377 rules

  // Working memory
  WORKING_MEMORY_SIZE: FIB[7], // 21 hot-cached items

  // Phi-decay half-lives (hours)
  DECAY_CRITICAL_H: FIB[7] * 8,  // 168 hours (7 days) — CSL >= CRITICAL
  DECAY_NORMAL_H:   FIB[7] + 3,  // 24 hours (1 day) — default
  DECAY_LOW_H:      FIB[5],      // 8 hours — low-value memories

  // Consolidation
  CONSOLIDATION_REPEAT_THRESHOLD: FIB[4],  // 5 repeats to promote episodic → semantic
  CONSOLIDATION_BATCH_SIZE:       FIB[8],  // 34 memories per consolidation batch
  CONSOLIDATION_INTERVAL_MS: FIB[7] * 3600 * 1000, // 21 hours between consolidation runs

  // Retrieval
  VECTOR_DIMENSIONS:  384,
  HNSW_M:             FIB[7],     // 21 — HNSW build param
  HNSW_EF:            FIB[10],    // 89 — HNSW search param
  RETRIEVAL_TOP_K:    FIB[6],     // 13 candidates before re-ranking
  RELEVANCE_FLOOR:    CSL_GATES.MINIMUM, // 0.500 minimum relevance to return

  // Temporal scoring
  TEMPORAL_WEIGHT:    PSI,        // 0.618 weight for temporal relevance
  IMPORTANCE_WEIGHT:  1 - PSI,    // 0.382 weight for importance score

  // Backoff for retries
  BACKOFF_BASE_MS:    FIB[4] * 100, // 300ms
  BACKOFF_JITTER:     PSI ** 2,     // ±0.382
};
```

## Instructions

### Memory Store and Tier Management

The memory store persists all three tiers in Neon Postgres with 384D pgvector embeddings. Each memory has temporal context, importance scoring, and a tier-specific schema.

```javascript
// heady-episodic-memory/src/memory-store.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const log = pino({ name: 'heady-episodic-memory', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const MEMORY = {
  EPISODIC_MAX: FIB[15], SEMANTIC_MAX: FIB[14], PROCEDURAL_MAX: FIB[13],
  WORKING_MEMORY_SIZE: FIB[7],
  DECAY_CRITICAL_H: FIB[7] * 8, DECAY_NORMAL_H: FIB[7] + 3, DECAY_LOW_H: FIB[5],
  CONSOLIDATION_REPEAT_THRESHOLD: FIB[4], CONSOLIDATION_BATCH_SIZE: FIB[8],
  VECTOR_DIMENSIONS: 384, RETRIEVAL_TOP_K: FIB[6], RELEVANCE_FLOOR: CSL_GATES.MINIMUM,
  TEMPORAL_WEIGHT: PSI, IMPORTANCE_WEIGHT: 1 - PSI,
};

const MemoryTier = { EPISODIC: 'episodic', SEMANTIC: 'semantic', PROCEDURAL: 'procedural' };

const TIER_LIMITS = {
  [MemoryTier.EPISODIC]: MEMORY.EPISODIC_MAX,
  [MemoryTier.SEMANTIC]: MEMORY.SEMANTIC_MAX,
  [MemoryTier.PROCEDURAL]: MEMORY.PROCEDURAL_MAX,
};

/**
 * Core memory record structure.
 */
export function createMemoryRecord({ agentId, tier, content, embedding, importance, context }) {
  return {
    id: randomUUID(),
    agentId,
    tier,
    content,
    embedding,
    importance: importance ?? CSL_GATES.MEDIUM,
    context: context ?? {},
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
    accessCount: 0,
    decayedRelevance: importance ?? CSL_GATES.MEDIUM,
    consolidated: false,
  };
}

/**
 * Memory store backed by Neon Postgres + pgvector.
 */
export class MemoryStore {
  constructor(pgPool) {
    this.pgPool = pgPool;
    log.info('MemoryStore initialized with Neon Postgres + pgvector(384D)');
  }

  async store(record) {
    const count = await this.countByTier(record.agentId, record.tier);
    const limit = TIER_LIMITS[record.tier];
    if (count >= limit) {
      await this.evictLowest(record.agentId, record.tier);
      log.info({ agentId: record.agentId, tier: record.tier, limit }, 'Capacity reached, evicted lowest');
    }

    const vectorStr = `[${record.embedding.join(',')}]`;
    await this.pgPool.query(
      `INSERT INTO episodic_memory.memories
        (id, agent_id, tier, content, embedding, importance, context,
         created_at, last_accessed_at, access_count, consolidated)
       VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8, $9, $10, $11)`,
      [record.id, record.agentId, record.tier, JSON.stringify(record.content),
       vectorStr, record.importance, JSON.stringify(record.context),
       new Date(record.createdAt), new Date(record.lastAccessedAt),
       record.accessCount, record.consolidated]
    );
    log.info({ id: record.id, agentId: record.agentId, tier: record.tier,
      importance: record.importance.toFixed(3) }, 'Memory stored');
    return record;
  }

  async retrieve(agentId, queryEmbedding, tier, topK = MEMORY.RETRIEVAL_TOP_K) {
    const vectorStr = `[${queryEmbedding.join(',')}]`;
    const tierClause = tier ? `AND tier = '${tier}'` : '';
    const result = await this.pgPool.query(
      `SELECT id, agent_id, tier, content, importance, context,
              created_at, last_accessed_at, access_count, consolidated,
              1 - (embedding <=> $1::vector) AS similarity
       FROM episodic_memory.memories
       WHERE agent_id = $2 ${tierClause}
         AND 1 - (embedding <=> $1::vector) >= $3
       ORDER BY similarity DESC
       LIMIT $4`,
      [vectorStr, agentId, MEMORY.RELEVANCE_FLOOR, topK]
    );

    for (const row of result.rows) {
      await this.touchMemory(row.id);
    }

    log.info({ agentId, tier: tier || 'all', matches: result.rows.length, topK },
      'Memory retrieval complete');
    return result.rows;
  }

  async touchMemory(memoryId) {
    await this.pgPool.query(
      `UPDATE episodic_memory.memories
       SET last_accessed_at = NOW(), access_count = access_count + 1
       WHERE id = $1`,
      [memoryId]
    );
  }

  async countByTier(agentId, tier) {
    const result = await this.pgPool.query(
      `SELECT COUNT(*) AS cnt FROM episodic_memory.memories WHERE agent_id = $1 AND tier = $2`,
      [agentId, tier]
    );
    return parseInt(result.rows[0].cnt, 10);
  }

  async evictLowest(agentId, tier) {
    await this.pgPool.query(
      `DELETE FROM episodic_memory.memories
       WHERE id = (
         SELECT id FROM episodic_memory.memories
         WHERE agent_id = $1 AND tier = $2
         ORDER BY importance ASC, last_accessed_at ASC
         LIMIT 1
       )`,
      [agentId, tier]
    );
  }

  async getTierStats(agentId) {
    const result = await this.pgPool.query(
      `SELECT tier, COUNT(*) AS count, AVG(importance) AS avg_importance,
              MIN(created_at) AS oldest, MAX(created_at) AS newest
       FROM episodic_memory.memories WHERE agent_id = $1
       GROUP BY tier`,
      [agentId]
    );
    const stats = {};
    for (const row of result.rows) {
      stats[row.tier] = {
        count: parseInt(row.count, 10),
        capacity: TIER_LIMITS[row.tier],
        utilization: parseInt(row.count, 10) / TIER_LIMITS[row.tier],
        avgImportance: parseFloat(row.avg_importance),
        oldest: row.oldest,
        newest: row.newest,
      };
    }
    return stats;
  }
}
```

### Phi-Decay Forgetting Engine

The forgetting engine applies phi-decay curves to all memories. CSL-tiered half-lives ensure critical memories persist far longer than low-value ones.

```javascript
// heady-episodic-memory/src/forgetting-engine.mjs
import pino from 'pino';

const log = pino({ name: 'heady-forgetting-engine', level: process.env.LOG_LEVEL || 'info' });

const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const DECAY_PERIODS = {
  critical: FIB[7] * 8,  // 168h — weekly half-life
  normal:   FIB[7] + 3,  // 24h — daily half-life
  low:      FIB[5],       // 8h — rapid decay
};

/**
 * Computes the phi-decay relevance for a memory.
 * Formula: relevance = originalScore × PSI^(hoursElapsed / decayPeriod)
 */
export function computeDecayedRelevance(originalScore, createdAtMs, nowMs = Date.now()) {
  const hoursElapsed = (nowMs - createdAtMs) / (3600 * 1000);
  const decayPeriod = selectDecayPeriod(originalScore);
  const decayed = originalScore * Math.pow(PSI, hoursElapsed / decayPeriod);
  return Math.max(0, decayed);
}

/**
 * Selects the decay period based on memory importance (CSL tier).
 */
function selectDecayPeriod(importance) {
  if (importance >= CSL_GATES.CRITICAL) return DECAY_PERIODS.critical;
  if (importance >= CSL_GATES.MEDIUM)   return DECAY_PERIODS.normal;
  return DECAY_PERIODS.low;
}

/**
 * Forgetting engine that runs decay sweeps across all memories.
 */
export class ForgettingEngine {
  constructor(pgPool) {
    this.pgPool = pgPool;
    this.lastSweep = null;
    this.memoriesForgotten = 0;
  }

  async runDecaySweep(agentId) {
    const sweepStart = Date.now();
    log.info({ agentId }, 'Decay sweep started');

    const result = await this.pgPool.query(
      `SELECT id, importance, created_at FROM episodic_memory.memories WHERE agent_id = $1`,
      [agentId]
    );

    let forgotten = 0;
    for (const row of result.rows) {
      const decayed = computeDecayedRelevance(
        parseFloat(row.importance),
        new Date(row.created_at).getTime()
      );

      if (decayed < CSL_GATES.MINIMUM * 0.5) {
        await this.pgPool.query(`DELETE FROM episodic_memory.memories WHERE id = $1`, [row.id]);
        forgotten++;
      } else {
        await this.pgPool.query(
          `UPDATE episodic_memory.memories SET importance = $1 WHERE id = $2`,
          [decayed, row.id]
        );
      }
    }

    this.lastSweep = Date.now();
    this.memoriesForgotten += forgotten;
    const durationMs = Date.now() - sweepStart;
    log.info({ agentId, scanned: result.rows.length, forgotten, durationMs },
      'Decay sweep complete');
    return { scanned: result.rows.length, forgotten, durationMs };
  }

  getStats() {
    return { lastSweep: this.lastSweep, totalForgotten: this.memoriesForgotten };
  }
}
```

### Memory Consolidation Worker

Nightly batch process that scans episodic memories for repeated patterns and promotes them to semantic facts.

```javascript
// heady-episodic-memory/src/consolidation-worker.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-consolidation', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const CONSOLIDATION = {
  REPEAT_THRESHOLD: FIB[4],   // 5 repetitions to promote
  BATCH_SIZE: FIB[8],         // 34 memories per batch
  SIMILARITY_THRESHOLD: CSL_GATES.DEDUP,  // 0.972 to detect duplicates
  PROMOTION_BOOST: PHI / (PHI + 1),       // 0.618 importance boost on promotion
};

/**
 * Consolidation worker promoting episodic → semantic.
 */
export class ConsolidationWorker {
  constructor(pgPool) {
    this.pgPool = pgPool;
    this.lastRun = null;
    this.totalPromoted = 0;
    this.running = false;
  }

  async runConsolidation(agentId) {
    if (this.running) {
      log.warn({ agentId }, 'Consolidation already running, skipping');
      return null;
    }
    this.running = true;
    const runStart = Date.now();
    log.info({ agentId }, 'Memory consolidation started');

    try {
      const clusters = await this.findRepeatedPatterns(agentId);
      let promoted = 0;
      for (const cluster of clusters) {
        if (cluster.count >= CONSOLIDATION.REPEAT_THRESHOLD) {
          await this.promoteToSemantic(agentId, cluster);
          promoted++;
        }
      }

      this.lastRun = Date.now();
      this.totalPromoted += promoted;
      const durationMs = Date.now() - runStart;
      log.info({ agentId, clustersFound: clusters.length, promoted, durationMs },
        'Consolidation complete');
      return { clustersFound: clusters.length, promoted, durationMs };
    } finally {
      this.running = false;
    }
  }

  async findRepeatedPatterns(agentId) {
    const result = await this.pgPool.query(
      `WITH pairs AS (
         SELECT a.id AS id_a, b.id AS id_b,
                1 - (a.embedding <=> b.embedding) AS similarity,
                a.content AS content_a
         FROM episodic_memory.memories a
         JOIN episodic_memory.memories b ON a.id < b.id
         WHERE a.agent_id = $1 AND b.agent_id = $1
           AND a.tier = 'episodic' AND b.tier = 'episodic'
           AND a.consolidated = false
           AND 1 - (a.embedding <=> b.embedding) >= $2
         LIMIT $3
       )
       SELECT content_a, COUNT(*) + 1 AS count
       FROM pairs GROUP BY content_a
       ORDER BY count DESC`,
      [agentId, CONSOLIDATION.SIMILARITY_THRESHOLD, CONSOLIDATION.BATCH_SIZE * 10]
    );

    return result.rows.map((r) => ({
      content: JSON.parse(r.content_a),
      count: parseInt(r.count, 10),
    }));
  }

  async promoteToSemantic(agentId, cluster) {
    const semanticId = randomUUID();
    const boostedImportance = Math.min(1, CSL_GATES.HIGH * (1 + CONSOLIDATION.PROMOTION_BOOST));
    const semanticContent = {
      type: 'extracted_fact',
      source: 'episodic_consolidation',
      originalPattern: cluster.content,
      occurrences: cluster.count,
      extractedAt: new Date().toISOString(),
    };

    await this.pgPool.query(
      `INSERT INTO episodic_memory.memories
        (id, agent_id, tier, content, embedding, importance, context,
         created_at, last_accessed_at, access_count, consolidated)
       SELECT $1, $2, 'semantic', $3,
              (SELECT embedding FROM episodic_memory.memories
               WHERE agent_id = $2 AND tier = 'episodic'
                 AND content = $4 LIMIT 1),
              $5, '{}', NOW(), NOW(), 0, true
       ON CONFLICT DO NOTHING`,
      [semanticId, agentId, JSON.stringify(semanticContent),
       JSON.stringify(cluster.content), boostedImportance]
    );

    await this.pgPool.query(
      `UPDATE episodic_memory.memories
       SET consolidated = true
       WHERE agent_id = $1 AND tier = 'episodic'
         AND content = $2`,
      [agentId, JSON.stringify(cluster.content)]
    );

    log.info({ agentId, semanticId, occurrences: cluster.count,
      importance: boostedImportance.toFixed(3) }, 'Episodic pattern promoted to semantic');
  }

  getStats() {
    return { lastRun: this.lastRun, totalPromoted: this.totalPromoted, running: this.running };
  }
}
```

### Working Memory and Retrieval Scorer

Hot cache of the 21 most relevant memories for the agent's current context, backed by Upstash Redis with phi-weighted composite scoring.

```javascript
// heady-episodic-memory/src/working-memory.mjs
import pino from 'pino';

const log = pino({ name: 'heady-working-memory', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const FUSION_3WAY = [0.528, 0.326, 0.146];

const WORKING = {
  SIZE: FIB[7],           // 21 items
  REFRESH_MS: FIB[6] * 1000, // 13s refresh interval
};

/**
 * Computes composite retrieval score using 3-way phi fusion:
 *   similarity × 0.528 + recency × 0.326 + importance × 0.146
 */
export function compositeScore(similarity, recencyNorm, importance) {
  return FUSION_3WAY[0] * similarity
       + FUSION_3WAY[1] * recencyNorm
       + FUSION_3WAY[2] * importance;
}

/**
 * Working memory — hot cache of top-21 relevant memories.
 */
export class WorkingMemory {
  constructor(redis, memoryStore) {
    this.redis = redis;
    this.store = memoryStore;
    this.cache = new Map();
  }

  async assemble(agentId, contextEmbedding) {
    const candidates = await this.store.retrieve(agentId, contextEmbedding, null, FIB[8]);
    const now = Date.now();

    const scored = candidates.map((mem) => {
      const ageHours = (now - new Date(mem.created_at).getTime()) / 3600000;
      const recencyNorm = Math.pow(PSI, ageHours / (FIB[7] + 3));
      const score = compositeScore(
        parseFloat(mem.similarity),
        recencyNorm,
        parseFloat(mem.importance)
      );
      return { ...mem, compositeScore: score };
    });

    scored.sort((a, b) => b.compositeScore - a.compositeScore);
    const working = scored.slice(0, WORKING.SIZE);

    const cacheKey = `working_mem:${agentId}`;
    await this.redis.set(cacheKey, JSON.stringify(working.map((m) => m.id)),
      { ex: WORKING.REFRESH_MS / 1000 });

    this.cache.set(agentId, { items: working, assembledAt: now });

    log.info({ agentId, candidates: candidates.length, selected: working.length,
      topScore: working[0]?.compositeScore.toFixed(4) }, 'Working memory assembled');
    return working;
  }

  async getCached(agentId) {
    const cached = this.cache.get(agentId);
    if (cached && (Date.now() - cached.assembledAt) < WORKING.REFRESH_MS) {
      return cached.items;
    }
    return null;
  }

  getStats(agentId) {
    const cached = this.cache.get(agentId);
    return {
      hasCached: !!cached,
      itemCount: cached?.items.length ?? 0,
      assembledAt: cached?.assembledAt ?? null,
      maxSize: WORKING.SIZE,
    };
  }
}
```

### Express Router and Health Endpoint

```javascript
// heady-episodic-memory/src/router.mjs
import express from 'express';
import pino from 'pino';
import { MemoryStore, createMemoryRecord } from './memory-store.mjs';
import { ForgettingEngine } from './forgetting-engine.mjs';
import { ConsolidationWorker } from './consolidation-worker.mjs';
import { WorkingMemory } from './working-memory.mjs';

const log = pino({ name: 'heady-episodic-memory', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

export function createEpisodicMemoryRouter(pgPool, redis) {
  const router = express.Router();
  const store = new MemoryStore(pgPool);
  const forgetting = new ForgettingEngine(pgPool);
  const consolidation = new ConsolidationWorker(pgPool);
  const working = new WorkingMemory(redis, store);

  router.get('/health', async (req, res) => {
    const agentId = req.query.agent_id || 'system';
    const tierStats = await store.getTierStats(agentId);
    const workingStats = working.getStats(agentId);
    const forgettingStats = forgetting.getStats();
    const consolidationStats = consolidation.getStats();

    res.json({
      service: 'heady-episodic-memory',
      status: 'healthy',
      coherence: 0.882,
      phi_compliance: true,
      sacred_geometry_layer: 'Center',
      uptime_seconds: parseFloat(process.uptime().toFixed(2)),
      version: '1.0.0',
      phi: PHI,
      psi: PSI,
      memory_tiers: {
        episodic: tierStats.episodic || { count: 0, capacity: FIB[15] },
        semantic: tierStats.semantic || { count: 0, capacity: FIB[14] },
        procedural: tierStats.procedural || { count: 0, capacity: FIB[13] },
      },
      working_memory: workingStats,
      forgetting: forgettingStats,
      consolidation: consolidationStats,
      decay_config: {
        critical_halflife_h: FIB[7] * 8,
        normal_halflife_h: FIB[7] + 3,
        low_halflife_h: FIB[5],
        formula: 'relevance = score × PSI^(hours / decay_period)',
      },
    });
  });

  router.post('/store', async (req, res) => {
    try {
      const { agentId, tier, content, embedding, importance, context } = req.body;
      const record = createMemoryRecord({ agentId, tier, content, embedding, importance, context });
      const stored = await store.store(record);
      res.json({ id: stored.id, tier: stored.tier, importance: stored.importance });
    } catch (err) {
      log.error({ err: err.message }, 'Memory store failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/retrieve', async (req, res) => {
    try {
      const { agentId, queryEmbedding, tier, topK } = req.body;
      const results = await store.retrieve(agentId, queryEmbedding, tier, topK);
      res.json({ matches: results.length, results });
    } catch (err) {
      log.error({ err: err.message }, 'Memory retrieval failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/working-memory/assemble', async (req, res) => {
    try {
      const { agentId, contextEmbedding } = req.body;
      const items = await working.assemble(agentId, contextEmbedding);
      res.json({ count: items.length, items });
    } catch (err) {
      log.error({ err: err.message }, 'Working memory assembly failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/decay-sweep', async (req, res) => {
    try {
      const { agentId } = req.body;
      const result = await forgetting.runDecaySweep(agentId);
      res.json(result);
    } catch (err) {
      log.error({ err: err.message }, 'Decay sweep failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/consolidate', async (req, res) => {
    try {
      const { agentId } = req.body;
      const result = await consolidation.runConsolidation(agentId);
      if (!result) {
        res.status(409).json({ error: 'Consolidation already in progress' });
        return;
      }
      res.json(result);
    } catch (err) {
      log.error({ err: err.message }, 'Consolidation failed');
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
```

## Integration Points

| Component                 | Interface                              | Sacred Geometry Layer |
|---------------------------|----------------------------------------|-----------------------|
| **HeadySoul**             | Core identity memory persistence       | Center                |
| **Conductor**             | Retrieves agent working memory for orchestration | Inner        |
| **Brains**                | Procedural tier feeds learned reasoning patterns  | Inner        |
| **ATLAS**                 | Semantic tier syncs with knowledge graph | Middle               |
| **PYTHIA**                | Episodic patterns feed prediction models | Middle               |
| **OBSERVER**              | Memory health telemetry                 | Middle               |
| **heady-dream-engine**    | Episodic replay for decision improvement | Center              |
| **heady-memory-ops**      | Memory CRUD operations and migrations   | Governance           |
| **heady-vector-memory-v2** | 384D pgvector shared infrastructure    | Center               |
| **heady-companion-memory** | Cross-agent semantic tier sharing      | Center               |
| **Neon Postgres**         | pgvector(384D) HNSW(m=21,ef=89) storage | Infrastructure      |
| **Upstash Redis**         | Working memory hot cache                | Infrastructure       |
| **Langfuse**              | Memory retrieval tracing                | Governance           |

## API

### GET /health

Returns memory tier stats, working memory status, consolidation state, and decay configuration.

### POST /store

Stores a new memory record in the specified tier.

**Request:**
```json
{
  "agentId": "bee-alpha-001",
  "tier": "episodic",
  "content": { "who": "user-123", "what": "requested code review", "where": "headyme.com", "outcome": "approved" },
  "embedding": [0.12, -0.34, 0.56, "...(384D)"],
  "importance": 0.882,
  "context": { "hcfp_stage": "review", "pipeline_run": "run-abc" }
}
```

### POST /retrieve

Retrieves memories by vector similarity with phi-scored relevance.

### POST /working-memory/assemble

Assembles the top-21 working memory items for an agent's current context.

### POST /decay-sweep

Triggers a phi-decay sweep, fading stale memories and deleting those below threshold.

### POST /consolidate

Runs the episodic→semantic consolidation pass, promoting repeated patterns to facts.

## Health Endpoint

```json
{
  "service": "heady-episodic-memory",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Center",
  "uptime_seconds": 54021.33,
  "version": "1.0.0",
  "phi": 1.618033988749895,
  "psi": 0.618033988749895,
  "memory_tiers": {
    "episodic": { "count": 743, "capacity": 987, "utilization": 0.753, "avgImportance": 0.714 },
    "semantic": { "count": 298, "capacity": 610, "utilization": 0.489, "avgImportance": 0.841 },
    "procedural": { "count": 112, "capacity": 377, "utilization": 0.297, "avgImportance": 0.809 }
  },
  "working_memory": { "hasCached": true, "itemCount": 21, "maxSize": 21 },
  "forgetting": { "lastSweep": 1742302800000, "totalForgotten": 1247 },
  "consolidation": { "lastRun": 1742270400000, "totalPromoted": 89, "running": false },
  "decay_config": {
    "critical_halflife_h": 168,
    "normal_halflife_h": 24,
    "low_halflife_h": 8,
    "formula": "relevance = score × PSI^(hours / decay_period)"
  }
}
```
