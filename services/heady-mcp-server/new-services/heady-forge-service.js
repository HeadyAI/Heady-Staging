'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };

const SERVICE_NAME = 'heady-forge-service';
const PORT = 3408;
const startTime = Date.now();

const PIPELINE_STAGES = ['lint', 'build', 'unit-test', 'integration-test', 'security-scan', 'deploy'];
const ROLLOUT_FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 100];

/** Structured JSON logger with correlation ID support. */
function log(level, msg, meta = {}) {
  const entry = { timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failures = 0;
    this.threshold = opts.threshold || FIB[8];
    this.resetTimeout = opts.resetTimeout || FIB[10] * 1000;
    this.lastFailure = 0;
  }
  async execute(fn) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailure;
      const backoff = this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]));
      if (elapsed < backoff) throw new Error(`Circuit ${this.name} OPEN`);
      this.state = 'HALF_OPEN';
    }
    try {
      const result = await fn();
      this.failures = 0; this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'OPEN';
      throw err;
    }
  }
}

const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) {
  log('info', `${signal} received, graceful shutdown`);
  while (shutdownHandlers.length) await shutdownHandlers.pop()();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/** Simulates a pipeline stage execution with realistic timing and outcomes. */
async function simulateStage(stage, repo, branch) {
  const baseDelay = FIB[4] * 100; // 300ms simulated
  const jitter = Math.random() * FIB[3] * 100;
  await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
  const coherence = CSL.MEDIUM + Math.random() * (CSL.HIGH - CSL.MEDIUM);
  const success = Math.random() > POOLS.GOVERNANCE; // 95% success rate
  return {
    stage, status: success ? 'passed' : 'failed', duration: Math.round(baseDelay + jitter),
    coherence: parseFloat(coherence.toFixed(4)), artifacts: success ? [`${repo}/${branch}/${stage}-output`] : [],
    logs: success ? [`${stage}: all checks passed`] : [`${stage}: failure detected, phi-backoff recommended`],
  };
}

/**
 * ForgeBee — CI/CD pipeline orchestrator with Fibonacci-staged rollouts.
 * Manages pipeline runs with per-stage circuit breakers and phi-backoff retries.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class ForgeBee {
  constructor() {
    this.pipelines = new Map();
    this.rollouts = new Map();
    this.stageBreakers = {};
    for (const stage of PIPELINE_STAGES) {
      this.stageBreakers[stage] = new CircuitBreaker(`forge-${stage}`, { threshold: FIB[6], resetTimeout: FIB[9] * 1000 });
    }
    this.stats = { pipelinesCreated: 0, stagesRun: 0, stagesPassed: 0, stagesFailed: 0, rolloutsAdvanced: 0, rollbacks: 0 };
  }
  /** Initialize the bee. */
  spawn() { log('info', 'ForgeBee spawned', { phase: 'spawn' }); this.spawnedAt = Date.now(); }

  /**
   * Execute a full pipeline run through the specified stages.
   * @param {{ id: string, repo: string, branch: string, stages: string[] }} pipeline
   * @returns {Promise<object>} Pipeline results with per-stage outcomes.
   */
  async execute(pipeline) {
    const results = [];
    let allPassed = true;
    for (const stage of pipeline.stages) {
      const breaker = this.stageBreakers[stage];
      if (!breaker) { results.push({ stage, status: 'skipped', reason: 'unknown stage' }); continue; }
      this.stats.stagesRun++;
      try {
        const result = await breaker.execute(() => simulateStage(stage, pipeline.repo, pipeline.branch));
        results.push(result);
        if (result.status === 'failed') {
          allPassed = false;
          this.stats.stagesFailed++;
          log('warn', 'Pipeline stage failed', { pipelineId: pipeline.id, stage, breaker: breaker.state });
          break;
        }
        this.stats.stagesPassed++;
      } catch (err) {
        allPassed = false;
        this.stats.stagesFailed++;
        results.push({ stage, status: 'error', error: err.message });
        log('error', 'Stage breaker tripped', { pipelineId: pipeline.id, stage, error: err.message });
        break;
      }
    }
    const pipelineStatus = allPassed ? 'success' : 'failed';
    const avgCoherence = results.filter(r => r.coherence).reduce((s, r) => s + r.coherence, 0) / Math.max(results.filter(r => r.coherence).length, 1);
    const record = { ...pipeline, status: pipelineStatus, stages: results, startedAt: pipeline.startedAt, completedAt: Date.now(), coherence: parseFloat(avgCoherence.toFixed(4)) };
    this.pipelines.set(pipeline.id, record);
    if (allPassed) {
      this.rollouts.set(pipeline.id, { pipelineId: pipeline.id, currentIndex: 0, percentage: ROLLOUT_FIBONACCI[0], history: [{ percentage: ROLLOUT_FIBONACCI[0], at: Date.now() }], status: 'active' });
    }
    return record;
  }

  /** Advance a rollout to the next Fibonacci percentage stage. */
  advanceRollout(pipelineId) {
    const rollout = this.rollouts.get(pipelineId);
    if (!rollout) return null;
    if (rollout.currentIndex >= ROLLOUT_FIBONACCI.length - 1) return { ...rollout, status: 'complete', message: 'Rollout at 100%' };
    rollout.currentIndex++;
    rollout.percentage = ROLLOUT_FIBONACCI[rollout.currentIndex];
    rollout.history.push({ percentage: rollout.percentage, at: Date.now() });
    rollout.status = rollout.percentage === 100 ? 'complete' : 'active';
    this.stats.rolloutsAdvanced++;
    log('info', 'Rollout advanced', { pipelineId, percentage: rollout.percentage });
    return rollout;
  }

  /** Rollback using reverse Fibonacci stages (phi-staged rollback). */
  rollback(pipelineId) {
    const rollout = this.rollouts.get(pipelineId);
    if (!rollout) return null;
    if (rollout.currentIndex <= 0) return { ...rollout, status: 'rolled_back', message: 'Rollout fully rolled back' };
    rollout.currentIndex = Math.max(0, rollout.currentIndex - FIB[3]); // step back by 2
    rollout.percentage = ROLLOUT_FIBONACCI[rollout.currentIndex];
    rollout.history.push({ percentage: rollout.percentage, at: Date.now(), action: 'rollback' });
    rollout.status = 'rolling_back';
    this.stats.rollbacks++;
    log('warn', 'Rollout rolled back', { pipelineId, percentage: rollout.percentage });
    return rollout;
  }

  /** Return pipeline execution report. */
  report() { return { ...this.stats, activePipelines: this.pipelines.size, activeRollouts: [...this.rollouts.values()].filter(r => r.status === 'active').length, uptime: Date.now() - this.spawnedAt }; }
  /** Retire the bee. */
  retire() { log('info', 'ForgeBee retiring', { stats: this.stats }); }
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

const bee = new ForgeBee();
bee.spawn();

app.get('/health', (_req, res) => {
  const report = bee.report();
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: Date.now() - startTime, coherence: report.stagesFailed === 0 ? CSL.HIGH : CSL.LOW, timestamp: new Date().toISOString() });
});

/** POST /pipeline — Create and execute a new pipeline run. */
app.post('/pipeline', async (req, res) => {
  const { repo, branch, stages } = req.body;
  if (!repo || !branch) return res.status(400).json({ error: 'repo and branch are required' });
  const validStages = (stages || PIPELINE_STAGES).filter(s => PIPELINE_STAGES.includes(s));
  if (validStages.length === 0) return res.status(400).json({ error: 'No valid stages', available: PIPELINE_STAGES });
  const id = crypto.randomUUID();
  bee.stats.pipelinesCreated++;
  log('info', 'Pipeline created', { correlationId: req.correlationId, id, repo, branch, stages: validStages });
  try {
    const result = await bee.execute({ id, repo, branch, stages: validStages, startedAt: Date.now() });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /pipeline/:id — Get pipeline status with per-stage results. */
app.get('/pipeline/:id', (req, res) => {
  const pipeline = bee.pipelines.get(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
  const rollout = bee.rollouts.get(req.params.id);
  res.json({ pipeline, rollout: rollout || null });
});

/** POST /rollout/:id/advance — Advance rollout to next Fibonacci stage. */
app.post('/rollout/:id/advance', (req, res) => {
  const result = bee.advanceRollout(req.params.id);
  if (!result) return res.status(404).json({ error: 'Rollout not found' });
  log('info', 'Rollout advance requested', { correlationId: req.correlationId, pipelineId: req.params.id, percentage: result.percentage });
  res.json(result);
});

/** POST /rollout/:id/rollback — Phi-staged rollback (reverse Fibonacci). */
app.post('/rollout/:id/rollback', (req, res) => {
  const result = bee.rollback(req.params.id);
  if (!result) return res.status(404).json({ error: 'Rollout not found' });
  log('warn', 'Rollback requested', { correlationId: req.correlationId, pipelineId: req.params.id, percentage: result.percentage });
  res.json(result);
});

const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening`, { port: PORT }));
onShutdown(() => new Promise(resolve => { bee.retire(); server.close(resolve); }));

module.exports = { app, ForgeBee, PIPELINE_STAGES, ROLLOUT_FIBONACCI };
