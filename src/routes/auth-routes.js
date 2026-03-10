/* ╔══════════════════════════════════════════════════════════════════╗
   ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
   ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
   ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
   ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
   ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
   ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
   ║                                                                  ║
   ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
   ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
   ║  FILE: src/routes/auth-routes.js                                ║
   ║  LAYER: routing                                                 ║
   ║  PURPOSE: Authentication endpoints & session management          ║
   ╚══════════════════════════════════════════════════════════════════╝
   HEADY_BRAND:END */

import express from 'express';
import crypto from 'crypto';
<<<<<<< HEAD
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createLogger } = require('../../packages/structured-logger');
=======
import { createLogger } from '../../packages/structured-logger.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
>>>>>>> ff90ed86a9ef62b7f4c0a1859df317b5a404ae63
const router = express.Router();
const log = createLogger('auth', 'authentication');

// ═════════════════════════════════════════════════════════════════════════════
// PASSWORD HASHING (bcrypt-like using PBKDF2)
// ═════════════════════════════════════════════════════════════════════════════

const HASH_ITERATIONS = 100000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = 'sha512';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

// ═════════════════════════════════════════════════════════════════════════════
// SESSION CONFIG
// ═════════════════════════════════════════════════════════════════════════════

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SESSIONS_PER_USER = 5;
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const COOKIE_NAME = 'heady_session';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: SESSION_TTL_MS,
  path: '/',
};

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// ═════════════════════════════════════════════════════════════════════════════
// PERSISTENT STORAGE (Neon Postgres + in-memory fallback)
// ═════════════════════════════════════════════════════════════════════════════

let pgPool = null;
let useDb = false;

// Try to initialize Postgres connection pool
try {
  const { Pool } = require('pg');
  if (process.env.DATABASE_URL) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
    useDb = true;
    log.info('Auth using Neon Postgres for sessions/users');

    // Auto-create tables if they don't exist
    pgPool.query(`
      CREATE TABLE IF NOT EXISTS heady_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS heady_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES heady_users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON heady_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON heady_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_users_email ON heady_users(email);
<<<<<<< HEAD
    `).then(() => {
      log.info('Auth tables ready');
      // Seed admin after tables exist
      if (process.env.HEADY_ADMIN_EMAIL && process.env.HEADY_ADMIN_PASSWORD) {
        const adminUser = {
          id: 'admin-owner-1',
          email: process.env.HEADY_ADMIN_EMAIL,
          passwordHash: hashPassword(process.env.HEADY_ADMIN_PASSWORD),
          name: process.env.HEADY_ADMIN_NAME || 'Admin',
        };
        createUser(adminUser).catch(err => log.error('Admin seed failed', { error: err.message }));
      }
    }).catch(err => log.error('Auth table creation failed', { error: err.message }));
=======
    `).then(() => log.info('Auth tables ready'))
      .catch(err => log.error('Auth table creation failed', { error: err.message }));
>>>>>>> ff90ed86a9ef62b7f4c0a1859df317b5a404ae63
  }
} catch (err) {
  log.warn('pg not available, using in-memory auth storage', { error: err.message });
}

// In-memory fallback (used when DB unavailable)
const memSessions = new Map();
const memUsers = new Map();

// Rate limiting for login attempts (always in-memory, not persisted)
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// ── DB-backed user/session helpers ──────────────────────────────────────────

async function findUserByEmail(email) {
  if (useDb) {
    const result = await pgPool.query('SELECT id, email, password_hash, name, preferences FROM heady_users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return { id: row.id, email: row.email, passwordHash: row.password_hash, name: row.name, preferences: row.preferences };
    }
    return null;
  }
  for (const [, u] of memUsers) {
    if (u.email === email) return u;
  }
  return null;
}

async function findUserById(id) {
  if (useDb) {
    const result = await pgPool.query('SELECT id, email, password_hash, name, preferences FROM heady_users WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return { id: row.id, email: row.email, passwordHash: row.password_hash, name: row.name, preferences: row.preferences };
    }
    return null;
  }
  return memUsers.get(id) || null;
}

async function createUser(user) {
  if (useDb) {
    await pgPool.query(
      'INSERT INTO heady_users (id, email, password_hash, name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      [user.id, user.email, user.passwordHash, user.name]
    );
  }
  memUsers.set(user.id, user);
}

async function createSession(token, session) {
  if (useDb) {
    await pgPool.query(
      'INSERT INTO heady_sessions (token, user_id, email, name, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [token, session.userId, session.email, session.name, session.createdAt, session.expiresAt]
    );
  }
  memSessions.set(token, session);
}

async function getSession(token) {
  if (useDb) {
    const result = await pgPool.query('SELECT * FROM heady_sessions WHERE token = $1 AND expires_at > $2', [token, Date.now()]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return { userId: row.user_id, email: row.email, name: row.name, createdAt: Number(row.created_at), expiresAt: Number(row.expires_at) };
    }
    return null;
  }
  return memSessions.get(token) || null;
}

async function deleteSession(token) {
  if (useDb) {
    await pgPool.query('DELETE FROM heady_sessions WHERE token = $1', [token]);
  }
  memSessions.delete(token);
}

async function countUserSessions(userId) {
  if (useDb) {
    const result = await pgPool.query('SELECT COUNT(*) as count FROM heady_sessions WHERE user_id = $1 AND expires_at > $2', [userId, Date.now()]);
    return parseInt(result.rows[0].count, 10);
  }
  let count = 0;
  for (const [, s] of memSessions) { if (s.userId === userId) count++; }
  return count;
}

async function deleteOldestSession(userId) {
  if (useDb) {
    await pgPool.query('DELETE FROM heady_sessions WHERE token = (SELECT token FROM heady_sessions WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)', [userId]);
  } else {
    let oldestToken = null, oldestTime = Infinity;
    for (const [tok, sess] of memSessions) {
      if (sess.userId === userId && sess.createdAt < oldestTime) { oldestTime = sess.createdAt; oldestToken = tok; }
    }
    if (oldestToken) memSessions.delete(oldestToken);
  }
}

async function updateUserPreferences(userId, preferences) {
  if (useDb) {
    await pgPool.query('UPDATE heady_users SET preferences = $1 WHERE id = $2', [JSON.stringify(preferences), userId]);
  }
  const user = memUsers.get(userId);
  if (user) user.preferences = preferences;
}

<<<<<<< HEAD
=======
// Seed admin user from env (password from env, NOT hardcoded)
if (process.env.HEADY_ADMIN_EMAIL && process.env.HEADY_ADMIN_PASSWORD) {
  const adminUser = {
    id: 'admin-owner-1',
    email: process.env.HEADY_ADMIN_EMAIL,
    passwordHash: hashPassword(process.env.HEADY_ADMIN_PASSWORD),
    name: process.env.HEADY_ADMIN_NAME || 'Admin',
  };
  createUser(adminUser).catch(err => log.error('Admin seed failed', { error: err.message }));
}

>>>>>>> ff90ed86a9ef62b7f4c0a1859df317b5a404ae63
// Periodic session cleanup
setInterval(async () => {
  const now = Date.now();
  if (useDb) {
    try {
      await pgPool.query('DELETE FROM heady_sessions WHERE expires_at < $1', [now]);
    } catch (err) {
      log.error('Session cleanup failed', { error: err.message });
    }
  }
  for (const [token, session] of memSessions) {
    if (session.expiresAt && now > session.expiresAt) {
      memSessions.delete(token);
    }
  }
}, SESSION_CLEANUP_INTERVAL);

// ═════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Timing-safe comparison for API keys and sensitive strings.
 * Prevents timing attacks by always comparing full length.
 */
function timingSafeEqual(a, b) {
  if (!a || !b) return false;
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a secure session token.
 * In production, use a proper JWT or session library.
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// ═════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Middleware: Validate Bearer token and attach user to req.user
 * Returns 401 if token is invalid or missing.
 */
async function requireAuth(req, res, next) {
  // Check httpOnly cookie first, then fall back to Bearer header
  let token = req.cookies?.[COOKIE_NAME] || null;
  if (!token) {
    token = extractToken(req.headers.authorization);
  }

  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing session cookie or Authorization header',
    });
  }

  try {
    const session = await getSession(token);
    if (!session) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid or expired session token',
      });
    }

    // Check session expiry
    if (session.expiresAt && Date.now() > session.expiresAt) {
      await deleteSession(token);
      return res.status(401).json({
        error: 'session_expired',
        message: 'Session has expired. Please log in again.',
      });
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User not found',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    req.token = token;

    next();
  } catch (error) {
    log.error('Auth middleware error', { error: error.message });
    return res.status(500).json({ error: 'server_error', message: 'Authentication check failed' });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /login
 * Authenticate user with email/password or apiKey.
 *
 * Request:
 *   - { email, password } — credential-based login
 *   - { apiKey } — API key login (validated against ADMIN_TOKEN)
 *
 * Response:
 *   - 200: { token, user: { id, email, name } }
 *   - 401: { error, message }
 *   - 400: { error, message }
 */
router.post('/login', async (req, res) => {
  const { email, password, apiKey } = req.body;

  try {
    // API Key authentication
    if (apiKey) {
      const adminToken = process.env.ADMIN_TOKEN;

      if (!adminToken) {
        return res.status(500).json({
          error: 'server_error',
          message: 'ADMIN_TOKEN not configured',
        });
      }

      if (!timingSafeEqual(apiKey, adminToken)) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid API key',
        });
      }

      const token = generateToken();
      const adminUser = {
        id: 'admin-system',
        email: 'system@heady.internal',
        name: 'System Admin',
      };

      await createSession(token, {
        userId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL_MS,
      });

      setSessionCookie(res, token);
      return res.status(200).json({ token, user: adminUser });
    }

    // Email/password authentication
    if (!email || !password) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Email and password are required',
      });
    }

    // Sanitize email
    const cleanEmail = String(email).toLowerCase().trim();

    // Check login rate limiting
    const attempts = loginAttempts.get(cleanEmail);
    if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const timeSince = Date.now() - attempts.lastAttempt;
      if (timeSince < LOGIN_LOCKOUT_MS) {
        return res.status(429).json({
          error: 'too_many_attempts',
          message: 'Too many login attempts. Try again later.',
          retryAfter: Math.ceil((LOGIN_LOCKOUT_MS - timeSince) / 1000),
        });
      }
      loginAttempts.delete(cleanEmail);
    }

    // Find user by email (DB-backed)
    const user = await findUserByEmail(cleanEmail);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      const current = loginAttempts.get(cleanEmail) || { count: 0, lastAttempt: 0 };
      loginAttempts.set(cleanEmail, { count: current.count + 1, lastAttempt: Date.now() });

      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Clear failed attempts on success
    loginAttempts.delete(cleanEmail);

    // Enforce max sessions per user
    const sessionCount = await countUserSessions(user.id);
    if (sessionCount >= MAX_SESSIONS_PER_USER) {
      await deleteOldestSession(user.id);
    }

    const token = generateToken();
    await createSession(token, {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    setSessionCookie(res, token);
    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    log.error('Login error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

/**
 * POST /register
 * Create a new user account and return a session token.
 *
 * Request:
 *   - { email, password, name }
 *
 * Response:
 *   - 201: { token, user: { id, email, name } }
 *   - 400: { error, message }
 *   - 409: { error, message } (email already exists)
 */
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Email, password, and name are required',
      });
    }

    if (email.length > 255 || password.length < 6) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Email too long or password too short (min 6 chars)',
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        error: 'conflict',
        message: 'Email already registered',
      });
    }

    const userId = `user-${crypto.randomBytes(8).toString('hex')}`;
    const newUser = {
      id: userId,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      name: String(name).trim().substring(0, 100),
    };

    await createUser(newUser);

    const token = generateToken();
    await createSession(token, {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    setSessionCookie(res, token);
    return res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
    });
  } catch (error) {
    log.error('Registration error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

/**
 * POST /logout
 * Invalidate the current session token.
 *
 * Request:
 *   - Authorization: Bearer <token>
 *
 * Response:
 *   - 200: { message }
 *   - 401: { error, message }
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await deleteSession(req.token);
    clearSessionCookie(res);

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    log.error('Logout error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

/**
 * GET /me
 * Retrieve current user information from session token.
 *
 * Request:
 *   - Authorization: Bearer <token>
 *
 * Response:
 *   - 200: { user: { id, email, name } }
 *   - 401: { error, message }
 */
router.get('/me', requireAuth, (req, res) => {
  try {
    return res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    log.error('GET /me error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

/**
 * GET /validate
 * Check if a session token is valid.
 *
 * Request:
 *   - Authorization: Bearer <token> (optional; checks header token)
 *   - Query: ?token=<token> (alternative)
 *
 * Response:
 *   - 200: { valid: true, user: { id, email, name } }
 *   - 200: { valid: false }
 */
router.get('/validate', async (req, res) => {
  try {
    let token = extractToken(req.headers.authorization);
    if (!token) token = req.query.token;
    if (!token) return res.status(200).json({ valid: false });

    const session = await getSession(token);
    if (!session) return res.status(200).json({ valid: false });

    const user = await findUserById(session.userId);
    if (!user) return res.status(200).json({ valid: false });

    return res.status(200).json({
      valid: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    log.error('Validate error', { errorMessage: error.message, errorStack: error.stack });
    return res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /preferences — Save user onboarding preferences
// ═════════════════════════════════════════════════════════════════════════════

router.post('/preferences', requireAuth, async (req, res) => {
  try {
    const { workspace, integrations } = req.body;
    const prefs = { workspace, integrations, onboardedAt: new Date().toISOString() };
    await updateUserPreferences(req.user.id, prefs);
    res.json({ status: 'saved', preferences: { workspace, integrations } });
  } catch (error) {
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

export {
  router,
  requireAuth,
};