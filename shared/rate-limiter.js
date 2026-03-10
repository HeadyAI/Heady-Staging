/**
 * Heady™ Rate Limiter Middleware — φ-Scaled Sliding Windows
 * Per-IP and per-route rate limiting with Fibonacci-bucketed windows
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */

'use strict';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;

// Fibonacci-derived window sizes (seconds)
const WINDOW_SIZES = {
    tight: 13,   // Fib(7) — auth/login endpoints
    standard: 55,   // Fib(10) — normal API routes
    relaxed: 89,   // Fib(11) — public/read endpoints
};

// Fibonacci-derived rate limits (requests per window)
const RATE_LIMITS = {
    tight: 21,   // Fib(8)
    standard: 89,   // Fib(11)
    relaxed: 233,  // Fib(13)
};

/**
 * In-memory sliding window counter.
 * For production, swap with Redis SLOGGING WINDOW.
 */
class SlidingWindowCounter {
    constructor() {
        this._buckets = new Map(); // key → { count, resetAt }
    }

    /**
     * Check and increment counter.
     * @param {string} key - e.g. IP + route
     * @param {number} windowMs - window size in ms
     * @param {number} limit - max requests in window
     * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
     */
    check(key, windowMs, limit) {
        const now = Date.now();
        let bucket = this._buckets.get(key);

        if (!bucket || now >= bucket.resetAt) {
            bucket = { count: 0, resetAt: now + windowMs };
            this._buckets.set(key, bucket);
        }

        bucket.count++;

        // Periodic cleanup (every Fib 233 entries)
        if (this._buckets.size > 233 * 8) {
            for (const [k, b] of this._buckets) {
                if (now >= b.resetAt) this._buckets.delete(k);
            }
        }

        return {
            allowed: bucket.count <= limit,
            remaining: Math.max(0, limit - bucket.count),
            resetAt: bucket.resetAt,
            total: limit,
        };
    }
}

const _counter = new SlidingWindowCounter();

/**
 * Express rate limiter middleware factory.
 * @param {object} [opts]
 * @param {'tight'|'standard'|'relaxed'} [opts.tier='standard'] - rate limit tier
 * @param {number} [opts.windowMs] - override window size in ms
 * @param {number} [opts.maxRequests] - override max requests per window
 * @param {Function} [opts.keyGenerator] - custom key generator (req → string)
 * @param {boolean} [opts.skipSuccessful=false] - don't count successful responses
 */
function rateLimiter(opts = {}) {
    const tier = opts.tier || 'standard';
    const windowMs = opts.windowMs || (WINDOW_SIZES[tier] || WINDOW_SIZES.standard) * 1000;
    const maxRequests = opts.maxRequests || RATE_LIMITS[tier] || RATE_LIMITS.standard;
    const keyGen = opts.keyGenerator || defaultKeyGenerator;

    return (req, res, next) => {
        const key = keyGen(req);
        const result = _counter.check(key, windowMs, maxRequests);

        // Standard rate limit headers (RFC 6585 / IETF draft)
        res.setHeader('X-RateLimit-Limit', result.total);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

        if (!result.allowed) {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            res.setHeader('Retry-After', retryAfter);
            return res.status(429).json({
                error: 'Too many requests',
                retryAfter,
                limit: result.total,
                windowMs,
            });
        }

        next();
    };
}

/**
 * Default key generator: IP + route prefix.
 * Uses Cloudflare CF-Connecting-IP when available.
 */
function defaultKeyGenerator(req) {
    const ip = req.headers['cf-connecting-ip']
        || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.ip
        || req.socket?.remoteAddress
        || 'unknown';
    const route = req.route?.path || req.originalUrl?.split('?')[0] || '/';
    return `${ip}:${route}`;
}

module.exports = {
    rateLimiter,
    WINDOW_SIZES,
    RATE_LIMITS,
    SlidingWindowCounter,
};
