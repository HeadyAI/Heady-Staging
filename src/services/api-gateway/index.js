/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const http = require('http');
const crypto = require('crypto');
const { PHI, PSI, fib, phiMs, phiBackoff, PHI_TIMING, CSL_THRESHOLDS, cosineSimilarity, normalize } = require('../../shared/phi-math');

const SERVICE_NAME = 'heady-api-gateway';
const PORT = parseInt(process.env.SERVICE_PORT || '3370', 10);

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGER (zero console.log)
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

const logger = Object.fromEntries(
  Object.entries(LOG_LEVELS).map(([level, num]) => [
    level,
    (data) => {
      if (num <= CURRENT_LEVEL) {
        const entry = JSON.stringify({
          timestamp: new Date().toISOString(),
          level,
          service: SERVICE_NAME,
          ...data,
        });
        process[num === 0 ? 'stderr' : 'stdout'].write(entry + '\n');
      }
    },
  ])
);

// ═══════════════════════════════════════════════════════════════════════════════
// UPSTREAM SERVICE REGISTRY — All Heady services as liquid routing targets
// ═══════════════════════════════════════════════════════════════════════════════

const UPSTREAM_SERVICES = new Map([
  ['auth-session',  { host: process.env.AUTH_HOST    || 'auth-session',  port: 3360 }],
  ['notification',  { host: process.env.NOTIF_HOST   || 'notification',  port: 3361 }],
  ['analytics',     { host: process.env.ANALYTICS_HOST || 'analytics',   port: 3362 }],
  ['scheduler',     { host: process.env.SCHED_HOST   || 'scheduler',     port: 3363 }],
  ['search',        { host: process.env.SEARCH_HOST  || 'search',        port: 3364 }],
  ['onboarding',    { host: process.env.ONBOARD_HOST || 'onboarding',    port: 3365 }],
  ['colab-gateway', { host: process.env.COLAB_HOST   || 'colab-gateway', port: 3366 }],
]);

// ─── Route table: path prefix → upstream service ────────────────────────────
const ROUTE_TABLE = [
  { prefix: '/api/v1/auth',       service: 'auth-session' },
  { prefix: '/api/v1/notify',     service: 'notification' },
  { prefix: '/api/v1/analytics',  service: 'analytics' },
  { prefix: '/api/v1/schedule',   service: 'scheduler' },
  { prefix: '/api/v1/search',     service: 'search' },
  { prefix: '/api/v1/onboarding', service: 'onboarding' },
  { prefix: '/api/v1/colab',      service: 'colab-gateway' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER per upstream (φ-scaled)
// ═══════════════════════════════════════════════════════════════════════════════

class UpstreamCircuitBreaker {
  constructor(serviceName) {
    this.name = serviceName;
    this.state = 'CLOSED';        // CLOSED → OPEN → HALF_OPEN → CLOSED
    this.failures = 0;
    this.threshold = fib(5);      // 5 failures to open
    this.lastFailure = 0;
    this.cooldownMs = PHI_TIMING.PHI_5;  // 11,090ms before half-open
    this.successesNeeded = fib(3);       // 2 successes to close
    this.halfOpenSuccesses = 0;
  }

  canRequest() {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.cooldownMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
        return true;
      }
      return false;
    }
    return true;  // HALF_OPEN allows probes
  }

  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.successesNeeded) {
        this.state = 'CLOSED';
        this.failures = 0;
        logger.info({ msg: 'circuit_closed', service: this.name });
      }
    }
    this.failures = 0;
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold && this.state !== 'OPEN') {
      this.state = 'OPEN';
      logger.warn({ msg: 'circuit_opened', service: this.name, failures: this.failures });
    }
  }
}

const circuitBreakers = new Map();
for (const [name] of UPSTREAM_SERVICES) {
  circuitBreakers.set(name, new UpstreamCircuitBreaker(name));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORS — Explicit origin whitelist (ZERO wildcards)
// ═══════════════════════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || [
  'https://headyme.com', 'https://headysystems.com', 'https://heady-ai.com',
  'https://headyos.com', 'https://headyconnection.org', 'https://headyconnection.com',
  'https://headyex.com', 'https://headyfinance.com', 'https://admin.headysystems.com',
].join(',')).split(',').filter(Boolean).map(o => o.trim()));

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-ID,X-CSRF-Token');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID,X-RateLimit-Limit,X-RateLimit-Remaining');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING — Fibonacci-tiered
// ═══════════════════════════════════════════════════════════════════════════════

const rateLimitStore = new Map();
const RATE_WINDOW_MS = fib(10) * 1000;  // 55,000ms
const RATE_LIMIT_DEFAULT = fib(9);       // 34 req/window

function checkRateLimit(clientKey) {
  const now = Date.now();
  let entry = rateLimitStore.get(clientKey);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitStore.set(clientKey, entry);
  }

  entry.count++;
  return {
    allowed: entry.count <= RATE_LIMIT_DEFAULT,
    remaining: Math.max(0, RATE_LIMIT_DEFAULT - entry.count),
    limit: RATE_LIMIT_DEFAULT,
  };
}

// Cleanup old entries every φ⁷ ms
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [key, entry] of rateLimitStore) {
    if (entry.windowStart < cutoff) rateLimitStore.delete(key);
  }
}, PHI_TIMING.PHI_7);

// ═══════════════════════════════════════════════════════════════════════════════
// PROXY — Forward requests to upstream services
// ═══════════════════════════════════════════════════════════════════════════════

function proxyRequest(req, res, upstream, path) {
  const options = {
    hostname: upstream.host,
    port: upstream.port,
    path: path,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${upstream.host}:${upstream.port}`,
      'x-forwarded-for': req.socket.remoteAddress,
      'x-forwarded-proto': 'https',
    },
    timeout: PHI_TIMING.PHI_5,  // 11,090ms
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    logger.error({ msg: 'proxy_error', upstream: upstream.host, error: err.message });
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'HEADY-GATEWAY-502',
        message: `Upstream service unavailable: ${upstream.host}`,
      }));
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'HEADY-GATEWAY-504',
        message: `Upstream timeout: ${upstream.host}`,
      }));
    }
  });

  req.pipe(proxyReq, { end: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERVER
// ═══════════════════════════════════════════════════════════════════════════════

const server = http.createServer((req, res) => {
  const requestId = req.headers['x-request-id'] || `heady-${crypto.randomUUID()}`;
  res.setHeader('X-Request-ID', requestId);
  setCorsHeaders(req, res);

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Health check
  if (req.url === '/health' || req.url === '/healthz') {
    const upstreams = {};
    for (const [name, cb] of circuitBreakers) {
      upstreams[name] = cb.state;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'healthy',
      service: SERVICE_NAME,
      version: '5.2.0',
      uptime: process.uptime(),
      upstreams,
      timestamp: new Date().toISOString(),
    }));
  }

  // Rate limiting
  const clientKey = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const rateResult = checkRateLimit(clientKey);
  res.setHeader('X-RateLimit-Limit', rateResult.limit);
  res.setHeader('X-RateLimit-Remaining', rateResult.remaining);

  if (!rateResult.allowed) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'HEADY-RATE-429',
      message: 'Rate limit exceeded',
    }));
  }

  // Route matching
  const route = ROUTE_TABLE.find(r => req.url.startsWith(r.prefix));
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'HEADY-NOT-FOUND-404',
      message: `No route for ${req.url}`,
    }));
  }

  const upstream = UPSTREAM_SERVICES.get(route.service);
  const cb = circuitBreakers.get(route.service);

  if (!cb.canRequest()) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'HEADY-CIRCUIT-OPEN-503',
      message: `Service temporarily unavailable: ${route.service}`,
    }));
  }

  // Strip the prefix and forward
  const upstreamPath = req.url.slice(route.prefix.length) || '/';

  logger.info({
    msg: 'route',
    requestId,
    method: req.method,
    path: req.url,
    upstream: route.service,
    upstreamPath,
  });

  proxyRequest(req, res, upstream, upstreamPath);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info({ msg: 'shutdown_initiated', signal });
  server.close(() => {
    logger.info({ msg: 'shutdown_complete' });
    process.exit(0);
  });
  // Force exit after φ⁵ ms if graceful fails
  setTimeout(() => process.exit(1), PHI_TIMING.PHI_5);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, () => {
  logger.info({ msg: 'started', port: PORT, routes: ROUTE_TABLE.length, upstreams: UPSTREAM_SERVICES.size });
});
