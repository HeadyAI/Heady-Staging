/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ CSL ENGINE — Continuous Semantic Logic                   ║
 * ║  Geometric vector operations as logical gates                    ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║  60+ Provisional Patents — All Rights Reserved                   ║
 * ║  © 2026-2026 HeadySystems Inc.                                   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Domain: Unit vectors in ℝᴰ, D ∈ {384, 1536}
 * Truth value: τ(a,b) = cos(θ) ∈ [-1, +1]
 *   +1 = aligned (TRUE)
 *    0 = orthogonal (UNKNOWN)
 *   -1 = antipodal (FALSE)
 */

const { PHI, PSI, PSI_2, PSI_3, PSI_4, PSI_5, PSI_8, PSI_9, CSL_THRESHOLDS, phiThreshold, phiFusionWeights, cslGate, adaptiveTemperature, fib, } = (function() { try { return require("./phi-math.js"); } catch(e) { return {}; } })();

// ─── VECTOR OPERATIONS ───────────────────────────────────────────────────────

/**
 * Compute dot product of two vectors.
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {number}
 */
function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Compute L2 norm (magnitude) of a vector.
 * @param {Float64Array|number[]} v
 * @returns {number}
 */
function norm(v) {
  return Math.sqrt(dot(v, v));
}

/**
 * Normalize a vector to unit length.
 * @param {Float64Array|number[]} v
 * @returns {Float64Array}
 */
function normalize(v) {
  const n = norm(v);
  if (n === 0) return new Float64Array(v.length);
  const result = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) result[i] = v[i] / n;
  return result;
}

// ─── CSL GATE OPERATIONS ─────────────────────────────────────────────────────

/**
 * CSL AND — Cosine similarity (semantic alignment measure).
 * AND(a, b) = cos(θ) = (a·b) / (‖a‖·‖b‖)
 *
 * Properties: commutative, associative (in the limit)
 *
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {number} Cosine similarity ∈ [-1, +1]
 */
function cslAND(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

/**
 * CSL OR — Superposition (soft union).
 * OR(a, b) = normalize(a + b)
 *
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {Float64Array} Normalized superposition
 */
function cslOR(a, b) {
  const result = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) result[i] = a[i] + b[i];
  return normalize(result);
}

/**
 * CSL NOT — Orthogonal projection (semantic negation).
 * NOT(a, b) = a - proj_b(a) = a - (a·b / ‖b‖²)·b
 *
 * Properties: idempotent (NOT(NOT(a,b),b) = NOT(a,b)), orthogonal (NOT(a,b)·b = 0)
 *
 * @param {Float64Array|number[]} a - Vector to negate relative to b
 * @param {Float64Array|number[]} b - Reference direction
 * @returns {Float64Array} Component of a orthogonal to b
 */
function cslNOT(a, b) {
  const bb = dot(b, b);
  if (bb === 0) return new Float64Array(a);
  const scale = dot(a, b) / bb;
  const result = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) result[i] = a[i] - scale * b[i];
  return result;
}

/**
 * CSL IMPLY — Projection (component of a in direction of b).
 * IMPLY(a, b) = proj_b(a) = (a·b / ‖b‖²)·b
 *
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {Float64Array}
 */
function cslIMPLY(a, b) {
  const bb = dot(b, b);
  if (bb === 0) return new Float64Array(a.length);
  const scale = dot(a, b) / bb;
  const result = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) result[i] = scale * b[i];
  return result;
}

/**
 * CSL XOR — Exclusive components (what's unique to each vector).
 * XOR(a, b) = normalize(a + b) - proj_mutual
 *
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {Float64Array}
 */
function cslXOR(a, b) {
  const union = cslOR(a, b);
  const mutual = cslIMPLY(union, a.length === b.length ? a : b);
  const result = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) result[i] = union[i] - mutual[i];
  return normalize(result);
}

/**
 * CSL CONSENSUS — Weighted centroid (agent agreement).
 * CONSENSUS(vectors, weights) = Σ(wᵢ·vᵢ) / ‖Σ(wᵢ·vᵢ)‖
 *
 * @param {Array<Float64Array|number[]>} vectors - Agent opinion vectors
 * @param {number[]} [weights] - Agent weights (defaults to phiFusionWeights)
 * @returns {Float64Array} Consensus vector
 */
function cslCONSENSUS(vectors, weights) {
  if (vectors.length === 0) return new Float64Array(0);
  const w = weights || phiFusionWeights(vectors.length);
  const dim = vectors[0].length;
  const result = new Float64Array(dim);
  for (let i = 0; i < vectors.length; i++) {
    for (let j = 0; j < dim; j++) {
      result[j] += w[i] * vectors[i][j];
    }
  }
  return normalize(result);
}

/**
 * CSL GATE — Soft sigmoid gating.
 * GATE(value, cosScore, τ, temp) = value × σ((cosScore - τ) / temp)
 *
 * @param {number} value - Value to gate
 * @param {number} cosScore - Cosine similarity score
 * @param {number} [tau=CSL_THRESHOLDS.MINIMUM] - Gate threshold
 * @param {number} [temperature=PSI_3] - Temperature (ψ³ ≈ 0.236)
 * @returns {number}
 */
export { cslGate as cslGATE } from './phi-math.js';

// ─── TERNARY LOGIC ───────────────────────────────────────────────────────────

/** Ternary logic modes */
const TERNARY_MODES = Object.freeze({
  KLEENE_K3:   'kleene_k3',
  LUKASIEWICZ: 'lukasiewicz',
  GODEL:       'godel',
  PRODUCT:     'product',
  CSL:         'csl_continuous',
});

/**
 * Ternary truth value classification.
 * Maps continuous cosine similarity to TRUE/UNKNOWN/FALSE.
 *
 * Phi-derived thresholds:
 *   cos ≥ ψ (0.618)  → TRUE
 *   cos ≤ -ψ (-0.618) → FALSE
 *   otherwise         → UNKNOWN
 *
 * @param {number} cosScore
 * @returns {'TRUE'|'UNKNOWN'|'FALSE'}
 */
function ternaryClassify(cosScore) {
  if (cosScore >= PSI) return 'TRUE';        // ≥ 0.618 (φ⁻¹)
  if (cosScore <= -PSI) return 'FALSE';      // ≤ -0.618
  return 'UNKNOWN';
}

/**
 * Ternary AND operation (Kleene K3 in continuous space).
 * @param {number} a - Truth value [-1, +1]
 * @param {number} b - Truth value [-1, +1]
 * @param {string} [mode='csl_continuous']
 * @returns {number}
 */
function ternaryAND(a, b, mode = TERNARY_MODES.CSL) {
  switch (mode) {
    case TERNARY_MODES.KLEENE_K3:   return Math.min(a, b);
    case TERNARY_MODES.LUKASIEWICZ: return Math.max(-1, a + b - 1);
    case TERNARY_MODES.GODEL:       return Math.min(a, b);
    case TERNARY_MODES.PRODUCT:     return a * b;
    case TERNARY_MODES.CSL:
    default:                         return a * b; // Geometric product
  }
}

/**
 * Ternary OR operation.
 * @param {number} a
 * @param {number} b
 * @param {string} [mode='csl_continuous']
 * @returns {number}
 */
function ternaryOR(a, b, mode = TERNARY_MODES.CSL) {
  switch (mode) {
    case TERNARY_MODES.KLEENE_K3:   return Math.max(a, b);
    case TERNARY_MODES.LUKASIEWICZ: return Math.min(1, a + b + 1);
    case TERNARY_MODES.GODEL:       return Math.max(a, b);
    case TERNARY_MODES.PRODUCT:     return a + b - a * b;
    case TERNARY_MODES.CSL:
    default:                         return (a + b) / (1 + a * b || 1);
  }
}

/**
 * Ternary NOT operation.
 * @param {number} a
 * @returns {number}
 */
function ternaryNOT(a) {
  return -a;
}

// ─── MIXTURE OF EXPERTS (CSL-BASED ROUTER) ───────────────────────────────────

/**
 * CSL-based Mixture of Experts router.
 * Routes input to top-K experts using cosine similarity instead of learned weights.
 *
 * Configuration uses phi-math constants:
 *   - Temperature: PSI_3 ≈ 0.236 (adaptive via entropy)
 *   - Anti-collapse weight: PSI_8 ≈ 0.0131
 *   - Collapse detection: PSI_9 ≈ 0.0081
 *   - Top-K: fib(3) = 2
 */
class CSLMoERouter {
  /**
   * @param {number} numExperts - Number of experts
   * @param {number} inputDim - Input vector dimension
   */
  constructor(numExperts, inputDim) {
    this.numExperts = numExperts;
    this.inputDim = inputDim;
    this.topK = fib(3); // 2
    this.temperature = PSI_3;
    this.antiCollapseWeight = PSI_8;
    this.collapseThreshold = PSI_9;

    // Initialize expert gate vectors with phi-scaled random values
    this.expertGates = Array.from({ length: numExperts }, () => {
      const gate = new Float64Array(inputDim);
      for (let i = 0; i < inputDim; i++) {
        gate[i] = (Math.random() - PSI) * PHI;
      }
      return normalize(gate);
    });

    // Expert usage tracking for load balancing
    this.usageCounts = new Float64Array(numExperts);
  }

  /**
   * Route an input to the top-K experts.
   * @param {Float64Array|number[]} input - Input vector
   * @param {number} [entropy=0] - Current entropy for adaptive temperature
   * @param {number} [maxEntropy=1] - Maximum entropy
   * @returns {{ expertIndices: number[], weights: number[], scores: number[] }}
   */
  route(input, entropy = 0, maxEntropy = 1) {
    // Compute cosine similarity with each expert gate
    const scores = this.expertGates.map(gate => cslAND(input, gate));

    // Adaptive temperature based on entropy
    const temp = entropy > 0
      ? adaptiveTemperature(entropy, maxEntropy)
      : this.temperature;

    // Softmax with temperature
    const expScores = scores.map(s => Math.exp(s / temp));
    const expSum = expScores.reduce((a, b) => a + b, 0);
    const probs = expScores.map(s => s / expSum);

    // Add anti-collapse regularization
    const minProb = Math.min(...probs);
    if (minProb < this.collapseThreshold) {
      const uniform = 1 / this.numExperts;
      for (let i = 0; i < probs.length; i++) {
        probs[i] = (1 - this.antiCollapseWeight) * probs[i] +
                   this.antiCollapseWeight * uniform;
      }
    }

    // Select top-K experts
    const indexed = probs.map((p, i) => ({ prob: p, index: i, score: scores[i] }));
    indexed.sort((a, b) => b.prob - a.prob);
    const selected = indexed.slice(0, this.topK);

    // Renormalize selected weights
    const selectedSum = selected.reduce((a, s) => a + s.prob, 0);
    const weights = selected.map(s => s.prob / selectedSum);

    // Update usage tracking
    selected.forEach(s => this.usageCounts[s.index]++);

    return {
      expertIndices: selected.map(s => s.index),
      weights,
      scores: selected.map(s => s.score),
    };
  }

  /**
   * Get load balance score (lower = more balanced).
   * @returns {number} Coefficient of variation of usage counts.
   */
  getLoadBalanceScore() {
    const mean = this.usageCounts.reduce((a, b) => a + b, 0) / this.numExperts;
    if (mean === 0) return 0;
    const variance = this.usageCounts.reduce((a, c) => a + Math.pow(c - mean, 2), 0) / this.numExperts;
    return Math.sqrt(variance) / mean;
  }
}

// ─── HDC / VSA OPERATIONS ────────────────────────────────────────────────────

/**
 * Hyperdimensional Computing (HDC) / Vector Symbolic Architecture (VSA) operations.
 * Supports Binary BSC, Bipolar MAP, and Real HRR vector families.
 */

/**
 * HDC BIND — Create compositional representation.
 * For real-valued vectors: element-wise multiplication.
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {Float64Array}
 */
function hdcBind(a, b) {
  const result = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) result[i] = a[i] * b[i];
  return result;
}

/**
 * HDC BUNDLE — Aggregate (consensus/similarity).
 * Element-wise sum + normalize.
 * @param {Array<Float64Array|number[]>} vectors
 * @returns {Float64Array}
 */
function hdcBundle(vectors) {
  if (vectors.length === 0) return new Float64Array(0);
  const dim = vectors[0].length;
  const result = new Float64Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) result[i] += v[i];
  }
  return normalize(result);
}

/**
 * HDC PERMUTE — Sequence encoding via cyclic shift.
 * @param {Float64Array|number[]} v
 * @param {number} n - Shift amount
 * @returns {Float64Array}
 */
function hdcPermute(v, n) {
  const dim = v.length;
  const shift = ((n % dim) + dim) % dim;
  const result = new Float64Array(dim);
  for (let i = 0; i < dim; i++) {
    result[(i + shift) % dim] = v[i];
  }
  return result;
}

/**
 * Estimated capacity at D dimensions.
 * Analytical estimate: ~D/4 items at D=384 → ~96.
 * @param {number} dim
 * @returns {number}
 */
function hdcCapacity(dim) {
  return Math.floor(dim / 4);
}

// ─── SEMANTIC DEDUPLICATION ──────────────────────────────────────────────────

/**
 * Check if two vectors are semantically identical (duplicates).
 * Uses CSL_THRESHOLDS.CRITICAL (≈ 0.927) as the dedup threshold.
 *
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @param {number} [threshold=CSL_THRESHOLDS.CRITICAL]
 * @returns {boolean}
 */
function isSemanticDuplicate(a, b, threshold = CSL_THRESHOLDS.CRITICAL) {
  return cslAND(a, b) >= threshold;
}

// ─── CSL SCORING UTILITIES ───────────────────────────────────────────────────

/**
 * Multi-criteria CSL scoring with phi-weighted factors.
 * Used by JUDGE stage, Arena Battle, and optimization ranking.
 *
 * Default weights (5 criteria): [0.387, 0.239, 0.148, 0.092, 0.057]
 * Maps to: correctness (34%), safety (21%), performance (21%), quality (13%), elegance (11%)
 *
 * @param {Object} scores - Criteria scores
 * @param {number} scores.correctness
 * @param {number} scores.safety
 * @param {number} scores.performance
 * @param {number} scores.quality
 * @param {number} scores.elegance
 * @returns {number} Composite score
 */
function cslCompositeScore(scores) {
  const factors = [
    scores.correctness || 0,
    scores.safety || 0,
    scores.performance || 0,
    scores.quality || 0,
    scores.elegance || 0,
  ];
  const weights = phiFusionWeights(5);
  return factors.reduce((sum, f, i) => sum + f * weights[i], 0);
}

/**
 * CSL trial scoring weights (for trial-and-error stage).
 * Matches hcfullpipeline.yaml cslScoringWeights.
 */
const TRIAL_SCORING_WEIGHTS = Object.freeze({
  correctness:         0.34,  // F(9)/100
  performance:         0.21,  // F(8)/100
  safety:              0.21,  // F(8)/100
  elegance:            0.13,  // F(7)/100
  resource_efficiency: 0.11,  // ~F(6.5)/100 → F(7)-F(3)=11
});

/**
 * CSL optimization scoring weights (for optimization ops stage).
 */
const OPTIMIZATION_SCORING_WEIGHTS = Object.freeze({
  cost:        PSI_2,  // 0.382
  performance: PSI_2,  // 0.382
  reliability: PSI_3,  // 0.236
});

/**
 * CSL evolution fitness weights.
 */
const EVOLUTION_FITNESS_WEIGHTS = Object.freeze({
  latency_improvement:     0.34,
  cost_reduction:          0.21,
  quality_improvement:     0.21,
  reliability_improvement: 0.13,
  elegance_improvement:    0.11,
});

module.exports = {
  // Vector operations
  dot, norm, normalize,

  // CSL gates
  cslAND, cslOR, cslNOT, cslIMPLY, cslXOR, cslCONSENSUS,

  // Ternary logic
  TERNARY_MODES, ternaryClassify, ternaryAND, ternaryOR, ternaryNOT,

  // MoE Router
  CSLMoERouter,

  // HDC/VSA
  hdcBind, hdcBundle, hdcPermute, hdcCapacity,

  // Deduplication
  isSemanticDuplicate,

  // Scoring
  cslCompositeScore, TRIAL_SCORING_WEIGHTS,
  OPTIMIZATION_SCORING_WEIGHTS, EVOLUTION_FITNESS_WEIGHTS,
};
