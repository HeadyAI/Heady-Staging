/**
 * HCFullPipeline — 8-Stage Automated Execution Engine
 * 
 * The complete Heady pipeline: Context→Intent→NodeSelect→Execute→Quality→Assurance→Pattern→Story
 * Each stage is CSL-gated with φ-threshold quality gates between stages.
 * Stages can run in parallel where the DAG allows.
 * 
 * @module core/pipeline/hc-full-pipeline
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

import { EventEmitter } from 'events';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const PSI3 = PSI * PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** φ-threshold quality gate levels */
const QUALITY_GATES = {
  PASS:    1 - Math.pow(PSI, 3) * 0.5,  // ≈ 0.882
  REVIEW:  1 - Math.pow(PSI, 2) * 0.5,  // ≈ 0.809
  RETRY:   1 - PSI * 0.5,               // ≈ 0.691
  FAIL:    0.5,                           // noise floor
};

/**
 * Pipeline stage definitions — ordered DAG
 * 
 * Stage dependencies:
 * Context (0) → Intent (1) → NodeSelect (2) → Execute (3)
 * Execute (3) → Quality (4) → Assurance (5)
 * Assurance (5) → Pattern (6) (can run parallel with Story)
 * Assurance (5) → Story (7) (can run parallel with Pattern)
 */
const STAGE_DEFINITIONS = [
  {
    id: 'context',
    index: 0,
    name: 'Context Assembly',
    agent: 'HeadyBrains',
    description: 'Gather all relevant context — user history, session state, domain knowledge',
    dependencies: [],
    timeoutMs: Math.round(PHI * 1000 * FIB[5]),  // ~8s
    qualityGate: QUALITY_GATES.REVIEW,
    retries: FIB[4], // 3
  },
  {
    id: 'intent',
    index: 1,
    name: 'Intent Classification',
    agent: 'HeadyConductor',
    description: 'Determine task type, urgency, domain, and required capabilities',
    dependencies: ['context'],
    timeoutMs: Math.round(PHI * 1000 * FIB[4]),  // ~5s
    qualityGate: QUALITY_GATES.PASS,
    retries: FIB[4],
  },
  {
    id: 'node-select',
    index: 2,
    name: 'Node Selection',
    agent: 'HeadyConductor',
    description: 'CSL-scored routing to optimal nodes based on domain alignment',
    dependencies: ['intent'],
    timeoutMs: Math.round(PHI * 1000 * FIB[4]),  // ~5s
    qualityGate: QUALITY_GATES.REVIEW,
    retries: FIB[4],
  },
  {
    id: 'execute',
    index: 3,
    name: 'Execution',
    agent: 'SelectedNodes',
    description: 'Parallel or sequential node activation for task execution',
    dependencies: ['node-select'],
    timeoutMs: Math.round(PHI * 1000 * FIB[9]),  // ~55s
    qualityGate: QUALITY_GATES.RETRY,
    retries: FIB[3], // 2
  },
  {
    id: 'quality',
    index: 4,
    name: 'Quality Gate',
    agent: 'HeadyCheck',
    description: 'Validate output quality, correctness, and completeness',
    dependencies: ['execute'],
    timeoutMs: Math.round(PHI * 1000 * FIB[7]),  // ~21s
    qualityGate: QUALITY_GATES.PASS,
    retries: FIB[3],
  },
  {
    id: 'assurance',
    index: 5,
    name: 'Assurance Gate',
    agent: 'HeadyAssure',
    description: 'Certify output for deployment — security, compliance, standards',
    dependencies: ['quality'],
    timeoutMs: Math.round(PHI * 1000 * FIB[7]),  // ~21s
    qualityGate: QUALITY_GATES.PASS,
    retries: FIB[3],
  },
  {
    id: 'pattern',
    index: 6,
    name: 'Pattern Capture',
    agent: 'HeadyPatterns',
    description: 'Log workflow pattern for learning and optimization',
    dependencies: ['assurance'],
    timeoutMs: Math.round(PHI * 1000 * FIB[5]),  // ~8s
    qualityGate: QUALITY_GATES.REVIEW,
    retries: FIB[3],
  },
  {
    id: 'story',
    index: 7,
    name: 'Story Update',
    agent: 'HeadyAutobiographer',
    description: 'Record the narrative — what was done, why, and outcome',
    dependencies: ['assurance'],  // parallel with pattern
    timeoutMs: Math.round(PHI * 1000 * FIB[5]),  // ~8s
    qualityGate: QUALITY_GATES.RETRY,
    retries: FIB[3],
  },
];

export class HCFullPipeline extends EventEmitter {
  constructor(config = {}) {
    super();
    this.stages = STAGE_DEFINITIONS.map(s => ({ ...s }));
    this.stageHandlers = new Map();
    this.runHistory = [];
    this.maxRunHistory = FIB[10]; // 55
    this.activeRuns = new Map();
    this.maxConcurrentRuns = FIB[5]; // 5
  }

  /**
   * Register a handler for a pipeline stage
   * Handler signature: async (input, context) => { result, qualityScore }
   */
  registerStageHandler(stageId, handler) {
    const stage = this.stages.find(s => s.id === stageId);
    if (!stage) throw new Error(`Unknown stage: ${stageId}`);
    this.stageHandlers.set(stageId, handler);
    this.emit('handler:registered', { stageId });
  }

  /**
   * Execute the full 8-stage pipeline
   */
  async run(input, options = {}) {
    if (this.activeRuns.size >= this.maxConcurrentRuns) {
      throw new Error(`Max concurrent pipeline runs reached: ${this.maxConcurrentRuns}`);
    }

    const runId = `hcfp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();

    const runState = {
      id: runId,
      input,
      options,
      startTime,
      stageResults: new Map(),
      stageStatuses: new Map(),
      status: 'running',
      error: null,
    };

    // Initialize all stages as pending
    for (const stage of this.stages) {
      runState.stageStatuses.set(stage.id, 'pending');
    }

    this.activeRuns.set(runId, runState);
    this.emit('pipeline:started', { runId, input: this._summarizeInput(input) });

    try {
      // Execute stages following DAG order
      await this._executeDAG(runState);

      runState.status = 'completed';
      const totalLatency = Date.now() - startTime;

      const result = {
        runId,
        status: 'completed',
        latency: totalLatency,
        stages: this._collectStageReport(runState),
        output: runState.stageResults.get('execute'),
        qualityReport: runState.stageResults.get('quality'),
        assuranceReport: runState.stageResults.get('assurance'),
        patternCaptured: runState.stageResults.has('pattern'),
        storyCaptured: runState.stageResults.has('story'),
      };

      this._recordRun(result);
      this.emit('pipeline:completed', { runId, latency: totalLatency });
      return result;

    } catch (error) {
      runState.status = 'failed';
      runState.error = error.message;

      const result = {
        runId,
        status: 'failed',
        error: error.message,
        latency: Date.now() - startTime,
        stages: this._collectStageReport(runState),
        failedStage: this._findFailedStage(runState),
      };

      this._recordRun(result);
      this.emit('pipeline:failed', { runId, error: error.message });
      throw error;

    } finally {
      this.activeRuns.delete(runId);
    }
  }

  /**
   * Execute a single stage (for partial pipeline runs or retries)
   */
  async runStage(stageId, input, context = {}) {
    const stage = this.stages.find(s => s.id === stageId);
    if (!stage) throw new Error(`Unknown stage: ${stageId}`);

    const handler = this.stageHandlers.get(stageId);
    if (!handler) throw new Error(`No handler registered for stage: ${stageId}`);

    return this._executeStage(stage, input, context);
  }

  /**
   * Get pipeline status and active run information
   */
  getStatus() {
    const activeRuns = [];
    for (const [id, run] of this.activeRuns) {
      const completedStages = [...run.stageStatuses.values()].filter(s => s === 'completed').length;
      activeRuns.push({
        id,
        status: run.status,
        completedStages,
        totalStages: this.stages.length,
        elapsed: Date.now() - run.startTime,
      });
    }

    return {
      stages: this.stages.map(s => ({
        id: s.id,
        name: s.name,
        agent: s.agent,
        hasHandler: this.stageHandlers.has(s.id),
      })),
      activeRuns,
      totalRuns: this.runHistory.length,
      registeredHandlers: [...this.stageHandlers.keys()],
    };
  }

  /**
   * Get run history with statistics
   */
  getRunHistory(limit = FIB[7]) {
    const recent = this.runHistory.slice(-limit);
    const completed = recent.filter(r => r.status === 'completed');
    const failed = recent.filter(r => r.status === 'failed');

    return {
      runs: recent,
      stats: {
        total: recent.length,
        completed: completed.length,
        failed: failed.length,
        successRate: recent.length > 0 ? completed.length / recent.length : 0,
        avgLatency: completed.length > 0
          ? Math.round(completed.reduce((s, r) => s + r.latency, 0) / completed.length)
          : 0,
      },
    };
  }

  // === INTERNAL ===

  /**
   * Execute pipeline stages following DAG dependencies
   * Stages with met dependencies run in parallel
   */
  async _executeDAG(runState) {
    const completed = new Set();
    const failed = new Set();

    while (completed.size + failed.size < this.stages.length) {
      // Find stages ready to execute (all dependencies met)
      const ready = this.stages.filter(stage =>
        !completed.has(stage.id) &&
        !failed.has(stage.id) &&
        stage.dependencies.every(dep => completed.has(dep)) &&
        !stage.dependencies.some(dep => failed.has(dep))
      );

      if (ready.length === 0) {
        // Check if we're blocked by failures
        const blocked = this.stages.filter(stage =>
          !completed.has(stage.id) &&
          !failed.has(stage.id) &&
          stage.dependencies.some(dep => failed.has(dep))
        );

        if (blocked.length > 0) {
          for (const stage of blocked) {
            failed.add(stage.id);
            runState.stageStatuses.set(stage.id, 'skipped');
          }
          continue;
        }
        break; // deadlock or complete
      }

      // Execute all ready stages in parallel
      const promises = ready.map(async (stage) => {
        runState.stageStatuses.set(stage.id, 'running');
        this.emit('stage:started', { runId: runState.id, stageId: stage.id, stageName: stage.name });

        try {
          // Build stage input from dependency outputs
          const stageInput = this._buildStageInput(stage, runState);
          const result = await this._executeStage(stage, stageInput, {
            runId: runState.id,
            originalInput: runState.input,
            options: runState.options,
          });

          runState.stageResults.set(stage.id, result.result);
          runState.stageStatuses.set(stage.id, 'completed');
          completed.add(stage.id);

          this.emit('stage:completed', {
            runId: runState.id,
            stageId: stage.id,
            qualityScore: result.qualityScore,
            latency: result.latency,
          });

        } catch (error) {
          runState.stageStatuses.set(stage.id, 'failed');
          failed.add(stage.id);

          this.emit('stage:failed', {
            runId: runState.id,
            stageId: stage.id,
            error: error.message,
          });

          // For critical stages (context through assurance), pipeline fails
          if (stage.index <= 5) {
            throw new Error(`Critical stage failed: ${stage.name} — ${error.message}`);
          }
          // Pattern and Story stages (6,7) can fail without failing the pipeline
        }
      });

      await Promise.allSettled(promises);
    }
  }

  /**
   * Execute a single stage with retries and quality gate
   */
  async _executeStage(stage, input, context) {
    const handler = this.stageHandlers.get(stage.id);
    if (!handler) {
      // Default passthrough for unregistered stages
      return { result: input, qualityScore: 1.0, latency: 0 };
    }

    let lastError = null;
    for (let attempt = 0; attempt <= stage.retries; attempt++) {
      const start = Date.now();

      try {
        const output = await Promise.race([
          handler(input, { ...context, attempt, stage }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Stage timeout: ${stage.name}`)), stage.timeoutMs)
          ),
        ]);

        const latency = Date.now() - start;
        const qualityScore = output.qualityScore ?? 1.0;

        // Check quality gate
        if (qualityScore >= stage.qualityGate) {
          return { result: output.result, qualityScore, latency };
        }

        // Quality below gate threshold — retry if attempts remain
        if (qualityScore < QUALITY_GATES.FAIL) {
          lastError = new Error(`Quality score ${qualityScore.toFixed(3)} below FAIL threshold`);
        } else {
          lastError = new Error(`Quality score ${qualityScore.toFixed(3)} below gate ${stage.qualityGate.toFixed(3)}`);
        }

      } catch (error) {
        lastError = error;
      }

      // φ-backoff between retries
      if (attempt < stage.retries) {
        const backoff = Math.round(PHI * 1000 * Math.pow(PHI, attempt));
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }

    throw lastError || new Error(`Stage ${stage.name} failed after ${stage.retries} retries`);
  }

  /**
   * Build input for a stage from its dependency outputs
   */
  _buildStageInput(stage, runState) {
    if (stage.dependencies.length === 0) {
      return runState.input;
    }

    const depOutputs = {};
    for (const dep of stage.dependencies) {
      depOutputs[dep] = runState.stageResults.get(dep);
    }

    return {
      ...runState.input,
      _pipelineContext: depOutputs,
    };
  }

  _collectStageReport(runState) {
    return this.stages.map(s => ({
      id: s.id,
      name: s.name,
      status: runState.stageStatuses.get(s.id),
      hasResult: runState.stageResults.has(s.id),
    }));
  }

  _findFailedStage(runState) {
    for (const [id, status] of runState.stageStatuses) {
      if (status === 'failed') return id;
    }
    return null;
  }

  _summarizeInput(input) {
    if (typeof input === 'string') return input.slice(0, FIB[8] * 10); // 210 chars
    if (input?.prompt) return input.prompt.slice(0, FIB[8] * 10);
    return '[structured input]';
  }

  _recordRun(result) {
    this.runHistory.push(result);
    if (this.runHistory.length > this.maxRunHistory) {
      this.runHistory.shift();
    }
  }
}

export { STAGE_DEFINITIONS, QUALITY_GATES };
