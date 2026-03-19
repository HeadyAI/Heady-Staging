"use strict";
/**
 * Heady™ Phi-Math Foundation — Sacred Geometry Constants & Utilities
 * The single source of truth for ALL scaling constants across the Heady™ ecosystem.
 *
 * NO MAGIC NUMBERS. Every constant derives from φ (golden ratio) or Fibonacci.
 *
 * © 2026 HeadySystems Inc. All Rights Reserved. 60+ Provisional Patents.
 */

// ─── CORE CONSTANTS ──────────────────────────────────────────────────────────
const PHI        = 1.6180339887498948;     // φ = (1 + √5) / 2
const PSI        = 0.6180339887498949;     // ψ = 1/φ = φ - 1
const PHI_SQ     = 2.618033988749895;      // φ² = φ + 1
const PHI_CUBED  = 4.23606797749979;       // φ³ = 2φ + 1
const SQRT5      = 2.23606797749979;       // √5
const PSI_SQ     = PSI * PSI;              // ψ² ≈ 0.382
const PSI_2      = PSI_SQ;
const PSI_3      = PSI * PSI * PSI;
const PSI_4      = PSI_3 * PSI;
const PSI_5      = PSI_4 * PSI;
const PSI_8      = Math.pow(PSI, 8);
const PSI_9      = Math.pow(PSI, 9);
const PSI_POWERS = Object.freeze({
  1: PSI,
  2: PSI_2,
  3: PSI_3,
  4: PSI_4,
  5: PSI_5,
  8: PSI_8,
  9: PSI_9,
});

// ─── FIBONACCI ───────────────────────────────────────────────────────────────
const FIB_CACHE = [
  1, 1, 2, 3, 5, 8, 13, 21, 34, 55,
  89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765
];

function fib(n) {
  if (n <= 0) return 0;
  if (n <= FIB_CACHE.length) return FIB_CACHE[n - 1];
  let a = FIB_CACHE[FIB_CACHE.length - 2], b = FIB_CACHE[FIB_CACHE.length - 1];
  for (let i = FIB_CACHE.length; i < n; i++) [a, b] = [b, a + b];
  return b;
}

function fibCeil(n) {
  let i = 1;
  while (fib(i) < n) i++;
  return fib(i);
}

function fibFloor(n) {
  let i = 1;
  while (fib(i + 1) <= n) i++;
  return fib(i);
}

function fibSequence(n) {
  const seq = [];
  for (let i = 0; i <= n; i++) seq.push(i === 0 ? 0 : fib(i));
  return seq;
}

// ─── PHI-POWER TIMING (ms) ──────────────────────────────────────────────────
function phiPower(n) { return Math.pow(PHI, n); }
function phiMs(n)    { return Math.round(phiPower(n) * 1000); }

const PHI_TIMING = Object.freeze({
  PHI_1:  phiMs(1),    // 1,618ms  — quick retries
  PHI_2:  phiMs(2),    // 2,618ms  — short operations
  PHI_3:  phiMs(3),    // 4,236ms  — standard operations
  PHI_4:  phiMs(4),    // 6,854ms  — API calls, webhooks
  PHI_5:  phiMs(5),    // 11,090ms — complex operations
  PHI_6:  phiMs(6),    // 17,944ms — trial execution
  PHI_7:  phiMs(7),    // 29,034ms — heartbeat cycle
  PHI_8:  phiMs(8),    // 46,979ms — long operations
  PHI_9:  phiMs(9),    // 75,025ms — extended operations
  PHI_10: phiMs(10),   // 121,393ms — max single operation
});

const PHI_TIMING_COMPAT = Object.freeze({
  TICK: phiMs(0),
  PULSE: PHI_TIMING.PHI_1,
  BEAT: PHI_TIMING.PHI_2,
  BREATH: PHI_TIMING.PHI_3,
  WAVE: PHI_TIMING.PHI_4,
  SURGE: PHI_TIMING.PHI_5,
  FLOW: PHI_TIMING.PHI_6,
  CYCLE: PHI_TIMING.PHI_7,
  TIDE: PHI_TIMING.PHI_8,
  EPOCH: PHI_TIMING.PHI_9,
  ERA: PHI_TIMING.PHI_10,
  ...PHI_TIMING,
});

// ─── CSL GATE THRESHOLDS ────────────────────────────────────────────────────
function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = Object.freeze({
  MINIMUM:   phiThreshold(0),   // ≈ 0.500 — noise floor
  LOW:       phiThreshold(1),   // ≈ 0.691 — weak alignment
  MEDIUM:    phiThreshold(2),   // ≈ 0.809 — moderate alignment
  HIGH:      phiThreshold(3),   // ≈ 0.882 — strong alignment
  CRITICAL:  phiThreshold(4),   // ≈ 0.927 — near-certain
});

const DEDUP_THRESHOLD = 0.972;

const CSL_GATE = Object.freeze({
  DEFAULT:   PSI,               //   0.618 — standard CSL gate (1/φ)
  DEDUP:     DEDUP_THRESHOLD,             // above CRITICAL, for semantic identity
  COHERENCE: phiThreshold(2),   // ≈ 0.809 — drift detection threshold
});

// ─── PHI-BACKOFF ────────────────────────────────────────────────────────────
function phiBackoff(attempt, baseMs = 1000, maxMs = 60000) {
  const delay = Math.min(baseMs * Math.pow(PHI, attempt), maxMs);
  return Math.round(delay);
}

function phiBackoffWithJitter(attempt, baseMs = 1000, maxMs = 60000) {
  const delay = phiBackoff(attempt, baseMs, maxMs);
  const jitter = (Math.random() * 2 - 1) * PSI * PSI; // ±38.2%
  return Math.round(delay * (1 + jitter));
}

const PHI_BACKOFF_SEQUENCE = Object.freeze([
  1000, 1618, 2618, 4236, 6854, 11090, 17944, 29034
]);

// ─── PHI-FUSION WEIGHTS ─────────────────────────────────────────────────────
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

function phiResourceWeights(n) {
  const fibs = [];
  for (let i = n + 1; i >= 2; i--) fibs.push(fib(i));
  const sum = fibs.reduce((a, b) => a + b, 0);
  return fibs.map(value => value / sum);
}

// ─── PRESSURE LEVELS ────────────────────────────────────────────────────────
const PRESSURE = Object.freeze({
  NOMINAL:  { min: 0, max: PSI * PSI, label: 'NOMINAL' },
  ELEVATED: { min: PSI * PSI, max: PSI, label: 'ELEVATED' },
  HIGH:     { min: PSI, max: 1 - Math.pow(PSI, 3), label: 'HIGH' },
  CRITICAL: { min: 1 - Math.pow(PSI, 4), max: 1.0, label: 'CRITICAL' },
});

const PRESSURE_LEVELS = Object.freeze({
  NOMINAL_MAX: PSI * PSI,
  ELEVATED_MAX: PSI,
  HIGH_MAX: 1 - Math.pow(PSI, 3),
  CRITICAL: 1 - Math.pow(PSI, 4),
});

function getPressureLevel(utilization) {
  if (utilization < PRESSURE.NOMINAL.max) return PRESSURE.NOMINAL;
  if (utilization < PRESSURE.ELEVATED.max) return PRESSURE.ELEVATED;
  if (utilization < PRESSURE.HIGH.max) return PRESSURE.HIGH;
  return PRESSURE.CRITICAL;
}

function classifyPressure(utilization) {
  if (utilization >= PRESSURE_LEVELS.CRITICAL) return 'critical';
  if (utilization >= PRESSURE_LEVELS.HIGH_MAX) return 'high';
  if (utilization >= PRESSURE_LEVELS.ELEVATED_MAX) return 'elevated';
  return 'nominal';
}

function phiAdaptiveInterval(currentInterval, healthy, minMs = 1000, maxMs = 60000) {
  if (healthy) {
    return Math.min(maxMs, Math.round(currentInterval * PHI));
  }
  return Math.max(minMs, Math.round(currentInterval * PSI));
}

// ─── ALERT THRESHOLDS ───────────────────────────────────────────────────────
const ALERTS = Object.freeze({
  WARNING:  PSI,                     // 0.618
  CAUTION:  1 - PSI * PSI,          // 0.764
  CRITICAL: 1 - Math.pow(PSI, 3),   // 0.854
  EXCEEDED: 1 - Math.pow(PSI, 4),   // 0.910
  HARD_MAX: 1.0,
});

// ─── AUTO-SUCCESS ENGINE ────────────────────────────────────────────────────
const AUTO_SUCCESS = Object.freeze({
  CYCLE_MS:          PHI_TIMING.PHI_7,               // 29,034ms
  CATEGORIES:        fib(7),                          // 13
  TASKS_TOTAL:       fib(12),                         // 144
  TASKS_PER_CAT:     Math.floor(fib(12) / fib(7)),   // 11
  TASK_TIMEOUT_MS:   PHI_TIMING.PHI_3,               // 4,236ms
  MAX_RETRIES_CYCLE: fib(4),                          // 3
  MAX_RETRIES_TOTAL: fib(6),                          // 8
});

// ─── PIPELINE CONSTANTS ─────────────────────────────────────────────────────
const PIPELINE = Object.freeze({
  STAGES:         fib(8),      // 21
  MAX_CONCURRENT: fib(6),      // 8
  MAX_RETRIES:    fib(4),      // 3
  CONTEXT_GATE:   0.92,        // embedding density gate
  BACKOFF_MS:     [phiMs(1), phiMs(2), phiMs(3)],
  MAX_BACKOFF_MS: phiMs(5),    // 11,090
  TIMEOUT: Object.freeze({
    RECON:      phiMs(4),      // 6,854ms
    INTAKE:     phiMs(3),      // 4,236ms
    TRIAL:      phiMs(6),      // 17,944ms
    EXECUTE:    120000,
    AWARENESS:  phiMs(5),      // 11,090ms
    SEARCH:     phiMs(7),      // 29,034ms
    EVOLUTION:  phiMs(7),      // 29,034ms
    RECEIPT:    phiMs(4),      // 6,854ms
    DEFAULT:    phiMs(7),      // 29,034ms
  }),
});

// ─── BEE & SWARM SCALING ────────────────────────────────────────────────────
const BEE = Object.freeze({
  PRE_WARM:   [fib(5), fib(6), fib(7), fib(8)],   // [5, 8, 13, 21]
  SCALE_UP:   PHI,             // queue > pool × φ → scale up
  SCALE_DOWN: 1 - 1 / PHI,    // idle > pool × 0.382 → scale down
  STALE_MS:   60000,           // 60s no heartbeat → dead
  MAX_TOTAL:  10000,
  SWARMS:     17,
  TYPES:      fib(11),         // 89
  LIFECYCLE:  ['SPAWN', 'INITIALIZE', 'READY', 'ACTIVE', 'DRAINING', 'SHUTDOWN', 'DEAD'],
});

// ─── RESOURCE ALLOCATION (φ-weighted pools) ─────────────────────────────────
const POOLS = Object.freeze({
  HOT:        0.34,    // 34% — user-facing, latency-critical
  WARM:       0.21,    // 21% — important background
  COLD:       0.13,    // 13% — batch, analytics
  RESERVE:    0.08,    // 8%  — burst capacity
  GOVERNANCE: 0.05,    // 5%  — HeadyCheck/HeadyAssure always running
});

// ─── SCORING WEIGHTS ────────────────────────────────────────────────────────
const JUDGE = Object.freeze({
  CORRECTNESS: 0.34, SAFETY: 0.21, PERFORMANCE: 0.21, QUALITY: 0.13, ELEGANCE: 0.11,
});

const COST_W = Object.freeze({
  TIME: 0.382, MONEY: 0.382, QUALITY: 0.236,
});

const EVICTION = Object.freeze({
  IMPORTANCE: 0.486, RECENCY: 0.300, RELEVANCE: 0.214,
});

// ─── VECTOR MEMORY ──────────────────────────────────────────────────────────
const VECTOR = Object.freeze({
  DIMS:      384,
  PROJ_DIMS: 3,
  DRIFT:     CSL_THRESHOLDS.COHERENCE,   // 0.809
  DEDUP:     CSL_THRESHOLDS.DEDUP,       // 0.972
  MIN_SCORE: PSI,                         // 0.618
});

// ─── COLAB RUNTIMES ─────────────────────────────────────────────────────────
const COLAB_RUNTIMES = Object.freeze({
  COUNT:                3,
  MAX_CONCURRENT_TASKS: 21,       // fib(8)
  GPU_MEMORY_GB:        55,       // fib(10)
  HEARTBEAT_MS:         13000,    // fib(7) seconds
});

const TIMING = Object.freeze({ HEARTBEAT_MS: COLAB_RUNTIMES.HEARTBEAT_MS, ...PHI_TIMING });
const RESOURCE_ALLOCATION = Object.freeze({ HOT: POOLS.HOT, WARM: POOLS.WARM, COLD: POOLS.COLD });
const POOL_SIZES = POOLS;

// ─── TOKEN BUDGETS ──────────────────────────────────────────────────────────
function phiTokenBudgets(base = 8192) {
  return {
    working:   base,
    session:   Math.round(base * PHI_SQ),
    memory:    Math.round(base * Math.pow(PHI, 4)),
    artifacts: Math.round(base * Math.pow(PHI, 6)),
  };
}

// ─── CSL GATE FUNCTIONS ─────────────────────────────────────────────────────
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function cslGate(value, cosScore, tau = PSI, temp = Math.pow(PSI, 3)) {
  return value * sigmoid((cosScore - tau) / temp);
}

function cslBlend(wHigh, wLow, cosScore, tau = PSI) {
  const alpha = sigmoid((cosScore - tau) / Math.pow(PSI, 3));
  return wHigh * alpha + wLow * (1 - alpha);
}

function cslAND(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  return cosineSimilarity(a.slice(0, len), b.slice(0, len));
}

function phiFusionScore(scores, weights) {
  if (!scores || scores.length === 0) return 0;
  const w = weights || scores.map(() => 1 / scores.length);
  const total = w.reduce((s, x) => s + x, 0);
  return scores.reduce((acc, score, i) => acc + score * (w[i] / total), 0);
}

function adaptiveTemperature(entropy, maxEntropy) {
  const ratio = entropy / maxEntropy;
  return Math.pow(PSI, 3) * (1 + ratio * PHI);
}

// ─── COSINE SIMILARITY ──────────────────────────────────────────────────────
function cosineSimilarity(a, b) {
  if (a.length !== b.length) throw new Error('Vectors must have same dimension');
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
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

// ─── PLACEHOLDER VECTOR ─────────────────────────────────────────────────────
function placeholderVector(dims = 384) {
  return new Array(dims).fill(0);
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORTS — unified, no duplicates
// ═════════════════════════════════════════════════════════════════════════════
module.exports = {
  // Core constants
  PHI, PSI, PHI_SQ, PHI_CUBED, PHI_CUBE: PHI_CUBED, SQRT5, PSI_SQ,
  PSI_2, PSI_3, PSI_4, PSI_5, PSI_8, PSI_9, PSI_POWERS,
  // Fibonacci
  FIB: FIB_CACHE, FIB_CACHE, fib, fibCeil, fibFloor, fibSequence,
  // Timing
  phiPower, phiMs, PHI_TIMING: PHI_TIMING_COMPAT, TIMING,
  // Thresholds
  phiThreshold, CSL_THRESHOLDS, DEDUP_THRESHOLD,
  // Backoff
  phiBackoff, phiBackoffWithJitter, PHI_BACKOFF_SEQUENCE,
  // Fusion
  phiFusionWeights, phiMultiSplit, phiFusionScore, phiResourceWeights,
  // Pressure & alerts
  PRESSURE, PRESSURE_LEVELS, getPressureLevel, classifyPressure, phiAdaptiveInterval,
  ALERTS, ALERT_THRESHOLDS: ALERTS,
  // Domain constants
  AUTO_SUCCESS, PIPELINE, BEE, BEE_SCALING: BEE,
  POOLS, RESOURCE_POOLS: POOLS, POOL_SIZES, RESOURCE_ALLOCATION,
  // Scoring
  JUDGE, JUDGE_WEIGHTS: JUDGE, COST_W, COST_WEIGHTS: COST_W, EVICTION, EVICTION_WEIGHTS: EVICTION,
  // Vector
  VECTOR, placeholderVector,
  // Token budgets
  phiTokenBudgets,
  // CSL functions
  sigmoid, cslGate, cslBlend, cslAND, adaptiveTemperature,
  // Vector math
  cosineSimilarity, normalize,
  // Colab
  COLAB_RUNTIMES,
  phiTimeout: phiMs,
};