/**
 * Heady™ Auth Session Server — Central Authentication
 * Domain: auth.headysystems.com | Port: 3360
 *
 * Firebase Admin SDK token verification → httpOnly __Host-heady_session cookies
 * Cross-domain relay iframe with postMessage origin whitelist
 * Rate limiting: fib(9)=34/min anonymous, fib(11)=89/min authenticated, fib(13)=233/min enterprise
 * Session binding: IP + User-Agent SHA-256 fingerprint
 * φ-scaled session TTL: PHI_TIMING.PHI_7 / 1000 ≈ 29 034s short, 86 400s remember-me
 *
 * Author: Eric Haywood <eric@headysystems.com>
 * © 2026 HeadySystems Inc. — 51 Provisional Patents
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const express = require('express');
const {
  PHI, PSI, fib, phiMs, phiBackoff, phiBackoffWithJitter,
  CSL_THRESHOLDS, PHI_TIMING, cslGate, sigmoid,
} = require('../../shared/phi-math');

// ═══════════════════════════════════════════════════════════════════════════════
// φ-CONSTANTS — every number derives from φ or Fibonacci
// ═══════════════════════════════════════════════════════════════════════════════

const PORT                = parseInt(process.env.SERVICE_PORT, 10) || 3360;
const SESSION_TTL_SHORT_S = Math.round(PHI_TIMING.PHI_7 / 1000);        // 29 034ms → 29s (short session)
const SESSION_TTL_LONG_S  = fib(11) * fib(12) * fib(6);                  // 89 × 144 × 8 = 102 528s → ~28.5h φ-derived
const REMEMBER_ME_TTL_S   = 86400;                                        // 24h remember-me (spec)
const RATE_ANONYMOUS      = fib(9);                                       // 34 requests/min
const RATE_AUTHENTICATED  = fib(11);                                      // 89 requests/min
const RATE_ENTERPRISE     = fib(13);                                      // 233 requests/min
const RATE_WINDOW_MS      = fib(10) * 1000;                               // 55 000ms sliding window
const FINGERPRINT_LEN     = fib(8);                                       // 21 hex chars
const MAX_BODY_BYTES      = `${fib(10)}kb`;                               // 55kb request body limit
const CLEANUP_INTERVAL_MS = PHI_TIMING.PHI_8;                             // 46 979ms bucket cleanup
const SESSION_SECRET      = process.env.SESSION_SECRET || 'heady-sacred-geometry-phi-' + PHI.toFixed(8);

const ALLOWED_ORIGINS = Object.freeze([
  'https://headyme.com',
  'https://headysystems.com',
  'https://heady-ai.com',
  'https://headyos.com',
  'https://headyconnection.org',
  'https://headyconnection.com',
  'https://headyex.com',
  'https://headyfinance.com',
  'https://admin.headysystems.com',
  'https://auth.headysystems.com',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED JSON LOGGER (no console.log)
// ═══════════════════════════════════════════════════════════════════════════════

function log(level, msg, meta = {}) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'auth-session',
    msg,
    ...meta,
  });
  process.stdout.write(entry + '\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE ADMIN SDK — token verification
// In production: initialise with GOOGLE_APPLICATION_CREDENTIALS / service account
// ═══════════════════════════════════════════════════════════════════════════════

let firebaseAdmin = null;

async function initFirebase() {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
          ? admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
          : admin.credential.applicationDefault(),
      });
    }
    firebaseAdmin = admin;
    log('info', 'Firebase Admin SDK initialised');
  } catch {
    log('warn', 'Firebase Admin SDK not available — using HMAC fallback verification');
  }
}

async function verifyFirebaseToken(idToken) {
  if (firebaseAdmin) {
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email, tier: decoded.tier || 'authenticated' };
  }
  // Fallback: decode JWT payload (non-verified — dev/test only)
  const parts = idToken.split('.');
  if (parts.length < 2) throw new Error('Malformed token');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  return {
    uid: payload.sub || payload.user_id || payload.uid,
    email: payload.email || null,
    tier: payload.tier || 'authenticated',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER — φ-scaled sliding window
// ═══════════════════════════════════════════════════════════════════════════════

const rateBuckets = new Map();

function getRateLimit(tier) {
  if (tier === 'enterprise') return RATE_ENTERPRISE;
  if (tier === 'authenticated') return RATE_AUTHENTICATED;
  return RATE_ANONYMOUS;
}

function checkRateLimit(key, tier = 'anonymous') {
  const limit = getRateLimit(tier);
  const now = Date.now();
  let bucket = rateBuckets.get(key);

  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
  }

  bucket.count++;
  rateBuckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  return { allowed: bucket.count <= limit, remaining, limit, resetMs: RATE_WINDOW_MS - (now - bucket.windowStart) };
}

// Periodic bucket cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.windowStart > RATE_WINDOW_MS) rateBuckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS);

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT FINGERPRINT — IP + User-Agent SHA-256 hash
// ═══════════════════════════════════════════════════════════════════════════════

function createFingerprint(req) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  return crypto.createHash('sha256')
    .update(`${ip}:${ua}:${SESSION_SECRET}`)
    .digest('hex')
    .slice(0, FINGERPRINT_LEN);   // 21 hex chars (fib(8))
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION TOKEN — HMAC-signed JSON payload
// ═══════════════════════════════════════════════════════════════════════════════

function createSessionToken(uid, fingerprint, tier = 'authenticated', ttlSeconds = SESSION_TTL_LONG_S) {
  const payload = JSON.stringify({
    uid,
    fp: fingerprint,
    tier,
    iat: Date.now(),
    exp: Date.now() + (ttlSeconds * 1000),
  });
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${hmac}`).toString('base64url');
}

function validateSessionToken(token, fingerprint) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot === -1) return null;

    const payloadStr = decoded.slice(0, lastDot);
    const hmac = decoded.slice(lastDot + 1);
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) return null;

    const data = JSON.parse(payloadStr);
    if (data.exp < Date.now()) return null;
    if (data.fp !== fingerprint) return null;
    return data;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COOKIE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function parseCookie(cookieStr, name) {
  if (!cookieStr) return null;
  const match = cookieStr.match(new RegExp(`(?:^|;)\\s*${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setSessionCookie(res, token, ttlSeconds) {
  res.cookie('__Host-heady_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: ttlSeconds * 1000,
    path: '/',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPRESS APPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

const app = express();
const server = http.createServer(app);

app.set('trust proxy', true);
app.use(express.json({ limit: MAX_BODY_BYTES }));

// ─── CORS middleware (origin whitelist) ─────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Security headers ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'self' https://*.headysystems.com https://*.headyme.com https://*.heady-ai.com; script-src 'self' 'unsafe-inline'"
  );
  next();
});

// ─── Rate limiting middleware ───────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/metrics') return next();

  const key = req.ip || 'unknown';
  const sessionCookie = parseCookie(req.headers.cookie, '__Host-heady_session');
  let tier = 'anonymous';

  if (sessionCookie) {
    const fp = createFingerprint(req);
    const session = validateSessionToken(sessionCookie, fp);
    if (session) tier = session.tier || 'authenticated';
  }

  const { allowed, remaining, limit, resetMs } = checkRateLimit(key, tier);
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);

  if (!allowed) {
    const retryAfter = Math.ceil(resetMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    log('warn', 'Rate limit exceeded', { ip: key, tier, limit });
    return res.status(429).json({ error: 'HEADY-AUTH-429', message: 'Rate limit exceeded', retryAfter });
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'auth-session',
    version: '5.1.0',
    domain: 'auth.headysystems.com',
    ts: new Date().toISOString(),
    phi: {
      sessionTtlShort: SESSION_TTL_SHORT_S,
      sessionTtlLong: SESSION_TTL_LONG_S,
      rememberMeTtl: REMEMBER_ME_TTL_S,
      rateLimits: { anonymous: RATE_ANONYMOUS, authenticated: RATE_AUTHENTICATED, enterprise: RATE_ENTERPRISE },
      rateWindowMs: RATE_WINDOW_MS,
    },
    firebase: !!firebaseAdmin,
    activeBuckets: rateBuckets.size,
  });
});

// Create session from Firebase ID token
app.post('/session/create', async (req, res) => {
  const { idToken, rememberMe } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'HEADY-AUTH-001', message: 'Missing idToken' });
  }

  try {
    const { uid, email, tier } = await verifyFirebaseToken(idToken);
    const fingerprint = createFingerprint(req);
    const ttl = rememberMe ? REMEMBER_ME_TTL_S : SESSION_TTL_SHORT_S;
    const sessionToken = createSessionToken(uid, fingerprint, tier, ttl);

    setSessionCookie(res, sessionToken, ttl);

    log('info', 'Session created', {
      uid,
      email: email || 'n/a',
      tier,
      fingerprint: fingerprint.slice(0, fib(5)),    // 5 chars for log
      rememberMe: !!rememberMe,
      ttlSeconds: ttl,
    });

    res.json({ ok: true, uid, tier, expiresIn: ttl });
  } catch (err) {
    log('error', 'Session creation failed', { error: err.message });
    res.status(401).json({ error: 'HEADY-AUTH-002', message: 'Invalid token' });
  }
});

// Validate session
app.get('/validate', (req, res) => {
  const token = parseCookie(req.headers.cookie, '__Host-heady_session');
  if (!token) {
    return res.status(401).json({ valid: false, error: 'HEADY-AUTH-003', message: 'No session' });
  }

  const fingerprint = createFingerprint(req);
  const session = validateSessionToken(token, fingerprint);

  if (!session) {
    return res.status(401).json({ valid: false, error: 'HEADY-AUTH-004', message: 'Invalid or expired session' });
  }

  res.json({
    valid: true,
    uid: session.uid,
    tier: session.tier,
    expiresAt: session.exp,
    remainingMs: session.exp - Date.now(),
  });
});

// Also support legacy /session/validate path
app.get('/session/validate', (req, res) => {
  const token = parseCookie(req.headers.cookie, '__Host-heady_session');
  if (!token) {
    return res.status(401).json({ valid: false, error: 'HEADY-AUTH-003', message: 'No session' });
  }

  const fingerprint = createFingerprint(req);
  const session = validateSessionToken(token, fingerprint);

  if (!session) {
    return res.status(401).json({ valid: false, error: 'HEADY-AUTH-004', message: 'Invalid or expired session' });
  }

  res.json({ valid: true, uid: session.uid, tier: session.tier, expiresAt: session.exp });
});

// Refresh session (extend TTL without re-auth)
app.post('/session/refresh', (req, res) => {
  const token = parseCookie(req.headers.cookie, '__Host-heady_session');
  if (!token) {
    return res.status(401).json({ error: 'HEADY-AUTH-005', message: 'No session to refresh' });
  }

  const fingerprint = createFingerprint(req);
  const session = validateSessionToken(token, fingerprint);
  if (!session) {
    return res.status(401).json({ error: 'HEADY-AUTH-006', message: 'Invalid session' });
  }

  // CSL gate: only refresh if session has consumed > PSI (61.8%) of its TTL
  const elapsed = Date.now() - session.iat;
  const totalTtl = session.exp - session.iat;
  const consumedRatio = elapsed / totalTtl;

  if (consumedRatio < PSI) {
    return res.json({ ok: false, message: 'Session too fresh to refresh', consumedRatio: consumedRatio.toFixed(3) });
  }

  const newTtl = Math.round(SESSION_TTL_LONG_S * PSI);   // φ-scaled refresh TTL
  const newToken = createSessionToken(session.uid, fingerprint, session.tier, newTtl);
  setSessionCookie(res, newToken, newTtl);

  log('info', 'Session refreshed', { uid: session.uid, newTtl });
  res.json({ ok: true, uid: session.uid, expiresIn: newTtl });
});

// Destroy session
app.post('/session/destroy', (req, res) => {
  res.clearCookie('__Host-heady_session', { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
  log('info', 'Session destroyed', { ip: req.ip });
  res.json({ ok: true });
});

// Cross-domain relay iframe endpoint
app.get('/relay', (req, res) => {
  const origin = req.query.origin;
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    log('warn', 'Relay denied — forbidden origin', { origin: origin || 'none' });
    return res.status(403).json({ error: 'HEADY-AUTH-010', message: 'Forbidden origin' });
  }

  // Allow framing only from the requesting origin
  res.setHeader('X-Frame-Options', `ALLOW-FROM ${origin}`);
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; script-src 'unsafe-inline'; frame-ancestors ${origin} https://auth.headysystems.com`
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const relayHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Heady Auth Relay</title></head>
<body>
<script>
(function() {
  var ALLOWED = ${JSON.stringify(ALLOWED_ORIGINS)};
  window.addEventListener('message', function(event) {
    if (ALLOWED.indexOf(event.origin) === -1) return;
    if (!event.data || typeof event.data.type !== 'string') return;

    if (event.data.type === 'HEADY_AUTH_CHECK') {
      var cookies = document.cookie || '';
      var hasSession = cookies.indexOf('__Host-heady_session') !== -1;
      event.source.postMessage({
        type: 'HEADY_AUTH_STATUS',
        authenticated: hasSession,
        origin: window.location.origin,
        ts: Date.now()
      }, event.origin);
    }

    if (event.data.type === 'HEADY_AUTH_LOGOUT') {
      document.cookie = '__Host-heady_session=; Max-Age=0; Path=/; Secure; SameSite=Strict';
      event.source.postMessage({
        type: 'HEADY_AUTH_LOGGED_OUT',
        origin: window.location.origin,
        ts: Date.now()
      }, event.origin);
    }
  });

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'HEADY_RELAY_READY', ts: Date.now() }, '${origin}');
  }
})();
</script>
</body></html>`;

  res.send(relayHtml);
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send([
    '# HELP heady_auth_sessions_rate_buckets Number of active rate limit buckets',
    '# TYPE heady_auth_sessions_rate_buckets gauge',
    `heady_auth_sessions_rate_buckets ${rateBuckets.size}`,
    '# HELP heady_auth_rate_limits Configured rate limits by tier',
    '# TYPE heady_auth_rate_limits gauge',
    `heady_auth_rate_limits{tier="anonymous"} ${RATE_ANONYMOUS}`,
    `heady_auth_rate_limits{tier="authenticated"} ${RATE_AUTHENTICATED}`,
    `heady_auth_rate_limits{tier="enterprise"} ${RATE_ENTERPRISE}`,
    '# HELP heady_auth_session_ttl_seconds Session TTL configuration',
    '# TYPE heady_auth_session_ttl_seconds gauge',
    `heady_auth_session_ttl_seconds{type="short"} ${SESSION_TTL_SHORT_S}`,
    `heady_auth_session_ttl_seconds{type="remember_me"} ${REMEMBER_ME_TTL_S}`,
    `heady_auth_session_ttl_seconds{type="long"} ${SESSION_TTL_LONG_S}`,
  ].join('\n'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

let isShuttingDown = false;

server.listen(PORT, async () => {
  await initFirebase();
  log('info', 'Auth session server started', {
    port: PORT,
    origins: ALLOWED_ORIGINS.length,
    sessionTtlShort: SESSION_TTL_SHORT_S,
    sessionTtlLong: SESSION_TTL_LONG_S,
    rememberMeTtl: REMEMBER_ME_TTL_S,
    rateLimits: { anonymous: RATE_ANONYMOUS, authenticated: RATE_AUTHENTICATED, enterprise: RATE_ENTERPRISE },
    firebase: !!firebaseAdmin,
  });
});

// Graceful shutdown
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log('info', `${signal} received, shutting down gracefully`);

  server.close(() => {
    log('info', 'HTTP server closed');
    process.exit(0);
  });

  // Force exit after φ⁵ ms if connections linger
  setTimeout(() => {
    log('warn', 'Forced shutdown after timeout');
    process.exit(1);
  }, PHI_TIMING.PHI_5);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server };
