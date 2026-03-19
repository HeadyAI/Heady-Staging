/**
 * @heady/sacred-geometry-sdk — Fibonacci Utilities
 * Fibonacci computation, phi-power scaling, backoff, and CSS breakpoints.
 *
 * © 2024-2026 HeadySystems Inc. All Rights Reserved.
 */

'use strict';

const { PHI, PSI, FIB_CACHE, phiMs } = require('./constants');

// ═══════════════════════════════════════════════════════════════════════════════
// FIBONACCI COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the nth Fibonacci number (0-indexed: fib(0)=0, fib(1)=1, fib(2)=1, …).
 * Uses cached lookup for n < 26, iterative computation beyond that.
 * Returns BigInt for n > 78 to avoid precision loss.
 *
 * @param {number} n — non-negative integer
 * @returns {number|bigint}
 */
function fib(n) {
  if (n < 0) return 0;
  if (n < FIB_CACHE.length) return FIB_CACHE[n];
  // Iterative computation beyond cached range
  let a = BigInt(FIB_CACHE[FIB_CACHE.length - 2]);
  let b = BigInt(FIB_CACHE[FIB_CACHE.length - 1]);
  for (let i = FIB_CACHE.length; i <= n; i++) {
    const c = a + b;
    a = b;
    b = c;
  }
  return n <= 78 ? Number(b) : b;
}

/**
 * Closest Fibonacci number >= n.
 * @param {number} n — positive number
 * @returns {number}
 */
function fibCeil(n) {
  if (n <= 0) return 0;
  let i = 1;
  while (fib(i) < n) i++;
  return fib(i);
}

/**
 * Closest Fibonacci number <= n.
 * @param {number} n — positive number
 * @returns {number}
 */
function fibFloor(n) {
  if (n <= 0) return 0;
  let i = 1;
  while (fib(i + 1) <= n) i++;
  return fib(i);
}

/**
 * Nearest Fibonacci number to n (ties go to the higher one).
 * @param {number} n — non-negative number
 * @returns {number}
 */
function nearestFib(n) {
  if (n <= 1) return 1;
  const floor = fibFloor(n);
  const ceil  = fibCeil(n);
  return (n - floor) <= (ceil - n) ? floor : ceil;
}

/**
 * Check whether a number is a Fibonacci number.
 * Uses the property: n is Fibonacci iff 5n²+4 or 5n²-4 is a perfect square.
 * @param {number} n
 * @returns {boolean}
 */
function isFibonacci(n) {
  if (!Number.isInteger(n) || n < 0) return false;
  if (n === 0) return true;
  const check = (val) => {
    const sqrt = Math.round(Math.sqrt(val));
    return sqrt * sqrt === val;
  };
  const fiveNSq = 5 * n * n;
  return check(fiveNSq + 4) || check(fiveNSq - 4);
}

/**
 * Return all Fibonacci numbers within [min, max] inclusive.
 * @param {number} min
 * @param {number} max
 * @returns {number[]}
 */
function fibRange(min, max) {
  const result = [];
  let i = 0;
  while (fib(i) <= max) {
    if (fib(i) >= min) result.push(fib(i));
    i++;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHI-POWER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute φ raised to the power n.
 * @param {number} n — exponent (can be fractional or negative)
 * @returns {number}
 */
function phiPower(n) {
  return Math.pow(PHI, n);
}

/**
 * Phi-backoff: baseMs × φ^attempt, capped at maxMs.
 * @param {number} attempt — 0-based attempt number
 * @param {number} [baseMs=1000]
 * @param {number} [maxMs=60000]
 * @returns {number} delay in milliseconds
 */
function phiBackoff(attempt, baseMs = 1000, maxMs = 60000) {
  const delay = Math.min(baseMs * Math.pow(PHI, attempt), maxMs);
  return Math.round(delay);
}

/**
 * Phi-backoff with ±38.2% jitter (ψ²).
 * @param {number} attempt
 * @param {number} [baseMs=1000]
 * @param {number} [maxMs=60000]
 * @returns {number}
 */
function phiBackoffWithJitter(attempt, baseMs = 1000, maxMs = 60000) {
  const delay = phiBackoff(attempt, baseMs, maxMs);
  const jitter = (Math.random() * 2 - 1) * PSI * PSI; // ±38.2%
  return Math.round(delay * (1 + jitter));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIBONACCI CSS BREAKPOINTS
// Responsive breakpoints at Fibonacci-scaled pixel widths.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fibonacci-based responsive breakpoints.
 * Each breakpoint name maps to a px width derived from Fibonacci numbers.
 */
const FIB_BREAKPOINTS = Object.freeze({
  xs:   233,    // fib(13) — small mobile
  sm:   377,    // fib(14) — mobile
  md:   610,    // fib(15) — tablet portrait
  lg:   987,    // fib(16) — tablet landscape / small desktop
  xl:   1597,   // fib(17) — desktop
  xxl:  2584,   // fib(18) — large desktop / ultra-wide
});

/**
 * Generate a CSS media query string for a breakpoint.
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'xxl'} name
 * @param {'min'|'max'} [direction='min']
 * @returns {string} e.g. "@media (min-width: 610px)"
 */
function breakpointQuery(name, direction = 'min') {
  const px = FIB_BREAKPOINTS[name];
  if (px === undefined) throw new Error(`Unknown breakpoint: ${name}`);
  return `@media (${direction}-width: ${px}px)`;
}

module.exports = {
  // Fibonacci computation
  fib, fibCeil, fibFloor, nearestFib, isFibonacci, fibRange,
  // Phi-power
  phiPower, phiMs,
  // Backoff
  phiBackoff, phiBackoffWithJitter,
  // CSS breakpoints
  FIB_BREAKPOINTS, breakpointQuery,
};
