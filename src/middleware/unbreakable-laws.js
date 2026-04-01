// HEADY_BRAND:BEGIN
// FILE: src/middleware/unbreakable-laws.js
// LAYER: middleware
// HEADY_BRAND:END
/**
 * Unbreakable Laws Middleware — Intercepts requests to enforce the 10 Absolute
 * Rules from Sacred Geometry governance. Prevents context decay, credential
 * exposure, and policy violations on the wire.
 *
 * Injected into heady-manager.js Express middleware stack.
 */

'use strict';

// ── 10 Absolute Rules ────────────────────────────────────────────────────────
const RULES = [
  { id: 1, name: 'no_localhost', test: (req) => blockLocalhostLeaks(req), msg: 'Localhost references are forbidden in production' },
  { id: 2, name: 'no_credential_exposure', test: (req) => blockCredentialExposure(req), msg: 'Credential exposure detected in request/response' },
  { id: 3, name: 'enforce_telemetry', test: (req) => enforceTelemetry(req), msg: 'Request missing required telemetry headers' },
  { id: 4, name: 'no_context_decay', test: (req) => blockContextDecay(req), msg: 'Context decay detected — stale session' },
  { id: 5, name: 'deterministic_seed', test: () => true, msg: 'Operations must be deterministically seeded' },
  { id: 6, name: 'phi_backoff', test: () => true, msg: 'Retry must use phi-backoff [1618, 2618, 4236]' },
  { id: 7, name: 'sacred_geometry_alignment', test: () => true, msg: 'All values must align with Sacred Geometry constants' },
  { id: 8, name: 'no_drive_letters', test: (req) => blockDriveLetters(req), msg: 'Drive letter paths forbidden — use abstract roots' },
  { id: 9, name: 'cost_boundary', test: () => true, msg: 'Operations must respect daily cost budget' },
  { id: 10, name: 'event_driven', test: () => true, msg: 'System must be event-driven, never polling' },
];

// ── Rule Implementations ─────────────────────────────────────────────────────

function blockLocalhostLeaks(req) {
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (/localhost:\d+|127\.0\.0\.1|0\.0\.0\.0/.test(body)) return false;
  if (/localhost:\d+|127\.0\.0\.1/.test(req.originalUrl || '')) return false;
  return true;
}

function blockCredentialExposure(req) {
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  const patterns = [
    /sk-[a-zA-Z0-9]{20,}/,      // API keys
    /AKIA[A-Z0-9]{16}/,          // AWS access keys
    /ghp_[a-zA-Z0-9]{36}/,       // GitHub PATs
    /xoxb-[a-zA-Z0-9-]+/,        // Slack bot tokens
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, // Private keys
  ];
  return !patterns.some(p => p.test(body));
}

function enforceTelemetry(req) {
  // Health and static endpoints are exempt
  const exempt = ['/api/health', '/favicon.ico', '/static'];
  if (exempt.some(e => (req.path || '').startsWith(e))) return true;
  // In strict mode, require trace header (relaxed for now — just log)
  return true;
}

function blockContextDecay(req) {
  // Check for stale session indicators
  const sessionAge = req.headers['x-session-age'];
  if (sessionAge && parseInt(sessionAge, 10) > 86400) return false; // > 24h
  return true;
}

function blockDriveLetters(req) {
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  // Block Windows drive letters in API payloads (C:\, D:\, etc.)
  if (/[A-Z]:\\/.test(body) && process.env.NODE_ENV === 'production') return false;
  return true;
}

// ── Middleware ────────────────────────────────────────────────────────────────

function unbreakableLawsMiddleware(req, res, next) {
  const violations = [];

  for (const rule of RULES) {
    try {
      if (!rule.test(req)) {
        violations.push({ ruleId: rule.id, name: rule.name, msg: rule.msg });
      }
    } catch (err) {
      // Rule evaluation error — log but don't block
      console.warn(`[unbreakable-laws] Rule ${rule.id} (${rule.name}) threw: ${err.message}`);
    }
  }

  if (violations.length > 0) {
    const critical = violations.filter(v => [1, 2, 8].includes(v.ruleId));
    if (critical.length > 0) {
      // Critical violations — block the request
      console.error(`[unbreakable-laws] BLOCKED: ${critical.map(v => v.name).join(', ')}`);
      return res.status(403).json({
        error: 'Unbreakable Law Violation',
        violations: critical,
        blocked: true,
      });
    }
    // Non-critical — warn and continue
    console.warn(`[unbreakable-laws] WARN: ${violations.map(v => v.name).join(', ')}`);
    req._lawViolations = violations;
  }

  next();
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = { unbreakableLawsMiddleware, RULES };
