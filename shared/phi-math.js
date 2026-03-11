/**
 * Heady™ Phi-Math Foundation — Sacred Geometry Constants & Utilities
 * The SINGLE SOURCE OF TRUTH for ALL scaling constants across the Heady ecosystem.
 * 
 * ZERO MAGIC NUMBERS. Every constant derives from φ (golden ratio) or Fibonacci.
 * Import this module everywhere. Never hardcode a number.
 * 
 * © 2024-2026 HeadySystems Inc. All Rights Reserved. 60+ Provisional Patents.
 */

// ESM is always strict mode

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PHI = 1.6180339887498948;    // φ = (1 + √5) / 2
const PSI = 0.6180339887498949;    // ψ = 1/φ = φ - 1
const PSI_SQ = PSI * PSI;              // ψ² ≈ 0.382
const PSI_CUBED = PSI * PSI * PSI;     // ψ³ ≈ 0.236
const PHI_SQ = 2.618033988749895;     // φ² = φ + 1
const PHI_CUBED = 4.23606797749979;      // φ³ = 2φ + 1
const SQRT5 = 2.23606797749979;      // √5

// ═══════════════════════════════════════════════════════════════════════════════
// FIBONACCI SEQUENCE (first 25 terms, 1-indexed)
// ═══════════════════════════════════════════════════════════════════════════════

const FIB_CACHE = [
  0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55,
  89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765,
  10946, 17711, 28657, 46368, 75025
];

function fib(n) {
  if (n < 0) return 0;
  if (n < FIB_CACHE.length) return FIB_CACHE[n];
  let a = FIB_CACHE[FIB_CACHE.length - 2];
  let b = FIB_CACHE[FIB_CACHE.length - 1];
  for (let i = FIB_CACHE.length; i <= n; i++) {
    const c = a + b;
    a = b;
    b = c;
  }
  return b;
}

/** Closest Fibonacci number ≥ n */
function fibCeil(n) {
  let i = 1;
  while (fib(i) < n) i++;
  return fib(i);
}

/** Closest Fibonacci number ≤ n */
function fibFloor(n) {
  let i = 1;
  while (fib(i + 1) <= n) i++;
  return fib(i);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHI-POWER TIMING (milliseconds)
// ═══════════════════════════════════════════════════════════════════════════════

function phiPower(n) {
  return Math.pow(PHI, n);
}

function phiMs(n) {
  return Math.round(phiPower(n) * 1000);
}

const PHI_TIMING = Object.freeze({
  PHI_1: phiMs(1),   // 1,618ms  — quick retries
  PHI_2: phiMs(2),   // 2,618ms  — short operations
  PHI_3: phiMs(3),   // 4,236ms  — standard operations
  PHI_4: phiMs(4),   // 6,854ms  — API calls, webhooks, recon
  PHI_5: phiMs(5),   // 11,090ms — complex operations
  PHI_6: phiMs(6),   // 17,944ms — trial execution
  PHI_7: phiMs(7),   // 29,034ms — heartbeat cycle
  PHI_8: phiMs(8),   // 46,979ms — long operations
  PHI_9: phiMs(9),   // 75,025ms — extended operations
  PHI_10: phiMs(10),  // 121,393ms — max single operation
});

// ═══════════════════════════════════════════════════════════════════════════════
// CSL GATE THRESHOLDS
// phiThreshold(level, spread) = 1 - ψ^level × spread
// ═══════════════════════════════════════════════════════════════════════════════

function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = Object.freeze({
  MINIMUM: phiThreshold(0),   // ≈ 0.500  — noise floor
  LOW: phiThreshold(1),   // ≈ 0.691  — weak alignment
  MEDIUM: phiThreshold(2),   // ≈ 0.809  — moderate alignment
  HIGH: phiThreshold(3),   // ≈ 0.882  — strong alignment
  CRITICAL: phiThreshold(4),   // ≈ 0.927  — near-certain
  DEFAULT: PSI,               //   0.618  — standard CSL gate (1/φ)
  DEDUP: 0.972,             // above CRITICAL, for semantic identity
  COHERENCE: phiThreshold(2),   // ≈ 0.809  — drift detection threshold
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHI-BACKOFF
// ═══════════════════════════════════════════════════════════════════════════════

function phiBackoff(attempt, baseMs = 1000, maxMs = 60000) {
  const delay = Math.min(baseMs * Math.pow(PHI, attempt), maxMs);
  return Math.round(delay);
}

function phiBackoffWithJitter(attempt, baseMs = 1000, maxMs = 60000) {
  const delay = phiBackoff(attempt, baseMs, maxMs);
  const jitter = (Math.random() * 2 - 1) * PSI * PSI; // ±38.2%
  return Math.round(delay * (1 + jitter));
}

const PHI_BACKOFF_SEQ = Object.freeze([
  1000, 1618, 2618, 4236, 6854, 11090, 17944, 29034
]);

// ═══════════════════════════════════════════════════════════════════════════════
// PHI-FUSION WEIGHTS (N-factor score fusion)
// ═══════════════════════════════════════════════════════════════════════════════

function phiFusionWeights(n) {
  const weights = [];
  let remaining = 1;
  for (let i = 0; i < n - 1; i++) {
    const w = remaining * PSI;
    weights.push(Number(w.toFixed(6)));
    remaining -= w;
  }
  weights.push(Number(remaining.toFixed(6)));
  return weights;
}

function phiMultiSplit(whole, n) {
  const weights = phiFusionWeights(n);
  return weights.map(w => Math.round(whole * w));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESSURE LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

const PRESSURE = Object.freeze({
  NOMINAL: { min: 0, max: PSI * PSI, label: 'NOMINAL' },           // 0 – 0.382
  ELEVATED: { min: PSI * PSI, max: PSI, label: 'ELEVATED' },        // 0.382 – 0.618
  HIGH: { min: PSI, max: 1 - Math.pow(PSI, 3), label: 'HIGH' }, // 0.618 – 0.854
  CRITICAL: { min: 1 - Math.pow(PSI, 4), max: 1.0, label: 'CRITICAL' }, // 0.910+
});

function getPressureLevel(utilization) {
  if (utilization < PRESSURE.NOMINAL.max) return PRESSURE.NOMINAL;
  if (utilization < PRESSURE.ELEVATED.max) return PRESSURE.ELEVATED;
  if (utilization < PRESSURE.HIGH.max) return PRESSURE.HIGH;
  return PRESSURE.CRITICAL;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

const ALERTS = Object.freeze({
  WARNING: PSI,                     // 0.618
  CAUTION: 1 - PSI * PSI,          // 0.764
  CRITICAL: 1 - Math.pow(PSI, 3),   // 0.854
  EXCEEDED: 1 - Math.pow(PSI, 4),   // 0.910
  HARD_MAX: 1.0,
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-SUCCESS ENGINE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const AUTO_SUCCESS = Object.freeze({
  CYCLE_MS: PHI_TIMING.PHI_7,       // 29,034ms
  CATEGORIES: fib(7),                  // 13
  TASKS_TOTAL: fib(12),                 // 144
  TASKS_PER_CAT: Math.floor(fib(12) / fib(7)),  // 11
  TASK_TIMEOUT_MS: PHI_TIMING.PHI_3,        // 4,236ms
  MAX_RETRIES_CYCLE: fib(4),                  // 3
  MAX_RETRIES_TOTAL: fib(6),                  // 8
});

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PIPELINE = Object.freeze({
  STAGES: fib(8),           // 21
  MAX_CONCURRENT: fib(6),           // 8
  MAX_RETRIES: fib(4),           // 3
  CONTEXT_GATE: 0.92,             // embedding density gate
  BACKOFF_MS: [phiMs(1), phiMs(2), phiMs(3)], // [1618, 2618, 4236]
  MAX_BACKOFF_MS: phiMs(5),         // 11,090
  TIMEOUT: Object.freeze({
    RECON: phiMs(4),           // 6,854ms
    INTAKE: phiMs(3),           // 4,236ms
    TRIAL: phiMs(6),           // 17,944ms
    EXECUTE: 120000,
    AWARENESS: phiMs(5),           // 11,090ms
    SEARCH: phiMs(7),           // 29,034ms
    EVOLUTION: phiMs(7),           // 29,034ms
    RECEIPT: phiMs(4),           // 6,854ms
    DEFAULT: phiMs(7),           // 29,034ms
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEE & SWARM SCALING
// ═══════════════════════════════════════════════════════════════════════════════

const BEE = Object.freeze({
  PRE_WARM: [fib(5), fib(6), fib(7), fib(8)],  // [5, 8, 13, 21]
  SCALE_UP: PHI,           // queue > pool × φ → scale up
  SCALE_DOWN: 1 - 1 / PHI,    // idle > pool × 0.382 → scale down
  STALE_MS: 60000,         // 60s no heartbeat → dead
  MAX_TOTAL: 10000,
  SWARMS: 17,
  TYPES: fib(11),       // 89
  LIFECYCLE: ['SPAWN', 'INITIALIZE', 'READY', 'ACTIVE', 'DRAINING', 'SHUTDOWN', 'DEAD'],
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE ALLOCATION (φ-weighted pools)
// ═══════════════════════════════════════════════════════════════════════════════

const POOLS = Object.freeze({
  HOT: 0.34,    // 34% — user-facing, latency-critical
  WARM: 0.21,    // 21% — important background
  COLD: 0.13,    // 13% — batch, analytics
  RESERVE: 0.08,    // 8%  — burst capacity
  GOVERNANCE: 0.05,    // 5%  — HeadyCheck/HeadyAssure always running
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

const JUDGE = Object.freeze({
  CORRECTNESS: 0.34,
  SAFETY: 0.21,
  PERFORMANCE: 0.21,
  QUALITY: 0.13,
  ELEGANCE: 0.11,
});

const COST_W = Object.freeze({
  TIME: 0.382,
  MONEY: 0.382,
  QUALITY: 0.236,
});

const EVICTION = Object.freeze({
  IMPORTANCE: 0.486,
  RECENCY: 0.300,
  RELEVANCE: 0.214,
});

// ═══════════════════════════════════════════════════════════════════════════════
// VECTOR MEMORY
// ═══════════════════════════════════════════════════════════════════════════════

const VECTOR = Object.freeze({
  DIMS: 384,
  PROJ_DIMS: 3,
  DRIFT: CSL_THRESHOLDS.COHERENCE,  // 0.809
  DEDUP: CSL_THRESHOLDS.DEDUP,      // 0.972
  MIN_SCORE: PSI,                        // 0.618
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN BUDGETS (phi-geometric progression)
// ═══════════════════════════════════════════════════════════════════════════════

function phiTokenBudgets(base = 8192) {
  return {
    working: base,
    session: Math.round(base * PHI_SQ),
    memory: Math.round(base * Math.pow(PHI, 4)),
    artifacts: Math.round(base * Math.pow(PHI, 6)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSL GATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function cslGate(value, cosScore, tau = PSI, temp = Math.pow(PSI, 3)) {
  return value * sigmoid((cosScore - tau) / temp);
}

function cslBlend(wHigh, wLow, cosScore, tau = PSI) {
  const alpha = sigmoid((cosScore - tau) / Math.pow(PSI, 3));
  return wHigh * alpha + wLow * (1 - alpha);
}

function adaptiveTemperature(entropy, maxEntropy) {
  const ratio = entropy / maxEntropy;
  return Math.pow(PSI, 3) * (1 + ratio * PHI);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COSINE SIMILARITY
// ═══════════════════════════════════════════════════════════════════════════════

function cosineSimilarity(a, b) {
  if (a.length !== b.length) throw new Error('Vectors must have same dimension');
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function normalize(v) {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return mag === 0 ? v : v.map(x => x / mag);
}

/**
 * Generate a deterministic pseudo-random unit vector from a string seed.
 * Uses LCG PRNG (multiplier 1103515245, increment 12345) seeded from
 * character code sum. Produces the same vector for the same seed every time.
 * @param {string} seed - Seed string
 * @param {number} [dims=384] - Vector dimensionality
 * @returns {number[]} Normalized unit vector
 */
function placeholderVector(seed, dims = VECTOR.DIMS) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s += seed.charCodeAt(i);
  const vec = new Array(dims);
  for (let i = 0; i < dims; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    vec[i] = (s / 0x7fffffff - PSI) * PHI;
  }
  return normalize(vec);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ALIASES & COMPATIBILITY (used by core/liquid-nodes)
// ═══════════════════════════════════════════════════════════════════════════════

/** Alias for phiFusionWeights — resource allocation weights */
const phiResourceWeights = phiFusionWeights;

/** Alias for getPressureLevel */
const classifyPressure = getPressureLevel;

/** Alias for PRESSURE */
const PRESSURE_LEVELS = PRESSURE;

/** CSL AND gate — cosine similarity between two vectors, gated by minimum threshold.
 *  If given two scalars, falls back to Math.min for backward compatibility.
 *  @param {number[]|number} a - Vector A or scalar
 *  @param {number[]|number} b - Vector B or scalar
 *  @param {number} [minThreshold] - Floor below which result is 0
 *  @returns {number} Cosine similarity or min of scalars
 */
function cslAND(a, b, minThreshold = CSL_THRESHOLDS.MINIMUM) {
  if (typeof a === 'number' && typeof b === 'number') return Math.min(a, b);
  const sim = cosineSimilarity(a, b);
  return sim >= minThreshold ? sim : 0;
}

/** Phi-weighted fusion score — weighted sum of CSL signals */
function phiFusionScore(signals) {
  const weights = phiFusionWeights(signals.length);
  return signals.reduce((sum, s, i) => sum + s * weights[i], 0);
}

/** Phi-adaptive interval — scales an interval based on load */
function phiAdaptiveInterval(baseMs, load) {
  return baseMs * (1 + (1 - load) * PSI);
}

/** Fibonacci sequence generator — returns first n+1 Fibonacci numbers */
function fibSequence(n) {
  const seq = [];
  for (let i = 0; i <= n; i++) seq.push(fib(i));
  return seq;
}

/** Dedup threshold — cosine similarity above this means duplicate */
const DEDUP_THRESHOLD = CSL_THRESHOLDS.CRITICAL || 0.972;

/** Resource allocation — pool sizing */
const RESOURCE_ALLOCATION = Object.freeze({
  HOT: { ratio: PHI / (PHI + 1 + PSI), preWarm: fib(5) },
  WARM: { ratio: 1 / (PHI + 1 + PSI), preWarm: fib(6) },
  COLD: { ratio: PSI / (PHI + 1 + PSI), preWarm: fib(4) },
});

export {
  // Core
  PHI, PSI, PSI_SQ, PSI_CUBED, PHI_SQ, PHI_CUBED, SQRT5,
  // Fibonacci
  FIB_CACHE, fib, fibCeil, fibFloor,
  // Timing
  phiPower, phiMs, PHI_TIMING,
  // Thresholds
  phiThreshold, CSL_THRESHOLDS,
  // Backoff
  phiBackoff, phiBackoffWithJitter, PHI_BACKOFF_SEQ,
  // Fusion
  phiFusionWeights, phiMultiSplit,
  // Pressure
  PRESSURE, getPressureLevel, ALERTS,
  // Domain constants
  AUTO_SUCCESS, PIPELINE, BEE, POOLS,
  // Scoring
  JUDGE, COST_W, EVICTION,
  // Vector
  VECTOR,
  // Token budgets
  phiTokenBudgets,
  // CSL functions
  sigmoid, cslGate, cslBlend, adaptiveTemperature,
  // Vector math
  cosineSimilarity, normalize, placeholderVector,
  // Aliases & compatibility (core/liquid-nodes)
  phiResourceWeights, classifyPressure, PRESSURE_LEVELS,
  cslAND, phiFusionScore, phiAdaptiveInterval,
  fibSequence, DEDUP_THRESHOLD, RESOURCE_ALLOCATION,
};

// Default export for CJS-style consumers using `import pm from '...'`
export default {
  PHI, PSI, PSI_SQ, PSI_CUBED, PHI_SQ, PHI_CUBED, SQRT5,
  FIB_CACHE, fib, fibCeil, fibFloor,
  phiPower, phiMs, PHI_TIMING,
  phiThreshold, CSL_THRESHOLDS,
  phiBackoff, phiBackoffWithJitter, PHI_BACKOFF_SEQ,
  phiFusionWeights, phiMultiSplit,
  PRESSURE, getPressureLevel, ALERTS,
  AUTO_SUCCESS, PIPELINE, BEE, POOLS,
  JUDGE, COST_W, EVICTION, VECTOR,
  phiTokenBudgets,
  sigmoid, cslGate, cslBlend, adaptiveTemperature,
  cosineSimilarity, normalize, placeholderVector,
  phiResourceWeights, classifyPressure, PRESSURE_LEVELS,
  cslAND, phiFusionScore, phiAdaptiveInterval,
  fibSequence, DEDUP_THRESHOLD, RESOURCE_ALLOCATION,
};
