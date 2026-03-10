'use strict';

/**
 * Golden ratio and derived constants for the Heady platform.
 */

const PHI = 1.618033988749895;
const PSI = 1 / PHI; // ≈ 0.6180339887498949
const PSI2 = PSI * PSI; // ≈ 0.38196601125010515
const PHI_SQUARED = PHI * PHI; // ≈ 2.618033988749895
const PHI_CUBED = PHI * PHI * PHI; // ≈ 4.23606797749979

const FIB = [
  1, 1, 2, 3, 5, 8, 13, 21, 34, 55,
  89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765,
];

/**
 * CSL (Cognitive Safety Level) gates define phi-derived thresholds
 * for gating decisions across the platform.
 */
const CSL_GATES = {
  GATE_1: PSI2,          // ≈ 0.382 — minimal safety
  GATE_2: PSI,           // ≈ 0.618 — standard safety
  GATE_3: PSI + PSI2,    // ≈ 1.000 — elevated safety (PSI + PSI² = 1)
  GATE_4: PHI - PSI2,    // ≈ 1.236 — high safety
  GATE_5: PHI,           // ≈ 1.618 — maximum safety
};

module.exports = {
  PHI,
  PSI,
  PSI2,
  PHI_SQUARED,
  PHI_CUBED,
  FIB,
  CSL_GATES,
};
