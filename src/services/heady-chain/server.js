'use strict';
const logger = require('../../shared/logger')('server');

/**
 * HeadyChain HTTP Server
 * Express + helmet + cors + compression, compatible with existing Heady™ architecture.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const config = require('./config');
const router = require('./routes');
const { defaultChain } = require('./index');

const app = express();

// ─── Security & Middleware ────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // Disable for API service
}));

app.use(cors({
  origin: config.CORS_ORIGINS.includes('*') ? '*' : config.CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Request logging
app.use((req, res, next) => {
  if (config.LOG_LEVEL === 'debug') {
    logger.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/', router);

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  logger.error(`[HeadyChain] Error on ${req.method} ${req.path}:`, err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status < 500 ? status : 422).json({
    error: err.message,
    requestId: req.requestId,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = config.PORT;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`[HeadyChain] 🌀 Service running on port ${PORT} (PHI=${config.PHI})`);
  logger.info(`[HeadyChain] Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`[HeadyChain] HeadyInfer: ${config.HEADY_INFER_URL}`);
  logger.info(`[HeadyChain] Checkpoints: ${config.CHECKPOINT_ENABLED ? config.CHECKPOINT_DIR : 'disabled'}`);
});

server.on('error', (err) => {
  logger.error('[HeadyChain] Server error:', err);
  process.exit(1);
});

// Graceful shutdown
function gracefulShutdown(signal) {
  logger.info(`[HeadyChain] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    defaultChain.destroy();
    logger.info('[HeadyChain] Server closed.');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('[HeadyChain] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('[HeadyChain] Unhandled rejection:', reason);
});

module.exports = { app, server };
