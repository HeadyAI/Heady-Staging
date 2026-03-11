"use strict";
/**
 * Heady™ Phi-Math Foundation — Sacred Geometry Constants & Utilities
 * The single source of truth for ALL scaling constants across the Heady™ ecosystem.
 *
 * NO MAGIC NUMBERS. Every constant derives from φ (golden ratio) or Fibonacci.
 *
 * © 2026-2026 HeadySystems Inc. All Rights Reserved. 60+ Provisional Patents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VECTOR = exports.COST_WEIGHTS = exports.JUDGE_WEIGHTS = exports.RESOURCE_POOLS = exports.BEE_SCALING = exports.PIPELINE = exports.AUTO_SUCCESS = exports.ALERT_THRESHOLDS = exports.PRESSURE_LEVELS = exports.PHI_BACKOFF_SEQUENCE = exports.CSL_THRESHOLDS = exports.PHI_TIMING = exports.FIB = exports.PHI_CUBED = exports.PHI_SQ = exports.PSI = exports.PHI = void 0;
exports.fib = fib;
exports.phiThreshold = phiThreshold;
exports.phiBackoff = phiBackoff;
exports.phiFusionWeights = phiFusionWeights;
// ─── CORE CONSTANTS ──────────────────────────────────────────────────────────
exports.PHI = 1.6180339887498948; // φ = (1 + √5) / 2
exports.PSI = 0.6180339887498949; // ψ = 1/φ = φ - 1
exports.PHI_SQ = 2.618033988749895; // φ² = φ + 1
exports.PHI_CUBED = 4.23606797749979; // φ³ = 2φ + 1
// ─── FIBONACCI SEQUENCE (first 20 terms) ─────────────────────────────────────
exports.FIB = [
    1, 1, 2, 3, 5, 8, 13, 21, 34, 55,
    89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765
];
// Convenience accessors: fib(n) returns the nth Fibonacci number (1-indexed)
function fib(n) {
    if (n <= 0)
        return 0;
    if (n <= exports.FIB.length)
        return exports.FIB[n - 1];
    let a = exports.FIB[exports.FIB.length - 2], b = exports.FIB[exports.FIB.length - 1];
    for (let i = exports.FIB.length; i < n; i++)
        [a, b] = [b, a + b];
    return b;
}
// ─── PHI-POWER TIMING (ms) ──────────────────────────────────────────────────
exports.PHI_TIMING = {
    PHI_1: Math.round(exports.PHI * 1000), // 1,618ms — quick retries
    PHI_2: Math.round(exports.PHI_SQ * 1000), // 2,618ms — short operations
    PHI_3: Math.round(exports.PHI_CUBED * 1000), // 4,236ms — standard operations
    PHI_4: Math.round(Math.pow(exports.PHI, 4) * 1000), // 6,854ms — API calls, webhooks
    PHI_5: Math.round(Math.pow(exports.PHI, 5) * 1000), // 11,090ms — complex operations
    PHI_6: Math.round(Math.pow(exports.PHI, 6) * 1000), // 17,944ms — trial execution
    PHI_7: Math.round(Math.pow(exports.PHI, 7) * 1000), // 29,034ms — heartbeat cycle
    PHI_8: Math.round(Math.pow(exports.PHI, 8) * 1000), // 46,979ms — long operations
};
// ─── CSL GATE THRESHOLDS ────────────────────────────────────────────────────
// phiThreshold(level) = 1 - ψ^level × 0.5
function phiThreshold(level, spread = 0.5) {
    return 1 - Math.pow(exports.PSI, level) * spread;
}
exports.CSL_THRESHOLDS = {
    MINIMUM: phiThreshold(0), // ≈ 0.500
    LOW: phiThreshold(1), // ≈ 0.691
    MEDIUM: phiThreshold(2), // ≈ 0.809
    HIGH: phiThreshold(3), // ≈ 0.882
    CRITICAL: phiThreshold(4), // ≈ 0.927
    DEFAULT: exports.PSI, // 0.618 — standard CSL gate
};
// ─── PHI-BACKOFF ────────────────────────────────────────────────────────────
function phiBackoff(attempt, baseMs = 1000, maxMs = 60000) {
    const delay = Math.min(baseMs * Math.pow(exports.PHI, attempt), maxMs);
    return Math.round(delay);
}
exports.PHI_BACKOFF_SEQUENCE = [
    1000, // attempt 0
    1618, // attempt 1: 1000 × φ
    2618, // attempt 2: 1000 × φ²
    4236, // attempt 3: 1000 × φ³
    6854, // attempt 4: 1000 × φ⁴
    11090, // attempt 5: 1000 × φ⁵
];
// ─── PHI-FUSION WEIGHTS ─────────────────────────────────────────────────────
function phiFusionWeights(n) {
    const weights = [];
    let remaining = 1;
    for (let i = 0; i < n - 1; i++) {
        const w = remaining * exports.PSI;
        weights.push(w);
        remaining -= w;
    }
    weights.push(remaining);
    return weights;
}
// ─── PRESSURE LEVELS ────────────────────────────────────────────────────────
exports.PRESSURE_LEVELS = {
    NOMINAL: { min: 0, max: exports.PSI * exports.PSI }, // 0 – 0.382
    ELEVATED: { min: exports.PSI * exports.PSI, max: exports.PSI }, // 0.382 – 0.618
    HIGH: { min: exports.PSI, max: 1 - Math.pow(exports.PSI, 3) }, // 0.618 – 0.854
    CRITICAL: { min: 1 - Math.pow(exports.PSI, 4) }, // 0.910+
};
// ─── ALERT THRESHOLDS ───────────────────────────────────────────────────────
exports.ALERT_THRESHOLDS = {
    WARNING: exports.PSI, // 0.618
    CAUTION: 1 - exports.PSI * exports.PSI, // 0.764
    CRITICAL: 1 - Math.pow(exports.PSI, 3), // 0.854
    EXCEEDED: 1 - Math.pow(exports.PSI, 4), // 0.910
    HARD_MAX: 1.0,
};
// ─── AUTO-SUCCESS ENGINE CONSTANTS ──────────────────────────────────────────
exports.AUTO_SUCCESS = {
    CYCLE_MS: exports.PHI_TIMING.PHI_7, // 29,034ms (replaces hardcoded 30000)
    CATEGORIES: fib(7), // 13 categories (replaces hardcoded 9)
    TASKS_TOTAL: fib(12), // 144 tasks (replaces hardcoded 135)
    TASKS_PER_CATEGORY: Math.floor(fib(12) / fib(7)), // 11 per category
    TASK_TIMEOUT_MS: exports.PHI_TIMING.PHI_3, // 4,236ms individual task timeout
    MAX_RETRIES_PER_CYCLE: fib(4), // 3 retries per cycle
    MAX_RETRIES_TOTAL: fib(6), // 8 total before incident
};
// ─── PIPELINE CONSTANTS ─────────────────────────────────────────────────────
exports.PIPELINE = {
    STAGES: fib(8), // 21 stages
    MAX_CONCURRENT: fib(6), // 8 concurrent tasks
    MAX_RETRIES: fib(4), // 3 retries
    CONTEXT_COMPLETENESS: 0.92, // embedding density gate
    RECON_TIMEOUT_MS: exports.PHI_TIMING.PHI_4, // 6,854ms
    TRIAL_TIMEOUT_MS: exports.PHI_TIMING.PHI_6, // 17,944ms
    AWARENESS_TIMEOUT_MS: exports.PHI_TIMING.PHI_5, // 11,090ms
    SEARCH_TIMEOUT_MS: exports.PHI_TIMING.PHI_8, // 46,979ms (≈ stage_continuous_search)
    EVOLUTION_TIMEOUT_MS: exports.PHI_TIMING.PHI_8, // 46,979ms
};
// ─── BEE SCALING ────────────────────────────────────────────────────────────
exports.BEE_SCALING = {
    PRE_WARM_POOLS: [fib(5), fib(6), fib(7), fib(8)], // [5, 8, 13, 21]
    SCALE_UP_FACTOR: exports.PHI, // queue > pool × φ
    SCALE_DOWN_FACTOR: 1 - 1 / exports.PHI, // idle > pool × 0.382
    STALE_TIMEOUT_S: 60,
    MAX_CONCURRENT: 10000,
};
// ─── RESOURCE ALLOCATION ────────────────────────────────────────────────────
exports.RESOURCE_POOLS = {
    HOT: 0.34, // 34% — user-facing
    WARM: 0.21, // 21% — important background
    COLD: 0.13, // 13% — batch processing
    RESERVE: 0.08, // 8% — burst capacity
    GOVERNANCE: 0.05, // 5% — HeadyCheck/HeadyAssure always running
};
// ─── SCORING WEIGHTS (CSL-derived) ──────────────────────────────────────────
exports.JUDGE_WEIGHTS = {
    CORRECTNESS: 0.34, // 1/φ² normalized
    SAFETY: 0.21, // fib ratio
    PERFORMANCE: 0.21, // fib ratio
    QUALITY: 0.13, // fib ratio
    ELEGANCE: 0.11, // fib ratio
};
exports.COST_WEIGHTS = {
    TIME: 0.382, // 1 - 1/φ
    MONEY: 0.382, // 1 - 1/φ
    QUALITY: 0.236, // 1/φ²
};
// ─── VECTOR MEMORY ──────────────────────────────────────────────────────────
exports.VECTOR = {
    DIMENSIONS: 384,
    PROJECTION_DIMS: 3,
    DRIFT_THRESHOLD: exports.PSI, // 0.618 — cosine similarity
    COHERENCE_THRESHOLD: phiThreshold(2), // 0.809
    DEDUP_THRESHOLD: 0.972, // above CRITICAL, for semantic identity
};
exports.default = {
    PHI: exports.PHI, PSI: exports.PSI, PHI_SQ: exports.PHI_SQ, PHI_CUBED: exports.PHI_CUBED,
    FIB: exports.FIB, fib,
    PHI_TIMING: exports.PHI_TIMING, PHI_BACKOFF_SEQUENCE: exports.PHI_BACKOFF_SEQUENCE,
    CSL_THRESHOLDS: exports.CSL_THRESHOLDS, phiThreshold,
    phiBackoff, phiFusionWeights,
    PRESSURE_LEVELS: exports.PRESSURE_LEVELS, ALERT_THRESHOLDS: exports.ALERT_THRESHOLDS,
    AUTO_SUCCESS: exports.AUTO_SUCCESS, PIPELINE: exports.PIPELINE,
    BEE_SCALING: exports.BEE_SCALING, RESOURCE_POOLS: exports.RESOURCE_POOLS,
    JUDGE_WEIGHTS: exports.JUDGE_WEIGHTS, COST_WEIGHTS: exports.COST_WEIGHTS,
    VECTOR: exports.VECTOR,
};
//# sourceMappingURL=phi-math.js.map