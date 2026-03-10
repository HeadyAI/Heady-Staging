'use strict';

/**
 * φ-scaled rate limits per tier (requests per minute).
 * FIB[9]  = 34  → anonymous
 * FIB[11] = 89  → authenticated (builder)
 * FIB[13] = 233 → enterprise
 */
const RATE_LIMITS = {
  anonymous: 34,
  explorer: 34,
  builder: 89,
  enterprise: 233,
};

/**
 * API usage metering and rate limiting.
 */
class Metering {
  /**
   * @param {object} params
   * @param {object} params.log — structured logger
   */
  constructor({ log }) {
    this._log = log;
    /** @type {Map<string, { count: number, windowStart: number }>} userId → rate window */
    this._rateWindows = new Map();
    /** @type {Map<string, { daily: number, dayStart: number }>} userId → daily counter */
    this._dailyCounters = new Map();
    /** @type {Map<string, string>} userId → planId */
    this._userPlans = new Map();

    // Clean up stale entries periodically (every 60s)
    this._cleanupTimer = setInterval(() => this._cleanup(), 60000);
  }

  /**
   * Stop the cleanup timer.
   */
  stop() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  /**
   * Set the plan for a user.
   *
   * @param {string} userId
   * @param {string} planId
   */
  setUserPlan(userId, planId) {
    this._userPlans.set(userId, planId);
  }

  /**
   * Get the plan for a user.
   *
   * @param {string} userId
   * @returns {string}
   */
  getUserPlan(userId) {
    return this._userPlans.get(userId) || 'anonymous';
  }

  /**
   * Get the rate limit for a user's plan.
   *
   * @param {string} userId
   * @returns {number} requests per minute
   */
  getRateLimit(userId) {
    const plan = this.getUserPlan(userId);
    return RATE_LIMITS[plan] || RATE_LIMITS.anonymous;
  }

  /**
   * Check if a request is within the rate limit.
   * Returns { allowed, remaining, resetAt } without incrementing.
   *
   * @param {string} userId
   * @returns {{ allowed: boolean, remaining: number, limit: number, resetAt: number }}
   */
  checkRateLimit(userId) {
    const limit = this.getRateLimit(userId);
    const now = Date.now();
    let window = this._rateWindows.get(userId);

    if (!window || now - window.windowStart > 60000) {
      return { allowed: true, remaining: limit, limit, resetAt: now + 60000 };
    }

    const remaining = Math.max(0, limit - window.count);
    return {
      allowed: remaining > 0,
      remaining,
      limit,
      resetAt: window.windowStart + 60000,
    };
  }

  /**
   * Record an API call and check rate limit.
   * Returns whether the request is allowed.
   *
   * @param {string} userId
   * @returns {{ allowed: boolean, remaining: number, limit: number, resetAt: number }}
   */
  recordRequest(userId) {
    const limit = this.getRateLimit(userId);
    const now = Date.now();

    // Rate limiting (per minute)
    let window = this._rateWindows.get(userId);
    if (!window || now - window.windowStart > 60000) {
      window = { count: 0, windowStart: now };
      this._rateWindows.set(userId, window);
    }

    if (window.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt: window.windowStart + 60000,
      };
    }

    window.count++;

    // Daily counter
    const todayStart = new Date().setHours(0, 0, 0, 0);
    let daily = this._dailyCounters.get(userId);
    if (!daily || daily.dayStart !== todayStart) {
      daily = { daily: 0, dayStart: todayStart };
      this._dailyCounters.set(userId, daily);
    }
    daily.daily++;

    return {
      allowed: true,
      remaining: limit - window.count,
      limit,
      resetAt: window.windowStart + 60000,
    };
  }

  /**
   * Get daily usage for a user.
   *
   * @param {string} userId
   * @returns {{ used: number, limit: number, remaining: number }}
   */
  getDailyUsage(userId) {
    const plan = this.getUserPlan(userId);
    const { PLANS } = require('./plans');
    const planDef = PLANS[plan] || PLANS.explorer;
    const dailyLimit = planDef.apiCallsPerDay;

    const todayStart = new Date().setHours(0, 0, 0, 0);
    const daily = this._dailyCounters.get(userId);
    const used = (daily && daily.dayStart === todayStart) ? daily.daily : 0;

    return {
      used,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - used),
    };
  }

  /**
   * Get usage stats for a user.
   *
   * @param {string} userId
   * @returns {object}
   */
  getUserStats(userId) {
    return {
      plan: this.getUserPlan(userId),
      rateLimit: this.checkRateLimit(userId),
      dailyUsage: this.getDailyUsage(userId),
    };
  }

  /**
   * Create Express middleware for rate limiting.
   *
   * @param {Function} [getUserId] — extract user ID from req (defaults to req.user?.uid or IP)
   * @returns {Function} Express middleware
   */
  createMiddleware(getUserId) {
    const extractId = getUserId || ((req) => req.user?.uid || req.ip || 'anonymous');

    return (req, res, next) => {
      const userId = extractId(req);
      const result = this.recordRequest(userId);

      res.set('X-RateLimit-Limit', String(result.limit));
      res.set('X-RateLimit-Remaining', String(result.remaining));
      res.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

      if (!result.allowed) {
        this._log.warn('Rate limit exceeded', { userId, limit: result.limit });
        res.status(429).json({
          code: 'HEADY-BILLING-001',
          message: 'Rate limit exceeded',
          limit: result.limit,
          resetAt: new Date(result.resetAt).toISOString(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  }

  /**
   * Clean up stale rate windows and daily counters.
   */
  _cleanup() {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    for (const [key, window] of this._rateWindows) {
      if (now - window.windowStart > 120000) {
        this._rateWindows.delete(key);
      }
    }

    for (const [key, daily] of this._dailyCounters) {
      if (daily.dayStart < todayStart) {
        this._dailyCounters.delete(key);
      }
    }
  }
}

module.exports = {
  Metering,
  RATE_LIMITS,
};
