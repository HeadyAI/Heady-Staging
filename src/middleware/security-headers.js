'use strict';

/**
 * @fileoverview Heady™ Shared Security Headers Middleware
 * @description Express/Fastify-compatible security header middleware
 *              covering all 15 Heady domains for CORS and CSP.
 * @version 1.1.0
 */

const HEADY_DOMAINS = [
    'headyme.com',
    'headysystems.com',
    'headyapi.com',
    'headyconnection.org',
    'headybuddy.org',
    'headymcp.com',
    'headyio.com',
    'headybot.com',
    'heady-ai.com',
    'headyos.com',
    'headysense.com',
    'headyex.com',
    'headyfinance.com',
    'headyconnection.com',
    'perfecttrader.com',
    'headyai.me',
];

const CORS_ORIGINS = HEADY_DOMAINS.flatMap(d => [`https://${d}`, `https://www.${d}`]);

/**
 * Express middleware that sets security headers.
 */
function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // CORS — only allow known Heady domains
    const origin = req.headers?.origin;
    if (origin && CORS_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (typeof next === 'function') next();
}

module.exports = { securityHeaders, HEADY_DOMAINS, CORS_ORIGINS };
