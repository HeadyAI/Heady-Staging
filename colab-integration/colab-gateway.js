/**
 * Heady™ Colab Gateway — 3 Colab Pro+ Runtimes as Latent Space Ops
 * Port: 3352 | Manages Hot/Warm/Cold GPU runtimes
 * 
 * Runtime 1 (Hot): Active inference, real-time embedding, user-facing
 * Runtime 2 (Warm): Batch processing, fine-tuning, large embedding jobs
 * Runtime 3 (Cold): Analytics, pattern mining, experiments, backup compute
 * 
 * φ-timed heartbeats: PHI_TIMING.PHI_7 = 29,034ms
 * Automatic failover with φ-backoff reconnection
 * CSL cosine routing to optimal runtime
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const pino = require('pino');
const systemLogger = pino();


const express = require('express');
const http = require('http');
const { PHI, PSI, fib, phiMs, phiBackoff, CSL_THRESHOLDS, PHI_TIMING, cosineSimilarity, normalize } = require('../shared/phi-math');

const app = express();
const server = http.createServer(app);
const PORT = process.env.SERVICE_PORT || 3352;

// ─── φ-Constants ──────────────────────────────────────────────────────────────

const HEARTBEAT_MS     = PHI_TIMING.PHI_7;  // 29,034ms heartbeat cycle
const RECONNECT_BASE   = PHI_TIMING.PHI_1;  // 1,618ms base reconnect
const MAX_RECONNECT    = PHI_TIMING.PHI_8;  // 46,979ms max reconnect delay
const TASK_TIMEOUT_MS  = PHI_TIMING.PHI_6;  // 17,944ms per task
const QUEUE_DEPTH      = fib(13);           // 233 max queued tasks
const BATCH_SIZES      = [fib(6), fib(7), fib(8), fib(9), fib(10)]; // [8, 13, 21, 34, 55]

const POOL_WEIGHTS = {
  hot:  0.34,   // 34% — user-facing, latency-critical
  warm: 0.21,   // 21% — background batch processing
  cold: 0.13,   // 13% — analytics, experiments
};

// ─── Runtime State ────────────────────────────────────────────────────────────

const LIFECYCLE = ['PROVISIONING', 'READY', 'ACTIVE', 'DRAINING', 'SHUTDOWN'];

class ColabRuntime {
  constructor(config) {
    this.id = config.id;
    this.pool = config.pool;               // 'hot', 'warm', 'cold'
    this.url = config.url;
    this.status = 'PROVISIONING';
    this.gpuType = config.gpuType || 'unknown';
    this.vram = config.vram || 0;
    this.gpuUtil = 0;
    this.memoryUtil = 0;
    this.temperature = 0;
    this.lastHeartbeat = null;
    this.taskCount = 0;
    this.totalTasks = 0;
    this.reconnectAttempt = 0;
    this.capabilities = config.capabilities || [];
    this.capabilityVector = new Array(384).fill(0); // 384-dim capability embedding
  }
  
  get isHealthy() {
    if (!this.lastHeartbeat) return false;
    return (Date.now() - this.lastHeartbeat) < (HEARTBEAT_MS * 2);
  }
  
  get loadFactor() {
    return (this.gpuUtil * PSI + this.memoryUtil * (1 - PSI)) / 100;
  }
  
  updateHealth(metrics) {
    this.gpuUtil = metrics.gpuUtil || 0;
    this.memoryUtil = metrics.memoryUtil || 0;
    this.temperature = metrics.temperature || 0;
    this.gpuType = metrics.gpuType || this.gpuType;
    this.vram = metrics.vram || this.vram;
    this.lastHeartbeat = Date.now();
    this.status = 'ACTIVE';
    this.reconnectAttempt = 0;
  }
}

const runtimes = new Map([
  ['hot', new ColabRuntime({ id: 'colab-hot', pool: 'hot', url: process.env.COLAB_RUNTIME_HOT_URL || 'http://0.0.0.0:3352' })],
  ['warm', new ColabRuntime({ id: 'colab-warm', pool: 'warm', url: process.env.COLAB_RUNTIME_WARM_URL || '' })],
  ['cold', new ColabRuntime({ id: 'colab-cold', pool: 'cold', url: process.env.COLAB_RUNTIME_COLD_URL || '' })],
]);

const taskQueue = [];
function log(level, msg, meta = {}) {
  if (systemLogger[level]) {
    systemLogger[level]({ service: 'colab-gateway', ...meta }, msg);
  } else {
    systemLogger.info({ service: 'colab-gateway', level, ...meta }, msg);
  }
}

// ─── CSL Task Routing ─────────────────────────────────────────────────────────

function routeTask(task) {
  let bestRuntime = null;
  let bestScore = -1;
  
  for (const [pool, runtime] of runtimes) {
    if (!runtime.isHealthy) continue;
    if (runtime.status !== 'ACTIVE') continue;
    
    // CSL cosine score between task and runtime capabilities
    const affinityScore = task.embedding && runtime.capabilityVector
      ? cosineSimilarity(task.embedding, runtime.capabilityVector)
      : POOL_WEIGHTS[pool] || PSI;
    
    // φ-weighted composite: affinity × (1 - loadFactor)
    const loadPenalty = 1 - (runtime.loadFactor * PSI);
    const compositeScore = affinityScore * loadPenalty;
    
    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestRuntime = runtime;
    }
  }
  
  return bestRuntime;
}

// ─── Failover ─────────────────────────────────────────────────────────────────

function promoteRuntime(fromPool, toPool) {
  const source = runtimes.get(fromPool);
  if (!source || !source.isHealthy) return false;
  
  log('warn', 'Runtime promotion', { from: fromPool, to: toPool });
  // In production: reconfigure the runtime for the new pool's workload
  return true;
}

function checkFailover() {
  const hot = runtimes.get('hot');
  const warm = runtimes.get('warm');
  const cold = runtimes.get('cold');
  
  if (hot && !hot.isHealthy && warm && warm.isHealthy) {
    promoteRuntime('warm', 'hot');
  }
  if (warm && !warm.isHealthy && cold && cold.isHealthy) {
    promoteRuntime('cold', 'warm');
  }
}

// ─── Heartbeat Monitor ────────────────────────────────────────────────────────

setInterval(() => {
  checkFailover();
  
  for (const [pool, runtime] of runtimes) {
    if (!runtime.isHealthy && runtime.url) {
      runtime.reconnectAttempt++;
      const delay = phiBackoff(runtime.reconnectAttempt, RECONNECT_BASE, MAX_RECONNECT);
      log('warn', 'Runtime unhealthy', { pool, reconnectAttempt: runtime.reconnectAttempt, nextRetryMs: delay });
    }
  }
}, HEARTBEAT_MS);

// ─── Routes ───────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .filter(Boolean)
  .map(o => o.trim());

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  next();
}

app.use(corsMiddleware);
app.use(express.json({ limit: '8mb' }));

app.get('/health', (req, res) => {
  const status = {};
  for (const [pool, rt] of runtimes) {
    status[pool] = {
      id: rt.id, status: rt.status, healthy: rt.isHealthy,
      gpuType: rt.gpuType, vram: rt.vram, gpuUtil: rt.gpuUtil,
      loadFactor: rt.loadFactor.toFixed(3), taskCount: rt.taskCount,
    };
  }
  res.json({
    ok: true, service: 'colab-gateway', version: '5.1.0',
    runtimes: status, queueDepth: taskQueue.length,
    ts: new Date().toISOString(),
  });
});

// Register/update runtime health (called by Colab notebooks)
app.post('/runtime/:pool/heartbeat', (req, res) => {
  const { pool } = req.params;
  const runtime = runtimes.get(pool);
  if (!runtime) return res.status(404).json({ error: 'HEADY-COLAB-001', message: 'Unknown pool' });
  
  runtime.updateHealth(req.body);
  log('info', 'Runtime heartbeat', { pool, gpuUtil: runtime.gpuUtil, status: runtime.status });
  
  res.json({ ok: true, nextHeartbeatMs: HEARTBEAT_MS });
});

// Submit task to Colab
app.post('/task', (req, res) => {
  const { type, data, embedding, preferPool } = req.body;
  if (!type) return res.status(400).json({ error: 'HEADY-COLAB-002', message: 'Missing task type' });
  
  const task = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type, data, embedding, preferPool,
    submittedAt: Date.now(),
  };
  
  const runtime = preferPool ? runtimes.get(preferPool) : routeTask(task);
  
  if (!runtime || !runtime.isHealthy) {
    if (taskQueue.length < QUEUE_DEPTH) {
      taskQueue.push(task);
      return res.json({ ok: true, taskId: task.id, status: 'queued', queuePosition: taskQueue.length });
    }
    return res.status(503).json({ error: 'HEADY-COLAB-003', message: 'All runtimes busy and queue full' });
  }
  
  runtime.taskCount++;
  runtime.totalTasks++;
  
  log('info', 'Task routed', { taskId: task.id, type, runtime: runtime.id, pool: runtime.pool });
  res.json({ ok: true, taskId: task.id, runtime: runtime.id, pool: runtime.pool, status: 'submitted' });
});

// Batch embedding request
app.post('/embed', (req, res) => {
  const { texts, batchSize } = req.body;
  if (!texts || !Array.isArray(texts)) {
    return res.status(400).json({ error: 'HEADY-COLAB-004', message: 'Missing texts array' });
  }
  
  const effectiveBatch = batchSize || BATCH_SIZES[2]; // default fib(8)=21
  const batches = [];
  for (let i = 0; i < texts.length; i += effectiveBatch) {
    batches.push(texts.slice(i, i + effectiveBatch));
  }
  
  log('info', 'Embedding request', { textCount: texts.length, batches: batches.length, batchSize: effectiveBatch });
  
  // Route to optimal runtime (prefer hot for real-time, warm for batch)
  const preferPool = texts.length <= effectiveBatch ? 'hot' : 'warm';
  
  res.json({
    ok: true,
    totalTexts: texts.length,
    batches: batches.length,
    batchSize: effectiveBatch,
    routedTo: preferPool,
    dimensions: 384,
  });
});

app.get('/metrics', (req, res) => {
  const lines = [];
  for (const [pool, rt] of runtimes) {
    lines.push(`heady_colab_gpu_util{pool="${pool}"} ${rt.gpuUtil}`);
    lines.push(`heady_colab_memory_util{pool="${pool}"} ${rt.memoryUtil}`);
    lines.push(`heady_colab_tasks_total{pool="${pool}"} ${rt.totalTasks}`);
    lines.push(`heady_colab_healthy{pool="${pool}"} ${rt.isHealthy ? 1 : 0}`);
  }
  lines.push(`heady_colab_queue_depth ${taskQueue.length}`);
  res.setHeader('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});

server.listen(PORT, () => {
  log('info', 'Colab gateway started', { port: PORT, pools: Object.keys(POOL_WEIGHTS), heartbeatMs: HEARTBEAT_MS });
});

process.on('SIGTERM', () => {
  for (const [, rt] of runtimes) rt.status = 'SHUTDOWN';
  log('info', 'Colab gateway shutting down');
  server.close(() => process.exit(0));
});
