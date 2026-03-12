'use strict';

/**
 * HeadySystems Rate Limiter Middleware
 * Sliding window rate limiter with φ-scaled tiers and CSL-gated bypass
 * Copyright (c) 2024 HeadySystems
 */

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CLEANUP_INTERVAL = 60000;
const ENTRY_EXPIRY = FIB[8] * 60 * 1000;

const RATE_LIMIT_TIERS = {
  anonymous: {
    requestsPerMinute: FIB[9],
    requestsPerHour: FIB[9] * 60,
  },
  authenticated: {
    requestsPerMinute: FIB[11],
    requestsPerHour: FIB[11] * 60,
  },
  enterprise: {
    requestsPerMinute: FIB[12],
    requestsPerHour: FIB[12] * 60,
  },
};

const CSL_CRITICAL_THRESHOLD = 0.927;

class RateLimitStore {
  constructor() {
    this.store = new Map();
    this.cleanupTimer = null;
  }

  start() {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this._cleanup();
    }, CLEANUP_INTERVAL);

    this.cleanupTimer.unref();
  }

  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  _cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.createdAt > ENTRY_EXPIRY) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'rate_limit_cleanup',
          entriesRemoved: cleaned,
          storeSize: this.store.size,
        })
      );
    }
  }

  get(key) {
    const entry = this.store.get(key);

    if (entry && Date.now() - entry.createdAt > ENTRY_EXPIRY) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  set(key, value) {
    this.store.set(key, {
      ...value,
      createdAt: Date.now(),
    });
  }

  incrementRequest(key, tier = 'anonymous') {
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000) * 60000;
    const hourWindow = Math.floor(now / 3600000) * 3600000;

    let entry = this.get(key);

    if (!entry) {
      entry = {
        minuteRequests: [],
        hourRequests: [],
        createdAt: now,
      };
    }

    entry.minuteRequests = entry.minuteRequests.filter(
      (ts) => now - ts < 60000
    );
    entry.hourRequests = entry.hourRequests.filter((ts) => now - ts < 3600000);

    entry.minuteRequests.push(now);
    entry.hourRequests.push(now);
    entry.lastRequest = now;
    entry.tier = tier;

    this.set(key, entry);

    const limits = RATE_LIMIT_TIERS[tier];

    return {
      minuteCount: entry.minuteRequests.length,
      hourCount: entry.hourRequests.length,
      minuteLimit: limits.requestsPerMinute,
      hourLimit: limits.requestsPerHour,
      minuteReset: minuteWindow + 60000,
      hourReset: hourWindow + 3600000,
    };
  }

  getStatus(key, tier = 'anonymous') {
    const entry = this.get(key);

    if (!entry) {
      const limits = RATE_LIMIT_TIERS[tier];
      return {
        minuteCount: 0,
        hourCount: 0,
        minuteLimit: limits.requestsPerMinute,
        hourLimit: limits.requestsPerHour,
        isLimited: false,
      };
    }

    const now = Date.now();
    const minuteRequests = entry.minuteRequests.filter(
      (ts) => now - ts < 60000
    ).length;
    const hourRequests = entry.hourRequests.filter((ts) => now - ts < 3600000)
      .length;

    const limits = RATE_LIMIT_TIERS[tier];

    return {
      minuteCount: minuteRequests,
      hourCount: hourRequests,
      minuteLimit: limits.requestsPerMinute,
      hourLimit: limits.requestsPerHour,
      isLimited:
        minuteRequests >= limits.requestsPerMinute ||
        hourRequests >= limits.requestsPerHour,
    };
  }
}

const globalStore = new RateLimitStore();
globalStore.start();

function createRateLimiter(tier = 'anonymous') {
  if (!RATE_LIMIT_TIERS[tier]) {
    throw new Error(`Invalid tier: ${tier}. Must be one of: ${Object.keys(RATE_LIMIT_TIERS).join(', ')}`);
  }

  return (req, res, next) => {
    const cslConfidence = req.headers['x-csl-confidence'];
    const cslGate = parseFloat(cslConfidence) || 0;

    if (cslGate >= CSL_CRITICAL_THRESHOLD) {
      res.set('X-RateLimit-Bypass', 'CSL-CRITICAL');
      return next();
    }

    const identifier = _getIdentifier(req);
    const requestTier = _determineTier(req, tier);

    const status = globalStore.getStatus(identifier, requestTier);

    if (status.isLimited) {
      const resetTime = Math.ceil(
        (status.minuteLimit - status.minuteCount > 0
          ? 60000
          : 3600000) / 1000
      );

      res.status(429);
      res.set('X-RateLimit-Limit', status.minuteLimit);
      res.set('X-RateLimit-Remaining', Math.max(0, status.minuteLimit - status.minuteCount));
      res.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + resetTime);
      res.set('Retry-After', resetTime);

      return res.json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded for tier: ${requestTier}`,
        retryAfter: resetTime,
      });
    }

    const updated = globalStore.incrementRequest(identifier, requestTier);

    res.set('X-RateLimit-Limit', updated.minuteLimit);
    res.set('X-RateLimit-Remaining', Math.max(0, updated.minuteLimit - updated.minuteCount));
    res.set('X-RateLimit-Reset', Math.floor(updated.minuteReset / 1000));

    req.rateLimit = {
      tier: requestTier,
      identifier,
      minuteCount: updated.minuteCount,
      minuteLimit: updated.minuteLimit,
      hourCount: updated.hourCount,
      hourLimit: updated.hourLimit,
    };

    next();
  };
}

function _getIdentifier(req) {
  const apiKey = req.headers['x-api-key'];
  const userId = req.user?.id || req.headers['x-user-id'];

  if (apiKey) {
    return `api-key:${apiKey}`;
  }

  if (userId) {
    return `user:${userId}`;
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.ip ||
    req.connection.remoteAddress ||
    'unknown';

  return `ip:${ip}`;
}

function _determineTier(req, defaultTier) {
  if (req.user && req.user.tier) {
    return req.user.tier;
  }

  if (req.headers['x-tier']) {
    return req.headers['x-tier'];
  }

  if (req.headers['x-api-key']) {
    return 'authenticated';
  }

  if (req.user) {
    return 'authenticated';
  }

  return defaultTier;
}

function getRateLimitStats() {
  return {
    storeSize: globalStore.store.size,
    tiers: RATE_LIMIT_TIERS,
    cleanupInterval: CLEANUP_INTERVAL,
    entryExpiry: ENTRY_EXPIRY,
  };
}

module.exports = {
  createRateLimiter,
  RateLimitStore,
  getRateLimitStats,
  RATE_LIMIT_TIERS,
  CSL_CRITICAL_THRESHOLD,
  Constants: {
    PHI,
    PSI,
    FIB,
  },
};
