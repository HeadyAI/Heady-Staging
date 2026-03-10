/**
 * cloudflare-kv-cache.js — Cloudflare KV Edge Cache Layer
 *
 * Sub-10ms reads for frequently accessed data at the edge.
 * φ-scaled TTLs, Fibonacci-sized batch operations, CSL-gated
 * cache-through decisions. Works with Cloudflare Workers KV.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold, fibSequence } from '../shared/phi-math.js';
import { createHash } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),  // ≈ 0.927
  HIGH:     phiThreshold(3),  // ≈ 0.882
  MEDIUM:   phiThreshold(2),  // ≈ 0.809
  LOW:      phiThreshold(1),  // ≈ 0.691
  MINIMUM:  phiThreshold(0),  // ≈ 0.500
};

// TTLs in seconds (Fibonacci-scaled)
const TTL = {
  HOT:       89,               // fib(11) — frequently changing data
  WARM:      233,              // fib(13) — moderately stable
  COLD:      987,              // fib(16) — rarely changing
  STATIC:    1597,             // fib(17) — essentially immutable
  SESSION:   34,               // fib(9) — session-scoped
};

const MAX_KEY_LENGTH     = 512;
const MAX_VALUE_SIZE     = 25 * 1024 * 1024;  // 25MB KV limit
const BATCH_SIZE         = 21;                 // fib(8) per bulk op
const LOCAL_CACHE_SIZE   = 377;                // fib(14) in-memory entries
const NAMESPACE_PREFIX   = 'heady';

// ── CSL Gate ────────────────────────────────────────────
function cslGate(value, score, threshold, temperature = PSI * PSI * PSI) {
  const sigmoid = 1 / (1 + Math.exp(-(score - threshold) / temperature));
  return value * sigmoid;
}

// ── Local In-Memory Cache (L1) ──────────────────────────
const localCache = new Map();

function localGet(key) {
  const entry = localCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    localCache.delete(key);
    return null;
  }
  // LRU: move to end
  localCache.delete(key);
  localCache.set(key, entry);
  return entry.value;
}

function localSet(key, value, ttlMs) {
  if (localCache.size >= LOCAL_CACHE_SIZE) {
    const oldest = localCache.keys().next().value;
    localCache.delete(oldest);
  }
  localCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function localDelete(key) {
  localCache.delete(key);
}

// ── Key Management ──────────────────────────────────────
function buildKey(namespace, key) {
  const ns = namespace || 'default';
  const full = `${NAMESPACE_PREFIX}:${ns}:${key}`;
  if (full.length > MAX_KEY_LENGTH) {
    const hash = createHash('sha256').update(full).digest('hex').slice(0, 34); // fib(9) chars
    return `${NAMESPACE_PREFIX}:${ns}:h:${hash}`;
  }
  return full;
}

// ── KV Adapter Interface ────────────────────────────────
/**
 * Create a KV cache instance.
 * @param {object} kvBinding — Cloudflare KV namespace binding (from env)
 * @param {object} options — Configuration overrides
 */
export function createKVCache(kvBinding, options = {}) {
  const defaultTTL = options.defaultTTL || TTL.WARM;
  const namespace = options.namespace || 'default';
  const enableLocalCache = options.localCache !== false;
  const metrics = { hits: 0, misses: 0, localHits: 0, writes: 0, deletes: 0 };

  return {
    /**
     * Get a value from KV. Checks L1 local cache first.
     */
    async get(key, opts = {}) {
      const fullKey = buildKey(namespace, key);
      
      // L1: local cache check
      if (enableLocalCache) {
        const local = localGet(fullKey);
        if (local !== null) {
          metrics.localHits++;
          metrics.hits++;
          return opts.type === 'json' ? local : local;
        }
      }

      // L2: KV store
      if (!kvBinding) return null;
      try {
        const type = opts.type || 'json';
        const value = await kvBinding.get(fullKey, { type });
        
        if (value !== null) {
          metrics.hits++;
          if (enableLocalCache) {
            localSet(fullKey, value, (opts.localTTL || TTL.SESSION) * 1000);
          }
          return value;
        }
        
        metrics.misses++;
        return null;
      } catch (err) {
        metrics.misses++;
        return null;
      }
    },

    /**
     * Put a value into KV with φ-scaled TTL.
     */
    async put(key, value, opts = {}) {
      const fullKey = buildKey(namespace, key);
      const ttl = opts.expirationTtl || defaultTTL;
      const metadata = opts.metadata || {};
      
      // Validate size
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (serialized.length > MAX_VALUE_SIZE) {
        throw new Error(`Value exceeds KV size limit (${MAX_VALUE_SIZE} bytes)`);
      }

      // L1: update local
      if (enableLocalCache) {
        localSet(fullKey, value, Math.min(ttl, TTL.SESSION) * 1000);
      }

      // L2: write to KV
      if (!kvBinding) return;
      metrics.writes++;
      await kvBinding.put(fullKey, serialized, {
        expirationTtl: ttl,
        metadata: {
          ...metadata,
          updatedAt: Date.now(),
          namespace,
        },
      });
    },

    /**
     * Delete a key from both L1 and L2.
     */
    async delete(key) {
      const fullKey = buildKey(namespace, key);
      localDelete(fullKey);
      if (kvBinding) {
        metrics.deletes++;
        await kvBinding.delete(fullKey);
      }
    },

    /**
     * Batch get multiple keys.
     */
    async getMulti(keys, opts = {}) {
      const results = {};
      // Process in Fibonacci-sized batches
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (k) => {
          results[k] = await this.get(k, opts);
        });
        await Promise.all(promises);
      }
      return results;
    },

    /**
     * Cache-through pattern: get from cache, or fetch & store.
     * Uses CSL gate to decide if result is cache-worthy.
     */
    async getOrFetch(key, fetchFn, opts = {}) {
      const cached = await this.get(key, opts);
      if (cached !== null) return cached;

      const fresh = await fetchFn();
      if (fresh === null || fresh === undefined) return null;

      // CSL gate: only cache if confidence score is above threshold
      const confidence = opts.confidence ?? 1.0;
      const shouldCache = cslGate(1, confidence, CSL_THRESHOLDS.LOW) > CSL_THRESHOLDS.MINIMUM;
      
      if (shouldCache) {
        await this.put(key, fresh, opts);
      }
      return fresh;
    },

    /**
     * List keys with optional prefix filter.
     */
    async list(opts = {}) {
      if (!kvBinding) return { keys: [], complete: true };
      const prefix = opts.prefix ? buildKey(namespace, opts.prefix) : buildKey(namespace, '');
      const result = await kvBinding.list({ prefix, limit: opts.limit || 89 }); // fib(11)
      return {
        keys: result.keys.map(k => ({
          name: k.name.replace(`${NAMESPACE_PREFIX}:${namespace}:`, ''),
          expiration: k.expiration,
          metadata: k.metadata,
        })),
        complete: result.list_complete,
        cursor: result.cursor,
      };
    },

    /**
     * Get cache statistics.
     */
    getMetrics() {
      const total = metrics.hits + metrics.misses;
      return {
        ...metrics,
        hitRate: total > 0 ? metrics.hits / total : 0,
        localHitRate: metrics.hits > 0 ? metrics.localHits / metrics.hits : 0,
        localCacheSize: localCache.size,
        maxLocalCache: LOCAL_CACHE_SIZE,
      };
    },

    /**
     * Flush local cache.
     */
    flushLocal() {
      localCache.clear();
    },

    /** Expose TTL constants */
    TTL,
  };
}

export { TTL, CSL_THRESHOLDS, buildKey, LOCAL_CACHE_SIZE };
export default { createKVCache, TTL, CSL_THRESHOLDS };
