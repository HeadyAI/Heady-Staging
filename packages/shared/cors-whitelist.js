/**
 * Heady CORS Domain Whitelist
 * ───────────────────────────────────────────────────
 * Shared module for approved CORS origins across all Heady services.
 * SECURITY: No wildcard (*) origins — only known Heady domains.
 *
 * Usage:
 *   const { isOriginAllowed, getAllowedOrigin, CORS_HEADERS } = require('@heady/shared/cors-whitelist');
 *   const origin = req.headers.origin;
 *   res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(origin));
 */

'use strict';

const HEADY_DOMAINS = [
    'https://headyme.com',
    'https://headysystems.com',
    'https://headyconnection.org',
    'https://headyconnection.com',
    'https://headybuddy.org',
    'https://headymcp.com',
    'https://headyapi.com',
    'https://headyio.com',
    'https://headyos.com',
    'https://headyweb.com',
    'https://headybot.com',
    'https://headycloud.com',
    'https://headybee.co',
    'https://heady-ai.com',
    'https://headyex.com',
    'https://headyfinance.com',
    'https://admin.headysystems.com',
    'https://auth.headysystems.com',
    'https://api.headysystems.com',
    'https://status.headysystems.com',
];

// Cloud Run service URLs (auto-discovered)
const CLOUD_RUN_PATTERN = /^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z]{2}\.a\.run\.app$/;

// Local development
const LOCAL_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3300',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3300',
];

const ENV = process.env.NODE_ENV || 'development';
const IS_DEV = ENV === 'development' || ENV === 'test';

/**
 * Check if an origin is allowed.
 * In production: only Heady domains + Cloud Run URLs.
 * In development: also allow localhost origins.
 */
function isOriginAllowed(origin) {
    if (!origin) return false;
    if (HEADY_DOMAINS.includes(origin)) return true;
    if (CLOUD_RUN_PATTERN.test(origin)) return true;
    // Wildcard subdomains: *.headysystems.com, *.headyme.com
    if (/^https:\/\/[a-z0-9-]+\.heady(systems|me|connection|mcp|api|io|os|web|bot|cloud|bee|ex|finance|buddy)\.(?:com|org|co)$/.test(origin)) return true;
    if (IS_DEV && LOCAL_ORIGINS.includes(origin)) return true;
    return false;
}

/**
 * Return the allowed origin header value.
 * Returns the origin if allowed, 'null' if not.
 */
function getAllowedOrigin(origin) {
    return isOriginAllowed(origin) ? origin : 'null';
}

/**
 * Standard CORS headers for preflight responses.
 */
const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-Request-Id, X-Heady-Session',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
};

module.exports = { isOriginAllowed, getAllowedOrigin, CORS_HEADERS, HEADY_DOMAINS };
