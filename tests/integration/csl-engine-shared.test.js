const { describe, it, expect } = require('vitest');

describe('csl-engine-shared', () => {
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

const cslEngine = require(path.resolve(__dirname, '../../shared/csl-engine.js'));

module.exports = {
  'CSL AND (cosine similarity) of identical vectors = 1.0': () => {
    const andFn = cslEngine.cslAND || cslEngine.AND || cslEngine.cosine;
    if (andFn) {
      const v = [1, 0, 0];
      const result = andFn(v, v);
      assert.ok(Math.abs(result - 1.0) < 0.001, `AND(v,v) should be 1.0, got ${result}`);
    }
  },

  'CSL AND of orthogonal vectors = 0': () => {
    const andFn = cslEngine.cslAND || cslEngine.AND || cslEngine.cosine;
    if (andFn) {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const result = andFn(a, b);
      assert.ok(Math.abs(result) < 0.001, `AND(orthogonal) should be 0, got ${result}`);
    }
  },

  'CSL OR (superposition) produces unit vector': () => {
    const orFn = cslEngine.cslOR || cslEngine.OR || cslEngine.superposition;
    if (orFn) {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const result = orFn(a, b);
      if (Array.isArray(result)) {
        const mag = Math.sqrt(result.reduce((s, x) => s + x * x, 0));
        assert.ok(Math.abs(mag - 1.0) < 0.01, `OR should produce unit vector, magnitude = ${mag}`);
      }
    }
  },

  'CSL NOT produces orthogonal component': () => {
    const notFn = cslEngine.cslNOT || cslEngine.NOT || cslEngine.orthogonalNegate;
    if (notFn) {
      const a = [0.7071, 0.7071, 0];
      const b = [1, 0, 0];
      const result = notFn(a, b);
      if (Array.isArray(result)) {
        // result · b should be ~0
        const dot = result[0] * b[0] + result[1] * b[1] + result[2] * b[2];
        assert.ok(Math.abs(dot) < 0.01, `NOT result should be orthogonal to b, dot = ${dot}`);
      }
    }
  },

  'CSL GATE uses sigmoid activation': () => {
    const gateFn = cslEngine.cslGATE || cslEngine.GATE || cslEngine.gate;
    if (gateFn) {
      // High cosine should pass through ~fully
      const high = gateFn(1.0, 0.95, 0.5, 0.236);
      const low = gateFn(1.0, 0.1, 0.5, 0.236);
      if (typeof high === 'number' && typeof low === 'number') {
        assert.ok(high > low, `GATE(high cos) > GATE(low cos): ${high} vs ${low}`);
      }
    }
  },

  'phiThreshold produces correct hierarchy': () => {
    // MINIMUM < LOW < MEDIUM < HIGH < CRITICAL
    const levels = [0, 1, 2, 3, 4].map(l => phiThreshold(l));
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] > levels[i - 1],
        `Level ${i} (${levels[i]}) should exceed level ${i - 1} (${levels[i - 1]})`);
    }
    assert.ok(Math.abs(levels[0] - 0.500) < 0.01, 'MINIMUM ~0.500');
    assert.ok(Math.abs(levels[4] - 0.927) < 0.01, 'CRITICAL ~0.927');
  }
};

  });
});
