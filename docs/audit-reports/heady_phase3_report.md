# Heady Phase 3 Audit Report

**Date:** 2026-03-10
**Repository:** HeadyMe/Heady-Staging
**Branch:** `audit/high-impact-fixes`
**Commit:** `0df1c86aa`

## Executive Summary

Phase 3 targeted orchestration modules that were completely broken — unable to load via `require()` or returning incorrect results. Four fixes were implemented covering the heady-council (ESM/CJS mismatch), liquid-task-executor (missing phi-math exports), liquid-node (fake scoring and coherence), and a new smoke test suite.

## Issues Found & Fixed

### 1. CRITICAL — heady-council.js Uses ESM in a CJS Repo

**Problem:** `src/orchestration/heady-council.js` (946 lines) used `import`/`export` syntax while the entire repo uses CommonJS. Any `require()` call threw `SyntaxError: Cannot use import statement outside a module`. The multi-model council system was completely unreachable.

**Fix:**
- Converted all `import` statements to `require()` destructuring
- Converted `export class` and `export default` to `module.exports`
- Shimmed `placeholderVector()` (deterministic pseudo-random vector generator from seed string) — not exported by phi-math
- Mapped `VECTOR_DIMENSIONS` to `VECTOR.DIMS` from phi-math (name mismatch)
- Made `pino` import optional (graceful fallback to silent logger)

### 2. CRITICAL — liquid-task-executor.js Crashes on require()

**Problem:** `src/liquid/liquid-task-executor.js` destructured `TIMING` and `BACKOFF_SEQUENCE` from phi-math, but these are not exported. Line 28 `TIMING.HOT_TIMEOUT_MS` threw `TypeError: Cannot read properties of undefined`.

**Fix:**
- Replaced `TIMING` import with `PHI_TIMING` (the actual export name)
- Replaced `TIMING.HOT_TIMEOUT_MS/WARM/COLD` with Fibonacci-derived values: `fib(9)*1000` (34s), `fib(13)*1000` (233s), `fib(17)*1000` (1597s) — matching the documented values
- Replaced `TIMING.COOL_DOWN_MS` with `PHI_TIMING.PHI_2` (~2618ms)

### 3. HIGH — liquid-node.js Has Three Broken Methods

**Problem:**
- `scoreForTask()` used `(a => a[0])([values], [weights])` — an arrow function that takes one arg and returns `a[0]`, completely ignoring the weights array and returning only `capabilityScore` (which was itself hardcoded to 1.0)
- `_updateCoherence()` hardcoded `similarity = 1.0` — coherence drift was never detected
- `_checkPoolMigration()` used the same broken `(a => a[0])` pattern
- Also: `PSI_SQ`, `TIMING`, `EMBEDDING_DIM` were destructured from phi-math but don't exist as exports

**Fix:**
- `scoreForTask()`: Computes real cosine similarity between node capabilities (384-dim Float32Array) and task embedding. Phi-weighted composite: `capability×PSI + availability×(1-PSI-PSI²) + coherence×PSI²`
- `_updateCoherence()`: Computes real cosine similarity between current `capabilities` and stored `designEmbedding`. Coherence drift is now detected when capabilities diverge.
- `_checkPoolMigration()`: Real phi-weighted dot product of `[1-errorRate, 1-load, coherence]` × `[PSI, 1-PSI-PSI², PSI²]`
- Added local `PSI_SQ = PSI * PSI` and `EMBEDDING_DIM = VECTOR.DIMS || 384` derivations

### 4. MEDIUM — No Smoke Test for Core Orchestration Modules

**Problem:** No test validated that the primary orchestration modules could load or produce correct results.

**Fix:** Created `tests/orchestration-smoke.test.js` with 11 tests across 7 suites:
- **bee-factory** (2): loads, registers swarm with pre-warm
- **swarm-coordinator** (1): loads with correct constants
- **liquid-node** (3): loads, scoreForTask returns real numbers, coherence detects drift
- **liquid-mesh** (1): loads
- **liquid-task-executor** (1): loads with TaskDAG and DeadLetterQueue
- **heady-conductor** (2): loads, classifies "review code for security vulnerabilities" → SECURITY domain
- **heady-council** (1): loads as CJS, has 7 council members

## Validation Results

| Check | Result |
|-------|--------|
| All 7 core orchestration modules `require()` cleanly | PASS |
| `node -c` syntax check on all 3 modified files | PASS |
| Smoke test: 11/11 tests pass | PASS |
| scoreForTask returns real numeric score (0.077) | PASS |
| _updateCoherence detects drift on mutated capabilities | PASS |
| HeadyConductor classifies security task → SECURITY domain | PASS |
| HeadyCouncil loads with 7 council members | PASS |

## Files Changed

| File | Change |
|------|--------|
| `src/orchestration/heady-council.js` | ESM→CJS conversion, shimmed placeholderVector |
| `src/liquid/liquid-task-executor.js` | Fixed TIMING/BACKOFF_SEQUENCE import crash |
| `src/liquid/liquid-node.js` | Real scoreForTask, coherence, pool migration scoring |
| `tests/orchestration-smoke.test.js` | **NEW** — 11 tests, 7 suites |

**Total: 4 files changed, 188 insertions, 30 deletions**

## Remaining Risks

1. **heady-council placeholder responses** — `_callMember()` generates placeholder text when no InferenceGateway is connected. The contract is correct but responses are simulated without API keys.
2. **pipeline-orchestrator.js** — 86KB file, not audited this pass. Uses `try { require('../../shared/phi-math.js') } catch(e)` pattern suggesting it may have its own import issues.
3. **~90+ TODO/FIXME markers** across source files
4. **Duplicate code in `src/architecture/v2/`** and multiple bee-factory copies
5. **49 Dependabot vulnerabilities** (1 critical, 23 high)
6. **ESLint config broken** — flat config references missing `@typescript-eslint` package
7. **No integration test** covering full task dispatch through conductor → liquid mesh → node execution
8. **50+ root .md files with no index** — documentation discoverability remains poor
