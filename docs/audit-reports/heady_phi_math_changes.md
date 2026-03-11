# Heady Phi-Math Audit — Implementation Notes

## Changes Made (2026-03-11)

### 1. `shared/phi-math.js` — 5 New Exports

**PSI_SQ and PSI_CUBED constants (lines 19-20):**
```javascript
const PSI_SQ    = PSI * PSI;          // ψ² ≈ 0.382
const PSI_CUBED = PSI * PSI * PSI;    // ψ³ ≈ 0.236
```
Used by 12+ consumers for load penalties, phi-weighted composites, and pressure scoring.

**phiFusionScore function (after phiMultiSplit):**
```javascript
function phiFusionScore(values, weights) {
  if (!values || values.length === 0) return 0;
  const w = weights && weights.length === values.length
    ? weights
    : phiFusionWeights(values.length);
  return values.reduce((sum, v, i) => sum + v * w[i], 0);
}
```
Called by 15+ consumers for task priority, swarm pressure, and battle scoring. Auto-generates phi-fusion weights when no explicit weights provided.

**cslAND function (before exports):**
```javascript
function cslAND(a, b, minThreshold = CSL_THRESHOLDS.MINIMUM) {
  const sim = cosineSimilarity(a, b);
  return sim >= minThreshold ? sim : 0;
}
```
Gates cosine similarity below MINIMUM threshold (0.5). Used by liquid-node, liquid-task-executor, colab-runtime-manager.

**placeholderVector function (before exports):**
```javascript
function placeholderVector(seed, dims = 384) {
  const vec = new Array(dims);
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  for (let i = 0; i < dims; i++) {
    h = ((h * 1103515245 + 12345) & 0x7fffffff);
    vec[i] = (h / 0x7fffffff) * 2 - 1;
  }
  return normalize(vec);
}
```
Deterministic PRNG unit vector from string seed. Uses DJB2 hash + LCG (multiplier 1103515245). Same implementation that was shimmed locally in heady-council.js, now canonical.

### 2. `src/liquid/liquid-node.js` — Import cleanup

**Before:**
```javascript
const {
  PHI, PSI, fib, phiBackoffWithJitter,
  CSL_THRESHOLDS, VECTOR,
  cslAND, getPressureLevel, phiFusionScore,
} = require('../../shared/phi-math');
const PSI_SQ = PSI * PSI;             // ≈ 0.146 (not exported by phi-math)
```

**After:**
```javascript
const {
  PHI, PSI, PSI_SQ, fib, phiBackoffWithJitter,
  CSL_THRESHOLDS, VECTOR,
  cslAND, getPressureLevel, phiFusionScore,
} = require('../../shared/phi-math');
```

Note: The old comment said "≈ 0.146" but PSI_SQ is actually ≈ 0.382 (PSI ≈ 0.618, PSI² ≈ 0.382). The scoring formulas in scoreForTask() and _checkPoolMigration() already use the correct value.

### 3. `src/orchestration/heady-council.js` — Removed shim

**Before (lines 33-61):** Imported 10 symbols, then defined local `placeholderVector` function (10 lines).

**After (lines 33-47):** Added `placeholderVector` to the destructured import. Removed entire shim block.

### 4. `tests/unit/phi-math-new-exports.test.js` — New test suite

18 tests across 4 suites using `node:test`:
- **PSI_SQ/PSI_CUBED** (4): identity, approximate value
- **phiFusionScore** (5): empty, single, auto-weights, explicit weights, range
- **cslAND** (4): identical, orthogonal, custom threshold, default threshold
- **placeholderVector** (5): default dims, unit vector, determinism, different seeds, custom dims

Run: `node --test tests/unit/phi-math-new-exports.test.js`
