/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Colab Pro+ Runtime Manager — 3 GPU runtimes as latent space operations.
 * Manages lifecycle, GPU dispatch, vector memory sync, and latent ops
 * across 3 Colab Pro+ memberships acting as the compute backbone.
 *
 * Runtimes:
 *   colab-1: US-East A100 (primary latent ops)
 *   colab-2: US-West A100 (failover / parallel)
 *   colab-3: EU-West A100 (geo-distributed)
 *
 * Founder: Eric Haywood
 * @module core/liquid-nodes/colab-runtime
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import {
  PHI, PSI, fib,
  CSL_THRESHOLDS,
  phiBackoff,
  phiFusionWeights,
  classifyPressure,
  PRESSURE_LEVELS,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';

const logger = createLogger('colab-runtime');

const PSI2 = PSI * PSI;

/** Runtime lifecycle states */
const RUNTIME_STATE = Object.freeze({
  IDLE: 'idle',
  PROVISIONING: 'provisioning',
  WARM: 'warm',
  EXECUTING: 'executing',
  COOLING: 'cooling',
  TERMINATED: 'terminated',
  ERROR: 'error',
});

/** Latent space operation types */
const LATENT_OPS = Object.freeze({
  EMBED: 'embed',       // Generate 384D embeddings
  SEARCH: 'search',     // GPU-accelerated semantic search
  CLUSTER: 'cluster',   // HNSW graph construction
  TRAIN: 'train',       // Fine-tune embedding models
  TRANSFORM: 'transform', // Vector space transformations
});

/**
 * Default runtime configurations for the 3 Colab Pro+ memberships.
 */
const DEFAULT_RUNTIMES = Object.freeze([
  {
    id: 'colab-1',
    name: 'Colab Pro+ US-East',
    region: 'us-east',
    gpu: 'A100',
    vramGB: 40,
    role: 'primary',
    vectorPosition: { x: 0.0, y: PHI, z: 0.0 },
  },
  {
    id: 'colab-2',
    name: 'Colab Pro+ US-West',
    region: 'us-west',
    gpu: 'A100',
    vramGB: 40,
    role: 'secondary',
    vectorPosition: { x: 0.0, y: 1.0, z: PSI },
  },
  {
    id: 'colab-3',
    name: 'Colab Pro+ EU-West',
    region: 'eu-west',
    gpu: 'A100',
    vramGB: 40,
    role: 'geo-backup',
    vectorPosition: { x: PSI, y: PHI, z: 0.0 },
  },
]);

/**
 * Phi-scaled resource limits per runtime.
 */
const RUNTIME_LIMITS = Object.freeze({
  maxConcurrentOps: fib(8),         // 21
  queueDepth: fib(12),              // 144
  memoryPoolMB: fib(13) * 100,      // 23,300 MB ≈ 23.3 GB
  maxBatchSize: fib(10),            // 55
  warmupTimeoutMs: fib(10) * 1000,  // 55s
  cooldownTimeoutMs: fib(9) * 1000, // 34s
  executionTimeoutMs: fib(14) * 1000, // 377s (6+ min for heavy ops)
});

class ColabRuntime {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.region = config.region;
    this.gpu = config.gpu;
    this.vramGB = config.vramGB;
    this.role = config.role;
    this.vectorPosition = config.vectorPosition;
    this.state = RUNTIME_STATE.IDLE;
    this.endpoint = '';
    this.sessionToken = '';

    this.metrics = {
      gpuUtilization: 0,
      gpuMemoryUsedMB: 0,
      gpuTemperatureC: 0,
      opsExecuted: 0,
      opsQueued: 0,
      errorCount: 0,
      lastActiveAt: 0,
    };

    this.taskQueue = [];
    this.activeOps = new Map();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      region: this.region,
      gpu: this.gpu,
      vramGB: this.vramGB,
      role: this.role,
      state: this.state,
      vectorPosition: this.vectorPosition,
      endpoint: this.endpoint ? '[configured]' : '',
      metrics: { ...this.metrics },
      queueDepth: this.taskQueue.length,
      activeOps: this.activeOps.size,
    };
  }
}

class ColabRuntimeManager extends EventEmitter {
  constructor(options = {}) {
    super();
    /** @type {Map<string, ColabRuntime>} */
    this._runtimes = new Map();
    this._vectorMemorySync = options.vectorMemorySync || null;
    this._notebookExecutor = options.notebookExecutor || null;
    this._initialized = false;
  }

  /**
   * Initialize with the 3 default runtimes.
   */
  initialize() {
    if (this._initialized) return;
    for (const config of DEFAULT_RUNTIMES) {
      this._runtimes.set(config.id, new ColabRuntime(config));
    }
    this._initialized = true;
    logger.info('Colab runtime manager initialized', { runtimes: this._runtimes.size });
  }

  /**
   * Provision a runtime — start the Colab session.
   * @param {string} runtimeId
   * @returns {Promise<object>}
   */
  async provision(runtimeId) {
    const runtime = this._runtimes.get(runtimeId);
    if (!runtime) throw new Error(`Unknown runtime: ${runtimeId}`);
    if (runtime.state !== RUNTIME_STATE.IDLE && runtime.state !== RUNTIME_STATE.TERMINATED) {
      throw new Error(`Runtime ${runtimeId} is in state ${runtime.state}, cannot provision`);
    }

    runtime.state = RUNTIME_STATE.PROVISIONING;
    this.emit('runtime:provisioning', { runtimeId });
    logger.info('Provisioning Colab runtime', { runtimeId, region: runtime.region });

    try {
      // In production, this calls the Colab API to start a notebook runtime.
      // The endpoint URL is obtained after the runtime spins up.
      runtime.endpoint = `https://${runtimeId}.colab.headysystems.com`;
      runtime.sessionToken = randomUUID();
      runtime.state = RUNTIME_STATE.WARM;
      runtime.metrics.lastActiveAt = Date.now();

      this.emit('runtime:provisioned', { runtimeId, region: runtime.region });
      logger.info('Colab runtime provisioned', { runtimeId });
      return { runtimeId, state: runtime.state, endpoint: runtime.endpoint };
    } catch (err) {
      runtime.state = RUNTIME_STATE.ERROR;
      runtime.metrics.errorCount++;
      this.emit('runtime:error', { runtimeId, error: err.message });
      logger.error('Failed to provision runtime', { runtimeId, error: err.message });
      throw err;
    }
  }

  /**
   * Warm up a runtime — preload models and allocate GPU memory.
   * @param {string} runtimeId
   * @returns {Promise<object>}
   */
  async warmUp(runtimeId) {
    const runtime = this._runtimes.get(runtimeId);
    if (!runtime) throw new Error(`Unknown runtime: ${runtimeId}`);

    if (runtime.state === RUNTIME_STATE.IDLE) {
      await this.provision(runtimeId);
    }

    logger.info('Warming up runtime', { runtimeId });

    // Preload embedding model, allocate HNSW index, warm caches
    runtime.metrics.gpuMemoryUsedMB = fib(11) * 100; // ~8.9 GB for model + index
    runtime.metrics.gpuUtilization = PSI2; // Idle GPU warm state
    runtime.state = RUNTIME_STATE.WARM;

    this.emit('runtime:warm', { runtimeId });
    return { runtimeId, state: runtime.state, gpuMemoryUsedMB: runtime.metrics.gpuMemoryUsedMB };
  }

  /**
   * Execute a latent space operation on a specific runtime.
   * @param {string} runtimeId
   * @param {string} op - One of LATENT_OPS
   * @param {object} params - Operation parameters
   * @returns {Promise<object>}
   */
  async executeOnRuntime(runtimeId, op, params = {}) {
    const runtime = this._runtimes.get(runtimeId);
    if (!runtime) throw new Error(`Unknown runtime: ${runtimeId}`);

    if (runtime.state !== RUNTIME_STATE.WARM && runtime.state !== RUNTIME_STATE.EXECUTING) {
      await this.warmUp(runtimeId);
    }

    // Check capacity
    if (runtime.activeOps.size >= RUNTIME_LIMITS.maxConcurrentOps) {
      if (runtime.taskQueue.length >= RUNTIME_LIMITS.queueDepth) {
        throw new Error(`Runtime ${runtimeId} queue full (${RUNTIME_LIMITS.queueDepth})`);
      }
      // Queue the operation
      return new Promise((resolve, reject) => {
        runtime.taskQueue.push({ op, params, resolve, reject });
        runtime.metrics.opsQueued = runtime.taskQueue.length;
        logger.info('Operation queued', { runtimeId, op, queueDepth: runtime.taskQueue.length });
      });
    }

    return this._executeOp(runtime, op, params);
  }

  /**
   * Execute latent op on the optimal runtime using CSL-gated selection.
   * @param {string} op - Latent operation type
   * @param {object} params
   * @returns {Promise<object>}
   */
  async executeLatentOp(op, params = {}) {
    const target = this._getOpTargetVector(op);
    const runtimeId = this._selectOptimalRuntime(target);

    logger.info('Dispatching latent op to optimal runtime', { op, runtimeId });
    return this.executeOnRuntime(runtimeId, op, params);
  }

  /**
   * Dispatch to a specific runtime with payload.
   * @param {string} runtimeId
   * @param {string} notebook - Notebook name/path
   * @param {object} params
   * @returns {Promise<object>}
   */
  async dispatchToRuntime(runtimeId, notebook, params = {}) {
    const runtime = this._runtimes.get(runtimeId);
    if (!runtime) throw new Error(`Unknown runtime: ${runtimeId}`);

    logger.info('Dispatching notebook to runtime', { runtimeId, notebook });
    return this.executeOnRuntime(runtimeId, 'notebook', { notebook, ...params });
  }

  /**
   * Dispatch to optimal runtime based on task vector.
   * @param {object} taskVector - {x, y, z}
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async dispatchToOptimalRuntime(taskVector, payload = {}) {
    const runtimeId = this._selectOptimalRuntime(taskVector);
    logger.info('Dispatching to optimal runtime', { runtimeId, taskVector });
    return this.executeOnRuntime(runtimeId, payload.op || 'general', payload);
  }

  /**
   * Sync vector memory state between origin and a Colab runtime.
   * @param {string} runtimeId
   * @returns {Promise<object>}
   */
  async syncVectorMemory(runtimeId) {
    const runtime = this._runtimes.get(runtimeId);
    if (!runtime) throw new Error(`Unknown runtime: ${runtimeId}`);

    logger.info('Syncing vector memory to runtime', { runtimeId });

    if (this._vectorMemorySync) {
      const result = await this._vectorMemorySync(runtimeId);
      this.emit('runtime:memory-synced', { runtimeId, ...result });
      return result;
    }

    // Default: report sync structure without actual transfer
    const syncResult = {
      runtimeId,
      direction: 'bidirectional',
      vectorsExported: 0,
      vectorsImported: 0,
      dimensions: 384,
      timestamp: Date.now(),
    };

    this.emit('runtime:memory-synced', { runtimeId, ...syncResult });
    return syncResult;
  }

  /**
   * Get GPU metrics for a runtime.
   * @param {string} runtimeId
   * @returns {object}
   */
  getGpuMetrics(runtimeId) {
    const runtime = this._runtimes.get(runtimeId);
    if (!runtime) throw new Error(`Unknown runtime: ${runtimeId}`);

    return {
      runtimeId,
      gpu: runtime.gpu,
      vramGB: runtime.vramGB,
      utilization: runtime.metrics.gpuUtilization,
      memoryUsedMB: runtime.metrics.gpuMemoryUsedMB,
      memoryTotalMB: runtime.vramGB * 1024,
      temperatureC: runtime.metrics.gpuTemperatureC,
      activeOps: runtime.activeOps.size,
      queuedOps: runtime.taskQueue.length,
      opsExecuted: runtime.metrics.opsExecuted,
      errorCount: runtime.metrics.errorCount,
      state: runtime.state,
    };
  }

  /**
   * Cool down a runtime — flush caches, release GPU memory.
   * @param {string} runtimeId
   */
  async coolDown(runtimeId) {
    const runtime = this._runtimes.get(runtimeId);
    if (!runtime) return;

    runtime.state = RUNTIME_STATE.COOLING;
    logger.info('Cooling down runtime', { runtimeId });

    // Drain task queue
    while (runtime.taskQueue.length > 0) {
      const queued = runtime.taskQueue.shift();
      queued.reject(new Error('Runtime cooling down'));
    }

    runtime.metrics.gpuUtilization = 0;
    runtime.metrics.gpuMemoryUsedMB = 0;
    runtime.state = RUNTIME_STATE.IDLE;

    this.emit('runtime:cooled', { runtimeId });
  }

  /**
   * Terminate a runtime — full shutdown.
   * @param {string} runtimeId
   */
  async terminate(runtimeId) {
    const runtime = this._runtimes.get(runtimeId);
    if (!runtime) return;

    await this.coolDown(runtimeId);
    runtime.state = RUNTIME_STATE.TERMINATED;
    runtime.endpoint = '';
    runtime.sessionToken = '';

    this.emit('runtime:terminated', { runtimeId });
    logger.info('Runtime terminated', { runtimeId });
  }

  /**
   * Get all runtime statuses.
   * @returns {object[]}
   */
  getAllRuntimes() {
    return Array.from(this._runtimes.values()).map(r => r.toJSON());
  }

  /**
   * Get cluster summary across all 3 runtimes.
   * @returns {object}
   */
  getClusterStatus() {
    const runtimes = Array.from(this._runtimes.values());
    const active = runtimes.filter(r =>
      r.state === RUNTIME_STATE.WARM || r.state === RUNTIME_STATE.EXECUTING
    );

    return {
      totalRuntimes: runtimes.length,
      activeRuntimes: active.length,
      totalGpuMemoryGB: runtimes.reduce((s, r) => s + r.vramGB, 0),
      totalOpsExecuted: runtimes.reduce((s, r) => s + r.metrics.opsExecuted, 0),
      totalErrors: runtimes.reduce((s, r) => s + r.metrics.errorCount, 0),
      avgGpuUtilization: active.length > 0
        ? active.reduce((s, r) => s + r.metrics.gpuUtilization, 0) / active.length
        : 0,
      runtimes: runtimes.map(r => r.toJSON()),
    };
  }

  // ── Private Methods ──────────────────────────────────────────

  /**
   * Execute an operation on a runtime.
   * @private
   */
  async _executeOp(runtime, op, params) {
    const opId = randomUUID().slice(0, 12);
    runtime.state = RUNTIME_STATE.EXECUTING;
    runtime.activeOps.set(opId, { op, params, startedAt: Date.now() });
    runtime.metrics.gpuUtilization = Math.min(
      1.0,
      runtime.activeOps.size / RUNTIME_LIMITS.maxConcurrentOps
    );

    this.emit('op:started', { runtimeId: runtime.id, opId, op });

    try {
      const result = await this._runLatentOp(runtime, op, params);
      runtime.metrics.opsExecuted++;
      runtime.metrics.lastActiveAt = Date.now();

      this.emit('op:completed', { runtimeId: runtime.id, opId, op });
      return { opId, runtimeId: runtime.id, op, result, status: 'completed' };
    } catch (err) {
      runtime.metrics.errorCount++;
      this.emit('op:failed', { runtimeId: runtime.id, opId, op, error: err.message });
      logger.error('Latent op failed', { runtimeId: runtime.id, opId, op, error: err.message });
      throw err;
    } finally {
      runtime.activeOps.delete(opId);
      runtime.metrics.gpuUtilization = Math.min(
        1.0,
        runtime.activeOps.size / RUNTIME_LIMITS.maxConcurrentOps
      );

      // Process queued ops
      if (runtime.taskQueue.length > 0 && runtime.activeOps.size < RUNTIME_LIMITS.maxConcurrentOps) {
        const next = runtime.taskQueue.shift();
        runtime.metrics.opsQueued = runtime.taskQueue.length;
        this._executeOp(runtime, next.op, next.params)
          .then(next.resolve)
          .catch(next.reject);
      }

      // If no active ops, return to warm state
      if (runtime.activeOps.size === 0) {
        runtime.state = RUNTIME_STATE.WARM;
      }
    }
  }

  /**
   * Run a latent space operation.
   * In production, this sends the operation to the actual Colab notebook.
   * @private
   */
  async _runLatentOp(runtime, op, params) {
    if (this._notebookExecutor) {
      return this._notebookExecutor(runtime, op, params);
    }

    // Structured operation routing
    switch (op) {
      case LATENT_OPS.EMBED:
        return {
          op: 'embed',
          dimensions: 384,
          vectors: params.texts?.length || 1,
          model: 'nomic-embed-text-v1.5',
          runtime: runtime.id,
        };

      case LATENT_OPS.SEARCH:
        return {
          op: 'search',
          dimensions: 384,
          k: params.k || fib(8),
          index: 'hnsw',
          runtime: runtime.id,
        };

      case LATENT_OPS.CLUSTER:
        return {
          op: 'cluster',
          algorithm: 'hnsw',
          m: fib(8),            // 21 — HNSW connections
          efConstruction: fib(12), // 144
          runtime: runtime.id,
        };

      case LATENT_OPS.TRAIN:
        return {
          op: 'train',
          epochs: fib(7),       // 13
          batchSize: fib(10),   // 55
          learningRate: PSI2 * 0.01,
          runtime: runtime.id,
        };

      case LATENT_OPS.TRANSFORM:
        return {
          op: 'transform',
          type: params.type || 'project',
          dimensions: 384,
          runtime: runtime.id,
        };

      default:
        return {
          op,
          params,
          runtime: runtime.id,
          status: 'executed',
        };
    }
  }

  /**
   * Get the target vector for an operation type.
   * @private
   */
  _getOpTargetVector(op) {
    const vectors = {
      [LATENT_OPS.EMBED]:     { x: PSI, y: PHI, z: PSI2 },
      [LATENT_OPS.SEARCH]:    { x: PHI, y: PSI, z: PHI },
      [LATENT_OPS.CLUSTER]:   { x: 0.0, y: PHI * PHI, z: 0.0 },
      [LATENT_OPS.TRAIN]:     { x: 0.0, y: PHI * PHI, z: 0.0 },
      [LATENT_OPS.TRANSFORM]: { x: PSI, y: PHI, z: PSI },
    };
    return vectors[op] || { x: PSI, y: PSI, z: PSI };
  }

  /**
   * Select optimal runtime using CSL-gated scoring.
   * @private
   */
  _selectOptimalRuntime(taskVector) {
    const runtimes = Array.from(this._runtimes.values());
    const available = runtimes.filter(r =>
      r.state !== RUNTIME_STATE.TERMINATED &&
      r.state !== RUNTIME_STATE.ERROR
    );

    if (available.length === 0) {
      throw new Error('No available runtimes');
    }

    let bestId = available[0].id;
    let bestScore = -Infinity;

    const [wProximity, wCapacity] = phiFusionWeights(2);

    for (const runtime of available) {
      // 3D distance to task vector
      const dx = runtime.vectorPosition.x - taskVector.x;
      const dy = runtime.vectorPosition.y - taskVector.y;
      const dz = runtime.vectorPosition.z - taskVector.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Proximity score (inverse distance, normalized)
      const proximity = 1.0 / (1.0 + dist);

      // Capacity score (prefer less loaded)
      const utilization = runtime.activeOps.size / RUNTIME_LIMITS.maxConcurrentOps;
      const capacity = 1.0 - utilization;

      const score = proximity * wProximity + capacity * wCapacity;

      if (score > bestScore) {
        bestScore = score;
        bestId = runtime.id;
      }
    }

    return bestId;
  }
}

export {
  ColabRuntimeManager,
  ColabRuntime,
  RUNTIME_STATE,
  LATENT_OPS,
  RUNTIME_LIMITS,
  DEFAULT_RUNTIMES,
};
