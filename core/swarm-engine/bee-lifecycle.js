/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * HeadyBee Lifecycle — Complete bee agent lifecycle management
 * with 384D capability vectors, CSL-gated task assignment,
 * phi-weighted health scoring, and phi-backoff retry.
 *
 * Founder: Eric Haywood
 * @module core/swarm-engine/bee-lifecycle
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import phiMath from '@heady/phi-math-foundation';
const { PHI, PSI, fib, CSL_THRESHOLDS, EVICTION_WEIGHTS, phiBackoff, cslGate } = phiMath.default || phiMath;
import structuredLogger from '@heady/structured-logger';
const { createLogger } = structuredLogger.default || structuredLogger;

const logger = createLogger('bee-lifecycle');

const PSI2 = PSI * PSI;

/** Bee state machine */
const BEE_STATE = Object.freeze({
  SPAWNING:    'spawning',
  IDLE:        'idle',
  WORKING:     'working',
  PAUSED:      'paused',
  DRAINING:    'draining',
  TERMINATED:  'terminated',
});

/** Maximum task queue depth per bee */
const MAX_QUEUE_DEPTH = fib(12); // 144

/** Maximum retry attempts per task */
const MAX_RETRIES = fib(5); // 5

/**
 * Compute cosine similarity between two Float64Arrays.
 * @param {Float64Array|number[]} a
 * @param {Float64Array|number[]} b
 * @returns {number} -1 to 1
 */
function cosine(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Generate a deterministic 384D capability vector from a domain string.
 * In production, replaced by actual embedding models.
 * @param {string} domain
 * @param {number} dim
 * @returns {Float64Array}
 */
function domainToVector(domain, dim = 384) {
  const v = new Float64Array(dim);
  let hash = 5381;
  for (let i = 0; i < domain.length; i++) {
    hash = ((hash << 5) + hash + domain.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < dim; i++) {
    hash = ((hash << 5) + hash + i) >>> 0;
    v[i] = ((hash % 2000) - 1000) / 1000;
  }
  // Normalize
  let mag = 0;
  for (let i = 0; i < dim; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag);
  if (mag > 0) {
    for (let i = 0; i < dim; i++) v[i] /= mag;
  }
  return v;
}

class HeadyBee extends EventEmitter {
  /**
   * @param {object} config
   * @param {string} config.domain - Bee domain (e.g., 'deploy', 'research')
   * @param {string} config.swarmId - Parent swarm ID
   * @param {Float64Array} [config.vector] - 384D capability vector
   * @param {Function} [config.executor] - async (task) => result
   */
  constructor(config) {
    super();
    this.id = `bee-${randomUUID().slice(0, 12)}`;
    this.domain = config.domain;
    this.swarmId = config.swarmId;
    this.vector = config.vector || domainToVector(config.domain);
    this.state = BEE_STATE.SPAWNING;
    this._executor = config.executor || defaultExecutor;

    this.createdAt = Date.now();
    this.lastActiveAt = Date.now();
    this.tasksCompleted = 0;
    this.tasksFailed = 0;
    this.errorCount = 0;

    this.currentTask = null;
    this.taskQueue = [];

    this._healthScore = 1.0;
    this._uptimeStart = Date.now();
  }

  /**
   * Spawn the bee — transition from SPAWNING to IDLE.
   * @returns {HeadyBee}
   */
  spawn() {
    this.state = BEE_STATE.IDLE;
    this.emit('spawned', { beeId: this.id, domain: this.domain });
    logger.info('Bee spawned', { beeId: this.id, domain: this.domain, swarmId: this.swarmId });
    return this;
  }

  /**
   * Assign a task to this bee.
   * CSL-gated: only accepts if cosine(bee.vector, task.vector) >= CSL_THRESHOLDS.LOW
   *
   * @param {object} task - { id, vector, payload, type }
   * @returns {boolean} Whether the task was accepted
   */
  assignTask(task) {
    if (this.state === BEE_STATE.TERMINATED || this.state === BEE_STATE.DRAINING) {
      return false;
    }

    if (this.taskQueue.length >= MAX_QUEUE_DEPTH) {
      logger.warn('Bee queue full, rejecting task', { beeId: this.id, taskId: task.id });
      return false;
    }

    // CSL gate: check semantic compatibility
    if (task.vector) {
      const similarity = cosine(this.vector, task.vector);
      if (similarity < CSL_THRESHOLDS.LOW) {
        logger.info('Task rejected by CSL gate', {
          beeId: this.id,
          taskId: task.id,
          similarity,
          threshold: CSL_THRESHOLDS.LOW,
        });
        return false;
      }
    }

    this.taskQueue.push(task);
    this.emit('task:assigned', { beeId: this.id, taskId: task.id });

    // If idle, start processing
    if (this.state === BEE_STATE.IDLE) {
      this._processNext();
    }

    return true;
  }

  /**
   * Execute a task with phi-backoff retry on failure.
   * @param {object} task
   * @returns {Promise<object>}
   */
  async execute(task) {
    this.state = BEE_STATE.WORKING;
    this.currentTask = task;
    this.lastActiveAt = Date.now();

    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await this._executor(task);
        this.tasksCompleted++;
        this.currentTask = null;
        this.state = BEE_STATE.IDLE;

        this.emit('task:completed', {
          beeId: this.id,
          taskId: task.id,
          attempt,
          result,
        });

        return result;
      } catch (err) {
        lastError = err;
        this.errorCount++;

        if (attempt < MAX_RETRIES - 1) {
          const backoffMs = phiBackoff(attempt, fib(7) * 1000);
          logger.warn('Task execution failed, retrying', {
            beeId: this.id,
            taskId: task.id,
            attempt,
            backoffMs,
            error: err.message,
          });
          await sleep(backoffMs);
        }
      }
    }

    // All retries exhausted
    this.tasksFailed++;
    this.currentTask = null;
    this.state = BEE_STATE.IDLE;

    this.emit('task:failed', {
      beeId: this.id,
      taskId: task.id,
      error: lastError?.message,
      attempts: MAX_RETRIES,
    });

    logger.error('Task failed after all retries', {
      beeId: this.id,
      taskId: task.id,
      attempts: MAX_RETRIES,
      error: lastError?.message,
    });

    throw lastError;
  }

  /**
   * Pause the bee — stop accepting new tasks.
   */
  pause() {
    if (this.state === BEE_STATE.TERMINATED) return;
    this.state = BEE_STATE.PAUSED;
    this.emit('paused', { beeId: this.id });
    logger.info('Bee paused', { beeId: this.id });
  }

  /**
   * Resume a paused bee.
   */
  resume() {
    if (this.state !== BEE_STATE.PAUSED) return;
    this.state = BEE_STATE.IDLE;
    this.emit('resumed', { beeId: this.id });
    this._processNext();
    logger.info('Bee resumed', { beeId: this.id });
  }

  /**
   * Drain the bee — finish current task, reject new ones, then idle.
   */
  drain() {
    this.state = BEE_STATE.DRAINING;
    this.emit('draining', { beeId: this.id, queuedTasks: this.taskQueue.length });
    logger.info('Bee draining', { beeId: this.id, queuedTasks: this.taskQueue.length });
  }

  /**
   * Terminate the bee.
   */
  terminate() {
    this.state = BEE_STATE.TERMINATED;
    this.currentTask = null;
    this.taskQueue = [];
    this.emit('terminated', { beeId: this.id });
    logger.info('Bee terminated', { beeId: this.id, tasksCompleted: this.tasksCompleted });
  }

  /**
   * Heartbeat — compute and return health metrics.
   * @returns {object}
   */
  heartbeat() {
    this.lastActiveAt = Date.now();
    this._computeHealth();

    const metrics = {
      beeId: this.id,
      domain: this.domain,
      swarmId: this.swarmId,
      state: this.state,
      healthScore: this._healthScore,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      queueDepth: this.taskQueue.length,
      uptimeMs: Date.now() - this._uptimeStart,
    };

    this.emit('heartbeat', metrics);
    return metrics;
  }

  /**
   * Get the bee's 384D capability vector.
   * @returns {Float64Array}
   */
  getCapabilityVector() {
    return this.vector;
  }

  /**
   * Compute health score using phi-weighted factors.
   * @private
   */
  _computeHealth() {
    const now = Date.now();
    const uptimeMs = now - this._uptimeStart;
    const maxExpectedUptimeMs = fib(14) * 60 * 1000; // ~6.3 hours

    // Uptime factor (capped at 1.0)
    const uptimeFactor = Math.min(1.0, uptimeMs / maxExpectedUptimeMs);

    // Success rate
    const totalTasks = this.tasksCompleted + this.tasksFailed;
    const successRate = totalTasks > 0
      ? this.tasksCompleted / totalTasks
      : 1.0;

    // Response time factor (inverse of queue depth relative to max)
    const responseTimeFactor = 1.0 - (this.taskQueue.length / MAX_QUEUE_DEPTH);

    // Phi-weighted combination using EVICTION_WEIGHTS
    this._healthScore = Math.max(0, Math.min(1.0,
      uptimeFactor * EVICTION_WEIGHTS.importance +
      successRate * EVICTION_WEIGHTS.recency +
      Math.max(0, responseTimeFactor) * EVICTION_WEIGHTS.relevance
    ));
  }

  /**
   * Process next task from queue.
   * @private
   */
  _processNext() {
    if (this.state !== BEE_STATE.IDLE || this.taskQueue.length === 0) return;

    const task = this.taskQueue.shift();
    this.execute(task).catch(() => {
      // Error already handled in execute(), continue processing
      this._processNext();
    }).then(() => {
      // Continue processing queue
      if (this.state === BEE_STATE.IDLE) {
        this._processNext();
      }
    });
  }

  /**
   * Serialize bee state.
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      domain: this.domain,
      swarmId: this.swarmId,
      state: this.state,
      healthScore: this._healthScore,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      queueDepth: this.taskQueue.length,
      createdAt: this.createdAt,
      lastActiveAt: this.lastActiveAt,
    };
  }
}

/**
 * Default task executor (production: replaced by domain-specific executor).
 * @param {object} task
 * @returns {Promise<object>}
 */
async function defaultExecutor(task) {
  return { taskId: task.id, status: 'completed', executedAt: Date.now() };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export {
  HeadyBee,
  BEE_STATE,
  MAX_QUEUE_DEPTH,
  MAX_RETRIES,
  cosine,
  domainToVector,
};
