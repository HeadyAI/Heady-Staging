'use strict';

const express = require('express');
const helmet = require('helmet');
const { AnalyticsStore } = require('./store');
const { createCollector } = require('./collector');
const { Aggregator } = require('./aggregator');

const PORT = parseInt(process.env.PORT, 10) || 3382;
const SERVICE_NAME = 'analytics-service';
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

// Initialize pg pool if DATABASE_URL is set
let pgPool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

// Initialize store, collector, aggregator
const store = new AnalyticsStore({ pgPool, log });
const collector = createCollector({ store, log });
const aggregator = new Aggregator({ store, log });

// Patch store.addEvent to also feed the aggregator
const originalAddEvent = store.addEvent.bind(store);
store.addEvent = function (event) {
  originalAddEvent(event);
  aggregator.ingest(event);
};

const app = express();

app.set('trust proxy', true);
app.use(helmet());
app.use(express.json({ limit: '256kb' }));

// Request logging (but not self-tracking /health to avoid noise)
app.use((req, res, next) => {
  if (req.path === '/health') {
    next();
    return;
  }
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
  const storeStats = store.getStats();
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    checks: [
      {
        name: 'store',
        status: 'healthy',
        latency: 0,
        detail: `${storeStats.bufferedEvents} buffered, ${storeStats.cachedAggregates} cached`,
      },
      {
        name: 'database',
        status: pgPool ? 'healthy' : 'degraded',
        latency: 0,
        detail: pgPool ? 'connected' : 'not configured (in-memory only)',
      },
    ],
  });
});

// POST /collect/pageview — record a page view
app.post('/collect/pageview', (req, res) => {
  const { path: pagePath, referrer, sessionId } = req.body;
  if (!pagePath) {
    res.status(400).json({
      code: 'HEADY-ANALYTICS-001',
      message: 'path is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  collector.collectPageView({
    path: pagePath,
    referrer,
    ip: req.ip || req.socket?.remoteAddress || '',
    userAgent: req.get('user-agent') || '',
    sessionId,
  });

  res.status(202).json({ accepted: true });
});

// POST /collect/event — record a custom event
app.post('/collect/event', (req, res) => {
  const { eventName, properties, sessionId } = req.body;
  if (!eventName) {
    res.status(400).json({
      code: 'HEADY-ANALYTICS-002',
      message: 'eventName is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  collector.collectEvent({
    eventName,
    properties,
    ip: req.ip || req.socket?.remoteAddress || '',
    userAgent: req.get('user-agent') || '',
    sessionId,
  });

  res.status(202).json({ accepted: true });
});

// GET /metrics — return current real-time metrics
app.get('/metrics', (req, res) => {
  const metrics = aggregator.getCurrentMetrics();
  if (!metrics) {
    res.json({ message: 'No metrics available yet', timestamp: new Date().toISOString() });
    return;
  }
  res.json(metrics);
});

// GET /metrics/rollups — return stored rollup data
app.get('/metrics/rollups', (req, res) => {
  const all = store.getAllAggregates();
  const rollups = all
    .filter(([key]) => key.startsWith('rollup:'))
    .map(([key, data]) => ({ key, ...data }));
  res.json({ rollups });
});

// Start store and aggregator
store.start();
aggregator.start();

// Graceful shutdown
let server;

async function shutdown(signal) {
  log.info('Shutdown initiated', { signal });
  aggregator.stop();
  await store.stop();
  if (pgPool) await pgPool.end();
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
