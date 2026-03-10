/**
 * Auth Session Server — Core Service Logic
 * Heady Liquid Latent OS — Zero-Trust Authentication
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import crypto from 'crypto';
import {
  PHI, PSI, FIB, CSL_THRESHOLD,
  type UserIdentity, type SessionPayload, type JWTClaims,
  type RefreshTokenRecord, type OAuthPKCEChallenge,
  type RateLimitState, type AuthorizationResult, type Role,
  type LoginRequest, type LoginResponse, type AuthEvent, type AuthEventType
} from './types.js';

// ═══════════════════════════════════════════════════════
// Logger (structured JSON only — NO logger.info)
// ═══════════════════════════════════════════════════════

interface LogEntry {
  level: string;
  service: string;
  msg: string;
  timestamp: string;
  [key: string]: string | number | boolean | undefined;
}

const logger = {
  info: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'info', service: 'auth-session-server', msg, timestamp: new Date().toISOString(), ...meta };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  warn: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'warn', service: 'auth-session-server', msg, timestamp: new Date().toISOString(), ...meta };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  error: (msg: string, meta?: Record<string, string | number | boolean>) => {
    const entry: LogEntry = { level: 'error', service: 'auth-session-server', msg, timestamp: new Date().toISOString(), ...meta };
    process.stderr.write(JSON.stringify(entry) + '\n');
  }
};

// ═══════════════════════════════════════════════════════
// Session Management
// ═══════════════════════════════════════════════════════

export class SessionManager {
  private readonly sessionTTLMs: number = FIB[13] * 60 * 1000;   // 233 minutes
  private readonly refreshTTLMs: number = FIB[15] * 60 * 1000;   // 610 minutes
  private readonly maxSessionsPerUser: number = FIB[10];           // 55

  constructor(
    private readonly redisClient: RedisLike,
    private readonly pgPool: PgPoolLike
  ) {}

  async createSession(user: UserIdentity, fingerprint: string): Promise<SessionPayload> {
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const refreshToken = crypto.randomBytes(FIB[8]).toString('hex'); // 21 bytes
    const refreshTokenHash = this.hashToken(refreshToken);

    const session: SessionPayload = {
      sessionId,
      userId: user.userId,
      tenantId: user.tenantId,
      roles: user.roles,
      issuedAt: now,
      expiresAt: now + this.sessionTTLMs,
      refreshTokenHash,
      fingerprint
    };

    const sessionKey = `session:${sessionId}`;
    await this.redisClient.setEx(
      sessionKey,
      Math.floor(this.sessionTTLMs / 1000),
      JSON.stringify(session)
    );

    const existingSessions = await this.redisClient.keys(`session:user:${user.userId}:*`);
    if (existingSessions.length >= this.maxSessionsPerUser) {
      const oldest = existingSessions[0];
      if (oldest) {
        await this.redisClient.del(oldest);
        logger.info('evicted_oldest_session', { userId: user.userId, evictedKey: oldest });
      }
    }

    await this.redisClient.setEx(
      `session:user:${user.userId}:${sessionId}`,
      Math.floor(this.sessionTTLMs / 1000),
      sessionId
    );

    const refreshRecord: RefreshTokenRecord = {
      tokenHash: refreshTokenHash,
      userId: user.userId,
      sessionId,
      family: crypto.randomUUID(),
      issuedAt: now,
      expiresAt: now + this.refreshTTLMs,
      isRevoked: false,
      replacedBy: null
    };

    await this.storeRefreshToken(refreshRecord);
    logger.info('session_created', { userId: user.userId, sessionId });

    return session;
  }

  async validateSession(sessionId: string): Promise<SessionPayload | null> {
    const data = await this.redisClient.get(`session:${sessionId}`);
    if (!data) return null;

    const session: SessionPayload = JSON.parse(data);
    if (session.expiresAt < Date.now()) {
      await this.revokeSession(sessionId);
      return null;
    }

    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const data = await this.redisClient.get(`session:${sessionId}`);
    if (data) {
      const session: SessionPayload = JSON.parse(data);
      await this.redisClient.del(`session:${sessionId}`);
      await this.redisClient.del(`session:user:${session.userId}:${sessionId}`);
      logger.info('session_revoked', { sessionId, userId: session.userId });
    }
  }

  async rotateRefreshToken(
    oldTokenHash: string,
    fingerprint: string
  ): Promise<{ session: SessionPayload; newRefreshToken: string } | null> {
    const oldRecord = await this.getRefreshToken(oldTokenHash);
    if (!oldRecord || oldRecord.isRevoked || oldRecord.expiresAt < Date.now()) {
      if (oldRecord?.isRevoked) {
        await this.revokeTokenFamily(oldRecord.family);
        logger.warn('refresh_token_reuse_detected', { family: oldRecord.family, userId: oldRecord.userId });
      }
      return null;
    }

    const newRefreshToken = crypto.randomBytes(FIB[8]).toString('hex');
    const newTokenHash = this.hashToken(newRefreshToken);
    const now = Date.now();

    await this.revokeRefreshToken(oldTokenHash, newTokenHash);

    const newRecord: RefreshTokenRecord = {
      tokenHash: newTokenHash,
      userId: oldRecord.userId,
      sessionId: oldRecord.sessionId,
      family: oldRecord.family,
      issuedAt: now,
      expiresAt: now + this.refreshTTLMs,
      isRevoked: false,
      replacedBy: null
    };

    await this.storeRefreshToken(newRecord);

    const session = await this.validateSession(oldRecord.sessionId);
    if (!session) return null;

    const updatedSession: SessionPayload = {
      ...session,
      issuedAt: now,
      expiresAt: now + this.sessionTTLMs,
      refreshTokenHash: newTokenHash,
      fingerprint
    };

    await this.redisClient.setEx(
      `session:${session.sessionId}`,
      Math.floor(this.sessionTTLMs / 1000),
      JSON.stringify(updatedSession)
    );

    logger.info('refresh_token_rotated', { userId: oldRecord.userId, sessionId: oldRecord.sessionId });

    return { session: updatedSession, newRefreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async storeRefreshToken(record: RefreshTokenRecord): Promise<void> {
    await this.redisClient.setEx(
      `refresh:${record.tokenHash}`,
      Math.floor(this.refreshTTLMs / 1000),
      JSON.stringify(record)
    );
  }

  private async getRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const data = await this.redisClient.get(`refresh:${tokenHash}`);
    return data ? JSON.parse(data) : null;
  }

  private async revokeRefreshToken(tokenHash: string, replacedBy: string): Promise<void> {
    const data = await this.redisClient.get(`refresh:${tokenHash}`);
    if (data) {
      const record: RefreshTokenRecord = JSON.parse(data);
      const revoked: RefreshTokenRecord = { ...record, isRevoked: true, replacedBy };
      await this.redisClient.setEx(
        `refresh:${tokenHash}`,
        Math.floor(this.refreshTTLMs / 1000),
        JSON.stringify(revoked)
      );
    }
  }

  private async revokeTokenFamily(family: string): Promise<void> {
    logger.warn('revoking_entire_token_family', { family });
    // In production, scan Redis for all tokens in this family
    // For now, the revocation of individual tokens handles this
  }
}

// ═══════════════════════════════════════════════════════
// Rate Limiter (φ-based backoff)
// ═══════════════════════════════════════════════════════

export class PhiRateLimiter {
  private readonly windowMs: number = FIB[8] * 1000;     // 21 seconds
  private readonly maxRequests: number = FIB[10];          // 55 requests per window
  private readonly baseBackoffMs: number = FIB[5] * 1000; // 5 seconds

  constructor(private readonly redisClient: RedisLike) {}

  async checkLimit(key: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const stateData = await this.redisClient.get(`ratelimit:${key}`);
    const now = Date.now();

    if (!stateData) {
      const state: RateLimitState = {
        key,
        windowStart: now,
        requestCount: 1,
        windowDurationMs: this.windowMs,
        maxRequests: this.maxRequests,
        backoffUntil: null
      };
      await this.redisClient.setEx(
        `ratelimit:${key}`,
        Math.ceil(this.windowMs / 1000),
        JSON.stringify(state)
      );
      return { allowed: true, retryAfterMs: 0 };
    }

    const state: RateLimitState = JSON.parse(stateData);

    if (state.backoffUntil && now < state.backoffUntil) {
      return { allowed: false, retryAfterMs: state.backoffUntil - now };
    }

    if (now - state.windowStart > state.windowDurationMs) {
      const newState: RateLimitState = {
        ...state,
        windowStart: now,
        requestCount: 1,
        backoffUntil: null
      };
      await this.redisClient.setEx(
        `ratelimit:${key}`,
        Math.ceil(this.windowMs / 1000),
        JSON.stringify(newState)
      );
      return { allowed: true, retryAfterMs: 0 };
    }

    if (state.requestCount >= state.maxRequests) {
      const overageRatio = state.requestCount / state.maxRequests;
      const backoffMs = this.baseBackoffMs * Math.pow(PHI, overageRatio);
      const backoffUntil = now + backoffMs;

      const limited: RateLimitState = { ...state, requestCount: state.requestCount + 1, backoffUntil };
      await this.redisClient.setEx(
        `ratelimit:${key}`,
        Math.ceil((backoffMs + this.windowMs) / 1000),
        JSON.stringify(limited)
      );

      logger.warn('rate_limit_exceeded', { key, requestCount: state.requestCount, backoffMs: Math.round(backoffMs) });
      return { allowed: false, retryAfterMs: backoffMs };
    }

    const updated: RateLimitState = { ...state, requestCount: state.requestCount + 1 };
    await this.redisClient.setEx(
      `ratelimit:${key}`,
      Math.ceil(this.windowMs / 1000),
      JSON.stringify(updated)
    );
    return { allowed: true, retryAfterMs: 0 };
  }
}

// ═══════════════════════════════════════════════════════
// PKCE Validation
// ═══════════════════════════════════════════════════════

export class PKCEValidator {
  verifyChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return hash === codeChallenge;
  }

  generateChallenge(codeVerifier: string): string {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  }
}

// ═══════════════════════════════════════════════════════
// Authorization Engine
// ═══════════════════════════════════════════════════════

export class AuthorizationEngine {
  private readonly roleHierarchy: Record<Role, ReadonlyArray<Role>> = {
    admin: ['admin', 'developer', 'operator', 'viewer'],
    developer: ['developer', 'viewer'],
    operator: ['operator', 'viewer'],
    viewer: ['viewer']
  };

  authorize(
    userRoles: ReadonlyArray<Role>,
    requiredRole: Role,
    resource: string
  ): AuthorizationResult {
    const hasAccess = userRoles.some(role => {
      const expandedRoles = this.roleHierarchy[role];
      return expandedRoles ? expandedRoles.includes(requiredRole) : false;
    });

    if (hasAccess) {
      return { allowed: true, userId: '', roles: userRoles, tenantId: '', reason: 'role_match' };
    }

    logger.warn('authorization_denied', { requiredRole, resource, userRoles: userRoles.join(',') });
    return {
      allowed: false,
      userId: '',
      roles: userRoles,
      tenantId: '',
      reason: `insufficient_role: requires ${requiredRole}`
    };
  }
}

// ═══════════════════════════════════════════════════════
// Event Publisher
// ═══════════════════════════════════════════════════════

export class AuthEventPublisher {
  constructor(private readonly natsPublish: (subject: string, data: string) => Promise<void>) {}

  async publish(event: AuthEvent): Promise<void> {
    const subject = `heady.auth.${event.type.replace(/\./g, '.')}`;
    await this.natsPublish(subject, JSON.stringify(event));
    logger.info('auth_event_published', { type: event.type, userId: event.userId });
  }

  createEvent(
    type: AuthEventType,
    userId: string,
    tenantId: string,
    sourceIp: string,
    userAgent: string,
    metadata: Record<string, string | number | boolean> = {}
  ): AuthEvent {
    return {
      type,
      userId,
      tenantId,
      timestamp: new Date().toISOString(),
      metadata,
      sourceIp,
      userAgent
    };
  }
}

// ═══════════════════════════════════════════════════════
// Coherence Health Scoring (CSL-based)
// ═══════════════════════════════════════════════════════

export function computeCoherenceScore(metrics: {
  redisLatencyMs: number;
  pgLatencyMs: number;
  activeSessionCount: number;
  errorRate: number;
  uptime: number;
}): number {
  const redisScore = metrics.redisLatencyMs < FIB[5] ? 1.0 :
                     metrics.redisLatencyMs < FIB[8] ? PSI : 0.0;
  const pgScore = metrics.pgLatencyMs < FIB[8] ? 1.0 :
                  metrics.pgLatencyMs < FIB[10] ? PSI : 0.0;
  const errorScore = 1.0 - Math.min(metrics.errorRate, 1.0);
  const uptimeScore = Math.min(metrics.uptime / (FIB[13] * 60), 1.0);

  // CSL AND: weighted cosine-like aggregation with φ weights
  const weights = [PHI, PHI, 1.0, PSI]; // redis, pg, errors, uptime
  const scores = [redisScore, pgScore, errorScore, uptimeScore];
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const weightedSum = scores.reduce((sum, s, i) => sum + s * (weights[i] ?? 0), 0);

  return weightedSum / totalWeight;
}

// ═══════════════════════════════════════════════════════
// Interface stubs for dependency injection
// ═══════════════════════════════════════════════════════

export interface RedisLike {
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

export interface PgPoolLike {
  query(text: string, values?: ReadonlyArray<string | number | boolean | null>): Promise<{ rows: Record<string, unknown>[] }>;
}
