/**
 * Heady™ Rate Limiter Service v6.0
 * Port 3356 — Sliding window rate limiting for Envoy gateway
 * Token bucket + sliding window hybrid with phi-scaled limits
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const http = require('http');
const { createLogger } = require('../../../shared/logger');
const { HealthProbe } = require('../../../shared/health');
const {
  PHI, PSI, fib, phiBackoffWithJitter,
  CSL_THRESHOLDS, SERVICE_PORTS, TIMING,
} = require('../../../shared/phi-math');

const logger = createLogger('rate-limiter');
const PORT = SERVICE_PORTS.HEADY_RATE_LIMITER || 3356;

// ═══════════════════════════════════════════════════════════
// RATE LIMIT TIERS — Phi-Scaled
// ═══════════════════════════════════════════════════════════

const RATE_LIMITS = Object.freeze({
  // Per-IP limits (requests per window)
  anonymous: {
    windowMs: fib(9) * 1000,          // 34s window
    maxRequests: fib(10),               // 55 requests per window
    burstMax: fib(11),                  // 89 burst capacity
    penaltyDurationMs: fib(12) * 1000,  // 144s penalty
  },
  authenticated: {
    windowMs: fib(9) * 1000,
    maxRequests: fib(12),               // 144 requests per window
    burstMax: fib(13),                  // 233 burst
    penaltyDurationMs: fib(11) * 1000,
  },
  service: {
    windowMs: fib(8) * 1000,           // 21s window
    maxRequests: fib(14),               // 377 requests per window
    burstMax: fib(15),                  // 610 burst
    penaltyDurationMs: fib(10) * 1000,
  },

  // Per-endpoint overrides
  endpoints: {
    '/api/inference': { windowMs: fib(9) * 1000, maxRequests: fib(8) },  // 21 per 34s
    '/api/embedding': { windowMs: fib(9) * 1000, maxRequests: fib(9) },  // 34 per 34s
    '/api/auth/login': { windowMs: fib(10) * 1000, maxRequests: fib(5) }, // 5 per 55s
    '/api/auth/register': { windowMs: fib(11) * 1000, maxRequests: fib(4) }, // 3 per 89s
  },
});

// ═══════════════════════════════════════════════════════════
// SLIDING WINDOW COUNTER
// ═══════════════════════════════════════════════════════════

class SlidingWindowCounter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.windows = new Map();  // key -> { current: count, previous: count, currentStart: timestamp }
    this.cleanupInterval = null;
  }

  isAllowed(key) {
    const now = Date.now();
    let record = this.windows.get(key);

    if (!record) {
      record = { current: 0, previous: 0, currentStart: now };
      this.windows.set(key, record);
    }

    // Slide window
    const elapsed = now - record.currentStart;
    if (elapsed >= this.windowMs) {
      const windowsPassed = Math.floor(elapsed / this.windowMs);
      if (windowsPassed >= 2) {
        record.previous = 0;
        record.current = 0;
      } else {
        record.previous = record.current;
        record.current = 0;
      }
      record.currentStart = now - (elapsed % this.windowMs);
    }

    // Weighted count: previous window's remaining fraction + current
    const previousWeight = 1 - (now - record.currentStart) / this.windowMs;
    const estimatedCount = record.previous * previousWeight + record.current;

    if (estimatedCount >= this.maxRequests) {
      return {
        allowed: false,
        current: Math.ceil(estimatedCount),
        limit: this.maxRequests,
        remaining: 0,
        retryAfterMs: Math.ceil(this.windowMs - (now - record.currentStart)),
      };
    }

    record.current++;
    return {
      allowed: true,
      current: Math.ceil(estimatedCount) + 1,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - Math.ceil(estimatedCount) - 1),
      retryAfterMs: 0,
    };
  }

  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = this.windowMs * 3;
      for (const [key, record] of this.windows) {
        if (now - record.currentStart > staleThreshold) {
          this.windows.delete(key);
        }
      }
    }, this.windowMs * 2);

    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  getStats() {
    return {
      trackedKeys: this.windows.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    };
  }

  destroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.windows.clear();
  }
}

// ═══════════════════════════════════════════════════════════
// PENALTY TRACKER — Temporary bans for abusive clients
// ═══════════════════════════════════════════════════════════

class PenaltyTracker {
  constructor() {
    this.penalties = new Map();  // key -> { until: timestamp, violations: count }
    this.totalPenalties = 0;
  }

  isPenalized(key) {
    const penalty = this.penalties.get(key);
    if (!penalty) return false;

    if (Date.now() >= penalty.until) {
      this.penalties.delete(key);
      return false;
    }
    return true;
  }

  addViolation(key, durationMs) {
    const existing = this.penalties.get(key);
    const violations = existing ? existing.violations + 1 : 1;

    // Phi-scaled escalation: duration * PHI^violations
    const escalatedDuration = durationMs * Math.pow(PHI, Math.min(violations - 1, fib(5)));

    this.penalties.set(key, {
      until: Date.now() + escalatedDuration,
      violations,
    });
    this.totalPenalties++;

    logger.warn({
      message: 'Rate limit penalty applied',
      key: _anonymizeKey(key),
      violations,
      durationMs: Math.round(escalatedDuration),
    });
  }

  getStats() {
    return {
      activePenalties: this.penalties.size,
      totalPenalties: this.totalPenalties,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// RATE LIMITER SERVICE
// ═══════════════════════════════════════════════════════════

class RateLimiterService {
  constructor() {
    this.limiters = new Map();
    this.penaltyTracker = new PenaltyTracker();
    this.server = null;
    this.health = new HealthProbe('rate-limiter');
    this.totalChecks = 0;
    this.totalDenied = 0;

    // Initialize limiters for each tier
    for (const [tier, config] of Object.entries(RATE_LIMITS)) {
      if (tier === 'endpoints') continue;
      const limiter = new SlidingWindowCounter(config.windowMs, config.maxRequests);
      limiter.startCleanup();
      this.limiters.set(tier, limiter);
    }

    // Endpoint-specific limiters
    for (const [endpoint, config] of Object.entries(RATE_LIMITS.endpoints)) {
      const limiter = new SlidingWindowCounter(config.windowMs, config.maxRequests);
      limiter.startCleanup();
      this.limiters.set(`endpoint:${endpoint}`, limiter);
    }
  }

  async start() {
    this.server = http.createServer((req, res) => this._handleRequest(req, res));

    return new Promise((resolve) => {
      this.server.listen(PORT, () => {
        logger.info({ message: 'Rate Limiter started', port: PORT });
        this.health.markReady();
        resolve();
      });
    });
  }

  _handleRequest(req, res) {
    const url = new URL(req.url, `http://${process.env.HOST || "localhost"}:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return this._respondJson(res, 200, this.health.getStatus());
    }

    if (req.method === 'GET' && url.pathname === '/stats') {
      return this._respondJson(res, 200, this.getStats());
    }

    // Envoy rate limit check endpoint
    if (req.method === 'POST' && url.pathname === '/check') {
      return this._handleCheck(req, res);
    }

    // Envoy external authorization
    if (req.method === 'POST' && url.pathname === '/envoy/ratelimit') {
      return this._handleEnvoyRateLimit(req, res);
    }

    this._respondJson(res, 404, { error: 'Not found' });
  }

  async _handleCheck(req, res) {
    const body = await this._readBody(req);
    const { clientIp, tier, endpoint, userId } = JSON.parse(body);

    this.totalChecks++;

    const key = userId || clientIp || 'unknown';
    const resolvedTier = tier || 'anonymous';

    // Check penalty first
    if (this.penaltyTracker.isPenalized(key)) {
      this.totalDenied++;
      return this._respondJson(res, 429, {
        allowed: false,
        reason: 'penalized',
        retryAfterMs: 0,
        headers: this._buildHeaders(null, true),
      });
    }

    // Check endpoint-specific limit
    if (endpoint && this.limiters.has(`endpoint:${endpoint}`)) {
      const endpointResult = this.limiters.get(`endpoint:${endpoint}`).isAllowed(key);
      if (!endpointResult.allowed) {
        this.totalDenied++;
        this._maybeApplyPenalty(key, resolvedTier);
        return this._respondJson(res, 429, {
          allowed: false,
          reason: 'endpoint_limit',
          ...endpointResult,
          headers: this._buildHeaders(endpointResult, false),
        });
      }
    }

    // Check tier limit
    const limiter = this.limiters.get(resolvedTier);
    if (!limiter) {
      return this._respondJson(res, 200, { allowed: true });
    }

    const result = limiter.isAllowed(key);
    if (!result.allowed) {
      this.totalDenied++;
      this._maybeApplyPenalty(key, resolvedTier);
    }

    const statusCode = result.allowed ? 200 : 429;
    this._respondJson(res, statusCode, {
      ...result,
      headers: this._buildHeaders(result, false),
    });
  }

  async _handleEnvoyRateLimit(req, res) {
    // Envoy Rate Limit Service v3 API compatibility
    const body = await this._readBody(req);
    const request = JSON.parse(body);

    const descriptors = request.descriptors || [];
    let allowed = true;
    let limitResult = null;

    for (const descriptor of descriptors) {
      const entries = descriptor.entries || [];
      let key = '';
      let tier = 'anonymous';
      let endpoint = null;

      for (const entry of entries) {
        if (entry.key === 'remote_address') key = entry.value;
        if (entry.key === 'header_match' && entry.value === 'authenticated') tier = 'authenticated';
        if (entry.key === 'header_match' && entry.value === 'service') tier = 'service';
        if (entry.key === 'request_path') endpoint = entry.value;
      }

      if (!key) continue;

      const limiter = this.limiters.get(tier);
      if (limiter) {
        const result = limiter.isAllowed(key);
        if (!result.allowed) {
          allowed = false;
          limitResult = result;
          break;
        }
      }
    }

    this._respondJson(res, 200, {
      overall_code: allowed ? 'OK' : 'OVER_LIMIT',
      statuses: [{
        code: allowed ? 'OK' : 'OVER_LIMIT',
        current_limit: limitResult ? { requests_per_unit: limitResult.limit } : null,
        limit_remaining: limitResult ? limitResult.remaining : null,
      }],
    });
  }

  _maybeApplyPenalty(key, tier) {
    const config = RATE_LIMITS[tier] || RATE_LIMITS.anonymous;
    this.penaltyTracker.addViolation(key, config.penaltyDurationMs);
  }

  _buildHeaders(result, penalized) {
    if (penalized) {
      return {
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'Retry-After': String(fib(12)),  // 144 seconds
      };
    }
    if (!result) return {};
    return {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': result.retryAfterMs > 0 ? String(Math.ceil(result.retryAfterMs / 1000)) : undefined,
      'Retry-After': result.retryAfterMs > 0 ? String(Math.ceil(result.retryAfterMs / 1000)) : undefined,
    };
  }

  getStats() {
    const limiterStats = {};
    for (const [name, limiter] of this.limiters) {
      limiterStats[name] = limiter.getStats();
    }

    return {
      totalChecks: this.totalChecks,
      totalDenied: this.totalDenied,
      denyRate: this.totalChecks > 0 ? this.totalDenied / this.totalChecks : 0,
      penalties: this.penaltyTracker.getStats(),
      limiters: limiterStats,
    };
  }

  _respondJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  _readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
  }

  async shutdown() {
    for (const [, limiter] of this.limiters) {
      limiter.destroy();
    }
    if (this.server) {
      await new Promise(resolve => this.server.close(resolve));
    }
    logger.info({ message: 'Rate Limiter shut down' });
  }
}

function _anonymizeKey(key) {
  if (key.includes('.')) {
    const parts = key.split('.');
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return key.slice(0, fib(6)) + '...';  // 8 chars
}

// ═══════════════════════════════════════════════════════════
// STANDALONE
// ═══════════════════════════════════════════════════════════

if (require.main === module) {
  const service = new RateLimiterService();
  service.start().catch(err => {
    logger.error({ message: 'Rate Limiter startup failed', error: err.message });
    process.exit(1);
  });

  process.on('SIGTERM', async () => { await service.shutdown(); process.exit(0); });
  process.on('SIGINT', async () => { await service.shutdown(); process.exit(0); });
}

module.exports = { RateLimiterService, RATE_LIMITS, SlidingWindowCounter };
