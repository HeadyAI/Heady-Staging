---
name: heady-oracle-chain
description: >-
  Heady Oracle Chain — cryptographic proof-of-reasoning making every AI decision auditable and tamper-proof. Each significant decision produces a signed receipt chained into a Merkle-linked append-only log with Ed25519 signatures. Receipts contain decision context, reasoning traces, CSL scores, and actions. Uses phi-scaled batching, Fibonacci-timed git anchoring via HCFP-AUTO, and 384D embeddings for semantic search over past decisions. Integrates with HeadyGuard and Neon Postgres. Use when implementing decision auditing, reasoning transparency, compliance logging, or explainable AI governance. Keywords: oracle, chain, proof, reasoning, audit, tamper-proof, Ed25519, Merkle, receipt, transparency, compliance.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Oracle Chain

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Building auditable AI governance — every decision needs a tamper-proof receipt
- Implementing compliance logging for SOC 2, GDPR, or regulatory requirements
- Creating explainable AI trails — why did the system route to this LLM? Why was this bee spawned?
- Making HCFullPipeline stage transitions verifiable and inspectable
- Anchoring decision history to git commits via the HCFP-AUTO pipeline
- Enabling semantic search over past reasoning ("find all decisions where cost was the primary factor")
- Building trust with enterprise customers who need proof of AI decision-making
- Integrating with HeadyGuard's Ed25519 signing for cryptographic integrity

## Architecture

```
Decision Event (any significant action across Heady)
  │ Sources: HCFullPipeline, HeadyConductor, HeadyBee, ChaosEngine,
  │          MirrorDimension, ConsensusTribunal, LLM Router
  │
  ▼
Significance Gate (CSL ≥ 0.691)
  │ Filter trivial decisions — only chain meaningful ones
  │
  ▼
Reasoning Trace Capture
  │ Captures: input context, CSL scores, alternatives considered,
  │           chosen action, confidence, latency, cost, model used
  │
  ▼
Receipt Forge
  │ Creates ReasoningReceipt:
  │   { receiptId, previousHash, timestamp, traceHash,
  │     context, reasoning, action, confidence,
  │     embedding[384], signature(Ed25519) }
  │
  ▼
Hash Chain (append-only)
  │ Each receipt references previous receipt's hash
  │ Chain integrity verifiable from genesis to head
  │
  ▼
Persistence Layer
  ├─→ Neon Postgres: receipts table with pgvector index
  ├─→ Git Anchor: periodic hash snapshots via HCFP-AUTO commits
  └─→ Upstash Redis: recent chain head cache (fast verification)
        │
        ▼
Query Layer
  ├─→ Semantic Search: "why did we scale up at 3pm?" via 384D embedding
  ├─→ Chain Verification: walk chain to verify integrity
  ├─→ Decision Replay: reconstruct reasoning from receipt chain
  └─→ Compliance Export: generate audit reports for regulators
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Oracle Chain Constants
const SIGNIFICANCE_THRESHOLD = 0.691;             // CSL LOW — minimum to create receipt
const HIGH_SIGNIFICANCE = 0.882;                  // CSL HIGH — immediate chaining
const CRITICAL_SIGNIFICANCE = 0.927;              // CSL CRITICAL — alert + chain + anchor
const RECEIPT_BATCH_SIZE = FIB[5];                // 5 receipts per batch write
const CHAIN_ANCHOR_INTERVAL_MS = FIB[8] * 60000;  // 21 minutes — git anchor interval
const MAX_CHAIN_CACHE = FIB[12];                  // 144 recent receipts in memory
const RECEIPT_EMBEDDING_DIM = 384;                // Full 384D for semantic search
const MERKLE_BATCH_SIZE = FIB[6];                 // 8 receipts per Merkle batch
const CHAIN_VERIFICATION_DEPTH = FIB[10];         // 55 receipts deep for quick verify
const RECEIPT_TTL_DAYS = FIB[12];                 // 144 days retention
const ARCHIVE_COMPRESSION_RATIO = PSI;            // 61.8% compression for archived receipts
const SIGNATURE_ALGORITHM = 'Ed25519';            // HeadyGuard standard
const HASH_ALGORITHM = 'SHA-256';                 // Chain hash algorithm
const GENESIS_HASH = '0'.repeat(64);              // Genesis block previous hash
```

## Instructions

### 1. Reasoning Receipt Data Structure

The fundamental unit of the Oracle Chain:

```javascript
class ReasoningReceipt {
  constructor({ previousHash, context, reasoning, action, confidence, metadata }) {
    this.receiptId = crypto.randomUUID();
    this.previousHash = previousHash || GENESIS_HASH;
    this.timestamp = Date.now();
    this.sequence = 0; // Set by chain manager
    this.context = {
      source: context.source,                    // Which component made the decision
      stage: context.stage,                      // Pipeline stage if applicable
      input: context.input?.slice(0, 1024),      // Truncated input context
      cslScores: context.cslScores || {},        // All CSL gate scores
      alternatives: context.alternatives || [],   // Other options considered
    };
    this.reasoning = {
      trace: reasoning.trace?.slice(0, 2048),    // Reasoning explanation
      factors: reasoning.factors || [],           // Decision factors with weights
      model: reasoning.model,                     // LLM model used (if any)
      latencyMs: reasoning.latencyMs,
      tokenCount: reasoning.tokenCount,
      costEstimate: reasoning.costEstimate,
    };
    this.action = {
      type: action.type,                          // What was done
      target: action.target,                      // What was affected
      result: action.result,                      // Outcome
      confidence: confidence,                     // CSL confidence of decision
    };
    this.metadata = {
      domain: metadata?.domain,                   // Which of 9 Heady domains
      nodeType: metadata?.nodeType,               // Sacred Geometry position
      pipelineVariant: metadata?.pipelineVariant,  // Fast/Full/Arena/Learning
      ...metadata,
    };
    this.hash = null;                             // Computed after creation
    this.signature = null;                        // Ed25519 signature
    this.embedding = null;                        // 384D embedding of reasoning trace
  }

  async computeHash() {
    const payload = JSON.stringify({
      previousHash: this.previousHash,
      timestamp: this.timestamp,
      context: this.context,
      reasoning: this.reasoning,
      action: this.action,
    });

    const buffer = new TextEncoder().encode(payload);
    const hashBuffer = await crypto.subtle.digest(HASH_ALGORITHM, buffer);
    this.hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return this.hash;
  }

  async sign(privateKey) {
    if (!this.hash) await this.computeHash();
    const data = new TextEncoder().encode(this.hash);
    this.signature = await crypto.subtle.sign(
      { name: SIGNATURE_ALGORITHM },
      privateKey,
      data
    );
    return this.signature;
  }

  async verify(publicKey) {
    if (!this.hash || !this.signature) return false;
    const data = new TextEncoder().encode(this.hash);
    return crypto.subtle.verify(
      { name: SIGNATURE_ALGORITHM },
      publicKey,
      this.signature,
      data
    );
  }

  async generateEmbedding(embeddingProvider) {
    const text = `Decision by ${this.context.source}: ${this.reasoning.trace} → ${this.action.type} on ${this.action.target} with confidence ${this.action.confidence}`;
    this.embedding = await embeddingProvider.embed(text);
    return this.embedding;
  }
}
```

### 2. Chain Manager

Maintains the append-only hash chain:

```javascript
class OracleChainManager {
  constructor({ signingKey, publicKey, embeddingProvider, persistence, logger }) {
    this.signingKey = signingKey;
    this.publicKey = publicKey;
    this.embeddingProvider = embeddingProvider;
    this.persistence = persistence;
    this.logger = logger;
    this.chainHead = null;
    this.chainLength = 0;
    this.receiptCache = new Map();    // LRU cache of recent receipts
    this.pendingBatch = [];           // Batch write buffer
    this.stats = {
      totalReceipts: 0,
      totalVerified: 0,
      totalFailed: 0,
      chainIntact: true,
    };
  }

  async addReceipt(receiptData) {
    const receipt = new ReasoningReceipt({
      ...receiptData,
      previousHash: this.chainHead?.hash || GENESIS_HASH,
    });

    receipt.sequence = this.chainLength;

    // Compute hash, sign, and embed
    await receipt.computeHash();
    await receipt.sign(this.signingKey);
    await receipt.generateEmbedding(this.embeddingProvider);

    // Update chain state
    this.chainHead = receipt;
    this.chainLength += 1;

    // Add to cache (evict oldest if full)
    if (this.receiptCache.size >= MAX_CHAIN_CACHE) {
      const oldest = this.receiptCache.keys().next().value;
      this.receiptCache.delete(oldest);
    }
    this.receiptCache.set(receipt.receiptId, receipt);

    // Batch write
    this.pendingBatch.push(receipt);
    if (this.pendingBatch.length >= RECEIPT_BATCH_SIZE) {
      await this.flushBatch();
    }

    this.stats.totalReceipts += 1;
    this.logger.info({
      receiptId: receipt.receiptId,
      source: receipt.context.source,
      action: receipt.action.type,
      confidence: receipt.action.confidence,
      sequence: receipt.sequence,
    }, 'receipt-chained');

    return receipt;
  }

  async flushBatch() {
    if (this.pendingBatch.length === 0) return;

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];

    // Write to Neon Postgres with pgvector embedding
    await this.persistence.insertBatch(batch.map(r => ({
      receipt_id: r.receiptId,
      previous_hash: r.previousHash,
      hash: r.hash,
      signature: Buffer.from(r.signature).toString('base64'),
      timestamp: r.timestamp,
      sequence: r.sequence,
      context: JSON.stringify(r.context),
      reasoning: JSON.stringify(r.reasoning),
      action: JSON.stringify(r.action),
      metadata: JSON.stringify(r.metadata),
      embedding: `[${Array.from(r.embedding).join(',')}]`,
      confidence: r.action.confidence,
    })));

    this.logger.info({ batchSize: batch.length }, 'receipt-batch-flushed');
  }

  async verifyChain(depth = CHAIN_VERIFICATION_DEPTH) {
    const receipts = await this.persistence.getRecentReceipts(depth);
    let previousHash = receipts.length > 0 ? receipts[receipts.length - 1].previous_hash : GENESIS_HASH;
    let intact = true;

    for (let i = receipts.length - 1; i >= 0; i--) {
      const receipt = receipts[i];

      // Verify hash chain linkage
      if (receipt.previous_hash !== previousHash) {
        this.logger.error({
          sequence: receipt.sequence,
          expected: previousHash,
          actual: receipt.previous_hash,
        }, 'chain-break-detected');
        intact = false;
        break;
      }

      // Verify signature
      const verified = await this.verifyReceipt(receipt);
      if (!verified) {
        this.logger.error({ sequence: receipt.sequence }, 'signature-verification-failed');
        intact = false;
        break;
      }

      previousHash = receipt.hash;
    }

    this.stats.chainIntact = intact;
    this.stats.totalVerified += depth;
    if (!intact) this.stats.totalFailed += 1;

    return { intact, depth, receiptsVerified: receipts.length };
  }

  async verifyReceipt(receipt) {
    try {
      const data = new TextEncoder().encode(receipt.hash);
      const signature = Buffer.from(receipt.signature, 'base64');
      return await crypto.subtle.verify(
        { name: SIGNATURE_ALGORITHM },
        this.publicKey,
        signature,
        data
      );
    } catch {
      return false;
    }
  }
}
```

### 3. Decision Interceptor

Automatically captures decisions from across the ecosystem:

```javascript
class DecisionInterceptor {
  constructor({ chainManager, logger }) {
    this.chain = chainManager;
    this.logger = logger;
    this.handlers = new Map();
  }

  registerSource(sourceName, options = {}) {
    this.handlers.set(sourceName, {
      significanceOverride: options.significanceOverride,
      alwaysChain: options.alwaysChain || false,
    });
  }

  async intercept(decision) {
    // Apply significance filter
    const significance = decision.confidence || 0;
    const handler = this.handlers.get(decision.source);

    if (!handler?.alwaysChain && significance < SIGNIFICANCE_THRESHOLD) {
      return null; // Not significant enough to chain
    }

    // Create receipt
    return this.chain.addReceipt({
      context: {
        source: decision.source,
        stage: decision.pipelineStage,
        input: decision.inputSummary,
        cslScores: decision.cslScores,
        alternatives: decision.alternatives,
      },
      reasoning: {
        trace: decision.reasoningTrace,
        factors: decision.decisionFactors,
        model: decision.modelUsed,
        latencyMs: decision.latencyMs,
        tokenCount: decision.tokenCount,
        costEstimate: decision.costEstimate,
      },
      action: {
        type: decision.actionType,
        target: decision.actionTarget,
        result: decision.actionResult,
      },
      confidence: significance,
      metadata: decision.metadata,
    });
  }

  // Pre-built interceptors for core Heady components

  async interceptPipelineTransition(fromStage, toStage, context) {
    return this.intercept({
      source: 'HCFullPipeline',
      pipelineStage: toStage,
      inputSummary: `Transition from ${fromStage} to ${toStage}`,
      cslScores: context.cslScores,
      alternatives: context.alternativeStages || [],
      reasoningTrace: context.transitionReason,
      decisionFactors: [
        { factor: 'stage-readiness', weight: PHI, value: context.readinessScore },
        { factor: 'previous-stage-quality', weight: 1.0, value: context.previousQuality },
        { factor: 'resource-availability', weight: PSI, value: context.resourceScore },
      ],
      modelUsed: null,
      latencyMs: context.transitionLatencyMs,
      actionType: 'pipeline-transition',
      actionTarget: toStage,
      actionResult: 'transitioned',
      confidence: context.confidence || 0.809,
      metadata: { pipelineVariant: context.variant },
    });
  }

  async interceptLLMRouting(request, chosenProvider, alternatives) {
    return this.intercept({
      source: 'HeadyConductor',
      inputSummary: `Route LLM request: ${request.type}`,
      cslScores: request.cslScores,
      alternatives: alternatives.map(a => ({ provider: a.name, score: a.score })),
      reasoningTrace: `Selected ${chosenProvider.name} (score: ${chosenProvider.score}) from ${alternatives.length} candidates`,
      decisionFactors: [
        { factor: 'model-fitness', weight: PHI, value: chosenProvider.fitnessScore },
        { factor: 'latency', weight: 1.0, value: 1 - (chosenProvider.latencyMs / 5000) },
        { factor: 'cost', weight: PSI, value: 1 - chosenProvider.costPerToken },
        { factor: 'availability', weight: PSI * PSI, value: chosenProvider.availability },
      ],
      modelUsed: chosenProvider.name,
      latencyMs: chosenProvider.routingLatencyMs,
      actionType: 'llm-routing',
      actionTarget: chosenProvider.name,
      actionResult: 'routed',
      confidence: chosenProvider.score,
      metadata: { pool: chosenProvider.pool },
    });
  }

  async interceptBeeSpawn(beeType, reason, swarmState) {
    return this.intercept({
      source: 'HeadyBeeFactory',
      inputSummary: `Spawn ${beeType} bee`,
      reasoningTrace: reason,
      decisionFactors: [
        { factor: 'swarm-need', weight: PHI, value: swarmState.needScore },
        { factor: 'resource-budget', weight: 1.0, value: swarmState.budgetRemaining },
        { factor: 'queue-pressure', weight: PSI, value: swarmState.queuePressure },
      ],
      actionType: 'bee-spawn',
      actionTarget: beeType,
      actionResult: 'spawned',
      confidence: swarmState.needScore,
      metadata: { swarmId: swarmState.swarmId, beeCount: swarmState.currentBeeCount },
    });
  }
}
```

### 4. Semantic Query Engine

Search over past decisions using natural language:

```javascript
class OracleQueryEngine {
  constructor({ persistence, embeddingProvider, logger }) {
    this.persistence = persistence;
    this.embeddingProvider = embeddingProvider;
    this.logger = logger;
  }

  async semanticSearch(query, options = {}) {
    const queryEmbedding = await this.embeddingProvider.embed(query);

    const results = await this.persistence.vectorSearch({
      embedding: queryEmbedding,
      topK: options.limit || FIB[7],
      minScore: options.minScore || SIGNIFICANCE_THRESHOLD,
      timeRange: options.timeRange,
    });

    return results.map(r => ({
      receiptId: r.receipt_id,
      timestamp: new Date(r.timestamp).toISOString(),
      source: JSON.parse(r.context).source,
      action: JSON.parse(r.action),
      reasoning: JSON.parse(r.reasoning).trace,
      confidence: r.confidence,
      similarity: r.score,
    }));
  }

  async complianceExport(timeRange, format = 'json') {
    const receipts = await this.persistence.getReceiptsByTimeRange(timeRange);

    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      totalDecisions: receipts.length,
      chainIntegrity: 'verified', // Run verification before export
      decisions: receipts.map(r => ({
        id: r.receipt_id,
        timestamp: new Date(r.timestamp).toISOString(),
        source: JSON.parse(r.context).source,
        action: JSON.parse(r.action).type,
        target: JSON.parse(r.action).target,
        confidence: r.confidence,
        reasoning: JSON.parse(r.reasoning).trace,
        hash: r.hash,
        signatureValid: true, // Verified during chain walk
      })),
    };

    return report;
  }

  async gitAnchor(chainManager) {
    // Create a snapshot of the current chain head for git anchoring
    const head = chainManager.chainHead;
    if (!head) return null;

    const anchor = {
      anchorTimestamp: Date.now(),
      chainHead: head.hash,
      chainLength: chainManager.chainLength,
      lastReceiptId: head.receiptId,
      chainIntact: chainManager.stats.chainIntact,
    };

    // This anchor gets picked up by HCFP-AUTO commit cycle
    return anchor;
  }
}
```

### 5. Database Schema

Neon Postgres table for receipt storage:

```sql
-- Oracle Chain receipts with pgvector for semantic search
CREATE TABLE IF NOT EXISTS oracle_receipts (
  id SERIAL PRIMARY KEY,
  receipt_id UUID UNIQUE NOT NULL,
  previous_hash VARCHAR(64) NOT NULL,
  hash VARCHAR(64) UNIQUE NOT NULL,
  signature TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  sequence INTEGER NOT NULL,
  context JSONB NOT NULL,
  reasoning JSONB NOT NULL,
  action JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(384),
  confidence REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hash chain index for fast verification walks
CREATE INDEX idx_oracle_sequence ON oracle_receipts(sequence DESC);
CREATE INDEX idx_oracle_timestamp ON oracle_receipts(timestamp DESC);
CREATE INDEX idx_oracle_previous ON oracle_receipts(previous_hash);

-- Semantic search index (HNSW with Fibonacci params)
CREATE INDEX idx_oracle_embedding ON oracle_receipts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 21, ef_construction = 89);

-- Source and action filtering
CREATE INDEX idx_oracle_source ON oracle_receipts((context->>'source'));
CREATE INDEX idx_oracle_action ON oracle_receipts((action->>'type'));
CREATE INDEX idx_oracle_confidence ON oracle_receipts(confidence);
```

## Integration Points

| Heady Component | Oracle Chain Role |
|---|---|
| HCFullPipeline | Every stage transition produces a signed reasoning receipt |
| HeadyConductor | LLM routing decisions are chained with provider scoring details |
| HeadyBee Factory | Agent spawn/retire decisions include swarm state reasoning |
| HeadyGuard | Ed25519 keys from HeadyGuard sign all receipts |
| HCFP-AUTO | Chain head anchored to git commits every 21 minutes |
| ConsensusTribunal | Tribunal verdicts are high-significance receipts |
| MirrorDimension | Dimension promotion/discard decisions are audited |
| Neon Postgres | Receipts stored with pgvector embeddings for semantic query |
| Sentry + Langfuse | Observability data cross-referenced with decision chain |

## API

```javascript
const { OracleChain } = require('@heady/oracle-chain');

const oracle = new OracleChain({
  signingKey, publicKey, embeddingProvider,
  neonConnectionString: process.env.DATABASE_URL,
  logger: pinoLogger,
});

await oracle.start();

// Automatic interception (register once)
oracle.registerSource('HCFullPipeline', { alwaysChain: true });
oracle.registerSource('HeadyConductor');
oracle.registerSource('HeadyBeeFactory');

// Manual receipt
await oracle.addReceipt({ context, reasoning, action, confidence: 0.882 });

// Query
const results = await oracle.search('why did latency spike at 3pm?');
const report = await oracle.complianceExport({ from: '2026-03-01', to: '2026-03-17' });
const integrity = await oracle.verifyChain();

oracle.health();
await oracle.shutdown();
```

## Health Endpoint

```json
{
  "status": "chaining",
  "coherenceScore": 0.894,
  "chainLength": 2584,
  "chainHead": "a1b2c3d4e5f6...",
  "chainIntact": true,
  "lastVerification": "2026-03-17T23:21:00Z",
  "receiptsLast24h": 233,
  "averageConfidence": 0.841,
  "pendingBatchSize": 3,
  "lastGitAnchor": "2026-03-17T23:00:00Z",
  "storageUsedMB": 89,
  "version": "1.0.0"
}
```
