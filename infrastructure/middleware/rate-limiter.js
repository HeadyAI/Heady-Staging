/**
 * Heady™ Rate Limiter Middleware — Fibonacci-Scaled Per-Tier
 * No priorities — all tiers get equal quality, just different capacity.
 * © 2026 HeadySystems Inc.
 */

const PHI = 1.618033988749895;
const PSI = 1 / PHI;

// Fibonacci-scaled rate limits (requests per minute)
const TIER_LIMITS = {
    anonymous: 34,    // Fibonacci
    authenticated: 89, // Fibonacci
    enterprise: 233,   // Fibonacci
};

// Sliding window duration: φ³ seconds ≈ 4.236s windows, aggregated per minute
const WINDOW_MS = 60 * 1000;

// In-memory store (production: use Redis or Cloudflare KV)
const requestCounts = new Map();

function getClientKey(req) {
    // Prefer user ID (Firebase UID), fall back to IP
    if (req.user?.uid) return `uid:${req.user.uid}`;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress;
    return `ip:${ip}`;
}

function getTier(req) {
    if (req.user?.tier === 'enterprise') return 'enterprise';
    if (req.user?.uid && !req.user.isAnonymous) return 'authenticated';
    return 'anonymous';
}

function cleanupExpiredWindows() {
    const now = Date.now();
    for (const [key, windows] of requestCounts.entries()) {
        const active = windows.filter(ts => now - ts < WINDOW_MS);
        if (active.length === 0) requestCounts.delete(key);
        else requestCounts.set(key, active);
    }
}

// Cleanup on Fibonacci interval (89 seconds)
setInterval(cleanupExpiredWindows, 89 * 1000);

/**
 * Rate limiter middleware
 * Returns 429 when limit exceeded with Retry-After header
 */
function rateLimiter(req, res, next) {
    const key = getClientKey(req);
    const tier = getTier(req);
    const limit = TIER_LIMITS[tier];
    const now = Date.now();

    // Get current window
    const windows = requestCounts.get(key) || [];
    const activeWindows = windows.filter(ts => now - ts < WINDOW_MS);

    if (activeWindows.length >= limit) {
        const oldestInWindow = Math.min(...activeWindows);
        const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);

        res.set({
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((oldestInWindow + WINDOW_MS) / 1000)),
            'Retry-After': String(retryAfter),
            'X-Heady-Tier': tier,
        });

        return res.status(429).json({
            error: 'rate_limit_exceeded',
            message: `Rate limit: ${limit} requests/minute for ${tier} tier`,
            retryAfter,
            tier,
        });
    }

    activeWindows.push(now);
    requestCounts.set(key, activeWindows);

    res.set({
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(limit - activeWindows.length),
        'X-RateLimit-Reset': String(Math.ceil((now + WINDOW_MS) / 1000)),
        'X-Heady-Tier': tier,
    });

    next();
}

/**
 * Anomaly detection for anonymous auth abuse
 * Flags IPs with > Fibonacci(8) = 21 anonymous accounts
 */
function anonAbuseDetector(req, res, next) {
    if (req.user?.isAnonymous) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        const anonKey = `anon-abuse:${ip}`;
        const count = (requestCounts.get(anonKey) || []).length;
        if (count > 21) { // Fibonacci
            return res.status(403).json({
                error: 'abuse_detected',
                message: 'Unusual anonymous account activity detected from this network',
            });
        }
    }
    next();
}

module.exports = { rateLimiter, anonAbuseDetector, TIER_LIMITS };
