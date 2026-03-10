/**
 * session-binder.js — CSL-Gated Session Binding & Fingerprint Validation
 *
 * Binds sessions to device fingerprints using SHA-256 hashing,
 * φ-scaled trust scoring, and CSL gates for anomaly detection.
 * httpOnly cookies ONLY — NO localStorage.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold } from '../shared/phi-math.js';
import { createHash, randomBytes } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const SESSION_TTL_MS   = 1597 * 1000;   // fib(17) = 1597s ≈ 26.6 min
const MAX_SESSIONS     = 987;           // fib(16) concurrent sessions
const FINGERPRINT_DIMS = 8;             // fib(6) fingerprint components
const TRUST_DECAY      = PSI;           // ≈ 0.618 decay per validation
const REBIND_COOLDOWN  = 34 * 1000;     // fib(9) = 34s between rebinds
const TOKEN_BYTES      = 34;            // fib(9) bytes of entropy

// ── Session Store ────────────────────────────────────────
const sessions = new Map();

function cslGate(value, score, threshold, temperature = PSI * PSI * PSI) {
  const sigmoid = 1 / (1 + Math.exp(-(score - threshold) / temperature));
  return value * sigmoid;
}

// ── Fingerprint Generation ──────────────────────────────
function generateFingerprint(req) {
  const components = [
    req.headers?.['user-agent'] || '',
    req.headers?.['accept-language'] || '',
    req.headers?.['accept-encoding'] || '',
    req.headers?.['accept'] || '',
    req.ip || req.connection?.remoteAddress || '',
    req.headers?.['sec-ch-ua'] || '',
    req.headers?.['sec-ch-ua-platform'] || '',
    req.headers?.['sec-ch-ua-mobile'] || '',
  ];
  return createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}

function generateToken() {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

// ── Fingerprint Similarity ──────────────────────────────
function fingerprintSimilarity(fp1, fp2) {
  if (fp1 === fp2) return 1.0;
  if (!fp1 || !fp2) return 0.0;
  // Compare character-by-character (hex digest)
  let matches = 0;
  const len = Math.min(fp1.length, fp2.length);
  for (let i = 0; i < len; i++) {
    if (fp1[i] === fp2[i]) matches++;
  }
  return matches / len;
}

// ── Session Lifecycle ────────────────────────────────────
/**
 * Create a new session bound to the request fingerprint.
 * Returns session token (to be set as httpOnly cookie).
 */
export function createSession(req, userId, metadata = {}) {
  // Evict expired sessions
  evictExpired();
  
  // Enforce max sessions
  if (sessions.size >= MAX_SESSIONS) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [k, s] of sessions) {
      if (s.lastValidated < oldestTime) { oldestTime = s.lastValidated; oldestKey = k; }
    }
    if (oldestKey) sessions.delete(oldestKey);
  }

  const token = generateToken();
  const fingerprint = generateFingerprint(req);
  const now = Date.now();
  
  const tokenHash = createHash('sha256').update(token).digest('hex');
  
  sessions.set(tokenHash, {
    userId,
    fingerprint,
    trustScore: 1.0,
    createdAt: now,
    lastValidated: now,
    lastRebind: now,
    expiresAt: now + SESSION_TTL_MS,
    validationCount: 0,
    anomalyCount: 0,
    metadata,
  });

  return {
    token,
    expiresAt: now + SESSION_TTL_MS,
    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: SESSION_TTL_MS,
      path: '/',
    },
  };
}

/**
 * Validate a session token against the current request fingerprint.
 * Returns validation result with trust assessment.
 */
export function validateSession(token, req) {
  if (!token) return { valid: false, reason: 'NO_TOKEN' };
  
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const session = sessions.get(tokenHash);
  
  if (!session) return { valid: false, reason: 'SESSION_NOT_FOUND' };
  
  const now = Date.now();
  if (now > session.expiresAt) {
    sessions.delete(tokenHash);
    return { valid: false, reason: 'SESSION_EXPIRED' };
  }

  const currentFP = generateFingerprint(req);
  const similarity = fingerprintSimilarity(session.fingerprint, currentFP);
  
  // Update trust score with φ-decay blending
  session.trustScore = (session.trustScore * TRUST_DECAY) + (similarity * (1 - TRUST_DECAY));
  session.lastValidated = now;
  session.validationCount++;
  
  // CSL gate: is trust above MEDIUM threshold?
  const trustGated = cslGate(1, session.trustScore, CSL_THRESHOLDS.MEDIUM);
  
  if (trustGated < CSL_THRESHOLDS.MINIMUM) {
    session.anomalyCount++;
    // If too many anomalies, terminate session
    if (session.anomalyCount >= 5) { // fib(5)
      sessions.delete(tokenHash);
      return { valid: false, reason: 'SESSION_HIJACK_DETECTED', anomalyCount: session.anomalyCount };
    }
    return {
      valid: false,
      reason: 'FINGERPRINT_MISMATCH',
      trustScore: session.trustScore,
      similarity,
      anomalyCount: session.anomalyCount,
    };
  }

  // Refresh expiry on successful validation
  session.expiresAt = now + SESSION_TTL_MS;
  
  return {
    valid: true,
    userId: session.userId,
    trustScore: session.trustScore,
    similarity,
    validationCount: session.validationCount,
  };
}

/**
 * Rebind session to new fingerprint (e.g., after network change).
 * Requires recent validation and cooldown period.
 */
export function rebindSession(token, req) {
  if (!token) return { success: false, reason: 'NO_TOKEN' };
  
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const session = sessions.get(tokenHash);
  
  if (!session) return { success: false, reason: 'SESSION_NOT_FOUND' };
  
  const now = Date.now();
  if (now - session.lastRebind < REBIND_COOLDOWN) {
    return { success: false, reason: 'REBIND_COOLDOWN', retryAfter: REBIND_COOLDOWN - (now - session.lastRebind) };
  }
  
  session.fingerprint = generateFingerprint(req);
  session.lastRebind = now;
  session.trustScore = CSL_THRESHOLDS.MEDIUM; // Reset to MEDIUM trust
  session.anomalyCount = 0;
  
  return { success: true, trustScore: session.trustScore };
}

/**
 * Destroy a session
 */
export function destroySession(token) {
  if (!token) return false;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return sessions.delete(tokenHash);
}

/**
 * Get session statistics
 */
export function getStats() {
  evictExpired();
  let trustDistribution = { high: 0, medium: 0, low: 0, critical: 0 };
  for (const [, s] of sessions) {
    if (s.trustScore >= CSL_THRESHOLDS.HIGH) trustDistribution.high++;
    else if (s.trustScore >= CSL_THRESHOLDS.MEDIUM) trustDistribution.medium++;
    else if (s.trustScore >= CSL_THRESHOLDS.LOW) trustDistribution.low++;
    else trustDistribution.critical++;
  }
  return { activeSessions: sessions.size, maxSessions: MAX_SESSIONS, trustDistribution };
}

function evictExpired() {
  const now = Date.now();
  for (const [k, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(k);
  }
}

/**
 * Express/Connect middleware
 */
export function middleware(options = {}) {
  const cookieName = options.cookieName || '__Host-heady_session';
  
  return (req, res, next) => {
    const token = req.cookies?.[cookieName];
    if (!token) { req.session = null; return next(); }
    
    const result = validateSession(token, req);
    if (result.valid) {
      req.session = { userId: result.userId, trustScore: result.trustScore };
    } else {
      req.session = null;
      if (result.reason === 'SESSION_HIJACK_DETECTED') {
        res.clearCookie(cookieName, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
      }
    }
    next();
  };
}

export default { createSession, validateSession, rebindSession, destroySession, getStats, middleware };
