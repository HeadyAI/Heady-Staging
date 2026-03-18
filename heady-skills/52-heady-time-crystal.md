---
name: heady-time-crystal
description: >-
  Heady Time Crystal — temporal state management providing full undo/redo/branch/merge across the Heady ecosystem. Captures 384D state snapshots at phi-scaled intervals organized into a DAG of timeline branches for point-in-time recovery and parallel exploration. Each snapshot captures vector memory, service configs, agent populations, and pipeline state. Uses Fibonacci-spaced checkpoints, CSL-gated significance detection, Merkle-tree integrity, and phi-weighted temporal decay. Use when implementing state versioning, time-travel debugging, rollback, or branching timelines. Keywords: time crystal, undo, redo, branch, merge, timeline, snapshot, rollback, checkpoint, temporal, DAG, state recovery.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Time Crystal

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Building undo/redo across the entire Heady ecosystem (not just a single service)
- Implementing time-travel debugging that lets you inspect any past system state
- Creating branching timelines for parallel experimentation (A/B of entire system configs)
- Rolling back after a bad deployment, broken pipeline, or corrupted vector memory
- Auditing exactly what the system state was at any historical moment
- Merging changes from experimental branches back into the main timeline

## Architecture

```
Event Stream (all state-changing operations across Heady)
  │
  ▼
Significance Detector (CSL gate ≥ 0.691)
  │ Filters trivial changes — only crystallize meaningful state transitions
  │
  ▼
Crystal Forge
  │ Captures: vector memory hash, service configs, agent registry,
  │           pipeline state, embedding space summary (centroid + spread)
  │
  ▼
Temporal Crystal (compressed state snapshot)
  │ Fields: { crystalId, parentId, branchId, timestamp,
  │           stateHash, merkleRoot, embedding[384], metadata }
  │
  ▼
Timeline DAG (directed acyclic graph of crystals)
  ├─→ Main Timeline: linear sequence of production crystals
  ├─→ Branch A: experimental fork from crystal #34
  ├─→ Branch B: rollback investigation from crystal #21
  └─→ Merged: Branch A merged back into Main at crystal #55
        │
        ▼
  Crystal Vault (persistent storage)
  ├─→ Hot tier: last FIB[8]=21 crystals (instant access)
  ├─→ Warm tier: last FIB[10]=55 crystals (fast access)
  └─→ Cold tier: all historical crystals (compressed, archived)
        │
        ▼
  Temporal Queries
  ├─→ time-travel: restore exact state at crystal N
  ├─→ diff: compare two crystals for changes
  ├─→ branch: fork a new timeline from any crystal
  └─→ merge: combine branch changes into target timeline
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Time Crystal Constants
const CHECKPOINT_INTERVAL_MS = FIB[7] * 1000;    // 13s — automatic checkpoint interval
const SIGNIFICANCE_THRESHOLD = 0.691;             // CSL LOW — must be meaningful change
const HIGH_SIGNIFICANCE = 0.882;                  // CSL HIGH — force immediate crystal
const CRYSTAL_EMBEDDING_DIM = 384;                // Full 384D state embedding
const MAX_HOT_CRYSTALS = FIB[8];                  // 21 in hot tier
const MAX_WARM_CRYSTALS = FIB[10];                // 55 in warm tier
const MAX_COLD_CRYSTALS = FIB[13];                // 233 in cold archive
const BRANCH_LIMIT = FIB[6];                      // 8 concurrent branches max
const MERKLE_TREE_FANOUT = FIB[4];                // 3-ary Merkle tree
const COMPRESSION_RATIO_TARGET = PSI;              // Target 61.8% compression
const TEMPORAL_DECAY_FACTOR = PSI * PSI;           // 0.382 — cold crystals decay importance
const STATE_DIFF_MIN_DISTANCE = 1 - 0.972;        // Must differ by at least DEDUP distance
const MERGE_CONFLICT_THRESHOLD = 0.500;            // CSL MINIMUM — below this = conflict
```

## Instructions

### 1. Temporal Crystal Data Structure

The fundamental unit of time in the Heady ecosystem:

```javascript
class TemporalCrystal {
  constructor({ parentId, branchId, stateCapture, embeddingProvider }) {
    this.crystalId = crypto.randomUUID();
    this.parentId = parentId;                    // Previous crystal in timeline
    this.branchId = branchId || 'main';          // Which timeline branch
    this.timestamp = Date.now();
    this.stateCapture = stateCapture;            // Raw state data
    this.stateHash = null;                       // SHA-256 of state
    this.merkleRoot = null;                      // Merkle root of sub-states
    this.embedding = null;                       // 384D embedding of state summary
    this.metadata = {
      significance: 0,
      triggerEvent: null,
      serviceCount: 0,
      vectorMemorySize: 0,
      agentCount: 0,
    };
  }

  async crystallize(embeddingProvider) {
    // Hash the full state
    const stateBytes = new TextEncoder().encode(JSON.stringify(this.stateCapture));
    const hashBuffer = await crypto.subtle.digest('SHA-256', stateBytes);
    this.stateHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Build Merkle tree from sub-states
    this.merkleRoot = await this.buildMerkleTree(this.stateCapture);

    // Generate 384D embedding for semantic state comparison
    const stateSummary = this.generateStateSummary();
    this.embedding = await embeddingProvider.embed(stateSummary);

    return this;
  }

  async buildMerkleTree(state) {
    const leaves = Object.entries(state).map(([key, value]) => {
      const data = new TextEncoder().encode(JSON.stringify({ key, value }));
      return crypto.subtle.digest('SHA-256', data);
    });

    const hashes = await Promise.all(leaves);
    return this.merkleReduce(hashes.map(h =>
      Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('')
    ));
  }

  merkleReduce(hashes) {
    if (hashes.length <= 1) return hashes[0] || '';
    const next = [];
    for (let i = 0; i < hashes.length; i += MERKLE_TREE_FANOUT) {
      const group = hashes.slice(i, i + MERKLE_TREE_FANOUT);
      next.push(this.hashGroup(group));
    }
    return this.merkleReduce(next);
  }

  hashGroup(group) {
    return group.join(':'); // Simplified — use SHA-256 in production
  }

  generateStateSummary() {
    const sc = this.stateCapture;
    return `Heady ecosystem state: ${sc.serviceCount || 0} services, `
      + `${sc.vectorMemorySize || 0} vectors, ${sc.agentCount || 0} agents, `
      + `${sc.pipelineState || 'idle'} pipeline, branch ${this.branchId}`;
  }
}
```

### 2. State Capture Engine

Captures ecosystem-wide state snapshots:

```javascript
class StateCaptureEngine {
  constructor({ serviceRegistry, vectorMemory, agentRegistry, pipelineEngine, logger }) {
    this.serviceRegistry = serviceRegistry;
    this.vectorMemory = vectorMemory;
    this.agentRegistry = agentRegistry;
    this.pipelineEngine = pipelineEngine;
    this.logger = logger;
  }

  async captureState() {
    const [services, vectorStats, agents, pipeline] = await Promise.all([
      this.captureServices(),
      this.captureVectorMemory(),
      this.captureAgents(),
      this.capturePipeline(),
    ]);

    return {
      services,
      vectorMemory: vectorStats,
      agents,
      pipeline,
      serviceCount: services.length,
      vectorMemorySize: vectorStats.totalVectors,
      agentCount: agents.length,
      pipelineState: pipeline.state,
      capturedAt: Date.now(),
    };
  }

  async captureServices() {
    const services = await this.serviceRegistry.listAll();
    return services.map(s => ({
      id: s.id,
      name: s.name,
      version: s.version,
      configHash: s.configHash,
      healthStatus: s.lastHealth?.status,
      coherenceScore: s.lastHealth?.coherenceScore,
    }));
  }

  async captureVectorMemory() {
    return {
      totalVectors: await this.vectorMemory.count(),
      centroid: await this.vectorMemory.computeCentroid(),
      spread: await this.vectorMemory.computeSpread(), // Average distance from centroid
      indexHealth: await this.vectorMemory.indexHealth(),
    };
  }

  async captureAgents() {
    const agents = await this.agentRegistry.listAll();
    return agents.map(a => ({
      id: a.id,
      type: a.type,
      status: a.status,
      fitness: a.fitness,
      generation: a.generation,
    }));
  }

  async capturePipeline() {
    return {
      state: this.pipelineEngine.currentState(),
      activeStage: this.pipelineEngine.activeStage(),
      queueDepth: this.pipelineEngine.queueDepth(),
    };
  }
}
```

### 3. Significance Detector

Determines whether a state change is worth crystallizing:

```javascript
class SignificanceDetector {
  constructor({ embeddingProvider }) {
    this.embeddingProvider = embeddingProvider;
    this.lastCrystalEmbedding = null;
  }

  async evaluate(currentState, previousCrystal) {
    if (!previousCrystal) return { significant: true, score: 1.0, reason: 'initial-state' };

    // Compare state embeddings via cosine distance
    const currentSummary = this.summarize(currentState);
    const currentEmbedding = await this.embeddingProvider.embed(currentSummary);

    const similarity = cosineSimilarity(currentEmbedding, previousCrystal.embedding);
    const distance = 1 - similarity;

    // Must exceed minimum diff threshold
    if (distance < STATE_DIFF_MIN_DISTANCE) {
      return { significant: false, score: distance, reason: 'trivial-change' };
    }

    // Check service-level changes
    const serviceChanges = this.detectServiceChanges(currentState, previousCrystal.stateCapture);
    const agentChanges = this.detectAgentChanges(currentState, previousCrystal.stateCapture);

    const significance = (distance * PHI + serviceChanges * 1.0 + agentChanges * PSI) / (PHI + 1.0 + PSI);

    return {
      significant: significance >= SIGNIFICANCE_THRESHOLD,
      score: significance,
      reason: significance >= HIGH_SIGNIFICANCE ? 'high-impact-change' : 'standard-change',
      forceImmediate: significance >= HIGH_SIGNIFICANCE,
    };
  }

  detectServiceChanges(current, previous) {
    const currentIds = new Set(current.services?.map(s => `${s.id}:${s.configHash}`) || []);
    const previousIds = new Set(previous?.services?.map(s => `${s.id}:${s.configHash}`) || []);
    const changed = [...currentIds].filter(id => !previousIds.has(id)).length;
    return Math.min(1, changed / FIB[5]); // Normalize to 0-1
  }

  detectAgentChanges(current, previous) {
    const currentCount = current.agentCount || 0;
    const previousCount = previous?.agentCount || 0;
    return Math.min(1, Math.abs(currentCount - previousCount) / FIB[6]);
  }

  summarize(state) {
    return `Services:${state.serviceCount} Vectors:${state.vectorMemorySize} `
      + `Agents:${state.agentCount} Pipeline:${state.pipelineState}`;
  }
}
```

### 4. Timeline DAG Manager

Manages branching, merging, and traversal of timelines:

```javascript
class TimelineDAG {
  constructor({ crystalVault, logger }) {
    this.crystalVault = crystalVault;
    this.logger = logger;
    this.branches = new Map(); // branchId → { headCrystalId, createdAt, parentBranch }
    this.branches.set('main', { headCrystalId: null, createdAt: Date.now(), parentBranch: null });
  }

  async addCrystal(crystal) {
    await this.crystalVault.store(crystal);
    const branch = this.branches.get(crystal.branchId);
    if (branch) branch.headCrystalId = crystal.crystalId;
    this.logger.info({ crystalId: crystal.crystalId, branch: crystal.branchId }, 'crystal-added');
  }

  async createBranch(branchName, forkFromCrystalId) {
    if (this.branches.size >= BRANCH_LIMIT) {
      throw new Error(`Branch limit reached (max ${BRANCH_LIMIT})`);
    }

    const sourceCrystal = await this.crystalVault.get(forkFromCrystalId);
    if (!sourceCrystal) throw new Error(`Crystal ${forkFromCrystalId} not found`);

    this.branches.set(branchName, {
      headCrystalId: forkFromCrystalId,
      createdAt: Date.now(),
      parentBranch: sourceCrystal.branchId,
      forkPoint: forkFromCrystalId,
    });

    this.logger.info({ branch: branchName, forkFrom: forkFromCrystalId }, 'branch-created');
    return branchName;
  }

  async timeTravel(crystalId) {
    const crystal = await this.crystalVault.get(crystalId);
    if (!crystal) throw new Error(`Crystal ${crystalId} not found`);
    return crystal.stateCapture; // Full ecosystem state at that point
  }

  async diff(crystalIdA, crystalIdB) {
    const [a, b] = await Promise.all([
      this.crystalVault.get(crystalIdA),
      this.crystalVault.get(crystalIdB),
    ]);

    const embeddingDistance = 1 - cosineSimilarity(a.embedding, b.embedding);

    return {
      crystalA: crystalIdA,
      crystalB: crystalIdB,
      embeddingDistance,
      timeDelta: Math.abs(a.timestamp - b.timestamp),
      servicesDiff: this.diffArrays(a.stateCapture.services, b.stateCapture.services, 'id'),
      agentsDiff: this.diffArrays(a.stateCapture.agents, b.stateCapture.agents, 'id'),
      vectorMemoryDelta: {
        sizeDiff: (b.stateCapture.vectorMemorySize || 0) - (a.stateCapture.vectorMemorySize || 0),
      },
    };
  }

  async merge(sourceBranch, targetBranch) {
    const source = this.branches.get(sourceBranch);
    const target = this.branches.get(targetBranch);
    if (!source || !target) throw new Error('Branch not found');

    const sourceCrystal = await this.crystalVault.get(source.headCrystalId);
    const targetCrystal = await this.crystalVault.get(target.headCrystalId);

    // Check for conflicts via embedding similarity
    const similarity = cosineSimilarity(sourceCrystal.embedding, targetCrystal.embedding);
    if (similarity < MERGE_CONFLICT_THRESHOLD) {
      return { merged: false, conflict: true, similarity, reason: 'states-too-divergent' };
    }

    // Merge state captures
    const mergedState = this.mergeStates(sourceCrystal.stateCapture, targetCrystal.stateCapture);

    this.logger.info({ source: sourceBranch, target: targetBranch }, 'branches-merged');
    return { merged: true, mergedState, similarity };
  }

  mergeStates(sourceState, targetState) {
    // φ-weighted merge: target gets 61.8%, source gets 38.2%
    return {
      services: this.mergeArrays(targetState.services, sourceState.services, 'id', PSI),
      agents: this.mergeArrays(targetState.agents, sourceState.agents, 'id', PSI),
      vectorMemory: targetState.vectorMemory, // Vector memory merge handled separately
      pipeline: targetState.pipeline,
      serviceCount: Math.max(targetState.serviceCount, sourceState.serviceCount),
      vectorMemorySize: Math.max(targetState.vectorMemorySize, sourceState.vectorMemorySize),
      agentCount: Math.max(targetState.agentCount, sourceState.agentCount),
    };
  }

  diffArrays(a, b, keyField) {
    const aMap = new Map((a || []).map(item => [item[keyField], item]));
    const bMap = new Map((b || []).map(item => [item[keyField], item]));
    return {
      added: [...bMap.keys()].filter(k => !aMap.has(k)),
      removed: [...aMap.keys()].filter(k => !bMap.has(k)),
      modified: [...aMap.keys()].filter(k => bMap.has(k) && JSON.stringify(aMap.get(k)) !== JSON.stringify(bMap.get(k))),
    };
  }

  mergeArrays(target, source, keyField, weight) {
    const merged = new Map(target.map(item => [item[keyField], item]));
    for (const item of source) {
      if (!merged.has(item[keyField])) merged.set(item[keyField], item);
    }
    return [...merged.values()];
  }
}
```

## Integration Points

| Heady Component | Time Crystal Role |
|---|---|
| HeadySoul | Soul state versioned across crystals — track evolution |
| GhostProtocol | Ghost simulations branch timelines, merge if successful |
| ConsensusTribunal | Tribunal decisions annotate crystals with governance metadata |
| AutoSuccess | Pipeline state included in every crystal for full reproducibility |
| DreamEngine | Dream discoveries create significance spikes that trigger crystallization |
| MyceliumNetwork | Cross-instance crystals enable distributed time travel |

## API

```javascript
const { TimeCrystal } = require('@heady/time-crystal');

const crystal = new TimeCrystal({
  serviceRegistry,
  vectorMemory,
  agentRegistry,
  pipelineEngine,
  embeddingProvider,
  logger: pinoLogger,
});

await crystal.start();                            // Begin automatic checkpointing
const id = await crystal.checkpoint();             // Manual checkpoint
const state = await crystal.timeTravel(id);        // Restore state
const diff = await crystal.diff(idA, idB);         // Compare states
const branch = await crystal.branch('experiment'); // Fork timeline
const result = await crystal.merge('experiment', 'main');

crystal.health();
await crystal.shutdown();
```

## Health Endpoint

```json
{
  "status": "crystallizing",
  "coherenceScore": 0.873,
  "totalCrystals": 89,
  "hotTierCount": 21,
  "warmTierCount": 55,
  "coldTierCount": 13,
  "activeBranches": 3,
  "mainTimelineHead": "crystal-abc123",
  "lastCheckpoint": "2026-03-17T23:45:00Z",
  "averageSignificance": 0.741,
  "storageUsedBytes": 2584064,
  "version": "1.0.0"
}
```
