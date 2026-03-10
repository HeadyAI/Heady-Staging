// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HeadyBee Swarm Routes — Express API for Swarm Orchestration   ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const express = require('express');
const { createSwarm } = require('@heady/bee');
const { createLogger } = require('@heady/structured-logger');

// ═══════════════════════════════════════════════════════════════════
// Structured Logger Configuration
// ═══════════════════════════════════════════════════════════════════

const logger = createLogger('heady-swarm-routes', 'api');

// ═══════════════════════════════════════════════════════════════════
// Router Setup
// ═══════════════════════════════════════════════════════════════════

const router = express.Router();

// Global swarm instance (for demo/stateful operations)
let globalSwarm = null;

// ═══════════════════════════════════════════════════════════════════
// Middleware — Request/Response Logging
// ═══════════════════════════════════════════════════════════════════

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
 * POST /execute
 * Submit tasks to a swarm for concurrent execution
 * Body: { tasks: [{ name, type, metadata? }], beeCount?, concurrency? }
 * Returns: { results, metrics, timing }
 */
router.post('/execute', async (req, res) => {
  try {
    const { tasks, beeCount = 5, concurrency } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      logger.warn(`Invalid execute request`, {
        hasTasksArray: Array.isArray(tasks),
        taskCount: Array.isArray(tasks) ? tasks.length : 0,
      });
      return res.status(400).json({
        error: 'tasks must be a non-empty array',
      });
    }

    logger.info(`Execute request received`, {
      taskCount: tasks.length,
      beeCount,
      concurrency: concurrency || 'default (φ-scaled)',
    });

    // Create a new swarm for this execution
    const swarm = createSwarm({
      name: `swarm-${Date.now()}`,
      beeCount,
      concurrency,
      onTaskComplete: (result) => {
        logger.debug(`Task completed in swarm`, {
          taskId: result.taskId,
          durationMs: result.durationMs,
        });
      },
    });

    // Convert incoming tasks to swarm task format
    const swarmTasks = tasks.map((task) => ({
      id: task.id || `task-${Date.now()}-${Math.random()}`,
      name: task.name || `unnamed-task-${tasks.indexOf(task)}`,
      fn: async () => {
        // Simulate task execution based on type
        const delay = Math.random() * 500 + 100; // 100-600ms
        await new Promise((resolve) => setTimeout(resolve, delay));

        // 95% success rate (5% random failures for demo)
        if (Math.random() > 0.95) {
          throw new Error(`Simulated failure for ${task.name}`);
        }

        return {
          taskType: task.type || 'unknown',
          taskName: task.name,
          metadata: task.metadata || {},
          completedAt: new Date().toISOString(),
        };
      },
      metadata: task.metadata || {},
    }));

    // Add tasks to swarm
    swarm.addTasks(swarmTasks);

    // Execute the swarm
    const result = await swarm.execute();

    logger.info(`Swarm execution succeeded`, {
      totalTasks: tasks.length,
      completed: result.metrics.performance.totalCompleted,
      failed: result.metrics.performance.totalFailed,
    });

    res.json({
      status: 'success',
      results: result.results,
      metrics: result.metrics,
      timing: result.timing,
    });
  } catch (error) {
    logger.error(`Execute route error`, {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Swarm execution failed',
      message: error.message,
    });
  }
});

/**
 * GET /status
 * Get current swarm status
 * Returns: { swarmName, activeBees, idleBees, queueDepth, resultsCount, ... }
 */
router.get('/status', (req, res) => {
  try {
    if (!globalSwarm) {
      logger.warn(`Status requested but no global swarm exists`);
      return res.json({
        status: 'no-swarm',
        message: 'No active swarm. Submit tasks via POST /execute',
      });
    }

    const status = globalSwarm.status();
    logger.debug(`Status requested`, status);

    res.json({
      status: 'success',
      swarm: status,
    });
  } catch (error) {
    logger.error(`Status route error`, {
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to get swarm status',
      message: error.message,
    });
  }
});

/**
 * GET /health
 * Health check for swarm routes
 * Returns: { status: 'healthy'|'degraded', timestamp, checks: {...} }
 */
router.get('/health', (req, res) => {
  try {
    const checks = {
      routesLoaded: true,
      loggerInitialized: !!logger,
      swarmPackageLoaded: !!createSwarm,
      globalSwarmExists: !!globalSwarm,
    };

    const allHealthy = Object.values(checks).every((check) => check === true);
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

/**
 * GET /metrics
 * Get detailed metrics from the global swarm (if exists)
 * Returns: { metrics with timing, performance, phi analysis, per-bee stats }
 */
router.get('/metrics', (req, res) => {
  try {
    if (!globalSwarm) {
      logger.warn(`Metrics requested but no global swarm exists`);
      return res.json({
        status: 'no-swarm',
        message: 'No active swarm with metrics',
      });
    }

    const metrics = globalSwarm.metrics();
    logger.debug(`Metrics requested`, {
      swarmName: metrics.swarmName,
      totalCompleted: metrics.performance.totalCompleted,
    });

    res.json({
      status: 'success',
      metrics,
    });
  } catch (error) {
    logger.error(`Metrics route error`, {
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message,
    });
  }
});

/**
 * POST /create-swarm
 * Create a new global swarm (useful for stateful operations)
 * Body: { name?, beeCount?, concurrency? }
 * Returns: { swarmName, beeCount, concurrency }
 */
router.post('/create-swarm', (req, res) => {
  try {
    const { name, beeCount = 5, concurrency } = req.body;

    globalSwarm = createSwarm({
      name: name || `swarm-${Date.now()}`,
      beeCount,
      concurrency,
    });

    logger.info(`Global swarm created`, {
      swarmName: globalSwarm.name,
      beeCount: globalSwarm.beeCount,
      concurrency: globalSwarm.concurrency,
    });

    res.status(201).json({
      status: 'created',
      swarm: {
        name: globalSwarm.name,
        beeCount: globalSwarm.beeCount,
        concurrency: globalSwarm.concurrency,
      },
    });
  } catch (error) {
    logger.error(`Create swarm error`, {
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to create swarm',
      message: error.message,
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
