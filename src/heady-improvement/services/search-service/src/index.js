/**
 * @heady/search-service — Hybrid Vector + BM25 Search
 * 
 * CSL-gated relevance scoring with Reciprocal Rank Fusion.
 * All constants φ-scaled per Heady Unbreakable Laws.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
import { PHI, PSI, FIB, phiThreshold, phiBackoff, cslGate } from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';
import { createHealthRouter } from '@heady/health-probes';

const logger = createLogger({ service: 'search-service' });

/** φ-scaled configuration */
const CONFIG = Object.freeze({
  port: parseInt(process.env.PORT || '8089', 10),
  pgConnectionString: process.env.PG_CONNECTION_STRING,
  natsUrl: process.env.NATS_URL,
  embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '384', 10),
  searchTimeoutMs: parseInt(process.env.SEARCH_TIMEOUT_MS || '4236', 10),
  maxResultsDefault: FIB[8],           // 21
  rerankTopK: FIB[8],                  // 21
  hybridRrfK: FIB[10],                // 55
  cslRelevanceThreshold: phiThreshold(1), // ≈0.691 LOW
  cslHighRelevance: phiThreshold(3),      // ≈0.882 HIGH
  bm25Weight: PSI,                        // ≈0.618
  vectorWeight: 1 - PSI,                  // ≈0.382 (dense vector gets less because BM25 is primary for keyword)
  maxConcurrentQueries: FIB[7],           // 13
  cacheSize: FIB[16],                     // 987
  cacheTtlMs: FIB[10] * 1000,            // 55s
});

/**
 * LRU Cache with φ-scaled eviction
 */
class SearchCache {
  #cache = new Map();
  #maxSize;
  #ttlMs;

  constructor(maxSize = CONFIG.cacheSize, ttlMs = CONFIG.cacheTtlMs) {
    this.#maxSize = maxSize;
    this.#ttlMs = ttlMs;
  }

  get(key) {
    const entry = this.#cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.#ttlMs) {
      this.#cache.delete(key);
      return null;
    }
    // Move to end (most recent)
    this.#cache.delete(key);
    this.#cache.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.#cache.size >= this.#maxSize) {
      // Evict oldest (first key)
      const firstKey = this.#cache.keys().next().value;
      this.#cache.delete(firstKey);
    }
    this.#cache.set(key, { value, ts: Date.now() });
  }

  get size() { return this.#cache.size; }
  clear() { this.#cache.clear(); }
}

/**
 * Reciprocal Rank Fusion — merges BM25 + vector results
 * k parameter is φ-scaled: FIB[10] = 55
 */
function reciprocalRankFusion(bm25Results, vectorResults, k = CONFIG.hybridRrfK) {
  const scores = new Map();

  for (let i = 0; i < bm25Results.length; i++) {
    const id = bm25Results[i].id;
    const rrfScore = 1 / (k + i + 1);
    scores.set(id, (scores.get(id) || 0) + rrfScore * CONFIG.bm25Weight);
  }

  for (let i = 0; i < vectorResults.length; i++) {
    const id = vectorResults[i].id;
    const rrfScore = 1 / (k + i + 1);
    scores.set(id, (scores.get(id) || 0) + rrfScore * CONFIG.vectorWeight);
  }

  // Merge metadata from both result sets
  const metadataMap = new Map();
  for (const r of [...bm25Results, ...vectorResults]) {
    if (!metadataMap.has(r.id)) metadataMap.set(r.id, r);
  }

  return Array.from(scores.entries())
    .map(([id, score]) => ({
      ...metadataMap.get(id),
      fusedScore: score,
      relevanceGate: cslGate(score, score, CONFIG.cslRelevanceThreshold),
    }))
    .filter(r => r.relevanceGate > CONFIG.cslRelevanceThreshold)
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, CONFIG.maxResultsDefault);
}

/**
 * Vector similarity search via pgvector
 */
async function vectorSearch(pgPool, embedding, options = {}) {
  const { limit = CONFIG.rerankTopK, namespace = 'default' } = options;
  const query = `
    SELECT id, content, metadata, 
           1 - (embedding <=> $1::vector) AS similarity
    FROM heady_vectors 
    WHERE namespace = $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `;
  const result = await pgPool.query(query, [
    JSON.stringify(embedding),
    namespace,
    limit,
  ]);
  return result.rows.map(row => ({
    id: row.id,
    content: row.content,
    metadata: row.metadata,
    similarity: parseFloat(row.similarity),
  }));
}

/**
 * BM25 full-text search via PostgreSQL ts_rank
 */
async function bm25Search(pgPool, queryText, options = {}) {
  const { limit = CONFIG.rerankTopK, namespace = 'default' } = options;
  const query = `
    SELECT id, content, metadata,
           ts_rank_cd(search_vector, plainto_tsquery('english', $1)) AS rank
    FROM heady_vectors
    WHERE namespace = $3
      AND search_vector @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT $2
  `;
  const result = await pgPool.query(query, [queryText, limit, namespace]);
  return result.rows.map(row => ({
    id: row.id,
    content: row.content,
    metadata: row.metadata,
    bm25Rank: parseFloat(row.rank),
  }));
}

/**
 * Hybrid search: BM25 + vector + RRF + CSL gate
 */
async function hybridSearch(pgPool, embeddingFn, queryText, options = {}) {
  const { namespace = 'default', limit = CONFIG.maxResultsDefault } = options;

  const [embedding, bm25Results] = await Promise.all([
    embeddingFn(queryText),
    bm25Search(pgPool, queryText, { namespace }),
  ]);

  const vectorResults = await vectorSearch(pgPool, embedding, { namespace });

  const fused = reciprocalRankFusion(bm25Results, vectorResults);

  return {
    results: fused.slice(0, limit),
    meta: {
      bm25Count: bm25Results.length,
      vectorCount: vectorResults.length,
      fusedCount: fused.length,
      rrfK: CONFIG.hybridRrfK,
      cslThreshold: CONFIG.cslRelevanceThreshold,
    },
  };
}

/**
 * SearchService — main service class
 */
class SearchService extends EventEmitter {
  #pgPool = null;
  #cache;
  #activeQueries = 0;
  #server = null;

  constructor() {
    super();
    this.#cache = new SearchCache();
  }

  async initialize(pgPool, embeddingFn) {
    this.#pgPool = pgPool;
    this._embeddingFn = embeddingFn;
    logger.info('SearchService initialized', {
      cacheSize: CONFIG.cacheSize,
      maxConcurrent: CONFIG.maxConcurrentQueries,
      rrfK: CONFIG.hybridRrfK,
    });
  }

  async search(queryText, options = {}) {
    if (this.#activeQueries >= CONFIG.maxConcurrentQueries) {
      const error = new Error('Search backpressure: too many concurrent queries');
      error.code = 'SEARCH_BACKPRESSURE';
      throw error;
    }

    const cacheKey = `${queryText}:${options.namespace || 'default'}`;
    const cached = this.#cache.get(cacheKey);
    if (cached) {
      this.emit('cache-hit', { query: queryText });
      return cached;
    }

    this.#activeQueries++;
    try {
      const result = await hybridSearch(
        this.#pgPool,
        this._embeddingFn,
        queryText,
        options
      );
      this.#cache.set(cacheKey, result);
      this.emit('search-complete', {
        query: queryText,
        resultCount: result.results.length,
      });
      return result;
    } finally {
      this.#activeQueries--;
    }
  }

  get stats() {
    return {
      activeQueries: this.#activeQueries,
      cacheSize: this.#cache.size,
      maxConcurrent: CONFIG.maxConcurrentQueries,
    };
  }

  async startServer() {
    const health = createHealthRouter({
      service: 'search-service',
      checks: {
        postgres: async () => {
          await this.#pgPool.query('SELECT 1');
          return { status: 'healthy' };
        },
        cache: async () => ({
          status: 'healthy',
          size: this.#cache.size,
        }),
      },
    });

    this.#server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://0.0.0.0:${CONFIG.port}`);

      if (url.pathname.startsWith('/health')) {
        return health(req, res);
      }

      if (url.pathname === '/search' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        try {
          const { query, namespace, limit } = JSON.parse(body);
          if (!query || typeof query !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing query parameter' }));
            return;
          }
          const result = await this.search(query, { namespace, limit });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          const status = err.code === 'SEARCH_BACKPRESSURE' ? 429 : 500;
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message, code: err.code }));
        }
        return;
      }

      if (url.pathname === '/stats' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.stats));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    this.#server.listen(CONFIG.port, () => {
      logger.info('Search service listening', { port: CONFIG.port });
    });
  }

  async shutdown() {
    if (this.#server) {
      await new Promise(resolve => this.#server.close(resolve));
    }
    this.#cache.clear();
    logger.info('Search service shut down');
  }
}

export {
  SearchService,
  SearchCache,
  reciprocalRankFusion,
  hybridSearch,
  vectorSearch,
  bm25Search,
  CONFIG as SEARCH_CONFIG,
};
