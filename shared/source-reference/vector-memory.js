/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Heady™ Vector Memory — src/memory/vector-memory.js
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * RAM-first 384-dimensional vector memory with LRU eviction, semantic search,
 * phi-weighted eviction scoring, and pgvector persistence fallback.
 *
 * This is the "brain" — all reasoning, routing, and orchestration decisions
 * read from vector memory first. PostgreSQL/pgvector is the backup.
 *
 * © HeadySystems Inc. — Sacred Geometry :: Organic Systems :: Breathing Interfaces
 */

'use strict';

const {
  fib, CSL_THRESHOLDS, EVICTION_WEIGHTS,
  phiFusionWeights, PSI, PHI,
} = require('../../shared/phi-math');
const { cslAND, normalize, topK } = require('../../shared/csl-engine');

const DEFAULT_DIM = 384;
const DEFAULT_CAPACITY = fib(20); // 6765 entries

class VectorMemory {
  /**
   * @param {object} [opts]
   * @param {number} [opts.dimensions] - Vector dimensionality (default 384)
   * @param {number} [opts.capacity] - Max entries in RAM (default fib(20)=6765)
   * @param {Function} [opts.embedFn] - async (text) → Float64Array — embedding function
   * @param {object} [opts.persistence] - pgvector adapter { store, search, delete }
   * @param {Function} [opts.logger]
   */
  constructor(opts = {}) {
    this.dimensions = opts.dimensions || DEFAULT_DIM;
    this.capacity = opts.capacity || DEFAULT_CAPACITY;
    this.embedFn = opts.embedFn || null;
    this.persistence = opts.persistence || null;
    this.logger = opts.logger || console;

    // RAM store: id → { vector, metadata, importance, accessCount, createdAt, lastAccessedAt }
    this._store = new Map();
    this._accessOrder = []; // LRU tracking
  }

  /**
   * Store a memory entry.
   * @param {string} id - Unique identifier
   * @param {Float64Array|number[]} vector - 384D embedding
   * @param {object} [metadata] - Arbitrary metadata
   * @param {number} [importance=0.5] - 0–1 importance score
   * @returns {object} Stored entry
   */
  store(id, vector, metadata = {}, importance = 0.5) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`);
    }

    const entry = {
      id,
      vector: vector instanceof Float64Array ? vector : new Float64Array(vector),
      metadata,
      importance: Math.max(0, Math.min(1, importance)),
      accessCount: 0,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this._store.set(id, entry);
    this._touchLRU(id);

    // Evict if over capacity
    while (this._store.size > this.capacity) {
      this._evict();
    }

    // Async persistence (fire and forget)
    if (this.persistence) {
      this.persistence.store(id, vector, metadata, importance).catch(err =>
        this.logger.warn?.('[VectorMemory] Persistence write failed', err)
      );
    }

    return entry;
  }

  /**
   * Store from text (requires embedFn).
   * @param {string} id
   * @param {string} text - Text to embed
   * @param {object} [metadata]
   * @param {number} [importance]
   * @returns {Promise<object>}
   */
  async storeText(id, text, metadata = {}, importance = 0.5) {
    if (!this.embedFn) throw new Error('No embedding function configured');
    const vector = await this.embedFn(text);
    return this.store(id, vector, { ...metadata, text }, importance);
  }

  /**
   * Retrieve entry by ID.
   * @param {string} id
   * @returns {object|null}
   */
  get(id) {
    const entry = this._store.get(id);
    if (!entry) return null;
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    this._touchLRU(id);
    return entry;
  }

  /**
   * Semantic search: find top-K entries by cosine similarity.
   * @param {Float64Array|number[]} queryVector
   * @param {number} [k=10]
   * @param {object} [filter] - Optional metadata filter { key: value }
   * @returns {Array<{id: string, score: number, metadata: object}>}
   */
  search(queryVector, k = 10, filter = null) {
    let candidates = Array.from(this._store.values());

    // Apply metadata filter
    if (filter) {
      candidates = candidates.filter(entry => {
        for (const [key, value] of Object.entries(filter)) {
          if (entry.metadata[key] !== value) return false;
        }
        return true;
      });
    }

    // Score and rank
    const items = candidates.map(entry => ({
      id: entry.id,
      vector: entry.vector,
    }));

    const results = topK(queryVector, items, k);

    return results.map(r => {
      const entry = this._store.get(r.id);
      entry.accessCount++;
      entry.lastAccessedAt = Date.now();
      return {
        id: r.id,
        score: r.score,
        metadata: entry.metadata,
        importance: entry.importance,
      };
    });
  }

  /**
   * Semantic text search (requires embedFn).
   * @param {string} queryText
   * @param {number} [k=10]
   * @param {object} [filter]
   * @returns {Promise<Array>}
   */
  async searchText(queryText, k = 10, filter = null) {
    if (!this.embedFn) throw new Error('No embedding function configured');
    const queryVector = await this.embedFn(queryText);
    return this.search(queryVector, k, filter);
  }

  /**
   * Delete an entry.
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const existed = this._store.delete(id);
    this._accessOrder = this._accessOrder.filter(x => x !== id);
    if (existed && this.persistence) {
      this.persistence.delete(id).catch(() => {});
    }
    return existed;
  }

  /**
   * Check if two entries are semantically duplicates.
   * @param {string} idA
   * @param {string} idB
   * @returns {number|null} Cosine similarity, or null if not found
   */
  similarity(idA, idB) {
    const a = this._store.get(idA);
    const b = this._store.get(idB);
    if (!a || !b) return null;
    return cslAND(a.vector, b.vector);
  }

  /**
   * Find semantic duplicates above a threshold.
   * @param {Float64Array|number[]} vector
   * @param {number} [threshold=CSL_THRESHOLDS.DEDUP]
   * @returns {Array<{id: string, score: number}>}
   */
  findDuplicates(vector, threshold = CSL_THRESHOLDS.DEDUP) {
    const results = [];
    for (const [id, entry] of this._store) {
      const score = cslAND(vector, entry.vector);
      if (score >= threshold) results.push({ id, score });
    }
    return results.sort((a, b) => b.score - a.score);
  }

  // ─── Eviction ──────────────────────────────────────────────────────────────

  /**
   * Evict the lowest-scored entry using phi-weighted scoring.
   * Score = importance × w_i + recency × w_r + accessFreq × w_a
   */
  _evict() {
    if (this._store.size === 0) return;

    const now = Date.now();
    let lowestId = null;
    let lowestScore = Infinity;

    const maxAccess = Math.max(1, ...Array.from(this._store.values()).map(e => e.accessCount));
    const maxAge = Math.max(1, ...Array.from(this._store.values()).map(e => now - e.createdAt));

    for (const [id, entry] of this._store) {
      const recency = 1 - ((now - entry.lastAccessedAt) / maxAge);
      const frequency = entry.accessCount / maxAccess;
      const importance = entry.importance;

      const score =
        importance * EVICTION_WEIGHTS.importance +
        Math.max(0, recency) * EVICTION_WEIGHTS.recency +
        frequency * EVICTION_WEIGHTS.relevance;

      if (score < lowestScore) {
        lowestScore = score;
        lowestId = id;
      }
    }

    if (lowestId) {
      this._store.delete(lowestId);
      this._accessOrder = this._accessOrder.filter(x => x !== lowestId);
    }
  }

  _touchLRU(id) {
    const idx = this._accessOrder.indexOf(id);
    if (idx !== -1) this._accessOrder.splice(idx, 1);
    this._accessOrder.push(id);
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  /**
   * Get memory status.
   */
  status() {
    return {
      entries: this._store.size,
      capacity: this.capacity,
      utilization: this._store.size / this.capacity,
      dimensions: this.dimensions,
      hasPersistence: !!this.persistence,
      hasEmbedFn: !!this.embedFn,
    };
  }

  /**
   * Get all entry IDs.
   * @returns {string[]}
   */
  ids() {
    return Array.from(this._store.keys());
  }

  /**
   * Clear all in-memory entries.
   */
  clear() {
    this._store.clear();
    this._accessOrder = [];
  }
}

module.exports = { VectorMemory, DEFAULT_DIM, DEFAULT_CAPACITY };
