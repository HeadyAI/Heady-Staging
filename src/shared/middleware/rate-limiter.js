'use strict';

/**
 * Sliding window rate limiter with φ-scaled tier limits.
 *
 * FIB[9]  = 34  → anonymous requests/min
 * FIB[11] = 89  → authenticated requests/min
 * FIB[13] = 233 → enterprise requests/min
 */

const TIER_LIMITS = {
  anonymous: 34,   // FIB[9]
  authenticated: 89, // FIB[11]
  enterprise: 233,   // FIB[13]
};

const WINDOW_MS = 60000; // 1 minute sliding window

/**
 * In-memory sliding window rate limiter.
 */
class SlidingWindowRateLimiter {
  /**
   * @param {object} [options]
   * @param {number} [options.windowMs=60000]
   * @param {object} [options.tierLimits]
   */
  constructor(options = {}) {
    this._windowMs = options.windowMs || WINDOW_MS;
    this._tierLimits = { ...TIER_LIMITS, ...options.tierLimits };
    /** @type {Map<string, number[]>} key → array of request timestamps */
    this._windows = new Map();
    this._cleanupTimer = setInterval(() => this._cleanup(), this._windowMs * 2);
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
   * Check and record a request. Returns rate limit info.
   *
   * @param {string} key — identifier (userId, IP, etc.)
   * @param {string} [tier='anonymous'] — rate limit tier
   * @returns {{ allowed: boolean, remaining: number, limit: number, resetAt: number, retryAfter: number|null }}
   */
  hit(key, tier = 'anonymous') {
    const now = Date.now();
    const limit = this._tierLimits[tier] || this._tierLimits.anonymous;
    const windowStart = now - this._windowMs;

    let timestamps = this._windows.get(key);
    if (!timestamps) {
      timestamps = [];
      this._windows.set(key, timestamps);
    }

    // Remove expired entries
    while (timestamps.length > 0 && timestamps[0] <= windowStart) {
      timestamps.shift();
    }

    if (timestamps.length >= limit) {
      const oldestInWindow = timestamps[0];
      const resetAt = oldestInWindow + this._windowMs;
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    }

    timestamps.push(now);
    const remaining = limit - timestamps.length;

    return {
      allowed: true,
      remaining,
      limit,
      resetAt: now + this._windowMs,
      retryAfter: null,
    };
  }

  /**
   * Get current usage for a key.
   *
   * @param {string} key
   * @returns {number} current request count in window
   */
  getCount(key) {
    const timestamps = this._windows.get(key);
    if (!timestamps) return 0;
    const windowStart = Date.now() - this._windowMs;
    return timestamps.filter((t) => t > windowStart).length;
  }

  /**
   * Remove stale entries.
   */
  _cleanup() {
    const cutoff = Date.now() - this._windowMs * 2;
    for (const [key, timestamps] of this._windows) {
      while (timestamps.length > 0 && timestamps[0] <= cutoff) {
        timestamps.shift();
      }
      if (timestamps.length === 0) {
        this._windows.delete(key);
      }
    }
  }
}

/**
 * Create Express rate limiting middleware.
 *
 * @param {object} [options]
 * @param {Function} [options.keyFn] — extract key from req (default: req.user?.uid || req.ip)
 * @param {Function} [options.tierFn] — extract tier from req (default: based on req.user)
 * @param {SlidingWindowRateLimiter} [options.limiter] — custom limiter instance
 * @returns {Function} Express middleware
 */
function createRateLimitMiddleware(options = {}) {
  const limiter = options.limiter || new SlidingWindowRateLimiter(options);

  const keyFn = options.keyFn || ((req) => req.user?.uid || req.ip || 'anonymous');
  const tierFn = options.tierFn || ((req) => {
    if (!req.user) return 'anonymous';
    if (req.user.plan === 'enterprise') return 'enterprise';
    return 'authenticated';
  });

  return function rateLimitMiddleware(req, res, next) {
    const key = keyFn(req);
    const tier = tierFn(req);
    const result = limiter.hit(key, tier);

    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfter));
      res.status(429).json({
        code: 'HEADY-RATE-001',
        message: 'Rate limit exceeded',
        limit: result.limit,
        retryAfter: result.retryAfter,
        resetAt: new Date(result.resetAt).toISOString(),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

module.exports = {
  SlidingWindowRateLimiter,
  createRateLimitMiddleware,
  TIER_LIMITS,
  WINDOW_MS,
};
