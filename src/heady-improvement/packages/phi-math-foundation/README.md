# @heady/phi-math-foundation

Golden ratio mathematics foundation for the Heady platform. Provides phi-derived constants, Fibonacci utilities, backoff strategies, threshold calculations, and fusion weight algorithms.

## Installation

```bash
npm install @heady/phi-math-foundation
```

## Usage

### Constants

```js
const { PHI, PSI, PSI2, PHI_SQUARED, PHI_CUBED, FIB, CSL_GATES } = require('@heady/phi-math-foundation');

console.log(PHI);       // 1.618033988749895
console.log(PSI);       // 0.6180339887498949
console.log(FIB);       // [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765]
console.log(CSL_GATES); // { GATE_1: 0.382, GATE_2: 0.618, ... }
```

### Fibonacci

```js
const { fib, nearestFib, fibRange, isFibonacci } = require('@heady/phi-math-foundation');

fib(10);            // 55
nearestFib(100);    // 89
fibRange(10, 100);  // [13, 21, 34, 55, 89]
isFibonacci(144);   // true
```

### Backoff

```js
const { phiBackoff } = require('@heady/phi-math-foundation');

// Attempt 0: ~1000ms, Attempt 1: ~1618ms, Attempt 2: ~2618ms (with jitter)
const delay = phiBackoff(3, 1000, 60000);
await new Promise((r) => setTimeout(r, delay));
```

### Thresholds

```js
const { phiThreshold, CSL_THRESHOLDS, PRESSURE_LEVELS, ALERT_THRESHOLDS } = require('@heady/phi-math-foundation');

phiThreshold(3);              // ≈ 0.882
CSL_THRESHOLDS.CRITICAL;      // ≈ 0.927
PRESSURE_LEVELS.MODERATE;     // ≈ 0.618
ALERT_THRESHOLDS.LATENCY_P95; // ≈ 161.8
```

### Fusion

```js
const { phiFusionWeights, phiPriorityScore, phiResourceWeights, phiMultiSplit } = require('@heady/phi-math-foundation');

phiFusionWeights(3);                  // [0.618, 0.236, 0.146] (approx, sums to 1)
phiPriorityScore([0.9, 0.5, 0.8]);   // weighted score
phiResourceWeights(4);                // balanced phi-distributed weights
phiMultiSplit(1000, 3);               // [618, 236, 146] (approx, sums to 1000)
```

## API Reference

| Function | Description |
|---|---|
| `fib(n)` | nth Fibonacci number (1-indexed) |
| `nearestFib(n)` | Closest Fibonacci number to n |
| `fibRange(min, max)` | All Fibonacci numbers in [min, max] |
| `isFibonacci(n)` | Check if n is a Fibonacci number |
| `phiBackoff(attempt, baseMs?, maxMs?)` | Phi-scaled backoff with jitter |
| `phiThreshold(level, spread?)` | Phi-derived threshold at level |
| `phiFusionWeights(n)` | n weights summing to 1 via phi |
| `phiPriorityScore(factors)` | Weighted priority from factors |
| `phiResourceWeights(n)` | Balanced phi resource weights |
| `phiMultiSplit(whole, n)` | Split value into phi parts |
