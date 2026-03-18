/**
 * PhiFibonacciRateLimiter — Hono + Express compatible rate limiting
 * All limits derived from Fibonacci sequence: 8,13,21,34,55,89,144,233,377,610,987
 * HeadySystems Inc. — src/middleware/rate-limiter.js
 */
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'rate-limiter' });
const PHI = 1.618033988749895;

// φ-Fibonacci rate limits by tier (requests per minute)
const TIER_LIMITS = {
  anonymous:  { rpm: 8,   burst: 13,  daily: 89,     window: 60 },
  free:       { rpm: 21,  burst: 34,  daily: 377,    window: 60 },
  basic:      { rpm: 55,  burst: 89,  daily: 1597,   window: 60 },
  pro:        { rpm: 144, burst: 233, daily: 6765,   window: 60 },
  enterprise: { rpm: 377, burst: 610, daily: 28657,  window: 60 },
  internal:   { rpm: 987, burst: 1597, daily: Infinity, window: 60 },
};

const ConfigSchema = z.object({
  getTierFn: z.function().optional(), // async (req) => tier string
  keyFn: z.function().optional(),     // async (req) => rate limit key string
  skipFn: z.function().optional(),    // async (req) => boolean (true = skip limiting)
  onLimited: z.function().optional(), // async (req, res, info) => void
  redis: z.any().optional(),          // Upstash Redis REST client
}).default({});

export default class PhiFibonacciRateLimiter {
  #env;
  #config;
  // In-memory fallback when Redis unavailable
  #memory = new Map();

  constructor(env, config = {}) {
    this.#env = env;
    this.#config = ConfigSchema.parse(config);
  }

  async #getKey(req) {
    if (this.#config.keyFn) return this.#config.keyFn(req);
    const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      ?? req.headers?.['cf-connecting-ip']
      ?? req.socket?.remoteAddress
      ?? 'unknown';
    const userId = req.user?.id ?? '';
    return `rl:${userId || ip}`;
  }

  async #getTier(req) {
    if (this.#config.getTierFn) return this.#config.getTierFn(req);
    // Extract from JWT claims or cookie session
    const tier = req.user?.subscription ?? req.headers?.['x-heady-tier'] ?? 'anonymous';
    return Object.keys(TIER_LIMITS).includes(tier) ? tier : 'anonymous';
  }

  async #increment(key, windowSeconds) {
    const upstash = this.#env.UPSTASH_REDIS_REST_URL;
    if (!upstash) {
      // In-memory fallback
      const now = Date.now();
      const bucket = Math.floor(now / (windowSeconds * 1000));
      const memKey = `${key}:${bucket}`;
      const count = (this.#memory.get(memKey) ?? 0) + 1;
      this.#memory.set(memKey, count);
      // Cleanup old buckets
      if (this.#memory.size > 10000) {
        const old = `${key}:${bucket - 2}`;
        this.#memory.delete(old);
      }
      return count;
    }

    // Upstash Redis: atomic INCR + EXPIRE
    const pipeline = [
      ['INCR', key],
      ['EXPIRE', key, windowSeconds],
    ];

    const resp = await fetch(`${upstash}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#env.UPSTASH_REDIS_REST_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });

    const data = await resp.json();
    return data[0]?.result ?? 1;
  }

  /**
   * Check if request is within rate limits
   * Returns { allowed: boolean, tier, limit, remaining, resetAt }
   */
  async check(req) {
    const [key, tier] = await Promise.all([this.#getKey(req), this.#getTier(req)]);
    const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.anonymous;

    const minuteKey = `${key}:min`;
    const count = await this.#increment(minuteKey, limits.window);
    const allowed = count <= limits.rpm;
    const remaining = Math.max(0, limits.rpm - count);
    const resetAt = new Date(Math.ceil(Date.now() / 60000) * 60000).toISOString();

    if (!allowed) {
      logger.warn({ key: key.slice(-16), tier, count, limit: limits.rpm }, 'rate_limited');
    }

    return { allowed, tier, limit: limits.rpm, burst: limits.burst, remaining, count, resetAt };
  }

  /**
   * Hono-compatible middleware
   * Usage: app.use(limiter.honoMiddleware())
   */
  honoMiddleware() {
    return async (c, next) => {
      if (this.#config.skipFn?.(c.req)) return next();

      const result = await this.check(c.req);

      c.header('X-RateLimit-Limit', String(result.limit));
      c.header('X-RateLimit-Remaining', String(result.remaining));
      c.header('X-RateLimit-Reset', result.resetAt);
      c.header('X-RateLimit-Tier', result.tier);

      if (!result.allowed) {
        if (this.#config.onLimited) {
          await this.#config.onLimited(c.req, c.res, result);
        }
        return c.json({
          error: 'rate_limit_exceeded',
          message: `Rate limit: ${result.limit} requests/minute for ${result.tier} tier`,
          tier: result.tier,
          retryAfter: result.resetAt,
          upgrade: result.tier !== 'enterprise' ? 'Upgrade your Heady tier for higher limits' : undefined,
          fibonacci_sequence: [8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987],
        }, 429);
      }

      return next();
    };
  }

  /**
   * Express-compatible middleware
   * Usage: app.use(limiter.middleware())
   */
  middleware() {
    return async (req, res, next) => {
      if (this.#config.skipFn?.(req)) return next();

      const result = await this.check(req);

      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt);
      res.setHeader('X-RateLimit-Tier', result.tier);

      if (!result.allowed) {
        return res.status(429).json({
          error: 'rate_limit_exceeded',
          message: `${result.tier} tier: ${result.limit} req/min`,
          retryAfter: result.resetAt,
        });
      }

      next();
    };
  }

  /** Get all tier limits (for API documentation) */
  static getTierLimits() {
    return TIER_LIMITS;
  }
}
