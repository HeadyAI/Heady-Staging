'use strict';

const { FIB } = require('./constants');

/**
 * Compute the nth Fibonacci number (1-indexed, so fib(1)=1, fib(2)=1, fib(3)=2, ...).
 * Uses iterative approach for efficiency. Returns BigInt for n > 78 to avoid precision loss.
 *
 * @param {number} n — positive integer
 * @returns {number|bigint}
 */
function fib(n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`fib(n) requires a positive integer, got ${n}`);
  }
  if (n <= FIB.length) {
    return FIB[n - 1];
  }
  let a = BigInt(FIB[FIB.length - 2]);
  let b = BigInt(FIB[FIB.length - 1]);
  for (let i = FIB.length + 1; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return n <= 78 ? Number(b) : b;
}

/**
 * Find the nearest Fibonacci number to a given value.
 *
 * @param {number} n — non-negative number
 * @returns {number}
 */
function nearestFib(n) {
  if (n < 0) {
    throw new RangeError(`nearestFib requires a non-negative number, got ${n}`);
  }
  if (n <= 1) return 1;

  let a = 1;
  let b = 1;
  while (b < n) {
    const next = a + b;
    a = b;
    b = next;
  }
  // b >= n, a < n (or a === n)
  return (n - a) <= (b - n) ? a : b;
}

/**
 * Return all Fibonacci numbers within [min, max] inclusive.
 *
 * @param {number} min
 * @param {number} max
 * @returns {number[]}
 */
function fibRange(min, max) {
  if (min > max) {
    throw new RangeError(`fibRange requires min <= max, got min=${min}, max=${max}`);
  }
  const result = [];
  let a = 1;
  let b = 1;
  while (a <= max) {
    if (a >= min) {
      result.push(a);
    }
    const next = a + b;
    a = b;
    b = next;
  }
  return result;
}

/**
 * Check whether a number is a Fibonacci number.
 * Uses the property that n is Fibonacci iff 5n²+4 or 5n²-4 is a perfect square.
 *
 * @param {number} n — non-negative integer
 * @returns {boolean}
 */
function isFibonacci(n) {
  if (!Number.isInteger(n) || n < 0) return false;
  if (n === 0) return false;

  const check = (val) => {
    const sqrt = Math.round(Math.sqrt(val));
    return sqrt * sqrt === val;
  };

  const fiveNSq = 5 * n * n;
  return check(fiveNSq + 4) || check(fiveNSq - 4);
}

module.exports = {
  fib,
  nearestFib,
  fibRange,
  isFibonacci,
};
