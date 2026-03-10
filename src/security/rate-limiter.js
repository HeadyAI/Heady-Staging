/**
 * Heady™ Rate Limiter — φ-Scaled Sliding Window
 * Fibonacci rate limits: fib(9)=34 anon, fib(11)=89 auth, fib(13)=233 enterprise
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const { fib, PHI, PSI, PHI_TIMING } = require('../shared/phi-math');

const TIERS = {
  anonymous:     { limit: fib(9),  windowMs: fib(10) * 1000 },  // 34 req / 55s
  authenticated: { limit: fib(11), windowMs: fib(10) * 1000 },  // 89 req / 55s
  enterprise:    { limit: fib(13), windowMs: fib(10) * 1000 },  // 233 req / 55s
};

class SlidingWindowRateLimiter {
  constructor() {
    this.windows = new Map();
  }
  
  check(key, tier = 'anonymous') {
    const config = TIERS[tier] || TIERS.anonymous;
    const now = Date.now();
    const window = this.windows.get(key) || { requests: [], windowStart: now };
    
    // Remove expired entries
    window.requests = window.requests.filter(ts => now - ts < config.windowMs);
    
    if (window.requests.length >= config.limit) {
      this.windows.set(key, window);
      return { allowed: false, remaining: 0, limit: config.limit, resetMs: config.windowMs - (now - window.requests[0]) };
    }
    
    window.requests.push(now);
    this.windows.set(key, window);
    return { allowed: true, remaining: config.limit - window.requests.length, limit: config.limit };
  }
  
  middleware(tierFn) {
    return (req, res, next) => {
      const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const tier = tierFn ? tierFn(req) : 'anonymous';
      const result = this.check(key, tier);
      
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      
      if (!result.allowed) {
        const retryFallbackMs = PHI_TIMING.BASE_INTERVAL;  // φ-derived base interval
        res.setHeader('Retry-After', Math.ceil((result.resetMs || retryFallbackMs) / retryFallbackMs));
        return res.status(429).json({ error: 'HEADY-RATE-429', message: 'Rate limit exceeded' });
      }
      next();
    };
  }
}

module.exports = { SlidingWindowRateLimiter, TIERS };
