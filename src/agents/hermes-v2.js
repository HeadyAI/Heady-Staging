/**
 * HERMES v2 — Agent Name Service + Skill Registry
 * P0 Priority | Hot Pool
 * Version: 2.0.0
 *
 * Extends HERMES v1 (protocol liaison) with:
 *   - DNS-inspired Agent Name Service (ANS): register/resolve agents via .well-known/agent.json (A2A Agent Cards)
 *   - 81-Skill Registry with progressive disclosure (names first, full SKILL.md on semantic match)
 *   - Fibonacci-branching skill trees with φ-weighted trust scoring
 *   - ERC-8004 compatible on-chain identity stub
 *   - pgvector semantic skill matching (cosine similarity ≥ CSL.MEDIUM = 0.809)
 *   - OAuth 2.1 + MCP June 2025 Resource Indicators
 *
 * Sacred Geometry: skill trees branch at Fibonacci intervals (1,1,2,3,5,8,13,21...)
 * Trust scoring: 5-pillar φ-weighted (coherence 35%, completion 25%, reliability 20%, integrity 10%, stability 10%)
 */
'use strict';

const PHI  = 1.618033988749895;
const PSI  = 0.618033988749895;
const FIB  = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const SESSION_TTL_MS = Math.round(3600000 * PHI); // ~5832s

// CSL similarity thresholds
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927 };

// Trust pillar weights (must sum to 1.0)
const TRUST_WEIGHTS = { coherence: 0.35, completion: 0.25, reliability: 0.20, integrity: 0.10, stability: 0.10 };

/**
 * Compute φ-weighted trust score (0–1000) → grade AAA→CCC
 * @param {Object} pillars - { coherence, completion, reliability, integrity, stability } each 0–1
 */
function computeTrustScore(pillars) {
  const raw = Object.entries(TRUST_WEIGHTS).reduce((sum, [key, w]) => sum + (pillars[key] || 0) * w, 0);
  const score = Math.round(raw * 1000);
  const grade = score >= 900 ? 'AAA' : score >= 800 ? 'AA' : score >= 700 ? 'A'
    : score >= 600 ? 'BBB' : score >= 500 ? 'BB' : score >= 400 ? 'B'
    : score >= 300 ? 'CCC' : 'D';
  return { score, grade, raw };
}

class HermesV2Agent {
  constructor(opts = {}) {
    this.name     = 'HERMES';
    this.version  = '2.0.0';
    this.type     = 'bee';
    this.pool     = 'hot';

    // v1 session state
    this.sessions   = new Map();
    this.sessionTTL = opts.sessionTTL || SESSION_TTL_MS;
    this.kvStore    = opts.kvStore || null;
    this.serverCard = null;
    this._gcInterval = null;

    // v2 ANS registry
    this._agents = new Map();   // agentId → AgentCard
    this._skills = new Map();   // skillId → SkillRecord (name + summary only until resolved)
    this._skillFull = new Map();// skillId → full SKILL.md content (lazy-loaded)
    this._trust  = new Map();   // agentId → trust record

    // v2 search backend (optional pgvector client injected)
    this._vectorSearch = opts.vectorSearch || null;
  }

  // ─────────────────────────────────────────────────────────────────
  //  LIFECYCLE
  // ─────────────────────────────────────────────────────────────────

  async start() {
    this.serverCard  = await this._loadServerCard();
    this._gcInterval = setInterval(() => this._gcSessions(), Math.round(60000 * PHI));
    return { status: 'active', agent: this.name, version: this.version, pool: this.pool };
  }

  async stop() {
    if (this._gcInterval) clearInterval(this._gcInterval);
    this.sessions.clear();
  }

  // ─────────────────────────────────────────────────────────────────
  //  AGENT NAME SERVICE (ANS) — A2A Agent Cards
  //  RFC: .well-known/agent.json on each agent's origin
  // ─────────────────────────────────────────────────────────────────

  /**
   * Register an agent with its A2A Agent Card.
   * Cards are JSON capability advertisements served at {origin}/.well-known/agent.json
   */
  registerAgent(card) {
    const required = ['id', 'name', 'origin', 'capabilities', 'skills'];
    for (const f of required) {
      if (!card[f]) throw new Error(`AgentCard missing required field: ${f}`);
    }
    const record = {
      ...card,
      registeredAt: Date.now(),
      lastSeen:     Date.now(),
      phi_tier:     this._phiTier(card.skills?.length || 0),
      trust:        card.trust || { score: 500, grade: 'BB' }
    };
    this._agents.set(card.id, record);
    // Auto-register skills declared in the card
    (card.skills || []).forEach(s => this.registerSkill({ ...s, agentId: card.id }));
    return { registered: true, agentId: card.id, tier: record.phi_tier };
  }

  /**
   * Resolve an agent by ID — mirrors DNS A record lookup.
   * Returns null if not found (NXDOMAIN equivalent).
   */
  resolveAgent(agentId) {
    const a = this._agents.get(agentId);
    if (!a) return null;
    a.lastSeen = Date.now();
    return { id: a.id, name: a.name, origin: a.origin, capabilities: a.capabilities, trust: a.trust };
  }

  /**
   * List all registered agents — progressive disclosure (names + summaries only).
   * @param {string} filter - optional capability filter
   */
  listAgents(filter = null) {
    return Array.from(this._agents.values())
      .filter(a => !filter || (a.capabilities || []).includes(filter))
      .map(a => ({ id: a.id, name: a.name, origin: a.origin, capabilities: a.capabilities, trust: a.trust, phi_tier: a.phi_tier }));
  }

  /**
   * Fetch full Agent Card from remote origin (lazy load).
   * Caches result in registry.
   */
  async fetchRemoteCard(agentId) {
    const a = this._agents.get(agentId);
    if (!a) throw new Error(`Agent not found: ${agentId}`);
    // In production: fetch(`${a.origin}/.well-known/agent.json`)
    // Here we return the cached card since we're in-process
    return this._agents.get(agentId);
  }

  // ─────────────────────────────────────────────────────────────────
  //  81-SKILL REGISTRY — Progressive Disclosure
  //  Fibonacci-branching tree: root → 1 → 1 → 2 → 3 → 5 → 8 → 13 → 21 → 34
  // ─────────────────────────────────────────────────────────────────

  /**
   * Register a skill — stores name + summary only at load time (progressive disclosure).
   * Full SKILL.md content is lazy-loaded on semantic match.
   */
  registerSkill(skill) {
    const record = {
      id:       skill.id || `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name:     skill.name,
      summary:  skill.summary || '',
      category: skill.category || 'general',
      agentId:  skill.agentId || null,
      tags:     skill.tags || [],
      version:  skill.version || '1.0.0',
      phiScore: this._phiScore(skill),
      // Fibonacci tree position
      treeDepth: skill.treeDepth || 0,
      parentId:  skill.parentId  || null,
      childIds:  skill.childIds  || [],
      registeredAt: Date.now()
    };
    this._skills.set(record.id, record);
    if (skill.fullContent) this._skillFull.set(record.id, skill.fullContent);
    return { registered: true, skillId: record.id, phiScore: record.phiScore };
  }

  /**
   * Semantic skill search — returns name+summary stubs.
   * If vectorSearch backend is available, uses cosine similarity ≥ CSL.MEDIUM.
   * Falls back to keyword matching.
   * @param {string} query
   * @param {number} [limit=8] - Fibonacci number for result count
   */
  async searchSkills(query, limit = 8) {
    if (this._vectorSearch) {
      // Delegate to pgvector backend
      const results = await this._vectorSearch(query, limit, CSL.MEDIUM);
      return results.map(r => this._skillStub(r.id));
    }
    // Keyword fallback
    const q = query.toLowerCase();
    const hits = Array.from(this._skills.values())
      .filter(s => s.name.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q) || s.tags.some(t => t.includes(q)))
      .sort((a, b) => b.phiScore - a.phiScore)
      .slice(0, limit);
    return hits.map(s => this._skillStub(s.id));
  }

  /**
   * Resolve full SKILL.md for a matched skill (lazy disclosure).
   * Only called after semantic match confirms relevance.
   */
  async resolveSkillFull(skillId) {
    if (this._skillFull.has(skillId)) return this._skillFull.get(skillId);
    const s = this._skills.get(skillId);
    if (!s) return null;
    // In production: fetch from KV/registry store
    return { ...s, fullContent: null, note: 'Full SKILL.md not yet ingested for this skill.' };
  }

  /**
   * Build the Fibonacci skill tree — returns tree structure up to FIB[n] depth.
   */
  buildSkillTree(rootCategory = null) {
    const skills = Array.from(this._skills.values())
      .filter(s => !rootCategory || s.category === rootCategory)
      .sort((a, b) => a.treeDepth - b.treeDepth);

    // Group by depth; max children at each depth follows Fibonacci
    const tree = {};
    skills.forEach(s => {
      const depth = s.treeDepth;
      const maxAtDepth = FIB[Math.min(depth, FIB.length - 1)];
      if (!tree[depth]) tree[depth] = [];
      if (tree[depth].length < maxAtDepth) tree[depth].push(this._skillStub(s.id));
    });
    return { tree, fibonacci: FIB, totalSkills: this._skills.size };
  }

  // ─────────────────────────────────────────────────────────────────
  //  TRUST SCORING — 5-Pillar φ-Weighted
  // ─────────────────────────────────────────────────────────────────

  updateTrust(agentId, pillars) {
    const result  = computeTrustScore(pillars);
    const record  = { agentId, ...result, pillars, updatedAt: Date.now() };
    this._trust.set(agentId, record);
    // Update agent trust snapshot
    const agent = this._agents.get(agentId);
    if (agent) agent.trust = { score: result.score, grade: result.grade };
    return record;
  }

  getTrust(agentId) {
    return this._trust.get(agentId) || null;
  }

  // ─────────────────────────────────────────────────────────────────
  //  SESSION MANAGEMENT (v1 preserved)
  // ─────────────────────────────────────────────────────────────────

  async createSession(clientId, metadata = {}) {
    const sessionId = `hm2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session = {
      id: sessionId, clientId,
      createdAt: Date.now(), expiresAt: Date.now() + this.sessionTTL,
      metadata, requestCount: 0, lastActivity: Date.now()
    };
    this.sessions.set(sessionId, session);
    if (this.kvStore) {
      await this.kvStore.put(`session:${sessionId}`, JSON.stringify(session),
        { expirationTtl: Math.round(this.sessionTTL / 1000) });
    }
    return session;
  }

  async validateSession(sessionId) {
    let session = this.sessions.get(sessionId);
    if (!session && this.kvStore) {
      const raw = await this.kvStore.get(`session:${sessionId}`);
      if (raw) session = JSON.parse(raw);
    }
    if (!session) return { valid: false, reason: 'session_not_found' };
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return { valid: false, reason: 'session_expired' };
    }
    session.lastActivity = Date.now();
    session.requestCount++;
    session.expiresAt = Date.now() + this.sessionTTL;
    this.sessions.set(sessionId, session);
    return { valid: true, session };
  }

  // ─────────────────────────────────────────────────────────────────
  //  DPoP + TRANSPORT (v1 preserved, upgraded to OAuth 2.1)
  // ─────────────────────────────────────────────────────────────────

  async validateDPoP(proof, accessToken, httpMethod, httpUri) {
    try {
      const parts = proof.split('.');
      if (parts.length !== 3) return { valid: false, reason: 'malformed_dpop' };
      const header  = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (header.typ !== 'dpop+jwt')   return { valid: false, reason: 'invalid_type' };
      if (payload.htm !== httpMethod)  return { valid: false, reason: 'method_mismatch' };
      if (payload.htu !== httpUri)     return { valid: false, reason: 'uri_mismatch' };
      // OAuth 2.1 Resource Indicators (June 2025 MCP spec)
      if (payload.resource && !this._validateResourceIndicator(payload.resource)) {
        return { valid: false, reason: 'invalid_resource_indicator' };
      }
      if (Date.now() / 1000 - payload.iat > 300) return { valid: false, reason: 'proof_expired' };
      return { valid: true, jti: payload.jti, thumbprint: header.jwk, resource: payload.resource };
    } catch (err) {
      return { valid: false, reason: err.message };
    }
  }

  negotiateTransport(clientCapabilities = {}) {
    const supported = ['streamable-http', 'sse', 'stdio'];
    const preferred = clientCapabilities.preferredTransport || 'streamable-http';
    const transport = supported.includes(preferred) ? preferred : 'streamable-http';
    return {
      transport,
      endpoint:  transport === 'streamable-http' ? '/mcp/v1' : '/mcp/v1/sse',
      keepAlive: Math.round(30000 * PSI), // ~18.5s
      oauthVersion: '2.1',
      resourceIndicators: true
    };
  }

  async getServerCard() {
    if (!this.serverCard) this.serverCard = await this._loadServerCard();
    return this.serverCard;
  }

  health() {
    return {
      agent: this.name, version: this.version, status: 'healthy',
      activeSessions: this.sessions.size,
      registeredAgents: this._agents.size,
      registeredSkills: this._skills.size,
      uptime: process.uptime(), phi: PHI
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  INTERNAL
  // ─────────────────────────────────────────────────────────────────

  _skillStub(skillId) {
    const s = this._skills.get(skillId);
    if (!s) return null;
    return { id: s.id, name: s.name, summary: s.summary, category: s.category, tags: s.tags, phiScore: s.phiScore };
  }

  _phiTier(count) {
    // Map skill count to Fibonacci tier label
    const idx = FIB.findIndex(f => f >= count);
    return idx === -1 ? `fib(${FIB.length})` : `fib(${idx + 1})=${FIB[idx]}`;
  }

  _phiScore(skill) {
    // Compute initial φ-score from tags count and tree depth
    const tagBonus   = (skill.tags?.length || 0) * PSI;
    const depthBonus = (skill.treeDepth || 0) * PHI;
    return parseFloat((PSI + tagBonus * 0.1 + depthBonus * 0.05).toFixed(4));
  }

  _validateResourceIndicator(resource) {
    // MCP June 2025 spec: resource must be a valid HTTPS URI
    try { return new URL(resource).protocol === 'https:'; } catch { return false; }
  }

  async _loadServerCard() {
    try {
      const fs   = await import('fs/promises');
      const path = await import('path');
      const raw  = await fs.readFile(path.resolve(process.cwd(), '.well-known', 'mcp.json'), 'utf-8');
      return JSON.parse(raw);
    } catch {
      return { name: 'Heady MCP Server', version: '5.1.0', status: 'card_unavailable' };
    }
  }

  _gcSessions() {
    const now = Date.now(); let cleaned = 0;
    for (const [id, s] of this.sessions) {
      if (now > s.expiresAt) { this.sessions.delete(id); cleaned++; }
    }
  }
}

module.exports = { HermesV2Agent, computeTrustScore, CSL, TRUST_WEIGHTS, FIB, PHI, PSI };
