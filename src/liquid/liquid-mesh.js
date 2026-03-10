/**
 * Heady™ Liquid Mesh v5.0
 * Dynamic mesh topology connecting all liquid nodes
 * CSL-scored routing, phi-weighted load balancing, auto-scaling
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const EventEmitter = require('events');
const {
  PHI, PSI, PSI_SQ, fib, phiFusionScore, phiResourceWeights,
  CSL_THRESHOLDS, RESOURCE_ALLOCATION, PHI_TIMING,
  cslAND, getPressureLevel,
} = require('../../shared/phi-math');
const TIMING = { HEALTH_CHECK_MS: Math.round(fib(7) * 1000), DRIFT_CHECK_MS: Math.round(fib(9) * 1000) }; // Mock timing using fib logic if missing
const { createLogger } = require('../../shared/logger');
const { LiquidNode, NODE_STATES, POOL_TYPES } = require('./liquid-node');

const logger = createLogger('liquid-mesh');

const MAX_MESH_SIZE = fib(12);  // 144 nodes max
const RACE_CANDIDATES = fib(4); // 3 nodes for race mode
const QUEUE_CAPACITY = fib(13); // 233 tasks in backpressure queue
const SCALE_UP_THRESHOLD = PSI; // 0.618 pressure triggers scale-up
const EVICT_COHERENCE = CSL_THRESHOLDS.MINIMUM; // 0.500

class BackpressureQueue {
  constructor(capacity = QUEUE_CAPACITY) {
    this.capacity = capacity;
    this.queue = [];
    this.rejected = 0;
  }

  enqueue(task) {
    if (this.queue.length >= this.capacity) {
      // Reject lowest-priority task
      this.queue.sort((a, b) => b.priority - a.priority);
      if (task.priority > this.queue[this.queue.length - 1].priority) {
        this.queue.pop();
        this.queue.push(task);
      } else {
        this.rejected++;
        return false;
      }
    } else {
      this.queue.push(task);
    }
    this.queue.sort((a, b) => b.priority - a.priority);
    return true;
  }

  dequeue() {
    return this.queue.shift() || null;
  }

  get size() { return this.queue.length; }
  get pressure() { return this.queue.length / this.capacity; }
}

class LiquidMesh extends EventEmitter {
  constructor(options = {}) {
    super();
    this.nodes = new Map();
    this.pools = {
      [POOL_TYPES.HOT]:  new Set(),
      [POOL_TYPES.WARM]: new Set(),
      [POOL_TYPES.COLD]: new Set(),
    };
    this.backpressureQueue = new BackpressureQueue();
    this.taskCount = 0;
    this.routedCount = 0;
    this.racedCount = 0;
    this._healthInterval = null;
    this._scaleInterval = null;
  }

  async start() {
    this._healthInterval = setInterval(() => this._aggregateHealth(), 3000);
    this._scaleInterval = setInterval(() => this._autoScale(), 3000);
    logger.info('mesh_started');
    this.emit('started');
  }

  async stop() {
    if (this._healthInterval) { clearInterval(this._healthInterval); this._healthInterval = null; }
    if (this._scaleInterval) { clearInterval(this._scaleInterval); this._scaleInterval = null; }

    // Shutdown nodes in reverse registration order (LIFO)
    const nodeIds = [...this.nodes.keys()].reverse();
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) await node.shutdown();
    }
    this.nodes.clear();
    for (const pool of Object.values(this.pools)) pool.clear();
    logger.info('mesh_stopped');
    this.emit('stopped');
  }

  async registerNode(nodeConfig) {
    if (this.nodes.size >= MAX_MESH_SIZE) {
      logger.warn('mesh_full', { maxSize: MAX_MESH_SIZE });
      return null;
    }

    const node = new LiquidNode(nodeConfig);
    await node.initialize();

    this.nodes.set(node.id, node);
    if(this.pools[node.pool]) this.pools[node.pool].add(node.id);

    // Listen for node events
    node.on('poolMigration', ({ nodeId, from, to }) => {
      this.pools[from].delete(nodeId);
      this.pools[to].add(nodeId);
      this.emit('poolMigration', { nodeId, from, to });
    });

    node.on('coherenceDrift', (data) => {
      this.emit('coherenceDrift', data);
      if (data.coherence < EVICT_COHERENCE) {
        this._evictNode(data.nodeId, 'coherence_below_minimum');
      }
    });

    node.on('taskCompleted', () => this._processBackpressure());

    logger.info('node_registered', { nodeId: node.id, type: node.type, pool: node.pool, meshSize: this.nodes.size });
    this.emit('nodeRegistered', { nodeId: node.id, meshSize: this.nodes.size });
    return node;
  }

  async unregisterNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    await node.shutdown();
    this.nodes.delete(nodeId);
    for (const pool of Object.values(this.pools)) pool.delete(nodeId);

    logger.info('node_unregistered', { nodeId, meshSize: this.nodes.size });
    this.emit('nodeUnregistered', { nodeId, meshSize: this.nodes.size });
  }

  routeTask(task) {
    this.taskCount++;

    if (!task.embedding || task.embedding.length !== 384) {
      logger.error('invalid_task_embedding', { taskId: task.id });
      return null;
    }

    // Score all available nodes via CSL cosine
    const candidates = [];
    for (const node of this.nodes.values()) {
      if (!node.isAvailable) continue;
      const score = node.scoreForTask(task.embedding);
      if (score >= CSL_THRESHOLDS.MEDIUM) {
        candidates.push({ node, score });
      }
    }

    if (candidates.length === 0) {
      // Backpressure: queue the task
      const priority = task.priority || (a => a[0])([task.urgency || 0.5, task.complexity || 0.5, 0.5]);
      const enqueued = this.backpressureQueue.enqueue({ ...task, priority, queuedAt: Date.now() });
      if (enqueued) {
        logger.warn('task_queued_backpressure', { taskId: task.id, queueSize: this.backpressureQueue.size });
        return { queued: true, position: this.backpressureQueue.size };
      }
      logger.error('task_rejected', { taskId: task.id, reason: 'queue_full' });
      return null;
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Race mode for critical tasks
    if (task.critical && candidates.length >= RACE_CANDIDATES) {
      return this._raceTask(task, candidates.slice(0, RACE_CANDIDATES));
    }

    // Standard routing: pick best scoring node
    const best = candidates[0];
    this.routedCount++;

    logger.info('task_routed', {
      taskId: task.id,
      nodeId: best.node.id,
      score: best.score,
      pool: best.node.pool,
    });

    return { nodeId: best.node.id, score: best.score, pool: best.node.pool };
  }

  async _raceTask(task, candidates) {
    this.racedCount++;
    const raceId = `race-${this.racedCount}`;
    logger.info('race_started', { raceId, taskId: task.id, candidates: candidates.length });

    const promises = candidates.map(({ node, score }) =>
      node.executeTask(task).then(result => ({ ...result, raceScore: score }))
    );

    // First valid result wins
    const results = await Promise.allSettled(promises);
    const winners = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value)
      .sort((a, b) => a.latencyMs - b.latencyMs);

    if (winners.length > 0) {
      const winner = winners[0];
      logger.info('race_winner', { raceId, nodeId: winner.nodeId, latencyMs: winner.latencyMs });
      return winner;
    }

    logger.error('race_failed', { raceId, taskId: task.id });
    return null;
  }

  _processBackpressure() {
    while (this.backpressureQueue.size > 0) {
      const availableNode = [...this.nodes.values()].find(n => n.isAvailable);
      if (!availableNode) break;

      const task = this.backpressureQueue.dequeue();
      if (task) {
        this.routeTask(task);
      }
    }
  }

  async _evictNode(nodeId, reason) {
    logger.warn('evicting_node', { nodeId, reason });
    await this.unregisterNode(nodeId);
    this.emit('nodeEvicted', { nodeId, reason });
  }

  _autoScale() {
    const meshPressure = this._getMeshPressure();

    if (meshPressure > SCALE_UP_THRESHOLD && this.nodes.size < MAX_MESH_SIZE) {
      // Find most loaded pool and spawn a new node there
      const poolLoads = {};
      for (const [poolType, nodeIds] of Object.entries(this.pools)) {
        let totalLoad = 0;
        for (const nodeId of nodeIds) {
          const node = this.nodes.get(nodeId);
          if (node) totalLoad += node.load;
        }
        poolLoads[poolType] = nodeIds.size > 0 ? totalLoad / nodeIds.size : 0;
      }

      const busiestPool = Object.entries(poolLoads).sort((a, b) => b[1] - a[1])[0];
      if (busiestPool) {
        logger.info('auto_scale_up', { pool: busiestPool[0], meshPressure, poolLoad: busiestPool[1] });
        this.emit('scaleUp', { pool: busiestPool[0], pressure: meshPressure });
      }
    }
  }

  _getMeshPressure() {
    if (this.nodes.size === 0) return 0;
    let totalLoad = 0;
    for (const node of this.nodes.values()) {
      totalLoad += node.load;
    }
    const nodePressure = totalLoad / this.nodes.size;
    const queuePressure = this.backpressureQueue.pressure;
    return (nodePressure * PSI + queuePressure * (1 - PSI));
  }

  _aggregateHealth() {
    const poolHealth = {};
    for (const [poolType, nodeIds] of Object.entries(this.pools)) {
      const healths = [];
      for (const nodeId of nodeIds) {
        const node = this.nodes.get(nodeId);
        if (node) healths.push(node.getHealth());
      }
      poolHealth[poolType] = {
        nodeCount: healths.length,
        avgCoherence: healths.length > 0
          ? healths.reduce((s, h) => s + h.coherence, 0) / healths.length
          : 0,
        avgLoad: healths.length > 0
          ? healths.reduce((s, h) => s + h.load, 0) / healths.length
          : 0,
      };
    }

    const meshHealth = {
      totalNodes: this.nodes.size,
      pools: poolHealth,
      pressure: this._getMeshPressure(),
      pressureLevel: getPressureLevel(this._getMeshPressure()),
      queueSize: this.backpressureQueue.size,
      tasksRouted: this.routedCount,
      tasksRaced: this.racedCount,
      timestamp: new Date().toISOString(),
    };

    this.emit('healthUpdate', meshHealth);
    logger.debug('mesh_health', meshHealth);
    return meshHealth;
  }

  getTopology() {
    const nodes = [];
    const edges = [];

    const nodeList = [...this.nodes.values()];
    for (const node of nodeList) {
      nodes.push({
        id: node.id,
        type: node.type,
        pool: node.pool,
        load: node.load,
        coherence: node.coherenceScore,
      });
    }

    // Compute cosine similarity edges between all node pairs
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const similarity = cslAND(
          Array.from(nodeList[i].capabilities),
          Array.from(nodeList[j].capabilities)
        );
        if (similarity >= CSL_THRESHOLDS.LOW) {
          edges.push({
            from: nodeList[i].id,
            to: nodeList[j].id,
            similarity,
          });
        }
      }
    }

    return { nodes, edges };
  }

  getStatus() {
    return {
      meshSize: this.nodes.size,
      maxSize: MAX_MESH_SIZE,
      pools: {
        HOT: this.pools[POOL_TYPES.HOT].size,
        WARM: this.pools[POOL_TYPES.WARM].size,
        COLD: this.pools[POOL_TYPES.COLD].size,
      },
      pressure: this._getMeshPressure(),
      queueSize: this.backpressureQueue.size,
      tasksRouted: this.routedCount,
      tasksRaced: this.racedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { LiquidMesh };
