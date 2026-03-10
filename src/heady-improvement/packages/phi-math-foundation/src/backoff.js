'use strict';

const { PHI, PSI2 } = require('./constants');

/**
 * Compute a phi-scaled exponential backoff delay with jitter.
 *
 * The base delay grows by PHI^attempt, then jitter of ±PSI² is applied
 * (uniform random in [1 - PSI², 1 + PSI²]), and the result is clamped to maxMs.
 *
 * @param {number} attempt — zero-based attempt number (0 = first retry)
 * @param {number} [baseMs=1000] — base delay in milliseconds
 * @param {number} [maxMs=60000] — maximum delay in milliseconds
 * @returns {number} delay in milliseconds (integer)
 */
function phiBackoff(attempt, baseMs = 1000, maxMs = 60000) {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new RangeError(`attempt must be a non-negative integer, got ${attempt}`);
  }
  if (baseMs <= 0) {
    throw new RangeError(`baseMs must be positive, got ${baseMs}`);
  }
  if (maxMs < baseMs) {
    throw new RangeError(`maxMs (${maxMs}) must be >= baseMs (${baseMs})`);
  }

  const raw = baseMs * Math.pow(PHI, attempt);
  const jitterMin = 1 - PSI2;
  const jitterMax = 1 + PSI2;
  const jitter = jitterMin + Math.random() * (jitterMax - jitterMin);
  const delayed = raw * jitter;
  return Math.min(Math.round(delayed), maxMs);
}

module.exports = {
  phiBackoff,
};
