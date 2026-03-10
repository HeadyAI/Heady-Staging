/**
 * Heady™ Shared Security Headers Middleware
 * CSP, CORS, HSTS, X-Content-Type-Options, X-Frame-Options
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */

'use strict';

const ALLOWED_ORIGINS = [
    // 9 Primary Domains
    'https://headyme.com',
    'https://headysystems.com',
    'https://headyapi.com',
    'https://headyconnection.org',
    'https://headybuddy.org',
    'https://headymcp.com',
    'https://headyio.com',
    'https://headybot.com',
    'https://heady-ai.com',
    // Vertical Domains
    'https://headyos.com',
    'https://headyconnection.com',
    'https://headyex.com',
    'https://headyfinance.com',
    // Subdomains
    'https://admin.headysystems.com',
    'https://auth.headysystems.com',
    'https://api.headysystems.com',
    'https://api.headyapi.com',
    // www variants
    'https://www.headyme.com',
    'https://www.headysystems.com',
    'https://www.headyapi.com',
    'https://www.headyconnection.org',
    'https://www.headybuddy.org',
    'https://www.headymcp.com',
    'https://www.headyio.com',
    'https://www.headybot.com',
    'https://www.heady-ai.com',
];

/**
 * Security headers middleware for Express
 * @param {object} [opts]
 * @param {string[]} [opts.allowedOrigins] – Override allowed CORS origins
 * @param {boolean} [opts.isDev] – Enable dev mode (relaxed CORS)
 */
function securityHeaders(opts = {}) {
    const isDev = opts.isDev ?? process.env.NODE_ENV !== 'production';
    const origins = new Set(opts.allowedOrigins || ALLOWED_ORIGINS);

    return (req, res, next) => {
        // — CORS —
        const origin = req.headers.origin;
        if (isDev || (origin && origins.has(origin))) {
            res.setHeader('Access-Control-Allow-Origin', origin || '*');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-Heady-Domain');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24h preflight cache

        // — Security Headers —
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '0'); // Modern browsers use CSP instead
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        // — HSTS (production only) —
        if (!isDev) {
            res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        }

        // — Content Security Policy —
        res.setHeader('Content-Security-Policy', [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://*.headyme.com https://*.headysystems.com https://*.headyapi.com https://*.headyconnection.org https://*.headybuddy.org https://*.headymcp.com https://*.headyio.com https://*.headybot.com https://*.heady-ai.com https://*.headyos.com https://*.headyex.com https://*.headyfinance.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '));

        // Preflight
        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }

        next();
    };
}

/**
 * Graceful shutdown handler
 * @param {import('http').Server} server
 * @param {import('pino').Logger} logger
 * @param {object} [resources] – Resources to close (e.g. { pool: pgPool })
 */
function gracefulShutdown(server, logger, resources = {}) {
    let isShuttingDown = false;

    async function shutdown(signal) {
        if (isShuttingDown) return;
        isShuttingDown = true;
        logger.info({ signal }, 'Graceful shutdown initiated');

        // Stop accepting new connections
        server.close(() => {
            logger.info('HTTP server closed');
        });

        // Drain resources
        for (const [name, resource] of Object.entries(resources)) {
            try {
                if (typeof resource.end === 'function') await resource.end();
                else if (typeof resource.close === 'function') await resource.close();
                else if (typeof resource.destroy === 'function') resource.destroy();
                logger.info({ resource: name }, 'Resource closed');
            } catch (err) {
                logger.error({ err, resource: name }, 'Failed to close resource');
            }
        }

        // Force exit after φ³ seconds ≈ 4.236s
        const forceMs = Math.round(1.618 * 1.618 * 1.618 * 1000);
        setTimeout(() => {
            logger.warn('Forced shutdown after timeout');
            process.exit(1);
        }, forceMs).unref();
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { securityHeaders, gracefulShutdown, ALLOWED_ORIGINS };
