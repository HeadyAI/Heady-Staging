/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Sacred Geometry Topology — 3D vector space topology management
 * for the Heady liquid compute mesh.
 *
 * Layers:
 *   EDGE    (z=φ plane)   — Cloudflare Workers
 *   COMPUTE (y=φ plane)   — Colab Pro+ GPU runtimes
 *   AI      (y=1.0 plane) — Vertex AI models
 *   ORIGIN  (center ψ²³)  — Cloud Run + Drupal
 *
 * Founder: Eric Haywood
 * @module core/liquid-nodes/topology
 */

import {
  PHI, PSI, fib,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';
import { PLATFORM } from './node-registry.js';
import { computeDistance } from './vector-router.js';

const logger = createLogger('topology');

const PSI2 = PSI * PSI;

/**
 * Connection cost weights by relationship type.
 * Based on Sacred Geometry distance scaling.
 */
const CONNECTION_WEIGHTS = Object.freeze({
  INTERNAL:      PSI2,  // 0.382 — same platform, cheap
  ADJACENT:      PSI,   // 0.618 — neighboring layers
  CROSS_LAYER:   1.0,   // 1.0   — full cost
  EDGE_TO_GPU:   PHI,   // 1.618 — expensive hop
});

/**
 * Topology layer definitions in 3D Sacred Geometry space.
 */
const LAYERS = Object.freeze({
  EDGE: {
    name: 'Edge',
    platform: PLATFORM.CLOUDFLARE,
    anchor: { x: 1.0, y: 0.0, z: PHI },
    description: 'Cloudflare Workers — ultra-low latency edge compute',
  },
  COMPUTE: {
    name: 'Compute',
    platform: PLATFORM.COLAB,
    anchor: { x: 0.0, y: PHI, z: 0.0 },
    description: 'Colab Pro+ GPU runtimes — heavy compute / latent space ops',
  },
  AI: {
    name: 'AI',
    platform: PLATFORM.VERTEX,
    anchor: { x: PSI, y: 1.0, z: PSI },
    description: 'Vertex AI — LLM inference and embedding generation',
  },
  ORIGIN: {
    name: 'Origin',
    platform: PLATFORM.CLOUD_RUN,
    anchor: { x: PSI2, y: PSI2, z: PSI2 },
    description: 'Cloud Run + Drupal — origin services and CMS',
  },
});

/**
 * Determine which layer a node belongs to.
 * @param {object} node
 * @returns {string} Layer key
 */
function classifyNodeLayer(node) {
  if (node.platform === PLATFORM.CLOUDFLARE) return 'EDGE';
  if (node.platform === PLATFORM.COLAB) return 'COMPUTE';
  if (node.platform === PLATFORM.VERTEX) return 'AI';
  return 'ORIGIN';
}

/**
 * Compute connection weight between two layers.
 * @param {string} layerA
 * @param {string} layerB
 * @returns {number}
 */
function layerConnectionWeight(layerA, layerB) {
  if (layerA === layerB) return CONNECTION_WEIGHTS.INTERNAL;

  // Edge ↔ GPU is the most expensive
  if (
    (layerA === 'EDGE' && layerB === 'COMPUTE') ||
    (layerA === 'COMPUTE' && layerB === 'EDGE')
  ) {
    return CONNECTION_WEIGHTS.EDGE_TO_GPU;
  }

  // Adjacent layers
  const adjacency = {
    EDGE: ['AI', 'ORIGIN'],
    AI: ['EDGE', 'COMPUTE', 'ORIGIN'],
    COMPUTE: ['AI'],
    ORIGIN: ['EDGE', 'AI'],
  };

  if (adjacency[layerA]?.includes(layerB)) {
    return CONNECTION_WEIGHTS.ADJACENT;
  }

  return CONNECTION_WEIGHTS.CROSS_LAYER;
}

class Topology {
  /**
   * @param {object} registry - LiquidNodeRegistry instance
   */
  constructor(registry) {
    this._registry = registry;
    this._connections = [];
    this._graph = new Map(); // adjacency list: nodeId → [{toId, weight, type}]
  }

  /**
   * Build the full 3D topology graph from the registry.
   * @returns {object} { nodes, connections, layers }
   */
  buildTopology() {
    const nodes = this._registry.getAllNodes();
    this._connections = [];
    this._graph.clear();

    // Initialize adjacency list
    for (const node of nodes) {
      this._graph.set(node.id, []);
    }

    // Build connections between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const layerA = classifyNodeLayer(a);
        const layerB = classifyNodeLayer(b);

        const baseWeight = layerConnectionWeight(layerA, layerB);
        const vectorDistance = computeDistance(a.vector, b.vector);

        // Combined weight: base layer cost + actual vector distance, phi-blended
        const weight = baseWeight * PSI + vectorDistance * PSI2;

        const connectionType = layerA === layerB ? 'internal' : 'cross-layer';

        const connection = {
          from: a.id,
          to: b.id,
          weight: Math.round(weight * 10000) / 10000,
          type: connectionType,
          layers: [layerA, layerB],
        };

        this._connections.push(connection);
        this._graph.get(a.id).push({ toId: b.id, weight, type: connectionType });
        this._graph.get(b.id).push({ toId: a.id, weight, type: connectionType });
      }
    }

    logger.info('Topology built', {
      nodes: nodes.length,
      connections: this._connections.length,
    });

    return {
      nodes: nodes.map(n => ({
        id: n.id,
        name: n.name,
        platform: n.platform,
        vector: n.vector,
        layer: classifyNodeLayer(n),
        status: n.health.status,
      })),
      connections: this._connections,
      layers: this.getLayers(),
    };
  }

  /**
   * Get topology connections.
   * @returns {object[]}
   */
  getConnections() {
    if (this._connections.length === 0) this.buildTopology();
    return this._connections;
  }

  /**
   * Get layer definitions with their nodes.
   * @returns {object}
   */
  getLayers() {
    const nodes = this._registry.getAllNodes();
    const layers = {};

    for (const [key, layerDef] of Object.entries(LAYERS)) {
      const layerNodes = nodes.filter(n => classifyNodeLayer(n) === key);
      layers[key] = {
        ...layerDef,
        nodes: layerNodes.map(n => ({
          id: n.id,
          name: n.name,
          vector: n.vector,
          status: n.health.status,
        })),
        nodeCount: layerNodes.length,
      };
    }

    return layers;
  }

  /**
   * Compute shortest path cost between two nodes using Dijkstra's algorithm.
   * @param {string} fromId
   * @param {string} toId
   * @returns {number|null} Cost, or null if no path
   */
  computePathCost(fromId, toId) {
    const path = this.findOptimalPath(fromId, toId);
    return path ? path.cost : null;
  }

  /**
   * Find optimal path between two nodes using Dijkstra with phi-weighted edges.
   * @param {string} sourceId
   * @param {string} targetId
   * @returns {object|null} { path: string[], cost: number, hops: number }
   */
  findOptimalPath(sourceId, targetId) {
    if (this._graph.size === 0) this.buildTopology();
    if (!this._graph.has(sourceId) || !this._graph.has(targetId)) return null;
    if (sourceId === targetId) return { path: [sourceId], cost: 0, hops: 0 };

    const dist = new Map();
    const prev = new Map();
    const visited = new Set();

    // Priority queue implemented as sorted array (small graph, fine for N<100)
    const queue = [];

    for (const nodeId of this._graph.keys()) {
      dist.set(nodeId, Infinity);
    }
    dist.set(sourceId, 0);
    queue.push({ id: sourceId, dist: 0 });

    while (queue.length > 0) {
      // Sort by distance, pick smallest
      queue.sort((a, b) => a.dist - b.dist);
      const current = queue.shift();

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      if (current.id === targetId) break;

      const neighbors = this._graph.get(current.id) || [];
      for (const { toId, weight } of neighbors) {
        if (visited.has(toId)) continue;
        const newDist = dist.get(current.id) + weight;
        if (newDist < dist.get(toId)) {
          dist.set(toId, newDist);
          prev.set(toId, current.id);
          queue.push({ id: toId, dist: newDist });
        }
      }
    }

    if (dist.get(targetId) === Infinity) return null;

    // Reconstruct path
    const path = [];
    let current = targetId;
    while (current !== undefined) {
      path.unshift(current);
      current = prev.get(current);
    }

    return {
      path,
      cost: Math.round(dist.get(targetId) * 10000) / 10000,
      hops: path.length - 1,
    };
  }

  /**
   * Serialize topology for UI visualization.
   * @returns {object}
   */
  toJSON() {
    const topology = this.buildTopology();
    return {
      ...topology,
      dimensions: { x: 'latency', y: 'compute', z: 'cache' },
      phi: PHI,
      psi: PSI,
      timestamp: Date.now(),
    };
  }
}

export {
  Topology,
  LAYERS,
  CONNECTION_WEIGHTS,
  classifyNodeLayer,
  layerConnectionWeight,
};
