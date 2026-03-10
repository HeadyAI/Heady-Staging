/**
 * @heady/conductor — HeadyConductor Central Orchestrator
 * 
 * The central dispatch and coordination engine for all Heady tasks.
 * Routes tasks to the right AI nodes, manages pool scheduling,
 * coordinates HCFullPipeline runs, and synthesizes results.
 * 
 * Flow: User/Trigger → HeadyBuddy → HeadyConductor → Target Node(s) → Conductor → HeadyBuddy
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PHI, PSI, PSI2, FIB, phiThreshold, phiBackoff, cslGate } from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';
import { classifyTask, selectNodes, DOMAINS, POOLS } from './task-classifier.js';

const logger = createLogger({ service: 'heady-conductor' });

/** φ-scaled configuration */
const CONFIG = Object.freeze({
  maxConcurrentTasks: FIB[9],            // 34
  maxQueueDepth: FIB[13],               // 233
  taskTimeoutDefault: FIB[10] * 1000,    // 55s
  classificationCacheSize: FIB[12],      // 144
  arenaModeCandidates: FIB[4],          // 3 competing arrangements
  qualityGateThreshold: phiThreshold(2), // ≈0.809 MEDIUM
  assuranceGateThreshold: phiThreshold(3), // ≈0.882 HIGH
  patternCaptureThreshold: phiThreshold(1), // ≈0.691 LOW
});

/**
 * Task states — lifecycle tracking
 */
const TaskState = Object.freeze({
  RECEIVED: 'received',
  CLASSIFYING: 'classifying',
  QUEUED: 'queued',
  DISPATCHED: 'dispatched',
  EXECUTING: 'executing',
  QUALITY_CHECK: 'quality_check',
  ASSURANCE_CHECK: 'assurance_check',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMED_OUT: 'timed_out',
});

/**
 * ConductorTask — wraps a task through the full lifecycle
 */
class ConductorTask {
  constructor(description, context = {}) {
    this.id = randomUUID();
    this.description = description;
    this.context = context;
    this.state = TaskState.RECEIVED;
    this.domain = null;
    this.pool = null;
    this.assignedNodes = [];
    this.classification = null;
    this.result = null;
    this.error = null;
    this.qualityScore = null;
    this.assuranceScore = null;
    this.createdAt = Date.now();
    this.completedAt = null;
    this.stateHistory = [{ state: TaskState.RECEIVED, ts: Date.now() }];
  }

  transition(newState) {
    this.state = newState;
    this.stateHistory.push({ state: newState, ts: Date.now() });
  }

  get durationMs() {
    return (this.completedAt || Date.now()) - this.createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description.substring(0, 200),
      state: this.state,
      domain: this.domain?.id,
      pool: this.pool ? Object.keys(POOLS).find(k => POOLS[k] === this.pool) : null,
      assignedNodes: this.assignedNodes,
      qualityScore: this.qualityScore,
      assuranceScore: this.assuranceScore,
      durationMs: this.durationMs,
      stateHistory: this.stateHistory,
    };
  }
}

/**
 * HeadyConductor — the orchestration engine
 */
class HeadyConductor extends EventEmitter {
  #activeTasks = new Map();
  #taskQueue = [];
  #completedHistory = [];
  #nodeHealth = new Map();
  #classificationCache = new Map();
  #executors = new Map(); // Domain → executor function registry

  constructor() {
    super();
  }

  /**
   * Register a node executor function
   * Each domain can have a custom executor
   */
  registerExecutor(domainId, executorFn) {
    this.#executors.set(domainId, executorFn);
    logger.info('Executor registered', { domain: domainId });
  }

  /**
   * Update node health status
   */
  updateNodeHealth(nodeId, healthScore) {
    this.#nodeHealth.set(nodeId, {
      score: healthScore,
      updatedAt: Date.now(),
    });
  }

  /**
   * Submit a task to the Conductor
   * This is the main entry point — equivalent to HeadyBuddy → Conductor
   */
  async submitTask(description, context = {}) {
    const task = new ConductorTask(description, context);

    this.emit('task-received', { taskId: task.id });
    logger.info('Task received', { taskId: task.id, descriptionLength: description.length });

    // Phase 1: Classify
    task.transition(TaskState.CLASSIFYING);
    const classification = this.#classify(task);
    task.classification = classification;
    task.domain = classification.domain;
    task.pool = classification.pool;

    this.emit('task-classified', {
      taskId: task.id,
      domain: classification.domain.id,
      confidence: classification.confidence,
    });

    // Phase 2: Queue or dispatch
    if (this.#activeTasks.size >= CONFIG.maxConcurrentTasks) {
      if (this.#taskQueue.length >= CONFIG.maxQueueDepth) {
        task.transition(TaskState.FAILED);
        task.error = new Error('Conductor queue full — backpressure applied');
        this.emit('task-rejected', { taskId: task.id, reason: 'queue_full' });
        return task;
      }
      task.transition(TaskState.QUEUED);
      this.#taskQueue.push(task);
      return task;
    }

    return this.#dispatch(task);
  }

  /**
   * Classify task using CSL-gated domain matching
   */
  #classify(task) {
    // Check cache first
    const cacheKey = task.description.substring(0, FIB[11]).toLowerCase();
    if (this.#classificationCache.has(cacheKey)) {
      return this.#classificationCache.get(cacheKey);
    }

    const classification = classifyTask(task.description);

    // Cache result
    if (this.#classificationCache.size >= CONFIG.classificationCacheSize) {
      const firstKey = this.#classificationCache.keys().next().value;
      this.#classificationCache.delete(firstKey);
    }
    this.#classificationCache.set(cacheKey, classification);

    return classification;
  }

  /**
   * Dispatch task to selected nodes for execution
   */
  async #dispatch(task) {
    task.transition(TaskState.DISPATCHED);
    this.#activeTasks.set(task.id, task);

    // Select nodes based on domain and health
    const healthMap = Object.fromEntries(this.#nodeHealth);
    task.assignedNodes = selectNodes(task.domain, healthMap);

    this.emit('task-dispatched', {
      taskId: task.id,
      nodes: task.assignedNodes,
      pool: Object.keys(POOLS).find(k => POOLS[k] === task.pool),
    });

    // Phase 3: Execute with timeout
    task.transition(TaskState.EXECUTING);
    const timeoutMs = task.pool?.timeoutMs || CONFIG.taskTimeoutDefault;

    try {
      const result = await Promise.race([
        this.#execute(task),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Task execution timed out')), timeoutMs)
        ),
      ]);

      task.result = result;

      // Phase 4: Quality Gate
      task.transition(TaskState.QUALITY_CHECK);
      task.qualityScore = await this.#qualityGate(task);

      if (task.qualityScore < CONFIG.qualityGateThreshold) {
        logger.warn('Quality gate failed', {
          taskId: task.id,
          score: task.qualityScore,
          threshold: CONFIG.qualityGateThreshold,
        });
        // Re-execute once with different node if available
        if (task.assignedNodes.length > 1) {
          task.assignedNodes = task.assignedNodes.slice(1);
          const retryResult = await this.#execute(task);
          task.result = retryResult;
          task.qualityScore = await this.#qualityGate(task);
        }
      }

      // Phase 5: Assurance Gate
      task.transition(TaskState.ASSURANCE_CHECK);
      task.assuranceScore = await this.#assuranceGate(task);

      // Phase 6: Complete
      task.transition(TaskState.COMPLETED);
      task.completedAt = Date.now();

      this.emit('task-completed', {
        taskId: task.id,
        qualityScore: task.qualityScore,
        assuranceScore: task.assuranceScore,
        durationMs: task.durationMs,
      });

      // Phase 7: Pattern capture
      if (task.qualityScore > CONFIG.patternCaptureThreshold) {
        this.emit('pattern-captured', {
          taskId: task.id,
          domain: task.domain.id,
          durationMs: task.durationMs,
          confidence: task.classification.confidence,
        });
      }

      logger.info('Task completed', {
        taskId: task.id,
        domain: task.domain.id,
        durationMs: task.durationMs,
      });

      return task;
    } catch (err) {
      if (err.message.includes('timed out')) {
        task.transition(TaskState.TIMED_OUT);
      } else {
        task.transition(TaskState.FAILED);
      }
      task.error = err;
      task.completedAt = Date.now();

      this.emit('task-failed', {
        taskId: task.id,
        error: err.message,
        state: task.state,
      });

      logger.error('Task failed', {
        taskId: task.id,
        error: err.message,
      });

      return task;
    } finally {
      this.#activeTasks.delete(task.id);
      this.#archiveTask(task);
      this.#drainQueue();
    }
  }

  /**
   * Execute task via registered executor or default handler
   */
  async #execute(task) {
    const executor = this.#executors.get(task.domain.id);
    if (executor) {
      return executor(task);
    }

    // Default execution: return task context with node assignment
    return {
      taskId: task.id,
      domain: task.domain.id,
      nodes: task.assignedNodes,
      executed: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Quality gate — validates output meets minimum standards
   * Uses CSL gate with MEDIUM threshold
   */
  async #qualityGate(task) {
    if (!task.result) return 0;

    // Compute quality score based on result completeness
    let score = PSI; // Base score for having a result
    if (task.result.executed) score += PSI2;
    if (task.durationMs < (task.pool?.timeoutMs || CONFIG.taskTimeoutDefault) * PSI) {
      score += PSI2; // Bonus for fast execution
    }
    if (!task.error) score += PSI2;

    return Math.min(1, cslGate(score, score, phiThreshold(1)));
  }

  /**
   * Assurance gate — certifies output for deployment/delivery
   * Uses CSL gate with HIGH threshold
   */
  async #assuranceGate(task) {
    if (task.qualityScore < CONFIG.qualityGateThreshold) return 0;
    // Assurance builds on quality
    return cslGate(task.qualityScore, task.qualityScore, phiThreshold(2));
  }

  /**
   * Archive completed task to history ring buffer
   */
  #archiveTask(task) {
    this.#completedHistory.push(task);
    if (this.#completedHistory.length > FIB[12]) { // Keep 144
      this.#completedHistory.shift();
    }
  }

  /**
   * Drain queued tasks when capacity opens
   */
  #drainQueue() {
    while (
      this.#taskQueue.length > 0 &&
      this.#activeTasks.size < CONFIG.maxConcurrentTasks
    ) {
      const task = this.#taskQueue.shift();
      this.#dispatch(task).catch(err => {
        logger.error('Queued task dispatch failed', {
          taskId: task.id,
          error: err.message,
        });
      });
    }
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.#activeTasks.get(taskId)
      || this.#completedHistory.find(t => t.id === taskId)
      || null;
  }

  get stats() {
    return {
      activeTasks: this.#activeTasks.size,
      queueDepth: this.#taskQueue.length,
      completedTotal: this.#completedHistory.length,
      maxConcurrent: CONFIG.maxConcurrentTasks,
      maxQueue: CONFIG.maxQueueDepth,
      nodeHealthCount: this.#nodeHealth.size,
      executorCount: this.#executors.size,
    };
  }
}

export {
  HeadyConductor,
  ConductorTask,
  TaskState,
  CONFIG as CONDUCTOR_CONFIG,
};
