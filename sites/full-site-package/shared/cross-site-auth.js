/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  HEADY_BRAND: HeadySystems Inc.                                   ║
 * ║  Module: cross-site-auth.js                                       ║
 * ║  Node: CONDUCTOR (Orchestrator) + SENTINEL (Security)             ║
 * ║  Layer: L2 (Cloud Runtime)                                        ║
 * ║  Law 3: Zero localhost — auth.headysystems.com only               ║
 * ║  Law 4: Zero placeholders — every function wired                  ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createLogger } from '@heady-ai/structured-logger';
import { phiScale, PHI, PSI, FIB } from '@heady-ai/phi-math';
import { timingSafeEqual } from 'node:crypto';

const log = createLogger('cross-site-auth', 'security');

// ── Allowed Origins (all Heady domains + admin) ──
const ALLOWED_ORIGINS = new Set([
  'https://headysystems.com',
  'https://headyme.com',
  'https://headybuddy.org',
  'https://headymcp.com',
  'https://headyio.com',
  'https://headybot.com',
  'https://headyapi.com',
  'https://headylens.com',
  'https://heady-ai.com',
  'https://headyfinance.com',
  'https://headyconnection.org',
  'https://1ime1.com',
  'https://admin.headysystems.com',
]);

// ── φ-Scaled Auth Constants ──
const AUTH_CONFIG = Object.freeze({
  SESSION_TTL_DAYS: FIB[7],              // 21 days
  COOKIE_MAX_AGE:   FIB[7] * 86400000,   // 21 days in ms
  TOKEN_REFRESH_MS: Math.round(PHI ** 5 * 1000 * 60), // ~11 minutes
  RATE_LIMIT_AUTH:  FIB[5] * 4,           // 32 attempts / 15min
  RATE_LIMIT_WINDOW: FIB[9] * 1000,      // 55s
  NONCE_TTL_MS:     Math.round(PHI ** 3 * 1000), // 4236ms
  COOKIE_NAME:      '__heady_session',
  COOKIE_DOMAIN:    '.headysystems.com',
});

// ── Firebase Admin Init ──
let firebaseApp;
export function initAuth(serviceAccountPath) {
  firebaseApp = initializeApp({
    credential: cert(serviceAccountPath),
  });
  log.info('Firebase Admin initialized', { node: 'CONDUCTOR' });
  return getAuth(firebaseApp);
}

/**
 * Validate origin against whitelist (timing-safe)
 * @param {string} origin - Request origin header
 * @returns {boolean}
 */
export function validateOrigin(origin) {
  if (!origin) return false;
  // Timing-safe comparison against each allowed origin
  for (const allowed of ALLOWED_ORIGINS) {
    const a = Buffer.from(allowed);
    const b = Buffer.from(origin.padEnd(a.length).slice(0, a.length));
    if (a.length === Buffer.from(origin).length && timingSafeEqual(a, b)) {
      return true;
    }
  }
  log.warn('Origin rejected', { node: 'SENTINEL', origin });
  return false;
}

/**
 * Create cross-domain session cookie
 * Sets httpOnly cookie on .headysystems.com visible to all subdomains
 * 
 * @param {Object} auth - Firebase Auth instance
 * @param {string} idToken - Firebase ID token from client
 * @param {Object} res - Express response object
 * @returns {Object} Session data
 */
export async function createCrossDomainSession(auth, idToken, res) {
  const decodedToken = await auth.verifyIdToken(idToken, true);
  
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: AUTH_CONFIG.COOKIE_MAX_AGE,
  });

  // Set cross-domain cookie
  res.cookie(AUTH_CONFIG.COOKIE_NAME, sessionCookie, {
    maxAge:   AUTH_CONFIG.COOKIE_MAX_AGE,
    httpOnly: true,
    secure:   true,
    sameSite: 'none',    // Required for cross-domain
    domain:   AUTH_CONFIG.COOKIE_DOMAIN,
    path:     '/',
  });

  const user = {
    uid:         decodedToken.uid,
    email:       decodedToken.email,
    displayName: decodedToken.name || decodedToken.email?.split('@')[0],
    tier:        await resolveTier(decodedToken.uid),
    token:       `hdy_${await resolveTier(decodedToken.uid)}_${Date.now().toString(36)}`,
  };

  log.info('Cross-domain session created', {
    node: 'CONDUCTOR',
    uid: user.uid,
    tier: user.tier,
    ttlDays: AUTH_CONFIG.SESSION_TTL_DAYS,
  });

  return user;
}

/**
 * Verify existing session from cookie
 * Called on every page load to check SSO state
 * 
 * @param {Object} auth - Firebase Auth instance
 * @param {string} sessionCookie - Cookie value
 * @returns {Object|null} User data or null
 */
export async function verifySession(auth, sessionCookie) {
  if (!sessionCookie) return null;
  
  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    return {
      valid: true,
      user: {
        uid:         decoded.uid,
        email:       decoded.email,
        displayName: decoded.name || decoded.email?.split('@')[0],
        tier:        await resolveTier(decoded.uid),
      },
    };
  } catch (err) {
    log.warn('Session verification failed', {
      node: 'SENTINEL',
      error: err.code || err.message,
    });
    return null;
  }
}

/**
 * Resolve API key tier for user
 * @param {string} uid
 * @returns {string} Tier name
 */
async function resolveTier(uid) {
  // Internal users (founder + core team)
  const INTERNAL_UIDS = new Set([
    'eric-haywood-001',
    // Add internal team UIDs here
  ]);
  
  if (INTERNAL_UIDS.has(uid)) return 'int';

  // TODO: Check Neon for pilot/enterprise tier assignments
  // For now, default to public
  return 'pub';
}

/**
 * Express middleware: validate origin + attach user
 */
export function authMiddleware(auth) {
  return async (req, res, next) => {
    // CORS origin check
    const origin = req.headers.origin;
    if (origin && !validateOrigin(origin)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    // Set CORS headers for allowed origin
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Id, X-Device-Id, X-Session-Id');
    }

    // Check session cookie
    const sessionCookie = req.cookies?.[AUTH_CONFIG.COOKIE_NAME];
    if (sessionCookie) {
      const session = await verifySession(auth, sessionCookie);
      if (session?.valid) {
        req.heady = { user: session.user, authenticated: true };
        return next();
      }
    }

    // Check Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = await auth.verifyIdToken(token, true);
        req.heady = {
          user: {
            uid: decoded.uid,
            email: decoded.email,
            tier: await resolveTier(decoded.uid),
          },
          authenticated: true,
        };
        return next();
      } catch (err) {
        log.warn('Token verification failed', { node: 'SENTINEL', error: err.code });
      }
    }

    // Unauthenticated — still allow with limited access
    req.heady = { user: null, authenticated: false };
    next();
  };
}

/**
 * Express route handlers for auth endpoints
 */
export function authRoutes(auth) {
  return {
    /** POST /api/auth/init — Start OAuth flow */
    async initAuth(req, res) {
      const { provider, returnUrl, scopes, domain } = req.body;
      
      if (!provider || !returnUrl) {
        return res.status(400).json({ error: 'Missing provider or returnUrl' });
      }

      log.info('Auth init', { node: 'CONDUCTOR', provider, domain });
      
      // Return the Firebase Auth URL for client-side popup
      res.json({
        authUrl: `https://auth.headysystems.com/oauth/${provider}?returnUrl=${encodeURIComponent(returnUrl)}`,
        provider,
        scopes: scopes || ['buddy'],
      });
    },

    /** GET /api/auth/session — Check existing session */
    async checkSession(req, res) {
      const sessionCookie = req.cookies?.[AUTH_CONFIG.COOKIE_NAME];
      const session = await verifySession(auth, sessionCookie);
      
      if (session?.valid) {
        res.json(session);
      } else {
        res.json({ valid: false });
      }
    },

    /** POST /api/auth/session — Create new session from ID token */
    async createSession(req, res) {
      const { idToken } = req.body;
      if (!idToken) return res.status(400).json({ error: 'Missing idToken' });
      
      try {
        const user = await createCrossDomainSession(auth, idToken, res);
        res.json({ success: true, user });
      } catch (err) {
        log.error('Session creation failed', { node: 'SENTINEL', error: err.message });
        res.status(401).json({ error: 'Invalid token' });
      }
    },

    /** POST /api/auth/revoke — Revoke session */
    async revokeSession(req, res) {
      const sessionCookie = req.cookies?.[AUTH_CONFIG.COOKIE_NAME];
      if (sessionCookie) {
        try {
          const decoded = await auth.verifySessionCookie(sessionCookie);
          await auth.revokeRefreshTokens(decoded.uid);
          res.clearCookie(AUTH_CONFIG.COOKIE_NAME, {
            domain: AUTH_CONFIG.COOKIE_DOMAIN,
            path: '/',
          });
          log.info('Session revoked', { node: 'CONDUCTOR', uid: decoded.uid });
        } catch (err) {
          // Cookie invalid — still clear it
        }
      }
      res.json({ success: true });
    },
  };
}
