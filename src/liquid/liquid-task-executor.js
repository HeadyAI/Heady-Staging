/**
 * Heady™ Liquid Task Executor v5.0
 * Async parallel task execution engine with DAG decomposition
 * Topological sort, phi-backoff retry, dead letter queue
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');
const {
  PHI, PSI, PSI_SQ, fib, phiBackoffWithJitter, phiFusionScore,
  CSL_THRESHOLDS, PHI_TIMING,
  cslAND, getPressureLevel,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('liquid-task-executor');

const MAX_CONCURRENCY = fib(8);    // 21 parallel tasks
const DLQ_CAPACITY = fib(13);      // 233 dead letter queue
const MAX_RETRIES = fib(5);        // 5 retry attempts

// Pool timeouts: Fibonacci-scaled. Hot=fib(9)s=34s, Warm=fib(13)s=233s, Cold=fib(17)s=1597s
const POOL_TIMEOUTS = Object.freeze({
  HOT:  fib(9) * 1000,    // 34,000ms
  WARM: fib(13) * 1000,   // 233,000ms
  COLD: fib(17) * 1000,   // 1,597,000ms
});

class TaskDAG {
  constructor() {
    this.tasks = new Map();
    this.edges = new Map();  // taskId → [dependency taskIds]
    this.reverseEdges = new Map(); // taskId → [dependent taskIds]
  }

  addTask(task) {
    this.tasks.set(task.id, task);
    if (!this.edges.has(task.id)) this.edges.set(task.id, []);
    if (!this.reverseEdges.has(task.id)) this.reverseEdges.set(task.id, []);
  }

  addDependency(taskId, dependsOnId) {
    const deps = this.edges.get(taskId) || [];
    deps.push(dependsOnId);
    this.edges.set(taskId, deps);

    const rev = this.reverseEdges.get(dependsOnId) || [];
    rev.push(taskId);
    this.reverseEdges.set(dependsOnId, rev);
  }

  topologicalSort() {
    const visited = new Set();
    const inStack = new Set();
    const order = [];
    let hasCycle = false;

    const dfs = (taskId) => {
      if (inStack.has(taskId)) { hasCycle = true; return; }
      if (visited.has(taskId)) return;

      visited.add(taskId);
      inStack.add(taskId);

      for (const dep of (this.edges.get(taskId) || [])) {
        dfs(dep);
        if (hasCycle) return;
      }

      inStack.delete(taskId);
      order.push(taskId);
    };

    for (const taskId of this.tasks.keys()) {
      if (!visited.has(taskId)) dfs(taskId);
      if (hasCycle) break;
    }

    if (hasCycle) {
      logger.error('dag_cycle_detected');
      return null;
    }

    return order; // Dependencies first
  }

  getReadyTasks(completedIds) {
    const ready = [];
    for (const [taskId, deps] of this.edges) {
      if (completedIds.has(taskId)) continue;
      const allDepsComplete = deps.every(d => completedIds.has(d));
      if (allDepsComplete) ready.push(taskId);
    }
    return ready;
  }

  get size() { return this.tasks.size; }
}

class DeadLetterQueue {
  constructor(capacity = DLQ_CAPACITY) {
    this.capacity = capacity;
    this.queue = [];
  }

  add(task, error, attempts) {
    if (this.queue.length >= this.capacity) {
      this.queue.shift(); // Drop oldest
    }
    this.queue.push({
      task,
      error: error.message || String(error),
      attempts,
      timestamp: new Date().toISOString(),
    });
    logger.warn('dlq_entry_added', { taskId: task.id, attempts, error: error.message || String(error) });
  }

  get size() { return this.queue.length; }
  drain() { const items = [...this.queue]; this.queue = []; return items; }
}

class LiquidTaskExecutor extends EventEmitter {
  constructor(mesh) {
    super();
    this.mesh = mesh;
    this.maxConcurrency = MAX_CONCURRENCY;
    this.activeTasks = new Map();
    this.completedTasks = new Set();
    this.failedTasks = new Map();
    this.deadLetterQueue = new DeadLetterQueue();
    this.totalExecuted = 0;
    this.totalFailed = 0;
    this.totalLatencyMs = 0;
  }

  async executeDAG(dag) {
    const executionId = `exec-${crypto.randomBytes(fib(4)).toString('hex')}`;
    const start = Date.now();

    const sortOrder = dag.topologicalSort();
    if (!sortOrder) {
      return { success: false, error: 'CYCLE_DETECTED', executionId };
    }

    logger.info('dag_execution_started', {
      executionId,
      totalTasks: dag.size,
      sortOrder: sortOrder.length,
    });

    this.emit('executionStarted', { executionId, totalTasks: dag.size });

    const completed = new Set();
    const failed = new Map();
    const results = new Map();

    while (completed.size + failed.size < dag.size) {
      const readyTaskIds = dag.getReadyTasks(completed);
      const pending = readyTaskIds.filter(id => !this.activeTasks.has(id) && !failed.has(id));

      if (pending.length === 0 && this.activeTasks.size === 0) {
        // No more work possible
        break;
      }

      // Launch tasks up to concurrency limit
      const toExecute = pending.slice(0, this.maxConcurrency - this.activeTasks.size);

      const promises = toExecute.map(taskId => {
        const task = dag.tasks.get(taskId);
        this.activeTasks.set(taskId, { startTime: Date.now() });
        return this._executeWithRetry(task)
          .then(result => ({ taskId, success: true, result }))
          .catch(error => ({ taskId, success: false, error }));
      });

      if (promises.length > 0) {
        // Wait for at least one to finish
        const settled = await Promise.race(promises.map(p =>
          p.then(r => {
            this.activeTasks.delete(r.taskId);
            if (r.success) {
              completed.add(r.taskId);
              results.set(r.taskId, r.result);
              this.totalExecuted++;
              this.emit('taskCompleted', { executionId, taskId: r.taskId });
            } else {
              failed.set(r.taskId, r.error);
              this.totalFailed++;
              this.emit('taskFailed', { executionId, taskId: r.taskId, error: r.error });
            }
            return r;
          })
        ));

        // Let remaining settle too
        await Promise.allSettled(promises);
        for (const p of promises) {
          const r = await p;
          if (!completed.has(r.taskId) && !failed.has(r.taskId)) {
            this.activeTasks.delete(r.taskId);
            if (r.success) {
              completed.add(r.taskId);
              results.set(r.taskId, r.result);
              this.totalExecuted++;
            } else {
              failed.set(r.taskId, r.error);
              this.totalFailed++;
            }
          }
        }
      } else {
        // Wait for active tasks to complete
        await new Promise(resolve => setTimeout(resolve, PHI_TIMING.PHI_2)); // ~2618ms cool-down
      }

      this.emit('progress', {
        executionId,
        completed: completed.size,
        failed: failed.size,
        total: dag.size,
        progress: (completed.size + failed.size) / dag.size,
      });
    }

    const totalLatency = Date.now() - start;
    this.totalLatencyMs += totalLatency;

    const executionResult = {
      executionId,
      success: failed.size === 0,
      completed: completed.size,
      failed: failed.size,
      total: dag.size,
      results: Object.fromEntries(results),
      failures: Object.fromEntries(failed),
      latencyMs: totalLatency,
      timestamp: new Date().toISOString(),
    };

    logger.info('dag_execution_complete', {
      executionId,
      completed: completed.size,
      failed: failed.size,
      latencyMs: totalLatency,
    });

    this.emit('executionComplete', executionResult);
    return executionResult;
  }

  async _executeWithRetry(task, attempt = 0) {
    const pool = task.pool || 'WARM';
    const timeout = POOL_TIMEOUTS[pool] || POOL_TIMEOUTS.WARM;

    try {
      const result = await this._executeWithTimeout(task, timeout);
      return result;
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        this.deadLetterQueue.add(task, err, attempt + 1);
        throw err;
      }

      const delay = phiBackoffWithJitter(attempt);
      logger.warn('task_retry', {
        taskId: task.id,
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
        delayMs: delay,
        error: err.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return this._executeWithRetry(task, attempt + 1);
    }
  }

  async _executeWithTimeout(task, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Route via mesh
      const routeResult = this.mesh.routeTask(task);
      if (!routeResult) {
        clearTimeout(timer);
        reject(new Error(`No available node for task ${task.id}`));
        return;
      }

      if (routeResult.queued) {
        clearTimeout(timer);
        resolve({ queued: true, position: routeResult.position });
        return;
      }

      // Execute on the routed node
      const node = this.mesh.nodes.get(routeResult.nodeId);
      if (!node) {
        clearTimeout(timer);
        reject(new Error(`Node ${routeResult.nodeId} not found`));
        return;
      }

      node.executeTask(task)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  async executeSingle(task) {
    const start = Date.now();
    try {
      const result = await this._executeWithRetry(task);
      this.totalExecuted++;
      this.totalLatencyMs += Date.now() - start;
      return { success: true, result, latencyMs: Date.now() - start };
    } catch (err) {
      this.totalFailed++;
      this.totalLatencyMs += Date.now() - start;
      return { success: false, error: err.message, latencyMs: Date.now() - start };
    }
  }

  decompose(complexTask) {
    const dag = new TaskDAG();

    if (!complexTask.subtasks || complexTask.subtasks.length === 0) {
      dag.addTask(complexTask);
      return dag;
    }

    for (const subtask of complexTask.subtasks) {
      const st = {
        id: subtask.id || `${complexTask.id}-sub-${crypto.randomBytes(3).toString('hex')}`,
        ...subtask,
        parentId: complexTask.id,
      };
      dag.addTask(st);

      if (subtask.dependsOn) {
        for (const depId of subtask.dependsOn) {
          dag.addDependency(st.id, depId);
        }
      }
    }

    // Compute priority scores
    for (const [taskId, task] of dag.tasks) {
      task.priority = phiFusionScore([
        task.urgency || 0.5,
        task.complexity || 0.5,
        task.coherence || 0.5,
      ]);
    }

    logger.info('task_decomposed', {
      parentId: complexTask.id,
      subtaskCount: dag.size,
    });

    return dag;
  }

  getStats() {
    return {
      totalExecuted: this.totalExecuted,
      totalFailed: this.totalFailed,
      activeTasks: this.activeTasks.size,
      deadLetterQueueSize: this.deadLetterQueue.size,
      avgLatencyMs: this.totalExecuted > 0
        ? Math.round(this.totalLatencyMs / this.totalExecuted)
        : 0,
      maxConcurrency: this.maxConcurrency,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { LiquidTaskExecutor, TaskDAG, DeadLetterQueue };
