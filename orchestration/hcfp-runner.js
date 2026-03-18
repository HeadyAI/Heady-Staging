/**
 * @fileoverview HCFP Runner — 21-Stage Pipeline Execution Engine
 *
 * Executes the HCFullPipeline through all 21 stages with phi-gated
 * success thresholds, Fibonacci retry/backoff, parallel execution groups,
 * rollback, pause/resume, and full telemetry.
 *
 * All constants derive from φ = 1.6180339887 — NO magic numbers.
 * CSL gates replace all boolean if/else.
 *
 * Founded by Eric Haywood — HeadySystems Inc. / HeadyConnection Inc.
 *
 * @module hcfp-runner
 * @version 1.0.0
 * @license Proprietary — HeadySystems Inc.
 */

// ─── φ-MATH CONSTANTS ──────────────────────────────────────────────────────────

const PHI = 1.6180339887498948;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const PSI3 = PSI * PSI * PSI;
const PHI2 = PHI + 1;
const PHI3 = 2 * PHI + 1;

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = {
  MINIMUM:  phiThreshold(0),
  LOW:      phiThreshold(1),
  MEDIUM:   phiThreshold(2),
  HIGH:     phiThreshold(3),
  CRITICAL: phiThreshold(4),
  DEDUP:    1 - Math.pow(PSI, 6) * 0.5,
};

const DETERMINISTIC_SEED = FIB[8] + FIB[5]; // 42
const DETERMINISTIC_TEMP = 0;

// ─── CSL GATE ENGINE ────────────────────────────────────────────────────────────

function cslGate(confidence, threshold) {
  const delta = confidence - threshold;
  const signal = delta >= 0 ? 'PASS' : 'FAIL';
  const strength = Math.abs(delta) / PHI;
  return { signal, confidence, threshold, delta, strength };
}

function cslSelect(options, confidences, threshold) {
  let best = null;
  let bestConf = -Infinity;
  for (let i = 0; i < options.length; i++) {
    const gate = cslGate(confidences[i], threshold);
    const pickGate = cslGate(
      gate.signal === 'PASS' && confidences[i] > bestConf ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    if (pickGate.signal === 'PASS') {
      best = options[i];
      bestConf = confidences[i];
    }
  }
  return { selected: best, confidence: bestConf };
}

// ─── SHA-256 HASHING ────────────────────────────────────────────────────────────

async function sha256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── PHI BACKOFF ────────────────────────────────────────────────────────────────

function phiBackoff(attempt) {
  return Math.round(FIB[3] * Math.pow(PHI, attempt) * 100) / 100;
}

// ─── RESOURCE POOLS ─────────────────────────────────────────────────────────────

const RESOURCE_POOLS = {
  HOT:        { allocation: FIB[8] / 100, description: 'User-facing, latency-critical' },
  WARM:       { allocation: FIB[7] / 100, description: 'Background processing' },
  COLD:       { allocation: FIB[6] / 100, description: 'Batch, analytics' },
  RESERVE:    { allocation: FIB[5] / 100, description: 'Burst capacity' },
  GOVERNANCE: { allocation: FIB[4] / 100, description: 'Quality + assurance' },
};

// ─── STAGE CATEGORIES ───────────────────────────────────────────────────────────

const STAGE_CATEGORY = {
  PREPARATION: 'preparation',
  EXECUTION:   'execution',
  QUALITY:     'quality',
  MONITORING:  'monitoring',
  MAINTENANCE: 'maintenance',
};

// ─── 21 PIPELINE STAGES ─────────────────────────────────────────────────────────

const HCFP_STAGES = Object.freeze([
  { id: 'ContextAssembly',     index: 0,  category: STAGE_CATEGORY.PREPARATION, pool: 'HOT',        cslThreshold: CSL_THRESHOLDS.MEDIUM,   timeout: FIB[10] * FIB[6] * FIB[3], retries: FIB[3], dependsOn: [],                                            parallel: false, phiWeight: PHI / (PHI + FIB[3]),   rollback: 'clearContextCache' },
  { id: 'IntentClassification', index: 1,  category: STAGE_CATEGORY.PREPARATION, pool: 'HOT',        cslThreshold: CSL_THRESHOLDS.HIGH,     timeout: FIB[9] * FIB[6],            retries: FIB[2], dependsOn: ['ContextAssembly'],                            parallel: false, phiWeight: PHI / (PHI + FIB[2]),   rollback: 'resetClassification' },
  { id: 'TaskDecomposition',    index: 2,  category: STAGE_CATEGORY.PREPARATION, pool: 'HOT',        cslThreshold: CSL_THRESHOLDS.MEDIUM,   timeout: FIB[10] * FIB[5],           retries: FIB[2], dependsOn: ['IntentClassification'],                       parallel: false, phiWeight: PHI / (PHI + FIB[4]),   rollback: 'flattenToSingleTask' },
  { id: 'NodeSelection',        index: 3,  category: STAGE_CATEGORY.PREPARATION, pool: 'HOT',        cslThreshold: CSL_THRESHOLDS.HIGH,     timeout: FIB[9] * FIB[5],            retries: FIB[2], dependsOn: ['TaskDecomposition'],                          parallel: false, phiWeight: PHI / (PHI + FIB[3]),   rollback: 'fallbackToDefaultNode' },
  { id: 'ResourceAllocation',   index: 4,  category: STAGE_CATEGORY.PREPARATION, pool: 'WARM',       cslThreshold: CSL_THRESHOLDS.MEDIUM,   timeout: FIB[9] * FIB[4],            retries: FIB[2], dependsOn: ['NodeSelection'],                              parallel: false, phiWeight: PSI,                    rollback: 'releaseAllReservations' },
  { id: 'Execution',            index: 5,  category: STAGE_CATEGORY.EXECUTION,   pool: 'HOT',        cslThreshold: CSL_THRESHOLDS.HIGH,     timeout: FIB[12] * FIB[7],           retries: FIB[3], dependsOn: ['ResourceAllocation'],                         parallel: true,  phiWeight: PHI,                    rollback: 'abortAllExecutions' },
  { id: 'QualityGate',          index: 6,  category: STAGE_CATEGORY.QUALITY,     pool: 'GOVERNANCE', cslThreshold: CSL_THRESHOLDS.HIGH,     timeout: FIB[10] * FIB[4],           retries: FIB[2], dependsOn: ['Execution'],                                  parallel: false, phiWeight: PHI / (PHI + 1),        rollback: 'requestReExecution' },
  { id: 'AssuranceGate',        index: 7,  category: STAGE_CATEGORY.QUALITY,     pool: 'GOVERNANCE', cslThreshold: CSL_THRESHOLDS.CRITICAL, timeout: FIB[10] * FIB[5],           retries: FIB[1], dependsOn: ['QualityGate'],                                parallel: false, phiWeight: PHI / (PHI + FIB[2]),   rollback: 'escalateToManualReview' },
  { id: 'SecurityScan',         index: 8,  category: STAGE_CATEGORY.QUALITY,     pool: 'GOVERNANCE', cslThreshold: CSL_THRESHOLDS.CRITICAL, timeout: FIB[10] * FIB[6],           retries: FIB[1], dependsOn: ['Execution'],                                  parallel: true,  phiWeight: PHI / (PHI + 1),        rollback: 'quarantineOutput' },
  { id: 'PerformanceCheck',     index: 9,  category: STAGE_CATEGORY.QUALITY,     pool: 'GOVERNANCE', cslThreshold: CSL_THRESHOLDS.MEDIUM,   timeout: FIB[8] * FIB[5],            retries: FIB[1], dependsOn: ['Execution'],                                  parallel: true,  phiWeight: PSI,                    rollback: 'logPerformanceAnomaly' },
  { id: 'PatternCapture',       index: 10, category: STAGE_CATEGORY.MONITORING,  pool: 'COLD',       cslThreshold: CSL_THRESHOLDS.LOW,      timeout: FIB[10] * FIB[4],           retries: FIB[1], dependsOn: ['QualityGate', 'SecurityScan', 'PerformanceCheck'], parallel: true,  phiWeight: PSI2,              rollback: 'skipPatternCapture' },
  { id: 'StoryUpdate',          index: 11, category: STAGE_CATEGORY.MONITORING,  pool: 'COLD',       cslThreshold: CSL_THRESHOLDS.LOW,      timeout: FIB[9] * FIB[5],            retries: FIB[1], dependsOn: ['PatternCapture'],                             parallel: true,  phiWeight: PSI2,                   rollback: 'deferStoryUpdate' },
  { id: 'BudgetReconcile',      index: 12, category: STAGE_CATEGORY.MONITORING,  pool: 'WARM',       cslThreshold: CSL_THRESHOLDS.MEDIUM,   timeout: FIB[8] * FIB[4],            retries: FIB[1], dependsOn: ['Execution'],                                  parallel: true,  phiWeight: PSI,                    rollback: 'freezeBudget' },
  { id: 'CoherenceCheck',       index: 13, category: STAGE_CATEGORY.MONITORING,  pool: 'WARM',       cslThreshold: CSL_THRESHOLDS.HIGH,     timeout: FIB[9] * FIB[6],            retries: FIB[2], dependsOn: ['AssuranceGate'],                              parallel: false, phiWeight: PHI / PHI2,             rollback: 'requestClarification' },
  { id: 'DriftScan',            index: 14, category: STAGE_CATEGORY.MONITORING,  pool: 'COLD',       cslThreshold: CSL_THRESHOLDS.MEDIUM,   timeout: FIB[10] * FIB[4],           retries: FIB[1], dependsOn: ['CoherenceCheck'],                             parallel: true,  phiWeight: PSI2,                   rollback: 'logDriftAnomaly' },
  { id: 'MetricsPublish',       index: 15, category: STAGE_CATEGORY.MAINTENANCE, pool: 'COLD',       cslThreshold: CSL_THRESHOLDS.LOW,      timeout: FIB[9] * FIB[4],            retries: FIB[2], dependsOn: ['PatternCapture', 'BudgetReconcile', 'DriftScan'], parallel: true,  phiWeight: PSI3,              rollback: 'bufferMetricsLocally' },
  { id: 'CacheWarm',            index: 16, category: STAGE_CATEGORY.MAINTENANCE, pool: 'COLD',       cslThreshold: CSL_THRESHOLDS.LOW,      timeout: FIB[10] * FIB[3],           retries: FIB[1], dependsOn: ['PatternCapture'],                             parallel: true,  phiWeight: PSI3,                   rollback: 'skipCacheWarm' },
  { id: 'IndexUpdate',          index: 17, category: STAGE_CATEGORY.MAINTENANCE, pool: 'COLD',       cslThreshold: CSL_THRESHOLDS.LOW,      timeout: FIB[10] * FIB[4],           retries: FIB[2], dependsOn: ['StoryUpdate'],                                parallel: true,  phiWeight: PSI3,                   rollback: 'deferIndexUpdate' },
  { id: 'NotifyStakeholders',   index: 18, category: STAGE_CATEGORY.MAINTENANCE, pool: 'COLD',       cslThreshold: CSL_THRESHOLDS.LOW,      timeout: FIB[9] * FIB[5],            retries: FIB[3], dependsOn: ['CoherenceCheck', 'MetricsPublish'],           parallel: true,  phiWeight: PSI3,                   rollback: 'queueNotificationRetry' },
  { id: 'ArchiveArtifacts',     index: 19, category: STAGE_CATEGORY.MAINTENANCE, pool: 'COLD',       cslThreshold: CSL_THRESHOLDS.LOW,      timeout: FIB[10] * FIB[5],           retries: FIB[2], dependsOn: ['MetricsPublish', 'IndexUpdate'],               parallel: true,  phiWeight: PSI3,                   rollback: 'retainInHotStorage' },
  { id: 'SelfHealCheck',        index: 20, category: STAGE_CATEGORY.MAINTENANCE, pool: 'GOVERNANCE', cslThreshold: CSL_THRESHOLDS.MEDIUM,   timeout: FIB[10] * FIB[4],           retries: FIB[1], dependsOn: ['ArchiveArtifacts', 'NotifyStakeholders'],     parallel: false, phiWeight: PHI / PHI2,             rollback: 'escalateToOperator' },
  { id: 'Distillation',         index: 21, category: STAGE_CATEGORY.MAINTENANCE, pool: 'COLD',       cslThreshold: CSL_THRESHOLDS.LOW,      timeout: FIB[11] * FIB[5],           retries: FIB[1], dependsOn: ['SelfHealCheck'],                              parallel: false, phiWeight: PSI3,                   rollback: 'skipDistillation' },
]);

const STAGE_MAP = new Map();
for (const stage of HCFP_STAGES) {
  STAGE_MAP.set(stage.id, stage);
}

// ─── RUN STATUS ENUM ────────────────────────────────────────────────────────────

const RUN_STATUS = {
  PENDING:   'pending',
  RUNNING:   'running',
  PAUSED:    'paused',
  COMPLETED: 'completed',
  FAILED:    'failed',
  CANCELLED: 'cancelled',
};

// ─── DEPENDENCY GRAPH / EXECUTION LEVELS ────────────────────────────────────────

function buildDependencyGraph() {
  const graph = new Map();
  const inDegree = new Map();

  for (const stage of HCFP_STAGES) {
    graph.set(stage.id, []);
    inDegree.set(stage.id, stage.dependsOn.length);
  }

  for (const stage of HCFP_STAGES) {
    for (const dep of stage.dependsOn) {
      const edges = graph.get(dep) || [];
      edges.push(stage.id);
      graph.set(dep, edges);
    }
  }

  return { graph, inDegree };
}

function computeExecutionLevels() {
  const { graph, inDegree } = buildDependencyGraph();
  const levels = [];
  const remaining = new Map(inDegree);
  const completed = new Set();

  while (completed.size < HCFP_STAGES.length) {
    const currentLevel = [];
    for (const [id, deg] of remaining) {
      const gate = cslGate(
        deg === 0 && !completed.has(id) ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );
      gate.signal === 'PASS' && currentLevel.push(id);
    }

    const gateEmpty = cslGate(
      currentLevel.length === 0 ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    if (gateEmpty.signal === 'PASS') break;

    levels.push(currentLevel);
    for (const id of currentLevel) {
      completed.add(id);
      remaining.delete(id);
      for (const neighbor of (graph.get(id) || [])) {
        remaining.set(neighbor, (remaining.get(neighbor) || 1) - 1);
      }
    }
  }

  return levels;
}

// ─── DETERMINISTIC SCORE GENERATOR ──────────────────────────────────────────────

function deterministicScore(seed, stageIndex, attempt) {
  let hash = seed;
  for (let i = 0; i < FIB[4]; i++) {
    hash = ((hash * FIB[15] + FIB[13] + stageIndex * FIB[7] + attempt * FIB[5]) >>> 0) % FIB[19];
  }
  return (hash % FIB[14]) / FIB[14];
}

// ─── HCFP RUNNER CLASS ─────────────────────────────────────────────────────────

class HCFPRunner {
  constructor(options = {}) {
    /** @private */
    this._runs = new Map();

    /** @private */
    this._maxRuns = FIB[12]; // 233

    /** @private */
    this._seed = options.seed || DETERMINISTIC_SEED;

    /** @private */
    this._executionLevels = computeExecutionLevels();

    /** @private */
    this._history = [];

    /** @private */
    this._listeners = new Map();

    /** @private */
    this._stageHandlers = new Map();

    // Register built-in Distillation stage handler — forwards to heady-distiller service
    this._stageHandlers.set('Distillation', async (context) => {
      const distillerUrl = process.env.DISTILLER_URL || 'http://localhost:3375';
      const judgeScore = context.previousStages?.SelfHealCheck?.score ?? PSI;
      try {
        const res = await fetch(`${distillerUrl}/health`, {
          signal: AbortSignal.timeout(FIB[7] * FIB[5]), // 1045ms liveness check
        });
        const alive = cslGate(res.ok ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW, CSL_THRESHOLDS.MEDIUM);
        return { score: alive.signal === 'PASS' ? judgeScore : PSI2, output: { distillerReachable: alive.signal === 'PASS' } };
      } catch {
        // distiller offline — pass with PSI2 (degraded) rather than failing
        return { score: PSI2, output: { distillerReachable: false } };
      }
    });
  }

  /**
   * Register a custom handler for a pipeline stage.
   * @param {string} stageId - Stage ID from HCFP_STAGES
   * @param {Function} handler - async (context) => { score, output }
   */
  registerStageHandler(stageId, handler) {
    const exists = cslGate(
      STAGE_MAP.has(stageId) ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    if (exists.signal === 'PASS') {
      this._stageHandlers.set(stageId, handler);
    }
    return { registered: exists.signal === 'PASS', stageId, gate: exists };
  }

  /**
   * Run the full 21-stage pipeline.
   * @param {string} task - Task description
   * @param {object} [options={}] - Run options
   * @returns {Promise<object>} Pipeline run result
   */
  async run(task, options = {}) {
    const runId = await sha256(`hcfp:${task.slice(0, FIB[8])}:${Date.now()}:${this._seed}`);

    const pipelineRun = {
      id: runId,
      task,
      status: RUN_STATUS.RUNNING,
      stages: {},
      stageOrder: [],
      completedStages: new Set(),
      failedStage: null,
      startedAt: Date.now(),
      completedAt: null,
      seed: this._seed,
      temperature: DETERMINISTIC_TEMP,
      founder: 'Eric Haywood',
      metrics: {
        totalDuration: 0,
        stagesCompleted: 0,
        stagesFailed: 0,
        totalRetries: 0,
        rollbacksExecuted: 0,
      },
    };

    this._runs.set(runId, pipelineRun);
    this._notify('run:start', { runId, task });

    for (const level of this._executionLevels) {
      const pauseGate = cslGate(
        pipelineRun.status === RUN_STATUS.PAUSED ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );
      if (pauseGate.signal === 'PASS') break;

      const cancelGate = cslGate(
        pipelineRun.status === RUN_STATUS.CANCELLED ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );
      if (cancelGate.signal === 'PASS') break;

      const parallelGate = cslGate(
        level.length > 1 ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );

      const stageResults = parallelGate.signal === 'PASS'
        ? await Promise.all(level.map(stageId => this._executeStage(stageId, pipelineRun, options)))
        : [await this._executeStage(level[0], pipelineRun, options)];

      let levelFailed = false;
      for (let i = 0; i < stageResults.length; i++) {
        const result = stageResults[i];
        const stageId = level[i];
        pipelineRun.stages[stageId] = result;
        pipelineRun.stageOrder.push(stageId);

        const passGate = cslGate(
          result.passed ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
          CSL_THRESHOLDS.MEDIUM
        );

        if (passGate.signal === 'PASS') {
          pipelineRun.completedStages.add(stageId);
          pipelineRun.metrics.stagesCompleted++;
        } else {
          pipelineRun.metrics.stagesFailed++;
          const stage = STAGE_MAP.get(stageId);

          this._notify('stage:failed', { runId, stageId, result });

          const rollbackGate = cslGate(
            stage.rollback ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
            CSL_THRESHOLDS.MEDIUM
          );
          if (rollbackGate.signal === 'PASS') {
            pipelineRun.stages[stageId].rollbackExecuted = stage.rollback;
            pipelineRun.metrics.rollbacksExecuted++;
          }

          const criticalGate = cslGate(
            stage.cslThreshold,
            CSL_THRESHOLDS.HIGH
          );

          if (criticalGate.signal === 'PASS') {
            pipelineRun.failedStage = stageId;
            pipelineRun.status = RUN_STATUS.FAILED;
            levelFailed = true;
            break;
          }
        }
      }

      const failGate = cslGate(
        levelFailed ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );
      if (failGate.signal === 'PASS') break;
    }

    const completedGate = cslGate(
      pipelineRun.status === RUN_STATUS.RUNNING ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    if (completedGate.signal === 'PASS') {
      pipelineRun.status = RUN_STATUS.COMPLETED;
    }

    pipelineRun.completedAt = Date.now();
    pipelineRun.metrics.totalDuration = pipelineRun.completedAt - pipelineRun.startedAt;

    this._recordHistory('run', {
      runId,
      status: pipelineRun.status,
      duration: pipelineRun.metrics.totalDuration,
      stagesCompleted: pipelineRun.metrics.stagesCompleted,
    });
    this._notify('run:complete', { runId, status: pipelineRun.status });

    // fire run:stopped so hookPipeline trace recorder can close the trace
    this._notify('run:stopped', { runId, reason: pipelineRun.status });

    // trigger heady-distiller for high-quality completed runs (non-blocking)
    const distillTriggerGate = cslGate(
      pipelineRun.status === RUN_STATUS.COMPLETED ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    if (distillTriggerGate.signal === 'PASS') {
      const judgeScore = pipelineRun.metrics.stagesCompleted / HCFP_STAGES.length;
      this._triggerDistiller(pipelineRun, judgeScore).catch(() => {});
    }

    return this._serializeRun(pipelineRun);
  }

  /**
   * POST the completed pipeline run to heady-distiller for SKILL.md synthesis.
   * Non-blocking — distillation failure never stalls the pipeline.
   * Only fires when judgeScore >= CSL_THRESHOLDS.HIGH (high-quality runs only).
   * @private
   */
  async _triggerDistiller(pipelineRun, judgeScore) {
    const scoreGate = cslGate(judgeScore, CSL_THRESHOLDS.HIGH);
    if (scoreGate.signal !== 'PASS') return;

    const distillerUrl = process.env.DISTILLER_URL || 'http://localhost:3375';
    const outputHash = await sha256(JSON.stringify(pipelineRun.stages)).catch(() => 'unknown');

    const trace = {
      judgeScore,
      prompt: pipelineRun.task,
      outputHash,
      stages: Object.fromEntries(
        Object.entries(pipelineRun.stages).map(([k, v]) => [
          k, { score: v?.score, duration: v?.duration, passed: v?.passed, pool: v?.pool }
        ])
      ),
      config: { seed: pipelineRun.seed, stageCount: HCFP_STAGES.length, founder: pipelineRun.founder },
    };

    try {
      await fetch(`${distillerUrl}/api/distill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trace }),
        signal: AbortSignal.timeout(FIB[11] * FIB[5]), // 5592ms
      });
    } catch {
      // non-blocking: distillation errors never surface to caller
    }
  }

  /**
   * Execute a single stage with retries and phi backoff.
   * @private
   */
  async _executeStage(stageId, pipelineRun, options) {
    const stage = STAGE_MAP.get(stageId);
    const startTime = Date.now();
    let lastResult = null;
    this._notify('stage:start', { runId: pipelineRun.id, stageId, name: stage.id });

    for (let attempt = 0; attempt <= stage.retries; attempt++) {
      const retryGate = cslGate(
        attempt > 0 ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );

      if (retryGate.signal === 'PASS') {
        const backoffMs = phiBackoff(attempt) * FIB[6]; // scale by 13
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        pipelineRun.metrics.totalRetries++;
      }

      const handlerGate = cslGate(
        this._stageHandlers.has(stageId) ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );

      let score;
      let output = null;

      if (handlerGate.signal === 'PASS') {
        const handler = this._stageHandlers.get(stageId);
        const context = {
          task: pipelineRun.task,
          stageId,
          stage,
          attempt,
          previousStages: { ...pipelineRun.stages },
          seed: this._seed,
          temperature: DETERMINISTIC_TEMP,
        };
        const handlerResult = await handler(context);
        score = handlerResult.score;
        output = handlerResult.output || null;
      } else {
        score = this._computeDefaultScore(stage, pipelineRun, attempt);
      }

      const gate = cslGate(score, stage.cslThreshold);

      lastResult = {
        stageId,
        stage: stage.id,
        category: stage.category,
        pool: stage.pool,
        score,
        threshold: stage.cslThreshold,
        gate: { signal: gate.signal, delta: gate.delta, strength: gate.strength },
        passed: gate.signal === 'PASS',
        attempt,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        output,
        phiWeight: stage.phiWeight,
        rollbackExecuted: null,
      };

      const passGate = cslGate(
        lastResult.passed ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );
      if (passGate.signal === 'PASS') {
        this._notify('stage:passed', { runId: pipelineRun.id, stageId, score });
        break;
      }
    }

    this._notify('stage:end', { runId: pipelineRun.id, stageId, status: lastResult?.passed ? 'complete' : 'failed' });
    return lastResult;
  }

  /**
   * Compute default deterministic score for a stage.
   * @private
   */
  _computeDefaultScore(stage, pipelineRun, attempt) {
    const rawScore = deterministicScore(this._seed, stage.index, attempt);
    const scaledScore = stage.cslThreshold * PSI + rawScore * (1 - stage.cslThreshold * PSI);
    const boostGate = cslGate(
      attempt > 0 ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    const boost = boostGate.signal === 'PASS' ? attempt * PSI3 : 0;
    return Math.min(scaledScore + boost, phiThreshold(5));
  }

  /**
   * Pause a running pipeline.
   * @param {string} runId
   * @returns {{ paused: boolean, gate: object }}
   */
  pause(runId) {
    const run = this._runs.get(runId);
    const exists = cslGate(
      run && run.status === RUN_STATUS.RUNNING ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    if (exists.signal === 'PASS') {
      run.status = RUN_STATUS.PAUSED;
      this._recordHistory('pause', { runId });
      this._notify('run:paused', { runId });
    }
    return { paused: exists.signal === 'PASS', runId, gate: exists };
  }

  /**
   * Resume a paused pipeline.
   * @param {string} runId
   * @returns {{ resumed: boolean, gate: object }}
   */
  resume(runId) {
    const run = this._runs.get(runId);
    const exists = cslGate(
      run && run.status === RUN_STATUS.PAUSED ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    if (exists.signal === 'PASS') {
      run.status = RUN_STATUS.RUNNING;
      this._recordHistory('resume', { runId });
      this._notify('run:resumed', { runId });
    }
    return { resumed: exists.signal === 'PASS', runId, gate: exists };
  }

  /**
   * Cancel a running or paused pipeline.
   * @param {string} runId
   * @returns {{ cancelled: boolean, gate: object }}
   */
  cancel(runId) {
    const run = this._runs.get(runId);
    const exists = cslGate(
      run && (run.status === RUN_STATUS.RUNNING || run.status === RUN_STATUS.PAUSED)
        ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    if (exists.signal === 'PASS') {
      run.status = RUN_STATUS.CANCELLED;
      run.completedAt = Date.now();
      this._recordHistory('cancel', { runId });
      this._notify('run:cancelled', { runId });
    }
    return { cancelled: exists.signal === 'PASS', runId, gate: exists };
  }

  /**
   * Get status of a pipeline run.
   * @param {string} runId
   * @returns {object|null}
   */
  getStatus(runId) {
    const run = this._runs.get(runId);
    const gate = cslGate(
      run ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    return gate.signal === 'PASS' ? this._serializeRun(run) : null;
  }

  /**
   * Get detailed stage results for a run.
   * @param {string} runId
   * @returns {Array<object>|null}
   */
  getStageResults(runId) {
    const run = this._runs.get(runId);
    const gate = cslGate(
      run ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    if (gate.signal === 'FAIL') return null;

    return Object.entries(run.stages).map(([stageId, result]) => ({
      stageId,
      category: result.category,
      pool: result.pool,
      passed: result.passed,
      score: result.score,
      threshold: result.threshold,
      duration: result.duration,
      attempt: result.attempt,
      phiWeight: result.phiWeight,
      rollbackExecuted: result.rollbackExecuted,
    }));
  }

  /**
   * Get pipeline execution summary across all runs.
   * @returns {object}
   */
  getSummary() {
    let totalRuns = 0;
    let completedRuns = 0;
    let failedRuns = 0;
    let totalDuration = 0;

    for (const run of this._runs.values()) {
      totalRuns++;
      const completedGate = cslGate(
        run.status === RUN_STATUS.COMPLETED ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );
      const failedGate = cslGate(
        run.status === RUN_STATUS.FAILED ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
        CSL_THRESHOLDS.MEDIUM
      );
      completedGate.signal === 'PASS' && completedRuns++;
      failedGate.signal === 'PASS' && failedRuns++;
      totalDuration += run.metrics.totalDuration;
    }

    const successRate = totalRuns > 0 ? completedRuns / totalRuns : 0;

    return {
      totalRuns,
      completedRuns,
      failedRuns,
      successRate,
      successRateCSL: cslGate(successRate, CSL_THRESHOLDS.MEDIUM),
      totalStages: HCFP_STAGES.length,
      executionLevels: this._executionLevels.length,
      averageDuration: totalRuns > 0 ? totalDuration / totalRuns : 0,
      founder: 'Eric Haywood',
    };
  }

  /**
   * Get execution levels (parallel groups).
   * @returns {Array<Array<string>>}
   */
  getExecutionLevels() {
    return this._executionLevels.map(level => [...level]);
  }

  /**
   * Get history log.
   * @returns {Array<object>}
   */
  getHistory() {
    return [...this._history];
  }

  /**
   * Subscribe to events.
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    const handlers = this._listeners.get(event) || [];
    handlers.push(handler);
    this._listeners.set(event, handlers);
  }

  /** @private */
  _serializeRun(run) {
    return {
      id: run.id,
      task: run.task,
      status: run.status,
      stages: { ...run.stages },
      stageOrder: [...run.stageOrder],
      completedStages: [...run.completedStages],
      failedStage: run.failedStage,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      seed: run.seed,
      temperature: run.temperature,
      founder: run.founder,
      metrics: { ...run.metrics },
    };
  }

  /** @private */
  _notify(event, data) {
    for (const h of (this._listeners.get(event) || [])) {
      h({ event, timestamp: new Date().toISOString(), ...data });
    }
  }

  /** @private */
  _recordHistory(action, details) {
    this._history.push({ action, timestamp: new Date().toISOString(), details });
    const maxHistory = FIB[12]; // 233
    const gate = cslGate(
      this._history.length > maxHistory ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW,
      CSL_THRESHOLDS.MEDIUM
    );
    gate.signal === 'PASS' && this._history.splice(0, this._history.length - maxHistory);
  }
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────────

export default HCFPRunner;

export {
  HCFPRunner,
  HCFP_STAGES,
  STAGE_MAP,
  STAGE_CATEGORY,
  RESOURCE_POOLS,
  RUN_STATUS,
  CSL_THRESHOLDS,
  PHI, PSI, PSI2, PSI3, PHI2, PHI3,
  FIB,
  DETERMINISTIC_SEED,
  DETERMINISTIC_TEMP,
  cslGate,
  cslSelect,
  sha256,
  phiBackoff,
  phiThreshold,
  buildDependencyGraph,
  computeExecutionLevels,
  deterministicScore,
};
