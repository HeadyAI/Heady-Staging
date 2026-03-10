'use strict';

const cors = require('cors');
const { SESSION_COOKIE_NAME, validateSession } = require('./session');

/**
 * All 9 Heady domains authorized for CORS.
 */
const HEADY_ORIGINS = [
  'https://headyme.com',
  'https://www.headyme.com',
  'https://headysystems.com',
  'https://www.headysystems.com',
  'https://admin.headysystems.com',
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
];

/**
 * Create CORS middleware configured for Heady domains only.
 * Never uses Access-Control-Allow-Origin: *.
 *
 * @returns {Function} Express CORS middleware
 */
function createCorsMiddleware() {
  return cors({
    origin: function originCheck(origin, callback) {
      if (!origin) {
        // Allow server-to-server requests with no Origin header
        callback(null, true);
        return;
      }
      if (HEADY_ORIGINS.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID'],
    exposedHeaders: ['X-Correlation-ID'],
    maxAge: 86400,
  });
}

/**
 * Authentication middleware that validates the __Host-heady_session cookie
 * and attaches the user object to req.user.
 *
 * @param {object} log — structured logger instance
 * @returns {Function} Express middleware
 */
function requireAuth(log) {
  return async function requireAuthMiddleware(req, res, next) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionCookie) {
      log.warn('Auth: missing session cookie', {
        path: req.path,
        ip: req.ip,
      });
      res.status(401).json({
        code: 'HEADY-AUTH-001',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const ip = req.ip || req.socket?.remoteAddress || '';
      const userAgent = req.get('user-agent') || '';
      const storedFingerprint = req.cookies?.__heady_fp || null;

      const user = await validateSession(sessionCookie, ip, userAgent, storedFingerprint);
      req.user = user;
      next();
    } catch (err) {
      log.warn('Auth: invalid session', {
        error: err.message,
        path: req.path,
        ip: req.ip,
      });
      res.status(401).json({
        code: 'HEADY-AUTH-002',
        message: 'Invalid or expired session',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

module.exports = {
  createCorsMiddleware,
  requireAuth,
  HEADY_ORIGINS,
};
