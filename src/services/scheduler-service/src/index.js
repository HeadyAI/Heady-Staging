'use strict';

const express = require('express');
const helmet = require('helmet');
const { Scheduler } = require('./scheduler');
const { createBuiltinJobs } = require('./jobs');

const PORT = parseInt(process.env.PORT, 10) || 3384;
const SERVICE_NAME = 'scheduler-service';
const startTime = Date.now();

// Structured JSON logger
const log = {
  _write(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE_NAME,
      message,
      ...meta,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  info(msg, meta) { this._write('info', msg, meta); },
  warn(msg, meta) { this._write('warn', msg, meta); },
  error(msg, meta) { this._write('error', msg, meta); },
  debug(msg, meta) { this._write('debug', msg, meta); },
};

const scheduler = new Scheduler({ log });

// Register built-in jobs
const builtinJobs = createBuiltinJobs({ log });
for (const job of builtinJobs) {
  scheduler.register(job);
}

const app = express();

app.set('trust proxy', true);
app.use(helmet());
app.use(express.json({ limit: '256kb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency: Date.now() - start,
    });
  });
  next();
});

// Health endpoint
app.get('/health', (req, res) => {
  const jobStates = scheduler.getJobStates();
  const failedJobs = jobStates.filter((j) => j.status === 'circuit-open');

  res.json({
    status: failedJobs.length > 0 ? 'degraded' : 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    checks: [
      {
        name: 'scheduler',
        status: failedJobs.length > 0 ? 'degraded' : 'healthy',
        latency: 0,
        detail: `${jobStates.length} jobs, ${failedJobs.length} circuit-open`,
      },
    ],
  });
});

// GET /jobs — list all jobs and their states
app.get('/jobs', (req, res) => {
  const states = scheduler.getJobStates();
  res.json({ jobs: states });
});

// GET /jobs/:jobId — get a specific job's state
app.get('/jobs/:jobId', (req, res) => {
  const state = scheduler.getJobState(req.params.jobId);
  if (!state) {
    res.status(404).json({
      code: 'HEADY-SCHEDULER-001',
      message: `Job '${req.params.jobId}' not found`,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  res.json({ id: req.params.jobId, ...state });
});

// POST /jobs/:jobId/trigger — manually trigger a job
app.post('/jobs/:jobId/trigger', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    res.status(403).json({
      code: 'HEADY-SCHEDULER-002',
      message: 'Invalid API key',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    scheduler.triggerNow(req.params.jobId);
    log.info('Job manually triggered', { jobId: req.params.jobId });
    res.json({ triggered: true, jobId: req.params.jobId });
  } catch (err) {
    res.status(404).json({
      code: 'HEADY-SCHEDULER-003',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Start the scheduler
scheduler.start();

// Graceful shutdown
let server;

function shutdown(signal) {
  log.info('Shutdown initiated', { signal });
  scheduler.stop();
  if (server) {
    server.close(() => {
      log.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      log.warn('Forced shutdown');
      process.exit(1);
    }, 13000);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server = app.listen(PORT, () => {
  log.info('Server started', { port: PORT, service: SERVICE_NAME });
});

module.exports = app;
