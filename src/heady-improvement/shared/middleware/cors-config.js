'use strict';

/**
 * Explicit 9-domain CORS whitelist for the Heady platform.
 * NO wildcards. Every origin is explicitly enumerated.
 */

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
];

/**
 * All allowed origins (https:// with and without www).
 */
const ALLOWED_ORIGINS = new Set();
for (const domain of HEADY_DOMAINS) {
  ALLOWED_ORIGINS.add(`https://${domain}`);
  // admin.headysystems.com doesn't get www
  if (!domain.startsWith('admin.')) {
    ALLOWED_ORIGINS.add(`https://www.${domain}`);
  }
}

/**
 * Check if an origin is in the Heady allowed list.
 *
 * @param {string} origin
 * @returns {boolean}
 */
function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin);
}

/**
 * CORS configuration object for use with the `cors` npm package.
 * Never returns Access-Control-Allow-Origin: *.
 */
const corsOptions = {
  origin: function originValidator(origin, callback) {
    // Allow requests with no Origin (server-to-server, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    if (ALLOWED_ORIGINS.has(origin)) {
      callback(null, origin);
    } else {
      callback(new Error(`CORS: origin '${origin}' not in Heady domain whitelist`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Correlation-ID',
    'X-Request-ID',
    'X-Request-Nonce',
    'X-Service-Signature',
    'X-Service-Timestamp',
  ],
  exposedHeaders: [
    'X-Correlation-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
  ],
  maxAge: 86400, // 24 hours preflight cache
};

/**
 * Create CORS middleware (standalone, without the cors package).
 *
 * @returns {Function} Express middleware
 */
function createCorsMiddleware() {
  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;

    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
      res.setHeader('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(','));
      res.setHeader('Access-Control-Max-Age', String(corsOptions.maxAge));
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

module.exports = {
  HEADY_DOMAINS,
  ALLOWED_ORIGINS,
  isAllowedOrigin,
  corsOptions,
  createCorsMiddleware,
};
