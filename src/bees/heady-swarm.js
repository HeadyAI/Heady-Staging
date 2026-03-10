/**
 * Heady™ HeadySwarm Coordinator v5.0
 * Manages a colony of HeadyBee instances with CSL-scored routing
 * Auto-scaling, load shedding, domain groups, swarm consensus
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const EventEmitter = require('events');
const {
  PHI, PSI, PSI_SQ, fib, phiFusionScore,
  CSL_THRESHOLDS, PHI_TIMING,
  cslAND, getPressureLevel,
} = require('../../shared/phi-math');
const TIMING = { HEALTH_CHECK_MS: Math.round(fib(7) * 1000), DRIFT_CHECK_MS: Math.round(fib(9) * 1000) }; // Mock timing using fib logic if missing
const { createLogger } = require('../../shared/logger');
const { HeadyBee, BEE_STATES, BEE_DOMAINS } = require('./heady-bee');

const logger = createLogger('heady-swarm');

const MAX_SWARM_SIZE = fib(12);        // 144 bees max
const AUTO_SCALE_THRESHOLD = fib(8);   // 21 queued tasks triggers scale-up
const LOAD_SHED_PRESSURE = PSI;        // 0.618 pressure triggers load shedding

class HeadySwarm extends EventEmitter {
  constructor(options = {}) {
    super();
    this.id = options.id || `swarm-${Date.now().toString(36)}`;
    this.bees = new Map();
    this.domainGroups = new Map();
    this.taskQueue = new Map();  // domain → task[]
    this.metrics = {
      totalBees: 0,
      activeBees: 0,
      tasksQueued: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalLatencyMs: 0,
    };
    this._healthInterval = null;
    this._scaleInterval = null;

    // Initialize domain groups
    for (const domain of BEE_DOMAINS) {
      this.domainGroups.set(domain, new Set());
      this.taskQueue.set(domain, []);
    }
  }

  async start() {
    this._healthInterval = setInterval(() => this._aggregateHealth(), TIMING.HEALTH_CHECK_MS);
    this._scaleInterval = setInterval(() => this._autoScale(), TIMING.DRIFT_CHECK_MS);
    logger.info('swarm_started', { swarmId: this.id });
    this.emit('started', { swarmId: this.id });
  }

  async stop() {
    if (this._healthInterval) { clearInterval(this._healthInterval); this._healthInterval = null; }
    if (this._scaleInterval) { clearInterval(this._scaleInterval); this._scaleInterval = null; }

    // Terminate all bees in LIFO order
    const beeIds = [...this.bees.keys()].reverse();
    for (const beeId of beeIds) {
      const bee = this.bees.get(beeId);
      if (bee) await bee.shutdown();
    }
    this.bees.clear();
    for (const group of this.domainGroups.values()) group.clear();

    logger.info('swarm_stopped', { swarmId: this.id });
    this.emit('stopped', { swarmId: this.id });
  }

  async createBee(domain, config = {}) {
    if (this.bees.size >= MAX_SWARM_SIZE) {
      logger.warn('swarm_at_capacity', { maxSize: MAX_SWARM_SIZE });
      return null;
    }

    if (!BEE_DOMAINS.includes(domain)) {
      logger.error('invalid_domain', { domain, valid: BEE_DOMAINS });
      return null;
    }

    const bee = new HeadyBee({ domain, ephemeral: false, ...config });
    await bee.initialize();

    this.bees.set(bee.id, bee);
    this.domainGroups.get(domain).add(bee.id);
    this.metrics.totalBees++;

    this._attachBeeListeners(bee);

    logger.info('bee_created', { swarmId: this.id, beeId: bee.id, domain, swarmSize: this.bees.size });
    this.emit('beeCreated', { beeId: bee.id, domain });
    return bee;
  }

  async spawnBee(domain, config = {}) {
    const bee = await this.createBee(domain, { ...config, ephemeral: true });
    if (bee) {
      logger.info('ephemeral_bee_spawned', { swarmId: this.id, beeId: bee.id, domain });
    }
    return bee;
  }

  _attachBeeListeners(bee) {
    bee.on('taskCompleted', (data) => {
      this.metrics.tasksCompleted++;
      this.metrics.totalLatencyMs += data.latencyMs;
      this.emit('taskCompleted', { swarmId: this.id, ...data });
      this._processDomainQueue(bee.domain);
    });

    bee.on('taskFailed', (data) => {
      this.metrics.tasksFailed++;
      this.emit('taskFailed', { swarmId: this.id, ...data });
    });

    bee.on('terminated', (data) => {
      this.bees.delete(data.beeId);
      this.domainGroups.get(bee.domain).delete(data.beeId);
      this.emit('beeTerminated', { swarmId: this.id, ...data });
    });
  }

  async routeTask(task) {
    const domain = task.domain || this._inferDomain(task);

    // Find best bee via CSL scoring
    const candidates = [];
    const domainBeeIds = this.domainGroups.get(domain) || new Set();

    // First check domain-specific bees
    for (const beeId of domainBeeIds) {
      const bee = this.bees.get(beeId);
      if (!bee || bee.state === BEE_STATES.TERMINATED) continue;
      if (task.embedding) {
        const score = bee.scoreTask(task.embedding);
        candidates.push({ bee, score });
      } else {
        candidates.push({ bee, score: bee.state === BEE_STATES.READY ? 1.0 : 0.5 });
      }
    }

    // Also check all bees if domain group is empty
    if (candidates.length === 0 && task.embedding) {
      for (const bee of this.bees.values()) {
        if (bee.state === BEE_STATES.TERMINATED) continue;
        const score = bee.scoreTask(task.embedding);
        if (score >= CSL_THRESHOLDS.LOW) {
          candidates.push({ bee, score });
        }
      }
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0 || !candidates[0].bee.canAcceptTask(task.embedding || new Float32Array(384))) {
      // Queue the task
      return this._queueTask(domain, task);
    }

    const best = candidates[0];
    return best.bee.accept(task);
  }

  _queueTask(domain, task) {
    const queue = this.taskQueue.get(domain) || [];
    queue.push({ task, queuedAt: Date.now() });
    this.taskQueue.set(domain, queue);
    this.metrics.tasksQueued++;

    const pressure = this._getSwarmPressure();
    if (pressure > LOAD_SHED_PRESSURE) {
      // Load shedding: reject lowest-csl_relevance queued tasks
      const allQueues = [...this.taskQueue.values()];
      const totalQueued = allQueues.reduce((s, q) => s + q.length, 0);
      if (totalQueued > MAX_SWARM_SIZE) {
        const shed = queue.pop();
        if (shed) {
          logger.warn('load_shedding', { domain, taskId: shed.task.id, pressure });
          this.emit('loadShed', { domain, taskId: shed.task.id });
        }
      }
    }

    logger.info('task_queued', { swarmId: this.id, domain, queueSize: queue.length });
    return { queued: true, domain, position: queue.length };
  }

  _processDomainQueue(domain) {
    const queue = this.taskQueue.get(domain);
    if (!queue || queue.length === 0) return;

    const domainBeeIds = this.domainGroups.get(domain) || new Set();
    for (const beeId of domainBeeIds) {
      const bee = this.bees.get(beeId);
      if (bee && bee.state === BEE_STATES.READY && queue.length > 0) {
        const { task } = queue.shift();
        bee.accept(task);
      }
    }
  }

  _inferDomain(task) {
    if (task.domain) return task.domain;
    // Default routing based on task type
    const typeMap = {
      embed: 'inference', search: 'search', store: 'memory',
      classify: 'inference', generate: 'code', analyze: 'analytics',
      monitor: 'monitoring', deploy: 'deployment', test: 'testing',
    };
    return typeMap[task.type] || 'inference';
  }

  _autoScale() {
    for (const [domain, queue] of this.taskQueue) {
      if (queue.length > AUTO_SCALE_THRESHOLD) {
        const domainBees = this.domainGroups.get(domain);
        const activeBees = [...domainBees].filter(id => {
          const bee = this.bees.get(id);
          return bee && bee.state !== BEE_STATES.TERMINATED;
        }).length;

        if (this.bees.size < MAX_SWARM_SIZE) {
          logger.info('auto_scale_spawn', { domain, queueSize: queue.length, activeBees });
          this.spawnBee(domain);
        }
      }
    }
  }

  async consensus(task, topN = fib(5)) {
    // Poll top-N domain bees and use phi-weighted voting
    const domain = task.domain || this._inferDomain(task);
    const domainBeeIds = [...(this.domainGroups.get(domain) || [])];
    const bees = domainBeeIds
      .map(id => this.bees.get(id))
      .filter(b => b && b.state === BEE_STATES.READY)
      .slice(0, topN);

    if (bees.length === 0) return { consensus: false, error: 'NO_AVAILABLE_BEES' };

    const results = await Promise.allSettled(
      bees.map(bee => bee.execute(task))
    );

    const successful = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);

    if (successful.length === 0) return { consensus: false, error: 'ALL_BEES_FAILED' };

    // Phi-weighted voting
    const weights = [];
    let totalWeight = 0;
    for (let i = 0; i < successful.length; i++) {
      const w = Math.pow(PSI, i);
      weights.push(w);
      totalWeight += w;
    }

    // Best result by weighted coherence score
    let bestIdx = 0;
    let bestScore = 0;
    for (let i = 0; i < successful.length; i++) {
      const score = (successful[i].coherence || 0.5) * (weights[i] / totalWeight);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    logger.info('consensus_reached', {
      swarmId: this.id, domain, voters: successful.length,
      winnerBee: successful[bestIdx].beeId, winnerScore: bestScore,
    });

    return {
      consensus: true,
      result: successful[bestIdx],
      voters: successful.length,
      weightedScore: bestScore,
    };
  }

  _getSwarmPressure() {
    if (this.bees.size === 0) return 0;
    let totalLoad = 0;
    let readyCount = 0;
    for (const bee of this.bees.values()) {
      if (bee.state !== BEE_STATES.TERMINATED) {
        totalLoad += bee.activeTasks.size > 0 ? 1 : 0;
        readyCount++;
      }
    }
    const beePressure = readyCount > 0 ? totalLoad / readyCount : 0;
    const totalQueued = [...this.taskQueue.values()].reduce((s, q) => s + q.length, 0);
    const queuePressure = totalQueued / (MAX_SWARM_SIZE * fib(5));
    return phiFusionScore([beePressure, queuePressure], [PSI, 1 - PSI]);
  }

  _aggregateHealth() {
    const health = {
      swarmId: this.id,
      totalBees: this.bees.size,
      activeBees: [...this.bees.values()].filter(b => b.state === BEE_STATES.WORKING).length,
      readyBees: [...this.bees.values()].filter(b => b.state === BEE_STATES.READY).length,
      pressure: this._getSwarmPressure(),
      pressureLevel: getPressureLevel(this._getSwarmPressure()),
      domainCoverage: {},
      metrics: { ...this.metrics },
      avgLatencyMs: this.metrics.tasksCompleted > 0
        ? Math.round(this.metrics.totalLatencyMs / this.metrics.tasksCompleted)
        : 0,
      timestamp: new Date().toISOString(),
    };

    for (const [domain, beeIds] of this.domainGroups) {
      if (beeIds.size > 0) {
        health.domainCoverage[domain] = beeIds.size;
      }
    }

    this.emit('healthUpdate', health);
    return health;
  }

  getStatus() {
    return this._aggregateHealth();
  }
}

module.exports = { HeadySwarm };
