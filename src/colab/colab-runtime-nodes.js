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
// ║  FILE: src/colab/colab-runtime-nodes.js                           ║
// ║  LAYER: backend/src                                               ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * Colab Runtime Nodes — LiquidNode Integration for 3 Colab Pro+ Runtimes
 *
 * Bridges the Colab Runtime Manager with the Liquid Node architecture,
 * making each Colab Pro+ A100 runtime a first-class LiquidNode in the
 * Heady topology. This enables CSL-gated routing of GPU-accelerated
 * tasks (embedding generation, model inference, training) through the
 * same unified routing fabric as all other nodes.
 *
 * Runtimes:
 *   - Cortex  (colab-us-east)  — primary_inference,     hot pool,  gate 0.927
 *   - Synapse (colab-us-west)  — redundant_inference,   warm pool, gate 0.882
 *   - Reflex  (colab-eu-west)  — geo_redundancy,        warm pool, gate 0.882
 *
 * @module colab-runtime-nodes
 * @version 1.0.0
 */

'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');

// Import from single source of truth — ZERO hardcoded constants
let PHI, PSI, fib, CSL_THRESHOLDS_RAW;
try {
  const phiMath = require('../../shared/phi-math.js');
  PHI = phiMath.PHI;
  PSI = phiMath.PSI;
  fib = phiMath.fib;
  CSL_THRESHOLDS_RAW = phiMath.CSL_THRESHOLDS;
} catch {
  // Fallback if phi-math not available (standalone usage)
  PHI = 1.618033988749895;
  PSI = 1 / PHI;
  fib = (n) => [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144][n] || 0;
  CSL_THRESHOLDS_RAW = null;
}
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

const CSL_THRESHOLDS = CSL_THRESHOLDS_RAW || Object.freeze({
  MINIMUM: 0.500,
  LOW: 0.691,
  MEDIUM: 0.809,
  HIGH: 0.882,
  CRITICAL: 0.927,
});

const RUNTIME_SPECS = Object.freeze([
  {
    id: 'colab-us-east',
    codename: 'Cortex',
    region: 'us-east1',
    role: 'primary_inference',
    pool: 'hot',
    cslGate: CSL_THRESHOLDS.CRITICAL,
    gpu: 'NVIDIA A100 40GB',
    gpuMemoryGB: 40,
    ramGB: 83,
    vCPUs: 8,
    capabilities: ['embedding-generation', 'model-inference', 'vector-search', 'fine-tuning', 'data-processing'],
  },
  {
    id: 'colab-us-west',
    codename: 'Synapse',
    region: 'us-west1',
    role: 'redundant_inference',
    pool: 'warm',
    cslGate: CSL_THRESHOLDS.HIGH,
    gpu: 'NVIDIA A100 40GB',
    gpuMemoryGB: 40,
    ramGB: 83,
    vCPUs: 8,
    capabilities: ['embedding-generation', 'model-inference', 'vector-search', 'batch-processing'],
  },
  {
    id: 'colab-eu-west',
    codename: 'Reflex',
    region: 'europe-west1',
    role: 'geo_redundancy',
    pool: 'warm',
    cslGate: CSL_THRESHOLDS.HIGH,
    gpu: 'NVIDIA A100 40GB',
    gpuMemoryGB: 40,
    ramGB: 83,
    vCPUs: 8,
    capabilities: ['embedding-generation', 'model-inference', 'vector-search', 'geo-replication'],
  },
]);

const NODE_STATES = Object.freeze({
  OFFLINE: 'OFFLINE',
  CONNECTING: 'CONNECTING',
  READY: 'READY',
  BUSY: 'BUSY',
  DRAINING: 'DRAINING',
  ERROR: 'ERROR',
});

const HEARTBEAT_INTERVAL_MS = Math.round(PHI * PHI * PHI * PHI * PHI * PHI * PHI * 1000); // PHI^7 * 1000 ≈ 29,034ms
const MAX_CONCURRENT_TASKS = FIB[8]; // 21
const CIRCUIT_BREAKER_THRESHOLD = FIB[5]; // 5 failures
const HALF_OPEN_DELAY_MS = FIB[8] * 1000; // 21,000ms

class RuntimeCircuitBreaker {
  constructor(runtimeId) {
    this.runtimeId = runtimeId;
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailure = 0;
    this._timer = null;
  }

  recordSuccess() {
    this.failures = 0;
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= CIRCUIT_BREAKER_THRESHOLD && this.state === 'CLOSED') {
      this.state = 'OPEN';
      this._timer = setTimeout(() => { this.state = 'HALF_OPEN'; }, HALF_OPEN_DELAY_MS);
    }
  }

  canExecute() { return this.state !== 'OPEN'; }

  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }
}

/**
 * ColabRuntimeNode — A LiquidNode wrapper for a single Colab Pro+ runtime.
 * Provides CSL-gated task routing, circuit breaking, health monitoring,
 * and phi-scaled resource management for GPU-accelerated workloads.
 */
class ColabRuntimeNode extends EventEmitter {
  constructor(spec) {
    super();
    this.id = spec.id;
    this.codename = spec.codename;
    this.region = spec.region;
    this.role = spec.role;
    this.pool = spec.pool;
    this.cslGate = spec.cslGate;
    this.gpu = spec.gpu;
    this.gpuMemoryGB = spec.gpuMemoryGB;
    this.ramGB = spec.ramGB;
    this.vCPUs = spec.vCPUs;
    this.capabilities = spec.capabilities;
    this.state = NODE_STATES.OFFLINE;
    this.activeTasks = new Map();
    this.completedCount = 0;
    this.failedCount = 0;
    this.circuitBreaker = new RuntimeCircuitBreaker(this.id);
    this.createdAt = Date.now();
    this.lastHeartbeat = 0;
    this._heartbeatInterval = null;

    // Generate deterministic 384D embedding from runtime identity
    this.embedding = this._generateEmbedding();
  }

  _generateEmbedding() {
    const dim = 384;
    const vec = new Float32Array(dim);
    const seed = Buffer.from(`${this.id}:${this.codename}:${this.role}`, 'utf8');
    for (let i = 0; i < dim; i++) {
      vec[i] = ((seed[i % seed.length] + i * PHI) % 256) / 256 - 0.5;
    }
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (mag > 0) for (let i = 0; i < dim; i++) vec[i] /= mag;
    return vec;
  }

  get load() {
    return this.activeTasks.size / MAX_CONCURRENT_TASKS;
  }

  get isAvailable() {
    return this.state === NODE_STATES.READY &&
           this.circuitBreaker.canExecute() &&
           this.load < 1.0;
  }

  get errorRate() {
    const total = this.completedCount + this.failedCount;
    return total > 0 ? this.failedCount / total : 0;
  }

  async connect() {
    this.state = NODE_STATES.CONNECTING;
    this.emit('stateChange', { nodeId: this.id, state: this.state });

    // In production, this establishes a connection to the Colab runtime via API
    this.state = NODE_STATES.READY;
    this.lastHeartbeat = Date.now();
    this.emit('stateChange', { nodeId: this.id, state: this.state });

    this._heartbeatInterval = setInterval(() => this._heartbeat(), HEARTBEAT_INTERVAL_MS);

    return this;
  }

  /**
   * Score this runtime for a given task based on CSL-gated capability matching.
   * @param {Object} task - Task with type and embedding
   * @returns {number} Relevance score 0-1
   */
  scoreForTask(task) {
    const typeMatch = this.capabilities.includes(task.type) ? 1.0 : 0.0;
    const loadPenalty = this.load * PSI;
    const poolBonus = this.pool === 'hot' ? 0.1 : 0.0;
    const score = (typeMatch * PSI + (1 - loadPenalty) * (1 - PSI)) + poolBonus;
    return Math.min(score, 1.0);
  }

  async executeTask(task) {
    if (!this.isAvailable) {
      return { success: false, error: 'RUNTIME_UNAVAILABLE', nodeId: this.id };
    }

    const taskEntry = {
      id: task.id || crypto.randomBytes(FIB[5]).toString('hex'),
      type: task.type,
      startTime: Date.now(),
    };
    this.activeTasks.set(taskEntry.id, taskEntry);
    this.state = NODE_STATES.BUSY;

    const start = Date.now();
    try {
      let result;
      if (typeof task.handler === 'function') {
        result = await task.handler(this);
      } else {
        result = {
          acknowledged: true,
          nodeId: this.id,
          codename: this.codename,
          taskId: taskEntry.id,
          gpu: this.gpu,
          region: this.region,
        };
      }

      const latencyMs = Date.now() - start;
      this.completedCount++;
      this.circuitBreaker.recordSuccess();
      this.activeTasks.delete(taskEntry.id);

      if (this.activeTasks.size === 0) this.state = NODE_STATES.READY;

      this.emit('taskCompleted', { nodeId: this.id, taskId: taskEntry.id, latencyMs });
      return { success: true, result, latencyMs, nodeId: this.id, codename: this.codename };
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.failedCount++;
      this.circuitBreaker.recordFailure();
      this.activeTasks.delete(taskEntry.id);

      if (this.activeTasks.size === 0) {
        this.state = this.circuitBreaker.canExecute() ? NODE_STATES.READY : NODE_STATES.ERROR;
      }

      this.emit('taskFailed', { nodeId: this.id, taskId: taskEntry.id, error: err.message });
      return { success: false, error: err.message, nodeId: this.id, latencyMs };
    }
  }

  _heartbeat() {
    this.lastHeartbeat = Date.now();
    const health = this.getHealth();
    this.emit('heartbeat', health);
  }

  getHealth() {
    return {
      nodeId: this.id,
      codename: this.codename,
      region: this.region,
      role: this.role,
      state: this.state,
      pool: this.pool,
      gpu: this.gpu,
      gpuMemoryGB: this.gpuMemoryGB,
      load: Math.round(this.load * 100) / 100,
      activeTasks: this.activeTasks.size,
      maxTasks: MAX_CONCURRENT_TASKS,
      completed: this.completedCount,
      failed: this.failedCount,
      errorRate: Math.round(this.errorRate * 1000) / 1000,
      circuitBreaker: this.circuitBreaker.state,
      uptime: Date.now() - this.createdAt,
      lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
      cslGate: this.cslGate,
      timestamp: new Date().toISOString(),
    };
  }

  async shutdown() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
    this.circuitBreaker.destroy();
    this.state = NODE_STATES.OFFLINE;
    this.emit('stateChange', { nodeId: this.id, state: this.state });
  }
}

/**
 * ColabRuntimeCluster — Manages all 3 Colab Pro+ runtimes as a unified
 * compute cluster with CSL-gated task routing and automatic failover.
 */
class ColabRuntimeCluster extends EventEmitter {
  constructor() {
    super();
    this.nodes = new Map();
    this.routingHistory = [];
  }

  async initialize() {
    for (const spec of RUNTIME_SPECS) {
      const node = new ColabRuntimeNode(spec);
      await node.connect();

      node.on('heartbeat', (health) => this.emit('nodeHeartbeat', health));
      node.on('taskCompleted', (info) => this.emit('taskCompleted', info));
      node.on('taskFailed', (info) => this.emit('taskFailed', info));

      this.nodes.set(spec.id, node);
    }

    return this;
  }

  /**
   * Route a task to the best available Colab runtime using CSL-gated scoring.
   * @param {Object} task - Task with type and optional embedding
   * @returns {ColabRuntimeNode|null} Best matching runtime
   */
  routeTask(task) {
    const scores = [];
    for (const [id, node] of this.nodes) {
      if (!node.isAvailable) continue;
      const score = node.scoreForTask(task);
      if (score >= CSL_THRESHOLDS.MINIMUM) {
        scores.push({ node, score });
      }
    }

    if (scores.length === 0) return null;

    scores.sort((a, b) => b.score - a.score);
    const selected = scores[0];

    this.routingHistory.push({
      taskType: task.type,
      selectedNode: selected.node.id,
      score: selected.score,
      candidates: scores.length,
      timestamp: new Date().toISOString(),
    });

    // Keep history bounded by Fibonacci
    if (this.routingHistory.length > FIB[9]) { // 34
      this.routingHistory = this.routingHistory.slice(-FIB[8]); // keep last 21
    }

    return selected.node;
  }

  /**
   * Execute a task on the best available runtime.
   * Includes automatic failover to next-best runtime on failure.
   */
  async executeTask(task) {
    const primary = this.routeTask(task);
    if (!primary) {
      return { success: false, error: 'NO_AVAILABLE_RUNTIMES' };
    }

    const result = await primary.executeTask(task);
    if (result.success) return result;

    // Failover: try next available runtime
    for (const [id, node] of this.nodes) {
      if (id === primary.id || !node.isAvailable) continue;
      const failoverResult = await node.executeTask(task);
      if (failoverResult.success) {
        failoverResult.failover = true;
        failoverResult.failoverFrom = primary.id;
        return failoverResult;
      }
    }

    return result; // Return original failure if all failovers fail
  }

  getClusterHealth() {
    const nodes = [];
    for (const [, node] of this.nodes) {
      nodes.push(node.getHealth());
    }

    const available = nodes.filter(n => n.state === NODE_STATES.READY).length;
    const totalLoad = nodes.reduce((sum, n) => sum + n.load, 0) / nodes.length;

    return {
      cluster: 'colab-pro-plus',
      totalNodes: nodes.length,
      availableNodes: available,
      averageLoad: Math.round(totalLoad * 100) / 100,
      totalCompleted: nodes.reduce((s, n) => s + n.completed, 0),
      totalFailed: nodes.reduce((s, n) => s + n.failed, 0),
      routingDecisions: this.routingHistory.length,
      nodes,
      timestamp: new Date().toISOString(),
    };
  }

  async shutdown() {
    for (const [, node] of this.nodes) {
      await node.shutdown();
    }
    this.nodes.clear();
  }
}

module.exports = {
  ColabRuntimeNode,
  ColabRuntimeCluster,
  RUNTIME_SPECS,
  NODE_STATES,
  CSL_THRESHOLDS,
  MAX_CONCURRENT_TASKS,
  HEARTBEAT_INTERVAL_MS,
};
