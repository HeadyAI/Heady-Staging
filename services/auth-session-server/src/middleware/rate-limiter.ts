import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import {
  RATE_LIMIT_TIERS,
  PHI_TIMING,
  calculatePhiBackoff,
  addPhiJitter,
} from '../utils/phi-config.js';

const logger = createLogger('RateLimiter');

/**
 * In-memory rate limit store
 * Maps client fingerprint -> { count, resetTime }
 * In production, use Redis for distributed systems
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
  tier: 'anonymous' | 'authenticated' | 'enterprise';
  attempts: number; // For backoff calculation
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Generate client fingerprint from request
 * Combines IP address and User-Agent hash
 */
function generateClientFingerprint(req: Request): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';

  const userAgent = req.headers['user-agent'] || 'unknown';

  // Simple hash function for demonstration
  // In production, use crypto.createHash('sha256')
  let hash = 0;
  const str = `${ip}-${userAgent}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `${ip}:${Math.abs(hash).toString(36)}`;
}

/**
 * Determine rate limit tier based on request context
 */
function determineTier(req: Request): 'anonymous' | 'authenticated' | 'enterprise' {
  // Check for Firebase ID token (indicates authenticated user)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return 'authenticated';
  }

  // Check for existing session cookie
  const sessionCookie = req.cookies?.__heady_session;
  if (sessionCookie) {
    return 'authenticated';
  }

  // Check for enterprise API key header
  const apiKey = req.headers['x-heady-api-key'];
  if (apiKey && typeof apiKey === 'string' && apiKey.startsWith('heady_')) {
    return 'enterprise';
  }

  return 'anonymous';
}

/**
 * Clean up expired rate limit records (garbage collection)
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Rate limit cleanup', { cleaned, remaining: rateLimitStore.size });
  }
}

/**
 * φ-scaled rate limiting middleware
 * Uses Fibonacci numbers for request limits:
 * - Anonymous: 34 req/min
 * - Authenticated: 89 req/min
 * - Enterprise: 233 req/min
 */
export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const fingerprint = generateClientFingerprint(req);
    const tier = determineTier(req);
    const tierConfig = RATE_LIMIT_TIERS[tier.toUpperCase() as keyof typeof RATE_LIMIT_TIERS];

    const now = Date.now();
    let record = rateLimitStore.get(fingerprint);

    // Initialize or reset record if window expired
    if (!record || record.resetTime < now) {
      record = {
        count: 0,
        resetTime: now + PHI_TIMING.RATE_LIMIT_WINDOW_MS,
        tier,
        attempts: 0,
      };
      rateLimitStore.set(fingerprint, record);
    }

    // Update tier if changed (e.g., user authenticated)
    record.tier = tier;

    // Check if limit exceeded
    if (record.count >= tierConfig.requestsPerMinute) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      const backoffMs = calculatePhiBackoff(record.attempts);
      const jitteredBackoff = addPhiJitter(backoffMs);

      logger.warn('Rate limit exceeded', {
        fingerprint,
        tier,
        limit: tierConfig.requestsPerMinute,
        retryAfter,
        backoffMs: Math.round(jitteredBackoff),
      });

      res.set('X-RateLimit-Limit', tierConfig.requestsPerMinute.toString());
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', record.resetTime.toString());
      res.set('X-Retry-After', retryAfter.toString());
      res.set('Retry-After', retryAfter.toString());

      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit of ${tierConfig.requestsPerMinute} requests per minute exceeded for ${tier} users`,
        retryAfter,
        backoffMs: Math.round(jitteredBackoff),
      });

      return;
    }

    // Increment request count
    record.count++;
    record.attempts++;

    // Set rate limit headers
    const remaining = tierConfig.requestsPerMinute - record.count;
    const resetTime = record.resetTime;

    res.set('X-RateLimit-Limit', tierConfig.requestsPerMinute.toString());
    res.set('X-RateLimit-Remaining', remaining.toString());
    res.set('X-RateLimit-Reset', resetTime.toString());

    // Log high usage (above 80% of limit)
    if (record.count >= tierConfig.requestsPerMinute * 0.8) {
      logger.debug('Rate limit approaching', {
        fingerprint,
        tier,
        count: record.count,
        limit: tierConfig.requestsPerMinute,
        percentUsed: ((record.count / tierConfig.requestsPerMinute) * 100).toFixed(1),
      });
    }

    next();
  } catch (error) {
    logger.error('Rate limiter error', { error });
    // On error, allow request to proceed (fail open)
    next();
  }
}

/**
 * Periodic cleanup task (call every 5 minutes)
 */
export function startRateLimitCleanup(): NodeJS.Timer {
  return setInterval(() => {
    cleanupExpiredRecords();
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Get rate limit stats (for monitoring)
 */
export function getRateLimitStats() {
  const now = Date.now();
  const active = Array.from(rateLimitStore.values()).filter(
    (r) => r.resetTime > now,
  );

  const statsByTier = {
    anonymous: active.filter((r) => r.tier === 'anonymous').length,
    authenticated: active.filter((r) => r.tier === 'authenticated').length,
    enterprise: active.filter((r) => r.tier === 'enterprise').length,
  };

  return {
    totalActive: active.length,
    totalStored: rateLimitStore.size,
    byTier: statsByTier,
  };
}

/**
 * Reset rate limits (for testing/admin)
 */
export function resetRateLimits(): void {
  rateLimitStore.clear();
  logger.info('Rate limits reset');
}

export default {
  rateLimitMiddleware,
  startRateLimitCleanup,
  getRateLimitStats,
  resetRateLimits,
};
