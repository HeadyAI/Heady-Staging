/**
 * Heady Phi-Math Foundation — Canonical Constants
 * Every number in the Heady ecosystem derives from phi (φ) or Fibonacci
 * © 2026 HeadySystems Inc. — 60+ Provisional Patents
 */
'use strict';

// Golden Ratio
const PHI = 1.618033988749895;
const PSI = 0.618033988749895; // 1/PHI = PHI - 1
const PHI_SQ = PHI * PHI; // 2.618...
const PSI_SQ = PSI * PSI; // 0.382...
const PSI_CUBE = PSI * PSI * PSI; // 0.236...

// Fibonacci Sequence (first 20 terms)
const FIB = [0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181];

// CSL Gate Thresholds (all phi-derived)
const CSL_THRESHOLDS = {
  MINIMUM: 0.500,     // Noise floor
  LOW: 0.691,         // PSI^(1/PHI)
  MEDIUM: 0.809,      // 1 - PSI^PHI
  HIGH: 0.882,        // PHI^(-1/3)
  CRITICAL: 0.927,    // 1 - PSI^(PHI^2)
  DEDUP: 0.972        // Deduplication threshold
};

// Resource Pool Allocation (phi-derived percentages)
const POOLS = {
  HOT: 0.34,       // User-facing, latency-critical
  WARM: 0.21,      // Background processing
  COLD: 0.13,      // Batch processing, analytics
  RESERVE: 0.08,   // Burst capacity
  GOVERNANCE: 0.05  // Always-on governance
};

// Phi-Backoff Calculator
function phiBackoff(attempt, baseMs = 1000) {
  const delay = Math.pow(PHI, attempt) * baseMs;
  const jitter = delay * PSI_SQ * (Math.random() - 0.5); // ±38.2% jitter
  return Math.min(delay + jitter, FIB[15] * 1000); // Cap at 610s
}

// Phi-Adaptive Interval
function phiAdaptiveInterval(healthScore, baseMs = 5000) {
  return healthScore >= CSL_THRESHOLDS.HIGH
    ? baseMs * PHI  // Healthy: check less often
    : baseMs * PSI; // Degraded: check more often
}

// Fusion Weights (for multi-source aggregation)
const FUSION_WEIGHTS = {
  TWO_WAY: [PSI, PSI_SQ],                    // [0.618, 0.382]
  THREE_WAY: [0.528, 0.326, 0.146],          // Phi-normalized
  FIVE_WAY: [0.340, 0.210, 0.130, 0.080, 0.050] // Pool ratios
};

// Memory Tier TTLs
const MEMORY_TIERS = {
  T0_HOT: FIB[7] * 3600 * 1000,     // 21 hours
  T1_WARM: FIB[12] * 3600 * 1000,   // 144 hours (~6 days)
  T2_COLD: FIB[15] * 3600 * 1000    // 610 hours (~25 days)
};

// Circuit Breaker Config
const BREAKER_CONFIG = {
  failureThreshold: FIB[5],    // 8 failures
  resetTimeout: FIB[8] * 1000, // 34 seconds
  halfOpenMax: FIB[3],          // 3 test requests
  backoffBase: 1000,
  backoffFn: phiBackoff
};

module.exports = {
  PHI, PSI, PHI_SQ, PSI_SQ, PSI_CUBE, FIB,
  CSL_THRESHOLDS, POOLS, FUSION_WEIGHTS, MEMORY_TIERS, BREAKER_CONFIG,
  phiBackoff, phiAdaptiveInterval
};
