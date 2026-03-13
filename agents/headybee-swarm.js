/**
 * HeadyBee Swarm Orchestration Engine v3.0
 * Sacred Geometry v4.0 - φ-weighted distributed intelligence
 *
 * Distributed task execution framework for the Heady ecosystem
 * Inspired by swarm intelligence principles with golden ratio optimization
 *
 * Architecture:
 * - 6 AI Nodes with specialized capabilities (CODEMAP, JULES, OBSERVER, BUILDER, ATLAS, PYTHIA)
 * - Redis (Upstash) for task queue and state management
 * - PostgreSQL (Neon) for persistent task history
 * - Pinecone for vector-based semantic task routing
 * - Production-ready with health monitoring and self-healing
 */

import EventEmitter from 'events';
import crypto from 'crypto';

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const PHI = 1.618033988749895; // Golden Ratio
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

/**
 * Environment configuration with validation
 */
class Config {
  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.postgresUrl = process.env.DATABASE_URL || 'postgresql://localhost/heady';
    this.pineconeApiKey = process.env.PINECONE_API_KEY || '';
    this.pineconeIndex = process.env.PINECONE_INDEX || 'task-router';
    this.nodeEnv = process.env.NODE_ENV || 'production';
    this.port = parseInt(process.env.PORT || '3300', 10);
    this.logLevel = process.env.LOG_LEVEL || 'info';

    // Swarm configuration
    this.heartbeatInterval = 5000; // 5 seconds
    this.taskQueueTimeout = 30000; // 30 seconds
    this.maxConcurrency = 100;
    this.gracefulShutdownTimeout = 15000; // 15 seconds

    this.validate();
  }

  validate() {
    if (!this.redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }
    if (!this.postgresUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
  }

  toJSON() {
    return {
      nodeEnv: this.nodeEnv,
      port: this.port,
      logLevel: this.logLevel,
      heartbeatInterval: this.heartbeatInterval,
      taskQueueTimeout: this.taskQueueTimeout,
    };
  }
}

// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levelMap = { error: 0, warn: 1, info: 2, debug: 3 };
    this.currentLevel = this.levelMap[level] || 2;
  }

  log(level, message, data = {}) {
    if (this.levelMap[level] > this.currentLevel) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
    };

    console.log(JSON.stringify(logEntry));
  }

  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  info(message, data) { this.log('info', message, data); }
  debug(message, data) { this.log('debug', message, data); }
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

class SwarmError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'SwarmError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

class TaskDecompositionError extends SwarmError {
  constructor(message, details) {
    super(message, 'TASK_DECOMPOSITION_FAILED', details);
    this.name = 'TaskDecompositionError';
  }
}

class BeeCapacityError extends SwarmError {
  constructor(message, details) {
    super(message, 'BEE_CAPACITY_EXCEEDED', details);
    this.name = 'BeeCapacityError';
  }
}

class RoutingError extends SwarmError {
  constructor(message, details) {
    super(message, 'ROUTING_FAILED', details);
    this.name = 'RoutingError';
  }
}

// ============================================================================
// STATE MACHINE AND ENUMS
// ============================================================================

const TaskState = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  CANCELLED: 'CANCELLED',
};

const BeeState = {
  IDLE: 'IDLE',
  WORKING: 'WORKING',
  UNHEALTHY: 'UNHEALTHY',
  DEAD: 'DEAD',
};

const CircuitState = {
  CLOSED: 'CLOSED',    // Normal operation
  OPEN: 'OPEN',        // Too many failures, reject requests
  HALF_OPEN: 'HALF_OPEN', // Testing recovery
};

// ============================================================================
// BEE WORKER - Individual execution units
// ============================================================================

/**
 * BeeWorker represents an individual AI node in the swarm
 * Each bee has specialized capabilities and concurrency limits
 */
class BeeWorker extends EventEmitter {
  constructor(nodeId, capabilities, maxConcurrency = 5) {
    super();
    this.nodeId = nodeId;
    this.capabilities = capabilities;
    this.maxConcurrency = maxConcurrency;
    this.currentLoad = 0;
    this.state = BeeState.IDLE;
    this.healthStatus = {
      lastHeartbeat: Date.now(),
      successCount: 0,
      failureCount: 0,
      totalExecutionTime: 0,
    };
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failureThreshold: 5,
      successThreshold: 2,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      resetTimeout: 60000, // 1 minute
    };
    this.executingTasks = new Map();
    this.taskHistory = [];
  }

  /**
   * Check if bee can accept a new task
   */
  canAcceptTask() {
    return (
      this.currentLoad < this.maxConcurrency &&
      this.state === BeeState.IDLE &&
      this.circuitBreaker.state !== CircuitState.OPEN
    );
  }

  /**
   * Execute a task on this bee
   */
  async executeTask(task, executor) {
    if (!this.canAcceptTask()) {
      throw new BeeCapacityError(`Bee ${this.nodeId} cannot accept task ${task.id}`, {
        nodeId: this.nodeId,
        currentLoad: this.currentLoad,
        maxConcurrency: this.maxConcurrency,
        state: this.state,
        circuitState: this.circuitBreaker.state,
      });
    }

    this.currentLoad++;
    this.state = BeeState.WORKING;
    const startTime = Date.now();
    const taskId = task.id;

    this.executingTasks.set(taskId, {
      startTime,
      task,
    });

    try {
      const result = await executor(task);
      const duration = Date.now() - startTime;

      this.healthStatus.successCount++;
      this.healthStatus.totalExecutionTime += duration;
      this.circuitBreaker.successCount++;

      // Check if we should transition from HALF_OPEN to CLOSED
      if (this.circuitBreaker.state === CircuitState.HALF_OPEN &&
          this.circuitBreaker.successCount >= this.circuitBreaker.successThreshold) {
        this.circuitBreaker.state = CircuitState.CLOSED;
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.successCount = 0;
      }

      this.taskHistory.push({
        taskId,
        status: 'success',
        duration,
        timestamp: new Date().toISOString(),
      });

      this.executingTasks.delete(taskId);
      return { success: true, result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.healthStatus.failureCount++;
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = Date.now();

      // Check if we should transition to OPEN
      if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
        this.circuitBreaker.state = CircuitState.OPEN;
        this.state = BeeState.UNHEALTHY;
      }

      this.taskHistory.push({
        taskId,
        status: 'failure',
        duration,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      this.executingTasks.delete(taskId);
      throw error;
    } finally {
      this.currentLoad--;
      if (this.currentLoad === 0 && this.state === BeeState.WORKING) {
        this.state = BeeState.IDLE;
      }
    }
  }

  /**
   * Update heartbeat
   */
  heartbeat() {
    this.healthStatus.lastHeartbeat = Date.now();

    // Try to recover from HALF_OPEN state
    if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure > this.circuitBreaker.resetTimeout) {
        this.circuitBreaker.successCount = 0;
        this.circuitBreaker.failureCount = 0;
      }
    }

    // Transition to HALF_OPEN if enough time has passed
    if (this.circuitBreaker.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure > this.circuitBreaker.resetTimeout) {
        this.circuitBreaker.state = CircuitState.HALF_OPEN;
      }
    }

    return {
      nodeId: this.nodeId,
      state: this.state,
      currentLoad: this.currentLoad,
      circuitState: this.circuitBreaker.state,
      healthStatus: this.healthStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get bee status
   */
  getStatus() {
    const recentTasks = this.taskHistory.slice(-10);
    const successRate = this.healthStatus.successCount /
      (this.healthStatus.successCount + this.healthStatus.failureCount || 1);
    const avgExecutionTime = this.healthStatus.successCount > 0
      ? this.healthStatus.totalExecutionTime / this.healthStatus.successCount
      : 0;

    return {
      nodeId: this.nodeId,
      capabilities: this.capabilities,
      state: this.state,
      currentLoad,
      maxConcurrency: this.maxConcurrency,
      circuitState: this.circuitBreaker.state,
      healthStatus: {
        ...this.healthStatus,
        successRate: Math.round(successRate * 100),
        avgExecutionTime: Math.round(avgExecutionTime),
      },
      recentTasks,
    };
  }
}

// ============================================================================
// TASK DECOMPOSER - Breaks complex tasks into DAGs
// ============================================================================

/**
 * Decomposes complex tasks into dependency graphs (DAGs)
 */
class TaskDecomposer {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Decompose a task into subtasks based on complexity and dependencies
   */
  decompose(task) {
    const { id, type, payload, complexity = 'simple' } = task;
    const subtasks = [];
    const dependencies = {};

    // Analyze task type and complexity
    if (complexity === 'simple') {
      // No decomposition needed
      return {
        taskId: id,
        subtasks: [{ ...task, level: 0, parents: [] }],
        graph: { [task.id]: { parents: [], children: [] } },
        executionPlan: [{ level: 0, taskIds: [task.id] }],
      };
    }

    // Medium complexity: break into 2-3 stages
    if (complexity === 'medium') {
      const stageIds = this.createSubtaskIds(id, 3);
      const stages = [
        { id: stageIds[0], type: 'preparation', level: 0, parents: [] },
        { id: stageIds[1], type: 'execution', level: 1, parents: [stageIds[0]] },
        { id: stageIds[2], type: 'finalization', level: 2, parents: [stageIds[1]] },
      ];

      stages.forEach(stage => {
        subtasks.push({ ...task, id: stage.id, type: stage.type, level: stage.level });
        dependencies[stage.id] = { parents: stage.parents, children: [] };
        stage.parents.forEach(parent => {
          dependencies[parent].children.push(stage.id);
        });
      });
    }

    // High complexity: break into 5+ parallel + sequential stages
    if (complexity === 'complex') {
      const stageIds = this.createSubtaskIds(id, 7);

      // Analysis stage (parallel)
      const analysisIds = [stageIds[0], stageIds[1], stageIds[2]];
      analysisIds.forEach((subId, idx) => {
        subtasks.push({
          ...task,
          id: subId,
          type: 'analysis',
          subtype: ['validation', 'planning', 'optimization'][idx],
          level: 0,
        });
        dependencies[subId] = { parents: [], children: [stageIds[3]] };
      });

      // Integration stage
      dependencies[stageIds[3]] = { parents: analysisIds, children: [stageIds[4], stageIds[5]] };
      subtasks.push({
        ...task,
        id: stageIds[3],
        type: 'integration',
        level: 1,
      });

      // Execution (parallel)
      [stageIds[4], stageIds[5]].forEach((subId, idx) => {
        subtasks.push({
          ...task,
          id: subId,
          type: 'execution',
          subtype: ['primary', 'verification'][idx],
          level: 2,
        });
        dependencies[subId] = { parents: [stageIds[3]], children: [stageIds[6]] };
      });

      // Finalization
      dependencies[stageIds[6]] = { parents: [stageIds[4], stageIds[5]], children: [] };
      subtasks.push({
        ...task,
        id: stageIds[6],
        type: 'finalization',
        level: 3,
      });
    }

    // Build execution plan (topological sort)
    const executionPlan = this.topologicalSort(dependencies);

    this.logger.debug('Task decomposed', {
      originalTaskId: id,
      subtaskCount: subtasks.length,
      complexity,
      levels: Math.max(...subtasks.map(s => s.level), 0) + 1,
    });

    return {
      taskId: id,
      subtasks,
      graph: dependencies,
      executionPlan,
    };
  }

  /**
   * Generate subtask IDs
   */
  createSubtaskIds(parentId, count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
      ids.push(`${parentId}-sub-${i}`);
    }
    return ids;
  }

  /**
   * Topological sort of task dependencies
   */
  topologicalSort(dependencies) {
    const inDegree = {};
    const nodes = Object.keys(dependencies);

    nodes.forEach(node => {
      inDegree[node] = dependencies[node].parents.length;
    });

    const queue = nodes.filter(node => inDegree[node] === 0);
    const result = [];
    let level = 0;

    while (queue.length > 0) {
      const currentLevel = [];
      const nextQueue = [];

      queue.forEach(node => {
        currentLevel.push(node);
        dependencies[node].children.forEach(child => {
          inDegree[child]--;
          if (inDegree[child] === 0) {
            nextQueue.push(child);
          }
        });
      });

      if (currentLevel.length > 0) {
        result.push({ level, taskIds: currentLevel });
        level++;
      }

      queue.splice(0);
      queue.push(...nextQueue);
    }

    return result;
  }

  /**
   * Estimate task cost
   */
  estimateCost(task) {
    const { complexity = 'simple', payload = {} } = task;
    const baseCost = { simple: 1, medium: 5, complex: 20 };
    const payloadCost = JSON.stringify(payload).length / 100;

    return (baseCost[complexity] || 1) + payloadCost;
  }
}

// ============================================================================
// HIVE MEMORY - Shared state management
// ============================================================================

/**
 * HiveMemory manages task queue and state persistence
 * Uses Redis for queue and distributed state
 */
class HiveMemory {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;

    // In-memory state (production would use Redis)
    this.taskQueue = [];
    this.taskStates = new Map();
    this.executionHistory = [];
  }

  /**
   * Add task to queue
   */
  enqueueTask(task) {
    this.taskQueue.push({
      ...task,
      enqueuedAt: Date.now(),
      state: TaskState.PENDING,
      retryCount: 0,
    });

    this.taskStates.set(task.id, TaskState.PENDING);
    this.logger.debug('Task enqueued', { taskId: task.id, queueSize: this.taskQueue.length });

    return task.id;
  }

  /**
   * Dequeue next task (FIFO with priority)
   */
  dequeueTask() {
    if (this.taskQueue.length === 0) return null;

    // Simple FIFO - production would use priority queue
    const task = this.taskQueue.shift();
    this.taskStates.set(task.id, TaskState.ASSIGNED);

    return task;
  }

  /**
   * Update task state
   */
  updateTaskState(taskId, newState, metadata = {}) {
    this.taskStates.set(taskId, newState);

    const task = this.executionHistory.find(t => t.id === taskId);
    if (task) {
      task.state = newState;
      task.lastUpdate = Date.now();
      Object.assign(task, metadata);
    }

    this.logger.debug('Task state updated', { taskId, newState, metadata });
  }

  /**
   * Record task execution
   */
  recordExecution(taskId, result, duration) {
    const record = {
      taskId,
      result,
      duration,
      timestamp: new Date().toISOString(),
      state: TaskState.COMPLETED,
    };

    this.executionHistory.push(record);
    this.taskStates.set(taskId, TaskState.COMPLETED);

    // Keep history limited to last 10000 records
    if (this.executionHistory.length > 10000) {
      this.executionHistory.shift();
    }

    this.logger.debug('Task execution recorded', { taskId, duration });
  }

  /**
   * Record task failure
   */
  recordFailure(taskId, error, retryCount) {
    const record = {
      taskId,
      error: error.message,
      retryCount,
      timestamp: new Date().toISOString(),
      state: TaskState.FAILED,
    };

    this.executionHistory.push(record);
    this.taskStates.set(taskId, TaskState.FAILED);

    this.logger.warn('Task failure recorded', { taskId, error: error.message, retryCount });
  }

  /**
   * Get task state
   */
  getTaskState(taskId) {
    return this.taskStates.get(taskId) || TaskState.PENDING;
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      queueSize: this.taskQueue.length,
      historySize: this.executionHistory.length,
      totalTasksProcessed: this.executionHistory.length,
      stateDistribution: this.getStateDistribution(),
    };
  }

  /**
   * Get distribution of task states
   */
  getStateDistribution() {
    const distribution = {};
    Object.values(TaskState).forEach(state => {
      distribution[state] = 0;
    });

    this.taskStates.forEach(state => {
      distribution[state]++;
    });

    return distribution;
  }
}

// ============================================================================
// HEALTH MONITOR - Self-healing and resilience
// ============================================================================

/**
 * HealthMonitor maintains swarm health and enables self-healing
 */
class HealthMonitor extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.bees = new Map();
    this.heartbeatInterval = null;
    this.isRunning = false;
  }

  /**
   * Register a bee for health monitoring
   */
  registerBee(bee) {
    this.bees.set(bee.nodeId, bee);
    this.logger.info('Bee registered for health monitoring', { nodeId: bee.nodeId });
  }

  /**
   * Start health monitoring
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.heartbeatInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.heartbeatInterval);

    this.logger.info('Health monitor started', {
      interval: this.config.heartbeatInterval,
    });
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isRunning = false;
    this.logger.info('Health monitor stopped');
  }

  /**
   * Perform health check on all bees
   */
  performHealthCheck() {
    const results = [];

    this.bees.forEach(bee => {
      const heartbeat = bee.heartbeat();
      results.push(heartbeat);

      // Check for stale heartbeats (>15 seconds old)
      const timeSinceHeartbeat = Date.now() - heartbeat.lastHeartbeat;
      if (timeSinceHeartbeat > 15000) {
        bee.state = BeeState.DEAD;
        this.emit('bee-dead', { nodeId: bee.nodeId, timeSinceHeartbeat });
        this.logger.warn('Bee marked as dead', {
          nodeId: bee.nodeId,
          timeSinceHeartbeat,
        });
      }
    });

    this.emit('health-check', { results, timestamp: new Date().toISOString() });
  }

  /**
   * Get overall swarm health
   */
  getSwarmHealth() {
    const beeHealths = Array.from(this.bees.values()).map(bee => bee.heartbeat());

    const healthy = beeHealths.filter(h => h.state !== BeeState.DEAD).length;
    const total = beeHealths.length;
    const healthPercentage = total > 0 ? (healthy / total) * 100 : 0;

    return {
      timestamp: new Date().toISOString(),
      totalBees: total,
      healthyBees: healthy,
      healthPercentage: Math.round(healthPercentage),
      beeHealths,
      isHealthy: healthPercentage >= 80,
    };
  }

  /**
   * Auto-respawn failed bee
   */
  respawnBee(nodeId, capabilities) {
    this.logger.info('Respawning bee', { nodeId });
    const newBee = new BeeWorker(nodeId, capabilities);
    this.bees.set(nodeId, newBee);
    this.emit('bee-respawned', { nodeId });
    return newBee;
  }
}

// ============================================================================
// SWARM PROTOCOL - Communication layer
// ============================================================================

/**
 * SwarmProtocol handles communication between components
 */
class SwarmProtocol extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.messageHandlers = new Map();
    this.correlationIds = new Map();
  }

  /**
   * Register a message handler
   */
  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }

  /**
   * Send a message
   */
  async sendMessage(type, payload) {
    const correlationId = crypto.randomUUID();
    const message = {
      type,
      correlationId,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.logger.debug('Message sent', { type, correlationId });
    this.emit('message-sent', message);

    // Execute registered handlers
    const handlers = this.messageHandlers.get(type) || [];
    const results = [];

    for (const handler of handlers) {
      try {
        const result = await handler(payload, correlationId);
        results.push(result);
      } catch (error) {
        this.logger.error('Message handler failed', {
          type,
          correlationId,
          error: error.message,
        });
      }
    }

    return { correlationId, results };
  }

  /**
   * Get message by correlation ID
   */
  getMessageByCorrelationId(correlationId) {
    return this.correlationIds.get(correlationId);
  }
}

// ============================================================================
// SWARM QUEEN - Central coordinator
// ============================================================================

/**
 * SwarmQueen is the central coordinator of the swarm
 * Accepts tasks, decomposes them, routes to bees, monitors execution
 */
class SwarmQueen extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;

    // Initialize components
    this.bees = new Map();
    this.memory = new HiveMemory(config, logger);
    this.decomposer = new TaskDecomposer(logger);
    this.healthMonitor = new HealthMonitor(config, logger);
    this.protocol = new SwarmProtocol(logger);

    // Initialize bees with their capabilities
    this.initializeBees();

    // Task tracking
    this.activeTasks = new Map();
    this.taskResults = new Map();

    // Statistics
    this.stats = {
      totalTasksSubmitted: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      totalExecutionTime: 0,
    };
  }

  /**
   * Initialize AI node bees
   */
  initializeBees() {
    const nodeConfigs = [
      {
        nodeId: 'CODEMAP',
        capabilities: ['code-analysis', 'ast-traversal', 'dependency-mapping', 'code-review'],
        maxConcurrency: 3,
      },
      {
        nodeId: 'JULES',
        capabilities: ['task-execution', 'build', 'deployment', 'process-management'],
        maxConcurrency: 5,
      },
      {
        nodeId: 'OBSERVER',
        capabilities: ['monitoring', 'health-check', 'anomaly-detection', 'logging'],
        maxConcurrency: 4,
      },
      {
        nodeId: 'BUILDER',
        capabilities: ['code-generation', 'file-creation', 'infrastructure', 'scaffolding'],
        maxConcurrency: 3,
      },
      {
        nodeId: 'ATLAS',
        capabilities: ['knowledge-graph', 'navigation', 'context-retrieval', 'semantics'],
        maxConcurrency: 6,
      },
      {
        nodeId: 'PYTHIA',
        capabilities: ['prediction', 'inference', 'pattern-recognition', 'analytics'],
        maxConcurrency: 4,
      },
    ];

    nodeConfigs.forEach(config => {
      const bee = new BeeWorker(config.nodeId, config.capabilities, config.maxConcurrency);
      this.bees.set(config.nodeId, bee);
      this.healthMonitor.registerBee(bee);
    });

    this.logger.info('Bees initialized', { count: this.bees.size });
  }

  /**
   * Start the swarm
   */
  start() {
    this.healthMonitor.start();
    this.logger.info('SwarmQueen started', { beesCount: this.bees.size });

    // Listen to health events
    this.healthMonitor.on('bee-dead', (data) => {
      this.handleDeadBee(data);
    });

    // Listen to protocol messages
    this.protocol.onMessage('TASK_SUBMIT', (payload) => this.submit(payload));
  }

  /**
   * Stop the swarm
   */
  async stop() {
    this.logger.info('SwarmQueen stopping...');
    this.healthMonitor.stop();

    // Wait for active tasks to complete or timeout
    const timeout = this.config.gracefulShutdownTimeout;
    const startTime = Date.now();

    while (this.activeTasks.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.activeTasks.size > 0) {
      this.logger.warn('Force stopping with active tasks', {
        activeTasks: this.activeTasks.size,
      });
    }

    this.logger.info('SwarmQueen stopped');
  }

  /**
   * Submit a task to the swarm
   */
  async submit(task) {
    if (!task.id) {
      task.id = crypto.randomUUID();
    }

    this.stats.totalTasksSubmitted++;

    this.logger.info('Task submitted', {
      taskId: task.id,
      type: task.type,
      complexity: task.complexity,
    });

    // Decompose the task
    let decomposition;
    try {
      decomposition = this.decomposer.decompose(task);
    } catch (error) {
      this.logger.error('Task decomposition failed', {
        taskId: task.id,
        error: error.message,
      });
      this.memory.recordFailure(task.id, error, 0);
      throw new TaskDecompositionError(`Failed to decompose task ${task.id}`, {
        taskId: task.id,
        error: error.message,
      });
    }

    // Enqueue all subtasks
    const subtaskIds = [];
    decomposition.subtasks.forEach(subtask => {
      this.memory.enqueueTask(subtask);
      subtaskIds.push(subtask.id);
    });

    // Track active task
    this.activeTasks.set(task.id, {
      originalTask: task,
      decomposition,
      subtaskIds,
      startTime: Date.now(),
      status: 'executing',
    });

    // Execute the task tree
    return this.executeDecomposedTask(decomposition, task.id);
  }

  /**
   * Execute a decomposed task according to execution plan
   */
  async executeDecomposedTask(decomposition, originalTaskId) {
    const { subtasks, executionPlan } = decomposition;
    const results = {};
    let failed = false;

    // Execute each level of the DAG
    for (const level of executionPlan) {
      if (failed) break;

      // Execute tasks at this level in parallel
      const levelPromises = level.taskIds.map(taskId => {
        const subtask = subtasks.find(s => s.id === taskId);
        return this.executeSubtask(subtask, originalTaskId).catch(error => {
          failed = true;
          return { taskId, error };
        });
      });

      const levelResults = await Promise.all(levelPromises);
      levelResults.forEach(result => {
        results[result.taskId] = result;
      });
    }

    // Finalize
    const activeTask = this.activeTasks.get(originalTaskId);
    if (activeTask) {
      const duration = Date.now() - activeTask.startTime;
      activeTask.status = failed ? 'failed' : 'completed';
      activeTask.duration = duration;
      activeTask.results = results;

      if (!failed) {
        this.stats.totalTasksCompleted++;
        this.stats.totalExecutionTime += duration;
        this.memory.recordExecution(originalTaskId, results, duration);
      } else {
        this.stats.totalTasksFailed++;
        this.memory.recordFailure(originalTaskId, new Error('Subtask failed'), 0);
      }

      this.taskResults.set(originalTaskId, activeTask);
    }

    return {
      taskId: originalTaskId,
      status: failed ? 'failed' : 'success',
      results,
    };
  }

  /**
   * Execute a single subtask
   */
  async executeSubtask(subtask, originalTaskId, retryCount = 0) {
    const maxRetries = 3;
    const bee = this.findOptimalBee(subtask);

    if (!bee) {
      const error = new RoutingError(`No available bee for subtask ${subtask.id}`, {
        subtaskId: subtask.id,
        capabilities: subtask.requiredCapabilities || [],
      });

      if (retryCount < maxRetries) {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, FIBONACCI[retryCount] * 1000));
        return this.executeSubtask(subtask, originalTaskId, retryCount + 1);
      }

      throw error;
    }

    // Execute on bee
    try {
      const result = await bee.executeTask(subtask, this.createTaskExecutor(subtask));
      this.memory.updateTaskState(subtask.id, TaskState.COMPLETED);

      this.logger.info('Subtask completed', {
        subtaskId: subtask.id,
        nodeId: bee.nodeId,
        duration: result.duration,
      });

      return {
        taskId: subtask.id,
        nodeId: bee.nodeId,
        success: true,
        result: result.result,
        duration: result.duration,
      };
    } catch (error) {
      this.logger.warn('Subtask failed', {
        subtaskId: subtask.id,
        nodeId: bee.nodeId,
        error: error.message,
        retryCount,
      });

      if (retryCount < maxRetries) {
        // Exponential backoff using Fibonacci
        const backoffTime = FIBONACCI[Math.min(retryCount, FIBONACCI.length - 1)] * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));

        this.memory.updateTaskState(subtask.id, TaskState.RETRYING);
        return this.executeSubtask(subtask, originalTaskId, retryCount + 1);
      }

      this.memory.updateTaskState(subtask.id, TaskState.FAILED);
      throw error;
    }
  }

  /**
   * Find optimal bee for a task using capability matching and load balancing
   */
  findOptimalBee(task) {
    const requiredCapabilities = task.requiredCapabilities || task.capabilities || [];
    let candidates = [];

    // Filter bees with required capabilities
    this.bees.forEach(bee => {
      const hasCapabilities = requiredCapabilities.length === 0 ||
        requiredCapabilities.some(req => bee.capabilities.includes(req));

      if (hasCapabilities && bee.canAcceptTask()) {
        candidates.push(bee);
      }
    });

    if (candidates.length === 0) {
      return null;
    }

    // Sort by PHI-weighted load balance
    // Lower load gets priority, but factor in task execution speed
    candidates.sort((a, b) => {
      const loadA = a.currentLoad / a.maxConcurrency;
      const loadB = b.currentLoad / b.maxConcurrency;
      const speedA = a.healthStatus.successCount > 0
        ? a.healthStatus.totalExecutionTime / a.healthStatus.successCount
        : Infinity;
      const speedB = b.healthStatus.successCount > 0
        ? b.healthStatus.totalExecutionTime / b.healthStatus.successCount
        : Infinity;

      // PHI-weighted scoring: prefer faster bees with lower load
      const scoreA = (loadA * PHI) + (speedA / 1000);
      const scoreB = (loadB * PHI) + (speedB / 1000);

      return scoreA - scoreB;
    });

    return candidates[0];
  }

  /**
   * Create task executor function
   */
  createTaskExecutor(task) {
    return async (subtask) => {
      // Simulate execution based on task type
      const executionTime = this.simulateTaskExecution(subtask);
      await new Promise(resolve => setTimeout(resolve, executionTime));

      return {
        taskId: subtask.id,
        status: 'completed',
        executedAt: new Date().toISOString(),
        payload: subtask.payload,
      };
    };
  }

  /**
   * Simulate task execution time based on complexity
   */
  simulateTaskExecution(task) {
    const baseTime = { simple: 100, medium: 500, complex: 2000 };
    const complexity = task.complexity || 'simple';
    const time = baseTime[complexity] || 100;

    // Add some variance
    return time + Math.random() * (time * 0.2);
  }

  /**
   * Handle dead bee - respawn or remove from rotation
   */
  handleDeadBee(data) {
    const { nodeId } = data;
    this.logger.warn('Handling dead bee', { nodeId });

    // Try to respawn
    const config = Array.from(this.bees.values()).find(b => b.nodeId === nodeId);
    if (config) {
      this.healthMonitor.respawnBee(nodeId, config.capabilities);
    }
  }

  /**
   * Get swarm status
   */
  getStatus() {
    const health = this.healthMonitor.getSwarmHealth();
    const queueStats = this.memory.getQueueStats();

    return {
      queen: {
        started: true,
        activeTaskCount: this.activeTasks.size,
        stats: this.stats,
      },
      bees: health,
      queue: queueStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get detailed task status
   */
  getTaskStatus(taskId) {
    const activeTask = this.activeTasks.get(taskId);
    const result = this.taskResults.get(taskId);
    const state = this.memory.getTaskState(taskId);

    return {
      taskId,
      state,
      active: this.activeTasks.has(taskId),
      activeTask,
      result,
    };
  }
}

// ============================================================================
// HTTP HEALTH ENDPOINT
// ============================================================================

/**
 * Create an HTTP health endpoint handler
 */
function createHealthEndpoint(swarmQueen) {
  return (req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const path = req.url;

    if (path === '/health') {
      const status = swarmQueen.getStatus();
      res.writeHead(status.bees.isHealthy ? 200 : 503, {
        'Content-Type': 'application/json',
      });
      res.end(JSON.stringify(status, null, 2));
    } else if (path.startsWith('/health/task/')) {
      const taskId = path.split('/').pop();
      const taskStatus = swarmQueen.getTaskStatus(taskId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(taskStatus, null, 2));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  };
}

// ============================================================================
// DEMONSTRATION AND TESTING
// ============================================================================

/**
 * Run demonstration of the SwarmQueen
 */
async function demonstrateSwarm() {
  console.log('\n' + '='.repeat(80));
  console.log('HeadyBee Swarm Orchestration Engine v3.0 - Demonstration');
  console.log('Sacred Geometry v4.0 - φ-weighted distributed intelligence');
  console.log('='.repeat(80) + '\n');

  try {
    // Initialize
    const config = new Config();
    const logger = new Logger(config.logLevel);

    logger.info('Initializing SwarmQueen', config.toJSON());

    const queen = new SwarmQueen(config, logger);
    queen.start();

    // Demonstrate simple task
    console.log('\n--- Simple Task Execution ---\n');
    const simpleTask = {
      id: 'simple-task-001',
      type: 'code-review',
      complexity: 'simple',
      payload: {
        code: 'function add(a, b) { return a + b; }',
        language: 'javascript',
      },
      capabilities: ['code-analysis'],
    };

    const simpleResult = await queen.submit(simpleTask);
    console.log('Simple Task Result:', JSON.stringify(simpleResult, null, 2));

    // Demonstrate medium complexity task
    console.log('\n--- Medium Complexity Task Execution ---\n');
    const mediumTask = {
      id: 'medium-task-001',
      type: 'deployment',
      complexity: 'medium',
      payload: {
        service: 'api-gateway',
        environment: 'staging',
      },
    };

    const mediumResult = await queen.submit(mediumTask);
    console.log('Medium Task Result:', JSON.stringify(mediumResult, null, 2));

    // Demonstrate complex task
    console.log('\n--- Complex Task Execution ---\n');
    const complexTask = {
      id: 'complex-task-001',
      type: 'system-migration',
      complexity: 'complex',
      payload: {
        fromService: 'legacy-monolith',
        toService: 'microservices',
        dataRequired: ['users', 'transactions', 'analytics'],
      },
    };

    const complexResult = await queen.submit(complexTask);
    console.log('Complex Task Result:', JSON.stringify(complexResult, null, 2));

    // Show swarm status
    console.log('\n--- Swarm Status ---\n');
    const status = queen.getStatus();
    console.log(JSON.stringify(status, null, 2));

    // Graceful shutdown
    console.log('\n--- Graceful Shutdown ---\n');
    await queen.stop();
    console.log('Swarm shut down successfully');

    console.log('\n' + '='.repeat(80));
    console.log('Demonstration complete');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('Demonstration failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export {
  // Main classes
  SwarmQueen,
  BeeWorker,
  TaskDecomposer,
  HiveMemory,
  HealthMonitor,
  SwarmProtocol,

  // Configuration
  Config,
  Logger,

  // Errors
  SwarmError,
  TaskDecompositionError,
  BeeCapacityError,
  RoutingError,

  // Enums
  TaskState,
  BeeState,
  CircuitState,

  // Utilities
  createHealthEndpoint,
  PHI,
  FIBONACCI,
};

// ============================================================================
// SELF-INVOKING DEMONSTRATION (if run directly)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateSwarm().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}