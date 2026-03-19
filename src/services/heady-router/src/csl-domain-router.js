/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  heady-router — csl-domain-router.js                             ║
 * ║  CSL Domain Router: geometric matching, NO priority routing      ║
 * ║  © 2026 HeadySystems Inc. — 60+ Provisional Patents             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * ARCHITECTURE DECISION: Priority-Based Routing Removed
 * ═══════════════════════════════════════════════════════
 * Traditional priority-based routing (integer weights, ordered queues,
 * round-robin with priority bands) has been EXPLICITLY REMOVED from the
 * Heady platform in favor of CSL (Continuous Semantic Logic) domain matching.
 *
 * WHY:
 *   Priority numbers are arbitrary, domain-unaware, and brittle.
 *   CSL routing uses cosine similarity between request embeddings and
 *   domain centroids to route with geometric precision. A request about
 *   "AI companion memory" routes to headybuddy.org not because someone
 *   hard-coded a priority of 7, but because the cosine similarity to
 *   HeadyBuddy's semantic centroid exceeds the golden-ratio gate (ψ=0.618).
 *
 * HOW IT WORKS:
 *   1. Request arrives with a query/intent
 *   2. Intent is embedded into a 384-dim vector
 *   3. Cosine similarity is computed against all domain centroids
 *   4. Domain with highest similarity above ψ threshold is selected
 *   5. Multi-domain requests (similarity >= ψ in multiple domains) are
 *      routed to all matching domains in parallel (CSL multi-label)
 *
 * DEPRECATION REGISTRY:
 *   - router.setPriority(domain, n)  → REMOVED
 *   - router.addPriorityBand(n, [...domains]) → REMOVED
 *   - router.sortByPriority() → REMOVED
 *   Use: router.cslMatch(embedding) and router.cslMultiMatch(embedding) instead
 */

'use strict';

import {
  PHI, PSI, PSI2, CSL_THRESHOLDS, TIMEOUTS,
  cslAND, cslDomainMatch, cslMultiDomainAssign, cslSelectDomain,
  normalize, phiFusion,
  createLogger, logConfidenceEvent,
} from '@heady/platform';

// ─── DOMAIN REGISTRY ─────────────────────────────────────────────────────────

/**
 * Nine canonical Heady domains with their semantic centroids.
 *
 * Centroids are unit vectors in R^384 (or R^1536 for high-fidelity routing).
 * In production, these are loaded from the vector memory service via the
 * heady-embeddings endpoint and refreshed on a phi⁷-cycle (29,034ms).
 *
 * For initialization/fallback, synthetic centroids are generated from
 * domain descriptions via the phi-seeded Fibonacci hash below.
 */

const HEADY_DOMAINS = [
  {
    id:          'headyme',
    url:         'https://headyme.com',
    description: 'Personal command center, user dashboard, HeadySoul control plane, swarm observability',
    port:        443,
    serviceId:   'heady-soul',
  },
  {
    id:          'headysystems',
    url:         'https://headysystems.com',
    description: 'Core infrastructure, Sacred Geometry orchestration, self-healing, pipeline management',
    port:        443,
    serviceId:   'heady-manager',
  },
  {
    id:          'headyos',
    url:         'https://headyos.com',
    description: 'Latent OS, continuous AI reasoning, cognitive interface, always-on intelligence',
    port:        443,
    serviceId:   'heady-pipeline-core',
  },
  {
    id:          'headybuddy',
    url:         'https://headybuddy.org',
    description: 'AI companion, persistent memory, empathic chat, personal buddy experience',
    port:        443,
    serviceId:   'heady-buddy',
  },
  {
    id:          'headymcp',
    url:         'https://headymcp.com',
    description: 'MCP gateway, 42 tool catalog, JSON-RPC 2.0, model context protocol',
    port:        443,
    serviceId:   'heady-mcp',
  },
  {
    id:          'headyapi',
    url:         'https://headyapi.com',
    description: 'Public API gateway, rate limiting, authentication, developer endpoints',
    port:        443,
    serviceId:   'heady-gateway',
  },
  {
    id:          'headyio',
    url:         'https://heady.io',
    description: 'Developer SDK, code generation, documentation, API keys, developer tools',
    port:        443,
    serviceId:   'heady-coder',
  },
  {
    id:          'headyconnection',
    url:         'https://headyconnection.org',
    description: 'Nonprofit community, collaborative workspace, Drupal CMS, shared projects',
    port:        443,
    serviceId:   'heady-drupal',
  },
  {
    id:          'headybot',
    url:         'https://headybot.com',
    description: 'Bot framework, autonomous agents, swarm intelligence, task automation',
    port:        443,
    serviceId:   'heady-hive',
  },
];

// ─── CSL DOMAIN ROUTER ────────────────────────────────────────────────────────

export class CslDomainRouter {
  /**
   * @param {Object} opts
   * @param {import('pino').Logger} [opts.logger]
   * @param {Function} [opts.getEmbedding] — async (text: string) => Float64Array
   * @param {number} [opts.refreshIntervalMs] — phi7 cycle
   * @param {number} [opts.threshold] — CSL pass threshold
   */
  constructor(opts = {}) {
    this._logger    = opts.logger ?? createLogger({ service: 'heady-router' });
    this._getEmbed  = opts.getEmbedding ?? null;
    this._threshold = opts.threshold ?? CSL_THRESHOLDS.PASS;  // ψ = 0.618
    this._domains   = [];
    this._centroidCache = new Map();     // domainId → Float64Array centroid
    this._lastRefresh   = 0;
    this._refreshMs     = opts.refreshIntervalMs ?? TIMEOUTS.PHI_7; // 29034ms

    // EXPLICIT: No priority tracking at all
    // The following fields intentionally do not exist:
    //   this._priorities  ← REMOVED
    //   this._priorityBands ← REMOVED
    //   this._weightedQueue ← REMOVED
  }

  /**
   * Load domain registry and initialize centroids.
   * @returns {Promise<void>}
   */
  async init() {
    this._logger.info({ event: 'router.init' }, 'CSL domain router initializing');

    for (const domain of HEADY_DOMAINS) {
      let centroid;

      if (this._getEmbed) {
        try {
          centroid = await this._getEmbed(domain.description);
          this._logger.debug({ event: 'router.centroid.loaded', domain: domain.id },
            `Centroid loaded for ${domain.id}`);
        } catch (err) {
          this._logger.warn({ event: 'router.centroid.fallback', domain: domain.id, error: err.message },
            `Falling back to synthetic centroid for ${domain.id}`);
          centroid = this._syntheticCentroid(domain.description);
        }
      } else {
        centroid = this._syntheticCentroid(domain.description);
      }

      this._domains.push({ ...domain, centroid });
      this._centroidCache.set(domain.id, centroid);
    }

    this._lastRefresh = Date.now();
    this._logger.info({ event: 'router.init.complete', domain_count: this._domains.length },
      `CSL router ready with ${this._domains.length} domains`);
  }

  /**
   * Route a query to the single best-matching domain.
   * Uses CSL cosine similarity — NO priority field, NO integer weights.
   *
   * @param {string|Float64Array} query — text query or pre-computed embedding
   * @returns {Promise<{domain: Object, similarity: number, ternary: string}|null>}
   */
  async route(query) {
    await this._maybeRefresh();

    const embedding = await this._toEmbedding(query);
    if (!embedding) {
      this._logger.warn({ event: 'router.no_embedding' }, 'Could not embed query, routing to default');
      return this._defaultRoute();
    }

    const match = cslSelectDomain(embedding, this._domains, this._threshold);

    if (match) {
      logConfidenceEvent(this._logger, 'router.csl_match', match.similarity, {
        domain: match.domain.id,
        ternary: match.ternary,
      });
      return match;
    }

    this._logger.warn({ event: 'router.no_match', threshold: this._threshold },
      `No domain exceeded CSL threshold ${this._threshold}`);
    return this._defaultRoute();
  }

  /**
   * Multi-domain routing: all domains with CSL ternary === 'TRUE'.
   * Returns parallel routing targets for cross-domain requests.
   *
   * @param {string|Float64Array} query
   * @returns {Promise<Array>}
   */
  async routeMulti(query) {
    await this._maybeRefresh();

    const embedding = await this._toEmbedding(query);
    if (!embedding) return [this._defaultRoute()].filter(Boolean);

    const matches = cslMultiDomainAssign(embedding, this._domains);
    if (matches.length === 0) {
      return [this._defaultRoute()].filter(Boolean);
    }

    this._logger.info({ event: 'router.multi_match', count: matches.length,
      domains: matches.map(m => m.domain.id) },
      `CSL multi-domain match: ${matches.length} domains`);

    return matches;
  }

  /**
   * Express middleware: resolve domain and attach to req.
   * Sets req.headyDomain and req.cslRoute.
   * @returns {import('express').RequestHandler}
   */
  middleware() {
    return async (req, res, next) => {
      const query = req.query.q
        ?? req.body?.query
        ?? req.body?.intent
        ?? req.headers['x-heady-intent']
        ?? `${req.method} ${req.path}`;

      try {
        const match = await this.route(query);
        req.headyDomain = match?.domain?.id ?? 'unassigned';
        req.cslRoute    = match;
        req.cslSimilarity = match?.similarity ?? 0;
      } catch (err) {
        this._logger.warn({ event: 'router.middleware.error', error: err.message },
          'CSL routing failed (degraded gracefully)');
        req.headyDomain = 'unassigned';
        req.cslRoute    = null;
      }

      next();
    };
  }

  /**
   * Get router statistics.
   * @returns {Object}
   */
  stats() {
    return {
      domain_count:     this._domains.length,
      threshold:        this._threshold,
      last_refresh:     new Date(this._lastRefresh).toISOString(),
      refresh_interval: this._refreshMs,
      routing_strategy: 'CSL cosine matching',
      priority_routing: false,  // explicitly false — priority routing removed
      phi_compliant:    true,
      domains: this._domains.map(d => ({
        id: d.id, url: d.url, service: d.serviceId,
      })),
    };
  }

  // ─── PRIVATE ──────────────────────────────────────────────────────────────

  async _maybeRefresh() {
    if (Date.now() - this._lastRefresh > this._refreshMs) {
      // Non-blocking refresh — don't await, fire and forget
      this.init().catch(err =>
        this._logger.warn({ event: 'router.refresh.failed', error: err.message },
          'Background centroid refresh failed')
      );
    }
  }

  async _toEmbedding(query) {
    if (query instanceof Float64Array || Array.isArray(query)) {
      return normalize(query);
    }
    if (typeof query !== 'string') return null;
    if (!this._getEmbed) return this._syntheticCentroid(query);
    try {
      return await this._getEmbed(query);
    } catch {
      return this._syntheticCentroid(query);
    }
  }

  _defaultRoute() {
    const headysystems = this._domains.find(d => d.id === 'headysystems');
    if (!headysystems) return null;
    return { domain: headysystems, similarity: PSI, ternary: 'TRUE', gateScore: PSI, passes: true };
  }

  /**
   * Generate a phi-seeded synthetic centroid for testing/fallback.
   * Produces a deterministic but diverse 384-dim unit vector from a string.
   * @param {string} text
   * @returns {Float64Array}
   */
  _syntheticCentroid(text) {
    const dim = 384;
    const v = new Float64Array(dim);
    let seed = 0;
    for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) & 0xFFFFFFFF;

    // Phi-seeded linear congruential generator
    for (let i = 0; i < dim; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) & 0xFFFFFFFF;
      v[i] = (seed / 0xFFFFFFFF) * 2 - 1; // [-1, 1]
    }

    return normalize(v);
  }
}

export { HEADY_DOMAINS };
