/**
 * Heady™ φ-Math Foundation — New Export Validation Tests
 * Tests for PSI_SQ, PSI_CUBED, phiFusionScore, cslAND, placeholderVector
 *
 * © 2026 HeadySystems Inc. — Eric Haywood
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  PHI, PSI, PSI_SQ, PSI_CUBED,
  phiFusionScore, phiFusionWeights,
  cslAND, cosineSimilarity,
  placeholderVector, normalize,
  CSL_THRESHOLDS, VECTOR,
} = require('../../shared/phi-math');

describe('PSI_SQ and PSI_CUBED constants', () => {
  it('PSI_SQ = PSI * PSI', () => {
    assert(Math.abs(PSI_SQ - PSI * PSI) < 1e-15);
  });

  it('PSI_SQ ≈ 0.382', () => {
    assert(Math.abs(PSI_SQ - 0.382) < 0.001);
  });

  it('PSI_CUBED = PSI * PSI * PSI', () => {
    assert(Math.abs(PSI_CUBED - PSI * PSI * PSI) < 1e-15);
  });

  it('PSI_CUBED ≈ 0.236', () => {
    assert(Math.abs(PSI_CUBED - 0.236) < 0.001);
  });
});

describe('phiFusionScore', () => {
  it('returns 0 for empty array', () => {
    assert.strictEqual(phiFusionScore([]), 0);
  });

  it('returns value itself for single-element input', () => {
    const score = phiFusionScore([0.75]);
    assert(Math.abs(score - 0.75) < 1e-6);
  });

  it('uses phi-fusion weights when no explicit weights given', () => {
    const values = [0.8, 0.6, 0.4];
    const w = phiFusionWeights(3);
    const expected = values.reduce((sum, v, i) => sum + v * w[i], 0);
    assert(Math.abs(phiFusionScore(values) - expected) < 1e-6);
  });

  it('uses explicit weights when provided', () => {
    const values = [0.5, 0.5];
    const weights = [0.618, 0.382];
    const expected = 0.5 * 0.618 + 0.5 * 0.382;
    assert(Math.abs(phiFusionScore(values, weights) - expected) < 1e-6);
  });

  it('produces value between 0 and 1 for normalized inputs', () => {
    const score = phiFusionScore([0.9, 0.7, 0.5, 0.3]);
    assert(score >= 0 && score <= 1);
  });
});

describe('cslAND', () => {
  it('returns 1 for identical vectors', () => {
    const v = normalize([1, 2, 3, 4, 5]);
    assert(Math.abs(cslAND(v, v) - 1) < 1e-10);
  });

  it('returns 0 for orthogonal vectors (below MINIMUM threshold)', () => {
    assert.strictEqual(cslAND([1, 0, 0], [0, 1, 0]), 0);
  });

  it('gates below custom threshold', () => {
    const v1 = normalize([1, 0.5, 0.2]);
    const v2 = normalize([0.9, 0.6, 0.1]);
    const raw = cosineSimilarity(v1, v2);
    // With threshold=1.0, everything below 1.0 is gated
    assert.strictEqual(cslAND(v1, v2, 1.0), 0);
    // With threshold=0, everything passes
    assert(cslAND(v1, v2, 0) > 0);
  });

  it('uses CSL_THRESHOLDS.MINIMUM as default', () => {
    const v1 = normalize([1, 2, 3]);
    const v2 = normalize([1, 2, 3.001]); // Nearly identical
    const sim = cosineSimilarity(v1, v2);
    assert(sim > CSL_THRESHOLDS.MINIMUM);
    assert(Math.abs(cslAND(v1, v2) - sim) < 1e-6);
  });
});

describe('placeholderVector', () => {
  it('produces 384-dim vector by default', () => {
    const v = placeholderVector('test-seed');
    assert.strictEqual(v.length, 384);
  });

  it('produces unit vector (magnitude ≈ 1)', () => {
    const v = placeholderVector('hello-world');
    const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    assert(Math.abs(mag - 1) < 1e-10);
  });

  it('is deterministic (same seed → same vector)', () => {
    const v1 = placeholderVector('determinism');
    const v2 = placeholderVector('determinism');
    for (let i = 0; i < v1.length; i++) {
      assert.strictEqual(v1[i], v2[i]);
    }
  });

  it('produces different vectors for different seeds', () => {
    const v1 = placeholderVector('seed-a');
    const v2 = placeholderVector('seed-b');
    const sim = cosineSimilarity(v1, v2);
    assert(sim < 0.9, `Expected low similarity, got ${sim}`);
  });

  it('respects custom dimensions', () => {
    const v = placeholderVector('custom-dim', 128);
    assert.strictEqual(v.length, 128);
    const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    assert(Math.abs(mag - 1) < 1e-10);
  });
});
