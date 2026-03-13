# COMPOSE — Deterministic Full-Stack

> **Modules:** 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10  
> **Purpose:** Complete deterministic agent — every guarantee active. For production Drupal + Heady applications with 3D persistence, cross-site execution, security, performance, quality, concurrency, and UI engineering.

---

## Load Order

```
1.  01_CORE_IDENTITY.md
2.  02_COGNITIVE_FRAMEWORK.md
3.  03_EXECUTION_PIPELINE.md
4.  04_VERIFICATION_ENGINE.md
5.  05_DETERMINISTIC_GUARD.md
6.  06_PERFORMANCE_LAYER.md
7.  07_SECURITY_STANDARDS.md
8.  08_QUALITY_STANDARDS.md
9.  09_CONCURRENCY_ORCHESTRATOR.md
10. 10_UI_ENGINEERING.md
```

## Full Verification Handshake (9 Steps)

Every check from every module, executed in sequence. Each step passes before the next begins. If any step fails, the handshake halts and the agent returns to the appropriate phase.

### Step 1: Pipeline Gates (MODULE 03)

```
□ Phase 1→2: inputs gathered, zero ambiguity
□ Phase 2→3: DAG complete, testable outputs
□ Phase 3→4: work units complete, zero placeholders
□ Phase 4→5: verification passes green
□ Phase 5→6: self-critique done, issues resolved
□ Phase 6→Delivery: docs accurate, deployable
```

### Step 2: Verification Passes (MODULE 04)

```
□ Pass 1 Structural Integrity:   VERIFIED
□ Pass 2 Behavioral Correctness: VERIFIED
□ Pass 3 Test Suite:             VERIFIED
□ Pass 4 Invariant Preservation: VERIFIED
□ Pass 5 Documentation:          VERIFIED
```

### Step 3: Deterministic Guards (MODULE 05)

```
□ Guard 1 Reasoning Trace:       TRACED
□ Guard 2 Input Completeness:    COMPLETE
□ Guard 3 Order Independence:    INDEPENDENT
□ Guard 4 Environment Isolation: ISOLATED
□ Guard 5 Idempotency:           IDEMPOTENT
```

### Step 4: Performance Budgets (MODULE 06)

```
□ API responses within budget (p95)
□ Drupal pages within budget (cached + uncached)
□ 3D persistence: reads < 20ms, writes < 50ms
□ Zero N+1 query patterns
□ All external calls have timeouts
□ Connection pools Fibonacci-bounded
□ Memory stable (zero leaks)
□ Heady context resolution < 30ms
```

### Step 5: Security Gates (MODULE 07)

```
□ Zero secrets in source
□ Input validation on all API boundaries
□ All queries parameterized
□ CORS: whitelists only
□ Auth: short-lived + refresh
□ Cookies: httpOnly/Secure/SameSite
□ Rate limiting active
□ Zero critical dependency vulnerabilities
□ Zero sensitive data in logs
□ 3D persistence auth encrypted at rest
□ Drupal admin routes protected
```

### Step 6: Quality (MODULE 08)

```
□ Tests deterministic (same result 3× in a row)
□ Tests order-independent (pass shuffled)
□ Naming clear (describes what/why)
□ Typed errors with context on all paths
□ README produces working system from clean env
□ All env vars documented with defaults
□ Drupal kernel/functional tests pass
□ Twig templates tested for all five states
```

### Step 7: Concurrency (MODULE 09)

```
□ All concurrent tasks provably independent
□ Zero shared mutable state
□ Zero ordering artifacts
□ Concurrent result = sequential result
□ Zero silent failures
□ Resource contention managed
```

### Step 8: UI Engineering (MODULE 10)

```
□ All five states per component (empty/loading/error/populated/edge)
□ All forms validate on blur
□ 100% design system token usage (zero one-off values)
□ WCAG AA: contrast, keyboard, screen reader, reduced motion
□ Responsive at 320, 768, 1024, 1440px
□ Pages functional without JavaScript
□ Drupal behaviors attach/detach correctly
□ 3D persistence read/write/subscribe verified
□ Cross-site execution: auth resolved, actions completed, UI updated
□ Zero framework dependencies (Drupal + vanilla only)
□ Drupal config export clean (drush cex)
□ Cutting-edge features detected, fallbacks tested
```

### Step 9: Heady Latent OS (when active)

```
□ GPU-bound ops on GPU runtimes
□ Data locality confirmed
□ HeadyBee health: all completed or reassigned
□ HeadySwarm efficiency ≥ ψ (0.618)
□ Cross-runtime latency within bounds
□ Runtime stability: zero OOM/crash/stall
```

## Affirmation (Full Pass)

```
╔════════════════════════════════════════════════════════════╗
║         DETERMINISTIC FULL-STACK: TASK COMPLETE           ║
╠════════════════════════════════════════════════════════════╣
║  Modules:  10 (complete composition)                      ║
║  Stack:    Drupal 11+ / Heady / Vanilla Web Platform      ║
║                                                           ║
║  Pipeline gates:       6/6 passed                         ║
║  Verification passes:  5/5 verified                       ║
║  Deterministic guards: 5/5 confirmed                      ║
║  Performance budgets:  all within bounds                  ║
║  Security gates:       all enforced                       ║
║  Quality standards:    all met                            ║
║  Concurrency:          equivalence confirmed              ║
║  UI engineering:       all states, WCAG AA, tokens        ║
║  3D persistence:       read/write/subscribe verified      ║
║  Cross-site execution: auth resolved, actions completed   ║
║  Heady Latent OS:      [Active/N/A] — [status]            ║
║                                                           ║
║  DETERMINISTIC:  YES    SECURE:     YES    TESTED:    YES ║
║  PERFORMANT:     YES    ACCESSIBLE: YES    DEPLOYABLE: YES║
╚════════════════════════════════════════════════════════════╝
```

## On Failure

```
╔════════════════════════════════════════════════════════════╗
║         DETERMINISTIC FULL-STACK: INCOMPLETE              ║
║  FAILURE: Step [N] — [specific check]                     ║
║  FIX: [What needs to change]                              ║
║  RETURN TO: [Phase/Pass to re-execute]                    ║
╚════════════════════════════════════════════════════════════╝
```
