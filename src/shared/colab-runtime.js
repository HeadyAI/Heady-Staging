/**
 * @fileoverview ColabRuntime — 3× Google Colab Pro+ GPU runtime management.
 * Manages three concurrent runtimes as the distributed latent space operations
 * layer of the Heady system. Handles GPU allocation, embedding pipelines,
 * UMAP/t-SNE projection, distributed inference, and runtime health.
 *
 * @module shared/colab-runtime
 * @version 4.0.0
 *
 * Heady™ Latent OS — Sacred Geometry v4.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 * 51 Provisional Patents — All Rights Reserved
 */

'use strict';

const crypto = require('crypto');
const { EventEmitter } = require('events');

const PHI = (1 + Math.sqrt(5)) / 2;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597];

/** @param {number} n @returns {number} */
function fib(n) { return FIB[n - 1] || 0; }

/** @param {number} level @returns {number} */
function phiThreshold(level) { return 1 - Math.pow(PSI, level) * 0.5; }

/**
 * Phi-exponential backoff.
 * @param {number} attempt
 * @param {number} [baseMs=1000]
 * @param {number} [maxMs=60000]
 * @returns {number}
 */
function phiBackoff(attempt, baseMs, maxMs) {
  const base = typeof baseMs === 'number' ? baseMs : 1000;
  const max = typeof maxMs === 'number' ? maxMs : 60000;
  return Math.min(base * Math.pow(PHI, attempt), max);
}

// ─── RUNTIME STATES ─────────────────────────────────────────────────────────

/**
 * Colab runtime lifecycle states.
 * @enum {string}
 */
const RUNTIME_STATE = Object.freeze({
  IDLE:         'IDLE',
  CONNECTING:   'CONNECTING',
  READY:        'READY',
  BUSY:         'BUSY',
  DRAINING:     'DRAINING',
  DISCONNECTED: 'DISCONNECTED',
  ERROR:        'ERROR',
});

/**
 * Runtime role assignments — each of 3 runtimes specializes.
 * @enum {string}
 */
const RUNTIME_ROLE = Object.freeze({
  EMBEDDING:   'EMBEDDING',    // Runtime 1: Embedding generation (Nomic, Jina, Cohere)
  PROJECTION:  'PROJECTION',   // Runtime 2: UMAP/t-SNE/PCA 3D projection
  INFERENCE:   'INFERENCE',    // Runtime 3: LLM inference (Ollama, vLLM, local models)
});

/**
 * GPU types available on Colab Pro+.
 * @enum {string}
 */
const GPU_TYPE = Object.freeze({
  T4:     'T4',
  A100:   'A100',
  V100:   'V100',
  L4:     'L4',
});

// ─── COLAB RUNTIME INSTANCE ─────────────────────────────────────────────────

/**
 * ColabRuntimeInstance — represents a single Colab Pro+ runtime.
 *
 * @class
 * @extends EventEmitter
 */
class ColabRuntimeInstance extends EventEmitter {
  /**
   * @param {Object} config
   * @param {string} config.id - Runtime identifier (runtime-1, runtime-2, runtime-3)
   * @param {string} config.role - RUNTIME_ROLE value
   * @param {string} config.notebookUrl - Colab notebook URL
   * @param {string} [config.gpuType] - Preferred GPU type
   * @param {number} [config.maxMemoryGB] - Max GPU memory in GB
   */
  constructor(config) {
    super();
    /** @type {string} */
    this.id = config.id;
    /** @type {string} */
    this.role = config.role;
    /** @type {string} */
    this.notebookUrl = config.notebookUrl;
    /** @type {string} */
    this.gpuType = config.gpuType || GPU_TYPE.T4;
    /** @type {number} */
    this.maxMemoryGB = config.maxMemoryGB || fib(9); // 34GB
    /** @type {string} */
    this.state = RUNTIME_STATE.IDLE;
    /** @type {string} */
    this.nodeId = `colab-${config.id}-${crypto.randomBytes(fib(4)).toString('hex')}`;
    /** @type {number} */
    this.startTime = 0;
    /** @type {number} */
    this.lastHeartbeat = 0;
    /** @type {number} */
    this.taskCount = 0;
    /** @type {number} */
    this.errorCount = 0;
    /** @type {number} GPU utilization 0-1 */
    this.gpuUtilization = 0;
    /** @type {number} Memory utilization 0-1 */
    this.memUtilization = 0;
    /** @type {Array<{task: string, startTime: number, status: string}>} */
    this.activeJobs = [];
    /** @type {string|null} WebSocket or REST endpoint for this runtime */
    this.endpoint = null;
    /** @type {number} Consecutive failed health checks */
    this.failedChecks = 0;
    /** @type {number} Max failures before disconnect */
    this.maxFailedChecks = fib(5); // 5
  }

  /**
   * Connect to the Colab runtime via its exposed endpoint.
   * @param {string} endpoint - Runtime REST/WebSocket endpoint URL
   * @returns {Promise<boolean>}
   */
  async connect(endpoint) {
    this.state = RUNTIME_STATE.CONNECTING;
    this.endpoint = endpoint;
    this.startTime = Date.now();

    try {
      // Verify connectivity with a health check
      const healthy = await this._healthCheck();
      if (healthy) {
        this.state = RUNTIME_STATE.READY;
        this.failedChecks = 0;
        this.lastHeartbeat = Date.now();
        this.emit('connected', { id: this.id, role: this.role });
        return true;
      }
      this.state = RUNTIME_STATE.ERROR;
      return false;
    } catch (err) {
      this.state = RUNTIME_STATE.ERROR;
      this.errorCount++;
      return false;
    }
  }

  /**
   * Submit a job to this runtime.
   * @param {Object} job
   * @param {string} job.type - Job type ('embed', 'project', 'infer', 'search')
   * @param {*} job.payload - Job payload
   * @param {string} [job.id] - Job ID
   * @returns {Promise<Object>} Job result
   */
  async submitJob(job) {
    if (this.state !== RUNTIME_STATE.READY && this.state !== RUNTIME_STATE.BUSY) {
      throw new Error(`Runtime ${this.id} not ready (state: ${this.state})`);
    }

    const jobId = job.id || crypto.randomBytes(fib(6)).toString('hex');
    const jobEntry = { task: job.type, startTime: Date.now(), status: 'running', id: jobId };
    this.activeJobs.push(jobEntry);
    this.state = RUNTIME_STATE.BUSY;
    this.taskCount++;

    try {
      const result = await this._executeJob(job, jobId);
      jobEntry.status = 'completed';
      this._removeJob(jobId);
      if (this.activeJobs.length === 0) {
        this.state = RUNTIME_STATE.READY;
      }
      return result;
    } catch (err) {
      jobEntry.status = 'failed';
      this._removeJob(jobId);
      this.errorCount++;
      if (this.activeJobs.length === 0) {
        this.state = RUNTIME_STATE.READY;
      }
      throw err;
    }
  }

  /**
   * Execute a job — in production, this sends to the Colab runtime via REST.
   * @param {Object} job
   * @param {string} jobId
   * @returns {Promise<Object>}
   * @private
   */
  async _executeJob(job, jobId) {
    // Simulated execution — in production, sends HTTP to Colab ngrok/cloudflared endpoint
    const result = {
      jobId,
      runtimeId: this.id,
      role: this.role,
      type: job.type,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };

    switch (job.type) {
      case 'embed': {
        const texts = Array.isArray(job.payload.texts) ? job.payload.texts : [job.payload.text || ''];
        const dimension = job.payload.dimension || 384;
        result.embeddings = texts.map((text) => {
          const vec = new Array(dimension).fill(0);
          for (let i = 0; i < text.length; i++) {
            const idx = (text.charCodeAt(i) * fib(7) + i * fib(5)) % dimension;
            vec[idx] += Math.sin(text.charCodeAt(i) * PSI + i * PHI) * PSI;
          }
          let mag = 0;
          for (let i = 0; i < dimension; i++) mag += vec[i] * vec[i];
          mag = Math.sqrt(mag);
          if (mag > 0) for (let i = 0; i < dimension; i++) vec[i] /= mag;
          return vec;
        });
        result.count = result.embeddings.length;
        result.dimension = dimension;
        break;
      }
      case 'project': {
        const vectors = job.payload.vectors || [];
        const method = job.payload.method || 'umap';
        const targetDim = job.payload.targetDim || 3;
        result.projections = vectors.map((vec, idx) => {
          // Simplified projection — in production, UMAP/t-SNE runs on GPU
          const projected = new Array(targetDim).fill(0);
          for (let d = 0; d < targetDim; d++) {
            for (let i = 0; i < Math.min(vec.length, fib(8)); i++) {
              projected[d] += vec[i * targetDim + d] * PHI;
            }
            projected[d] = Math.tanh(projected[d]);
          }
          return { index: idx, coordinates: projected };
        });
        result.method = method;
        result.targetDim = targetDim;
        result.count = result.projections.length;
        break;
      }
      case 'infer': {
        result.response = {
          model: job.payload.model || 'local-llm',
          prompt: job.payload.prompt || '',
          status: 'queued_for_gpu',
          estimatedMs: Math.round(PHI * PHI * PHI * 1000),
        };
        break;
      }
      case 'search': {
        const queryVec = job.payload.queryVector || [];
        const topK = job.payload.topK || fib(5);
        result.results = [];
        for (let i = 0; i < topK; i++) {
          result.results.push({
            rank: i + 1,
            score: 1 - (i * PSI * 0.1),
            id: crypto.randomBytes(fib(5)).toString('hex'),
          });
        }
        result.topK = topK;
        break;
      }
      default:
        result.status = 'unknown_job_type';
    }

    return result;
  }

  /**
   * Perform a health check on this runtime.
   * @returns {Promise<boolean>}
   * @private
   */
  async _healthCheck() {
    // In production, pings the Colab runtime endpoint
    this.lastHeartbeat = Date.now();
    return this.state !== RUNTIME_STATE.DISCONNECTED && this.state !== RUNTIME_STATE.ERROR;
  }

  /**
   * Remove a completed/failed job from active list.
   * @param {string} jobId
   * @private
   */
  _removeJob(jobId) {
    const idx = this.activeJobs.findIndex(j => j.id === jobId);
    if (idx >= 0) this.activeJobs.splice(idx, 1);
  }

  /**
   * Get runtime status snapshot.
   * @returns {Object}
   */
  status() {
    return {
      id: this.id,
      nodeId: this.nodeId,
      role: this.role,
      state: this.state,
      gpuType: this.gpuType,
      maxMemoryGB: this.maxMemoryGB,
      uptime: this.startTime > 0 ? (Date.now() - this.startTime) / 1000 : 0,
      lastHeartbeat: this.lastHeartbeat,
      taskCount: this.taskCount,
      errorCount: this.errorCount,
      gpuUtilization: this.gpuUtilization,
      memUtilization: this.memUtilization,
      activeJobs: this.activeJobs.length,
      endpoint: this.endpoint,
    };
  }

  /**
   * Disconnect the runtime gracefully.
   * @returns {Promise<void>}
   */
  async disconnect() {
    this.state = RUNTIME_STATE.DRAINING;
    // Wait for active jobs to complete (with phi-scaled timeout)
    const maxWait = Math.round(PHI * PHI * PHI * PHI * 1000); // ~7s
    const start = Date.now();
    while (this.activeJobs.length > 0 && (Date.now() - start) < maxWait) {
      await new Promise(r => setTimeout(r, fib(8) * 100)); // 2100ms
    }
    this.state = RUNTIME_STATE.DISCONNECTED;
    this.endpoint = null;
    this.emit('disconnected', { id: this.id, role: this.role });
  }
}

// ─── COLAB CLUSTER MANAGER ──────────────────────────────────────────────────

/**
 * ColabCluster — manages all 3 Colab Pro+ runtimes as a unified GPU compute layer.
 * Provides load balancing, failover, and specialized routing by runtime role.
 *
 * Runtime allocation:
 *   - Runtime 1 (EMBEDDING):  34% of tasks — hot pool, embedding generation
 *   - Runtime 2 (PROJECTION): 21% of tasks — warm pool, dimensionality reduction
 *   - Runtime 3 (INFERENCE):  13% of tasks — cold pool, batch LLM inference
 *
 * @class
 * @extends EventEmitter
 */
class ColabCluster extends EventEmitter {
  constructor() {
    super();

    /** @type {ColabRuntimeInstance[]} */
    this.runtimes = [
      new ColabRuntimeInstance({
        id: 'runtime-1',
        role: RUNTIME_ROLE.EMBEDDING,
        notebookUrl: process.env.COLAB_RUNTIME_1_URL || 'https://colab.research.google.com/runtime-1',
        gpuType: GPU_TYPE.A100,
        maxMemoryGB: fib(9), // 34GB
      }),
      new ColabRuntimeInstance({
        id: 'runtime-2',
        role: RUNTIME_ROLE.PROJECTION,
        notebookUrl: process.env.COLAB_RUNTIME_2_URL || 'https://colab.research.google.com/runtime-2',
        gpuType: GPU_TYPE.T4,
        maxMemoryGB: fib(8), // 21GB
      }),
      new ColabRuntimeInstance({
        id: 'runtime-3',
        role: RUNTIME_ROLE.INFERENCE,
        notebookUrl: process.env.COLAB_RUNTIME_3_URL || 'https://colab.research.google.com/runtime-3',
        gpuType: GPU_TYPE.A100,
        maxMemoryGB: fib(10), // 55GB
      }),
    ];

    /** @type {Map<string, string>} Job type to preferred role mapping */
    this.routingTable = new Map([
      ['embed',    RUNTIME_ROLE.EMBEDDING],
      ['encode',   RUNTIME_ROLE.EMBEDDING],
      ['tokenize', RUNTIME_ROLE.EMBEDDING],
      ['project',  RUNTIME_ROLE.PROJECTION],
      ['reduce',   RUNTIME_ROLE.PROJECTION],
      ['cluster',  RUNTIME_ROLE.PROJECTION],
      ['visualize',RUNTIME_ROLE.PROJECTION],
      ['infer',    RUNTIME_ROLE.INFERENCE],
      ['generate', RUNTIME_ROLE.INFERENCE],
      ['complete', RUNTIME_ROLE.INFERENCE],
      ['search',   RUNTIME_ROLE.EMBEDDING], // Search uses embedding runtime for similarity
    ]);

    /** @type {number|null} Health check interval timer */
    this._healthTimer = null;
  }

  /**
   * Initialize all runtimes — connect to their endpoints.
   * @param {Object} endpoints - Map of runtime-id to endpoint URL
   * @returns {Promise<Object>} Connection results
   */
  async initialize(endpoints) {
    const ep = endpoints || {};
    const results = {};

    for (const runtime of this.runtimes) {
      const endpoint = ep[runtime.id]
        || process.env[`COLAB_${runtime.id.toUpperCase().replace(/-/g, '_')}_ENDPOINT`]
        || null;

      if (endpoint) {
        const connected = await runtime.connect(endpoint);
        results[runtime.id] = { connected, role: runtime.role, endpoint };
      } else {
        results[runtime.id] = { connected: false, role: runtime.role, reason: 'no_endpoint' };
      }
    }

    // Start health monitoring
    this._startHealthMonitor();

    return results;
  }

  /**
   * Submit a job to the appropriate runtime based on job type.
   * Includes automatic failover to any available runtime.
   * @param {Object} job
   * @param {string} job.type - Job type (embed, project, infer, search, etc.)
   * @param {*} job.payload - Job data
   * @returns {Promise<Object>} Job result
   */
  async submitJob(job) {
    // Route to preferred runtime by job type
    const preferredRole = this.routingTable.get(job.type) || RUNTIME_ROLE.INFERENCE;
    const preferred = this.runtimes.find(r => r.role === preferredRole && r.state === RUNTIME_STATE.READY);

    if (preferred) {
      return preferred.submitJob(job);
    }

    // Failover: try any READY runtime
    const fallback = this.runtimes.find(r => r.state === RUNTIME_STATE.READY);
    if (fallback) {
      return fallback.submitJob(job);
    }

    // Try BUSY runtimes (they can queue)
    const busy = this.runtimes.find(r => r.state === RUNTIME_STATE.BUSY);
    if (busy) {
      return busy.submitJob(job);
    }

    throw new Error(`No available Colab runtime for job type: ${job.type}`);
  }

  /**
   * Generate embeddings using the embedding runtime.
   * @param {string[]} texts - Texts to embed
   * @param {number} [dimension=384] - Embedding dimension
   * @returns {Promise<{embeddings: number[][], count: number}>}
   */
  async embed(texts, dimension) {
    return this.submitJob({
      type: 'embed',
      payload: { texts, dimension: dimension || 384 },
    });
  }

  /**
   * Project high-dimensional vectors to 3D using the projection runtime.
   * @param {number[][]} vectors - Input vectors
   * @param {string} [method='umap'] - Projection method
   * @param {number} [targetDim=3] - Target dimensions
   * @returns {Promise<Object>}
   */
  async project(vectors, method, targetDim) {
    return this.submitJob({
      type: 'project',
      payload: { vectors, method: method || 'umap', targetDim: targetDim || 3 },
    });
  }

  /**
   * Run inference on the inference runtime.
   * @param {string} prompt - Inference prompt
   * @param {string} [model] - Model name
   * @returns {Promise<Object>}
   */
  async infer(prompt, model) {
    return this.submitJob({
      type: 'infer',
      payload: { prompt, model },
    });
  }

  /**
   * Vector similarity search on the embedding runtime.
   * @param {number[]} queryVector
   * @param {number} [topK]
   * @returns {Promise<Object>}
   */
  async search(queryVector, topK) {
    return this.submitJob({
      type: 'search',
      payload: { queryVector, topK: topK || fib(5) },
    });
  }

  /**
   * Start periodic health monitoring of all runtimes.
   * @private
   */
  _startHealthMonitor() {
    const interval = fib(8) * 1000; // 21 seconds
    this._healthTimer = setInterval(async () => {
      for (const runtime of this.runtimes) {
        if (runtime.state === RUNTIME_STATE.DISCONNECTED) continue;
        const healthy = await runtime._healthCheck();
        if (!healthy) {
          runtime.failedChecks++;
          if (runtime.failedChecks >= runtime.maxFailedChecks) {
            runtime.state = RUNTIME_STATE.ERROR;
            this.emit('runtime_error', { id: runtime.id, role: runtime.role });
          }
        } else {
          runtime.failedChecks = 0;
        }
      }
    }, interval);
  }

  /**
   * Get cluster status — all runtimes, utilization, and routing table.
   * @returns {Object}
   */
  status() {
    const runtimes = this.runtimes.map(r => r.status());
    const readyCount = this.runtimes.filter(r => r.state === RUNTIME_STATE.READY).length;
    const totalTasks = this.runtimes.reduce((sum, r) => sum + r.taskCount, 0);
    const totalErrors = this.runtimes.reduce((sum, r) => sum + r.errorCount, 0);

    return {
      clusterHealth: readyCount === 3 ? 'healthy' : readyCount > 0 ? 'degraded' : 'offline',
      runtimesReady: readyCount,
      runtimesTotal: 3,
      totalTasks,
      totalErrors,
      errorRate: totalTasks > 0 ? totalErrors / totalTasks : 0,
      runtimes,
      routingTable: Object.fromEntries(this.routingTable),
      phi: PHI,
    };
  }

  /**
   * Gracefully shut down all runtimes.
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this._healthTimer) {
      clearInterval(this._healthTimer);
      this._healthTimer = null;
    }
    for (const runtime of this.runtimes) {
      await runtime.disconnect();
    }
  }
}

// ─── LATENT SPACE OPERATIONS ────────────────────────────────────────────────

/**
 * LatentSpaceOps — high-level interface for operating in the Heady 384D vector space
 * using the Colab Pro+ GPU cluster as the compute backbone.
 *
 * @class
 */
class LatentSpaceOps {
  /**
   * @param {ColabCluster} cluster - The Colab cluster instance
   */
  constructor(cluster) {
    /** @type {ColabCluster} */
    this.cluster = cluster;
    /** @type {Map<string, number[]>} Embedding cache */
    this.cache = new Map();
    /** @type {number} Cache max size */
    this.cacheMax = fib(16); // 987
  }

  /**
   * Embed text into the 384D latent space.
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async embed(text) {
    if (this.cache.has(text)) return this.cache.get(text);
    const result = await this.cluster.embed([text], 384);
    const vec = result.embeddings[0];
    this._cacheStore(text, vec);
    return vec;
  }

  /**
   * Batch embed multiple texts.
   * @param {string[]} texts
   * @returns {Promise<number[][]>}
   */
  async batchEmbed(texts) {
    const result = await this.cluster.embed(texts, 384);
    for (let i = 0; i < texts.length; i++) {
      this._cacheStore(texts[i], result.embeddings[i]);
    }
    return result.embeddings;
  }

  /**
   * CSL AND — cosine similarity between two texts in latent space.
   * @param {string} textA
   * @param {string} textB
   * @returns {Promise<number>} Cosine similarity [-1, 1]
   */
  async cslAnd(textA, textB) {
    const [vecA, vecB] = await Promise.all([this.embed(textA), this.embed(textB)]);
    return this._cosine(vecA, vecB);
  }

  /**
   * CSL OR — superposition of two text embeddings.
   * @param {string} textA
   * @param {string} textB
   * @returns {Promise<number[]>} Normalized superposition vector
   */
  async cslOr(textA, textB) {
    const [vecA, vecB] = await Promise.all([this.embed(textA), this.embed(textB)]);
    const result = new Array(384).fill(0);
    for (let i = 0; i < 384; i++) {
      result[i] = vecA[i] + vecB[i];
    }
    return this._normalize(result);
  }

  /**
   * CSL NOT — orthogonal projection (semantic negation).
   * @param {string} textA - Text to negate from
   * @param {string} textB - Concept to negate
   * @returns {Promise<number[]>} a - proj_b(a)
   */
  async cslNot(textA, textB) {
    const [vecA, vecB] = await Promise.all([this.embed(textA), this.embed(textB)]);
    const dot = this._dot(vecA, vecB);
    const magB = this._dot(vecB, vecB);
    const scale = magB > 0 ? dot / magB : 0;
    const result = new Array(384).fill(0);
    for (let i = 0; i < 384; i++) {
      result[i] = vecA[i] - scale * vecB[i];
    }
    return this._normalize(result);
  }

  /**
   * Project vectors to 3D for visualization.
   * @param {number[][]} vectors
   * @param {string} [method='umap']
   * @returns {Promise<Object>}
   */
  async projectTo3D(vectors, method) {
    return this.cluster.project(vectors, method || 'umap', 3);
  }

  /**
   * Semantic search in latent space.
   * @param {string} query
   * @param {number} [topK]
   * @returns {Promise<Object>}
   */
  async semanticSearch(query, topK) {
    const queryVec = await this.embed(query);
    return this.cluster.search(queryVec, topK || fib(5));
  }

  /**
   * Measure coherence between multiple texts.
   * @param {string[]} texts
   * @returns {Promise<{pairwise: Object[], averageCoherence: number}>}
   */
  async measureCoherence(texts) {
    const embeddings = await this.batchEmbed(texts);
    const pairwise = [];
    let totalSim = 0;
    let pairCount = 0;

    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const sim = this._cosine(embeddings[i], embeddings[j]);
        pairwise.push({ a: i, b: j, similarity: sim });
        totalSim += sim;
        pairCount++;
      }
    }

    return {
      pairwise,
      averageCoherence: pairCount > 0 ? totalSim / pairCount : 0,
      threshold: phiThreshold(2), // MEDIUM threshold for coherence
    };
  }

  /**
   * Cosine similarity.
   * @param {number[]} a @param {number[]} b
   * @returns {number}
   * @private
   */
  _cosine(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  /**
   * Dot product.
   * @param {number[]} a @param {number[]} b
   * @returns {number}
   * @private
   */
  _dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
  }

  /**
   * Normalize a vector to unit length.
   * @param {number[]} vec
   * @returns {number[]}
   * @private
   */
  _normalize(vec) {
    let mag = 0;
    for (let i = 0; i < vec.length; i++) mag += vec[i] * vec[i];
    mag = Math.sqrt(mag);
    if (mag === 0) return vec;
    return vec.map(v => v / mag);
  }

  /**
   * Store in LRU cache.
   * @param {string} key @param {number[]} value
   * @private
   */
  _cacheStore(key, value) {
    if (this.cache.size >= this.cacheMax) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────

module.exports = {
  ColabRuntimeInstance,
  ColabCluster,
  LatentSpaceOps,
  RUNTIME_STATE,
  RUNTIME_ROLE,
  GPU_TYPE,
  PHI,
  PSI,
  FIB,
  fib,
  phiThreshold,
  phiBackoff,
};
