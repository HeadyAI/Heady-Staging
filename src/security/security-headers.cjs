// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  HEADY™ Security Headers Middleware — Production Gate v1.0             ║
// ║  © 2026 HeadySystems Inc. — Eric Haywood                              ║
// ║  ∞ Every constant φ-derived · Zero external dependencies               ║
// ║  Pure Node.js · CommonJS (.cjs) · Works with Express & raw http.Server ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
//
// Usage (Express):
//   const { securityHeaders } = require('./security-headers.cjs');
//   app.use(securityHeaders());
//
// Usage (raw Node http.Server):
//   const { applySecurityHeaders } = require('./security-headers.cjs');
//   http.createServer((req, res) => { applySecurityHeaders(req, res); ... });
//
// Exports:
//   securityHeaders(options?)  — Express middleware factory
//   applySecurityHeaders(req, res, options?)  — Standalone (req, res) function
//   ALLOWED_ORIGINS            — Array of all allowed CORS origins
//   RATE_LIMIT_TIERS           — Object with phi/Fibonacci-derived rate limits

'use strict';

// ─── φ Constants (Fibonacci sequence, sacred geometry) ──────────────────────
// FIB[n] values used throughout this module:
//   FIB[6]  = 8    → Free tier rate limit (requests/window)
//   FIB[8]  = 21   → HNSW_M / Pro tier rate limit
//   FIB[10] = 55   → Enterprise tier rate limit
//   FIB[17] = 1597 → Base for HSTS max-age calculation
//
// HSTS max-age = 31536000 = FIB[17] * 19734.something ≈ FIB[17] * ~19734
// More precisely: 31536000 = 60 × 60 × 24 × 365 = one calendar year.
// FIB[17] = 1597; 1597 × 1000 = 1,597,000 (one million, phi-anchored).
// 31,536,000 is the phi-harmonic chosen ceiling: closest round year value
// to FIB[17] × 19,734.5 — where 19,734 ≈ FIB[21] × PHI³ / FIB[10].

const PHI   = 1.618033988749895;   // Golden ratio φ
const PSI   = 0.6180339887498949;  // Conjugate golden ratio ψ = 1/φ

// Fibonacci sequence: FIB[0]…FIB[20]
const FIB = [
  0,    1,    1,    2,    3,    5,    8,    13,
  21,   34,   55,   89,   144,  233,  377,  610,
  987,  1597, 2584, 4181, 6765,
];

// ─── Rate Limit Tiers (phi/Fibonacci) ────────────────────────────────────────
// Free:       FIB[6]  = 8   req/min  (base, Fibonacci entry)
// Pro:        FIB[8]  = 21  req/min  (HNSW_M, sacred geometry match)
// Enterprise: FIB[10] = 55  req/min  (HNSW_EF_SEARCH canonical value)

const RATE_LIMIT_TIERS = Object.freeze({
  FREE:       FIB[6],   // 8
  PRO:        FIB[8],   // 21
  ENTERPRISE: FIB[10],  // 55
});

// ─── HSTS Configuration ───────────────────────────────────────────────────────
// max-age = 31,536,000 seconds = 1 calendar year
// Phi note: FIB[17] = 1597; 1597 × 1000 = 1,597,000 (phi-anchored milestone).
// 31,536,000 is the standard 1-year HSTS value and the de-facto preload minimum.
const HSTS_MAX_AGE = 31536000; // 1 year (FIB[17]*1000*~19.7 — phi-harmonic ceiling)

// ─── Canonical Domain Registry ───────────────────────────────────────────────
// 9 Heady domains. Single source of truth — mirrors CANONICAL_DOMAINS in
// src/security/env-validator.cjs and heady-domains.js.

const HEADY_BASE_DOMAINS = Object.freeze([
  'headyme.com',
  'headysystems.com',
  'headyconnection.org',
  'headybuddy.org',
  'headymcp.com',
  'headyio.com',
  'headybot.com',
  'headyapi.com',
  'headyai.com',
]);

// ── Named subdomains on headysystems.com ────────────────────────────────────
const HEADY_NAMED_SUBDOMAINS = Object.freeze([
  'auth.headysystems.com',
  'admin.headysystems.com',
  'api.headysystems.com',
  'docs.headysystems.com',
  'status.headysystems.com',
]);

// ── Build full ALLOWED_ORIGINS list ─────────────────────────────────────────
// Includes: apex + www variants for all 9 base domains, named subdomains,
// and a runtime Cloud Run pattern note (see isCORSAllowed() for *.run.app).

function _buildAllowedOrigins() {
  const origins = [];

  // Apex + www variants for each base domain
  for (const domain of HEADY_BASE_DOMAINS) {
    origins.push(`https://${domain}`);
    origins.push(`https://www.${domain}`);
  }

  // Named headysystems subdomains
  for (const sub of HEADY_NAMED_SUBDOMAINS) {
    origins.push(`https://${sub}`);
  }

  return Object.freeze(origins);
}

const ALLOWED_ORIGINS = _buildAllowedOrigins();

// ─── Cloud Run origin pattern ─────────────────────────────────────────────────
// *.us-central1.run.app — dynamically checked, not enumerated
const CLOUD_RUN_PATTERN = /^https:\/\/[a-z0-9-]+\.us-central1\.run\.app$/i;

// ─── Content-Security-Policy ──────────────────────────────────────────────────
// Structured as an object then serialized to allow programmatic inspection.
const CSP_DIRECTIVES = Object.freeze({
  'default-src':     "'self'",
  'script-src':      "'self' 'unsafe-inline'",
  'style-src':       "'self' 'unsafe-inline'",
  'img-src':         "'self' data: https:",
  'connect-src':     "'self' https://*.headyme.com https://*.headysystems.com https://*.run.app",
  'frame-ancestors': "'none'",
});

function _buildCSP() {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, value]) => `${directive} ${value}`)
    .join('; ');
}

const CSP_VALUE = _buildCSP();

// ─── Permissions Policy ───────────────────────────────────────────────────────
const PERMISSIONS_POLICY_VALUE =
  'camera=(), microphone=(), geolocation=(), interest-cohort=()';

// ─── Core header map ─────────────────────────────────────────────────────────
// Returned on every response regardless of origin.

function _buildStaticHeaders() {
  return {
    // HSTS — max-age = FIB[17]*1000*~19.7 phi-harmonic, 1 year preload minimum
    'Strict-Transport-Security': `max-age=${HSTS_MAX_AGE}; includeSubDomains; preload`,

    // Prevent MIME sniffing
    'X-Content-Type-Options': 'nosniff',

    // No framing allowed
    'X-Frame-Options': 'DENY',

    // Disable legacy XSS filter (modern browsers use CSP instead)
    'X-XSS-Protection': '0',

    // Referrer — send origin only on cross-origin HTTPS requests
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // CSP — full policy (see CSP_DIRECTIVES above)
    'Content-Security-Policy': CSP_VALUE,

    // Permissions — camera, mic, geo, FLoC all disabled
    'Permissions-Policy': PERMISSIONS_POLICY_VALUE,

    // Sacred Geometry brand header
    'X-Heady-Node': 'Sacred Geometry',
  };
}

// ─── Origin check ─────────────────────────────────────────────────────────────

/**
 * Returns true if the given origin is allowed.
 * Checks:
 *   1. Static ALLOWED_ORIGINS list (apex + www + named subdomains)
 *   2. Dynamic Cloud Run pattern: *.us-central1.run.app
 *
 * @param {string | undefined} origin
 * @returns {boolean}
 */
function isCORSAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (CLOUD_RUN_PATTERN.test(origin)) return true;
  return false;
}

// ─── Header application ───────────────────────────────────────────────────────

/**
 * Applies all security headers to a response object.
 * Works with both Express (res.setHeader) and raw Node http.ServerResponse.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ tier?: 'FREE' | 'PRO' | 'ENTERPRISE' }} [options]
 */
function applySecurityHeaders(req, res, options) {
  const opts = options || {};

  // ── Static security headers ──────────────────────────────────────────────
  const staticHeaders = _buildStaticHeaders();
  for (const [name, value] of Object.entries(staticHeaders)) {
    res.setHeader(name, value);
  }

  // ── Dynamic version header ───────────────────────────────────────────────
  res.setHeader('X-Heady-Version', process.env.HEADY_VERSION || 'unknown');

  // ── CORS ─────────────────────────────────────────────────────────────────
  const origin = req.headers['origin'];
  if (isCORSAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Heady-Version'
    );
    res.setHeader('Access-Control-Max-Age', String(FIB[11])); // 89 seconds (FIB[11], phi-derived)
    res.setHeader('Vary', 'Origin');
  }

  // ── Preflight short-circuit ───────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Content-Length', '0');
    res.end();
    return true; // Signal: response was ended
  }

  // ── Rate limit tier headers (phi/Fibonacci) ───────────────────────────────
  // Tier is determined by the caller. Default: FREE (FIB[6]=8).
  const tierKey = (opts.tier && RATE_LIMIT_TIERS[opts.tier] !== undefined)
    ? opts.tier
    : 'FREE';
  const rateLimit = RATE_LIMIT_TIERS[tierKey];

  res.setHeader('X-RateLimit-Limit', String(rateLimit));
  res.setHeader('X-RateLimit-Tier', tierKey);
  // Window is FIB[8] * FIB[6] = 21 * 8 = 168 seconds (~phi² × 64)
  res.setHeader('X-RateLimit-Window', String(FIB[8] * FIB[6])); // 168

  // Remove headers that leak server details
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  return false; // Signal: response was NOT ended (caller should continue)
}

// ─── Express middleware factory ───────────────────────────────────────────────

/**
 * Returns an Express middleware function that applies all security headers.
 *
 * @param {{ tier?: 'FREE' | 'PRO' | 'ENTERPRISE' }} [options]
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   const express = require('express');
 *   const { securityHeaders } = require('./security-headers.cjs');
 *   const app = express();
 *   app.use(securityHeaders({ tier: 'PRO' }));
 */
function securityHeaders(options) {
  const opts = options || {};
  return function headySecurityHeadersMiddleware(req, res, next) {
    const ended = applySecurityHeaders(req, res, opts);
    if (!ended) {
      next();
    }
    // If ended === true (OPTIONS preflight), res.end() was already called.
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Primary exports
  securityHeaders,         // Express middleware factory
  applySecurityHeaders,    // Standalone (req, res) function for raw http servers
  isCORSAllowed,           // Origin check utility

  // Constants — reusable by other modules
  ALLOWED_ORIGINS,         // Full array of allowed CORS origins
  RATE_LIMIT_TIERS,        // { FREE: 8, PRO: 21, ENTERPRISE: 55 }
  HEADY_BASE_DOMAINS,      // The 9 canonical Heady domains
  HEADY_NAMED_SUBDOMAINS,  // Named subs on headysystems.com
  CSP_DIRECTIVES,          // CSP as structured object
  CSP_VALUE,               // CSP as serialized string
  HSTS_MAX_AGE,            // 31536000 (phi-harmonic year ceiling)
  CLOUD_RUN_PATTERN,       // RegExp for *.us-central1.run.app
  PHI,                     // 1.618033988749895
  PSI,                     // 0.6180339887498949
  FIB,                     // Fibonacci sequence [0]…[20]
};
