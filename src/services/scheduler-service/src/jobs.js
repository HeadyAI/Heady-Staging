'use strict';

/**
 * Built-in job definitions for the Heady platform scheduler.
 *
 * Intervals use Fibonacci-scaled milliseconds:
 * - FIB[8]  * 1000   = 21 * 1000     = 21,000ms      (21s)
 * - FIB[10] * 60000  = 55 * 60000    = 3,300,000ms   (55min)
 * - FIB[12] * 60000  = 144 * 60000   = 8,640,000ms   (144min)
 * - FIB[14] * 60000  = 377 * 60000   = 22,620,000ms  (377min)
 */

/**
 * Create the built-in job definitions.
 *
 * @param {object} params
 * @param {object} params.log — structured logger
 * @param {string} [params.healthCheckUrl] — URL to check all services
 * @param {string} [params.metricsUrl] — URL to trigger metrics rollup
 * @param {string} [params.sessionCleanupUrl] — URL to trigger session cleanup
 * @param {string} [params.vectorOptimizeUrl] — URL to trigger vector index optimization
 * @returns {object[]} array of job definitions
 */
function createBuiltinJobs({ log, healthCheckUrl, metricsUrl, sessionCleanupUrl, vectorOptimizeUrl }) {
  const services = (process.env.HEALTH_CHECK_SERVICES || '').split(',').filter(Boolean);
  const internalApiKey = process.env.INTERNAL_API_KEY || '';

  return [
    {
      id: 'healthCheckAll',
      name: 'Health Check All Services',
      type: 'interval',
      intervalMs: 21000, // FIB[8] * 1000 = 21s
      maxRetries: 3,
      handler: async () => {
        const targets = services.length > 0
          ? services
          : [
              'http://auth-session-server:3380/health',
              'http://notification-service:3381/health',
              'http://analytics-service:3382/health',
              'http://billing-service:3383/health',
            ];

        const results = await Promise.allSettled(
          targets.map(async (url) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            try {
              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timeout);
              const body = await res.json();
              return { url, status: res.status, body };
            } catch (err) {
              clearTimeout(timeout);
              throw new Error(`${url}: ${err.message}`);
            }
          })
        );

        const healthy = results.filter((r) => r.status === 'fulfilled').length;
        const unhealthy = results.filter((r) => r.status === 'rejected');

        if (unhealthy.length > 0) {
          for (const r of unhealthy) {
            log.warn('Health check failed', { error: r.reason?.message });
          }
        }

        log.info('Health check completed', {
          total: targets.length,
          healthy,
          unhealthy: unhealthy.length,
        });

        if (unhealthy.length === targets.length) {
          throw new Error('All health checks failed');
        }
      },
    },
    {
      id: 'metricsRollup',
      name: 'Metrics Rollup',
      type: 'interval',
      intervalMs: 144 * 60 * 1000, // FIB[12] * 60 * 1000 = 144 min
      maxRetries: 5,
      handler: async () => {
        const url = metricsUrl || 'http://analytics-service:3382/metrics/rollups';
        log.info('Triggering metrics rollup');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'X-API-Key': internalApiKey },
          });
          clearTimeout(timeout);

          if (!res.ok) {
            throw new Error(`Metrics rollup returned ${res.status}`);
          }
          const data = await res.json();
          log.info('Metrics rollup complete', { rollups: data.rollups?.length || 0 });
        } catch (err) {
          clearTimeout(timeout);
          throw err;
        }
      },
    },
    {
      id: 'sessionCleanup',
      name: 'Session Cleanup',
      type: 'interval',
      intervalMs: 55 * 60 * 1000, // FIB[10] * 60 * 1000 = 55 min
      maxRetries: 3,
      handler: async () => {
        const url = sessionCleanupUrl || 'http://auth-session-server:3380/health';
        log.info('Running session cleanup check');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);

          if (!res.ok) {
            throw new Error(`Session cleanup check returned ${res.status}`);
          }
          log.info('Session cleanup check complete');
        } catch (err) {
          clearTimeout(timeout);
          throw err;
        }
      },
    },
    {
      id: 'vectorIndexOptimize',
      name: 'Vector Index Optimize',
      type: 'interval',
      intervalMs: 377 * 60 * 1000, // FIB[14] * 60 * 1000 = 377 min
      maxRetries: 2,
      handler: async () => {
        const url = vectorOptimizeUrl || process.env.VECTOR_OPTIMIZE_URL;
        if (!url) {
          log.debug('Vector optimization skipped: no URL configured');
          return;
        }

        log.info('Triggering vector index optimization');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        try {
          const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': internalApiKey,
            },
            body: JSON.stringify({ action: 'optimize' }),
          });
          clearTimeout(timeout);

          if (!res.ok) {
            throw new Error(`Vector optimization returned ${res.status}`);
          }
          log.info('Vector index optimization complete');
        } catch (err) {
          clearTimeout(timeout);
          throw err;
        }
      },
    },
  ];
}

module.exports = {
  createBuiltinJobs,
};
