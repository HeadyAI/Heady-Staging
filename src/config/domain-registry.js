/**
 * ∞ Heady™ Domain Registry Config — Domain Configuration & Health Tracking
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

// ─────────────────────────────────────────────
// Domain Definitions
// ─────────────────────────────────────────────

/**
 * @typedef {object} DomainDefinition
 * @property {string}   domain          Primary domain name
 * @property {string[]} aliases         Alias hostnames
 * @property {string}   role            Domain role in the platform
 * @property {string}   description     Human-readable description
 * @property {string}   service         Backing service name
 * @property {string}   upstreamPort    Local port for upstream service
 * @property {string}   healthPath      Health check endpoint
 * @property {string}   ssl             SSL mode ('cloudflare' | 'none')
 * @property {string[]} features        Enabled feature flags
 * @property {object}   routing         Routing rules
 * @property {object}   tls             TLS/SSL config
 * @property {object}   rateLimit       Rate limiting config
 * @property {string[]} allowedMethods  Allowed HTTP methods
 * @property {object}   cors            CORS configuration
 * @property {object}   headers         Injected response headers
 */

/**
 * All Heady™ domain definitions — the authoritative domain registry.
 * All SSL/TLS termination is handled by Cloudflare (no localhost SSL).
 * @type {DomainDefinition[]}
 */
const DOMAIN_DEFINITIONS = [
  {
    domain:      'headyme.com',
    aliases:     ['www.headyme.com', 'app.headyme.com'],
    role:        'primary_app',
    description: 'HeadyMe flagship — AI-powered wellness and sovereign identity platform',
    service:     'headyme-app',
    upstreamPort: 3000,
    healthPath:  '/health',
    ssl:         'cloudflare',
    features:    ['auth', 'ai_chat', 'wellness_tracking', 'sovereign_profile', 'bees', 'mcp'],
    routing: {
      type:    'proxy',
      sticky:  false,
      timeout: PHI_TIMING.CYCLE,
    },
    tls: {
      mode:      'flexible',  // Cloudflare flexible (terminates at CF, HTTP to origin)
      minVersion: 'TLS 1.2',
      hsts:       true,
    },
    rateLimit: { windowMs: 60_000, max: 100, burstMax: 200 },
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    cors: {
      origins: ['https://headyme.com', 'https://headyapi.com'],
      credentials: true,
    },
    headers: {
      'X-Heady-Domain':  'headyme',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
    },
  },

  {
    domain:      'headysystems.com',
    aliases:     ['www.headysystems.com', 'admin.headysystems.com'],
    role:        'platform_root',
    description: 'HeadySystems™ corporate platform — admin hub and operator dashboard',
    service:     'headysystems-admin',
    upstreamPort: 3001,
    healthPath:  '/health',
    ssl:         'cloudflare',
    features:    ['admin_dashboard', 'billing', 'domain_management', 'zero_trust'],
    routing: {
      type:       'proxy',
      requireAuth: true,
      timeout:    PHI_TIMING.CYCLE,
    },
    tls: {
      mode:       'full_strict',
      minVersion: 'TLS 1.3',
      hsts:        true,
    },
    rateLimit: { windowMs: 60_000, max: 50, burstMax: 100 },
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    cors: {
      origins: ['https://headysystems.com'],
      credentials: true,
    },
    headers: {
      'X-Heady-Domain': 'headysystems',
      'X-Robots-Tag':   'noindex, nofollow',
    },
  },

  {
    domain:      'headymcp.com',
    aliases:     ['www.headymcp.com', 'mcp.headyme.com'],
    role:        'mcp_gateway',
    description: 'Model Context Protocol gateway — AI tool integrations and agent interfaces',
    service:     'mcp-server',
    upstreamPort: 3002,
    healthPath:  '/health',
    ssl:         'cloudflare',
    features:    ['mcp_tools', 'sse_streaming', 'session_management', 'tool_registry'],
    routing: {
      type:        'proxy',
      timeout:     120_000,  // longer for SSE connections
      keepAlive:   true,
    },
    tls: {
      mode:       'flexible',
      minVersion: 'TLS 1.2',
      hsts:        true,
    },
    rateLimit: { windowMs: 60_000, max: 200, burstMax: 400 },
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    cors: {
      origins:     ['*'],
      credentials: false,
    },
    headers: {
      'X-Heady-Domain':  'headymcp',
      'X-MCP-Version':   '2024-11-05',
      'Cache-Control':   'no-cache',
    },
  },

  {
    domain:      'headybuddy.org',
    aliases:     ['www.headybuddy.org', 'buddy.headyme.com'],
    role:        'companion_ai',
    description: 'HeadyBuddy — conversational AI companion and wellness guide',
    service:     'headybuddy-service',
    upstreamPort: 3003,
    healthPath:  '/health',
    ssl:         'cloudflare',
    features:    ['conversational_ai', 'wellness_companion', 'memory', 'personalization'],
    routing: { type: 'proxy', timeout: 60_000 },
    tls: { mode: 'flexible', minVersion: 'TLS 1.2', hsts: true },
    rateLimit: { windowMs: 60_000, max: 150, burstMax: 300 },
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    cors: { origins: ['https://headybuddy.org', 'https://headyme.com'], credentials: true },
    headers: { 'X-Heady-Domain': 'headybuddy' },
  },

  {
    domain:      'headyconnection.org',
    aliases:     ['www.headyconnection.org', 'connect.headyme.com'],
    role:        'community',
    description: 'HeadyConnection — community platform, networking, and collective intelligence',
    service:     'headyconnection-service',
    upstreamPort: 3004,
    healthPath:  '/health',
    ssl:         'cloudflare',
    features:    ['community_forums', 'networking', 'events', 'collective_ai'],
    routing: { type: 'proxy', timeout: PHI_TIMING.CYCLE },
    tls: { mode: 'flexible', minVersion: 'TLS 1.2', hsts: true },
    rateLimit: { windowMs: 60_000, max: 100, burstMax: 200 },
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    cors: { origins: ['https://headyconnection.org'], credentials: true },
    headers: { 'X-Heady-Domain': 'headyconnection' },
  },

  {
    domain:      'headyio.com',
    aliases:     ['www.headyio.com', 'io.headyme.com'],
    role:        'api_hub',
    description: 'HeadyIO — developer API hub, integration platform, and webhook gateway',
    service:     'headyio-api',
    upstreamPort: 3005,
    healthPath:  '/health',
    ssl:         'cloudflare',
    features:    ['rest_api', 'graphql', 'webhooks', 'developer_portal', 'sdk_docs'],
    routing: { type: 'proxy', timeout: PHI_TIMING.CYCLE },
    tls: { mode: 'flexible', minVersion: 'TLS 1.2', hsts: true },
    rateLimit: { windowMs: 60_000, max: 500, burstMax: 1000 },
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    cors: { origins: ['*'], credentials: false },
    headers: {
      'X-Heady-Domain':   'headyio',
      'X-API-Version':    'v4',
      'X-Content-Type-Options': 'nosniff',
    },
  },

  {
    domain:      'headybot.com',
    aliases:     ['www.headybot.com', 'bot.headyme.com'],
    role:        'bot_platform',
    description: 'HeadyBot — automation bots, workflow orchestration, and scheduled tasks',
    service:     'headybot-service',
    upstreamPort: 3006,
    healthPath:  '/health',
    ssl:         'cloudflare',
    features:    ['automation', 'scheduling', 'workflow_builder', 'integrations'],
    routing: { type: 'proxy', timeout: 120_000 },
    tls: { mode: 'flexible', minVersion: 'TLS 1.2', hsts: true },
    rateLimit: { windowMs: 60_000, max: 200, burstMax: 400 },
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    cors: { origins: ['https://headybot.com'], credentials: true },
    headers: { 'X-Heady-Domain': 'headybot' },
  },

  {
    domain:      'headyapi.com',
    aliases:     ['www.headyapi.com', 'api.headyme.com', 'v4.headyapi.com'],
    role:        'public_api',
    description: 'HeadyAPI — public REST/GraphQL API for third-party and external integrations',
    service:     'heady-public-api',
    upstreamPort: 3007,
    healthPath:  '/health',
    ssl:         'cloudflare',
    features:    ['public_api', 'graphql', 'rest', 'versioning', 'api_keys', 'webhooks'],
    routing: { type: 'proxy', timeout: PHI_TIMING.CYCLE },
    tls: { mode: 'flexible', minVersion: 'TLS 1.2', hsts: true },
    rateLimit: { windowMs: 60_000, max: 1000, burstMax: 2000 },
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    cors: { origins: ['*'], credentials: false },
    headers: {
      'X-Heady-Domain':   'headyapi',
      'Access-Control-Allow-Origin': 'null'  // HEADY: Use _isHeadyOrigin() for dynamic CORS,
      'X-API-Version':    'v4',
    },
  },

  {
    domain:      'heady-ai.com',
    aliases:     ['www.heady-ai.com', 'ai.headyme.com', 'inference.headyme.com'],
    role:        'ai_gateway',
    description: 'HeadyAI — inference gateway, model routing, embeddings, and AI capabilities',
    service:     'inference-gateway',
    upstreamPort: 3008,
    healthPath:  '/health',
    ssl:         'cloudflare',
    features:    ['inference', 'embeddings', 'model_routing', 'streaming', 'rag'],
    routing: {
      type:      'proxy',
      timeout:   90_000,  // AI responses can be slow
      keepAlive: true,
    },
    tls: { mode: 'flexible', minVersion: 'TLS 1.2', hsts: true },
    rateLimit: { windowMs: 60_000, max: 300, burstMax: 600 },
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    cors: { origins: ['https://headyme.com', 'https://headyapi.com'], credentials: true },
    headers: {
      'X-Heady-Domain':       'headyai',
      'X-Inference-Version':  'v4',
      'Cache-Control':        'no-store',
    },
  },
];

// ─────────────────────────────────────────────
// Domain Registry
// ─────────────────────────────────────────────

/**
 * @typedef {'healthy' | 'degraded' | 'unhealthy' | 'unknown'} DomainHealth
 */

/**
 * Domain Registry.
 *
 * Manages domain definitions, health status, and service mapping.
 * Single source of truth for all domain configuration in the platform.
 *
 * @extends EventEmitter
 */
class DomainRegistry extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, DomainDefinition>} */
    this._domains = new Map();

    /** @type {Map<string, DomainHealth>} */
    this._health  = new Map();

    /** @type {Map<string, string>} alias → canonical domain */
    this._aliases = new Map();

    // Load built-in definitions
    for (const def of DOMAIN_DEFINITIONS) this._add(def);
  }

  // ── Registration ──

  /**
   * Register a domain definition.
   * @param {DomainDefinition} def
   */
  register(def) {
    this._add(def);
    this.emit('domain_registered', def);
  }

  _add(def) {
    this._domains.set(def.domain, def);
    this._health.set(def.domain, 'unknown');
    this._aliases.set(def.domain, def.domain);
    for (const alias of def.aliases ?? []) {
      this._aliases.set(alias, def.domain);
    }
  }

  // ── Lookup ──

  /**
   * Get a domain definition by its canonical name or alias.
   * @param {string} domain
   * @returns {DomainDefinition|null}
   */
  get(domain) {
    const canonical = this._aliases.get(domain);
    if (!canonical) return null;
    return this._domains.get(canonical) ?? null;
  }

  /**
   * Resolve an alias to its canonical domain name.
   * @param {string} hostOrAlias
   * @returns {string|null}
   */
  resolve(hostOrAlias) {
    return this._aliases.get(hostOrAlias) ?? null;
  }

  /**
   * Get all domain definitions.
   * @returns {DomainDefinition[]}
   */
  all() { return [...this._domains.values()]; }

  /**
   * Get domains filtered by role.
   * @param {string} role
   * @returns {DomainDefinition[]}
   */
  byRole(role) {
    return this.all().filter(d => d.role === role);
  }

  /**
   * Get domains that have a specific feature enabled.
   * @param {string} feature
   * @returns {DomainDefinition[]}
   */
  byFeature(feature) {
    return this.all().filter(d => d.features?.includes(feature));
  }

  /**
   * Get the canonical domain for a service name.
   * @param {string} service
   * @returns {DomainDefinition|null}
   */
  byService(service) {
    return this.all().find(d => d.service === service) ?? null;
  }

  // ── Health ──

  /**
   * Update health status for a domain.
   * @param {string} domain
   * @param {DomainHealth} status
   */
  setHealth(domain, status) {
    const canonical = this._aliases.get(domain) ?? domain;
    const prev = this._health.get(canonical);
    this._health.set(canonical, status);
    if (prev !== status) {
      this.emit('health_changed', { domain: canonical, previous: prev, current: status });
    }
  }

  /**
   * Get health status for a domain.
   * @param {string} domain
   * @returns {DomainHealth}
   */
  getHealth(domain) {
    const canonical = this._aliases.get(domain) ?? domain;
    return this._health.get(canonical) ?? 'unknown';
  }

  /**
   * Get health snapshot for all domains.
   * @returns {Record<string, DomainHealth>}
   */
  healthSnapshot() {
    const snap = {};
    for (const [domain, status] of this._health) snap[domain] = status;
    return snap;
  }

  // ── Service Map ──

  /**
   * Build a map of service name → upstream URL for all domains.
   * @returns {Record<string, string>}
   */
  serviceMap() {
    const map = {};
    for (const def of this._domains.values()) {
      map[def.service] = `http://localhost:${def.upstreamPort}`;
    }
    return map;
  }

  /**
   * Build a routing table for the edge layer.
   * @returns {Array<{pattern: string, upstream: string, options: object}>}
   */
  routingTable() {
    return this.all().map(def => ({
      pattern:  def.domain,
      aliases:  def.aliases,
      upstream: `http://localhost:${def.upstreamPort}`,
      health:   this.getHealth(def.domain),
      options: {
        timeout:      def.routing?.timeout ?? PHI_TIMING.CYCLE,
        headers:      def.headers,
        rateLimit:    def.rateLimit,
        allowedMethods: def.allowedMethods,
      },
    }));
  }

  // ── Statistics ──

  /**
   * Registry statistics.
   * @returns {object}
   */
  stats() {
    const all      = this.all();
    const byHealth = { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 };
    for (const [, status] of this._health) byHealth[status] = (byHealth[status] ?? 0) + 1;
    return {
      total:    all.length,
      aliases:  this._aliases.size,
      byHealth,
      services: all.map(d => d.service),
    };
  }
}

// ─────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────

let _instance = null;

/**
 * Get the global DomainRegistry singleton.
 * @returns {DomainRegistry}
 */
function getDomainRegistry() {
  if (!_instance) _instance = new DomainRegistry();
  return _instance;
}

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

export {

  DomainRegistry,
  getDomainRegistry,
  DOMAIN_DEFINITIONS,
};
