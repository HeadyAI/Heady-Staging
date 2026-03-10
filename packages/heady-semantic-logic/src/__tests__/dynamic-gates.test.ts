import { describe, expect, it } from 'vitest';
import {
    AND, OR, NOT, XOR, NAND, NOR, XNOR, IMPLY,
    WEIGHTED_AND, WEIGHTED_OR,
    createGate, evaluateGateChain,
    AdaptiveSemanticGate,
    selectTNorm, signalVariance, phiWeights,
} from '../index.js';
import { SemanticTruthValue } from '../core/truth-value.js';

// ─── Helper ─────────────────────────────────────────────────────────────────
const tv = (v: number, label?: string, conf = 1.0) => new SemanticTruthValue(v, label, conf);
const PSI = 0.618033988749895;

// ─── Signal Analysis ────────────────────────────────────────────────────────
describe('signalVariance', () => {
    it('returns 0 for single value', () => {
        expect(signalVariance([0.7])).toBe(0);
    });
    it('returns 0 for identical values', () => {
        expect(signalVariance([0.5, 0.5, 0.5])).toBeCloseTo(0);
    });
    it('returns positive for spread values', () => {
        expect(signalVariance([0.1, 0.9])).toBeGreaterThan(0.1);
    });
});

describe('phiWeights', () => {
    it('returns [1] for single input', () => {
        expect(phiWeights(1)).toEqual([1]);
    });
    it('sums to 1', () => {
        const w = phiWeights(5);
        expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0);
    });
    it('first weight is largest (φ-decay)', () => {
        const w = phiWeights(4);
        for (let i = 1; i < w.length; i++) {
            expect(w[i]).toBeLessThan(w[i - 1]);
        }
    });
});

describe('selectTNorm', () => {
    it('selects product for tight, high-confidence signals', () => {
        expect(selectTNorm([0.8, 0.81, 0.79], { confidence: 0.9 })).toBe('product');
    });
    it('selects lukasiewicz for low-confidence signals', () => {
        expect(selectTNorm([0.5, 0.5], { confidence: 0.1 })).toBe('lukasiewicz');
    });
    it('respects forceTNorm override', () => {
        expect(selectTNorm([0.5, 0.5], { forceTNorm: 'zadeh' })).toBe('zadeh');
    });
});

// ─── Backward-Compatible Gates ──────────────────────────────────────────────
describe('AND', () => {
    it('returns 1.0 for empty inputs', () => {
        expect(AND([]).value).toBe(1.0);
    });
    it('computes conjunction for two values', () => {
        const result = AND([tv(0.8), tv(0.6)]);
        expect(result.value).toBeGreaterThan(0);
        expect(result.value).toBeLessThanOrEqual(0.8);
    });
    it('respects static t-norm when adaptive=false', () => {
        const zadeh = AND([tv(0.7), tv(0.4)], { adaptive: false, tnorm: 'zadeh' });
        expect(zadeh.value).toBeCloseTo(0.4); // min(0.7, 0.4)
        const product = AND([tv(0.7), tv(0.4)], { adaptive: false, tnorm: 'product' });
        expect(product.value).toBeCloseTo(0.28); // 0.7 * 0.4
    });
    it('auto-selects t-norm by default (adaptive=true)', () => {
        // Tight signals: should select product (stricter than zadeh)
        const tight = AND([tv(0.9), tv(0.91), tv(0.89)]);
        // The label should indicate which t-norm was selected
        expect(tight.label).toMatch(/AND\[(product|zadeh|lukasiewicz)\]/);
    });
});

describe('OR', () => {
    it('returns 0.0 for empty inputs', () => {
        expect(OR([]).value).toBe(0.0);
    });
    it('computes disjunction', () => {
        const result = OR([tv(0.3), tv(0.8)]);
        expect(result.value).toBeGreaterThanOrEqual(0.3);
    });
});

describe('NOT', () => {
    it('computes complement', () => {
        expect(NOT(tv(0.3)).value).toBeCloseTo(0.7);
    });
    it('NOT(0) = 1, NOT(1) = 0', () => {
        expect(NOT(tv(0)).value).toBeCloseTo(1.0);
        expect(NOT(tv(1)).value).toBeCloseTo(0.0);
    });
});

describe('compound gates', () => {
    it('NAND = NOT(AND)', () => {
        const inputs = [tv(0.7), tv(0.4)];
        const nand = NAND(inputs, { adaptive: false, tnorm: 'zadeh' });
        expect(nand.value).toBeCloseTo(1 - 0.4);
    });
    it('NOR = NOT(OR)', () => {
        const inputs = [tv(0.3), tv(0.8)];
        const nor = NOR(inputs, { adaptive: false, tnorm: 'zadeh' });
        expect(nor.value).toBeCloseTo(1 - 0.8);
    });
    it('XOR returns |a - b|', () => {
        expect(XOR(tv(0.8), tv(0.3)).value).toBeCloseTo(0.5);
    });
    it('XNOR = NOT(XOR)', () => {
        expect(XNOR(tv(0.8), tv(0.3)).value).toBeCloseTo(0.5);
    });
    it('IMPLY(a, b) = OR(NOT(a), b)', () => {
        const result = IMPLY(tv(0.7), tv(0.9), { tnorm: 'zadeh' });
        expect(result.value).toBeCloseTo(Math.max(0.3, 0.9));
    });
});

describe('WEIGHTED gates', () => {
    it('WEIGHTED_AND uses φ-weights when no explicit weights', () => {
        const result = WEIGHTED_AND([tv(0.9), tv(0.1)]);
        // φ-weighted: first gets ~0.618 weight, second gets ~0.382
        // result ≈ 0.618 * 0.9 + 0.382 * 0.1 ≈ 0.594
        expect(result.value).toBeGreaterThan(0.5);
        expect(result.value).toBeLessThan(0.9);
    });
    it('WEIGHTED_OR produces value in (0, 1]', () => {
        const result = WEIGHTED_OR([tv(0.5), tv(0.5)]);
        expect(result.value).toBeGreaterThan(0);
        expect(result.value).toBeLessThanOrEqual(1);
    });
});

// ─── createGate & evaluateGateChain ─────────────────────────────────────────
describe('createGate', () => {
    it('creates a callable gate', () => {
        const andGate = createGate('AND');
        const result = andGate(tv(0.8), tv(0.6));
        expect(result.value).toBeGreaterThan(0);
    });
    it('throws on unknown type', () => {
        expect(() => createGate('UNKNOWN' as any)(tv(0.5))).toThrow('Unknown gate type');
    });
});

describe('evaluateGateChain', () => {
    it('chains AND → NOT', () => {
        const result = evaluateGateChain(
            [{ type: 'AND' }, { type: 'NOT' }],
            [tv(0.7), tv(0.4)]
        );
        // AND first, then NOT
        expect(result.value).toBeGreaterThan(0);
        expect(result.value).toBeLessThan(1);
    });
});

// ─── AdaptiveSemanticGate ────────────────────────────────────────────────────
describe('AdaptiveSemanticGate', () => {
    it('creates with default context', () => {
        const gate = new AdaptiveSemanticGate();
        const diag = gate.diagnostics();
        expect(diag.confidence).toBeCloseTo(PSI);
        expect(diag.pipelineStatus).toHaveProperty('intake');
    });

    it('and() operates through nibble pipeline', () => {
        const gate = new AdaptiveSemanticGate({ confidence: 0.9 });
        const result = gate.and([tv(0.8), tv(0.7)]);
        expect(result.value).toBeGreaterThan(0);
        expect(result.value).toBeLessThanOrEqual(1);
        expect(result.label).toContain('dynamic');
    });

    it('phiAnd() applies φ-weighted composition', () => {
        const gate = new AdaptiveSemanticGate();
        const equal = gate.phiAnd([tv(0.9), tv(0.1)]);
        // φ-weighted: first input dominates
        expect(equal.value).toBeGreaterThan(0.5);
    });

    it('phiOr() produces probabilistic OR', () => {
        const gate = new AdaptiveSemanticGate();
        const result = gate.phiOr([tv(0.5), tv(0.5)]);
        expect(result.value).toBeGreaterThan(0);
        expect(result.value).toBeLessThanOrEqual(1);
    });

    it('consensus() produces centroid with derived confidence', () => {
        const gate = new AdaptiveSemanticGate();
        const result = gate.consensus([tv(0.8), tv(0.82), tv(0.79)]);
        // Tight cluster → high derived confidence
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.value).toBeCloseTo(0.8, 1);
    });

    it('adjusts behavior based on task type', () => {
        const realtime = new AdaptiveSemanticGate({ taskType: 'realtime' });
        const crypto = new AdaptiveSemanticGate({ taskType: 'cryptographic' });
        expect(realtime.diagnostics().nibbleConfig).toContain('FP16');
        expect(crypto.diagnostics().nibbleConfig).toContain('RSA4K');
    });

    it('updates context mid-chain', () => {
        const gate = new AdaptiveSemanticGate({ confidence: 0.3 });
        expect(gate.diagnostics().tnormWouldSelect).toBe('lukasiewicz');
        gate.updateContext({ confidence: 0.95 });
        expect(gate.diagnostics().tnormWouldSelect).toBe('product');
    });
});
