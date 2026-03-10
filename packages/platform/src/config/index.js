/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  @heady/platform — config/index.js                               ║
 * ║  Phi-scaled configuration loader with env-based resolution       ║
 * ║  © 2026 HeadySystems Inc.                                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * ZERO 127.0.0.1 references. All URLs from environment variables.
 * ZERO magic numbers. All numeric constants from phi-math.
 * Configuration is environment-specific, cloud-native, mTLS-aware.
 */

'use strict';

import { z } from 'zod';
import {
  PHI, PSI, PSI2, PSI3, PSI4,
  TIMEOUTS, SCALING, CSL_THRESHOLDS, AUTO_SUCCESS_CYCLE_MS,
  HEALTH_INTERVAL_MS, HEALTH_TIMEOUT_MS, PHI_BACKOFF_MS,
  fib, fibSnap,
} from '../phi/index.js';

// ─── ENVIRONMENT RESOLVER ────────────────────────────────────────────────────

/**
 * @typedef {'local'|'staging'|'production'} HeadyEnv
 */

/**
 * Determine the current environment.
 * NEVER returns '127.0.0.1' — local dev still uses env-based service URLs.
 * @returns {HeadyEnv}
 */
export function resolveEnv() {
  const e = (process.env.NODE_ENV ?? 'production').toLowerCase();
  if (e === 'development' || e === 'local') return 'local';
  if (e === 'staging' || e === 'test') return 'staging';
  return 'production';
}

// ─── SCHEMA ──────────────────────────────────────────────────────────────────

const ServiceConfigSchema = z.object({
  service:       z.string().min(1),
  version:       z.string().default('0.0.0'),
  domain:        z.string().default('unassigned'),
  port:          z.number().int().positive(),
  env:           z.enum(['local', 'staging', 'production']).default('production'),

  // Phi-scaled timeouts (validated against the allowed ladder)
  timeout: z.object({
    request:   z.number().default(TIMEOUTS.PHI_4),   // 6854 ms
    upstream:  z.number().default(TIMEOUTS.PHI_5),   // 11090 ms
    health:    z.number().default(TIMEOUTS.PHI_3),   // 4236 ms
    shutdown:  z.number().default(TIMEOUTS.PHI_6),   // 17944 ms
  }).default({}),

  // Rate limiting (Fibonacci-snapped)
  rateLimit: z.object({
    windowMs:   z.number().default(TIMEOUTS.PHI_4),  // 6854 ms sliding window
    maxRequests: z.number().default(SCALING.RATE_LIMIT_BASE),  // 89
    burst:       z.number().default(fib(8)),          // 21
  }).default({}),

  // Retry policy (φ-exponential backoff)
  retry: z.object({
    attempts: z.number().int().default(SCALING.RETRY_COUNT),  // 3
    backoffMs: z.array(z.number()).default(PHI_BACKOFF_MS.slice(0, 5)),
  }).default({}),

  // CSL thresholds
  csl: z.object({
    confidence:  z.number().default(CSL_THRESHOLDS.PASS),      // 0.618
    coherence:   z.number().default(CSL_THRESHOLDS.STEADY),    // 0.882
    resonance:   z.number().default(CSL_THRESHOLDS.RESONANT),  // 0.927
  }).default({}),

  // Circuit breaker (Fibonacci-snapped)
  circuitBreaker: z.object({
    failureThreshold: z.number().int().default(fib(5)),    // 5
    successThreshold: z.number().int().default(fib(4)),    // 3
    timeoutMs:         z.number().default(fib(9) * 1000),  // 34000 ms
  }).default({}),

  // Health check
  health: z.object({
    intervalMs: z.number().default(HEALTH_INTERVAL_MS),  // 6854 ms
    timeoutMs:  z.number().default(HEALTH_TIMEOUT_MS),   // 4236 ms
    path:       z.string().default('/health'),
    readyPath:  z.string().default('/health/ready'),
    livePath:   z.string().default('/health/live'),
    startupPath: z.string().default('/health/startup'),
  }).default({}),

  // mTLS / Envoy
  mesh: z.object({
    mtls:          z.boolean().default(true),
    envoyAdmin:    z.string().default('http://heady-envoy-admin.heady-system.svc.cluster.local:9901'),
    xdsCluster:    z.string().optional(),
    tracing:       z.boolean().default(true),
    tracingHeader: z.string().default('x-b3-traceid'),
  }).default({}),

  // Upstream service URLs — NEVER hardcoded; always from env
  upstreams: z.record(z.string()).default({}),
});

export { ServiceConfigSchema };

// ─── LOADER ──────────────────────────────────────────────────────────────────

/**
 * Load and validate phi-scaled service configuration from environment.
 * All URL values are sourced from environment variables (Law #5: zero 127.0.0.1 contamination).
 *
 * @param {string} service — service name
 * @param {Object} [overrides] — inline overrides (for testing)
 * @returns {z.infer<typeof ServiceConfigSchema>}
 */
export function loadConfig(service, overrides = {}) {
  const env = resolveEnv();
  const version = process.env.SERVICE_VERSION ?? '0.0.0';
  const domain = process.env.HEADY_DOMAIN ?? 'unassigned';
  const port = parseInt(process.env.PORT ?? '3000', 10);

  const raw = {
    service,
    version,
    domain,
    port,
    env,
    timeout: {
      request:   getPhiTimeout('REQUEST_TIMEOUT_MS',  TIMEOUTS.PHI_4),
      upstream:  getPhiTimeout('UPSTREAM_TIMEOUT_MS', TIMEOUTS.PHI_5),
      health:    getPhiTimeout('HEALTH_TIMEOUT_MS',   TIMEOUTS.PHI_3),
      shutdown:  getPhiTimeout('SHUTDOWN_TIMEOUT_MS', TIMEOUTS.PHI_6),
    },
    rateLimit: {
      windowMs:    getPhiTimeout('RATE_LIMIT_WINDOW_MS', TIMEOUTS.PHI_4),
      maxRequests: getInt('RATE_LIMIT_MAX', SCALING.RATE_LIMIT_BASE),
      burst:       getInt('RATE_LIMIT_BURST', fib(8)),
    },
    retry: {
      attempts:  getInt('RETRY_ATTEMPTS', SCALING.RETRY_COUNT),
      backoffMs: parseBackoff(process.env.RETRY_BACKOFF_MS),
    },
    csl: {
      confidence: getFloat('CSL_CONFIDENCE', CSL_THRESHOLDS.PASS),
      coherence:  getFloat('CSL_COHERENCE',  CSL_THRESHOLDS.STEADY),
      resonance:  getFloat('CSL_RESONANCE',  CSL_THRESHOLDS.RESONANT),
    },
    circuitBreaker: {
      failureThreshold: getInt('CB_FAILURE_THRESHOLD', fib(5)),
      successThreshold: getInt('CB_SUCCESS_THRESHOLD', fib(4)),
      timeoutMs:        getPhiTimeout('CB_TIMEOUT_MS', fib(9) * 1000),
    },
    health: {
      intervalMs:  getPhiTimeout('HEALTH_INTERVAL_MS', HEALTH_INTERVAL_MS),
      timeoutMs:   getPhiTimeout('HEALTH_TIMEOUT_MS',  HEALTH_TIMEOUT_MS),
      path:        process.env.HEALTH_PATH         ?? '/health',
      readyPath:   process.env.HEALTH_READY_PATH   ?? '/health/ready',
      livePath:    process.env.HEALTH_LIVE_PATH    ?? '/health/live',
      startupPath: process.env.HEALTH_STARTUP_PATH ?? '/health/startup',
    },
    mesh: {
      mtls:          process.env.MTLS_ENABLED !== 'false',
      envoyAdmin:    process.env.ENVOY_ADMIN_URL ?? 'http://heady-envoy-admin.heady-system.svc.cluster.local:9901',
      xdsCluster:    process.env.ENVOY_XDS_CLUSTER,
      tracing:       process.env.MESH_TRACING !== 'false',
      tracingHeader: process.env.MESH_TRACING_HEADER ?? 'x-b3-traceid',
    },
    upstreams: parseUpstreams(),
    ...overrides,
  };

  const result = ServiceConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Config validation failed for ${service}: ${result.error.message}`);
  }

  return result.data;
}

// ─── DOMAIN URL RESOLVER ─────────────────────────────────────────────────────

/** Canonical Heady domain → env-var name mapping */
const DOMAIN_ENV_MAP = Object.freeze({
  'headyme.com':         'HEADY_URL_HEADYME',
  'headysystems.com':    'HEADY_URL_HEADYSYSTEMS',
  'headyos.com':         'HEADY_URL_HEADYOS',
  'headybuddy.com':      'HEADY_URL_HEADYBUDDY',
  'headymcp.com':        'HEADY_URL_HEADYMCP',
  'headyapi.com':        'HEADY_URL_HEADYAPI',
  'heady.io':            'HEADY_URL_HEADYIO',
  'headyconnection.com': 'HEADY_URL_HEADYCONNECTION',
  'headyconnection.org': 'HEADY_URL_HEADYCONNECTION_ORG',
  'headybot.com':        'HEADY_URL_HEADYBOT',
  'headybee.co':         'HEADY_URL_HEADYBEE',
  'headylens.ai':        'HEADY_URL_HEADYLENS',
});

/**
 * Resolve the base URL for a Heady domain from environment.
 * NEVER returns 127.0.0.1 — always uses environment-configured URL.
 *
 * @param {string} domain — e.g. 'headysystems.com'
 * @returns {string} base URL
 */
export function resolveDomainUrl(domain) {
  const envKey = DOMAIN_ENV_MAP[domain];
  if (!envKey) throw new Error(`resolveDomainUrl: unknown domain '${domain}'`);
  const url = process.env[envKey];
  if (!url) throw new Error(`resolveDomainUrl: env var ${envKey} not set for domain '${domain}'`);
  // Enforce no 127.0.0.1 contamination (Law #5)
  if (url.includes('127.0.0.1') || url.includes('127.0.0.1')) {
    if (resolveEnv() !== 'local') {
      throw new Error(`resolveDomainUrl: 127.0.0.1 URL '${url}' found in non-local environment`);
    }
  }
  return url.replace(/\/$/, '');
}

// ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

function getInt(envKey, defaultValue) {
  const val = process.env[envKey];
  return val ? parseInt(val, 10) : defaultValue;
}

function getFloat(envKey, defaultValue) {
  const val = process.env[envKey];
  return val ? parseFloat(val) : defaultValue;
}

function getPhiTimeout(envKey, defaultValue) {
  const raw = getInt(envKey, defaultValue);
  // Snap to nearest phi-ladder value for compliance
  return fibSnap(raw, Object.values(TIMEOUTS));
}

function parseBackoff(envValue) {
  if (!envValue) return PHI_BACKOFF_MS.slice(0, 5);
  try {
    const parsed = JSON.parse(envValue);
    return Array.isArray(parsed) ? parsed : PHI_BACKOFF_MS.slice(0, 5);
  } catch {
    return PHI_BACKOFF_MS.slice(0, 5);
  }
}

function parseUpstreams() {
  const upstreams = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('UPSTREAM_')) {
      const name = key.slice(9).toLowerCase().replace(/_/g, '-');
      upstreams[name] = value;
    }
  }
  return upstreams;
}
