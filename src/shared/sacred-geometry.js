/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ SACRED GEOMETRY — Topology, Rings, & Coherence           ║
 * ║  The geometric backbone of the Heady orchestration architecture   ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║  © 2024-2026 HeadySystems Inc. All Rights Reserved.              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  PHI, PSI, PHI_SQUARED, PHI_CUBED, PHI_4,
  CSL_THRESHOLDS, fib, phiFusionWeights,
  GOLDEN_ANGLE_DEG, GOLDEN_ANGLE_RAD,
  POOL_PERCENT,
} from './phi-math.js';
import { cslAND } from './csl-engine.js';

// ─── RING TOPOLOGY ───────────────────────────────────────────────────────────

/**
 * Sacred Geometry ring definitions.
 * Each ring has a radius based on φ powers and houses specific node types.
 */
export const RINGS = Object.freeze({
  CENTER: {
    name: 'center',
    radius: 1.0,           // Anchor unit
    cslThreshold: CSL_THRESHOLDS.HIGH,  // 0.882
    description: 'HeadySoul — awareness and values layer',
    nodes: ['HeadySoul'],
  },
  INNER: {
    name: 'inner',
    radius: PHI,            // ≈ 1.618
    cslThreshold: CSL_THRESHOLDS.HIGH,  // 0.882
    description: 'Processing core — orchestration, reasoning, planning',
    nodes: ['HeadyBrains', 'HeadyConductor', 'HeadyVinci', 'HeadyMemory'],
  },
  MIDDLE: {
    name: 'middle',
    radius: PHI_SQUARED,    // ≈ 2.618
    cslThreshold: CSL_THRESHOLDS.MEDIUM, // 0.809
    description: 'Execution layer — coding, building, monitoring, security',
    nodes: ['JULES', 'BUILDER', 'OBSERVER', 'MURPHY', 'ATLAS', 'PYTHIA'],
  },
  OUTER: {
    name: 'outer',
    radius: PHI_CUBED,      // ≈ 4.236
    cslThreshold: CSL_THRESHOLDS.LOW,    // 0.691
    description: 'Specialized capabilities — translation, creativity, security',
    nodes: ['BRIDGE', 'MUSE', 'SENTINEL', 'NOVA', 'JANITOR', 'SOPHIA', 'CIPHER', 'LENS'],
  },
  GOVERNANCE: {
    name: 'governance',
    radius: PHI_4,          // ≈ 6.854
    cslThreshold: CSL_THRESHOLDS.HIGH,   // 0.882
    description: 'Quality, assurance, ethics, patterns, simulation, risk',
    nodes: ['HeadyCheck', 'HeadyAssure', 'HeadyAware', 'HeadyPatterns', 'HeadyMC', 'HeadyRisk'],
  },
});

/**
 * Get the ring for a given node name.
 * @param {string} nodeName
 * @returns {Object|null} Ring definition or null
 */
export function getRingForNode(nodeName) {
  for (const ring of Object.values(RINGS)) {
    if (ring.nodes.includes(nodeName)) return ring;
  }
  return null;
}

/**
 * Compute geometric distance between two nodes via their ring positions.
 * @param {string} nodeA
 * @param {string} nodeB
 * @returns {number} Euclidean distance in topology space
 */
export function nodeDistance(nodeA, nodeB) {
  const ringA = getRingForNode(nodeA);
  const ringB = getRingForNode(nodeB);
  if (!ringA || !ringB) return Infinity;
  return Math.abs(ringA.radius - ringB.radius);
}

// ─── FIBONACCI-BASED UI SYSTEM ───────────────────────────────────────────────

/**
 * Fibonacci spacing scale (in pixels).
 * Use for margins, paddings, gaps in the Sacred Geometry UI.
 */
export const SPACING = Object.freeze(
  [1, 2, 3, 5, 8, 13, 21, 34, 55, 89].map(s => s)
);

/**
 * Phi-ratio typography scale.
 * Each step is the previous × φ (rounded to integers).
 * Base: 10px → 10, 16, 26, 42, 68, 110
 */
export const TYPE_SCALE = Object.freeze([
  Math.round(10),                      // 10 — caption/small
  Math.round(10 * PHI),               // 16 — body
  Math.round(10 * PHI_SQUARED),       // 26 — h4
  Math.round(10 * PHI_CUBED),         // 42 — h3
  Math.round(10 * PHI_4),             // 69 → 68 (nearest fib: 55 or 89, use phi-derived) — h2
  Math.round(10 * PHI * PHI_4),       // 111 → 110 — h1
]);

/**
 * Fibonacci-based UI animation timings (ms).
 * Each step is F(n) × 10.
 */
export const TIMING = Object.freeze({
  instant: fib(3) * 10,   //  20ms
  fast:    fib(5) * 10,   //  50ms
  normal:  fib(7) * 10,   // 130ms
  slow:    fib(8) * 10,   // 210ms
  glacial: fib(9) * 10,   // 340ms
});

/**
 * Golden ratio layout proportions.
 */
export const LAYOUT = Object.freeze({
  primaryWidth:    PSI,            // 0.618 → 61.8%
  secondaryWidth:  1 - PSI,       // 0.382 → 38.2%
  goldenSection:   PSI,           // 0.618
  goldenAngle:     GOLDEN_ANGLE_DEG,
});

// ─── COHERENCE SCORING ───────────────────────────────────────────────────────

/**
 * Coherence thresholds — phi-derived via phiThreshold(n).
 */
export const COHERENCE_THRESHOLDS = Object.freeze({
  optimal:  CSL_THRESHOLDS.HIGH,     // ≈ 0.882 — healthy
  healthy:  CSL_THRESHOLDS.HIGH,     // ≈ 0.882
  warning:  CSL_THRESHOLDS.MEDIUM,   // ≈ 0.809
  degraded: CSL_THRESHOLDS.LOW,      // ≈ 0.691
  critical: CSL_THRESHOLDS.MINIMUM,  // ≈ 0.500
});

/**
 * Coherence history ring buffer (Fibonacci-sized).
 */
export class CoherenceTracker {
  /**
   * @param {number} [historySize=55] - fib(10)
   * @param {number} [monitorIntervalMs=6854] - φ⁴ × 1000
   */
  constructor(historySize = fib(10), monitorIntervalMs = Math.round(PHI_4 * 1000)) {
    this.historySize = historySize;
    this.monitorIntervalMs = monitorIntervalMs;
    this.history = [];
    this.currentScore = 1.0;
    this.driftAlerts = [];
  }

  /**
   * Record a new coherence measurement.
   * @param {number} score - Coherence score [0, 1]
   * @param {Object} [metadata] - Optional metadata
   */
  record(score, metadata = {}) {
    this.history.push({
      score,
      timestamp: Date.now(),
      ...metadata,
    });
    if (this.history.length > this.historySize) {
      this.history.shift();
    }
    this.currentScore = score;
    this._checkDrift(score);
  }

  /**
   * Get current coherence level.
   * @returns {'critical'|'degraded'|'warning'|'healthy'|'optimal'}
   */
  getLevel() {
    if (this.currentScore < COHERENCE_THRESHOLDS.critical) return 'critical';
    if (this.currentScore < COHERENCE_THRESHOLDS.degraded) return 'degraded';
    if (this.currentScore < COHERENCE_THRESHOLDS.warning)  return 'warning';
    if (this.currentScore < COHERENCE_THRESHOLDS.healthy)  return 'healthy';
    return 'optimal';
  }

  /**
   * Get average coherence over the history window.
   * @returns {number}
   */
  getAverage() {
    if (this.history.length === 0) return 1.0;
    return this.history.reduce((sum, h) => sum + h.score, 0) / this.history.length;
  }

  /**
   * Get coherence trend (positive = improving, negative = degrading).
   * Uses phi-weighted recent vs older comparison.
   * @returns {number}
   */
  getTrend() {
    if (this.history.length < 2) return 0;
    const mid = Math.floor(this.history.length * PSI); // Split at golden ratio
    const recent = this.history.slice(mid);
    const older = this.history.slice(0, mid);
    const recentAvg = recent.reduce((s, h) => s + h.score, 0) / recent.length;
    const olderAvg = older.reduce((s, h) => s + h.score, 0) / (older.length || 1);
    return recentAvg - olderAvg;
  }

  /** @private */
  _checkDrift(score) {
    if (score < CSL_THRESHOLDS.LOW) { // Below 0.691 = degraded
      this.driftAlerts.push({
        timestamp: Date.now(),
        score,
        level: score < CSL_THRESHOLDS.MINIMUM ? 'critical' : 'warning',
      });
    }
  }
}

// ─── NODE STATE COHERENCE ────────────────────────────────────────────────────

/**
 * Compute pairwise coherence between node state vectors.
 * Flags any pair below their ring's CSL threshold.
 *
 * @param {Map<string, Float64Array>} nodeStates - Map of node name → state vector
 * @returns {{ coherenceMatrix: Object, alerts: Array, overallScore: number }}
 */
export function computeNodeCoherence(nodeStates) {
  const nodes = Array.from(nodeStates.keys());
  const coherenceMatrix = {};
  const alerts = [];
  let totalScore = 0;
  let pairCount = 0;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      const score = cslAND(nodeStates.get(nodeA), nodeStates.get(nodeB));

      if (!coherenceMatrix[nodeA]) coherenceMatrix[nodeA] = {};
      coherenceMatrix[nodeA][nodeB] = score;

      totalScore += score;
      pairCount++;

      // Check against the stricter ring threshold
      const ringA = getRingForNode(nodeA);
      const ringB = getRingForNode(nodeB);
      const threshold = Math.min(
        ringA?.cslThreshold || CSL_THRESHOLDS.LOW,
        ringB?.cslThreshold || CSL_THRESHOLDS.LOW
      );

      if (score < threshold) {
        alerts.push({
          nodeA,
          nodeB,
          score,
          threshold,
          severity: score < CSL_THRESHOLDS.MINIMUM ? 'critical' : 'warning',
        });
      }
    }
  }

  return {
    coherenceMatrix,
    alerts,
    overallScore: pairCount > 0 ? totalScore / pairCount : 1.0,
  };
}

// ─── RESOURCE ALLOCATION ─────────────────────────────────────────────────────

/**
 * Fibonacci-indexed resource weights per swarm.
 * Higher Fibonacci index = more resources allocated.
 */
export const SWARM_RESOURCE_MAP = Object.freeze({
  'heady-soul':      { ring: 'center',     fibIndex: 10, fibValue: fib(10), cslThreshold: CSL_THRESHOLDS.HIGH },
  'cognition-core':  { ring: 'inner',      fibIndex:  9, fibValue: fib(9),  cslThreshold: CSL_THRESHOLDS.HIGH },
  'memory-weave':    { ring: 'inner',      fibIndex:  8, fibValue: fib(8),  cslThreshold: CSL_THRESHOLDS.HIGH },
  'context-bridge':  { ring: 'inner',      fibIndex:  8, fibValue: fib(8),  cslThreshold: CSL_THRESHOLDS.MEDIUM },
  'task-planner':    { ring: 'inner',      fibIndex:  7, fibValue: fib(7),  cslThreshold: CSL_THRESHOLDS.HIGH },
  'consensus-forge': { ring: 'inner',      fibIndex:  7, fibValue: fib(7),  cslThreshold: CSL_THRESHOLDS.MEDIUM },
  'code-artisan':    { ring: 'middle',     fibIndex:  6, fibValue: fib(6),  cslThreshold: CSL_THRESHOLDS.MEDIUM },
  'security-forge':  { ring: 'middle',     fibIndex:  6, fibValue: fib(6),  cslThreshold: CSL_THRESHOLDS.MEDIUM },
  'deploy-forge':    { ring: 'middle',     fibIndex:  6, fibValue: fib(6),  cslThreshold: CSL_THRESHOLDS.MEDIUM },
  'insight-forge':   { ring: 'middle',     fibIndex:  6, fibValue: fib(6),  cslThreshold: CSL_THRESHOLDS.MEDIUM },
  'policy-sentinel': { ring: 'governance', fibIndex:  6, fibValue: fib(6),  cslThreshold: CSL_THRESHOLDS.HIGH },
  'quality-gate':    { ring: 'governance', fibIndex:  5, fibValue: fib(5),  cslThreshold: CSL_THRESHOLDS.HIGH },
  'ethics-compass':  { ring: 'governance', fibIndex:  5, fibValue: fib(5),  cslThreshold: CSL_THRESHOLDS.HIGH },
  'cache-guardian':  { ring: 'outer',      fibIndex:  3, fibValue: fib(3),  cslThreshold: CSL_THRESHOLDS.LOW },
  'stream-runner':   { ring: 'outer',      fibIndex:  2, fibValue: fib(2),  cslThreshold: CSL_THRESHOLDS.LOW },
  'log-scribe':      { ring: 'outer',      fibIndex:  2, fibValue: fib(2),  cslThreshold: CSL_THRESHOLDS.LOW },
});

/**
 * Compute Fibonacci-proportional resource allocation.
 * Total resources are split proportionally by fibValue.
 *
 * @param {number} totalResources - Total resources to allocate
 * @returns {Map<string, number>} Swarm → allocated resources
 */
export function allocateResources(totalResources) {
  const entries = Object.entries(SWARM_RESOURCE_MAP);
  const totalFib = entries.reduce((sum, [, v]) => sum + v.fibValue, 0);
  const allocation = new Map();
  for (const [swarm, config] of entries) {
    allocation.set(swarm, Math.round(totalResources * config.fibValue / totalFib));
  }
  return allocation;
}

// ─── GOLDEN ANGLE NODE PLACEMENT ─────────────────────────────────────────────

/**
 * Compute 2D position for a node using golden angle distribution.
 * Ensures optimal spacing on each ring (no clustering).
 *
 * @param {number} index - Node index on the ring
 * @param {number} radius - Ring radius
 * @returns {{ x: number, y: number, angle: number }}
 */
export function goldenAnglePlacement(index, radius) {
  const angle = index * GOLDEN_ANGLE_RAD;
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    angle: (angle * 180) / Math.PI,
  };
}

/**
 * Generate placement positions for all nodes on a ring.
 * @param {Object} ring - Ring definition from RINGS
 * @returns {Array<{ node: string, x: number, y: number, angle: number }>}
 */
export function ringPlacements(ring) {
  return ring.nodes.map((node, i) => ({
    node,
    ...goldenAnglePlacement(i, ring.radius),
  }));
}

export default {
  // Topology
  RINGS, getRingForNode, nodeDistance,

  // UI
  SPACING, TYPE_SCALE, TIMING, LAYOUT,

  // Coherence
  COHERENCE_THRESHOLDS, CoherenceTracker, computeNodeCoherence,

  // Resources
  SWARM_RESOURCE_MAP, allocateResources, POOL_PERCENT,

  // Placement
  goldenAnglePlacement, ringPlacements,
};
