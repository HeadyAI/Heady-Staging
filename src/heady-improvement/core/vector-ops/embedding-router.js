/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Embedding Router — Multi-provider embedding generation with
 * intelligent selection, circuit breaker failover, LRU caching,
 * and cost optimization.
 *
 * Providers: Nomic, Jina, Cohere, Voyage, Vertex AI, Ollama (local)
 * Supports MRL truncation for dimensionality reduction.
 *
 * Founder: Eric Haywood
 * @module core/vector-ops/embedding-router
 */

import { EventEmitter } from 'events';
import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,
  phiBackoff,
  phiFusionWeights,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';

const logger = createLogger('embedding-router');

const PSI2 = PSI * PSI;

/** Provider definitions */
const PROVIDERS = Object.freeze({
  nomic: {
    name: 'Nomic',
    model: 'nomic-embed-text-v1.5',
    dimensions: 384,
    maxBatchSize: fib(12),  // 144
    costPer1kTokens: 0.00001,
    supportsMRL: true,
  },
  jina: {
    name: 'Jina',
    model: 'jina-embeddings-v3',
    dimensions: 384,
    maxBatchSize: fib(11),  // 89
    costPer1kTokens: 0.00002,
    supportsMRL: true,
  },
  cohere: {
    name: 'Cohere',
    model: 'embed-english-v3.0',
    dimensions: 384,
    maxBatchSize: fib(11),  // 89
    costPer1kTokens: 0.0001,
    supportsMRL: false,
  },
  voyage: {
    name: 'Voyage',
    model: 'voyage-3',
    dimensions: 384,
    maxBatchSize: fib(12),  // 144
    costPer1kTokens: 0.00006,
    supportsMRL: false,
  },
  vertex: {
    name: 'Vertex AI',
    model: 'text-embedding-004',
    dimensions: 384,
    maxBatchSize: fib(10),  // 55
    costPer1kTokens: 0.000025,
    supportsMRL: false,
  },
  ollama: {
    name: 'Ollama (Local)',
    model: 'nomic-embed-text',
    dimensions: 384,
    maxBatchSize: fib(8),   // 21
    costPer1kTokens: 0,
    supportsMRL: true,
  },
});

/** LRU Cache with phi-scaled capacity */
class EmbeddingCache {
  constructor(capacity = fib(16)) {
    this._capacity = capacity;
    this._cache = new Map();
    this._hits = 0;
    this._misses = 0;
  }

  get(key) {
    if (this._cache.has(key)) {
      // Move to end (most recent)
      const value = this._cache.get(key);
      this._cache.delete(key);
      this._cache.set(key, value);
      this._hits++;
      return value;
    }
    this._misses++;
    return null;
  }

  set(key, value) {
    if (this._cache.has(key)) {
      this._cache.delete(key);
    } else if (this._cache.size >= this._capacity) {
      // Evict oldest
      const oldest = this._cache.keys().next().value;
      this._cache.delete(oldest);
    }
    this._cache.set(key, value);
  }

  stats() {
    const total = this._hits + this._misses;
    return {
      size: this._cache.size,
      capacity: this._capacity,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? this._hits / total : 0,
    };
  }

  clear() {
    this._cache.clear();
    this._hits = 0;
    this._misses = 0;
  }
}

/** Circuit breaker per provider */
class ProviderCircuitBreaker {
  constructor(providerId) {
    this.providerId = providerId;
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = 0;
    this.probeAttempt = 0;
    this.failureThreshold = fib(5);     // 5
    this.successThreshold = fib(3);     // 2
    this.halfOpenBaseMs = fib(8) * 1000; // 21s
  }

  recordSuccess() {
    this.failures = 0;
    if (this.state === 'half_open') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'closed';
        this.successes = 0;
        this.probeAttempt = 0;
      }
    }
  }

  recordFailure() {
    this.successes = 0;
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.failureThreshold || this.state === 'half_open') {
      this.state = 'open';
      this.probeAttempt++;
    }
  }

  canAttempt() {
    if (this.state === 'closed' || this.state === 'half_open') return true;
    // Check if enough time has passed for probe
    const elapsed = Date.now() - this.lastFailure;
    const probeDelay = phiBackoff(this.probeAttempt, this.halfOpenBaseMs);
    if (elapsed >= probeDelay) {
      this.state = 'half_open';
      return true;
    }
    return false;
  }
}

class EmbeddingRouter extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {object} [options.providers] - Provider API clients { providerId: async (texts) => vectors }
   * @param {string} [options.defaultProvider] - Default provider
   * @param {number} [options.targetDimensions] - Output dimensions (for MRL truncation)
   */
  constructor(options = {}) {
    super();
    this._providerClients = options.providers || {};
    this._defaultProvider = options.defaultProvider || 'nomic';
    this._targetDimensions = options.targetDimensions || 384;
    this._cache = new EmbeddingCache(fib(16));
    this._circuitBreakers = new Map();
    this._usageStats = new Map();

    // Initialize circuit breakers for all providers
    for (const providerId of Object.keys(PROVIDERS)) {
      this._circuitBreakers.set(providerId, new ProviderCircuitBreaker(providerId));
      this._usageStats.set(providerId, { calls: 0, tokens: 0, latencySum: 0, errors: 0 });
    }
  }

  /**
   * Generate embeddings for text(s) with automatic provider selection.
   * @param {string|string[]} texts
   * @param {object} [options]
   * @param {string} [options.provider] - Force specific provider
   * @param {boolean} [options.skipCache] - Skip LRU cache
   * @returns {Promise<Float64Array[]>}
   */
  async embed(texts, options = {}) {
    const textArray = Array.isArray(texts) ? texts : [texts];
    const provider = options.provider || this._selectProvider(textArray.length);

    // Check cache
    if (!options.skipCache) {
      const cached = [];
      const uncached = [];
      const uncachedIndices = [];

      for (let i = 0; i < textArray.length; i++) {
        const key = `${provider}:${textArray[i]}`;
        const hit = this._cache.get(key);
        if (hit) {
          cached[i] = hit;
        } else {
          uncached.push(textArray[i]);
          uncachedIndices.push(i);
        }
      }

      if (uncached.length === 0) {
        return cached;
      }

      // Embed uncached texts
      const newEmbeddings = await this._callProvider(provider, uncached);

      // Merge results
      for (let j = 0; j < uncachedIndices.length; j++) {
        const idx = uncachedIndices[j];
        cached[idx] = newEmbeddings[j];
        this._cache.set(`${provider}:${textArray[idx]}`, newEmbeddings[j]);
      }

      return cached;
    }

    return this._callProvider(provider, textArray);
  }

  /**
   * Select best provider using CSL-gated scoring.
   * @param {number} batchSize
   * @returns {string} Provider ID
   * @private
   */
  _selectProvider(batchSize) {
    const candidates = [];

    for (const [id, config] of Object.entries(PROVIDERS)) {
      const cb = this._circuitBreakers.get(id);
      if (!cb.canAttempt()) continue;
      if (!this._providerClients[id] && id !== this._defaultProvider) continue;

      const stats = this._usageStats.get(id);

      // Score factors
      const costFactor = 1.0 - (config.costPer1kTokens * 10000); // Normalize cost
      const capacityFactor = batchSize <= config.maxBatchSize ? 1.0 : PSI2;
      const reliabilityFactor = stats.calls > 0
        ? 1.0 - (stats.errors / stats.calls)
        : 1.0;
      const latencyFactor = stats.calls > 0
        ? 1.0 / (1.0 + (stats.latencySum / stats.calls) / 1000)
        : PSI;

      const [wCost, wCap, wRel, wLat] = phiFusionWeights(4);
      const score = costFactor * wCost +
                    capacityFactor * wCap +
                    reliabilityFactor * wRel +
                    latencyFactor * wLat;

      candidates.push({ id, score });
    }

    if (candidates.length === 0) return this._defaultProvider;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].id;
  }

  /**
   * Call a provider's embedding API.
   * @param {string} providerId
   * @param {string[]} texts
   * @returns {Promise<Float64Array[]>}
   * @private
   */
  async _callProvider(providerId, texts) {
    const cb = this._circuitBreakers.get(providerId);
    const stats = this._usageStats.get(providerId);
    const startMs = Date.now();

    try {
      let embeddings;

      if (this._providerClients[providerId]) {
        embeddings = await this._providerClients[providerId](texts);
      } else {
        // Default: generate deterministic pseudo-embeddings
        embeddings = texts.map(text => generateDeterministicEmbedding(text));
      }

      const latencyMs = Date.now() - startMs;
      cb.recordSuccess();
      stats.calls++;
      stats.tokens += texts.reduce((s, t) => s + Math.ceil(t.length / 4), 0);
      stats.latencySum += latencyMs;

      // Apply MRL truncation if needed
      if (this._targetDimensions < 384) {
        embeddings = embeddings.map(e => truncateMRL(e, this._targetDimensions));
      }

      this.emit('embed:success', { providerId, count: texts.length, latencyMs });
      return embeddings;
    } catch (err) {
      const latencyMs = Date.now() - startMs;
      cb.recordFailure();
      stats.errors++;

      logger.error('Embedding provider failed', { providerId, error: err.message });
      this.emit('embed:failure', { providerId, error: err.message });

      // Fallback to next provider
      if (cb.state === 'open') {
        const fallback = this._selectProvider(texts.length);
        if (fallback !== providerId) {
          logger.info('Falling back to alternate provider', { from: providerId, to: fallback });
          return this._callProvider(fallback, texts);
        }
      }

      throw err;
    }
  }

  /**
   * Get provider health and usage stats.
   * @returns {object}
   */
  getStats() {
    const providers = {};
    for (const [id, config] of Object.entries(PROVIDERS)) {
      const cb = this._circuitBreakers.get(id);
      const stats = this._usageStats.get(id);
      providers[id] = {
        name: config.name,
        model: config.model,
        circuitBreaker: cb.state,
        calls: stats.calls,
        errors: stats.errors,
        avgLatencyMs: stats.calls > 0 ? Math.round(stats.latencySum / stats.calls) : 0,
      };
    }

    return {
      providers,
      cache: this._cache.stats(),
      defaultProvider: this._defaultProvider,
      targetDimensions: this._targetDimensions,
    };
  }
}

/**
 * Generate a deterministic 384D embedding from text.
 * Replaceable with actual model calls in production.
 * @param {string} text
 * @param {number} [dim=384]
 * @returns {Float64Array}
 */
function generateDeterministicEmbedding(text, dim = 384) {
  const v = new Float64Array(dim);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < dim; i++) {
    hash = ((hash << 5) + hash + i) >>> 0;
    v[i] = ((hash % 2000) - 1000) / 1000;
  }
  // Normalize
  let mag = 0;
  for (let i = 0; i < dim; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag);
  if (mag > 0) for (let i = 0; i < dim; i++) v[i] /= mag;
  return v;
}

/**
 * MRL truncation — reduce dimensionality by keeping first N dimensions.
 * @param {Float64Array} embedding
 * @param {number} targetDim
 * @returns {Float64Array}
 */
function truncateMRL(embedding, targetDim) {
  const out = new Float64Array(targetDim);
  for (let i = 0; i < targetDim; i++) out[i] = embedding[i];
  // Re-normalize after truncation
  let mag = 0;
  for (let i = 0; i < targetDim; i++) mag += out[i] * out[i];
  mag = Math.sqrt(mag);
  if (mag > 0) for (let i = 0; i < targetDim; i++) out[i] /= mag;
  return out;
}

export {
  EmbeddingRouter,
  EmbeddingCache,
  PROVIDERS,
  generateDeterministicEmbedding,
  truncateMRL,
};
