const pino = require('pino');
const logger = pino();
/**
 * ∞ Heady™ Embedding Provider — Multi-Backend 384D Embedding Generation
 * Part of Heady™Systems™ Sovereign AI Platform v4.0.0
 * © 2026 Heady™Systems Inc. — Proprietary
 *
 * @module embedding-provider
 * @description Provides a unified embedding interface with multiple backends:
 *   Cloudflare Workers AI, OpenAI Ada-002, and a local deterministic fallback.
 *   All backends are normalised to produce 384-dimensional Float32Array output.
 *   Includes an in-memory LRU cache to avoid redundant embedding calls.
 *   Backends are tried in order (primary → fallback) with automatic retry.
 */

'use strict';

const {
  normalize,
  fromArray,
  embed: localEmbed,
  DIMS,
} = require('./vector-space-ops');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cache capacity (number of unique texts). */
const DEFAULT_CACHE_SIZE = 2584; // fib(18) = 2584

/** Default retry attempts per backend. */
const DEFAULT_RETRIES = 2;

/** Delay between retries (ms). */
const RETRY_DELAY_MS = 250;

// ---------------------------------------------------------------------------
// Backend identifiers
// ---------------------------------------------------------------------------

/** @enum {string} */
const Backend = {
  CLOUDFLARE: 'cloudflare',
  OPENAI: 'openai',
  LOCAL: 'local',
};

// ---------------------------------------------------------------------------
// LRU Cache
// ---------------------------------------------------------------------------

/**
 * Simple LRU cache backed by a Map (insertion order eviction).
 * @template V
 */
class LRUCache {
  /**
   * @param {number} capacity - Maximum number of entries.
   */
  constructor(capacity) {
    this.capacity = capacity;
    /** @type {Map<string, V>} */
    this.cache = new Map();
  }

  /**
   * @param {string} key
   * @returns {V|undefined}
   */
  get(key) {
    if (!this.cache.has(key)) return undefined;
    // Refresh: delete + re-insert to move to end.
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  /**
   * @param {string} key
   * @param {V} value
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest (first) entry.
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }

  /** @returns {number} */
  get size() {
    return this.cache.size;
  }

  clear() {
    this.cache.clear();
  }

  /**
   * Check whether a key is cached.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }
}

// ---------------------------------------------------------------------------
// Backend implementations
// ---------------------------------------------------------------------------

/**
 * Embed via Cloudflare Workers AI (bge-small-en-v1.5 → 384D).
 * Requires CF_AI_GATEWAY env vars or direct API access.
 *
 * @param {string[]} texts - Batch of texts to embed.
 * @param {Object} config - Backend config.
 * @returns {Promise<Float32Array[]>}
 */
async function embedViaCloudflare(texts, config) {
  const { accountId, apiToken, model = '@cf/baai/bge-small-en-v1.5' } = config;
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare backend: missing accountId or apiToken');
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texts }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudflare AI error ${response.status}: ${body}`);
  }
  const { result } = await response.json();
  // result.data is an array of number[] arrays
  return (result.data || result).map(arr => {
    const v = normalize(fromArray(arr));
    if (v.length !== DIMS) {
      throw new Error(`Cloudflare backend returned ${v.length}D vector, expected ${DIMS}`);
    }
    return v;
  });
}

/**
 * Embed via OpenAI text-embedding-3-small (1536D → truncated/padded to 384D).
 * Alternatively configured to use text-embedding-ada-002 (1536D).
 *
 * @param {string[]} texts - Batch of texts to embed.
 * @param {Object} config - Backend config.
 * @returns {Promise<Float32Array[]>}
 */
async function embedViaOpenAI(texts, config) {
  const { apiKey, model = 'text-embedding-3-small', dimensions } = config;
  if (!apiKey) {
    throw new Error('OpenAI backend: missing apiKey');
  }
  const body = {
    input: texts,
    model,
    // text-embedding-3-small supports dimensions parameter for truncation.
    ...(dimensions ? { dimensions } : {}),
  };
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI embedding error ${response.status}: ${err.error?.message || 'unknown'}`);
  }
  const { data } = await response.json();
  return data.map(item => {
    let vec = fromArray(item.embedding);
    // Truncate or pad to DIMS.
    if (vec.length !== DIMS) {
      const adjusted = new Float32Array(DIMS);
      adjusted.set(vec.subarray(0, Math.min(vec.length, DIMS)));
      vec = adjusted;
    }
    return normalize(vec);
  });
}

/**
 * Local deterministic fallback embedding.
 * Uses FNV-1a + LCG as implemented in vector-space-ops.js.
 *
 * @param {string[]} texts - Texts to embed.
 * @returns {Promise<Float32Array[]>}
 */
async function embedViaLocal(texts) {
  return texts.map(t => localEmbed(t));
}

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------

/**
 * Retry an async function up to `retries` times with fixed delay.
 *
 * @param {Function} fn - Async function to call.
 * @param {number} retries - Max attempts.
 * @param {number} delayMs - Delay between attempts.
 * @returns {Promise<*>}
 */
async function withRetry(fn, retries, delayMs) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// EmbeddingProvider
// ---------------------------------------------------------------------------

/**
 * EmbeddingProvider routes embedding requests through a priority chain of
 * backends, caching results in an LRU cache.
 */
class EmbeddingProvider {
  /**
   * @param {Object} [options]
   * @param {Object} [options.cloudflare] - Cloudflare config { accountId, apiToken, model }.
   * @param {Object} [options.openai] - OpenAI config { apiKey, model, dimensions }.
   * @param {number} [options.cacheSize=2048] - LRU cache capacity.
   * @param {number} [options.retries=2] - Retry attempts per backend.
   * @param {number} [options.retryDelayMs=250] - Delay between retries (ms).
   * @param {string[]} [options.backendOrder] - Ordered backend names to try.
   * @param {boolean} [options.alwaysLocal=false] - Skip cloud backends entirely.
   */
  constructor(options = {}) {
    this.config = {
      cloudflare: options.cloudflare || {},
      openai: options.openai || {},
    };
    this.cacheSize = options.cacheSize || DEFAULT_CACHE_SIZE;
    this.retries = options.retries !== undefined ? options.retries : DEFAULT_RETRIES;
    this.retryDelayMs = options.retryDelayMs || RETRY_DELAY_MS;
    this.alwaysLocal = options.alwaysLocal || false;

    // Backend priority order.
    this.backendOrder = options.backendOrder || [
      Backend.CLOUDFLARE,
      Backend.OPENAI,
      Backend.LOCAL,
    ];

    /** @type {LRUCache<Float32Array>} */
    this.cache = new LRUCache(this.cacheSize);

    this._stats = {
      cacheHits: 0,
      cacheMisses: 0,
      backendCalls: { [Backend.CLOUDFLARE]: 0, [Backend.OPENAI]: 0, [Backend.LOCAL]: 0 },
      failures: 0,
      totalEmbedded: 0,
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Generate a 384D embedding for a single text string.
   * Results are cached by text content.
   *
   * @param {string} text - Input text.
   * @returns {Promise<Float32Array>} 384D normalised embedding.
   */
  async embedOne(text) {
    const cacheKey = this._cacheKey(text);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this._stats.cacheHits += 1;
      return cached;
    }
    this._stats.cacheMisses += 1;

    const [result] = await this._embedBatch([text]);
    this.cache.set(cacheKey, result);
    this._stats.totalEmbedded += 1;
    return result;
  }

  /**
   * Generate 384D embeddings for a batch of texts.
   * Splits into cached and uncached; only uncached texts hit the backend.
   *
   * @param {string[]} texts - Array of input texts.
   * @returns {Promise<Float32Array[]>} Array of embeddings in input order.
   */
  async embedBatch(texts) {
    const results = new Array(texts.length);
    const missIndices = [];
    const missTexts = [];

    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this._cacheKey(texts[i]);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        results[i] = cached;
        this._stats.cacheHits += 1;
      } else {
        missIndices.push(i);
        missTexts.push(texts[i]);
        this._stats.cacheMisses += 1;
      }
    }

    if (missTexts.length > 0) {
      const embeddings = await this._embedBatch(missTexts);
      for (let j = 0; j < missTexts.length; j++) {
        const i = missIndices[j];
        results[i] = embeddings[j];
        this.cache.set(this._cacheKey(texts[i]), embeddings[j]);
        this._stats.totalEmbedded += 1;
      }
    }

    return results;
  }

  /**
   * Pre-warm the cache with a list of (text, vector) pairs.
   * Useful when restoring from persisted embeddings.
   *
   * @param {Array<{ text: string, vector: Float32Array|number[] }>} pairs
   */
  prewarm(pairs) {
    for (const { text, vector } of pairs) {
      const v = vector instanceof Float32Array ? vector : fromArray(vector);
      this.cache.set(this._cacheKey(text), normalize(v));
    }
  }

  /**
   * Clear the embedding cache.
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Return provider statistics.
   *
   * @returns {Object}
   */
  stats() {
    return {
      ...this._stats,
      cacheSize: this.cache.size,
      cacheCapacity: this.cacheSize,
      backendOrder: this.backendOrder,
    };
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  /**
   * Route a batch of texts through the backend priority chain.
   * @private
   * @param {string[]} texts
   * @returns {Promise<Float32Array[]>}
   */
  async _embedBatch(texts) {
    if (this.alwaysLocal) {
      this._stats.backendCalls[Backend.LOCAL] += 1;
      return embedViaLocal(texts);
    }

    for (const backend of this.backendOrder) {
      try {
        let result;
        if (backend === Backend.CLOUDFLARE) {
          result = await withRetry(
            () => embedViaCloudflare(texts, this.config.cloudflare),
            this.retries,
            this.retryDelayMs,
          );
        } else if (backend === Backend.OPENAI) {
          result = await withRetry(
            () => embedViaOpenAI(texts, this.config.openai),
            this.retries,
            this.retryDelayMs,
          );
        } else {
          result = await embedViaLocal(texts);
        }
        this._stats.backendCalls[backend] = (this._stats.backendCalls[backend] || 0) + 1;
        return result;
      } catch (err) {
        this._stats.failures += 1;
        // Log and try next backend.
        if (process.env.NODE_ENV !== 'test') {
          logger.warn(`[EmbeddingProvider] Backend "${backend}" failed: ${err.message}. Falling back.`);
        }
      }
    }

    // All backends exhausted — final local fallback (always works).
    this._stats.backendCalls[Backend.LOCAL] = (this._stats.backendCalls[Backend.LOCAL] || 0) + 1;
    return embedViaLocal(texts);
  }

  /**
   * Generate a cache key for a text string.
   * @private
   * @param {string} text
   * @returns {string}
   */
  _cacheKey(text) {
    // Use first 128 chars + length to keep keys short but distinct.
    return `${text.length}:${text.slice(0, 128)}`;
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

/** @type {EmbeddingProvider|null} */
let _defaultProvider = null;

/**
 * Get or create the default singleton EmbeddingProvider.
 * Reads CF_ACCOUNT_ID, CF_AI_TOKEN, OPENAI_API_KEY from environment.
 *
 * @returns {EmbeddingProvider}
 */
function getDefaultProvider() {
  if (!_defaultProvider) {
    _defaultProvider = new EmbeddingProvider({
      cloudflare: {
        accountId: process.env.CF_ACCOUNT_ID,
        apiToken: process.env.CF_AI_TOKEN,
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        dimensions: DIMS,
      },
    });
  }
  return _defaultProvider;
}


module.exports = { EmbeddingProvider, LRUCache, Backend, getDefaultProvider };
