/**
 * ∞ Heady™ Domain Router — Multi-Domain Request Routing
 * Part of Heady™Systems™ Sovereign AI Platform v4.0.0
 * © 2026 Heady™Systems Inc. — Proprietary
 */

'use strict';
// ─── HEADY CORS WHITELIST ────────────────────────────────────────────
const HEADY_ALLOWED_ORIGINS = new Set([
    'https://headyme.com', 'https://headysystems.com', 'https://headyconnection.org',
    'https://headyconnection.com', 'https://headybuddy.org', 'https://headymcp.com',
    'https://headyapi.com', 'https://headyio.com', 'https://headyos.com',
    'https://headyweb.com', 'https://headybot.com', 'https://headycloud.com',
    'https://headybee.co', 'https://heady-ai.com', 'https://headyex.com',
    'https://headyfinance.com', 'https://admin.headysystems.com',
    'https://auth.headysystems.com', 'https://api.headysystems.com',
]);
const _isHeadyOrigin = (o) => !o ? false : HEADY_ALLOWED_ORIGINS.has(o) || /\.run\.app$/.test(o) || (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1):/.test(o));


const { PHI_TIMING } = require('../shared/phi-math');
const EventEmitter = require('events');
const http         = require('http');
const https        = require('https');
const { URL }      = require('url');

// ─────────────────────────────────────────────
// Domain Registry
// ─────────────────────────────────────────────

/**
 * All Heady™ domains and their service configurations.
 * SSL termination is handled entirely by Cloudflare — no localhost SSL.
 *
 * @type {Record<string, DomainConfig>}
 */
const DOMAIN_REGISTRY = {
  'headyme.com': {
    domain:      'headyme.com',
    aliases:     ['www.headyme.com'],
    role:        'primary_app',
    description: 'HeadyMe flagship application — AI-powered wellness and sovereignty platform',
    service:     'headyme-app',
    upstream:    'http://localhost:3000',
    healthPath:  '/health',
    ssl:         'cloudflare',
    rateLimit:   { windowMs: 60_000, max: 100 },
    headers:     { 'X-Heady-Domain': 'headyme' },
  },
  'headysystems.com': {
    domain:      'headysystems.com',
    aliases:     ['www.headysystems.com'],
    role:        'platform_root',
    description: 'HeadySystems corporate platform and admin hub',
    service:     'headysystems-admin',
    upstream:    'http://localhost:3001',
    healthPath:  '/health',
    ssl:         'cloudflare',
    rateLimit:   { windowMs: 60_000, max: 50 },
    headers:     { 'X-Heady-Domain': 'headysystems' },
  },
  'headymcp.com': {
    domain:      'headymcp.com',
    aliases:     ['mcp.headyme.com'],
    role:        'mcp_gateway',
    description: 'Model Context Protocol gateway for AI tool integrations',
    service:     'mcp-server',
    upstream:    'http://localhost:3002',
    healthPath:  '/health',
    ssl:         'cloudflare',
    rateLimit:   { windowMs: 60_000, max: 200 },
    headers:     { 'X-Heady-Domain': 'headymcp', 'X-MCP-Version': '1.0' },
  },
  'headybuddy.org': {
    domain:      'headybuddy.org',
    aliases:     ['www.headybuddy.org'],
    role:        'companion_ai',
    description: 'HeadyBuddy conversational AI companion',
    service:     'headybuddy-service',
    upstream:    'http://localhost:3003',
    healthPath:  '/health',
    ssl:         'cloudflare',
    rateLimit:   { windowMs: 60_000, max: 150 },
    headers:     { 'X-Heady-Domain': 'headybuddy' },
  },
  'headyconnection.org': {
    domain:      'headyconnection.org',
    aliases:     ['www.headyconnection.org'],
    role:        'community',
    description: 'HeadyConnection community and networking platform',
    service:     'headyconnection-service',
    upstream:    'http://localhost:3004',
    healthPath:  '/health',
    ssl:         'cloudflare',
    rateLimit:   { windowMs: 60_000, max: 100 },
    headers:     { 'X-Heady-Domain': 'headyconnection' },
  },
  'headyio.com': {
    domain:      'headyio.com',
    aliases:     ['www.headyio.com', 'io.headyme.com'],
    role:        'api_hub',
    description: 'HeadyIO developer API hub and integration platform',
    service:     'headyio-api',
    upstream:    'http://localhost:3005',
    healthPath:  '/health',
    ssl:         'cloudflare',
    rateLimit:   { windowMs: 60_000, max: 500 },
    headers:     { 'X-Heady-Domain': 'headyio', 'X-API-Version': 'v4' },
  },
  'headybot.com': {
    domain:      'headybot.com',
    aliases:     ['www.headybot.com'],
    role:        'bot_platform',
    description: 'HeadyBot automation and workflow orchestration platform',
    service:     'headybot-service',
    upstream:    'http://localhost:3006',
    healthPath:  '/health',
    ssl:         'cloudflare',
    rateLimit:   { windowMs: 60_000, max: 200 },
    headers:     { 'X-Heady-Domain': 'headybot' },
  },
  'headyapi.com': {
    domain:      'headyapi.com',
    aliases:     ['api.headyme.com', 'www.headyapi.com'],
    role:        'public_api',
    description: 'Public REST/GraphQL API for external integrations',
    service:     'heady-public-api',
    upstream:    'http://localhost:3007',
    healthPath:  '/health',
    ssl:         'cloudflare',
    rateLimit:   { windowMs: 60_000, max: 1000 },
    headers:     { 'X-Heady-Domain': 'headyapi', 'Access-Control-Allow-Origin': 'null'  // HEADY: Use _isHeadyOrigin() for dynamic CORS },
  },
  'heady-ai.com': {
    domain:      'heady-ai.com',
    aliases:     ['www.heady-ai.com', 'ai.headyme.com'],
    role:        'ai_gateway',
    description: 'HeadyAI inference and model gateway',
    service:     'inference-gateway',
    upstream:    'http://localhost:3008',
    healthPath:  '/health',
    ssl:         'cloudflare',
    rateLimit:   { windowMs: 60_000, max: 300 },
    headers:     { 'X-Heady-Domain': 'headyai', 'X-Inference-Version': 'v4' },
  },
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/**
 * @typedef {object} DomainConfig
 * @property {string}   domain
 * @property {string[]} aliases
 * @property {string}   role
 * @property {string}   description
 * @property {string}   service
 * @property {string}   upstream       Internal upstream URL
 * @property {string}   healthPath
 * @property {string}   ssl            'cloudflare' | 'none'
 * @property {object}   rateLimit
 * @property {object}   headers        Injected response headers
 */

/**
 * @typedef {'healthy' | 'degraded' | 'unhealthy' | 'unknown'} HealthStatus
 */

// ─────────────────────────────────────────────
// Rate Limiter
// ─────────────────────────────────────────────

/**
 * Simple sliding-window rate limiter keyed by IP address.
 */
class RateLimiter {
  constructor() {
    /** @type {Map<string, {count: number, windowStart: number}>} */
    this._buckets = new Map();
  }

  /**
   * Check if a request from `ip` is within the rate limit for `domain`.
   * @param {string}       ip
   * @param {DomainConfig} domainConfig
   * @returns {{allowed: boolean, remaining: number, resetMs: number}}
   */
  check(ip, domainConfig) {
    const { windowMs, max } = domainConfig.rateLimit ?? { windowMs: 60_000, max: 100 };
    const key    = `${domainConfig.domain}:${ip}`;
    const now    = Date.now();
    let bucket   = this._buckets.get(key);

    if (!bucket || now - bucket.windowStart > windowMs) {
      bucket = { count: 0, windowStart: now };
    }

    bucket.count++;
    this._buckets.set(key, bucket);

    const remaining = Math.max(0, max - bucket.count);
    const resetMs   = windowMs - (now - bucket.windowStart);
    return {
      allowed:   bucket.count <= max,
      remaining,
      resetMs:   Math.max(0, resetMs),
    };
  }
}

// ─────────────────────────────────────────────
// Health Monitor
// ─────────────────────────────────────────────

/**
 * Polls upstream health endpoints and tracks backend health status.
 */
class HealthMonitor extends EventEmitter {
  /**
   * @param {object} [opts]
   * @param {number} [opts.intervalMs=PHI_TIMING.CYCLE]   Poll interval
   * @param {number} [opts.timeoutMs=5000]     Health check timeout
   */
  constructor(opts = {}) {
    super();
    this.intervalMs = opts.intervalMs ?? PHI_TIMING.CYCLE;
    this.timeoutMs  = opts.timeoutMs  ?? 5_000;

    /** @type {Map<string, {status: HealthStatus, lastCheckedAt: number, latencyMs: number}>} */
    this._status  = new Map();
    this._timer   = null;
  }

  /** Start periodic polling. */
  start(domains = DOMAIN_REGISTRY) {
    this._domains = domains;
    this._poll();
    this._timer = setInterval(() => this._poll(), this.intervalMs);
    this._timer.unref?.();
  }

  /** Stop polling. */
  stop() {
    if (this._timer) clearInterval(this._timer);
  }

  /**
   * @param {string} domain
   * @returns {HealthStatus}
   */
  statusFor(domain) {
    return this._status.get(domain)?.status ?? 'unknown';
  }

  /**
   * @returns {boolean} True if domain is healthy or unknown (give benefit of doubt)
   */
  isHealthy(domain) {
    const s = this.statusFor(domain);
    return s === 'healthy' || s === 'unknown';
  }

  async _poll() {
    const domains = this._domains ?? DOMAIN_REGISTRY;
    for (const [domain, config] of Object.entries(domains)) {
      this._checkOne(domain, config).catch(() => {});
    }
  }

  async _checkOne(domain, config) {
    const url   = `${config.upstream}${config.healthPath}`;
    const start = Date.now();
    let status  = 'unhealthy';
    try {
      const res = await this._httpGet(url, this.timeoutMs);
      status    = res.statusCode >= 200 && res.statusCode < 400 ? 'healthy' : 'degraded';
    } catch { /* unhealthy */ }

    const prev = this._status.get(domain)?.status;
    const curr = { status, lastCheckedAt: Date.now(), latencyMs: Date.now() - start };
    this._status.set(domain, curr);

    if (prev && prev !== status) {
      this.emit('status_change', { domain, previous: prev, current: status });
    }
  }

  _httpGet(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const parsed  = new URL(url);
      const lib     = parsed.protocol === 'https:' ? https : http;
      const req     = lib.get(url, { timeout: timeoutMs }, resolve);
      req.on('error',   reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  /** Full health snapshot. */
  snapshot() {
    const snap = {};
    for (const [domain, s] of this._status) snap[domain] = s;
    return snap;
  }
}

// ─────────────────────────────────────────────
// Domain Router
// ─────────────────────────────────────────────

/**
 * @typedef {object} DomainRouterConfig
 * @property {Record<string, DomainConfig>} [domains]   Override default registry
 * @property {boolean} [enableRateLimit=true]
 * @property {boolean} [enableHealthChecks=true]
 * @property {number}  [healthIntervalMs]
 * @property {number}  [healthTimeoutMs]
 * @property {boolean} [stripHopByHopHeaders=true]
 */

/** Headers that should not be forwarded upstream */
const HOP_BY_HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade',
]);

/**
 * Multi-domain HTTP request router.
 *
 * Routes incoming Node.js http.IncomingMessage requests to the correct
 * upstream service based on the Host header, with:
 * - Rate limiting per IP per domain
 * - Health-aware routing (skip unhealthy backends)
 * - Header injection
 * - Upstream reverse-proxy via built-in http module
 *
 * Intended to run behind Cloudflare (SSL/TLS termination is external).
 *
 * @extends EventEmitter
 *
 * @example
 * const router = new DomainRouter();
 * router.startHealthChecks();
 * const server = http.createServer((req, res) => router.handle(req, res));
 * server.listen(8080);
 */
class DomainRouter extends EventEmitter {
  /**
   * @param {DomainRouterConfig} [config]
   */
  constructor(config = {}) {
    super();
    this.config       = config;
    this.domains      = { ...DOMAIN_REGISTRY, ...(config.domains ?? {}) };
    this.rateLimiter  = config.enableRateLimit !== false ? new RateLimiter() : null;
    this.healthMon    = config.enableHealthChecks !== false
      ? new HealthMonitor({
          intervalMs: config.healthIntervalMs,
          timeoutMs:  config.healthTimeoutMs,
        })
      : null;

    /** Build a fast alias → canonical domain map */
    this._aliasMap = this._buildAliasMap();

    if (this.healthMon) {
      this.healthMon.on('status_change', e => this.emit('health_change', e));
    }
  }

  /** Start health monitoring polls. */
  startHealthChecks() {
    this.healthMon?.start(this.domains);
  }

  /** Stop health monitoring. */
  stopHealthChecks() {
    this.healthMon?.stop();
  }

  // ── Request Handling ──

  /**
   * Handle an incoming HTTP request — resolve domain, apply rate limit, proxy upstream.
   * Call this from an http.createServer callback.
   *
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse}  res
   */
  async handle(req, res) {
    const host = this._extractHost(req);

    // ─ Domain resolution ─
    const domainConfig = this._resolve(host);
    if (!domainConfig) {
      this._sendError(res, 404, `No route for host: ${host}`);
      return;
    }

    // ─ Health gate ─
    if (this.healthMon && !this.healthMon.isHealthy(domainConfig.domain)) {
      this._sendError(res, 503, `Service "${domainConfig.service}" is currently unavailable`);
      this.emit('upstream_unavailable', { domain: domainConfig.domain });
      return;
    }

    // ─ Rate limit ─
    if (this.rateLimiter) {
      const ip     = this._clientIp(req);
      const result = this.rateLimiter.check(ip, domainConfig);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset',     Math.ceil(result.resetMs / 1000));
      if (!result.allowed) {
        this._sendError(res, 429, 'Rate limit exceeded');
        this.emit('rate_limited', { domain: domainConfig.domain, ip });
        return;
      }
    }

    // ─ Proxy ─
    try {
      await this._proxy(req, res, domainConfig);
      this.emit('request_routed', {
        host,
        domain:  domainConfig.domain,
        service: domainConfig.service,
        method:  req.method,
        path:    req.url,
      });
    } catch (err) {
      this._sendError(res, 502, `Upstream error: ${err.message}`);
      this.emit('proxy_error', { domain: domainConfig.domain, err });
    }
  }

  // ── Registration ──

  /**
   * Register a new domain or update an existing one at runtime.
   * @param {DomainConfig} domainConfig
   */
  register(domainConfig) {
    this.domains[domainConfig.domain] = domainConfig;
    for (const alias of domainConfig.aliases ?? []) {
      this._aliasMap.set(alias, domainConfig.domain);
    }
    this._aliasMap.set(domainConfig.domain, domainConfig.domain);
    this.emit('domain_registered', domainConfig);
  }

  /**
   * Deregister a domain.
   * @param {string} domain
   */
  deregister(domain) {
    const config = this.domains[domain];
    if (!config) return;
    delete this.domains[domain];
    this._aliasMap.delete(domain);
    for (const alias of config.aliases ?? []) this._aliasMap.delete(alias);
    this.emit('domain_deregistered', { domain });
  }

  // ── Introspection ──

  /**
   * Full router status snapshot.
   * @returns {object}
   */
  status() {
    return {
      domains:   Object.keys(this.domains),
      health:    this.healthMon?.snapshot() ?? {},
    };
  }

  /**
   * Resolve a hostname to its DomainConfig.
   * @param {string} host
   * @returns {DomainConfig|null}
   */
  _resolve(host) {
    const canonical = this._aliasMap.get(host) ?? this._aliasMap.get(host.split(':')[0]);
    if (!canonical) return null;
    return this.domains[canonical] ?? null;
  }

  // ── Proxy ──

  async _proxy(req, res, domainConfig) {
    const upstreamUrl = new URL(domainConfig.upstream);
    const options     = {
      hostname: upstreamUrl.hostname,
      port:     upstreamUrl.port || (upstreamUrl.protocol === 'https:' ? 443 : 80),
      path:     req.url,
      method:   req.method,
      headers:  this._buildUpstreamHeaders(req, domainConfig),
    };

    await new Promise((resolve, reject) => {
      const lib = upstreamUrl.protocol === 'https:' ? https : http;
      const upReq = lib.request(options, (upRes) => {
        // Inject domain headers into response
        for (const [key, val] of Object.entries(domainConfig.headers ?? {})) {
          res.setHeader(key, val);
        }
        res.writeHead(upRes.statusCode, upRes.headers);
        upRes.pipe(res, { end: true });
        upRes.on('end', resolve);
      });
      upReq.on('error', reject);
      upReq.setTimeout(PHI_TIMING.CYCLE, () => { upReq.destroy(); reject(new Error('upstream timeout')); });
      req.pipe(upReq, { end: true });
    });
  }

  _buildUpstreamHeaders(req, domainConfig) {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP_HEADERS.has(k.toLowerCase())) headers[k] = v;
    }
    headers['x-forwarded-for']   = this._clientIp(req);
    headers['x-forwarded-host']  = req.headers['host'] ?? '';
    headers['x-forwarded-proto'] = 'https'; // Cloudflare always sends HTTPS
    headers['x-heady-service']   = domainConfig.service;
    return headers;
  }

  _extractHost(req) {
    const raw = req.headers['host'] ?? '';
    return raw.split(':')[0].toLowerCase();
  }

  _clientIp(req) {
    return (
      req.headers['cf-connecting-ip'] ??   // Cloudflare real IP
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      '0.0.0.0'
    );
  }

  _buildAliasMap() {
    const map = new Map();
    for (const [canonical, config] of Object.entries(this.domains)) {
      map.set(canonical, canonical);
      for (const alias of config.aliases ?? []) map.set(alias, canonical);
    }
    return map;
  }

  _sendError(res, statusCode, message) {
    if (!res.headersSent) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message, statusCode }));
    }
  }
}

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

export {

  DomainRouter,
  HealthMonitor,
  RateLimiter,
  DOMAIN_REGISTRY,
};
