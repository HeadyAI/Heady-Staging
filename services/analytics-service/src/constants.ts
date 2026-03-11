export const PHI = 1.618033988749895;
export const PSI = 0.618033988749895;
export const FIBONACCI = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

export const PORT = 3360;
export const HEALTH_CHECK_INTERVAL_MS = Math.round(55 * 1000);
export const EVENT_FLUSH_INTERVAL_MS = Math.round(89 * 1000);
export const BATCH_SIZE = 233;
export const EVENT_RETENTION_HOURS = 8;
export const FUNNEL_ANALYSIS_WINDOW_MS = Math.round(233 * 60 * 1000);
export const METRICS_AGGREGATION_INTERVAL_MS = Math.round(144 * 1000);

export const LOG_LEVELS = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60
} as const;

export const PRIVACY_SETTINGS = {
  HASH_USER_IDS: true,
  RETENTION_DAYS: 30,
  MIN_EVENTS_FOR_AGGREGATION: 5,
  ANONYMIZE_IP: true
} as const;
