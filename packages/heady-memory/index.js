// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: packages/heady-memory/index.js                            ║
// ║  LAYER: packages                                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HeadyMemory — 3D Latent Space Vector Memory
 *
 * 3-tier cognitive memory architecture:
 *   T0: Working Memory  — in-memory Map, session-bound, fib(8)=21 capsule cap
 *   T1: Short-Term       — pgvector HNSW, φ⁸≈47h TTL, consolidation buffer
 *   T2: Long-Term        — pgvector partitioned (Hot/Warm/Cold/Archive), permanent
 *
 * All constants derive from φ-mathematics — zero magic numbers.
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════════
// φ-Constants
// ═══════════════════════════════════════════════════════════════════

const PHI = 1.618034;
const PSI = 0.618034; // 1/φ
const PSI2 = PSI * PSI; // ψ² ≈ 0.382
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

const EMBEDDING_DIM = 1536;
const T0_CAPSULE_CAP = FIB[7]; // fib(8) = 21
const T1_CAPACITY = FIB[11] * 1000; // fib(12) = 144K vectors
const T1_TTL_MS = Math.pow(PHI, 8) * 3600 * 1000; // φ⁸ ≈ 47 hours
const T1_EXTENSION_MS = Math.pow(PHI, 4) * 3600 * 1000; // φ⁴ ≈ 6.85 hours
const CONSOLIDATION_PROMOTE = PSI; // ≥ 0.618 → promote to T2
const CONSOLIDATION_EXPIRE = PSI2; // < 0.382 → allow to expire

// Consolidation weights (φ-derived, sum = 1.0)
const SIGMA = PHI + 1.0 + PSI + PSI2; // ≈ 3.618
const W_ACCESS = PHI / SIGMA;          // 0.447
const W_REINFORCEMENT = 1.0 / SIGMA;   // 0.276
const W_IMPORTANCE = PSI / SIGMA;       // 0.171
const W_SIMILARITY = PSI2 / SIGMA;      // 0.106

// Decay rates per cognitive sub-space
const DECAY_SEMANTIC = Math.pow(PSI, 4);  // ≈ 0.146 — very slow
const DECAY_EPISODIC = PSI2;              // ≈ 0.382 — moderate
const DECAY_PROCEDURAL = 0;               // none — write-once-update-only

// ═══════════════════════════════════════════════════════════════════
// T0: Working Memory
// ═══════════════════════════════════════════════════════════════════

class WorkingMemory {
  constructor() {
    this.capsules = new Map();
  }

  /**
   * Store a context capsule in working memory.
   * @param {string} id - Capsule ID
   * @param {Object} capsule - { taskVector, activeBees, pipelineStage, driftWindow, confidence, autoContextPayload }
   */
  store(id, capsule) {
    capsule._accessCount = (capsule._accessCount || 0) + 1;
    capsule._lastAccess = Date.now();
    capsule._createdAt = capsule._createdAt || Date.now();
    this.capsules.set(id, capsule);

    // Evict if over capacity
    if (this.capsules.size > T0_CAPSULE_CAP) {
      this._evict();
    }

    return capsule;
  }

  get(id) {
    const capsule = this.capsules.get(id);
    if (capsule) {
      capsule._accessCount++;
      capsule._lastAccess = Date.now();
    }
    return capsule || null;
  }

  delete(id) {
    return this.capsules.delete(id);
  }

  list() {
    return Array.from(this.capsules.entries()).map(([id, c]) => ({
      id,
      pipelineStage: c.pipelineStage,
      confidence: c.confidence,
      accessCount: c._accessCount,
      age: Date.now() - c._createdAt,
    }));
  }

  get size() { return this.capsules.size; }

  /**
   * φ-weighted eviction: remove capsule with lowest eviction score.
   * score = accessFreq × recency × cslRelevance / φ
   */
  _evict() {
    let lowestId = null;
    let lowestScore = Infinity;

    for (const [id, c] of this.capsules) {
      const recency = Math.exp(-PSI * (Date.now() - c._lastAccess) / 3600000);
      const cslRelevance = c.confidence || PSI;
      const score = (c._accessCount * recency * cslRelevance) / PHI;

      if (score < lowestScore) {
        lowestScore = score;
        lowestId = id;
      }
    }

    if (lowestId) {
      const evicted = this.capsules.get(lowestId);
      this.capsules.delete(lowestId);
      return { evictedId: lowestId, capsule: evicted };
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// T1: Short-Term Memory
// ═══════════════════════════════════════════════════════════════════

class ShortTermMemory {
  constructor() {
    this.vectors = new Map(); // id → { embedding, content, domain, importance, accessCount, createdAt, expiresAt, consolidated }
    this.contentIndex = new Map(); // contentHash → id (dedup)
  }

  /**
   * Store a memory vector in T1.
   * @param {Object} entry - { embedding, content, domain, sourceNode, importance, metadata }
   * @returns {Object} stored entry with id
   */
  store(entry) {
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(entry.content)).digest('hex');

    // Dedup
    if (this.contentIndex.has(contentHash)) {
      const existingId = this.contentIndex.get(contentHash);
      const existing = this.vectors.get(existingId);
      if (existing) {
        existing.accessCount++;
        existing.importance = Math.min(1.0, existing.importance + PSI2);
        return existing;
      }
    }

    const id = crypto.randomUUID();
    const record = {
      id,
      embedding: entry.embedding || new Float32Array(EMBEDDING_DIM),
      contentHash,
      content: entry.content,
      domain: entry.domain || 'general',
      sourceNode: entry.sourceNode || 'unknown',
      importance: entry.importance || PSI, // ψ-initialized
      accessCount: 0,
      lastAccessedAt: Date.now(),
      createdAt: Date.now(),
      expiresAt: Date.now() + T1_TTL_MS,
      consolidated: false,
      metadata: entry.metadata || {},
    };

    this.vectors.set(id, record);
    this.contentIndex.set(contentHash, id);

    // Enforce capacity
    if (this.vectors.size > T1_CAPACITY) {
      this._evictOldest();
    }

    return record;
  }

  /**
   * Semantic search — cosine similarity against all T1 vectors.
   * In production, this would use pgvector HNSW. For in-memory operation,
   * we do brute-force cosine similarity.
   */
  search(queryEmbedding, topK = 5, minScore = PSI2) {
    const results = [];

    for (const [id, record] of this.vectors) {
      if (record.consolidated) continue;
      const score = this._cosineSimilarity(queryEmbedding, record.embedding);
      if (score >= minScore) {
        results.push({ id, score, record });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK).map(r => {
      r.record.accessCount++;
      r.record.lastAccessedAt = Date.now();
      return { id: r.id, score: r.score, content: r.record.content, domain: r.record.domain };
    });
  }

  get(id) {
    const record = this.vectors.get(id);
    if (record) {
      record.accessCount++;
      record.lastAccessedAt = Date.now();
    }
    return record;
  }

  delete(id) {
    const record = this.vectors.get(id);
    if (record) {
      this.contentIndex.delete(record.contentHash);
      this.vectors.delete(id);
      return true;
    }
    return false;
  }

  get size() { return this.vectors.size; }

  /**
   * Get all memories that need consolidation evaluation (near TTL expiry).
   */
  getConsolidationCandidates() {
    const now = Date.now();
    const window = T1_EXTENSION_MS; // evaluate within one extension window of expiry
    const candidates = [];

    for (const [id, record] of this.vectors) {
      if (!record.consolidated && (record.expiresAt - now) < window) {
        candidates.push(record);
      }
    }

    return candidates;
  }

  /**
   * Compute consolidation score for a memory.
   * C(m) = wa×accessFreq + wr×reinforcement + wi×importance + ws×similarity
   */
  consolidationScore(record, existingT2Similarity = 0) {
    const maxAccess = Math.max(1, ...Array.from(this.vectors.values()).map(v => v.accessCount));
    const accessFreq = record.accessCount / maxAccess;
    const reinforcement = record.accessCount > 1 ? 1.0 : 0.0;

    return (
      W_ACCESS * accessFreq +
      W_REINFORCEMENT * reinforcement +
      W_IMPORTANCE * record.importance +
      W_SIMILARITY * existingT2Similarity
    );
  }

  _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  _evictOldest() {
    let oldestId = null;
    let oldestTime = Infinity;
    for (const [id, record] of this.vectors) {
      if (record.createdAt < oldestTime) {
        oldestTime = record.createdAt;
        oldestId = id;
      }
    }
    if (oldestId) this.delete(oldestId);
  }
}

// ═══════════════════════════════════════════════════════════════════
// T2: Long-Term Memory
// ═══════════════════════════════════════════════════════════════════

class LongTermMemory {
  constructor() {
    // Three cognitive sub-spaces
    this.semantic = new Map();   // facts, knowledge, learned patterns
    this.episodic = new Map();   // specific task executions, conversations
    this.procedural = new Map(); // how-to configs, optimal parameters per domain
  }

  /**
   * Store a memory in the appropriate sub-space.
   * @param {string} subspace - 'semantic' | 'episodic' | 'procedural'
   * @param {Object} entry
   */
  store(subspace, entry) {
    const id = entry.id || crypto.randomUUID();
    const store = this[subspace];
    if (!store) throw new Error(`Unknown subspace: ${subspace}`);

    const decayRate = subspace === 'semantic' ? DECAY_SEMANTIC
      : subspace === 'episodic' ? DECAY_EPISODIC
      : DECAY_PROCEDURAL;

    const record = {
      id,
      embedding: entry.embedding || new Float32Array(EMBEDDING_DIM),
      content: entry.content,
      domain: entry.domain || 'general',
      importance: entry.importance || PSI,
      accessCount: 0,
      decayRate,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      epoch: this._currentEpoch(),
      partition: 'hot',
      metadata: entry.metadata || {},
    };

    store.set(id, record);
    return record;
  }

  /**
   * Search across all sub-spaces or a specific one.
   */
  search(queryEmbedding, topK = 5, subspace = null) {
    const stores = subspace ? [this[subspace]] : [this.semantic, this.episodic, this.procedural];
    const results = [];

    for (const store of stores) {
      if (!store) continue;
      for (const [id, record] of store) {
        const score = this._cosineSimilarity(queryEmbedding, record.embedding);
        // Apply importance-modulated decay
        const age = (Date.now() - record.createdAt) / (3600000 * 24); // days
        const decayFactor = Math.exp(-record.decayRate * age);
        const adjustedScore = score * decayFactor * (1 + record.importance * PSI);

        if (adjustedScore > PSI2) {
          results.push({ id, score: adjustedScore, record });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK).map(r => {
      r.record.accessCount++;
      r.record.lastAccessedAt = Date.now();
      // Reinforce importance on access: boost by ψ²
      r.record.importance = Math.min(1.0, r.record.importance + PSI2);
      return {
        id: r.id,
        score: r.score,
        content: r.record.content,
        domain: r.record.domain,
        subspace: this._subspaceOf(r.id),
        partition: r.record.partition,
      };
    });
  }

  /**
   * Get or update procedural memory by domain key (exact match).
   */
  getProcedural(domain) {
    for (const [id, record] of this.procedural) {
      if (record.domain === domain) return record;
    }
    return null;
  }

  /**
   * Get partition stats.
   */
  stats() {
    return {
      semantic: this.semantic.size,
      episodic: this.episodic.size,
      procedural: this.procedural.size,
      total: this.semantic.size + this.episodic.size + this.procedural.size,
    };
  }

  /**
   * Run partition transitions based on age.
   */
  partitionSweep() {
    const now = Date.now();
    const dayMs = 86400000;
    let transitions = 0;

    for (const store of [this.semantic, this.episodic]) {
      for (const [id, record] of store) {
        const ageDays = (now - record.createdAt) / dayMs;
        let newPartition = 'hot';
        if (ageDays > FIB[11]) newPartition = 'archive'; // 144+ days
        else if (ageDays > FIB[9]) newPartition = 'cold'; // 55+ days
        else if (ageDays > FIB[7]) newPartition = 'warm'; // 21+ days

        if (newPartition !== record.partition) {
          record.partition = newPartition;
          transitions++;
        }
      }
    }

    return { transitions };
  }

  _currentEpoch() {
    return Math.floor(Date.now() / (FIB[7] * 86400000)); // 21-day epochs
  }

  _subspaceOf(id) {
    if (this.semantic.has(id)) return 'semantic';
    if (this.episodic.has(id)) return 'episodic';
    if (this.procedural.has(id)) return 'procedural';
    return 'unknown';
  }

  _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}

// ═══════════════════════════════════════════════════════════════════
// HeadyMemory — Unified 3-Tier Interface
// ═══════════════════════════════════════════════════════════════════

class HeadyMemory extends EventEmitter {
  constructor() {
    super();
    this.t0 = new WorkingMemory();
    this.t1 = new ShortTermMemory();
    this.t2 = new LongTermMemory();
    this.consolidationTimer = null;
  }

  /**
   * Store in the appropriate tier.
   */
  store(tier, entry) {
    switch (tier) {
      case 't0': return this.t0.store(entry.id || crypto.randomUUID(), entry);
      case 't1': return this.t1.store(entry);
      case 't2': return this.t2.store(entry.subspace || 'episodic', entry);
      default: throw new Error(`Unknown tier: ${tier}`);
    }
  }

  /**
   * Search across tiers: T0 (exact) → T1 (semantic) → T2 (semantic + decay).
   */
  search(queryEmbedding, topK = 5) {
    const t1Results = this.t1.search(queryEmbedding, topK);
    const t2Results = this.t2.search(queryEmbedding, topK);

    // Merge and re-rank
    const all = [
      ...t1Results.map(r => ({ ...r, tier: 't1' })),
      ...t2Results.map(r => ({ ...r, tier: 't2' })),
    ];
    all.sort((a, b) => b.score - a.score);
    return all.slice(0, topK);
  }

  /**
   * Run the T1→T2 consolidation sweep.
   */
  consolidate() {
    const candidates = this.t1.getConsolidationCandidates();
    let promoted = 0;
    let expired = 0;
    let extended = 0;

    for (const record of candidates) {
      const score = this.t1.consolidationScore(record);

      if (score >= CONSOLIDATION_PROMOTE) {
        // Promote to T2
        const subspace = record.domain === 'procedural' ? 'procedural'
          : record.accessCount > 3 ? 'semantic'
          : 'episodic';

        this.t2.store(subspace, {
          embedding: record.embedding,
          content: record.content,
          domain: record.domain,
          importance: record.importance,
          metadata: { ...record.metadata, promotedFrom: 't1', originalId: record.id },
        });

        record.consolidated = true;
        promoted++;
        this.emit('memory:promoted', { id: record.id, subspace, score });

      } else if (score < CONSOLIDATION_EXPIRE) {
        // Allow to expire (will be cleaned up by TTL)
        expired++;
        this.emit('memory:expired', { id: record.id, score });

      } else {
        // Extend TTL
        record.expiresAt += T1_EXTENSION_MS;
        extended++;
      }
    }

    // Run T2 partition sweep
    const partitionResult = this.t2.partitionSweep();

    return {
      candidates: candidates.length,
      promoted,
      expired,
      extended,
      partitionTransitions: partitionResult.transitions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Start the consolidation cycle.
   * Runs every φ⁴ ≈ 6.85 hours.
   */
  startConsolidation(intervalMs) {
    const interval = intervalMs || T1_EXTENSION_MS;
    if (this.consolidationTimer) return;

    this.consolidationTimer = setInterval(() => {
      const result = this.consolidate();
      this.emit('consolidation:complete', result);
    }, interval);

    console.log(`[heady-memory] Consolidation started: every ${Math.round(interval / 3600000 * 100) / 100}h`);
  }

  stopConsolidation() {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = null;
    }
  }

  /**
   * Get memory system stats.
   */
  stats() {
    return {
      t0: { capsules: this.t0.size, cap: T0_CAPSULE_CAP },
      t1: { vectors: this.t1.size, capacity: T1_CAPACITY, ttlHours: Math.round(T1_TTL_MS / 3600000) },
      t2: this.t2.stats(),
      constants: { phi: PHI, psi: PSI, psi2: PSI2, embeddingDim: EMBEDDING_DIM },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  HeadyMemory,
  WorkingMemory,
  ShortTermMemory,
  LongTermMemory,
  // Constants
  PHI, PSI, PSI2, FIB, EMBEDDING_DIM,
  T0_CAPSULE_CAP, T1_CAPACITY, T1_TTL_MS,
  CONSOLIDATION_PROMOTE, CONSOLIDATION_EXPIRE,
  W_ACCESS, W_REINFORCEMENT, W_IMPORTANCE, W_SIMILARITY,
  DECAY_SEMANTIC, DECAY_EPISODIC, DECAY_PROCEDURAL,
};
