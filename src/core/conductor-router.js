/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ CONDUCTOR ROUTER                                         ║
 * ║  CSL-gated task classification, domain routing, DAG-based        ║
 * ║  task decomposition, arena mode, and audit trail                  ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║  © 2026 HeadySystems Inc. — All Rights Reserved                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * @module conductor-router
 * @version 1.0.0
 */

'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');
const {
  PHI, PSI, FIB_SEQUENCE,
  CSL_THRESHOLDS, phiBackoff, phiFusionWeights,
  fib, phiMs, PHI_TIMING,
  cosineSimilarity, placeholderVector, VECTOR_DIMENSIONS,
  confidenceToPool,
} = require('../lib/phi-helpers');

// ─── DOMAIN ROUTING TABLE ──────────────────────────────────────────────────

/**
 * 12 task domains with primary nodes and pool assignments.
 * Each domain has a semantic embedding for CSL-based routing.
 */
const ROUTING_TABLE = Object.freeze([
  {
    domain: 'code_generation',
    nodes: ['JULES', 'BUILDER', 'HeadyCoder'],
    pool: 'hot',
    keywords: ['build', 'create', 'implement', 'code', 'generate', 'scaffold', 'write'],
    embedding: placeholderVector('code generation build create implement', VECTOR_DIMENSIONS),
  },
  {
    domain: 'code_review',
    nodes: ['OBSERVER', 'HeadyAnalyze'],
    pool: 'hot',
    keywords: ['review', 'analyze', 'inspect', 'critique', 'audit code', 'lint'],
    embedding: placeholderVector('code review analyze inspect critique', VECTOR_DIMENSIONS),
  },
  {
    domain: 'security',
    nodes: ['MURPHY', 'CIPHER', 'HeadyRisks'],
    pool: 'hot',
    keywords: ['security', 'vulnerability', 'pen test', 'threat', 'encrypt', 'auth'],
    embedding: placeholderVector('security vulnerability threat encryption', VECTOR_DIMENSIONS),
  },
  {
    domain: 'architecture',
    nodes: ['ATLAS', 'PYTHIA', 'HeadyVinci'],
    pool: 'hot',
    keywords: ['architecture', 'design', 'system design', 'infrastructure', 'topology'],
    embedding: placeholderVector('architecture system design infrastructure', VECTOR_DIMENSIONS),
  },
  {
    domain: 'research',
    nodes: ['HeadyResearch', 'SOPHIA'],
    pool: 'warm',
    keywords: ['research', 'investigate', 'study', 'explore', 'survey', 'literature'],
    embedding: placeholderVector('research investigate study explore', VECTOR_DIMENSIONS),
  },
  {
    domain: 'documentation',
    nodes: ['ATLAS', 'HeadyCodex'],
    pool: 'warm',
    keywords: ['document', 'docs', 'readme', 'api doc', 'guide', 'tutorial'],
    embedding: placeholderVector('documentation docs readme guide tutorial', VECTOR_DIMENSIONS),
  },
  {
    domain: 'creative',
    nodes: ['MUSE', 'NOVA'],
    pool: 'warm',
    keywords: ['creative', 'design', 'ui', 'ux', 'visual', 'art', 'brand'],
    embedding: placeholderVector('creative design ui ux visual art', VECTOR_DIMENSIONS),
  },
  {
    domain: 'translation',
    nodes: ['BRIDGE'],
    pool: 'warm',
    keywords: ['translate', 'i18n', 'localize', 'language', 'multilingual'],
    embedding: placeholderVector('translate localize language multilingual', VECTOR_DIMENSIONS),
  },
  {
    domain: 'monitoring',
    nodes: ['OBSERVER', 'LENS', 'SENTINEL'],
    pool: 'warm',
    keywords: ['monitor', 'observe', 'watch', 'alert', 'metric', 'dashboard'],
    embedding: placeholderVector('monitor observe alert metric dashboard', VECTOR_DIMENSIONS),
  },
  {
    domain: 'cleanup',
    nodes: ['JANITOR', 'HeadyMaid'],
    pool: 'cold',
    keywords: ['clean', 'refactor', 'prune', 'remove', 'delete', 'tidy'],
    embedding: placeholderVector('clean refactor prune remove tidy', VECTOR_DIMENSIONS),
  },
  {
    domain: 'analytics',
    nodes: ['HeadyPatterns', 'HeadyMC'],
    pool: 'cold',
    keywords: ['analytics', 'statistics', 'data', 'pattern', 'monte carlo', 'trend'],
    embedding: placeholderVector('analytics statistics data pattern trend', VECTOR_DIMENSIONS),
  },
  {
    domain: 'maintenance',
    nodes: ['HeadyMaintenance'],
    pool: 'cold',
    keywords: ['maintain', 'update', 'patch', 'upgrade', 'dependency', 'fix'],
    embedding: placeholderVector('maintain update patch upgrade dependency', VECTOR_DIMENSIONS),
  },
]);

/** Domain index lookup */
const DOMAIN_INDEX = {};
ROUTING_TABLE.forEach((r, i) => { DOMAIN_INDEX[r.domain] = i; });

// ─── TASK CLASSIFIER ───────────────────────────────────────────────────────

/**
 * Classify a task by computing cosine similarity against all domain embeddings.
 * Returns sorted domain matches with confidence scores.
 *
 * @param {string} taskDescription - Natural language task description
 * @param {number[]} [taskEmbedding] - Pre-computed task embedding
 * @returns {Array<{domain: string, confidence: number, nodes: string[], pool: string}>}
 */
function classifyTask(taskDescription, taskEmbedding) {
  const embedding = taskEmbedding || placeholderVector(taskDescription, VECTOR_DIMENSIONS);

  const scores = ROUTING_TABLE.map(route => {
    // Cosine similarity between task and domain embedding
    const similarity = cosineSimilarity(embedding, route.embedding);

    // Keyword boost: check for keyword matches
    const taskLower = taskDescription.toLowerCase();
    const keywordMatches = route.keywords.filter(kw => taskLower.includes(kw)).length;
    const keywordBoost = keywordMatches > 0
      ? Math.pow(PSI, fib(3)) * (keywordMatches / route.keywords.length)
      : 0;

    const confidence = Math.min(1, similarity + keywordBoost);

    return {
      domain: route.domain,
      confidence: parseFloat(confidence.toFixed(fib(5))),
      nodes: route.nodes,
      pool: route.pool,
      similarity: parseFloat(similarity.toFixed(fib(5))),
      keywordBoost: parseFloat(keywordBoost.toFixed(fib(5))),
    };
  });

  // Sort by confidence descending
  scores.sort((a, b) => b.confidence - a.confidence);
  return scores;
}

/**
 * CSL-gated pool assignment based on confidence scoring.
 *
 * @param {number} confidence - Classification confidence 0-1
 * @returns {string} Pool name: 'hot', 'warm', or 'cold'
 */
function assignPool(confidence) {
  if (confidence >= CSL_THRESHOLDS.HIGH) return 'hot';
  if (confidence >= CSL_THRESHOLDS.MEDIUM) return 'warm';
  return 'cold';
}

// ─── DAG TASK DECOMPOSITION ────────────────────────────────────────────────

/**
 * DAGNode — represents a subtask in the execution graph.
 */
class DAGNode {
  /**
   * @param {Object} params
   * @param {string} params.id - Unique node ID
   * @param {string} params.task - Subtask description
   * @param {string[]} [params.dependencies] - IDs of nodes this depends on
   * @param {string} [params.domain] - Target domain
   */
  constructor(params) {
    this.id = params.id;
    this.task = params.task;
    this.dependencies = params.dependencies || [];
    this.domain = params.domain || null;
    this.status = 'PENDING'; // PENDING, RUNNING, COMPLETED, FAILED
    this.output = null;
    this.startTime = null;
    this.endTime = null;
  }
}

/**
 * Topological sort of DAG nodes for execution ordering.
 * Kahn's algorithm — O(V + E).
 *
 * @param {DAGNode[]} nodes - All DAG nodes
 * @returns {DAGNode[][]} Array of execution tiers (each tier can run in parallel)
 */
function topologicalSort(nodes) {
  const nodeMap = new Map();
  const inDegree = new Map();
  const adjacency = new Map();

  // Initialize
  for (const node of nodes) {
    nodeMap.set(node.id, node);
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // Build edges
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (adjacency.has(dep)) {
        adjacency.get(dep).push(node.id);
        inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm — group into tiers
  const tiers = [];
  let queue = [];

  // Start with nodes that have no dependencies
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const tier = queue.map(id => nodeMap.get(id));
    tiers.push(tier);

    const nextQueue = [];
    for (const id of queue) {
      for (const neighbor of adjacency.get(id)) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          nextQueue.push(neighbor);
        }
      }
    }
    queue = nextQueue;
  }

  // Check for cycles
  const totalSorted = tiers.reduce((sum, tier) => sum + tier.length, 0);
  if (totalSorted !== nodes.length) {
    throw new Error(`DAG contains cycles: sorted ${totalSorted} of ${nodes.length} nodes`);
  }

  return tiers;
}

/**
 * Decompose a complex task into a DAG of subtasks.
 *
 * @param {string} task - Task description
 * @param {Object} [options]
 * @param {Function} [options.decomposer] - Custom decomposition function
 * @returns {DAGNode[]} Decomposed subtask nodes
 */
function decomposeTask(task, options = {}) {
  if (options.decomposer) {
    return options.decomposer(task);
  }

  // Default decomposition: classify and create subtasks based on domain
  const classification = classifyTask(task);
  const primary = classification[0];
  const secondary = classification.length > 1 ? classification[1] : null;

  const nodes = [];

  // Root analysis node
  nodes.push(new DAGNode({
    id: 'analyze',
    task: `Analyze requirements: ${task}`,
    dependencies: [],
    domain: primary.domain,
  }));

  // Primary execution node
  nodes.push(new DAGNode({
    id: 'primary-execute',
    task: `Execute primary approach: ${task}`,
    dependencies: ['analyze'],
    domain: primary.domain,
  }));

  // Secondary execution if confidence warrants it
  if (secondary && secondary.confidence >= CSL_THRESHOLDS.LOW) {
    nodes.push(new DAGNode({
      id: 'secondary-execute',
      task: `Execute secondary approach: ${task}`,
      dependencies: ['analyze'],
      domain: secondary.domain,
    }));
  }

  // Review node (depends on all execution nodes)
  const reviewDeps = nodes
    .filter(n => n.id.includes('execute'))
    .map(n => n.id);
  nodes.push(new DAGNode({
    id: 'review',
    task: `Review and validate results`,
    dependencies: reviewDeps,
    domain: 'code_review',
  }));

  // Delivery node
  nodes.push(new DAGNode({
    id: 'deliver',
    task: `Deliver final output`,
    dependencies: ['review'],
    domain: primary.domain,
  }));

  return nodes;
}

// ─── ARENA MODE ────────────────────────────────────────────────────────────

/**
 * Run arena mode: pit multiple node configurations against each other.
 *
 * @param {string} task - Task to execute
 * @param {Array<{id: string, name: string, nodes: string[], executor: Function}>} configs
 * @returns {Promise<{winner: Object, rankings: Array}>}
 */
async function arenaMode(task, configs) {
  if (configs.length === 0) {
    throw new Error('Arena mode requires at least one configuration');
  }

  const startMs = Date.now();
  const weights = phiFusionWeights(fib(4)); // 3 criteria

  const results = await Promise.all(
    configs.map(async (config) => {
      const cStart = Date.now();
      try {
        const output = await config.executor(task);
        return {
          id: config.id,
          name: config.name,
          nodes: config.nodes,
          output,
          durationMs: Date.now() - cStart,
          success: true,
        };
      } catch (err) {
        return {
          id: config.id,
          name: config.name,
          nodes: config.nodes,
          error: err.message,
          durationMs: Date.now() - cStart,
          success: false,
        };
      }
    })
  );

  // Score each config
  const scored = results.map(r => {
    const speedScore = r.success ? Math.max(0, 1 - r.durationMs / phiMs(fib(6))) : 0;
    const qualityScore = r.success ? (r.output && r.output.quality || PSI) : 0;
    const reliabilityScore = r.success ? 1.0 : 0;

    const composite =
      weights[0] * qualityScore +
      weights[1] * speedScore +
      weights[2] * reliabilityScore;

    return { ...r, composite: parseFloat(composite.toFixed(fib(5))), scores: { speedScore, qualityScore, reliabilityScore } };
  });

  scored.sort((a, b) => b.composite - a.composite);

  return {
    winner: scored[0],
    rankings: scored.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      name: r.name,
      composite: r.composite,
      success: r.success,
    })),
    durationMs: Date.now() - startMs,
  };
}

// ─── CONDUCTOR ROUTER SERVICE ──────────────────────────────────────────────

/**
 * ConductorRouter — The main routing service combining classification,
 * DAG decomposition, parallel execution, fallback routing, arena mode,
 * and comprehensive audit logging.
 */
class ConductorRouter extends EventEmitter {
  constructor(config = {}) {
    super();
    this._startTime = Date.now();
    this._version = '1.0.0';
    this._auditLog = [];
    this._maxAuditEntries = fib(11); // 89
    this._routeCount = 0;
    this._fallbackCount = 0;

    // Node availability tracking
    this._nodeStatus = new Map();
    for (const route of ROUTING_TABLE) {
      for (const node of route.nodes) {
        this._nodeStatus.set(node, { available: true, lastCheck: Date.now(), failureCount: 0 });
      }
    }
  }

  /**
   * Route a task to the optimal domain and nodes.
   *
   * @param {Object} params
   * @param {string} params.task - Task description
   * @param {number[]} [params.embedding] - Pre-computed task embedding
   * @param {boolean} [params.decompose=false] - Whether to DAG-decompose
   * @returns {{domain: string, nodes: string[], pool: string, confidence: number, dag: ?Object, auditId: string}}
   */
  route(params) {
    const { task, embedding, decompose = false } = params;
    const startMs = Date.now();

    // Classify
    const classifications = classifyTask(task, embedding);
    const primary = classifications[0];

    // Check node availability, apply fallback if needed
    let selectedNodes = this._selectAvailableNodes(primary);
    let fallback = false;
    if (selectedNodes.length === 0) {
      // Fallback: try next best domain
      for (let i = 1; i < classifications.length; i++) {
        selectedNodes = this._selectAvailableNodes(classifications[i]);
        if (selectedNodes.length > 0) {
          fallback = true;
          this._fallbackCount++;
          break;
        }
      }
    }

    // Pool assignment via CSL gate
    const pool = assignPool(primary.confidence);

    // DAG decomposition if requested
    let dag = null;
    if (decompose) {
      const nodes = decomposeTask(task);
      const tiers = topologicalSort(nodes);
      dag = { nodes, tiers, tierCount: tiers.length };
    }

    this._routeCount++;

    // Audit entry
    const auditEntry = {
      auditId: crypto.randomUUID(),
      task: task.substring(0, fib(11)),
      domain: primary.domain,
      confidence: primary.confidence,
      selectedNodes,
      pool,
      fallback,
      decomposed: !!dag,
      durationMs: Date.now() - startMs,
      timestamp: Date.now(),
    };
    this._appendAudit(auditEntry);

    this.emit('route:completed', auditEntry);

    return {
      domain: primary.domain,
      nodes: selectedNodes,
      pool,
      confidence: primary.confidence,
      classifications: classifications.slice(0, fib(5)),
      fallback,
      dag,
      auditId: auditEntry.auditId,
    };
  }

  /**
   * Execute routed subtasks in parallel where possible.
   *
   * @param {DAGNode[][]} tiers - Execution tiers from topological sort
   * @param {Object} executors - Map of domain → executor function
   * @returns {Promise<Object>} Execution results
   */
  async executeDAG(tiers, executors = {}) {
    const results = {};
    const startMs = Date.now();

    for (let tierIdx = 0; tierIdx < tiers.length; tierIdx++) {
      const tier = tiers[tierIdx];

      // Execute all nodes in this tier concurrently
      const tierResults = await Promise.all(
        tier.map(async (node) => {
          node.status = 'RUNNING';
          node.startTime = Date.now();

          const executor = executors[node.domain] || executors.default;
          if (!executor) {
            node.status = 'FAILED';
            node.endTime = Date.now();
            return { nodeId: node.id, error: 'No executor for domain: ' + node.domain };
          }

          try {
            const timeout = phiMs(fib(5) + tierIdx);
            const output = await Promise.race([
              executor(node),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`DAG node ${node.id} timeout`)), timeout)
              ),
            ]);
            node.status = 'COMPLETED';
            node.output = output;
            node.endTime = Date.now();
            return { nodeId: node.id, output, durationMs: node.endTime - node.startTime };
          } catch (err) {
            node.status = 'FAILED';
            node.endTime = Date.now();
            return { nodeId: node.id, error: err.message, durationMs: node.endTime - node.startTime };
          }
        })
      );

      for (const r of tierResults) {
        results[r.nodeId] = r;
      }
    }

    return {
      results,
      totalDurationMs: Date.now() - startMs,
      tierCount: tiers.length,
    };
  }

  /**
   * Select available nodes from a classification result.
   * Filters out nodes that have failed recently.
   *
   * @param {Object} classification
   * @returns {string[]} Available node names
   */
  _selectAvailableNodes(classification) {
    return classification.nodes.filter(node => {
      const status = this._nodeStatus.get(node);
      if (!status) return true;
      // Consider unavailable if failure count exceeds fib(4)=3
      return status.available && status.failureCount < fib(4);
    });
  }

  /**
   * Mark a node as unavailable (e.g., after failures).
   * @param {string} nodeName
   */
  markNodeDown(nodeName) {
    const status = this._nodeStatus.get(nodeName);
    if (status) {
      status.available = false;
      status.failureCount++;
      status.lastCheck = Date.now();
    }
    this.emit('node:down', { node: nodeName, timestamp: Date.now() });
  }

  /**
   * Mark a node as available again.
   * @param {string} nodeName
   */
  markNodeUp(nodeName) {
    const status = this._nodeStatus.get(nodeName);
    if (status) {
      status.available = true;
      status.failureCount = 0;
      status.lastCheck = Date.now();
    }
    this.emit('node:up', { node: nodeName, timestamp: Date.now() });
  }

  /**
   * Append an audit entry.
   * @param {Object} entry
   */
  _appendAudit(entry) {
    this._auditLog.push(entry);
    if (this._auditLog.length > this._maxAuditEntries) {
      this._auditLog.shift();
    }
  }

  /**
   * Get the full routing table.
   * @returns {Array}
   */
  getRoutingTable() {
    return ROUTING_TABLE.map(r => ({
      domain: r.domain,
      nodes: r.nodes,
      pool: r.pool,
      keywords: r.keywords,
    }));
  }

  /**
   * Get the audit trail.
   * @param {number} [limit=fib(8)] - Max entries to return
   * @returns {Array}
   */
  getAuditLog(limit) {
    const max = limit || fib(8);
    return this._auditLog.slice(-max);
  }

  /**
   * Create an Express-compatible router with /route, /health, /routing-table endpoints.
   * @returns {Function} Router function
   */
  createRouter() {
    const self = this;
    const routes = [];

    function router(req, res, next) {
      const method = req.method;
      const url = (req.url || '').split('?')[0];

      for (const route of routes) {
        if (route.method === method && route.path === url) {
          return route.handler(req, res);
        }
      }
      if (typeof next === 'function') next();
    }

    // POST /route
    routes.push({
      method: 'POST',
      path: '/route',
      handler: (req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const result = self.route(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      },
    });

    // GET /health
    routes.push({
      method: 'GET',
      path: '/health',
      handler: (req, res) => {
        const healthData = self.health();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(healthData));
      },
    });

    // GET /routing-table
    routes.push({
      method: 'GET',
      path: '/routing-table',
      handler: (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          domains: self.getRoutingTable(),
          nodeStatus: Object.fromEntries(self._nodeStatus),
        }));
      },
    });

    return router;
  }

  /**
   * Health check with routing statistics.
   * @returns {Object}
   */
  health() {
    const availableNodes = [...this._nodeStatus.entries()]
      .filter(([_, s]) => s.available).length;
    const totalNodes = this._nodeStatus.size;

    return {
      service: 'conductor-router',
      version: this._version,
      status: availableNodes > 0 ? 'healthy' : 'degraded',
      phi_compliance: true,
      sacred_geometry_layer: 'Inner',
      uptime_ms: Date.now() - this._startTime,
      routing: {
        totalRoutes: this._routeCount,
        fallbackRoutes: this._fallbackCount,
        fallbackRate: this._routeCount > 0
          ? parseFloat((this._fallbackCount / this._routeCount).toFixed(fib(5)))
          : 0,
        domains: ROUTING_TABLE.length,
        availableNodes,
        totalNodes,
        nodeAvailability: parseFloat((availableNodes / totalNodes).toFixed(fib(4))),
      },
      auditLogSize: this._auditLog.length,
    };
  }

  /**
   * Graceful shutdown.
   */
  shutdown() {
    this._auditLog = [];
    this._nodeStatus.clear();
    this.removeAllListeners();
  }
}

// ─── MODULE EXPORTS ────────────────────────────────────────────────────────

module.exports = {
  // Router service
  ConductorRouter,

  // Classification
  classifyTask,
  assignPool,
  ROUTING_TABLE,
  DOMAIN_INDEX,

  // DAG
  DAGNode,
  topologicalSort,
  decomposeTask,

  // Arena
  arenaMode,
};
