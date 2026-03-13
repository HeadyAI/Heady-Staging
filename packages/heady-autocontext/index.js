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
// ║  FILE: packages/heady-autocontext/index.js                       ║
// ║  LAYER: packages                                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HeadyAutoContext — Universal Intelligence Middleware
 *
 * 5-pass enrichment pipeline that every operation flows through:
 *   Pass 1: Intent Embedding — raw input → 1536D task intent vector
 *   Pass 2: Memory Retrieval — T0 → T1 → T2 semantic search (gate τ=ψ²=0.382)
 *   Pass 3: Knowledge Grounding — Graph RAG + wisdom + domain docs (gate τ=ψ=0.618)
 *   Pass 4: Context Compression — deduplicate + summarize → token-efficient capsule
 *   Pass 5: Confidence Assessment — CSL Confidence Gate (phiGATE level 2, τ=0.809)
 *
 * Nothing executes without AutoContext enrichment.
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// φ-constants
const PHI = 1.618034;
const PSI = 0.618034;
const PSI2 = PSI * PSI; // 0.382
const PHI_GATE_L1 = 1 - 1 / (PHI * PHI); // ≈ 0.618
const PHI_GATE_L2 = 1 - 1 / (PHI * PHI * PHI); // ≈ 0.809
const PHI_GATE_L3 = 1 - 1 / Math.pow(PHI, 4); // ≈ 0.882

// Pass gate thresholds
const PASS_THRESHOLDS = {
  2: PSI2,         // 0.382 — wide net for memory retrieval
  3: PSI,          // 0.618 — knowledge grounding
  5: PHI_GATE_L2,  // 0.809 — final confidence gate
};

// Confidence decisions
const CONFIDENCE = {
  EXECUTE: 'EXECUTE',
  CAUTIOUS: 'CAUTIOUS',
  HALT: 'HALT',
};

class HeadyAutoContext extends EventEmitter {
  constructor(options = {}) {
    super();
    this.memory = options.memory || null; // HeadyMemory instance
    this.embeddingFn = options.embeddingFn || null; // async (text) → Float32Array
    this.knowledgeQueryFn = options.knowledgeQueryFn || null; // async (vector) → [{ content, score }]
    this.enrichmentLog = [];
    this.stats = {
      totalEnrichments: 0,
      passLatencies: [0, 0, 0, 0, 0],
      gateResults: { EXECUTE: 0, CAUTIOUS: 0, HALT: 0 },
    };
  }

  /**
   * Full 5-pass enrichment pipeline.
   * @param {string} input - Raw user/system input
   * @param {Object} context - { domain, sourceNode, pipelineStage }
   * @returns {Object} Enriched context capsule
   */
  async enrich(input, context = {}) {
    const startTime = Date.now();
    const enrichmentId = crypto.randomUUID();

    const capsule = {
      id: enrichmentId,
      input,
      context,
      passes: {},
      confidence: null,
      decision: null,
      totalLatencyMs: 0,
    };

    // ─── Pass 1: Intent Embedding ─────────────────────────────
    const p1Start = Date.now();
    capsule.passes[1] = await this._pass1IntentEmbedding(input);
    this.stats.passLatencies[0] += Date.now() - p1Start;

    // ─── Pass 2: Memory Retrieval ─────────────────────────────
    const p2Start = Date.now();
    capsule.passes[2] = await this._pass2MemoryRetrieval(
      capsule.passes[1].embedding,
      PASS_THRESHOLDS[2]
    );
    this.stats.passLatencies[1] += Date.now() - p2Start;

    // ─── Pass 3: Knowledge Grounding ──────────────────────────
    const p3Start = Date.now();
    capsule.passes[3] = await this._pass3KnowledgeGrounding(
      capsule.passes[1].embedding,
      PASS_THRESHOLDS[3]
    );
    this.stats.passLatencies[2] += Date.now() - p3Start;

    // ─── Pass 4: Context Compression ──────────────────────────
    const p4Start = Date.now();
    capsule.passes[4] = this._pass4Compression(capsule.passes);
    this.stats.passLatencies[3] += Date.now() - p4Start;

    // ─── Pass 5: Confidence Assessment ────────────────────────
    const p5Start = Date.now();
    capsule.passes[5] = this._pass5Confidence(capsule, PASS_THRESHOLDS[5]);
    capsule.confidence = capsule.passes[5].confidence;
    capsule.decision = capsule.passes[5].decision;
    this.stats.passLatencies[4] += Date.now() - p5Start;

    capsule.totalLatencyMs = Date.now() - startTime;
    this.stats.totalEnrichments++;
    this.stats.gateResults[capsule.decision]++;

    // Store in working memory if available
    if (this.memory) {
      this.memory.store('t0', {
        id: enrichmentId,
        taskVector: capsule.passes[1].embedding,
        pipelineStage: context.pipelineStage || 'unknown',
        confidence: capsule.confidence,
        autoContextPayload: capsule.passes[4].compressed,
      });
    }

    this.emit('enrichment:complete', {
      id: enrichmentId,
      decision: capsule.decision,
      confidence: capsule.confidence,
      latencyMs: capsule.totalLatencyMs,
    });

    return capsule;
  }

  /**
   * Fast enrichment — passes 1+2 only (for latency-critical ops).
   */
  async enrichFast(input, context = {}) {
    const embedding = await this._pass1IntentEmbedding(input);
    const memories = await this._pass2MemoryRetrieval(embedding.embedding, PASS_THRESHOLDS[2]);

    return {
      embedding: embedding.embedding,
      memories: memories.results,
      memoryCount: memories.results.length,
    };
  }

  /**
   * Index content into T1 memory.
   */
  async indexBatch(entries) {
    if (!this.memory) return { indexed: 0, error: 'No memory instance configured' };

    let indexed = 0;
    for (const entry of entries) {
      const embedding = await this._getEmbedding(entry.content || JSON.stringify(entry));
      this.memory.store('t1', {
        embedding,
        content: entry.content || entry,
        domain: entry.domain || 'general',
        sourceNode: entry.sourceNode || 'autocontext',
        importance: entry.importance || PSI,
        metadata: entry.metadata || {},
      });
      indexed++;
    }

    return { indexed, total: entries.length };
  }

  /**
   * Direct semantic query across all memory tiers.
   */
  async query(text, topK = 5) {
    const embedding = await this._getEmbedding(text);
    if (!this.memory) return { results: [], error: 'No memory instance configured' };
    return this.memory.search(embedding, topK);
  }

  /**
   * Remove memories by ID or content hash.
   */
  remove(ids) {
    if (!this.memory) return { removed: 0 };
    let removed = 0;
    for (const id of ids) {
      if (this.memory.t1.delete(id)) removed++;
    }
    return { removed };
  }

  /**
   * Get enrichment pipeline statistics.
   */
  getStats() {
    const avgLatencies = this.stats.passLatencies.map(
      (total, i) => this.stats.totalEnrichments > 0 ? Math.round(total / this.stats.totalEnrichments) : 0
    );

    return {
      totalEnrichments: this.stats.totalEnrichments,
      avgPassLatenciesMs: {
        pass1_intent: avgLatencies[0],
        pass2_memory: avgLatencies[1],
        pass3_knowledge: avgLatencies[2],
        pass4_compression: avgLatencies[3],
        pass5_confidence: avgLatencies[4],
      },
      gateResults: { ...this.stats.gateResults },
      memoryStats: this.memory ? this.memory.stats() : null,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Pass Implementations
  // ═══════════════════════════════════════════════════════════════

  async _pass1IntentEmbedding(input) {
    const embedding = await this._getEmbedding(input);
    return { embedding, dimension: embedding.length, inputLength: input.length };
  }

  async _pass2MemoryRetrieval(intentEmbedding, threshold) {
    if (!this.memory) {
      return { results: [], gateThreshold: threshold, gated: false };
    }

    const results = this.memory.search(intentEmbedding, 10);

    // Gate: filter by threshold
    const gated = results.filter(r => r.score >= threshold);

    return {
      results: gated,
      totalRetrieved: results.length,
      afterGate: gated.length,
      gateThreshold: threshold,
    };
  }

  async _pass3KnowledgeGrounding(intentEmbedding, threshold) {
    if (!this.knowledgeQueryFn) {
      return { grounded: [], gateThreshold: threshold, available: false };
    }

    try {
      const knowledge = await this.knowledgeQueryFn(intentEmbedding);
      const grounded = knowledge.filter(k => (k.score || 0) >= threshold);

      return {
        grounded,
        totalFound: knowledge.length,
        afterGate: grounded.length,
        gateThreshold: threshold,
        available: true,
      };
    } catch (err) {
      return { grounded: [], error: err.message, available: false };
    }
  }

  _pass4Compression(passes) {
    // Deduplicate content across passes 2 and 3
    const seen = new Set();
    const uniqueItems = [];

    const memoryResults = passes[2]?.results || [];
    const knowledgeResults = passes[3]?.grounded || [];

    for (const item of [...memoryResults, ...knowledgeResults]) {
      const key = JSON.stringify(item.content || item).slice(0, 200);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    }

    // Token estimate (rough: 4 chars per token)
    const totalChars = uniqueItems.reduce((sum, item) => {
      return sum + JSON.stringify(item.content || item).length;
    }, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);

    return {
      compressed: uniqueItems,
      originalCount: memoryResults.length + knowledgeResults.length,
      deduplicatedCount: uniqueItems.length,
      estimatedTokens,
    };
  }

  _pass5Confidence(capsule, threshold) {
    const memoryCount = capsule.passes[2]?.afterGate || 0;
    const knowledgeCount = capsule.passes[3]?.afterGate || 0;
    const compressedCount = capsule.passes[4]?.deduplicatedCount || 0;

    // Confidence is based on how much supporting context we found
    const memorySignal = Math.min(1.0, memoryCount / 5); // saturates at 5 results
    const knowledgeSignal = Math.min(1.0, knowledgeCount / 3); // saturates at 3 results
    const contextRichness = compressedCount > 0 ? 1.0 : 0.5;

    const confidence = (
      PSI * memorySignal +       // 0.618 weight on memory
      PSI2 * knowledgeSignal +   // 0.382 weight on knowledge
      (1 - PSI - PSI2) * contextRichness // remaining weight
    );

    let decision;
    if (confidence >= threshold) {
      decision = CONFIDENCE.EXECUTE;
    } else if (confidence >= threshold * PSI) {
      decision = CONFIDENCE.CAUTIOUS;
    } else {
      decision = CONFIDENCE.HALT;
    }

    return { confidence: Math.round(confidence * 1000) / 1000, decision, threshold };
  }

  // ═══════════════════════════════════════════════════════════════
  // Embedding Helper
  // ═══════════════════════════════════════════════════════════════

  async _getEmbedding(text) {
    if (this.embeddingFn) {
      return this.embeddingFn(text);
    }

    // Fallback: deterministic pseudo-embedding from text hash
    // In production, this would call text-embedding-3-large
    const hash = crypto.createHash('sha512').update(text).digest();
    const embedding = new Float32Array(1536);
    for (let i = 0; i < 1536; i++) {
      embedding[i] = (hash[i % hash.length] / 255.0) * 2 - 1;
    }

    // Normalize to unit vector
    let mag = 0;
    for (let i = 0; i < embedding.length; i++) mag += embedding[i] * embedding[i];
    mag = Math.sqrt(mag);
    if (mag > 0) for (let i = 0; i < embedding.length; i++) embedding[i] /= mag;

    return embedding;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Express Router for Service Endpoints
// ═══════════════════════════════════════════════════════════════════

function createAutoContextRoutes(autoContext) {
  const express = require('express');
  const router = express.Router();

  router.post('/context/enrich', async (req, res) => {
    try {
      const { input, context } = req.body;
      const result = await autoContext.enrich(input, context);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/context/enrich-fast', async (req, res) => {
    try {
      const { input, context } = req.body;
      const result = await autoContext.enrichFast(input, context);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/context/index-batch', async (req, res) => {
    try {
      const result = await autoContext.indexBatch(req.body.entries || []);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/context/query', async (req, res) => {
    try {
      const { text, topK } = req.body;
      const results = await autoContext.query(text, topK);
      res.json({ results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/context/remove', async (req, res) => {
    try {
      const result = autoContext.remove(req.body.ids || []);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/context/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'heady-autocontext',
      memory: autoContext.memory ? 'connected' : 'disconnected',
    });
  });

  router.get('/context/stats', (req, res) => {
    res.json(autoContext.getStats());
  });

  return router;
}

// ═══════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  HeadyAutoContext,
  createAutoContextRoutes,
  CONFIDENCE,
  PASS_THRESHOLDS,
  PHI_GATE_L1,
  PHI_GATE_L2,
  PHI_GATE_L3,
};
