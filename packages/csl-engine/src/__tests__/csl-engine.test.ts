import { describe, expect, it } from 'vitest';
import {
    dotProduct, magnitude, normalize, cosineSimilarity,
    randomUnitVector,
    cslAnd, cslOr, cslNot, cslImply, cslXor, cslConsensus,
    cslGate, cslResonanceGate,
    CSL_THRESHOLD, CSL_PHI, CSL_PSI,
    DynamicCSLEngine,
} from '../index.js';

// ─── Vector Primitives ──────────────────────────────────────────────────────

describe('dotProduct', () => {
    it('computes dot product of aligned vectors', () => {
        expect(dotProduct([1, 0, 0], [1, 0, 0])).toBe(1);
    });
    it('computes [1,2]·[3,4] = 11', () => {
        expect(dotProduct([1, 2], [3, 4])).toBe(11);
    });
    it('throws on empty vectors', () => {
        expect(() => dotProduct([], [])).toThrow(RangeError);
    });
    it('throws on length mismatch', () => {
        expect(() => dotProduct([1], [1, 2])).toThrow(RangeError);
    });
});

describe('magnitude', () => {
    it('[3,4] → 5', () => {
        expect(magnitude([3, 4])).toBe(5);
    });
    it('unit vector magnitude = 1', () => {
        expect(magnitude([1, 0, 0])).toBe(1);
    });
    it('throws on empty', () => {
        expect(() => magnitude([])).toThrow(RangeError);
    });
});

describe('normalize', () => {
    it('[3,4] → [0.6, 0.8]', () => {
        const n = normalize([3, 4]);
        expect(n[0]).toBeCloseTo(0.6);
        expect(n[1]).toBeCloseTo(0.8);
    });
    it('zero vector → zero vector', () => {
        const n = normalize([0, 0, 0]);
        expect(n).toEqual([0, 0, 0]);
    });
    it('result has magnitude ≈ 1', () => {
        const n = normalize([7, -3, 5]);
        expect(magnitude(n)).toBeCloseTo(1.0);
    });
    it('throws on empty', () => {
        expect(() => normalize([])).toThrow(RangeError);
    });
});

describe('cosineSimilarity', () => {
    it('identical vectors → 1.0', () => {
        expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1.0);
    });
    it('opposite vectors → -1.0', () => {
        expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
    });
    it('orthogonal vectors → 0.0', () => {
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
    });
    it('zero vector → 0', () => {
        expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });
    it('throws on mismatch', () => {
        expect(() => cosineSimilarity([1], [1, 2])).toThrow(RangeError);
    });
});

describe('randomUnitVector', () => {
    it('produces correct dimensionality', () => {
        expect(randomUnitVector(10).length).toBe(10);
    });
    it('produces unit vector', () => {
        expect(magnitude(randomUnitVector(50, 42))).toBeCloseTo(1.0);
    });
    it('same seed → same vector', () => {
        const a = randomUnitVector(5, 42);
        const b = randomUnitVector(5, 42);
        expect(a).toEqual(b);
    });
    it('different seeds → different vectors', () => {
        const a = randomUnitVector(5, 1);
        const b = randomUnitVector(5, 2);
        expect(a).not.toEqual(b);
    });
    it('throws on 0 or negative dimensions', () => {
        expect(() => randomUnitVector(0)).toThrow(RangeError);
        expect(() => randomUnitVector(-1)).toThrow(RangeError);
    });
});

// ─── CSL Gates ──────────────────────────────────────────────────────────────

describe('cslAnd', () => {
    it('identical vectors → 1.0', () => {
        const v = randomUnitVector(10, 1);
        expect(cslAnd(v, v)).toBeCloseTo(1.0);
    });
    it('orthogonal vectors → ~0', () => {
        expect(cslAnd([1, 0], [0, 1])).toBeCloseTo(0.0);
    });
});

describe('cslOr', () => {
    it('result is similar to both inputs', () => {
        const a = randomUnitVector(10, 1);
        const b = randomUnitVector(10, 2);
        const orVec = cslOr(a, b);
        expect(cosineSimilarity(orVec, a)).toBeGreaterThan(0);
        expect(cosineSimilarity(orVec, b)).toBeGreaterThan(0);
    });
    it('OR of same vector ≈ that vector', () => {
        const v = [0.6, 0.8];
        const result = cslOr(v, v);
        expect(cosineSimilarity(result, normalize(v))).toBeCloseTo(1.0);
    });
    it('throws on mismatch', () => {
        expect(() => cslOr([1], [1, 2])).toThrow(RangeError);
    });
});

describe('cslNot', () => {
    it('result is orthogonal to basis', () => {
        const vector = [1, 1, 0];
        const basis = [1, 0, 0];
        const notVec = cslNot(vector, basis);
        // Should be orthogonal to basis
        expect(dotProduct(notVec, normalize(basis))).toBeCloseTo(0, 5);
    });
    it('NOT(v, v) → zero vector (parallel removal)', () => {
        const v = [3, 4];
        const notVec = cslNot(v, v);
        // Removing all of v from v leaves zero
        expect(magnitude(notVec)).toBeCloseTo(0, 5);
    });
});

describe('cslImply', () => {
    it('projection of aligned vectors ≈ same direction', () => {
        const premise = [1, 0, 0];
        const conclusion = [2, 0, 0]; // same direction
        const result = cslImply(premise, conclusion);
        expect(cosineSimilarity(result, normalize(premise))).toBeCloseTo(1.0);
    });
    it('projection of orthogonal → zero magnitude', () => {
        const premise = [1, 0];
        const conclusion = [0, 1]; // orthogonal
        const result = cslImply(premise, conclusion);
        expect(magnitude(result)).toBeCloseTo(0, 5);
    });
});

describe('cslXor', () => {
    it('identical vectors → low/zero XOR', () => {
        const v = normalize([1, 1, 0]);
        const xor = cslXor(v, v);
        // XOR of same should try to remove shared component → tiny remainder
        expect(magnitude(xor)).toBeLessThan(0.5);
    });
    it('orthogonal vectors → captures both unique components', () => {
        const a = [1, 0];
        const b = [0, 1];
        const xor = cslXor(a, b);
        expect(magnitude(xor)).toBeGreaterThan(0);
    });
});

describe('cslConsensus', () => {
    it('single vector → itself (normalised)', () => {
        const v = [3, 4];
        const result = cslConsensus([v]);
        expect(cosineSimilarity(result, normalize(v))).toBeCloseTo(1.0);
    });
    it('φ-weighted: first vector gets highest weight', () => {
        const a = [1, 0]; // first = most relevant
        const b = [0, 1]; // second = less relevant
        const result = cslConsensus([a, b]);
        // Should lean toward a
        expect(cosineSimilarity(result, normalize(a))).toBeGreaterThan(
            cosineSimilarity(result, normalize(b))
        );
    });
    it('throws on empty', () => {
        expect(() => cslConsensus([])).toThrow(RangeError);
    });
    it('throws on dimension mismatch', () => {
        expect(() => cslConsensus([[1, 2], [1, 2, 3]])).toThrow(RangeError);
    });
});

describe('cslGate', () => {
    it('signal at threshold → ~0.5', () => {
        expect(cslGate(CSL_THRESHOLD)).toBeCloseTo(0.5, 1);
    });
    it('signal well above threshold → near 1', () => {
        expect(cslGate(1.0)).toBeGreaterThan(0.9);
    });
    it('signal well below threshold → near 0', () => {
        expect(cslGate(0.0)).toBeLessThan(0.1);
    });
    it('throws on non-finite signal', () => {
        expect(() => cslGate(NaN)).toThrow(RangeError);
        expect(() => cslGate(Infinity)).toThrow(RangeError);
    });
    it('throws on non-finite threshold', () => {
        expect(() => cslGate(0.5, NaN)).toThrow(RangeError);
    });
});

describe('cslResonanceGate', () => {
    it('identical vectors → true', () => {
        const v = randomUnitVector(10, 1);
        expect(cslResonanceGate(v, v)).toBe(true);
    });
    it('orthogonal vectors → false', () => {
        expect(cslResonanceGate([1, 0], [0, 1])).toBe(false);
    });
});

// ─── Constants ──────────────────────────────────────────────────────────────

describe('exported constants', () => {
    it('CSL_THRESHOLD is φ-derived', () => {
        expect(CSL_THRESHOLD).toBeGreaterThan(0.5);
        expect(CSL_THRESHOLD).toBeLessThan(1.0);
    });
    it('CSL_PHI ≈ 1.618', () => {
        expect(CSL_PHI).toBeCloseTo(1.618, 3);
    });
    it('CSL_PSI ≈ 0.618', () => {
        expect(CSL_PSI).toBeCloseTo(0.618, 3);
    });
});

// ─── DynamicCSLEngine ───────────────────────────────────────────────────────

describe('DynamicCSLEngine', () => {
    it('and() returns similarity + pass/fail + threshold', () => {
        const engine = new DynamicCSLEngine({ confidence: 0.9 });
        const v = randomUnitVector(10, 1);
        const result = engine.and(v, v);
        expect(result.similarity).toBeCloseTo(1.0);
        expect(result.passes).toBe(true);
        expect(result.threshold).toBeGreaterThan(0);
        expect(result.threshold).toBeLessThan(1);
    });

    it('gate() scales gain with confidence', () => {
        const lowConf = new DynamicCSLEngine({ confidence: 0.1 });
        const highConf = new DynamicCSLEngine({ confidence: 0.99 });
        // At threshold, low-confidence gate → ~0.5, high-confidence → also ~0.5
        // But slightly above threshold: high confidence is sharper
        const signal = CSL_THRESHOLD + 0.05;
        const lowResult = lowConf.gate(signal);
        const highResult = highConf.gate(signal);
        expect(highResult).toBeGreaterThan(lowResult);
    });

    it('consensus() with momentum blends over calls', () => {
        const engine = new DynamicCSLEngine({ momentum: true, momentumDecay: 0.5 });

        const v1 = [1, 0, 0];
        const v2 = [0, 1, 0];

        const first = engine.consensus([v1]);
        const second = engine.consensus([v2]);
        // Second call should blend v2 with remembered v1
        expect(cosineSimilarity(second, normalize(v1))).toBeGreaterThan(0);
        expect(cosineSimilarity(second, normalize(v2))).toBeGreaterThan(0);
    });

    it('consensus() without momentum is stateless', () => {
        const engine = new DynamicCSLEngine({ momentum: false });
        const v1 = [1, 0, 0];
        const v2 = [0, 1, 0];

        engine.consensus([v1]);
        const second = engine.consensus([v2]);
        // No blending — second result should be pure v2
        expect(cosineSimilarity(second, normalize(v2))).toBeCloseTo(1.0);
    });

    it('route() ranks targets by similarity with φ-decay confidence', () => {
        const engine = new DynamicCSLEngine();
        const input = [1, 0, 0];
        const targets = [
            { id: 'exact', vector: [1, 0, 0] },
            { id: 'partial', vector: [0.7, 0.7, 0] },
            { id: 'orthogonal', vector: [0, 0, 1] },
        ];

        const results = engine.route(input, targets);
        expect(results[0].id).toBe('exact');
        expect(results[0].score).toBeCloseTo(1.0);
        // Confidence decays by φ per rank
        expect(results[1].confidence).toBeLessThan(results[0].confidence);
        expect(results[2].confidence).toBeLessThan(results[1].confidence);
    });

    it('updateContext() changes threshold behavior', () => {
        const engine = new DynamicCSLEngine({ dimensions: 3 });
        const result1 = engine.and([1, 0, 0], [0.7, 0.7, 0]);

        engine.updateContext({ dimensions: 1000 });
        const result2 = engine.and([1, 0, 0], [0.7, 0.7, 0]);

        // Higher dims → lower threshold → same similarity more likely passes
        expect(result2.threshold).toBeLessThan(result1.threshold);
    });
});
