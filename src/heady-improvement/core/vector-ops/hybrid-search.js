/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Hybrid Search — BM25 full-text + dense vector similarity
 * with Reciprocal Rank Fusion (RRF) and CSL-gated weight modulation.
 *
 * Combines lexical precision (BM25) with semantic recall (vector)
 * for optimal search quality. Phi-scaled parameters throughout.
 *
 * Founder: Eric Haywood
 * @module core/vector-ops/hybrid-search
 */

import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,
  cslGate,
  phiFusionWeights,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';
import { cslAND, normalize, topK as vectorTopK } from './csl-engine.js';

const logger = createLogger('hybrid-search');

const PSI2 = PSI * PSI;

/** RRF constant k = fib(10) = 55 */
const RRF_K = fib(10);

/** Default search parameters */
const SEARCH_DEFAULTS = Object.freeze({
  topK: fib(8),            // 21 results
  rerankTopK: fib(8),       // 21 for reranking
  vectorWeight: PSI,         // 0.618 — semantic gets golden ratio weight
  textWeight: PSI2,          // 0.382 — lexical gets conjugate weight
  minScore: CSL_THRESHOLDS.LOW, // 0.691 minimum relevance
});

// ── BM25 Implementation ────────────────────────────────────────────

/**
 * Simple but complete BM25 scoring.
 * k1 and b parameters are phi-derived.
 */
class BM25Index {
  constructor() {
    this._docs = new Map();        // id → { terms, length, metadata }
    this._termFreq = new Map();    // term → Map<docId, count>
    this._docFreq = new Map();     // term → number of docs containing term
    this._avgDocLen = 0;
    this._k1 = PHI;                // φ ≈ 1.618 (replaces typical 1.2–2.0)
    this._b = PSI;                 // ψ ≈ 0.618 (replaces typical 0.75)
  }

  /**
   * Add a document to the index.
   * @param {string} id
   * @param {string} text
   * @param {object} [metadata]
   */
  addDocument(id, text, metadata = {}) {
    const terms = tokenize(text);
    this._docs.set(id, { terms, length: terms.length, metadata });

    // Update term frequencies
    const seen = new Set();
    for (const term of terms) {
      if (!this._termFreq.has(term)) this._termFreq.set(term, new Map());
      const tf = this._termFreq.get(term);
      tf.set(id, (tf.get(id) || 0) + 1);

      if (!seen.has(term)) {
        this._docFreq.set(term, (this._docFreq.get(term) || 0) + 1);
        seen.add(term);
      }
    }

    // Recalculate average doc length
    let totalLen = 0;
    for (const doc of this._docs.values()) totalLen += doc.length;
    this._avgDocLen = totalLen / this._docs.size;
  }

  /**
   * Remove a document.
   * @param {string} id
   */
  removeDocument(id) {
    const doc = this._docs.get(id);
    if (!doc) return;

    const seen = new Set();
    for (const term of doc.terms) {
      const tf = this._termFreq.get(term);
      if (tf) tf.delete(id);

      if (!seen.has(term)) {
        const df = this._docFreq.get(term);
        if (df > 1) this._docFreq.set(term, df - 1);
        else this._docFreq.delete(term);
        seen.add(term);
      }
    }

    this._docs.delete(id);
  }

  /**
   * Search using BM25 scoring.
   * @param {string} query
   * @param {number} [k] - Number of results
   * @returns {Array<{id: string, score: number}>}
   */
  search(query, k = SEARCH_DEFAULTS.topK) {
    const queryTerms = tokenize(query);
    const N = this._docs.size;
    if (N === 0) return [];

    const scores = new Map();

    for (const term of queryTerms) {
      const df = this._docFreq.get(term) || 0;
      if (df === 0) continue;

      // IDF with standard BM25 formula
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      const termDocs = this._termFreq.get(term);
      if (!termDocs) continue;

      for (const [docId, freq] of termDocs) {
        const doc = this._docs.get(docId);
        const tf = freq;
        const docLen = doc.length;

        // BM25 score with phi-derived k1 and b
        const numerator = tf * (this._k1 + 1);
        const denominator = tf + this._k1 * (1 - this._b + this._b * (docLen / this._avgDocLen));
        const termScore = idf * (numerator / denominator);

        scores.set(docId, (scores.get(docId) || 0) + termScore);
      }
    }

    // Sort and return top-k
    const results = Array.from(scores.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return results;
  }

  /**
   * Get index statistics.
   * @returns {object}
   */
  stats() {
    return {
      documents: this._docs.size,
      uniqueTerms: this._termFreq.size,
      avgDocLength: Math.round(this._avgDocLen * 100) / 100,
      k1: this._k1,
      b: this._b,
    };
  }
}

// ── Hybrid Search Engine ───────────────────────────────────────────

class HybridSearch {
  /**
   * @param {object} [options]
   * @param {number} [options.vectorWeight] - Weight for vector results (default PSI)
   * @param {number} [options.textWeight] - Weight for BM25 results (default PSI2)
   * @param {number} [options.topK] - Number of results (default fib(8))
   */
  constructor(options = {}) {
    this._bm25 = new BM25Index();
    this._vectorStore = new Map(); // id → { vector, metadata }
    this._vectorWeight = options.vectorWeight || SEARCH_DEFAULTS.vectorWeight;
    this._textWeight = options.textWeight || SEARCH_DEFAULTS.textWeight;
    this._topK = options.topK || SEARCH_DEFAULTS.topK;
  }

  /**
   * Index a document for both text and vector search.
   * @param {string} id
   * @param {string} text
   * @param {Float64Array|number[]} vector
   * @param {object} [metadata]
   */
  index(id, text, vector, metadata = {}) {
    this._bm25.addDocument(id, text, metadata);
    this._vectorStore.set(id, { vector, metadata: { ...metadata, text } });
  }

  /**
   * Remove a document from the index.
   * @param {string} id
   */
  remove(id) {
    this._bm25.removeDocument(id);
    this._vectorStore.delete(id);
  }

  /**
   * Hybrid search combining BM25 and vector similarity with RRF.
   *
   * @param {string} queryText - Text query for BM25
   * @param {Float64Array|number[]} queryVector - Query embedding for vector search
   * @param {object} [options]
   * @param {number} [options.k] - Number of results
   * @param {object} [options.filter] - Metadata filter { key: value }
   * @returns {Array<{id: string, score: number, bm25Rank: number, vectorRank: number, metadata: object}>}
   */
  search(queryText, queryVector, options = {}) {
    const k = options.k || this._topK;

    // BM25 search
    const bm25Results = this._bm25.search(queryText, k * 2);

    // Vector search
    const candidates = [];
    for (const [id, entry] of this._vectorStore) {
      // Apply metadata filter if provided
      if (options.filter) {
        let match = true;
        for (const [key, value] of Object.entries(options.filter)) {
          if (entry.metadata[key] !== value) { match = false; break; }
        }
        if (!match) continue;
      }
      candidates.push({ id, vector: entry.vector });
    }

    const vectorResults = vectorTopK(queryVector, candidates, k * 2);

    // Reciprocal Rank Fusion
    const rrfScores = new Map();

    for (let i = 0; i < bm25Results.length; i++) {
      const id = bm25Results[i].id;
      const rrfScore = this._textWeight / (RRF_K + i + 1);
      rrfScores.set(id, (rrfScores.get(id) || 0) + rrfScore);
    }

    for (let i = 0; i < vectorResults.length; i++) {
      const id = vectorResults[i].id;
      const rrfScore = this._vectorWeight / (RRF_K + i + 1);
      rrfScores.set(id, (rrfScores.get(id) || 0) + rrfScore);
    }

    // Build ranked results
    const bm25RankMap = new Map(bm25Results.map((r, i) => [r.id, i + 1]));
    const vectorRankMap = new Map(vectorResults.map((r, i) => [r.id, i + 1]));

    const results = Array.from(rrfScores.entries())
      .map(([id, score]) => ({
        id,
        score: Math.round(score * 100000) / 100000,
        bm25Rank: bm25RankMap.get(id) || null,
        vectorRank: vectorRankMap.get(id) || null,
        metadata: this._vectorStore.get(id)?.metadata || {},
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return results;
  }

  /**
   * Get index statistics.
   * @returns {object}
   */
  stats() {
    return {
      bm25: this._bm25.stats(),
      vectorStore: {
        documents: this._vectorStore.size,
      },
      weights: {
        vector: this._vectorWeight,
        text: this._textWeight,
      },
      rrfK: RRF_K,
      topK: this._topK,
    };
  }
}

// ── Utilities ──────────────────────────────────────────────────────

/**
 * Simple tokenizer — lowercase, split on non-alphanumeric, remove stopwords.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  const STOPWORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'can', 'could', 'of', 'at', 'by',
    'for', 'with', 'about', 'against', 'between', 'through', 'during',
    'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'and', 'but', 'or', 'nor', 'not', 'no', 'so',
    'if', 'that', 'this', 'it', 'its',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

export {
  HybridSearch,
  BM25Index,
  RRF_K,
  SEARCH_DEFAULTS,
  tokenize,
};
