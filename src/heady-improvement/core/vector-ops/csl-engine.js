/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * CSL Engine — Continuous Semantic Logic operations.
 * Implements CSL gates as vector space operations replacing boolean logic.
 *
 * CSL Operations:
 *   AND  (cosine similarity)     — semantic conjunction
 *   OR   (superposition blend)   — semantic disjunction
 *   NOT  (orthogonal projection) — semantic negation
 *   GATE (sigmoid activation)    — soft threshold gate
 *   XOR  (symmetric difference)  — semantic mutual exclusion
 *
 * All operations work on 384D normalized vectors.
 * 60+ provisional patents by HeadySystems Inc.
 *
 * Founder: Eric Haywood
 * @module core/vector-ops/csl-engine
 */

import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,
  cslGate,
  cslBlend,
} from '@heady/phi-math-foundation';

const DIM = 384;

// ── Fundamental Vector Operations ──────────────────────────────────

/**
 * Normalize a vector to unit length.
 * @param {Float64Array|number[]} v
 * @returns {Float64Array}
 */
function normalize(v) {
  const out = new Float64Array(v.length);
  let mag = 0;
  for (let i = 0; i < v.length; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag);
  if (mag === 0) return out;
  for (let i = 0; i < v.length; i++) out[i] = v[i] / mag;
  return out;
}

/**
 * Dot product of two vectors.
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {number}
 */
function dot(a, b) {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Magnitude of a vector.
 * @param {Float64Array|number[]} v
 * @returns {number}
 */
function magnitude(v) {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

// ── CSL Gate Operations ────────────────────────────────────────────

/**
 * CSL AND — Cosine similarity (semantic conjunction).
 * Returns a scalar ∈ [-1, 1] representing how aligned two concepts are.
 *
 * @param {Float64Array|number[]} a - First vector
 * @param {Float64Array|number[]} b - Second vector
 * @returns {number} Cosine similarity
 */
function cslAND(a, b) {
  const d = dot(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return d / (magA * magB);
}

/**
 * CSL OR — Superposition blend (semantic disjunction).
 * Produces a vector that captures both concepts.
 *
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @param {number} [weight=0.5] - Blend weight (0=all a, 1=all b, PSI=golden)
 * @returns {Float64Array} Blended and normalized vector
 */
function cslOR(a, b, weight = PSI) {
  const dim = a.length;
  const out = new Float64Array(dim);
  const wa = 1 - weight;
  const wb = weight;
  for (let i = 0; i < dim; i++) {
    out[i] = a[i] * wa + b[i] * wb;
  }
  return normalize(out);
}

/**
 * CSL NOT — Orthogonal projection (semantic negation).
 * Removes the component of b from a, leaving only what is
 * orthogonal to b. The result is "a without b".
 *
 * @param {Float64Array|number[]} a - Vector to negate from
 * @param {Float64Array|number[]} b - Concept to remove
 * @returns {Float64Array} a projected orthogonal to b
 */
function cslNOT(a, b) {
  const dim = a.length;
  const bNorm = normalize(b);
  const projection = dot(a, bNorm);

  const out = new Float64Array(dim);
  for (let i = 0; i < dim; i++) {
    out[i] = a[i] - projection * bNorm[i];
  }
  return normalize(out);
}

/**
 * CSL IMPLY — Projection (semantic implication).
 * Projects a onto the direction of b.
 * "If a then b" = the component of a in b's direction.
 *
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {Float64Array}
 */
function cslIMPLY(a, b) {
  const dim = a.length;
  const bNorm = normalize(b);
  const projection = dot(a, bNorm);

  const out = new Float64Array(dim);
  for (let i = 0; i < dim; i++) {
    out[i] = projection * bNorm[i];
  }
  return out;
}

/**
 * CSL XOR — Symmetric difference (semantic mutual exclusion).
 * What's unique to a + what's unique to b, without overlap.
 *
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {Float64Array}
 */
function cslXOR(a, b) {
  // XOR = (a NOT b) OR (b NOT a)
  const aNotB = cslNOT(a, b);
  const bNotA = cslNOT(b, a);
  return cslOR(aNotB, bNotA, 0.5);
}

/**
 * CSL CONSENSUS — Multi-vector agreement.
 * Finds the consensus direction of N vectors using iterative averaging.
 *
 * @param {Array<Float64Array|number[]>} vectors
 * @returns {Float64Array} Consensus vector
 */
function cslCONSENSUS(vectors) {
  if (vectors.length === 0) return new Float64Array(DIM);
  if (vectors.length === 1) return normalize(vectors[0]);

  const dim = vectors[0].length;
  const avg = new Float64Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) avg[i] += v[i];
  }
  for (let i = 0; i < dim; i++) avg[i] /= vectors.length;
  return normalize(avg);
}

/**
 * CSL GATE — Sigmoid soft threshold.
 * output = value × σ((cosScore − τ) / temperature)
 *
 * @param {number} value - Input value
 * @param {number} cosScore - Cosine similarity score
 * @param {number} [tau=CSL_THRESHOLDS.MEDIUM] - Threshold
 * @param {number} [temperature=0.1] - Softness (lower = harder gate)
 * @returns {number} Gated value
 */
function cslGATE(value, cosScore, tau = CSL_THRESHOLDS.MEDIUM, temperature = 0.1) {
  return cslGate(value, cosScore, tau, temperature);
}

/**
 * CSL BLEND — Smooth weight interpolation.
 *
 * @param {number} weightHigh
 * @param {number} weightLow
 * @param {number} cosScore
 * @param {number} [tau=CSL_THRESHOLDS.MEDIUM]
 * @returns {number}
 */
function cslBLEND(weightHigh, weightLow, cosScore, tau = CSL_THRESHOLDS.MEDIUM) {
  return cslBlend(weightHigh, weightLow, cosScore, tau);
}

// ── Spatial Operations ─────────────────────────────────────────────

/**
 * Top-K nearest vectors by cosine similarity.
 * @param {Float64Array|number[]} query
 * @param {Array<{id: string, vector: Float64Array}>} candidates
 * @param {number} [k=10]
 * @returns {Array<{id: string, score: number}>}
 */
function topK(query, candidates, k = 10) {
  const scored = candidates.map(c => ({
    id: c.id,
    score: cslAND(query, c.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/**
 * Interpolate between two vectors (SLERP).
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @param {number} t - Interpolation factor [0, 1]
 * @returns {Float64Array}
 */
function slerp(a, b, t) {
  const aNorm = normalize(a);
  const bNorm = normalize(b);

  let cosTheta = dot(aNorm, bNorm);
  // Clamp to avoid NaN from acos
  cosTheta = Math.max(-1, Math.min(1, cosTheta));
  const theta = Math.acos(cosTheta);

  if (theta < 1e-10) {
    // Vectors nearly identical, linear interp
    return cslOR(aNorm, bNorm, t);
  }

  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;

  const dim = aNorm.length;
  const out = new Float64Array(dim);
  for (let i = 0; i < dim; i++) {
    out[i] = wa * aNorm[i] + wb * bNorm[i];
  }
  return normalize(out);
}

/**
 * Rotate a vector by angle in a given plane.
 * @param {Float64Array|number[]} v
 * @param {number} axisA - First axis index
 * @param {number} axisB - Second axis index
 * @param {number} angle - Radians
 * @returns {Float64Array}
 */
function rotate(v, axisA, axisB, angle) {
  const out = new Float64Array(v);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  out[axisA] = v[axisA] * cos - v[axisB] * sin;
  out[axisB] = v[axisA] * sin + v[axisB] * cos;
  return out;
}

/**
 * Project a high-dimensional vector down to fewer dimensions.
 * @param {Float64Array|number[]} v
 * @param {number} targetDim
 * @returns {Float64Array}
 */
function reduceDimensions(v, targetDim) {
  if (v.length <= targetDim) {
    const out = new Float64Array(targetDim);
    for (let i = 0; i < v.length; i++) out[i] = v[i];
    return out;
  }

  // Simple truncation (MRL-style Matryoshka Representation Learning)
  const out = new Float64Array(targetDim);
  for (let i = 0; i < targetDim; i++) out[i] = v[i];
  return normalize(out);
}

export {
  // Fundamental
  normalize,
  dot,
  magnitude,

  // CSL Gates
  cslAND,
  cslOR,
  cslNOT,
  cslIMPLY,
  cslXOR,
  cslCONSENSUS,
  cslGATE,
  cslBLEND,

  // Spatial
  topK,
  slerp,
  rotate,
  reduceDimensions,

  // Constants
  DIM,
};
