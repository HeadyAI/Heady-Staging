/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Work-Stealing Scheduler — Load balancing across 17 swarms.
 * Hungry swarms steal compatible tasks from overloaded swarms.
 * Compatibility checked via CSL cosine similarity.
 *
 * Founder: Eric Haywood
 * @module core/swarm-engine/work-stealer
 */

import phiMath from '@heady/phi-math-foundation';
import { EventEmitter } from 'events';
import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,

} = phiMath.default || phiMath;
import structuredLogger from '@heady/structured-logger';
const { createLogger } = structuredLogger.default || structuredLogger;
import { cosine } from './bee-lifecycle.js';

const logger = createLogger('work-stealer');

const PSI2 = PSI * PSI;

/** Steal batch size: fib(6) = 8 tasks per steal operation */
const STEAL_BATCH_SIZE = fib(6);

/** Minimum CSL similarity for steal compatibility */
const STEAL_MIN_SIMILARITY = CSL_THRESHOLDS.LOW; // ≈ 0.691

class WorkStealer extends EventEmitter {
  /**
   * @param {object} swarmManager - SwarmManager instance
   */
  constructor(swarmManager) {
    super();
    this._swarmManager = swarmManager;
    this._stealHistory = [];
    this._rebalanceInterval = null;
  }

  /**
   * Attempt to steal work for a hungry swarm.
   * A swarm is "hungry" if it has idle bees and a short queue.
   *
   * @param {string} hungrySwarmId
   * @returns {object} { stolen: number, from: string[] }
   */
  stealWork(hungrySwarmId) {
    const hungrySwarm = this._swarmManager.getSwarm(hungrySwarmId);
    if (!hungrySwarm) return { stolen: 0, from: [] };

    // Only steal if queue is low and bees are idle
    if (hungrySwarm.taskBuffer.length >= fib(3)) {
      return { stolen: 0, from: [], reason: 'queue not empty enough' };
    }
    if (hungrySwarm.getIdleBeeCount() === 0) {
      return { stolen: 0, from: [], reason: 'no idle bees' };
    }

    const allSwarms = this._swarmManager.getAllSwarms();
    const sources = [];
    let totalStolen = 0;

    for (const sourceSwarm of allSwarms) {
      if (sourceSwarm.id === hungrySwarmId) continue;
      if (sourceSwarm.taskBuffer.length < fib(5)) continue; // Not overloaded enough

      // Check semantic compatibility
      const similarity = cosine(hungrySwarm.centroidVector, sourceSwarm.centroidVector);
      if (similarity < STEAL_MIN_SIMILARITY) continue;

      // Steal up to STEAL_BATCH_SIZE tasks
      const toSteal = Math.min(
        STEAL_BATCH_SIZE,
        sourceSwarm.taskBuffer.length - fib(3), // Keep at least fib(3) in source
        fib(12) - hungrySwarm.taskBuffer.length  // Don't overflow hungry queue
      );

      if (toSteal <= 0) continue;

      // Pick tasks from the back of the source queue (least recently added)
      const stolen = sourceSwarm.taskBuffer.splice(-toSteal, toSteal);
      hungrySwarm.taskBuffer.push(...stolen);
      totalStolen += stolen.length;

      sources.push({
        swarmId: sourceSwarm.id,
        swarmName: sourceSwarm.name,
        tasksStolen: stolen.length,
        similarity: Math.round(similarity * 10000) / 10000,
      });

      logger.info('Work stolen', {
        from: sourceSwarm.name,
        to: hungrySwarm.name,
        count: stolen.length,
        similarity,
      });
    }

    if (totalStolen > 0) {
      this._recordSteal({
        hungrySwarmId,
        totalStolen,
        sources,
        timestamp: Date.now(),
      });

      this.emit('work:stolen', {
        hungrySwarmId,
        hungrySwarmName: hungrySwarm.name,
        totalStolen,
        sources,
      });
    }

    return { stolen: totalStolen, from: sources };
  }

  /**
   * Donate work from an overloaded swarm to compatible hungry swarms.
   * @param {string} overloadedSwarmId
   * @param {number} [count=STEAL_BATCH_SIZE]
   * @returns {object}
   */
  donateWork(overloadedSwarmId, count = STEAL_BATCH_SIZE) {
    const overloaded = this._swarmManager.getSwarm(overloadedSwarmId);
    if (!overloaded) return { donated: 0, to: [] };

    if (overloaded.taskBuffer.length < fib(5)) {
      return { donated: 0, to: [], reason: 'not enough tasks to donate' };
    }

    const allSwarms = this._swarmManager.getAllSwarms();
    const recipients = [];
    let totalDonated = 0;

    // Find hungry compatible swarms
    for (const targetSwarm of allSwarms) {
      if (targetSwarm.id === overloadedSwarmId) continue;
      if (totalDonated >= count) break;

      // Must have capacity
      const utilization = targetSwarm.getUtilization();
      if (utilization >= PSI) continue; // Only donate to swarms below PSI utilization

      // Check compatibility
      const similarity = cosine(overloaded.centroidVector, targetSwarm.centroidVector);
      if (similarity < STEAL_MIN_SIMILARITY) continue;

      const toDonate = Math.min(
        count - totalDonated,
        fib(14) - targetSwarm.taskBuffer.length
      );

      if (toDonate <= 0) continue;

      const donated = overloaded.taskBuffer.splice(0, toDonate);
      targetSwarm.taskBuffer.push(...donated);
      totalDonated += donated.length;

      recipients.push({
        swarmId: targetSwarm.id,
        swarmName: targetSwarm.name,
        tasksDonated: donated.length,
        similarity: Math.round(similarity * 10000) / 10000,
      });

      logger.info('Work donated', {
        from: overloaded.name,
        to: targetSwarm.name,
        count: donated.length,
      });
    }

    if (totalDonated > 0) {
      this.emit('work:donated', {
        overloadedSwarmId,
        overloadedSwarmName: overloaded.name,
        totalDonated,
        recipients,
      });
    }

    return { donated: totalDonated, to: recipients };
  }

  /**
   * Periodic rebalancing across all 17 swarms.
   * Identifies hungry and overloaded swarms and redistributes work.
   * @returns {object}
   */
  rebalance() {
    const swarms = this._swarmManager.getAllSwarms();
    const hungry = [];
    const overloaded = [];

    for (const swarm of swarms) {
      const utilization = swarm.getUtilization();
      const queueRatio = swarm.taskBuffer.length / fib(14);

      // Hungry: utilization below PSI2 (0.382) with idle bees
      if (utilization < PSI2 && swarm.getIdleBeeCount() > 0) {
        hungry.push(swarm);
      }

      // Overloaded: utilization above (1 - PSI2) = 0.618
      if (utilization > (1 - PSI2) || queueRatio > PSI) {
        overloaded.push(swarm);
      }
    }

    const results = { steals: [], donations: [] };

    // Hungry swarms try to steal
    for (const hungrySwarm of hungry) {
      const result = this.stealWork(hungrySwarm.id);
      if (result.stolen > 0) {
        results.steals.push({
          swarm: hungrySwarm.name,
          ...result,
        });
      }
    }

    // Overloaded swarms try to donate
    for (const overloadedSwarm of overloaded) {
      const result = this.donateWork(overloadedSwarm.id);
      if (result.donated > 0) {
        results.donations.push({
          swarm: overloadedSwarm.name,
          ...result,
        });
      }
    }

    if (results.steals.length > 0 || results.donations.length > 0) {
      this.emit('rebalance:complete', results);
      logger.info('Rebalance complete', {
        steals: results.steals.length,
        donations: results.donations.length,
      });
    }

    return results;
  }

  /**
   * Start periodic rebalancing.
   * @param {number} [intervalMs=fib(9)*1000] — 34 seconds
   */
  startRebalancing(intervalMs = fib(9) * 1000) {
    if (this._rebalanceInterval) return;
    this._rebalanceInterval = setInterval(() => {
      this.rebalance();
    }, intervalMs);
    logger.info('Work-stealing rebalancer started', { intervalMs });
  }

  /**
   * Stop periodic rebalancing.
   */
  stopRebalancing() {
    if (this._rebalanceInterval) {
      clearInterval(this._rebalanceInterval);
      this._rebalanceInterval = null;
    }
  }

  /**
   * Record steal to history.
   * @private
   */
  _recordSteal(record) {
    this._stealHistory.push(record);
    while (this._stealHistory.length > fib(12)) {
      this._stealHistory.shift();
    }
  }

  /**
   * Get steal statistics.
   * @returns {object}
   */
  getStats() {
    return {
      totalSteals: this._stealHistory.length,
      recentSteals: this._stealHistory.slice(-fib(8)),
    };
  }
}

export { WorkStealer, STEAL_BATCH_SIZE, STEAL_MIN_SIMILARITY };
