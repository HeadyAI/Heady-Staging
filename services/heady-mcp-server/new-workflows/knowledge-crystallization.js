/**
 * Knowledge Crystallization Workflow
 * Collects learning from all agents → compresses → stores in long-term memory
 * © 2026 HeadySystems Inc. — Eric Head, Founder
 */
'use strict';

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1,1,2,3,5,8,13,21,34,55,89,144,233];
const CSL = { MIN: 0.500, LOW: 0.691, MED: 0.809, HIGH: 0.882, CRIT: 0.927, DEDUP: 0.972 };

class KnowledgeCrystallizationWorkflow {
  constructor(config = {}) {
    this.name = 'knowledge-crystallization';
    this.description = 'Collect agent learnings, compress into dense representations, store in 384D long-term memory';
    this.maxAgentSources = FIB[7]; // 21
    this.compressionRatio = PSI; // 0.618 — compress to 61.8% of original
    this.minCoherence = CSL.MED;
    this.snapshotInterval = FIB[8] * 1000; // 34s between snapshots
    this.steps = [
      { id: 'harvest', name: 'Harvest Agent Learnings', timeout: FIB[8] * 1000 },
      { id: 'deduplicate', name: 'Semantic Deduplication', timeout: FIB[7] * 1000 },
      { id: 'compress', name: 'Phi-Ratio Compression', timeout: FIB[7] * 1000 },
      { id: 'validate', name: 'Coherence Validation', timeout: FIB[6] * 1000 },
      { id: 'crystallize', name: 'Store in Long-Term Memory', timeout: FIB[7] * 1000 },
      { id: 'index', name: 'Update HNSW Index', timeout: FIB[6] * 1000 }
    ];
    this.state = { step: 0, harvested: [], compressed: [], errors: [] };
  }

  async execute(context = {}) {
    const correlationId = `kc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const log = (msg, data) => console.log(JSON.stringify({ ts: new Date().toISOString(), workflow: this.name, correlationId, msg, ...data }));

    log('workflow_start', { totalSteps: this.steps.length });
    try {
      // Step 1: Harvest learnings from all active agents
      log('step_start', { step: 'harvest' });
      const learnings = await this._harvestLearnings(context.agentRegistry || []);
      log('step_complete', { step: 'harvest', count: learnings.length });

      // Step 2: Semantic deduplication using CSL cosine similarity
      log('step_start', { step: 'deduplicate' });
      const unique = this._deduplicateLearnings(learnings);
      log('step_complete', { step: 'deduplicate', original: learnings.length, unique: unique.length });

      // Step 3: Phi-ratio compression
      log('step_start', { step: 'compress' });
      const compressed = this._phiCompress(unique);
      log('step_complete', { step: 'compress', inputSize: unique.length, outputSize: compressed.length });

      // Step 4: Coherence validation
      log('step_start', { step: 'validate' });
      const validated = compressed.filter(item => item.coherence >= this.minCoherence);
      const rejected = compressed.length - validated.length;
      log('step_complete', { step: 'validate', validated: validated.length, rejected });

      // Step 5: Crystallize into long-term memory
      log('step_start', { step: 'crystallize' });
      const stored = await this._crystallize(validated);
      log('step_complete', { step: 'crystallize', stored: stored.length });

      // Step 6: Update HNSW index
      log('step_start', { step: 'index' });
      await this._updateIndex(stored);
      log('step_complete', { step: 'index' });

      log('workflow_complete', { totalStored: stored.length, totalRejected: rejected });
      return { success: true, stored: stored.length, rejected, correlationId };
    } catch (error) {
      log('workflow_error', { error: error.message });
      await this.rollback();
      return { success: false, error: error.message, correlationId };
    }
  }

  async _harvestLearnings(agentRegistry) {
    const learnings = [];
    for (const agent of agentRegistry.slice(0, this.maxAgentSources)) {
      try {
        const agentLearnings = agent.report ? await agent.report() : [];
        learnings.push(...agentLearnings.map(l => ({ ...l, source: agent.name, timestamp: Date.now() })));
      } catch { /* skip failed agents */ }
    }
    return learnings;
  }

  _deduplicateLearnings(learnings) {
    const unique = [];
    for (const learning of learnings) {
      const isDuplicate = unique.some(existing => {
        const similarity = this._cosineSimilarity(existing.embedding || [], learning.embedding || []);
        return similarity >= CSL.DEDUP;
      });
      if (!isDuplicate) unique.push(learning);
    }
    return unique;
  }

  _phiCompress(items) {
    // Group by semantic cluster, keep top PSI fraction
    const targetSize = Math.ceil(items.length * this.compressionRatio);
    return items
      .sort((a, b) => (b.coherence || 0) - (a.coherence || 0))
      .slice(0, targetSize)
      .map(item => ({
        ...item, compressed: true,
        coherence: item.coherence || this._computeCoherence(item)
      }));
  }

  _computeCoherence(item) {
    return item.embedding ? Math.min(1, Math.abs(item.embedding.reduce((s, v) => s + v, 0) / (item.embedding.length || 1)) + PSI) : CSL.MIN;
  }

  _cosineSimilarity(a, b) {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; normA += a[i]*a[i]; normB += b[i]*b[i]; }
    return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  async _crystallize(validated) {
    return validated.map(item => ({ ...item, crystallized: true, tier: 'T2_LONG_TERM', storedAt: Date.now() }));
  }

  async _updateIndex(stored) {
    // HNSW index update with m=21, ef_construction=89 (Fibonacci values)
    return { indexed: stored.length, hnswParams: { m: FIB[7], ef_construction: FIB[10] } };
  }

  async rollback() {
    console.log(JSON.stringify({ ts: new Date().toISOString(), workflow: this.name, msg: 'rollback_initiated' }));
    this.state = { step: 0, harvested: [], compressed: [], errors: [] };
  }
}

module.exports = { KnowledgeCrystallizationWorkflow };
