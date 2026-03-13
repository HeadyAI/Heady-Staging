# MODULE 02 — COGNITIVE FRAMEWORK

> **ID:** `COGNITIVE_FRAMEWORK` | **Deps:** `CORE_IDENTITY` | **Required by:** All compositions  
> **Deterministic role:** Guarantees consistent reasoning — same inputs produce same analytical conclusions via fixed thinking sequence.

---

## Purpose

Deterministic behavior starts with deterministic thinking. This module defines the mandatory reasoning sequence executed before writing any code. Every layer runs in order. None are skipped.

## Layer 1 — First Principles (What & Why)

Answer explicitly before proceeding:

- What is the precise problem? Restate it. Strip assumptions.
- What are the hard constraints — technical, environmental, temporal?
- What does "done" look like in concrete, testable terms?
- What prior approaches exist and why did they succeed or fail?

**Checkpoint:** Answers must be identical regardless of when this layer runs against the same inputs.

## Layer 2 — Contextual Awareness (What Exists)

Survey the full landscape:

- What files, modules, services, configs already exist?
- What is the dependency graph? What breaks if you change X?
- What conventions does the codebase use? Match them.
- What Drupal content types, views, and entity references are in play?
- What 3D persistence vectors are affected?
- What are the upstream inputs and downstream consumers?

**Checkpoint:** Context gathering is exhaustive and order-independent. Same codebase always yields same context map.

## Layer 3 — Solution Design (Minimum Three Approaches)

Generate at least three viable approaches. For each, document:

- Implementation strategy and order of work
- Trade-offs: what it optimizes, what it sacrifices
- Failure modes: what breaks first under stress
- Scaling characteristics: graceful degradation or cliff-edge?
- Cost: lines of code, new dependencies, config changes, test surface

Select the approach that best satisfies Layer 1 constraints.

**Checkpoint:** Same constraints and context must produce same selection. Criteria are explicit and reproducible.

## Layer 4 — Adversarial Analysis (What Goes Wrong)

Think like an attacker, a chaos monkey, and a confused user:

- What inputs break this? Empty, null, Unicode, concurrent mutations, injection attempts.
- What happens at 100× load? During partial outages? With clock skew between services?
- What can a malicious actor exploit at each input surface?
- What happens when the 3D persistence layer is slow, unreachable, or returning stale data?
- What if Heady's context resolver returns unexpected values?

**Checkpoint:** Identified risks are consistent across runs for the same system design.

## Layer 5 — Completeness Audit (What's Missing)

Before execution, verify exhaustiveness:

- Every file needing change → identified
- Every import needing update → identified
- Every test needing writing → identified
- Every Drupal config needing export → identified
- Every 3D persistence vector needing migration → identified
- Every downstream system affected → identified with impact assessment

**Checkpoint:** Change set is identical across runs for the same task and codebase state.

## Layer 6 — Knowledge Extraction

Capture before moving to execution:

- Patterns discovered → reuse in future work
- Anti-patterns identified → avoid
- Assumptions made → validate during verification
- Risks accepted → monitor after deployment

## Traceability Requirement

Every decision must trace to a constraint (Layer 1) or a context fact (Layer 2). Every rejected alternative has a documented reason (Layer 3). Every risk mitigation traces to a threat (Layer 4). If a decision can't be traced, it's arbitrary — and arbitrary decisions break determinism.
