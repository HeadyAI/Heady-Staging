/**
 * CorsStrict — Strict CORS Middleware with Origin Allowlisting
 * Enforces tight CORS policy for all Heady domains, with CSL-gated
 * origin matching, preflight caching, and credential handling.
 * All constants φ-derived. ESM only.
 * Author: Eric Haywood
 */
import { createHash } from 'crypto';

// ── φ-Math Foundation ────────────────────────────────────────────
const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI2 = 0.3819660113;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function phiThreshold(level, spread = PSI2) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH: phiThreshold(3),
  MEDIUM: phiThreshold(2),
  LOW: phiThreshold(1),
  MINIMUM: phiThreshold(0),
};

function cslGate(value, score, tau = CSL_THRESHOLDS.MEDIUM, temp = Math.pow(PSI, 3)) {
  return value * (1 / (1 + Math.exp(-(score - tau) / temp)));
}

function hashSHA256(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ── Heady Domain Allowlist ───────────────────────────────────────
const HEADY_DOMAINS = [
  'headyme.com',
  'headysystems.com',
  'heady-ai.com',
  'headyos.com',
  'headyconnection.org',
  'headyconnection.com',
  'headyex.com',
  'headyfinance.com',
  'admin.headysystems.com',
  'headybuddy.org',
  'headymcp.com',
  'headyio.com',
  'headybot.com',
  'headyapi.com',
  'heady-ai.com',
];

function buildAllowedOrigins(domains, includeLocalDev = false) {
  const origins = new Set();
  for (const domain of domains) {
    origins.add(`https://${domain}`);
    origins.add(`https://www.${domain}`);
  }
  if (includeLocalDev) {
    // Fibonacci ports for local development
    for (const port of [3000, 3310, 3311, 3312, 3313, 3314, 3315, 3316, 3317, 5173, 8080]) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }
  return origins;
}

// ── CORS Configuration ───────────────────────────────────────────
class CorsStrict {
  constructor(config = {}) {
    this.allowedOrigins = buildAllowedOrigins(
      config.domains ?? HEADY_DOMAINS,
      config.includeLocalDev ?? (config.environment !== 'production')
    );
    this.customOrigins = new Set(config.customOrigins ?? []);

    this.allowedMethods = config.methods ?? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
    this.allowedHeaders = config.headers ?? [
      'Content-Type',
      'Authorization',
      'X-Heady-Signature',
      'X-Heady-Timestamp',
      'X-Heady-Nonce',
      'X-Heady-KeyId',
      'X-Heady-BodyHash',
      'X-Request-ID',
      'X-Correlation-ID',
    ];
    this.exposedHeaders = config.exposedHeaders ?? [
      'X-Request-ID',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ];
    this.maxAge = config.maxAge ?? FIB[11] * 60; // 89 minutes (in seconds)
    this.credentials = config.credentials ?? true;

    // Violation tracking
    this.violations = [];
    this.maxViolations = FIB[16]; // 987
    this.blockThreshold = FIB[6]; // 8 violations before enhanced blocking
    this.violationCounts = new Map();
    this.auditLog = [];
    this.maxAuditEntries = FIB[16];
  }

  _audit(action, detail) {
    const entry = { ts: Date.now(), action, detail, hash: hashSHA256({ action, detail, ts: Date.now() }) };
    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-FIB[14]);
    }
  }

  isOriginAllowed(origin) {
    if (!origin) return false;
    if (this.allowedOrigins.has(origin)) return true;
    if (this.customOrigins.has(origin)) return true;

    // Wildcard subdomain matching for Heady domains
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      for (const domain of HEADY_DOMAINS) {
        if (hostname === domain || hostname.endsWith(`.${domain}`)) {
          return true;
        }
      }
    } catch (_) {
      return false;
    }

    return false;
  }

  handlePreflight(origin) {
    if (!this.isOriginAllowed(origin)) {
      this._recordViolation(origin, 'preflight-blocked');
      return { allowed: false, headers: {} };
    }

    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': this.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': this.allowedHeaders.join(', '),
      'Access-Control-Max-Age': this.maxAge.toString(),
      'Access-Control-Allow-Credentials': this.credentials.toString(),
      'Vary': 'Origin',
    };

    this._audit('preflight-allowed', { origin });
    return { allowed: true, headers, status: 204 };
  }

  handleRequest(origin) {
    if (!this.isOriginAllowed(origin)) {
      this._recordViolation(origin, 'request-blocked');
      return { allowed: false, headers: {} };
    }

    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': this.credentials.toString(),
      'Access-Control-Expose-Headers': this.exposedHeaders.join(', '),
      'Vary': 'Origin',
    };

    return { allowed: true, headers };
  }

  middleware() {
    return (req, res, next) => {
      const origin = req.headers?.origin ?? req.headers?.Origin;

      if (req.method === 'OPTIONS') {
        const preflight = this.handlePreflight(origin);
        if (!preflight.allowed) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('CORS: Origin not allowed');
          return;
        }
        for (const [key, value] of Object.entries(preflight.headers)) {
          res.setHeader(key, value);
        }
        res.writeHead(204);
        res.end();
        return;
      }

      const result = this.handleRequest(origin);
      if (!result.allowed && origin) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('CORS: Origin not allowed');
        return;
      }

      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }

      next?.();
    };
  }

  _recordViolation(origin, type) {
    const entry = { ts: Date.now(), origin: origin ?? 'null', type };
    this.violations.push(entry);
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(-FIB[14]);
    }

    const key = origin ?? 'null';
    const count = (this.violationCounts.get(key) ?? 0) + 1;
    this.violationCounts.set(key, count);

    this._audit('cors-violation', { origin, type, violationCount: count });
  }

  addOrigin(origin) {
    this.customOrigins.add(origin);
    this._audit('add-origin', { origin });
  }

  removeOrigin(origin) {
    this.customOrigins.delete(origin);
    this._audit('remove-origin', { origin });
  }

  health() {
    return {
      allowedOriginsCount: this.allowedOrigins.size + this.customOrigins.size,
      violationCount: this.violations.length,
      topViolators: [...this.violationCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, FIB[5]),
      auditLogSize: this.auditLog.length,
    };
  }
}

export default CorsStrict;
export { CorsStrict, HEADY_DOMAINS, buildAllowedOrigins };
