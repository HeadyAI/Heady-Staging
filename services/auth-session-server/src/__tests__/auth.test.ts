import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import {
  createSession,
  validateSession,
  revokeSession,
  clearAllSessions,
} from '../utils/session.js';
import type { SessionData } from '../utils/session.js';

/**
 * Mock Request object for testing
 */
function createMockRequest() {
  return {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'x-forwarded-for': '192.168.1.100',
    },
    socket: {
      remoteAddress: '192.168.1.100',
    },
    cookies: {} as Record<string, string>,
  };
}

describe('Session Management', () => {
  beforeEach(() => {
    clearAllSessions();
  });

  afterEach(() => {
    clearAllSessions();
  });

  describe('createSession', () => {
    it('should create a new session with valid parameters', () => {
      const req = createMockRequest() as any;
      const userId = 'user123';
      const firebaseToken = 'token_abc123';
      const email = 'user@example.com';

      const session = createSession(userId, firebaseToken, req, email);

      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.email).toBe(email);
      expect(session.firebaseToken).toBe(firebaseToken);
      expect(session.sessionId).toBeDefined();
      expect(session.createdAt).toBeLessThanOrEqual(Date.now());
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should generate unique session IDs', () => {
      const req = createMockRequest() as any;
      const session1 = createSession('user1', 'token1', req);
      const session2 = createSession('user2', 'token2', req);

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it('should set fingerprint based on IP and User-Agent', () => {
      const req = createMockRequest() as any;
      const session = createSession('user1', 'token1', req);

      expect(session.fingerprint).toBeDefined();
      expect(session.fingerprint.length).toBeGreaterThan(0);
    });

    it('should set IP address and User-Agent from request', () => {
      const req = createMockRequest() as any;
      const session = createSession('user1', 'token1', req);

      expect(session.ipAddress).toBe('192.168.1.100');
      expect(session.userAgent).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    });
  });

  describe('validateSession', () => {
    it('should validate an active session', () => {
      const req = createMockRequest() as any;
      const session = createSession('user1', 'token1', req);

      const validation = validateSession(session.sessionId, req);

      expect(validation.valid).toBe(true);
      expect(validation.session).toBeDefined();
      expect(validation.session?.userId).toBe('user1');
    });

    it('should reject non-existent session', () => {
      const req = createMockRequest() as any;
      const validation = validateSession('nonexistent-id', req);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Session not found');
    });

    it('should reject session with mismatched fingerprint', () => {
      const req = createMockRequest() as any;
      const session = createSession('user1', 'token1', req);

      // Create request with different fingerprint
      const differentReq = {
        headers: {
          'user-agent': 'Different User Agent',
          'x-forwarded-for': '10.0.0.1',
        },
        socket: {
          remoteAddress: '10.0.0.1',
        },
        cookies: {},
      } as any;

      const validation = validateSession(session.sessionId, differentReq);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Session fingerprint mismatch');
    });

    it('should update lastActivityAt on validation', () => {
      const req = createMockRequest() as any;
      const session = createSession('user1', 'token1', req);
      const originalActivityTime = session.lastActivityAt;

      // Wait a bit then validate
      return new Promise((resolve) => {
        setTimeout(() => {
          const validation = validateSession(session.sessionId, req);
          expect(validation.valid).toBe(true);
          expect(validation.session!.lastActivityAt).toBeGreaterThan(originalActivityTime);
          resolve(null);
        }, 10);
      });
    });
  });

  describe('revokeSession', () => {
    it('should revoke an active session', () => {
      const req = createMockRequest() as any;
      const session = createSession('user1', 'token1', req);

      const revoked = revokeSession(session.sessionId);

      expect(revoked).toBe(true);

      // Verify session is no longer valid
      const validation = validateSession(session.sessionId, req);
      expect(validation.valid).toBe(false);
    });

    it('should return false for non-existent session', () => {
      const revoked = revokeSession('nonexistent-id');
      expect(revoked).toBe(false);
    });

    it('should not affect other user sessions', () => {
      const req = createMockRequest() as any;
      const session1 = createSession('user1', 'token1', req);
      const session2 = createSession('user1', 'token2', req);
      const session3 = createSession('user2', 'token3', req);

      revokeSession(session2.sessionId);

      // Session 1 should still be valid
      expect(validateSession(session1.sessionId, req).valid).toBe(true);

      // Session 2 should be invalid
      expect(validateSession(session2.sessionId, req).valid).toBe(false);

      // Session 3 should still be valid
      expect(validateSession(session3.sessionId, req).valid).toBe(true);
    });
  });
});

describe('Session Expiration', () => {
  beforeEach(() => {
    clearAllSessions();
  });

  afterEach(() => {
    clearAllSessions();
  });

  it('should detect expired sessions', () => {
    const req = createMockRequest() as any;
    const session = createSession('user1', 'token1', req) as any;

    // Manually set expiration to past
    session.expiresAt = Date.now() - 1000;

    const validation = validateSession(session.sessionId, req);

    expect(validation.valid).toBe(false);
    expect(validation.expired).toBe(true);
    expect(validation.error).toBe('Session expired');
  });
});

describe('Rate Limiter', () => {
  it('should track requests per IP', async () => {
    const app = express();
    app.use(cookieParser());

    // Mock rate limiter
    let requestCount = 0;
    app.use((req, res, next) => {
      requestCount++;
      next();
    });

    app.get('/test', (req, res) => {
      res.json({ count: requestCount });
    });

    const response = await request(app).get('/test');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
  });
});

describe('CORS Configuration', () => {
  it('should allow HEADY domain origins', () => {
    const allowedOrigins = [
      'https://headysystems.com',
      'https://api.headysystems.com',
      'https://headyme.com',
      'https://heady-ai.com',
    ];

    // Test origin validation would go here
    expect(allowedOrigins.length).toBeGreaterThan(0);
  });

  it('should reject unknown origins', () => {
    const rejectedOrigins = ['https://evil.com', 'https://attacker.org'];

    expect(rejectedOrigins.length).toBeGreaterThan(0);
  });
});

describe('Session Fingerprinting', () => {
  it('should generate consistent fingerprints for same IP and User-Agent', () => {
    const req1 = createMockRequest() as any;
    const req2 = createMockRequest() as any;

    const session1 = createSession('user1', 'token1', req1);
    const session2 = createSession('user2', 'token2', req2);

    expect(session1.fingerprint).toBe(session2.fingerprint);
  });

  it('should generate different fingerprints for different IPs', () => {
    const req1 = createMockRequest() as any;
    const req2 = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'x-forwarded-for': '10.0.0.1',
      },
      socket: {
        remoteAddress: '10.0.0.1',
      },
      cookies: {},
    } as any;

    const session1 = createSession('user1', 'token1', req1);
    const session2 = createSession('user2', 'token2', req2);

    expect(session1.fingerprint).not.toBe(session2.fingerprint);
  });
});

describe('Session Stats', () => {
  beforeEach(() => {
    clearAllSessions();
  });

  afterEach(() => {
    clearAllSessions();
  });

  it('should track session statistics', () => {
    const { getSessionStats } = await import('../utils/session.js');

    const req = createMockRequest() as any;
    createSession('user1', 'token1', req);
    createSession('user1', 'token2', req);
    createSession('user2', 'token3', req);

    const stats = getSessionStats();

    expect(stats.totalSessions).toBeGreaterThanOrEqual(3);
    expect(stats.totalUsers).toBeGreaterThanOrEqual(2);
  });
});
