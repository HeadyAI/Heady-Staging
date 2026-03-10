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
// ║  FILE: src/hc_liquid.js                                           ║
// ║  LAYER: backend/src                                               ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HC Liquid — CSL-Gated Liquid Node Scheduler
 *
 * Manages the topology of LiquidNodes across the Heady system.
 * Each node can dynamically shift between compute roles (hot/warm/cold/reserve)
 * based on Cosine Similarity Level (CSL) routing gates and phi-scaled pressure.
 *
 * Used by:
 *   - VectorTemplateEngine (src/memory/vector-template-engine.js) — bee dispatch across nodes
 *   - ColabRuntimeCluster (src/colab/colab-runtime-nodes.js) — GPU task routing
 *   - SwarmCoordinator (src/bees/swarm-coordinator.js) — distributed swarm dispatch
 *
 * Node pools:
 *   - hot:     Active compute, <50ms latency, GPU-accelerated tasks
 *   - warm:    Ready compute, <200ms spin-up, standard processing
 *   - cold:    On-demand, <2s spin-up, batch/analytics
 *   - reserve: Emergency overflow, auto-scaled from cold pool
 *
 * @module hc_liquid
 * @version 1.0.0
 */

'use strict';

const { EventEmitter } = require('events');

let PHI, PSI, fib, CSL_THRESHOLDS, getPressureLevel;
try {
  const phiMath = require('../shared/phi-math.js');
  PHI = phiMath.PHI;
  PSI = phiMath.PSI;
  fib = phiMath.fib;
  CSL_THRESHOLDS = phiMath.CSL_THRESHOLDS;
  getPressureLevel = phiMath.getPressureLevel;
} catch {
  PHI = 1.618033988749895;
  PSI = 0.618033988749895;
  fib = (n) => [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89][n] || 0;
  CSL_THRESHOLDS = { MINIMUM: 0.5, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927 };
  getPressureLevel = (load) => load > 0.9 ? 'CRITICAL' : load > 0.7 ? 'HIGH' : load > 0.5 ? 'MODERATE' : 'NOMINAL';
}

// ─── Node States ──────────────────────────────────────────────────

const NODE_STATES = Object.freeze({
  INITIALIZING: 'initializing',
  READY: 'ready',
  ACTIVE: 'active',
  DRAINING: 'draining',
  OFFLINE: 'offline',
});

const POOL_TYPES = Object.freeze({
  HOT: 'hot',
  WARM: 'warm',
  COLD: 'cold',
  RESERVE: 'reserve',
});

// ─── LiquidNode ────────────────────────────────────────────────────

class LiquidNode {
  /**
   * @param {Object} spec
   * @param {string} spec.id - Unique node identifier
   * @param {string} spec.pool - Pool type: hot, warm, cold, reserve
   * @param {number} spec.cslGate - Minimum CSL score to route tasks here
   * @param {string[]} [spec.capabilities] - What this node can do
   * @param {number} [spec.maxConcurrent] - Max concurrent tasks (default fib(5)=5)
   */
  constructor(spec) {
    this.id = spec.id;
    this.pool = spec.pool || POOL_TYPES.WARM;
    this.cslGate = spec.cslGate || CSL_THRESHOLDS.MEDIUM;
    this.capabilities = spec.capabilities || [];
    this.maxConcurrent = spec.maxConcurrent || fib(5); // 5
    this.state = NODE_STATES.INITIALIZING;
    this.activeTasks = 0;
    this.totalExecuted = 0;
    this.totalFailed = 0;
    this.lastActivity = null;
    this.metrics = { avgLatencyMs: 0, totalLatencyMs: 0 };
  }

  /** Check if this node can accept a task with the given CSL score */
  canAccept(cslScore) {
    return (
      this.state === NODE_STATES.READY &&
      this.activeTasks < this.maxConcurrent &&
      cslScore >= this.cslGate
    );
  }

  /** Mark node as ready for tasks */
  activate() {
    this.state = NODE_STATES.READY;
  }

  /** Execute a task on this node */
  async execute(task, handler) {
    if (this.activeTasks >= this.maxConcurrent) {
      throw new Error(`Node ${this.id} at capacity (${this.activeTasks}/${this.maxConcurrent})`);
    }

    this.state = NODE_STATES.ACTIVE;
    this.activeTasks++;
    this.lastActivity = Date.now();
    const start = Date.now();

    try {
      const result = await handler(task, this);
      const duration = Date.now() - start;
      this.totalExecuted++;
      this.metrics.totalLatencyMs += duration;
      this.metrics.avgLatencyMs = this.metrics.totalLatencyMs / this.totalExecuted;
      return { nodeId: this.id, pool: this.pool, durationMs: duration, ...result };
    } catch (err) {
      this.totalFailed++;
      throw err;
    } finally {
      this.activeTasks--;
      if (this.activeTasks === 0) this.state = NODE_STATES.READY;
    }
  }

  /** Get node health/status for monitoring */
  getHealth() {
    const load = this.maxConcurrent > 0 ? this.activeTasks / this.maxConcurrent : 0;
    return {
      id: this.id,
      pool: this.pool,
      state: this.state,
      cslGate: this.cslGate,
      activeTasks: this.activeTasks,
      maxConcurrent: this.maxConcurrent,
      load: Math.round(load * 100) / 100,
      pressure: getPressureLevel(load),
      totalExecuted: this.totalExecuted,
      totalFailed: this.totalFailed,
      avgLatencyMs: Math.round(this.metrics.avgLatencyMs),
      capabilities: this.capabilities,
    };
  }
}

// ─── LiquidTopology ────────────────────────────────────────────────

class LiquidTopology extends EventEmitter {
  constructor() {
    super();
    this.nodes = new Map();
    this.pools = { hot: [], warm: [], cold: [], reserve: [] };
  }

  /** Add a node to the topology */
  addNode(spec) {
    const node = new LiquidNode(spec);
    node.activate();
    this.nodes.set(node.id, node);
    if (this.pools[node.pool]) {
      this.pools[node.pool].push(node);
    }
    this.emit('node:added', { nodeId: node.id, pool: node.pool });
    return node;
  }

  /** Remove a node from the topology */
  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    node.state = NODE_STATES.OFFLINE;
    this.nodes.delete(nodeId);
    for (const pool of Object.values(this.pools)) {
      const idx = pool.indexOf(node);
      if (idx >= 0) pool.splice(idx, 1);
    }
    this.emit('node:removed', { nodeId });
  }

  /**
   * Route a task to the best available node.
   * Checks pools in order: hot -> warm -> cold -> reserve.
   * Each node must pass the CSL gate for the task's relevance score.
   *
   * @param {Object} task - { cslScore, type, data }
   * @param {Function} handler - async (task, node) => result
   * @returns {Promise<Object>} Execution result from the chosen node
   */
  async route(task, handler) {
    const cslScore = task.cslScore || CSL_THRESHOLDS.MEDIUM;
    const poolOrder = [POOL_TYPES.HOT, POOL_TYPES.WARM, POOL_TYPES.COLD, POOL_TYPES.RESERVE];

    for (const poolName of poolOrder) {
      const pool = this.pools[poolName] || [];
      // Sort by load ascending (least loaded first)
      const sorted = [...pool].sort((a, b) => a.activeTasks - b.activeTasks);

      for (const node of sorted) {
        if (node.canAccept(cslScore)) {
          this.emit('task:routed', { nodeId: node.id, pool: poolName, cslScore });
          return await node.execute(task, handler);
        }
      }
    }

    this.emit('task:unroutable', { cslScore, type: task.type });
    throw new Error(`No available node for task (CSL: ${cslScore})`);
  }

  /** Get health of the entire topology */
  getHealth() {
    const nodeHealths = Array.from(this.nodes.values()).map(n => n.getHealth());
    const poolSummary = {};
    for (const [name, nodes] of Object.entries(this.pools)) {
      poolSummary[name] = {
        count: nodes.length,
        active: nodes.filter(n => n.state === NODE_STATES.ACTIVE).length,
        ready: nodes.filter(n => n.state === NODE_STATES.READY).length,
        totalCapacity: nodes.reduce((s, n) => s + n.maxConcurrent, 0),
        usedCapacity: nodes.reduce((s, n) => s + n.activeTasks, 0),
      };
    }
    return {
      totalNodes: this.nodes.size,
      pools: poolSummary,
      nodes: nodeHealths,
    };
  }

  /** Graceful shutdown — drain all nodes */
  async shutdown() {
    for (const node of this.nodes.values()) {
      node.state = NODE_STATES.DRAINING;
    }
    // Wait for active tasks to complete (max 10s)
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const active = Array.from(this.nodes.values()).reduce((s, n) => s + n.activeTasks, 0);
      if (active === 0) break;
      await new Promise(r => setTimeout(r, 100));
    }
    for (const node of this.nodes.values()) {
      node.state = NODE_STATES.OFFLINE;
    }
    this.emit('shutdown');
  }
}

// ─── Default Topology Factory ──────────────────────────────────────

/**
 * Create the default Heady liquid topology with standard node layout.
 * @returns {LiquidTopology}
 */
function createDefaultTopology() {
  const topo = new LiquidTopology();

  // Hot pool — latency-critical (fib(5)=5 max concurrent each)
  topo.addNode({ id: 'hot-primary', pool: 'hot', cslGate: CSL_THRESHOLDS.CRITICAL, capabilities: ['inference', 'embedding', 'routing'], maxConcurrent: fib(5) });
  topo.addNode({ id: 'hot-secondary', pool: 'hot', cslGate: CSL_THRESHOLDS.HIGH, capabilities: ['inference', 'api-gateway', 'routing'], maxConcurrent: fib(5) });

  // Warm pool — standard processing (fib(6)=8 max concurrent each)
  topo.addNode({ id: 'warm-compute-1', pool: 'warm', cslGate: CSL_THRESHOLDS.MEDIUM, capabilities: ['build', 'test', 'deploy', 'analysis'], maxConcurrent: fib(6) });
  topo.addNode({ id: 'warm-compute-2', pool: 'warm', cslGate: CSL_THRESHOLDS.MEDIUM, capabilities: ['code-gen', 'refactor', 'audit'], maxConcurrent: fib(6) });
  topo.addNode({ id: 'warm-compute-3', pool: 'warm', cslGate: CSL_THRESHOLDS.LOW, capabilities: ['research', 'ingest', 'extract'], maxConcurrent: fib(6) });

  // Cold pool — batch processing (fib(7)=13 max concurrent each)
  topo.addNode({ id: 'cold-batch-1', pool: 'cold', cslGate: CSL_THRESHOLDS.LOW, capabilities: ['analytics', 'mining', 'indexing'], maxConcurrent: fib(7) });
  topo.addNode({ id: 'cold-batch-2', pool: 'cold', cslGate: CSL_THRESHOLDS.MINIMUM, capabilities: ['archive', 'backup', 'sync'], maxConcurrent: fib(7) });

  // Reserve pool — overflow
  topo.addNode({ id: 'reserve-overflow', pool: 'reserve', cslGate: CSL_THRESHOLDS.MINIMUM, capabilities: ['any'], maxConcurrent: fib(8) }); // 21

  return topo;
}

module.exports = {
  LiquidNode,
  LiquidTopology,
  createDefaultTopology,
  NODE_STATES,
  POOL_TYPES,
};
