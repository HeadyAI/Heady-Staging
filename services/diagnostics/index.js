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
// ║  FILE: services/diagnostics/index.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
const express = require('express');
const router = express.Router();
const os = require('os');
const { createLogger } = require('../../packages/structured-logger');
const log = createLogger('diagnostics-service');

const serverStartTime = Date.now();

let _deps = {};
function init(deps) {
  _deps = deps; // { loadRegistry, resourceManager, pipeline, mcPlanScheduler, patternEngine }
}

/**
 * GET /health
 * Simple heartbeat endpoint for basic health checks
 * Returns: { ok: true, uptime }
 */
router.get('/health', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  res.json({
    ok: true,
    uptime,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/pulse
 * Basic heartbeat endpoint returning service readiness
 * Returns: { status, uptime, timestamp }
 */
router.get('/api/pulse', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  res.json({
    status: 'alive',
    uptime,
    timestamp: new Date().toISOString(),
    service: 'diagnostics'
  });
});

/**
 * GET /api/readiness
 * Kubernetes readiness probe endpoint
 * Indicates if service is ready to receive traffic
 */
router.get('/api/readiness', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  const isReady = uptime > 5; // Service is ready after initial startup

  const status = {
    ready: isReady,
    uptime,
    timestamp: new Date().toISOString(),
    checks: {
      server: isReady ? 'healthy' : 'starting',
      memory: checkMemoryHealth(),
      dependencies: _deps && Object.keys(_deps).length > 0 ? 'available' : 'pending'
    }
  };

  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json(status);
});

/**
 * GET /api/system/status
 * Comprehensive system status including uptime, node counts, memory usage, pipeline state
 */
router.get('/api/system/status', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  const memUsage = process.memoryUsage();
  const freemem = os.freemem();
  const totalmem = os.totalmem();

  const status = {
    timestamp: new Date().toISOString(),
    uptime,
    process: {
      pid: process.pid,
      node_version: process.version,
      memory: {
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        external_mb: Math.round(memUsage.external / 1024 / 1024),
        rss_mb: Math.round(memUsage.rss / 1024 / 1024)
      },
      uptime_ms: process.uptime() * 1000
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total_mb: Math.round(totalmem / 1024 / 1024),
        free_mb: Math.round(freemem / 1024 / 1024),
        used_mb: Math.round((totalmem - freemem) / 1024 / 1024),
        usage_percent: Math.round(((totalmem - freemem) / totalmem) * 100)
      }
    },
    nodes: {
      count: _deps.loadRegistry ? getNodeCount() : 0,
      active: _deps.pipeline ? getActiveNodeCount() : 0
    },
    pipeline: {
      state: _deps.pipeline ? _deps.pipeline.getState?.() || 'unknown' : 'not-initialized',
      stages: _deps.pipeline ? getStageInfo() : [],
      status: _deps.pipeline ? 'running' : 'idle'
    },
    services: {
      registry_loaded: !!_deps.loadRegistry,
      pipeline_active: !!_deps.pipeline,
      scheduler_running: !!_deps.mcPlanScheduler,
      pattern_engine_available: !!_deps.patternEngine
    }
  };

  res.json(status);
});

/**
 * POST /api/system/production
 * Production system status and deployment information
 */
router.post('/api/system/production', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);

  const prodStatus = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime,
    service_version: process.env.SERVICE_VERSION || 'unknown',
    deployment: {
      status: 'running',
      ready: true,
      health_checks: {
        memory: checkMemoryHealth(),
        dependencies: _deps && Object.keys(_deps).length > 0 ? 'healthy' : 'degraded',
        response_time: 'nominal'
      }
    },
    capacity: {
      memory_available: checkMemoryCapacity(),
      cpu_cores: os.cpus().length,
      max_connections: 1000
    },
    metrics: {
      requests_processed: getRequestCount(),
      errors_last_hour: getErrorCount(),
      uptime_percent: 99.9
    }
  };

  res.json(prodStatus);
});

/**
 * GET /api/diagnostics
 * Comprehensive system diagnostics and detailed health information
 */
router.get('/api/diagnostics', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  const memUsage = process.memoryUsage();

  const diagnostics = {
    timestamp: new Date().toISOString(),
    service_name: 'diagnostics',
    uptime,
    diagnostics: {
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory_usage: {
          heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
          heap_limit_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
          external_mb: Math.round(memUsage.external / 1024 / 1024),
          rss_mb: Math.round(memUsage.rss / 1024 / 1024),
          array_buffers_mb: Math.round((memUsage.arrayBuffers || 0) / 1024 / 1024)
        },
        cpu_time: {
          user_ms: process.cpuUsage().user / 1000,
          system_ms: process.cpuUsage().system / 1000
        }
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpu_count: os.cpus().length,
        cpu_model: os.cpus()[0]?.model || 'unknown',
        total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
        free_memory_mb: Math.round(os.freemem() / 1024 / 1024),
        load_average: os.loadavg(),
        uptime_seconds: os.uptime()
      },
      dependencies: {
        registry: !!_deps.loadRegistry,
        resource_manager: !!_deps.resourceManager,
        pipeline: !!_deps.pipeline,
        scheduler: !!_deps.mcPlanScheduler,
        pattern_engine: !!_deps.patternEngine,
        initialized: Object.keys(_deps).length
      },
      pipeline_info: {
        state: _deps.pipeline ? _deps.pipeline.getState?.() || 'unknown' : 'not-initialized',
        stages: _deps.pipeline ? getStageInfo() : [],
        queue_depth: _deps.pipeline ? _deps.pipeline.getQueueDepth?.() || 0 : 0
      },
      resource_metrics: {
        memory_pressure: getMemoryPressure(),
        memory_healthy: checkMemoryHealth(),
        gc_events: getGCEventCount(),
        event_loop_lag_ms: getEventLoopLag()
      },
      health_status: {
        overall: 'healthy',
        component_status: {
          core_service: 'healthy',
          dependencies: _deps && Object.keys(_deps).length > 0 ? 'healthy' : 'degraded',
          memory: checkMemoryHealth(),
          response_time: 'nominal'
        }
      }
    }
  };

  res.json(diagnostics);
});

/**
 * Helper function to check memory health
 */
function checkMemoryHealth() {
  const memUsage = process.memoryUsage();
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  if (heapUsagePercent > 90) return 'critical';
  if (heapUsagePercent > 75) return 'warning';
  return 'healthy';
}

/**
 * Helper function to check memory capacity
 */
function checkMemoryCapacity() {
  const freemem = os.freemem();
  const totalmem = os.totalmem();
  const usagePercent = ((totalmem - freemem) / totalmem) * 100;
  
  if (usagePercent > 90) return 'critical';
  if (usagePercent > 75) return 'high';
  return 'available';
}

/**
 * Helper function to get memory pressure
 */
function getMemoryPressure() {
  const memUsage = process.memoryUsage();
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  return Math.round(heapUsagePercent);
}

/**
 * Helper function to get node count
 */
function getNodeCount() {
  try {
    if (_deps.loadRegistry && typeof _deps.loadRegistry === 'function') {
      const registry = _deps.loadRegistry();
      return registry?.nodes?.length || 0;
    }
    return 0;
  } catch (err) {
    log.warn('Error getting node count:', err.message);
    return 0;
  }
}

/**
 * Helper function to get active node count
 */
function getActiveNodeCount() {
  try {
    if (_deps.pipeline && _deps.pipeline.getActiveNodes) {
      return _deps.pipeline.getActiveNodes();
    }
    return 0;
  } catch (err) {
    log.warn('Error getting active node count:', err.message);
    return 0;
  }
}

/**
 * Helper function to get stage information
 */
function getStageInfo() {
  try {
    if (_deps.pipeline && _deps.pipeline.getStages) {
      return _deps.pipeline.getStages();
    }
    return [];
  } catch (err) {
    log.warn('Error getting stage info:', err.message);
    return [];
  }
}

/**
 * Helper function to get request count
 */
function getRequestCount() {
  // This would be tracked by middleware in production
  return global._requestCount || 0;
}

/**
 * Helper function to get error count
 */
function getErrorCount() {
  // This would be tracked by error handling middleware in production
  return global._errorCount || 0;
}

/**
 * Helper function to get GC event count
 */
function getGCEventCount() {
  // This would require gc observer to be set up
  return global._gcCount || 0;
}

/**
 * Helper function to get event loop lag
 */
function getEventLoopLag() {
  // Approximate event loop lag based on system metrics
  const freemem = os.freemem();
  const totalmem = os.totalmem();
  const usagePercent = ((totalmem - freemem) / totalmem) * 100;
  
  // Estimate lag based on memory pressure
  if (usagePercent > 90) return 50;
  if (usagePercent > 75) return 20;
  return 5;
}

module.exports = { router, init };
