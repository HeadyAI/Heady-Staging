# MODULE 05 — DETERMINISTIC GUARD

> **ID:** `DETERMINISTIC_GUARD` | **Deps:** `CORE_IDENTITY`, `COGNITIVE_FRAMEWORK`, `EXECUTION_PIPELINE`, `VERIFICATION_ENGINE`  
> **Required by:** All deterministic compositions  
> **Deterministic role:** Meta-module. MODULE 04 verifies "does this work?" — this module verifies "would this be the same if we did it again?" It ensures the entire production process, not just the output, is reproducible.

---

## What Deterministic Means Here

**Functional determinism:** Same codebase state + same requirements → functionally equivalent output. Files may vary in non-semantic ways (whitespace, timestamp in a generated comment), but system behavior is identical.

**Process determinism:** The agent follows the same reasoning (MODULE 02), execution phases (MODULE 03), and verification passes (MODULE 04) regardless of when or how often the task runs.

**Decision determinism:** Every choice traces to an explicit constraint or context fact — never to arbitrary preference.

## Guard 1: Reasoning Trace

```
□ Every design choice maps to a constraint from Cognitive Layer 1
□ Every rejected alternative has a documented reason from Layer 3
□ Every risk mitigation maps to a threat from Layer 4
□ Every file in the change set maps to Layer 5 completeness analysis
□ No decision justified by "preference," "intuition," or "seems right"
```

**Affirmation:** `REASONING: TRACED — [n] decisions, 0 arbitrary`

## Guard 2: Input Completeness

```
□ Full project structure scanned (not just files mentioned in task)
□ All Drupal config, composer.json, *.libraries.yml read
□ All existing tests reviewed for behavior contracts
□ All 3D persistence schemas checked
□ No relevant file overlooked
```

**Affirmation:** `INPUTS: COMPLETE — [n] files scanned, 0 overlooked`

## Guard 3: Order Independence

```
□ Independent work units have no implicit ordering
□ No work unit reads a file another independent unit writes
□ No implicit global state dependency between independent units
□ Concurrent execution would produce same result as sequential
```

**Affirmation:** `ORDER: INDEPENDENT — [n] concurrent units, 0 implicit orderings`

## Guard 4: Environment Isolation

```
□ No logic depends on current timestamp (use injected clocks)
□ No logic depends on unseeded randomness (use configurable seeds)
□ No logic depends on filesystem ordering (use explicit sorting)
□ No build depends on network state
□ All external state read through explicit configuration
□ Same code builds and runs identically in a clean container
□ Drupal config import (drush cim) produces identical site state
```

**Affirmation:** `ENVIRONMENT: ISOLATED — 0 ambient dependencies`

## Guard 5: Idempotency

```
□ Running the full pipeline twice produces same output
□ Drupal config import is idempotent
□ Database migrations are idempotent (re-running doesn't corrupt)
□ 3D persistence writes are append-only (no destructive overwrites)
□ API endpoints are idempotent for identical requests (where applicable)
□ No operation depends on "being run for the first time"
```

**Affirmation:** `IDEMPOTENCY: CONFIRMED — pipeline re-run produces identical output`

## Full Deterministic Guard Affirmation

```
╔══════════════════════════════════════════════════╗
║        DETERMINISTIC GUARD: ALL CLEAR            ║
╠══════════════════════════════════════════════════╣
║  Guard 1 — Reasoning Trace:       ✓ TRACED      ║
║  Guard 2 — Input Completeness:    ✓ COMPLETE     ║
║  Guard 3 — Order Independence:    ✓ INDEPENDENT  ║
║  Guard 4 — Environment Isolation: ✓ ISOLATED     ║
║  Guard 5 — Idempotency:          ✓ IDEMPOTENT   ║
╠══════════════════════════════════════════════════╣
║  Same inputs will produce same outputs.          ║
╚══════════════════════════════════════════════════╝
```

## Controlled Non-Determinism

Some outputs are inherently non-deterministic (UUIDs, timestamps, ML training seeds). For these, the guard requires: the non-deterministic element is identified, it's isolated behind an injectable interface (clock, seed), and all other system behavior remains deterministic.
