---
name: heady-ghost-protocol
description: >
  Heady Ghost Protocol — shadow execution engine that runs proposed actions in a parallel
  simulation before committing them to production. Every high-consequence operation first
  executes as a "ghost run" — a full simulation using cloned state, recording what would happen
  without actually making changes. Ghost runs produce impact reports showing affected services,
  data mutations, resource consumption, and potential side effects. Only after ghost validation
  passes CSL gates does the real execution proceed. Use when implementing safe deployments,
  testing migrations, validating pipeline changes, previewing destructive operations, or any
  scenario where "try before you buy" prevents costly mistakes. Keywords: ghost, shadow,
  simulation, dry run, preview, impact analysis, safe execution, rollback, staging, sandbox,
  what-if, pre-flight check, validation, non-destructive.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Ghost Protocol

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Deploying changes to production services
- Running database migrations or schema changes
- Modifying routing tables or gateway configurations
- Updating CSL gate thresholds across the ecosystem
- Rebalancing resource pools
- Any operation where mistakes are expensive to reverse

## Architecture

```
Proposed Action
  │
  ▼
Consequence Scorer (how risky is this action?)
  │
  ├─→ Score < 0.691 (LOW): Execute directly, no ghost needed
  ├─→ Score 0.691-0.882 (MEDIUM-HIGH): Ghost run required
  └─→ Score >= 0.882 (HIGH+): Ghost run + Tribunal approval
      │
      ▼
State Cloner (snapshot current system state)
  │
  ▼
Ghost Executor (run action against cloned state)
  │
  ▼
Impact Analyzer
  ├─→ Services affected (count, names, zones)
  ├─→ Data mutations (what changes, how much)
  ├─→ Resource delta (tokens, compute, memory)
  ├─→ Side effects (cascading changes, triggers)
  └─→ Rollback complexity (how hard to undo)
      │
      ▼
Ghost Report
  │
  ▼
CSL Validation Gate
  ├─→ PASS (coherence >= 0.809): Proceed to real execution
  ├─→ WARN (coherence 0.691-0.809): Execute with monitoring
  └─→ FAIL (coherence < 0.691): Block execution, report issues
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Ghost Protocol Constants
const GHOST_BYPASS_THRESHOLD = 0.691;       // Below this = skip ghost, execute directly
const GHOST_REQUIRED_THRESHOLD = 0.691;     // At or above = ghost required
const TRIBUNAL_THRESHOLD = 0.882;           // At or above = ghost + tribunal
const GHOST_PASS_THRESHOLD = 0.809;         // Ghost must score this to proceed
const GHOST_WARN_THRESHOLD = 0.691;         // Between warn and pass = execute + monitor
const GHOST_TIMEOUT_MS = FIB[9] * 1000;    // 34 seconds max for ghost run
const MAX_AFFECTED_SERVICES = FIB[8];       // 21 — warn if ghost affects more
const STATE_SNAPSHOT_DEPTH = FIB[5];        // 5 levels of state to clone
const ROLLBACK_COMPLEXITY_LIMIT = PHI;      // Rollback difficulty > PHI = too risky

// Impact Weights
const IMPACT_WEIGHTS = {
  servicesAffected: PHI,        // 1.618 — wide blast radius is concerning
  dataMutations: PHI * PHI,     // 2.618 — data changes are most critical
  resourceDelta: 1.0,           // 1.000 — resource changes are moderate
  sideEffects: PHI,             // 1.618 — cascading effects are dangerous
  rollbackComplexity: PSI,      // 0.618 — hard rollback adds risk
};
```

## Instructions

### 1. Consequence Scoring

Rate the risk of any proposed action:

```javascript
class ConsequenceScorer {
  score(action) {
    const factors = {
      scope: this.scoreScope(action),           // How many services affected
      reversibility: this.scoreReversibility(action), // How hard to undo
      dataImpact: this.scoreDataImpact(action),     // Does it touch data
      frequency: this.scoreFrequency(action),        // How often is this done
      precedent: this.scorePrecedent(action),        // Has this worked before
    };

    const totalWeight = PHI + 1.0 + PHI * PHI + PSI + PSI * PSI;
    const score = (
      factors.scope * PHI +
      factors.reversibility * 1.0 +
      factors.dataImpact * PHI * PHI +
      factors.frequency * PSI +
      factors.precedent * PSI * PSI
    ) / totalWeight;

    return { score, factors, requiresGhost: score >= GHOST_REQUIRED_THRESHOLD };
  }
}
```

### 2. State Cloning

Create an isolated snapshot for ghost execution:

```javascript
class StateCloner {
  async clone(affectedServices) {
    const snapshot = {
      timestamp: Date.now(),
      services: {},
      data: {},
      config: {},
    };

    for (const serviceId of affectedServices) {
      const health = await fetchHealth(serviceId);
      snapshot.services[serviceId] = {
        status: health.status,
        coherenceScore: health.coherenceScore,
        config: await fetchConfig(serviceId),
      };
    }

    return {
      snapshot,
      apply: (mutation) => this.applyToClone(snapshot, mutation),
      diff: () => this.diffFromOriginal(snapshot),
    };
  }

  applyToClone(snapshot, mutation) {
    // Apply the mutation to the cloned state only
    const cloned = JSON.parse(JSON.stringify(snapshot));
    mutation(cloned);
    return cloned;
  }

  diffFromOriginal(snapshot) {
    // Compare cloned-after-mutation with original
    return deepDiff(snapshot.original, snapshot.mutated);
  }
}
```

### 3. Ghost Executor

Run the action in shadow mode:

```javascript
class GhostExecutor {
  async execute(action, clonedState) {
    const startTime = Date.now();
    const trace = [];

    try {
      // Execute action against cloned state with full instrumentation
      const result = await action.execute({
        state: clonedState,
        ghost: true,  // Flag tells services to simulate, not commit
        trace: (event) => trace.push({ ...event, timestamp: Date.now() }),
      });

      return {
        success: true,
        result,
        trace,
        durationMs: Date.now() - startTime,
        timedOut: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        trace,
        durationMs: Date.now() - startTime,
        timedOut: Date.now() - startTime > GHOST_TIMEOUT_MS,
      };
    }
  }
}
```

### 4. Impact Analysis

Analyze what the ghost run revealed:

```javascript
class ImpactAnalyzer {
  analyze(ghostResult, originalState) {
    const diff = deepDiff(originalState, ghostResult.result?.state);

    const impact = {
      servicesAffected: new Set(ghostResult.trace.map(t => t.serviceId)).size,
      dataMutations: ghostResult.trace.filter(t => t.type === 'data_write').length,
      resourceDelta: this.computeResourceDelta(ghostResult),
      sideEffects: ghostResult.trace.filter(t => t.type === 'cascade').length,
      rollbackComplexity: this.computeRollbackComplexity(diff),
    };

    // Compute coherence score for the ghost result
    const totalWeight = Object.values(IMPACT_WEIGHTS).reduce((a, b) => a + b, 0);
    const riskScore = (
      (impact.servicesAffected / FIB[8]) * IMPACT_WEIGHTS.servicesAffected +
      (impact.dataMutations / FIB[7]) * IMPACT_WEIGHTS.dataMutations +
      Math.min(1, impact.resourceDelta) * IMPACT_WEIGHTS.resourceDelta +
      (impact.sideEffects / FIB[5]) * IMPACT_WEIGHTS.sideEffects +
      Math.min(1, impact.rollbackComplexity / PHI) * IMPACT_WEIGHTS.rollbackComplexity
    ) / totalWeight;

    const coherenceScore = Math.max(0, 1 - riskScore);

    return {
      ...impact,
      coherenceScore,
      verdict: coherenceScore >= GHOST_PASS_THRESHOLD ? 'PASS' :
               coherenceScore >= GHOST_WARN_THRESHOLD ? 'WARN' : 'FAIL',
      diff,
    };
  }
}
```

## Integration Points

| Action Type | Ghost Behavior | Auto-Approve Threshold |
|---|---|---|
| Config change | Full ghost + impact report | 0.882 coherence |
| Service deploy | Ghost against staging clone | 0.809 coherence |
| Schema migration | Ghost with data sampling | 0.927 coherence |
| Routing update | Ghost with traffic simulation | 0.809 coherence |
| Resource rebalance | Ghost with load projection | 0.691 coherence |
| Skill deployment | Ghost with test suite | 0.809 coherence |

## API

```javascript
const { GhostProtocol } = require('@heady/ghost-protocol');

const ghost = new GhostProtocol({ stateCloner, executor, analyzer });

const report = await ghost.preview({
  action: deployAction,
  affectedServices: ['gateway', 'conductor', 'buddy'],
});

// report: { verdict: 'PASS', coherenceScore: 0.854, impact: {...}, trace: [...] }

if (report.verdict === 'PASS') {
  await ghost.commitReal(deployAction);
}

ghost.health();
await ghost.shutdown();
```

## Health Endpoint

```json
{
  "status": "healthy",
  "coherenceScore": 0.891,
  "ghostRunsTotal": 233,
  "ghostPassRate": 0.854,
  "blockedActions": 13,
  "avgGhostDurationMs": 8500,
  "savedFromIncidents": 8,
  "version": "1.0.0"
}
```
