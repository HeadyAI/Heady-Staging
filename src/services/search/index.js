/**
 * Heady™ Search Service — Hybrid BM25 + Vector Search
 * Port: 3364 | Reciprocal Rank Fusion with k=fib(10)=55
 * 
 * pgvector HNSW search (384-dim, ef_search=fib(11)=89)
 * CSL-gated result filtering (minimum: CSL_THRESHOLDS.LOW ≈ 0.691)
 * LRU cache: fib(17)=1597 entries, TTL fib(10)=55s
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const express = require('express');
const { PHI, PSI, fib, phiMs, CSL_THRESHOLDS, phiBackoff, cosineSimilarity } = require('../../shared/phi-math');

const app = express();
const PORT = process.env.SERVICE_PORT || 3364;

// ─── φ-Constants ──────────────────────────────────────────────────────────────

const RRF_K            = fib(10);        // 55 — RRF fusion constant
const EF_SEARCH        = fib(11);        // 89 — HNSW ef_search
const VECTOR_DIMS      = 384;            // embedding dimensions
const LRU_SIZE         = fib(17);        // 1,597 cache entries
const LRU_TTL_MS       = fib(10) * 1000; // 55,000ms cache TTL
const MIN_RELEVANCE    = CSL_THRESHOLDS.LOW;  // 0.691 minimum result score
const MAX_RESULTS      = fib(8);         // 21 results per page
const AUTOCOMPLETE_MAX = fib(7);         // 13 suggestions

// ─── LRU Cache ────────────────────────────────────────────────────────────────

class LRUCache {
  constructor(maxSize, ttlMs) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }
  
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() - entry.ts > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    // Move to end (most recent)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, { value, ts: Date.now() });
  }
  
  get hitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }
}

const searchCache = new LRUCache(LRU_SIZE, LRU_TTL_MS);

// ─── Reciprocal Rank Fusion ──────────────────────────────────────────────────

function reciprocalRankFusion(rankedLists, k = RRF_K) {
  const scores = new Map();
  
  for (const list of rankedLists) {
    for (let rank = 0; rank < list.length; rank++) {
      const item = list[rank];
      const id = item.id;
      const rrfScore = 1 / (k + rank + 1);
      scores.set(id, (scores.get(id) || { item, score: 0 }));
      scores.get(id).score += rrfScore;
    }
  }
  
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, rrfScore: score }));
}

// ─── BM25 Search (in-memory for now, production uses pg full-text) ────────────

function bm25Score(query, document, avgDocLen = fib(13)) {
  const k1 = PHI;        // φ ≈ 1.618 (term frequency saturation)
  const b = PSI;          // ψ ≈ 0.618 (length normalization)
  
  const queryTerms = query.toLowerCase().split(/\s+/);
  const docTerms = document.toLowerCase().split(/\s+/);
  const docLen = docTerms.length;
  const termFreq = {};
  
  for (const t of docTerms) {
    termFreq[t] = (termFreq[t] || 0) + 1;
  }
  
  let score = 0;
  for (const qt of queryTerms) {
    const tf = termFreq[qt] || 0;
    if (tf === 0) continue;
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLen));
    score += numerator / denominator;
  }
  
  return score;
}

// ─── CSL-Gated Filter ─────────────────────────────────────────────────────────

function cslFilter(results, minScore = MIN_RELEVANCE) {
  return results.filter(r => (r.score || r.rrfScore || 0) >= minScore);
}

// ─── Structured Logger ────────────────────────────────────────────────────────

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, service: 'search', msg, ...meta }) + '\n');
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'search',
    version: '5.1.0',
    cache: { size: searchCache.cache.size, maxSize: LRU_SIZE, hitRate: searchCache.hitRate.toFixed(3) },
    phi: { rrfK: RRF_K, efSearch: EF_SEARCH, minRelevance: MIN_RELEVANCE },
    ts: new Date().toISOString(),
  });
});

// Hybrid search
app.post('/search', async (req, res) => {
  const { query, index = 'content', limit = MAX_RESULTS, vectorQuery = null } = req.body;
  
  if (!query && !vectorQuery) {
    return res.status(400).json({ error: 'HEADY-SEARCH-001', message: 'Missing query' });
  }
  
  const cacheKey = `${index}:${query}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    log('info', 'Cache hit', { query, index });
    return res.json({ ...cached, cached: true });
  }
  
  try {
    // In production: run BM25 against pg full-text and vector against pgvector HNSW in parallel
    // For now: demonstrate the fusion pipeline
    
    const startMs = Date.now();
    
    // Simulate BM25 results (production: SELECT ... FROM content WHERE to_tsvector('english', body) @@ to_tsquery($1))
    const textResults = [];
    
    // Simulate vector results (production: SELECT ... FROM embeddings ORDER BY embedding <=> $1 LIMIT $2)
    const vectorResults = [];
    
    // Fuse with RRF
    const fused = reciprocalRankFusion([textResults, vectorResults]);
    
    // CSL-gate filter
    const filtered = cslFilter(fused);
    
    const result = {
      query,
      index,
      results: filtered.slice(0, limit),
      total: filtered.length,
      latencyMs: Date.now() - startMs,
      fusion: { method: 'rrf', k: RRF_K },
      phi: { efSearch: EF_SEARCH, minRelevance: MIN_RELEVANCE },
    };
    
    searchCache.set(cacheKey, result);
    log('info', 'Search completed', { query, index, results: filtered.length, latencyMs: result.latencyMs });
    
    res.json(result);
  } catch (err) {
    log('error', 'Search failed', { query, error: err.message });
    res.status(500).json({ error: 'HEADY-SEARCH-500', message: 'Search failed' });
  }
});

// Autocomplete
app.get('/autocomplete', (req, res) => {
  const { q, index = 'content' } = req.query;
  if (!q || q.length < 2) {
    return res.json({ suggestions: [] });
  }
  
  // Production: pg trigram or prefix trie
  res.json({
    suggestions: [],
    limit: AUTOCOMPLETE_MAX,
  });
});

// Metrics
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send([
    '# HELP heady_search_cache_size Current cache size',
    '# TYPE heady_search_cache_size gauge',
    `heady_search_cache_size ${searchCache.cache.size}`,
    '# HELP heady_search_cache_hit_rate Cache hit rate',
    '# TYPE heady_search_cache_hit_rate gauge',
    `heady_search_cache_hit_rate ${searchCache.hitRate}`,
  ].join('\n'));
});

app.listen(PORT, () => {
  log('info', 'Search service started', { port: PORT, rrfK: RRF_K, efSearch: EF_SEARCH });
});

process.on('SIGTERM', () => {
  log('info', 'Shutting down search service');
  process.exit(0);
});
