export const PHI = 1.618033988749895;
export const PSI = 0.618033988749895;
export const FIBONACCI = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

export const CONNECTION_TIMEOUT_MS = Math.round(233 * 1000);
export const TOKEN_REVALIDATION_INTERVAL_MS = Math.round(144 * 1000);
export const WS_HEARTBEAT_INTERVAL_MS = Math.round(34 * 1000);
export const SSE_RECONNECT_DELAY_MS = Math.round(21 * 1000);
export const MAX_MESSAGE_QUEUE_SIZE = 89;
export const PORT = 3350;
export const HEALTH_CHECK_INTERVAL_MS = Math.round(55 * 1000);

export const LOG_LEVELS = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60
} as const;
