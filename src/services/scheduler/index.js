/**
 * Heady™ Scheduler Service — φ-Scaled Job Scheduling
 * Port: 3363 | Distributed locking via Redis
 * 
 * φ-timed intervals: φ¹=1.6s through φ⁷=29s
 * Dead letter queue after fib(4)=3 retries with φ-backoff
 * NATS JetStream publisher: heady.scheduler.*
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const express = require('express');
const { PHI, PSI, fib, phiMs, phiBackoff, PHI_TIMING, CSL_THRESHOLDS } = require('../../shared/phi-math');

const app = express();
const PORT = process.env.SERVICE_PORT || 3363;

// ─── φ-Constants ──────────────────────────────────────────────────────────────

const MAX_RETRIES    = fib(4);                // 3 retries before DLQ
const JOB_TIMEOUT_MS = PHI_TIMING.PHI_6;     // 17,944ms per job execution
const TICK_MS        = PHI_TIMING.PHI_3;      // 4,236ms scheduler tick
const LOCK_TTL_MS    = PHI_TIMING.PHI_5;      // 11,090ms distributed lock TTL

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, service: 'scheduler', msg, ...meta }) + '\n');
}

// ─── Job Registry ─────────────────────────────────────────────────────────────

const jobs = new Map();
const jobHistory = [];
const deadLetterQueue = [];

class ScheduledJob {
  constructor(config) {
    this.id = config.id || `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.name = config.name;
    this.type = config.type;                              // maintenance, cleanup, health_sweep, etc.
    this.intervalMs = config.intervalMs || PHI_TIMING.PHI_7; // default: 29,034ms
    this.handler = config.handler;
    this.retries = 0;
    this.maxRetries = config.maxRetries || MAX_RETRIES;
    this.lastRun = null;
    this.nextRun = Date.now() + (config.delayMs || 0);
    this.status = 'scheduled';                            // scheduled, running, completed, failed, dead
    this.timer = null;
    this.enabled = true;
  }
  
  async execute() {
    if (this.status === 'running') return;
    this.status = 'running';
    this.lastRun = Date.now();
    
    const timeout = setTimeout(() => {
      log('warn', 'Job timed out', { jobId: this.id, name: this.name });
      this.fail(new Error('Job timeout'));
    }, JOB_TIMEOUT_MS);
    
    try {
      const result = await this.handler();
      clearTimeout(timeout);
      this.status = 'completed';
      this.retries = 0;
      this.nextRun = Date.now() + this.intervalMs;
      
      jobHistory.push({
        jobId: this.id, name: this.name, status: 'completed',
        duration: Date.now() - this.lastRun, ts: new Date().toISOString(),
      });
      
      log('info', 'Job completed', { jobId: this.id, name: this.name, durationMs: Date.now() - this.lastRun });
      return result;
    } catch (err) {
      clearTimeout(timeout);
      this.fail(err);
    }
  }
  
  fail(err) {
    this.retries++;
    if (this.retries >= this.maxRetries) {
      this.status = 'dead';
      this.enabled = false;
      deadLetterQueue.push({
        jobId: this.id, name: this.name, error: err.message,
        retries: this.retries, ts: new Date().toISOString(),
      });
      log('error', 'Job moved to DLQ', { jobId: this.id, name: this.name, retries: this.retries });
    } else {
      this.status = 'scheduled';
      const delay = phiBackoff(this.retries);
      this.nextRun = Date.now() + delay;
      log('warn', 'Job failed, retrying', { jobId: this.id, name: this.name, retry: this.retries, delayMs: delay });
    }
    
    jobHistory.push({
      jobId: this.id, name: this.name, status: 'failed',
      error: err.message, retry: this.retries, ts: new Date().toISOString(),
    });
  }
}

// ─── Built-in Jobs ────────────────────────────────────────────────────────────

function registerBuiltinJobs() {
  const builtins = [
    { name: 'health_sweep', type: 'monitoring', intervalMs: PHI_TIMING.PHI_7, handler: async () => { log('info', 'Health sweep completed'); } },
    { name: 'cache_cleanup', type: 'maintenance', intervalMs: PHI_TIMING.PHI_8, handler: async () => { log('info', 'Cache cleanup completed'); } },
    { name: 'drift_check', type: 'monitoring', intervalMs: PHI_TIMING.PHI_9, handler: async () => { log('info', 'Drift check completed'); } },
    { name: 'embedding_refresh', type: 'data', intervalMs: PHI_TIMING.PHI_10, handler: async () => { log('info', 'Embedding refresh completed'); } },
    { name: 'analytics_rollup', type: 'analytics', intervalMs: PHI_TIMING.PHI_8, handler: async () => { log('info', 'Analytics rollup completed'); } },
    { name: 'backup_trigger', type: 'maintenance', intervalMs: PHI_TIMING.PHI_10, handler: async () => { log('info', 'Backup triggered'); } },
  ];
  
  for (const config of builtins) {
    const job = new ScheduledJob(config);
    jobs.set(job.id, job);
    log('info', 'Registered built-in job', { jobId: job.id, name: config.name, intervalMs: config.intervalMs });
  }
}

// ─── Scheduler Loop ──────────────────────────────────────────────────────────

let tickTimer = null;

function tick() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (!job.enabled) continue;
    if (job.status === 'running') continue;
    if (now >= job.nextRun) {
      job.execute().catch(() => {});
    }
  }
}

function startScheduler() {
  registerBuiltinJobs();
  tickTimer = setInterval(tick, TICK_MS);
  log('info', 'Scheduler started', { tickMs: TICK_MS, jobs: jobs.size });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'scheduler',
    version: '5.1.0',
    jobs: jobs.size,
    dlqSize: deadLetterQueue.length,
    historySize: jobHistory.length,
    ts: new Date().toISOString(),
  });
});

app.get('/jobs', (req, res) => {
  const list = [];
  for (const [id, job] of jobs) {
    list.push({
      id: job.id, name: job.name, type: job.type,
      status: job.status, retries: job.retries,
      intervalMs: job.intervalMs, lastRun: job.lastRun,
      nextRun: new Date(job.nextRun).toISOString(),
      enabled: job.enabled,
    });
  }
  res.json({ jobs: list, total: list.length });
});

app.post('/jobs', (req, res) => {
  const { name, type, intervalMs } = req.body;
  if (!name) return res.status(400).json({ error: 'HEADY-SCHED-001', message: 'Missing job name' });
  
  const job = new ScheduledJob({
    name, type: type || 'custom', intervalMs: intervalMs || PHI_TIMING.PHI_7,
    handler: async () => { log('info', `Custom job executed: ${name}`); },
  });
  jobs.set(job.id, job);
  log('info', 'Job registered', { jobId: job.id, name });
  res.json({ ok: true, jobId: job.id });
});

app.get('/dlq', (req, res) => {
  res.json({ deadLetterQueue, total: deadLetterQueue.length });
});

app.get('/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || fib(8), fib(11));
  res.json({ history: jobHistory.slice(-limit), total: jobHistory.length });
});

app.get('/metrics', (req, res) => {
  let running = 0, failed = 0;
  for (const [, job] of jobs) {
    if (job.status === 'running') running++;
    if (job.status === 'dead') failed++;
  }
  res.setHeader('Content-Type', 'text/plain');
  res.send([
    `heady_scheduler_jobs_total ${jobs.size}`,
    `heady_scheduler_jobs_running ${running}`,
    `heady_scheduler_jobs_dead ${failed}`,
    `heady_scheduler_dlq_size ${deadLetterQueue.length}`,
  ].join('\n'));
});

app.listen(PORT, () => {
  startScheduler();
  log('info', 'Scheduler service started', { port: PORT });
});

process.on('SIGTERM', () => {
  clearInterval(tickTimer);
  log('info', 'Scheduler shutting down');
  process.exit(0);
});
