/**
 * © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 *
 * Routes: Agent Marketplace API (Layer 8 PRODUCT)
 *
 * Express/Node.js compatible route handlers for agent marketplace operations.
 * Mount with: app.use('/api/v1/marketplace', require('./routes/marketplace-routes'));
 *
 * Endpoints:
 *   POST   /agents                       — Register/list an agent on the marketplace
 *   GET    /agents                       — Browse marketplace catalog
 *   GET    /agents/:agentId              — Get agent details
 *   POST   /agents/:agentId/deploy       — Deploy an agent instance (tenant-scoped)
 *   GET    /agents/:agentId/metrics      — Usage metrics for an agent
 *   POST   /agents/:agentId/review       — Submit a review
 *   GET    /revenue/:publisherId         — Revenue dashboard for agent publisher
 *
 * Revenue Model:
 *   HeadySystems platform fee: 20% (φ-derived: 1 - PSI² ≈ 0.382 → rounded to 0.20)
 *   Publisher share: 80%
 *
 * Events emitted:
 *   marketplace:agent:listed    — Agent published to catalog
 *   marketplace:agent:deployed  — Agent instance deployed for tenant
 *   marketplace:revenue:earned  — Revenue recorded from agent execution
 */

'use strict';

const crypto = require('crypto');

// ─── φ-Math Constants ─────────────────────────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// Platform fee: 20% (HeadySystems takes 20%, publisher receives 80%)
const PLATFORM_FEE_RATE   = 0.20;
const PUBLISHER_SHARE     = 1.0 - PLATFORM_FEE_RATE; // 0.80

// φ-health thresholds for agent health monitoring
const PHI_HEALTH = { THRIVING: 1.000, NOMINAL: PSI, DEGRADED: 0.382, CRITICAL: 0.236 };

// Health polling interval: Fibonacci-scaled (8s base × φ)
const HEALTH_POLL_INTERVAL_MS = Math.round(8000 * PHI); // ~12,944ms

// CSL similarity thresholds for skill matching
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927 };

// ─── In-Memory Stores (replace with Postgres/pgvector in production) ──────────
const agentCatalog   = new Map(); // agentId -> agent listing
const deployments    = new Map(); // deploymentId -> deployment record
const usageRecords   = [];        // metered billing events
const reviews        = new Map(); // agentId -> [review]
const revenueRecords = new Map(); // publisherId -> [revenue entries]
const healthStatus   = new Map(); // agentId -> { status, lastChecked, phiScore }

const MAX_USAGE_RECORDS = 50000;  // Ring buffer limit

// ─── Event Bus (lightweight in-process emitter) ──────────────────────────────
let _eventBus = null;

function getEventBus() {
  if (_eventBus) return _eventBus;
  try {
    const EventEmitter = require('events');
    _eventBus = new EventEmitter();
    _eventBus.setMaxListeners(FIB[8]); // 34
    return _eventBus;
  } catch {
    // Fallback no-op bus
    return { emit: () => {}, on: () => {}, off: () => {} };
  }
}

function setEventBus(bus) {
  _eventBus = bus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix = 'mkt') {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

function now() {
  return new Date().toISOString();
}

/**
 * Compute φ-weighted agent quality score from reviews.
 * Uses golden-ratio weighting: recent reviews weighted by PSI^age.
 */
function computeAgentRating(agentId) {
  const agentReviews = reviews.get(agentId) || [];
  if (agentReviews.length === 0) return { rating: 0, reviewCount: 0 };

  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < agentReviews.length; i++) {
    const age    = agentReviews.length - 1 - i; // 0 = most recent
    const weight = Math.pow(PSI, age);           // φ-decay: recent reviews matter more
    weightedSum += agentReviews[i].rating * weight;
    weightTotal += weight;
  }

  return {
    rating:      Math.round((weightedSum / weightTotal) * 100) / 100,
    reviewCount: agentReviews.length,
  };
}

/**
 * Split revenue between platform and publisher.
 */
function splitRevenue(grossAmount) {
  const platformFee    = Math.round(grossAmount * PLATFORM_FEE_RATE * 100) / 100;
  const publisherShare = Math.round(grossAmount * PUBLISHER_SHARE * 100) / 100;
  return { grossAmount, platformFee, publisherShare, feeRate: PLATFORM_FEE_RATE };
}

/**
 * Record a usage event for metered billing.
 */
function recordUsage(agentId, tenantId, durationMs, cost) {
  const entry = {
    id:       generateId('usg'),
    agentId,
    tenantId,
    durationMs,
    cost,
    revenue:  splitRevenue(cost),
    ts:       now(),
  };

  // Ring buffer
  if (usageRecords.length >= MAX_USAGE_RECORDS) usageRecords.shift();
  usageRecords.push(entry);

  // Accumulate publisher revenue
  const agent = agentCatalog.get(agentId);
  if (agent) {
    const publisherId = agent.publisher;
    if (!revenueRecords.has(publisherId)) revenueRecords.set(publisherId, []);
    revenueRecords.get(publisherId).push({
      agentId,
      tenantId,
      gross:          entry.revenue.grossAmount,
      platformFee:    entry.revenue.platformFee,
      publisherShare: entry.revenue.publisherShare,
      ts:             entry.ts,
    });

    getEventBus().emit('marketplace:revenue:earned', {
      agentId, publisherId, tenantId,
      gross:          entry.revenue.grossAmount,
      platformFee:    entry.revenue.platformFee,
      publisherShare: entry.revenue.publisherShare,
    });
  }

  return entry;
}

/**
 * Poll an agent's health endpoint and update status.
 */
async function pollAgentHealth(agentId) {
  const agent = agentCatalog.get(agentId);
  if (!agent || !agent.healthEndpoint) return null;

  let status = 'UNKNOWN';
  let phiScore = PHI_HEALTH.CRITICAL;

  try {
    // In production, use @heady/networking direct client
    const http = agent.healthEndpoint.startsWith('https') ? require('https') : require('http');
    const result = await new Promise((resolve, reject) => {
      const req = http.get(agent.healthEndpoint, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });

    if (result.statusCode >= 200 && result.statusCode < 300) {
      status   = 'HEALTHY';
      phiScore = PHI_HEALTH.THRIVING;
    } else if (result.statusCode < 500) {
      status   = 'DEGRADED';
      phiScore = PHI_HEALTH.DEGRADED;
    } else {
      status   = 'UNHEALTHY';
      phiScore = PHI_HEALTH.CRITICAL;
    }
  } catch {
    status   = 'UNREACHABLE';
    phiScore = PHI_HEALTH.CRITICAL;
  }

  const record = { status, phiScore, lastChecked: now(), agentId };
  healthStatus.set(agentId, record);
  return record;
}

// ─── Health Monitor (Fibonacci-interval polling) ──────────────────────────────

let _healthInterval = null;

function startHealthMonitor() {
  if (_healthInterval) return;
  _healthInterval = setInterval(async () => {
    for (const [agentId] of agentCatalog) {
      try { await pollAgentHealth(agentId); } catch { /* logged in production */ }
    }
  }, HEALTH_POLL_INTERVAL_MS);
  if (_healthInterval.unref) _healthInterval.unref(); // Don't block process exit
}

function stopHealthMonitor() {
  if (_healthInterval) {
    clearInterval(_healthInterval);
    _healthInterval = null;
  }
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * POST /agents
 * Register/list an agent on the marketplace.
 * Body: { name, description, version, publisher, skills, capabilities, pricing, healthEndpoint, deployEndpoint }
 */
function registerAgent(req, res) {
  try {
    const {
      name, description, version, publisher,
      skills = [], capabilities = [], pricing = {},
      healthEndpoint, deployEndpoint,
    } = req.body || {};

    if (!name)      return res.status(400).json({ ok: false, error: 'name is required' });
    if (!publisher) return res.status(400).json({ ok: false, error: 'publisher is required' });
    if (!version)   return res.status(400).json({ ok: false, error: 'version is required' });

    const agentId = generateId('agt');
    const ts      = now();

    const listing = {
      agentId,
      name,
      description: description || '',
      version,
      publisher,
      skills,
      capabilities,
      pricing: {
        perExecution: pricing.perExecution || 0,
        perHour:      pricing.perHour || 0,
        perMonth:     pricing.perMonth || 0,
      },
      healthEndpoint: healthEndpoint || null,
      deployEndpoint: deployEndpoint || null,
      rating:          0,
      reviewCount:     0,
      deploymentCount: 0,
      createdAt:       ts,
      updatedAt:       ts,
      phi: {
        qualityScore: 0,
        healthScore:  PHI_HEALTH.NOMINAL,
        trustGrade:   'UNRATED',
      },
    };

    agentCatalog.set(agentId, listing);
    reviews.set(agentId, []);

    // Start health monitoring if first agent
    if (agentCatalog.size === 1) startHealthMonitor();

    getEventBus().emit('marketplace:agent:listed', {
      agentId, name, publisher, version, skills, pricing: listing.pricing,
    });

    return res.status(201).json({ ok: true, agent: listing });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * GET /agents
 * Browse marketplace catalog.
 * Query: ?skill=&capability=&publisher=&minRating=&sort=rating|deployments|newest&limit=&offset=
 */
function browseAgents(req, res) {
  try {
    const { skill, capability, publisher, minRating, sort = 'newest', limit = 50, offset = 0 } = req.query;

    let results = Array.from(agentCatalog.values());

    // Filters
    if (skill) {
      results = results.filter(a => a.skills.some(s =>
        s.toLowerCase().includes(skill.toLowerCase())
      ));
    }
    if (capability) {
      results = results.filter(a => a.capabilities.some(c =>
        c.toLowerCase().includes(capability.toLowerCase())
      ));
    }
    if (publisher) {
      results = results.filter(a => a.publisher === publisher);
    }
    if (minRating) {
      const min = parseFloat(minRating);
      results = results.filter(a => a.rating >= min);
    }

    // Sort
    switch (sort) {
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'deployments':
        results.sort((a, b) => b.deploymentCount - a.deploymentCount);
        break;
      case 'newest':
      default:
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    // Pagination
    const total    = results.length;
    const pageSize = Math.min(parseInt(limit, 10) || 50, 100);
    const skip     = parseInt(offset, 10) || 0;
    results = results.slice(skip, skip + pageSize);

    return res.json({
      ok: true,
      total,
      count:  results.length,
      offset: skip,
      limit:  pageSize,
      phi:    PHI,
      agents: results,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * GET /agents/:agentId
 * Get full agent details including health status.
 */
function getAgentDetails(req, res) {
  try {
    const { agentId } = req.params;
    const agent = agentCatalog.get(agentId);
    if (!agent) return res.status(404).json({ ok: false, error: `Agent '${agentId}' not found` });

    const health       = healthStatus.get(agentId) || { status: 'UNKNOWN', phiScore: 0, lastChecked: null };
    const agentReviews = (reviews.get(agentId) || []).slice(-FIB[6]); // Last 13 reviews

    return res.json({
      ok: true,
      agent: { ...agent, phi: { ...agent.phi, healthScore: health.phiScore } },
      health,
      recentReviews: agentReviews,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * POST /agents/:agentId/deploy
 * Deploy an agent instance for a tenant.
 * Body: { tenantId, config?: object }
 */
async function deployAgent(req, res) {
  try {
    const { agentId }                = req.params;
    const { tenantId, config = {} }  = req.body || {};

    if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId is required' });

    const agent = agentCatalog.get(agentId);
    if (!agent) return res.status(404).json({ ok: false, error: `Agent '${agentId}' not found` });

    // Check agent health before deployment
    const health = healthStatus.get(agentId);
    if (health && health.phiScore < PHI_HEALTH.DEGRADED) {
      return res.status(503).json({
        ok: false,
        error: 'Agent health is below deployment threshold',
        health,
        threshold: PHI_HEALTH.DEGRADED,
      });
    }

    const deploymentId = generateId('dep');
    const ts           = now();

    const deployment = {
      deploymentId,
      agentId,
      tenantId,
      config,
      status:    'ACTIVE',
      createdAt: ts,
      pricing:   agent.pricing,
      revenue:   { gross: 0, platformFee: 0, publisherShare: 0 },
    };

    deployments.set(deploymentId, deployment);

    // Update catalog counters
    agent.deploymentCount += 1;
    agent.updatedAt = ts;

    getEventBus().emit('marketplace:agent:deployed', {
      deploymentId, agentId, tenantId,
      publisher: agent.publisher,
      pricing:   agent.pricing,
    });

    return res.status(201).json({ ok: true, deployment });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * GET /agents/:agentId/metrics
 * Usage metrics for an agent (metered billing data).
 * Query: ?tenantId=&from=&to=
 */
function getAgentMetrics(req, res) {
  try {
    const { agentId }              = req.params;
    const { tenantId, from, to }   = req.query;

    const agent = agentCatalog.get(agentId);
    if (!agent) return res.status(404).json({ ok: false, error: `Agent '${agentId}' not found` });

    let records = usageRecords.filter(r => r.agentId === agentId);

    if (tenantId) records = records.filter(r => r.tenantId === tenantId);
    if (from)     records = records.filter(r => new Date(r.ts) >= new Date(from));
    if (to)       records = records.filter(r => new Date(r.ts) <= new Date(to));

    // Aggregate
    const totalExecutions = records.length;
    const totalDurationMs = records.reduce((sum, r) => sum + (r.durationMs || 0), 0);
    const totalGross      = records.reduce((sum, r) => sum + r.revenue.grossAmount, 0);
    const totalPlatformFee    = records.reduce((sum, r) => sum + r.revenue.platformFee, 0);
    const totalPublisherShare = records.reduce((sum, r) => sum + r.revenue.publisherShare, 0);

    // φ-scaled efficiency: executions per golden-hour
    const goldenHourMs   = 3600000 * PSI; // ~2,224,922ms
    const execsPerPhiHr  = totalDurationMs > 0
      ? Math.round((totalExecutions / (totalDurationMs / goldenHourMs)) * 100) / 100
      : 0;

    const health     = healthStatus.get(agentId) || { status: 'UNKNOWN', phiScore: 0 };
    const { rating, reviewCount } = computeAgentRating(agentId);

    return res.json({
      ok: true,
      agentId,
      metrics: {
        totalExecutions,
        totalDurationMs,
        avgDurationMs:   totalExecutions > 0 ? Math.round(totalDurationMs / totalExecutions) : 0,
        execsPerPhiHour: execsPerPhiHr,
        revenue: {
          gross:          Math.round(totalGross * 100) / 100,
          platformFee:    Math.round(totalPlatformFee * 100) / 100,
          publisherShare: Math.round(totalPublisherShare * 100) / 100,
          feeRate:        PLATFORM_FEE_RATE,
        },
        deploymentCount: agent.deploymentCount,
        rating,
        reviewCount,
        health,
      },
      phi: PHI,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * POST /agents/:agentId/review
 * Submit a review for an agent.
 * Body: { tenantId, rating (1-5), comment? }
 */
function submitReview(req, res) {
  try {
    const { agentId }                          = req.params;
    const { tenantId, rating, comment = '' }   = req.body || {};

    if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId is required' });
    if (rating == null || rating < 1 || rating > 5) {
      return res.status(400).json({ ok: false, error: 'rating must be between 1 and 5' });
    }

    const agent = agentCatalog.get(agentId);
    if (!agent) return res.status(404).json({ ok: false, error: `Agent '${agentId}' not found` });

    const review = {
      id:       generateId('rev'),
      agentId,
      tenantId,
      rating:   parseFloat(rating),
      comment,
      ts:       now(),
    };

    if (!reviews.has(agentId)) reviews.set(agentId, []);
    reviews.get(agentId).push(review);

    // Recompute agent rating
    const { rating: newRating, reviewCount } = computeAgentRating(agentId);
    agent.rating      = newRating;
    agent.reviewCount  = reviewCount;
    agent.updatedAt    = now();

    // Derive trust grade from φ-scaled rating
    const normalizedRating = newRating / 5.0;
    agent.phi.trustGrade = normalizedRating >= CSL.CRITICAL ? 'AAA'
      : normalizedRating >= CSL.HIGH     ? 'AA'
      : normalizedRating >= CSL.MEDIUM   ? 'A'
      : normalizedRating >= CSL.LOW      ? 'BBB'
      : normalizedRating >= CSL.MINIMUM  ? 'BB'
      : 'B';

    return res.status(201).json({ ok: true, review, agentRating: newRating, trustGrade: agent.phi.trustGrade });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * GET /revenue/:publisherId
 * Revenue dashboard for an agent publisher.
 * Query: ?from=&to=&agentId=
 */
function getRevenuedashboard(req, res) {
  try {
    const { publisherId }           = req.params;
    const { from, to, agentId }     = req.query;

    let records = revenueRecords.get(publisherId) || [];

    if (agentId) records = records.filter(r => r.agentId === agentId);
    if (from)    records = records.filter(r => new Date(r.ts) >= new Date(from));
    if (to)      records = records.filter(r => new Date(r.ts) <= new Date(to));

    const totalGross          = records.reduce((sum, r) => sum + r.gross, 0);
    const totalPlatformFee    = records.reduce((sum, r) => sum + r.platformFee, 0);
    const totalPublisherShare = records.reduce((sum, r) => sum + r.publisherShare, 0);

    // Per-agent breakdown
    const byAgent = {};
    for (const r of records) {
      if (!byAgent[r.agentId]) {
        byAgent[r.agentId] = { gross: 0, platformFee: 0, publisherShare: 0, executions: 0 };
      }
      byAgent[r.agentId].gross          += r.gross;
      byAgent[r.agentId].platformFee    += r.platformFee;
      byAgent[r.agentId].publisherShare += r.publisherShare;
      byAgent[r.agentId].executions     += 1;
    }

    // Round all currency values
    for (const id of Object.keys(byAgent)) {
      byAgent[id].gross          = Math.round(byAgent[id].gross * 100) / 100;
      byAgent[id].platformFee    = Math.round(byAgent[id].platformFee * 100) / 100;
      byAgent[id].publisherShare = Math.round(byAgent[id].publisherShare * 100) / 100;
    }

    // Publisher's listed agents
    const publisherAgents = Array.from(agentCatalog.values())
      .filter(a => a.publisher === publisherId)
      .map(a => ({ agentId: a.agentId, name: a.name, version: a.version, deploymentCount: a.deploymentCount, rating: a.rating }));

    return res.json({
      ok: true,
      publisherId,
      revenue: {
        gross:          Math.round(totalGross * 100) / 100,
        platformFee:    Math.round(totalPlatformFee * 100) / 100,
        publisherShare: Math.round(totalPublisherShare * 100) / 100,
        feeRate:        PLATFORM_FEE_RATE,
        transactions:   records.length,
      },
      byAgent,
      agents: publisherAgents,
      phi:    PHI,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ─── Router Assembly ──────────────────────────────────────────────────────────

function marketplaceRouter() {
  try {
    const express = require('express');
    const router  = express.Router();
    router.post  ('/agents',                      registerAgent);
    router.get   ('/agents',                      browseAgents);
    router.get   ('/agents/:agentId',             getAgentDetails);
    router.post  ('/agents/:agentId/deploy',      deployAgent);
    router.get   ('/agents/:agentId/metrics',     getAgentMetrics);
    router.post  ('/agents/:agentId/review',      submitReview);
    router.get   ('/revenue/:publisherId',        getRevenuedashboard);
    return router;
  } catch {
    // Fallback: return route descriptors for non-Express environments
    return [
      { method: 'POST', path: '/agents',                      handler: registerAgent },
      { method: 'GET',  path: '/agents',                      handler: browseAgents },
      { method: 'GET',  path: '/agents/:agentId',             handler: getAgentDetails },
      { method: 'POST', path: '/agents/:agentId/deploy',      handler: deployAgent },
      { method: 'GET',  path: '/agents/:agentId/metrics',     handler: getAgentMetrics },
      { method: 'POST', path: '/agents/:agentId/review',      handler: submitReview },
      { method: 'GET',  path: '/revenue/:publisherId',        handler: getRevenuedashboard },
    ];
  }
}

module.exports = {
  marketplaceRouter,
  // Route handlers (for direct use / testing)
  registerAgent,
  browseAgents,
  getAgentDetails,
  deployAgent,
  getAgentMetrics,
  submitReview,
  getRevenueDashboard: getRevenuedashboard,
  // Internals (for testing / integration)
  recordUsage,
  splitRevenue,
  computeAgentRating,
  pollAgentHealth,
  startHealthMonitor,
  stopHealthMonitor,
  getEventBus,
  setEventBus,
  // Constants
  PLATFORM_FEE_RATE,
  PUBLISHER_SHARE,
  PHI_HEALTH,
  HEALTH_POLL_INTERVAL_MS,
  PHI,
  PSI,
  CSL,
};
