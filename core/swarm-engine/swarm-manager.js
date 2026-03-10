/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * HeadySwarm Manager — Lifecycle and coordination for the 17 canonical swarms.
 * Each swarm has a centroid vector computed from its bees, a ring buffer task
 * queue, and phi-scaled auto-scaling logic.
 *
 * The 17 canonical swarms:
 *   Deploy, Battle, Research, Security, Memory, Creative, Trading, Health,
 *   Governance, Documentation, Testing, Migration, Monitoring, Cleanup,
 *   Onboarding, Analytics, Emergency
 *
 * Founder: Eric Haywood
 * @module core/swarm-engine/swarm-manager
 */

import phiMath from '@heady/phi-math-foundation';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
const { PHI, PSI, fib, CSL_THRESHOLDS, PRESSURE_LEVELS, classifyPressure, phiFusionWeights } = phiMath.default || phiMath;
import structuredLogger from '@heady/structured-logger';
const { createLogger } = structuredLogger.default || structuredLogger;
import { HeadyBee, BEE_STATE, domainToVector, cosine } from './bee-lifecycle.js';

const logger = createLogger('swarm-manager');

const PSI2 = PSI * PSI;

/** The 17 canonical swarm names */
const CANONICAL_SWARMS = Object.freeze([
  'Deploy', 'Battle', 'Research', 'Security', 'Memory',
  'Creative', 'Trading', 'Health', 'Governance', 'Documentation',
  'Testing', 'Migration', 'Monitoring', 'Cleanup', 'Onboarding',
  'Analytics', 'Emergency',
]);

/** Phi-scaled swarm limits */
const SWARM_LIMITS = Object.freeze({
  maxBees: fib(13),        // 233 per swarm
  minBees: fib(3),         // 2 — always at least 2 for redundancy
  taskBufferCapacity: fib(14), // 377
  autoScaleCheckMs: fib(9) * 1000, // 34s
});

class HeadySwarm extends EventEmitter {
  /**
   * @param {object} config
   * @param {string} config.name - Swarm name (from CANONICAL_SWARMS)
   * @param {Function} [config.beeExecutor] - Executor injected into new bees
   */
  constructor(config) {
    super();
    this.id = `swarm-${config.name.toLowerCase()}-${randomUUID().slice(0, 8)}`;
    this.name = config.name;
    this.domain = config.name.toLowerCase();
    this._beeExecutor = config.beeExecutor || null;

    /** @type {Map<string, HeadyBee>} */
    this.bees = new Map();

    /** 384D centroid vector — average of all bee vectors */
    this.centroidVector = domainToVector(this.domain);

    /** Ring buffer task queue */
    this.taskBuffer = [];

    /** Backpressure state */
    this.pressure = 'NOMINAL';

    this.createdAt = Date.now();
    this.totalTasksProcessed = 0;
    this.totalTasksFailed = 0;
  }

  /**
   * Add a bee to this swarm.
   * @param {HeadyBee} bee
   */
  addBee(bee) {
    this.bees.set(bee.id, bee);
    this._recomputeCentroid();
    bee.on('task:completed', () => { this.totalTasksProcessed++; });
    bee.on('task:failed', () => { this.totalTasksFailed++; });
    this.emit('bee:added', { swarmId: this.id, beeId: bee.id });
  }

  /**
   * Remove a bee from this swarm.
   * @param {string} beeId
   */
  removeBee(beeId) {
    const bee = this.bees.get(beeId);
    if (!bee) return;
    bee.terminate();
    this.bees.delete(beeId);
    this._recomputeCentroid();
    this.emit('bee:removed', { swarmId: this.id, beeId });
  }

  /**
   * Get the number of idle bees.
   * @returns {number}
   */
  getIdleBeeCount() {
    let count = 0;
    for (const bee of this.bees.values()) {
      if (bee.state === BEE_STATE.IDLE) count++;
    }
    return count;
  }

  /**
   * Get average utilization across all bees.
   * @returns {number} 0-1
   */
  getUtilization() {
    if (this.bees.size === 0) return 0;
    let workingCount = 0;
    for (const bee of this.bees.values()) {
      if (bee.state === BEE_STATE.WORKING) workingCount++;
    }
    return workingCount / this.bees.size;
  }

  /**
   * Get aggregate health using phi-fusion weights.
   * @returns {object}
   */
  getHealth() {
    if (this.bees.size === 0) {
      return { score: 0, beeCount: 0, utilization: 0, pressure: this.pressure };
    }

    const beeHealths = [];
    for (const bee of this.bees.values()) {
      const hb = bee.heartbeat();
      beeHealths.push(hb.healthScore);
    }

    // Phi-fusion weighted average
    const weights = phiFusionWeights(beeHealths.length);
    // Sort healths descending so highest gets highest weight
    beeHealths.sort((a, b) => b - a);
    let score = 0;
    for (let i = 0; i < beeHealths.length; i++) {
      score += beeHealths[i] * weights[i];
    }

    return {
      score: Math.round(score * 10000) / 10000,
      beeCount: this.bees.size,
      utilization: this.getUtilization(),
      pressure: this.pressure,
      idleBees: this.getIdleBeeCount(),
      queueDepth: this.taskBuffer.length,
    };
  }

  /**
   * Recompute centroid vector from all bee vectors.
   * @private
   */
  _recomputeCentroid() {
    if (this.bees.size === 0) {
      this.centroidVector = domainToVector(this.domain);
      return;
    }

    const dim = 384;
    const avg = new Float64Array(dim);
    for (const bee of this.bees.values()) {
      for (let i = 0; i < dim; i++) {
        avg[i] += bee.vector[i];
      }
    }

    let mag = 0;
    for (let i = 0; i < dim; i++) {
      avg[i] /= this.bees.size;
      mag += avg[i] * avg[i];
    }
    mag = Math.sqrt(mag);
    if (mag > 0) {
      for (let i = 0; i < dim; i++) avg[i] /= mag;
    }

    this.centroidVector = avg;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      beeCount: this.bees.size,
      idleBees: this.getIdleBeeCount(),
      utilization: this.getUtilization(),
      pressure: this.pressure,
      queueDepth: this.taskBuffer.length,
      totalTasksProcessed: this.totalTasksProcessed,
      totalTasksFailed: this.totalTasksFailed,
      createdAt: this.createdAt,
    };
  }
}

class SwarmManager extends EventEmitter {
  constructor(options = {}) {
    super();
    /** @type {Map<string, HeadySwarm>} */
    this._swarms = new Map();
    this._autoScaleInterval = null;
    this._beeExecutor = options.beeExecutor || null;
  }

  /**
   * Initialize all 17 canonical swarms with minBees each.
   */
  initialize() {
    for (const name of CANONICAL_SWARMS) {
      this.createSwarm(name);
    }
    logger.info('All canonical swarms initialized', { count: CANONICAL_SWARMS.length });
  }

  /**
   * Create a new swarm.
   * @param {string} name
   * @param {object} [config]
   * @returns {HeadySwarm}
   */
  createSwarm(name, config = {}) {
    const swarm = new HeadySwarm({
      name,
      beeExecutor: this._beeExecutor,
      ...config,
    });

    // Spawn minBees
    for (let i = 0; i < SWARM_LIMITS.minBees; i++) {
      const bee = new HeadyBee({
        domain: name.toLowerCase(),
        swarmId: swarm.id,
        executor: this._beeExecutor,
      });
      bee.spawn();
      swarm.addBee(bee);
    }

    this._swarms.set(swarm.id, swarm);
    this.emit('swarm:created', { swarmId: swarm.id, name, bees: swarm.bees.size });
    logger.info('Swarm created', { swarmId: swarm.id, name, bees: swarm.bees.size });
    return swarm;
  }

  /**
   * Get a swarm by ID.
   * @param {string} swarmId
   * @returns {HeadySwarm|null}
   */
  getSwarm(swarmId) {
    return this._swarms.get(swarmId) || null;
  }

  /**
   * Get swarm by name.
   * @param {string} name
   * @returns {HeadySwarm|null}
   */
  getSwarmByName(name) {
    for (const swarm of this._swarms.values()) {
      if (swarm.name === name) return swarm;
    }
    return null;
  }

  /**
   * Get all swarms.
   * @returns {HeadySwarm[]}
   */
  getAllSwarms() {
    return Array.from(this._swarms.values());
  }

  /**
   * Scale up a swarm by adding bees.
   * @param {string} swarmId
   * @param {number} count
   */
  scaleUp(swarmId, count) {
    const swarm = this._swarms.get(swarmId);
    if (!swarm) throw new Error(`Unknown swarm: ${swarmId}`);

    const maxAdd = SWARM_LIMITS.maxBees - swarm.bees.size;
    const toAdd = Math.min(count, maxAdd);

    for (let i = 0; i < toAdd; i++) {
      const bee = new HeadyBee({
        domain: swarm.domain,
        swarmId: swarm.id,
        executor: this._beeExecutor,
      });
      bee.spawn();
      swarm.addBee(bee);
    }

    this.emit('swarm:scaled-up', { swarmId, added: toAdd, total: swarm.bees.size });
    logger.info('Swarm scaled up', { swarmId, added: toAdd, total: swarm.bees.size });
  }

  /**
   * Scale down a swarm by draining and removing bees.
   * @param {string} swarmId
   * @param {number} count
   */
  scaleDown(swarmId, count) {
    const swarm = this._swarms.get(swarmId);
    if (!swarm) throw new Error(`Unknown swarm: ${swarmId}`);

    const maxRemove = swarm.bees.size - SWARM_LIMITS.minBees;
    const toRemove = Math.min(count, maxRemove);

    // Remove idle bees first, then drain working bees
    const idleBees = [];
    const workingBees = [];
    for (const bee of swarm.bees.values()) {
      if (bee.state === BEE_STATE.IDLE) idleBees.push(bee.id);
      else if (bee.state === BEE_STATE.WORKING) workingBees.push(bee.id);
    }

    let removed = 0;
    for (const beeId of idleBees) {
      if (removed >= toRemove) break;
      swarm.removeBee(beeId);
      removed++;
    }
    for (const beeId of workingBees) {
      if (removed >= toRemove) break;
      const bee = swarm.bees.get(beeId);
      if (bee) bee.drain();
      removed++;
    }

    this.emit('swarm:scaled-down', { swarmId, removed, total: swarm.bees.size });
    logger.info('Swarm scaled down', { swarmId, removed, total: swarm.bees.size });
  }

  /**
   * Auto-scale a swarm using CSL-gated decisions.
   * Scale up when utilization > CSL_THRESHOLDS.HIGH (0.882)
   * Scale down when utilization < CSL_THRESHOLDS.LOW (0.691)
   *
   * @param {string} swarmId
   * @returns {object} Scaling decision
   */
  autoScale(swarmId) {
    const swarm = this._swarms.get(swarmId);
    if (!swarm) return { action: 'none', reason: 'unknown swarm' };

    const utilization = swarm.getUtilization();
    const queueRatio = swarm.taskBuffer.length / SWARM_LIMITS.taskBufferCapacity;
    const beeCount = swarm.bees.size;

    // CSL-gated scaling decision
    // Combine utilization and queue pressure with phi-fusion
    const [wUtil, wQueue] = phiFusionWeights(2);
    const pressure = utilization * wUtil + queueRatio * wQueue;
    swarm.pressure = classifyPressure(pressure);

    if (pressure > CSL_THRESHOLDS.HIGH && beeCount < SWARM_LIMITS.maxBees) {
      // Scale up: add fib(5)=5 bees at a time
      const toAdd = Math.min(fib(5), SWARM_LIMITS.maxBees - beeCount);
      this.scaleUp(swarmId, toAdd);
      return { action: 'scale_up', added: toAdd, pressure, utilization };
    }

    if (pressure < CSL_THRESHOLDS.LOW && beeCount > SWARM_LIMITS.minBees) {
      // Scale down: remove fib(3)=2 bees at a time
      const toRemove = Math.min(fib(3), beeCount - SWARM_LIMITS.minBees);
      this.scaleDown(swarmId, toRemove);
      return { action: 'scale_down', removed: toRemove, pressure, utilization };
    }

    return { action: 'none', pressure, utilization, beeCount };
  }

  /**
   * Auto-scale all swarms.
   */
  autoScaleAll() {
    const results = [];
    for (const swarm of this._swarms.values()) {
      results.push({
        swarmId: swarm.id,
        name: swarm.name,
        ...this.autoScale(swarm.id),
      });
    }
    return results;
  }

  /**
   * Start periodic auto-scaling.
   */
  startAutoScale() {
    if (this._autoScaleInterval) return;
    this._autoScaleInterval = setInterval(() => {
      this.autoScaleAll();
    }, SWARM_LIMITS.autoScaleCheckMs);
    logger.info('Auto-scaling started', { intervalMs: SWARM_LIMITS.autoScaleCheckMs });
  }

  /**
   * Stop periodic auto-scaling.
   */
  stopAutoScale() {
    if (this._autoScaleInterval) {
      clearInterval(this._autoScaleInterval);
      this._autoScaleInterval = null;
    }
  }

  /**
   * Get health for a specific swarm.
   * @param {string} swarmId
   * @returns {object}
   */
  getSwarmHealth(swarmId) {
    const swarm = this._swarms.get(swarmId);
    if (!swarm) return null;
    return swarm.getHealth();
  }

  /**
   * Dissolve a swarm — gracefully shut down all bees.
   * @param {string} swarmId
   */
  dissolveSwarm(swarmId) {
    const swarm = this._swarms.get(swarmId);
    if (!swarm) return;

    for (const bee of swarm.bees.values()) {
      bee.terminate();
    }
    swarm.bees.clear();
    this._swarms.delete(swarmId);

    this.emit('swarm:dissolved', { swarmId, name: swarm.name });
    logger.info('Swarm dissolved', { swarmId, name: swarm.name });
  }

  /**
   * Get mesh-wide status.
   * @returns {object}
   */
  getMeshStatus() {
    const swarms = this.getAllSwarms();
    let totalBees = 0;
    let totalTasks = 0;
    let totalErrors = 0;

    const swarmStatuses = swarms.map(s => {
      totalBees += s.bees.size;
      totalTasks += s.totalTasksProcessed;
      totalErrors += s.totalTasksFailed;
      return s.toJSON();
    });

    return {
      swarmCount: swarms.length,
      totalBees,
      totalTasksProcessed: totalTasks,
      totalTasksFailed: totalErrors,
      swarms: swarmStatuses,
    };
  }
}

export {
  SwarmManager,
  HeadySwarm,
  CANONICAL_SWARMS,
  SWARM_LIMITS,
};
