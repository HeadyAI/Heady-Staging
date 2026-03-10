/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Task Decomposer — DAG-based task decomposition engine.
 * Breaks complex tasks into subtask graphs with dependency tracking,
 * topological sort, and CSL-scored capability matching against the 17 swarms.
 *
 * Founder: Eric Haywood
 * @module core/async-engine/task-decomposer
 */

import { randomUUID } from 'crypto';
import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,
  phiFusionWeights,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';
import { cosine, domainToVector } from '../swarm-engine/bee-lifecycle.js';

const logger = createLogger('task-decomposer');

/** Subtask states */
const SUBTASK_STATE = Object.freeze({
  PENDING:    'pending',
  READY:      'ready',
  RUNNING:    'running',
  COMPLETED:  'completed',
  FAILED:     'failed',
  SKIPPED:    'skipped',
});

/** Maximum subtask depth */
const MAX_DEPTH = fib(6); // 8 levels deep
/** Maximum subtasks per decomposition */
const MAX_SUBTASKS = fib(10); // 55

class TaskDecomposer {
  constructor() {
    /** @type {Map<string, object>} */
    this._decompositions = new Map();
  }

  /**
   * Decompose a complex task into a DAG of subtasks.
   * @param {object} task - { id, description, vector, subtasks }
   * @param {object[]} task.subtasks - Array of { id, description, dependencies[], vector }
   * @returns {object} Decomposition with topologically sorted execution plan
   */
  decompose(task) {
    const decompositionId = `decomp-${randomUUID().slice(0, 12)}`;

    if (!task.subtasks || task.subtasks.length === 0) {
      throw new Error('Task must have subtasks for decomposition');
    }

    if (task.subtasks.length > MAX_SUBTASKS) {
      throw new Error(`Too many subtasks: ${task.subtasks.length} > ${MAX_SUBTASKS}`);
    }

    // Build subtask nodes
    const nodes = new Map();
    for (const sub of task.subtasks) {
      const id = sub.id || `sub-${randomUUID().slice(0, 8)}`;
      nodes.set(id, {
        id,
        description: sub.description,
        dependencies: sub.dependencies || [],
        vector: sub.vector || domainToVector(sub.description || id),
        state: SUBTASK_STATE.PENDING,
        result: null,
        startedAt: 0,
        completedAt: 0,
        assignedSwarm: null,
        depth: 0,
      });
    }

    // Validate dependencies
    for (const [id, node] of nodes) {
      for (const dep of node.dependencies) {
        if (!nodes.has(dep)) {
          throw new Error(`Subtask ${id} depends on unknown subtask ${dep}`);
        }
      }
    }

    // Compute depths
    this._computeDepths(nodes);

    // Topological sort with cycle detection
    const executionOrder = this._topologicalSort(nodes);

    // Identify parallelizable groups (same depth = can run in parallel)
    const parallelGroups = this._buildParallelGroups(executionOrder, nodes);

    const decomposition = {
      id: decompositionId,
      taskId: task.id,
      taskDescription: task.description,
      nodes,
      executionOrder,
      parallelGroups,
      createdAt: Date.now(),
      status: 'pending',
    };

    this._decompositions.set(decompositionId, decomposition);

    logger.info('Task decomposed', {
      decompositionId,
      taskId: task.id,
      subtasks: nodes.size,
      parallelGroups: parallelGroups.length,
      maxDepth: Math.max(...Array.from(nodes.values()).map(n => n.depth)),
    });

    return {
      decompositionId,
      executionOrder: executionOrder.map(id => ({
        id,
        description: nodes.get(id).description,
        depth: nodes.get(id).depth,
        dependencies: nodes.get(id).dependencies,
      })),
      parallelGroups: parallelGroups.map(group => ({
        depth: group.depth,
        subtasks: group.subtaskIds,
      })),
      totalSubtasks: nodes.size,
    };
  }

  /**
   * Get the next batch of ready subtasks (dependencies all completed).
   * @param {string} decompositionId
   * @returns {object[]} Ready subtasks
   */
  getReadySubtasks(decompositionId) {
    const decomp = this._decompositions.get(decompositionId);
    if (!decomp) return [];

    const ready = [];
    for (const [id, node] of decomp.nodes) {
      if (node.state !== SUBTASK_STATE.PENDING) continue;

      // Check all dependencies are completed
      const allDepsComplete = node.dependencies.every(dep => {
        const depNode = decomp.nodes.get(dep);
        return depNode && depNode.state === SUBTASK_STATE.COMPLETED;
      });

      if (allDepsComplete) {
        node.state = SUBTASK_STATE.READY;
        ready.push({ id, ...node });
      }
    }

    return ready;
  }

  /**
   * Mark a subtask as started.
   * @param {string} decompositionId
   * @param {string} subtaskId
   * @param {string} [swarmId]
   */
  markStarted(decompositionId, subtaskId, swarmId = null) {
    const decomp = this._decompositions.get(decompositionId);
    if (!decomp) return;

    const node = decomp.nodes.get(subtaskId);
    if (!node) return;

    node.state = SUBTASK_STATE.RUNNING;
    node.startedAt = Date.now();
    node.assignedSwarm = swarmId;
  }

  /**
   * Mark a subtask as completed.
   * @param {string} decompositionId
   * @param {string} subtaskId
   * @param {*} result
   */
  markCompleted(decompositionId, subtaskId, result = null) {
    const decomp = this._decompositions.get(decompositionId);
    if (!decomp) return;

    const node = decomp.nodes.get(subtaskId);
    if (!node) return;

    node.state = SUBTASK_STATE.COMPLETED;
    node.completedAt = Date.now();
    node.result = result;

    // Check if all subtasks are complete
    const allComplete = Array.from(decomp.nodes.values())
      .every(n => n.state === SUBTASK_STATE.COMPLETED || n.state === SUBTASK_STATE.SKIPPED);

    if (allComplete) {
      decomp.status = 'completed';
    }
  }

  /**
   * Mark a subtask as failed.
   * @param {string} decompositionId
   * @param {string} subtaskId
   * @param {string} error
   */
  markFailed(decompositionId, subtaskId, error) {
    const decomp = this._decompositions.get(decompositionId);
    if (!decomp) return;

    const node = decomp.nodes.get(subtaskId);
    if (!node) return;

    node.state = SUBTASK_STATE.FAILED;
    node.completedAt = Date.now();
    node.result = { error };
    decomp.status = 'failed';

    logger.error('Subtask failed', { decompositionId, subtaskId, error });
  }

  /**
   * Get progress of a decomposition.
   * @param {string} decompositionId
   * @returns {object}
   */
  getProgress(decompositionId) {
    const decomp = this._decompositions.get(decompositionId);
    if (!decomp) return null;

    const total = decomp.nodes.size;
    let completed = 0, running = 0, pending = 0, failed = 0, ready = 0;

    for (const node of decomp.nodes.values()) {
      switch (node.state) {
        case SUBTASK_STATE.COMPLETED: completed++; break;
        case SUBTASK_STATE.RUNNING: running++; break;
        case SUBTASK_STATE.PENDING: pending++; break;
        case SUBTASK_STATE.FAILED: failed++; break;
        case SUBTASK_STATE.READY: ready++; break;
      }
    }

    return {
      decompositionId,
      status: decomp.status,
      total,
      completed,
      running,
      ready,
      pending,
      failed,
      progress: total > 0 ? completed / total : 0,
    };
  }

  // ── Private ───────────────────────────────────────────────

  /**
   * Compute node depths in the DAG.
   * @private
   */
  _computeDepths(nodes) {
    const visited = new Set();
    const computeDepth = (id) => {
      if (visited.has(id)) return nodes.get(id).depth;
      visited.add(id);

      const node = nodes.get(id);
      if (node.dependencies.length === 0) {
        node.depth = 0;
        return 0;
      }

      let maxDepth = 0;
      for (const dep of node.dependencies) {
        const depDepth = computeDepth(dep);
        maxDepth = Math.max(maxDepth, depDepth);
      }

      node.depth = maxDepth + 1;
      if (node.depth > MAX_DEPTH) {
        throw new Error(`Subtask depth exceeds maximum: ${node.depth} > ${MAX_DEPTH}`);
      }
      return node.depth;
    };

    for (const id of nodes.keys()) {
      computeDepth(id);
    }
  }

  /**
   * Topological sort with cycle detection using Kahn's algorithm.
   * @private
   */
  _topologicalSort(nodes) {
    const inDegree = new Map();
    const adjList = new Map();

    for (const [id, node] of nodes) {
      inDegree.set(id, node.dependencies.length);
      if (!adjList.has(id)) adjList.set(id, []);
      for (const dep of node.dependencies) {
        if (!adjList.has(dep)) adjList.set(dep, []);
        adjList.get(dep).push(id);
      }
    }

    const queue = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const sorted = [];
    while (queue.length > 0) {
      const current = queue.shift();
      sorted.push(current);

      for (const neighbor of (adjList.get(current) || [])) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sorted.length !== nodes.size) {
      throw new Error('Cycle detected in subtask dependency graph');
    }

    return sorted;
  }

  /**
   * Group subtasks by depth for parallel execution.
   * @private
   */
  _buildParallelGroups(executionOrder, nodes) {
    const groups = new Map();
    for (const id of executionOrder) {
      const depth = nodes.get(id).depth;
      if (!groups.has(depth)) {
        groups.set(depth, { depth, subtaskIds: [] });
      }
      groups.get(depth).subtaskIds.push(id);
    }

    return Array.from(groups.values()).sort((a, b) => a.depth - b.depth);
  }
}

export { TaskDecomposer, SUBTASK_STATE, MAX_DEPTH, MAX_SUBTASKS };
