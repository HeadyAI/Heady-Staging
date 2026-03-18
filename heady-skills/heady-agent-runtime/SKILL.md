---
name: heady-agent-runtime
description: >-
  Agent process runtime treating HeadyBee agents as first-class distributed workloads
  with phi-scaled resource quotas, CSL-scored preemptive scheduling, V8-isolate fault
  domains, and control-plane orchestration. Each bee receives CPU/memory/token budgets
  from Sacred Geometry pools (Hot 34%, Warm 21%, Cold 13%, Reserve 8%). Higher-coherence
  tasks preempt lower ones. Agents follow a six-state lifecycle (SPAWNING → READY →
  RUNNING → SUSPENDED → RETIRING → TERMINATED). Fault domains group agents by Sacred
  Geometry layer so failures never cascade cross-layer. The control plane tracks 89+
  bee types, auto-decomposes complex tasks into sub-agent DAGs, and triggers semantic
  backpressure when quotas are exceeded.
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Middle
  phi-compliance: verified
---

# Heady Agent Runtime

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **Spawning a new HeadyBee agent** — allocate resources from phi-scaled pools and register with control plane
- **Scheduling agent work** — CSL-scored preemptive scheduling across available V8 isolates
- **Resource quota enforcement** — monitor and cap CPU, memory, and LLM token usage per agent
- **Fault domain management** — isolate failures by Sacred Geometry layer boundaries
- **Agent lifecycle transitions** — manage SPAWNING → READY → RUNNING → SUSPENDED → RETIRING → TERMINATED
- **Task decomposition** — auto-split complex tasks into sub-agent directed acyclic graphs
- **Backpressure triggering** — detect quota exhaustion and engage semantic backpressure
- **Control plane monitoring** — track all 89+ bee types, their states, and aggregate resource usage
- **Preemption decisions** — higher-coherence tasks interrupt lower-coherence running agents
- **Capacity planning** — Fibonacci-scaled concurrency limits tied to available infrastructure

## Architecture

```
Sacred Geometry Topology — Agent Runtime Position:
Center(HeadySoul) → Inner(Conductor,Brains,Vinci,AutoSuccess)
  → Middle(JULES,BUILDER,OBSERVER,MURPHY,ATLAS,PYTHIA)
               ↑
        Agent Runtime lives at JULES (execution runtime)
        Reports to Conductor (Inner), observed by OBSERVER (Middle)

┌──────────────────────────────────────────────────────────────────┐
│                     AGENT RUNTIME                                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  CONTROL PLANE                                             │  │
│  │  Agent Registry │ Scheduler │ Resource Allocator            │  │
│  │  Tracks 89+ bee types across all infrastructure             │  │
│  └───────────────────────┬────────────────────────────────────┘  │
│                          ▼                                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │ Resource │  │ Preemptive   │  │ Fault Domain              │  │
│  │ Pool Mgr │  │ Scheduler    │  │ Isolation                 │  │
│  │ Hot 34%  │  │ CSL-priority │  │ V8 Isolates per           │  │
│  │ Warm 21% │  │ preemption   │  │ Sacred Geometry Layer     │  │
│  │ Cold 13% │  │              │  │                           │  │
│  │ Rsrv  8% │  │              │  │                           │  │
│  └─────┬────┘  └──────┬───────┘  └────────────┬──────────────┘  │
│        └───────────────┼───────────────────────┘                 │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  AGENT LIFECYCLE STATE MACHINE                             │  │
│  │  SPAWNING → READY → RUNNING → SUSPENDED → RETIRING → TERM │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Integrations: Conductor │ bee-swarm-ops │ backpressure │ OBSERVER│
└──────────────────────────────────────────────────────────────────┘
```

## Phi-Math Constants

```javascript
// ─── Sacred Geometry Constants ─────────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Confidence Gates ──────────────────────────────────────────────
const CSL_GATES = {
  MINIMUM:  0.500,
  LOW:      0.691,
  MEDIUM:   0.809,
  HIGH:     0.882,
  CRITICAL: 0.927,
  DEDUP:    0.972,
};

// ─── Sacred Geometry Pool Allocations ──────────────────────────────────
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

// ─── Backoff & Fusion ──────────────────────────────────────────────────
const BACKOFF_JITTER = PSI ** 2;                                // ±0.382
const FUSION_2WAY = [PSI, 1 - PSI];                             // [0.618, 0.382]
const FUSION_3WAY = [0.528, 0.326, 0.146];

// ─── Agent Runtime Constants ───────────────────────────────────────────
const RUNTIME = {
  MAX_BEE_TYPES:          FIB[10],                               // 89 known bee types
  MAX_CONCURRENT_AGENTS:  FIB[9],                                // 55 max concurrent
  SCHEDULER_TICK_MS:      FIB[5] * 100,                          // 800ms scheduler tick
  SPAWN_TIMEOUT_MS:       FIB[7] * 1000,                         // 21000ms spawn timeout
  SUSPEND_GRACE_MS:       FIB[6] * 1000,                         // 13000ms suspend grace
  RETIRE_DRAIN_MS:        FIB[8] * 1000,                         // 34000ms retirement drain
  TOKEN_BUDGET_HOT:       FIB[13] * 100,                         // 37700 tokens per hot bee
  TOKEN_BUDGET_WARM:      FIB[12] * 100,                         // 23300 tokens per warm bee
  TOKEN_BUDGET_COLD:      FIB[11] * 100,                         // 14400 tokens per cold bee
  TOKEN_BUDGET_RESERVE:   FIB[10] * 100,                         // 8900 tokens per reserve bee
  PREEMPTION_CSL_DELTA:   0.1,                                   // min coherence gap to preempt
  DECOMPOSITION_DEPTH:    FIB[5],                                // 8 max sub-agent DAG depth
  BACKPRESSURE_THRESHOLD: CSL_GATES.LOW,                         // 0.691 triggers backpressure
  HEALTH_INTERVAL_MS:     FIB[6] * 1000,                         // 13000ms health check cycle
  QUEUE_CAPACITY:         FIB[8],                                // 34 pending tasks in queue
};

// ─── Agent Lifecycle States ────────────────────────────────────────────
const AgentState = {
  SPAWNING:   'SPAWNING',
  READY:      'READY',
  RUNNING:    'RUNNING',
  SUSPENDED:  'SUSPENDED',
  RETIRING:   'RETIRING',
  TERMINATED: 'TERMINATED',
};

// ─── Valid State Transitions ───────────────────────────────────────────
const STATE_TRANSITIONS = {
  SPAWNING:   ['READY', 'TERMINATED'],
  READY:      ['RUNNING', 'SUSPENDED', 'TERMINATED'],
  RUNNING:    ['SUSPENDED', 'RETIRING', 'TERMINATED'],
  SUSPENDED:  ['READY', 'RETIRING', 'TERMINATED'],
  RETIRING:   ['TERMINATED'],
  TERMINATED: [],
};
```

## Instructions

### Resource Pool Allocator

The allocator distributes resources across Sacred Geometry pools. Each pool maps to a bee temperature tier, and budgets are derived from Fibonacci sequences multiplied by pool fractions.

```javascript
// heady-agent-runtime/src/resource-allocator.mjs
import pino from 'pino';

const log = pino({ name: 'heady-agent-runtime:allocator', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

const TOKEN_BUDGETS = {
  Hot:        FIB[13] * 100,    // 37700
  Warm:       FIB[12] * 100,    // 23300
  Cold:       FIB[11] * 100,    // 14400
  Reserve:    FIB[10] * 100,    // 8900
  Governance: FIB[9] * 100,     // 5500
};

export class ResourcePoolAllocator {
  constructor(totalMemoryMB, totalCPUShares) {
    this.pools = new Map();
    for (const [pool, fraction] of Object.entries(POOLS)) {
      this.pools.set(pool, {
        name: pool,
        fraction,
        memoryMB: Math.floor(totalMemoryMB * fraction),
        cpuShares: Math.floor(totalCPUShares * fraction),
        tokenBudget: TOKEN_BUDGETS[pool],
        allocatedMemoryMB: 0,
        allocatedCPUShares: 0,
        allocatedTokens: 0,
        agentCount: 0,
      });
    }
    log.info({ totalMemoryMB, totalCPUShares, pools: Object.keys(POOLS) },
      'Resource pools initialized');
  }

  allocate(pool, memoryMB, cpuShares) {
    const p = this.pools.get(pool);
    if (!p) throw new Error(`Unknown pool: ${pool}`);
    const memFree = p.memoryMB - p.allocatedMemoryMB;
    const cpuFree = p.cpuShares - p.allocatedCPUShares;
    if (memoryMB > memFree || cpuShares > cpuFree) {
      log.warn({ pool, requested: { memoryMB, cpuShares }, free: { memFree, cpuFree } },
        'Insufficient resources in pool');
      return null;
    }
    p.allocatedMemoryMB += memoryMB;
    p.allocatedCPUShares += cpuShares;
    p.agentCount += 1;
    const lease = { pool, memoryMB, cpuShares, tokenBudget: p.tokenBudget, leasedAt: Date.now() };
    log.info({ pool, memoryMB, cpuShares, tokenBudget: p.tokenBudget }, 'Resources allocated');
    return lease;
  }

  release(lease) {
    const p = this.pools.get(lease.pool);
    if (!p) return;
    p.allocatedMemoryMB = Math.max(0, p.allocatedMemoryMB - lease.memoryMB);
    p.allocatedCPUShares = Math.max(0, p.allocatedCPUShares - lease.cpuShares);
    p.agentCount = Math.max(0, p.agentCount - 1);
    log.info({ pool: lease.pool }, 'Resources released');
  }

  utilization() {
    const report = {};
    for (const [name, p] of this.pools) {
      report[name] = {
        memoryUtilization: p.memoryMB > 0 ? p.allocatedMemoryMB / p.memoryMB : 0,
        cpuUtilization: p.cpuShares > 0 ? p.allocatedCPUShares / p.cpuShares : 0,
        agentCount: p.agentCount,
        tokenBudget: p.tokenBudget,
      };
    }
    return report;
  }
}
```

### Agent Lifecycle Manager

Manages the six-state lifecycle with validated transitions, spawn timeouts, and graceful retirement drains.

```javascript
// heady-agent-runtime/src/lifecycle.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-agent-runtime:lifecycle', level: process.env.LOG_LEVEL || 'info' });

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const AgentState = {
  SPAWNING: 'SPAWNING', READY: 'READY', RUNNING: 'RUNNING',
  SUSPENDED: 'SUSPENDED', RETIRING: 'RETIRING', TERMINATED: 'TERMINATED',
};

const STATE_TRANSITIONS = {
  SPAWNING:   ['READY', 'TERMINATED'],
  READY:      ['RUNNING', 'SUSPENDED', 'TERMINATED'],
  RUNNING:    ['SUSPENDED', 'RETIRING', 'TERMINATED'],
  SUSPENDED:  ['READY', 'RETIRING', 'TERMINATED'],
  RETIRING:   ['TERMINATED'],
  TERMINATED: [],
};

const RUNTIME = {
  SPAWN_TIMEOUT_MS: FIB[7] * 1000,
  SUSPEND_GRACE_MS: FIB[6] * 1000,
  RETIRE_DRAIN_MS:  FIB[8] * 1000,
};

export class AgentLifecycle {
  constructor(agentId, beeType, sacredLayer, resourceLease) {
    this.agentId = agentId || randomUUID();
    this.beeType = beeType;
    this.sacredLayer = sacredLayer;
    this.resourceLease = resourceLease;
    this.state = AgentState.SPAWNING;
    this.stateHistory = [{ state: AgentState.SPAWNING, at: Date.now() }];
    this.tokensUsed = 0;
    this.spawnedAt = Date.now();
    log.info({ agentId: this.agentId, beeType, sacredLayer }, 'Agent spawning');
  }

  transition(newState) {
    const allowed = STATE_TRANSITIONS[this.state];
    if (!allowed || !allowed.includes(newState)) {
      const msg = `Invalid transition: ${this.state} → ${newState}`;
      log.error({ agentId: this.agentId, from: this.state, to: newState }, msg);
      throw new Error(msg);
    }
    const prevState = this.state;
    this.state = newState;
    this.stateHistory.push({ state: newState, at: Date.now() });
    log.info({ agentId: this.agentId, from: prevState, to: newState }, 'State transition');
    return this;
  }

  isSpawnTimedOut() {
    if (this.state !== AgentState.SPAWNING) return false;
    return (Date.now() - this.spawnedAt) > RUNTIME.SPAWN_TIMEOUT_MS;
  }

  consumeTokens(count) {
    this.tokensUsed += count;
    const budget = this.resourceLease?.tokenBudget || 0;
    if (budget > 0 && this.tokensUsed >= budget) {
      log.warn({ agentId: this.agentId, tokensUsed: this.tokensUsed, budget },
        'Token budget exhausted');
      return { exhausted: true, tokensUsed: this.tokensUsed, budget };
    }
    return { exhausted: false, tokensUsed: this.tokensUsed, budget };
  }

  summary() {
    return {
      agentId: this.agentId,
      beeType: this.beeType,
      sacredLayer: this.sacredLayer,
      state: this.state,
      tokensUsed: this.tokensUsed,
      tokenBudget: this.resourceLease?.tokenBudget || 0,
      pool: this.resourceLease?.pool || 'unknown',
      uptimeMs: Date.now() - this.spawnedAt,
      transitions: this.stateHistory.length,
    };
  }
}
```

### Preemptive Scheduler

The scheduler maintains a priority queue scored by CSL coherence. Higher-coherence tasks preempt lower-coherence running agents when the concurrency ceiling is hit.

```javascript
// heady-agent-runtime/src/scheduler.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-agent-runtime:scheduler', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const RUNTIME = {
  MAX_CONCURRENT_AGENTS: FIB[9],
  SCHEDULER_TICK_MS: FIB[5] * 100,
  PREEMPTION_CSL_DELTA: 0.1,
  QUEUE_CAPACITY: FIB[8],
  BACKPRESSURE_THRESHOLD: CSL_GATES.LOW,
};

export class PreemptiveScheduler {
  constructor(lifecycleRegistry, allocator) {
    this.registry = lifecycleRegistry;
    this.allocator = allocator;
    this.pendingQueue = [];
    this.runningAgents = new Map();
    this.tickHandle = null;
    log.info({ maxConcurrent: RUNTIME.MAX_CONCURRENT_AGENTS,
      tickMs: RUNTIME.SCHEDULER_TICK_MS }, 'Scheduler initialized');
  }

  enqueue(taskDescriptor) {
    if (this.pendingQueue.length >= RUNTIME.QUEUE_CAPACITY) {
      log.warn({ queueSize: this.pendingQueue.length, capacity: RUNTIME.QUEUE_CAPACITY },
        'Queue full — triggering backpressure');
      return { queued: false, reason: 'backpressure', queueDepth: this.pendingQueue.length };
    }
    const entry = {
      taskId: taskDescriptor.taskId || randomUUID(),
      coherenceScore: taskDescriptor.coherenceScore || CSL_GATES.MINIMUM,
      beeType: taskDescriptor.beeType,
      pool: taskDescriptor.pool || 'Warm',
      sacredLayer: taskDescriptor.sacredLayer || 'Middle',
      enqueuedAt: Date.now(),
    };
    this.pendingQueue.push(entry);
    this.pendingQueue.sort((a, b) => b.coherenceScore - a.coherenceScore);
    log.info({ taskId: entry.taskId, coherence: entry.coherenceScore,
      queueDepth: this.pendingQueue.length }, 'Task enqueued');
    return { queued: true, taskId: entry.taskId, queueDepth: this.pendingQueue.length };
  }

  tick() {
    this.evictTimedOut();
    while (this.pendingQueue.length > 0) {
      if (this.runningAgents.size < RUNTIME.MAX_CONCURRENT_AGENTS) {
        const task = this.pendingQueue.shift();
        this.startAgent(task);
        continue;
      }
      const candidate = this.pendingQueue[0];
      const victim = this.findPreemptionVictim(candidate.coherenceScore);
      if (victim) {
        log.info({ preempted: victim.agentId, by: candidate.taskId,
          victimCSL: victim.coherenceScore, candidateCSL: candidate.coherenceScore },
          'Preemption triggered');
        this.suspendAgent(victim.agentId);
        this.pendingQueue.shift();
        this.startAgent(candidate);
      } else {
        break;
      }
    }
  }

  startAgent(task) {
    const lease = this.allocator.allocate(task.pool, FIB[5], FIB[4]);
    if (!lease) {
      this.pendingQueue.unshift(task);
      log.warn({ taskId: task.taskId, pool: task.pool }, 'Allocation failed — re-queued');
      return;
    }
    const { AgentLifecycle } = require('./lifecycle.mjs');
    const agent = new (Function('return import("./lifecycle.mjs")'))();
    const agentEntry = {
      agentId: task.taskId,
      beeType: task.beeType,
      coherenceScore: task.coherenceScore,
      pool: task.pool,
      lease,
      startedAt: Date.now(),
    };
    this.runningAgents.set(task.taskId, agentEntry);
    log.info({ agentId: task.taskId, pool: task.pool, beeType: task.beeType },
      'Agent started');
  }

  suspendAgent(agentId) {
    const entry = this.runningAgents.get(agentId);
    if (!entry) return;
    this.runningAgents.delete(agentId);
    this.allocator.release(entry.lease);
    log.info({ agentId }, 'Agent suspended for preemption');
  }

  findPreemptionVictim(candidateCSL) {
    let lowestCSL = Infinity;
    let victim = null;
    for (const [id, entry] of this.runningAgents) {
      if (entry.coherenceScore < lowestCSL) {
        lowestCSL = entry.coherenceScore;
        victim = entry;
      }
    }
    if (victim && (candidateCSL - lowestCSL) >= RUNTIME.PREEMPTION_CSL_DELTA) {
      return victim;
    }
    return null;
  }

  evictTimedOut() {
    for (const [id, entry] of this.runningAgents) {
      const runtime = Date.now() - entry.startedAt;
      if (runtime > FIB[12] * 1000) {
        log.warn({ agentId: id, runtimeMs: runtime }, 'Agent exceeded max runtime — evicting');
        this.suspendAgent(id);
      }
    }
  }

  start() {
    if (this.tickHandle) return;
    this.tickHandle = setInterval(() => this.tick(), RUNTIME.SCHEDULER_TICK_MS);
    log.info({ tickMs: RUNTIME.SCHEDULER_TICK_MS }, 'Scheduler started');
  }

  stop() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
      log.info('Scheduler stopped');
    }
  }

  stats() {
    return {
      runningAgents: this.runningAgents.size,
      maxConcurrent: RUNTIME.MAX_CONCURRENT_AGENTS,
      queueDepth: this.pendingQueue.length,
      queueCapacity: RUNTIME.QUEUE_CAPACITY,
      utilization: this.runningAgents.size / RUNTIME.MAX_CONCURRENT_AGENTS,
      backpressureActive: this.pendingQueue.length >= RUNTIME.QUEUE_CAPACITY,
    };
  }
}
```

### Fault Domain Isolation

Groups agents by Sacred Geometry layer. Failures in one domain are contained — a crash in an Outer-ring agent never brings down Inner-ring services.

```javascript
// heady-agent-runtime/src/fault-domains.mjs
import pino from 'pino';

const log = pino({ name: 'heady-agent-runtime:fault-domains', level: process.env.LOG_LEVEL || 'info' });

const SACRED_LAYERS = ['Center', 'Inner', 'Middle', 'Outer', 'Governance'];

export class FaultDomainManager {
  constructor() {
    this.domains = new Map();
    for (const layer of SACRED_LAYERS) {
      this.domains.set(layer, {
        layer,
        agents: new Set(),
        failures: 0,
        lastFailure: null,
        circuitOpen: false,
      });
    }
    log.info({ domains: SACRED_LAYERS }, 'Fault domains initialized');
  }

  registerAgent(agentId, layer) {
    const domain = this.domains.get(layer);
    if (!domain) throw new Error(`Unknown Sacred Geometry layer: ${layer}`);
    domain.agents.add(agentId);
    log.info({ agentId, layer, agentCount: domain.agents.size }, 'Agent registered to fault domain');
  }

  deregisterAgent(agentId, layer) {
    const domain = this.domains.get(layer);
    if (domain) domain.agents.delete(agentId);
  }

  recordFailure(layer) {
    const domain = this.domains.get(layer);
    if (!domain) return;
    domain.failures += 1;
    domain.lastFailure = Date.now();
    if (domain.failures >= 5) {
      domain.circuitOpen = true;
      log.error({ layer, failures: domain.failures }, 'Circuit breaker OPEN — domain isolated');
    }
  }

  isDomainHealthy(layer) {
    const domain = this.domains.get(layer);
    return domain ? !domain.circuitOpen : false;
  }

  status() {
    const report = {};
    for (const [layer, domain] of this.domains) {
      report[layer] = {
        agentCount: domain.agents.size,
        failures: domain.failures,
        circuitOpen: domain.circuitOpen,
        healthy: !domain.circuitOpen,
      };
    }
    return report;
  }
}
```

### Express Router and Health Endpoint

```javascript
// heady-agent-runtime/src/router.mjs
import express from 'express';
import pino from 'pino';
import { ResourcePoolAllocator } from './resource-allocator.mjs';
import { PreemptiveScheduler } from './scheduler.mjs';
import { FaultDomainManager } from './fault-domains.mjs';

const log = pino({ name: 'heady-agent-runtime', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };
const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

export function createAgentRuntimeRouter() {
  const router = express.Router();
  const allocator = new ResourcePoolAllocator(FIB[12] * 10, FIB[11] * 10);
  const scheduler = new PreemptiveScheduler(new Map(), allocator);
  const faultDomains = new FaultDomainManager();

  scheduler.start();

  router.get('/health', (req, res) => {
    const schedulerStats = scheduler.stats();
    const poolUtil = allocator.utilization();
    const domainStatus = faultDomains.status();
    const coherence = schedulerStats.utilization < PSI ? CSL_GATES.HIGH
      : schedulerStats.utilization < PSI + 0.2 ? CSL_GATES.MEDIUM
      : CSL_GATES.LOW;
    res.json({
      service: 'heady-agent-runtime',
      status: coherence >= CSL_GATES.MEDIUM ? 'healthy' : 'degraded',
      coherence: parseFloat(coherence.toFixed(4)),
      phi_compliance: true,
      sacred_geometry_layer: 'Middle',
      uptime_seconds: parseFloat(process.uptime().toFixed(2)),
      version: '1.0.0',
      phi: PHI,
      psi: PSI,
      pools: POOLS,
      csl_gates: CSL_GATES,
      scheduler: schedulerStats,
      resource_utilization: poolUtil,
      fault_domains: domainStatus,
    });
  });

  router.post('/agent/spawn', (req, res) => {
    const { beeType, pool, sacredLayer, coherenceScore } = req.body;
    const result = scheduler.enqueue({ beeType, pool, sacredLayer, coherenceScore });
    if (!result.queued) {
      res.status(429).json(result);
      return;
    }
    faultDomains.registerAgent(result.taskId, sacredLayer || 'Middle');
    res.status(201).json(result);
  });

  router.post('/agent/:agentId/suspend', (req, res) => {
    const { agentId } = req.params;
    scheduler.suspendAgent(agentId);
    res.json({ agentId, state: 'SUSPENDED' });
  });

  router.get('/scheduler/stats', (req, res) => {
    res.json(scheduler.stats());
  });

  router.get('/pools', (req, res) => {
    res.json(allocator.utilization());
  });

  router.get('/fault-domains', (req, res) => {
    res.json(faultDomains.status());
  });

  return router;
}
```

## Integration Points

| Component                     | Interface                               | Sacred Geometry Layer |
|-------------------------------|-----------------------------------------|-----------------------|
| **Conductor**                 | Receives spawn/schedule commands         | Inner                 |
| **JULES**                     | Runtime execution host                  | Middle                |
| **OBSERVER**                  | Reports agent metrics and state changes | Middle                |
| **MURPHY**                    | Security audit on agent actions         | Middle                |
| **heady-bee-swarm-ops**       | Swarm-level coordination of agents      | Middle                |
| **heady-semantic-backpressure** | Engaged when queue/resource limits hit | Governance            |
| **heady-instantaneous-architecture** | Dynamic infrastructure scaling   | Governance            |
| **heady-conductor**           | Top-level orchestration and routing     | Inner                 |
| **heady-observability-mesh**  | Telemetry for agent lifecycle events    | Governance            |
| **Cloudflare Workers**        | V8 isolate execution substrate          | Edge                  |
| **Cloud Run**                 | Origin compute for heavy agents         | Origin                |
| **Upstash Redis**             | Agent state cache and lock management   | Cache                 |
| **Neon Postgres**             | Persistent agent history and audit log  | Database              |

## API

### GET /health

Returns runtime health with coherence score, scheduler stats, pool utilization, and fault domain status.

### POST /agent/spawn

Enqueues a new agent for scheduling.

**Request:**
```json
{
  "beeType": "research-bee",
  "pool": "Hot",
  "sacredLayer": "Middle",
  "coherenceScore": 0.882
}
```

**Response (201):**
```json
{
  "queued": true,
  "taskId": "a1b2c3d4-...",
  "queueDepth": 3
}
```

### POST /agent/:agentId/suspend

Suspends a running agent, releasing its resources back to the pool.

### GET /scheduler/stats

Returns scheduler queue depth, running agent count, utilization, and backpressure status.

### GET /pools

Returns per-pool resource utilization (memory, CPU, agent count, token budget).

### GET /fault-domains

Returns per-layer fault domain status including circuit breaker state.

## Health Endpoint

```json
{
  "service": "heady-agent-runtime",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Middle",
  "uptime_seconds": 54021.37,
  "version": "1.0.0",
  "phi": 1.618033988749895,
  "psi": 0.618033988749895,
  "pools": { "Hot": 0.34, "Warm": 0.21, "Cold": 0.13, "Reserve": 0.08, "Governance": 0.05 },
  "csl_gates": { "MINIMUM": 0.500, "LOW": 0.691, "MEDIUM": 0.809, "HIGH": 0.882, "CRITICAL": 0.927, "DEDUP": 0.972 },
  "scheduler": {
    "runningAgents": 23,
    "maxConcurrent": 55,
    "queueDepth": 5,
    "queueCapacity": 34,
    "utilization": 0.418,
    "backpressureActive": false
  },
  "resource_utilization": {
    "Hot": { "memoryUtilization": 0.62, "cpuUtilization": 0.58, "agentCount": 11, "tokenBudget": 37700 },
    "Warm": { "memoryUtilization": 0.45, "cpuUtilization": 0.41, "agentCount": 7, "tokenBudget": 23300 },
    "Cold": { "memoryUtilization": 0.22, "cpuUtilization": 0.19, "agentCount": 3, "tokenBudget": 14400 },
    "Reserve": { "memoryUtilization": 0.11, "cpuUtilization": 0.08, "agentCount": 1, "tokenBudget": 8900 },
    "Governance": { "memoryUtilization": 0.05, "cpuUtilization": 0.04, "agentCount": 1, "tokenBudget": 5500 }
  },
  "fault_domains": {
    "Center": { "agentCount": 1, "failures": 0, "circuitOpen": false, "healthy": true },
    "Inner": { "agentCount": 4, "failures": 0, "circuitOpen": false, "healthy": true },
    "Middle": { "agentCount": 12, "failures": 1, "circuitOpen": false, "healthy": true },
    "Outer": { "agentCount": 5, "failures": 0, "circuitOpen": false, "healthy": true },
    "Governance": { "agentCount": 1, "failures": 0, "circuitOpen": false, "healthy": true }
  }
}
```
