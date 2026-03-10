/**
 * Heady™ Content Security Policy Headers
 * Strict CSP for all 9 sites — no unsafe-inline, no unsafe-eval
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const HEADY_DOMAINS = [
  'headyme.com', 'headysystems.com', 'heady-ai.com', 'headyos.com',
  'headyconnection.org', 'headyconnection.com', 'headyex.com',
  'headyfinance.com', 'admin.headysystems.com', 'auth.headysystems.com',
];

const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'strict-dynamic'", ...HEADY_DOMAINS.map(d => `https://${d}`)],
  'style-src': ["'self'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", ...HEADY_DOMAINS.map(d => `https://${d}`), ...HEADY_DOMAINS.map(d => `wss://${d}`)],
  'frame-src': ["'self'", 'https://auth.headysystems.com'],
  'frame-ancestors': ["'self'", ...HEADY_DOMAINS.map(d => `https://${d}`)],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
};

function buildCSPHeader() {
  return Object.entries(CSP_POLICY)
    .map(([key, values]) => values.length > 0 ? `${key} ${values.join(' ')}` : key)
    .join('; ');
}

function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', buildCSPHeader());
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');  // CSP replaces this
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (next) next();
}

module.exports = { securityHeaders, buildCSPHeader, CSP_POLICY, HEADY_DOMAINS };
