/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * CSL-Gated Task Router — Concurrent-equals routing across 17 swarms.
 * Uses CSL cosine similarity for task-swarm affinity.
 * NO priority sorting — all swarms get equal scheduling opportunity.
 *
 * Founder: Eric Haywood
 * @module core/swarm-engine/task-router
 */

import { EventEmitter } from 'events';
import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,
  cslGate,
  phiFusionWeights,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';
import { cosine } from './bee-lifecycle.js';

const logger = createLogger('task-router');

const PSI2 = PSI * PSI;

class TaskRouter extends EventEmitter {
  /**
   * @param {object} swarmManager - SwarmManager instance
   */
  constructor(swarmManager) {
    super();
    this._swarmManager = swarmManager;
    this._roundRobinOffset = 0;
    this._routingHistory = [];
    this._historyCapacity = fib(14); // 377
  }

  /**
   * Route a task to the best swarm using CSL cosine similarity.
   * Concurrent-equals: no priority sorting, uses CSL affinity + load awareness.
   *
   * @param {object} task - { id, vector, payload, type }
   * @returns {object|null} { swarmId, beeId, score }
   */
  routeTask(task) {
    if (!task.vector) {
      logger.warn('Task has no vector, using round-robin', { taskId: task.id });
      return this._roundRobinRoute(task);
    }

    const swarms = this._swarmManager.getAllSwarms();
    if (swarms.length === 0) {
      logger.warn('No swarms available for routing');
      return null;
    }

    // Score all swarms by CSL cosine similarity (concurrent-equals, NOT priority)
    const scored = [];
    for (const swarm of swarms) {
      const cosineSim = cosine(task.vector, swarm.centroidVector);

      // CSL soft-gate activation
      const gatedAffinity = cslGate(
        cosineSim,
        cosineSim,
        CSL_THRESHOLDS.MEDIUM,
        0.1
      );

      // Load factor: prefer swarms with capacity (NOT priority-based)
      const utilization = swarm.getUtilization();
      const loadFactor = 1.0 - utilization;

      // Queue pressure factor
      const queuePressure = swarm.taskBuffer.length / fib(14);
      const queueFactor = 1.0 - queuePressure;

      // Composite score: phi-weighted combination
      const [wAffinity, wLoad, wQueue] = phiFusionWeights(3);
      const score =
        gatedAffinity * wAffinity +
        loadFactor * wLoad +
        Math.max(0, queueFactor) * wQueue;

      scored.push({
        swarmId: swarm.id,
        swarmName: swarm.name,
        score,
        cosineSim,
        utilization,
        queueDepth: swarm.taskBuffer.length,
      });
    }

    // Filter by minimum CSL threshold
    const viable = scored.filter(s => s.cosineSim >= CSL_THRESHOLDS.LOW);

    if (viable.length === 0) {
      logger.info('No swarm above CSL threshold, using best available', {
        taskId: task.id,
        bestSim: scored.length > 0 ? Math.max(...scored.map(s => s.cosineSim)) : 0,
      });
      // Fall back to best available even below threshold
      scored.sort((a, b) => b.score - a.score);
      if (scored.length > 0) {
        return this._routeToSwarm(scored[0], task);
      }
      return null;
    }

    viable.sort((a, b) => b.score - a.score);

    // Concurrent-equals tie-breaking: round-robin among top tier
    const topScore = viable[0].score;
    const topTier = viable.filter(s => s.score >= topScore * PSI);

    const selected = topTier[this._roundRobinOffset % topTier.length];
    this._roundRobinOffset = (this._roundRobinOffset + 1) % fib(16);

    return this._routeToSwarm(selected, task);
  }

  /**
   * Route to the optimal bee within a swarm.
   * @param {string} swarmId
   * @param {object} task
   * @returns {object|null} { beeId, score }
   */
  routeToOptimalBee(swarmId, task) {
    const swarm = this._swarmManager.getSwarm(swarmId);
    if (!swarm) return null;

    const bees = Array.from(swarm.bees.values())
      .filter(b => b.state === 'idle' || b.state === 'working');

    if (bees.length === 0) {
      // Buffer the task in the swarm
      swarm.taskBuffer.push(task);
      logger.info('No available bees, task buffered', { swarmId, taskId: task.id });
      return null;
    }

    let bestBee = null;
    let bestScore = -Infinity;

    for (const bee of bees) {
      // CSL cosine similarity with bee capability vector
      const cosineSim = task.vector ? cosine(task.vector, bee.vector) : PSI;

      // Load factor: prefer idle bees
      const idleBoost = bee.state === 'idle' ? PHI : 1.0;
      const queueLoad = bee.taskQueue.length / fib(12);
      const loadFactor = (1.0 - queueLoad) * idleBoost;

      // Health factor
      const healthFactor = bee._healthScore;

      const [wSim, wLoad, wHealth] = phiFusionWeights(3);
      const score = cosineSim * wSim + loadFactor * wLoad + healthFactor * wHealth;

      if (score > bestScore) {
        bestScore = score;
        bestBee = bee;
      }
    }

    if (bestBee && bestBee.assignTask(task)) {
      return { beeId: bestBee.id, score: bestScore };
    }

    // All bees rejected — buffer the task
    swarm.taskBuffer.push(task);
    return null;
  }

  /**
   * Broadcast a task to all swarms above CSL_THRESHOLDS.MEDIUM.
   * @param {object} task
   * @returns {object[]} Array of routing results
   */
  broadcastTask(task) {
    const results = [];
    const swarms = this._swarmManager.getAllSwarms();

    for (const swarm of swarms) {
      const cosineSim = task.vector ? cosine(task.vector, swarm.centroidVector) : PSI;
      if (cosineSim >= CSL_THRESHOLDS.MEDIUM) {
        const beeResult = this.routeToOptimalBee(swarm.id, task);
        results.push({
          swarmId: swarm.id,
          swarmName: swarm.name,
          cosineSim,
          beeResult,
        });
      }
    }

    logger.info('Task broadcast', {
      taskId: task.id,
      recipientCount: results.length,
    });

    return results;
  }

  /**
   * Multicast a task to specific swarms.
   * @param {object} task
   * @param {string[]} swarmIds
   * @returns {object[]}
   */
  multicastTask(task, swarmIds) {
    const results = [];
    for (const swarmId of swarmIds) {
      const beeResult = this.routeToOptimalBee(swarmId, task);
      results.push({ swarmId, beeResult });
    }
    return results;
  }

  /**
   * Get routing statistics.
   * @returns {object}
   */
  getRoutingStats() {
    return {
      totalRouted: this._routingHistory.length,
      routingHistory: this._routingHistory.slice(-fib(8)),
    };
  }

  // ── Private ───────────────────────────────────────────────

  /**
   * Complete routing to a selected swarm.
   * @private
   */
  _routeToSwarm(selected, task) {
    const beeResult = this.routeToOptimalBee(selected.swarmId, task);

    const record = {
      taskId: task.id,
      swarmId: selected.swarmId,
      swarmName: selected.swarmName,
      score: selected.score,
      cosineSim: selected.cosineSim,
      beeId: beeResult?.beeId || null,
      timestamp: Date.now(),
    };

    this._recordRouting(record);

    this.emit('task:routed', record);
    logger.info('Task routed', {
      taskId: task.id,
      swarm: selected.swarmName,
      score: selected.score,
    });

    return {
      swarmId: selected.swarmId,
      swarmName: selected.swarmName,
      beeId: beeResult?.beeId || null,
      score: selected.score,
      cosineSim: selected.cosineSim,
    };
  }

  /**
   * Round-robin routing for tasks without vectors.
   * @private
   */
  _roundRobinRoute(task) {
    const swarms = this._swarmManager.getAllSwarms();
    if (swarms.length === 0) return null;

    const swarm = swarms[this._roundRobinOffset % swarms.length];
    this._roundRobinOffset = (this._roundRobinOffset + 1) % fib(16);

    const beeResult = this.routeToOptimalBee(swarm.id, task);
    return {
      swarmId: swarm.id,
      swarmName: swarm.name,
      beeId: beeResult?.beeId || null,
      score: PSI, // Default confidence for round-robin
      cosineSim: PSI,
    };
  }

  /**
   * Record routing to history ring buffer.
   * @private
   */
  _recordRouting(record) {
    this._routingHistory.push(record);
    while (this._routingHistory.length > this._historyCapacity) {
      this._routingHistory.shift();
    }
  }
}

export { TaskRouter };
