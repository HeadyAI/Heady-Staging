/**
 * Heady™ Liquid Node v5.0
 * Self-aware, dynamically reconfigurable processing node
 * Operates in 384D vector space with CSL-gated routing
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');
const {
  PHI, PSI, PSI_SQ, fib, phiBackoffWithJitter,
  CSL_THRESHOLDS, VECTOR,
  cslAND, getPressureLevel, phiFusionScore,
} = require('../../shared/phi-math');
const EMBEDDING_DIM = VECTOR ? VECTOR.DIMS : 384;
const { createLogger } = require('../../shared/logger');

const logger = createLogger('liquid-node');

const NODE_STATES = Object.freeze({
  SPAWNING:     'SPAWNING',
  INITIALIZING: 'INITIALIZING',
  READY:        'READY',
  WORKING:      'WORKING',
  DRAINING:     'DRAINING',
  TERMINATED:   'TERMINATED',
  ERROR:        'ERROR',
});

const POOL_TYPES = Object.freeze({
  HOT:  'HOT',
  WARM: 'WARM',
  COLD: 'COLD',
});

const FAILURE_THRESHOLD = fib(5);       // 5
const HALF_OPEN_DELAY = fib(8) * 1000;  // 21s
const PROMOTE_THRESHOLD = CSL_THRESHOLDS.HIGH;    // 0.882
const DEMOTE_THRESHOLD = CSL_THRESHOLDS.LOW;      // 0.691
const EVICT_THRESHOLD = CSL_THRESHOLDS.MINIMUM;   // 0.500

class NodeCircuitBreaker {
  constructor() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastTrip = 0;
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
    if (this.failures >= FAILURE_THRESHOLD && this.state === 'CLOSED') {
      this.state = 'OPEN';
      this.lastTrip = Date.now();
      this._timer = setTimeout(() => { this.state = 'HALF_OPEN'; }, HALF_OPEN_DELAY);
    }
  }

  canExecute() { return this.state !== 'OPEN'; }

  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }
}

class LatencyHistogram {
  constructor(bucketCount = fib(8)) {
    this.buckets = new Array(bucketCount).fill(0);
    this.boundaries = [];
    // Phi-scaled bucket boundaries: 1, 1.618, 2.618, 4.236...ms
    let boundary = 1;
    for (let i = 0; i < bucketCount; i++) {
      this.boundaries.push(boundary);
      boundary *= PHI;
    }
    this.count = 0;
    this.sum = 0;
    this.min = Infinity;
    this.max = 0;
  }

  record(latencyMs) {
    this.count++;
    this.sum += latencyMs;
    if (latencyMs < this.min) this.min = latencyMs;
    if (latencyMs > this.max) this.max = latencyMs;
    for (let i = 0; i < this.boundaries.length; i++) {
      if (latencyMs <= this.boundaries[i]) {
        this.buckets[i]++;
        return;
      }
    }
    this.buckets[this.buckets.length - 1]++;
  }

  get avg() { return this.count > 0 ? this.sum / this.count : 0; }

  percentile(p) {
    const target = Math.ceil(this.count * p);
    let cumulative = 0;
    for (let i = 0; i < this.buckets.length; i++) {
      cumulative += this.buckets[i];
      if (cumulative >= target) return this.boundaries[i];
    }
    return this.max;
  }

  toJSON() {
    return {
      count: this.count, avg: Math.round(this.avg * 100) / 100,
      min: this.min === Infinity ? 0 : this.min,
      max: this.max, p50: this.percentile(0.5),
      p95: this.percentile(0.95), p99: this.percentile(0.99),
    };
  }
}

class LiquidNode extends EventEmitter {
  constructor(config = {}) {
    super();
    this.id = config.id || `ln-${crypto.randomBytes(fib(5)).toString('hex')}`;
    this.type = config.type || 'general';
    this.pool = config.pool || POOL_TYPES.WARM;
    this.state = NODE_STATES.SPAWNING;
    this.capabilities = config.capabilities || new Float32Array(EMBEDDING_DIM);
    this.designEmbedding = Float32Array.from(this.capabilities);
    this.coherenceScore = 1.0;
    this.activeTasks = new Map();
    this.completedCount = 0;
    this.failedCount = 0;
    this.latencyHistogram = new LatencyHistogram();
    this.circuitBreaker = new NodeCircuitBreaker();
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this._heartbeatInterval = null;
    this._poolCheckInterval = null;

    if (config.capabilities) {
      this._normalizeCapabilities();
    } else {
      this._generateCapabilities(config.type || 'general');
    }
  }

  _normalizeCapabilities() {
    const mag = Math.sqrt(this.capabilities.reduce((s, v) => s + v * v, 0));
    if (mag > 0) {
      for (let i = 0; i < this.capabilities.length; i++) {
        this.capabilities[i] /= mag;
      }
    }
  }

  _generateCapabilities(type) {
    const seed = Buffer.from(type, 'utf8');
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      this.capabilities[i] = ((seed[i % seed.length] + i * PHI) % 256) / 256 - 0.5;
    }
    this._normalizeCapabilities();
    this.designEmbedding = Float32Array.from(this.capabilities);
  }

  async initialize() {
    this.state = NODE_STATES.INITIALIZING;
    this.emit('stateChange', { nodeId: this.id, state: this.state });

    this.state = NODE_STATES.READY;
    this.emit('stateChange', { nodeId: this.id, state: this.state });

    this._heartbeatInterval = setInterval(() => this._heartbeat(), 3000);
    this._poolCheckInterval = setInterval(() => this._checkPoolMigration(), 3000);

    logger.info('node_initialized', { nodeId: this.id, type: this.type, pool: this.pool });
    return this;
  }

  get load() {
    const maxTasks = this.pool === POOL_TYPES.HOT ? fib(9) : this.pool === POOL_TYPES.WARM ? fib(8) : fib(7);
    return this.activeTasks.size / maxTasks;
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

  scoreForTask(taskEmbedding) {
    // Compute real cosine similarity between node capabilities and task embedding
    let capabilityScore = 1.0;
    if (taskEmbedding && taskEmbedding.length === this.capabilities.length) {
      let dot = 0, magA = 0, magB = 0;
      for (let i = 0; i < this.capabilities.length; i++) {
        const a = this.capabilities[i], b = taskEmbedding[i] || 0;
        dot += a * b; magA += a * a; magB += b * b;
      }
      const denom = Math.sqrt(magA) * Math.sqrt(magB);
      capabilityScore = denom > 0 ? dot / denom : 0;
    }
    const loadPenalty = this.load * PSI_SQ;
    const coherenceBonus = this.coherenceScore * (1 - PSI);
    // Phi-weighted composite: capability×PSI + availability×(1-PSI-PSI²) + coherence×PSI²
    const weights = [PSI, 1 - PSI - PSI_SQ, PSI_SQ];
    const values = [capabilityScore, 1 - loadPenalty, coherenceBonus];
    return values.reduce((sum, v, i) => sum + v * weights[i], 0);
  }

  async executeTask(task) {
    if (!this.isAvailable) {
      return { success: false, error: 'NODE_UNAVAILABLE', nodeId: this.id };
    }

    const taskEntry = {
      id: task.id,
      startTime: Date.now(),
      embedding: task.embedding,
    };
    this.activeTasks.set(task.id, taskEntry);
    this.state = NODE_STATES.WORKING;
    this.lastActivity = Date.now();

    const start = Date.now();
    try {
      // Execute the task's handler if provided, otherwise return acknowledgment
      let result;
      if (typeof task.handler === 'function') {
        result = await task.handler(this);
      } else {
        result = { acknowledged: true, nodeId: this.id, taskId: task.id };
      }

      const latencyMs = Date.now() - start;
      this.latencyHistogram.record(latencyMs);
      this.completedCount++;
      this.circuitBreaker.recordSuccess();
      this.activeTasks.delete(task.id);

      if (this.activeTasks.size === 0) this.state = NODE_STATES.READY;

      this.emit('taskCompleted', { nodeId: this.id, taskId: task.id, latencyMs });
      logger.info('task_completed', { nodeId: this.id, taskId: task.id, latencyMs, pool: this.pool });

      return {
        success: true,
        result,
        latencyMs,
        nodeId: this.id,
        pool: this.pool,
        coherence: this.coherenceScore,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.latencyHistogram.record(latencyMs);
      this.failedCount++;
      this.circuitBreaker.recordFailure();
      this.activeTasks.delete(task.id);

      if (this.activeTasks.size === 0) {
        this.state = this.circuitBreaker.canExecute() ? NODE_STATES.READY : NODE_STATES.ERROR;
      }

      this.emit('taskFailed', { nodeId: this.id, taskId: task.id, error: err.message });
      logger.error('task_failed', { nodeId: this.id, taskId: task.id, error: err.message });

      return { success: false, error: err.message, nodeId: this.id, latencyMs };
    }
  }

  _heartbeat() {
    this._updateCoherence();
    const health = this.getHealth();
    this.emit('heartbeat', health);
    logger.debug('heartbeat', { nodeId: this.id, coherence: this.coherenceScore, load: this.load });
  }

  _updateCoherence() {
    // Compute cosine similarity between current capabilities and original design embedding
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < this.capabilities.length; i++) {
      const a = this.capabilities[i], b = this.designEmbedding[i];
      dot += a * b; magA += a * a; magB += b * b;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    const similarity = denom > 0 ? dot / denom : 0;
    this.coherenceScore = similarity;

    if (similarity < CSL_THRESHOLDS.MEDIUM) {
      this.emit('coherenceDrift', {
        nodeId: this.id,
        coherence: similarity,
        threshold: CSL_THRESHOLDS.MEDIUM,
      });
      logger.warn('coherence_drift', { nodeId: this.id, coherence: similarity });
    }
  }

  _checkPoolMigration() {
    // Phi-weighted performance: reliability×PSI + availability×(1-PSI-PSI²) + coherence×PSI²
    const factors = [1 - this.errorRate, 1 - this.load, this.coherenceScore];
    const weights = [PSI, 1 - PSI - PSI_SQ, PSI_SQ];
    const performanceScore = factors.reduce((sum, v, i) => sum + v * weights[i], 0);

    const currentPool = this.pool;
    if (performanceScore >= PROMOTE_THRESHOLD && this.pool !== POOL_TYPES.HOT) {
      if (this.pool === POOL_TYPES.COLD) this.pool = POOL_TYPES.WARM;
      else if (this.pool === POOL_TYPES.WARM) this.pool = POOL_TYPES.HOT;
    } else if (performanceScore <= DEMOTE_THRESHOLD && this.pool !== POOL_TYPES.COLD) {
      if (this.pool === POOL_TYPES.HOT) this.pool = POOL_TYPES.WARM;
      else if (this.pool === POOL_TYPES.WARM) this.pool = POOL_TYPES.COLD;
    }

    if (currentPool !== this.pool) {
      this.emit('poolMigration', { nodeId: this.id, from: currentPool, to: this.pool, score: performanceScore });
      logger.info('pool_migration', { nodeId: this.id, from: currentPool, to: this.pool, score: performanceScore });
    }
  }

  async drain() {
    this.state = NODE_STATES.DRAINING;
    this.emit('stateChange', { nodeId: this.id, state: this.state });
    logger.info('node_draining', { nodeId: this.id, activeTasks: this.activeTasks.size });

    let attempt = 0;
    while (this.activeTasks.size > 0 && attempt < fib(6)) {
      await new Promise(resolve => setTimeout(resolve, phiBackoffWithJitter(attempt)));
      attempt++;
    }

    for (const taskId of this.activeTasks.keys()) {
      this.activeTasks.delete(taskId);
    }
  }

  async shutdown() {
    await this.drain();
    if (this._heartbeatInterval) { clearInterval(this._heartbeatInterval); this._heartbeatInterval = null; }
    if (this._poolCheckInterval) { clearInterval(this._poolCheckInterval); this._poolCheckInterval = null; }
    this.circuitBreaker.destroy();
    this.state = NODE_STATES.TERMINATED;
    this.emit('stateChange', { nodeId: this.id, state: this.state });
    logger.info('node_terminated', { nodeId: this.id });
  }

  clone() {
    return new LiquidNode({
      type: this.type,
      pool: this.pool,
      capabilities: Float32Array.from(this.designEmbedding),
    });
  }

  getHealth() {
    return {
      nodeId: this.id,
      type: this.type,
      state: this.state,
      pool: this.pool,
      load: this.load,
      coherence: this.coherenceScore,
      errorRate: this.errorRate,
      activeTasks: this.activeTasks.size,
      completed: this.completedCount,
      failed: this.failedCount,
      latency: this.latencyHistogram.toJSON(),
      circuitBreaker: this.circuitBreaker.state,
      uptime: Date.now() - this.createdAt,
      pressure: getPressureLevel(this.load),
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { LiquidNode, NODE_STATES, POOL_TYPES };
