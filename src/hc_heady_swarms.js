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
// ║  FILE: src/hc_heady_swarms.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const {
  PHI,
  PSI,
  FIB,
  CSL_GATES,
  phiBackoff,
  phiScale,
} = require('../packages/phi-math');
const { createLogger } = require('../packages/structured-logger');
const { HeadySwarm } = require('../packages/heady-bee');
const latent = require('./hc_latent_space');

// ═══════════════════════════════════════════════════════════════════
// Structured Logger Configuration
// ═══════════════════════════════════════════════════════════════════

const logger = createLogger('heady-swarms', 'orchestration');

// ═══════════════════════════════════════════════════════════════════
// Trigram-Based Text Embedding (matches hc_latent_space.js)
// ═══════════════════════════════════════════════════════════════════

/**
 * Convert text to a 128-dimensional trigram-based vector
 * Uses the same algorithm as hc_latent_space.js for consistency
 *
 * @param {string} text - Input text
 * @param {number} dims - Vector dimensions (default: 128)
 * @returns {number[]} Normalized vector
 */
function textToVector(text, dims = 128) {
  const vec = new Array(dims).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');

  // Build trigram-based representation
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.substring(i, i + 3);
    let hash = 0;

    // Hash trigram to an index
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) - hash) + trigram.charCodeAt(j);
      hash = hash & hash; // Convert to 32-bit integer
    }

    vec[Math.abs(hash) % dims] += 1;
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / magnitude);
}

/**
 * Compute cosine similarity between two vectors
 *
 * @param {number[]} a - Vector A
 * @param {number[]} b - Vector B
 * @returns {number} Cosine similarity score (0-1)
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB) || 1;
  return dotProduct / denominator;
}

// ═══════════════════════════════════════════════════════════════════
// Swarm Pool Definition
// ═══════════════════════════════════════════════════════════════════

/**
 * Define capabilities for each swarm in the pool
 * Maps swarm name to list of task description keywords
 */
const SWARM_CAPABILITIES = {
  execute: [
    'build',
    'compile',
    'deploy',
    'test',
    'execute',
    'run',
    'create',
    'generate',
    'process',
    'code',
    'script',
    'automation',
    'workflow',
  ],
  critique: [
    'review',
    'audit',
    'analyze',
    'critique',
    'validate',
    'verify',
    'check',
    'test coverage',
    'quality',
    'lint',
    'scan',
    'inspect',
    'assess',
  ],
  optimize: [
    'refactor',
    'optimize',
    'improve',
    'performance',
    'speed',
    'efficiency',
    'cleanup',
    'reorg',
    'restructure',
    'enhance',
    'rewrite',
    'simplify',
    'compress',
  ],
  monitor: [
    'monitor',
    'health',
    'check',
    'watch',
    'ping',
    'status',
    'log',
    'alert',
    'metric',
    'trace',
    'observe',
    'collect',
    'report',
  ],
};

// ═══════════════════════════════════════════════════════════════════
// HeadySwarms Class — Multi-Swarm Pipeline Orchestrator
// ═══════════════════════════════════════════════════════════════════

/**
 * HeadySwarms coordinates a pool of named swarms for pipeline stages
 * Routes tasks semantically to the most relevant swarm using trigram embeddings
 * Executes tasks in parallel with dependency graph support
 *
 * @class HeadySwarms
 */
class HeadySwarms {
  /**
   * Initialize the multi-swarm pool
   *
   * @param {Object} config - Configuration object
   * @param {boolean} config.autoInitialize - Auto-create swarms (default: true)
   */
  constructor(config = {}) {
    this.config = config;
    this.swarms = {};
    this.taskDependencyGraph = new Map();
    this.executionMetrics = {};

    // Auto-initialize swarms on construction
    if (config.autoInitialize !== false) {
      this.initializeSwarms();
    }

    logger.info('HeadySwarms instance created', {
      autoInitialize: config.autoInitialize !== false,
      swarmCount: Object.keys(this.swarms).length,
    });
  }

  /**
   * Initialize all named swarms with Fibonacci-scaled bee counts
   * Uses FIB constants to define swarm sizes
   */
  initializeSwarms() {
    const swarmConfig = {
      execute: { beeCount: FIB[8], name: 'execute' }, // 34 bees
      critique: { beeCount: FIB[6], name: 'critique' }, // 13 bees
      optimize: { beeCount: FIB[5], name: 'optimize' }, // 8 bees
      monitor: { beeCount: FIB[4], name: 'monitor' }, // 5 bees
    };

    for (const [swarmName, config] of Object.entries(swarmConfig)) {
      this.swarms[swarmName] = new HeadySwarm({
        name: config.name,
        beeCount: config.beeCount,
      });

      logger.info('Swarm initialized', {
        swarmName,
        beeCount: config.beeCount,
      });
    }

    // Precompute capability vectors for semantic matching
    this.capabilityVectors = {};
    for (const [swarmName, keywords] of Object.entries(SWARM_CAPABILITIES)) {
      const capabilityText = keywords.join(' ');
      this.capabilityVectors[swarmName] = textToVector(capabilityText);
    }
  }

  /**
   * Find the best-matching swarm for a task using semantic similarity
   * Uses CSL_GATES to determine if match meets confidence threshold
   *
   * @private
   * @param {string} taskDescription - Task description for routing
   * @returns {Object} { swarmName, score, aboveThreshold }
   */
  routeTaskToSwarm(taskDescription) {
    const taskVector = textToVector(taskDescription);
    const scores = {};

    // Compute cosine similarity to each swarm's capabilities
    for (const [swarmName, capVector] of Object.entries(
      this.capabilityVectors
    )) {
      scores[swarmName] = cosineSimilarity(taskVector, capVector);
    }

    // Find best match
    let bestSwarm = null;
    let bestScore = -1;

    for (const [swarmName, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestSwarm = swarmName;
      }
    }

    // Check if score meets inclusion threshold (CSL_GATES.include = 0.382)
    const aboveThreshold = bestScore >= CSL_GATES.include;

    logger.debug('Task routed to swarm', {
      taskDescription: taskDescription.substring(0, 100),
      swarmName: bestSwarm,
      score: Math.round(bestScore * 10000) / 10000,
      threshold: CSL_GATES.include,
      aboveThreshold,
    });

    return { swarmName: bestSwarm, score: bestScore, aboveThreshold };
  }

  /**
   * Select swarm using PHI-weighted selection when multiple qualify
   * Implements CSL_GATES logic for soft-max selection
   *
   * @private
   * @param {string} taskDescription - Task description
   * @returns {string} Selected swarm name
   */
  selectSwarmWithPhiWeighting(taskDescription) {
    const taskVector = textToVector(taskDescription);
    const scores = {};
    const qualifyingSwarms = [];

    // Find all swarms above inclusion threshold
    for (const [swarmName, capVector] of Object.entries(
      this.capabilityVectors
    )) {
      const score = cosineSimilarity(taskVector, capVector);
      scores[swarmName] = score;

      if (score >= CSL_GATES.include) {
        qualifyingSwarms.push({ swarmName, score });
      }
    }

    // If no swarms qualify, return best match anyway
    if (qualifyingSwarms.length === 0) {
      const best = Object.entries(scores).reduce((prev, [name, score]) =>
        score > prev.score ? { swarmName: name, score } : prev
      );
      return best.swarmName;
    }

    // If only one qualifies, return it
    if (qualifyingSwarms.length === 1) {
      return qualifyingSwarms[0].swarmName;
    }

    // Multiple qualify — use PHI-weighted exponential selection
    // Higher scores get exponentially higher weights
    const weights = qualifyingSwarms.map(({ score }) =>
      Math.pow(PHI, score * 10)
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // Stochastic selection based on weights
    let cumulative = 0;
    const random = Math.random() * totalWeight;

    for (let i = 0; i < qualifyingSwarms.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return qualifyingSwarms[i].swarmName;
      }
    }

    return qualifyingSwarms[qualifyingSwarms.length - 1].swarmName;
  }

  /**
   * Dispatch multiple tasks in parallel across swarms
   * Respects task dependencies — executes only when all dependencies complete
   *
   * @param {Array<Object>} tasks - Task array
   *   - task.id: unique identifier
   *   - task.name: display name
   *   - task.description: semantic routing hint
   *   - task.fn: async function to execute
   *   - task.dependsOn: optional array of task IDs to wait for
   * @returns {Promise<Object>} Aggregated results { taskResults, swarmMetrics, durationMs }
   */
  async dispatchParallel(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      logger.warn('dispatchParallel called with empty or invalid task array');
      return {
        taskResults: [],
        swarmMetrics: this.getMetrics(),
        durationMs: 0,
      };
    }

    const dispatchStartTime = Date.now();

    logger.info('Parallel dispatch starting', {
      taskCount: tasks.length,
    });

    // Record dispatch to latent space
    latent.record('swarm', `Dispatching ${tasks.length} tasks in parallel`, {
      taskCount: tasks.length,
    });

    // Build dependency graph
    this.taskDependencyGraph.clear();
    const taskMap = new Map();
    const taskPromises = new Map();

    for (const task of tasks) {
      if (!task.id || !task.name || typeof task.fn !== 'function') {
        logger.error('Invalid task structure', {
          taskId: task.id,
          taskName: task.name,
        });
        continue;
      }
      taskMap.set(task.id, task);
    }

    // Execute tasks respecting dependencies
    for (const [taskId, task] of taskMap) {
      const executeTask = async () => {
        // Wait for dependencies to complete
        if (task.dependsOn && Array.isArray(task.dependsOn)) {
          const depResults = await Promise.all(
            task.dependsOn.map((depId) => taskPromises.get(depId) || Promise.resolve())
          );

          // Check if any dependency failed
          const failedDep = depResults.find((r) => r && r.error);
          if (failedDep) {
            logger.warn('Task blocked by failed dependency', {
              taskId,
              dependsOn: task.dependsOn,
            });
            return {
              taskId,
              error: `Blocked by failed dependency`,
              durationMs: 0,
              result: null,
            };
          }
        }

        // Route to best swarm and execute
        const routing = this.routeTaskToSwarm(
          task.description || task.name
        );
        const selectedSwarm = this.selectSwarmWithPhiWeighting(
          task.description || task.name
        );
        const swarm = this.swarms[selectedSwarm];

        if (!swarm) {
          logger.error('Selected swarm not found', { selectedSwarm });
          return {
            taskId,
            error: `Swarm '${selectedSwarm}' not initialized`,
            durationMs: 0,
            result: null,
          };
        }

        logger.debug('Task executing in swarm', {
          taskId,
          swarmName: selectedSwarm,
          routingScore: Math.round(routing.score * 10000) / 10000,
        });

        // Add task to swarm and execute
        swarm.addTask({
          id: task.id,
          name: task.name,
          fn: task.fn,
          metadata: {
            description: task.description,
            dependencies: task.dependsOn,
          },
        });

        const result = await swarm.execute();
        return result.results[result.results.length - 1] || {
          taskId,
          error: 'No result from swarm',
          durationMs: 0,
        };
      };

      taskPromises.set(taskId, executeTask());
    }

    // Wait for all tasks (all parallel)
    const results = await Promise.allSettled(
      Array.from(taskPromises.values())
    );

    const taskResults = results.map((r, idx) => {
      if (r.status === 'fulfilled') {
        return r.value;
      } else {
        return {
          taskId: Array.from(taskPromises.keys())[idx],
          error: r.reason?.message || 'Task promise rejected',
          durationMs: 0,
          result: null,
        };
      }
    });

    const durationMs = Date.now() - dispatchStartTime;

    logger.info('Parallel dispatch completed', {
      taskCount: tasks.length,
      successCount: taskResults.filter((r) => !r.error).length,
      failureCount: taskResults.filter((r) => r.error).length,
      durationMs,
    });

    // Record completion to latent space
    latent.record('swarm', `Dispatch completed with ${taskResults.filter((r) => !r.error).length}/${tasks.length} successes`, {
      taskCount: tasks.length,
      successCount: taskResults.filter((r) => !r.error).length,
      failureCount: taskResults.filter((r) => r.error).length,
      durationMs,
    });

    return {
      taskResults,
      swarmMetrics: this.getMetrics(),
      durationMs,
    };
  }

  /**
   * Execute all tasks for a pipeline stage
   * Records stage lifecycle events to latent space
   *
   * @param {string} stageName - Pipeline stage name
   * @param {Array<Object>} tasks - Tasks for this stage
   * @returns {Promise<Object>} { stageName, results, durationMs, swarmMetrics }
   */
  async executeStage(stageName, tasks) {
    if (!stageName || typeof stageName !== 'string') {
      throw new Error('stageName must be a non-empty string');
    }

    const stageStartTime = Date.now();

    logger.info('Pipeline stage execution started', {
      stageName,
      taskCount: tasks.length,
    });

    // Record stage start
    latent.record(
      'swarm',
      `Pipeline stage '${stageName}' started with ${tasks.length} tasks`,
      {
        stageName,
        taskCount: tasks.length,
        timestamp: new Date().toISOString(),
      }
    );

    try {
      // Execute all tasks for this stage
      const dispatchResult = await this.dispatchParallel(tasks);

      const stageDurationMs = Date.now() - stageStartTime;

      // Record stage completion
      latent.record(
        'swarm',
        `Pipeline stage '${stageName}' completed`,
        {
          stageName,
          durationMs: stageDurationMs,
          successCount: dispatchResult.taskResults.filter((r) => !r.error)
            .length,
          failureCount: dispatchResult.taskResults.filter((r) => r.error)
            .length,
        }
      );

      logger.info('Pipeline stage execution completed', {
        stageName,
        durationMs: stageDurationMs,
        successCount: dispatchResult.taskResults.filter((r) => !r.error)
          .length,
        failureCount: dispatchResult.taskResults.filter((r) => r.error)
          .length,
      });

      return {
        stageName,
        results: dispatchResult.taskResults,
        durationMs: stageDurationMs,
        swarmMetrics: dispatchResult.swarmMetrics,
      };
    } catch (error) {
      const stageDurationMs = Date.now() - stageStartTime;

      logger.error('Pipeline stage execution failed', {
        stageName,
        error: error.message,
        durationMs: stageDurationMs,
      });

      // Record error to latent space
      latent.record('error', `Pipeline stage '${stageName}' failed`, {
        stageName,
        error: error.message,
        durationMs: stageDurationMs,
      });

      throw error;
    }
  }

  /**
   * Get health status of all swarms
   *
   * @returns {Object} Health metrics for each swarm
   */
  getHealth() {
    const health = {};

    for (const [swarmName, swarm] of Object.entries(this.swarms)) {
      const status = swarm.status();
      const metrics = swarm.metrics();

      health[swarmName] = {
        status: status.activeBees > 0 ? 'busy' : 'idle',
        activeBees: status.activeBees,
        idleBees: status.idleBees,
        queueDepth: status.queueDepth,
        successRate: Math.round(
          (metrics.performance.successRate || 0) * 10000
        ) / 100,
        failureRate: Math.round(
          (metrics.performance.failureRate || 0) * 10000
        ) / 100,
      };
    }

    return health;
  }

  /**
   * Get comprehensive metrics with φ-analysis for all swarms
   *
   * @returns {Object} Aggregated metrics across all swarms
   */
  getMetrics() {
    const metrics = {
      swarms: {},
      aggregated: {
        totalBees: 0,
        totalActiveBees: 0,
        totalIdleBees: 0,
        totalTasksCompleted: 0,
        totalTasksFailed: 0,
        totalDurationMs: 0,
      },
      phiAnalysis: {},
    };

    // Collect metrics from each swarm
    for (const [swarmName, swarm] of Object.entries(this.swarms)) {
      const swarmMetrics = swarm.metrics();
      const totalBees = swarm.beeCount;

      metrics.swarms[swarmName] = {
        totalBees,
        tasksCompleted: swarmMetrics.performance.totalCompleted,
        tasksFailed: swarmMetrics.performance.totalFailed,
        avgTaskDurationMs: swarmMetrics.timing.avgTaskDurationMs,
        successRate: Math.round(
          (swarmMetrics.performance.successRate || 0) * 10000
        ) / 100,
        phiAnalysis: swarmMetrics.phiAnalysis,
      };

      metrics.aggregated.totalBees += totalBees;
      metrics.aggregated.totalTasksCompleted +=
        swarmMetrics.performance.totalCompleted;
      metrics.aggregated.totalTasksFailed +=
        swarmMetrics.performance.totalFailed;
    }

    // Calculate aggregated φ-analysis
    const totalTasks =
      metrics.aggregated.totalTasksCompleted +
      metrics.aggregated.totalTasksFailed;
    if (totalTasks > 0) {
      const successRate = metrics.aggregated.totalTasksCompleted / totalTasks;
      metrics.phiAnalysis = {
        overallSuccessRate: Math.round(successRate * 10000) / 100,
        totalTasks,
        phiScaledEfficiency: phiScale(successRate, 2),
      };
    }

    return metrics;
  }

  /**
   * Reset a specific swarm (clear queue, reset metrics)
   *
   * @param {string} swarmName - Name of swarm to reset
   */
  reset(swarmName) {
    if (!this.swarms[swarmName]) {
      logger.warn('Cannot reset unknown swarm', { swarmName });
      return;
    }

    const swarm = this.swarms[swarmName];
    swarm.taskQueue = [];
    swarm.results = [];
    swarm.metrics = {
      totalTasksSubmitted: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      totalDurationMs: 0,
      startTime: null,
      endTime: null,
      executionStartTime: null,
    };

    logger.info('Swarm reset', { swarmName });
    latent.record('swarm', `Swarm '${swarmName}' reset`, { swarmName });
  }

  /**
   * Reset all swarms
   */
  resetAll() {
    for (const swarmName of Object.keys(this.swarms)) {
      this.reset(swarmName);
    }
    logger.info('All swarms reset');
  }
}

// ═══════════════════════════════════════════════════════════════════
// Singleton Instance and Convenience Functions
// ═══════════════════════════════════════════════════════════════════

const swarms = new HeadySwarms({ autoInitialize: true });

/**
 * Convenience function to dispatch tasks in parallel
 * Uses the singleton instance
 *
 * @param {Array<Object>} tasks - Task array
 * @returns {Promise<Object>} Dispatch results
 */
async function dispatchParallel(tasks) {
  return swarms.dispatchParallel(tasks);
}

/**
 * Convenience function to execute a pipeline stage
 * Uses the singleton instance
 *
 * @param {string} stageName - Stage name
 * @param {Array<Object>} tasks - Tasks for stage
 * @returns {Promise<Object>} Stage execution results
 */
async function executeStage(stageName, tasks) {
  return swarms.executeStage(stageName, tasks);
}

// ═══════════════════════════════════════════════════════════════════
// Module Exports
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  HeadySwarms,
  swarms,
  dispatchParallel,
  executeStage,
};
