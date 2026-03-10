'use strict';

const { PHI, PSI, PSI2, nearestFib, FIB } = require('@heady/phi-math-foundation');

/**
 * Status enum for health probes.
 */
const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
};

/**
 * Phi-scaled response time thresholds (milliseconds).
 * Healthy < GOOD, Degraded < DEGRADED, Unhealthy >= UNHEALTHY.
 */
const RESPONSE_TIME_THRESHOLDS = {
  GOOD: Math.round(100 * PSI),        // ≈ 62ms
  ACCEPTABLE: 100,                      // 100ms baseline
  DEGRADED: Math.round(100 * PHI),     // ≈ 162ms
  UNHEALTHY: Math.round(100 * PHI * PHI), // ≈ 262ms
};

/**
 * Determine overall status from an array of individual check results.
 *
 * @param {{ status: string }[]} checkResults
 * @returns {string} overall HealthStatus
 */
function aggregateStatus(checkResults) {
  if (checkResults.some((c) => c.status === HealthStatus.UNHEALTHY)) {
    return HealthStatus.UNHEALTHY;
  }
  if (checkResults.some((c) => c.status === HealthStatus.DEGRADED)) {
    return HealthStatus.DEGRADED;
  }
  return HealthStatus.HEALTHY;
}

/**
 * Classify a response latency into a health status using phi-scaled thresholds.
 *
 * @param {number} latencyMs
 * @returns {string} HealthStatus
 */
function classifyLatency(latencyMs) {
  if (latencyMs <= RESPONSE_TIME_THRESHOLDS.ACCEPTABLE) {
    return HealthStatus.HEALTHY;
  }
  if (latencyMs <= RESPONSE_TIME_THRESHOLDS.DEGRADED) {
    return HealthStatus.DEGRADED;
  }
  return HealthStatus.UNHEALTHY;
}

/**
 * Execute a single health check with timeout and latency tracking.
 *
 * @param {{ name: string, check: () => Promise<{ ok: boolean, detail?: string }>, timeoutMs?: number }} checkDef
 * @returns {Promise<{ name: string, status: string, latency: number, detail?: string }>}
 */
async function executeCheck(checkDef) {
  const timeoutMs = checkDef.timeoutMs || Math.round(1000 * PHI); // ~1618ms default
  const start = performance.now();

  try {
    const result = await Promise.race([
      checkDef.check(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timed out')), timeoutMs)
      ),
    ]);

    const latency = Math.round(performance.now() - start);
    const latencyStatus = classifyLatency(latency);

    return {
      name: checkDef.name,
      status: result.ok ? latencyStatus : HealthStatus.UNHEALTHY,
      latency,
      ...(result.detail ? { detail: result.detail } : {}),
    };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return {
      name: checkDef.name,
      status: HealthStatus.UNHEALTHY,
      latency,
      detail: err.message,
    };
  }
}

/**
 * Create a health probe that runs a set of checks and produces a health response.
 *
 * @param {string} serviceName
 * @param {{ name: string, check: () => Promise<{ ok: boolean, detail?: string }>, timeoutMs?: number }[]} checks
 * @param {{ version?: string }} [options]
 * @returns {{ run: () => Promise<object>, handler: (req, res) => Promise<void> }}
 */
function createHealthProbe(serviceName, checks, options = {}) {
  const { version = '1.0.0' } = options;
  const startTime = Date.now();

  async function run() {
    const checkResults = await Promise.all(checks.map(executeCheck));
    const overallStatus = aggregateStatus(checkResults);
    const uptimeMs = Date.now() - startTime;

    return {
      status: overallStatus,
      service: serviceName,
      version,
      uptime: uptimeMs,
      timestamp: new Date().toISOString(),
      checks: checkResults,
      thresholds: RESPONSE_TIME_THRESHOLDS,
    };
  }

  /**
   * Express-compatible request handler.
   */
  async function handler(req, res) {
    const result = await run();
    const statusCode = result.status === HealthStatus.HEALTHY ? 200
      : result.status === HealthStatus.DEGRADED ? 200
        : 503;
    res.status(statusCode).json(result);
  }

  return { run, handler };
}

module.exports = {
  createHealthProbe,
  executeCheck,
  aggregateStatus,
  classifyLatency,
  HealthStatus,
  RESPONSE_TIME_THRESHOLDS,
};
