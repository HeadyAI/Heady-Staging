/**
 * Heady Liquid Node Controller v3.0
 * Sacred Geometry v4.0 — φ-Weighted Lattice Intelligence
 *
 * Liquid Nodes are the fundamental units of the Heady mesh.
 * Each node exists simultaneously in:
 * - Physical space (server/container/runtime)
 * - Vector space (semantic embedding in Pinecone)
 * - Graph space (relationships in PostgreSQL)
 * - Message space (pub/sub channels in Redis)
 *
 * @module heady-liquid-nodes
 * @version 3.0.0
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@upstash/redis';
import pkg from 'pg';
import * as Sentry from '@sentry/node';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const { Pool } = pkg;

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const PHI = 1.6180339887;
const FIB_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/**
 * Node state machine states
 */
const NodeState = {
  CRYSTALLIZING: 'CRYSTALLIZING',
  FLUID: 'FLUID',
  FLOWING: 'FLOWING',
  MERGING: 'MERGING',
  SPLITTING: 'SPLITTING',
  DEGRADED: 'DEGRADED',
  DORMANT: 'DORMANT',
};

/**
 * Message types for mesh protocol
 */
const MessageType = {
  HEARTBEAT: 'HEARTBEAT',
  TASK: 'TASK',
  RESULT: 'RESULT',
  MERGE_REQUEST: 'MERGE_REQUEST',
  SPLIT_REQUEST: 'SPLIT_REQUEST',
  REBALANCE: 'REBALANCE',
  ACK: 'ACK',
  ERROR: 'ERROR',
};

/**
 * Node types in the system
 */
const NodeType = {
  CODEMAP: 'CODEMAP',
  JULES: 'JULES',
  OBSERVER: 'OBSERVER',
  BUILDER: 'BUILDER',
  ATLAS: 'ATLAS',
  PYTHIA: 'PYTHIA',
  COORDINATOR: 'COORDINATOR',
  MEMORY: 'MEMORY',
};

// ============================================================================
// ENVIRONMENT & VALIDATION
// ============================================================================

/**
 * Load and validate environment configuration
 */
function loadConfig() {
  const config = {
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      index: process.env.PINECONE_INDEX || 'heady-vectors',
      namespace: process.env.PINECONE_NAMESPACE || 'default',
      environment: process.env.PINECONE_ENVIRONMENT || 'production',
    },
    postgres: {
      host: process.env.NEON_HOST || 'localhost',
      port: parseInt(process.env.NEON_PORT || '5432'),
      database: process.env.NEON_DATABASE || 'heady',
      user: process.env.NEON_USER || 'postgres',
      password: process.env.NEON_PASSWORD || '',
      ssl: process.env.NEON_SSL === 'true',
    },
    redis: {
      url: process.env.UPSTASH_REDIS_URL || 'http://localhost:6379',
      token: process.env.UPSTASH_REDIS_TOKEN || '',
    },
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      enabled: process.env.SENTRY_ENABLED === 'true',
    },
    mesh: {
      maxNodes: parseInt(process.env.MAX_NODES || '100'),
      vectorDimension: parseInt(process.env.VECTOR_DIMENSION || '1536'),
      heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '5000'),
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '10000'),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      timeout: parseInt(process.env.OPERATION_TIMEOUT || '30000'),
    },
    nodeId: process.env.NODE_ID || `node-${uuidv4().slice(0, 8)}`,
    environment: process.env.NODE_ENV || 'production',
  };

  return config;
}

// ============================================================================
// CUSTOM ERROR TYPES
// ============================================================================

/**
 * Base error for mesh operations
 */
class MeshError extends Error {
  constructor(message, code = 'MESH_ERROR', context = {}) {
    super(message);
    this.name = 'MeshError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error for node not found
 */
class NodeNotFoundError extends MeshError {
  constructor(nodeId) {
    super(`Node not found: ${nodeId}`, 'NODE_NOT_FOUND', { nodeId });
    this.name = 'NodeNotFoundError';
  }
}

/**
 * Error for node capacity exceeded
 */
class CapacityExceededError extends MeshError {
  constructor(nodeId, current, max) {
    super(`Node capacity exceeded: ${current}/${max}`, 'CAPACITY_EXCEEDED', {
      nodeId,
      current,
      max,
    });
    this.name = 'CapacityExceededError';
  }
}

/**
 * Error for operation timeout
 */
class TimeoutError extends MeshError {
  constructor(operationId, duration) {
    super(`Operation timeout after ${duration}ms`, 'TIMEOUT', { operationId, duration });
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// SACRED GEOMETRY ENGINE
// ============================================================================

/**
 * Sacred Geometry Engine - φ-based optimization and lattice calculations
 */
class SacredGeometryEngine {
  constructor() {
    this.phi = PHI;
    this.fibonacci = FIB_SEQUENCE;
  }

  /**
   * Calculate next Fibonacci number in sequence
   * @param {number} n - Index in sequence
   * @returns {number} Fibonacci number
   */
  fibonacci(n) {
    if (n < this.fibonacci.length) return this.fibonacci[n];
    let a = this.fibonacci[this.fibonacci.length - 2];
    let b = this.fibonacci[this.fibonacci.length - 1];
    for (let i = this.fibonacci.length; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  /**
   * Generate golden spiral positions for node placement
   * @param {number} count - Number of positions to generate
   * @returns {Array<{x: number, y: number, z: number}>} 3D coordinates
   */
  goldenSpiralPlacement(count) {
    const positions = [];
    const goldenAngle = (2 * Math.PI) / (this.phi * this.phi);

    for (let i = 0; i < count; i++) {
      const angle = i * goldenAngle;
      const radius = Math.sqrt(i) * 0.5;
      const z = (i / count) * 2 - 1;

      positions.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        z,
        index: i,
      });
    }

    return positions;
  }

  /**
   * Partition data using Fibonacci ratios
   * @param {Array} data - Data to partition
   * @param {number} k - Number of partitions
   * @returns {Array<Array>} Partitioned data
   */
  fibonacciPartition(data, k) {
    if (k <= 1) return [data];

    const partitions = [];
    const fibSequence = this.fibonacci.slice(0, k).sort((a, b) => a - b);
    const total = fibSequence.reduce((a, b) => a + b, 0);
    const normalized = fibSequence.map((f) => f / total);

    let start = 0;
    for (let i = 0; i < k; i++) {
      const end = i === k - 1 ? data.length : Math.ceil(start + data.length * normalized[i]);
      partitions.push(data.slice(start, end));
      start = end;
    }

    return partitions;
  }

  /**
   * Score metrics using golden ratio weighting
   * @param {Object} metrics - Metrics object {metric: value}
   * @returns {number} φ-weighted score
   */
  phiWeightedScore(metrics) {
    const entries = Object.entries(metrics);
    let score = 0;
    let weight = 1;

    for (const [key, value] of entries) {
      score += value * weight;
      weight /= this.phi;
    }

    return score;
  }

  /**
   * Calculate vesica piscis overlap between two nodes' capabilities
   * Represents optimal overlap for node collaboration
   * @param {Array<string>} capA - Capabilities of node A
   * @param {Array<string>} capB - Capabilities of node B
   * @returns {number} Overlap coefficient (0-1)
   */
  vesicaPiscisOverlap(capA, capB) {
    const setA = new Set(capA);
    const setB = new Set(capB);
    const intersection = [...setA].filter((x) => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;

    if (union === 0) return 0;

    const jaccardIndex = intersection / union;
    // Vesica piscis formula: overlap is maximized at φ ratio
    return jaccardIndex * this.phi / (1 + this.phi);
  }

  /**
   * Calculate optimal lattice point for a new node given existing nodes
   * @param {Array<{x: number, y: number, z: number}>} existingPositions - Current positions
   * @returns {{x: number, y: number, z: number}} New position
   */
  findOptimalLatticePoint(existingPositions) {
    if (existingPositions.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const candidates = this.goldenSpiralPlacement(existingPositions.length + 1);
    let maxMinDistance = 0;
    let bestPosition = candidates[candidates.length - 1];

    for (const candidate of candidates) {
      let minDistance = Infinity;

      for (const existing of existingPositions) {
        const dist = Math.sqrt(
          Math.pow(candidate.x - existing.x, 2) +
          Math.pow(candidate.y - existing.y, 2) +
          Math.pow(candidate.z - existing.z, 2)
        );
        minDistance = Math.min(minDistance, dist);
      }

      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestPosition = candidate;
      }
    }

    return bestPosition;
  }
}

// ============================================================================
// STRUCTURED LOGGER
// ============================================================================

/**
 * Structured logger with correlation IDs
 */
class StructuredLogger {
  constructor(config) {
    this.config = config;
    this.correlationId = uuidv4();
  }

  /**
   * Format log entry as structured JSON
   * @private
   */
  _formatEntry(level, message, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      nodeId: this.config.nodeId,
      environment: this.config.environment,
      ...context,
    };
  }

  /**
   * Log at DEBUG level
   */
  debug(message, context) {
    const entry = this._formatEntry('DEBUG', message, context);
    console.debug(JSON.stringify(entry));
  }

  /**
   * Log at INFO level
   */
  info(message, context) {
    const entry = this._formatEntry('INFO', message, context);
    console.log(JSON.stringify(entry));
  }

  /**
   * Log at WARN level
   */
  warn(message, context) {
    const entry = this._formatEntry('WARN', message, context);
    console.warn(JSON.stringify(entry));
  }

  /**
   * Log at ERROR level
   */
  error(message, error, context = {}) {
    const entry = this._formatEntry('ERROR', message, {
      ...context,
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
    });
    console.error(JSON.stringify(entry));
  }

  /**
   * Create a child logger with new correlation ID
   */
  createChild() {
    const child = new StructuredLogger(this.config);
    return child;
  }

  /**
   * Set correlation ID for tracing
   */
  setCorrelationId(id) {
    this.correlationId = id;
  }
}

// ============================================================================
// LIQUID NODE
// ============================================================================

/**
 * LiquidNode - A fundamental unit of the Heady mesh
 * Exists simultaneously in physical, vector, graph, and message space
 */
class LiquidNode {
  /**
   * Create a new Liquid Node
   * @param {Object} options - Node configuration
   * @param {string} options.id - Unique node identifier
   * @param {string} options.type - Node type (CODEMAP, JULES, etc.)
   * @param {Array<number>} options.embedding - 1536-dim vector embedding
   * @param {Array<string>} options.capabilities - List of capabilities
   * @param {number} options.capacity - Maximum load capacity
   * @param {Object} options.position - {x, y, z} lattice position
   */
  constructor(options = {}) {
    this.id = options.id || `node-${uuidv4().slice(0, 8)}`;
    this.type = options.type || NodeType.MEMORY;
    this.embedding = options.embedding || Array(1536).fill(0);
    this.capabilities = options.capabilities || [];
    this.capacity = options.capacity || 1000;
    this.load = 0;
    this.state = NodeState.CRYSTALLIZING;
    this.position = options.position || { x: 0, y: 0, z: 0 };
    this.neighbors = [];
    this.metadata = options.metadata || {};
    this.createdAt = new Date();
    this.lastHeartbeat = new Date();
    this.taskQueue = [];
    this.metrics = {
      tasksProcessed: 0,
      errorsEncountered: 0,
      averageLatency: 0,
      uptime: 0,
    };
  }

  /**
   * Get current load percentage
   */
  getLoadPercentage() {
    return (this.load / this.capacity) * 100;
  }

  /**
   * Check if node is healthy
   */
  isHealthy() {
    const heartbeatAge = Date.now() - this.lastHeartbeat.getTime();
    return (
      this.state !== NodeState.DEGRADED &&
      this.state !== NodeState.DORMANT &&
      heartbeatAge < 30000 &&
      this.getLoadPercentage() < 95
    );
  }

  /**
   * Can this node accept more work?
   */
  canAcceptLoad(amount = 1) {
    return this.load + amount <= this.capacity && this.isHealthy();
  }

  /**
   * Update node load
   */
  updateLoad(amount) {
    this.load = Math.max(0, this.load + amount);
    if (this.load > this.capacity * 0.9) {
      this.state = NodeState.MERGING;
    }
  }

  /**
   * Record task completion
   */
  recordTaskCompletion(latency) {
    this.metrics.tasksProcessed++;
    const n = this.metrics.tasksProcessed;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (n - 1) + latency) / n;
  }

  /**
   * Record error
   */
  recordError(error) {
    this.metrics.errorsEncountered++;
  }

  /**
   * Transition to new state
   */
  transitionTo(newState) {
    const validTransitions = {
      [NodeState.CRYSTALLIZING]: [NodeState.FLUID, NodeState.DORMANT],
      [NodeState.FLUID]: [NodeState.FLOWING, NodeState.MERGING, NodeState.DEGRADED],
      [NodeState.FLOWING]: [NodeState.MERGING, NodeState.SPLITTING, NodeState.DEGRADED],
      [NodeState.MERGING]: [NodeState.FLUID, NodeState.DEGRADED],
      [NodeState.SPLITTING]: [NodeState.FLUID, NodeState.DEGRADED],
      [NodeState.DEGRADED]: [NodeState.FLUID, NodeState.DORMANT],
      [NodeState.DORMANT]: [NodeState.CRYSTALLIZING],
    };

    if (validTransitions[this.state]?.includes(newState)) {
      this.state = newState;
      return true;
    }

    return false;
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      position: this.position,
      capabilities: this.capabilities,
      load: this.load,
      capacity: this.capacity,
      loadPercentage: this.getLoadPercentage(),
      isHealthy: this.isHealthy(),
      neighbors: this.neighbors,
      metrics: this.metrics,
      createdAt: this.createdAt,
      lastHeartbeat: this.lastHeartbeat,
    };
  }
}

// ============================================================================
// VECTOR MEMORY (PINECONE INTEGRATION)
// ============================================================================

/**
 * VectorMemory - Pinecone-backed semantic memory system
 */
class VectorMemory {
  /**
   * Create a new VectorMemory instance
   * @param {Object} options - Configuration
   * @param {string} options.apiKey - Pinecone API key
   * @param {string} options.index - Index name
   * @param {string} options.namespace - Namespace
   * @param {StructuredLogger} options.logger - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || new StructuredLogger({});
    this.enabled = !!options.apiKey;

    if (this.enabled) {
      try {
        this.pinecone = new Pinecone({
          apiKey: options.apiKey,
          environment: options.environment || 'production',
        });
        this.index = this.pinecone.Index(options.index || 'heady-vectors');
        this.namespace = options.namespace || 'default';
      } catch (error) {
        this.logger.warn('Pinecone initialization failed, vector memory disabled', {
          error: error.message,
        });
        this.enabled = false;
      }
    }

    this.memoryMap = new Map();
    this.vectorDimension = options.vectorDimension || 1536;
  }

  /**
   * Generate embedding for content (mock implementation)
   * In production, use OpenAI embeddings API
   * @private
   */
  _generateEmbedding(content) {
    const hash = crypto.createHash('sha256').update(content).digest();
    const embedding = [];
    for (let i = 0; i < this.vectorDimension; i++) {
      embedding.push((hash[i % hash.length] - 128) / 256);
    }
    return embedding;
  }

  /**
   * Store content in vector memory
   * @param {string} key - Unique key
   * @param {string} content - Content to embed and store
   * @param {Object} metadata - Additional metadata
   */
  async store(key, content, metadata = {}) {
    try {
      const embedding = this._generateEmbedding(content);
      const id = `mem-${crypto.randomBytes(8).toString('hex')}`;

      // Store in local memory map
      this.memoryMap.set(key, {
        id,
        content,
        embedding,
        metadata,
        storedAt: new Date(),
        accessCount: 0,
      });

      // Store in Pinecone if enabled
      if (this.enabled) {
        await this.index.upsert([
          {
            id,
            values: embedding,
            metadata: {
              key,
              content: content.slice(0, 1000),
              ...metadata,
              timestamp: Date.now(),
            },
          },
        ]);
      }

      this.logger.debug('Memory stored', { key, id, contentLength: content.length });
      return id;
    } catch (error) {
      this.logger.error('Failed to store memory', error, { key });
      throw error;
    }
  }

  /**
   * Recall memories similar to query
   * @param {string} query - Query string
   * @param {number} topK - Number of results
   * @param {Object} filter - Optional metadata filter
   */
  async recall(query, topK = 5, filter = {}) {
    try {
      const queryEmbedding = this._generateEmbedding(query);
      const results = [];

      // Search in local memory map
      for (const [key, memory] of this.memoryMap.entries()) {
        const similarity = this._cosineSimilarity(queryEmbedding, memory.embedding);
        results.push({
          key,
          similarity,
          content: memory.content,
          metadata: memory.metadata,
        });
        memory.accessCount++;
      }

      // Sort by similarity and return top K
      return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    } catch (error) {
      this.logger.error('Failed to recall memories', error, { query });
      throw error;
    }
  }

  /**
   * Remove memory by key
   * @param {string} key - Memory key
   */
  async forget(key) {
    if (this.memoryMap.has(key)) {
      const memory = this.memoryMap.get(key);
      this.memoryMap.delete(key);

      if (this.enabled) {
        await this.index.deleteOne(memory.id);
      }

      this.logger.debug('Memory forgotten', { key });
      return true;
    }

    return false;
  }

  /**
   * Consolidate similar memories to reduce redundancy
   */
  async consolidate() {
    try {
      const threshold = 0.85;
      const memories = Array.from(this.memoryMap.entries());
      const toDelete = new Set();

      for (let i = 0; i < memories.length; i++) {
        if (toDelete.has(memories[i][0])) continue;

        for (let j = i + 1; j < memories.length; j++) {
          if (toDelete.has(memories[j][0])) continue;

          const similarity = this._cosineSimilarity(
            memories[i][1].embedding,
            memories[j][1].embedding
          );

          if (similarity > threshold) {
            // Keep the more frequently accessed one
            const toRemove =
              memories[i][1].accessCount > memories[j][1].accessCount
                ? memories[j][0]
                : memories[i][0];
            toDelete.add(toRemove);
          }
        }
      }

      for (const key of toDelete) {
        await this.forget(key);
      }

      this.logger.info('Memory consolidated', { memoriesRemoved: toDelete.size });
      return toDelete.size;
    } catch (error) {
      this.logger.error('Failed to consolidate memories', error);
      throw error;
    }
  }

  /**
   * Find unexpected connections between distant memories
   */
  async dream() {
    try {
      const memories = Array.from(this.memoryMap.values());
      if (memories.length < 2) return [];

      const connections = [];
      const threshold = 0.6;

      for (let i = 0; i < memories.length; i++) {
        for (let j = i + 1; j < memories.length; j++) {
          const similarity = this._cosineSimilarity(
            memories[i].embedding,
            memories[j].embedding
          );

          if (similarity > threshold && similarity < 0.95) {
            connections.push({
              from: memories[i].id,
              to: memories[j].id,
              similarity,
              potentialInsight: `Unexpected connection: ${memories[i].content.slice(0, 50)} <-> ${memories[j].content.slice(0, 50)}`,
            });
          }
        }
      }

      return connections.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      this.logger.error('Failed to dream', error);
      throw error;
    }
  }

  /**
   * Get visualization-ready memory map
   */
  getMemoryMap() {
    const map = [];
    for (const [key, memory] of this.memoryMap.entries()) {
      map.push({
        key,
        id: memory.id,
        accessCount: memory.accessCount,
        metadata: memory.metadata,
        storedAt: memory.storedAt,
      });
    }
    return map;
  }

  /**
   * Calculate cosine similarity between embeddings
   * @private
   */
  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// ============================================================================
// MESH PROTOCOL
// ============================================================================

/**
 * MeshProtocol - Inter-node communication and coordination
 */
class MeshProtocol {
  /**
   * Create a new MeshProtocol instance
   * @param {Object} options - Configuration
   * @param {string} options.redisUrl - Redis URL
   * @param {string} options.redisToken - Redis token
   * @param {StructuredLogger} options.logger - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || new StructuredLogger({});
    this.nodeId = options.nodeId || `node-${uuidv4().slice(0, 8)}`;
    this.enabled = !!options.redisUrl;
    this.subscriptions = new Map();
    this.circuitBreakers = new Map();
    this.messageLog = [];
    this.maxMessageLogSize = 1000;

    if (this.enabled) {
      try {
        this.redis = createClient({
          url: options.redisUrl,
          token: options.redisToken,
        });
      } catch (error) {
        this.logger.warn('Redis initialization failed, mesh protocol disabled', {
          error: error.message,
        });
        this.enabled = false;
      }
    }
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (!this.enabled) return;

    try {
      await this.redis.connect();
      this.logger.info('Connected to Redis mesh protocol');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      this.enabled = false;
    }
  }

  /**
   * Publish a message to a channel
   * @param {string} channel - Channel name
   * @param {Object} message - Message object
   */
  async publish(channel, message) {
    if (!this.enabled) return false;

    try {
      const envelope = {
        id: uuidv4(),
        type: message.type || MessageType.TASK,
        from: this.nodeId,
        to: channel,
        correlationId: message.correlationId || uuidv4(),
        timestamp: Date.now(),
        payload: message.payload || {},
      };

      await this.redis.publish(channel, JSON.stringify(envelope));

      this._recordMessage(envelope);
      this.logger.debug('Message published', {
        channel,
        messageType: envelope.type,
        messageId: envelope.id,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to publish message', error, { channel });
      return false;
    }
  }

  /**
   * Subscribe to a channel
   * @param {string} channel - Channel name
   * @param {Function} handler - Message handler
   */
  async subscribe(channel, handler) {
    if (!this.enabled) return false;

    try {
      const pubsub = await this.redis.subscribe(channel);

      pubsub.onMessage((message) => {
        try {
          const envelope = JSON.parse(message);
          this._recordMessage(envelope);
          handler(envelope);
        } catch (error) {
          this.logger.error('Failed to handle message', error, { channel });
        }
      });

      this.subscriptions.set(channel, { pubsub, handler });
      this.logger.info('Subscribed to channel', { channel });

      return true;
    } catch (error) {
      this.logger.error('Failed to subscribe to channel', error, { channel });
      return false;
    }
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel name
   */
  async unsubscribe(channel) {
    if (this.subscriptions.has(channel)) {
      const { pubsub } = this.subscriptions.get(channel);
      await pubsub.unsubscribe();
      this.subscriptions.delete(channel);
      this.logger.info('Unsubscribed from channel', { channel });
      return true;
    }
    return false;
  }

  /**
   * Check circuit breaker status for a connection
   * @param {string} nodeId - Target node ID
   */
  isCircuitBreakerOpen(nodeId) {
    if (!this.circuitBreakers.has(nodeId)) {
      return false;
    }

    const breaker = this.circuitBreakers.get(nodeId);
    const now = Date.now();

    if (breaker.state === 'OPEN') {
      if (now - breaker.openedAt > 30000) {
        breaker.state = 'HALF_OPEN';
        breaker.failureCount = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record failure for circuit breaker
   * @param {string} nodeId - Target node ID
   */
  recordFailure(nodeId) {
    if (!this.circuitBreakers.has(nodeId)) {
      this.circuitBreakers.set(nodeId, {
        state: 'CLOSED',
        failureCount: 0,
        openedAt: null,
      });
    }

    const breaker = this.circuitBreakers.get(nodeId);
    breaker.failureCount++;

    if (breaker.failureCount >= 5) {
      breaker.state = 'OPEN';
      breaker.openedAt = Date.now();
      this.logger.warn('Circuit breaker opened', { nodeId, failureCount: breaker.failureCount });
    }
  }

  /**
   * Record success for circuit breaker
   * @param {string} nodeId - Target node ID
   */
  recordSuccess(nodeId) {
    if (this.circuitBreakers.has(nodeId)) {
      const breaker = this.circuitBreakers.get(nodeId);
      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        breaker.failureCount = 0;
        this.logger.info('Circuit breaker closed', { nodeId });
      }
    }
  }

  /**
   * Record message in log
   * @private
   */
  _recordMessage(envelope) {
    this.messageLog.push({
      ...envelope,
      recordedAt: Date.now(),
    });

    if (this.messageLog.length > this.maxMessageLogSize) {
      this.messageLog = this.messageLog.slice(-this.maxMessageLogSize);
    }
  }

  /**
   * Get message log
   */
  getMessageLog(limit = 100) {
    return this.messageLog.slice(-limit);
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.enabled && this.redis) {
      for (const channel of this.subscriptions.keys()) {
        await this.unsubscribe(channel);
      }
      await this.redis.quit();
      this.logger.info('Disconnected from Redis mesh protocol');
    }
  }
}

// ============================================================================
// LATTICE CONTROLLER
// ============================================================================

/**
 * LatticeController - Manages the φ-weighted lattice of liquid nodes
 */
class LatticeController {
  /**
   * Create a new LatticeController
   * @param {Object} options - Configuration
   * @param {number} options.maxNodes - Maximum nodes in lattice
   * @param {StructuredLogger} options.logger - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || new StructuredLogger({});
    this.nodes = new Map();
    this.maxNodes = options.maxNodes || 100;
    this.geometry = new SacredGeometryEngine();
    this.positions = [];
  }

  /**
   * Add a node to the lattice
   * @param {LiquidNode} node - Node to add
   */
  addNode(node) {
    if (this.nodes.size >= this.maxNodes) {
      throw new CapacityExceededError('lattice', this.nodes.size, this.maxNodes);
    }

    // Find optimal lattice position
    const optimalPos = this.geometry.findOptimalLatticePoint(this.positions);
    node.position = optimalPos;
    this.positions.push(optimalPos);

    this.nodes.set(node.id, node);
    node.transitionTo(NodeState.FLUID);

    this.logger.info('Node added to lattice', {
      nodeId: node.id,
      nodeType: node.type,
      position: optimalPos,
      latticeSize: this.nodes.size,
    });

    return node;
  }

  /**
   * Remove a node from the lattice
   * @param {string} nodeId - Node ID
   */
  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new NodeNotFoundError(nodeId);
    }

    // Drain tasks from node before removing
    if (node.taskQueue.length > 0) {
      this.logger.warn('Draining tasks from node before removal', {
        nodeId,
        taskCount: node.taskQueue.length,
      });
    }

    node.transitionTo(NodeState.DORMANT);
    this.nodes.delete(nodeId);

    // Remove from positions
    const posIndex = this.positions.indexOf(node.position);
    if (posIndex !== -1) {
      this.positions.splice(posIndex, 1);
    }

    this.logger.info('Node removed from lattice', {
      nodeId,
      latticeSize: this.nodes.size,
    });

    return true;
  }

  /**
   * Find nearest nodes to a query vector
   * @param {Array<number>} queryVector - Query embedding
   * @param {number} k - Number of neighbors
   */
  findNearest(queryVector, k = 3) {
    const distances = [];

    for (const [nodeId, node] of this.nodes.entries()) {
      const distance = this._cosineSimilarity(queryVector, node.embedding);
      distances.push({ nodeId, distance, node });
    }

    return distances.sort((a, b) => b.distance - a.distance).slice(0, k);
  }

  /**
   * Get the full topology of the lattice
   */
  getTopology() {
    const nodes = [];
    const edges = [];

    for (const [nodeId, node] of this.nodes.entries()) {
      nodes.push({
        id: nodeId,
        type: node.type,
        state: node.state,
        position: node.position,
        capabilities: node.capabilities,
        load: node.load,
        capacity: node.capacity,
        isHealthy: node.isHealthy(),
      });
    }

    // Build adjacency edges based on proximity
    for (let i = 0; i < this.positions.length; i++) {
      for (let j = i + 1; j < this.positions.length; j++) {
        const dist = Math.sqrt(
          Math.pow(this.positions[i].x - this.positions[j].x, 2) +
          Math.pow(this.positions[i].y - this.positions[j].y, 2) +
          Math.pow(this.positions[i].z - this.positions[j].z, 2)
        );

        if (dist < 2.0) {
          const nodeIds = Array.from(this.nodes.keys());
          edges.push({
            from: nodeIds[i],
            to: nodeIds[j],
            distance: dist,
          });
        }
      }
    }

    return {
      nodes,
      edges,
      statistics: {
        totalNodes: this.nodes.size,
        healthyNodes: Array.from(this.nodes.values()).filter((n) => n.isHealthy()).length,
        averageLoad: Array.from(this.nodes.values()).reduce((sum, n) => sum + n.load, 0) /
          Math.max(1, this.nodes.size),
        maxCapacity: this.maxNodes,
      },
    };
  }

  /**
   * Route a task to the best node(s)
   * @param {Object} task - Task object
   * @param {Array<number>} task.embedding - Task embedding vector
   * @param {number} task.requiredCapacity - Capacity needed
   * @param {Array<string>} task.requiredCapabilities - Required capabilities
   */
  routeTask(task) {
    const candidates = [];

    for (const [nodeId, node] of this.nodes.entries()) {
      if (!node.canAcceptLoad(task.requiredCapacity || 1)) {
        continue;
      }

      // Check capability match
      if (task.requiredCapabilities?.length) {
        const hasAllCapabilities = task.requiredCapabilities.every((cap) =>
          node.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) continue;
      }

      // Calculate routing score
      const embeddingSimilarity = this._cosineSimilarity(
        task.embedding || Array(1536).fill(0),
        node.embedding
      );
      const loadFactor = 1 - node.getLoadPercentage() / 100;
      const score = embeddingSimilarity * 0.6 + loadFactor * 0.4;

      candidates.push({
        nodeId,
        node,
        score,
        embeddingSimilarity,
        loadFactor,
      });
    }

    if (candidates.length === 0) {
      throw new MeshError('No suitable nodes found for task routing', 'NO_SUITABLE_NODES', {
        requiredCapacity: task.requiredCapacity,
        requiredCapabilities: task.requiredCapabilities,
      });
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Rebalance the lattice to maintain φ-spacing
   */
  rebalanceLattice() {
    const nodeIds = Array.from(this.nodes.keys());
    const newPositions = this.geometry.goldenSpiralPlacement(nodeIds.length);

    for (let i = 0; i < nodeIds.length; i++) {
      const node = this.nodes.get(nodeIds[i]);
      const newPos = newPositions[i];

      this.logger.debug('Node repositioned during rebalance', {
        nodeId: nodeIds[i],
        oldPosition: node.position,
        newPosition: newPos,
      });

      node.position = newPos;
    }

    this.positions = newPositions;

    this.logger.info('Lattice rebalanced', {
      nodeCount: this.nodes.size,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Calculate cosine similarity
   * @private
   */
  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// ============================================================================
// NODE ORCHESTRATOR
// ============================================================================

/**
 * NodeOrchestrator - Coordinates multi-node operations
 */
class NodeOrchestrator {
  /**
   * Create a new NodeOrchestrator
   * @param {Object} options - Configuration
   * @param {LatticeController} options.lattice - Lattice controller
   * @param {MeshProtocol} options.meshProtocol - Mesh protocol
   * @param {StructuredLogger} options.logger - Logger instance
   * @param {number} options.timeout - Operation timeout
   */
  constructor(options = {}) {
    this.lattice = options.lattice;
    this.meshProtocol = options.meshProtocol || new MeshProtocol();
    this.logger = options.logger || new StructuredLogger({});
    this.timeout = options.timeout || 30000;
    this.operations = new Map();
  }

  /**
   * Execute tasks in parallel across multiple nodes
   * @param {Array<Object>} tasks - Array of tasks
   */
  async parallel(tasks) {
    const operationId = uuidv4();
    const correlationId = uuidv4();
    const startTime = Date.now();

    this.logger.info('Starting parallel operation', {
      operationId,
      correlationId,
      taskCount: tasks.length,
    });

    try {
      const promises = tasks.map(async (task, index) => {
        const candidates = this.lattice.routeTask(task);
        if (candidates.length === 0) {
          throw new MeshError(`No suitable node for task ${index}`);
        }

        const targetNode = candidates[0].node;
        targetNode.updateLoad(task.requiredCapacity || 1);
        targetNode.taskQueue.push(task);

        await this.meshProtocol.publish(`node:${targetNode.id}`, {
          type: MessageType.TASK,
          correlationId,
          payload: {
            taskId: task.id || uuidv4(),
            taskIndex: index,
            task,
          },
        });

        return {
          taskIndex: index,
          nodeId: targetNode.id,
          submitted: true,
        };
      });

      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      this.logger.info('Parallel operation completed', {
        operationId,
        successful,
        failed,
        duration,
      });

      return {
        operationId,
        correlationId,
        successful,
        failed,
        duration,
        results: results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason })),
      };
    } catch (error) {
      this.logger.error('Parallel operation failed', error, { operationId, correlationId });
      throw error;
    }
  }

  /**
   * Execute stages in sequence with data flowing between nodes
   * @param {Array<Object>} stages - Array of stage configurations
   */
  async pipeline(stages) {
    const operationId = uuidv4();
    const correlationId = uuidv4();
    const startTime = Date.now();

    this.logger.info('Starting pipeline operation', {
      operationId,
      correlationId,
      stageCount: stages.length,
    });

    try {
      let pipelineData = {};

      for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
        const stage = stages[stageIndex];
        const stageId = `stage-${stageIndex}`;

        const candidates = this.lattice.routeTask(stage.task || {});
        if (candidates.length === 0) {
          throw new MeshError(`No suitable node for stage ${stageIndex}`);
        }

        const targetNode = candidates[0].node;
        targetNode.updateLoad(1);

        const stagePayload = {
          stageId,
          stageIndex,
          input: pipelineData,
          task: stage.task,
        };

        await this.meshProtocol.publish(`node:${targetNode.id}`, {
          type: MessageType.TASK,
          correlationId,
          payload: stagePayload,
        });

        pipelineData = {
          stageId,
          output: stage.processFn ? stage.processFn(pipelineData) : pipelineData,
        };
      }

      const duration = Date.now() - startTime;

      this.logger.info('Pipeline operation completed', {
        operationId,
        stageCount: stages.length,
        duration,
      });

      return {
        operationId,
        correlationId,
        stageCount: stages.length,
        finalData: pipelineData,
        duration,
      };
    } catch (error) {
      this.logger.error('Pipeline operation failed', error, { operationId, correlationId });
      throw error;
    }
  }

  /**
   * Scatter a task to multiple nodes
   * @param {Object} task - Task to scatter
   * @param {Array<LiquidNode>} nodes - Target nodes
   */
  async scatter(task, nodes) {
    const operationId = uuidv4();
    const correlationId = uuidv4();

    this.logger.info('Scattering task to nodes', {
      operationId,
      correlationId,
      nodeCount: nodes.length,
    });

    const promises = nodes.map(async (node) => {
      if (!node.canAcceptLoad(task.requiredCapacity || 1)) {
        this.logger.warn('Node cannot accept load', {
          nodeId: node.id,
          requiredCapacity: task.requiredCapacity,
        });
        return { nodeId: node.id, status: 'rejected', reason: 'INSUFFICIENT_CAPACITY' };
      }

      node.updateLoad(task.requiredCapacity || 1);
      node.taskQueue.push(task);

      await this.meshProtocol.publish(`node:${node.id}`, {
        type: MessageType.TASK,
        correlationId,
        payload: {
          taskId: task.id || uuidv4(),
          task,
        },
      });

      return { nodeId: node.id, status: 'submitted' };
    });

    const results = await Promise.allSettled(promises);

    return {
      operationId,
      correlationId,
      submitted: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
      results: results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason })),
    };
  }

  /**
   * Gather results from multiple nodes
   * @param {Array<string>} nodeIds - Node IDs to gather from
   * @param {string} resultChannel - Channel to listen for results
   */
  async gather(nodeIds, resultChannel) {
    const operationId = uuidv4();
    const results = [];
    const timeout = this.timeout;

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new TimeoutError(operationId, timeout));
      }, timeout);

      const handler = (message) => {
        if (message.type === MessageType.RESULT && message.from) {
          results.push({
            from: message.from,
            payload: message.payload,
            timestamp: message.timestamp,
          });

          if (results.length === nodeIds.length) {
            clearTimeout(timeoutHandle);
            this.meshProtocol.unsubscribe(resultChannel).then(() => {
              resolve({
                operationId,
                resultCount: results.length,
                results,
              });
            });
          }
        }
      };

      this.meshProtocol.subscribe(resultChannel, handler).catch((error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });

      this.logger.info('Gathering results', {
        operationId,
        expectedCount: nodeIds.length,
        resultChannel,
      });
    });
  }

  /**
   * Execute distributed map-reduce across nodes
   * @param {Array} data - Data to process
   * @param {Function} mapFn - Map function
   * @param {Function} reduceFn - Reduce function
   */
  async mapReduce(data, mapFn, reduceFn) {
    const operationId = uuidv4();
    const correlationId = uuidv4();
    const startTime = Date.now();

    this.logger.info('Starting map-reduce operation', {
      operationId,
      correlationId,
      dataSize: data.length,
    });

    try {
      // Partition data using Fibonacci ratios
      const geometry = new SacredGeometryEngine();
      const healthyNodes = Array.from(this.lattice.nodes.values()).filter((n) =>
        n.isHealthy()
      );

      if (healthyNodes.length === 0) {
        throw new MeshError('No healthy nodes available for map-reduce');
      }

      const partitions = geometry.fibonacciPartition(data, healthyNodes.length);

      // Map phase
      const mapPromises = healthyNodes.map(async (node, index) => {
        const partition = partitions[index];
        node.updateLoad(partition.length);

        const mapResult = partition.map((item) => mapFn(item));

        return { nodeId: node.id, results: mapResult };
      });

      const mapResults = await Promise.allSettled(mapPromises);

      // Reduce phase
      let accumulated = [];

      for (const result of mapResults) {
        if (result.status === 'fulfilled') {
          accumulated = accumulated.concat(result.value.results);
        }
      }

      const reduceResult = accumulated.reduce((acc, item) => reduceFn(acc, item), null);

      const duration = Date.now() - startTime;

      this.logger.info('Map-reduce operation completed', {
        operationId,
        duration,
        dataSize: data.length,
        partitionCount: partitions.length,
      });

      return {
        operationId,
        correlationId,
        result: reduceResult,
        duration,
        processedItems: accumulated.length,
      };
    } catch (error) {
      this.logger.error('Map-reduce operation failed', error, { operationId, correlationId });
      throw error;
    }
  }
}

// ============================================================================
// HEALTH MESH
// ============================================================================

/**
 * HealthMesh - Self-healing network with continuous monitoring
 */
class HealthMesh {
  /**
   * Create a new HealthMesh
   * @param {Object} options - Configuration
   * @param {LatticeController} options.lattice - Lattice controller
   * @param {MeshProtocol} options.meshProtocol - Mesh protocol
   * @param {StructuredLogger} options.logger - Logger instance
   * @param {number} options.heartbeatInterval - Interval between heartbeats
   * @param {number} options.healthCheckInterval - Interval between health checks
   */
  constructor(options = {}) {
    this.lattice = options.lattice;
    this.meshProtocol = options.meshProtocol;
    this.logger = options.logger || new StructuredLogger({});
    this.heartbeatInterval = options.heartbeatInterval || 5000;
    this.healthCheckInterval = options.healthCheckInterval || 10000;
    this.isRunning = false;
    this.heartbeatHandle = null;
    this.healthCheckHandle = null;
  }

  /**
   * Start health monitoring
   */
  async start() {
    this.isRunning = true;

    this.heartbeatHandle = setInterval(() => {
      this._sendHeartbeats();
    }, this.heartbeatInterval);

    this.healthCheckHandle = setInterval(() => {
      this._performHealthCheck();
    }, this.healthCheckInterval);

    this.logger.info('Health mesh started', {
      heartbeatInterval: this.heartbeatInterval,
      healthCheckInterval: this.healthCheckInterval,
    });
  }

  /**
   * Stop health monitoring
   */
  async stop() {
    this.isRunning = false;

    if (this.heartbeatHandle) {
      clearInterval(this.heartbeatHandle);
    }

    if (this.healthCheckHandle) {
      clearInterval(this.healthCheckHandle);
    }

    this.logger.info('Health mesh stopped');
  }

  /**
   * Send heartbeats to all nodes
   * @private
   */
  async _sendHeartbeats() {
    for (const [nodeId, node] of this.lattice.nodes.entries()) {
      node.lastHeartbeat = new Date();

      await this.meshProtocol.publish(`node:${nodeId}`, {
        type: MessageType.HEARTBEAT,
        payload: {
          nodeId: nodeId,
          timestamp: Date.now(),
          latticeSize: this.lattice.nodes.size,
        },
      });
    }
  }

  /**
   * Perform health check on all nodes
   * @private
   */
  async _performHealthCheck() {
    const topology = this.lattice.getTopology();
    const degradedNodes = [];
    const healthyNodes = [];

    for (const nodeInfo of topology.nodes) {
      if (nodeInfo.isHealthy) {
        healthyNodes.push(nodeInfo.id);
      } else {
        degradedNodes.push(nodeInfo.id);
      }
    }

    // If we have degraded nodes, try to redistribute their work
    if (degradedNodes.length > 0) {
      this.logger.warn('Degraded nodes detected', {
        degradedCount: degradedNodes.length,
        degradedNodes,
      });

      await this._redistributeLoad(degradedNodes);
    }

    // If we have too many degraded nodes, trigger lattice repair
    if (degradedNodes.length > topology.nodes.length * 0.3) {
      this.logger.warn('Too many degraded nodes, triggering lattice repair', {
        degradedRatio: degradedNodes.length / topology.nodes.length,
      });

      await this._repairLattice();
    }

    this.logger.debug('Health check completed', {
      healthyNodes: healthyNodes.length,
      degradedNodes: degradedNodes.length,
      totalNodes: topology.nodes.length,
    });
  }

  /**
   * Redistribute load from degraded nodes
   * @private
   */
  async _redistributeLoad(degradedNodeIds) {
    for (const degradedId of degradedNodeIds) {
      const node = this.lattice.nodes.get(degradedId);
      if (!node) continue;

      // Drain tasks from degraded node
      while (node.taskQueue.length > 0) {
        const task = node.taskQueue.shift();
        node.updateLoad(-1);

        // Find a healthy node for the task
        try {
          const candidates = this.lattice.routeTask(task);
          if (candidates.length > 0) {
            const healthyNode = candidates[0].node;
            healthyNode.updateLoad(1);
            healthyNode.taskQueue.push(task);

            this.logger.debug('Task redistributed', {
              from: degradedId,
              to: healthyNode.id,
            });
          }
        } catch (error) {
          this.logger.warn('Failed to redistribute task', error);
        }
      }

      // Mark node as degraded
      node.transitionTo(NodeState.DEGRADED);
    }
  }

  /**
   * Repair the lattice after node loss
   * @private
   */
  async _repairLattice() {
    // Remove dormant nodes
    const nodesToRemove = Array.from(this.lattice.nodes.values())
      .filter((n) => n.state === NodeState.DORMANT || !n.isHealthy())
      .map((n) => n.id);

    for (const nodeId of nodesToRemove) {
      try {
        this.lattice.removeNode(nodeId);
        this.logger.info('Removed unhealthy node during repair', { nodeId });
      } catch (error) {
        this.logger.warn('Failed to remove node during repair', error, { nodeId });
      }
    }

    // Rebalance remaining nodes
    try {
      this.lattice.rebalanceLattice();
      this.logger.info('Lattice rebalanced after repair');
    } catch (error) {
      this.logger.error('Failed to rebalance lattice', error);
    }
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const topology = this.lattice.getTopology();
    return {
      isRunning: this.isRunning,
      timestamp: new Date().toISOString(),
      topology: topology,
      nodeStatuses: topology.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        state: n.state,
        healthy: n.isHealthy,
        loadPercentage: (n.load / n.capacity) * 100,
      })),
    };
  }
}

// ============================================================================
// MAIN CONTROLLER
// ============================================================================

/**
 * HeadyLiquidNodeController - Main orchestrator for the entire system
 */
class HeadyLiquidNodeController {
  /**
   * Create a new HeadyLiquidNodeController
   * @param {Object} config - Configuration object
   */
  constructor(config = {}) {
    this.config = config || loadConfig();
    this.logger = new StructuredLogger(this.config);

    // Initialize Sentry if configured
    if (this.config.sentry.enabled && this.config.sentry.dsn) {
      Sentry.init({
        dsn: this.config.sentry.dsn,
        environment: this.config.environment,
        tracesSampleRate: 1.0,
      });
    }

    this.logger.info('Initializing Heady Liquid Node Controller', {
      version: '3.0.0',
      config: { ...this.config, passwords: '***REDACTED***' },
    });

    // Initialize components
    this.geometry = new SacredGeometryEngine();
    this.vectorMemory = new VectorMemory({
      apiKey: this.config.pinecone.apiKey,
      index: this.config.pinecone.index,
      namespace: this.config.pinecone.namespace,
      logger: this.logger,
      vectorDimension: this.config.mesh.vectorDimension,
    });

    this.meshProtocol = new MeshProtocol({
      redisUrl: this.config.redis.url,
      redisToken: this.config.redis.token,
      nodeId: this.config.nodeId,
      logger: this.logger,
    });

    this.lattice = new LatticeController({
      maxNodes: this.config.mesh.maxNodes,
      logger: this.logger,
    });

    this.orchestrator = new NodeOrchestrator({
      lattice: this.lattice,
      meshProtocol: this.meshProtocol,
      logger: this.logger,
      timeout: this.config.mesh.timeout,
    });

    this.healthMesh = new HealthMesh({
      lattice: this.lattice,
      meshProtocol: this.meshProtocol,
      logger: this.logger,
      heartbeatInterval: this.config.mesh.heartbeatInterval,
      healthCheckInterval: this.config.mesh.healthCheckInterval,
    });

    this.isInitialized = false;
  }

  /**
   * Initialize the controller and all components
   */
  async initialize() {
    try {
      this.logger.info('Initializing controller components');

      // Connect to mesh protocol
      await this.meshProtocol.connect();

      // Start health monitoring
      await this.healthMesh.start();

      // Create core AI nodes
      await this._createCoreNodes();

      this.isInitialized = true;
      this.logger.info('Controller initialization complete', {
        nodeCount: this.lattice.nodes.size,
      });

      return true;
    } catch (error) {
      this.logger.error('Controller initialization failed', error);
      throw error;
    }
  }

  /**
   * Create the core AI nodes
   * @private
   */
  async _createCoreNodes() {
    const coreNodes = [
      { type: NodeType.CODEMAP, capabilities: ['code-analysis', 'architecture', 'refactoring'] },
      { type: NodeType.JULES, capabilities: ['memory-management', 'state-coordination'] },
      { type: NodeType.OBSERVER, capabilities: ['monitoring', 'logging', 'alerting'] },
      { type: NodeType.BUILDER, capabilities: ['task-execution', 'compilation', 'deployment'] },
      { type: NodeType.ATLAS, capabilities: ['routing', 'topology', 'load-balancing'] },
      { type: NodeType.PYTHIA, capabilities: ['prediction', 'optimization', 'forecasting'] },
    ];

    for (const nodeConfig of coreNodes) {
      const node = new LiquidNode({
        type: nodeConfig.type,
        capabilities: nodeConfig.capabilities,
        embedding: Array(this.config.mesh.vectorDimension)
          .fill(0)
          .map(() => Math.random()),
        capacity: 100,
      });

      this.lattice.addNode(node);
      this.logger.info('Core node created', { nodeId: node.id, type: node.type });
    }
  }

  /**
   * Create a new node in the mesh
   * @param {Object} options - Node configuration
   */
  async createNode(options = {}) {
    try {
      const node = new LiquidNode({
        ...options,
        embedding: options.embedding ||
          Array(this.config.mesh.vectorDimension)
            .fill(0)
            .map(() => Math.random()),
      });

      this.lattice.addNode(node);

      this.logger.info('New node created', {
        nodeId: node.id,
        type: node.type,
        capabilities: node.capabilities,
      });

      return node;
    } catch (error) {
      this.logger.error('Failed to create node', error, options);
      throw error;
    }
  }

  /**
   * Submit a task to the mesh
   * @param {Object} task - Task configuration
   */
  async submitTask(task) {
    try {
      const taskId = task.id || uuidv4();
      const embedding = task.embedding ||
        Array(this.config.mesh.vectorDimension)
          .fill(0)
          .map(() => Math.random());

      const enrichedTask = {
        ...task,
        id: taskId,
        embedding,
        submittedAt: Date.now(),
      };

      const candidates = this.lattice.routeTask(enrichedTask);

      if (candidates.length === 0) {
        throw new MeshError('No suitable nodes for task');
      }

      const targetNode = candidates[0].node;
      targetNode.updateLoad(enrichedTask.requiredCapacity || 1);
      targetNode.taskQueue.push(enrichedTask);

      await this.meshProtocol.publish(`node:${targetNode.id}`, {
        type: MessageType.TASK,
        payload: enrichedTask,
      });

      this.logger.info('Task submitted', {
        taskId,
        targetNodeId: targetNode.id,
        taskType: task.type,
      });

      return {
        taskId,
        targetNodeId: targetNode.id,
        status: 'submitted',
      };
    } catch (error) {
      this.logger.error('Failed to submit task', error, { task });
      throw error;
    }
  }

  /**
   * Get current mesh topology
   */
  getTopology() {
    return this.lattice.getTopology();
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return this.healthMesh.getHealthStatus();
  }

  /**
   * Store content in vector memory
   * @param {string} key - Unique key
   * @param {string} content - Content to store
   * @param {Object} metadata - Metadata
   */
  async storeMemory(key, content, metadata) {
    return await this.vectorMemory.store(key, content, metadata);
  }

  /**
   * Recall from vector memory
   * @param {string} query - Query string
   * @param {number} topK - Number of results
   */
  async recallMemory(query, topK = 5) {
    return await this.vectorMemory.recall(query, topK);
  }

  /**
   * Get HTTP health endpoint handler
   */
  getHealthHandler() {
    return (req, res) => {
      try {
        const health = this.getHealthStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
      } catch (error) {
        this.logger.error('Health endpoint error', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    };
  }

  /**
   * Get topology endpoint handler
   */
  getTopologyHandler() {
    return (req, res) => {
      try {
        const topology = this.getTopology();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(topology, null, 2));
      } catch (error) {
        this.logger.error('Topology endpoint error', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    };
  }

  /**
   * Graceful shutdown with drain
   */
  async shutdown() {
    try {
      this.logger.info('Starting graceful shutdown');

      // Stop health monitoring
      await this.healthMesh.stop();

      // Drain all task queues
      for (const [nodeId, node] of this.lattice.nodes.entries()) {
        this.logger.debug('Draining node task queue', { nodeId, queueSize: node.taskQueue.length });
        node.taskQueue = [];
      }

      // Disconnect mesh protocol
      await this.meshProtocol.disconnect();

      this.isInitialized = false;
      this.logger.info('Graceful shutdown complete');

      return true;
    } catch (error) {
      this.logger.error('Shutdown error', error);
      throw error;
    }
  }
}

// ============================================================================
// DEMO & EXPORT
// ============================================================================

/**
 * Demo showcasing the Liquid Node system
 */
async function demo() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Heady Liquid Node Vector Space Controller v3.0              ║');
  console.log('║  Sacred Geometry v4.0 — φ-Weighted Lattice Intelligence     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Create controller with minimal config
  const controller = new HeadyLiquidNodeController({
    nodeId: 'demo-controller',
    environment: 'development',
    mesh: {
      maxNodes: 100,
      vectorDimension: 1536,
      heartbeatInterval: 5000,
      healthCheckInterval: 10000,
      maxRetries: 3,
      timeout: 30000,
    },
    sentry: { enabled: false },
  });

  // Initialize
  console.log('▸ Initializing controller...');
  await controller.initialize();

  // Display lattice topology
  console.log('\n▸ Lattice Topology:');
  const topology = controller.getTopology();
  console.log(`  • Total nodes: ${topology.statistics.totalNodes}`);
  console.log(`  • Healthy nodes: ${topology.statistics.healthyNodes}`);
  console.log(`  • Average load: ${topology.statistics.averageLoad.toFixed(2)}`);
  console.log(`  • Max capacity: ${topology.statistics.maxCapacity}`);

  // Create additional nodes
  console.log('\n▸ Creating custom nodes...');
  for (let i = 0; i < 3; i++) {
    await controller.createNode({
      type: NodeType.COORDINATOR,
      capabilities: ['coordination', 'orchestration'],
      capacity: 150,
    });
  }

  const topology2 = controller.getTopology();
  console.log(`  • Nodes after creation: ${topology2.statistics.totalNodes}`);

  // Store memories
  console.log('\n▸ Storing memories in vector space...');
  await controller.storeMemory(
    'task-1',
    'Analyze the system architecture and provide optimization suggestions',
    { category: 'analysis', priority: 'high' }
  );

  await controller.storeMemory(
    'task-2',
    'Monitor system health and alert on anomalies',
    { category: 'monitoring', priority: 'medium' }
  );

  console.log('  • Memories stored successfully');

  // Submit tasks
  console.log('\n▸ Submitting tasks to mesh...');
  for (let i = 0; i < 3; i++) {
    const result = await controller.submitTask({
      type: 'analysis',
      requiredCapabilities: ['code-analysis'],
      requiredCapacity: 10,
      description: `Task ${i + 1}`,
    });
    console.log(`  • Task ${result.taskId} routed to ${result.targetNodeId}`);
  }

  // Demonstrate parallel execution
  console.log('\n▸ Executing parallel operations...');
  const tasks = Array(3)
    .fill(null)
    .map((_, i) => ({
      id: `parallel-task-${i}`,
      type: 'parallel',
      requiredCapacity: 5,
    }));

  const parallelResult = await controller.orchestrator.parallel(tasks);
  console.log(`  • Parallel result: ${parallelResult.successful} successful, ${parallelResult.failed} failed`);

  // Display health status
  console.log('\n▸ Health Status:');
  const health = controller.getHealthStatus();
  console.log(
    `  • Running: ${health.isRunning} | Nodes: ${health.nodeStatuses.length} | Healthy: ${health.nodeStatuses.filter((n) => n.healthy).length}`
  );

  // Display updated topology
  console.log('\n▸ Final Lattice Topology:');
  const finalTopology = controller.getTopology();
  console.log(`  Nodes in mesh:`);
  for (const node of finalTopology.nodes) {
    const healthStatus = node.isHealthy ? '✓' : '✗';
    const loadBar = '█'.repeat(Math.floor(node.loadPercentage / 5)) +
      '░'.repeat(20 - Math.floor(node.loadPercentage / 5));
    console.log(
      `    ${healthStatus} ${node.id} [${node.type}] ${loadBar} ${node.loadPercentage.toFixed(0)}%`
    );
  }

  // Shutdown gracefully
  console.log('\n▸ Shutting down gracefully...');
  await controller.shutdown();

  console.log('\n✓ Demo completed successfully\n');
}

// Export classes and functions
export {
  // Core classes
  HeadyLiquidNodeController,
  LiquidNode,
  LatticeController,
  NodeOrchestrator,
  VectorMemory,
  MeshProtocol,
  HealthMesh,
  SacredGeometryEngine,
  StructuredLogger,

  // Error classes
  MeshError,
  NodeNotFoundError,
  CapacityExceededError,
  TimeoutError,

  // Constants
  NodeState,
  MessageType,
  NodeType,
  PHI,
  FIB_SEQUENCE,

  // Utilities
  loadConfig,
  demo,
};

// Run demo if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  demo().catch((error) => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}
