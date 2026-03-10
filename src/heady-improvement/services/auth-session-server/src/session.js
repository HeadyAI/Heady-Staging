'use strict';

const { createHash } = require('node:crypto');
const { getAuth } = require('./firebase-admin');

// FIB[12] = 144 → 144 hours max session age
const SESSION_MAX_AGE_HOURS = 144;
const SESSION_MAX_AGE_SEC = SESSION_MAX_AGE_HOURS * 60 * 60;
const SESSION_COOKIE_NAME = '__Host-heady_session';

// FIB[10] = 55 → refresh if less than 55 hours remain
const SESSION_REFRESH_THRESHOLD_HOURS = 55;

/**
 * Hash IP + User-Agent to create a fingerprint for session binding.
 *
 * @param {string} ip
 * @param {string} userAgent
 * @returns {string} SHA-256 hex digest (first 16 chars)
 */
function computeFingerprint(ip, userAgent) {
  return createHash('sha256')
    .update(`${ip}|${userAgent}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Create a session from a Firebase ID token.
 * Validates the token, creates a session cookie, and binds it to the client fingerprint.
 *
 * @param {string} firebaseIdToken — the Firebase ID token from the client
 * @param {string} ip — client IP address
 * @param {string} userAgent — client User-Agent header
 * @returns {Promise<{ cookie: string, options: object, user: object }>}
 */
async function createSession(firebaseIdToken, ip, userAgent) {
  const auth = getAuth();

  const decodedToken = await auth.verifyIdToken(firebaseIdToken, true);

  const sessionCookie = await auth.createSessionCookie(firebaseIdToken, {
    expiresIn: SESSION_MAX_AGE_SEC * 1000,
  });

  const fingerprint = computeFingerprint(ip, userAgent);

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC * 1000,
  };

  return {
    cookie: sessionCookie,
    cookieName: SESSION_COOKIE_NAME,
    options: cookieOptions,
    fingerprint,
    user: {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false,
      displayName: decodedToken.name || null,
      photoURL: decodedToken.picture || null,
      provider: decodedToken.firebase?.sign_in_provider || 'unknown',
    },
  };
}

/**
 * Validate an existing session cookie and return the decoded claims.
 *
 * @param {string} sessionCookie — the session cookie value
 * @param {string} ip — client IP address
 * @param {string} userAgent — client User-Agent header
 * @param {string} storedFingerprint — fingerprint stored when session was created
 * @returns {Promise<object>} decoded user claims
 */
async function validateSession(sessionCookie, ip, userAgent, storedFingerprint) {
  const auth = getAuth();
  const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

  if (storedFingerprint) {
    const currentFingerprint = computeFingerprint(ip, userAgent);
    if (currentFingerprint !== storedFingerprint) {
      throw new Error('Session fingerprint mismatch — possible session hijacking');
    }
  }

  return {
    uid: decodedClaims.uid,
    email: decodedClaims.email || null,
    emailVerified: decodedClaims.email_verified || false,
    displayName: decodedClaims.name || null,
    photoURL: decodedClaims.picture || null,
    provider: decodedClaims.firebase?.sign_in_provider || 'unknown',
    issuedAt: decodedClaims.iat,
    expiresAt: decodedClaims.exp,
  };
}

/**
 * Refresh a session cookie if it's within the refresh window.
 * Returns a new cookie if refresh is needed, or null if the session is still fresh.
 *
 * @param {string} sessionCookie
 * @param {string} ip
 * @param {string} userAgent
 * @returns {Promise<{ cookie: string, options: object } | null>}
 */
async function refreshSession(sessionCookie, ip, userAgent) {
  const auth = getAuth();
  const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

  const now = Math.floor(Date.now() / 1000);
  const remainingHours = (decodedClaims.exp - now) / 3600;

  if (remainingHours > SESSION_REFRESH_THRESHOLD_HOURS) {
    return null;
  }

  const newCookie = await auth.createSessionCookie(sessionCookie, {
    expiresIn: SESSION_MAX_AGE_SEC * 1000,
  });

  return {
    cookie: newCookie,
    cookieName: SESSION_COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: SESSION_MAX_AGE_SEC * 1000,
    },
  };
}

/**
 * Revoke a session by invalidating the user's refresh tokens.
 *
 * @param {string} sessionCookie — the session cookie to revoke
 * @returns {Promise<void>}
 */
async function revokeSession(sessionCookie) {
  const auth = getAuth();
  const decodedClaims = await auth.verifySessionCookie(sessionCookie);
  await auth.revokeRefreshTokens(decodedClaims.uid);
}

module.exports = {
  createSession,
  validateSession,
  refreshSession,
  revokeSession,
  computeFingerprint,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_HOURS,
  SESSION_MAX_AGE_SEC,
};
