# MODULE 09 — CONCURRENCY ORCHESTRATOR

> **ID:** `CONCURRENCY_ORCHESTRATOR` | **Deps:** `CORE_IDENTITY`, `EXECUTION_PIPELINE`, `DETERMINISTIC_GUARD`  
> **Required by:** Multi-service compositions, Heady Latent OS compositions  
> **Deterministic role:** Ensures concurrent execution produces identical results to sequential execution. Parallelism is a performance optimization — never a behavioral change.

---

## Core Principle

Everything that CAN execute concurrently SHOULD execute concurrently — but the result must be identical to sequential execution. If parallelizing two tasks changes the output, they have a hidden dependency that must be resolved first.

## Concurrency Analysis Protocol

### Step 1: Build the Dependency DAG

Every task from MODULE 03 Phase 2 becomes a node. Every data dependency becomes a directed edge. Nodes with zero in-degree execute immediately. Nodes whose dependencies are complete execute next. This is a topological sort with concurrent execution at each level.

### Step 2: Verify Independence

For every pair of tasks the DAG says are independent:

```
□ Neither reads a file the other writes
□ Neither writes the same file as the other
□ Neither mutates shared in-memory state
□ Neither depends on the other's side effects
□ Order of completion doesn't affect any downstream task
□ Both can fail independently without corrupting shared state
□ Neither modifies Drupal config that the other reads
□ Neither writes to the same 3D persistence vector
```

If any check fails → add a dependency edge, re-sort.

### Step 3: Execute Concurrently

```
1. Identify all zero-in-degree tasks → dispatch concurrently
2. Wait for any task to complete
3. Remove completed task from DAG
4. Identify newly unblocked tasks → dispatch concurrently
5. Repeat until DAG empty
6. All tasks complete → proceed to verification
```

### Step 4: Verify Equivalence

After concurrent execution, confirm the result matches sequential expectation:

```
□ All output files have expected content
□ All services in expected state
□ All tests pass (same set as sequential)
□ No race conditions in logs or outputs
□ No ordering artifacts in output
□ Drupal config state matches expected (drush config:status clean)
□ 3D persistence vectors contain expected data at expected time-versions
```

## Work Routing (Capability-Based, Not Priority-Based)

Tasks route to executors by what they can do, not how important they are. Every executor has equal standing.

```
ROUTING:
  For each unblocked task:
    1. Determine required capabilities (CPU, GPU, I/O, Drupal, vector-ops)
    2. Find all available executors with matching capabilities
    3. Multiple matches → select by lowest current load (round-robin on ties)
    4. Dispatch and record
```

This is explicitly NOT a priority queue. No `CRITICAL/HIGH/MEDIUM/LOW`. All unblocked tasks dispatch simultaneously. Ordering comes from data dependencies (physics), not importance (opinion).

### HeadyBee/HeadySwarm Integration

**HeadyBee:** Single stateless worker. Receives task → executes → returns result. Capability-tagged (CPU, GPU, vector-ops, inference, I/O, Drupal-cli). No state between tasks.

**HeadySwarm:** Activated when task DAG exceeds single HeadyBee capacity. Receives full DAG, distributes by capability match, aggregates results as dependencies resolve, returns composite result.

```
SWARM PROTOCOL:
  1. Receive DAG from Phase 2
  2. Tag each node with required capabilities
  3. Query available HeadyBees (capability + load)
  4. Assign by capability match, load-balanced
  5. Monitor — reassign on failure/stall
  6. Aggregate as edges resolve
  7. Return composite when DAG complete
  8. Emit metrics (throughput, latency, efficiency ≥ ψ)
```

## Anti-Patterns

**Shared mutable state without synchronization.** If two concurrent tasks mutate the same thing without coordination, the result is non-deterministic. Fix: externalize to transactional store or serialize the mutation.

**Implicit ordering assumptions.** Code that assumes Task A finishes before Task B without a DAG edge. Fix: add the edge or remove the assumption.

**Fire-and-forget.** Dispatching without checking all results. Fix: collect all results, verify all succeeded.

**Thundering herd.** All concurrent tasks hitting the same resource simultaneously. Fix: connection pools, rate limits, circuit breakers.

## Concurrency Verification Extension

Added to MODULE 04:

```
□ All concurrent tasks provably independent (DAG analysis)
□ No shared mutable state between concurrent tasks
□ No ordering artifacts in output
□ Concurrent result matches sequential expectation
□ All concurrent tasks completed (zero silent failures)
□ Resource contention managed (pools/limits/breakers)
```

**Affirmation:** `CONCURRENCY: VERIFIED — [n] tasks concurrent, 0 race conditions, equivalence confirmed`
