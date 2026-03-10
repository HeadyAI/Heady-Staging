'use strict';

/**
 * CSL Gate Tests — Verify φ-scaled thresholds and gate behavior.
 */

const {
    PHI, PSI, PSI2, FIB
} = require('../../packages/phi-math-foundation/src/constants');

const {
    phiThreshold, CSL_THRESHOLDS, PRESSURE_LEVELS, ALERT_THRESHOLDS
} = require('../../packages/phi-math-foundation/src/thresholds');

describe('CSL Gates — φ-Scaled Thresholds', () => {

    describe('Core Constants', () => {
        test('PHI ≈ 1.618', () => {
            expect(PHI).toBeCloseTo(1.618033988749895, 10);
        });

        test('PSI ≈ 0.618 (1/PHI)', () => {
            expect(PSI).toBeCloseTo(0.6180339887498949, 10);
            expect(PSI).toBeCloseTo(1 / PHI, 10);
        });

        test('PSI² ≈ 0.382', () => {
            expect(PSI2).toBeCloseTo(0.3819660112501051, 10);
            expect(PSI2).toBeCloseTo(PSI * PSI, 10);
        });

        test('PHI × PSI = 1 (golden property)', () => {
            expect(PHI * PSI).toBeCloseTo(1.0, 10);
        });

        test('PHI² = PHI + 1', () => {
            expect(PHI * PHI).toBeCloseTo(PHI + 1, 10);
        });

        test('Fibonacci array has correct values', () => {
            expect(FIB[0]).toBe(1);
            expect(FIB[1]).toBe(1);
            expect(FIB[5]).toBe(8);
            expect(FIB[8]).toBe(34);
            expect(FIB[10]).toBe(89);
            expect(FIB[12]).toBe(233);
        });
    });

    describe('CSL Thresholds', () => {
        test('MINIMUM ≈ 0.500', () => {
            expect(CSL_THRESHOLDS.MINIMUM).toBeCloseTo(0.5, 1);
        });

        test('LOW ≈ 0.691', () => {
            expect(CSL_THRESHOLDS.LOW).toBeCloseTo(0.691, 2);
        });

        test('MEDIUM ≈ 0.809', () => {
            expect(CSL_THRESHOLDS.MEDIUM).toBeCloseTo(0.809, 2);
        });

        test('HIGH ≈ 0.882', () => {
            expect(CSL_THRESHOLDS.HIGH).toBeCloseTo(0.882, 2);
        });

        test('CRITICAL ≈ 0.927', () => {
            expect(CSL_THRESHOLDS.CRITICAL).toBeCloseTo(0.927, 2);
        });

        test('thresholds are monotonically increasing', () => {
            expect(CSL_THRESHOLDS.MINIMUM).toBeLessThan(CSL_THRESHOLDS.LOW);
            expect(CSL_THRESHOLDS.LOW).toBeLessThan(CSL_THRESHOLDS.MEDIUM);
            expect(CSL_THRESHOLDS.MEDIUM).toBeLessThan(CSL_THRESHOLDS.HIGH);
            expect(CSL_THRESHOLDS.HIGH).toBeLessThan(CSL_THRESHOLDS.CRITICAL);
        });
    });

    describe('phiThreshold function', () => {
        test('level 1 returns lowest threshold', () => {
            const t1 = phiThreshold(1);
            expect(t1).toBeGreaterThan(0.5);
            expect(t1).toBeLessThan(0.8);
        });

        test('higher levels return higher thresholds', () => {
            for (let i = 1; i < 4; i++) {
                expect(phiThreshold(i + 1)).toBeGreaterThan(phiThreshold(i));
            }
        });

        test('custom spread changes range', () => {
            const narrow = phiThreshold(1, 0.3);
            const wide = phiThreshold(1, 0.7);
            expect(narrow).toBeGreaterThan(wide);
        });

        test('level 0 throws RangeError', () => {
            expect(() => phiThreshold(0)).toThrow(RangeError);
        });
    });

    describe('Pressure Levels', () => {
        test('IDLE is 0', () => {
            expect(PRESSURE_LEVELS.IDLE).toBe(0);
        });

        test('LOW ≈ PSI²', () => {
            expect(PRESSURE_LEVELS.LOW).toBeCloseTo(PSI2, 3);
        });

        test('MODERATE ≈ PSI', () => {
            expect(PRESSURE_LEVELS.MODERATE).toBeCloseTo(PSI, 3);
        });

        test('pressure levels are ordered (IDLE < LOW < MODERATE < HIGH)', () => {
            expect(PRESSURE_LEVELS.IDLE).toBeLessThan(PRESSURE_LEVELS.LOW);
            expect(PRESSURE_LEVELS.LOW).toBeLessThan(PRESSURE_LEVELS.MODERATE);
            expect(PRESSURE_LEVELS.MODERATE).toBeLessThan(PRESSURE_LEVELS.HIGH);
        });

        test('OVERLOAD is 1', () => {
            expect(PRESSURE_LEVELS.OVERLOAD).toBe(1);
        });
    });
});
