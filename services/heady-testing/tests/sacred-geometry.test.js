/**
 * heady-testing — Sacred Geometry & Invariant Tests
 * Validates all φ-scaled constants, CSL thresholds, and system invariants.
 * © 2024-2026 HeadySystems Inc. All Rights Reserved.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHI, PSI, PSI_SQ, PSI_CUBED, PHI_SQ, PHI_CUBED, SQRT5,
  fib, fibCeil, fibFloor,
  phiMs, phiPower, PHI_TIMING,
  phiThreshold, CSL_THRESHOLDS,
  phiBackoff, phiBackoffWithJitter, PHI_BACKOFF_SEQ,
  phiFusionWeights, phiMultiSplit,
  PRESSURE, getPressureLevel, ALERTS,
  AUTO_SUCCESS, PIPELINE, BEE, POOLS,
  JUDGE, COST_W, EVICTION, VECTOR,
  cosineSimilarity, normalize, placeholderVector,
} from '../../../shared/phi-math.js';

describe('Core Constants', () => {
  it('φ = (1 + √5) / 2', () => {
    assert.ok(Math.abs(PHI - (1 + Math.sqrt(5)) / 2) < 1e-12);
  });

  it('ψ = 1/φ', () => {
    assert.ok(Math.abs(PSI - 1 / PHI) < 1e-12);
  });

  it('φ × ψ = 1', () => {
    assert.ok(Math.abs(PHI * PSI - 1) < 1e-12);
  });

  it('φ² = φ + 1', () => {
    assert.ok(Math.abs(PHI * PHI - (PHI + 1)) < 1e-10);
  });

  it('ψ² ≈ 0.382', () => {
    assert.ok(Math.abs(PSI_SQ - 0.382) < 0.001);
  });

  it('√5 is correct', () => {
    assert.ok(Math.abs(SQRT5 - Math.sqrt(5)) < 1e-12);
  });
});

describe('Fibonacci', () => {
  it('fib(0) = 0', () => assert.strictEqual(fib(0), 0));
  it('fib(1) = 1', () => assert.strictEqual(fib(1), 1));
  it('fib(8) = 21 (pipeline stages)', () => assert.strictEqual(fib(8), 21));
  it('fib(11) = 89 (bee types)', () => assert.strictEqual(fib(11), 89));
  it('fib(n)/fib(n-1) → φ', () => {
    const ratio = fib(20) / fib(19);
    assert.ok(Math.abs(ratio - PHI) < 1e-6);
  });
  it('fibCeil returns Fibonacci ≥ n', () => {
    assert.strictEqual(fibCeil(10), 13);
    assert.strictEqual(fibCeil(55), 55);
  });
  it('fibFloor returns Fibonacci ≤ n', () => {
    assert.strictEqual(fibFloor(10), 8);
    assert.strictEqual(fibFloor(55), 55);
  });
});

describe('PHI Timing', () => {
  it('φ¹ × 1000 = 1618ms', () => assert.strictEqual(phiMs(1), 1618));
  it('φ⁷ × 1000 = 29034ms (heartbeat)', () => assert.strictEqual(phiMs(7), 29034));
  it('PHI_TIMING entries are correct', () => {
    for (let i = 1; i <= 10; i++) {
      assert.strictEqual(PHI_TIMING[`PHI_${i}`], phiMs(i));
    }
  });
});

describe('CSL Thresholds', () => {
  it('MINIMUM ≈ 0.500', () => assert.ok(Math.abs(CSL_THRESHOLDS.MINIMUM - 0.5) < 0.001));
  it('DEFAULT = ψ ≈ 0.618', () => assert.ok(Math.abs(CSL_THRESHOLDS.DEFAULT - PSI) < 1e-10));
  it('monotonically increasing', () => {
    const ordered = [
      CSL_THRESHOLDS.MINIMUM,
      CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM,
      CSL_THRESHOLDS.HIGH,
      CSL_THRESHOLDS.CRITICAL,
    ];
    for (let i = 1; i < ordered.length; i++) {
      assert.ok(ordered[i] > ordered[i - 1], `${ordered[i]} should be > ${ordered[i - 1]}`);
    }
  });
});

describe('Backoff', () => {
  it('uses φ multiplier (never 2×)', () => {
    const b1 = phiBackoff(0);
    const b2 = phiBackoff(1);
    assert.ok(Math.abs(b2 / b1 - PHI) < 0.01);
  });
  it('respects max', () => {
    assert.ok(phiBackoff(100, 1000, 60000) <= 60000);
  });
  it('jitter stays within bounds', () => {
    for (let i = 0; i < 50; i++) {
      const val = phiBackoffWithJitter(2);
      assert.ok(val > 0);
      assert.ok(val <= 60000);
    }
  });
});

describe('Fusion Weights', () => {
  for (const n of [2, 3, 5, 7, 10]) {
    it(`n=${n} weights sum ≈ 1.0`, () => {
      const weights = phiFusionWeights(n);
      assert.strictEqual(weights.length, n);
      const sum = weights.reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 1.0) < 0.01, `Sum was ${sum}`);
    });
  }
});

describe('System Invariants', () => {
  it('89 bee types = fib(11)', () => assert.strictEqual(BEE.TYPES, 89));
  it('17 swarms', () => assert.strictEqual(BEE.SWARMS, 17));
  it('10,000 max bees', () => assert.strictEqual(BEE.MAX_TOTAL, 10000));
  it('21 pipeline stages = fib(8)', () => assert.strictEqual(PIPELINE.STAGES, 21));
  it('384-dim vectors', () => assert.strictEqual(VECTOR.DIMS, 384));
  it('3-dim projections', () => assert.strictEqual(VECTOR.PROJ_DIMS, 3));
  it('Auto-success cycle = φ⁷ × 1000', () => assert.strictEqual(AUTO_SUCCESS.CYCLE_MS, phiMs(7)));
});

describe('Pool Allocations', () => {
  it('sum ≤ 1.0', () => {
    const sum = POOLS.HOT + POOLS.WARM + POOLS.COLD + POOLS.RESERVE + POOLS.GOVERNANCE;
    assert.ok(sum <= 1.0 + 1e-10, `Pool sum ${sum} exceeds 1.0`);
  });
  it('HOT > WARM > COLD > RESERVE > GOVERNANCE', () => {
    assert.ok(POOLS.HOT > POOLS.WARM);
    assert.ok(POOLS.WARM > POOLS.COLD);
    assert.ok(POOLS.COLD > POOLS.RESERVE);
    assert.ok(POOLS.RESERVE > POOLS.GOVERNANCE);
  });
});

describe('Judge Scoring Weights', () => {
  it('sum ≈ 1.0', () => {
    const sum = JUDGE.CORRECTNESS + JUDGE.SAFETY + JUDGE.PERFORMANCE + JUDGE.QUALITY + JUDGE.ELEGANCE;
    assert.ok(Math.abs(sum - 1.0) < 0.01, `Judge weights sum: ${sum}`);
  });
});

describe('Vector Math', () => {
  it('cosine similarity of identical vectors = 1.0', () => {
    const v = [1, 2, 3, 4, 5];
    assert.ok(Math.abs(cosineSimilarity(v, v) - 1.0) < 1e-10);
  });
  it('cosine similarity of orthogonal vectors = 0.0', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    assert.ok(Math.abs(cosineSimilarity(a, b)) < 1e-10);
  });
  it('normalize produces unit vector', () => {
    const v = normalize([3, 4]);
    const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    assert.ok(Math.abs(mag - 1.0) < 1e-10);
  });
  it('placeholderVector is deterministic', () => {
    const a = placeholderVector('test-seed');
    const b = placeholderVector('test-seed');
    assert.deepStrictEqual(a, b);
  });
  it('placeholderVector produces unit vectors', () => {
    const v = placeholderVector('unit-check');
    const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    assert.ok(Math.abs(mag - 1.0) < 1e-6);
  });
});

describe('Pressure Levels', () => {
  it('NOMINAL for low utilization', () => {
    assert.strictEqual(getPressureLevel(0.1).label, 'NOMINAL');
  });
  it('CRITICAL for high utilization', () => {
    assert.strictEqual(getPressureLevel(0.95).label, 'CRITICAL');
  });
});
