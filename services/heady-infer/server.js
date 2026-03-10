'use strict';
const logger = require('../../shared/logger')(require('path').basename('services/heady-infer/server.js', '.js'));

/**
 * HeadyInfer Standalone Server
 *
 * Starts the Express app with all middleware, mounts the Heady™Infer router,
 * and handles graceful shutdown.
 *
 * Can also be required as a module from a parent service for embedding.
 */

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const compression = require('compression');
const config     = require('./config');
const { HeadyInfer } = require('./index');
const { createRouter } = require('./routes');
const { liveness }     = require('./health');

function createApp(cfg = config) {
  const app = express();

  // ─── Security / Perf Middleware ──────────────────────────────────────────
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  // Request logging middleware
  app.use((req, _res, next) => {
    if (cfg.logging.level !== 'silent') {
      logger.info(`[HeadyInfer] ${req.method} ${req.path} ${new Date().toISOString()}`);
    }
    next();
  });

  // ─── Initialize Gateway ───────────────────────────────────────────────────
  const gateway = new HeadyInfer(cfg);

  // ─── Top-level /health ─────────────────────────────────────────────────────
  // Fast liveness — no provider ping
  app.get('/health', (req, res) => {
    const report = liveness(gateway);
    res.status(200).json(report);
  });

  // ─── Mount HeadyInfer Router ───────────────────────────────────────────────
  app.use('/api/v1', createRouter(gateway));

  // ─── 404 Handler ──────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      error:     'Not found',
      path:      req.path,
      service:   cfg.serviceName,
      timestamp: new Date().toISOString(),
    });
  });

  return { app, gateway };
}

// ─── Startup ───────────────────────────────────────────────────────────────

if (require.main === module) {
  const { app, gateway } = createApp();
  const port = config.port;

  const server = app.listen(port, '0.0.0.0', () => {
    logger.info(`[HeadyInfer] Server listening on port ${port} (${config.env})`);
    logger.info(`[HeadyInfer] Health: http://localhost:${port}/health`);
    logger.info(`[HeadyInfer] API:    http://localhost:${port}/api/v1/infer`);
  });

  // ─── Graceful Shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`[HeadyInfer] ${signal} received. Shutting down...`);
    server.close(async () => {
      await gateway.shutdown();
      logger.info('[HeadyInfer] Server closed');
      process.exit(0);
    });
    // Force-quit after 10s
    setTimeout(() => { process.exit(1); }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('[HeadyInfer] Unhandled rejection:', reason);
  });
}

module.exports = { createApp };
