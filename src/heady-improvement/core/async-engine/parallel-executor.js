/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Parallel Executor — Dynamic intelligent async parallel task execution.
 * Phi-scaled concurrency limits, DAG-aware scheduling, circuit breakers.
 *
 * Founder: Eric Haywood
 * @module core/async-engine/parallel-executor
 */

import { EventEmitter } from 'events';
import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,
  phiBackoff,
  classifyPressure,
  phiFusionWeights,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';
import { SUBTASK_STATE } from './task-decomposer.js';

const logger = createLogger('parallel-executor');

const PSI2 = PSI * PSI;

/** Phi-scaled concurrency limits */
const CONCURRENCY = Object.freeze({
  maxParallel: fib(8),      // 21 concurrent tasks
  minParallel: fib(3),      // 2 minimum
  batchSize: fib(6),        // 8 tasks per batch
  queueCapacity: fib(13),   // 233 queued tasks
});

/** Executor states */
const EXECUTOR_STATE = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  DRAINING: 'draining',
  STOPPED: 'stopped',
});

class ParallelExecutor extends EventEmitter {
  /**
   * @param {object} decomposer - TaskDecomposer instance
   * @param {object} taskRouter - TaskRouter instance (from swarm-engine)
   * @param {object} [options]
   * @param {number} [options.maxConcurrency] - Override max parallel tasks
   * @param {Function} [options.executeTask] - async (subtask) => result
   */
  constructor(decomposer, taskRouter, options = {}) {
    super();
    this._decomposer = decomposer;
    this._taskRouter = taskRouter;
    this._maxConcurrency = options.maxConcurrency || CONCURRENCY.maxParallel;
    this._executeTask = options.executeTask || defaultExecuteTask;

    this._activeTasks = new Map();
    this._state = EXECUTOR_STATE.IDLE;
    this._adaptiveConcurrency = this._maxConcurrency;
    this._errorWindow = []; // Track recent errors for adaptive scaling
    this._errorWindowSize = fib(8); // 21 recent executions
    this._executionCount = 0;
  }

  /**
   * Execute a decomposed task plan — processes all parallel groups in order.
   * Within each group, tasks run in parallel up to the concurrency limit.
   *
   * @param {string} decompositionId
   * @returns {Promise<object>} Execution summary
   */
  async executePlan(decompositionId) {
    this._state = EXECUTOR_STATE.RUNNING;
    const startTime = Date.now();
    let totalExecuted = 0;
    let totalFailed = 0;

    this.emit('plan:started', { decompositionId });
    logger.info('Execution plan started', { decompositionId });

    try {
      while (this._state === EXECUTOR_STATE.RUNNING) {
        // Get next batch of ready subtasks
        const ready = this._decomposer.getReadySubtasks(decompositionId);
        if (ready.length === 0) {
          // Check if we're done or stuck
          const progress = this._decomposer.getProgress(decompositionId);
          if (progress.running === 0 && progress.ready === 0 && progress.pending === 0) {
            break; // All done
          }
          if (progress.running === 0 && progress.failed > 0) {
            break; // Failed and nothing running
          }
          // Wait for running tasks to complete
          await this._waitForSlot();
          continue;
        }

        // Execute ready subtasks in parallel, respecting concurrency limit
        const batch = ready.slice(0, this._adaptiveConcurrency - this._activeTasks.size);

        const promises = batch.map(subtask =>
          this._executeSubtask(decompositionId, subtask)
        );

        const results = await Promise.allSettled(promises);

        for (const result of results) {
          if (result.status === 'fulfilled') {
            totalExecuted++;
          } else {
            totalFailed++;
          }
        }

        // Adaptive concurrency adjustment
        this._adjustConcurrency();
      }
    } catch (err) {
      logger.error('Execution plan failed', { decompositionId, error: err.message });
      this._state = EXECUTOR_STATE.STOPPED;
      throw err;
    }

    this._state = EXECUTOR_STATE.IDLE;
    const duration = Date.now() - startTime;
    const progress = this._decomposer.getProgress(decompositionId);

    const summary = {
      decompositionId,
      totalExecuted,
      totalFailed,
      durationMs: duration,
      status: progress?.status || 'unknown',
      progress: progress?.progress || 0,
    };

    this.emit('plan:completed', summary);
    logger.info('Execution plan completed', summary);
    return summary;
  }

  /**
   * Execute a single subtask with routing to the swarm engine.
   * @param {string} decompositionId
   * @param {object} subtask
   * @returns {Promise<object>}
   */
  async _executeSubtask(decompositionId, subtask) {
    const taskId = subtask.id;
    this._activeTasks.set(taskId, { startedAt: Date.now(), subtask });
    this._decomposer.markStarted(decompositionId, taskId);

    this.emit('subtask:started', { decompositionId, taskId });

    try {
      // Route to swarm engine if available
      let routeResult = null;
      if (this._taskRouter) {
        routeResult = this._taskRouter.routeTask({
          id: taskId,
          vector: subtask.vector,
          payload: subtask,
          type: subtask.type || 'general',
        });
      }

      // Execute
      const result = await this._executeTask(subtask);

      this._decomposer.markCompleted(decompositionId, taskId, result);
      this._recordExecution(true);
      this._executionCount++;

      this.emit('subtask:completed', {
        decompositionId,
        taskId,
        swarmId: routeResult?.swarmId,
      });

      return result;
    } catch (err) {
      this._decomposer.markFailed(decompositionId, taskId, err.message);
      this._recordExecution(false);

      this.emit('subtask:failed', {
        decompositionId,
        taskId,
        error: err.message,
      });

      throw err;
    } finally {
      this._activeTasks.delete(taskId);
    }
  }

  /**
   * Adaptive concurrency adjustment based on error rate.
   * High error rate → reduce concurrency (backoff)
   * Low error rate → increase concurrency
   * @private
   */
  _adjustConcurrency() {
    if (this._errorWindow.length < fib(5)) return; // Need enough data

    const recentErrors = this._errorWindow.filter(e => !e).length;
    const errorRate = recentErrors / this._errorWindow.length;

    if (errorRate > CSL_THRESHOLDS.MEDIUM) {
      // High error rate → reduce to PSI2 of max
      this._adaptiveConcurrency = Math.max(
        CONCURRENCY.minParallel,
        Math.floor(this._maxConcurrency * PSI2)
      );
      logger.info('Concurrency reduced due to errors', {
        errorRate,
        concurrency: this._adaptiveConcurrency,
      });
    } else if (errorRate > CSL_THRESHOLDS.LOW) {
      // Moderate error rate → reduce to PSI of max
      this._adaptiveConcurrency = Math.max(
        CONCURRENCY.minParallel,
        Math.floor(this._maxConcurrency * PSI)
      );
    } else {
      // Low error rate → ramp up toward max
      this._adaptiveConcurrency = Math.min(
        this._maxConcurrency,
        this._adaptiveConcurrency + 1
      );
    }
  }

  /**
   * Record execution success/failure in sliding window.
   * @private
   */
  _recordExecution(success) {
    this._errorWindow.push(success);
    while (this._errorWindow.length > this._errorWindowSize) {
      this._errorWindow.shift();
    }
  }

  /**
   * Wait for an execution slot to open.
   * @private
   */
  _waitForSlot() {
    return new Promise(resolve => {
      const check = () => {
        if (this._activeTasks.size < this._adaptiveConcurrency) {
          resolve();
        } else {
          setTimeout(check, fib(5) * 100); // 500ms poll
        }
      };
      setTimeout(check, fib(3) * 100); // 200ms initial delay
    });
  }

  /**
   * Pause execution.
   */
  pause() {
    this._state = EXECUTOR_STATE.PAUSED;
    this.emit('executor:paused');
    logger.info('Executor paused');
  }

  /**
   * Resume execution.
   */
  resume() {
    if (this._state === EXECUTOR_STATE.PAUSED) {
      this._state = EXECUTOR_STATE.RUNNING;
      this.emit('executor:resumed');
      logger.info('Executor resumed');
    }
  }

  /**
   * Stop execution gracefully.
   */
  stop() {
    this._state = EXECUTOR_STATE.DRAINING;
    this.emit('executor:draining');
    logger.info('Executor draining');
  }

  /**
   * Get executor status.
   * @returns {object}
   */
  getStatus() {
    return {
      state: this._state,
      activeTasks: this._activeTasks.size,
      maxConcurrency: this._maxConcurrency,
      adaptiveConcurrency: this._adaptiveConcurrency,
      totalExecuted: this._executionCount,
      errorRate: this._errorWindow.length > 0
        ? this._errorWindow.filter(e => !e).length / this._errorWindow.length
        : 0,
    };
  }
}

/**
 * Default task executor.
 * @param {object} subtask
 * @returns {Promise<object>}
 */
async function defaultExecuteTask(subtask) {
  return { subtaskId: subtask.id, status: 'completed', executedAt: Date.now() };
}

export {
  ParallelExecutor,
  CONCURRENCY,
  EXECUTOR_STATE,
};
