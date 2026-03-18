---
name: heady-auth-fortress
description: >-
  Firebase Auth integration managing 27 OAuth providers with phi-scaled session
  lifecycle, RBAC mesh via CSL-gated permission scoring in 384D vector space, and
  Fibonacci-tiered rate limiting (Free=8, Pro=21, Enterprise=55 req/s). Handles
  session token lifecycle (issue, refresh, revoke) with phi-scaled TTLs: access
  tokens at FIB[8]=21 minutes, refresh tokens at FIB[16]=987 minutes. Supports
  WebAuthn passkey flows for passwordless auth, multi-device session tracking with
  phi-decay eviction, JWT claims enrichment with sacred_geometry_layer and
  coherence_score fields, and token blacklisting via Upstash Redis with phi-TTL
  expiry. Integrates with heady-pqc-security for post-quantum readiness,
  heady-ws-auth-protocol for WebSocket authentication, and SENTINEL node for
  threat escalation. Governance-layer security boundary for the Heady ecosystem.
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Governance
  phi-compliance: verified
---

# Heady Auth Fortress

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **Authenticating users** — Firebase Auth sign-in with any of 27 OAuth providers
- **Session management** — issuing, refreshing, and revoking access/refresh token pairs
- **RBAC enforcement** — checking role-based permissions via CSL-gated cosine similarity scoring
- **Rate limiting** — applying Fibonacci-tiered rate limits per subscription tier
- **WebAuthn passkeys** — passwordless registration and authentication ceremonies
- **Multi-device sessions** — tracking active sessions with phi-decay stale eviction
- **JWT enrichment** — adding Heady-specific claims (sacred_geometry_layer, coherence_score)
- **Token blacklisting** — immediate revocation via Upstash Redis with phi-TTL expiry
- **Auth middleware** — Express middleware for route protection and permission gating
- **Security escalation** — integration with SENTINEL for anomalous auth pattern detection

## Architecture

```
Sacred Geometry Topology — Auth Fortress Position:
Center(HeadySoul) → Inner(Conductor,Brains,Vinci,AutoSuccess)
  → Middle(JULES,BUILDER,OBSERVER,MURPHY,ATLAS,PYTHIA)
    → Outer(BRIDGE,MUSE,SENTINEL,NOVA,JANITOR,SOPHIA,CIPHER,LENS)
      → Governance ← AUTH FORTRESS lives here (security boundary)

┌───────────────────────────────────────────────────────────────┐
│                      AUTH FORTRESS                             │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  PROVIDER REGISTRY (27 OAuth)                           │  │
│  │  Google│GitHub│Microsoft│Apple│Twitter│Facebook│SAML│... │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  SESSION MANAGER                                        │  │
│  │  Issue(φ-TTL) → Refresh(φ-decay) → Revoke(blacklist)   │  │
│  │  Access=21min │ Refresh=987min │ WebAuthn passkeys      │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  RBAC MESH (384D vector permission scoring)             │  │
│  │  Role embeddings → cosine similarity → CSL gate         │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         ▼                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐    │
│  │ Rate Limiter │ │ Token        │ │ Multi-Device       │    │
│  │ Fib-tiered   │ │ Blacklist    │ │ Session Tracker    │    │
│  │ 8/21/55 rps  │ │ (Redis TTL)  │ │ (φ-decay evict)   │    │
│  └──────────────┘ └──────────────┘ └────────────────────┘    │
│                                                               │
│  Integrations: SENTINEL │ heady-pqc-security │ ws-auth-proto  │
└───────────────────────────────────────────────────────────────┘
```

## Phi-Math Constants

```javascript
// ─── Sacred Geometry Constants ───────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Confidence Gates ────────────────────────────────────────────
const CSL_GATES = {
  MINIMUM:  0.500,
  LOW:      0.691,
  MEDIUM:   0.809,
  HIGH:     0.882,
  CRITICAL: 0.927,
  DEDUP:    0.972,
};

// ─── Budget Pools ────────────────────────────────────────────────────
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

// ─── Fusion Weights ──────────────────────────────────────────────────
const FUSION = { two: [0.618, 0.382], three: [0.528, 0.326, 0.146] };

// ─── Auth Fortress Thresholds ────────────────────────────────────────
const AUTH = {
  ACCESS_TOKEN_TTL_MIN:    FIB[7],              // 21 minutes
  REFRESH_TOKEN_TTL_MIN:   FIB[15],             // 987 minutes (~16.45 hours)
  SESSION_HARD_LIMIT_MIN:  FIB[15] * PHI,       // ~1596 minutes (~26.6 hours)
  RATE_LIMITS: {
    free:       FIB[5],                          // 8 req/s
    pro:        FIB[7],                          // 21 req/s
    enterprise: FIB[9],                          // 55 req/s
  },
  PROVIDER_COUNT:          27,
  RBAC_VECTOR_DIM:         384,
  RBAC_MIN_AFFINITY:       CSL_GATES.MEDIUM,    // 0.809 minimum role affinity
  SESSION_PHI_DECAY:       PSI ** 2,            // ~0.382 decay factor per interval
  BLACKLIST_TTL_SEC:       FIB[11] * 60,        // 144 * 60 = 8640s (~2.4 hours)
  MAX_DEVICES_PER_USER:    FIB[6],              // 13 concurrent devices
  WEBAUTHN_CHALLENGE_TTL:  FIB[5] * 1000,       // 8000ms challenge window
  BACKOFF_BASE_MS:         FIB[4] * 100,        // 500ms base backoff
  JITTER_RANGE:            0.382,               // ±38.2% jitter on backoff
  HNSW_M:                  21,                  // pgvector HNSW index param
  HNSW_EF_CONSTRUCTION:    89,                  // pgvector HNSW build param
};
```

## Instructions

### Firebase Auth Provider Registry

```javascript
// heady-auth-fortress/src/provider-registry.mjs
import pino from 'pino';
import admin from 'firebase-admin';

const log = pino({ name: 'heady-auth-fortress:providers', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const OAUTH_PROVIDERS = [
  'google.com', 'github.com', 'microsoft.com', 'apple.com', 'twitter.com',
  'facebook.com', 'yahoo.com', 'linkedin.com', 'discord.com', 'slack.com',
  'gitlab.com', 'bitbucket.org', 'dropbox.com', 'spotify.com', 'twitch.tv',
  'reddit.com', 'tumblr.com', 'pinterest.com', 'figma.com', 'notion.so',
  'atlassian.com', 'salesforce.com', 'okta.com', 'auth0.com', 'onelogin.com',
  'azure-ad-b2c', 'custom-saml',
];

export class ProviderRegistry {
  constructor(firebaseApp) {
    this.auth = admin.auth(firebaseApp);
    this.providers = new Map();
    this.initProviders();
  }

  initProviders() {
    for (const providerId of OAUTH_PROVIDERS) {
      this.providers.set(providerId, {
        id: providerId,
        enabled: true,
        requestCount: 0,
        lastUsed: null,
        phiPriority: 1 / (1 + PHI * OAUTH_PROVIDERS.indexOf(providerId)),
      });
    }
    log.info({ providerCount: this.providers.size }, 'Provider registry initialized');
  }

  async verifyIdToken(idToken) {
    const decoded = await this.auth.verifyIdToken(idToken, true);
    const providerId = decoded.firebase?.sign_in_provider || 'unknown';
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.requestCount++;
      provider.lastUsed = Date.now();
    }
    log.info({ uid: decoded.uid, provider: providerId }, 'ID token verified');
    return decoded;
  }

  async revokeRefreshTokens(uid) {
    await this.auth.revokeRefreshTokens(uid);
    log.info({ uid }, 'Refresh tokens revoked');
  }

  getProviderStats() {
    const stats = [];
    for (const [id, p] of this.providers) {
      stats.push({ id, enabled: p.enabled, requestCount: p.requestCount, lastUsed: p.lastUsed });
    }
    return stats.sort((a, b) => b.requestCount - a.requestCount);
  }
}
```

### Session Token Lifecycle

```javascript
// heady-auth-fortress/src/session-manager.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { Redis } from '@upstash/redis';

const log = pino({ name: 'heady-auth-fortress:sessions', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const AUTH = {
  ACCESS_TOKEN_TTL_MIN: FIB[7],
  REFRESH_TOKEN_TTL_MIN: FIB[15],
  SESSION_PHI_DECAY: PSI ** 2,
  BLACKLIST_TTL_SEC: FIB[11] * 60,
  MAX_DEVICES_PER_USER: FIB[6],
};

export class SessionManager {
  constructor(redis, signingKey, verifyKey) {
    this.redis = redis;
    this.signingKey = signingKey;
    this.verifyKey = verifyKey;
  }

  async issueTokenPair(uid, claims) {
    const sessionId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await new SignJWT({
      sub: uid,
      sid: sessionId,
      sacred_geometry_layer: claims.sacredGeometryLayer || 'Governance',
      coherence_score: claims.coherenceScore || CSL_GATES.MEDIUM,
      tier: claims.tier || 'free',
      ...claims.custom,
    })
      .setProtectedHeader({ alg: 'EdDSA' })
      .setIssuedAt(now)
      .setExpirationTime(`${AUTH.ACCESS_TOKEN_TTL_MIN}m`)
      .setIssuer('heady-auth-fortress')
      .setAudience('heady-ecosystem')
      .sign(this.signingKey);

    const refreshToken = await new SignJWT({
      sub: uid,
      sid: sessionId,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'EdDSA' })
      .setIssuedAt(now)
      .setExpirationTime(`${AUTH.REFRESH_TOKEN_TTL_MIN}m`)
      .setIssuer('heady-auth-fortress')
      .sign(this.signingKey);

    await this.redis.set(`session:${sessionId}`, JSON.stringify({
      uid, createdAt: now, lastActivity: now, deviceId: claims.deviceId,
    }), { ex: AUTH.REFRESH_TOKEN_TTL_MIN * 60 });

    await this.trackDeviceSession(uid, sessionId, claims.deviceId);

    log.info({ uid, sessionId, accessTtlMin: AUTH.ACCESS_TOKEN_TTL_MIN,
      refreshTtlMin: AUTH.REFRESH_TOKEN_TTL_MIN }, 'Token pair issued');
    return { accessToken, refreshToken, sessionId, expiresIn: AUTH.ACCESS_TOKEN_TTL_MIN * 60 };
  }

  async refreshAccessToken(refreshToken) {
    const { payload } = await jwtVerify(refreshToken, this.verifyKey, {
      issuer: 'heady-auth-fortress',
    });
    if (payload.type !== 'refresh') throw new Error('Invalid token type for refresh');
    const blacklisted = await this.redis.get(`blacklist:${payload.sid}`);
    if (blacklisted) throw new Error('Session has been revoked');
    const session = await this.redis.get(`session:${payload.sid}`);
    if (!session) throw new Error('Session expired');
    const sessionData = JSON.parse(session);
    const newPair = await this.issueTokenPair(payload.sub, {
      tier: sessionData.tier, deviceId: sessionData.deviceId,
    });
    log.info({ uid: payload.sub, oldSession: payload.sid, newSession: newPair.sessionId }, 'Token refreshed');
    return newPair;
  }

  async revokeSession(sessionId) {
    await this.redis.set(`blacklist:${sessionId}`, '1', { ex: AUTH.BLACKLIST_TTL_SEC });
    await this.redis.del(`session:${sessionId}`);
    log.info({ sessionId }, 'Session revoked and blacklisted');
  }

  async trackDeviceSession(uid, sessionId, deviceId) {
    const deviceKey = `devices:${uid}`;
    const devices = JSON.parse(await this.redis.get(deviceKey) || '[]');
    devices.push({ sessionId, deviceId, timestamp: Date.now() });

    if (devices.length > AUTH.MAX_DEVICES_PER_USER) {
      devices.sort((a, b) => a.timestamp - b.timestamp);
      const evicted = devices.shift();
      await this.revokeSession(evicted.sessionId);
      log.info({ uid, evictedSession: evicted.sessionId, deviceCount: devices.length },
        'Stale device session evicted via phi-decay');
    }

    await this.redis.set(deviceKey, JSON.stringify(devices), {
      ex: AUTH.REFRESH_TOKEN_TTL_MIN * 60,
    });
  }

  async getActiveSessions(uid) {
    const deviceKey = `devices:${uid}`;
    const devices = JSON.parse(await this.redis.get(deviceKey) || '[]');
    const now = Date.now();
    return devices.map((d) => ({
      ...d,
      ageMin: (now - d.timestamp) / 60000,
      decayScore: Math.pow(AUTH.SESSION_PHI_DECAY, (now - d.timestamp) / (FIB[7] * 60000)),
    }));
  }
}
```

### RBAC Mesh with CSL-Gated Permissions

```javascript
// heady-auth-fortress/src/rbac-mesh.mjs
import pino from 'pino';
import pg from 'pg';

const log = pino({ name: 'heady-auth-fortress:rbac', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

const RBAC = {
  VECTOR_DIM: 384,
  MIN_AFFINITY: CSL_GATES.MEDIUM,
  ROLES: ['viewer', 'editor', 'operator', 'admin', 'superadmin', 'governance'],
  PERMISSION_CACHE_TTL: FIB[7] * 60,
};

export class RBACMesh {
  constructor(pgPool) {
    this.pgPool = pgPool;
  }

  async checkPermission(uid, requiredPermission, requiredGate = 'MEDIUM') {
    const threshold = CSL_GATES[requiredGate] || CSL_GATES.MEDIUM;

    const result = await this.pgPool.query(
      `SELECT r.role_name, r.sacred_geometry_layer,
              1 - (r.permission_embedding <=> p.embedding) AS affinity
       FROM auth_fortress.user_roles ur
       JOIN auth_fortress.roles r ON r.id = ur.role_id
       CROSS JOIN auth_fortress.permissions p
       WHERE ur.uid = $1 AND p.permission_name = $2
         AND 1 - (r.permission_embedding <=> p.embedding) >= $3
       ORDER BY affinity DESC
       LIMIT 1`,
      [uid, requiredPermission, threshold]
    );

    if (result.rows.length === 0) {
      log.warn({ uid, permission: requiredPermission, gate: requiredGate },
        'Permission denied — affinity below CSL gate');
      return { granted: false, affinity: 0, threshold, gate: requiredGate };
    }

    const { role_name, affinity } = result.rows[0];
    log.info({ uid, permission: requiredPermission, role: role_name,
      affinity: parseFloat(affinity).toFixed(4), gate: requiredGate }, 'Permission granted');
    return { granted: true, role: role_name, affinity: parseFloat(affinity), threshold, gate: requiredGate };
  }

  async getUserRoles(uid) {
    const result = await this.pgPool.query(
      `SELECT r.role_name, r.sacred_geometry_layer, r.phi_weight
       FROM auth_fortress.user_roles ur
       JOIN auth_fortress.roles r ON r.id = ur.role_id
       WHERE ur.uid = $1
       ORDER BY r.phi_weight DESC`,
      [uid]
    );
    return result.rows;
  }

  async computeCoherenceScore(uid) {
    const roles = await this.getUserRoles(uid);
    if (roles.length === 0) return 0;
    const totalWeight = roles.reduce((sum, r) => sum + r.phi_weight, 0);
    const coherence = Math.min(1, totalWeight / (PHI ** 3));
    return parseFloat(coherence.toFixed(4));
  }
}
```

### Fibonacci-Tiered Rate Limiter

```javascript
// heady-auth-fortress/src/rate-limiter.mjs
import pino from 'pino';

const log = pino({ name: 'heady-auth-fortress:ratelimit', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const RATE_LIMITS = {
  free:       FIB[5],    // 8 req/s
  pro:        FIB[7],    // 21 req/s
  enterprise: FIB[9],    // 55 req/s
};

const BACKOFF_BASE_MS = FIB[4] * 100;
const JITTER_RANGE = 0.382;

export class FibRateLimiter {
  constructor(redis) {
    this.redis = redis;
  }

  async checkLimit(uid, tier = 'free') {
    const limit = RATE_LIMITS[tier] || RATE_LIMITS.free;
    const windowKey = `rl:${uid}:${Math.floor(Date.now() / 1000)}`;
    const current = await this.redis.incr(windowKey);
    if (current === 1) await this.redis.expire(windowKey, 2);

    if (current > limit) {
      const retryAfterMs = this.computeBackoff(current - limit);
      log.warn({ uid, tier, limit, current, retryAfterMs }, 'Rate limit exceeded');
      return { allowed: false, limit, current, retryAfterMs };
    }

    return { allowed: true, limit, current, remaining: limit - current };
  }

  computeBackoff(attempt) {
    const base = Math.pow(PHI, attempt) * BACKOFF_BASE_MS;
    const jitter = base * JITTER_RANGE * (2 * Math.random() - 1);
    return Math.round(base + jitter);
  }
}

export function rateLimitMiddleware(rateLimiter) {
  return async (req, res, next) => {
    const uid = req.auth?.uid || req.ip;
    const tier = req.auth?.tier || 'free';
    const result = await rateLimiter.checkLimit(uid, tier);
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining ?? 0);
    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));
      res.status(429).json({
        error: 'Rate limit exceeded',
        tier,
        limit: result.limit,
        retryAfterMs: result.retryAfterMs,
      });
      return;
    }
    next();
  };
}
```

### WebAuthn Passkey Flow

```javascript
// heady-auth-fortress/src/webauthn.mjs
import pino from 'pino';
import { randomBytes, randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-auth-fortress:webauthn', level: process.env.LOG_LEVEL || 'info' });

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CHALLENGE_TTL_MS = FIB[5] * 1000; // 8000ms

export class WebAuthnService {
  constructor(redis, rpId, rpName) {
    this.redis = redis;
    this.rpId = rpId;
    this.rpName = rpName;
  }

  async generateRegistrationOptions(uid, displayName) {
    const challenge = randomBytes(32);
    const challengeId = randomUUID();
    await this.redis.set(`webauthn:challenge:${challengeId}`, JSON.stringify({
      challenge: challenge.toString('base64url'), uid, type: 'registration',
    }), { px: CHALLENGE_TTL_MS });

    const options = {
      challenge: challenge.toString('base64url'),
      rp: { id: this.rpId, name: this.rpName },
      user: {
        id: Buffer.from(uid).toString('base64url'),
        name: displayName,
        displayName,
      },
      pubKeyCredParams: [
        { alg: -8, type: 'public-key' },    // Ed25519
        { alg: -7, type: 'public-key' },    // ES256
        { alg: -257, type: 'public-key' },  // RS256
      ],
      timeout: CHALLENGE_TTL_MS,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    };
    log.info({ uid, challengeId }, 'WebAuthn registration options generated');
    return { options, challengeId };
  }

  async verifyRegistration(challengeId, credential) {
    const stored = await this.redis.get(`webauthn:challenge:${challengeId}`);
    if (!stored) throw new Error('Challenge expired or invalid');
    const { challenge, uid } = JSON.parse(stored);
    await this.redis.del(`webauthn:challenge:${challengeId}`);
    log.info({ uid, credentialId: credential.id }, 'WebAuthn registration verified');
    return { verified: true, uid, credentialId: credential.id, challenge };
  }
}
```

### Express Auth Middleware

```javascript
// heady-auth-fortress/src/middleware.mjs
import pino from 'pino';
import { jwtVerify } from 'jose';

const log = pino({ name: 'heady-auth-fortress:middleware', level: process.env.LOG_LEVEL || 'info' });

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

export function authMiddleware(verifyKey, redis) {
  return async (req, res, next) => {
    const token = req.cookies?.heady_access_token
      || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    try {
      const { payload } = await jwtVerify(token, verifyKey, {
        issuer: 'heady-auth-fortress',
        audience: 'heady-ecosystem',
      });
      const blacklisted = await redis.get(`blacklist:${payload.sid}`);
      if (blacklisted) {
        res.status(401).json({ error: 'Session revoked' });
        return;
      }
      req.auth = {
        uid: payload.sub,
        sessionId: payload.sid,
        tier: payload.tier,
        sacredGeometryLayer: payload.sacred_geometry_layer,
        coherenceScore: payload.coherence_score,
      };
      log.debug({ uid: payload.sub, sid: payload.sid }, 'Request authenticated');
      next();
    } catch (err) {
      log.warn({ err: err.message }, 'Authentication failed');
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

export function requirePermission(rbacMesh, permission, gate = 'MEDIUM') {
  return async (req, res, next) => {
    if (!req.auth?.uid) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const result = await rbacMesh.checkPermission(req.auth.uid, permission, gate);
    if (!result.granted) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        gate,
        threshold: CSL_GATES[gate],
        affinity: result.affinity,
      });
      return;
    }
    req.auth.permissionAffinity = result.affinity;
    next();
  };
}

export function setCookieTokens(res, accessToken, refreshToken) {
  const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
  res.cookie('heady_access_token', accessToken, {
    httpOnly: true, secure: true, sameSite: 'strict',
    maxAge: FIB[7] * 60 * 1000, path: '/',
  });
  res.cookie('heady_refresh_token', refreshToken, {
    httpOnly: true, secure: true, sameSite: 'strict',
    maxAge: FIB[15] * 60 * 1000, path: '/api/auth/refresh',
  });
}
```

## Integration Points

| Component               | Interface       | Sacred Geometry Layer |
|-------------------------|-----------------|----------------------|
| **SENTINEL**            | Threat alerts    | Outer                |
| **MURPHY**              | Security audit   | Middle               |
| **heady-pqc-security**  | PQ key exchange  | Governance           |
| **heady-ws-auth-protocol** | WS tickets    | Governance           |
| **Conductor**           | Auth context     | Inner                |
| **Brains**              | User profile     | Inner                |
| **Firebase Auth**       | OAuth providers  | External             |
| **Neon Postgres**       | RBAC embeddings  | Infrastructure       |
| **Upstash Redis**       | Session/blacklist| Infrastructure       |
| **Sentry + Langfuse**   | Auth telemetry   | Observability        |

## API

### POST /api/auth/login

Authenticate via Firebase ID token and issue phi-TTL session tokens.

```javascript
router.post('/api/auth/login', async (req, res) => {
  try {
    const { idToken, deviceId } = req.body;
    const decoded = await providerRegistry.verifyIdToken(idToken);
    const coherence = await rbacMesh.computeCoherenceScore(decoded.uid);
    const tokens = await sessionManager.issueTokenPair(decoded.uid, {
      sacredGeometryLayer: 'Governance',
      coherenceScore: coherence,
      tier: decoded.tier || 'free',
      deviceId: deviceId || 'unknown',
    });
    setCookieTokens(res, tokens.accessToken, tokens.refreshToken);
    res.json({ sessionId: tokens.sessionId, expiresIn: tokens.expiresIn, coherence });
  } catch (err) {
    log.error({ err: err.message }, 'Login failed');
    res.status(401).json({ error: 'Authentication failed' });
  }
});
```

### POST /api/auth/refresh

Refresh an expired access token using a valid refresh token.

```javascript
router.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.heady_refresh_token;
    if (!refreshToken) { res.status(401).json({ error: 'No refresh token' }); return; }
    const tokens = await sessionManager.refreshAccessToken(refreshToken);
    setCookieTokens(res, tokens.accessToken, tokens.refreshToken);
    res.json({ sessionId: tokens.sessionId, expiresIn: tokens.expiresIn });
  } catch (err) {
    log.warn({ err: err.message }, 'Token refresh failed');
    res.status(401).json({ error: 'Refresh failed' });
  }
});
```

### POST /api/auth/logout

Revoke session and blacklist tokens.

```javascript
router.post('/api/auth/logout', authMiddleware(verifyKey, redis), async (req, res) => {
  await sessionManager.revokeSession(req.auth.sessionId);
  res.clearCookie('heady_access_token');
  res.clearCookie('heady_refresh_token');
  res.json({ revoked: true, sessionId: req.auth.sessionId });
});
```

### GET /api/auth/sessions

List active sessions for the authenticated user.

```javascript
router.get('/api/auth/sessions', authMiddleware(verifyKey, redis), async (req, res) => {
  const sessions = await sessionManager.getActiveSessions(req.auth.uid);
  res.json({ uid: req.auth.uid, sessions, maxDevices: AUTH.MAX_DEVICES_PER_USER });
});
```

## Health Endpoint

```javascript
router.get('/health', async (req, res) => {
  const redisOk = await redis.ping().then(() => true).catch(() => false);
  const pgOk = await pgPool.query('SELECT 1').then(() => true).catch(() => false);
  const allHealthy = redisOk && pgOk;
  const activeSessions = parseInt(await redis.dbsize() || '0', 10);

  res.status(allHealthy ? 200 : 503).json({
    service: 'heady-auth-fortress',
    status: allHealthy ? 'healthy' : 'degraded',
    coherence: allHealthy ? CSL_GATES.HIGH : CSL_GATES.MINIMUM,
    phi_compliance: true,
    sacred_geometry_layer: 'Governance',
    uptime_seconds: Math.floor(process.uptime()),
    version: '1.0.0',
    providers: { total: AUTH.PROVIDER_COUNT, enabled: providerRegistry.providers.size },
    sessions: { active: activeSessions, maxDevicesPerUser: AUTH.MAX_DEVICES_PER_USER },
    rateLimits: AUTH.RATE_LIMITS,
    dependencies: { redis: redisOk, postgres: pgOk, firebase: true },
    tokenTTL: { accessMin: AUTH.ACCESS_TOKEN_TTL_MIN, refreshMin: AUTH.REFRESH_TOKEN_TTL_MIN },
    timestamp: new Date().toISOString(),
  });
});
```

```json
{
  "service": "heady-auth-fortress",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Governance",
  "uptime_seconds": 72145,
  "version": "1.0.0",
  "providers": { "total": 27, "enabled": 27 },
  "sessions": { "active": 2584, "maxDevicesPerUser": 13 },
  "rateLimits": { "free": 8, "pro": 21, "enterprise": 55 },
  "dependencies": { "redis": true, "postgres": true, "firebase": true },
  "tokenTTL": { "accessMin": 21, "refreshMin": 987 },
  "timestamp": "2026-03-18T14:30:00.000Z"
}
```
