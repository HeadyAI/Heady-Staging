const logger = require('../utils/logger.js');
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

const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// ═════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE (demo only; replace with DB in production)
// ═════════════════════════════════════════════════════════════════════════════

// Map<token, { userId, email, name, createdAt }>
const sessions = new Map();

// Map<userId, { email, password (hashed in prod), name, createdAt }>
const users = new Map();

// Demo user seed
const DEMO_USER = {
  id: 'demo-user-1',
  email: 'eric@headyconnection.org',
  password: 'heady2026', // In production, this would be hashed
  name: 'Eric Heady',
};

// Register demo user on startup
users.set(DEMO_USER.id, DEMO_USER);

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
 * Extract Bearer token from Authorization header or cookie.
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  if (req.cookies && req.cookies.__heady_session) {
    return req.cookies.__heady_session;
  }

  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Middleware: Validate Bearer token and attach user to req.user
 * Returns 401 if token is invalid or missing.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid Authorization header',
    });
  }

  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired session token',
    });
  }

  const user = users.get(session.userId);
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
router.post('/login', (req, res) => {
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

      // Timing-safe comparison to prevent timing attacks
      if (!timingSafeEqual(apiKey, adminToken)) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid API key',
        });
      }

      // Create admin session
      const token = generateToken();
      const adminUser = {
        id: 'admin-system',
        email: 'system@heady.internal',
        name: 'System Admin',
      };

      sessions.set(token, {
        userId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        createdAt: new Date(),
      });

      res.cookie('__heady_session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
      });

      return res.status(200).json({
        token,
        user: adminUser,
      });
    }

    // Email/password authentication
    if (!email || !password) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Email and password are required',
      });
    }

    // Find user by email
    let user = null;
    for (const [, u] of users) {
      if (u.email === email) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Validate password (timing-safe comparison)
    if (!timingSafeEqual(password, user.password)) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Create session
    const token = generateToken();
    sessions.set(token, {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: new Date(),
    });

    res.cookie('__heady_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
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
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Validate inputs
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

    // Check for existing user
    for (const [, u] of users) {
      if (u.email === email) {
        return res.status(409).json({
          error: 'conflict',
          message: 'Email already registered',
        });
      }
    }

    // Create new user
    const userId = `user-${crypto.randomBytes(8).toString('hex')}`;
    const newUser = {
      id: userId,
      email,
      password, // In production, hash with bcrypt or similar
      name,
      createdAt: new Date(),
    };

    users.set(userId, newUser);

    // Create session token
    const token = generateToken();
    sessions.set(token, {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: new Date(),
    });

    res.cookie('__heady_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
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
router.post('/logout', requireAuth, (req, res) => {
  try {
    const token = req.token;
    sessions.delete(token);

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
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
    logger.error('GET /me error:', error);
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
router.get('/validate', (req, res) => {
  try {
    let token = extractToken(req);
    if (!token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(200).json({
        valid: false,
      });
    }

    const session = sessions.get(token);
    if (!session) {
      return res.status(200).json({
        valid: false,
      });
    }

    const user = users.get(session.userId);
    if (!user) {
      return res.status(200).json({
        valid: false,
      });
    }

    return res.status(200).json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error('Validate error:', error);
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /preferences — Save user onboarding preferences
// ═════════════════════════════════════════════════════════════════════════════

router.post('/preferences', requireAuth, (req, res) => {
  try {
    const { workspace, integrations } = req.body;
    const user = users.get(req.user.email);
    if (user) {
      user.preferences = { workspace, integrations, onboardedAt: new Date().toISOString() };
    }
    res.json({ status: 'saved', preferences: { workspace, integrations } });
  } catch (error) {
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  router,
  requireAuth,
};
