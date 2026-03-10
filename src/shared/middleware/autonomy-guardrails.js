'use strict';

// φ-math constants (inlined to avoid cross-package dependency)
const PHI = 1.618033988749895;
const PSI = 1 / PHI;  // ≈0.618033988749895
const PSI2 = PSI * PSI; // ≈0.381966011250105
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];

// CSL (Cognitive Safety Level) confidence thresholds
// Formula: 1 - 0.5 * PSI^level (matches phi-math-foundation/thresholds.js)
const CSL_GATES = {
  CRITICAL: 1 - 0.5 * Math.pow(PSI, 4),   // ≈0.927 — destructive / irreversible
  HIGH:     1 - 0.5 * Math.pow(PSI, 3),    // ≈0.882 — external side-effects
  MEDIUM:   1 - 0.5 * Math.pow(PSI, 2),    // ≈0.809 — internal mutations
  LOW:      1 - 0.5 * Math.pow(PSI, 1),    // ≈0.691 — read-write internal
  MINIMUM:  0.500,                           // — read-only
};

// Allowed autonomous operations by CSL tier
const ALLOWED_OPERATIONS = {
  // MINIMUM confidence (≥0.500): read-only, no side effects
  READ_ONLY: {
    csl: 'MINIMUM',
    threshold: CSL_GATES.MINIMUM,
    operations: [
      'read_file',
      'list_directory',
      'search_code',
      'get_health_status',
      'get_metrics',
      'query_vector_readonly',
      'get_job_status',
      'get_session_info',
      'list_notifications',
    ],
  },

  // LOW confidence (≥0.691): internal read-write
  INTERNAL_WRITE: {
    csl: 'LOW',
    threshold: CSL_GATES.LOW,
    operations: [
      'update_cache',
      'write_log',
      'update_local_state',
      'create_draft',
      'set_feature_flag_local',
      'trigger_aggregation',
      'update_job_schedule',
    ],
  },

  // MEDIUM confidence (≥0.809): internal mutations with broader impact
  INTERNAL_MUTATION: {
    csl: 'MEDIUM',
    threshold: CSL_GATES.MEDIUM,
    operations: [
      'create_session',
      'revoke_session',
      'modify_rate_limits',
      'update_schema',
      'trigger_job',
      'broadcast_notification',
      'update_vector_index',
      'modify_circuit_breaker',
    ],
  },

  // HIGH confidence (≥0.882): external side effects
  EXTERNAL_EFFECT: {
    csl: 'HIGH',
    threshold: CSL_GATES.HIGH,
    operations: [
      'send_email',
      'send_webhook',
      'create_stripe_checkout',
      'modify_subscription',
      'deploy_canary',
      'update_dns',
      'push_to_registry',
      'create_pull_request',
    ],
  },

  // CRITICAL confidence (≥0.927): destructive / irreversible
  DESTRUCTIVE: {
    csl: 'CRITICAL',
    threshold: CSL_GATES.CRITICAL,
    operations: [
      'delete_user_data',
      'drop_database_table',
      'revoke_all_sessions',
      'cancel_all_subscriptions',
      'rollback_deployment',
      'purge_cache_global',
      'disable_service',
    ],
  },
};

// Absolutely forbidden — no confidence score overrides these
const FORBIDDEN_OPERATIONS = [
  'execute_raw_sql_unparameterized',
  'disable_authentication',
  'disable_rate_limiting',
  'expose_internal_endpoints',
  'bypass_csp_headers',
  'disable_request_signing',
  'grant_admin_without_mfa',
  'access_production_secrets_directly',
  'modify_audit_log',
  'delete_audit_log',
  'disable_cors',
  'allow_wildcard_origin',
  'skip_webhook_signature_verification',
  'execute_shell_command',
];

// Maximum operations per time window (φ-scaled)
const AUTONOMY_RATE_LIMITS = {
  READ_ONLY:         { maxOps: FIB[13], windowSec: 60 },   // 233/min
  INTERNAL_WRITE:    { maxOps: FIB[11], windowSec: 60 },   // 89/min
  INTERNAL_MUTATION: { maxOps: FIB[9],  windowSec: 60 },   // 34/min
  EXTERNAL_EFFECT:   { maxOps: FIB[7],  windowSec: 60 },   // 13/min
  DESTRUCTIVE:       { maxOps: FIB[5],  windowSec: 3600 },  // 5/hour
};

/**
 * Build a lookup from operation name → tier info.
 */
function buildOperationIndex() {
  const index = new Map();
  for (const [tierName, tier] of Object.entries(ALLOWED_OPERATIONS)) {
    for (const op of tier.operations) {
      index.set(op, {
        tier: tierName,
        csl: tier.csl,
        threshold: tier.threshold,
      });
    }
  }
  return index;
}

const OPERATION_INDEX = buildOperationIndex();

/**
 * Check whether an autonomous operation is permitted.
 *
 * @param {object} params
 * @param {string} params.operation — operation name
 * @param {number} params.confidence — agent confidence score 0–1
 * @param {object} [params.context] — additional context for audit
 * @returns {{ allowed: boolean, reason?: string, tier?: string, requiredConfidence?: number }}
 */
function checkOperation({ operation, confidence, context = {} }) {
  // Hard block on forbidden operations
  if (FORBIDDEN_OPERATIONS.includes(operation)) {
    return {
      allowed: false,
      reason: `Operation '${operation}' is permanently forbidden`,
      tier: 'FORBIDDEN',
    };
  }

  const entry = OPERATION_INDEX.get(operation);
  if (!entry) {
    return {
      allowed: false,
      reason: `Unknown operation '${operation}' — not in allowlist`,
      tier: 'UNKNOWN',
    };
  }

  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    return {
      allowed: false,
      reason: `Invalid confidence score: ${confidence}. Must be 0–1.`,
      tier: entry.tier,
      requiredConfidence: entry.threshold,
    };
  }

  if (confidence < entry.threshold) {
    return {
      allowed: false,
      reason: `Confidence ${confidence.toFixed(4)} below ${entry.csl} threshold ${entry.threshold.toFixed(4)}`,
      tier: entry.tier,
      requiredConfidence: entry.threshold,
    };
  }

  return {
    allowed: true,
    tier: entry.tier,
    requiredConfidence: entry.threshold,
  };
}

/**
 * Sliding-window rate tracker for autonomous operations.
 */
class AutonomyRateLimiter {
  constructor() {
    // tier → timestamp[]
    this._windows = new Map();
  }

  /**
   * Check and record an operation against rate limits.
   *
   * @param {string} tier — ALLOWED_OPERATIONS tier name
   * @returns {{ allowed: boolean, remaining: number, resetSec: number }}
   */
  check(tier) {
    const limits = AUTONOMY_RATE_LIMITS[tier];
    if (!limits) {
      return { allowed: false, remaining: 0, resetSec: 0 };
    }

    const now = Date.now();
    const windowMs = limits.windowSec * 1000;

    if (!this._windows.has(tier)) {
      this._windows.set(tier, []);
    }

    const timestamps = this._windows.get(tier);

    // Prune expired entries
    const cutoff = now - windowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= limits.maxOps) {
      const oldestInWindow = timestamps[0];
      const resetMs = oldestInWindow + windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetSec: Math.ceil(resetMs / 1000),
      };
    }

    timestamps.push(now);
    return {
      allowed: true,
      remaining: limits.maxOps - timestamps.length,
      resetSec: limits.windowSec,
    };
  }

  /**
   * Get current usage for all tiers.
   */
  usage() {
    const result = {};
    const now = Date.now();

    for (const [tier, limits] of Object.entries(AUTONOMY_RATE_LIMITS)) {
      const timestamps = this._windows.get(tier) || [];
      const cutoff = now - limits.windowSec * 1000;
      const active = timestamps.filter((t) => t >= cutoff).length;
      result[tier] = {
        used: active,
        max: limits.maxOps,
        remaining: Math.max(0, limits.maxOps - active),
      };
    }

    return result;
  }
}

/**
 * Create Express middleware that enforces autonomy guardrails on agent requests.
 *
 * Expects `req.agentOperation` and `req.agentConfidence` to be set
 * (e.g., by an upstream agent-auth middleware).
 *
 * @param {object} options
 * @param {object} [options.log] — structured logger
 * @returns {Function} Express middleware
 */
function createGuardrailMiddleware(options = {}) {
  const { log = null } = options;
  const rateLimiter = new AutonomyRateLimiter();

  return function guardrailMiddleware(req, res, next) {
    const operation = req.headers['x-agent-operation'] || req.agentOperation;
    const confidenceStr = req.headers['x-agent-confidence'] || String(req.agentConfidence || '');

    // If no agent operation header, pass through (not an agent request)
    if (!operation) {
      next();
      return;
    }

    const confidence = parseFloat(confidenceStr);

    const check = checkOperation({ operation, confidence, context: { path: req.path, method: req.method } });

    if (!check.allowed) {
      if (log) {
        log.warn('Autonomy guardrail blocked operation', {
          operation,
          confidence,
          reason: check.reason,
          tier: check.tier,
          path: req.path,
        });
      }
      res.status(403).json({
        code: 'HEADY-GUARD-001',
        message: check.reason,
        tier: check.tier,
        requiredConfidence: check.requiredConfidence,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Rate limit check
    const rateCheck = rateLimiter.check(check.tier);
    if (!rateCheck.allowed) {
      if (log) {
        log.warn('Autonomy rate limit exceeded', {
          operation,
          tier: check.tier,
          resetSec: rateCheck.resetSec,
        });
      }
      res.status(429).json({
        code: 'HEADY-GUARD-002',
        message: `Rate limit exceeded for ${check.tier} operations`,
        retryAfterSec: rateCheck.resetSec,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.guardrailResult = {
      operation,
      tier: check.tier,
      confidence,
      remaining: rateCheck.remaining,
    };

    next();
  };
}

module.exports = {
  CSL_GATES,
  ALLOWED_OPERATIONS,
  FORBIDDEN_OPERATIONS,
  AUTONOMY_RATE_LIMITS,
  checkOperation,
  AutonomyRateLimiter,
  createGuardrailMiddleware,
};
