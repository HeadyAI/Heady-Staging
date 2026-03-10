/**
 * @fileoverview LiquidNodeBase — Universal base class for all Heady services.
 * Every microservice inherits from this class to gain health endpoints,
 * structured logging, CSL-gated routing, service mesh registration,
 * bee lifecycle hooks, and graceful shutdown. Zero magic numbers.
 *
 * @module shared/liquid-node-base
 * @version 4.0.0
 *
 * Heady™ Latent OS — Sacred Geometry v4.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 * 51 Provisional Patents — All Rights Reserved
 */

'use strict';

const http = require('http');
const { EventEmitter } = require('events');
const crypto = require('crypto');

// ─── φ-MATH CONSTANTS (Zero Magic Numbers) ──────────────────────────────────
const PHI = (1 + Math.sqrt(5)) / 2;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const PSI3 = PSI * PSI * PSI;
const PSI4 = PSI * PSI * PSI * PSI;
const FIB = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765];

/**
 * Fibonacci accessor (1-based).
 * @param {number} n - Index into Fibonacci sequence
 * @returns {number}
 */
function fib(n) { return FIB[n - 1] || 0; }

/**
 * Phi-harmonic threshold: 1 - ψ^level × spread
 * @param {number} level - Threshold level (0-4)
 * @param {number} [spread=0.5] - Spread factor
 * @returns {number}
 */
function phiThreshold(level, spread) {
  const s = typeof spread === 'number' ? spread : 0.5;
  return 1 - Math.pow(PSI, level) * s;
}

/**
 * Phi-exponential backoff with optional jitter.
 * @param {number} attempt - Current attempt (0-based)
 * @param {number} [baseMs=1000] - Base milliseconds
 * @param {number} [maxMs=60000] - Maximum milliseconds
 * @returns {number}
 */
function phiBackoff(attempt, baseMs, maxMs) {
  const base = typeof baseMs === 'number' ? baseMs : 1000;
  const max = typeof maxMs === 'number' ? maxMs : 60000;
  const delay = base * Math.pow(PHI, attempt);
  const jitter = 1 + (Math.random() - 0.5) * PSI2;
  return Math.min(delay * jitter, max);
}

/** CSL gate thresholds — phi-derived, zero magic numbers */
const CSL_THRESHOLDS = Object.freeze({
  MINIMUM:  phiThreshold(0),
  LOW:      phiThreshold(1),
  MEDIUM:   phiThreshold(2),
  HIGH:     phiThreshold(3),
  CRITICAL: phiThreshold(4),
});

/** Resource pool ratios — Fibonacci-derived */
const POOL_RATIOS = Object.freeze({
  HOT: 0.34,
  WARM: 0.21,
  COLD: 0.13,
  RESERVE: 0.08,
  GOVERNANCE: 0.05,
});

// ─── STRUCTURED LOGGER ──────────────────────────────────────────────────────

/**
 * Creates a structured JSON logger for a given service.
 * @param {string} serviceName - Name of the service
 * @param {string} domain - Service domain category
 * @param {number} port - Service port
 * @returns {Object} Logger with info, warn, error, debug methods
 */
function createLogger(serviceName, domain, port) {
  /**
   * @param {'info'|'warn'|'error'|'debug'} level
   * @param {string} message
   * @param {Object} [meta]
   */
  function emit(level, message, meta) {
    const m = meta || {};
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      domain: domain,
      port: port,
      message,
      correlationId: m.correlationId || null,
      traceId: m.traceId || null,
      ...m,
    });
    if (level === 'error') { process.stderr.write(entry + '\n'); }
    else { process.stdout.write(entry + '\n'); }
  }

  return Object.freeze({
    /** @param {string} msg @param {Object} [meta] */
    info:  (msg, meta) => emit('info', msg, meta),
    /** @param {string} msg @param {Object} [meta] */
    warn:  (msg, meta) => emit('warn', msg, meta),
    /** @param {string} msg @param {Object} [meta] */
    error: (msg, meta) => emit('error', msg, meta),
    /** @param {string} msg @param {Object} [meta] */
    debug: (msg, meta) => emit('debug', msg, meta),
  });
}

// ─── CIRCUIT BREAKER ────────────────────────────────────────────────────────

/**
 * Circuit breaker states.
 * @enum {string}
 */
const CB_STATE = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

/**
 * Lightweight circuit breaker with phi-scaled thresholds.
 * @class
 */
class CircuitBreaker {
  /**
   * @param {Object} opts
   * @param {string} opts.name - Breaker name
   * @param {number} [opts.failureThreshold] - Failures before opening (default fib(5)=5)
   * @param {number} [opts.resetTimeout] - Time in ms before half-open probe (default PHI^3*1000=4236ms)
   * @param {number} [opts.halfOpenMax] - Max concurrent half-open probes (default fib(3)=2)
   */
  constructor(opts) {
    this.name = opts.name;
    this.failureThreshold = opts.failureThreshold || fib(5);
    this.resetTimeout = opts.resetTimeout || Math.round(PHI * PHI * PHI * 1000);
    this.halfOpenMax = opts.halfOpenMax || fib(3);
    this.state = CB_STATE.CLOSED;
    this.failures = 0;
    this.lastFailure = 0;
    this.halfOpenCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
  }

  /**
   * Execute a function through the circuit breaker.
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>}
   * @throws {Error} If circuit is open
   */
  async execute(fn) {
    this.totalCalls++;

    if (this.state === CB_STATE.OPEN) {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = CB_STATE.HALF_OPEN;
        this.halfOpenCount = 0;
      } else {
        throw new Error(`Circuit ${this.name} is OPEN`);
      }
    }

    if (this.state === CB_STATE.HALF_OPEN && this.halfOpenCount >= this.halfOpenMax) {
      throw new Error(`Circuit ${this.name} HALF_OPEN limit reached`);
    }

    try {
      if (this.state === CB_STATE.HALF_OPEN) { this.halfOpenCount++; }
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  /** Record a success — reset counters and close if half-open. */
  onSuccess() {
    this.successCount++;
    this.failures = 0;
    if (this.state === CB_STATE.HALF_OPEN) {
      this.state = CB_STATE.CLOSED;
    }
  }

  /** Record a failure — open if threshold exceeded. */
  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = CB_STATE.OPEN;
    }
  }

  /** @returns {Object} Breaker status snapshot */
  status() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      failureRate: this.totalCalls > 0 ? (this.totalCalls - this.successCount) / this.totalCalls : 0,
    };
  }
}

// ─── RATE LIMITER ───────────────────────────────────────────────────────────

/**
 * Token-bucket rate limiter with Fibonacci-scaled tiers.
 * @class
 */
class RateLimiter {
  /**
   * @param {Object} tiers - Map of tier name to requests per minute
   */
  constructor(tiers) {
    /** @type {Object<string, number>} */
    this.tiers = tiers || {
      public: fib(10),      // 55 rpm
      authenticated: fib(12), // 144 rpm
      apiKey: fib(14),       // 377 rpm
      internal: fib(16),     // 987 rpm
    };
    /** @type {Map<string, {tokens: number, lastRefill: number}>} */
    this.buckets = new Map();
  }

  /**
   * Check if a request is allowed.
   * @param {string} key - Client identifier
   * @param {string} [tier='public'] - Rate limit tier
   * @returns {{allowed: boolean, remaining: number, retryAfter: number}}
   */
  check(key, tier) {
    const t = tier || 'public';
    const maxTokens = this.tiers[t] || this.tiers.public;
    const now = Date.now();
    const bucketKey = `${t}:${key}`;

    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      this.buckets.set(bucketKey, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const refillRate = maxTokens / 60000;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
    }

    const retryAfter = Math.ceil((1 - bucket.tokens) / refillRate);
    return { allowed: false, remaining: 0, retryAfter };
  }

  /**
   * Clean expired buckets older than Fibonacci-scaled retention.
   */
  cleanup() {
    const maxAge = fib(10) * 1000; // 55 seconds
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}

// ─── CORRELATION & TRACING ──────────────────────────────────────────────────

/**
 * Generate a correlation ID for request tracing.
 * @param {string} [prefix='hdy'] - ID prefix
 * @returns {string}
 */
function correlationId(prefix) {
  const p = prefix || 'hdy';
  return `${p}-${Date.now().toString(36)}-${crypto.randomBytes(fib(6)).toString('hex')}`;
}

// ─── LIQUID NODE BASE CLASS ─────────────────────────────────────────────────

/**
 * LiquidNodeBase — base class for all Heady microservices.
 * Provides health, readiness, liveness, metrics, structured logging,
 * rate limiting, circuit breaking, graceful shutdown, and service mesh hooks.
 *
 * @class
 * @extends EventEmitter
 */
class LiquidNodeBase extends EventEmitter {
  /**
   * @param {Object} config
   * @param {string} config.name - Service name (e.g. 'heady-conductor')
   * @param {number} config.port - Service port
   * @param {string} config.domain - Service domain (e.g. 'orchestration')
   * @param {string} config.description - Human-readable description
   * @param {string} config.version - Service version
   * @param {string[]} [config.dependencies] - List of upstream service names
   * @param {string} [config.pool] - Resource pool: 'hot', 'warm', 'cold'
   * @param {Object} [config.routes] - Custom route handlers {path: handler}
   */
  constructor(config) {
    super();
    if (!config || !config.name || !config.port || !config.domain) {
      throw new Error('LiquidNodeBase requires name, port, and domain');
    }

    /** @type {string} */
    this.name = config.name;
    /** @type {number} */
    this.port = config.port;
    /** @type {string} */
    this.domain = config.domain;
    /** @type {string} */
    this.description = config.description || '';
    /** @type {string} */
    this.version = config.version || '4.0.0';
    /** @type {string[]} */
    this.dependencies = config.dependencies || [];
    /** @type {string} */
    this.pool = config.pool || 'warm';
    /** @type {Object} */
    this.customRoutes = config.routes || {};

    /** @type {Object} Logger instance */
    this.log = createLogger(this.name, this.domain, this.port);

    /** @type {RateLimiter} */
    this.rateLimiter = new RateLimiter();

    /** @type {Map<string, CircuitBreaker>} */
    this.breakers = new Map();

    /** @type {http.Server|null} */
    this.server = null;

    /** @type {number} */
    this.startTime = 0;

    /** @type {boolean} */
    this.ready = false;

    /** @type {boolean} */
    this.alive = true;

    /** @type {Object} Metrics counters */
    this.metrics = {
      requestsTotal: 0,
      requestsSuccess: 0,
      requestsError: 0,
      requestLatencySum: 0,
      activeConnections: 0,
      circuitBreakerTrips: 0,
      rateLimitRejects: 0,
    };

    /** @type {Map<string, Function>} Registered domain handlers */
    this._domainHandlers = new Map();

    /** @type {Function[]} Shutdown hooks — LIFO order */
    this._shutdownHooks = [];

    /** @type {Map<string, *>} Service state store */
    this.state = new Map();

    /** @type {string|null} Service mesh registry URL */
    this.registryUrl = process.env.SERVICE_REGISTRY_URL || null;

    /** @type {string|null} Event bus URL (NATS) */
    this.eventBusUrl = process.env.NATS_URL || null;

    /** @type {string} Node ID for this instance */
    this.nodeId = correlationId(this.name.replace('heady-', 'h'));
  }

  // ─── DOMAIN HANDLER REGISTRATION ────────────────────────────────────────

  /**
   * Register a domain-specific API handler.
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} path - URL path
   * @param {Function} handler - Async function(req, res, ctx)
   */
  route(method, path, handler) {
    const key = `${method.toUpperCase()}:${path}`;
    this._domainHandlers.set(key, handler);
  }

  /**
   * Register a shutdown hook. Hooks execute in LIFO order.
   * @param {string} label - Human-readable label
   * @param {Function} fn - Async cleanup function
   */
  onShutdown(label, fn) {
    this._shutdownHooks.push({ label, fn });
  }

  // ─── CIRCUIT BREAKER FACTORY ────────────────────────────────────────────

  /**
   * Get or create a circuit breaker for an upstream dependency.
   * @param {string} name - Dependency name
   * @returns {CircuitBreaker}
   */
  breaker(name) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ name }));
    }
    return this.breakers.get(name);
  }

  // ─── HTTP SERVICE CALL HELPER ───────────────────────────────────────────

  /**
   * Make an HTTP call to another service in the mesh with circuit breaking.
   * @param {string} serviceName - Target service name
   * @param {string} path - Request path
   * @param {Object} [options] - Request options
   * @param {string} [options.method='GET'] - HTTP method
   * @param {Object} [options.body] - Request body (JSON)
   * @param {Object} [options.headers] - Additional headers
   * @param {number} [options.timeout] - Timeout in ms (default PHI^3*1000)
   * @returns {Promise<Object>} Parsed JSON response
   */
  async callService(serviceName, path, options) {
    const opts = options || {};
    const method = opts.method || 'GET';
    const timeout = opts.timeout || Math.round(PHI * PHI * PHI * 1000);
    const cb = this.breaker(serviceName);

    return cb.execute(() => {
      return new Promise((resolve, reject) => {
        const serviceHost = process.env[`${serviceName.toUpperCase().replace(/-/g, '_')}_HOST`]
          || `${serviceName}.heady.internal`;
        const servicePort = process.env[`${serviceName.toUpperCase().replace(/-/g, '_')}_PORT`]
          || this.port;

        const reqOpts = {
          hostname: serviceHost,
          port: servicePort,
          path: path,
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId(this.name.replace('heady-', 'h')),
            'X-Source-Service': this.name,
            ...(opts.headers || {}),
          },
          timeout: timeout,
        };

        const req = http.request(reqOpts, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(parsed);
              } else {
                reject(new Error(`${serviceName} returned ${res.statusCode}: ${data}`));
              }
            } catch (e) {
              reject(new Error(`${serviceName} returned non-JSON: ${data.substring(0, 200)}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`${serviceName} request timeout after ${timeout}ms`));
        });

        if (opts.body) {
          req.write(JSON.stringify(opts.body));
        }
        req.end();
      });
    });
  }

  // ─── BUILT-IN ROUTES ──────────────────────────────────────────────────────

  /**
   * Health check response.
   * @param {http.ServerResponse} res
   */
  _handleHealth(res) {
    const uptime = (Date.now() - this.startTime) / 1000;
    const errorRate = this.metrics.requestsTotal > 0
      ? this.metrics.requestsError / this.metrics.requestsTotal
      : 0;

    const body = {
      status: this.alive ? 'healthy' : 'degraded',
      service: this.name,
      version: this.version,
      domain: this.domain,
      pool: this.pool,
      nodeId: this.nodeId,
      uptime: parseFloat(uptime.toFixed(fib(3))),
      coherence: parseFloat((1 - errorRate).toFixed(fib(6))),
      phi: PHI,
      timestamp: new Date().toISOString(),
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  /**
   * Readiness check — returns 200 only when service is fully ready.
   * @param {http.ServerResponse} res
   */
  _handleReady(res) {
    if (this.ready) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ready', service: this.name }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'not_ready', service: this.name }));
    }
  }

  /**
   * Liveness check — returns 200 if process is alive.
   * @param {http.ServerResponse} res
   */
  _handleLive(res) {
    res.writeHead(this.alive ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ alive: this.alive, service: this.name }));
  }

  /**
   * Prometheus-compatible metrics endpoint.
   * @param {http.ServerResponse} res
   */
  _handleMetrics(res) {
    const uptime = (Date.now() - this.startTime) / 1000;
    const breakers = {};
    for (const [name, cb] of this.breakers) {
      breakers[name] = cb.status();
    }

    const lines = [
      `# HELP heady_requests_total Total requests`,
      `# TYPE heady_requests_total counter`,
      `heady_requests_total{service="${this.name}",domain="${this.domain}"} ${this.metrics.requestsTotal}`,
      `# HELP heady_requests_success Successful requests`,
      `# TYPE heady_requests_success counter`,
      `heady_requests_success{service="${this.name}"} ${this.metrics.requestsSuccess}`,
      `# HELP heady_requests_error Error requests`,
      `# TYPE heady_requests_error counter`,
      `heady_requests_error{service="${this.name}"} ${this.metrics.requestsError}`,
      `# HELP heady_uptime_seconds Service uptime`,
      `# TYPE heady_uptime_seconds gauge`,
      `heady_uptime_seconds{service="${this.name}"} ${uptime.toFixed(3)}`,
      `# HELP heady_active_connections Active connections`,
      `# TYPE heady_active_connections gauge`,
      `heady_active_connections{service="${this.name}"} ${this.metrics.activeConnections}`,
      `# HELP heady_rate_limit_rejects Rate limit rejections`,
      `# TYPE heady_rate_limit_rejects counter`,
      `heady_rate_limit_rejects{service="${this.name}"} ${this.metrics.rateLimitRejects}`,
      `# HELP heady_circuit_breaker_trips Circuit breaker trips`,
      `# TYPE heady_circuit_breaker_trips counter`,
      `heady_circuit_breaker_trips{service="${this.name}"} ${this.metrics.circuitBreakerTrips}`,
    ];

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(lines.join('\n') + '\n');
  }

  /**
   * Service info endpoint.
   * @param {http.ServerResponse} res
   */
  _handleInfo(res) {
    const routes = [];
    for (const key of this._domainHandlers.keys()) {
      routes.push(key);
    }

    const body = {
      service: this.name,
      version: this.version,
      domain: this.domain,
      description: this.description,
      pool: this.pool,
      nodeId: this.nodeId,
      dependencies: this.dependencies,
      routes: [
        'GET:/health', 'GET:/healthz', 'GET:/ready', 'GET:/readyz',
        'GET:/livez', 'GET:/metrics', 'GET:/info',
        ...routes,
      ],
      phi: PHI,
      cslThresholds: CSL_THRESHOLDS,
      poolRatios: POOL_RATIOS,
      copyright: '© 2026 HeadySystems Inc. — Eric Haywood, Founder',
      patents: '51 Provisional Patents',
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body, null, 2));
  }

  // ─── REQUEST ROUTER ───────────────────────────────────────────────────────

  /**
   * Main request handler — routes to built-in or domain-specific handlers.
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   */
  async _handleRequest(req, res) {
    const start = Date.now();
    this.metrics.requestsTotal++;
    this.metrics.activeConnections++;

    // Inject correlation ID
    const corrId = req.headers['x-correlation-id'] || correlationId(this.name.replace('heady-', 'h'));
    req.correlationId = corrId;
    res.setHeader('X-Correlation-ID', corrId);
    res.setHeader('X-Service', this.name);
    res.setHeader('X-Node-ID', this.nodeId);

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // CORS — env-based whitelist, no wildcards
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean).map(o => o.trim());
    const origin = req.headers.origin || '';
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Correlation-ID');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      this.metrics.activeConnections--;
      return;
    }

    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const tier = req.headers['x-api-tier'] || 'public';
    const rlResult = this.rateLimiter.check(clientIp, tier);
    if (!rlResult.allowed) {
      this.metrics.rateLimitRejects++;
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(rlResult.retryAfter / 1000)) });
      res.end(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: rlResult.retryAfter, service: this.name }));
      this.metrics.activeConnections--;
      return;
    }

    const url = (req.url || '/').split('?')[0];
    const method = (req.method || 'GET').toUpperCase();

    try {
      // Built-in routes
      if (url === '/health' || url === '/healthz') { this._handleHealth(res); }
      else if (url === '/ready' || url === '/readyz') { this._handleReady(res); }
      else if (url === '/livez') { this._handleLive(res); }
      else if (url === '/metrics') { this._handleMetrics(res); }
      else if (url === '/info') { this._handleInfo(res); }
      else {
        // Domain-specific routes
        const routeKey = `${method}:${url}`;
        const handler = this._domainHandlers.get(routeKey);
        if (handler) {
          // Parse JSON body for POST/PUT
          let body = null;
          if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            body = await this._parseBody(req);
          }
          const ctx = {
            correlationId: corrId,
            clientIp,
            tier,
            method,
            path: url,
            query: this._parseQuery(req.url || ''),
            body,
            startTime: start,
          };
          await handler(req, res, ctx);
        } else if (url === '/' || url === '/api') {
          // Default root handler
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            service: this.name,
            version: this.version,
            domain: this.domain,
            description: this.description,
            status: 'operational',
            endpoints: Array.from(this._domainHandlers.keys()),
          }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found', path: url, service: this.name }));
        }
      }
      this.metrics.requestsSuccess++;
    } catch (err) {
      this.metrics.requestsError++;
      const statusCode = err.statusCode || 500;
      const errorCode = err.code || 'INTERNAL_ERROR';
      this.log.error(err.message, { correlationId: corrId, errorCode, statusCode, stack: err.stack });
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: err.message,
        code: errorCode,
        service: this.name,
        correlationId: corrId,
      }));
    } finally {
      this.metrics.activeConnections--;
      const duration = Date.now() - start;
      this.metrics.requestLatencySum += duration;
      this.log.debug('request', { correlationId: corrId, method, path: url, duration, status: res.statusCode });
    }
  }

  /**
   * Parse JSON body from request.
   * @param {http.IncomingMessage} req
   * @returns {Promise<Object|null>}
   */
  _parseBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      const maxSize = fib(16) * 1024; // 987KB
      req.on('data', (chunk) => {
        data += chunk;
        if (data.length > maxSize) {
          reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        }
      });
      req.on('end', () => {
        if (!data) { resolve(null); return; }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 })); }
      });
      req.on('error', reject);
    });
  }

  /**
   * Parse query string parameters.
   * @param {string} urlStr
   * @returns {Object}
   */
  _parseQuery(urlStr) {
    const idx = urlStr.indexOf('?');
    if (idx === -1) return {};
    const params = {};
    const pairs = urlStr.substring(idx + 1).split('&');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
    }
    return params;
  }

  // ─── LIFECYCLE ────────────────────────────────────────────────────────────

  /**
   * Initialize and start the service.
   * Subclasses should override onStart() instead of calling this directly.
   * @returns {Promise<void>}
   */
  async start() {
    this.startTime = Date.now();
    this.log.info(`${this.name} initializing`, { nodeId: this.nodeId, domain: this.domain, pool: this.pool });

    // Register custom routes from config
    for (const [path, handler] of Object.entries(this.customRoutes)) {
      const [method, route] = path.includes(':') ? path.split(':') : ['GET', path];
      this.route(method, route, handler);
    }

    // Lifecycle hook for subclass initialization
    await this.onStart();

    // Create HTTP server
    this.server = http.createServer((req, res) => this._handleRequest(req, res));

    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      this.log.info(`${signal} received, shutting down gracefully`, { nodeId: this.nodeId });
      this.alive = false;
      this.ready = false;

      // Execute shutdown hooks in LIFO order
      const hooks = [...this._shutdownHooks].reverse();
      for (const hook of hooks) {
        try {
          this.log.info(`Shutdown: ${hook.label}`);
          await hook.fn();
        } catch (err) {
          this.log.error(`Shutdown hook failed: ${hook.label}`, { error: err.message });
        }
      }

      await this.onStop();

      if (this.server) {
        this.server.close(() => {
          this.log.info(`${this.name} stopped`, { uptime: (Date.now() - this.startTime) / 1000 });
          process.exit(0);
        });
        // Force exit after phi-scaled timeout
        setTimeout(() => process.exit(1), Math.round(PHI * PHI * 1000));
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
      this.log.error('Uncaught exception', { error: err.message, stack: err.stack });
      shutdown('UNCAUGHT_EXCEPTION');
    });
    process.on('unhandledRejection', (reason) => {
      this.log.error('Unhandled rejection', { reason: String(reason) });
    });

    // Periodic rate limiter cleanup
    setInterval(() => this.rateLimiter.cleanup(), fib(10) * 1000);

    // Listen
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        this.ready = true;
        this.log.info(`${this.name} operational`, {
          port: this.port,
          domain: this.domain,
          pool: this.pool,
          nodeId: this.nodeId,
          routes: Array.from(this._domainHandlers.keys()).length,
          phi: PHI,
        });
        this.emit('ready', { port: this.port, nodeId: this.nodeId });
        resolve();
      });
    });
  }

  /**
   * Lifecycle hook for subclass initialization. Override this.
   * @returns {Promise<void>}
   */
  async onStart() { /* override in subclass */ }

  /**
   * Lifecycle hook for subclass cleanup. Override this.
   * @returns {Promise<void>}
   */
  async onStop() { /* override in subclass */ }

  // ─── UTILITY HELPERS ──────────────────────────────────────────────────────

  /**
   * Send a JSON response.
   * @param {http.ServerResponse} res
   * @param {number} statusCode
   * @param {Object} body
   */
  json(res, statusCode, body) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  /**
   * Send an error response.
   * @param {http.ServerResponse} res
   * @param {number} statusCode
   * @param {string} message
   * @param {string} [code]
   */
  sendError(res, statusCode, message, code) {
    this.json(res, statusCode, {
      error: message,
      code: code || 'ERROR',
      service: this.name,
    });
  }

  /**
   * CSL cosine similarity between two vectors.
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number}
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────

module.exports = {
  LiquidNodeBase,
  CircuitBreaker,
  RateLimiter,
  createLogger,
  correlationId,
  PHI,
  PSI,
  PSI2,
  PSI3,
  PSI4,
  FIB,
  fib,
  phiThreshold,
  phiBackoff,
  CSL_THRESHOLDS,
  POOL_RATIOS,
  CB_STATE,
};
