/**
 * Heady™ Colab Gateway — 3 Colab Pro+ Runtimes as Liquid Compute Nodes
 * Port: 3352 | Orchestrates Hot/Warm/Cold GPU runtime pool
 *
 * Runtime 1 (Hot):  Active inference, real-time embedding, user-facing ops
 * Runtime 2 (Warm): Batch processing, fine-tuning, large embedding jobs
 * Runtime 3 (Cold): Analytics, pattern mining, experiments, backup compute
 *
 * φ-timed heartbeats: PHI_TIMING.PHI_7 = 29,034ms cycle
 * Automatic failover with φ-backoff reconnection
 * CSL cosine routing to optimal runtime via semantic affinity
 * WebSocket real-time communication to each Colab runtime
 * Fibonacci batch sizes: [8, 13, 21, 34, 55]
 * Task queue with fib(13)=233 depth
 *
 * Author: Eric Haywood, eric@headysystems.com
 * © 2026 HeadySystems Inc. — 51 Provisional Patents
 */

'use strict';

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const {
  PHI, PSI, PHI_SQ, fib, phiMs, phiBackoff, phiBackoffWithJitter,
  CSL_THRESHOLDS, PHI_TIMING, POOLS, VECTOR,
  cosineSimilarity, normalize, cslGate, sigmoid,
  getPressureLevel, PRESSURE, ALERTS,
} = require('../shared/phi-math');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.SERVICE_PORT || 3352;

// ═══════════════════════════════════════════════════════════════════════════════
// φ-DERIVED CONSTANTS — ZERO MAGIC NUMBERS
// ═══════════════════════════════════════════════════════════════════════════════

const HEARTBEAT_MS       = PHI_TIMING.PHI_7;             // 29,034ms heartbeat cycle
const RECONNECT_BASE_MS  = PHI_TIMING.PHI_1;             // 1,618ms base reconnect
const MAX_RECONNECT_MS   = PHI_TIMING.PHI_8;             // 46,979ms max reconnect delay
const TASK_TIMEOUT_MS    = PHI_TIMING.PHI_6;             // 17,944ms per task
const HEALTH_CHECK_MS    = PHI_TIMING.PHI_3;             // 4,236ms health scan interval
const DRAIN_TIMEOUT_MS   = PHI_TIMING.PHI_8;             // 46,979ms drain window
const QUEUE_DEPTH        = fib(13);                      // 233 max queued tasks
const BATCH_SIZES        = [fib(6), fib(7), fib(8), fib(9), fib(10)]; // [8, 13, 21, 34, 55]
const MAX_RECONNECT_ATTEMPTS = fib(8);                   // 21 attempts before giving up
const WS_PING_INTERVAL   = PHI_TIMING.PHI_5;            // 11,090ms WebSocket ping
const GPU_UTIL_HISTORY    = fib(8);                      // 21 samples for rolling average
const TASK_ID_ENTROPY     = fib(6);                      // 8 chars random suffix

const POOL_WEIGHTS = {
  hot:  POOLS.HOT,        // 0.34 — user-facing, latency-critical
  warm: POOLS.WARM,       // 0.21 — background batch processing
  cold: POOLS.COLD,       // 0.13 — analytics, experiments
};

// ═══════════════════════════════════════════════════════════════════════════════
// RUNTIME LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

const LIFECYCLE = Object.freeze([
  'PROVISIONING', 'READY', 'ACTIVE', 'DRAINING', 'SHUTDOWN',
]);

const TASK_TYPES = Object.freeze([
  'embedding', 'inference', 'fine-tune', 'batch-process',
  'vector-search', 'hnsw-build', 'projection', 'experiment',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'colab-gateway',
    msg,
    ...meta,
  }) + '\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLAB RUNTIME CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class ColabRuntime {
  constructor(config) {
    this.id = config.id;
    this.pool = config.pool;                       // 'hot', 'warm', 'cold'
    this.url = config.url;
    this.status = LIFECYCLE[0];                    // PROVISIONING
    this.gpuType = config.gpuType || 'unknown';
    this.vram = config.vram || 0;
    this.gpuUtil = 0;
    this.memoryUtil = 0;
    this.temperature = 0;
    this.lastHeartbeat = null;
    this.taskCount = 0;
    this.totalTasks = 0;
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.reconnectAttempt = 0;
    this.capabilities = config.capabilities || [];
    this.capabilityVector = new Array(VECTOR.DIMS).fill(0);
    this.ws = null;
    this.wsReady = false;
    this.gpuUtilHistory = [];
    this.availableModels = [];
    this.pendingTasks = new Map();
    this.startedAt = null;
    this.lastTaskAt = null;
  }

  get isHealthy() {
    if (!this.lastHeartbeat) return false;
    const age = Date.now() - this.lastHeartbeat;
    return age < (HEARTBEAT_MS * PHI);  // φ × heartbeat = ~47s grace period
  }

  get isActive() {
    return this.isHealthy && (this.status === 'ACTIVE' || this.status === 'READY');
  }

  get loadFactor() {
    // φ-weighted composite: GPU weight = PSI (0.618), memory weight = 1-PSI (0.382)
    return (this.gpuUtil * PSI + this.memoryUtil * (1 - PSI)) / 100;
  }

  get avgGpuUtil() {
    if (this.gpuUtilHistory.length === 0) return 0;
    return this.gpuUtilHistory.reduce((s, v) => s + v, 0) / this.gpuUtilHistory.length;
  }

  get pressureLevel() {
    return getPressureLevel(this.loadFactor);
  }

  updateHealth(metrics) {
    this.gpuUtil = metrics.gpuUtil || 0;
    this.memoryUtil = metrics.memoryUtil || 0;
    this.temperature = metrics.temperature || 0;
    this.gpuType = metrics.gpuType || this.gpuType;
    this.vram = metrics.vram || this.vram;
    this.availableModels = metrics.availableModels || this.availableModels;
    this.lastHeartbeat = Date.now();

    // Track GPU utilization history (rolling window of fib(8)=21 samples)
    this.gpuUtilHistory.push(this.gpuUtil);
    if (this.gpuUtilHistory.length > GPU_UTIL_HISTORY) {
      this.gpuUtilHistory.shift();
    }

    // Update capability vector if provided
    if (metrics.capabilityVector && Array.isArray(metrics.capabilityVector)) {
      this.capabilityVector = metrics.capabilityVector;
    }

    // Lifecycle transition
    if (this.status === 'PROVISIONING' || this.status === 'READY') {
      this.status = 'ACTIVE';
      if (!this.startedAt) this.startedAt = Date.now();
    }

    this.reconnectAttempt = 0;
  }

  transitionTo(newStatus) {
    const currentIdx = LIFECYCLE.indexOf(this.status);
    const newIdx = LIFECYCLE.indexOf(newStatus);
    if (newIdx < 0) return false;

    log('info', 'Runtime lifecycle transition', {
      runtime: this.id,
      from: this.status,
      to: newStatus,
    });

    this.status = newStatus;
    return true;
  }

  registerTask(taskId) {
    this.taskCount++;
    this.totalTasks++;
    this.lastTaskAt = Date.now();
    this.pendingTasks.set(taskId, { startedAt: Date.now() });
  }

  completeTask(taskId, success = true) {
    this.taskCount = Math.max(0, this.taskCount - 1);
    this.pendingTasks.delete(taskId);
    if (success) {
      this.completedTasks++;
    } else {
      this.failedTasks++;
    }
  }

  snapshot() {
    return {
      id: this.id,
      pool: this.pool,
      status: this.status,
      healthy: this.isHealthy,
      gpuType: this.gpuType,
      vram: this.vram,
      gpuUtil: this.gpuUtil,
      avgGpuUtil: Number(this.avgGpuUtil.toFixed(1)),
      memoryUtil: this.memoryUtil,
      temperature: this.temperature,
      loadFactor: Number(this.loadFactor.toFixed(4)),
      pressure: this.pressureLevel.label,
      activeTasks: this.taskCount,
      totalTasks: this.totalTasks,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      wsConnected: this.wsReady,
      availableModels: this.availableModels,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNTIME POOL
// ═══════════════════════════════════════════════════════════════════════════════

const runtimes = new Map([
  ['hot', new ColabRuntime({
    id: 'colab-hot',
    pool: 'hot',
    url: process.env.COLAB_RUNTIME_HOT_URL || '',
    capabilities: ['embedding', 'inference', 'vector-search', 'projection'],
  })],
  ['warm', new ColabRuntime({
    id: 'colab-warm',
    pool: 'warm',
    url: process.env.COLAB_RUNTIME_WARM_URL || '',
    capabilities: ['embedding', 'fine-tune', 'batch-process', 'hnsw-build'],
  })],
  ['cold', new ColabRuntime({
    id: 'colab-cold',
    pool: 'cold',
    url: process.env.COLAB_RUNTIME_COLD_URL || '',
    capabilities: ['experiment', 'batch-process', 'hnsw-build', 'inference'],
  })],
]);

// ═══════════════════════════════════════════════════════════════════════════════
// TASK QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

const taskQueue = [];
const taskResults = new Map();
const TASK_RESULT_TTL_MS = PHI_TIMING.PHI_9; // 75,025ms result retention

function generateTaskId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 2 + TASK_ID_ENTROPY);
  return `task_${ts}_${rand}`;
}

function enqueueTask(task) {
  if (taskQueue.length >= QUEUE_DEPTH) {
    return { ok: false, error: 'HEADY-COLAB-003', message: 'Queue full' };
  }
  taskQueue.push(task);
  return { ok: true, queuePosition: taskQueue.length };
}

function dequeueForRuntime(runtime) {
  for (let i = 0; i < taskQueue.length; i++) {
    const task = taskQueue[i];
    // Check pool preference
    if (task.preferPool && task.preferPool !== runtime.pool) continue;
    // Check capability match
    if (task.type && !runtime.capabilities.includes(task.type)) continue;
    taskQueue.splice(i, 1);
    return task;
  }
  return null;
}

// Periodic task result cleanup
setInterval(() => {
  const now = Date.now();
  for (const [id, result] of taskResults) {
    if (now - result.completedAt > TASK_RESULT_TTL_MS) {
      taskResults.delete(id);
    }
  }
}, PHI_TIMING.PHI_5); // Clean every ~11s

// ═══════════════════════════════════════════════════════════════════════════════
// CSL TASK ROUTING
// ═══════════════════════════════════════════════════════════════════════════════

function routeTask(task) {
  let bestRuntime = null;
  let bestScore = -1;

  for (const [pool, runtime] of runtimes) {
    if (!runtime.isActive) continue;

    // CSL cosine score between task embedding and runtime capability vector
    let affinityScore;
    if (task.embedding && runtime.capabilityVector) {
      affinityScore = cosineSimilarity(task.embedding, runtime.capabilityVector);
    } else {
      // Fallback: pool weight as base affinity
      affinityScore = POOL_WEIGHTS[pool] || PSI;
    }

    // Capability type match bonus
    const typeMatch = runtime.capabilities.includes(task.type) ? PHI_SQ : 1;

    // φ-weighted load penalty: higher load = lower score
    const loadPenalty = 1 - (runtime.loadFactor * PSI);

    // Pressure penalty: runtimes under pressure score lower
    const pressureLabel = runtime.pressureLevel.label;
    const pressurePenalty = pressureLabel === 'NOMINAL' ? 1
      : pressureLabel === 'ELEVATED' ? PSI
      : pressureLabel === 'HIGH' ? PSI * PSI
      : Math.pow(PSI, 3); // CRITICAL

    // Composite routing score
    const compositeScore = affinityScore * loadPenalty * pressurePenalty * typeMatch;

    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestRuntime = runtime;
    }
  }

  return bestRuntime;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAILOVER ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function promoteRuntime(fromPool, toPool) {
  const source = runtimes.get(fromPool);
  if (!source || !source.isHealthy) return false;

  log('warn', 'Runtime promotion triggered', {
    from: fromPool,
    to: toPool,
    sourceGpuUtil: source.gpuUtil,
    sourceLoadFactor: source.loadFactor.toFixed(4),
  });

  // Reconfigure source for the target pool's workload
  const targetCapabilities = runtimes.get(toPool)?.capabilities || [];
  source.capabilities = [...new Set([...source.capabilities, ...targetCapabilities])];

  // Send promotion command via WebSocket
  if (source.ws && source.wsReady) {
    source.ws.send(JSON.stringify({
      type: 'promotion',
      fromPool,
      toPool,
      capabilities: source.capabilities,
    }));
  }

  return true;
}

function checkFailover() {
  const hot = runtimes.get('hot');
  const warm = runtimes.get('warm');
  const cold = runtimes.get('cold');

  // Hot goes down → promote Warm to Hot
  if (hot && !hot.isHealthy && warm && warm.isHealthy) {
    promoteRuntime('warm', 'hot');
  }

  // Warm goes down → promote Cold to Warm
  if (warm && !warm.isHealthy && cold && cold.isHealthy) {
    promoteRuntime('cold', 'warm');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function connectToRuntime(runtime) {
  if (!runtime.url) return;

  try {
    const ws = new WebSocket(runtime.url);

    ws.on('open', () => {
      runtime.ws = ws;
      runtime.wsReady = true;
      runtime.reconnectAttempt = 0;
      runtime.transitionTo('READY');

      // Register with the runtime
      ws.send(JSON.stringify({
        type: 'register',
        gatewayId: 'colab-gateway',
        pool: runtime.pool,
        capabilities: runtime.capabilities,
      }));

      log('info', 'WebSocket connected to runtime', { runtime: runtime.id, pool: runtime.pool });
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleRuntimeMessage(runtime, msg);
      } catch (err) {
        log('error', 'Failed to parse runtime message', { runtime: runtime.id, error: err.message });
      }
    });

    ws.on('close', () => {
      runtime.wsReady = false;
      runtime.ws = null;
      log('warn', 'WebSocket disconnected', { runtime: runtime.id, pool: runtime.pool });
      scheduleReconnect(runtime);
    });

    ws.on('error', (err) => {
      runtime.wsReady = false;
      log('error', 'WebSocket error', { runtime: runtime.id, error: err.message });
    });

    // φ-timed ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, WS_PING_INTERVAL);

  } catch (err) {
    log('error', 'Failed to connect to runtime', { runtime: runtime.id, error: err.message });
    scheduleReconnect(runtime);
  }
}

function scheduleReconnect(runtime) {
  if (runtime.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    log('error', 'Max reconnect attempts reached', { runtime: runtime.id, attempts: runtime.reconnectAttempt });
    runtime.transitionTo('SHUTDOWN');
    return;
  }

  runtime.reconnectAttempt++;
  const delay = phiBackoffWithJitter(runtime.reconnectAttempt, RECONNECT_BASE_MS, MAX_RECONNECT_MS);

  log('info', 'Scheduling reconnect', {
    runtime: runtime.id,
    attempt: runtime.reconnectAttempt,
    delayMs: delay,
  });

  setTimeout(() => {
    if (runtime.status !== 'SHUTDOWN') {
      connectToRuntime(runtime);
    }
  }, delay);
}

function handleRuntimeMessage(runtime, msg) {
  switch (msg.type) {
    case 'heartbeat':
      runtime.updateHealth(msg.metrics || msg);
      break;

    case 'task-complete': {
      const { taskId, result, success } = msg;
      runtime.completeTask(taskId, success !== false);
      taskResults.set(taskId, {
        result,
        success: success !== false,
        completedAt: Date.now(),
        runtime: runtime.id,
      });

      // Try to dequeue next task for this runtime
      const nextTask = dequeueForRuntime(runtime);
      if (nextTask) {
        dispatchTaskToRuntime(runtime, nextTask);
      }
      break;
    }

    case 'capabilities':
      runtime.capabilities = msg.capabilities || runtime.capabilities;
      if (msg.capabilityVector) {
        runtime.capabilityVector = msg.capabilityVector;
      }
      runtime.availableModels = msg.models || runtime.availableModels;
      break;

    case 'gpu-metrics':
      runtime.updateHealth(msg);
      break;

    case 'error':
      log('error', 'Runtime reported error', {
        runtime: runtime.id,
        error: msg.error,
        taskId: msg.taskId,
      });
      if (msg.taskId) {
        runtime.completeTask(msg.taskId, false);
      }
      break;

    default:
      log('debug', 'Unknown runtime message type', { runtime: runtime.id, type: msg.type });
  }
}

function dispatchTaskToRuntime(runtime, task) {
  if (!runtime.ws || !runtime.wsReady) return false;

  runtime.registerTask(task.id);

  runtime.ws.send(JSON.stringify({
    type: 'task',
    taskId: task.id,
    taskType: task.type,
    data: task.data,
    timeoutMs: TASK_TIMEOUT_MS,
  }));

  // Set task timeout
  setTimeout(() => {
    if (runtime.pendingTasks.has(task.id)) {
      log('warn', 'Task timed out', { taskId: task.id, runtime: runtime.id });
      runtime.completeTask(task.id, false);
      taskResults.set(task.id, {
        result: null,
        success: false,
        error: 'HEADY-COLAB-005: Task timed out',
        completedAt: Date.now(),
        runtime: runtime.id,
      });
    }
  }, TASK_TIMEOUT_MS);

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INCOMING WEBSOCKET CONNECTIONS (runtimes connecting TO us)
// ═══════════════════════════════════════════════════════════════════════════════

wss.on('connection', (ws, req) => {
  log('info', 'Incoming WebSocket connection', { remoteAddress: req.socket.remoteAddress });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'register' && msg.pool) {
        const runtime = runtimes.get(msg.pool);
        if (runtime) {
          runtime.ws = ws;
          runtime.wsReady = true;
          runtime.reconnectAttempt = 0;
          runtime.transitionTo('READY');

          if (msg.capabilities) runtime.capabilities = msg.capabilities;
          if (msg.gpuType) runtime.gpuType = msg.gpuType;
          if (msg.vram) runtime.vram = msg.vram;
          if (msg.models) runtime.availableModels = msg.models;

          ws.send(JSON.stringify({
            type: 'registered',
            pool: msg.pool,
            heartbeatMs: HEARTBEAT_MS,
            batchSizes: BATCH_SIZES,
          }));

          log('info', 'Runtime registered via WebSocket', {
            pool: msg.pool,
            gpuType: runtime.gpuType,
            capabilities: runtime.capabilities,
          });
        }
      } else if (msg.pool) {
        const runtime = runtimes.get(msg.pool);
        if (runtime) {
          handleRuntimeMessage(runtime, msg);
        }
      }
    } catch (err) {
      log('error', 'Failed to parse incoming WebSocket message', { error: err.message });
    }
  });

  ws.on('close', () => {
    // Find which runtime this was and mark disconnected
    for (const [, runtime] of runtimes) {
      if (runtime.ws === ws) {
        runtime.wsReady = false;
        runtime.ws = null;
        log('warn', 'Runtime WebSocket disconnected', { runtime: runtime.id });
        break;
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEARTBEAT MONITOR & QUEUE DRAIN
// ═══════════════════════════════════════════════════════════════════════════════

// φ-timed heartbeat monitor
setInterval(() => {
  checkFailover();

  for (const [pool, runtime] of runtimes) {
    if (!runtime.isHealthy && runtime.url && runtime.status !== 'SHUTDOWN') {
      runtime.reconnectAttempt++;
      const delay = phiBackoff(runtime.reconnectAttempt, RECONNECT_BASE_MS, MAX_RECONNECT_MS);
      log('warn', 'Runtime unhealthy', {
        pool,
        status: runtime.status,
        reconnectAttempt: runtime.reconnectAttempt,
        nextRetryMs: delay,
      });
    }
  }

  // Drain queued tasks to available runtimes
  for (const [, runtime] of runtimes) {
    if (!runtime.isActive) continue;
    // Drain up to fib(5)=5 tasks per heartbeat per runtime
    let drained = 0;
    while (drained < fib(5)) {
      const task = dequeueForRuntime(runtime);
      if (!task) break;
      if (dispatchTaskToRuntime(runtime, task)) {
        drained++;
      } else {
        taskQueue.unshift(task); // Put it back
        break;
      }
    }
  }
}, HEARTBEAT_MS);

// Health scan at faster interval
setInterval(() => {
  for (const [pool, runtime] of runtimes) {
    if (runtime.ws && runtime.wsReady) {
      runtime.ws.send(JSON.stringify({ type: 'health-check' }));
    }
  }
}, HEALTH_CHECK_MS);

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.use(express.json({ limit: `${fib(6)}mb` })); // 8mb

// Health endpoint
app.get('/health', (req, res) => {
  const status = {};
  let healthyCount = 0;
  for (const [pool, rt] of runtimes) {
    status[pool] = rt.snapshot();
    if (rt.isHealthy) healthyCount++;
  }

  res.json({
    ok: healthyCount > 0,
    service: 'colab-gateway',
    version: '5.1.0',
    runtimes: status,
    healthyRuntimes: healthyCount,
    totalRuntimes: runtimes.size,
    queueDepth: taskQueue.length,
    queueCapacity: QUEUE_DEPTH,
    heartbeatMs: HEARTBEAT_MS,
    batchSizes: BATCH_SIZES,
    ts: new Date().toISOString(),
  });
});

// Register/update runtime health (HTTP fallback for runtimes without WebSocket)
app.post('/runtime/:pool/heartbeat', (req, res) => {
  const { pool } = req.params;
  const runtime = runtimes.get(pool);
  if (!runtime) {
    return res.status(404).json({ error: 'HEADY-COLAB-001', message: 'Unknown pool' });
  }

  runtime.updateHealth(req.body);
  log('info', 'Runtime heartbeat (HTTP)', {
    pool,
    gpuUtil: runtime.gpuUtil,
    memoryUtil: runtime.memoryUtil,
    status: runtime.status,
  });

  res.json({ ok: true, nextHeartbeatMs: HEARTBEAT_MS });
});

// Register runtime capabilities
app.post('/runtime/:pool/register', (req, res) => {
  const { pool } = req.params;
  const runtime = runtimes.get(pool);
  if (!runtime) {
    return res.status(404).json({ error: 'HEADY-COLAB-001', message: 'Unknown pool' });
  }

  if (req.body.capabilities) runtime.capabilities = req.body.capabilities;
  if (req.body.capabilityVector) runtime.capabilityVector = req.body.capabilityVector;
  if (req.body.gpuType) runtime.gpuType = req.body.gpuType;
  if (req.body.vram) runtime.vram = req.body.vram;
  if (req.body.models) runtime.availableModels = req.body.models;
  runtime.transitionTo('READY');

  log('info', 'Runtime registered', { pool, capabilities: runtime.capabilities });
  res.json({ ok: true, pool, heartbeatMs: HEARTBEAT_MS, batchSizes: BATCH_SIZES });
});

// Submit task to Colab runtime
app.post('/task', (req, res) => {
  const { type, data, embedding, preferPool, priority } = req.body;
  if (!type) {
    return res.status(400).json({ error: 'HEADY-COLAB-002', message: 'Missing task type' });
  }

  const task = {
    id: generateTaskId(),
    type,
    data,
    embedding: embedding || null,
    preferPool: preferPool || null,
    priority: priority || PSI, // Default priority: 0.618
    submittedAt: Date.now(),
  };

  // Route task to optimal runtime
  const runtime = preferPool ? runtimes.get(preferPool) : routeTask(task);

  if (runtime && runtime.isActive) {
    if (dispatchTaskToRuntime(runtime, task)) {
      log('info', 'Task dispatched', {
        taskId: task.id,
        type,
        runtime: runtime.id,
        pool: runtime.pool,
      });
      return res.json({
        ok: true,
        taskId: task.id,
        runtime: runtime.id,
        pool: runtime.pool,
        status: 'dispatched',
      });
    }
  }

  // All runtimes busy — enqueue
  const enqueueResult = enqueueTask(task);
  if (!enqueueResult.ok) {
    return res.status(503).json({
      error: 'HEADY-COLAB-003',
      message: 'All runtimes busy and queue full',
      queueDepth: taskQueue.length,
      queueCapacity: QUEUE_DEPTH,
    });
  }

  log('info', 'Task queued', {
    taskId: task.id,
    type,
    queuePosition: enqueueResult.queuePosition,
  });

  res.json({
    ok: true,
    taskId: task.id,
    status: 'queued',
    queuePosition: enqueueResult.queuePosition,
  });
});

// Get task result
app.get('/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  const result = taskResults.get(taskId);

  if (result) {
    return res.json({ ok: true, taskId, ...result });
  }

  // Check if task is still pending on any runtime
  for (const [, runtime] of runtimes) {
    if (runtime.pendingTasks.has(taskId)) {
      return res.json({
        ok: true,
        taskId,
        status: 'processing',
        runtime: runtime.id,
        pool: runtime.pool,
      });
    }
  }

  // Check queue
  const queuedIdx = taskQueue.findIndex(t => t.id === taskId);
  if (queuedIdx >= 0) {
    return res.json({
      ok: true,
      taskId,
      status: 'queued',
      queuePosition: queuedIdx + 1,
    });
  }

  res.status(404).json({ error: 'HEADY-COLAB-006', message: 'Task not found' });
});

// Batch embedding request
app.post('/embed', (req, res) => {
  const { texts, batchSize } = req.body;
  if (!texts || !Array.isArray(texts)) {
    return res.status(400).json({ error: 'HEADY-COLAB-004', message: 'Missing texts array' });
  }

  // Select optimal batch size from Fibonacci sequence
  const effectiveBatch = batchSize || BATCH_SIZES[2]; // default fib(8)=21
  const batches = [];
  for (let i = 0; i < texts.length; i += effectiveBatch) {
    batches.push(texts.slice(i, i + effectiveBatch));
  }

  // Route: small batches → hot (real-time), large → warm (batch processing)
  const preferPool = texts.length <= effectiveBatch ? 'hot' : 'warm';
  const runtime = runtimes.get(preferPool);

  // Create embedding tasks for each batch
  const taskIds = batches.map((batch, idx) => {
    const task = {
      id: generateTaskId(),
      type: 'embedding',
      data: { texts: batch, batchIndex: idx },
      preferPool,
      priority: texts.length <= effectiveBatch ? 1 : PSI,
      submittedAt: Date.now(),
    };

    if (runtime && runtime.isActive) {
      dispatchTaskToRuntime(runtime, task);
    } else {
      enqueueTask(task);
    }

    return task.id;
  });

  log('info', 'Embedding request', {
    textCount: texts.length,
    batches: batches.length,
    batchSize: effectiveBatch,
    routedTo: preferPool,
  });

  res.json({
    ok: true,
    totalTexts: texts.length,
    batches: batches.length,
    batchSize: effectiveBatch,
    routedTo: preferPool,
    dimensions: VECTOR.DIMS,
    taskIds,
  });
});

// Drain a runtime (graceful shutdown)
app.post('/runtime/:pool/drain', (req, res) => {
  const { pool } = req.params;
  const runtime = runtimes.get(pool);
  if (!runtime) {
    return res.status(404).json({ error: 'HEADY-COLAB-001', message: 'Unknown pool' });
  }

  runtime.transitionTo('DRAINING');

  if (runtime.ws && runtime.wsReady) {
    runtime.ws.send(JSON.stringify({
      type: 'drain',
      timeoutMs: DRAIN_TIMEOUT_MS,
    }));
  }

  log('info', 'Runtime draining', { pool, pendingTasks: runtime.taskCount });

  // After drain timeout, force shutdown
  setTimeout(() => {
    if (runtime.status === 'DRAINING') {
      runtime.transitionTo('SHUTDOWN');
      if (runtime.ws) {
        runtime.ws.close();
        runtime.ws = null;
        runtime.wsReady = false;
      }
    }
  }, DRAIN_TIMEOUT_MS);

  res.json({ ok: true, pool, status: 'DRAINING', drainTimeoutMs: DRAIN_TIMEOUT_MS });
});

// Prometheus metrics
app.get('/metrics', (req, res) => {
  const lines = [];
  for (const [pool, rt] of runtimes) {
    lines.push(`heady_colab_gpu_util{pool="${pool}"} ${rt.gpuUtil}`);
    lines.push(`heady_colab_gpu_util_avg{pool="${pool}"} ${rt.avgGpuUtil.toFixed(1)}`);
    lines.push(`heady_colab_memory_util{pool="${pool}"} ${rt.memoryUtil}`);
    lines.push(`heady_colab_temperature{pool="${pool}"} ${rt.temperature}`);
    lines.push(`heady_colab_load_factor{pool="${pool}"} ${rt.loadFactor.toFixed(4)}`);
    lines.push(`heady_colab_tasks_active{pool="${pool}"} ${rt.taskCount}`);
    lines.push(`heady_colab_tasks_total{pool="${pool}"} ${rt.totalTasks}`);
    lines.push(`heady_colab_tasks_completed{pool="${pool}"} ${rt.completedTasks}`);
    lines.push(`heady_colab_tasks_failed{pool="${pool}"} ${rt.failedTasks}`);
    lines.push(`heady_colab_healthy{pool="${pool}"} ${rt.isHealthy ? 1 : 0}`);
    lines.push(`heady_colab_ws_connected{pool="${pool}"} ${rt.wsReady ? 1 : 0}`);
  }
  lines.push(`heady_colab_queue_depth ${taskQueue.length}`);
  lines.push(`heady_colab_queue_capacity ${QUEUE_DEPTH}`);
  lines.push(`heady_colab_task_results_cached ${taskResults.size}`);
  res.setHeader('Content-Type', 'text/plain');
  res.send(lines.join('\n') + '\n');
});

// Runtime pool overview
app.get('/pool', (req, res) => {
  const pools = {};
  for (const [pool, rt] of runtimes) {
    pools[pool] = rt.snapshot();
  }
  res.json({
    ok: true,
    pools,
    lifecycle: LIFECYCLE,
    taskTypes: TASK_TYPES,
    constants: {
      heartbeatMs: HEARTBEAT_MS,
      taskTimeoutMs: TASK_TIMEOUT_MS,
      queueDepth: QUEUE_DEPTH,
      batchSizes: BATCH_SIZES,
      vectorDims: VECTOR.DIMS,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  log('info', 'Colab gateway started', {
    port: PORT,
    pools: [...runtimes.keys()],
    heartbeatMs: HEARTBEAT_MS,
    queueDepth: QUEUE_DEPTH,
    batchSizes: BATCH_SIZES,
    vectorDims: VECTOR.DIMS,
  });

  // Initiate outbound WebSocket connections to runtimes with configured URLs
  for (const [, runtime] of runtimes) {
    if (runtime.url) {
      connectToRuntime(runtime);
    }
  }
});

process.on('SIGTERM', () => {
  log('info', 'Colab gateway shutting down — draining runtimes');

  for (const [, rt] of runtimes) {
    rt.transitionTo('DRAINING');
    if (rt.ws && rt.wsReady) {
      rt.ws.send(JSON.stringify({ type: 'shutdown' }));
      rt.ws.close();
    }
    rt.transitionTo('SHUTDOWN');
  }

  wss.close(() => {
    server.close(() => {
      log('info', 'Colab gateway stopped');
      process.exit(0);
    });
  });
});

process.on('uncaughtException', (err) => {
  log('error', 'Uncaught exception', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
  log('error', 'Unhandled rejection', { reason: String(reason) });
});

module.exports = { app, server, runtimes, taskQueue, routeTask, LIFECYCLE, TASK_TYPES };
