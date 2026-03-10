/**
 * Heady™ CSP + Security Headers Middleware
 * Strict Content Security Policy — no unsafe-inline, no unsafe-eval
 * © 2026 HeadySystems Inc.
 */

const HEADY_DOMAINS = [
    'headyme.com', 'headysystems.com', 'heady-ai.com', 'headyos.com',
    'headyconnection.org', 'headyconnection.com', 'headyex.com',
    'headyfinance.com', 'headybuddy.org', 'headycloud.com',
    'auth.headysystems.com', 'api.headysystems.com',
];

const CSP_DIRECTIVES = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...HEADY_DOMAINS.map(d => `https://${d}`)],
    'style-src': ["'self'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", ...HEADY_DOMAINS.map(d => `https://${d}`), 'https://*.run.app'],
    'frame-src': ["'self'", 'https://auth.headysystems.com'],
    'frame-ancestors': ["'self'", ...HEADY_DOMAINS.map(d => `https://${d}`)],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
};

function buildCSPString(directives) {
    return Object.entries(directives)
        .map(([key, values]) => values.length > 0 ? `${key} ${values.join(' ')}` : key)
        .join('; ');
}

function securityHeaders(req, res, next) {
    // Content Security Policy
    res.setHeader('Content-Security-Policy', buildCSPString(CSP_DIRECTIVES));

    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Clickjacking protection (CSP frame-ancestors is primary, this is fallback)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // XSS protection (legacy browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // HSTS — 1 year with subdomains
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Permissions Policy — disable unnecessary browser features
    res.setHeader('Permissions-Policy', [
        'camera=()', 'microphone=()', 'geolocation=()',
        'payment=()', 'usb=()', 'magnetometer=()',
        'accelerometer=()', 'gyroscope=()',
    ].join(', '));

    // Cross-Origin policies
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    next();
}

module.exports = { securityHeaders, CSP_DIRECTIVES, HEADY_DOMAINS };
