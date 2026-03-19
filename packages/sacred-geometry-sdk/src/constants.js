/**
 * @heady/sacred-geometry-sdk — Constants
 * All phi constants, Fibonacci sequence, CSL thresholds, timing, pool ratios.
 * Single source of truth: shared/phi-math.js
 *
 * © 2024-2026 HeadySystems Inc. All Rights Reserved.
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE PHI CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PHI       = 1.6180339887498948;   // φ = (1 + √5) / 2
const PSI       = 0.6180339887498949;   // ψ = 1/φ = φ − 1
const PHI_SQ    = 2.618033988749895;    // φ² = φ + 1
const PHI_CUBED = 4.23606797749979;     // φ³ = 2φ + 1
const PHI_4     = PHI * PHI_CUBED;      // φ⁴ ≈ 6.854
const SQRT5     = 2.23606797749979;     // √5
const PSI_SQ    = PSI * PSI;            // ψ² ≈ 0.382

// Golden angle — fundamental to spiral phyllotaxis
const GOLDEN_ANGLE_RAD = 2 * Math.PI * PSI * PSI; // ≈ 2.39996 rad
const GOLDEN_ANGLE_DEG = 360 * PSI * PSI;          // ≈ 137.508°

// ═══════════════════════════════════════════════════════════════════════════════
// FIBONACCI SEQUENCE (first 26 terms, 0-indexed)
// ═══════════════════════════════════════════════════════════════════════════════

const FIB_CACHE = Object.freeze([
  0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55,
  89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765,
  10946, 17711, 28657, 46368, 75025
]);

// ═══════════════════════════════════════════════════════════════════════════════
// CSL GATE THRESHOLDS
// phiThreshold(level, spread) = 1 − ψ^level × spread
// ═══════════════════════════════════════════════════════════════════════════════

function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = Object.freeze({
  MINIMUM:   phiThreshold(0),   // ≈ 0.500 — noise floor
  LOW:       phiThreshold(1),   // ≈ 0.691 — weak alignment
  MEDIUM:    phiThreshold(2),   // ≈ 0.809 — moderate alignment
  HIGH:      phiThreshold(3),   // ≈ 0.882 — strong alignment
  CRITICAL:  phiThreshold(4),   // ≈ 0.927 — near-certain
  DEFAULT:   PSI,               //   0.618 — standard CSL gate (1/φ)
  DEDUP:     0.972,             // above CRITICAL, for semantic identity
  COHERENCE: phiThreshold(2),   // ≈ 0.809 — drift detection threshold
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHI TIMING (milliseconds)
// ═══════════════════════════════════════════════════════════════════════════════

function phiMs(n) {
  return Math.round(Math.pow(PHI, n) * 1000);
}

const PHI_TIMING = Object.freeze({
  PHI_1:  phiMs(1),   // 1,618ms
  PHI_2:  phiMs(2),   // 2,618ms
  PHI_3:  phiMs(3),   // 4,236ms
  PHI_4:  phiMs(4),   // 6,854ms
  PHI_5:  phiMs(5),   // 11,090ms
  PHI_6:  phiMs(6),   // 17,944ms
  PHI_7:  phiMs(7),   // 29,034ms
  PHI_8:  phiMs(8),   // 46,979ms
  PHI_9:  phiMs(9),   // 75,025ms (note: equals fib(25)!)
  PHI_10: phiMs(10),  // 121,393ms
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHI BACKOFF SEQUENCE
// ═══════════════════════════════════════════════════════════════════════════════

const PHI_BACKOFF_SEQ = Object.freeze([
  1000, 1618, 2618, 4236, 6854, 11090, 17944, 29034
]);

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE POOL RATIOS (φ-weighted)
// ═══════════════════════════════════════════════════════════════════════════════

const POOLS = Object.freeze({
  HOT:        0.34,   // 34% — user-facing, latency-critical
  WARM:       0.21,   // 21% — important background
  COLD:       0.13,   // 13% — batch, analytics
  RESERVE:    0.08,   //  8% — burst capacity
  GOVERNANCE: 0.05,   //  5% — governance always running
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRESSURE LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

const PRESSURE = Object.freeze({
  NOMINAL:  { min: 0,                          max: PSI_SQ,                    label: 'NOMINAL' },
  ELEVATED: { min: PSI_SQ,                     max: PSI,                       label: 'ELEVATED' },
  HIGH:     { min: PSI,                        max: 1 - Math.pow(PSI, 3),     label: 'HIGH' },
  CRITICAL: { min: 1 - Math.pow(PSI, 4),       max: 1.0,                      label: 'CRITICAL' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIBONACCI SPACING SCALE (pixels)
// ═══════════════════════════════════════════════════════════════════════════════

const SPACING = Object.freeze([1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);

// ═══════════════════════════════════════════════════════════════════════════════
// PHI TYPOGRAPHY SCALE (base 10px × φ^n)
// ═══════════════════════════════════════════════════════════════════════════════

const TYPE_SCALE = Object.freeze([
  10,                               // caption/small
  Math.round(10 * PHI),             // 16 — body
  Math.round(10 * PHI_SQ),          // 26 — h4
  Math.round(10 * PHI_CUBED),       // 42 — h3
  Math.round(10 * PHI_4),           // 69 — h2
  Math.round(10 * PHI * PHI_4),     // 111 — h1
]);

// ═══════════════════════════════════════════════════════════════════════════════
// UI ANIMATION TIMING (Fibonacci × 10ms)
// ═══════════════════════════════════════════════════════════════════════════════

const UI_TIMING = Object.freeze({
  instant:  20,    // fib(3) × 10
  fast:     50,    // fib(5) × 10
  normal:   130,   // fib(7) × 10
  slow:     210,   // fib(8) × 10
  glacial:  340,   // fib(9) × 10
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT PROPORTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const LAYOUT = Object.freeze({
  primaryWidth:   PSI,          // 0.618 → 61.8%
  secondaryWidth: 1 - PSI,     // 0.382 → 38.2%
  goldenSection:  PSI,          // 0.618
  goldenAngle:    GOLDEN_ANGLE_DEG,
});

module.exports = {
  // Core
  PHI, PSI, PHI_SQ, PHI_CUBED, PHI_4, SQRT5, PSI_SQ,
  GOLDEN_ANGLE_RAD, GOLDEN_ANGLE_DEG,
  // Fibonacci
  FIB_CACHE,
  // Thresholds
  phiThreshold, CSL_THRESHOLDS,
  // Timing
  phiMs, PHI_TIMING, PHI_BACKOFF_SEQ,
  // Pools
  POOLS,
  // Pressure
  PRESSURE,
  // UI Design System
  SPACING, TYPE_SCALE, UI_TIMING, LAYOUT,
};
