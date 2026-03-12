'use strict';

/**
 * HEADY™ Vector Search Engine
 * HeadySystems Inc. - Proprietary
 * 
 * In-memory vector similarity search with cosine distance
 */

// φ-scaled constants
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// CSL Gates
const CSL = {
  SUPPRESS: 0.236,
  INCLUDE: 0.382,
  BOOST: 0.618,
  INJECT: 0.718,
  HIGH: 0.882,
  CRITICAL: 0.927
};

// Vector configuration
const VECTOR_DIM = 384;

/**
 * VectorSearch - In-memory vector similarity search
 * Uses cosine similarity with 384-dimensional embeddings
 */
class VectorSearch {
  constructor() {
    this.vectors = new Map();
    this.vectorDim = VECTOR_DIM;
  }

  /**
   * Add or update a vector
   * @param {string} docId - Document identifier
   * @param {Float64Array} embedding - 384-dimensional vector
   * @param {Object} metadata - Associated metadata
   */
  addVector(docId, embedding, metadata = {}) {
    // Validate embedding
    if (!embedding || embedding.length !== this.vectorDim) {
      throw new Error(`Vector must be ${this.vectorDim}-dimensional, got ${embedding?.length || 0}`);
    }

    // Normalize vector to unit length
    const normalized = this._normalize(embedding);

    this.vectors.set(docId, {
      embedding: normalized,
      metadata: metadata,
      timestamp: Date.now(),
      norm: this._getVectorNorm(embedding)
    });
  }

  /**
   * Remove vector from index
   * @param {string} docId - Document identifier
   */
  removeVector(docId) {
    this.vectors.delete(docId);
  }

  /**
   * Search for similar vectors
   * @param {Float64Array} queryVector - Query vector
   * @param {Object} options - Search options
   * @returns {Array} Ranked results
   */
  search(queryVector, options = {}) {
    const {
      k = FIB[7], // Default top 13 results
      threshold = CSL.SUPPRESS,
      earlyTermination = true
    } = options;

    // Validate query vector
    if (!queryVector || queryVector.length !== this.vectorDim) {
      return [];
    }

    // Normalize query vector
    const normalizedQuery = this._normalize(queryVector);

    const scores = [];

    // Linear scan over all vectors
    for (const [docId, data] of this.vectors.entries()) {
      const similarity = this._cosineSimilarity(normalizedQuery, data.embedding);

      // Early termination if score drops below threshold
      if (earlyTermination && similarity < threshold) {
        continue;
      }

      scores.push({
        docId: docId,
        score: similarity,
        metadata: data.metadata,
        type: 'vector'
      });
    }

    // Sort by similarity score (descending)
    scores.sort((a, b) => b.score - a.score);

    // Return top-k results
    return scores.slice(0, k);
  }

  /**
   * Multi-vector search (ensemble)
   * Average similarities across multiple query vectors
   * @param {Array<Float64Array>} queryVectors - Multiple query vectors
   * @param {Object} options - Search options
   * @returns {Array} Ranked results
   */
  multiSearch(queryVectors, options = {}) {
    const {
      k = FIB[7],
      threshold = CSL.SUPPRESS,
      weights = null
    } = options;

    if (!queryVectors || queryVectors.length === 0) return [];

    // Use uniform weights if not provided
    const w = weights || queryVectors.map(() => 1 / queryVectors.length);

    const aggregatedScores = new Map();

    // Normalize and average scores across queries
    queryVectors.forEach((qv, idx) => {
      const results = this.search(qv, { k: this.vectors.size, threshold: 0 });
      results.forEach(({ docId, score }) => {
        const weighted = score * w[idx];
        aggregatedScores.set(docId, (aggregatedScores.get(docId) || 0) + weighted);
      });
    });

    // Filter by threshold and sort
    const results = Array.from(aggregatedScores.entries())
      .filter(([_, score]) => score >= threshold)
      .map(([docId, score]) => {
        const data = this.vectors.get(docId);
        return {
          docId: docId,
          score: score,
          metadata: data.metadata,
          type: 'vector-ensemble'
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return results;
  }

  /**
   * Range search - all vectors within distance threshold
   * @param {Float64Array} queryVector - Query vector
   * @param {number} threshold - Distance threshold (0-1)
   * @returns {Array} All matching documents
   */
  rangeSearch(queryVector, threshold = CSL.INCLUDE) {
    if (!queryVector || queryVector.length !== this.vectorDim) {
      return [];
    }

    const normalizedQuery = this._normalize(queryVector);
    const results = [];

    for (const [docId, data] of this.vectors.entries()) {
      const similarity = this._cosineSimilarity(normalizedQuery, data.embedding);

      if (similarity >= threshold) {
        results.push({
          docId: docId,
          score: similarity,
          metadata: data.metadata,
          type: 'vector-range'
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Cosine similarity between two vectors
   * @param {Float64Array} v1 - First vector (normalized)
   * @param {Float64Array} v2 - Second vector (normalized)
   * @returns {number} Similarity score (0-1)
   */
  _cosineSimilarity(v1, v2) {
    let dotProduct = 0;

    for (let i = 0; i < this.vectorDim; i++) {
      dotProduct += v1[i] * v2[i];
    }

    // Vectors are pre-normalized, so dot product is the similarity
    return Math.max(0, Math.min(1, dotProduct));
  }

  /**
   * Normalize vector to unit length
   * @param {Float64Array} vector - Vector to normalize
   * @returns {Float64Array} Normalized vector
   */
  _normalize(vector) {
    const norm = this._getVectorNorm(vector);

    if (norm === 0) {
      // Return zero vector if magnitude is 0
      return new Float64Array(this.vectorDim);
    }

    const normalized = new Float64Array(this.vectorDim);
    for (let i = 0; i < this.vectorDim; i++) {
      normalized[i] = vector[i] / norm;
    }

    return normalized;
  }

  /**
   * Get Euclidean norm of vector
   * @param {Float64Array} vector - Vector
   * @returns {number} Norm (L2)
   */
  _getVectorNorm(vector) {
    let sum = 0;

    for (let i = 0; i < vector.length; i++) {
      sum += vector[i] * vector[i];
    }

    return Math.sqrt(sum);
  }

  /**
   * Get index statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      vectorCount: this.vectors.size,
      vectorDimension: this.vectorDim,
      memoryMB: (this.vectors.size * this.vectorDim * 8) / (1024 * 1024)
    };
  }

  /**
   * Batch add vectors
   * @param {Array} batch - Array of {docId, embedding, metadata}
   */
  addBatch(batch) {
    batch.forEach(({ docId, embedding, metadata }) => {
      this.addVector(docId, embedding, metadata);
    });
  }
}

module.exports = VectorSearch;
