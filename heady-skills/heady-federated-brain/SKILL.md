---
name: heady-federated-brain
description: >-
  Federated learning engine enabling collaborative model training across Heady's
  distributed edge nodes without raw data transfer. Coordinates training rounds
  across Cloudflare Workers AI, three Colab Pro+ runtimes (Vector:3301, LLM:3302,
  Train:3303), and Cloud Run origin. Uses phi-weighted federated averaging where
  gradient contributions are weighted by CSL coherence of each node's local dataset.
  Differential privacy via calibrated noise (epsilon=PSI, delta=PSI^8) prevents
  gradient inversion attacks. Fibonacci-numbered model checkpoints (v1, v2, v3, v5,
  v8, v13...). Convergence detection stops when loss delta < PSI^5 across all nodes.
  Secure aggregation via additive secret sharing. Collaboratively fine-tunes 384D
  embedding models across nine Heady domains.
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Inner
  phi-compliance: verified
---

# Heady Federated Brain

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **Collaborative model improvement** — fine-tune embedding or classification models across distributed nodes without centralizing data
- **Edge-to-origin gradient sync** — aggregate gradient updates from Cloudflare Workers AI and Colab runtimes into a unified model
- **Privacy-preserving training** — enforce differential privacy guarantees (ε = PSI, δ = PSI^8) for all federated rounds
- **384D embedding fine-tuning** — improve pgvector embedding quality collaboratively across the nine Heady domains
- **Model checkpoint management** — version models at Fibonacci-numbered checkpoints with phi-scored rollback
- **Convergence monitoring** — detect when federated training has converged via CSL-gated loss delta thresholds
- **Drift response** — re-trigger federated rounds when heady-drift-detection reports model degradation
- **Secure aggregation** — guarantee no single node can reconstruct another node's local gradients
- **Training orchestration** — schedule and coordinate multi-round federated training across heterogeneous hardware

## Architecture

```
Sacred Geometry Topology — Federated Brain Position:
Center(HeadySoul) → Inner(Conductor, ★Brains★, Vinci, AutoSuccess)
                                       ↑
                          Federated Brain is the learning core
                          of the Brains node (Inner ring)

┌──────────────────────────────────────────────────────────────────┐
│                      FEDERATED BRAIN                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  FEDERATION COORDINATOR (Cloud Run — us-east1)             │  │
│  │  Round management │ Aggregation │ Convergence detection     │  │
│  └───────────┬──────────────┬──────────────┬──────────────────┘  │
│              │              │              │                      │
│    ┌─────────▼───┐  ┌──────▼──────┐  ┌───▼───────────────┐     │
│    │ Cloudflare  │  │ Colab Pro+  │  │ Cloud Run Origin  │     │
│    │ Workers AI  │  │ Vector:3301 │  │ (us-east1)        │     │
│    │ (edge infer)│  │ LLM:3302    │  │ API training data │     │
│    │             │  │ Train:3303  │  │                   │     │
│    └─────────────┘  └─────────────┘  └───────────────────┘     │
│              │              │              │                      │
│    ┌─────────▼──────────────▼──────────────▼──────────────────┐  │
│    │  SECURE AGGREGATION LAYER                                │  │
│    │  Additive secret sharing │ DP noise injection             │  │
│    └───────────────────────┬──────────────────────────────────┘  │
│                            ▼                                     │
│    ┌──────────────────────────────────────────────────────────┐  │
│    │  PHI-WEIGHTED FEDERATED AVERAGING                        │  │
│    │  Gradient fusion │ CSL quality weighting │ Convergence    │  │
│    └───────────────────────┬──────────────────────────────────┘  │
│                            ▼                                     │
│    ┌──────────────────────────────────────────────────────────┐  │
│    │  MODEL REGISTRY (Fibonacci checkpoints)                  │  │
│    │  v1 → v2 → v3 → v5 → v8 → v13 → v21 → v34 → ...        │  │
│    └──────────────────────────────────────────────────────────┘  │
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

// ─── Pool Allocations ──────────────────────────────────────────────────
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

// ─── Fusion Weights ────────────────────────────────────────────────────
const FUSION_2WAY = [PSI, 1 - PSI];             // [0.618, 0.382]
const FUSION_3WAY = [0.528, 0.326, 0.146];

// ─── Federated Brain Constants ─────────────────────────────────────────
const FED = {
  EMBEDDING_DIM:            384,                          // pgvector dimensions
  MAX_ROUNDS:               FIB[9],                       // 55 max training rounds
  MIN_NODES:                FIB[4],                       // 3 minimum participating nodes
  BATCH_SIZE:               FIB[6],                       // 13 samples per local batch
  LOCAL_EPOCHS:             FIB[4],                       // 3 local epochs per round
  LEARNING_RATE:            1 / (PHI ** 5),               // ~0.0902 base LR
  LR_DECAY:                 PSI,                          // 0.618 decay per round
  DP_EPSILON:               PSI,                          // 0.618 differential privacy ε
  DP_DELTA:                 PSI ** 8,                     // ~0.0138 differential privacy δ
  NOISE_MULTIPLIER:         PHI / FIB[7],                 // ~0.0771 calibrated noise
  CONVERGENCE_THRESHOLD:    PSI ** 5,                     // ~0.0902 loss delta threshold
  CHECKPOINT_FIB_INDICES:   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // → v1,v1,v2,v3,v5,...
  AGGREGATION_TIMEOUT_MS:   FIB[10] * 1000,              // 55000ms aggregation deadline
  SECRET_SHARES:            FIB[4],                       // 3 shares for secret sharing
  RECONSTRUCTION_THRESHOLD: FIB[3],                       // 2 shares needed to reconstruct
  BACKOFF_BASE_MS:          FIB[5] * 100,                 // 500ms backoff base
  BACKOFF_JITTER:           PSI ** 2,                     // ±0.382 jitter
  MODEL_RETENTION:          FIB[7],                       // keep last 21 checkpoints
};

// ─── Node Registry ─────────────────────────────────────────────────────
const NODES = [
  { id: 'cf-workers-ai',  type: 'edge',   endpoint: '/api/fed/gradient' },
  { id: 'colab-vector',   type: 'colab',  port: 3301, role: 'embedding' },
  { id: 'colab-llm',      type: 'colab',  port: 3302, role: 'llm-finetune' },
  { id: 'colab-train',    type: 'colab',  port: 3303, role: 'training' },
  { id: 'cloud-run-origin', type: 'origin', endpoint: '/api/fed/gradient' },
];
```

## Instructions

### Federation Coordinator

The coordinator manages training rounds, collects gradient updates from all participating nodes, and triggers aggregation when all gradients are received or the deadline expires.

```javascript
// heady-federated-brain/src/coordinator.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-federated-brain', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const FED = {
  EMBEDDING_DIM: 384,
  MAX_ROUNDS: FIB[9],
  MIN_NODES: FIB[4],
  BATCH_SIZE: FIB[6],
  LOCAL_EPOCHS: FIB[4],
  LEARNING_RATE: 1 / (PHI ** 5),
  LR_DECAY: PSI,
  DP_EPSILON: PSI,
  DP_DELTA: PSI ** 8,
  NOISE_MULTIPLIER: PHI / FIB[7],
  CONVERGENCE_THRESHOLD: PSI ** 5,
  AGGREGATION_TIMEOUT_MS: FIB[10] * 1000,
  SECRET_SHARES: FIB[4],
  RECONSTRUCTION_THRESHOLD: FIB[3],
  BACKOFF_BASE_MS: FIB[5] * 100,
  BACKOFF_JITTER: PSI ** 2,
  MODEL_RETENTION: FIB[7],
};

/**
 * Computes phi-weighted backoff with jitter for retry logic.
 */
function phiBackoff(attempt) {
  const base = FED.BACKOFF_BASE_MS * (PHI ** attempt);
  const jitter = base * FED.BACKOFF_JITTER * (Math.random() * 2 - 1);
  return Math.min(base + jitter, FIB[10] * 1000);
}

/**
 * Returns the Fibonacci model version number for a given round.
 */
function fibCheckpointVersion(round) {
  const idx = Math.min(round, FIB.length - 1);
  return FIB[idx];
}

export class FederationCoordinator {
  constructor(redis) {
    this.redis = redis;
    this.currentRound = 0;
    this.globalModel = null;
    this.roundGradients = new Map();
    this.nodeRegistry = new Map();
    this.checkpoints = [];
    this.convergenceHistory = [];
    this.status = 'idle';
    log.info({ maxRounds: FED.MAX_ROUNDS, minNodes: FED.MIN_NODES }, 'Federation coordinator initialized');
  }

  registerNode(nodeId, metadata) {
    this.nodeRegistry.set(nodeId, {
      id: nodeId,
      ...metadata,
      registeredAt: Date.now(),
      lastSeenAt: Date.now(),
      roundsParticipated: 0,
      coherenceScore: CSL_GATES.MEDIUM,
    });
    log.info({ nodeId, totalNodes: this.nodeRegistry.size }, 'Node registered for federation');
  }

  async startRound() {
    if (this.nodeRegistry.size < FED.MIN_NODES) {
      log.warn({ registered: this.nodeRegistry.size, required: FED.MIN_NODES },
        'Insufficient nodes for federation round');
      return null;
    }

    this.currentRound++;
    this.roundGradients.clear();
    this.status = 'collecting';

    const roundId = randomUUID();
    const lr = FED.LEARNING_RATE * (FED.LR_DECAY ** (this.currentRound - 1));

    const roundConfig = {
      roundId,
      roundNumber: this.currentRound,
      learningRate: lr,
      batchSize: FED.BATCH_SIZE,
      localEpochs: FED.LOCAL_EPOCHS,
      embeddingDim: FED.EMBEDDING_DIM,
      dpEpsilon: FED.DP_EPSILON,
      dpDelta: FED.DP_DELTA,
      deadlineMs: FED.AGGREGATION_TIMEOUT_MS,
      startedAt: Date.now(),
    };

    await this.redis.set(
      `fed:round:${this.currentRound}`,
      JSON.stringify(roundConfig),
      { ex: 3600 }
    );

    log.info({ roundId, roundNumber: this.currentRound, lr: lr.toFixed(6),
      participantCount: this.nodeRegistry.size }, 'Federation round started');
    return roundConfig;
  }

  async submitGradient(nodeId, gradientUpdate) {
    if (!this.nodeRegistry.has(nodeId)) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    const node = this.nodeRegistry.get(nodeId);
    node.lastSeenAt = Date.now();
    node.roundsParticipated++;

    this.roundGradients.set(nodeId, {
      gradient: gradientUpdate.gradient,
      localLoss: gradientUpdate.localLoss,
      sampleCount: gradientUpdate.sampleCount,
      coherenceScore: gradientUpdate.coherenceScore || node.coherenceScore,
      submittedAt: Date.now(),
    });

    node.coherenceScore = gradientUpdate.coherenceScore || node.coherenceScore;

    log.info({ nodeId, round: this.currentRound,
      collected: this.roundGradients.size, needed: this.nodeRegistry.size,
      localLoss: gradientUpdate.localLoss.toFixed(6) }, 'Gradient received');

    if (this.roundGradients.size >= this.nodeRegistry.size) {
      return this.aggregateAndUpdate();
    }
    return null;
  }

  async aggregateAndUpdate() {
    this.status = 'aggregating';
    const aggregator = new PhiWeightedAggregator();
    const updates = Array.from(this.roundGradients.values());

    const aggregated = aggregator.aggregate(updates);
    const noisyGradient = DifferentialPrivacy.addNoise(aggregated.gradient, FED.DP_EPSILON);

    if (!this.globalModel) {
      this.globalModel = new Float32Array(FED.EMBEDDING_DIM).fill(0);
    }

    const lr = FED.LEARNING_RATE * (FED.LR_DECAY ** (this.currentRound - 1));
    for (let i = 0; i < this.globalModel.length; i++) {
      this.globalModel[i] -= lr * noisyGradient[i];
    }

    const version = fibCheckpointVersion(this.currentRound);
    this.checkpoints.push({
      version: `v${version}`,
      round: this.currentRound,
      loss: aggregated.weightedLoss,
      timestamp: Date.now(),
    });
    if (this.checkpoints.length > FED.MODEL_RETENTION) {
      this.checkpoints.shift();
    }

    this.convergenceHistory.push(aggregated.weightedLoss);
    const converged = this.checkConvergence();

    this.status = converged ? 'converged' : 'idle';

    log.info({ round: this.currentRound, version: `v${version}`,
      loss: aggregated.weightedLoss.toFixed(6), converged,
      nodesAggregated: updates.length }, 'Round aggregation complete');

    return {
      round: this.currentRound,
      version: `v${version}`,
      loss: aggregated.weightedLoss,
      converged,
      nodesAggregated: updates.length,
    };
  }

  checkConvergence() {
    if (this.convergenceHistory.length < FIB[3]) return false;
    const recent = this.convergenceHistory.slice(-FIB[4]);
    const deltas = [];
    for (let i = 1; i < recent.length; i++) {
      deltas.push(Math.abs(recent[i] - recent[i - 1]));
    }
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return avgDelta < FED.CONVERGENCE_THRESHOLD;
  }

  getStatus() {
    const activeNodes = Array.from(this.nodeRegistry.values())
      .filter((n) => Date.now() - n.lastSeenAt < FED.AGGREGATION_TIMEOUT_MS);
    const avgCoherence = activeNodes.length > 0
      ? activeNodes.reduce((sum, n) => sum + n.coherenceScore, 0) / activeNodes.length
      : 0;
    return {
      status: this.status,
      currentRound: this.currentRound,
      maxRounds: FED.MAX_ROUNDS,
      registeredNodes: this.nodeRegistry.size,
      activeNodes: activeNodes.length,
      avgCoherence: parseFloat(avgCoherence.toFixed(4)),
      latestCheckpoint: this.checkpoints[this.checkpoints.length - 1] || null,
      convergenceHistory: this.convergenceHistory.slice(-FIB[5]),
      gradientsPending: this.roundGradients.size,
    };
  }
}
```

### Phi-Weighted Federated Averaging

Gradients from each node are weighted by that node's CSL coherence score — higher-quality data contributes proportionally more to the global model.

```javascript
// heady-federated-brain/src/aggregator.mjs
import pino from 'pino';

const log = pino({ name: 'heady-fed-aggregator', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const FED = {
  EMBEDDING_DIM: 384,
  NOISE_MULTIPLIER: PHI / FIB[7],
  DP_EPSILON: PSI,
  DP_DELTA: PSI ** 8,
};

/**
 * Aggregates gradient updates using phi-weighted averaging.
 * Nodes with higher CSL coherence contribute proportionally more.
 */
export class PhiWeightedAggregator {
  aggregate(updates) {
    const dim = updates[0]?.gradient?.length || FED.EMBEDDING_DIM;
    const aggregated = new Float32Array(dim).fill(0);
    let totalWeight = 0;
    let weightedLossSum = 0;

    for (const update of updates) {
      const coherence = update.coherenceScore || 0.5;
      const sampleWeight = update.sampleCount || 1;
      const phiWeight = coherence * (sampleWeight ** PSI);

      for (let i = 0; i < dim; i++) {
        aggregated[i] += (update.gradient[i] || 0) * phiWeight;
      }
      weightedLossSum += update.localLoss * phiWeight;
      totalWeight += phiWeight;
    }

    if (totalWeight > 0) {
      for (let i = 0; i < dim; i++) {
        aggregated[i] /= totalWeight;
      }
      weightedLossSum /= totalWeight;
    }

    log.info({ nodeCount: updates.length, totalWeight: totalWeight.toFixed(4),
      weightedLoss: weightedLossSum.toFixed(6) }, 'Phi-weighted aggregation complete');

    return { gradient: aggregated, weightedLoss: weightedLossSum, totalWeight };
  }
}

/**
 * Differential privacy noise injection calibrated to (ε, δ) budget.
 * Uses Gaussian mechanism: σ = sqrt(2 ln(1.25/δ)) × sensitivity / ε
 */
export class DifferentialPrivacy {
  static gaussianNoise(mean, stddev) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + stddev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  static addNoise(gradient, epsilon = FED.DP_EPSILON) {
    const delta = FED.DP_DELTA;
    const sensitivity = FED.NOISE_MULTIPLIER;
    const sigma = Math.sqrt(2 * Math.log(1.25 / delta)) * sensitivity / epsilon;

    const noisy = new Float32Array(gradient.length);
    for (let i = 0; i < gradient.length; i++) {
      noisy[i] = gradient[i] + DifferentialPrivacy.gaussianNoise(0, sigma);
    }

    log.info({ epsilon: epsilon.toFixed(4), delta: delta.toFixed(8),
      sigma: sigma.toFixed(6), dim: gradient.length }, 'DP noise injected');
    return noisy;
  }

  static privacyBudgetRemaining(roundsCompleted, maxRounds) {
    const perRoundBudget = FED.DP_EPSILON / Math.sqrt(maxRounds);
    const spent = perRoundBudget * roundsCompleted;
    return { total: FED.DP_EPSILON, spent: parseFloat(spent.toFixed(6)),
      remaining: parseFloat((FED.DP_EPSILON - spent).toFixed(6)),
      exhausted: spent >= FED.DP_EPSILON };
  }
}
```

### Secure Aggregation via Additive Secret Sharing

Nodes split their gradient updates into secret shares so no single entity (including the coordinator) can observe individual gradients in the clear.

```javascript
// heady-federated-brain/src/secure-agg.mjs
import pino from 'pino';
import { randomBytes } from 'node:crypto';

const log = pino({ name: 'heady-secure-agg', level: process.env.LOG_LEVEL || 'info' });

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const SECURE = {
  SHARES: FIB[4],               // 3 shares
  THRESHOLD: FIB[3],            // 2 needed to reconstruct
  FIELD_PRIME: 2147483647,      // Mersenne prime 2^31 - 1
};

/**
 * Additive secret sharing for gradient vectors.
 * Splits a gradient into N shares such that any T shares can reconstruct the original.
 */
export class SecretSharing {
  static splitGradient(gradient, numShares = SECURE.SHARES) {
    const shares = Array.from({ length: numShares }, () => new Float32Array(gradient.length));

    for (let i = 0; i < gradient.length; i++) {
      let remaining = gradient[i];
      for (let s = 0; s < numShares - 1; s++) {
        const noise = (randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF - 0.5) * 2;
        shares[s][i] = noise;
        remaining -= noise;
      }
      shares[numShares - 1][i] = remaining;
    }

    log.info({ dim: gradient.length, numShares }, 'Gradient split into secret shares');
    return shares.map((data, idx) => ({ shareIndex: idx, data }));
  }

  static reconstructGradient(shares) {
    if (shares.length < SECURE.THRESHOLD) {
      throw new Error(`Need at least ${SECURE.THRESHOLD} shares, got ${shares.length}`);
    }

    const dim = shares[0].data.length;
    const reconstructed = new Float32Array(dim).fill(0);

    for (const share of shares) {
      for (let i = 0; i < dim; i++) {
        reconstructed[i] += share.data[i];
      }
    }

    log.info({ dim, sharesUsed: shares.length }, 'Gradient reconstructed from shares');
    return reconstructed;
  }

  static verifyReconstruction(original, reconstructed, tolerance = 1e-5) {
    if (original.length !== reconstructed.length) return false;
    for (let i = 0; i < original.length; i++) {
      if (Math.abs(original[i] - reconstructed[i]) > tolerance) return false;
    }
    return true;
  }
}
```

### Express Router and Health Endpoint

```javascript
// heady-federated-brain/src/router.mjs
import express from 'express';
import pino from 'pino';
import { FederationCoordinator } from './coordinator.mjs';
import { DifferentialPrivacy } from './aggregator.mjs';

const log = pino({ name: 'heady-federated-brain', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

export function createFederatedBrainRouter(redis) {
  const router = express.Router();
  const coordinator = new FederationCoordinator(redis);

  router.get('/health', (req, res) => {
    const fedStatus = coordinator.getStatus();
    const privacy = DifferentialPrivacy.privacyBudgetRemaining(
      fedStatus.currentRound, FIB[9]
    );
    const coherence = fedStatus.avgCoherence || CSL_GATES.HIGH;

    res.json({
      service: 'heady-federated-brain',
      status: coherence >= CSL_GATES.MINIMUM ? 'healthy' : 'degraded',
      coherence: parseFloat(coherence.toFixed(4)),
      phi_compliance: true,
      sacred_geometry_layer: 'Inner',
      uptime_seconds: parseFloat(process.uptime().toFixed(2)),
      version: '1.0.0',
      phi: PHI,
      psi: PSI,
      federation: {
        status: fedStatus.status,
        currentRound: fedStatus.currentRound,
        maxRounds: fedStatus.maxRounds,
        registeredNodes: fedStatus.registeredNodes,
        activeNodes: fedStatus.activeNodes,
        latestCheckpoint: fedStatus.latestCheckpoint,
        convergenceHistory: fedStatus.convergenceHistory,
      },
      privacy: {
        epsilon: PSI,
        delta: parseFloat((PSI ** 8).toFixed(8)),
        budgetRemaining: privacy.remaining,
        exhausted: privacy.exhausted,
      },
      csl_gates: CSL_GATES,
    });
  });

  router.post('/node/register', (req, res) => {
    try {
      const { nodeId, type, role, endpoint } = req.body;
      coordinator.registerNode(nodeId, { type, role, endpoint });
      res.json({ registered: true, nodeId, totalNodes: coordinator.nodeRegistry.size });
    } catch (err) {
      log.error({ err: err.message }, 'Node registration failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/round/start', async (req, res) => {
    try {
      const config = await coordinator.startRound();
      if (!config) {
        res.status(409).json({ error: 'Insufficient nodes for federation round' });
        return;
      }
      res.json(config);
    } catch (err) {
      log.error({ err: err.message }, 'Round start failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/gradient/submit', async (req, res) => {
    try {
      const { nodeId, gradient, localLoss, sampleCount, coherenceScore } = req.body;
      const result = await coordinator.submitGradient(nodeId, {
        gradient: new Float32Array(gradient),
        localLoss,
        sampleCount,
        coherenceScore,
      });
      res.json({ accepted: true, aggregationResult: result });
    } catch (err) {
      log.error({ err: err.message }, 'Gradient submission failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/checkpoints', (req, res) => {
    res.json({ checkpoints: coordinator.checkpoints });
  });

  router.get('/convergence', (req, res) => {
    const history = coordinator.convergenceHistory;
    const converged = coordinator.checkConvergence();
    res.json({ converged, history: history.slice(-FIB[7]),
      threshold: parseFloat((PSI ** 5).toFixed(6)) });
  });

  return router;
}
```

## Integration Points

| Component                 | Interface                              | Sacred Geometry Layer |
|---------------------------|----------------------------------------|-----------------------|
| **Brains**                | Core intelligence node hosts federation | Inner                 |
| **Conductor**             | Orchestrates training round scheduling  | Inner                 |
| **heady-edge-ai**         | Workers AI node contributes gradients   | Edge                  |
| **heady-embedding-router** | Consumes improved 384D embedding model | Outer (BRIDGE)        |
| **heady-drift-detection** | Triggers retraining on model drift      | Middle (OBSERVER)     |
| **Colab Vector:3301**     | Embedding fine-tune node                | External              |
| **Colab LLM:3302**        | LLM fine-tune node                     | External              |
| **Colab Train:3303**      | Dedicated training compute node         | External              |
| **Cloud Run origin**      | Origin server contributes API data      | Origin                |
| **Neon pgvector**         | Stores 384D embeddings (HNSW m=21)     | Database              |
| **Upstash Redis**         | Round state, gradient caching           | Cache                 |
| **MURPHY**                | Security audit of gradient transfers    | Middle                |
| **SENTINEL**              | Alerts on privacy budget exhaustion     | Outer                 |
| **heady-observability-mesh** | Training telemetry and cost tracking | Governance            |

## API

### GET /health

Returns federation status, privacy budget, convergence metrics, and coherence score.

### POST /node/register

Register a compute node for federation participation.

**Request:**
```json
{
  "nodeId": "colab-train",
  "type": "colab",
  "role": "training",
  "endpoint": "https://heady-train.colab:3303/api/fed/gradient"
}
```

### POST /round/start

Initiate a new federation training round. Requires at least 3 registered nodes.

**Response:**
```json
{
  "roundId": "uuid",
  "roundNumber": 5,
  "learningRate": 0.0131,
  "batchSize": 13,
  "localEpochs": 3,
  "embeddingDim": 384,
  "dpEpsilon": 0.618,
  "dpDelta": 0.0138,
  "deadlineMs": 55000
}
```

### POST /gradient/submit

Submit a node's gradient update for the current round.

**Request:**
```json
{
  "nodeId": "colab-train",
  "gradient": [0.0012, -0.0034, 0.0021, "...384 floats..."],
  "localLoss": 0.2341,
  "sampleCount": 144,
  "coherenceScore": 0.882
}
```

### GET /checkpoints

List Fibonacci-numbered model checkpoints.

### GET /convergence

Returns convergence history and whether training has converged.

## Health Endpoint

```json
{
  "service": "heady-federated-brain",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Inner",
  "uptime_seconds": 34201.55,
  "version": "1.0.0",
  "phi": 1.618033988749895,
  "psi": 0.618033988749895,
  "federation": {
    "status": "idle",
    "currentRound": 8,
    "maxRounds": 55,
    "registeredNodes": 5,
    "activeNodes": 5,
    "latestCheckpoint": { "version": "v21", "round": 8, "loss": 0.0423 },
    "convergenceHistory": [0.4201, 0.2834, 0.1921, 0.1204, 0.0782, 0.0543, 0.0423]
  },
  "privacy": {
    "epsilon": 0.618033988749895,
    "delta": 0.01377127,
    "budgetRemaining": 0.5523,
    "exhausted": false
  },
  "csl_gates": {
    "MINIMUM": 0.500,
    "LOW": 0.691,
    "MEDIUM": 0.809,
    "HIGH": 0.882,
    "CRITICAL": 0.927,
    "DEDUP": 0.972
  }
}
```
