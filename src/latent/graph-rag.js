/**
 * ∞ Heady™ Graph RAG — Knowledge Graph + Retrieval Augmented Generation
 * Part of Heady™Systems™ Sovereign AI Platform v4.0.0
 * © 2026 Heady™Systems Inc. — Proprietary
 *
 * @module graph-rag
 * @description Combines vector similarity search with graph traversal for
 *   context-rich retrieval. Maintains a knowledge graph of typed nodes and
 *   edges, performs BFS/DFS traversal with depth limits, and assembles
 *   retrieved passages into a token-budget-aware context window for LLM
 *   consumption.
 *
 *   RAG retrieval pipeline:
 *     1. Vector search  → top-K candidate nodes by cosine similarity
 *     2. Graph expansion → BFS outward from candidates up to depth D
 *     3. Re-rank        → combine semantic score + graph centrality
 *     4. Context assembly → fit within token budget, with citations
 */

'use strict';

const { EventEmitter } = require('events');
const { cosineSimilarity, DIMS, isValidVector } = require('./vector-space-ops');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TOP_K = 10;
const DEFAULT_EXPANSION_DEPTH = 2;
const DEFAULT_TOKEN_BUDGET = 4096;
const TOKENS_PER_CHAR_ESTIMATE = 0.25; // ~4 chars per token
const GRAPH_CENTRALITY_WEIGHT = 0.3;  // Blend: 70% vector + 30% graph rank

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GraphNode
 * @property {string} id - Unique node identifier.
 * @property {string} type - Node type: 'component', 'concept', 'event', 'memory'.
 * @property {string} label - Human-readable label.
 * @property {Float32Array|null} vector - Optional 384D embedding.
 * @property {Object} content - The text/data content of this node.
 * @property {Object} metadata - Additional metadata.
 * @property {number} createdAt - Creation timestamp.
 * @property {number} updatedAt - Last update timestamp.
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} id - Unique edge identifier.
 * @property {string} source - Source node ID.
 * @property {string} target - Target node ID.
 * @property {string} label - Relationship type (e.g., 'uses', 'causes', 'references').
 * @property {number} weight - Edge weight in [0, 1].
 * @property {Object} metadata - Additional edge metadata.
 * @property {number} createdAt - Creation timestamp.
 */

// ---------------------------------------------------------------------------
// KnowledgeGraph
// ---------------------------------------------------------------------------

/**
 * Core knowledge graph with typed nodes and edges.
 * Provides BFS, DFS, and shortest-path traversal.
 */
class KnowledgeGraph {
  constructor() {
    /** @type {Map<string, GraphNode>} */
    this.nodes = new Map();
    /** @type {Map<string, GraphEdge>} */
    this.edges = new Map();
    /** @type {Map<string, Set<string>>} nodeId → Set of edge IDs (outgoing) */
    this.adjacency = new Map();
    /** @type {Map<string, Set<string>>} nodeId → Set of edge IDs (incoming) */
    this.reverseAdjacency = new Map();

    this._edgeCounter = 0;
    this._stats = { nodes: 0, edges: 0, queries: 0 };
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /**
   * Add a node to the graph.
   *
   * @param {string} id - Unique node ID.
   * @param {string} type - Node type.
   * @param {string} label - Display label.
   * @param {Object} content - Text/data content.
   * @param {Object} [options={}]
   * @param {Float32Array} [options.vector] - Optional 384D embedding.
   * @param {Object} [options.metadata={}]
   * @returns {GraphNode}
   */
  addNode(id, type, label, content, options = {}) {
    const now = Date.now();
    const node = {
      id,
      type,
      label,
      vector: options.vector instanceof Float32Array ? options.vector : null,
      content,
      metadata: options.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
    this.nodes.set(id, node);
    if (!this.adjacency.has(id)) this.adjacency.set(id, new Set());
    if (!this.reverseAdjacency.has(id)) this.reverseAdjacency.set(id, new Set());
    this._stats.nodes += 1;
    return node;
  }

  /**
   * Update an existing node's content and/or vector.
   *
   * @param {string} id
   * @param {Object} [contentUpdate] - Partial content update.
   * @param {Float32Array} [vector] - New vector.
   * @returns {boolean}
   */
  updateNode(id, contentUpdate, vector) {
    const node = this.nodes.get(id);
    if (!node) return false;
    if (contentUpdate) node.content = { ...node.content, ...contentUpdate };
    if (vector instanceof Float32Array) node.vector = vector;
    node.updatedAt = Date.now();
    return true;
  }

  /**
   * Remove a node and all its incident edges.
   *
   * @param {string} id
   * @returns {boolean}
   */
  removeNode(id) {
    if (!this.nodes.has(id)) return false;
    // Remove all edges involving this node.
    const outgoing = [...(this.adjacency.get(id) || [])];
    const incoming = [...(this.reverseAdjacency.get(id) || [])];
    for (const edgeId of [...outgoing, ...incoming]) {
      this._removeEdge(edgeId);
    }
    this.nodes.delete(id);
    this.adjacency.delete(id);
    this.reverseAdjacency.delete(id);
    this._stats.nodes = Math.max(0, this._stats.nodes - 1);
    return true;
  }

  /**
   * Add a directed edge between two nodes.
   *
   * @param {string} sourceId
   * @param {string} targetId
   * @param {string} [label='related'] - Relationship type.
   * @param {number} [weight=1.0] - Edge weight.
   * @param {Object} [metadata={}]
   * @returns {GraphEdge|null} Null if either node doesn't exist.
   */
  addEdge(sourceId, targetId, label = 'related', weight = 1.0, metadata = {}) {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return null;
    this._edgeCounter += 1;
    const edgeId = `e-${this._edgeCounter}`;
    const edge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      label,
      weight: Math.max(0, Math.min(1, weight)),
      metadata,
      createdAt: Date.now(),
    };
    this.edges.set(edgeId, edge);
    this.adjacency.get(sourceId).add(edgeId);
    this.reverseAdjacency.get(targetId).add(edgeId);
    this._stats.edges += 1;
    return edge;
  }

  /** @private */
  _removeEdge(edgeId) {
    const edge = this.edges.get(edgeId);
    if (!edge) return;
    this.adjacency.get(edge.source)?.delete(edgeId);
    this.reverseAdjacency.get(edge.target)?.delete(edgeId);
    this.edges.delete(edgeId);
    this._stats.edges = Math.max(0, this._stats.edges - 1);
  }

  // -------------------------------------------------------------------------
  // Traversal
  // -------------------------------------------------------------------------

  /**
   * BFS traversal from a starting node.
   *
   * @param {string} startId - Starting node ID.
   * @param {number} [maxDepth=3] - Maximum traversal depth.
   * @param {Object} [options={}]
   * @param {string|null} [options.edgeLabel=null] - Filter by edge label.
   * @param {string|null} [options.nodeType=null] - Filter result by node type.
   * @param {boolean} [options.directed=true] - Traverse directed edges only.
   * @returns {Array<{ node: GraphNode, depth: number, via: string[] }>}
   */
  bfs(startId, maxDepth = 3, options = {}) {
    const { edgeLabel = null, nodeType = null, directed = true } = options;
    if (!this.nodes.has(startId)) return [];

    const visited = new Set([startId]);
    const result = [];
    const queue = [{ id: startId, depth: 0, via: [] }];

    while (queue.length > 0) {
      const { id, depth, via } = queue.shift();
      if (depth >= maxDepth) continue;

      const edgeIds = [
        ...(this.adjacency.get(id) || []),
        ...(!directed ? (this.reverseAdjacency.get(id) || []) : []),
      ];

      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;
        if (edgeLabel && edge.label !== edgeLabel) continue;

        const nextId = directed
          ? (edge.source === id ? edge.target : null)
          : (edge.source === id ? edge.target : edge.source);
        if (!nextId || visited.has(nextId)) continue;

        const nextNode = this.nodes.get(nextId);
        if (!nextNode) continue;
        if (nodeType && nextNode.type !== nodeType) {
          visited.add(nextId);
          queue.push({ id: nextId, depth: depth + 1, via: [...via, edge.label] });
          continue;
        }
        visited.add(nextId);
        result.push({ node: nextNode, depth: depth + 1, via: [...via, edge.label], edgeLabel: edge.label });
        queue.push({ id: nextId, depth: depth + 1, via: [...via, edge.label] });
      }
    }
    return result;
  }

  /**
   * DFS traversal from a starting node.
   *
   * @param {string} startId
   * @param {number} [maxDepth=3]
   * @param {Object} [options={}]
   * @returns {Array<{ node: GraphNode, depth: number, via: string[] }>}
   */
  dfs(startId, maxDepth = 3, options = {}) {
    const { edgeLabel = null } = options;
    if (!this.nodes.has(startId)) return [];

    const visited = new Set([startId]);
    const result = [];

    const recurse = (id, depth, via) => {
      if (depth >= maxDepth) return;
      const edgeIds = this.adjacency.get(id) || new Set();
      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;
        if (edgeLabel && edge.label !== edgeLabel) continue;
        const nextId = edge.target;
        if (visited.has(nextId)) continue;
        visited.add(nextId);
        const nextNode = this.nodes.get(nextId);
        if (!nextNode) continue;
        result.push({ node: nextNode, depth: depth + 1, via: [...via, edge.label] });
        recurse(nextId, depth + 1, [...via, edge.label]);
      }
    };

    recurse(startId, 0, []);
    return result;
  }

  /**
   * Compute the in-degree centrality of a node (normalised by total nodes).
   *
   * @param {string} nodeId
   * @returns {number} Centrality in [0, 1].
   */
  getCentrality(nodeId) {
    const inDeg = (this.reverseAdjacency.get(nodeId) || new Set()).size;
    const total = Math.max(1, this.nodes.size - 1);
    return inDeg / total;
  }

  /**
   * Get a node by ID.
   * @param {string} id
   * @returns {GraphNode|null}
   */
  getNode(id) {
    return this.nodes.get(id) || null;
  }

  /**
   * Return graph statistics.
   * @returns {Object}
   */
  stats() {
    return { ...this._stats };
  }

  /**
   * Serialise graph to JSON-compatible object.
   * @returns {Object}
   */
  toJSON() {
    const nodes = [...this.nodes.values()].map(n => ({
      ...n,
      vector: n.vector ? Array.from(n.vector) : null,
    }));
    const edges = [...this.edges.values()];
    return { nodes, edges };
  }

  /**
   * Load graph from a JSON snapshot.
   * @param {Object} snapshot
   */
  fromJSON(snapshot) {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();
    this.reverseAdjacency.clear();

    for (const n of (snapshot.nodes || [])) {
      const node = { ...n, vector: n.vector ? new Float32Array(n.vector) : null };
      this.nodes.set(n.id, node);
      this.adjacency.set(n.id, new Set());
      this.reverseAdjacency.set(n.id, new Set());
    }
    for (const e of (snapshot.edges || [])) {
      this.edges.set(e.id, e);
      this.adjacency.get(e.source)?.add(e.id);
      this.reverseAdjacency.get(e.target)?.add(e.id);
    }
    this._stats.nodes = this.nodes.size;
    this._stats.edges = this.edges.size;
  }
}

// ---------------------------------------------------------------------------
// GraphRAG
// ---------------------------------------------------------------------------

/**
 * GraphRAG combines vector recall with knowledge-graph traversal to assemble
 * rich, context-aware retrieval for LLM consumption.
 *
 * @extends EventEmitter
 *
 * @fires GraphRAG#retrieval-complete
 */
class GraphRAG extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.memory - VectorMemory (or FederatedMemory) instance.
   * @param {KnowledgeGraph} [options.graph] - Optional shared graph (creates one if omitted).
   * @param {number} [options.topK=10] - Vector recall candidates.
   * @param {number} [options.expansionDepth=2] - BFS depth from candidates.
   * @param {number} [options.tokenBudget=4096] - Context window token budget.
   * @param {number} [options.centralityWeight=0.3] - Blend of graph centrality in ranking.
   */
  constructor(options) {
    super();
    if (!options.memory) throw new Error('GraphRAG: memory is required');
    this.memory = options.memory;
    this.graph = options.graph || new KnowledgeGraph();
    this.topK = options.topK || DEFAULT_TOP_K;
    this.expansionDepth = options.expansionDepth || DEFAULT_EXPANSION_DEPTH;
    this.tokenBudget = options.tokenBudget || DEFAULT_TOKEN_BUDGET;
    this.centralityWeight = options.centralityWeight !== undefined
      ? options.centralityWeight
      : GRAPH_CENTRALITY_WEIGHT;

    this._stats = {
      totalRetrievals: 0,
      avgContextTokens: 0,
      totalTokensAssembled: 0,
    };
  }

  // -------------------------------------------------------------------------
  // Retrieval
  // -------------------------------------------------------------------------

  /**
   * Full RAG retrieval: vector search → graph expansion → re-rank → context assembly.
   *
   * @param {Float32Array} queryVector - 384D query embedding.
   * @param {Object} [options={}]
   * @param {number} [options.topK] - Override default topK.
   * @param {number} [options.depth] - Override expansion depth.
   * @param {number} [options.tokenBudget] - Override token budget.
   * @param {'bfs'|'dfs'} [options.traversal='bfs'] - Graph traversal method.
   * @param {string|null} [options.edgeLabel=null] - Restrict expansion to edge type.
   * @returns {{ context: string, nodes: Object[], tokenCount: number, stats: Object }}
   *
   * @fires GraphRAG#retrieval-complete
   */
  async retrieve(queryVector, options = {}) {
    if (!isValidVector(queryVector, DIMS)) {
      throw new TypeError('GraphRAG.retrieve: invalid query vector');
    }
    const topK = options.topK || this.topK;
    const depth = options.depth !== undefined ? options.depth : this.expansionDepth;
    const tokenBudget = options.tokenBudget || this.tokenBudget;
    const traversal = options.traversal || 'bfs';
    const edgeLabel = options.edgeLabel || null;
    const startedAt = Date.now();

    // Step 1: Vector similarity search.
    const vectorResults = await Promise.resolve(this.memory.recall(queryVector, topK));

    // Step 2: Graph expansion from each candidate.
    const expandedSet = new Map(); // nodeId → { node, score }

    for (const { entry, similarity } of vectorResults) {
      const nodeId = entry.key;
      const base = similarity * (1 - this.centralityWeight);

      // Score the candidate itself.
      const graphNode = this.graph.getNode(nodeId);
      if (graphNode) {
        const centrality = this.graph.getCentrality(nodeId) * this.centralityWeight;
        const score = base + centrality;
        if (!expandedSet.has(nodeId) || expandedSet.get(nodeId).score < score) {
          expandedSet.set(nodeId, { node: graphNode, score, entry, depth: 0 });
        }
      }

      // BFS/DFS expansion.
      const expanded = traversal === 'dfs'
        ? this.graph.dfs(nodeId, depth, { edgeLabel })
        : this.graph.bfs(nodeId, depth, { edgeLabel });

      for (const { node, depth: nodeDepth } of expanded) {
        // Decay score with depth.
        const decayedBase = base * Math.pow(0.7, nodeDepth);
        const centrality = this.graph.getCentrality(node.id) * this.centralityWeight;
        const score = decayedBase + centrality;

        if (!expandedSet.has(node.id) || expandedSet.get(node.id).score < score) {
          // Re-score with vector similarity if node has a vector.
          let finalScore = score;
          if (node.vector) {
            const vecSim = cosineSimilarity(queryVector, node.vector);
            finalScore = (vecSim * (1 - this.centralityWeight) + centrality) * Math.pow(0.7, nodeDepth);
          }
          expandedSet.set(node.id, { node, score: finalScore, entry: null, depth: nodeDepth });
        }
      }
    }

    // Step 3: Re-rank by combined score.
    const ranked = [...expandedSet.values()].sort((a, b) => b.score - a.score);

    // Step 4: Assemble context within token budget.
    const { context, included, tokenCount } = this._assembleContext(ranked, queryVector, tokenBudget);

    this._stats.totalRetrievals += 1;
    this._stats.totalTokensAssembled += tokenCount;
    this._stats.avgContextTokens =
      this._stats.totalTokensAssembled / this._stats.totalRetrievals;

    const result = {
      context,
      nodes: included,
      tokenCount,
      candidateCount: expandedSet.size,
      durationMs: Date.now() - startedAt,
      stats: { ...this._stats },
    };

    /**
     * @event GraphRAG#retrieval-complete
     * @type {Object}
     */
    this.emit('retrieval-complete', result);
    return result;
  }

  // -------------------------------------------------------------------------
  // Context Assembly
  // -------------------------------------------------------------------------

  /**
   * Assemble a context string from ranked nodes within the token budget.
   * Each node contributes its content and a citation line.
   *
   * @private
   * @param {Array<{ node: GraphNode, score: number }>} ranked
   * @param {Float32Array} queryVector
   * @param {number} tokenBudget
   * @returns {{ context: string, included: Object[], tokenCount: number }}
   */
  _assembleContext(ranked, queryVector, tokenBudget) {
    const included = [];
    const parts = [];
    let estimatedTokens = 0;
    const charsPerToken = 1 / TOKENS_PER_CHAR_ESTIMATE; // ~4 chars per token

    for (const { node, score, depth } of ranked) {
      const contentStr = this._nodeToText(node);
      const nodeTokens = Math.ceil(contentStr.length * TOKENS_PER_CHAR_ESTIMATE);

      if (estimatedTokens + nodeTokens > tokenBudget) break;

      parts.push(contentStr);
      estimatedTokens += nodeTokens;
      included.push({
        id: node.id,
        type: node.type,
        label: node.label,
        score,
        depth: depth || 0,
        tokenContribution: nodeTokens,
      });
    }

    const context = parts.join('\n\n---\n\n');
    return { context, included, tokenCount: estimatedTokens };
  }

  /**
   * Convert a graph node to a text representation.
   * @private
   * @param {GraphNode} node
   * @returns {string}
   */
  _nodeToText(node) {
    const lines = [`[${node.type.toUpperCase()}] ${node.label} (${node.id})`];
    if (typeof node.content === 'string') {
      lines.push(node.content);
    } else if (node.content && typeof node.content === 'object') {
      if (node.content.text) lines.push(node.content.text);
      else if (node.content.description) lines.push(node.content.description);
      else lines.push(JSON.stringify(node.content));
    }
    // Add outgoing relations as context hints.
    const edgeIds = this.graph.adjacency.get(node.id);
    if (edgeIds && edgeIds.size > 0) {
      const relations = [];
      for (const edgeId of edgeIds) {
        const edge = this.graph.edges.get(edgeId);
        if (edge) {
          const target = this.graph.nodes.get(edge.target);
          if (target) relations.push(`${edge.label} → ${target.label}`);
        }
      }
      if (relations.length > 0) {
        lines.push(`Relations: ${relations.slice(0, 5).join('; ')}`);
      }
    }
    return lines.join('\n');
  }

  // -------------------------------------------------------------------------
  // Convenience methods
  // -------------------------------------------------------------------------

  /**
   * Add an entity node and store its vector in the knowledge graph.
   *
   * @param {string} id
   * @param {string} type
   * @param {string} label
   * @param {Object} content
   * @param {Float32Array} [vector]
   * @param {Object} [metadata]
   * @returns {GraphNode}
   */
  addEntity(id, type, label, content, vector, metadata = {}) {
    return this.graph.addNode(id, type, label, content, { vector, metadata });
  }

  /**
   * Add a typed relationship between two entities.
   *
   * @param {string} sourceId
   * @param {string} targetId
   * @param {string} [label='related']
   * @param {number} [weight=1.0]
   * @returns {GraphEdge|null}
   */
  addRelation(sourceId, targetId, label = 'related', weight = 1.0) {
    return this.graph.addEdge(sourceId, targetId, label, weight);
  }

  /**
   * Return GraphRAG statistics.
   * @returns {Object}
   */
  stats() {
    return {
      ...this._stats,
      graphStats: this.graph.stats(),
      topK: this.topK,
      expansionDepth: this.expansionDepth,
      tokenBudget: this.tokenBudget,
    };
  }
}


module.exports = { GraphRAG, KnowledgeGraph, DEFAULT_TOP_K, DEFAULT_EXPANSION_DEPTH, DEFAULT_TOKEN_BUDGET };
