# Heady Phase 3 — Implementation Notes

## Changes Made (2026-03-10)

### 1. `src/orchestration/heady-council.js` — ESM→CJS Conversion

The file used ES module syntax (`import`/`export`) while the repo is CommonJS. Every `require()` threw `SyntaxError`.

**Conversions:**
- `import pino from 'pino'` → optional `require('pino')` with silent fallback
- `import { PHI, PSI, ... } from '../shared/phi-math.js'` → `require('../../shared/phi-math.js')`
- `VECTOR_DIMENSIONS` → `VECTOR.DIMS` (actual export name)
- `export class HeadyCouncil` → `class HeadyCouncil` + `module.exports`
- `export default HeadyCouncil` → removed, part of `module.exports`

**Shimmed missing functions:**
- `placeholderVector(seed, dims)` — deterministic pseudo-random unit vector from string seed using LCG PRNG, then normalized via `normalize()`
- `dot()` and `magnitude()` — not needed after review (code uses `cosineSimilarity` from phi-math)

### 2. `src/liquid/liquid-task-executor.js` — TIMING Import Fix

**Root cause:** phi-math exports `PHI_TIMING` (with keys like `PHI_2`, `PHI_3`, etc.), not `TIMING` (with keys like `HOT_TIMEOUT_MS`). Similarly `BACKOFF_SEQUENCE` doesn't exist.

**Replacements:**
- `TIMING.HOT_TIMEOUT_MS` (34s) → `fib(9) * 1000` = 34,000ms
- `TIMING.WARM_TIMEOUT_MS` (233s) → `fib(13) * 1000` = 233,000ms
- `TIMING.COLD_TIMEOUT_MS` (1597s) → `fib(17) * 1000` = 1,597,000ms
- `TIMING.COOL_DOWN_MS` → `PHI_TIMING.PHI_2` ≈ 2,618ms

All values match the documented Fibonacci-scaled timeout pattern.

### 3. `src/liquid/liquid-node.js` — Real Scoring and Coherence

**Import fixes:**
- `PSI_SQ` not in phi-math → computed locally: `const PSI_SQ = PSI * PSI` (≈0.146)
- `EMBEDDING_DIM` not in phi-math → derived: `VECTOR.DIMS || 384`
- `TIMING` removed (unused after _updateCoherence fix)

**scoreForTask(taskEmbedding):**
Before: `(a => a[0])([cap, avail, coherence], [w1, w2, w3])` returned only `cap` (= hardcoded 1.0)
After: Real cosine similarity between `this.capabilities` and `taskEmbedding`, then phi-weighted composite:
```
score = capCosine × PSI + (1-loadPenalty) × (1-PSI-PSI²) + coherenceBonus × PSI²
```

**_updateCoherence():**
Before: `const similarity = 1.0` (hardcoded)
After: Real cosine similarity between `this.capabilities` and `this.designEmbedding`. Coherence drift is detected when capabilities diverge from original design.

**_checkPoolMigration():**
Before: `(a => a[0])([1-errorRate, 1-load, coherence])` — only used `1-errorRate`
After: Real phi-weighted dot product using `[PSI, 1-PSI-PSI², PSI²]` weights.

### 4. `tests/orchestration-smoke.test.js` — New Smoke Test

Uses `node:test` (built-in test runner). Validates:
- Module loading for all 7 core orchestration modules
- BeeFactory can register swarms and pre-warm bees
- LiquidNode.scoreForTask returns real numeric score
- LiquidNode._updateCoherence detects capability drift
- HeadyConductor classifies tasks using real cosine scoring
- HeadyCouncil loads as CJS with correct member count

Run with: `node --test tests/orchestration-smoke.test.js`
