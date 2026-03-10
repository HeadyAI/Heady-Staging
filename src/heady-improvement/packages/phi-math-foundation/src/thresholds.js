'use strict';

const { PHI, PSI, PSI2 } = require('./constants');

/**
 * Compute a phi-derived threshold at a given level.
 * The threshold is calculated as: 1 - (spread * PSI^level)
 * This produces a converging series where higher levels approach 1.0.
 *
 * @param {number} level — positive integer (1-based)
 * @param {number} [spread=0.5] — controls the range of the threshold curve
 * @returns {number} threshold value between 0 and 1
 */
function phiThreshold(level, spread = 0.5) {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`level must be a positive integer, got ${level}`);
  }
  if (spread < 0 || spread > 1) {
    throw new RangeError(`spread must be in [0, 1], got ${spread}`);
  }
  return 1 - spread * Math.pow(PSI, level);
}

/**
 * CSL (Cognitive Safety Level) thresholds derived from the golden ratio.
 * Each level uses phi-scaled distances from 1.0.
 *
 * CRITICAL: 1 - PSI^4 * spread ≈ 0.927
 * HIGH:     1 - PSI^3 * spread ≈ 0.882
 * MEDIUM:   1 - PSI^2 * spread ≈ 0.809
 * LOW:      1 - PSI^1 * spread ≈ 0.691
 * MINIMUM:  0.500
 */
const CSL_THRESHOLDS = {
  CRITICAL: 1 - 0.5 * Math.pow(PSI, 4),   // ≈ 0.927
  HIGH:     1 - 0.5 * Math.pow(PSI, 3),    // ≈ 0.882
  MEDIUM:   1 - 0.5 * Math.pow(PSI, 2),    // ≈ 0.809
  LOW:      1 - 0.5 * Math.pow(PSI, 1),    // ≈ 0.691
  MINIMUM:  0.500,                           // baseline
};

/**
 * Pressure levels for system load monitoring, scaled by phi.
 * Maps human-readable names to phi-derived fractional thresholds.
 */
const PRESSURE_LEVELS = {
  IDLE:      0,
  LOW:       PSI2,               // ≈ 0.382
  MODERATE:  PSI,                // ≈ 0.618
  HIGH:      PSI + PSI2 * PSI,   // ≈ 0.854
  CRITICAL:  1 - (1 / (PHI * PHI * PHI)),  // ≈ 0.764
  OVERLOAD:  1.0,
};

/**
 * Alert thresholds for monitoring, using phi-scaled percentages.
 */
const ALERT_THRESHOLDS = {
  CPU_WARNING:      PSI,          // ≈ 61.8%
  CPU_CRITICAL:     PSI + PSI2 * PSI, // ≈ 85.4%
  MEMORY_WARNING:   PSI,          // ≈ 61.8%
  MEMORY_CRITICAL:  1 - PSI2 * PSI2, // ≈ 85.4%
  DISK_WARNING:     PSI2 + PSI * PSI2, // ≈ 61.8%
  DISK_CRITICAL:    1 - Math.pow(PSI, 4), // ≈ 85.4%
  LATENCY_P50:      100,          // ms baseline
  LATENCY_P95:      100 * PHI,    // ≈ 161.8 ms
  LATENCY_P99:      100 * PHI * PHI, // ≈ 261.8 ms
  ERROR_RATE_WARN:  1 - PSI,      // ≈ 0.382 (38.2%)
  ERROR_RATE_CRIT:  PSI,          // ≈ 0.618 (61.8%)
};

module.exports = {
  phiThreshold,
  CSL_THRESHOLDS,
  PRESSURE_LEVELS,
  ALERT_THRESHOLDS,
};
