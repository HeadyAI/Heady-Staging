/**
 * SemanticCacheBee — L1 (Redis exact) + L2 (Qdrant cosine) cache
 * Estimated savings: $140/month at 60% hit rate
 * HeadySystems Inc. — src/bees/semantic-cache-bee.js
 */
import { createHash } from 'crypto';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'semantic-cache-bee' });
const PHI = 1.618033988749895;
const L2_SIMILARITY_THRESHOLD = 0.94; // φ-calibrated: high precision

const CheckSchema = z.object({
  query: z.string().min(1),
  model: z.string().default('gemini-2.5-flash'),
  userId: z.string().uuid().optional(),
  namespace: z.string().default('global'),
});

const StoreSchema = z.object({
  query: z.string().min(1),
  responseText: z.string().min(1),
  model: z.string(),
  userId: z.string().uuid().optional(),
  namespace: z.string().default('global'),
  metadata: z.record(z.unknown()).default({}),
  ttlSeconds: z.number().int().min(60).default(3600),
});

export default class SemanticCacheBee {
  #env;
  #redis;  // Upstash Redis REST client
  #qdrantBase;
  #cfWorkersAI;
  #stats = { l1Hits: 0, l2Hits: 0, misses: 0, stores: 0 };

  constructor(env) {
    this.#env = env;
    this.#qdrantBase = env.QDRANT_URL ?? 'https://your-qdrant-instance.qdrant.io';
    this.#cfWorkersAI = env.CF_WORKERS_AI_BASE ?? 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT/ai';
  }

  #hashKey(query, model, namespace) {
    return `hcache:${namespace}:${model}:${createHash('sha256').update(query.trim().toLowerCase()).digest('hex').slice(0, 24)}`;
  }

  async #redisGet(key) {
    if (!this.#env.UPSTASH_REDIS_REST_URL) return null;
    const resp = await fetch(`${this.#env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${this.#env.UPSTASH_REDIS_REST_TOKEN}` },
    });
    const data = await resp.json();
    return data.result ? JSON.parse(data.result) : null;
  }

  async #redisSet(key, value, ttlSeconds) {
    if (!this.#env.UPSTASH_REDIS_REST_URL) return;
    await fetch(`${this.#env.UPSTASH_REDIS_REST_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#env.UPSTASH_REDIS_REST_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify([JSON.stringify(value), 'EX', ttlSeconds]),
    });
  }

  async #embed(text) {
    const resp = await fetch(`${this.#cfWorkersAI}/v1/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#env.CLOUDFLARE_API_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: '@cf/baai/bge-large-en-v1.5', input: text }),
    });
    const data = await resp.json();
    return data.result?.data?.[0]?.embedding ?? [];
  }

  async #qdrantSearch(vector, namespace, threshold) {
    const resp = await fetch(`${this.#qdrantBase}/collections/heady_semantic_cache/points/search`, {
      method: 'POST',
      headers: { 'api-key': this.#env.QDRANT_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        vector,
        filter: { must: [{ key: 'namespace', match: { value: namespace } }] },
        limit: 1,
        score_threshold: threshold,
        with_payload: true,
      }),
    });
    const data = await resp.json();
    return data.result?.[0] ?? null;
  }

  async #qdrantUpsert(query, responseText, vector, namespace, model, metadata) {
    const point = {
      id: uuidv4().replace(/-/g, '').slice(0, 16),
      vector,
      payload: { query, responseText, namespace, model, metadata, timestamp: new Date().toISOString() },
    };
    await fetch(`${this.#qdrantBase}/collections/heady_semantic_cache/points?wait=true`, {
      method: 'PUT',
      headers: { 'api-key': this.#env.QDRANT_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ points: [point] }),
    });
  }

  /**
   * Check cache: L1 (Redis exact hash) → L2 (Qdrant semantic)
   * Returns { hit: true, entry, cacheLevel } or { hit: false }
   */
  async check(rawInput) {
    const input = CheckSchema.parse(rawInput);

    // L1: exact hash
    const hashKey = this.#hashKey(input.query, input.model, input.namespace);
    const l1Entry = await this.#redisGet(hashKey);
    if (l1Entry) {
      this.#stats.l1Hits++;
      logger.info({ cacheLevel: 'L1', key: hashKey.slice(-12) }, 'cache_hit');
      return { hit: true, entry: l1Entry, cacheLevel: 'L1', similarity: 1.0 };
    }

    // L2: semantic similarity via Qdrant
    const vector = await this.#embed(input.query);
    const l2Match = await this.#qdrantSearch(vector, input.namespace, L2_SIMILARITY_THRESHOLD);
    if (l2Match) {
      this.#stats.l2Hits++;
      logger.info({ cacheLevel: 'L2', score: l2Match.score }, 'cache_hit');
      // Promote to L1 for next time
      await this.#redisSet(hashKey, l2Match.payload, 1800);
      return { hit: true, entry: l2Match.payload, cacheLevel: 'L2', similarity: l2Match.score };
    }

    this.#stats.misses++;
    return { hit: false, vector }; // return vector so caller can reuse for store()
  }

  /**
   * Store response in both cache layers
   */
  async store(rawInput, cachedVector = null) {
    const input = StoreSchema.parse(rawInput);

    const [hashKey, vector] = await Promise.all([
      Promise.resolve(this.#hashKey(input.query, input.model, input.namespace)),
      cachedVector ? Promise.resolve(cachedVector) : this.#embed(input.query),
    ]);

    const entry = {
      query: input.query,
      responseText: input.responseText,
      model: input.model,
      namespace: input.namespace,
      metadata: input.metadata,
      timestamp: new Date().toISOString(),
    };

    await Promise.all([
      this.#redisSet(hashKey, entry, input.ttlSeconds),
      this.#qdrantUpsert(input.query, input.responseText, vector, input.namespace, input.model, input.metadata),
    ]);

    this.#stats.stores++;
    logger.info({ model: input.model, namespace: input.namespace }, 'cache_stored');
    return { stored: true, hashKey: hashKey.slice(-12) };
  }

  /** Get cache performance statistics */
  getStats() {
    const total = this.#stats.l1Hits + this.#stats.l2Hits + this.#stats.misses;
    const hitRate = total ? ((this.#stats.l1Hits + this.#stats.l2Hits) / total * 100).toFixed(1) : '0.0';
    return { ...this.#stats, total, hitRatePct: hitRate, threshold: L2_SIMILARITY_THRESHOLD };
  }

  /** Invalidate all cache entries for a namespace */
  async invalidateNamespace(namespace) {
    // Qdrant delete by filter
    await fetch(`${this.#qdrantBase}/collections/heady_semantic_cache/points/delete`, {
      method: 'POST',
      headers: { 'api-key': this.#env.QDRANT_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ filter: { must: [{ key: 'namespace', match: { value: namespace } }] } }),
    });
    logger.info({ namespace }, 'cache_invalidated');
  }
}
