/**
 * Heady™ Scheduler Service v5.0
 * Phi-timed task scheduling — cron-like with Sacred Geometry intervals
 * Fibonacci-sized job queues, CSL-scored priority
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const EventEmitter = require('events');
const {
  PHI, PSI, fib, phiBackoffWithJitter, phiFusionScore,
  CSL_THRESHOLDS, TIMING, SERVICE_PORTS,
} = require('../../../shared/phi-math');
const { createLogger } = require('../../../shared/logger');
const { HealthProbe } = require('../../../shared/health');

const logger = createLogger('scheduler-service');
const PORT = SERVICE_PORTS.HEADY_SCHEDULER;

const MAX_JOBS = fib(12);        // 144 scheduled jobs
const MAX_HISTORY = fib(14);     // 377 execution history entries

class ScheduledJob {
  constructor(config) {
    this.id = config.id || crypto.randomBytes(fib(6)).toString('hex');
    this.name = config.name;
    this.handler = config.handler;
    this.intervalMs = config.intervalMs;
    this.cronExpression = config.cronExpression;
    this.priority = config.priority || phiFusionScore([0.5, 0.5, 0.5]);
    this.enabled = config.enabled !== false;
    this.maxRetries = config.maxRetries || fib(5);
    this.retryCount = 0;
    this.lastRun = 0;
    this.nextRun = 0;
    this.runCount = 0;
    this.failCount = 0;
    this.avgDurationMs = 0;
    this.totalDurationMs = 0;
    this.createdAt = Date.now();
    this._timer = null;

    if (this.intervalMs) {
      this.nextRun = Date.now() + this.intervalMs;
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      intervalMs: this.intervalMs,
      priority: this.priority,
      enabled: this.enabled,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      runCount: this.runCount,
      failCount: this.failCount,
      avgDurationMs: Math.round(this.avgDurationMs),
      createdAt: this.createdAt,
    };
  }
}

class ExecutionHistory {
  constructor(capacity = MAX_HISTORY) {
    this.capacity = capacity;
    this.entries = [];
  }

  record(entry) {
    this.entries.push({
      ...entry,
      timestamp: Date.now(),
    });
    while (this.entries.length > this.capacity) {
      this.entries.shift();
    }
  }

  query(filters = {}) {
    let results = [...this.entries];
    if (filters.jobId) results = results.filter(e => e.jobId === filters.jobId);
    if (filters.success !== undefined) results = results.filter(e => e.success === filters.success);
    if (filters.limit) results = results.slice(-filters.limit);
    return results;
  }

  get size() { return this.entries.length; }
}

class HeadyScheduler extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
    this.history = new ExecutionHistory();
    this.running = false;
    this._tickInterval = null;
    this._activeExecutions = new Set();
  }

  async start() {
    this.running = true;
    this._tickInterval = setInterval(() => this._tick(), TIMING.HEARTBEAT_MS);
    logger.info('scheduler_started');
    this.emit('started');
  }

  async stop() {
    this.running = false;
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }

    // Cancel all job timers
    for (const job of this.jobs.values()) {
      if (job._timer) { clearTimeout(job._timer); job._timer = null; }
    }

    // Wait for active executions
    while (this._activeExecutions.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info('scheduler_stopped');
    this.emit('stopped');
  }

  scheduleJob(config) {
    if (this.jobs.size >= MAX_JOBS) {
      logger.warn('scheduler_at_capacity', { maxJobs: MAX_JOBS });
      return null;
    }

    const job = new ScheduledJob(config);
    this.jobs.set(job.id, job);

    logger.info('job_scheduled', { jobId: job.id, name: job.name, intervalMs: job.intervalMs });
    this.emit('jobScheduled', { jobId: job.id });
    return job;
  }

  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job._timer) { clearTimeout(job._timer); job._timer = null; }
    this.jobs.delete(jobId);

    logger.info('job_cancelled', { jobId, name: job.name });
    this.emit('jobCancelled', { jobId });
    return true;
  }

  enableJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    job.enabled = true;
    job.nextRun = Date.now() + (job.intervalMs || TIMING.HEALTH_CHECK_MS);
    return true;
  }

  disableJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    job.enabled = false;
    return true;
  }

  async _tick() {
    if (!this.running) return;
    const now = Date.now();

    const dueJobs = [];
    for (const job of this.jobs.values()) {
      if (job.enabled && job.nextRun <= now && !this._activeExecutions.has(job.id)) {
        dueJobs.push(job);
      }
    }

    // Sort by priority descending
    dueJobs.sort((a, b) => b.priority - a.priority);

    // Execute due jobs (max concurrency = fib(8) = 21)
    const batch = dueJobs.slice(0, fib(8));
    for (const job of batch) {
      this._executeJob(job);
    }
  }

  async _executeJob(job) {
    this._activeExecutions.add(job.id);
    const start = Date.now();

    try {
      if (typeof job.handler === 'function') {
        await job.handler({ job, scheduler: this });
      }

      const duration = Date.now() - start;
      job.runCount++;
      job.totalDurationMs += duration;
      job.avgDurationMs = job.totalDurationMs / job.runCount;
      job.lastRun = Date.now();
      job.nextRun = Date.now() + (job.intervalMs || TIMING.HEALTH_CHECK_MS);
      job.retryCount = 0;

      this.history.record({
        jobId: job.id,
        name: job.name,
        success: true,
        durationMs: duration,
      });

      this.emit('jobCompleted', { jobId: job.id, durationMs: duration });
      logger.info('job_executed', { jobId: job.id, name: job.name, durationMs: duration });
    } catch (err) {
      job.failCount++;
      job.retryCount++;

      const shouldRetry = job.retryCount <= job.maxRetries;
      if (shouldRetry) {
        const delay = phiBackoffWithJitter(job.retryCount - 1);
        job.nextRun = Date.now() + delay;
        logger.warn('job_retry_scheduled', { jobId: job.id, attempt: job.retryCount, delayMs: delay });
      } else {
        job.enabled = false;
        logger.error('job_disabled_after_retries', { jobId: job.id, retries: job.maxRetries });
      }

      this.history.record({
        jobId: job.id,
        name: job.name,
        success: false,
        error: err.message,
        retryCount: job.retryCount,
      });

      this.emit('jobFailed', { jobId: job.id, error: err.message, retryCount: job.retryCount });
    } finally {
      this._activeExecutions.delete(job.id);
    }
  }

  getJobs() {
    return [...this.jobs.values()].map(j => j.toJSON());
  }

  getHistory(filters = {}) {
    return this.history.query(filters);
  }

  getStats() {
    const jobs = [...this.jobs.values()];
    return {
      totalJobs: jobs.length,
      enabledJobs: jobs.filter(j => j.enabled).length,
      disabledJobs: jobs.filter(j => !j.enabled).length,
      activeExecutions: this._activeExecutions.size,
      historySize: this.history.size,
      totalExecutions: jobs.reduce((s, j) => s + j.runCount, 0),
      totalFailures: jobs.reduce((s, j) => s + j.failCount, 0),
    };
  }
}

function createSchedulerService() {
  const scheduler = new HeadyScheduler();
  const healthProbe = new HealthProbe('scheduler-service');

  healthProbe.registerCheck('scheduler', async () => ({
    healthy: scheduler.running,
    ...scheduler.getStats(),
  }));

  function parseBody(req) {
    return new Promise((resolve) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve({}); } });
    });
  }

  function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${process.env.HOST || "localhost"}:${PORT}`);
    const method = req.method;

    if (url.pathname.startsWith('/health')) return healthProbe.fullHealthHandler(req, res);

    try {
      if (method === 'POST' && url.pathname === '/jobs') {
        const body = await parseBody(req);
        const job = scheduler.scheduleJob(body);
        return job ? json(res, 201, job.toJSON()) : json(res, 503, { error: 'AT_CAPACITY' });
      }

      if (method === 'GET' && url.pathname === '/jobs') {
        return json(res, 200, scheduler.getJobs());
      }

      if (method === 'DELETE' && url.pathname.startsWith('/jobs/')) {
        const jobId = url.pathname.split('/')[2];
        return scheduler.cancelJob(jobId) ? json(res, 200, { cancelled: true }) : json(res, 404, { error: 'NOT_FOUND' });
      }

      if (method === 'GET' && url.pathname === '/history') {
        const filters = {
          jobId: url.searchParams.get('jobId'),
          limit: parseInt(url.searchParams.get('limit')) || fib(8),
        };
        return json(res, 200, scheduler.getHistory(filters));
      }

      if (method === 'GET' && url.pathname === '/stats') {
        return json(res, 200, scheduler.getStats());
      }

      json(res, 404, { error: 'NOT_FOUND' });
    } catch (err) {
      logger.error('request_error', { path: url.pathname, error: err.message });
      json(res, 500, { error: 'INTERNAL_ERROR' });
    }
  });

  return { server, scheduler, healthProbe, PORT };
}

module.exports = { createSchedulerService, HeadyScheduler };
