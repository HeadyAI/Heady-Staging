const logger = require('../../shared/logger')('server');
'use strict';

/**
 * HeadyGuard — Standalone Express Server
 *
 * Starts the Heady™Guard service on HEADY_GUARD_PORT (default: 3106).
 * Suitable for direct node execution, Docker, or Cloud Run.
 */

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const compression  = require('compression');

const config = require('./config');
const guard  = require('./index');
const router = require('./routes');
const health = require('./health');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // API server — no HTML
}));

app.use(cors({
  origin:      process.env.HEADY_GUARD_CORS_ORIGIN || '*',
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Request-Id'],
}));

app.use(compression());

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// Request ID
app.use((req, _res, next) => {
  req.requestId = req.headers['x-request-id'] || `hg-${Date.now()}`;
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', health.healthHandler);
app.use('/', router);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

// Global error handler
app.use((err, req, res, _next) => {
  logger.error(`[HeadyGuard] Unhandled: ${err.stack || err.message}`);
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status > 499 ? 422 : status).json({
    error:   'server_error',
    message: config.isProduction ? 'Internal server error' : err.message,
  });
});

// ── Startup ───────────────────────────────────────────────────────────────────

async function start() {
  try {
    await guard.initialize();

    const server = app.listen(config.port, config.host, () => {
      logger.info(`[HeadyGuard] Listening on ${config.host}:${config.port}`);
      logger.info(`[HeadyGuard] Environment: ${config.nodeEnv}`);
      logger.info(`[HeadyGuard] PHI scale factor: ${config.phi}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`[HeadyGuard] ${signal} received — shutting down...`);
      server.close(async () => {
        await guard.shutdown();
        process.exit(0);
      });
      // Force exit after 10s
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    return server;
  } catch (err) {
    logger.error(`[HeadyGuard] Startup failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
