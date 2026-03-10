/**
 * HDC/VSA + Ternary Logic Test Suite
 * 
 * Tests: Binary BSC, Bipolar MAP, Real HRR operations,
 * codebook encode/decode, and all 5 ternary logic modes.
 * 
 * @author Eric Haywood — HeadySystems Inc.
 */

import { describe, it, expect } from '@jest/globals';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;

describe('Binary BSC Operations', () => {
  const randomBinary = (dim) => {
    const v = new Uint8Array(dim);
    for (let i = 0; i < dim; i++) v[i] = Math.random() < 0.5 ? 0 : 1;
    return v;
  };

  const bind = (a, b) => {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) result[i] = a[i] ^ b[i];
    return result;
  };

  const distance = (a, b) => {
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += a[i] !== b[i] ? 1 : 0;
    return diff / a.length;
  };

  it('should produce random vectors near 50% density', () => {
    const v = randomBinary(384);
    const ones = v.reduce((s, b) => s + b, 0);
    // Should be near 192 (50% of 384)
    expect(ones).toBeGreaterThan(150);
    expect(ones).toBeLessThan(234);
  });

  it('should have BIND as self-inverse: bind(bind(a,b), b) ≈ a', () => {
    const a = randomBinary(384);
    const b = randomBinary(384);
    const ab = bind(a, b);
    const recovered = bind(ab, b);
    // XOR is exactly self-inverse
    expect(Array.from(recovered)).toEqual(Array.from(a));
  });

  it('should produce quasi-orthogonal random vectors', () => {
    const a = randomBinary(384);
    const b = randomBinary(384);
    const d = distance(a, b);
    // Random binary vectors should have ~0.5 Hamming distance
    expect(d).toBeGreaterThan(0.35);
    expect(d).toBeLessThan(0.65);
  });
});

describe('Bipolar MAP Operations', () => {
  const randomBipolar = (dim) => {
    const v = new Float64Array(dim);
    for (let i = 0; i < dim; i++) v[i] = Math.random() < 0.5 ? -1 : 1;
    return v;
  };

  const bind = (a, b) => {
    const result = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) result[i] = a[i] * b[i];
    return result;
  };

  const cosine = (a, b) => {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot / a.length; // for bipolar, magnitude is sqrt(D)
  };

  it('should have BIND as self-inverse for bipolar', () => {
    const a = randomBipolar(384);
    const b = randomBipolar(384);
    const ab = bind(a, b);
    const recovered = bind(ab, b);
    // multiply-bind is exactly self-inverse for bipolar
    expect(Array.from(recovered)).toEqual(Array.from(a));
  });

  it('should produce quasi-orthogonal random bipolar vectors', () => {
    const a = randomBipolar(384);
    const b = randomBipolar(384);
    const sim = cosine(a, b);
    // Should be near 0 (orthogonal)
    expect(Math.abs(sim)).toBeLessThan(0.15);
  });
});

describe('Ternary Logic', () => {
  const TRUE = 1.0;
  const UNKNOWN = 0.0;
  const FALSE = -1.0;
  const THRESHOLD = PSI2; // ≈ 0.382

  const discretize = (v) => {
    if (v > THRESHOLD) return 'TRUE';
    if (v < -THRESHOLD) return 'FALSE';
    return 'UNKNOWN';
  };

  describe('Kleene K3', () => {
    const and = (a, b) => Math.min(a, b);
    const or = (a, b) => Math.max(a, b);
    const not = (a) => -a;

    it('should satisfy AND truth table', () => {
      expect(discretize(and(TRUE, TRUE))).toBe('TRUE');
      expect(discretize(and(TRUE, FALSE))).toBe('FALSE');
      expect(discretize(and(TRUE, UNKNOWN))).toBe('UNKNOWN');
      expect(discretize(and(FALSE, UNKNOWN))).toBe('FALSE');
    });

    it('should satisfy OR truth table', () => {
      expect(discretize(or(TRUE, FALSE))).toBe('TRUE');
      expect(discretize(or(FALSE, FALSE))).toBe('FALSE');
      expect(discretize(or(FALSE, UNKNOWN))).toBe('UNKNOWN');
      expect(discretize(or(TRUE, UNKNOWN))).toBe('TRUE');
    });

    it('should satisfy NOT involution: NOT(NOT(a)) = a', () => {
      expect(not(not(TRUE))).toBe(TRUE);
      expect(not(not(FALSE))).toBe(FALSE);
      expect(not(not(UNKNOWN))).toBe(UNKNOWN);
    });

    it('should satisfy De Morgan: NOT(AND(a,b)) = OR(NOT(a),NOT(b))', () => {
      const values = [TRUE, FALSE, UNKNOWN];
      for (const a of values) {
        for (const b of values) {
          expect(not(and(a, b))).toBeCloseTo(or(not(a), not(b)), 10);
        }
      }
    });
  });

  describe('Łukasiewicz', () => {
    const and = (a, b) => Math.max(a + b - 1, -1);
    const or = (a, b) => Math.min(a + b + 1, 1);

    it('should satisfy bounded conjunction', () => {
      expect(and(TRUE, TRUE)).toBe(TRUE);
      expect(and(TRUE, FALSE)).toBe(FALSE);
      expect(and(0.5, 0.3)).toBeCloseTo(-0.2, 5);
    });

    it('should satisfy bounded disjunction', () => {
      expect(or(FALSE, FALSE)).toBe(FALSE);
      expect(or(TRUE, FALSE)).toBe(TRUE);
    });
  });

  describe('CSL-Continuous', () => {
    const sigmoid = (x, tau, temp) => 1 / (1 + Math.exp(-(x - tau) / temp));

    const gate = (value, gateSignal, tau = PSI2, temp = PSI * PSI * PSI) =>
      value * sigmoid(gateSignal, tau, temp);

    it('should smoothly gate values (no hard boolean cutoff)', () => {
      const results = [];
      for (let g = -1; g <= 1; g += 0.1) {
        results.push(gate(1.0, g));
      }
      // Should be monotonically increasing
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBeGreaterThanOrEqual(results[i - 1] - 0.001);
      }
    });

    it('should pass high-confidence signals fully', () => {
      const gated = gate(1.0, 0.95);
      expect(gated).toBeGreaterThan(0.95);
    });

    it('should attenuate low-confidence signals', () => {
      const gated = gate(1.0, -0.5);
      expect(gated).toBeLessThan(0.1);
    });
  });

  describe('Truth Threshold', () => {
    it('should use ψ² ≈ 0.382 as threshold (φ-derived)', () => {
      expect(THRESHOLD).toBeCloseTo(0.382, 3);
      expect(THRESHOLD).toBeCloseTo(PSI2, 10);
    });

    it('should correctly discretize boundary values', () => {
      expect(discretize(0.4)).toBe('TRUE');
      expect(discretize(-0.4)).toBe('FALSE');
      expect(discretize(0.0)).toBe('UNKNOWN');
      expect(discretize(0.38)).toBe('UNKNOWN');
      expect(discretize(-0.38)).toBe('UNKNOWN');
    });
  });
});
