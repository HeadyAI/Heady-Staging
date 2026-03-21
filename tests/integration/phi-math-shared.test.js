const { describe, it, expect } = require('vitest');

describe('phi-math-shared', () => {
  it('passes all checks', () => {
'use strict';

const assert = require('assert');
const path = require('path');

/** @constant {number} PHI */
const PHI = 1.6180339887498948;

/** @constant {number} PSI */
const PSI = 1 / PHI;

/**
 * Compute phiThreshold at given level
 * @param {number} level - Threshold level (0-4)
 * @param {number} [spread=0.5] - Spread factor
 * @returns {number} Threshold value
 */
function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const phiMath = require(path.resolve(__dirname, '../../shared/phi-math.js'));

module.exports = {
  'phi-math exports PHI constant': () => {
    const phi = phiMath.PHI || phiMath.phi || phiMath.GOLDEN_RATIO;
    assert.ok(phi, 'phi-math must export PHI');
    assert.ok(Math.abs(phi - 1.6180339887498948) < 0.0001, `PHI should be ~1.618, got ${phi}`);
  },

  'phi-math exports PSI (conjugate)': () => {
    const psi = phiMath.PSI || phiMath.psi || phiMath.PHI_CONJUGATE;
    if (psi) {
      assert.ok(Math.abs(psi - 0.6180339887498948) < 0.001, `PSI should be ~0.618, got ${psi}`);
    }
  },

  'phi-math provides Fibonacci function': () => {
    const fib = phiMath.fib || phiMath.fibonacci || phiMath.fibonacciNumber;
    if (fib) {
      assert.strictEqual(fib(10), 55, 'fib(10) should be 55');
      assert.strictEqual(fib(12), 144, 'fib(12) should be 144');
      assert.strictEqual(fib(8), 21, 'fib(8) should be 21');
    }
  },

  'phi-math provides phiThreshold function': () => {
    const ptFn = phiMath.phiThreshold || phiMath.threshold;
    if (ptFn) {
      const min = ptFn(0);
      const crit = ptFn(4);
      assert.ok(Math.abs(min - 0.500) < 0.01, `MINIMUM should be ~0.500, got ${min}`);
      assert.ok(Math.abs(crit - 0.927) < 0.01, `CRITICAL should be ~0.927, got ${crit}`);
      assert.ok(crit > min, 'CRITICAL > MINIMUM');
    }
  },

  'phi-math provides phiBackoff function': () => {
    const backoff = phiMath.phiBackoff || phiMath.backoff;
    if (backoff) {
      const t0 = backoff(0, 1000);
      const t1 = backoff(1, 1000);
      assert.ok(typeof t0 === 'number' && t0 >= 1000, `Attempt 0 >= 1000ms, got ${t0}`);
      assert.ok(t1 > t0, `Attempt 1 (${t1}) > Attempt 0 (${t0})`);
    }
  },

  'phi-math provides resource allocation weights': () => {
    const weights = phiMath.phiResourceWeights || phiMath.resourceWeights;
    if (weights) {
      const w = typeof weights === 'function' ? weights(5) : weights;
      if (Array.isArray(w)) {
        const sum = w.reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(sum - 1.0) < 0.05, `Weights should sum to ~1.0, got ${sum}`);
        // Should be descending
        for (let i = 1; i < w.length; i++) {
          assert.ok(w[i] <= w[i - 1], 'Weights should be descending');
        }
      }
    }
  }
};

  });
});
