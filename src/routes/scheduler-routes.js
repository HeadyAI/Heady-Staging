// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/routes/scheduler-routes.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const express = require('express');
const { createLogger } = require('../../packages/structured-logger');
const { PHI, phiBackoff, phiScale } = require('../../packages/phi-math');

// ═══════════════════════════════════════════════════════════════════
// Structured Logger Configuration
// ═══════════════════════════════════════════════════════════════════

const logger = createLogger('heady-scheduler-routes', 'scheduler');

// ═══════════════════════════════════════════════════════════════════
// φ-Scaled Interval Presets
// ═══════════════════════════════════════════════════════════════════

const PHI_INTERVAL_PRESETS = {
  'phi-second': Math.round(PHI * 1000),                    // ~1618ms
  'phi-minute': Math.round(PHI * 60 * 1000),               // ~96.8 seconds
  'phi-5min': Math.round(PHI * 60 * 1000 * 5),             // ~484 seconds
  'phi-hour': Math.round(PHI * 3600 * 1000),               // ~5.8 hours
  'phi-day': Math.round(PHI * 86400 * 1000),               // ~139.9 hours
};

// ═══════════════════════════════════════════════════════════════════
// Router Setup and Global State
// ═══════════════════════════════════════════════════════════════════

const router = express.Router();

// In-memory job storage
const jobs = new Map();

// Job ID counter
let jobIdCounter = 0;

// Active intervals/timeouts by job ID
const activeSchedules = new Map();

// Configuration constants
const MAX_CONCURRENT_JOBS = 100;
const MAX_RUN_HISTORY = 50;
const MAX_FAILURES_BEFORE_PAUSE = 5;

// Track concurrent job execution
let concurrentJobCount = 0;

// ═══════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate a unique job ID
 */
function generateJobId() {
  return `job-${Date.now()}-${++jobIdCounter}`;
}

/**
 * Parse φ-scaled preset or return as-is (milliseconds)
 */
function resolveInterval(intervalSpec) {
  if (typeof intervalSpec === 'string' && PHI_INTERVAL_PRESETS[intervalSpec]) {
    return PHI_INTERVAL_PRESETS[intervalSpec];
  }
  if (typeof intervalSpec === 'number') {
    return intervalSpec;
  }
  throw new Error(`Unknown interval spec: ${intervalSpec}`);
}

/**
 * Parse cron expression (very basic: supports simple patterns)
 * For simplicity, we support: "* * * * *" (every minute) or specific patterns
 * This is a minimal implementation. Full cron support would be more complex.
 */
function getCronNextRun(cronExpr, fromDate = new Date()) {
  // Basic cron parsing: minute hour dayOfMonth month dayOfWeek
  const parts = cronExpr.split(' ');
  if (parts.length !== 5) {
    throw new Error('Cron expression must have 5 fields');
  }

  const [minStr, hourStr, domStr, monStr, dowStr] = parts;

  // For simplicity, return next occurrence based on minute/hour only
  let nextRun = new Date(fromDate);
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);

  // If current minute matches, move to next hour
  if (minStr === '*' && hourStr === '*') {
    // Every minute
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);
    if (nextRun <= fromDate) {
      nextRun.setMinutes(nextRun.getMinutes() + 1);
    }
  } else if (hourStr === '*') {
    // Specific minute, every hour
    const minute = parseInt(minStr, 10);
    if (minute >= 0 && minute < 60) {
      nextRun.setMinutes(minute);
      if (nextRun <= fromDate) {
        nextRun.setHours(nextRun.getHours() + 1);
      }
    }
  } else {
    // Specific hour and minute
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minStr, 10);
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      nextRun.setHours(hour);
      nextRun.setMinutes(minute);
      if (nextRun <= fromDate) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    }
  }

  return nextRun;
}

/**
 * Schedule a job for execution (handles interval, cron, or once)
 */
function scheduleJob(job) {
  const jobId = job.id;

  // Clear any existing schedule
  if (activeSchedules.has(jobId)) {
    const existing = activeSchedules.get(jobId);
    if (existing.type === 'interval') {
      clearInterval(existing.id);
    } else if (existing.type === 'timeout') {
      clearTimeout(existing.id);
    }
    activeSchedules.delete(jobId);
  }

  if (!job.enabled) {
    logger.debug(`Job not scheduled (disabled)`, { jobId });
    return;
  }

  if (job.type === 'interval') {
    const intervalMs = resolveInterval(job.intervalMs);
    const intervalId = setInterval(async () => {
      await executeJob(job);
    }, intervalMs);

    activeSchedules.set(jobId, { type: 'interval', id: intervalId });
    logger.debug(`Job scheduled (interval)`, { jobId, intervalMs });
  } else if (job.type === 'cron') {
    const nextRun = getCronNextRun(job.cronExpr);
    const delayMs = Math.max(0, nextRun.getTime() - Date.now());

    const timeoutId = setTimeout(async () => {
      await executeJob(job);
      // Reschedule for next cron occurrence
      scheduleJob(job);
    }, delayMs);

    activeSchedules.set(jobId, { type: 'timeout', id: timeoutId });
    logger.debug(`Job scheduled (cron)`, { jobId, nextRun: nextRun.toISOString() });
  } else if (job.type === 'once') {
    const runDate = new Date(job.runAt);
    const delayMs = Math.max(0, runDate.getTime() - Date.now());

    const timeoutId = setTimeout(async () => {
      await executeJob(job);
      job.enabled = false; // Disable after single run
    }, delayMs);

    activeSchedules.set(jobId, { type: 'timeout', id: timeoutId });
    logger.debug(`Job scheduled (once)`, { jobId, runAt: job.runAt });
  }
}

/**
 * Execute a job with error handling and retry logic
 */
async function executeJob(job) {
  if (concurrentJobCount >= MAX_CONCURRENT_JOBS) {
    logger.warn(`Max concurrent jobs reached, skipping execution`, {
      jobId: job.id,
      concurrentJobCount,
    });
    return;
  }

  concurrentJobCount++;
  const startTime = Date.now();

  try {
    logger.info(`Job execution started`, {
      jobId: job.id,
      name: job.name,
      handler: job.handler,
    });

    // Simulate job execution (in real scenario, call actual handler)
    // For now, we'll use a placeholder async function
    await simulateJobHandler(job);

    const duration = Date.now() - startTime;
    const runRecord = {
      timestamp: new Date().toISOString(),
      status: 'success',
      durationMs: duration,
      error: null,
    };

    job.runHistory.unshift(runRecord);
    if (job.runHistory.length > MAX_RUN_HISTORY) {
      job.runHistory.pop();
    }

    job.lastRun = runRecord.timestamp;
    job.failureCount = 0;

    logger.info(`Job execution succeeded`, {
      jobId: job.id,
      durationMs: duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const runRecord = {
      timestamp: new Date().toISOString(),
      status: 'failed',
      durationMs: duration,
      error: error.message,
    };

    job.runHistory.unshift(runRecord);
    if (job.runHistory.length > MAX_RUN_HISTORY) {
      job.runHistory.pop();
    }

    job.failureCount++;

    logger.error(`Job execution failed`, {
      jobId: job.id,
      error: error.message,
      failureCount: job.failureCount,
    });

    // Auto-pause if too many failures
    if (job.failureCount >= MAX_FAILURES_BEFORE_PAUSE) {
      job.enabled = false;
      logger.warn(`Job auto-paused due to repeated failures`, {
        jobId: job.id,
        failureCount: job.failureCount,
      });
    }
  } finally {
    concurrentJobCount--;
  }
}

/**
 * Simulate job handler (placeholder for actual handler invocation)
 */
async function simulateJobHandler(job) {
  // Simulate async work
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 500 + 100; // 100-600ms
    setTimeout(() => {
      // 95% success rate
      if (Math.random() > 0.95) {
        reject(new Error(`Simulated handler failure for ${job.name}`));
      } else {
        resolve({ result: `Handler executed for ${job.name}` });
      }
    }, delay);
  });
}

/**
 * Middleware — Request/Response Logging
 */
router.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    });
  });
  next();
});

// ═══════════════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /jobs
 * Create a scheduled job
 * Body: { name, type, intervalMs?, cronExpr?, runAt?, handler, metadata?, enabled? }
 */
router.post('/jobs', (req, res) => {
  try {
    const {
      name,
      type,
      intervalMs,
      cronExpr,
      runAt,
      handler,
      metadata = {},
      enabled = true,
    } = req.body;

    if (!name || !type || !handler) {
      logger.warn(`Invalid create job request`, {
        hasName: !!name,
        hasType: !!type,
        hasHandler: !!handler,
      });
      return res.status(400).json({
        error: 'Missing required fields: name, type, handler',
      });
    }

    if (!['interval', 'cron', 'once'].includes(type)) {
      return res.status(400).json({
        error: 'Type must be one of: interval, cron, once',
      });
    }

    // Validate type-specific fields
    if (type === 'interval' && !intervalMs) {
      return res.status(400).json({
        error: 'interval type requires intervalMs field',
      });
    }
    if (type === 'cron' && !cronExpr) {
      return res.status(400).json({
        error: 'cron type requires cronExpr field',
      });
    }
    if (type === 'once' && !runAt) {
      return res.status(400).json({
        error: 'once type requires runAt field (ISO date)',
      });
    }

    const job = {
      id: generateJobId(),
      name,
      type,
      intervalMs,
      cronExpr,
      runAt,
      handler,
      metadata,
      enabled,
      createdAt: new Date().toISOString(),
      lastRun: null,
      failureCount: 0,
      runHistory: [],
    };

    jobs.set(job.id, job);
    scheduleJob(job);

    logger.info(`Job created`, {
      jobId: job.id,
      name: job.name,
      type: job.type,
    });

    res.status(201).json({
      status: 'created',
      job: {
        id: job.id,
        name: job.name,
        type: job.type,
        enabled: job.enabled,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    logger.error(`Create job error`, {
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to create job',
      message: error.message,
    });
  }
});

/**
 * GET /jobs
 * List all jobs with optional status filter
 * Query: ?status=active|paused|completed
 */
router.get('/jobs', (req, res) => {
  try {
    const { status } = req.query;

    let jobList = Array.from(jobs.values());

    if (status === 'active') {
      jobList = jobList.filter((j) => j.enabled && j.failureCount < MAX_FAILURES_BEFORE_PAUSE);
    } else if (status === 'paused') {
      jobList = jobList.filter((j) => !j.enabled || j.failureCount >= MAX_FAILURES_BEFORE_PAUSE);
    } else if (status === 'completed') {
      jobList = jobList.filter((j) => j.type === 'once' && !j.enabled);
    }

    const jobSummaries = jobList.map((j) => ({
      id: j.id,
      name: j.name,
      type: j.type,
      enabled: j.enabled,
      status: j.enabled ? 'active' : 'paused',
      failureCount: j.failureCount,
      lastRun: j.lastRun,
      createdAt: j.createdAt,
      runCount: j.runHistory.length,
    }));

    logger.info(`Jobs listed`, {
      totalJobs: jobList.length,
      statusFilter: status || 'none',
    });

    res.json({
      status: 'success',
      count: jobSummaries.length,
      jobs: jobSummaries,
    });
  } catch (error) {
    logger.error(`List jobs error`, {
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to list jobs',
      message: error.message,
    });
  }
});

/**
 * GET /jobs/:id
 * Get detailed job information including next run time and history
 */
router.get('/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const job = jobs.get(id);

    if (!job) {
      logger.warn(`Job not found`, { jobId: id });
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    let nextRunTime = null;
    if (job.enabled) {
      if (job.type === 'interval') {
        const intervalMs = resolveInterval(job.intervalMs);
        const lastRunTime = job.lastRun ? new Date(job.lastRun).getTime() : Date.now();
        nextRunTime = new Date(lastRunTime + intervalMs).toISOString();
      } else if (job.type === 'cron') {
        nextRunTime = getCronNextRun(job.cronExpr).toISOString();
      } else if (job.type === 'once') {
        nextRunTime = job.runAt;
      }
    }

    const detail = {
      id: job.id,
      name: job.name,
      type: job.type,
      handler: job.handler,
      enabled: job.enabled,
      status: job.enabled ? 'active' : 'paused',
      failureCount: job.failureCount,
      createdAt: job.createdAt,
      lastRun: job.lastRun,
      nextRun: nextRunTime,
      runCount: job.runHistory.length,
      metadata: job.metadata,
      runHistory: job.runHistory.slice(0, 10), // Last 10 runs
    };

    if (job.type === 'interval') {
      detail.intervalMs = job.intervalMs;
    } else if (job.type === 'cron') {
      detail.cronExpr = job.cronExpr;
    } else if (job.type === 'once') {
      detail.runAt = job.runAt;
    }

    logger.debug(`Job details retrieved`, { jobId: id });

    res.json({
      status: 'success',
      job: detail,
    });
  } catch (error) {
    logger.error(`Get job error`, {
      jobId: req.params.id,
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to get job details',
      message: error.message,
    });
  }
});

/**
 * POST /jobs/:id/pause
 * Pause a job
 */
router.post('/jobs/:id/pause', (req, res) => {
  try {
    const { id } = req.params;
    const job = jobs.get(id);

    if (!job) {
      logger.warn(`Job not found for pause`, { jobId: id });
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    job.enabled = false;
    logger.info(`Job paused`, { jobId: id, name: job.name });

    res.json({
      status: 'paused',
      jobId: id,
    });
  } catch (error) {
    logger.error(`Pause job error`, {
      jobId: req.params.id,
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to pause job',
      message: error.message,
    });
  }
});

/**
 * POST /jobs/:id/resume
 * Resume a job
 */
router.post('/jobs/:id/resume', (req, res) => {
  try {
    const { id } = req.params;
    const job = jobs.get(id);

    if (!job) {
      logger.warn(`Job not found for resume`, { jobId: id });
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    job.enabled = true;
    job.failureCount = 0; // Reset failure count on resume
    scheduleJob(job);

    logger.info(`Job resumed`, { jobId: id, name: job.name });

    res.json({
      status: 'resumed',
      jobId: id,
    });
  } catch (error) {
    logger.error(`Resume job error`, {
      jobId: req.params.id,
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to resume job',
      message: error.message,
    });
  }
});

/**
 * DELETE /jobs/:id
 * Remove a job
 */
router.delete('/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!jobs.has(id)) {
      logger.warn(`Job not found for deletion`, { jobId: id });
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    // Clear any active schedule
    if (activeSchedules.has(id)) {
      const schedule = activeSchedules.get(id);
      if (schedule.type === 'interval') {
        clearInterval(schedule.id);
      } else if (schedule.type === 'timeout') {
        clearTimeout(schedule.id);
      }
      activeSchedules.delete(id);
    }

    jobs.delete(id);

    logger.info(`Job deleted`, { jobId: id });

    res.json({
      status: 'deleted',
      jobId: id,
    });
  } catch (error) {
    logger.error(`Delete job error`, {
      jobId: req.params.id,
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to delete job',
      message: error.message,
    });
  }
});

/**
 * GET /upcoming
 * Get the next N jobs to fire
 * Query: ?count=10 (default)
 */
router.get('/upcoming', (req, res) => {
  try {
    const count = parseInt(req.query.count || '10', 10);

    const enabledJobs = Array.from(jobs.values()).filter(
      (j) => j.enabled && j.failureCount < MAX_FAILURES_BEFORE_PAUSE
    );

    // Calculate next run time for each job
    const upcoming = enabledJobs
      .map((job) => {
        let nextRun;
        if (job.type === 'interval') {
          const intervalMs = resolveInterval(job.intervalMs);
          const lastRunTime = job.lastRun ? new Date(job.lastRun).getTime() : Date.now();
          nextRun = lastRunTime + intervalMs;
        } else if (job.type === 'cron') {
          nextRun = getCronNextRun(job.cronExpr).getTime();
        } else if (job.type === 'once') {
          nextRun = new Date(job.runAt).getTime();
        }

        return {
          jobId: job.id,
          name: job.name,
          type: job.type,
          nextRunAt: new Date(nextRun).toISOString(),
          nextRunMs: nextRun,
        };
      })
      .sort((a, b) => a.nextRunMs - b.nextRunMs)
      .slice(0, count)
      .map(({ nextRunMs, ...rest }) => rest); // Remove internal nextRunMs field

    logger.info(`Upcoming jobs retrieved`, {
      upcomingCount: upcoming.length,
      requestedCount: count,
    });

    res.json({
      status: 'success',
      count: upcoming.length,
      upcoming,
    });
  } catch (error) {
    logger.error(`Get upcoming jobs error`, {
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to get upcoming jobs',
      message: error.message,
    });
  }
});

/**
 * GET /health
 * Health check with job counts and concurrency info
 */
router.get('/health', (req, res) => {
  try {
    const totalJobs = jobs.size;
    const activeJobs = Array.from(jobs.values()).filter(
      (j) => j.enabled && j.failureCount < MAX_FAILURES_BEFORE_PAUSE
    ).length;
    const pausedJobs = totalJobs - activeJobs;

    const checks = {
      routesLoaded: true,
      loggerInitialized: !!logger,
      totalJobs,
      activeJobs,
      pausedJobs,
      concurrentJobCount,
      maxConcurrentJobs: MAX_CONCURRENT_JOBS,
      concurrencyHealthy: concurrentJobCount < MAX_CONCURRENT_JOBS,
    };

    const allHealthy = checks.concurrencyHealthy && checks.routesLoaded;
    const statusCode = allHealthy ? 200 : 503;
    const healthStatus = allHealthy ? 'healthy' : 'degraded';

    logger.info(`Health check performed`, {
      status: healthStatus,
      checks,
    });

    res.status(statusCode).json({
      status: healthStatus,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    logger.error(`Health check error`, {
      error: error.message,
    });
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Error Handling Middleware
// ═══════════════════════════════════════════════════════════════════

router.use((err, req, res, next) => {
  logger.error(`Unhandled route error`, {
    method: req.method,
    path: req.path,
    error: err.message,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ═══════════════════════════════════════════════════════════════════
// Module Exports
// ═══════════════════════════════════════════════════════════════════

module.exports = router;
