// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HeadyBee — Swarm Task Orchestration with φ-Scaled Timing       ║
// ║  Concurrent-Equals Worker Distribution · Bee Swarm Inspiration  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const { EventEmitter } = require('events');
const {
  PHI,
  PSI,
  CSL_GATES,
  PHI_TIMEOUT_REQUEST,
  phiBackoff,
  phiScale,
} = require('@heady/phi-math');
const { createLogger } = require('@heady/structured-logger');

// ═══════════════════════════════════════════════════════════════════
// Structured Logger Configuration
// ═══════════════════════════════════════════════════════════════════

const logger = createLogger('heady-bee', 'swarm');

// ═══════════════════════════════════════════════════════════════════
// HeadyBee — Single Worker Bee
// ═══════════════════════════════════════════════════════════════════

/**
 * HeadyBee represents a single concurrent worker in the swarm.
 * Operates as a concurrent-equal (no priorities or rankings).
 * Each bee can accept tasks, track completion, and report statistics.
 *
 * @class HeadyBee
 */
class HeadyBee extends EventEmitter {
  /**
   * Create a new bee worker
   * @param {number} id - Unique bee identifier
   * @param {string} name - Display name for the bee
   */
  constructor(id, name = `bee-${id}`) {
    super();
    this.id = id;
    this.name = name;
    this.status = 'idle'; // 'idle' | 'working' | 'resting'
    this.currentTask = null;
    this.completedCount = 0;
    this.totalDurationMs = 0;
    this.failureCount = 0;
    this.lastTaskResult = null;

    logger.debug(`Bee instantiated`, {
      beeId: this.id,
      beeName: this.name,
    });
  }

  /**
   * Assign a task to this bee and execute it
   * @param {Object} task - Task object { id, name, fn (async), metadata }
   * @returns {Promise<Object>} Result object { taskId, result, durationMs, error }
   */
  async assign(task) {
    if (this.status !== 'idle') {
      throw new Error(
        `Bee ${this.name} is not idle (current status: ${this.status})`
      );
    }

    this.currentTask = task;
    this.status = 'working';
    const startTime = Date.now();

    logger.debug(`Bee ${this.name} assigned task`, {
      beeId: this.id,
      taskId: task.id,
      taskName: task.name,
    });

    try {
      // Execute task with timeout protection
      const result = await Promise.race([
        task.fn(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Task timeout after ${PHI_TIMEOUT_REQUEST}ms`)),
            PHI_TIMEOUT_REQUEST
          )
        ),
      ]);

      const durationMs = Date.now() - startTime;
      this.totalDurationMs += durationMs;
      this.completedCount += 1;

      this.lastTaskResult = {
        taskId: task.id,
        result,
        durationMs,
        error: null,
        beeId: this.id,
        beeName: this.name,
      };

      logger.debug(`Bee ${this.name} completed task`, {
        beeId: this.id,
        taskId: task.id,
        durationMs,
        completedCount: this.completedCount,
      });

      this.emit('task:complete', this.lastTaskResult);
      return this.lastTaskResult;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.failureCount += 1;

      this.lastTaskResult = {
        taskId: task.id,
        result: null,
        durationMs,
        error: error.message,
        beeId: this.id,
        beeName: this.name,
      };

      logger.warn(`Bee ${this.name} failed task`, {
        beeId: this.id,
        taskId: task.id,
        error: error.message,
        durationMs,
      });

      this.emit('task:error', this.lastTaskResult);
      return this.lastTaskResult;
    } finally {
      this.currentTask = null;
      this.status = 'idle';
    }
  }

  /**
   * Put bee into resting state (no new tasks accepted)
   * @returns {void}
   */
  rest() {
    this.status = 'resting';
    logger.debug(`Bee ${this.name} is resting`, { beeId: this.id });
  }

  /**
   * Return statistics for this bee
   * @returns {Object} Stats { id, name, status, completedCount, failureCount, totalDurationMs, avgTaskDurationMs }
   */
  stats() {
    const avgTaskDurationMs =
      this.completedCount > 0 ? this.totalDurationMs / this.completedCount : 0;

    return {
      id: this.id,
      name: this.name,
      status: this.status,
      completedCount: this.completedCount,
      failureCount: this.failureCount,
      totalDurationMs: this.totalDurationMs,
      avgTaskDurationMs: Math.round(avgTaskDurationMs),
      currentTask: this.currentTask
        ? { id: this.currentTask.id, name: this.currentTask.name }
        : null,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// HeadySwarm — Swarm Coordinator
// ═══════════════════════════════════════════════════════════════════

/**
 * HeadySwarm orchestrates a colony of concurrent-equal bee workers.
 * Tasks are distributed in FIFO order to idle bees without priority ranking.
 * Uses φ-scaled timing constants and exponential backoff on failure.
 *
 * @class HeadySwarm
 * @extends EventEmitter
 */
class HeadySwarm extends EventEmitter {
  /**
   * Create a new swarm
   * @param {Object} config - Configuration object
   * @param {string} config.name - Swarm name
   * @param {number} config.beeCount - Number of worker bees (default: 5)
   * @param {number} config.concurrency - Max concurrent tasks (default: beeCount * PSI)
   * @param {Function} config.onTaskComplete - Callback when task completes
   * @param {Function} config.onSwarmComplete - Callback when all tasks done
   */
  constructor(config = {}) {
    super();
    this.name = config.name || 'default-swarm';
    this.beeCount = config.beeCount || 5;

    // Use φ-scaled concurrency (PSI = 1/φ ≈ 0.618)
    this.concurrency = config.concurrency || Math.round(this.beeCount * PSI);
    this.concurrency = Math.max(1, Math.min(this.concurrency, this.beeCount));

    // Create bee workers
    this.bees = Array.from({ length: this.beeCount }, (_, i) =>
      new HeadyBee(i, `bee-${this.name}-${i}`)
    );

    this.taskQueue = [];
    this.activeTasks = new Map(); // taskId -> Promise
    this.results = [];
    this.metrics = {
      totalTasksSubmitted: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      totalDurationMs: 0,
      startTime: null,
      endTime: null,
      executionStartTime: null,
    };

    // Callbacks
    this.onTaskComplete = config.onTaskComplete || null;
    this.onSwarmComplete = config.onSwarmComplete || null;

    logger.info(`Swarm created`, {
      swarmName: this.name,
      beeCount: this.beeCount,
      concurrency: this.concurrency,
    });
  }

  /**
   * Add a single task to the queue
   * @param {Object} task - Task object { id, name, fn (async function), metadata }
   * @returns {void}
   */
  addTask(task) {
    if (!task || !task.id || !task.name || typeof task.fn !== 'function') {
      throw new Error(
        'Task must have id, name, and fn (async function) properties'
      );
    }
    this.taskQueue.push(task);
    this.metrics.totalTasksSubmitted += 1;

    logger.debug(`Task added to queue`, {
      taskId: task.id,
      taskName: task.name,
      queueDepth: this.taskQueue.length,
    });
  }

  /**
   * Add multiple tasks to the queue
   * @param {Array<Object>} tasks - Array of task objects
   * @returns {void}
   */
  addTasks(tasks) {
    if (!Array.isArray(tasks)) {
      throw new Error('addTasks requires an array of tasks');
    }
    tasks.forEach((task) => this.addTask(task));

    logger.info(`Multiple tasks added to queue`, {
      count: tasks.length,
      queueDepth: this.taskQueue.length,
    });
  }

  /**
   * Get the next idle bee (round-robin, concurrent-equals)
   * @private
   * @returns {HeadyBee|null} Next idle bee or null if none available
   */
  getIdleBee() {
    return this.bees.find((bee) => bee.status === 'idle') || null;
  }

  /**
   * Get current swarm status
   * @returns {Object} Status { activeBees, idleBees, queueDepth, results }
   */
  status() {
    const activeBees = this.bees.filter((b) => b.status === 'working').length;
    const idleBees = this.bees.filter((b) => b.status === 'idle').length;

    return {
      swarmName: this.name,
      activeBees,
      idleBees,
      queueDepth: this.taskQueue.length,
      resultsCount: this.results.length,
      metricsSnapshot: {
        totalSubmitted: this.metrics.totalTasksSubmitted,
        totalCompleted: this.metrics.totalTasksCompleted,
        totalFailed: this.metrics.totalTasksFailed,
      },
    };
  }

  /**
   * Get aggregated metrics with φ-scaled analysis
   * @returns {Object} Metrics { timing, performance, phiAnalysis }
   */
  metrics() {
    const beeStats = this.bees.map((bee) => bee.stats());
    const totalCompleted = this.metrics.totalTasksCompleted;
    const totalFailed = this.metrics.totalTasksFailed;
    const totalTasks = totalCompleted + totalFailed;

    const successRate = totalTasks > 0 ? totalCompleted / totalTasks : 0;
    const failureRate = totalTasks > 0 ? totalFailed / totalTasks : 0;

    // Check circuit breaker threshold (CSL_GATES.boost = 0.618)
    const circuitBreakerTriggered = failureRate > CSL_GATES.boost;

    // Calculate φ-scaled performance metrics
    const avgTaskDuration =
      totalCompleted > 0
        ? this.metrics.totalDurationMs / totalCompleted
        : 0;

    const phiAnalysis = {
      successRate: Math.round(successRate * 10000) / 100, // percentage
      failureRate: Math.round(failureRate * 10000) / 100,
      circuitBreakerStatus: circuitBreakerTriggered ? 'OPEN' : 'CLOSED',
      failureThreshold: Math.round(CSL_GATES.boost * 10000) / 100,
      phiScaledDuration: phiScale(avgTaskDuration, 1),
    };

    return {
      swarmName: this.name,
      timing: {
        totalExecutionMs: this.metrics.endTime
          ? this.metrics.endTime - this.metrics.executionStartTime
          : null,
        totalTaskDurationMs: this.metrics.totalDurationMs,
        avgTaskDurationMs: Math.round(avgTaskDuration),
      },
      performance: {
        totalCompleted,
        totalFailed,
        successRate,
        failureRate,
      },
      bees: beeStats,
      phiAnalysis,
    };
  }

  /**
   * Execute all queued tasks concurrently across bees
   * Distributes tasks in FIFO order (concurrent-equals, no priority ranking)
   * @returns {Promise<Object>} SwarmResult { results, metrics, timing, errors }
   */
  async execute() {
    this.metrics.executionStartTime = Date.now();
    this.metrics.totalDurationMs = 0;

    logger.info(`Swarm execution started`, {
      swarmName: this.name,
      taskCount: this.taskQueue.length,
      concurrency: this.concurrency,
    });

    const allTaskPromises = [];

    // Helper function to process one task (with retry on failure)
    const processTask = async (task, attemptNumber = 0) => {
      const idleBee = await this.waitForIdleBee();
      if (!idleBee) {
        throw new Error('No idle bees available after timeout');
      }

      this.emit('task:start', { taskId: task.id, taskName: task.name });

      try {
        const result = await idleBee.assign(task);

        if (result.error) {
          // Task failed — apply φ-based backoff for retry
          if (attemptNumber < 3) {
            const backoffMs = phiBackoff(attemptNumber);
            logger.warn(`Task failed, retrying with φ-backoff`, {
              taskId: task.id,
              attemptNumber,
              backoffMs,
            });
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            return processTask(task, attemptNumber + 1);
          }
          this.metrics.totalTasksFailed += 1;
        } else {
          this.metrics.totalTasksCompleted += 1;
          this.metrics.totalDurationMs += result.durationMs;
        }

        this.results.push(result);
        if (this.onTaskComplete) {
          this.onTaskComplete(result);
        }
        this.emit('task:complete', result);
        return result;
      } catch (error) {
        logger.error(`Task processing error`, {
          taskId: task.id,
          error: error.message,
        });
        this.metrics.totalTasksFailed += 1;
        const errorResult = {
          taskId: task.id,
          result: null,
          error: error.message,
          durationMs: Date.now() - this.metrics.executionStartTime,
        };
        this.results.push(errorResult);
        return errorResult;
      }
    };

    // Submit all tasks to process concurrently
    for (const task of this.taskQueue) {
      const taskPromise = processTask(task);
      allTaskPromises.push(taskPromise);
    }

    // Wait for all tasks to settle (no early exit on failure)
    const settledResults = await Promise.allSettled(allTaskPromises);

    this.metrics.endTime = Date.now();

    logger.info(`Swarm execution completed`, {
      swarmName: this.name,
      totalCompleted: this.metrics.totalTasksCompleted,
      totalFailed: this.metrics.totalTasksFailed,
      totalDurationMs:
        this.metrics.endTime - this.metrics.executionStartTime,
    });

    if (this.onSwarmComplete) {
      this.onSwarmComplete({
        results: this.results,
        metrics: this.metrics(),
      });
    }

    this.emit('swarm:complete', {
      results: this.results,
      metrics: this.metrics(),
    });

    return {
      results: this.results,
      metrics: this.metrics(),
      timing: {
        executionStartTime: this.metrics.executionStartTime,
        executionEndTime: this.metrics.endTime,
        totalExecutionMs:
          this.metrics.endTime - this.metrics.executionStartTime,
      },
    };
  }

  /**
   * Wait for an idle bee to become available
   * @private
   * @returns {Promise<HeadyBee>} An idle bee
   */
  async waitForIdleBee(maxWaitMs = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const idleBee = this.getIdleBee();
      if (idleBee) {
        return idleBee;
      }
      // Small delay before checking again (backoff)
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`No idle bee available within ${maxWaitMs}ms`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════

/**
 * Factory function to create a new swarm
 * @param {Object} config - Configuration object
 * @returns {HeadySwarm} A new swarm instance
 */
function createSwarm(config) {
  return new HeadySwarm(config);
}

// ═══════════════════════════════════════════════════════════════════
// Module Exports
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  HeadyBee,
  HeadySwarm,
  createSwarm,
};
