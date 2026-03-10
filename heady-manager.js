#!/usr/bin/env node
require('dotenv').config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
let cookieParser;
try { cookieParser = require('cookie-parser'); } catch { cookieParser = null; }

import { logger } from './src/utils/logger.js';
import { validateEnv } from './src/utils/env-validator.js';
import { setupHealthRoutes } from './src/gateway/health.js';
import { setupGateway } from './src/gateway/ai-gateway.js';
import { setupMCPRoutes } from './src/mcp/mcp-server.js';
import { setupAgentRoutes } from './src/agents/agent-router.js';
import { setupMemoryRoutes } from './src/memory/memory-router.js';
import { setupDashboardRoutes } from './src/gateway/dashboard-router.js';
import { setupSubsystemRoutes, initializeSubsystems, shutdownSubsystems } from './src/gateway/subsystem-routes.js';
import { AutoSuccessEngine } from './src/services/auto-success.js';
import { errorHandler } from './src/gateway/error-handler.js';
import { metricsMiddleware, metricsEndpoint } from './src/utils/metrics.js';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
// Auth routes
let authRouter;
try {
  const authModule = require('./src/routes/auth-routes');
  authRouter = authModule.router;
} catch (err) {
  console.warn('[HeadyManager] Auth routes not loaded:', err.message);
}

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
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
if (cookieParser) app.use(cookieParser());
app.use(metricsMiddleware);

// ── Static files (public/) ──
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ──
setupHealthRoutes(app);
setupGateway(app);
setupMCPRoutes(app);
setupAgentRoutes(app);
setupMemoryRoutes(app);
setupDashboardRoutes(app);
setupSubsystemRoutes(app);
app.get('/metrics', metricsEndpoint);

// ── Auth routes ──
if (authRouter) {
  app.use('/api/auth', authRouter);
  logger.info('[HeadyManager] ✅ Auth routes mounted at /api/auth');
}

// ── Error handling (must be last) ──
app.use(errorHandler);

// ── Start server ──
const server = app.listen(PORT, () => {
  logger.info(`[HeadyManager] ✅ Running on port ${PORT}`);
  logger.info(`[HeadyManager] ✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`[HeadyManager] ✅ Health: http://localhost:${PORT}/health`);
});

// ── Subsystem Initialization (Colab Cluster, Bee Factory, Swarm Coordinator, Universal Prompt) ──
initializeSubsystems().then((results) => {
  const loaded = Object.entries(results).filter(([, v]) => v).map(([k]) => k);
  logger.info(`[HeadyManager] ✅ Subsystems initialized: ${loaded.join(', ') || 'none'}`);
}).catch(err => {
  logger.error(`[HeadyManager] ⚠️ Subsystem init error: ${err.message}`);
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
  await shutdownSubsystems();
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
