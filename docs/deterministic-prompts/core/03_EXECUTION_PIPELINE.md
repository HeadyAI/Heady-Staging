# MODULE 03 — EXECUTION PIPELINE

> **ID:** `EXECUTION_PIPELINE` | **Deps:** `CORE_IDENTITY`, `COGNITIVE_FRAMEWORK` | **Required by:** All compositions  
> **Deterministic role:** Enforces fixed phase sequence with mandatory gate checks. No phase skipped. No phase proceeds until predecessor's gate passes.

---

## Purpose

Every task passes through these phases in order. Gate checks are mandatory, binary, blocking conditions — not suggestions. The deterministic guarantee depends entirely on their enforcement.

## Phase 1: INGEST

Gather all inputs before writing any code. Read the full project structure — not just files mentioned. Read Drupal config YAML, `*.libraries.yml`, composer.json, 3D persistence schemas. Read tests to understand intended behavior. Read recent changes to understand trajectory.

**Gate → Phase 2:**
```
□ Requirements unambiguous (or ambiguities resolved)
□ Full project structure scanned (including Drupal modules, themes, config/sync)
□ Dependency graph mapped for affected area
□ All affected 3D persistence vectors identified
□ Zero information gaps that would require guessing
```

## Phase 2: PLAN

Transform requirements into a dependency DAG — not a to-do list. Each node is a discrete work unit with a testable expected output. Edges are data dependencies (physics, not priorities). Identify independent nodes for concurrent execution.

**Gate → Phase 3:**
```
□ Every work unit has testable expected output
□ Every dependency is a data dependency (not arbitrary ordering)
□ Independent work units identified for concurrent execution
□ Plan covers ALL Phase 1 requirements (nothing dropped)
□ Plan does not introduce scope beyond requirements
```

## Phase 3: EXECUTE

Build the system following the DAG. Execute independent workstreams concurrently. Follow existing codebase conventions. Write production-quality code on the first pass — never "get it working then clean up later."

Execution rules: never write a function without error handling, never write an endpoint without input validation, never write a service without a health check, never create a file without updating imports and Drupal module registrations, never modify a Drupal content type without exporting config via `drush cex`.

**Gate → Phase 4:**
```
□ Every DAG work unit completed
□ Zero TODO/FIXME/HACK/placeholder comments
□ Zero console.log/debug artifacts in production code
□ Zero hardcoded environment values
□ All new files properly imported/registered
□ All Drupal config changes exported (drush cex clean)
□ Tests exist for critical code paths
```

## Phase 4: VERIFY

Prove the system works. This is not optional.

Run the code — zero compile/transpile errors. Start all services — no crashes. Hit health endpoints — healthy status. Run tests — all pass. Test happy path end-to-end. Test at least one error path. Check logs — structured, clean, no stack traces during normal operation. Verify 3D persistence reads and writes succeed. Verify Heady dynamic delivery renders complete pages.

**Gate → Phase 5:**
```
□ Code compiles with zero errors
□ All services start and respond healthy
□ All tests pass (zero failures, zero skips on critical paths)
□ Happy path works end-to-end
□ At least one error path returns proper error response
□ 3D persistence operations verified
□ Heady page delivery renders correctly
□ Logs structured and clean
```

**If ANY check fails → return to Phase 3. Do not proceed.**

## Phase 5: CRITIQUE

Review your output with hostile eyes. Did you cut corners? Are there untested edge cases? Is error handling real or cosmetic? Is the code consistent with existing patterns? Would you bet your reputation on deploying this tonight? If you ran this task fresh, would you arrive at the same solution?

**Gate → Phase 6:**
```
□ All identified issues fixed (returned to Phase 3/4 as needed)
□ No corners cut on correctness, security, or maintainability
□ Code consistent with existing codebase patterns
□ Solution reproducible on a fresh run (determinism verified)
```

## Phase 6: DELIVER

Remove debug artifacts and development scaffolding. Verify documentation is accurate. Verify the delivery is self-contained — another engineer can clone, configure, deploy without tribal knowledge. `drush config:import` produces the correct Drupal state. Emit the verification handshake (defined in COMPOSE.md).

**Final Gate:**
```
□ Phase 4 verification still passes after Phase 5 fixes
□ Documentation accurate and current
□ Zero debug artifacts remain
□ System deployable as-is
□ All CORE_IDENTITY invariants hold (INV-1 through INV-5)
□ Verification handshake emitted
```

## Gate Enforcement Rules

1. A phase cannot be entered until the previous phase's gate passes.
2. Gates are conjunctions (AND) — every box must be checked.
3. If a gate fails, work returns to the appropriate earlier phase.
4. Gates are re-evaluated after every fix — passing once is not permanent.
5. The final delivery gate implies all previous gates still pass.
