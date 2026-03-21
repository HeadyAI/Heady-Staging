/**
 * NEXUS Node — Cross-domain connection node (Middle Ring)
 * Bridges all 9 Heady domains, ensuring cross-domain data flow,
 * auth propagation, and event routing. Sacred Geometry: Middle Ring.
 * @module NEXUS
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */
'use strict';

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };

const DOMAINS = ['headyme.com','headysystems.com','headyconnection.org','headybuddy.org','headymcp.com','headyio.com','headybot.com','headyapi.com','heady-ai.com'];

class NexusNode {
  constructor(config = {}) {
    this.ring = 'middle';
    this.nodeId = 'NEXUS';
    this.domainRoutes = new Map();
    this.eventSubscriptions = new Map();
    this.authTokenCache = new Map();
    this.crossDomainFlows = [];
    this.state = 'READY';
    this.stats = { routedRequests: 0, eventsForwarded: 0, authPropagations: 0, crossDomainFlows: 0 };
    this._correlationId = `nexus-${Date.now().toString(36)}`;
    this._initializeDomainRoutes();
  }

  _initializeDomainRoutes() {
    const domainConfig = {
      'headyme.com': { coreRepo: 'headyme-core', role: 'personal-hub', ring: 'center', services: ['dashboard','profile','settings'] },
      'headysystems.com': { coreRepo: 'headysystems-core', role: 'infrastructure', ring: 'inner', services: ['manager','registry','brain','deploy'] },
      'headyconnection.org': { coreRepo: 'headyconnection-core', role: 'community', ring: 'outer', services: ['grants','programs','community'] },
      'headybuddy.org': { coreRepo: 'headybuddy-core', role: 'companion', ring: 'middle', services: ['chat','memory','creative','voice'] },
      'headymcp.com': { coreRepo: 'headymcp-core', role: 'mcp-gateway', ring: 'inner', services: ['tools','gateway','transport','sandbox'] },
      'headyio.com': { coreRepo: 'headyio-core', role: 'developer-sdk', ring: 'outer', services: ['sdk','docs','api-reference','examples'] },
      'headybot.com': { coreRepo: 'headybot-core', role: 'bot-framework', ring: 'outer', services: ['bots','swarm','automation','webhooks'] },
      'headyapi.com': { coreRepo: 'headyapi-core', role: 'api-gateway', ring: 'inner', services: ['routing','providers','racing','cache'] },
      'heady-ai.com': { coreRepo: 'headyai-core', role: 'ai-platform', ring: 'center', services: ['models','training','inference','vectors'] }
    };
    for (const [domain, cfg] of Object.entries(domainConfig)) {
      this.domainRoutes.set(domain, { ...cfg, domain, healthy: true, lastChecked: Date.now() });
    }
  }

  /**
   * Route a cross-domain request
   * @param {object} request — { fromDomain, toDomain, action, payload, auth }
   * @returns {object} — routing result
   */
  async routeCrossDomain(request) {
    const { fromDomain, toDomain, action, payload = {}, auth = null } = request;
    const correlationId = `xd-${Date.now().toString(36)}`;
    this.stats.routedRequests++;

    const sourceRoute = this.domainRoutes.get(fromDomain);
    const targetRoute = this.domainRoutes.get(toDomain);
    if (!sourceRoute || !targetRoute) {
      return { success: false, error: `Unknown domain: ${!sourceRoute ? fromDomain : toDomain}`, correlationId };
    }

    // CSL-gated trust: cross-domain requests need minimum trust level
    const trustRequired = this._calculateCrossDomainTrust(sourceRoute, targetRoute);
    if (trustRequired < CSL.LOW) {
      return { success: false, error: 'Insufficient cross-domain trust', trust: trustRequired, required: CSL.LOW, correlationId };
    }

    // Propagate auth if needed
    let propagatedAuth = auth;
    if (auth && fromDomain !== toDomain) {
      propagatedAuth = await this._propagateAuth(auth, fromDomain, toDomain);
      this.stats.authPropagations++;
    }

    this.stats.crossDomainFlows++;
    this.crossDomainFlows.push({ correlationId, fromDomain, toDomain, action, timestamp: Date.now() });
    if (this.crossDomainFlows.length > FIB[12]) this.crossDomainFlows.splice(0, this.crossDomainFlows.length - FIB[12]);

    this._log('info', 'cross-domain-routed', { correlationId, fromDomain, toDomain, action, trust: trustRequired });
    return { success: true, correlationId, fromDomain, toDomain, action, trust: trustRequired, auth: propagatedAuth ? 'propagated' : 'none' };
  }

  /**
   * Forward events across domains
   * @param {object} event — { sourceDomain, eventType, payload }
   */
  async forwardEvent(event) {
    const { sourceDomain, eventType, payload = {} } = event;
    const subscribers = this.eventSubscriptions.get(eventType) || [];
    const forwarded = [];

    for (const sub of subscribers) {
      if (sub.domain !== sourceDomain) {
        forwarded.push({ domain: sub.domain, eventType, forwardedAt: Date.now() });
        this.stats.eventsForwarded++;
      }
    }

    this._log('info', 'event-forwarded', { sourceDomain, eventType, forwardedTo: forwarded.length });
    return { eventType, sourceDomain, forwardedTo: forwarded };
  }

  /** Subscribe a domain to an event type */
  subscribe(domain, eventType) {
    if (!this.eventSubscriptions.has(eventType)) this.eventSubscriptions.set(eventType, []);
    this.eventSubscriptions.get(eventType).push({ domain, subscribedAt: Date.now() });
  }

  /** Calculate cross-domain trust based on ring proximity */
  _calculateCrossDomainTrust(source, target) {
    const ringOrder = ['center', 'inner', 'middle', 'outer', 'governance'];
    const sourceIdx = ringOrder.indexOf(source.ring);
    const targetIdx = ringOrder.indexOf(target.ring);
    const distance = Math.abs(sourceIdx - targetIdx);
    return Math.max(CSL.MINIMUM, 1.0 - distance * PSI * 0.15);
  }

  /** Propagate auth token across domains */
  async _propagateAuth(auth, fromDomain, toDomain) {
    const cacheKey = `${fromDomain}→${toDomain}:${typeof auth === 'string' ? auth.slice(0, 8) : 'token'}`;
    if (this.authTokenCache.has(cacheKey)) {
      const cached = this.authTokenCache.get(cacheKey);
      if (Date.now() - cached.createdAt < FIB[8] * 60000) return cached.token;
    }
    const propagated = { original: auth, fromDomain, toDomain, propagatedAt: Date.now(), expiresAt: Date.now() + FIB[8] * 60000 };
    this.authTokenCache.set(cacheKey, { token: propagated, createdAt: Date.now() });
    return propagated;
  }

  _calculateCoherence() {
    const healthyDomains = [...this.domainRoutes.values()].filter(d => d.healthy).length;
    return healthyDomains / DOMAINS.length;
  }

  async start() { this.state = 'READY'; this._log('info', 'nexus-started', { domains: DOMAINS.length }); return this; }
  async stop() { this.authTokenCache.clear(); this.state = 'STOPPED'; this._log('info', 'nexus-stopped', { stats: this.stats }); }
  health() { return { status: 'ok', nodeId: this.nodeId, ring: this.ring, state: this.state, coherence: this._calculateCoherence(), stats: { ...this.stats }, domains: DOMAINS.length, subscriptions: this.eventSubscriptions.size, timestamp: new Date().toISOString() }; }
  _log(level, event, data = {}) { console.log(JSON.stringify({ level, event, node: this.nodeId, ring: this.ring, correlationId: this._correlationId, ...data, ts: new Date().toISOString() })); }
}

module.exports = { NexusNode };
