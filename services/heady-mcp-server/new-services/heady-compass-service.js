'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };

const SERVICE_NAME = 'heady-compass';
const PORT = 3415;
const EMBEDDING_DIM = 384;

/**
 * Structured JSON logger with correlation ID support.
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [meta={}] - Additional metadata
 */
function log(level, msg, meta = {}) {
  const entry = { timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failures = 0;
    this.threshold = opts.threshold || FIB[8];
    this.resetTimeout = opts.resetTimeout || FIB[10] * 1000;
    this.lastFailure = 0;
  }
  async execute(fn) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailure;
      const backoff = this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]));
      if (elapsed < backoff) throw new Error(`Circuit ${this.name} OPEN`);
      this.state = 'HALF_OPEN';
    }
    try {
      const result = await fn();
      this.failures = 0; this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'OPEN';
      throw err;
    }
  }
}

const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) {
  log('info', `${signal} received, graceful shutdown`);
  while (shutdownHandlers.length) await shutdownHandlers.pop()();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Generate a deterministic 384-dimensional embedding from content hash.
 * Uses SHA-512 digest bytes to seed a PRNG that produces normalized floats.
 * @param {string} content - Text content to embed
 * @returns {number[]} 384-dimensional unit vector
 */
function generateEmbedding(content) {
  const hash = crypto.createHash('sha512').update(content).digest();
  const vec = new Array(EMBEDDING_DIM);
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const byteIdx = i % hash.length;
    const seed = hash[byteIdx] ^ ((i * FIB[7]) & 0xFF);
    vec[i] = (seed / 255) * 2 - 1;
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  for (let i = 0; i < EMBEDDING_DIM; i++) vec[i] /= norm;
  return vec;
}

/**
 * Compute cosine similarity between two 384-dimensional vectors.
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Cosine similarity in range [-1, 1]
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Tokenize text into lowercase terms for BM25 scoring. @param {string} text @returns {string[]} */
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 0);
}

/** Compute BM25 relevance score. @param {string[]} queryTokens @param {string[]} docTokens @param {Map} docFreqs @param {number} totalDocs @param {number} avgDocLen @returns {number} */
function bm25Score(queryTokens, docTokens, docFreqs, totalDocs, avgDocLen) {
  const k1 = PHI; // Use phi as BM25 k1 parameter
  const b = PSI;  // Use psi as BM25 b parameter
  const termFreqs = new Map();
  for (const t of docTokens) termFreqs.set(t, (termFreqs.get(t) || 0) + 1);
  let score = 0;
  for (const qt of queryTokens) {
    const tf = termFreqs.get(qt) || 0;
    if (tf === 0) continue;
    const df = docFreqs.get(qt) || 0;
    const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
    const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docTokens.length / avgDocLen)));
    score += idf * tfNorm;
  }
  return score;
}

/**
 * CompassBee - Semantic search bee combining BM25 and vector search.
 * Indexes documents with 384D embeddings and supports hybrid scoring
 * with phi-weighted blending of BM25 and cosine similarity.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class CompassBee {
  constructor() {
    this.documents = new Map();
    this.docFreqs = new Map();
    this.totalTokens = 0;
    this.circuit = new CircuitBreaker('compass-search');
    this.startTime = Date.now();
    this.coherence = CSL.HIGH;
  }

  spawn() { log('info', 'CompassBee spawned', { phase: 'spawn' }); }
  execute() { log('info', 'CompassBee executing — index ready', { phase: 'execute' }); }
  report() { return { service: SERVICE_NAME, documentCount: this.documents.size, uptime: Date.now() - this.startTime }; }
  retire() { log('info', 'CompassBee retiring', { phase: 'retire' }); }

  indexDocument(id, content, type, metadata) {
    const tokens = tokenize(content);
    const embedding = generateEmbedding(content);
    if (this.documents.has(id)) {
      for (const t of new Set(tokenize(this.documents.get(id).content)))
        if (this.docFreqs.has(t)) this.docFreqs.set(t, Math.max(0, this.docFreqs.get(t) - 1));
    }
    for (const t of new Set(tokens)) this.docFreqs.set(t, (this.docFreqs.get(t) || 0) + 1);
    this.documents.set(id, { id, content, type: type || 'document', metadata: metadata || {}, tokens, embedding, indexedAt: Date.now() });
    this.totalTokens = [...this.documents.values()].reduce((s, d) => s + d.tokens.length, 0);
    log('info', `Document indexed: ${id}`, { type, tokenCount: tokens.length });
    return { id, type: type || 'document', tokenCount: tokens.length, embeddingDim: EMBEDDING_DIM };
  }

  search(query, limit, minCoherence) {
    const threshold = minCoherence || CSL.MINIMUM;
    const maxResults = limit || FIB[7]; // 13
    const queryTokens = tokenize(query);
    const queryEmbedding = generateEmbedding(query);
    const totalDocs = this.documents.size;
    if (totalDocs === 0) return [];
    const avgDocLen = this.totalTokens / totalDocs;
    const scored = [];
    for (const doc of this.documents.values()) {
      const bm25 = bm25Score(queryTokens, doc.tokens, this.docFreqs, totalDocs, avgDocLen);
      const vectorSim = cosineSimilarity(queryEmbedding, doc.embedding);
      const normalizedVector = (vectorSim + 1) / 2;
      const maxBm25 = Math.max(1, bm25);
      const normalizedBm25 = bm25 / maxBm25;
      const hybridScore = normalizedBm25 * PSI + normalizedVector * (1 - PSI);
      if (hybridScore >= threshold) {
        scored.push({ id: doc.id, type: doc.type, score: Math.round(hybridScore * 1000) / 1000, bm25Score: Math.round(bm25 * 1000) / 1000, vectorScore: Math.round(normalizedVector * 1000) / 1000, metadata: doc.metadata, snippet: doc.content.slice(0, FIB[12]) });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  }

  getStats() {
    const typeDist = {};
    let totalCoherence = 0;
    for (const doc of this.documents.values()) {
      typeDist[doc.type] = (typeDist[doc.type] || 0) + 1;
      const selfSim = cosineSimilarity(doc.embedding, doc.embedding);
      totalCoherence += selfSim;
    }
    const docCount = this.documents.size;
    return { documentCount: docCount, typeDistribution: typeDist, avgCoherence: docCount > 0 ? Math.round((totalCoherence / docCount) * 1000) / 1000 : 0, totalTokens: this.totalTokens, embeddingDimension: EMBEDDING_DIM, uniqueTerms: this.docFreqs.size };
  }
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

const bee = new CompassBee();
bee.spawn();
bee.execute();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: process.uptime(), coherence: bee.coherence, timestamp: new Date().toISOString() });
});

app.post('/index', async (req, res) => {
  try {
    const { id, content, type, metadata } = req.body;
    if (!id || !content) return res.status(400).json({ error: 'id and content required' });
    const result = await bee.circuit.execute(() => bee.indexDocument(id, content, type, metadata));
    log('info', 'Document indexed', { id, correlationId: req.correlationId });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.message.includes('OPEN') ? 503 : 400).json({ error: err.message });
  }
});

app.post('/search', async (req, res) => {
  try {
    const { query, limit, minCoherence } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    const results = await bee.circuit.execute(() => bee.search(query, limit, minCoherence));
    log('info', 'Search executed', { query, resultCount: results.length, correlationId: req.correlationId });
    res.json({ query, resultCount: results.length, results });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

app.get('/stats', (_req, res) => { res.json(bee.getStats()); });

onShutdown(() => { bee.retire(); return Promise.resolve(); });
const server = app.listen(PORT, () => {
  log('info', `${SERVICE_NAME} listening on port ${PORT}`, { port: PORT, pools: POOLS });
});
onShutdown(() => new Promise(resolve => server.close(resolve)));

module.exports = { app, CompassBee, generateEmbedding, cosineSimilarity, bm25Score };
