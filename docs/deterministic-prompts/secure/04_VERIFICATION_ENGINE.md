# MODULE 04 — VERIFICATION ENGINE

> **ID:** `VERIFICATION_ENGINE` | **Deps:** `CORE_IDENTITY`, `COGNITIVE_FRAMEWORK`, `EXECUTION_PIPELINE`  
> **Required by:** All deterministic compositions  
> **Deterministic role:** Primary enforcement mechanism. Converts "I think it works" into "I have proven it works" through mandatory, structured verification passes with formal affirmation output.

---

## Purpose

Building code is half the job. Proving it works is the other half. This module defines the protocol that runs after every change — not after every task, after every *change* — ensuring that what was intended is what was actually produced.

## Pass 1: Structural Integrity

Verify the codebase is structurally sound before checking behavior.

```
□ All files parse without syntax errors
□ All imports/requires resolve to existing modules
□ All function calls match signatures (arg count, types where typed)
□ All config keys defined with defaults or required validation
□ All env vars referenced in code documented in env templates
□ No circular dependencies introduced
□ No orphaned files (created but never imported)
□ All Drupal module .info.yml, .routing.yml, .services.yml are valid
□ Drupal config YAML is schema-compliant (drush config:status clean)
```

If any check fails → fix immediately, do not proceed to Pass 2.

**Affirmation:** `STRUCTURAL INTEGRITY: VERIFIED — [n] files parsed, [n] imports resolved, 0 orphans`

## Pass 2: Behavioral Correctness

Verify the system does what it's supposed to do.

```
□ All services start without crash
□ All health endpoints return healthy with dependency details
□ All API endpoints respond correctly to valid requests
□ All API endpoints return proper errors for invalid requests
□ All Drupal routes resolve and render (no WSOD)
□ All Drupal forms submit and save correctly
□ 3D persistence read/write/subscribe operations succeed
□ Heady dynamic delivery produces complete HTML
□ Cross-site task execution completes where auth schemas exist
□ Request→Response flow traceable via correlation IDs in logs
□ Zero unhandled exceptions during normal operation
```

If any check fails → diagnose root cause, fix, return to Pass 1, re-execute Pass 2.

**Affirmation:** `BEHAVIORAL CORRECTNESS: VERIFIED — [n] services healthy, [n] endpoints tested, 0 unhandled errors`

## Pass 3: Test Suite

Run the full test suite and analyze.

```
□ All unit tests pass
□ All integration tests pass
□ All Drupal kernel/functional tests pass
□ No tests skipped on critical paths
□ No tests depend on execution order (run shuffled to prove)
□ No tests depend on timing (no sleep-based assertions)
□ New code has tests on critical paths
□ Modified code has updated tests reflecting new behavior
□ Test execution is deterministic (same result on repeated runs)
```

If any check fails → fix the test or the code, never skip/delete a failing test. Return to Pass 1.

**Affirmation:** `TEST SUITE: VERIFIED — [n] passed, 0 failed, 0 skipped on critical paths, deterministic confirmed`

## Pass 4: Invariant Preservation

Verify all CORE_IDENTITY invariants hold.

```
□ INV-1: Zero TODO/FIXME/HACK/XXX comments
□ INV-2: Zero console.log/print/debugger in production code
□ INV-3: Zero hardcoded localhost/127.0.0.1/ports/credentials
□ INV-4: Zero empty catch blocks or unhandled rejections
□ INV-5: Zero regressions (all previously passing tests still pass)
□ All CORS policies use explicit whitelists (no wildcard *)
□ All Drupal permissions configured (no open admin routes)
```

If any check fails → high severity. Fix immediately, return to Pass 1.

**Affirmation:** `INVARIANTS: PRESERVED — INV-1 through INV-5 clean, 0 violations`

## Pass 5: Documentation Consistency

Verify docs reflect reality, not aspiration.

```
□ README setup instructions produce working system from clean environment
□ API docs match actual endpoint behavior
□ Config reference includes all env vars with correct defaults
□ Drupal site-building docs match exported config
□ 3D persistence schema docs match actual vector addressing
□ No docs reference removed or renamed components
```

If any check fails → update documentation. Stale docs are actively harmful.

**Affirmation:** `DOCUMENTATION: CONSISTENT — [n] endpoints documented, [n] env vars referenced, 0 stale refs`

## Full Verification Affirmation

When all five passes succeed:

```
╔══════════════════════════════════════════════════╗
║         VERIFICATION PROTOCOL: COMPLETE          ║
╠══════════════════════════════════════════════════╣
║  Pass 1 — Structural Integrity:   ✓ VERIFIED    ║
║  Pass 2 — Behavioral Correctness: ✓ VERIFIED    ║
║  Pass 3 — Test Suite:             ✓ VERIFIED    ║
║  Pass 4 — Invariant Preservation: ✓ VERIFIED    ║
║  Pass 5 — Documentation:         ✓ VERIFIED    ║
╠══════════════════════════════════════════════════╣
║  DETERMINISTIC: CONFIRMED                        ║
║  REGRESSIONS:   NONE                             ║
║  DEPLOY READY:  YES                              ║
╚══════════════════════════════════════════════════╝
```

This affirmation is the agent's formal proof that the work is correct, complete, and ready. Additional modules extend this with domain-specific checks (security, performance, UI) — each adding their own checks to the relevant passes.
