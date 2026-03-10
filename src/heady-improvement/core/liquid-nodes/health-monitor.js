/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Liquid Node Health Monitor — Continuous health monitoring with
 * phi-scaled intervals, circuit breakers, and quarantine/revive lifecycle.
 *
 * Founder: Eric Haywood
 * @module core/liquid-nodes/health-monitor
 */

import { EventEmitter } from 'events';
import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,
  phiBackoff,
  classifyPressure,
  phiFusionWeights,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';
import { NODE_STATUS, PLATFORM } from './node-registry.js';

const logger = createLogger('health-monitor');

const PSI2 = PSI * PSI;

/**
 * Platform-specific heartbeat intervals (milliseconds).
 * Phi-scaled using Fibonacci numbers.
 */
const HEARTBEAT_INTERVALS = Object.freeze({
  [PLATFORM.CLOUDFLARE]: fib(8) * 1000,  // 21s — fast, critical path
  [PLATFORM.LOCAL]:      fib(7) * 1000,   // 13s — local, quick
  [PLATFORM.VERTEX]:     fib(9) * 1000,   // 34s — medium
  [PLATFORM.COLAB]:      fib(10) * 1000,  // 55s — slower, expensive
  [PLATFORM.CLOUD_RUN]:  fib(8) * 1000,   // 21s — standard
});

/**
 * Circuit breaker configuration per node.
 */
const CIRCUIT_BREAKER_DEFAULTS = Object.freeze({
  failureThreshold: fib(5),        // 5 consecutive failures to open
  successThreshold: fib(3),        // 2 consecutive successes to close
  halfOpenProbeBaseMs: fib(8) * 1000, // 21s base for phi-backoff
  maxProbeMs: fib(14) * 1000,      // 377s max backoff
});

/** Circuit breaker states */
const CB_STATE = Object.freeze({
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open',
});

class CircuitBreaker {
  constructor(nodeId, config = {}) {
    this.nodeId = nodeId;
    this.state = CB_STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = 0;
    this.probeAttempt = 0;
    this.config = { ...CIRCUIT_BREAKER_DEFAULTS, ...config };
  }

  recordSuccess() {
    this.failureCount = 0;
    if (this.state === CB_STATE.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CB_STATE.CLOSED;
        this.successCount = 0;
        this.probeAttempt = 0;
        return 'closed';
      }
    }
    return this.state;
  }

  recordFailure() {
    this.successCount = 0;
    this.failureCount++;
    if (this.state === CB_STATE.HALF_OPEN) {
      this.state = CB_STATE.OPEN;
      this.openedAt = Date.now();
      this.probeAttempt++;
      return 'open';
    }
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CB_STATE.OPEN;
      this.openedAt = Date.now();
      return 'open';
    }
    return this.state;
  }

  shouldProbe() {
    if (this.state !== CB_STATE.OPEN) return false;
    const elapsed = Date.now() - this.openedAt;
    const probeDelay = phiBackoff(
      this.probeAttempt,
      this.config.halfOpenProbeBaseMs,
      this.config.maxProbeMs
    );
    return elapsed >= probeDelay;
  }

  startProbe() {
    this.state = CB_STATE.HALF_OPEN;
    return this.state;
  }

  toJSON() {
    return {
      nodeId: this.nodeId,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      probeAttempt: this.probeAttempt,
    };
  }
}

class HealthMonitor extends EventEmitter {
  /**
   * @param {object} registry - LiquidNodeRegistry instance
   * @param {object} [options]
   * @param {Function} [options.fetchHealth] - async (endpoint) => { status, latencyMs }
   */
  constructor(registry, options = {}) {
    super();
    this._registry = registry;
    this._fetchHealth = options.fetchHealth || defaultFetchHealth;
    this._circuitBreakers = new Map();
    this._intervals = new Map();
    this._running = false;
  }

  /**
   * Start continuous health monitoring for all nodes.
   */
  start() {
    if (this._running) return;
    this._running = true;

    const nodes = this._registry.getAllNodes();
    for (const node of nodes) {
      this._ensureCircuitBreaker(node.id);
      this._startNodeMonitor(node);
    }

    // Listen for new node registrations
    this._registry.on('node:registered', ({ nodeId }) => {
      const node = this._registry.getNode(nodeId);
      if (node) {
        this._ensureCircuitBreaker(nodeId);
        this._startNodeMonitor(node);
      }
    });

    this._registry.on('node:deregistered', ({ nodeId }) => {
      this._stopNodeMonitor(nodeId);
      this._circuitBreakers.delete(nodeId);
    });

    logger.info('Health monitoring started', { nodeCount: nodes.length });
  }

  /**
   * Stop all monitoring.
   */
  stop() {
    this._running = false;
    for (const [nodeId, intervalId] of this._intervals) {
      clearInterval(intervalId);
    }
    this._intervals.clear();
    logger.info('Health monitoring stopped');
  }

  /**
   * Heartbeat all nodes in parallel.
   * @returns {Promise<object[]>} Health results
   */
  async heartbeatAll() {
    const nodes = this._registry.getAllNodes();
    const results = await Promise.allSettled(
      nodes.map(node => this.heartbeatNode(node.id))
    );
    return results.map((r, i) => ({
      nodeId: nodes[i].id,
      ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message }),
    }));
  }

  /**
   * Heartbeat a single node.
   * @param {string} nodeId
   * @returns {Promise<object>}
   */
  async heartbeatNode(nodeId) {
    const node = this._registry.getNode(nodeId);
    if (!node) return { nodeId, error: 'Node not found' };

    const cb = this._ensureCircuitBreaker(nodeId);

    // If circuit is open and not ready for probe, skip
    if (cb.state === CB_STATE.OPEN && !cb.shouldProbe()) {
      return {
        nodeId,
        status: 'circuit_open',
        nextProbeMs: phiBackoff(cb.probeAttempt, cb.config.halfOpenProbeBaseMs),
      };
    }

    if (cb.state === CB_STATE.OPEN && cb.shouldProbe()) {
      cb.startProbe();
      logger.info('Circuit breaker half-open probe', { nodeId, attempt: cb.probeAttempt });
    }

    if (!node.endpoint) {
      return { nodeId, status: 'no_endpoint' };
    }

    const startMs = Date.now();
    try {
      const result = await this._fetchHealth(node.endpoint);
      const latencyMs = Date.now() - startMs;

      const healthData = {
        status: result.status === 'healthy' ? NODE_STATUS.ACTIVE : NODE_STATUS.DEGRADED,
        latencyMs,
        errorRate: 0,
        consecutiveFailures: 0,
      };

      this._registry.updateHealth(nodeId, healthData);
      const cbResult = cb.recordSuccess();

      if (cbResult === 'closed') {
        this.emit('circuit:closed', { nodeId });
        logger.info('Circuit breaker closed', { nodeId });
      }

      return { nodeId, ...healthData, circuitBreaker: cb.state };
    } catch (err) {
      const latencyMs = Date.now() - startMs;

      const healthData = {
        status: NODE_STATUS.UNREACHABLE,
        latencyMs,
        errorRate: (node.health.errorRate || 0) + PSI2,
        consecutiveFailures: (node.health.consecutiveFailures || 0) + 1,
      };

      this._registry.updateHealth(nodeId, healthData);
      const cbResult = cb.recordFailure();

      if (cbResult === 'open') {
        this.emit('circuit:opened', { nodeId, failures: cb.failureCount });
        logger.warn('Circuit breaker opened', { nodeId, failures: cb.failureCount });
      }

      this.emit('health:failure', { nodeId, error: err.message, latencyMs });
      return { nodeId, ...healthData, error: err.message, circuitBreaker: cb.state };
    }
  }

  /**
   * Quarantine a node — isolate from routing, emit alert.
   * @param {string} nodeId
   */
  quarantineNode(nodeId) {
    const node = this._registry.getNode(nodeId);
    if (!node) return;

    this._registry.updateHealth(nodeId, { status: NODE_STATUS.QUARANTINED });
    this.emit('node:quarantined', { nodeId, platform: node.platform });
    logger.warn('Node quarantined', { nodeId, platform: node.platform });
  }

  /**
   * Degrade a node — shift traffic away but don't fully isolate.
   * @param {string} nodeId
   */
  degradeNode(nodeId) {
    const node = this._registry.getNode(nodeId);
    if (!node) return;

    this._registry.updateHealth(nodeId, { status: NODE_STATUS.DEGRADED });
    this.emit('node:degraded', { nodeId });
    logger.info('Node degraded', { nodeId });
  }

  /**
   * Revive a quarantined node — bring back at half capacity, ramp on success.
   * @param {string} nodeId
   */
  reviveNode(nodeId) {
    const node = this._registry.getNode(nodeId);
    if (!node) return;

    // Reset circuit breaker
    const cb = this._ensureCircuitBreaker(nodeId);
    cb.state = CB_STATE.HALF_OPEN;
    cb.failureCount = 0;
    cb.successCount = 0;

    // Bring back at half capacity
    const halfCapacity = Math.floor(node.capacity.max * PSI2);
    this._registry.updateHealth(nodeId, {
      status: NODE_STATUS.DEGRADED,
      consecutiveFailures: 0,
      errorRate: 0,
    });
    this._registry.updateCapacity(nodeId, 0);

    this.emit('node:revived', { nodeId, initialCapacity: halfCapacity });
    logger.info('Node revived at reduced capacity', { nodeId, halfCapacity });
  }

  /**
   * Get aggregate cluster health.
   * @returns {object}
   */
  getClusterHealth() {
    const nodes = this._registry.getAllNodes();
    if (nodes.length === 0) return { status: 'empty', nodes: 0 };

    const statusCounts = {};
    let totalLatency = 0;
    let measuredCount = 0;

    for (const node of nodes) {
      statusCounts[node.health.status] = (statusCounts[node.health.status] || 0) + 1;
      if (node.health.latencyMs > 0) {
        totalLatency += node.health.latencyMs;
        measuredCount++;
      }
    }

    const activeCount = (statusCounts[NODE_STATUS.ACTIVE] || 0);
    const healthRatio = activeCount / nodes.length;

    let clusterStatus;
    if (healthRatio >= CSL_THRESHOLDS.HIGH) {
      clusterStatus = 'healthy';
    } else if (healthRatio >= CSL_THRESHOLDS.MEDIUM) {
      clusterStatus = 'degraded';
    } else if (healthRatio >= CSL_THRESHOLDS.LOW) {
      clusterStatus = 'critical';
    } else {
      clusterStatus = 'emergency';
    }

    return {
      status: clusterStatus,
      healthRatio,
      nodes: nodes.length,
      statusCounts,
      avgLatencyMs: measuredCount > 0 ? totalLatency / measuredCount : 0,
      circuitBreakers: this._getCircuitBreakerSummary(),
    };
  }

  /**
   * Get circuit breaker summary.
   * @private
   */
  _getCircuitBreakerSummary() {
    const summary = { closed: 0, open: 0, halfOpen: 0 };
    for (const cb of this._circuitBreakers.values()) {
      if (cb.state === CB_STATE.CLOSED) summary.closed++;
      else if (cb.state === CB_STATE.OPEN) summary.open++;
      else summary.halfOpen++;
    }
    return summary;
  }

  /**
   * @private
   */
  _ensureCircuitBreaker(nodeId) {
    if (!this._circuitBreakers.has(nodeId)) {
      this._circuitBreakers.set(nodeId, new CircuitBreaker(nodeId));
    }
    return this._circuitBreakers.get(nodeId);
  }

  /**
   * @private
   */
  _startNodeMonitor(node) {
    if (this._intervals.has(node.id)) return;

    const intervalMs = HEARTBEAT_INTERVALS[node.platform] || fib(8) * 1000;
    const id = setInterval(() => {
      if (!this._running) return;
      this.heartbeatNode(node.id).catch(err => {
        logger.error('Heartbeat failed', { nodeId: node.id, error: err.message });
      });
    }, intervalMs);

    this._intervals.set(node.id, id);
  }

  /**
   * @private
   */
  _stopNodeMonitor(nodeId) {
    const id = this._intervals.get(nodeId);
    if (id) {
      clearInterval(id);
      this._intervals.delete(nodeId);
    }
  }
}

/**
 * Default health check implementation.
 * In production, replaced with actual HTTP fetch.
 * @param {string} endpoint
 * @returns {Promise<{status: string}>}
 */
async function defaultFetchHealth(endpoint) {
  // Production: const res = await fetch(`${endpoint}/health`);
  // This is a structured placeholder that can be dependency-injected.
  return { status: 'healthy', timestamp: Date.now() };
}

export {
  HealthMonitor,
  CircuitBreaker,
  CB_STATE,
  HEARTBEAT_INTERVALS,
  CIRCUIT_BREAKER_DEFAULTS,
};
