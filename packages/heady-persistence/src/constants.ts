/**
 * @fileoverview Heady Persistence Constants — phi-math foundation
 * @module @heady/persistence/constants
 * @version 1.0.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */

export const PHI = 1.618033988749895;
export const PSI = 0.6180339887498949;
export const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;

/** CSL confidence gates */
export const CSL = {
  MINIMUM: 0.500,
  LOW: 0.691,
  MEDIUM: 0.809,
  HIGH: 0.882,
  CRITICAL: 0.927,
  DEDUP: 0.972,
} as const;

/** Session configuration — phi-derived timings */
export const SESSION = {
  /** Session TTL: 24 hours in ms */
  TTL_MS: 24 * 60 * 60 * 1000,
  /** Refresh threshold: 61.8% of TTL remaining triggers refresh */
  REFRESH_THRESHOLD: PSI,
  /** Max concurrent sessions per user */
  MAX_SESSIONS: FIB[8], // 21
  /** Heartbeat interval: φ^3 seconds ≈ 4.236s */
  HEARTBEAT_INTERVAL_MS: Math.round(Math.pow(PHI, 3) * 1000),
  /** Reconnect base delay: 1s with phi-exponential backoff */
  RECONNECT_BASE_MS: 1000,
  /** Max reconnect attempts */
  MAX_RECONNECT_ATTEMPTS: FIB[7], // 13
} as const;

/** State sync configuration */
export const SYNC = {
  /** Batch size for state diff compression */
  BATCH_SIZE: FIB[8], // 21
  /** Offline queue max entries */
  OFFLINE_QUEUE_MAX: FIB[10], // 55
  /** Conflict resolution window in ms (φ^5 seconds ≈ 11.09s) */
  CONFLICT_WINDOW_MS: Math.round(Math.pow(PHI, 5) * 1000),
  /** State version compatibility range */
  COMPAT_RANGE: FIB[5], // 5 versions back
} as const;

/** Embedding dimensions for activity indexing */
export const EMBEDDING_DIM = 384;

/** Heady domains for cross-domain auth relay */
export const HEADY_DOMAINS = [
  'headyme.com',
  'headysystems.com',
  'headyconnection.org',
  'headybuddy.org',
  'headymcp.com',
  'headyio.com',
  'headybot.com',
  'headyapi.com',
  'heady-ai.com',
] as const;
