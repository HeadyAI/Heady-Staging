#!/usr/bin/env node
'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { logger } = require('./src/utils/logger');
const { validateEnv } = require('./src/utils/env-validator');
const { setupHealthRoutes } = require('./src/gateway/health');
const { setupGateway } = require('./src/gateway/ai-gateway');
const { setupMCPRoutes } = require('./src/mcp/mcp-server');
const { setupAgentRoutes } = require('./src/agents/agent-router');
const { setupMemoryRoutes } = require('./src/memory/memory-router');
const { setupDashboardRoutes } = require('./src/gateway/dashboard-router');
const { AutoSuccessEngine } = require('./src/services/auto-success');
const { errorHandler } = require('./src/gateway/error-handler');
const { metricsMiddleware, metricsEndpoint } = require('./src/utils/metrics');

// ── Validate environment ──
const envOk = validateEnv();
if (!envOk && process.env.NODE_ENV === 'production') {
  logger.error('Environment validation failed. Exiting.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3301;

// ── Global middleware ──
app.use(helmet());
// Production CORS: explicit allowlist only; dev allows localhost
const HEADY_DOMAINS = [
  'https://headyme.com', 'https://headyapi.com', 'https://headysystems.com',
  'https://headyconnection.org', 'https://headymcp.com', 'https://headybuddy.org',
  'https://headyio.com', 'https://headybot.com', 'https://heady-ai.com',
];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : process.env.NODE_ENV === 'production'
    ? HEADY_DOMAINS
    : ['http://localhost:3301', 'http://localhost:5173', ...HEADY_DOMAINS];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(metricsMiddleware);

// ── Routes ──
setupHealthRoutes(app);
setupGateway(app);
setupMCPRoutes(app);
setupAgentRoutes(app);
setupMemoryRoutes(app);
setupDashboardRoutes(app);
app.get('/metrics', metricsEndpoint);

// ── Error handling (must be last) ──
app.use(errorHandler);

// ── Start server ──
const server = app.listen(PORT, () => {
  logger.info(`[HeadyManager] ✅ Running on port ${PORT}`);
  logger.info(`[HeadyManager] ✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`[HeadyManager] ✅ Health: http://localhost:${PORT}/health`);
});

// ── Auto-Success Engine ──
const autoSuccess = new AutoSuccessEngine();
autoSuccess.start().then(() => {
  logger.info(`[HeadyManager] ✅ Auto-Success Engine started (${autoSuccess.taskCount} tasks)`);
}).catch(err => {
  logger.error(`[HeadyManager] ⚠️ Auto-Success Engine error: ${err.message}`);
});

// ── Graceful shutdown ──
const shutdown = async (signal) => {
  logger.info(`[HeadyManager] Received ${signal}. Shutting down gracefully...`);
  await autoSuccess.stop();
  server.close(() => {
    logger.info('[HeadyManager] Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});
