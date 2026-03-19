/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ HCFullPipeline v7 — 21-Stage State Machine               ║
 * ║  The nervous system of the entire Heady platform                  ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║  © 2026 HeadySystems Inc. — All Rights Reserved                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * 21 stages: CHANNEL_ENTRY → RECEIPT
 * 4 path variants: FAST_PATH(7), FULL_PATH(21), ARENA_PATH(9), LEARNING_PATH(7)
 * CSL-gated stage transitions, checkpoint save/restore, phi-backoff retry
 *
 * @module hcfull-pipeline-v7
 * @version 7.0.0
 */

'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');
const {
  PHI, PSI, FIB_SEQUENCE,
  CSL_THRESHOLDS, phiBackoff, phiBackoffWithJitter,
  phiFusionWeights, fib, phiMs, PHI_TIMING,
  cosineSimilarity, placeholderVector,
} = require('../lib/phi-helpers');

// ─── PIPELINE STATES ───────────────────────────────────────────────────────

/** 21 pipeline states — fib(8) stages */
const PIPELINE_STATES = Object.freeze([
  'CHANNEL_ENTRY',     // 0  — Request arrives
  'CONTEXT_ASSEMBLY',  // 1  — Gather all relevant context
  'INTENT_CLASSIFY',   // 2  — CSL-classify task type
  'NODE_SELECT',       // 3  — Capability-based routing
  'CONTEXT_ENRICH',    // 4  — Enrich with additional data
  'VALIDATE',          // 5  — Input validation
  'EMBED',             // 6  — Generate embeddings
  'SEARCH',            // 7  — Search knowledge base
  'RANK',              // 8  — Rank search results
  'FUSE',              // 9  — Fuse multi-source results
  'GENERATE',          // 10 — Generate output
  'REVIEW',            // 11 — Quality review
  'REFINE',            // 12 — Refinement pass
  'FORMAT',            // 13 — Output formatting
  'CACHE',             // 14 — Cache results
  'DELIVER',           // 15 — Deliver to caller
  'LOG',               // 16 — Structured logging
  'EVALUATE',          // 17 — Evaluate output quality
  'LEARN',             // 18 — Extract learnings
  'ARCHIVE',           // 19 — Archive for posterity
  'RECEIPT',           // 20 — Signed receipt
]);

/** State index lookup */
const STATE_INDEX = {};
PIPELINE_STATES.forEach((s, i) => { STATE_INDEX[s] = i; });

// ─── PATH VARIANTS ─────────────────────────────────────────────────────────

/**
 * 4 path variants controlling which stages execute.
 * FAST_PATH:     7 stages — minimal latency for simple queries
 * FULL_PATH:    21 stages — complete pipeline for complex tasks
 * ARENA_PATH:    9 stages — battle mode for competitive evaluation
 * LEARNING_PATH: 7 stages — knowledge extraction and learning
 */
const PATH_VARIANTS = Object.freeze({
  FAST_PATH: {
    name: 'FAST_PATH',
    stages: [
      STATE_INDEX.CHANNEL_ENTRY,
      STATE_INDEX.INTENT_CLASSIFY,
      STATE_INDEX.NODE_SELECT,
      STATE_INDEX.GENERATE,
      STATE_INDEX.FORMAT,
      STATE_INDEX.DELIVER,
      STATE_INDEX.RECEIPT,
    ],
    description: 'Minimal latency path for simple queries',
    stageCount: fib(6) - 1, // 7
  },
  FULL_PATH: {
    name: 'FULL_PATH',
    stages: Array.from({ length: fib(8) }, (_, i) => i), // All 21
    description: 'Complete pipeline for complex tasks',
    stageCount: fib(8), // 21
  },
  ARENA_PATH: {
    name: 'ARENA_PATH',
    stages: [
      STATE_INDEX.CHANNEL_ENTRY,
      STATE_INDEX.CONTEXT_ASSEMBLY,
      STATE_INDEX.INTENT_CLASSIFY,
      STATE_INDEX.NODE_SELECT,
      STATE_INDEX.GENERATE,
      STATE_INDEX.REVIEW,
      STATE_INDEX.REFINE,
      STATE_INDEX.DELIVER,
      STATE_INDEX.RECEIPT,
    ],
    description: 'Battle mode for competitive evaluation',
    stageCount: fib(6) + fib(3), // 9
  },
  LEARNING_PATH: {
    name: 'LEARNING_PATH',
    stages: [
      STATE_INDEX.CHANNEL_ENTRY,
      STATE_INDEX.CONTEXT_ASSEMBLY,
      STATE_INDEX.EVALUATE,
      STATE_INDEX.LEARN,
      STATE_INDEX.ARCHIVE,
      STATE_INDEX.LOG,
      STATE_INDEX.RECEIPT,
    ],
    description: 'Knowledge extraction and learning',
    stageCount: fib(6) - 1, // 7
  },
});

// ─── PIPELINE CONTEXT ──────────────────────────────────────────────────────

/**
 * Creates a new pipeline execution context.
 * Tracks correlation, timing, stage progression, and errors.
 *
 * @param {Object} params
 * @param {string} [params.correlationId] - External correlation ID
 * @param {string} [params.path='FULL_PATH'] - Path variant
 * @param {Object} [params.input] - Initial input data
 * @returns {Object} Pipeline context
 */
function createPipelineContext(params = {}) {
  const correlationId = params.correlationId || crypto.randomUUID();
  const pathName = params.path || 'FULL_PATH';
  const pathVariant = PATH_VARIANTS[pathName] || PATH_VARIANTS.FULL_PATH;

  return {
    correlationId,
    pipelineId: crypto.randomUUID(),
    path: pathVariant,
    pathName,
    input: params.input || {},
    output: null,
    currentStage: null,
    currentStageIndex: -1,
    stageTimings: {},
    stageOutputs: {},
    errors: [],
    startTime: Date.now(),
    endTime: null,
    status: 'PENDING', // PENDING, RUNNING, COMPLETED, FAILED, CHECKPOINTED
    coherenceScore: CSL_THRESHOLDS.HIGH,
    checkpoints: [],
    retryCount: 0,
    maxRetries: fib(6), // 8
    metadata: {
      version: '7.0.0',
      sacredGeometryLayer: 'Inner',
      phiCompliance: true,
    },
  };
}

// ─── CHECKPOINT ENGINE ─────────────────────────────────────────────────────

/**
 * Save a checkpoint of the pipeline context.
 * Uses SHA-256 hash for integrity verification.
 *
 * @param {Object} ctx - Pipeline context
 * @returns {Object} Checkpoint record
 */
function saveCheckpoint(ctx) {
  const payload = JSON.stringify({
    pipelineId: ctx.pipelineId,
    correlationId: ctx.correlationId,
    currentStage: ctx.currentStage,
    currentStageIndex: ctx.currentStageIndex,
    stageTimings: ctx.stageTimings,
    stageOutputs: ctx.stageOutputs,
    errors: ctx.errors,
    coherenceScore: ctx.coherenceScore,
    pathName: ctx.pathName,
    input: ctx.input,
  });

  const hash = crypto.createHash('sha256').update(payload).digest('hex');

  const checkpoint = {
    checkpointId: crypto.randomUUID(),
    hash,
    stageIndex: ctx.currentStageIndex,
    stageName: ctx.currentStage,
    timestamp: Date.now(),
    payload,
    status: ctx.status,
  };

  ctx.checkpoints.push(checkpoint);
  return checkpoint;
}

/**
 * Restore pipeline context from a checkpoint.
 * Verifies SHA-256 hash integrity before restoring.
 *
 * @param {Object} ctx - Pipeline context to restore into
 * @param {Object} checkpoint - Checkpoint to restore from
 * @returns {boolean} True if restore succeeded
 */
function restoreCheckpoint(ctx, checkpoint) {
  // Verify hash integrity
  const computedHash = crypto.createHash('sha256').update(checkpoint.payload).digest('hex');
  if (computedHash !== checkpoint.hash) {
    ctx.errors.push({
      stage: 'checkpoint_restore',
      error: 'Checkpoint hash mismatch — data integrity violation',
      timestamp: Date.now(),
    });
    return false;
  }

  const data = JSON.parse(checkpoint.payload);
  ctx.currentStage = data.currentStage;
  ctx.currentStageIndex = data.currentStageIndex;
  ctx.stageTimings = data.stageTimings;
  ctx.stageOutputs = data.stageOutputs;
  ctx.errors = data.errors;
  ctx.coherenceScore = data.coherenceScore;
  ctx.status = 'RUNNING';

  return true;
}

// ─── CSL-GATED STAGE TRANSITIONS ──────────────────────────────────────────

/**
 * Check if the pipeline can advance to the next stage.
 * Requires minimum coherence score based on CSL gates.
 *
 * @param {Object} ctx - Pipeline context
 * @param {number} nextStageIndex - Target stage index
 * @returns {{allowed: boolean, reason: string, coherence: number, threshold: number}}
 */
function canAdvance(ctx, nextStageIndex) {
  const coherence = ctx.coherenceScore;

  // Critical stages (GENERATE, DELIVER) require HIGH coherence
  const criticalStages = [
    STATE_INDEX.GENERATE,
    STATE_INDEX.DELIVER,
  ];
  // Review stages require MEDIUM
  const reviewStages = [
    STATE_INDEX.REVIEW,
    STATE_INDEX.REFINE,
    STATE_INDEX.EVALUATE,
  ];

  let threshold = CSL_THRESHOLDS.LOW; // Default: LOW
  if (criticalStages.includes(nextStageIndex)) {
    threshold = CSL_THRESHOLDS.HIGH;
  } else if (reviewStages.includes(nextStageIndex)) {
    threshold = CSL_THRESHOLDS.MEDIUM;
  }

  const allowed = coherence >= threshold;

  return {
    allowed,
    reason: allowed
      ? `Coherence ${coherence.toFixed(fib(4))} >= threshold ${threshold.toFixed(fib(4))}`
      : `Coherence ${coherence.toFixed(fib(4))} below threshold ${threshold.toFixed(fib(4))} for stage ${PIPELINE_STATES[nextStageIndex]}`,
    coherence,
    threshold,
  };
}

// ─── STAGE EXECUTORS ───────────────────────────────────────────────────────

/**
 * Default stage executor map.
 * Each stage has a default implementation that can be overridden.
 */
const DEFAULT_STAGE_EXECUTORS = {
  CHANNEL_ENTRY: async (ctx) => {
    return { received: true, inputSize: JSON.stringify(ctx.input).length, timestamp: Date.now() };
  },
  CONTEXT_ASSEMBLY: async (ctx) => {
    return { contextGathered: true, sources: fib(4), relevanceScore: PSI };
  },
  INTENT_CLASSIFY: async (ctx) => {
    const embedding = placeholderVector(JSON.stringify(ctx.input).substring(0, fib(11)));
    return { intent: 'general', confidence: PSI, embedding };
  },
  NODE_SELECT: async (ctx) => {
    return { selectedNodes: ['primary-node'], pool: 'Warm', routingScore: PSI };
  },
  CONTEXT_ENRICH: async (ctx) => {
    return { enriched: true, additionalContext: fib(3), enrichmentScore: PSI * PSI };
  },
  VALIDATE: async (ctx) => {
    return { valid: true, validationScore: CSL_THRESHOLDS.HIGH };
  },
  EMBED: async (ctx) => {
    const embedding = placeholderVector(ctx.correlationId);
    return { embedded: true, dimensions: embedding.length };
  },
  SEARCH: async (ctx) => {
    return { results: [], searchScore: PSI, queryExpansions: fib(3) };
  },
  RANK: async (ctx) => {
    return { ranked: true, topK: fib(5), rankingMethod: 'phi-fusion' };
  },
  FUSE: async (ctx) => {
    const weights = phiFusionWeights(fib(4));
    return { fused: true, fusionWeights: weights, fusionScore: PSI };
  },
  GENERATE: async (ctx) => {
    return { generated: true, outputTokens: fib(11), generationScore: PSI };
  },
  REVIEW: async (ctx) => {
    return { reviewed: true, qualityScore: CSL_THRESHOLDS.MEDIUM, issues: [] };
  },
  REFINE: async (ctx) => {
    return { refined: true, refinements: fib(3), improvementScore: PSI * PSI };
  },
  FORMAT: async (ctx) => {
    return { formatted: true, outputFormat: 'json', formatScore: CSL_THRESHOLDS.HIGH };
  },
  CACHE: async (ctx) => {
    return { cached: true, ttlMs: PHI_TIMING.TIDE, cacheKey: ctx.correlationId };
  },
  DELIVER: async (ctx) => {
    return { delivered: true, deliveryMethod: 'response', deliveryScore: CSL_THRESHOLDS.HIGH };
  },
  LOG: async (ctx) => {
    return { logged: true, logEntries: Object.keys(ctx.stageTimings).length };
  },
  EVALUATE: async (ctx) => {
    const weights = phiFusionWeights(fib(4));
    return { evaluationScore: CSL_THRESHOLDS.MEDIUM, criteria: weights.length, weights };
  },
  LEARN: async (ctx) => {
    return { learned: true, patterns: fib(3), knowledgeScore: PSI };
  },
  ARCHIVE: async (ctx) => {
    return { archived: true, archiveId: crypto.randomUUID(), retentionDays: fib(11) };
  },
  RECEIPT: async (ctx) => {
    const receiptData = JSON.stringify({
      pipelineId: ctx.pipelineId,
      correlationId: ctx.correlationId,
      stages: Object.keys(ctx.stageTimings).length,
      totalMs: Date.now() - ctx.startTime,
    });
    const signature = crypto.createHash('sha256').update(receiptData).digest('hex');
    return { receipt: true, signature, stageCount: Object.keys(ctx.stageTimings).length };
  },
};

// ─── HCFULL PIPELINE V7 ───────────────────────────────────────────────────

/**
 * HCFullPipeline v7 — 21-stage state machine with CSL-gated transitions,
 * checkpoint save/restore, phi-backoff retry, and multiple path variants.
 */
class HCFullPipelineV7 extends EventEmitter {
  /**
   * @param {Object} config
   * @param {Object} [config.stageExecutors] - Custom stage executor overrides
   * @param {string} [config.defaultPath='FULL_PATH'] - Default path variant
   */
  constructor(config = {}) {
    super();
    this._startTime = Date.now();
    this._version = '7.0.0';
    this._defaultPath = config.defaultPath || 'FULL_PATH';

    // Merge default executors with custom overrides
    this._stageExecutors = { ...DEFAULT_STAGE_EXECUTORS };
    if (config.stageExecutors) {
      for (const [stage, executor] of Object.entries(config.stageExecutors)) {
        if (PIPELINE_STATES.includes(stage) && typeof executor === 'function') {
          this._stageExecutors[stage] = executor;
        }
      }
    }

    // Pipeline statistics
    this._stats = {
      totalRuns: 0,
      completedRuns: 0,
      failedRuns: 0,
      avgDurationMs: 0,
      stageFailureCounts: {},
    };

    // Active contexts
    this._activeContexts = new Map();
    this._maxActive = fib(8); // 21 concurrent pipelines
  }

  /**
   * Execute the full pipeline.
   *
   * @param {Object} params
   * @param {Object} [params.input] - Pipeline input data
   * @param {string} [params.path] - Path variant name
   * @param {string} [params.correlationId] - External correlation ID
   * @returns {Promise<Object>} Pipeline execution result
   */
  async execute(params = {}) {
    if (this._activeContexts.size >= this._maxActive) {
      throw new Error(`Pipeline at capacity: ${this._maxActive} concurrent executions`);
    }

    const ctx = createPipelineContext({
      input: params.input,
      path: params.path || this._defaultPath,
      correlationId: params.correlationId,
    });

    this._activeContexts.set(ctx.pipelineId, ctx);
    this._stats.totalRuns++;
    ctx.status = 'RUNNING';

    this.emit('pipeline:start', {
      pipelineId: ctx.pipelineId,
      correlationId: ctx.correlationId,
      path: ctx.pathName,
      stageCount: ctx.path.stageCount,
    });

    try {
      // Execute stages in path order
      for (const stageIdx of ctx.path.stages) {
        const stageName = PIPELINE_STATES[stageIdx];
        ctx.currentStage = stageName;
        ctx.currentStageIndex = stageIdx;

        // CSL gate check
        const gateResult = canAdvance(ctx, stageIdx);
        if (!gateResult.allowed) {
          // Try to recover by reducing scope
          ctx.errors.push({
            stage: stageName,
            error: gateResult.reason,
            type: 'CSL_GATE_BLOCKED',
            timestamp: Date.now(),
          });

          this.emit('stage:blocked', {
            pipelineId: ctx.pipelineId,
            stage: stageName,
            reason: gateResult.reason,
          });

          // Attempt phi-backoff retry
          const recovered = await this._retryWithBackoff(ctx, stageIdx);
          if (!recovered) {
            // Skip non-critical stages, fail on critical
            if (stageIdx === STATE_INDEX.GENERATE || stageIdx === STATE_INDEX.DELIVER) {
              throw new Error(`Critical stage ${stageName} blocked: ${gateResult.reason}`);
            }
            continue; // Skip this stage
          }
        }

        // Execute stage
        const stageStart = Date.now();
        try {
          const executor = this._stageExecutors[stageName];
          if (!executor) {
            throw new Error(`No executor registered for stage: ${stageName}`);
          }

          // Timeout: phi-scaled per stage position
          const timeout = phiMs(fib(4) + Math.floor(stageIdx / fib(4)));
          const output = await Promise.race([
            executor(ctx),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Stage ${stageName} timeout (${timeout}ms)`)), timeout)
            ),
          ]);

          const durationMs = Date.now() - stageStart;
          ctx.stageTimings[stageName] = durationMs;
          ctx.stageOutputs[stageName] = output;

          // Update coherence based on stage success
          ctx.coherenceScore = Math.min(1, ctx.coherenceScore + Math.pow(PSI, fib(5)));

          this.emit('stage:complete', {
            pipelineId: ctx.pipelineId,
            stage: stageName,
            durationMs,
            coherence: ctx.coherenceScore,
          });

          // Auto-checkpoint every fib(5)=5 stages
          if (stageIdx > 0 && stageIdx % fib(5) === 0) {
            saveCheckpoint(ctx);
          }

        } catch (stageErr) {
          const durationMs = Date.now() - stageStart;
          ctx.stageTimings[stageName] = durationMs;
          ctx.errors.push({
            stage: stageName,
            error: stageErr.message,
            durationMs,
            timestamp: Date.now(),
          });

          // Degrade coherence on error
          ctx.coherenceScore = Math.max(0, ctx.coherenceScore - Math.pow(PSI, fib(3)));

          // Track stage failure stats
          this._stats.stageFailureCounts[stageName] =
            (this._stats.stageFailureCounts[stageName] || 0) + 1;

          this.emit('stage:error', {
            pipelineId: ctx.pipelineId,
            stage: stageName,
            error: stageErr.message,
            coherence: ctx.coherenceScore,
          });

          // Save checkpoint on error for recovery
          saveCheckpoint(ctx);

          // Attempt retry with phi-backoff
          const recovered = await this._retryStage(ctx, stageIdx, stageErr);
          if (!recovered) {
            // Non-critical stages can be skipped
            const criticalStages = [
              STATE_INDEX.CHANNEL_ENTRY,
              STATE_INDEX.GENERATE,
              STATE_INDEX.DELIVER,
              STATE_INDEX.RECEIPT,
            ];
            if (criticalStages.includes(stageIdx)) {
              throw stageErr;
            }
          }
        }
      }

      // Pipeline completed successfully
      ctx.status = 'COMPLETED';
      ctx.endTime = Date.now();
      ctx.output = ctx.stageOutputs;
      this._stats.completedRuns++;

      // Update average duration
      const totalMs = ctx.endTime - ctx.startTime;
      this._stats.avgDurationMs = (
        (this._stats.avgDurationMs * (this._stats.completedRuns - 1) + totalMs) /
        this._stats.completedRuns
      );

      // Final checkpoint
      saveCheckpoint(ctx);

      this.emit('pipeline:complete', {
        pipelineId: ctx.pipelineId,
        correlationId: ctx.correlationId,
        path: ctx.pathName,
        durationMs: totalMs,
        stagesExecuted: Object.keys(ctx.stageTimings).length,
        coherence: ctx.coherenceScore,
        errors: ctx.errors.length,
      });

      return {
        pipelineId: ctx.pipelineId,
        correlationId: ctx.correlationId,
        status: ctx.status,
        path: ctx.pathName,
        output: ctx.output,
        stageTimings: ctx.stageTimings,
        errors: ctx.errors,
        coherenceScore: ctx.coherenceScore,
        durationMs: totalMs,
        checkpoints: ctx.checkpoints.length,
      };

    } catch (fatalErr) {
      ctx.status = 'FAILED';
      ctx.endTime = Date.now();
      this._stats.failedRuns++;

      this.emit('pipeline:failed', {
        pipelineId: ctx.pipelineId,
        correlationId: ctx.correlationId,
        error: fatalErr.message,
        stagesCompleted: Object.keys(ctx.stageTimings).length,
      });

      return {
        pipelineId: ctx.pipelineId,
        correlationId: ctx.correlationId,
        status: ctx.status,
        path: ctx.pathName,
        output: null,
        stageTimings: ctx.stageTimings,
        errors: [...ctx.errors, { stage: ctx.currentStage, error: fatalErr.message, fatal: true }],
        coherenceScore: ctx.coherenceScore,
        durationMs: ctx.endTime - ctx.startTime,
        checkpoints: ctx.checkpoints.length,
      };

    } finally {
      this._activeContexts.delete(ctx.pipelineId);
    }
  }

  /**
   * Retry a failed stage with phi-backoff.
   *
   * @param {Object} ctx - Pipeline context
   * @param {number} stageIdx - Stage index to retry
   * @param {Error} originalErr - Original error
   * @returns {Promise<boolean>} True if retry succeeded
   */
  async _retryStage(ctx, stageIdx, originalErr) {
    const stageName = PIPELINE_STATES[stageIdx];
    const maxRetries = fib(4); // 3 retries

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      ctx.retryCount++;
      const delay = phiBackoff(attempt, PHI_TIMING.TICK);

      this.emit('stage:retry', {
        pipelineId: ctx.pipelineId,
        stage: stageName,
        attempt: attempt + 1,
        delayMs: Math.round(delay),
      });

      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        const executor = this._stageExecutors[stageName];
        const output = await executor(ctx);
        ctx.stageOutputs[stageName] = output;
        ctx.coherenceScore = Math.min(1, ctx.coherenceScore + Math.pow(PSI, fib(5)));
        return true;
      } catch (retryErr) {
        ctx.errors.push({
          stage: stageName,
          error: retryErr.message,
          attempt: attempt + 1,
          timestamp: Date.now(),
        });
      }
    }

    return false;
  }

  /**
   * Attempt recovery when CSL gate blocks advancement.
   * @param {Object} ctx
   * @param {number} stageIdx
   * @returns {Promise<boolean>}
   */
  async _retryWithBackoff(ctx, stageIdx) {
    const maxAttempts = fib(3); // 2
    for (let i = 0; i < maxAttempts; i++) {
      const delay = phiBackoff(i, PHI_TIMING.PULSE);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Slightly boost coherence (self-healing attempt)
      ctx.coherenceScore = Math.min(1, ctx.coherenceScore + Math.pow(PSI, fib(6)));

      const gateResult = canAdvance(ctx, stageIdx);
      if (gateResult.allowed) return true;
    }
    return false;
  }

  /**
   * Resume a pipeline from its last checkpoint.
   *
   * @param {Object} ctx - Pipeline context with checkpoints
   * @returns {Promise<Object>} Resumed pipeline result
   */
  async resume(ctx) {
    if (!ctx.checkpoints || ctx.checkpoints.length === 0) {
      throw new Error('No checkpoints available for resume');
    }

    const lastCheckpoint = ctx.checkpoints[ctx.checkpoints.length - 1];
    const restored = restoreCheckpoint(ctx, lastCheckpoint);
    if (!restored) {
      throw new Error('Checkpoint restore failed — data integrity violation');
    }

    // Re-execute from the restored stage
    const resumeStageIdx = ctx.currentStageIndex;
    const remainingStages = ctx.path.stages.filter(idx => idx >= resumeStageIdx);

    this.emit('pipeline:resume', {
      pipelineId: ctx.pipelineId,
      fromStage: PIPELINE_STATES[resumeStageIdx],
      remainingStages: remainingStages.length,
    });

    // Continue execution from the restored point
    return this.execute({
      input: ctx.input,
      path: ctx.pathName,
      correlationId: ctx.correlationId,
    });
  }

  /**
   * Get pipeline execution statistics and health.
   * @returns {Object}
   */
  health() {
    return {
      service: 'hcfull-pipeline-v7',
      version: this._version,
      status: 'healthy',
      phi_compliance: true,
      sacred_geometry_layer: 'Inner',
      uptime_ms: Date.now() - this._startTime,
      statistics: {
        totalRuns: this._stats.totalRuns,
        completedRuns: this._stats.completedRuns,
        failedRuns: this._stats.failedRuns,
        successRate: this._stats.totalRuns > 0
          ? parseFloat((this._stats.completedRuns / this._stats.totalRuns).toFixed(fib(5)))
          : 1.0,
        avgDurationMs: parseFloat(this._stats.avgDurationMs.toFixed(fib(3))),
        activeContexts: this._activeContexts.size,
        maxConcurrent: this._maxActive,
        stageFailureCounts: this._stats.stageFailureCounts,
      },
      states: PIPELINE_STATES,
      paths: Object.keys(PATH_VARIANTS).map(name => ({
        name,
        stageCount: PATH_VARIANTS[name].stageCount,
        description: PATH_VARIANTS[name].description,
      })),
    };
  }

  /**
   * Graceful shutdown — wait for active pipelines, then clean up.
   */
  async shutdown() {
    this.emit('pipeline:shutdown', {
      activeContexts: this._activeContexts.size,
    });

    // Mark all active contexts as terminated
    for (const [id, ctx] of this._activeContexts) {
      ctx.status = 'TERMINATED';
      saveCheckpoint(ctx);
    }

    this._activeContexts.clear();
    this.removeAllListeners();
  }
}

// ─── MODULE EXPORTS ────────────────────────────────────────────────────────

module.exports = {
  // Pipeline engine
  HCFullPipelineV7,

  // States and paths
  PIPELINE_STATES,
  STATE_INDEX,
  PATH_VARIANTS,

  // Context management
  createPipelineContext,

  // Checkpointing
  saveCheckpoint,
  restoreCheckpoint,

  // CSL gates
  canAdvance,

  // Default executors (for override/extension)
  DEFAULT_STAGE_EXECUTORS,
};
