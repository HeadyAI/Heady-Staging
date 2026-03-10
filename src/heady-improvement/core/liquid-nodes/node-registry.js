/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Liquid Node Registry — Manages all compute nodes across platforms
 * in 3D Sacred Geometry vector space.
 *
 * Platforms: Cloudflare Workers, Colab Pro+, Vertex AI, Cloud Run, Drupal CMS
 * Founder: Eric Haywood
 *
 * @module core/liquid-nodes/node-registry
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,
  classifyPressure,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';

const logger = createLogger('liquid-node-registry');

const PSI2 = PSI * PSI; // ≈ 0.382

/** Node status enum */
const NODE_STATUS = Object.freeze({
  ACTIVE: 'active',
  DEGRADED: 'degraded',
  QUARANTINED: 'quarantined',
  STANDBY: 'standby',
  UNREACHABLE: 'unreachable',
  DRAINING: 'draining',
});

/** Platform enum */
const PLATFORM = Object.freeze({
  CLOUDFLARE: 'cloudflare',
  COLAB: 'colab',
  VERTEX: 'vertex',
  CLOUD_RUN: 'cloud_run',
  LOCAL: 'local',
});

/** Node type enum */
const NODE_TYPE = Object.freeze({
  WORKER: 'worker',
  GPU_RUNTIME: 'gpu_runtime',
  LLM: 'llm',
  EMBEDDING: 'embedding',
  SERVICE: 'service',
  CMS: 'cms',
});

/**
 * Default node definitions for the Heady platform.
 * Positions follow Sacred Geometry in 3D vector space:
 *   x = latency_priority (edge nodes high)
 *   y = compute_weight   (GPU nodes high)
 *   z = cache_affinity    (cached/warm nodes high)
 */
function buildDefaultNodes() {
  return [
    // ── Cloudflare Edge Nodes ───────────────────────────────
    {
      id: 'cf-gateway',
      name: 'Liquid Gateway Worker',
      platform: PLATFORM.CLOUDFLARE,
      type: NODE_TYPE.WORKER,
      endpoint: 'https://liquid-gateway-worker.emailheadyconnection.workers.dev',
      region: 'global',
      vector: { x: 1.0, y: 0.0, z: PHI },
      capacity: { current: 0, max: fib(14), utilization: 0 },
      metadata: { version: '2.1.0' },
    },
    {
      id: 'cf-edge-auth',
      name: 'Edge Auth Worker',
      platform: PLATFORM.CLOUDFLARE,
      type: NODE_TYPE.WORKER,
      endpoint: 'https://edge-auth.emailheadyconnection.workers.dev',
      region: 'global',
      vector: { x: PHI, y: 0.0, z: 1.0 },
      capacity: { current: 0, max: fib(14), utilization: 0 },
      metadata: { version: '1.0.0' },
    },
    {
      id: 'cf-edge-cache',
      name: 'Edge Cache Worker',
      platform: PLATFORM.CLOUDFLARE,
      type: NODE_TYPE.WORKER,
      endpoint: 'https://edge-cache.emailheadyconnection.workers.dev',
      region: 'global',
      vector: { x: 1.0, y: 0.0, z: PHI * PHI },
      capacity: { current: 0, max: fib(16), utilization: 0 },
      metadata: { version: '1.0.0' },
    },
    {
      id: 'cf-edge-embed',
      name: 'Edge Embedding Worker',
      platform: PLATFORM.CLOUDFLARE,
      type: NODE_TYPE.WORKER,
      endpoint: 'https://edge-embed.emailheadyconnection.workers.dev',
      region: 'global',
      vector: { x: PHI, y: PSI, z: PHI },
      capacity: { current: 0, max: fib(13), utilization: 0 },
      metadata: { model: 'bge-small-en-v1.5', version: '1.0.0' },
    },

    // ── Colab Pro+ GPU Runtimes ─────────────────────────────
    {
      id: 'colab-1',
      name: 'Colab Pro+ US-East',
      platform: PLATFORM.COLAB,
      type: NODE_TYPE.GPU_RUNTIME,
      endpoint: '',
      region: 'us-east',
      vector: { x: 0.0, y: PHI, z: 0.0 },
      capacity: { current: 0, max: fib(8), utilization: 0 },
      metadata: { gpu: 'A100', vram: '40GB', maxConcurrent: fib(8) },
    },
    {
      id: 'colab-2',
      name: 'Colab Pro+ US-West',
      platform: PLATFORM.COLAB,
      type: NODE_TYPE.GPU_RUNTIME,
      endpoint: '',
      region: 'us-west',
      vector: { x: 0.0, y: 1.0, z: PSI },
      capacity: { current: 0, max: fib(8), utilization: 0 },
      metadata: { gpu: 'A100', vram: '40GB', maxConcurrent: fib(8) },
    },
    {
      id: 'colab-3',
      name: 'Colab Pro+ EU-West',
      platform: PLATFORM.COLAB,
      type: NODE_TYPE.GPU_RUNTIME,
      endpoint: '',
      region: 'eu-west',
      vector: { x: PSI, y: PHI, z: 0.0 },
      capacity: { current: 0, max: fib(8), utilization: 0 },
      metadata: { gpu: 'A100', vram: '40GB', maxConcurrent: fib(8) },
    },

    // ── Vertex AI ───────────────────────────────────────────
    {
      id: 'vertex-gemini',
      name: 'Vertex AI Gemini',
      platform: PLATFORM.VERTEX,
      type: NODE_TYPE.LLM,
      endpoint: 'https://us-central1-aiplatform.googleapis.com',
      region: 'us-central1',
      vector: { x: PSI, y: 1.0, z: PSI },
      capacity: { current: 0, max: fib(10), utilization: 0 },
      metadata: { model: 'gemini-2.5-pro', project: 'gen-lang-client-0920560496' },
    },
    {
      id: 'vertex-embedding',
      name: 'Vertex AI Embedding',
      platform: PLATFORM.VERTEX,
      type: NODE_TYPE.EMBEDDING,
      endpoint: 'https://us-central1-aiplatform.googleapis.com',
      region: 'us-central1',
      vector: { x: PSI, y: PSI, z: 1.0 },
      capacity: { current: 0, max: fib(12), utilization: 0 },
      metadata: { model: 'text-embedding-004', project: 'gen-lang-client-0920560496' },
    },

    // ── Cloud Run Origin ────────────────────────────────────
    {
      id: 'origin-manager',
      name: 'Heady Manager',
      platform: PLATFORM.CLOUD_RUN,
      type: NODE_TYPE.SERVICE,
      endpoint: 'https://manager.headysystems.com',
      region: 'us-east1',
      vector: { x: PSI2, y: PSI2, z: PSI2 },
      capacity: { current: 0, max: fib(10), utilization: 0 },
      metadata: { port: 3300, version: '2.1.0' },
    },

    // ── Drupal CMS ──────────────────────────────────────────
    {
      id: 'origin-drupal',
      name: 'Drupal CMS',
      platform: PLATFORM.LOCAL,
      type: NODE_TYPE.CMS,
      endpoint: 'https://admin.headysystems.com',
      region: 'us-east1',
      vector: { x: PSI, y: 0.0, z: 1.0 },
      capacity: { current: 0, max: fib(8), utilization: 0 },
      metadata: { port: 8080, version: '10.x' },
    },
  ];
}

class LiquidNodeRegistry extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, object>} */
    this._nodes = new Map();
    this._initialized = false;
  }

  /**
   * Initialize registry with default nodes.
   */
  initialize() {
    if (this._initialized) return;
    const defaults = buildDefaultNodes();
    for (const nodeDef of defaults) {
      this._registerInternal(nodeDef);
    }
    this._initialized = true;
    logger.info('Node registry initialized', { nodeCount: this._nodes.size });
  }

  /**
   * Register a new node.
   * @param {object} config - Node configuration
   * @returns {object} Registered node
   */
  register(config) {
    if (!config.id) config.id = `node-${randomUUID().slice(0, 8)}`;
    if (!config.vector) {
      throw new Error('Node must have a vector position in 3D space');
    }
    const node = this._registerInternal(config);
    this.emit('node:registered', { nodeId: node.id, platform: node.platform });
    logger.info('Node registered', { nodeId: node.id, platform: node.platform });
    return node;
  }

  /**
   * @private
   */
  _registerInternal(config) {
    const node = {
      id: config.id,
      name: config.name || config.id,
      platform: config.platform || PLATFORM.CLOUD_RUN,
      type: config.type || NODE_TYPE.SERVICE,
      endpoint: config.endpoint || '',
      region: config.region || 'us-east1',
      vector: { x: config.vector.x, y: config.vector.y, z: config.vector.z },
      health: {
        status: config.endpoint ? NODE_STATUS.ACTIVE : NODE_STATUS.STANDBY,
        lastHeartbeat: Date.now(),
        latencyMs: 0,
        errorRate: 0,
        consecutiveFailures: 0,
      },
      capacity: {
        current: config.capacity?.current || 0,
        max: config.capacity?.max || fib(10),
        utilization: config.capacity?.utilization || 0,
      },
      metadata: config.metadata || {},
      registeredAt: Date.now(),
    };
    this._nodes.set(node.id, node);
    return node;
  }

  /**
   * Deregister a node.
   * @param {string} nodeId
   * @returns {boolean}
   */
  deregister(nodeId) {
    const existed = this._nodes.delete(nodeId);
    if (existed) {
      this.emit('node:deregistered', { nodeId });
      logger.info('Node deregistered', { nodeId });
    }
    return existed;
  }

  /**
   * Get a specific node.
   * @param {string} id
   * @returns {object|null}
   */
  getNode(id) {
    return this._nodes.get(id) || null;
  }

  /**
   * Get all registered nodes.
   * @returns {object[]}
   */
  getAllNodes() {
    return Array.from(this._nodes.values());
  }

  /**
   * Get nodes by platform.
   * @param {string} platform
   * @returns {object[]}
   */
  getNodesByPlatform(platform) {
    return this.getAllNodes().filter(n => n.platform === platform);
  }

  /**
   * Get nodes by type.
   * @param {string} type
   * @returns {object[]}
   */
  getNodesByType(type) {
    return this.getAllNodes().filter(n => n.type === type);
  }

  /**
   * Get healthy nodes within utilization bounds.
   * @param {number} minUtilization - Lower bound (default 0)
   * @param {number} maxUtilization - Upper bound (default PSI ≈ 0.618)
   * @returns {object[]}
   */
  getHealthyNodes(minUtilization = 0, maxUtilization = PSI) {
    return this.getAllNodes().filter(n =>
      (n.health.status === NODE_STATUS.ACTIVE || n.health.status === NODE_STATUS.DEGRADED) &&
      n.capacity.utilization >= minUtilization &&
      n.capacity.utilization <= maxUtilization
    );
  }

  /**
   * Update node health data.
   * @param {string} nodeId
   * @param {object} healthData
   * @returns {object|null}
   */
  updateHealth(nodeId, healthData) {
    const node = this._nodes.get(nodeId);
    if (!node) return null;

    const prevStatus = node.health.status;
    Object.assign(node.health, {
      ...healthData,
      lastHeartbeat: Date.now(),
    });

    // Recompute utilization
    if (node.capacity.max > 0) {
      node.capacity.utilization = node.capacity.current / node.capacity.max;
    }

    // Status transition detection
    if (prevStatus !== node.health.status) {
      this.emit('node:status-changed', {
        nodeId,
        from: prevStatus,
        to: node.health.status,
      });
      logger.info('Node status changed', {
        nodeId,
        from: prevStatus,
        to: node.health.status,
      });
    }

    return node;
  }

  /**
   * Update node capacity.
   * @param {string} nodeId
   * @param {number} current - Current load
   */
  updateCapacity(nodeId, current) {
    const node = this._nodes.get(nodeId);
    if (!node) return null;
    node.capacity.current = current;
    node.capacity.utilization = node.capacity.max > 0
      ? current / node.capacity.max
      : 0;

    const pressure = classifyPressure(node.capacity.utilization);
    if (pressure === 'CRITICAL') {
      this.emit('node:overloaded', { nodeId, utilization: node.capacity.utilization });
    }
    return node;
  }

  /**
   * Get registry statistics.
   * @returns {object}
   */
  stats() {
    const nodes = this.getAllNodes();
    const byPlatform = {};
    const byStatus = {};
    for (const n of nodes) {
      byPlatform[n.platform] = (byPlatform[n.platform] || 0) + 1;
      byStatus[n.health.status] = (byStatus[n.health.status] || 0) + 1;
    }
    return {
      total: nodes.length,
      byPlatform,
      byStatus,
      avgUtilization: nodes.length > 0
        ? nodes.reduce((s, n) => s + n.capacity.utilization, 0) / nodes.length
        : 0,
    };
  }

  /**
   * Serialize to JSON.
   * @returns {object}
   */
  toJSON() {
    return {
      nodes: this.getAllNodes(),
      stats: this.stats(),
      timestamp: Date.now(),
    };
  }
}

export {
  LiquidNodeRegistry,
  NODE_STATUS,
  PLATFORM,
  NODE_TYPE,
  PSI2,
  buildDefaultNodes,
};
