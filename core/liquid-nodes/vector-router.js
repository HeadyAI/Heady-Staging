/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * 3D Vector Space Router — CSL-gated dispatch across liquid nodes.
 * Routes tasks to optimal compute nodes using cosine similarity
 * in Sacred Geometry vector space.
 *
 * Founder: Eric Haywood
 * @module core/liquid-nodes/vector-router
 */

import phiMath from '@heady/phi-math-foundation';
import { EventEmitter } from 'events';
const { PHI, PSI, fib, CSL_THRESHOLDS, cslGate, cslBlend, phiBackoff, phiFusionWeights, phiResourceWeights } = phiMath.default || phiMath;
import structuredLogger from '@heady/structured-logger';
const { createLogger } = structuredLogger.default || structuredLogger;

const logger = createLogger('vector-router');

const PSI2 = PSI * PSI; // ≈ 0.382

/** Axis weights for phi-weighted distance calculation */
const AXIS_WEIGHTS = Object.freeze({ x: PHI, y: 1.0, z: PSI });

/**
 * Task type → target vector mappings.
 * Each vector encodes the ideal node characteristics:
 *   x = latency_priority, y = compute_weight, z = cache_affinity
 */
const TASK_VECTORS = Object.freeze({
  inference:  { x: PSI,       y: PHI,       z: PSI },
  embedding:  { x: 1.0,       y: PSI,       z: PHI },
  search:     { x: PHI,       y: 0.0,       z: 1.0 },
  training:   { x: 0.0,       y: PHI * PHI, z: 0.0 },
  general:    { x: PSI,       y: PSI,       z: PSI },
  deploy:     { x: PSI2,      y: PSI2,      z: 1.0 },
  transform:  { x: PSI,       y: PHI,       z: PSI2 },
  cluster:    { x: 0.0,       y: PHI,       z: PSI },
});

/**
 * Compute phi-weighted Euclidean distance between two 3D vectors.
 * @param {object} a - {x, y, z}
 * @param {object} b - {x, y, z}
 * @returns {number}
 */
function computeDistance(a, b) {
  const dx = (a.x - b.x) * AXIS_WEIGHTS.x;
  const dy = (a.y - b.y) * AXIS_WEIGHTS.y;
  const dz = (a.z - b.z) * AXIS_WEIGHTS.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compute cosine similarity between two 3D vectors.
 * @param {object} a - {x, y, z}
 * @param {object} b - {x, y, z}
 * @returns {number} -1 to 1
 */
function cosineSimilarity3D(a, b) {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const magA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  const magB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Normalize a 3D vector to unit length.
 * @param {object} v - {x, y, z}
 * @returns {object}
 */
function normalize3D(v) {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

class VectorRouter extends EventEmitter {
  /**
   * @param {object} registry - LiquidNodeRegistry instance
   */
  constructor(registry) {
    super();
    this._registry = registry;
    this._routingHistory = []; // Ring buffer, capacity fib(14)=377
    this._historyCapacity = fib(14);
    this._roundRobinOffset = 0;
  }

  /**
   * Score all candidate nodes for a task.
   * Uses CSL soft-gate activation combining vector similarity and health.
   *
   * @param {object[]} nodes - Candidate nodes
   * @param {object} taskVector - {x, y, z} target vector
   * @param {string} taskType - Task type identifier
   * @returns {Array<{nodeId: string, score: number, distance: number, cosineSim: number}>}
   */
  scoreCandidates(nodes, taskVector, taskType) {
    const targetVec = normalize3D(taskVector);
    const [wSimilarity, wHealth, wCapacity] = phiFusionWeights(3);

    const scored = [];
    for (const node of nodes) {
      if (node.health.status === 'quarantined' || node.health.status === 'unreachable') {
        continue;
      }

      const nodeVec = normalize3D(node.vector);
      const cosineSim = cosineSimilarity3D(targetVec, nodeVec);
      const distance = computeDistance(taskVector, node.vector);

      // Health factor: inverse of error rate, boosted by low consecutive failures
      const healthFactor = node.health.consecutiveFailures === 0
        ? 1.0
        : 1.0 / (1.0 + node.health.consecutiveFailures * PSI);

      // Capacity factor: prefer less loaded nodes
      const capacityFactor = 1.0 - node.capacity.utilization;

      // CSL-gated composite score
      const rawScore =
        cosineSim * wSimilarity +
        healthFactor * wHealth +
        capacityFactor * wCapacity;

      // Apply CSL soft-gate activation: sigmoid around MEDIUM threshold
      const gatedScore = cslGate(rawScore, cosineSim, CSL_THRESHOLDS.MEDIUM, 0.1);

      scored.push({
        nodeId: node.id,
        score: gatedScore,
        distance,
        cosineSim,
        healthFactor,
        capacityFactor,
      });
    }

    // Sort by score descending — this is NOT priority sorting.
    // Scores are CSL-gated continuous values, not discrete priority levels.
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Select the optimal node for a task using CSL soft-gate routing.
   *
   * @param {object} taskVector - {x, y, z} target position in vector space
   * @param {string} taskType - Task type key
   * @param {object} [constraints] - Optional constraints { platform, region, minCapacity }
   * @returns {object|null} { nodeId, node, score, distance }
   */
  selectOptimal(taskVector, taskType, constraints = {}) {
    let candidates = this._registry.getHealthyNodes();

    // Apply constraints
    if (constraints.platform) {
      candidates = candidates.filter(n => n.platform === constraints.platform);
    }
    if (constraints.region) {
      candidates = candidates.filter(n => n.region === constraints.region);
    }
    if (constraints.minCapacity) {
      candidates = candidates.filter(n =>
        (n.capacity.max - n.capacity.current) >= constraints.minCapacity
      );
    }

    if (candidates.length === 0) {
      logger.warn('No healthy candidates for routing', { taskType, constraints });
      return null;
    }

    const scored = this.scoreCandidates(candidates, taskVector, taskType);
    if (scored.length === 0) return null;

    // Apply round-robin offset for tie-breaking (concurrent-equals)
    const topTier = scored.filter(s =>
      s.score >= scored[0].score * PSI // Within PSI ratio of top score
    );

    const selected = topTier[this._roundRobinOffset % topTier.length];
    this._roundRobinOffset = (this._roundRobinOffset + 1) % fib(16);

    const node = this._registry.getNode(selected.nodeId);

    // Record routing decision
    this._recordRouting({
      taskType,
      taskVector,
      selectedNodeId: selected.nodeId,
      score: selected.score,
      candidateCount: candidates.length,
      timestamp: Date.now(),
    });

    this.emit('route:selected', {
      nodeId: selected.nodeId,
      score: selected.score,
      taskType,
    });

    return {
      nodeId: selected.nodeId,
      node,
      score: selected.score,
      distance: selected.distance,
      cosineSim: selected.cosineSim,
    };
  }

  /**
   * Route with circuit-breaker fallback and phi-backoff retry.
   *
   * @param {object} taskVector - Target vector
   * @param {string} taskType - Task type
   * @param {number} [maxAttempts=fib(5)] - Maximum routing attempts
   * @returns {object|null} Routing result
   */
  routeWithFallback(taskVector, taskType, maxAttempts = fib(5)) {
    const triedNodes = new Set();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let candidates = this._registry.getHealthyNodes()
        .filter(n => !triedNodes.has(n.id));

      if (candidates.length === 0) {
        logger.warn('All candidates exhausted during fallback routing', {
          taskType,
          attempt,
          triedNodes: Array.from(triedNodes),
        });
        break;
      }

      const scored = this.scoreCandidates(candidates, taskVector, taskType);
      if (scored.length === 0) break;

      const selected = scored[0];
      const node = this._registry.getNode(selected.nodeId);

      if (node && selected.score >= CSL_THRESHOLDS.LOW) {
        this.emit('route:fallback-selected', {
          nodeId: selected.nodeId,
          attempt,
          score: selected.score,
        });
        return {
          nodeId: selected.nodeId,
          node,
          score: selected.score,
          attempt,
          fallback: attempt > 0,
        };
      }

      triedNodes.add(selected.nodeId);
      const backoffMs = phiBackoff(attempt, fib(7) * 1000);
      logger.info('Route fallback, trying next candidate', {
        attempt,
        failedNode: selected.nodeId,
        backoffMs,
      });
    }

    this.emit('route:exhausted', { taskType, attempts: maxAttempts });
    return null;
  }

  /**
   * Get the target vector for a task type.
   * @param {string} taskType
   * @returns {object} {x, y, z}
   */
  getTaskVector(taskType) {
    return TASK_VECTORS[taskType] || TASK_VECTORS.general;
  }

  /**
   * Rebalance load across active nodes using phi-resource-weights.
   * Redistributes capacity targets proportionally.
   */
  rebalance() {
    const activeNodes = this._registry.getHealthyNodes();
    if (activeNodes.length === 0) return;

    const weights = phiResourceWeights(activeNodes.length);
    const totalLoad = activeNodes.reduce((s, n) => s + n.capacity.current, 0);

    const redistributions = [];
    for (let i = 0; i < activeNodes.length; i++) {
      const targetLoad = Math.floor(totalLoad * weights[i]);
      const node = activeNodes[i];
      const delta = targetLoad - node.capacity.current;

      if (Math.abs(delta) > fib(3)) {
        redistributions.push({
          nodeId: node.id,
          currentLoad: node.capacity.current,
          targetLoad,
          delta,
        });
      }
    }

    if (redistributions.length > 0) {
      this.emit('route:rebalance', { redistributions });
      logger.info('Rebalance computed', { redistributions: redistributions.length });
    }

    return redistributions;
  }

  /**
   * Record routing decision to ring buffer history.
   * @private
   */
  _recordRouting(record) {
    this._routingHistory.push(record);
    while (this._routingHistory.length > this._historyCapacity) {
      this._routingHistory.shift();
    }
  }

  /**
   * Get routing statistics.
   * @returns {object}
   */
  getRoutingStats() {
    if (this._routingHistory.length === 0) {
      return { totalRoutes: 0, avgScore: 0, byTaskType: {} };
    }

    const byTaskType = {};
    let totalScore = 0;
    for (const r of this._routingHistory) {
      totalScore += r.score;
      if (!byTaskType[r.taskType]) {
        byTaskType[r.taskType] = { count: 0, avgScore: 0, totalScore: 0 };
      }
      byTaskType[r.taskType].count++;
      byTaskType[r.taskType].totalScore += r.score;
    }

    for (const key of Object.keys(byTaskType)) {
      byTaskType[key].avgScore = byTaskType[key].totalScore / byTaskType[key].count;
      delete byTaskType[key].totalScore;
    }

    return {
      totalRoutes: this._routingHistory.length,
      avgScore: totalScore / this._routingHistory.length,
      byTaskType,
    };
  }
}

export {
  VectorRouter,
  computeDistance,
  cosineSimilarity3D,
  normalize3D,
  TASK_VECTORS,
  AXIS_WEIGHTS,
};
