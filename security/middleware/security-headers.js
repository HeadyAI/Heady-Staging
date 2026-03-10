/**
 * Heady Security Headers Middleware — Sacred Genesis v4.0.0
 * Content Security Policy, Rate Limiting, CORS configuration
 *
 * @module security-headers
 * @author Eric Haywood, HeadySystems Inc.
 */

'use strict';

const { PHI, PSI, fib, phiThreshold } = require('../../shared/phi-math');

/**
 * Content Security Policy directives
 * @readonly
 * @type {Object<string, string[]>}
 */
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'strict-dynamic'"],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': [
    "'self'",
    'https://*.headysystems.com',
    'https://*.headyme.com',
    'https://*.headyapi.com',
    'wss://*.headysystems.com'
  ],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

/**
 * Build CSP header string from directives
 * @param {Object<string, string[]>} directives - CSP directives
 * @returns {string} CSP header value
 */
function buildCSP(directives) {
  return Object.entries(directives)
    .map(([key, values]) => values.length > 0 ? `${key} ${values.join(' ')}` : key)
    .join('; ');
}

/**
 * CORS configuration
 * @readonly
 * @type {Object}
 */
const CORS_CONFIG = {
  allowedOrigins: [
    'https://headyme.com',
    'https://headysystems.com',
    'https://headyapi.com',
    'https://headybuddy.com',
    'https://headymcp.com',
    'https://heady.io',
    'https://headyconnection.org',
    'https://headyconnection.com',
    'https://headybot.com',
    'https://admin.headysystems.com'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Request-ID',
    'X-Heady-Role',
    'X-Heady-Service'
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  maxAge: fib(12),
  credentials: true
};

/**
 * Rate limiter using token bucket algorithm with phi-derived parameters
 */
class RateLimiter {
  /**
   * @param {Object} options
   * @param {number} [options.maxTokens] - Maximum tokens — fib(11) default
   * @param {number} [options.refillRate] - Tokens per second — fib(9) default
   * @param {number} [options.windowMs] - Window in ms — fib(10)*1000 default
   */
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || fib(11);
    this.refillRate = options.refillRate || fib(9);
    this.windowMs = options.windowMs || fib(10) * 1000;
    this.buckets = new Map();
    this._cleanup = setInterval(() => this._evictStale(), fib(10) * 1000);
  }

  consume(key) {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsed * this.refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
    }

    const retryAfterMs = Math.ceil((1 - bucket.tokens) / this.refillRate * 1000);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  _evictStale() {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, bucket] of this.buckets) {
      if (bucket.lastRefill < cutoff) this.buckets.delete(key);
    }
  }

  destroy() {
    clearInterval(this._cleanup);
    this.buckets.clear();
  }
}

function applySecurityHeaders(res, options = {}) {
  res.setHeader('Content-Security-Policy', buildCSP(options.csp || CSP_DIRECTIVES));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

function applyCORS(req, res) {
  const origin = req.headers.origin;
  if (origin && CORS_CONFIG.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (CORS_CONFIG.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Expose-Headers', CORS_CONFIG.exposedHeaders.join(', '));
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', CORS_CONFIG.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', String(CORS_CONFIG.maxAge));
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

module.exports = { CSP_DIRECTIVES, CORS_CONFIG, RateLimiter, applySecurityHeaders, applyCORS, buildCSP };
