/**
 * Heady™ Phi Utilities
 * 
 * Golden ratio constants and helpers used across the platform.
 * No magic numbers — everything derives from φ.
 */

export const PHI = 1.6180339887;
export const PHI_INV = 1 / PHI; // 0.618...
export const PHI_SQ = PHI * PHI; // 2.618...
export const PHI_CUBE = PHI * PHI * PHI; // 4.236...

/**
 * Fibonacci sequence generator
 */
export function fibonacci(n: number): number[] {
  const seq = [1, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq.slice(0, n);
}

/**
 * Phi-scaled backoff for retries (replaces arbitrary exponential backoff)
 * Base delay × φ^attempt
 */
export function phiBackoff(attempt: number, baseMs = 1000): number {
  return Math.round(baseMs * Math.pow(PHI, attempt));
}

/**
 * Phi-scaled threshold for scoring/gating
 * Returns thresholds at phi intervals: [0.382, 0.618, 0.786, 0.854]
 */
export function phiThresholds(): number[] {
  return [
    1 - PHI_INV,           // 0.382 — low confidence
    PHI_INV,               // 0.618 — medium confidence
    1 - (1 / PHI_SQ),     // 0.618... — adjusted
    PHI_INV * PHI_INV,    // 0.382... — inverse
  ].sort();
}

/**
 * Phi-scaled sizing for caches, queues, batches
 * Returns Fibonacci-based sizes: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, ...]
 */
export function phiScaledSizes(count: number): number[] {
  return fibonacci(count);
}

/**
 * Golden angle for even distribution (used in UI layouts, vector space partitioning)
 */
export const GOLDEN_ANGLE = 2 * Math.PI * PHI_INV; // ~2.399 radians = ~137.5°

/**
 * Phi-weighted moving average
 * More recent values get phi-proportionally higher weight
 */
export function phiWeightedAverage(values: number[]): number {
  if (values.length === 0) return 0;
  let weightSum = 0;
  let valueSum = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = Math.pow(PHI, i);
    valueSum += values[values.length - 1 - i] * weight;
    weightSum += weight;
  }
  return valueSum / weightSum;
}

/**
 * CSS custom property generator for phi-based spacing
 */
export function phiSpacingCSS(baseRem = 1): Record<string, string> {
  return {
    '--phi-xs': `${(baseRem / PHI_SQ).toFixed(4)}rem`,
    '--phi-sm': `${(baseRem / PHI).toFixed(4)}rem`,
    '--phi-base': `${baseRem}rem`,
    '--phi-md': `${(baseRem * PHI).toFixed(4)}rem`,
    '--phi-lg': `${(baseRem * PHI_SQ).toFixed(4)}rem`,
    '--phi-xl': `${(baseRem * PHI_CUBE).toFixed(4)}rem`,
    '--phi': `${PHI}`,
  };
}
