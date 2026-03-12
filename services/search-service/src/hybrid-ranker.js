'use strict';

/**
 * HEADY™ Hybrid Ranker
 * HeadySystems Inc. - Proprietary
 * 
 * Combines text and vector search results using RRF and CSL gating
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

/**
 * HybridRanker - Combines text and vector search results
 */
class HybridRanker {
  constructor(options = {}) {
    this.k = options.k || 100; // Window size for RRF
    this.includeGate = options.includeGate || CSL.INCLUDE;
    this.boostMultiplier = options.boostMultiplier || PHI;
    this.domainBoost = options.domainBoost || PSI;
    this.textWeight = options.textWeight || 0.5;
    this.vectorWeight = options.vectorWeight || 0.5;
  }

  /**
   * Merge text and vector search results
   * @param {Array} textResults - Text search results
   * @param {Array} vectorResults - Vector search results
   * @param {Object} options - Ranking options
   * @returns {Array} Merged and ranked results
   */
  merge(textResults, vectorResults, options = {}) {
    const {
      domain = null,
      limit = FIB[7] // Top 13 results
    } = options;

    // Apply RRF (Reciprocal Rank Fusion)
    const scores = new Map();

    // Process text results
    textResults.forEach((result, rank) => {
      const docId = result.docId;
      const rrfScore = 1 / (this.k + rank + 1);
      const weightedScore = rrfScore * this.textWeight;

      scores.set(docId, (scores.get(docId) || 0) + weightedScore);
    });

    // Process vector results
    vectorResults.forEach((result, rank) => {
      const docId = result.docId;
      const rrfScore = 1 / (this.k + rank + 1);
      const weightedScore = rrfScore * this.vectorWeight;

      scores.set(docId, (scores.get(docId) || 0) + weightedScore);
    });

    // Build result map with metadata
    const resultMap = new Map();

    textResults.forEach(result => {
      if (!resultMap.has(result.docId)) {
        resultMap.set(result.docId, {
          docId: result.docId,
          document: result.document,
          metadata: result.document?.metadata || {},
          textScore: result.score,
          vectorScore: null,
          inBoth: false
        });
      }
    });

    vectorResults.forEach(result => {
      if (!resultMap.has(result.docId)) {
        resultMap.set(result.docId, {
          docId: result.docId,
          document: result.document,
          metadata: result.document?.metadata || {},
          textScore: null,
          vectorScore: result.score,
          inBoth: false
        });
      } else {
        resultMap.get(result.docId).vectorScore = result.score;
        resultMap.get(result.docId).inBoth = true;
      }
    });

    // Apply CSL gating filter
    const gatedResults = [];

    for (const [docId, rrfScore] of scores.entries()) {
      // CSL gate: only include results above gate threshold
      if (rrfScore < this.includeGate) {
        continue;
      }

      const resultData = resultMap.get(docId);
      let finalScore = rrfScore;

      // Boost multiplier for results in both result sets
      if (resultData.inBoth) {
        finalScore *= this.boostMultiplier;
      }

      // Domain-aware re-ranking
      if (domain && resultData.metadata.domain === domain) {
        finalScore *= (1 + this.domainBoost);
      }

      gatedResults.push({
        docId: docId,
        score: finalScore,
        rrfScore: rrfScore,
        textScore: resultData.textScore,
        vectorScore: resultData.vectorScore,
        inBoth: resultData.inBoth,
        document: resultData.document,
        metadata: resultData.metadata,
        domain: resultData.metadata.domain || null
      });
    }

    // Sort by final score and return top results
    gatedResults.sort((a, b) => b.score - a.score);

    return gatedResults.slice(0, limit);
  }

  /**
   * Advanced merge with CSL thresholds
   * @param {Array} textResults - Text search results
   * @param {Array} vectorResults - Vector search results
   * @param {Object} options - Advanced options
   * @returns {Array} Ranked results
   */
  advancedMerge(textResults, vectorResults, options = {}) {
    const {
      domain = null,
      limit = FIB[7],
      suppressGate = CSL.SUPPRESS,
      includeGate = CSL.INCLUDE,
      boostGate = CSL.BOOST,
      injectGate = CSL.INJECT,
      highGate = CSL.HIGH,
      criticalGate = CSL.CRITICAL
    } = options;

    const merged = this.merge(textResults, vectorResults, { domain, limit: limit * 2 });

    // Apply multi-level CSL gating
    const categorized = {
      critical: [],
      high: [],
      boost: [],
      inject: [],
      include: [],
      suppress: []
    };

    merged.forEach(result => {
      if (result.score >= criticalGate) {
        categorized.critical.push(result);
      } else if (result.score >= highGate) {
        categorized.high.push(result);
      } else if (result.score >= boostGate) {
        categorized.boost.push(result);
      } else if (result.score >= injectGate) {
        categorized.inject.push(result);
      } else if (result.score >= includeGate) {
        categorized.include.push(result);
      } else if (result.score >= suppressGate) {
        categorized.suppress.push(result);
      }
    });

    // Collect results in priority order
    const finalResults = [
      ...categorized.critical,
      ...categorized.high,
      ...categorized.boost,
      ...categorized.inject,
      ...categorized.include
    ].slice(0, limit);

    return finalResults;
  }

  /**
   * Rerank results based on custom criteria
   * @param {Array} results - Input results
   * @param {Function} rankingFunction - Custom ranking function
   * @returns {Array} Reranked results
   */
  customRerank(results, rankingFunction) {
    const reranked = results.map(result => ({
      ...result,
      customScore: rankingFunction(result)
    }));

    reranked.sort((a, b) => b.customScore - a.customScore);

    return reranked;
  }

  /**
   * Get normalized scores for results
   * @param {Array} results - Input results
   * @returns {Array} Results with normalized scores
   */
  normalizeScores(results) {
    if (results.length === 0) return [];

    const maxScore = Math.max(...results.map(r => r.score));
    const minScore = Math.min(...results.map(r => r.score));
    const range = maxScore - minScore;

    if (range === 0) {
      return results.map(r => ({
        ...r,
        normalizedScore: 0.5
      }));
    }

    return results.map(result => ({
      ...result,
      normalizedScore: (result.score - minScore) / range
    }));
  }

  /**
   * Analyze result distribution
   * @param {Array} results - Results to analyze
   * @returns {Object} Distribution analysis
   */
  analyzeDistribution(results) {
    if (results.length === 0) {
      return {
        count: 0,
        avgScore: 0,
        minScore: 0,
        maxScore: 0,
        stdDev: 0,
        distribution: {}
      };
    }

    const scores = results.map(r => r.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const variance = scores.reduce((sum, score) => {
      return sum + Math.pow(score - avgScore, 2);
    }, 0) / scores.length;

    const stdDev = Math.sqrt(variance);

    // Count results by CSL gate category
    const distribution = {
      critical: results.filter(r => r.score >= CSL.CRITICAL).length,
      high: results.filter(r => r.score >= CSL.HIGH && r.score < CSL.CRITICAL).length,
      boost: results.filter(r => r.score >= CSL.BOOST && r.score < CSL.HIGH).length,
      inject: results.filter(r => r.score >= CSL.INJECT && r.score < CSL.BOOST).length,
      include: results.filter(r => r.score >= CSL.INCLUDE && r.score < CSL.INJECT).length
    };

    return {
      count: results.length,
      avgScore: avgScore,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      stdDev: stdDev,
      distribution: distribution
    };
  }
}

module.exports = HybridRanker;
