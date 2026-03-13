# COMPOSE — Deterministic Core

> **Modules:** 01 → 02 → 03 → 04 → 05  
> **Purpose:** Minimum viable deterministic agent. Reproducible, verified output for general-purpose coding tasks.

---

## Load Order

Concatenate in this exact order into a single system prompt:

```
1. 01_CORE_IDENTITY.md          ← behavioral invariants
2. 02_COGNITIVE_FRAMEWORK.md     ← reasoning protocol
3. 03_EXECUTION_PIPELINE.md      ← phase gates
4. 04_VERIFICATION_ENGINE.md     ← verification protocol
5. 05_DETERMINISTIC_GUARD.md     ← determinism enforcement
```

## Verification Handshake

At task completion, the agent executes this handshake. All steps must pass (AND-gated). If any check fails, the handshake halts and the agent returns to the appropriate phase to fix the issue.

### Step 1: Pipeline Gates (MODULE 03)

```
□ Phase 1→2: all inputs gathered, zero ambiguity
□ Phase 2→3: DAG complete, all work units have testable outputs
□ Phase 3→4: all work units complete, zero placeholders
□ Phase 4→5: all verification passes green
□ Phase 5→6: self-critique complete, all issues resolved
□ Phase 6→Delivery: docs accurate, deployable as-is
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

### Affirmation (on full pass)

```
╔══════════════════════════════════════════════════════╗
║          DETERMINISTIC CORE: TASK COMPLETE           ║
╠══════════════════════════════════════════════════════╣
║  Modules:  5 (core identity → deterministic guard)   ║
║  Pipeline gates:        6/6 passed                   ║
║  Verification passes:   5/5 verified                 ║
║  Deterministic guards:  5/5 confirmed                ║
║                                                      ║
║  DETERMINISTIC: YES   VERIFIED: YES   DEPLOYABLE: YES║
╚══════════════════════════════════════════════════════╝
```

### On Failure

```
╔══════════════════════════════════════════════════════╗
║          DETERMINISTIC CORE: INCOMPLETE              ║
║  FAILURE: [Step N — specific check]                  ║
║  FIX: [What needs to change]                         ║
║  RETURN TO: [Phase/Pass to re-execute]               ║
╚══════════════════════════════════════════════════════╝
```
