---
name: heady-mycelium-network
description: >-
  Heady Mycelium Network — underground knowledge propagation inspired by fungal mycelium. Enables disconnected Heady instances to share knowledge and embeddings without direct API connections. Uses phi-scaled gossip protocols, CSL-gated relevance filtering, Fibonacci-timed propagation pulses, and 384D embedding diffusion. Each node produces and consumes knowledge spores creating a resilient mesh. Use when implementing cross-instance knowledge sharing, federated learning, distributed memory sync, or gossip-based propagation. Keywords: mycelium, gossip protocol, knowledge propagation, federated learning, distributed memory, mesh network, spore, collective intelligence, decentralized sync.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Mycelium Network

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Synchronizing knowledge between disconnected Heady instances (edge, cloud, device)
- Building federated learning where nodes improve from each other without centralizing data
- Propagating embeddings, insights, or patterns across the 9-domain Heady ecosystem
- Creating a gossip protocol for decentralized state sharing between services
- Making isolated Colab runtimes, Cloudflare Workers, and Cloud Run services collectively intelligent
- Implementing resilient knowledge transfer that survives node failures and network partitions

## Architecture

```
Knowledge Spore (384D embedding + metadata envelope)
  │
  ▼
Local Spore Producer (each Heady node)
  │ Generates spores from locally-learned patterns
  │
  ▼
Mycelium Gossip Layer (φ-scaled propagation)
  ├─→ Fibonacci Pulse Timer (propagation every 5s, 8s, 13s cycles)
  ├─→ Neighbor Selection (φ-fanout: each node talks to FIB[4]=3 neighbors)
  └─→ Spore Envelope: { embedding[384], origin, ttl, generation, noveltyHash }
        │
        ▼
  CSL Relevance Gate (cosine ≥ 0.691 to accept)
        │
  ┌─────┴─────┐
  │            │
  ▼            ▼
Accept &     Drop &
Integrate    Log rejection
  │
  ▼
Local Spore Consumer
  ├─→ Merge into local vector memory
  ├─→ Update local models/weights
  └─→ Re-propagate to neighbors (TTL - 1)
        │
        ▼
  Propagation Tracker
  ├─→ Anti-loop: SHA-256 spore ID deduplication
  ├─→ Decay: TTL starts at FIB[6]=8, decrements each hop
  └─→ Metrics: propagation depth, acceptance rate, network reach
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Mycelium Network Constants
const GOSSIP_FANOUT = FIB[4];                    // 3 — each node gossips to 3 neighbors
const PROPAGATION_INTERVALS_MS = [               // Fibonacci-timed pulses
  FIB[5] * 1000,                                 // 5000ms
  FIB[6] * 1000,                                 // 8000ms
  FIB[7] * 1000,                                 // 13000ms
];
const SPORE_TTL_INITIAL = FIB[6];                // 8 hops maximum
const SPORE_RELEVANCE_GATE = 0.691;              // CSL LOW — minimum relevance to accept
const SPORE_NOVELTY_GATE = 0.809;                // CSL MEDIUM — must add new information
const SPORE_DEDUP_THRESHOLD = 0.972;             // CSL DEDUP — reject near-duplicates
const MAX_SPORE_CACHE = FIB[10];                 // 55 spores in local buffer
const NETWORK_PARTITION_TIMEOUT_MS = FIB[8] * 1000; // 21s — declare neighbor dead
const REJOIN_BACKOFF_BASE_MS = FIB[5] * 100;     // 500ms base, φ-exponential backoff
const EMBEDDING_MERGE_WEIGHT_LOCAL = PSI;         // 0.618 weight for local knowledge
const EMBEDDING_MERGE_WEIGHT_REMOTE = 1 - PSI;   // 0.382 weight for incoming spores
const MAX_NEIGHBORS = FIB[7];                     // 13 maximum neighbor connections
const SPORE_SIZE_LIMIT_BYTES = FIB[12] * FIB[8]; // 144 × 21 = 3024 bytes per spore
```

## Instructions

### 1. Spore Data Structure

Define the knowledge unit that travels through the network:

```javascript
class KnowledgeSpore {
  constructor({ embedding, content, origin, metadata }) {
    this.id = this.generateSporeId(embedding);
    this.embedding = new Float32Array(embedding);  // 384D vector
    this.content = content;                         // Semantic label or summary
    this.origin = origin;                           // Originating node ID
    this.generation = 0;                            // How many hops from origin
    this.ttl = SPORE_TTL_INITIAL;                   // Remaining hops
    this.createdAt = Date.now();
    this.metadata = {
      domain: metadata?.domain || 'unknown',        // Which of 9 domains
      nodeType: metadata?.nodeType || 'generic',    // Sacred Geometry position
      confidence: metadata?.confidence || 0.809,    // CSL confidence of source
      ...metadata,
    };
  }

  generateSporeId(embedding) {
    // Deterministic hash from embedding content
    const buffer = new Uint8Array(embedding.buffer);
    return crypto.subtle.digest('SHA-256', buffer).then(
      hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    );
  }

  hop() {
    this.generation += 1;
    this.ttl -= 1;
    return this.ttl > 0;
  }

  isAlive() {
    return this.ttl > 0;
  }
}
```

### 2. Neighbor Management

Track and maintain connections to nearby nodes:

```javascript
class NeighborRegistry {
  constructor() {
    this.neighbors = new Map(); // nodeId → { endpoint, lastSeen, reliability }
    this.deadPool = new Map();  // Nodes that have been unreachable
  }

  addNeighbor(nodeId, endpoint) {
    if (this.neighbors.size >= MAX_NEIGHBORS) {
      this.evictLeastReliable();
    }
    this.neighbors.set(nodeId, {
      endpoint,
      lastSeen: Date.now(),
      reliability: PSI,          // Start at 0.618 — must prove themselves
      sporesAccepted: 0,
      sporesRejected: 0,
    });
  }

  selectGossipTargets() {
    const alive = [...this.neighbors.entries()]
      .filter(([_, n]) => Date.now() - n.lastSeen < NETWORK_PARTITION_TIMEOUT_MS)
      .sort((a, b) => b[1].reliability - a[1].reliability);

    return alive.slice(0, GOSSIP_FANOUT).map(([id, n]) => ({ id, ...n }));
  }

  recordResponse(nodeId, accepted) {
    const neighbor = this.neighbors.get(nodeId);
    if (!neighbor) return;
    neighbor.lastSeen = Date.now();
    if (accepted) {
      neighbor.sporesAccepted += 1;
      neighbor.reliability = Math.min(1, neighbor.reliability + (1 - neighbor.reliability) * PSI * PSI);
    } else {
      neighbor.sporesRejected += 1;
      neighbor.reliability *= PSI; // Decay reliability on rejection
    }
  }

  evictLeastReliable() {
    let worst = null;
    let worstScore = Infinity;
    for (const [id, n] of this.neighbors) {
      if (n.reliability < worstScore) {
        worst = id;
        worstScore = n.reliability;
      }
    }
    if (worst) {
      this.deadPool.set(worst, this.neighbors.get(worst));
      this.neighbors.delete(worst);
    }
  }
}
```

### 3. Gossip Engine

The core propagation mechanism:

```javascript
class MyceliumGossipEngine {
  constructor({ nodeId, vectorMemory, neighborRegistry, embeddingProvider, logger }) {
    this.nodeId = nodeId;
    this.vectorMemory = vectorMemory;
    this.neighbors = neighborRegistry;
    this.embeddingProvider = embeddingProvider;
    this.logger = logger;
    this.sporeCache = new Map();             // Recent spores for dedup
    this.pulseIndex = 0;
    this.propagationTimer = null;
    this.stats = {
      sporesSent: 0,
      sporesReceived: 0,
      sporesAccepted: 0,
      sporesRejected: 0,
      sporesDeduplicated: 0,
    };
  }

  startPropagation() {
    const interval = PROPAGATION_INTERVALS_MS[this.pulseIndex % PROPAGATION_INTERVALS_MS.length];
    this.propagationTimer = setInterval(() => this.pulse(), interval);
    this.pulseIndex += 1;
  }

  async pulse() {
    // Gather locally-generated knowledge to share
    const localSpores = await this.harvestLocalKnowledge();
    const targets = this.neighbors.selectGossipTargets();

    for (const target of targets) {
      for (const spore of localSpores) {
        try {
          const response = await this.sendSpore(target, spore);
          this.neighbors.recordResponse(target.id, response.accepted);
          this.stats.sporesSent += 1;
        } catch (err) {
          this.logger.warn({ targetId: target.id, error: err.message }, 'spore-send-failed');
          this.neighbors.recordResponse(target.id, false);
        }
      }
    }
  }

  async receiveSpore(spore) {
    this.stats.sporesReceived += 1;

    // Deduplication check
    if (this.sporeCache.has(spore.id)) {
      this.stats.sporesDeduplicated += 1;
      return { accepted: false, reason: 'duplicate' };
    }

    // Relevance gate — is this spore useful to us?
    const localContext = await this.vectorMemory.search(spore.embedding, { topK: FIB[4] });
    const maxSimilarity = localContext.length > 0
      ? Math.max(...localContext.map(r => r.score))
      : 0;

    if (maxSimilarity < SPORE_RELEVANCE_GATE) {
      this.stats.sporesRejected += 1;
      return { accepted: false, reason: 'irrelevant' };
    }

    // Novelty gate — does this add new information?
    if (maxSimilarity > SPORE_DEDUP_THRESHOLD) {
      this.stats.sporesDeduplicated += 1;
      return { accepted: false, reason: 'already-known' };
    }

    // Accept and integrate
    await this.integrateSpore(spore);
    this.sporeCache.set(spore.id, Date.now());
    this.stats.sporesAccepted += 1;

    // Re-propagate if TTL allows
    if (spore.hop()) {
      this.requeueForPropagation(spore);
    }

    return { accepted: true };
  }

  async integrateSpore(spore) {
    // Merge remote knowledge with local memory using φ-weighted blending
    const localNearest = await this.vectorMemory.search(spore.embedding, { topK: 1 });
    if (localNearest.length > 0 && localNearest[0].score > SPORE_RELEVANCE_GATE) {
      // Blend: local gets 61.8% weight, remote 38.2%
      const blended = new Float32Array(384);
      for (let d = 0; d < 384; d++) {
        blended[d] = localNearest[0].embedding[d] * EMBEDDING_MERGE_WEIGHT_LOCAL
          + spore.embedding[d] * EMBEDDING_MERGE_WEIGHT_REMOTE;
      }
      await this.vectorMemory.update(localNearest[0].id, { embedding: blended });
    } else {
      // New knowledge — store directly
      await this.vectorMemory.store({
        embedding: spore.embedding,
        content: spore.content,
        metadata: { ...spore.metadata, source: 'mycelium', origin: spore.origin },
      });
    }
  }

  async harvestLocalKnowledge() {
    // Find recently-created or recently-strengthened local memories
    const recent = await this.vectorMemory.scan({
      limit: FIB[5],
      sortBy: 'updatedAt',
      order: 'desc',
    });

    return recent.map(memory => new KnowledgeSpore({
      embedding: memory.embedding,
      content: memory.content?.slice(0, 256),
      origin: this.nodeId,
      metadata: {
        domain: memory.metadata?.domain,
        nodeType: memory.metadata?.nodeType,
        confidence: memory.metadata?.coherenceScore || 0.809,
      },
    }));
  }

  async sendSpore(target, spore) {
    const response = await fetch(`${target.endpoint}/mycelium/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spore }),
    });
    return response.json();
  }

  requeueForPropagation(spore) {
    // Add to next pulse batch
    this.sporeCache.set(`requeue:${spore.id}`, spore);
  }

  stopPropagation() {
    if (this.propagationTimer) {
      clearInterval(this.propagationTimer);
      this.propagationTimer = null;
    }
  }
}
```

### 4. Network Topology Management

Self-organizing mesh that discovers and maintains connections:

```javascript
class MyceliumTopologyManager {
  constructor({ nodeId, discoveryEndpoint, neighborRegistry, logger }) {
    this.nodeId = nodeId;
    this.discoveryEndpoint = discoveryEndpoint;
    this.neighbors = neighborRegistry;
    this.logger = logger;
    this.rejoinAttempts = new Map(); // nodeId → attempt count
  }

  async discoverPeers() {
    try {
      const response = await fetch(`${this.discoveryEndpoint}/mycelium/peers`);
      const peers = await response.json();

      for (const peer of peers) {
        if (peer.id !== this.nodeId && !this.neighbors.neighbors.has(peer.id)) {
          await this.handshake(peer);
        }
      }
    } catch (err) {
      this.logger.warn({ error: err.message }, 'peer-discovery-failed');
    }
  }

  async handshake(peer) {
    try {
      const response = await fetch(`${peer.endpoint}/mycelium/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: this.nodeId, capabilities: this.getCapabilities() }),
      });
      const result = await response.json();
      if (result.accepted) {
        this.neighbors.addNeighbor(peer.id, peer.endpoint);
        this.logger.info({ peerId: peer.id }, 'mycelium-neighbor-added');
      }
    } catch (err) {
      this.logger.warn({ peerId: peer.id, error: err.message }, 'handshake-failed');
    }
  }

  async rejoinDeadNeighbor(nodeId) {
    const attempts = this.rejoinAttempts.get(nodeId) || 0;
    const backoff = REJOIN_BACKOFF_BASE_MS * Math.pow(PHI, attempts);
    await new Promise(resolve => setTimeout(resolve, backoff));
    this.rejoinAttempts.set(nodeId, attempts + 1);

    const dead = this.neighbors.deadPool.get(nodeId);
    if (dead) {
      await this.handshake({ id: nodeId, endpoint: dead.endpoint });
    }
  }

  getCapabilities() {
    return {
      domains: ['headyme.com', 'headysystems.com'],
      embeddingDim: 384,
      maxSporeCache: MAX_SPORE_CACHE,
      gossipFanout: GOSSIP_FANOUT,
    };
  }
}
```

## Integration Points

| Heady Component | Mycelium Role |
|---|---|
| HeadySoul | Mycelium enriches the soul's knowledge with cross-instance wisdom |
| DreamEngine | Dream insights become high-priority spores for propagation |
| Cloudflare Workers | Edge workers form the fastest mycelium pathways |
| Colab Runtimes | Vector/LLM/Train runtimes exchange learned patterns |
| HeadyBuddy | Device-local knowledge propagates to cloud and back |
| SwarmEvolution | Evolved agent populations share genetic improvements via spores |
| WisdomStore | Cross-instance wisdom crystallizes into shared WisdomStore entries |

## API

```javascript
const { MyceliumNetwork } = require('@heady/mycelium-network');

const network = new MyceliumNetwork({
  nodeId: 'heady-cloud-run-01',
  vectorMemory,
  embeddingProvider,
  discoveryEndpoint: process.env.MYCELIUM_DISCOVERY_URL,
  logger: pinoLogger,
});

await network.start();              // Begin gossip cycles
await network.injectSpore(spore);   // Manually inject knowledge
const stats = network.getStats();   // Propagation metrics

network.health();
await network.shutdown();
```

## Health Endpoint

```json
{
  "status": "propagating",
  "coherenceScore": 0.854,
  "activeNeighbors": 8,
  "deadNeighbors": 2,
  "sporesSent": 610,
  "sporesReceived": 987,
  "sporesAccepted": 377,
  "sporesRejected": 233,
  "sporesDeduplicated": 144,
  "networkReach": 13,
  "currentPulseInterval": 8000,
  "version": "1.0.0"
}
```
