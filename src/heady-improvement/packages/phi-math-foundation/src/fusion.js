'use strict';

const { PHI, PSI } = require('./constants');

/**
 * Generate n weights that sum to 1.0, distributed according to the golden ratio.
 * Each weight is proportional to PSI^i, then normalized.
 *
 * @param {number} n — number of weights (positive integer)
 * @returns {number[]} array of n weights summing to 1.0
 */
function phiFusionWeights(n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`n must be a positive integer, got ${n}`);
  }

  const raw = [];
  for (let i = 0; i < n; i++) {
    raw.push(Math.pow(PSI, i));
  }
  const total = raw.reduce((sum, w) => sum + w, 0);
  return raw.map((w) => w / total);
}

/**
 * Compute a priority score from an array of factors using phi-weighted fusion.
 * Each factor is weighted by its phi-fusion weight (earlier factors matter more),
 * and the result is a single score between 0 and 1 (assuming factors are in [0,1]).
 *
 * @param {number[]} factors — array of numeric factor values
 * @returns {number} weighted priority score
 */
function phiPriorityScore(factors) {
  if (!Array.isArray(factors) || factors.length === 0) {
    throw new TypeError('factors must be a non-empty array of numbers');
  }
  const weights = phiFusionWeights(factors.length);
  let score = 0;
  for (let i = 0; i < factors.length; i++) {
    score += factors[i] * weights[i];
  }
  return score;
}

/**
 * Generate n resource allocation weights using the golden ratio.
 * Unlike fusion weights (which favor early indices), resource weights
 * use a balanced phi-spiral distribution for more even allocation
 * while still maintaining phi proportions.
 *
 * @param {number} n — number of resource buckets
 * @returns {number[]} array of n weights summing to 1.0
 */
function phiResourceWeights(n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`n must be a positive integer, got ${n}`);
  }
  if (n === 1) return [1.0];

  const raw = [];
  for (let i = 0; i < n; i++) {
    // Use phi-modular distribution: weight = 1 / (1 + PSI * |i - center|)
    const center = (n - 1) / 2;
    const dist = Math.abs(i - center);
    raw.push(1 / (1 + PSI * dist));
  }
  const total = raw.reduce((sum, w) => sum + w, 0);
  return raw.map((w) => w / total);
}

/**
 * Split a whole value into n parts using golden-ratio proportions.
 * The parts sum exactly to `whole`. Each part is proportional to PSI^i.
 *
 * @param {number} whole — the total value to split
 * @param {number} n — number of parts
 * @returns {number[]} array of n values summing to `whole`
 */
function phiMultiSplit(whole, n) {
  if (typeof whole !== 'number' || !isFinite(whole)) {
    throw new TypeError(`whole must be a finite number, got ${whole}`);
  }
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`n must be a positive integer, got ${n}`);
  }

  const weights = phiFusionWeights(n);
  const parts = weights.map((w) => w * whole);

  // Correct floating-point drift: adjust the last element so the sum is exact
  const currentSum = parts.reduce((s, p) => s + p, 0);
  parts[parts.length - 1] += whole - currentSum;

  return parts;
}

module.exports = {
  phiFusionWeights,
  phiPriorityScore,
  phiResourceWeights,
  phiMultiSplit,
};
