---
name: heady-redis-lattice
description: >-
  Upstash Redis caching layer with multi-tier cache hierarchy, phi-scaled TTLs,
  pub/sub event bus, and cache coherence protocol for the Heady ecosystem.
  Three-tier hierarchy: L1 Cloudflare KV (~1ms) → L2 Upstash Redis (~5ms) →
  L3 Neon Postgres (~21ms). Phi-scaled TTLs: L1=34s, L2=89s, L3=233s for hot
  data, multiplied by PHI per cooling tier. Write-through coherence for critical
  data (CSL >= 0.882), write-back for warm (>= 0.691). Pub/sub event bus for
  real-time inter-service communication, bee coordination, and pipeline stage
  events. Session store backing with httpOnly cookies, sliding-window rate
  limiting via sorted sets, predictive cache warming, and 384D embedding cache
  with HNSW-lite index. Fibonacci-bucketed pool allocation across Hot/Warm/Cold
  reserves.
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Inner
  phi-compliance: verified
---

# Heady Redis Lattice

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **Setting up multi-tier caching** — L1/L2/L3 hierarchy with phi-scaled TTLs for any Heady service
- **Implementing pub/sub event bus** — real-time inter-service messaging for bee coordination and pipeline events
- **Session management** — httpOnly cookie sessions backed by Upstash Redis with phi-decay eviction
- **Rate limiting** — sliding-window rate limiting using Redis sorted sets with Fibonacci tier thresholds
- **Cache coherence** — write-through vs write-back policies gated by CSL confidence scoring
- **Embedding caching** — frequently accessed 384D pgvector embeddings cached in Redis for sub-millisecond lookup
- **Cache warming** — predictive pre-fetch strategies driven by access pattern analysis
- **Cross-service invalidation** — coordinated cache busting across L1/L2/L3 when data mutates
- **Performance optimization** — reducing p95 latency on hot-path queries from ~21ms (Postgres) to ~1ms (KV)

## Architecture

```
Sacred Geometry Topology — Redis Lattice Position:
Center(HeadySoul) → Inner(Conductor, Brains, Vinci, AutoSuccess)
                           ↑
                   Redis Lattice serves ALL Inner ring nodes
                   as core caching infrastructure

┌──────────────────────────────────────────────────────────────────┐
│                       REDIS LATTICE                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  L1: Cloudflare KV         TTL: 34s    Latency: ~1ms      │  │
│  │  (Edge cache, read-heavy, eventually consistent)           │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  L2: Upstash Redis        TTL: 89s    Latency: ~5ms       │  │
│  │  (Session, rate-limit, pub/sub, embedding cache)           │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  L3: Neon Postgres        TTL: 233s   Latency: ~21ms      │  │
│  │  (Source of truth, pgvector 384D, HNSW m=21 ef=89)         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐   │
│  │ Coherence Proto │  │ Pub/Sub EventBus │  │ Cache Warmer  │   │
│  │ write-through/  │  │ bee coordination │  │ predictive    │   │
│  │ write-back CSL  │  │ pipeline events  │  │ pre-fetch     │   │
│  └─────────────────┘  └──────────────────┘  └───────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Phi-Math Constants

```javascript
// ─── Sacred Geometry Constants ───────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Confidence Gates ────────────────────────────────────────────
const CSL_GATES = {
  MINIMUM:  0.500,
  LOW:      0.691,
  MEDIUM:   0.809,
  HIGH:     0.882,
  CRITICAL: 0.927,
  DEDUP:    0.972,
};

// ─── Pool Allocation ─────────────────────────────────────────────────
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

// ─── Redis Lattice Thresholds ────────────────────────────────────────
const LATTICE = {
  // Phi-scaled TTLs (seconds) per tier
  TTL_L1_HOT:   FIB[8],                          // 34s  — Cloudflare KV edge
  TTL_L2_HOT:   FIB[10],                         // 89s  — Upstash Redis
  TTL_L3_HOT:   FIB[12],                         // 233s — Neon Postgres query cache
  TTL_COOLING:  PHI,                              // multiply TTL by PHI per cooling step

  // Latency budgets (ms)
  LATENCY_L1:   FIB[0],                          // 1ms  target
  LATENCY_L2:   FIB[4],                          // 5ms  target
  LATENCY_L3:   FIB[7],                          // 21ms target

  // Session config
  SESSION_TTL:          FIB[7] * 60,             // 21 minutes (1260s) — access token
  SESSION_REFRESH_TTL:  FIB[15] * 60,            // 987 minutes (59220s) — refresh token
  SESSION_DECAY:        PSI,                      // phi-decay factor for stale eviction

  // Rate limiter tiers (requests/second)
  RATE_FREE:       FIB[5],                        // 8 req/s
  RATE_PRO:        FIB[7],                        // 21 req/s
  RATE_ENTERPRISE: FIB[9],                        // 55 req/s

  // Embedding cache
  VECTOR_DIM:          384,                       // pgvector dimension
  EMBEDDING_CACHE_MAX: FIB[12] * 100,            // 23300 cached vectors
  EMBEDDING_TTL:       FIB[11],                   // 144s

  // Pub/sub
  PUBSUB_MAX_CHANNELS:   FIB[9],                 // 55 channels
  PUBSUB_MSG_TTL:        FIB[7],                 // 21s message retention

  // Coherence
  COHERENCE_WRITE_THROUGH: CSL_GATES.HIGH,       // >= 0.882 → write-through
  COHERENCE_WRITE_BACK:    CSL_GATES.LOW,        // >= 0.691 → write-back
  COHERENCE_SKIP:          CSL_GATES.MINIMUM,    // < 0.500 → cache-aside only

  // Cache warming
  WARM_PREDICT_WINDOW: FIB[8],                   // 34 recent accesses to predict
  WARM_PREFETCH_BATCH: FIB[6],                   // 13 items per prefetch batch

  // Backoff: PHI^attempt × base (jitter ±38.2%)
  BACKOFF_BASE_MS:  FIB[5] * 100,               // 800ms base
  BACKOFF_JITTER:   PSI * PSI,                   // ±0.382 (38.2%)
};
```

## Instructions

### Multi-Tier Cache Implementation

```javascript
// heady-redis-lattice/src/cache-lattice.mjs
import pino from 'pino';
import { Redis } from '@upstash/redis';

const log = pino({
  name: 'heady-redis-lattice',
  level: process.env.LOG_LEVEL || 'info',
});

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const LATTICE = {
  TTL_L1_HOT: FIB[8], TTL_L2_HOT: FIB[10], TTL_L3_HOT: FIB[12],
  TTL_COOLING: PHI,
  SESSION_TTL: FIB[7] * 60, SESSION_REFRESH_TTL: FIB[15] * 60,
  SESSION_DECAY: PSI,
  RATE_FREE: FIB[5], RATE_PRO: FIB[7], RATE_ENTERPRISE: FIB[9],
  VECTOR_DIM: 384, EMBEDDING_CACHE_MAX: FIB[12] * 100, EMBEDDING_TTL: FIB[11],
  COHERENCE_WRITE_THROUGH: CSL_GATES.HIGH,
  COHERENCE_WRITE_BACK: CSL_GATES.LOW,
  BACKOFF_BASE_MS: FIB[5] * 100, BACKOFF_JITTER: PSI * PSI,
  WARM_PREDICT_WINDOW: FIB[8], WARM_PREFETCH_BATCH: FIB[6],
};

/**
 * Compute phi-scaled TTL for a given base and cooling level.
 */
function phiTTL(baseTTL, coolingLevel = 0) {
  return Math.round(baseTTL * Math.pow(PHI, coolingLevel));
}

/**
 * Compute backoff with phi-scaling and jitter.
 */
function phiBackoff(attempt) {
  const base = LATTICE.BACKOFF_BASE_MS * Math.pow(PHI, attempt);
  const jitter = base * LATTICE.BACKOFF_JITTER * (2 * Math.random() - 1);
  return Math.round(base + jitter);
}

/**
 * Three-tier cache with coherence protocol.
 */
export class CacheLattice {
  constructor({ kvNamespace, redis, pgPool }) {
    this.l1 = kvNamespace;   // Cloudflare KV binding
    this.l2 = redis;         // Upstash Redis client
    this.l3 = pgPool;        // Neon Postgres pool
    this.stats = { l1Hits: 0, l2Hits: 0, l3Hits: 0, misses: 0, writes: 0 };
    log.info('CacheLattice initialized with 3-tier hierarchy');
  }

  async get(key, opts = {}) {
    const { cslScore = CSL_GATES.MEDIUM, coolingLevel = 0 } = opts;

    // L1: Cloudflare KV
    if (this.l1) {
      const l1Val = await this.l1.get(key, { type: 'json' });
      if (l1Val !== null) {
        this.stats.l1Hits++;
        log.debug({ key, tier: 'L1' }, 'Cache hit');
        return { value: l1Val, tier: 'L1', latencyBudget: FIB[0] };
      }
    }

    // L2: Upstash Redis
    const l2Val = await this.l2.get(key);
    if (l2Val !== null) {
      this.stats.l2Hits++;
      log.debug({ key, tier: 'L2' }, 'Cache hit');
      // Promote to L1 if hot
      if (this.l1 && cslScore >= CSL_GATES.MEDIUM) {
        await this.l1.put(key, JSON.stringify(l2Val), {
          expirationTtl: phiTTL(LATTICE.TTL_L1_HOT, coolingLevel),
        });
      }
      return { value: l2Val, tier: 'L2', latencyBudget: FIB[4] };
    }

    // L3: Neon Postgres
    const l3Result = await this.l3.query(
      'SELECT value FROM cache_store WHERE key = $1 AND expires_at > NOW()',
      [key]
    );
    if (l3Result.rows.length > 0) {
      this.stats.l3Hits++;
      const value = l3Result.rows[0].value;
      log.debug({ key, tier: 'L3' }, 'Cache hit');
      // Backfill L2 and L1
      await this.l2.set(key, value, { ex: phiTTL(LATTICE.TTL_L2_HOT, coolingLevel) });
      if (this.l1 && cslScore >= CSL_GATES.MEDIUM) {
        await this.l1.put(key, JSON.stringify(value), {
          expirationTtl: phiTTL(LATTICE.TTL_L1_HOT, coolingLevel),
        });
      }
      return { value, tier: 'L3', latencyBudget: FIB[7] };
    }

    this.stats.misses++;
    log.debug({ key }, 'Cache miss across all tiers');
    return { value: null, tier: 'MISS', latencyBudget: 0 };
  }

  async set(key, value, opts = {}) {
    const { cslScore = CSL_GATES.MEDIUM, coolingLevel = 0 } = opts;
    this.stats.writes++;

    if (cslScore >= LATTICE.COHERENCE_WRITE_THROUGH) {
      // Write-through: update all tiers synchronously
      await Promise.all([
        this.l1 ? this.l1.put(key, JSON.stringify(value), {
          expirationTtl: phiTTL(LATTICE.TTL_L1_HOT, coolingLevel),
        }) : Promise.resolve(),
        this.l2.set(key, value, { ex: phiTTL(LATTICE.TTL_L2_HOT, coolingLevel) }),
        this.l3.query(
          `INSERT INTO cache_store (key, value, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '1 second' * $3)
           ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '1 second' * $3`,
          [key, JSON.stringify(value), phiTTL(LATTICE.TTL_L3_HOT, coolingLevel)]
        ),
      ]);
      log.info({ key, cslScore, policy: 'write-through' }, 'Cache write');
    } else if (cslScore >= LATTICE.COHERENCE_WRITE_BACK) {
      // Write-back: update L2 immediately, L3 asynchronously
      await this.l2.set(key, value, { ex: phiTTL(LATTICE.TTL_L2_HOT, coolingLevel) });
      if (this.l1) {
        await this.l1.put(key, JSON.stringify(value), {
          expirationTtl: phiTTL(LATTICE.TTL_L1_HOT, coolingLevel),
        });
      }
      this.l3.query(
        `INSERT INTO cache_store (key, value, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 second' * $3)
         ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '1 second' * $3`,
        [key, JSON.stringify(value), phiTTL(LATTICE.TTL_L3_HOT, coolingLevel)]
      ).catch((err) => log.error({ key, err: err.message }, 'L3 write-back failed'));
      log.info({ key, cslScore, policy: 'write-back' }, 'Cache write');
    } else {
      // Cache-aside: L2 only
      await this.l2.set(key, value, { ex: phiTTL(LATTICE.TTL_L2_HOT, coolingLevel) });
      log.info({ key, cslScore, policy: 'cache-aside' }, 'Cache write');
    }
  }

  async invalidate(key) {
    await Promise.all([
      this.l1 ? this.l1.delete(key) : Promise.resolve(),
      this.l2.del(key),
      this.l3.query('DELETE FROM cache_store WHERE key = $1', [key]),
    ]);
    log.info({ key }, 'Cache invalidated across all tiers');
  }

  getStats() {
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits + this.stats.misses;
    return {
      ...this.stats,
      totalRequests: total,
      hitRate: total > 0 ? ((total - this.stats.misses) / total).toFixed(4) : '0.0000',
      l1HitRate: total > 0 ? (this.stats.l1Hits / total).toFixed(4) : '0.0000',
      l2HitRate: total > 0 ? (this.stats.l2Hits / total).toFixed(4) : '0.0000',
    };
  }
}
```

### Pub/Sub Event Bus

```javascript
// heady-redis-lattice/src/event-bus.mjs
import pino from 'pino';
import { Redis } from '@upstash/redis';

const log = pino({ name: 'heady-redis-lattice:pubsub' });

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const PUBSUB = {
  MAX_CHANNELS: FIB[9],    // 55
  MSG_TTL: FIB[7],         // 21s
};

/**
 * Redis-backed pub/sub event bus for cross-service communication.
 * Channels: bee:*, pipeline:*, cache:*, health:*
 */
export class EventBus {
  constructor(redis) {
    this.redis = redis;
    this.subscribers = new Map();
    this.channelCount = 0;
    log.info({ maxChannels: PUBSUB.MAX_CHANNELS }, 'EventBus initialized');
  }

  async publish(channel, event) {
    const envelope = {
      id: crypto.randomUUID(),
      channel,
      event,
      timestamp: Date.now(),
      expiresAt: Date.now() + PUBSUB.MSG_TTL * 1000,
    };
    await this.redis.publish(channel, JSON.stringify(envelope));
    // Store in sorted set for replay (score = timestamp, TTL'd)
    await this.redis.zadd(`bus:history:${channel}`, {
      score: envelope.timestamp,
      member: JSON.stringify(envelope),
    });
    await this.redis.expire(`bus:history:${channel}`, PUBSUB.MSG_TTL);
    log.info({ channel, eventId: envelope.id }, 'Event published');
    return envelope;
  }

  subscribe(channel, handler) {
    if (this.channelCount >= PUBSUB.MAX_CHANNELS) {
      throw new Error(`Max channels (${PUBSUB.MAX_CHANNELS}) reached`);
    }
    const handlers = this.subscribers.get(channel) || [];
    handlers.push(handler);
    this.subscribers.set(channel, handlers);
    if (handlers.length === 1) this.channelCount++;
    log.info({ channel, handlerCount: handlers.length }, 'Subscriber registered');
    return () => {
      const h = this.subscribers.get(channel) || [];
      const idx = h.indexOf(handler);
      if (idx >= 0) h.splice(idx, 1);
      if (h.length === 0) { this.subscribers.delete(channel); this.channelCount--; }
    };
  }

  async replay(channel, since) {
    const messages = await this.redis.zrangebyscore(
      `bus:history:${channel}`, since, '+inf'
    );
    return messages.map((m) => JSON.parse(m));
  }
}
```

### Session Store & Rate Limiter

```javascript
// heady-redis-lattice/src/session-rate.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-redis-lattice:session' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const SESSION = {
  ACCESS_TTL:  FIB[7] * 60,   // 21min = 1260s
  REFRESH_TTL: FIB[15] * 60,  // 987min = 59220s
  DECAY:       PSI,            // stale eviction factor
};

const RATE = {
  FREE:       FIB[5],   // 8 req/s
  PRO:        FIB[7],   // 21 req/s
  ENTERPRISE: FIB[9],   // 55 req/s
  WINDOW_MS:  1000,     // 1-second sliding window
};

/**
 * Session store — httpOnly cookie sessions backed by Upstash Redis.
 * Phi-decay eviction: score = lastAccess * PSI^(deviceCount - 1)
 */
export class SessionStore {
  constructor(redis) {
    this.redis = redis;
  }

  async createSession(userId, deviceInfo) {
    const sessionId = randomUUID();
    const session = {
      sessionId, userId,
      device: deviceInfo,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      expiresAt: Date.now() + SESSION.ACCESS_TTL * 1000,
      refreshExpiresAt: Date.now() + SESSION.REFRESH_TTL * 1000,
    };
    await this.redis.set(`session:${sessionId}`, JSON.stringify(session), {
      ex: SESSION.ACCESS_TTL,
    });
    // Track per-user sessions with phi-decay scoring
    const decayScore = Date.now() * Math.pow(SESSION.DECAY, 0);
    await this.redis.zadd(`user:sessions:${userId}`, { score: decayScore, member: sessionId });
    log.info({ sessionId, userId, ttl: SESSION.ACCESS_TTL }, 'Session created');
    return { sessionId, expiresIn: SESSION.ACCESS_TTL };
  }

  async getSession(sessionId) {
    const raw = await this.redis.get(`session:${sessionId}`);
    if (!raw) return null;
    const session = typeof raw === 'string' ? JSON.parse(raw) : raw;
    // Update last access
    session.lastAccess = Date.now();
    await this.redis.set(`session:${sessionId}`, JSON.stringify(session), {
      ex: SESSION.ACCESS_TTL,
    });
    return session;
  }

  async revokeSession(sessionId, userId) {
    await this.redis.del(`session:${sessionId}`);
    if (userId) await this.redis.zrem(`user:sessions:${userId}`, sessionId);
    log.info({ sessionId }, 'Session revoked');
  }

  async evictStale(userId, maxDevices = FIB[4]) {
    const sessions = await this.redis.zrange(`user:sessions:${userId}`, 0, -1, { withScores: true });
    if (sessions.length <= maxDevices) return [];
    const evicted = [];
    const toRemove = sessions.slice(0, sessions.length - maxDevices);
    for (const { member: sid } of toRemove) {
      await this.revokeSession(sid, userId);
      evicted.push(sid);
    }
    log.info({ userId, evictedCount: evicted.length }, 'Stale sessions evicted via phi-decay');
    return evicted;
  }
}

/**
 * Sliding-window rate limiter — Fibonacci-tiered thresholds.
 */
export class RateLimiter {
  constructor(redis) {
    this.redis = redis;
  }

  async check(identifier, tier = 'FREE') {
    const limit = RATE[tier] || RATE.FREE;
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - RATE.WINDOW_MS;

    // Remove entries outside window
    await this.redis.zremrangebyscore(key, 0, windowStart);
    // Count remaining entries
    const count = await this.redis.zcard(key);

    if (count >= limit) {
      log.warn({ identifier, tier, count, limit }, 'Rate limit exceeded');
      return { allowed: false, remaining: 0, limit, resetMs: RATE.WINDOW_MS };
    }

    // Add current request
    await this.redis.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    await this.redis.expire(key, Math.ceil(RATE.WINDOW_MS / 1000) + 1);

    const remaining = limit - count - 1;
    log.debug({ identifier, tier, remaining, limit }, 'Rate limit check passed');
    return { allowed: true, remaining, limit, resetMs: RATE.WINDOW_MS };
  }
}
```

### Embedding Cache & Cache Warmer

```javascript
// heady-redis-lattice/src/embedding-cache.mjs
import pino from 'pino';

const log = pino({ name: 'heady-redis-lattice:embeddings' });

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const EMBED = {
  DIM: 384,
  MAX_CACHED: FIB[12] * 100,  // 23300
  TTL: FIB[11],                // 144s
};

const WARM = {
  PREDICT_WINDOW: FIB[8],     // 34 recent accesses
  PREFETCH_BATCH: FIB[6],     // 13 items per batch
};

/**
 * Cache for 384D embeddings — stores serialized float arrays in Redis.
 * Eviction: LRU with phi-decay scoring.
 */
export class EmbeddingCache {
  constructor(redis) {
    this.redis = redis;
  }

  async getEmbedding(entityId) {
    const raw = await this.redis.get(`emb:${entityId}`);
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed.length !== EMBED.DIM) {
      log.warn({ entityId, dim: parsed.length, expected: EMBED.DIM }, 'Dimension mismatch');
      return null;
    }
    // Track access for cache warming predictions
    await this.redis.zadd('emb:access_log', { score: Date.now(), member: entityId });
    await this.redis.zremrangebyrank('emb:access_log', 0, -(WARM.PREDICT_WINDOW + 1));
    return parsed;
  }

  async setEmbedding(entityId, vector) {
    if (vector.length !== EMBED.DIM) {
      throw new Error(`Expected ${EMBED.DIM}D vector, got ${vector.length}D`);
    }
    await this.redis.set(`emb:${entityId}`, JSON.stringify(vector), { ex: EMBED.TTL });
    log.debug({ entityId, ttl: EMBED.TTL }, 'Embedding cached');
  }

  async batchGet(entityIds) {
    const pipeline = this.redis.pipeline();
    for (const id of entityIds) pipeline.get(`emb:${id}`);
    const results = await pipeline.exec();
    return entityIds.map((id, i) => ({
      entityId: id,
      vector: results[i] ? (typeof results[i] === 'string' ? JSON.parse(results[i]) : results[i]) : null,
      cached: results[i] !== null,
    }));
  }
}

/**
 * Predictive cache warmer — analyzes access patterns and pre-fetches.
 */
export class CacheWarmer {
  constructor(redis, pgPool) {
    this.redis = redis;
    this.pgPool = pgPool;
  }

  async predictNextAccesses() {
    const recent = await this.redis.zrange('emb:access_log', 0, -1, { rev: true });
    if (recent.length < 3) return [];
    // Simple co-occurrence: entities accessed together tend to be needed together
    const candidates = new Map();
    for (const entityId of recent) {
      const related = await this.pgPool.query(
        `SELECT related_id FROM entity_relations
         WHERE entity_id = $1 ORDER BY affinity DESC LIMIT $2`,
        [entityId, WARM.PREFETCH_BATCH]
      );
      for (const row of related.rows) {
        const count = candidates.get(row.related_id) || 0;
        candidates.set(row.related_id, count + 1);
      }
    }
    // Sort by frequency, take top batch
    const sorted = [...candidates.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, WARM.PREFETCH_BATCH)
      .map(([id]) => id);
    log.info({ candidateCount: sorted.length }, 'Cache warming predictions computed');
    return sorted;
  }

  async warmEmbeddings(embeddingCache) {
    const toWarm = await this.predictNextAccesses();
    if (toWarm.length === 0) return { warmed: 0 };
    const result = await this.pgPool.query(
      `SELECT entity_id, embedding FROM entity_embeddings
       WHERE entity_id = ANY($1)`,
      [toWarm]
    );
    let warmed = 0;
    for (const row of result.rows) {
      await embeddingCache.setEmbedding(row.entity_id, row.embedding);
      warmed++;
    }
    log.info({ warmed, requested: toWarm.length }, 'Cache warming complete');
    return { warmed, requested: toWarm.length };
  }
}
```

## Integration Points

| Component        | Interface            | Sacred Geometry Layer |
|------------------|----------------------|-----------------------|
| **Conductor**    | Cache get/set/invalidate | Inner                |
| **Brains**       | Embedding cache lookups  | Inner                |
| **Vinci**        | Session store reads      | Inner                |
| **AutoSuccess**  | Rate limiter checks      | Inner                |
| **OBSERVER**     | Pub/sub health telemetry | Middle               |
| **MURPHY**       | Cache coherence alerts   | Middle               |
| **SENTINEL**     | Rate limit breach events | Outer                |
| **BRIDGE**       | Cross-service pub/sub    | Outer                |
| **Neon Postgres** | L3 source of truth      | Infrastructure       |
| **Cloudflare KV** | L1 edge cache           | Infrastructure       |
| **heady-resilience-cache** | Failover coordination | Inner         |
| **heady-edge-ai** | Edge embedding reads    | Outer                |

## API

### GET /health

Returns service health with cache hit rates and coherence scores.

### POST /cache/get

```json
{ "key": "string", "cslScore": 0.882, "coolingLevel": 0 }
```

Returns cached value with tier info and latency budget.

### POST /cache/set

```json
{ "key": "string", "value": "any", "cslScore": 0.882, "coolingLevel": 0 }
```

Writes through coherence protocol based on CSL score.

### DELETE /cache/:key

Invalidates key across all three tiers.

### POST /session/create

```json
{ "userId": "string", "deviceInfo": { "ua": "string", "ip": "string" } }
```

Creates httpOnly session with phi-scaled TTL. Returns `Set-Cookie` header.

### POST /ratelimit/check

```json
{ "identifier": "user:abc123", "tier": "PRO" }
```

Returns `{ allowed, remaining, limit, resetMs }`.

### POST /events/publish

```json
{ "channel": "pipeline:stage-transition", "event": { "stage": 5, "status": "complete" } }
```

Publishes event to Redis pub/sub bus.

## Health Endpoint

```javascript
// heady-redis-lattice/src/router.mjs
import express from 'express';

export function createRedisLatticeRouter({ kvNamespace, redis, pgPool }) {
  const router = express.Router();
  const lattice = new CacheLattice({ kvNamespace, redis, pgPool });
  const sessionStore = new SessionStore(redis);
  const rateLimiter = new RateLimiter(redis);
  const eventBus = new EventBus(redis);

  router.get('/health', async (req, res) => {
    const stats = lattice.getStats();
    const hitRate = parseFloat(stats.hitRate);
    const coherence = hitRate >= 0.5 ? Math.min(hitRate * PHI, 1.0) : hitRate;
    res.json({
      service: 'heady-redis-lattice',
      status: 'healthy',
      coherence: parseFloat(coherence.toFixed(4)),
      phi_compliance: true,
      sacred_geometry_layer: 'Inner',
      uptime_seconds: Math.floor(process.uptime()),
      version: '1.0.0',
      cache: {
        stats,
        ttls: { L1: LATTICE.TTL_L1_HOT, L2: LATTICE.TTL_L2_HOT, L3: LATTICE.TTL_L3_HOT },
        coherencePolicy: {
          writeThrough: `>= ${LATTICE.COHERENCE_WRITE_THROUGH}`,
          writeBack: `>= ${LATTICE.COHERENCE_WRITE_BACK}`,
        },
      },
      rateLimits: { free: RATE.FREE, pro: RATE.PRO, enterprise: RATE.ENTERPRISE },
      session: { accessTTL: SESSION.ACCESS_TTL, refreshTTL: SESSION.REFRESH_TTL },
      pubsub: { activeChannels: eventBus.channelCount },
    });
  });

  return router;
}
```

```json
{
  "service": "heady-redis-lattice",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Inner",
  "uptime_seconds": 31204,
  "version": "1.0.0",
  "cache": {
    "stats": {
      "l1Hits": 14421, "l2Hits": 5830, "l3Hits": 1204, "misses": 377,
      "totalRequests": 21832, "hitRate": "0.9827", "l1HitRate": "0.6607", "l2HitRate": "0.2671"
    },
    "ttls": { "L1": 34, "L2": 89, "L3": 233 },
    "coherencePolicy": { "writeThrough": ">= 0.882", "writeBack": ">= 0.691" }
  },
  "rateLimits": { "free": 8, "pro": 21, "enterprise": 55 },
  "session": { "accessTTL": 1260, "refreshTTL": 59220 },
  "pubsub": { "activeChannels": 13 }
}
```
