/**
 * Heady Session Server — Sacred Genesis v4.0.0
 * httpOnly cookie-based session management with CSRF protection
 * Port: 3373
 *
 * SECURITY: No localStorage for tokens — httpOnly cookies ONLY
 *
 * @module session-server
 * @author Eric Haywood, HeadySystems Inc.
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const { PHI, PSI, fib, phiBackoff, phiThreshold } = require('../../shared/phi-math');

/** @type {number} Service port */
const PORT = 3373;

/** @type {number} Session TTL ms — fib(17) seconds = ~26.6 minutes */
const SESSION_TTL_MS = fib(17) * 1000;

/** @type {number} CSRF token length bytes — fib(9) */
const CSRF_TOKEN_LENGTH = fib(9);

/** @type {number} Session ID length bytes — fib(9) */
const SESSION_ID_LENGTH = fib(9);

/** @type {number} Maximum concurrent sessions per user — fib(6) */
const MAX_SESSIONS_PER_USER = fib(6);

/** @type {number} Maximum total sessions — fib(16) */
const MAX_TOTAL_SESSIONS = fib(16);

/** @type {string} Cookie name for session */
const SESSION_COOKIE = 'heady_sid';

/** @type {string} Cookie name for CSRF */
const CSRF_COOKIE = 'heady_csrf';

/**
 * Session record
 * @typedef {Object} Session
 * @property {string} id - Session identifier
 * @property {string} userId - Associated user ID
 * @property {string} csrfToken - CSRF protection token
 * @property {number} createdAt - Creation timestamp
 * @property {number} expiresAt - Expiration timestamp
 * @property {number} lastActive - Last activity timestamp
 * @property {string} ipAddress - Client IP address
 * @property {string} userAgent - Client user agent
 * @property {Object} metadata - Session metadata
 */

/** @type {Map<string, Session>} Session store (in production: Redis/encrypted DB) */
const sessions = new Map();

/** @type {Map<string, Set<string>>} User to sessions mapping */
const userSessions = new Map();

/**
 * Generate cryptographically secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} Hex-encoded token
 */
function generateToken(length) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a session ID for storage (never store raw session IDs)
 * @param {string} sessionId - Raw session ID
 * @returns {string} SHA-256 hash
 */
function hashSessionId(sessionId) {
  return crypto.createHash('sha256').update(sessionId).digest('hex');
}

/**
 * Parse cookies from request headers
 * @param {string} cookieHeader - Raw Cookie header
 * @returns {Object<string, string>} Parsed cookies
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [key, ...val] = pair.trim().split('=');
    if (key) cookies[key.trim()] = val.join('=').trim();
  });
  return cookies;
}

/**
 * Build secure Set-Cookie header value
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} options - Cookie options
 * @returns {string} Set-Cookie header value
 */
function buildSetCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];
  parts.push('HttpOnly');
  parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'Strict'}`);
  parts.push(`Path=${options.path || '/'}`);
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  return parts.join('; ');
}

/**
 * Create a new session for a user
 * @param {string} userId - User identifier
 * @param {string} ipAddress - Client IP
 * @param {string} userAgent - Client user agent
 * @returns {Session | {error: string}}
 */
function createSession(userId, ipAddress, userAgent) {
  if (sessions.size >= MAX_TOTAL_SESSIONS) {
    evictExpiredSessions();
    if (sessions.size >= MAX_TOTAL_SESSIONS) {
      return { error: 'Maximum session capacity reached' };
    }
  }

  const userSessionSet = userSessions.get(userId) || new Set();
  if (userSessionSet.size >= MAX_SESSIONS_PER_USER) {
    const oldest = findOldestSession(userSessionSet);
    if (oldest) destroySession(oldest);
  }

  const rawId = generateToken(SESSION_ID_LENGTH);
  const hashedId = hashSessionId(rawId);
  const csrfToken = generateToken(CSRF_TOKEN_LENGTH);
  const now = Date.now();

  const session = {
    id: hashedId,
    userId,
    csrfToken,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    lastActive: now,
    ipAddress,
    userAgent,
    metadata: {}
  };

  sessions.set(hashedId, session);
  userSessionSet.add(hashedId);
  userSessions.set(userId, userSessionSet);

  return { ...session, rawId };
}

/**
 * Validate and retrieve a session
 * @param {string} rawSessionId - Raw session ID from cookie
 * @param {string} csrfToken - CSRF token from header
 * @returns {Session | null}
 */
function validateSession(rawSessionId, csrfToken) {
  if (!rawSessionId) return null;

  const hashedId = hashSessionId(rawSessionId);
  const session = sessions.get(hashedId);

  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    destroySession(hashedId);
    return null;
  }

  if (csrfToken && session.csrfToken !== csrfToken) {
    return null;
  }

  session.lastActive = Date.now();
  session.expiresAt = Date.now() + SESSION_TTL_MS;

  return session;
}

/**
 * Destroy a session
 * @param {string} hashedId - Hashed session ID
 */
function destroySession(hashedId) {
  const session = sessions.get(hashedId);
  if (session) {
    const userSessionSet = userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(hashedId);
      if (userSessionSet.size === 0) userSessions.delete(session.userId);
    }
    sessions.delete(hashedId);
  }
}

/**
 * Find the oldest session in a set
 * @param {Set<string>} sessionSet - Set of session IDs
 * @returns {string|null}
 */
function findOldestSession(sessionSet) {
  let oldest = null;
  let oldestTime = Infinity;
  for (const id of sessionSet) {
    const s = sessions.get(id);
    if (s && s.createdAt < oldestTime) {
      oldest = id;
      oldestTime = s.createdAt;
    }
  }
  return oldest;
}

/**
 * Remove all expired sessions
 */
function evictExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) {
      destroySession(id);
    }
  }
}

// Periodic session cleanup — fib(10) * 1000ms = 55s
setInterval(evictExpiredSessions, fib(10) * 1000);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const cookies = parseCookies(req.headers.cookie);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (url.pathname === '/health' || url.pathname === '/healthz') {
    res.writeHead(200);
    res.end(JSON.stringify({
      service: 'heady-session-server',
      status: 'healthy',
      version: '4.0.0',
      activeSessions: sessions.size,
      maxSessions: MAX_TOTAL_SESSIONS,
      sessionTtlMs: SESSION_TTL_MS
    }));
    return;
  }

  if (url.pathname === '/metrics') {
    const metrics = [
      '# HELP heady_sessions_active Active sessions',
      '# TYPE heady_sessions_active gauge',
      `heady_sessions_active ${sessions.size}`,
      '# HELP heady_sessions_users Unique users with sessions',
      '# TYPE heady_sessions_users gauge',
      `heady_sessions_users ${userSessions.size}`,
    ].join('\n');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(metrics);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/sessions') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { userId } = JSON.parse(body);
        if (!userId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing userId' }));
          return;
        }

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ua = req.headers['user-agent'] || 'unknown';
        const result = createSession(userId, ip, ua);

        if (result.error) {
          res.writeHead(503);
          res.end(JSON.stringify(result));
          return;
        }

        const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
        res.setHeader('Set-Cookie', [
          buildSetCookie(SESSION_COOKIE, result.rawId, { maxAge: maxAgeSec }),
          buildSetCookie(CSRF_COOKIE, result.csrfToken, { maxAge: maxAgeSec, sameSite: 'Strict' })
        ]);

        res.writeHead(201);
        res.end(JSON.stringify({
          sessionId: result.id,
          userId: result.userId,
          csrfToken: result.csrfToken,
          expiresAt: new Date(result.expiresAt).toISOString()
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/sessions/validate') {
    const sessionId = cookies[SESSION_COOKIE];
    const csrf = req.headers['x-csrf-token'] || cookies[CSRF_COOKIE];
    const session = validateSession(sessionId, csrf);

    if (!session) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Invalid or expired session' }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      valid: true,
      userId: session.userId,
      expiresAt: new Date(session.expiresAt).toISOString()
    }));
    return;
  }

  if (req.method === 'DELETE' && url.pathname === '/sessions') {
    const sessionId = cookies[SESSION_COOKIE];
    if (sessionId) {
      destroySession(hashSessionId(sessionId));
    }
    res.setHeader('Set-Cookie', [
      buildSetCookie(SESSION_COOKIE, '', { maxAge: 0 }),
      buildSetCookie(CSRF_COOKIE, '', { maxAge: 0 })
    ]);
    res.writeHead(200);
    res.end(JSON.stringify({ destroyed: true }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(JSON.stringify({
    level: 'info',
    service: 'heady-session-server',
    port: PORT,
    message: 'Session server started',
    sessionTtl: SESSION_TTL_MS,
    maxSessions: MAX_TOTAL_SESSIONS,
    maxPerUser: MAX_SESSIONS_PER_USER
  }) + '\n');
});
