'use strict';

const { createHealthProbe, HealthStatus } = require('./probes');
const { FIB, PHI, nearestFib } = require('@heady/phi-math-foundation');

/**
 * Default health check interval schedule using Fibonacci numbers (in seconds).
 * Each service picks its interval from this list based on a hash of its name,
 * preventing thundering-herd effects when multiple services poll simultaneously.
 *
 * FIB-distributed intervals: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 seconds
 */
const FIB_INTERVALS_SEC = FIB.slice(0, 10);

/**
 * Pick a Fibonacci-distributed health check interval based on service name.
 * This ensures different services naturally stagger their checks.
 *
 * @param {string} serviceName
 * @returns {number} interval in seconds
 */
function pickFibInterval(serviceName) {
  let hash = 0;
  for (let i = 0; i < serviceName.length; i++) {
    hash = ((hash << 5) - hash + serviceName.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % FIB_INTERVALS_SEC.length;
  return FIB_INTERVALS_SEC[idx];
}

/**
 * Create a pgvector connection health check.
 *
 * @param {{ query: (sql: string) => Promise<any> } | null} pgClient — a pg-compatible client or pool
 * @returns {{ name: string, check: () => Promise<{ ok: boolean, detail?: string }> }}
 */
function pgvectorCheck(pgClient) {
  return {
    name: 'pgvector',
    check: async () => {
      if (!pgClient) {
        return { ok: false, detail: 'pgvector client not configured' };
      }
      try {
        const result = await pgClient.query('SELECT 1 AS health');
        const ok = result.rows && result.rows.length > 0 && result.rows[0].health === 1;
        return { ok, detail: ok ? 'connected' : 'query returned unexpected result' };
      } catch (err) {
        return { ok: false, detail: `pgvector error: ${err.message}` };
      }
    },
  };
}

/**
 * Create a Redis connection health check.
 *
 * @param {{ ping: () => Promise<string> } | null} redisClient — an ioredis-compatible client
 * @returns {{ name: string, check: () => Promise<{ ok: boolean, detail?: string }> }}
 */
function redisCheck(redisClient) {
  return {
    name: 'redis',
    check: async () => {
      if (!redisClient) {
        return { ok: false, detail: 'Redis client not configured' };
      }
      try {
        const pong = await redisClient.ping();
        const ok = pong === 'PONG';
        return { ok, detail: ok ? 'connected' : `unexpected ping response: ${pong}` };
      } catch (err) {
        return { ok: false, detail: `Redis error: ${err.message}` };
      }
    },
  };
}

/**
 * Create an external API health check.
 *
 * @param {string} name — display name
 * @param {string} url — URL to fetch
 * @param {{ timeoutMs?: number }} [options]
 * @returns {{ name: string, check: () => Promise<{ ok: boolean, detail?: string }>, timeoutMs?: number }}
 */
function externalApiCheck(name, url, options = {}) {
  const timeoutMs = options.timeoutMs || Math.round(1000 * PHI);
  return {
    name,
    timeoutMs,
    check: async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(url, { signal: controller.signal, method: 'GET' });
        clearTimeout(timer);
        const ok = response.ok;
        return {
          ok,
          detail: ok ? `status ${response.status}` : `HTTP ${response.status}`,
        };
      } catch (err) {
        return { ok: false, detail: `API error: ${err.message}` };
      }
    },
  };
}

/**
 * @typedef {object} HealthMiddlewareOptions
 * @property {string} serviceName
 * @property {string} [version='1.0.0']
 * @property {{ query: Function } | null} [pgClient] — pgvector client
 * @property {{ ping: Function } | null} [redisClient] — Redis client
 * @property {{ name: string, url: string, timeoutMs?: number }[]} [externalApis] — external API endpoints
 * @property {{ name: string, check: () => Promise<{ ok: boolean, detail?: string }>, timeoutMs?: number }[]} [customChecks]
 */

/**
 * Create Express middleware that adds /health, /healthz, and /ready endpoints.
 * Health checks use Fibonacci-distributed intervals to prevent thundering herd.
 *
 * @param {HealthMiddlewareOptions} options
 * @returns {Function} Express router-compatible middleware
 */
function createHealthMiddleware(options) {
  const {
    serviceName,
    version = '1.0.0',
    pgClient = null,
    redisClient = null,
    externalApis = [],
    customChecks = [],
  } = options;

  const checks = [];

  if (pgClient) {
    checks.push(pgvectorCheck(pgClient));
  }
  if (redisClient) {
    checks.push(redisCheck(redisClient));
  }
  for (const api of externalApis) {
    checks.push(externalApiCheck(api.name, api.url, { timeoutMs: api.timeoutMs }));
  }
  checks.push(...customChecks);

  const probe = createHealthProbe(serviceName, checks, { version });
  const intervalSec = pickFibInterval(serviceName);

  // Cache the last health result to avoid running checks on every request.
  // The cache expires after a Fibonacci-distributed interval.
  let cachedResult = null;
  let cacheTime = 0;

  async function getHealth() {
    const now = Date.now();
    if (cachedResult && (now - cacheTime) < intervalSec * 1000) {
      return cachedResult;
    }
    cachedResult = await probe.run();
    cacheTime = now;
    return cachedResult;
  }

  /**
   * Express middleware function. Mount as app.use(healthMiddleware).
   */
  return function healthMiddleware(req, res, next) {
    const path = req.path;

    if (path === '/health' || path === '/healthz') {
      getHealth().then((result) => {
        const statusCode = result.status === HealthStatus.UNHEALTHY ? 503 : 200;
        res.status(statusCode).json(result);
      }).catch((err) => {
        res.status(503).json({
          status: HealthStatus.UNHEALTHY,
          service: serviceName,
          version,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      });
      return;
    }

    if (path === '/ready') {
      getHealth().then((result) => {
        // /ready returns 503 if degraded OR unhealthy (stricter than /health)
        const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
        res.status(statusCode).json({
          status: result.status,
          service: serviceName,
          ready: result.status === HealthStatus.HEALTHY,
          timestamp: new Date().toISOString(),
        });
      }).catch((err) => {
        res.status(503).json({
          status: HealthStatus.UNHEALTHY,
          service: serviceName,
          ready: false,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      });
      return;
    }

    next();
  };
}

module.exports = {
  createHealthMiddleware,
  pgvectorCheck,
  redisCheck,
  externalApiCheck,
  pickFibInterval,
  FIB_INTERVALS_SEC,
};
