// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY SYSTEMS — Phi Helpers Bridge                            ║
// ║  ∞ Extends heady-phi-constants with derived utilities          ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

'use strict';

// ─── RE-EXPORT CANONICAL CONSTANTS ─────────────────────────────────────────
const phiConstants = require('../heady-phi-constants');  // src/lib/ -> src/heady-phi-constants
const {
  PHI, PSI, PHI_SQUARED, PHI_CUBED,
  FIB, CSL, POOLS,
  MEMORY_TIERS, CACHE_TTLS, HNSW,
  phiBackoff, confidenceToPool, phiDistribute, fibQuantize,
} = phiConstants;

// ─── ALIASES (match naming conventions used by subsystems) ─────────────────

/** Alias: FIB_SEQUENCE === FIB array */
const FIB_SEQUENCE = FIB;

/** Alias: CSL_THRESHOLDS === CSL object */
const CSL_THRESHOLDS = CSL;

/** Vector dimensions from HNSW config — 384 = 6 × 64 (phi-adjacent: 6=FIB[6+1]) */
const VECTOR_DIMENSIONS = HNSW.DIMENSIONS;

// ─── DERIVED FUNCTIONS ─────────────────────────────────────────────────────

/**
 * fib(n) — Return the nth Fibonacci number.
 * Uses the cached FIB array for n <= 20, computes via Binet's formula beyond.
 * @param {number} n — Index (0-based)
 * @returns {number}
 */
function fib(n) {
  if (n < 0) return 0;
  if (n < FIB.length) return FIB[n];
  // Binet's formula for larger n (phi-derived, naturally)
  return Math.round((Math.pow(PHI, n) - Math.pow(-PSI, n)) / Math.sqrt(5));
}

/**
 * phiMs(n) — PHI^n scaled to milliseconds.
 * Formula: PHI^n × 1000
 * @param {number} n — Exponent
 * @returns {number} Milliseconds
 */
function phiMs(n) {
  return Math.pow(PHI, n) * 1000;
}

/**
 * PHI_TIMING — Canonical timing tiers derived from phi.
 *
 * TICK   = 1000ms                         (base unit)
 * PULSE  = PHI × 1000 ≈ 1618ms           (golden pulse)
 * CYCLE  = PHI^3 × 1000 ≈ 4236ms ×~6.85 (actually PHI^(fib(4))×1000 ≈ 29034ms? No.)
 *
 * Recalculated from phi:
 *   TICK   = 1000                        — 1s base
 *   PULSE  = round(PHI * 1000) = 1618    — golden pulse
 *   CYCLE  = round(PHI^3 * 1000) ≈ 4236  — triple-phi cycle (~4.2s)
 *   TIDE   = round(PHI^5 * 1000) ≈ 11090 — phi-5 tide (~11s)
 */
const PHI_TIMING = Object.freeze({
  TICK:  1000,                                   // 1s — base unit
  PULSE: Math.round(PHI * 1000),                 // ~1618ms
  CYCLE: Math.round(Math.pow(PHI, FIB[5]) * 1000), // PHI^5 ≈ 11090ms
  TIDE:  Math.round(Math.pow(PHI, FIB[7]) * 1000), // PHI^13 ≈ 521002ms (~8.7min)
});

/**
 * cosineSimilarity(a, b) — Compute cosine similarity between two vectors.
 * Returns a value in [-1, 1]. Handles zero-magnitude gracefully.
 *
 * @param {number[]} a — First vector
 * @param {number[]} b — Second vector
 * @returns {number} Cosine similarity
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * placeholderVector(seed, dims) — Generate a deterministic pseudo-embedding
 * from a string seed. Uses a phi-derived hash to produce consistent vectors.
 *
 * Not a real embedding — used as a structural placeholder until actual model
 * embeddings are wired in. Deterministic: same seed always yields same vector.
 *
 * @param {string} seed — Input string to hash
 * @param {number} [dims=384] — Vector dimensionality (default HNSW.DIMENSIONS)
 * @returns {number[]} Normalized vector of length `dims`
 */
function placeholderVector(seed, dims) {
  dims = dims || VECTOR_DIMENSIONS;
  const str = String(seed || '');
  // Simple deterministic hash-based vector generation
  // Uses phi-derived constants for mixing
  const vec = new Array(dims);
  let h = FIB[7]; // seed with fib(7) = 13
  for (let i = 0; i < dims; i++) {
    // Hash mixing: combine char codes with phi-scaled index
    const charCode = str.charCodeAt(i % (str.length || 1)) || FIB[3];
    h = ((h * FIB[10] + charCode * FIB[8] + i * FIB[6]) & 0x7FFFFFFF);
    // Map to [-1, 1] range using phi normalization
    vec[i] = ((h % FIB[17]) / FIB[17]) * 2 - 1;
    // Apply phi-scaled rotation
    h = ((h >>> FIB[4]) ^ (h << FIB[3])) & 0x7FFFFFFF;
  }
  // L2-normalize the vector
  let mag = 0;
  for (let i = 0; i < dims; i++) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag);
  if (mag > 0) {
    for (let i = 0; i < dims; i++) vec[i] /= mag;
  }
  return vec;
}

/**
 * phiFusionWeights(n) — Generate n weights that sum to 1.0,
 * each weight proportional to PSI^i (golden ratio decay).
 *
 * The first weight is largest (most important), subsequent weights
 * decay by the golden ratio. Perfectly sums to 1.0.
 *
 * @param {number} n — Number of weights
 * @returns {number[]} Array of n weights summing to 1.0
 */
function phiFusionWeights(n) {
  if (n <= 0) return [];
  if (n === 1) return [1.0];
  const raw = new Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    raw[i] = Math.pow(PSI, i);
    total += raw[i];
  }
  // Normalize to sum to 1.0
  return raw.map(w => w / total);
}

/**
 * phiBackoffWithJitter(attempt, baseMs) — Exponential backoff using phi
 * as the growth factor, with PSI-scaled jitter. Same as phiBackoff from
 * phi-constants but guaranteed to include jitter component.
 *
 * @param {number} attempt — Attempt number (0-based)
 * @param {number} [baseMs=1000] — Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function phiBackoffWithJitter(attempt, baseMs) {
  baseMs = baseMs || 1000;
  const delay = Math.pow(PHI, attempt) * baseMs;
  // Jitter: ±PSI/2 of the delay
  const jitter = delay * PSI * (Math.random() - 0.5);
  // Cap at FIB[9] seconds = 34s
  return Math.min(delay + jitter, FIB[9] * 1000);
}

/**
 * cslGate(score) — Map a numeric score to a CSL gate level string.
 * @param {number} score — Confidence/coherence score [0, 1]
 * @returns {string} Gate level: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'MINIMUM'|'BELOW_MINIMUM'
 */
function cslGate(score) {
  if (score >= CSL.CRITICAL) return 'CRITICAL';
  if (score >= CSL.HIGH) return 'HIGH';
  if (score >= CSL.MEDIUM) return 'MEDIUM';
  if (score >= CSL.LOW) return 'LOW';
  if (score >= CSL.MINIMUM) return 'MINIMUM';
  return 'BELOW_MINIMUM';
}

/**
 * cslBlend(scores, weights) — Weighted blend of CSL scores.
 * If no weights given, uses phiFusionWeights.
 *
 * @param {number[]} scores — Array of confidence scores
 * @param {number[]} [weights] — Optional weight array (must sum to ~1.0)
 * @returns {number} Blended score
 */
function cslBlend(scores, weights) {
  if (!scores || scores.length === 0) return 0;
  const w = weights || phiFusionWeights(scores.length);
  let result = 0;
  for (let i = 0; i < scores.length; i++) {
    result += (scores[i] || 0) * (w[i] || 0);
  }
  return Math.max(0, Math.min(1, result));
}

// ─── MODULE EXPORTS ────────────────────────────────────────────────────────
module.exports = {
  // Re-exports from heady-phi-constants
  PHI, PSI, PHI_SQUARED, PHI_CUBED,
  FIB, CSL, POOLS,
  MEMORY_TIERS, CACHE_TTLS, HNSW,
  phiBackoff, confidenceToPool, phiDistribute, fibQuantize,

  // Aliases
  FIB_SEQUENCE,
  CSL_THRESHOLDS,
  VECTOR_DIMENSIONS,

  // Derived utilities
  fib,
  phiMs,
  PHI_TIMING,
  cosineSimilarity,
  placeholderVector,
  phiFusionWeights,
  phiBackoffWithJitter,
  cslGate,
  cslBlend,
};
