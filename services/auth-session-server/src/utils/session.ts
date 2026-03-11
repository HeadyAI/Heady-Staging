import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';
import { createLogger } from './logger.js';
import { PHI_TIMING, PHI_SIZES } from './phi-config.js';

const logger = createLogger('SessionManager');

/**
 * Session data structure
 */
export interface SessionData {
  sessionId: string;
  userId: string;
  email?: string;
  firebaseToken: string;
  fingerprint: string;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  ipAddress: string;
  userAgent: string;
  issuedAt: number;
}

/**
 * Session validation result
 */
export interface SessionValidation {
  valid: boolean;
  session?: SessionData;
  error?: string;
  expired?: boolean;
}

/**
 * In-memory session store
 * In production, use Redis with TTL expiration
 */
const sessionStore = new Map<string, SessionData>();

/**
 * User session tracking (for max sessions per user limit)
 */
const userSessions = new Map<string, Set<string>>();

/**
 * Generate client fingerprint from request
 * Hash of IP + User-Agent for session binding
 */
export function generateFingerprint(req: Request): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';

  const userAgent = req.headers['user-agent'] || 'unknown';

  // SHA256 hash of IP + User-Agent
  const fingerprint = createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex');

  return fingerprint;
}

/**
 * Create a new session
 */
export function createSession(
  userId: string,
  firebaseToken: string,
  req: Request,
  email?: string,
): SessionData {
  const sessionId = uuidv4();
  const fingerprint = generateFingerprint(req);
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const now = Date.now();

  const session: SessionData = {
    sessionId,
    userId,
    email,
    firebaseToken,
    fingerprint,
    createdAt: now,
    expiresAt: now + PHI_TIMING.SESSION_TTL_MS,
    lastActivityAt: now,
    ipAddress: ip,
    userAgent,
    issuedAt: Math.floor(now / 1000),
  };

  // Store session
  sessionStore.set(sessionId, session);

  // Track user sessions
  if (!userSessions.has(userId)) {
    userSessions.set(userId, new Set());
  }
  const userSessionSet = userSessions.get(userId)!;
  userSessionSet.add(sessionId);

  // Enforce max sessions per user
  if (userSessionSet.size > PHI_SIZES.MAX_SESSIONS_PER_USER) {
    const sessionsArray = Array.from(userSessionSet);
    const oldestSessionId = sessionsArray.sort(
      (a, b) =>
        (sessionStore.get(a)?.createdAt || 0) - (sessionStore.get(b)?.createdAt || 0),
    )[0];

    if (oldestSessionId) {
      revokeSession(oldestSessionId);
      logger.info('Oldest session revoked due to max sessions limit', {
        userId,
        sessionId: oldestSessionId,
      });
    }
  }

  logger.info('Session created', {
    sessionId,
    userId,
    email,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });

  return session;
}

/**
 * Validate session
 */
export function validateSession(sessionId: string, req: Request): SessionValidation {
  const session = sessionStore.get(sessionId);

  if (!session) {
    return {
      valid: false,
      error: 'Session not found',
    };
  }

  const now = Date.now();

  // Check if expired
  if (session.expiresAt < now) {
    sessionStore.delete(sessionId);
    return {
      valid: false,
      error: 'Session expired',
      expired: true,
    };
  }

  // Verify fingerprint matches
  const currentFingerprint = generateFingerprint(req);
  if (session.fingerprint !== currentFingerprint) {
    logger.warn('Session fingerprint mismatch', {
      sessionId,
      userId: session.userId,
      expectedFingerprint: session.fingerprint,
      currentFingerprint,
    });

    return {
      valid: false,
      error: 'Session fingerprint mismatch',
    };
  }

  // Update last activity
  session.lastActivityAt = now;

  return {
    valid: true,
    session,
  };
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): SessionData | undefined {
  const session = sessionStore.get(sessionId);

  if (session && session.expiresAt < Date.now()) {
    sessionStore.delete(sessionId);
    return undefined;
  }

  return session;
}

/**
 * Revoke session
 */
export function revokeSession(sessionId: string): boolean {
  const session = sessionStore.get(sessionId);

  if (!session) {
    return false;
  }

  // Remove from global store
  sessionStore.delete(sessionId);

  // Remove from user sessions
  const userSessionSet = userSessions.get(session.userId);
  if (userSessionSet) {
    userSessionSet.delete(sessionId);

    // Clean up empty sets
    if (userSessionSet.size === 0) {
      userSessions.delete(session.userId);
    }
  }

  logger.info('Session revoked', {
    sessionId,
    userId: session.userId,
  });

  return true;
}

/**
 * Revoke all sessions for a user
 */
export function revokeAllUserSessions(userId: string): number {
  const userSessionSet = userSessions.get(userId);

  if (!userSessionSet) {
    return 0;
  }

  const sessionIds = Array.from(userSessionSet);
  let revoked = 0;

  for (const sessionId of sessionIds) {
    if (revokeSession(sessionId)) {
      revoked++;
    }
  }

  return revoked;
}

/**
 * Set session cookie on response
 */
export function setSessionCookie(res: Response, session: SessionData): void {
  const cookieName = '__Host-__heady_session';

  // Generate secure cookie value
  const cookieValue = session.sessionId;

  // Calculate max-age in seconds
  const maxAge = Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000));

  res.cookie(cookieName, cookieValue, {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'none', // Allow cross-site (needed for relay iframe)
    maxAge: maxAge * 1000, // Convert back to milliseconds for express
    path: '/',
    domain: '.headysystems.com', // Allow subdomains
  });

  logger.debug('Session cookie set', {
    sessionId: session.sessionId,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(res: Response): void {
  const cookieName = '__Host-__heady_session';

  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    domain: '.headysystems.com',
  });

  logger.debug('Session cookie cleared');
}

/**
 * Get session ID from request cookies
 */
export function getSessionIdFromRequest(req: Request): string | undefined {
  const cookieName = '__Host-__heady_session';
  return req.cookies?.[cookieName];
}

/**
 * Refresh session expiration
 */
export function refreshSession(session: SessionData): SessionData {
  const now = Date.now();
  session.expiresAt = now + PHI_TIMING.SESSION_TTL_MS;
  session.lastActivityAt = now;

  logger.debug('Session refreshed', {
    sessionId: session.sessionId,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });

  return session;
}

/**
 * Get all sessions for a user
 */
export function getUserSessions(userId: string): SessionData[] {
  const sessionIds = userSessions.get(userId);

  if (!sessionIds) {
    return [];
  }

  const sessions: SessionData[] = [];

  for (const sessionId of sessionIds) {
    const session = getSession(sessionId);
    if (session) {
      sessions.push(session);
    }
  }

  return sessions;
}

/**
 * Cleanup expired sessions (garbage collection)
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.expiresAt < now) {
      if (revokeSession(sessionId)) {
        cleaned++;
      }
    }
  }

  if (cleaned > 0) {
    logger.debug('Expired sessions cleaned', {
      cleaned,
      remaining: sessionStore.size,
    });
  }

  return cleaned;
}

/**
 * Start periodic cleanup task
 */
export function startSessionCleanup(): NodeJS.Timer {
  return setInterval(() => {
    cleanupExpiredSessions();
  }, 15 * 60 * 1000); // Every 15 minutes
}

/**
 * Get session stats (for monitoring)
 */
export function getSessionStats() {
  const now = Date.now();
  const allSessions = Array.from(sessionStore.values());
  const activeSessions = allSessions.filter((s) => s.expiresAt > now);

  return {
    totalSessions: sessionStore.size,
    activeSessions: activeSessions.length,
    expiredSessions: allSessions.length - activeSessions.length,
    totalUsers: userSessions.size,
    averageSessionsPerUser:
      userSessions.size > 0
        ? Math.round(
            Array.from(userSessions.values()).reduce((sum, set) => sum + set.size, 0) /
              userSessions.size,
          )
        : 0,
  };
}

/**
 * Clear all sessions (for testing/admin)
 */
export function clearAllSessions(): void {
  sessionStore.clear();
  userSessions.clear();
  logger.info('All sessions cleared');
}

export default {
  generateFingerprint,
  createSession,
  validateSession,
  getSession,
  revokeSession,
  revokeAllUserSessions,
  setSessionCookie,
  clearSessionCookie,
  getSessionIdFromRequest,
  refreshSession,
  getUserSessions,
  cleanupExpiredSessions,
  startSessionCleanup,
  getSessionStats,
  clearAllSessions,
};
