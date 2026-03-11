/**
 * φ (Golden Ratio) Mathematical Constants
 * Used for timing, rate limiting, and exponential backoff
 * φ = (1 + √5) / 2 ≈ 1.618033988749895
 */

const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_SQUARED = PHI * PHI; // ≈ 2.618033988749895
const PHI_CUBED = PHI * PHI * PHI; // ≈ 4.236067977499789

/**
 * Fibonacci sequence (generated using φ)
 * Used for rate limiting thresholds: 34, 55, 89, 144, 233...
 * Anonymous: 34 req/min
 * Authenticated: 89 req/min
 * Enterprise: 233 req/min
 */
export const FIBONACCI_SEQUENCE = {
  F1: 1,
  F2: 2,
  F3: 3,
  F4: 5,
  F5: 8,
  F6: 13,
  F7: 21,
  F8: 34, // Anonymous rate limit (requests per minute)
  F9: 55,
  F10: 89, // Authenticated rate limit (requests per minute)
  F11: 144,
  F12: 233, // Enterprise rate limit (requests per minute)
  F13: 377,
  F14: 610,
  F15: 987,
} as const;

/**
 * φ-scaled timing constants (milliseconds)
 * Exponential backoff using φ for distributed retry logic
 */
export const PHI_TIMING = {
  // Session TTL: 12 hours (φ-scaled approach: (12 * 60 * 60 * 1000) / φ²)
  SESSION_TTL_MS: Math.round((12 * 60 * 60 * 1000) / PHI_SQUARED), // ≈ 16,680,000ms (4.63 hours baseline)

  // Refresh token validity: 30 days
  REFRESH_TTL_MS: 30 * 24 * 60 * 60 * 1000,

  // Rate limit window: 1 minute
  RATE_LIMIT_WINDOW_MS: 60 * 1000,

  // Exponential backoff base (φ ms)
  BACKOFF_BASE_MS: Math.round(PHI * 1000), // ≈ 1618ms

  // Max backoff: φ² × 10 seconds
  MAX_BACKOFF_MS: Math.round(PHI_SQUARED * 10000), // ≈ 26,180ms

  // Request timeout: φ × 3 seconds
  REQUEST_TIMEOUT_MS: Math.round(PHI * 3000), // ≈ 4854ms

  // Token verification cache TTL: φ minutes
  TOKEN_CACHE_TTL_MS: Math.round(PHI * 60 * 1000), // ≈ 97,082ms
} as const;

/**
 * φ-scaled size constants
 * Used for pagination, batch sizes, and memory allocations
 */
export const PHI_SIZES = {
  // Maximum concurrent sessions per user (Fibonacci)
  MAX_SESSIONS_PER_USER: FIBONACCI_SEQUENCE.F8, // 34 sessions

  // Session cache batch size
  SESSION_BATCH_SIZE: FIBONACCI_SEQUENCE.F7, // 21 items

  // Maximum relay frames per domain
  MAX_RELAY_FRAMES: FIBONACCI_SEQUENCE.F6, // 13 frames

  // Connection pool size (φ-scaled)
  CONNECTION_POOL_SIZE: Math.round(PHI * 32), // ≈ 52 connections
} as const;

/**
 * Rate limit tiers using Fibonacci numbers
 * Reflects the golden ratio's natural harmony in resource allocation
 */
export const RATE_LIMIT_TIERS = {
  ANONYMOUS: {
    requestsPerMinute: FIBONACCI_SEQUENCE.F8, // 34
    requestsPerHour: FIBONACCI_SEQUENCE.F8 * 60, // 2,040
    description: 'Anonymous users',
  },
  AUTHENTICATED: {
    requestsPerMinute: FIBONACCI_SEQUENCE.F10, // 89
    requestsPerHour: FIBONACCI_SEQUENCE.F10 * 60, // 5,340
    description: 'Authenticated users',
  },
  ENTERPRISE: {
    requestsPerMinute: FIBONACCI_SEQUENCE.F12, // 233
    requestsPerHour: FIBONACCI_SEQUENCE.F12 * 60, // 13,980
    description: 'Enterprise customers',
  },
} as const;

/**
 * Calculate exponential backoff using φ
 * backoff = baseDelay × φ^attempt, capped at maxDelay
 */
export function calculatePhiBackoff(attempt: number): number {
  const backoff = PHI_TIMING.BACKOFF_BASE_MS * Math.pow(PHI, attempt);
  return Math.min(backoff, PHI_TIMING.MAX_BACKOFF_MS);
}

/**
 * Generate φ-based jitter (±10% of delay)
 * Prevents thundering herd in distributed systems
 */
export function addPhiJitter(delay: number): number {
  const jitterAmount = delay * 0.1; // ±10%
  const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
  return Math.max(1, delay + jitter);
}

/**
 * Export constants for rate limiting calculations
 */
export const GOLDEN_RATIO = PHI;
export const GOLDEN_RATIO_SQUARED = PHI_SQUARED;
export const GOLDEN_RATIO_CUBED = PHI_CUBED;

export default {
  FIBONACCI_SEQUENCE,
  PHI_TIMING,
  PHI_SIZES,
  RATE_LIMIT_TIERS,
  GOLDEN_RATIO,
  GOLDEN_RATIO_SQUARED,
  GOLDEN_RATIO_CUBED,
  calculatePhiBackoff,
  addPhiJitter,
};
