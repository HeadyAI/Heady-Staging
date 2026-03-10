'use strict';

/**
 * Strict Content Security Policy and security headers middleware.
 * No unsafe-eval, no unsafe-inline (except nonce-based), comprehensive protection.
 */

const HEADY_DOMAINS = [
  'headyme.com',
  'headysystems.com',
  'admin.headysystems.com',
  'heady-ai.com',
  'headyos.com',
  'headyconnection.org',
  'headyconnection.com',
  'headyex.com',
  'headyfinance.com',
];

const CSP_SOURCES = HEADY_DOMAINS.map((d) => `https://${d} https://*.${d}`).join(' ');

/**
 * Generate a random nonce for inline script allowlisting.
 * @returns {string}
 */
function generateNonce() {
  const { randomBytes } = require('node:crypto');
  return randomBytes(16).toString('base64');
}

/**
 * Create CSP and security headers middleware.
 *
 * @param {object} [options]
 * @param {boolean} [options.reportOnly=false] — use Content-Security-Policy-Report-Only
 * @param {string} [options.reportUri] — CSP violation report endpoint
 * @returns {Function} Express middleware
 */
function createCSPMiddleware(options = {}) {
  const { reportOnly = false, reportUri = '/csp-report' } = options;

  const headerName = reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';

  return function cspMiddleware(req, res, next) {
    const nonce = generateNonce();
    res.locals.cspNonce = nonce;

    const cspDirectives = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
      `img-src 'self' data: https: blob:`,
      `font-src 'self' https://fonts.gstatic.com`,
      `connect-src 'self' ${CSP_SOURCES} wss://*.headysystems.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com`,
      `frame-src 'none'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `worker-src 'self' blob:`,
      `manifest-src 'self'`,
      `media-src 'self'`,
      `upgrade-insecure-requests`,
      `report-uri ${reportUri}`,
    ];

    res.setHeader(headerName, cspDirectives.join('; '));

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Remove powered-by header
    res.removeHeader('X-Powered-By');

    next();
  };
}

module.exports = {
  createCSPMiddleware,
  generateNonce,
  HEADY_DOMAINS,
};
