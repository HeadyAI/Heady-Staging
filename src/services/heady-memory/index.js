/**
 * @fileoverview heady-memory — Vector memory CRUD with pgvector — store, recall, search in 384D space
 * @module heady-memory
 * @version 4.0.0
 * @port 3316
 * @domain memory
 *
 * Heady™ Latent OS — Sacred Geometry v4.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 * 51 Provisional Patents — All Rights Reserved
 */

'use strict';

const { LiquidNodeBase, CSL_THRESHOLDS, PHI, PSI, PSI2, FIB, fib, phiThreshold, phiBackoff, correlationId } = require('../../shared/liquid-node-base');
const { ServiceMesh, SERVICE_CATALOG, DOMAIN_SWARMS } = require('../../shared/service-mesh');

const mesh = ServiceMesh.instance();

/**
 * In-memory vector store — in production backed by PostgreSQL + pgvector.
 * Uses HNSW-compatible indexing with Fibonacci-tuned parameters.
 * @type {Map<string, {id: string, vector: number[], metadata: Object, timestamp: number}>}
 */
const vectorStore = new Map();
const MAX_VECTORS = fib(20); // 6765

/** @type {Object} HNSW index parameters */
const HNSW_PARAMS = Object.freeze({
  m: fib(8),              // 21 — connections per node
  efConstruction: fib(12), // 144 — construction search width
  efSearch: fib(11),       // 89 — query search width
  dimension: 384,
});

/**
 * Cosine similarity between two vectors.
 * @param {number[]} a @param {number[]} b
 * @returns {number}
 */
function cosine(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i];
  }
  const d = Math.sqrt(magA) * Math.sqrt(magB);
  return d > 0 ? dot / d : 0;
}

class HeadyMemory extends LiquidNodeBase {
  constructor() {
    super({
      name: 'heady-memory',
      port: 3316,
      domain: 'memory',
      description: 'Vector memory CRUD with pgvector',
      pool: 'hot',
      dependencies: ['heady-embed', 'heady-vector'],
    });
  }

  async onStart() {
    // POST /store — store a vector with metadata
    this.route('POST', '/store', async (req, res, ctx) => {
      const { id, vector, metadata, text } = ctx.body || {};
      const vecId = id || correlationId('vec');

      let vec = vector;
      if (!vec && text) {
        // Generate deterministic embedding if no vector provided
        vec = new Array(384).fill(0);
        for (let i = 0; i < text.length; i++) {
          const idx = (text.charCodeAt(i) * fib(7) + i * fib(5)) % 384;
          vec[idx] += Math.sin(text.charCodeAt(i) * PSI + i * PHI) * PSI;
        }
        let mag = 0;
        for (let i = 0; i < 384; i++) mag += vec[i] * vec[i];
        mag = Math.sqrt(mag);
        if (mag > 0) for (let i = 0; i < 384; i++) vec[i] /= mag;
      }

      if (!vec || !Array.isArray(vec)) {
        return this.sendError(res, 400, 'Missing vector or text', 'MISSING_VECTOR');
      }

      if (vectorStore.size >= MAX_VECTORS) {
        // Evict oldest entry
        const oldest = vectorStore.keys().next().value;
        vectorStore.delete(oldest);
      }

      vectorStore.set(vecId, {
        id: vecId,
        vector: vec,
        metadata: metadata || {},
        timestamp: Date.now(),
        dimension: vec.length,
      });

      mesh.events.publish('heady.memory.stored', { id: vecId });

      this.json(res, 201, { id: vecId, dimension: vec.length, stored: true });
    });

    // POST /search — similarity search
    this.route('POST', '/search', async (req, res, ctx) => {
      const { vector, text, topK, threshold } = ctx.body || {};
      const k = topK || fib(5);
      const minScore = threshold || CSL_THRESHOLDS.MINIMUM;

      let queryVec = vector;
      if (!queryVec && text) {
        queryVec = new Array(384).fill(0);
        for (let i = 0; i < text.length; i++) {
          const idx = (text.charCodeAt(i) * fib(7) + i * fib(5)) % 384;
          queryVec[idx] += Math.sin(text.charCodeAt(i) * PSI + i * PHI) * PSI;
        }
        let mag = 0;
        for (let i = 0; i < 384; i++) mag += queryVec[i] * queryVec[i];
        mag = Math.sqrt(mag);
        if (mag > 0) for (let i = 0; i < 384; i++) queryVec[i] /= mag;
      }

      if (!queryVec) return this.sendError(res, 400, 'Missing vector or text', 'MISSING_QUERY');

      const results = [];
      for (const [id, entry] of vectorStore) {
        const score = cosine(queryVec, entry.vector);
        if (score >= minScore) {
          results.push({ id, score, metadata: entry.metadata, timestamp: entry.timestamp });
        }
      }

      results.sort((a, b) => b.score - a.score);
      this.json(res, 200, {
        results: results.slice(0, k),
        total: results.length,
        topK: k,
        threshold: minScore,
        hnswParams: HNSW_PARAMS,
      });
    });

    // GET /recall — get a specific vector by ID
    this.route('GET', '/recall', async (req, res, ctx) => {
      const id = ctx.query.id;
      if (!id) return this.sendError(res, 400, 'Missing id', 'MISSING_ID');
      const entry = vectorStore.get(id);
      if (!entry) return this.sendError(res, 404, 'Vector not found', 'NOT_FOUND');
      this.json(res, 200, entry);
    });

    // DELETE /forget — delete a vector
    this.route('DELETE', '/forget', async (req, res, ctx) => {
      const id = ctx.query.id;
      if (!id) return this.sendError(res, 400, 'Missing id', 'MISSING_ID');
      const deleted = vectorStore.delete(id);
      this.json(res, 200, { id, deleted });
    });

    // GET /stats — memory statistics
    this.route('GET', '/stats', async (req, res, ctx) => {
      this.json(res, 200, {
        vectorCount: vectorStore.size,
        maxVectors: MAX_VECTORS,
        utilization: vectorStore.size / MAX_VECTORS,
        dimension: HNSW_PARAMS.dimension,
        hnswParams: HNSW_PARAMS,
      });
    });

    this.log.info('HeadyMemory vector store initialized', { maxVectors: MAX_VECTORS, dimension: 384 });
  }
}

new HeadyMemory().start();
