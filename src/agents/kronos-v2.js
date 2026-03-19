/**
 * KRONOS v2 — Temporal Memory Indexer
 * P0 Priority | Hot Pool
 * Version: 2.0.0
 *
 * Extends KRONOS v1 (SEP-1686 task lifecycle) with:
 *   - Bi-level temporal knowledge graph G=(N,E,φ): nodes=entities, edges=time-stamped relations
 *   - Solves embedding collision: "revenue was $X in 2021 vs 2022" → time-aware retrieval
 *   - Edge invalidation: superseded facts marked invalid, not deleted (full audit history)
 *   - Temporal query: "latest", "as-of <date>", "between <t1> <t2>", "changelog since <t>"
 *   - φ-decay integration with Mnemosyne: edge weights decay by ψ per cycle unless reinforced
 *   - Zep/Graphiti pattern: dynamic graph updated on each memory ingest
 *
 * Graph structure:
 *   Node:  { id, type, label, embedding?, metadata, createdAt, updatedAt }
 *   Edge:  { id, fromId, toId, relation, value, validFrom, validTo|null, weight, invalidatedBy? }
 *
 * Sacred Geometry: Fibonacci-indexed time buckets, φ-decay on edge weights
 */
'use strict';

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// φ-decay: weight halves every φ cycles (mimics biological forgetting)
const PHI_DECAY_RATE = PSI; // multiply weight by PSI per cycle

// SEP-1686 task states (v1 preserved)
const TaskState = {
  PENDING: 'pending', RUNNING: 'running', COMPLETED: 'completed',
  FAILED: 'failed',   CANCELLED: 'cancelled', EXPIRED: 'expired', RETRYING: 'retrying'
};

class KronosV2Agent {
  constructor(opts = {}) {
    this.name    = 'KRONOS';
    this.version = '2.0.0';
    this.type    = 'bee';
    this.pool    = 'hot';

    // v1 task state
    this.tasks      = new Map();
    this.maxRetries = opts.maxRetries || 5;
    this.taskStore  = opts.taskStore || null;
    this._expiryInterval = null;
    this._metrics = { created: 0, completed: 0, failed: 0, retried: 0, expired: 0 };

    // v2 temporal graph
    this._nodes  = new Map();  // nodeId → Node
    this._edges  = new Map();  // edgeId → Edge
    this._nodeEdges = new Map(); // nodeId → Set<edgeId> (adjacency index)
    this._decayCycles = 0;
    this._decayInterval = null;

    // v2 options
    this.decayCycleMs   = opts.decayCycleMs   || Math.round(3600000 * PHI); // ~5832s
    this.pruneThreshold = opts.pruneThreshold || 0.01; // archive edges below this weight
  }

  // ─────────────────────────────────────────────────────────────────
  //  LIFECYCLE
  // ─────────────────────────────────────────────────────────────────

  async start() {
    try {
      this._expiryInterval = setInterval(() => this._expireTasks(),  Math.round(30000  * PHI));
      this._decayInterval  = setInterval(() => this._runPhiDecay(),  this.decayCycleMs);
      return { status: 'active', agent: this.name, version: this.version };
    } catch (err) {
      const failure = {
        type:    'agent_init_failure',
        agent:   this.name,
        version: this.version,
        error:   err.message,
        stack:   err.stack,
        ts:      Date.now(),
      };
      // Emit on process so orchestrators can react even without a direct reference
      process.emit('heady:agent:init_failure', failure);
      throw err;
    }
  }

  async stop() {
    if (this._expiryInterval) clearInterval(this._expiryInterval);
    if (this._decayInterval)  clearInterval(this._decayInterval);
  }

  // ─────────────────────────────────────────────────────────────────
  //  TEMPORAL GRAPH — Node Management
  // ─────────────────────────────────────────────────────────────────

  /**
   * Upsert a node in the temporal knowledge graph.
   * Returns the node record.
   */
  upsertNode(id, type, label, metadata = {}) {
    const existing = this._nodes.get(id);
    const node = {
      id, type, label, metadata,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    this._nodes.set(id, node);
    if (!this._nodeEdges.has(id)) this._nodeEdges.set(id, new Set());
    return node;
  }

  getNode(id) { return this._nodes.get(id) || null; }

  listNodes(type = null) {
    return Array.from(this._nodes.values()).filter(n => !type || n.type === type);
  }

  // ─────────────────────────────────────────────────────────────────
  //  TEMPORAL GRAPH — Edge Management (Time-Stamped Relations)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Add a temporal fact as a graph edge.
   * If a prior edge with same (fromId, toId, relation) exists and is still valid,
   * it is invalidated (superseded) before the new edge is created — full audit history preserved.
   *
   * @param {string} fromId - source node ID
   * @param {string} toId   - target node ID
   * @param {string} relation - relation type (e.g., "has_revenue", "employs", "located_at")
   * @param {*} value       - the fact value (number, string, object)
   * @param {number} [validFrom] - epoch ms; defaults to now
   * @param {Object} [metadata]
   */
  addEdge(fromId, toId, relation, value, validFrom = Date.now(), metadata = {}) {
    // Invalidate any currently-valid edges with same triple
    this._invalidatePriorEdges(fromId, toId, relation);

    const edgeId = `ke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const edge = {
      id: edgeId, fromId, toId, relation, value,
      validFrom, validTo: null, // null = currently valid
      weight:    1.0,           // starts at full weight; decays over time
      metadata,  invalidatedBy: null,
      createdAt: Date.now()
    };
    this._edges.set(edgeId, edge);
    this._nodeEdges.get(fromId)?.add(edgeId);
    this._nodeEdges.get(toId)?.add(edgeId);
    return edge;
  }

  /**
   * Invalidate an edge explicitly (e.g., fact retraction).
   */
  invalidateEdge(edgeId, reason = 'explicit_retraction') {
    const e = this._edges.get(edgeId);
    if (!e || e.validTo !== null) return false;
    e.validTo = Date.now();
    e.invalidatedBy = reason;
    return true;
  }

  // ─────────────────────────────────────────────────────────────────
  //  TEMPORAL QUERIES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get the latest valid value for (fromId, relation).
   * Solves: "What is the current revenue?" → returns most recent edge.
   */
  queryLatest(fromId, relation) {
    return this._edgesFrom(fromId)
      .filter(e => e.relation === relation && e.validTo === null)
      .sort((a, b) => b.validFrom - a.validFrom)[0] || null;
  }

  /**
   * Get the fact as-of a specific point in time.
   * Solves: "What was the revenue in 2022?" → time-appropriate answer.
   * @param {number} asOf - epoch ms
   */
  queryAsOf(fromId, relation, asOf) {
    return this._edgesFrom(fromId)
      .filter(e => e.relation === relation && e.validFrom <= asOf && (e.validTo === null || e.validTo > asOf))
      .sort((a, b) => b.validFrom - a.validFrom)[0] || null;
  }

  /**
   * Get all values between two timestamps (time-range scan).
   */
  queryRange(fromId, relation, t1, t2) {
    return this._edgesFrom(fromId)
      .filter(e => e.relation === relation && e.validFrom >= t1 && e.validFrom <= t2)
      .sort((a, b) => a.validFrom - b.validFrom);
  }

  /**
   * Changelog: all changes to (fromId, relation) since a given time.
   * Returns ordered history of values, perfect for "what changed since last week?"
   */
  changelog(fromId, relation, since = 0) {
    return this._edgesFrom(fromId)
      .filter(e => e.relation === relation && e.createdAt >= since)
      .sort((a, b) => a.validFrom - b.validFrom)
      .map(e => ({
        value:    e.value,
        validFrom: e.validFrom,
        validTo:  e.validTo,
        weight:   e.weight,
        current:  e.validTo === null
      }));
  }

  /**
   * Full neighborhood query: all valid relations from a node at a given time.
   */
  neighborhood(nodeId, asOf = Date.now()) {
    return this._edgesFrom(nodeId)
      .filter(e => e.validFrom <= asOf && (e.validTo === null || e.validTo > asOf))
      .map(e => ({ relation: e.relation, targetId: e.toId, value: e.value, weight: e.weight, validFrom: e.validFrom }));
  }

  // ─────────────────────────────────────────────────────────────────
  //  φ-DECAY INTEGRATION WITH MNEMOSYNE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Run one decay cycle — multiply all edge weights by PSI (φ-decay).
   * Edges below pruneThreshold are archived (validTo set, not deleted).
   * Called automatically at decayCycleMs interval.
   */
  _runPhiDecay() {
    this._decayCycles++;
    let decayed = 0, archived = 0;
    for (const [id, edge] of this._edges) {
      if (edge.validTo !== null) continue; // already invalid
      edge.weight = parseFloat((edge.weight * PHI_DECAY_RATE).toFixed(6));
      decayed++;
      if (edge.weight < this.pruneThreshold) {
        edge.validTo = Date.now();
        edge.invalidatedBy = `phi_decay_cycle_${this._decayCycles}`;
        archived++;
      }
    }
    return { decayCycle: this._decayCycles, decayed, archived, rate: PHI_DECAY_RATE };
  }

  /**
   * Reinforce an edge (called when a memory is accessed — resets weight toward 1.0).
   * Each reinforcement multiplies weight by PHI (up to max 1.0).
   */
  reinforceEdge(edgeId) {
    const e = this._edges.get(edgeId);
    if (!e || e.validTo !== null) return null;
    e.weight = Math.min(1.0, parseFloat((e.weight * PHI).toFixed(6)));
    return { edgeId, weight: e.weight };
  }

  /**
   * Get decay stats — useful for Mnemosyne consolidation decisions.
   */
  decayStats() {
    const all     = Array.from(this._edges.values());
    const valid   = all.filter(e => e.validTo === null);
    const weights = valid.map(e => e.weight);
    return {
      totalEdges:   all.length,
      validEdges:   valid.length,
      archivedEdges: all.length - valid.length,
      avgWeight:    weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0,
      decayCycles:  this._decayCycles,
      phi:          PHI, psi: PSI
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  SEP-1686 TASK LIFECYCLE (v1 preserved)
  // ─────────────────────────────────────────────────────────────────

  async createTask(taskDef) {
    const taskId = `kt2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const task = {
      id: taskId, type: taskDef.type || 'generic', state: TaskState.PENDING,
      input: taskDef.input || {}, output: null, error: null,
      createdAt: Date.now(), updatedAt: Date.now(),
      expiresAt: taskDef.ttlMs ? Date.now() + taskDef.ttlMs : Date.now() + Math.round(3600000 * PHI),
      retryCount: 0, maxRetries: taskDef.maxRetries || this.maxRetries,
      priority: taskDef.priority || 'normal', metadata: taskDef.metadata || {}
    };
    this.tasks.set(taskId, task);
    if (this.taskStore) await this.taskStore.put(`task:${taskId}`, JSON.stringify(task));
    this._metrics.created++;
    return task;
  }

  async updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    Object.assign(task, updates, { updatedAt: Date.now() });
    if (this.taskStore) await this.taskStore.put(`task:${taskId}`, JSON.stringify(task));
    if (updates.state === TaskState.COMPLETED) this._metrics.completed++;
    if (updates.state === TaskState.FAILED)    this._metrics.failed++;
    return task;
  }

  async retryTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.retryCount >= task.maxRetries) {
      await this.updateTask(taskId, { state: TaskState.FAILED, error: 'max_retries_exceeded' });
      return null;
    }
    // φ-backoff: wait PHI^attempt * 1618ms
    const backoffMs = Math.round(Math.pow(PHI, task.retryCount + 1) * 1618);
    task.retryCount++;
    this._metrics.retried++;
    await this.updateTask(taskId, { state: TaskState.RETRYING, retryCount: task.retryCount });
    return { taskId, retryCount: task.retryCount, backoffMs };
  }

  getTask(taskId)     { return this.tasks.get(taskId) || null; }
  getMetrics()        { return { ...this._metrics, activeTasks: this.tasks.size }; }

  health() {
    return {
      agent: this.name, version: this.version, status: 'healthy',
      activeTasks: this.tasks.size, graphNodes: this._nodes.size,
      graphEdges: this._edges.size, decayCycles: this._decayCycles,
      phi: PHI
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  INTERNAL
  // ─────────────────────────────────────────────────────────────────

  _edgesFrom(nodeId) {
    const ids = this._nodeEdges.get(nodeId) || new Set();
    return Array.from(ids).map(id => this._edges.get(id)).filter(Boolean);
  }

  _invalidatePriorEdges(fromId, toId, relation) {
    const ids = this._nodeEdges.get(fromId) || new Set();
    for (const id of ids) {
      const e = this._edges.get(id);
      if (e && e.toId === toId && e.relation === relation && e.validTo === null) {
        e.validTo = Date.now();
        e.invalidatedBy = 'superseded_by_newer_fact';
      }
    }
  }

  _expireTasks() {
    const now = Date.now();
    for (const [id, task] of this.tasks) {
      if (task.state === TaskState.PENDING || task.state === TaskState.RUNNING) {
        if (now > task.expiresAt) {
          task.state = TaskState.EXPIRED;
          task.updatedAt = now;
          this._metrics.expired++;
        }
      }
    }
  }
}

module.exports = { KronosV2Agent, TaskState, PHI, PSI, FIB };
