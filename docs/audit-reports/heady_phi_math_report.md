# Heady Phi-Math Audit Report

**Date:** 2026-03-11
**Repository:** HeadyMe/Heady-Staging
**Branch:** `audit/high-impact-fixes`
**Commit:** `549504627`

## Executive Summary

Audited `shared/phi-math.js` (the CJS source of truth) against all 254 consumer files. Found 5 symbols imported by 15+ files that were `undefined` at runtime — causing silent failures or crashes when called. Added all 5 as proper exports, removed 2 local shims in consumers, and added 18 validation tests.

## Landscape

The repo has **three** phi-math module variants:
- `shared/phi-math.js` (CJS, 364→420 lines) — **canonical source of truth**, used by `src/` consumers
- `shared/phi-math-v2.js` (ESM, 159 lines) — used by `core/`, `heady-latent-os/` — **cannot be `require()`'d**
- `packages/phi-math-foundation/` (CJS package) — used by `core/liquid-nodes/`, `core/async-engine/`, `core/swarm-engine/`, `core/vector-ops/`

This audit focused on `shared/phi-math.js` as it serves the most critical runtime consumers (orchestration, liquid, bees).

## Issues Found & Fixed

### 1. CRITICAL — `PSI_SQ` imported by 12+ files, `undefined` at runtime

**Consumers:** heady-bee, heady-swarm, swarm-intelligence, colab-runtime-manager, colab-vector-space-ops, liquid-mesh, liquid-node, liquid-task-executor, analytics-service (all destructure `PSI_SQ` from phi-math)

**Impact:** `PSI_SQ` was `undefined`. Used in load penalty calculations (`load * PSI_SQ`), phi-weighted composites (`[PSI, 1-PSI-PSI_SQ, PSI_SQ]`), and pressure scoring. All silently produced `NaN`.

**Fix:** Added `const PSI_SQ = PSI * PSI` (≈0.382) and `const PSI_CUBED = PSI * PSI * PSI` (≈0.236) as proper exports.

### 2. CRITICAL — `phiFusionScore` imported by 15+ files, `undefined` at runtime

**Consumers:** liquid-task-executor, liquid-node, liquid-mesh, heady-bee, heady-swarm, swarm-intelligence, colab-runtime-manager, notification-service, scheduler-service, analytics-service

**Impact:** Called as `phiFusionScore([values], [weights])` for task priority scoring, swarm pressure calculation, and battle scoring. `undefined()` → `TypeError: phiFusionScore is not a function`.

**Fix:** Implemented `phiFusionScore(values, weights?)` — computes phi-weighted composite score. Auto-generates weights via `phiFusionWeights(n)` when none provided, or uses explicit weights.

### 3. HIGH — `placeholderVector` expected by 5+ files, shimmed locally in heady-council

**Consumers:** heady-council, cognitive-layer-engine, liquid-orchestrator (plus doc references)

**Impact:** heady-council had a 10-line local shim. cognitive-layer-engine and liquid-orchestrator would crash if loaded.

**Fix:** Added `placeholderVector(seed, dims=384)` to phi-math — deterministic PRNG vector from string seed using LCG, normalized to unit length. Removed local shim from heady-council.

### 4. HIGH — `cslAND` imported from phi-math by orchestration consumers but lives in csl-engine

**Consumers:** liquid-node, liquid-task-executor, colab-runtime-manager import it from phi-math

**Impact:** `undefined` at runtime. The function exists in `shared/csl-engine-v2.js` and `core/vector-ops/csl-engine.js` but not in phi-math.

**Fix:** Added `cslAND(a, b, minThreshold?)` to phi-math — cosine similarity gated by configurable floor (defaults to `CSL_THRESHOLDS.MINIMUM`).

### 5. Consumer Cleanup — Removed local shims

**liquid-node.js:** Removed `const PSI_SQ = PSI * PSI` (line 19) — now imports directly.
**heady-council.js:** Removed 10-line `placeholderVector` function — now imports directly.

## Validation Results

| Check | Result |
|-------|--------|
| `node -c shared/phi-math.js` syntax check | PASS |
| All 35 existing phi-math unit tests | PASS |
| 18 new export validation tests | PASS |
| 11 orchestration smoke tests (7 suites) | PASS |
| liquid-node.js `require()` | PASS |
| heady-council.js `require()` | PASS |
| liquid-task-executor.js `require()` | PASS |
| liquid-mesh.js `require()` | PASS |

## Files Changed

| File | Change |
|------|--------|
| `shared/phi-math.js` | +PSI_SQ, +PSI_CUBED, +phiFusionScore, +cslAND, +placeholderVector exports |
| `src/liquid/liquid-node.js` | Removed local PSI_SQ derivation, imports from phi-math |
| `src/orchestration/heady-council.js` | Removed placeholderVector shim, imports from phi-math |
| `tests/unit/phi-math-new-exports.test.js` | **NEW** — 18 tests across 4 suites |

**Total: 4 files changed, 187 insertions, 20 deletions**

## Remaining Risks

1. **phi-math-v2.js (ESM)** — Used by `core/` and `heady-latent-os/` consumers via `import`. Cannot be `require()`'d in CJS context. Does NOT have phiFusionScore, cslAND, or placeholderVector. Needs parallel update.
2. **@heady/phi-math-foundation package** — Used by `core/liquid-nodes/`, `core/async-engine/`, `core/swarm-engine/`, `core/vector-ops/`. Separate module with its own constants/fibonacci/backoff/thresholds files. Not audited.
3. **12+ additional consumers still import `PSI_SQ` etc.** from phi-math via destructuring — they now get real values, but weren't individually tested for correct runtime behavior.
4. **`TIMING` and `POOL_SIZES`** — Two additional missing symbols imported by `notification-service.js` and `colab-runtime-manager.js`. Not addressed this pass (lower frequency).
5. **pipeline-orchestrator.js (86KB)** — Still unaudited. Uses try/catch phi-math import suggesting potential issues.
6. **No integration test** covering full task dispatch through phi-math-consuming path.
