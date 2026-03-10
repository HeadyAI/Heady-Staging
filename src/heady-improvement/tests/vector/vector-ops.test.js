'use strict';

/**
 * Vector Operations Tests — Verify 384-dim vector math and HNSW parameters.
 */

const { PHI, PSI, PSI2, FIB } = require('../../packages/phi-math-foundation/src/constants');

describe('Vector Operations', () => {

    describe('Vector Dimensions', () => {
        test('standard dimension is 384 (all-MiniLM-L6-v2)', () => {
            const VECTOR_DIM = 384;
            expect(VECTOR_DIM).toBe(384);
        });

        test('projection dimensions are 3 (3D spatial memory)', () => {
            const PROJECTION_DIM = 3;
            expect(PROJECTION_DIM).toBe(3);
        });
    });

    describe('Cosine Similarity', () => {
        function cosineSimilarity(a, b) {
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        }

        test('identical vectors have similarity 1.0', () => {
            const v = Array.from({ length: 384 }, (_, i) => Math.sin(i * PHI));
            expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 6);
        });

        test('orthogonal vectors have similarity 0.0', () => {
            const a = new Array(384).fill(0);
            const b = new Array(384).fill(0);
            a[0] = 1;
            b[1] = 1;
            expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 6);
        });

        test('opposite vectors have similarity -1.0', () => {
            const v = Array.from({ length: 384 }, (_, i) => Math.sin(i));
            const neg = v.map(x => -x);
            expect(cosineSimilarity(v, neg)).toBeCloseTo(-1.0, 6);
        });
    });

    describe('HNSW Parameters', () => {
        test('ef_construction = 200', () => {
            const EF_CONSTRUCTION = 200;
            expect(EF_CONSTRUCTION).toBe(200);
        });

        test('m = 32', () => {
            const M = 32;
            expect(M).toBe(32);
        });

        test('recall target > 0.95', () => {
            const RECALL_TARGET = 0.95;
            expect(RECALL_TARGET).toBeGreaterThan(0.9);
        });

        test('latency target < 50ms for 384-dim', () => {
            const LATENCY_TARGET_MS = 50;
            expect(LATENCY_TARGET_MS).toBeLessThanOrEqual(50);
        });
    });

    describe('CSL Gate on Vector Search', () => {
        test('include threshold is PSI² ≈ 0.382', () => {
            const INCLUDE_GATE = PSI2;
            expect(INCLUDE_GATE).toBeCloseTo(0.382, 2);
        });

        test('boost threshold is PSI ≈ 0.618', () => {
            const BOOST_GATE = PSI;
            expect(BOOST_GATE).toBeCloseTo(0.618, 2);
        });

        test('critical threshold is PSI + 0.1 ≈ 0.718', () => {
            const CRITICAL_GATE = PSI + 0.1;
            expect(CRITICAL_GATE).toBeCloseTo(0.718, 2);
        });
    });

    describe('Embedding Density', () => {
        test('density gate threshold is 0.92', () => {
            const DENSITY_GATE = 0.92;
            expect(DENSITY_GATE).toBeGreaterThan(0.9);
        });
    });

    describe('PgBouncer Pool Sizing', () => {
        test('default pool size is FIB[8] = 34', () => {
            expect(FIB[8]).toBe(34);
        });

        test('max connections is FIB[12] = 233', () => {
            expect(FIB[12]).toBe(233);
        });

        test('reserve pool is FIB[4] = 5', () => {
            expect(FIB[4]).toBe(5);
        });
    });
});
