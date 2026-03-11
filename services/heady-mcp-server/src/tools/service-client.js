/**
 * Heady™ Service Client
 * HTTP client for calling upstream microservices with φ-scaled retry
 */
'use strict';

const { phiRetryDelays, TIMEOUTS } = require('../config/phi-constants');
const { serviceUrl, getServiceEndpoint } = require('../config/services');

/**
 * Call an upstream Heady service
 * @param {string} serviceName — e.g. 'heady-brain', 'heady-memory'
 * @param {string} path — API path, e.g. '/chat'
 * @param {object} body — Request body
 * @param {object} [opts] — { method, timeout, retries }
 */
async function callService(serviceName, path, body = {}, opts = {}) {
  const endpoint = getServiceEndpoint(serviceName);
  if (!endpoint) {
    return {
      status: 'unavailable',
      service: serviceName,
      error: `Service '${serviceName}' not found in registry`,
      hint: 'Service may not be running. Use heady_health to check.',
    };
  }

  const url = `${endpoint.url}${endpoint.basePath}${path}`;
  const method = opts.method || 'POST';
  const timeout = (opts.timeout || TIMEOUTS.REQUEST) * 1000;
  const retries = opts.retries ?? 2;
  const delays = phiRetryDelays(retries);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Heady-Source': 'mcp-server',
          'X-Heady-Version': '5.0.0',
        },
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }

      return await response.json();
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delays[attempt]));
        continue;
      }

      return {
        status: 'error',
        service: serviceName,
        endpoint: url,
        error: err.message,
        attempts: attempt + 1,
        hint: `Service '${serviceName}' at ${endpoint.url} may be down. Check with heady_health.`,
      };
    }
  }
}

/**
 * Check if a service is healthy
 */
async function checkServiceHealth(serviceName) {
  const endpoint = getServiceEndpoint(serviceName);
  if (!endpoint) return { status: 'unknown', service: serviceName };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${endpoint.url}${endpoint.healthPath}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    return { status: 'healthy', service: serviceName, ...data };
  } catch {
    return { status: 'unhealthy', service: serviceName, endpoint: endpoint.url };
  }
}

module.exports = { callService, checkServiceHealth };
