/**
 * Heady™ CORS Middleware v6.0
 * Strict origin validation — no wildcard in production
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const { createLogger } = require('../logger');
const { fib } = require('../phi-math');

const logger = createLogger('cors');

// ═══════════════════════════════════════════════════════════
// ALLOWED ORIGINS — Explicit list, no wildcards
// ═══════════════════════════════════════════════════════════

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
]);

// Development origins added only if NODE_ENV !== 'production'
const DEV_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3370',
  'http://localhost:3371',
  'http://localhost:3372',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
]);

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Heady-CSRF',
  'X-Request-ID',
  'X-Correlation-ID',
  'Accept',
  'Accept-Language',
].join(', ');

const EXPOSED_HEADERS = [
  'X-Request-ID',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
].join(', ');

const MAX_AGE = String(fib(11) * 60);  // 89 minutes = 5340 seconds

function createCorsMiddleware(options = {}) {
  const isProduction = (process.env.NODE_ENV || 'production') === 'production';
  const allowedOrigins = new Set([...ALLOWED_ORIGINS]);
  
  if (!isProduction) {
    for (const origin of DEV_ORIGINS) {
      allowedOrigins.add(origin);
    }
  }

  // Add any custom origins
  if (options.additionalOrigins) {
    for (const origin of options.additionalOrigins) {
      allowedOrigins.add(origin);
    }
  }

  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;

    if (!origin) {
      // Same-origin or non-browser — no CORS headers needed
      if (next) return next();
      return;
    }

    if (!allowedOrigins.has(origin)) {
      logger.warn({
        message: 'CORS origin rejected',
        origin,
        ip: req.socket.remoteAddress,
      });
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Origin not allowed' }));
      return;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', MAX_AGE);
    res.setHeader('Vary', 'Origin');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (next) next();
  };
}

module.exports = { createCorsMiddleware, ALLOWED_ORIGINS };
