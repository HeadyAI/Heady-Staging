/**
 * @fileoverview ServiceMesh — Inter-service discovery, routing, and event bus
 * for the Heady liquid node architecture. All 60 services register here
 * for CSL-gated routing, health aggregation, and NATS-compatible event passing.
 *
 * @module shared/service-mesh
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

const PHI = (1 + Math.sqrt(5)) / 2;
const PSI = 1 / PHI;
const FIB = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597];

/** @param {number} n @returns {number} */
function fib(n) { return FIB[n - 1] || 0; }

/** @param {number} level @returns {number} */
function phiThreshold(level) { return 1 - Math.pow(PSI, level) * 0.5; }

// ─── SERVICE REGISTRY ───────────────────────────────────────────────────────

/**
 * Complete Heady service catalog — all 60 services with ports, domains, and pool assignments.
 * @type {Object<string, {port: number, domain: string, pool: string, description: string}>}
 */
const SERVICE_CATALOG = Object.freeze({
  'heady-brain':             { port: 3310, domain: 'inference',      pool: 'hot',  description: 'Single-model LLM inference endpoint' },
  'heady-brains':            { port: 3311, domain: 'inference',      pool: 'hot',  description: 'Multi-model reasoning orchestrator' },
  'heady-infer':             { port: 3312, domain: 'inference',      pool: 'hot',  description: 'Unified inference gateway' },
  'ai-router':               { port: 3313, domain: 'inference',      pool: 'hot',  description: 'CSL-gated AI provider routing' },
  'model-gateway':           { port: 3314, domain: 'inference',      pool: 'hot',  description: 'Multi-provider model gateway with racing' },
  'heady-embed':             { port: 3315, domain: 'memory',         pool: 'hot',  description: '384D embedding generation via Nomic/Jina/Cohere' },
  'heady-memory':            { port: 3316, domain: 'memory',         pool: 'hot',  description: 'Vector memory CRUD with pgvector' },
  'heady-vector':            { port: 3317, domain: 'memory',         pool: 'hot',  description: 'Vector space operations and HNSW search' },
  'heady-projection':        { port: 3318, domain: 'memory',         pool: 'warm', description: '3D projection engine (PCA/t-SNE/UMAP)' },
  'heady-bee-factory':       { port: 3319, domain: 'agents',         pool: 'hot',  description: 'Dynamic bee worker spawning factory' },
  'heady-hive':              { port: 3320, domain: 'agents',         pool: 'hot',  description: 'Bee swarm coordination and consensus' },
  'heady-federation':        { port: 3321, domain: 'agents',         pool: 'warm', description: 'Cross-node vector federation' },
  'heady-soul':              { port: 3322, domain: 'governance',     pool: 'hot',  description: 'Awareness layer, values arbiter, coherence guardian' },
  'heady-conductor':         { port: 3323, domain: 'orchestration',  pool: 'hot',  description: 'Central task routing and dispatch across 17 swarms' },
  'heady-orchestration':     { port: 3324, domain: 'orchestration',  pool: 'hot',  description: 'Multi-agent workflow orchestration' },
  'auto-success-engine':     { port: 3325, domain: 'orchestration',  pool: 'hot',  description: 'φ⁷-derived auto-success cycle engine' },
  'hcfullpipeline-executor': { port: 3326, domain: 'orchestration',  pool: 'hot',  description: '21-stage HCFullPipeline executor' },
  'heady-chain':             { port: 3327, domain: 'orchestration',  pool: 'warm', description: 'Sequential chain execution' },
  'prompt-manager':          { port: 3328, domain: 'orchestration',  pool: 'warm', description: 'Prompt template registry and versioning' },
  'heady-guard':             { port: 3329, domain: 'security',       pool: 'hot',  description: 'Input validation and model armor' },
  'heady-security':          { port: 3330, domain: 'security',       pool: 'hot',  description: 'Auth middleware and session management' },
  'heady-governance':        { port: 3331, domain: 'governance',     pool: 'warm', description: 'Policy enforcement and compliance gates' },
  'secret-gateway':          { port: 3332, domain: 'security',       pool: 'warm', description: 'Secret management and vault integration' },
  'heady-health':            { port: 3333, domain: 'observability',  pool: 'warm', description: 'Aggregated health monitoring' },
  'heady-eval':              { port: 3334, domain: 'observability',  pool: 'cold', description: 'Response quality evaluation' },
  'heady-maintenance':       { port: 3335, domain: 'operations',     pool: 'cold', description: 'Self-healing maintenance cycles' },
  'heady-testing':           { port: 3336, domain: 'observability',  pool: 'cold', description: 'Automated test execution' },
  'heady-ui':                { port: 3337, domain: 'interface',      pool: 'hot',  description: 'Dashboard UI server' },
  'heady-web':               { port: 3338, domain: 'interface',      pool: 'hot',  description: 'Web application server' },
  'heady-task-browser':      { port: 3339, domain: 'interface',      pool: 'warm', description: 'Task visualization browser' },
  'heady-vinci':             { port: 3340, domain: 'orchestration',  pool: 'hot',  description: 'Session planner and topology maintainer' },
  'heady-buddy':             { port: 3341, domain: 'interface',      pool: 'hot',  description: 'AI companion conversation interface' },
  'heady-autobiographer':    { port: 3342, domain: 'observability',  pool: 'cold', description: 'Event narrative and system autobiography' },
  'heady-cache':             { port: 3343, domain: 'memory',         pool: 'hot',  description: 'LRU + hot/cold cache layer' },
  'heady-onboarding':        { port: 3344, domain: 'interface',      pool: 'warm', description: 'New user onboarding flow' },
  'heady-pilot-onboarding':  { port: 3345, domain: 'interface',      pool: 'warm', description: 'Pilot program onboarding' },
  'notification-service':    { port: 3346, domain: 'interface',      pool: 'warm', description: 'Push and in-app notifications' },
  'search-service':          { port: 3347, domain: 'memory',         pool: 'hot',  description: 'Hybrid BM25+dense vector search' },
  'billing-service':         { port: 3348, domain: 'fintech',        pool: 'warm', description: 'Subscription and usage-based billing' },
  'budget-tracker':          { port: 3349, domain: 'fintech',        pool: 'warm', description: 'Token and cost budget tracking' },
  'analytics-service':       { port: 3350, domain: 'observability',  pool: 'cold', description: 'DuckDB-based analytics engine' },
  'cli-service':             { port: 3351, domain: 'interface',      pool: 'warm', description: 'HeadyCLI backend' },
  'colab-gateway':           { port: 3352, domain: 'compute',        pool: 'hot',  description: 'Colab Pro+ 3-runtime GPU cluster gateway' },
  'discord-bot':             { port: 3353, domain: 'interface',      pool: 'warm', description: 'Discord community bot' },
  'domain-router':           { port: 3354, domain: 'orchestration',  pool: 'hot',  description: 'CSL domain classification router' },
  'feature-flag-service':    { port: 3355, domain: 'operations',     pool: 'warm', description: 'Fibonacci-stepped feature rollout' },
  'google-mcp':              { port: 3356, domain: 'integration',    pool: 'warm', description: 'Google Workspace MCP bridge' },
  'huggingface-gateway':     { port: 3357, domain: 'compute',        pool: 'warm', description: 'Hugging Face model gateway' },
  'jules-mcp':               { port: 3358, domain: 'integration',    pool: 'warm', description: 'Jules (Google) MCP integration' },
  'mcp-server':              { port: 3359, domain: 'integration',    pool: 'hot',  description: 'Core MCP server with JSON-RPC and SSE' },
  'memory-mcp':              { port: 3360, domain: 'integration',    pool: 'warm', description: 'MCP-exposed memory operations' },
  'migration-service':       { port: 3361, domain: 'operations',     pool: 'cold', description: 'Database migration runner' },
  'perplexity-mcp':          { port: 3362, domain: 'integration',    pool: 'warm', description: 'Perplexity Sonar MCP bridge' },
  'saga-coordinator':        { port: 3363, domain: 'orchestration',  pool: 'warm', description: 'Distributed transaction saga coordination' },
  'scheduler-service':       { port: 3364, domain: 'operations',     pool: 'warm', description: 'Cron and delayed task scheduling' },
  'silicon-bridge':          { port: 3365, domain: 'compute',        pool: 'warm', description: 'Hardware accelerator bridge' },
  'api-gateway':             { port: 3366, domain: 'interface',      pool: 'hot',  description: 'Primary API gateway for all external traffic' },
  'asset-pipeline':          { port: 3367, domain: 'operations',     pool: 'cold', description: 'Static asset processing pipeline' },
  'auth-session-server':     { port: 3368, domain: 'security',       pool: 'hot',  description: 'httpOnly cookie session server' },
  'heady-midi':              { port: 3369, domain: 'creative',       pool: 'cold', description: 'MIDI event processing and music generation' },
});

/**
 * Domain-to-swarm mapping for CSL routing.
 * @type {Object<string, string>}
 */
const DOMAIN_SWARMS = Object.freeze({
  inference:     'InferenceSwarm',
  memory:        'MemorySwarm',
  agents:        'AgentSwarm',
  orchestration: 'OrchestrationSwarm',
  security:      'SecuritySwarm',
  governance:    'GovernanceSwarm',
  observability: 'ObservabilitySwarm',
  operations:    'OperationsSwarm',
  interface:     'InterfaceSwarm',
  compute:       'ComputeSwarm',
  integration:   'IntegrationSwarm',
  fintech:       'FintechSwarm',
  creative:      'CreativeSwarm',
});

// ─── SERVICE DISCOVERY ──────────────────────────────────────────────────────

/**
 * ServiceDiscovery — in-process service registry for environment-based discovery.
 * In production, this reads from environment variables; in development, from the catalog.
 * @class
 */
class ServiceDiscovery {
  constructor() {
    /** @type {Map<string, {host: string, port: number, healthy: boolean, lastCheck: number}>} */
    this.registry = new Map();
    this._initFromCatalog();
  }

  /**
   * Initialize registry from SERVICE_CATALOG and environment.
   * @private
   */
  _initFromCatalog() {
    for (const [name, info] of Object.entries(SERVICE_CATALOG)) {
      const envKey = name.toUpperCase().replace(/-/g, '_');
      const host = process.env[`${envKey}_HOST`] || `${name}.heady.internal`;
      const port = parseInt(process.env[`${envKey}_PORT`] || String(info.port), 10);
      this.registry.set(name, {
        host,
        port,
        healthy: true,
        lastCheck: Date.now(),
      });
    }
  }

  /**
   * Resolve a service to host:port.
   * @param {string} serviceName
   * @returns {{host: string, port: number}|null}
   */
  resolve(serviceName) {
    const entry = this.registry.get(serviceName);
    if (!entry || !entry.healthy) return null;
    return { host: entry.host, port: entry.port };
  }

  /**
   * Get all services in a domain.
   * @param {string} domain
   * @returns {string[]} Service names
   */
  byDomain(domain) {
    return Object.entries(SERVICE_CATALOG)
      .filter(([, info]) => info.domain === domain)
      .map(([name]) => name);
  }

  /**
   * Get all services in a pool.
   * @param {string} pool
   * @returns {string[]} Service names
   */
  byPool(pool) {
    return Object.entries(SERVICE_CATALOG)
      .filter(([, info]) => info.pool === pool)
      .map(([name]) => name);
  }

  /**
   * Mark a service as unhealthy.
   * @param {string} serviceName
   */
  markUnhealthy(serviceName) {
    const entry = this.registry.get(serviceName);
    if (entry) { entry.healthy = false; entry.lastCheck = Date.now(); }
  }

  /**
   * Mark a service as healthy.
   * @param {string} serviceName
   */
  markHealthy(serviceName) {
    const entry = this.registry.get(serviceName);
    if (entry) { entry.healthy = true; entry.lastCheck = Date.now(); }
  }

  /**
   * Get full catalog info for a service.
   * @param {string} serviceName
   * @returns {Object|null}
   */
  info(serviceName) {
    return SERVICE_CATALOG[serviceName] || null;
  }
}

// ─── EVENT BUS (In-Process + NATS-Compatible) ───────────────────────────────

/**
 * EventBus — in-process pub/sub with NATS subject convention.
 * Subject format: heady.{domain}.{service}.{action}
 *
 * In production, replace with NATS client. This in-process implementation
 * provides the same interface for local development and testing.
 *
 * @class
 * @extends EventEmitter
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(fib(10)); // 55
    /** @type {Map<string, Function[]>} */
    this.subscriptions = new Map();
    /** @type {Array<{subject: string, data: *, timestamp: number}>} */
    this.history = [];
    /** @type {number} Max history entries */
    this.maxHistory = fib(16); // 987
  }

  /**
   * Publish an event to a subject.
   * @param {string} subject - NATS-style subject (e.g. 'heady.memory.store')
   * @param {*} data - Event payload
   * @param {Object} [meta] - Event metadata
   */
  publish(subject, data, meta) {
    const event = {
      subject,
      data,
      meta: meta || {},
      timestamp: Date.now(),
      id: crypto.randomBytes(fib(6)).toString('hex'),
    };

    this.history.push({ subject, data, timestamp: event.timestamp });
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }

    this.emit(subject, event);

    // Wildcard matching: heady.memory.* matches heady.memory.store
    const parts = subject.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const wildcard = parts.slice(0, i).join('.') + '.*';
      this.emit(wildcard, event);
    }
  }

  /**
   * Subscribe to a subject pattern.
   * @param {string} subject - Subject or wildcard pattern
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  subscribe(subject, handler) {
    this.on(subject, handler);
    if (!this.subscriptions.has(subject)) {
      this.subscriptions.set(subject, []);
    }
    this.subscriptions.get(subject).push(handler);
    return () => {
      this.removeListener(subject, handler);
      const subs = this.subscriptions.get(subject);
      if (subs) {
        const idx = subs.indexOf(handler);
        if (idx >= 0) subs.splice(idx, 1);
      }
    };
  }

  /**
   * Request-reply pattern: publish and wait for first response.
   * @param {string} subject
   * @param {*} data
   * @param {number} [timeoutMs] - Timeout in ms (default PHI^3*1000)
   * @returns {Promise<*>}
   */
  request(subject, data, timeoutMs) {
    const timeout = timeoutMs || Math.round(PHI * PHI * PHI * 1000);
    const replySubject = `${subject}.reply.${crypto.randomBytes(fib(5)).toString('hex')}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeAllListeners(replySubject);
        reject(new Error(`Request timeout on ${subject} after ${timeout}ms`));
      }, timeout);

      this.once(replySubject, (event) => {
        clearTimeout(timer);
        resolve(event.data);
      });

      this.publish(subject, { ...data, replyTo: replySubject });
    });
  }

  /**
   * Get recent events for a subject.
   * @param {string} subject
   * @param {number} [limit]
   * @returns {Array}
   */
  recent(subject, limit) {
    const max = limit || fib(8); // 21
    return this.history
      .filter(e => e.subject === subject || e.subject.startsWith(subject.replace('*', '')))
      .slice(-max);
  }
}

// ─── CSL ROUTER ─────────────────────────────────────────────────────────────

/**
 * CSL-gated task router — routes tasks to services based on
 * cosine similarity between task embedding and domain embeddings.
 *
 * @class
 */
class CSLRouter {
  constructor() {
    /** @type {Map<string, number[]>} Domain embedding cache */
    this.domainEmbeddings = new Map();
    /** @type {number} Dimension of embeddings */
    this.dimension = fib(14) + fib(6); // 377 + 8 = 385 ≈ 384
  }

  /**
   * Generate a simple deterministic embedding for a domain string.
   * In production, use heady-embed service for real 384D embeddings.
   * @param {string} text
   * @returns {number[]}
   */
  deterministicEmbed(text) {
    const dim = 384;
    const vec = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = (text.charCodeAt(i) * fib(7) + i * fib(5)) % dim;
      vec[idx] += Math.sin(text.charCodeAt(i) * PSI + i * PHI) * PSI;
    }
    // Normalize
    let mag = 0;
    for (let i = 0; i < dim; i++) mag += vec[i] * vec[i];
    mag = Math.sqrt(mag);
    if (mag > 0) for (let i = 0; i < dim; i++) vec[i] /= mag;
    return vec;
  }

  /**
   * Cosine similarity between two vectors.
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number}
   */
  cosine(a, b) {
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

  /**
   * Route a task description to the best matching services.
   * @param {string} taskDescription - Natural language task description
   * @param {number} [topK] - Number of results (default fib(3)=2)
   * @returns {Array<{service: string, domain: string, score: number, pool: string}>}
   */
  route(taskDescription, topK) {
    const k = topK || fib(3);
    const taskEmbed = this.deterministicEmbed(taskDescription);

    const scores = [];
    for (const [name, info] of Object.entries(SERVICE_CATALOG)) {
      const serviceText = `${name} ${info.domain} ${info.description}`;
      let embed = this.domainEmbeddings.get(name);
      if (!embed) {
        embed = this.deterministicEmbed(serviceText);
        this.domainEmbeddings.set(name, embed);
      }
      const score = this.cosine(taskEmbed, embed);
      if (score >= phiThreshold(0)) { // Above MINIMUM threshold
        scores.push({ service: name, domain: info.domain, score, pool: info.pool });
      }
    }

    // Sort by score descending, take topK
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k);
  }

  /**
   * Route to a specific domain's services.
   * @param {string} domain
   * @returns {string[]} Service names in that domain
   */
  routeDomain(domain) {
    return Object.entries(SERVICE_CATALOG)
      .filter(([, info]) => info.domain === domain)
      .map(([name]) => name);
  }
}

// ─── SERVICE MESH ───────────────────────────────────────────────────────────

/**
 * ServiceMesh — the complete inter-service coordination layer.
 * Combines discovery, event bus, and CSL routing into a single interface.
 *
 * @class
 */
class ServiceMesh {
  constructor() {
    /** @type {ServiceDiscovery} */
    this.discovery = new ServiceDiscovery();
    /** @type {EventBus} */
    this.events = new EventBus();
    /** @type {CSLRouter} */
    this.router = new CSLRouter();
  }

  /**
   * Get the singleton mesh instance.
   * @returns {ServiceMesh}
   */
  static instance() {
    if (!ServiceMesh._instance) {
      ServiceMesh._instance = new ServiceMesh();
    }
    return ServiceMesh._instance;
  }
}

/** @type {ServiceMesh|null} */
ServiceMesh._instance = null;

// ─── EXPORTS ────────────────────────────────────────────────────────────────

module.exports = {
  SERVICE_CATALOG,
  DOMAIN_SWARMS,
  ServiceDiscovery,
  EventBus,
  CSLRouter,
  ServiceMesh,
  PHI,
  PSI,
  FIB,
  fib,
  phiThreshold,
};
