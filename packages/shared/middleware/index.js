/**
 * Heady™ Consolidated Middleware Index
 * ═════════════════════════════════════════════════════════════════
 *
 * Central export point for all security and infrastructure middleware.
 * Provides both individual middleware exports and convenience functions
 * for rapid Express/Fastify wiring.
 *
 * Features:
 *  - Re-exports security-headers middleware
 *  - Re-exports cors-whitelist middleware
 *  - Provides standardMiddleware() factory for common setup
 *  - Production-quality error handling
 *
 * Usage:
 *   const { standardMiddleware, securityHeaders, corsPolicy } = require('./middleware');
 *   app.use(...standardMiddleware());
 *
 * @module shared/middleware
 */

'use strict';

// ─── Security Middleware Imports ───────────────────────────────────────────

const securityHeadersModule = require('../../../services/heady-security/middleware/security-headers');
const corsModule = require('../../../services/heady-security/middleware/cors-policy');

// ─── Module Exports ────────────────────────────────────────────────────────

/**
 * Security Headers Middleware Factory
 * Applies comprehensive security headers to all responses.
 *
 * @type {Function}
 * @see security-headers.js for full documentation
 * @example
 *   app.use(securityHeaders({
 *     hstsMaxAge: 31536000,
 *     cspReportUri: '/csp-violations',
 *     isAuthenticated: (req) => !!req.user,
 *   }))
 */
const securityHeaders = securityHeadersModule.securityHeaders;

/**
 * Frame Options Middleware
 * Override X-Frame-Options on a per-route basis.
 *
 * @type {Function}
 * @see security-headers.js for full documentation
 * @example
 *   app.get('/embed', frameOptions('SAMEORIGIN'), handler)
 */
const frameOptions = securityHeadersModule.frameOptions;

/**
 * CSP Override Middleware
 * Apply per-route CSP directive overrides.
 *
 * @type {Function}
 * @see security-headers.js for full documentation
 * @example
 *   app.get('/analytics', cspOverride({ 'connect-src': ["'self'", 'https://analytics.com'] }), handler)
 */
const cspOverride = securityHeadersModule.cspOverride;

/**
 * CSP Violation Report Handler
 * Route handler for receiving CSP violation reports.
 *
 * @type {Function}
 * @see security-headers.js for full documentation
 * @example
 *   app.post('/csp-violations', express.json(), cspViolationHandler())
 */
const cspViolationHandler = securityHeadersModule.cspViolationHandler;

/**
 * CSP Nonce Generator
 * Generates a cryptographically random nonce for inline scripts.
 *
 * @type {Function}
 * @see security-headers.js for full documentation
 * @example
 *   const nonce = generateNonce()
 *   res.set('Content-Security-Policy', `script-src 'nonce-${nonce}'`)
 */
const generateNonce = securityHeadersModule.generateNonce;

/**
 * CORS Policy Middleware Factory
 * Enforces CORS allowlist with first-party domain priority.
 *
 * @type {Function}
 * @see cors-policy.js for full documentation
 * @example
 *   app.use(corsPolicy({
 *     additionalDomains: ['partner.example.com'],
 *     allowLocalhost: process.env.NODE_ENV !== 'production',
 *   }))
 */
const corsPolicy = corsModule.corsPolicy;

/**
 * Public CORS Middleware
 * Allow all origins on public endpoints (webhooks, public APIs).
 *
 * @type {Function}
 * @see cors-policy.js for full documentation
 * @example
 *   app.get('/api/public/data', publicCors(['GET']), handler)
 */
const publicCors = corsModule.publicCors;

/**
 * No CORS Middleware
 * Block all cross-origin requests (internal-only APIs).
 *
 * @type {Function}
 * @see cors-policy.js for full documentation
 * @example
 *   app.post('/internal/admin', noCors(), handler)
 */
const noCors = corsModule.noCors;

/**
 * CORS Route Registry
 * Registry for per-route CORS overrides.
 *
 * @type {Class}
 * @see cors-policy.js for full documentation
 * @example
 *   const registry = new CORSRouteRegistry()
 *     .register('/public', { allowAll: true })
 *     .register('/admin', { credentials: true })
 */
const CORSRouteRegistry = corsModule.CORSRouteRegistry;

/**
 * Validate Origin Helper
 * Check if an origin is allowed and determine credential handling.
 *
 * @type {Function}
 * @see cors-policy.js for full documentation
 * @example
 *   const { allowed, credentials } = validateOrigin('https://example.com')
 */
const validateOrigin = corsModule.validateOrigin;

// ─── Security Headers Constants ────────────────────────────────────────────

const SECURITY_HEADERS_DEFAULTS = securityHeadersModule.DEFAULTS;
const buildCSP = securityHeadersModule.buildCSP;
const buildPermissionsPolicy = securityHeadersModule.buildPermissionsPolicy;
const buildReportTo = securityHeadersModule.buildReportTo;

// ─── CORS Constants ────────────────────────────────────────────────────────

const FIRST_PARTY_DOMAINS = corsModule.FIRST_PARTY_DOMAINS;
const ALLOWED_METHODS = corsModule.ALLOWED_METHODS;
const ALLOWED_HEADERS = corsModule.ALLOWED_HEADERS;
const EXPOSED_HEADERS = corsModule.EXPOSED_HEADERS;
const PREFLIGHT_MAX_AGE = corsModule.PREFLIGHT_MAX_AGE;

// ─── Standard Middleware Factory ───────────────────────────────────────────

/**
 * Create a standard middleware array for typical Express/Fastify applications.
 *
 * Returns a pre-configured array of [corsPolicy, securityHeaders] middleware
 * that can be spread into app.use():
 *
 *   app.use(...standardMiddleware())
 *   app.use(...standardMiddleware({ options: true }))
 *
 * This is the recommended way to wire up security middleware across
 * the application, applying:
 *  1. CORS validation (with environment-aware localhost allowance)
 *  2. Security headers (CSP, HSTS, X-Frame-Options, etc.)
 *
 * @param {object} [opts]                        - Configuration options
 * @param {string[]} [opts.additionalDomains]    - Extra allowed first-party domains for CORS
 * @param {boolean} [opts.allowLocalhost]        - Allow localhost in dev (default: NODE_ENV !== 'production')
 * @param {CORSRouteRegistry} [opts.corsRegistry] - Per-route CORS overrides
 * @param {number} [opts.hstsMaxAge]             - HSTS max-age in seconds (default: 31536000 / 1 year)
 * @param {boolean} [opts.hstsPreload]           - Include preload directive (default: true)
 * @param {string} [opts.cspReportUri]           - CSP violation report endpoint (default: /csp-violations)
 * @param {Function} [opts.isAuthenticated]      - fn(req) → bool; determine auth status for cache control
 * @param {object} [opts.cspOverrides]           - Global CSP directive overrides
 *
 * @returns {Function[]} Array of middleware functions for spread into app.use()
 *
 * @example
 *   // Basic usage (dev-friendly defaults)
 *   const middleware = require('@heady-ai/shared/middleware');
 *   app.use(...middleware.standardMiddleware());
 *
 * @example
 *   // Production with custom domains
 *   app.use(...middleware.standardMiddleware({
 *     additionalDomains: ['partner.example.com'],
 *     allowLocalhost: false,
 *     hstsMaxAge: 31536000,
 *     cspReportUri: '/.well-known/csp-violations',
 *     isAuthenticated: (req) => !!req.session?.userId,
 *     cspOverrides: {
 *       'connect-src': ["'self'", 'https://api.example.com', 'wss://api.example.com'],
 *     },
 *   }));
 *
 * @example
 *   // Custom route overrides for specific endpoints
 *   const corsRegistry = new middleware.CORSRouteRegistry()
 *     .register('/api/public/', { allowAll: true })
 *     .register('/webhooks/', { allowAll: true, methods: ['POST'] })
 *     .register('/embed/', { origins: ['https://partner.example.com'] });
 *
 *   app.use(...middleware.standardMiddleware({
 *     corsRegistry,
 *     additionalDomains: ['partner.example.com'],
 *   }));
 */
function standardMiddleware(opts = {}) {
  const {
    additionalDomains = [],
    allowLocalhost = process.env.NODE_ENV !== 'production',
    corsRegistry = null,
    hstsMaxAge = 31536000,
    hstsPreload = true,
    hstsIncludeSubdomains = true,
    cspReportUri = '/csp-violations',
    isAuthenticated = null,
    cspOverrides = {},
  } = opts;

  // Build CORS middleware
  const corsMw = corsPolicy({
    additionalDomains,
    allowLocalhost,
    routeRegistry: corsRegistry || new CORSRouteRegistry(),
  });

  // Build security headers middleware
  const securityMw = securityHeaders({
    hstsMaxAge,
    hstsPreload,
    hstsIncludeSubdomains,
    cspReportUri,
    isAuthenticated,
    cspOverrides,
  });

  return [corsMw, securityMw];
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  // ── Security Headers ──────────────────────────────────────────────
  securityHeaders,
  frameOptions,
  cspOverride,
  cspViolationHandler,
  generateNonce,
  buildCSP,
  buildPermissionsPolicy,
  buildReportTo,
  SECURITY_HEADERS_DEFAULTS,

  // ── CORS ───────────────────────────────────────────────────────
  corsPolicy,
  publicCors,
  noCors,
  validateOrigin,
  CORSRouteRegistry,
  FIRST_PARTY_DOMAINS,
  ALLOWED_METHODS,
  ALLOWED_HEADERS,
  EXPOSED_HEADERS,
  PREFLIGHT_MAX_AGE,

  // ── Standard Wiring ────────────────────────────────────────────
  standardMiddleware,
};

// ─── Usage Examples ────────────────────────────────────────────────────────

/*

=== BASIC EXPRESS SETUP ===

const express = require('express');
const middleware = require('@heady-ai/shared/middleware');

const app = express();

// Apply standard middleware to all routes
app.use(...middleware.standardMiddleware());

// CSP violation handler
app.post('/csp-violations',
  express.json({ type: ['application/json', 'application/csp-report'] }),
  middleware.cspViolationHandler({ onViolation: (v) => console.log('CSP:', v) })
);

// Public endpoint
app.get('/api/public/data', middleware.publicCors(['GET']), (req, res) => {
  res.json({ data: 'public' });
});

// Embedded widget (same-origin framing allowed)
app.get('/embed/widget', middleware.frameOptions('SAMEORIGIN'), (req, res) => {
  res.send(`<script nonce="${res.locals.cspNonce}">console.log('widget')</script>`);
});

=== ADVANCED FASTIFY SETUP ===

const fastify = require('fastify');
const middleware = require('@heady-ai/shared/middleware');

const app = fastify();

// Per-route CORS registry
const corsRegistry = new middleware.CORSRouteRegistry()
  .register('/api/public/', { allowAll: true })
  .register('/webhooks/', { allowAll: true })
  .register('/admin/', { credentials: true });

// Register standard middleware
const mw = middleware.standardMiddleware({
  corsRegistry,
  additionalDomains: ['partner.example.com'],
  isAuthenticated: (req) => !!req.user,
});

// Fastify: wrap Express middleware
mw.forEach(m => app.use(m));

=== CUSTOM ROUTE OVERRIDES ===

const app = express();
const { standardMiddleware, cspOverride, frameOptions } = require('@heady-ai/shared/middleware');

app.use(...standardMiddleware());

// Analytics route with custom CSP
app.get('/dashboard', cspOverride({
  'connect-src': ["'self'", 'https://analytics.example.com'],
}), (req, res) => {
  res.send(`<script src="https://analytics.example.com/tracker.js" nonce="${res.locals.cspNonce}"></script>`);
});

*/
