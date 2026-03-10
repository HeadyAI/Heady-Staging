/**
 * host-cookie-binder.js — __Host- Cookie Prefix Enforcement
 *
 * Ensures all session cookies use the __Host- prefix (binding to domain,
 * requiring HTTPS, preventing subdomain override). Also provides
 * origin verification for relay iframes to prevent cross-origin injection.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold } from '../shared/phi-math.js';
import { createHash } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const COOKIE_NAME        = '__Host-heady_session';
const MAX_COOKIE_AGE     = 1597;          // fib(17) seconds ≈ 26.6 min
const ORIGIN_CACHE_SIZE  = 89;            // fib(11)
const NONCE_LENGTH       = 21;            // fib(8) bytes

// ── Allowed Origins (all 9 Heady domains) ────────────────
const ALLOWED_ORIGINS = new Set([
  'https://headyme.com',
  'https://www.headyme.com',
  'https://headysystems.com',
  'https://www.headysystems.com',
  'https://heady-ai.com',
  'https://www.heady-ai.com',
  'https://headyos.com',
  'https://www.headyos.com',
  'https://headyconnection.org',
  'https://www.headyconnection.org',
  'https://headyconnection.com',
  'https://www.headyconnection.com',
  'https://headyex.com',
  'https://www.headyex.com',
  'https://headyfinance.com',
  'https://www.headyfinance.com',
  'https://admin.headysystems.com',
  'https://auth.headysystems.com',
  'https://api.headysystems.com',
  'https://status.headysystems.com',
  'https://developers.headysystems.com',
]);

// Development origins
const DEV_ORIGINS = new Set([
  'http://localhost:3310',
  'http://localhost:3311',
  'http://localhost:3312',
  'http://localhost:3313',
  'http://localhost:3314',
  'http://localhost:3315',
  'http://localhost:3316',
  'http://localhost:3317',
  'http://localhost:3318',
  'http://localhost:3319',
  'http://localhost:8080',
  'http://localhost:5173',
]);

// ── Cookie Options Factory ──────────────────────────────
/**
 * Generate __Host- prefixed cookie options.
 * __Host- cookies MUST have: Secure, Path=/, no Domain attribute.
 */
export function createCookieOptions(options = {}) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: true,
    sameSite: options.sameSite || 'strict',
    path: '/',
    maxAge: options.maxAge || MAX_COOKIE_AGE,
    // __Host- prefix requirements:
    // 1. Must be Secure
    // 2. Must have Path=/
    // 3. Must NOT have Domain attribute (binds to exact host)
    // Domain is intentionally omitted
  };
}

/**
 * Set a __Host- session cookie on the response.
 */
export function setSessionCookie(res, token, options = {}) {
  const cookieOpts = createCookieOptions(options);
  const parts = [
    `${cookieOpts.name}=${token}`,
    'HttpOnly',
    'Secure',
    `SameSite=${cookieOpts.sameSite}`,
    `Path=${cookieOpts.path}`,
    `Max-Age=${cookieOpts.maxAge}`,
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

/**
 * Clear the __Host- session cookie.
 */
export function clearSessionCookie(res) {
  const parts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Secure',
    'SameSite=strict',
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

/**
 * Read the __Host- session cookie from request.
 */
export function readSessionCookie(req) {
  const cookieHeader = req.headers?.cookie || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

// ── Origin Verification for Relay Iframe ────────────────
/**
 * Verify that a postMessage origin is allowed.
 */
export function verifyOrigin(origin, options = {}) {
  const allowDev = options.allowDev ?? (process.env.NODE_ENV !== 'production');
  
  if (ALLOWED_ORIGINS.has(origin)) {
    return { valid: true, source: 'production' };
  }
  
  if (allowDev && DEV_ORIGINS.has(origin)) {
    return { valid: true, source: 'development' };
  }
  
  // Check for Heady subdomain pattern
  const headyPattern = /^https:\/\/([a-z0-9-]+\.)?heady(me|systems|connection|os|ex|finance|-ai)\.(com|org)$/;
  if (headyPattern.test(origin)) {
    return { valid: true, source: 'subdomain' };
  }
  
  return { valid: false, source: 'unknown', origin };
}

/**
 * Generate a nonce for relay iframe communication.
 */
export async function generateRelayNonce() {
  const { randomBytes } = await import('crypto');
  return randomBytes(NONCE_LENGTH).toString('hex');
}

/**
 * Create relay iframe verification message handler script.
 */
export function generateRelayScript(options = {}) {
  const authDomain = options.authDomain || 'https://auth.headysystems.com';
  
  return `
    // Heady Auth Relay — Origin-Verified postMessage Handler
    // Eric Haywood — HeadySystems
    // NO localStorage — httpOnly cookies ONLY
    (function() {
      var allowedOrigins = ${JSON.stringify([...ALLOWED_ORIGINS])};
      
      window.addEventListener('message', function(event) {
        if (allowedOrigins.indexOf(event.origin) === -1) {
          console.warn('[HeadyRelay] Rejected message from unauthorized origin:', event.origin);
          return;
        }
        
        if (event.data && event.data.type === 'HEADY_AUTH_CHECK') {
          // Session cookie is automatically sent with same-origin requests
          // No need to read from localStorage — cookie is httpOnly
          fetch('${authDomain}/api/auth/validate', {
            method: 'GET',
            credentials: 'include'
          })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            event.source.postMessage({
              type: 'HEADY_AUTH_RESPONSE',
              authenticated: data.authenticated || false,
              userId: data.userId || null,
              nonce: event.data.nonce
            }, event.origin);
          })
          .catch(function() {
            event.source.postMessage({
              type: 'HEADY_AUTH_RESPONSE',
              authenticated: false,
              error: 'VALIDATION_FAILED',
              nonce: event.data.nonce
            }, event.origin);
          });
        }
      });
    })();
  `.trim();
}

/**
 * Express/Connect middleware for __Host- cookie enforcement.
 */
export function middleware(options = {}) {
  return (req, res, next) => {
    // Read session from __Host- cookie
    req.sessionToken = readSessionCookie(req);
    
    // Verify Origin header on state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.headers?.origin;
      if (origin) {
        const result = verifyOrigin(origin, options);
        if (!result.valid) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'Invalid origin', code: 'ORIGIN_REJECTED' }));
          return;
        }
      }
    }
    
    next();
  };
}

export { COOKIE_NAME, ALLOWED_ORIGINS, DEV_ORIGINS, MAX_COOKIE_AGE };
export default { createCookieOptions, setSessionCookie, clearSessionCookie, readSessionCookie, verifyOrigin, generateRelayScript, middleware };
