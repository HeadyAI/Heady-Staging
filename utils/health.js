/**
 * HEADY SYSTEM — Universal Health Check Module
 * ═══════════════════════════════════════════════════════════════
 * Provides standardized health, readiness, and startup endpoints
 * for every microservice in the Heady ecosystem. These endpoints
 * are critical for Kubernetes/Docker orchestration to determine
 * pod viability, route traffic away from failing nodes, and
 * automatically restart stalled or hallucinating agents.
 *
 * Endpoints:
 *   GET /healthz    — Liveness probe (is the process alive?)
 *   GET /readiness  — Readiness probe (are all dependencies up?)
 *   GET /startup    — Startup probe (has initialization completed?)
 *
 * Usage:
 *   const { attachHealthChecks } = require("./health");
 *   attachHealthChecks(app, {
 *     service: "alpha-agent",
 *     version: "2.1.0",
 *     checks: [
 *       { name: "redis", check: () => redis.ping() },
 *       { name: "postgres", check: () => db.query("SELECT 1") },
 *     ]
 *   });
 * ═══════════════════════════════════════════════════════════════
 */

const { createLogger } = require("./logger");

/**
 * Attaches /healthz, /readiness, and /startup endpoints to an
 * Express or compatible HTTP application. Each endpoint returns
 * structured JSON with the service status and individual dependency
 * check results.
 *
 * @param {object} app - Express application instance
 * @param {object} config - Health check configuration
 * @param {string} config.service - Service name for identification
 * @param {string} config.version - Service version string
 * @param {Array} config.checks - Array of dependency check objects
 *   Each check: { name: string, check: async () => void, critical?: boolean }
 *   A check passes if it resolves; it fails if it throws.
 *   If critical is true (default), a failure makes the service "not ready".
 * @param {number} config.startupTimeoutMs - Max time to wait for startup (default: 30000)
 */
function attachHealthChecks(app, config) {
  const { service, version, checks = [], startupTimeoutMs = 30000 } = config;
  const logger = createLogger(service);
  const bootTime = Date.now();

  // Track whether the startup sequence has completed successfully.
  // The startup probe returns "not ready" until all critical checks
  // pass at least once, or the timeout expires.
  let startupComplete = false;
  let startupError = null;

  /**
   * Runs all dependency checks concurrently and returns structured
   * results. Each check has a 5-second timeout to prevent a single
   * slow dependency from blocking the entire health response.
   */
  async function runChecks() {
    const results = await Promise.all(
      checks.map(async ({ name, check, critical = true }) => {
        const start = Date.now();
        try {
          await Promise.race([
            check(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Health check timeout (5s)")), 5000)
            ),
          ]);
          return { name, status: "healthy", duration_ms: Date.now() - start, critical };
        } catch (err) {
          return {
            name,
            status: "unhealthy",
            error: err.message,
            duration_ms: Date.now() - start,
            critical,
          };
        }
      })
    );

    // The service is "ready" if all critical checks are healthy
    const criticalFailures = results.filter(r => r.critical && r.status === "unhealthy");
    const allHealthy = criticalFailures.length === 0;

    return { checks: results, allHealthy, criticalFailures };
  }

  /**
   * GET /healthz — Liveness probe
   *
   * Returns 200 if the process is alive and responding to HTTP.
   * This is intentionally simple: if the event loop is processing
   * requests, the process is alive. Kubernetes uses this to decide
   * whether to restart the container (not whether to route traffic).
   */
  app.get("/healthz", (req, res) => {
    res.status(200).json({
      status: "alive",
      service,
      version,
      uptime_seconds: Math.floor((Date.now() - bootTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /readiness — Readiness probe
   *
   * Returns 200 if all critical dependencies are available and the
   * service can handle traffic. Returns 503 if any critical dependency
   * is down. Kubernetes uses this to decide whether to route traffic
   * to this pod (not whether to restart it).
   */
  app.get("/readiness", async (req, res) => {
    try {
      const { checks: checkResults, allHealthy, criticalFailures } = await runChecks();

      if (allHealthy) {
        if (!startupComplete) {
          startupComplete = true;
          logger.info("All critical health checks passed. Service is ready.");
        }
        res.status(200).json({
          status: "ready",
          service,
          version,
          checks: checkResults,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.warn(
          { failures: criticalFailures.map(f => f.name) },
          "Readiness check failed: critical dependencies unhealthy"
        );
        res.status(503).json({
          status: "not_ready",
          service,
          version,
          checks: checkResults,
          critical_failures: criticalFailures,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      logger.error({ error: err.message }, "Readiness check threw unexpected error");
      res.status(503).json({
        status: "error",
        service,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /startup — Startup probe
   *
   * Returns 200 once the service has completed initialization and
   * all critical checks have passed at least once. Returns 503
   * during startup. After the timeout expires, returns 503 with
   * an error if startup never completed (Kubernetes will restart).
   */
  app.get("/startup", async (req, res) => {
    if (startupComplete) {
      res.status(200).json({
        status: "started",
        service,
        version,
        startup_duration_ms: null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if we've exceeded the startup timeout
    const elapsed = Date.now() - bootTime;
    if (elapsed > startupTimeoutMs) {
      const msg = `Startup timeout exceeded (${startupTimeoutMs}ms)`;
      logger.fatal(msg);
      res.status(503).json({
        status: "startup_timeout",
        service,
        error: msg,
        elapsed_ms: elapsed,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Try running checks to see if we can transition to started
    try {
      const { allHealthy } = await runChecks();
      if (allHealthy) {
        startupComplete = true;
        logger.info({ elapsed_ms: elapsed }, "Startup completed successfully");
        res.status(200).json({
          status: "started",
          service,
          version,
          startup_duration_ms: elapsed,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: "starting",
          service,
          elapsed_ms: elapsed,
          timeout_ms: startupTimeoutMs,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      res.status(503).json({
        status: "starting",
        service,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  logger.info({ service, version, checks: checks.map(c => c.name) }, "Health endpoints registered");
}

module.exports = { attachHealthChecks };
