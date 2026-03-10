/**
 * Heady™ Firebase Admin SDK Integration v6.0
 * Server-side token verification — NO trust-on-first-use
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const { createLogger } = require('./logger');
const { phiBackoffWithJitter, fib, CSL_THRESHOLDS, PHI } = require('./phi-math');

const logger = createLogger('firebase-admin');

// ═══════════════════════════════════════════════════════════
// FIREBASE ADMIN INITIALIZATION
// Service account loaded from GCP Secret Manager or env
// ═══════════════════════════════════════════════════════════

let firebaseApp = null;
let auth = null;

const TOKEN_CACHE_SIZE = fib(16);  // 987 cached verifications
const CACHE_TTL_MS = fib(8) * 60 * 1000;  // 21 minutes
const MAX_VERIFY_RETRIES = fib(5);  // 5 retries
const CLOCK_TOLERANCE_MS = fib(7) * 1000;  // 13 seconds tolerance

class TokenVerificationCache {
  constructor(maxSize = TOKEN_CACHE_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  get(tokenHash) {
    const entry = this.cache.get(tokenHash);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() - entry.verifiedAt > CACHE_TTL_MS) {
      this.cache.delete(tokenHash);
      this.misses++;
      return null;
    }
    this.hits++;
    entry.lastAccessedAt = Date.now();
    return entry.decodedToken;
  }

  set(tokenHash, decodedToken) {
    if (this.cache.size >= this.maxSize) {
      this._evictLRU();
    }
    this.cache.set(tokenHash, {
      decodedToken,
      verifiedAt: Date.now(),
      lastAccessedAt: Date.now(),
    });
  }

  _evictLRU() {
    let oldest = null;
    let oldestKey = null;
    for (const [key, entry] of this.cache) {
      if (!oldest || entry.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = entry;
        oldestKey = key;
      }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

const tokenCache = new TokenVerificationCache();

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

async function initializeFirebaseAdmin(serviceAccountConfig) {
  if (firebaseApp) {
    logger.info({ message: 'Firebase Admin already initialized' });
    return;
  }

  try {
    const admin = require('firebase-admin');

    if (serviceAccountConfig) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountConfig),
        projectId: serviceAccountConfig.project_id || process.env.GCP_PROJECT_ID,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.GCP_PROJECT_ID,
      });
    } else {
      throw new Error('No Firebase service account configuration provided. Set GOOGLE_APPLICATION_CREDENTIALS or pass serviceAccountConfig.');
    }

    auth = admin.auth(firebaseApp);

    logger.info({
      message: 'Firebase Admin SDK initialized',
      projectId: firebaseApp.options.projectId || 'default',
    });
  } catch (error) {
    logger.error({
      message: 'Firebase Admin initialization failed',
      error: error.message,
    });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════
// TOKEN VERIFICATION — Server-Side with Retries
// ═══════════════════════════════════════════════════════════

const crypto = require('crypto');

function hashToken(idToken) {
  return crypto.createHash('sha256').update(idToken).digest('hex').slice(0, fib(9));  // 34 chars
}

async function verifyIdToken(idToken, options = {}) {
  if (!auth) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdmin() first.');
  }

  if (!idToken || typeof idToken !== 'string') {
    throw new FirebaseAuthError('INVALID_TOKEN', 'Token must be a non-empty string');
  }

  // Reject obviously malformed tokens (JWT has 3 dot-separated parts)
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new FirebaseAuthError('MALFORMED_TOKEN', 'Token is not a valid JWT format');
  }

  const checkRevoked = options.checkRevoked !== false;  // Default: check revocation
  const tokenHash = hashToken(idToken);

  // Check cache first (only if not forcing revocation check)
  if (!options.forceVerify) {
    const cached = tokenCache.get(tokenHash);
    if (cached) {
      logger.debug({
        message: 'Token verified from cache',
        uid: cached.uid,
        cacheStats: tokenCache.getStats(),
      });
      return cached;
    }
  }

  // Server-side verification with phi-backoff retry
  let lastError = null;
  for (let attempt = 0; attempt < MAX_VERIFY_RETRIES; attempt++) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken, checkRevoked);

      // Validate expected claims
      _validateClaims(decodedToken);

      // Cache the successful verification
      tokenCache.set(tokenHash, decodedToken);

      logger.info({
        message: 'Token verified successfully',
        uid: decodedToken.uid,
        attempt,
        provider: decodedToken.firebase?.sign_in_provider || 'unknown',
      });

      return decodedToken;
    } catch (error) {
      lastError = error;

      // Non-retryable errors — fail immediately
      if (_isNonRetryableError(error)) {
        logger.warn({
          message: 'Token verification failed (non-retryable)',
          errorCode: error.code,
          errorMessage: error.message,
        });
        throw new FirebaseAuthError(
          error.code || 'VERIFICATION_FAILED',
          error.message
        );
      }

      // Retryable error — wait with phi-backoff
      if (attempt < MAX_VERIFY_RETRIES - 1) {
        const delay = phiBackoffWithJitter(attempt);
        logger.warn({
          message: 'Token verification retry',
          attempt,
          nextRetryMs: delay,
          error: error.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error({
    message: 'Token verification exhausted all retries',
    attempts: MAX_VERIFY_RETRIES,
    lastError: lastError?.message,
  });

  throw new FirebaseAuthError(
    'VERIFICATION_EXHAUSTED',
    `Token verification failed after ${MAX_VERIFY_RETRIES} attempts: ${lastError?.message}`
  );
}

function _validateClaims(decodedToken) {
  if (!decodedToken.uid) {
    throw new FirebaseAuthError('MISSING_UID', 'Decoded token missing uid claim');
  }

  const now = Math.floor(Date.now() / 1000);
  const toleranceSec = Math.floor(CLOCK_TOLERANCE_MS / 1000);

  if (decodedToken.exp && decodedToken.exp + toleranceSec < now) {
    throw new FirebaseAuthError('TOKEN_EXPIRED', 'Token has expired');
  }

  if (decodedToken.iat && decodedToken.iat - toleranceSec > now) {
    throw new FirebaseAuthError('TOKEN_FUTURE', 'Token issued in the future');
  }
}

function _isNonRetryableError(error) {
  const nonRetryableCodes = [
    'auth/id-token-expired',
    'auth/id-token-revoked',
    'auth/invalid-id-token',
    'auth/argument-error',
    'auth/user-disabled',
    'auth/user-not-found',
  ];
  return nonRetryableCodes.includes(error.code);
}

// ═══════════════════════════════════════════════════════════
// USER MANAGEMENT HELPERS
// ═══════════════════════════════════════════════════════════

async function getUser(uid) {
  if (!auth) throw new Error('Firebase Admin not initialized');
  return auth.getUser(uid);
}

async function getUserByEmail(email) {
  if (!auth) throw new Error('Firebase Admin not initialized');
  return auth.getUserByEmail(email);
}

async function revokeRefreshTokens(uid) {
  if (!auth) throw new Error('Firebase Admin not initialized');
  await auth.revokeRefreshTokens(uid);
  // Invalidate all cached tokens for this user
  for (const [hash, entry] of tokenCache.cache) {
    if (entry.decodedToken.uid === uid) {
      tokenCache.cache.delete(hash);
    }
  }
  logger.info({ message: 'Refresh tokens revoked', uid });
}

async function setCustomClaims(uid, claims) {
  if (!auth) throw new Error('Firebase Admin not initialized');
  await auth.setCustomUserClaims(uid, claims);
  logger.info({ message: 'Custom claims set', uid, claimKeys: Object.keys(claims) });
}

// ═══════════════════════════════════════════════════════════
// CUSTOM ERROR CLASS
// ═══════════════════════════════════════════════════════════

class FirebaseAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FirebaseAuthError';
    this.code = code;
  }
}

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE — Express-compatible auth middleware
// ═══════════════════════════════════════════════════════════

function createAuthMiddleware(options = {}) {
  const requireAuth = options.requireAuth !== false;
  const allowedProviders = options.allowedProviders || null;

  return async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    let idToken = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.slice(7);
    }

    if (!idToken && req.cookies) {
      idToken = req.cookies['__Host-heady_session_token'];
    }

    if (!idToken) {
      if (requireAuth) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      req.user = null;
      next();
      return;
    }

    try {
      const decodedToken = await verifyIdToken(idToken);

      if (allowedProviders && !allowedProviders.includes(decodedToken.firebase?.sign_in_provider)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication provider not allowed' }));
        return;
      }

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        provider: decodedToken.firebase?.sign_in_provider,
        claims: decodedToken,
      };

      next();
    } catch (error) {
      logger.warn({
        message: 'Auth middleware verification failed',
        error: error.message,
        code: error.code,
      });

      if (requireAuth) {
        const statusCode = error.code === 'TOKEN_EXPIRED' ? 401 : 403;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Authentication failed',
          code: error.code,
        }));
        return;
      }

      req.user = null;
      next();
    }
  };
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  initializeFirebaseAdmin,
  verifyIdToken,
  getUser,
  getUserByEmail,
  revokeRefreshTokens,
  setCustomClaims,
  createAuthMiddleware,
  tokenCache,
  FirebaseAuthError,
  TOKEN_CACHE_SIZE,
  CACHE_TTL_MS,
};
