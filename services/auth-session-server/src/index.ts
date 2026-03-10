import { createServiceApp } from '@heady-ai/service-runtime';
import type { ServiceManifest } from '@heady-ai/contract-types';
import { PHI, PHI_SQUARED, PHI_CUBED, fib, phiBackoff } from '@heady-ai/phi-math-foundation';
import { z } from 'zod';
import * as admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// Phi-derived constants (NO magic numbers)
// ---------------------------------------------------------------------------

/** Default port: 4320 (assigned by service catalog) */
const DEFAULT_PORT = 4320;

/** Session cookie max age: fib(20) seconds = 6765s (~113 minutes) */
const SESSION_MAX_AGE_S = fib(20);

/** Session cookie max age in milliseconds */
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_S * 1000;

/** Extended session: fib(25) seconds = 75025s (~20.8 hours) */
const SESSION_EXTENDED_AGE_S = fib(25);

/** Token verification clock tolerance: fib(8) seconds = 21s */
const CLOCK_TOLERANCE_S = fib(8);

/** Relay iframe cache max-age: fib(12) seconds = 144s */
const RELAY_CACHE_S = fib(12);

/** CORS max-age: fib(15) seconds = 610s (~10 minutes) */
const CORS_MAX_AGE_S = fib(15);

/** Cookie name */
const SESSION_COOKIE_NAME = '__heady_session';

/** Cookie domain */
const COOKIE_DOMAIN = '.headysystems.com';

// ---------------------------------------------------------------------------
// All 9 Heady domains that require CORS
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS: string[] = [
  'https://headysystems.com',
  'https://headyme.com',
  'https://headybuddy.org',
  'https://headyagent.com',
  'https://heady-ai.com',
  'https://headyconnection.org',
  'https://headyio.com',
  'https://headycloud.com',
  'https://headycreator.com',
];

// Also allow www. variants
const ALLOWED_ORIGINS_SET = new Set<string>(
  ALLOWED_ORIGINS.flatMap((origin) => [origin, origin.replace('https://', 'https://www.')])
);

// ---------------------------------------------------------------------------
// Zod request schemas
// ---------------------------------------------------------------------------

const CreateSessionSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
  /** Optional: request an extended session (up to ~20.8h instead of ~113min) */
  extended: z.boolean().optional().default(false),
});

const RevokeSessionSchema = z.object({
  /** If provided, revoke a specific uid's refresh tokens server-side */
  uid: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Firebase Admin initialization
// ---------------------------------------------------------------------------

function initFirebase(): void {
  if (admin.apps.length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else if (projectId) {
    // Fall back to application default credentials (e.g. on GCP)
    admin.initializeApp({ projectId });
  } else {
    admin.initializeApp();
  }
}

// ---------------------------------------------------------------------------
// Service manifest
// ---------------------------------------------------------------------------

const manifest: ServiceManifest = {
  name: 'auth-session-server',
  version: '0.1.0',
  port: DEFAULT_PORT,
  summary: 'Cross-domain authentication session service with Firebase ID token validation and httpOnly cookie management.',
  routes: [
    '/health',
    '/api/session/create',
    '/api/session/verify',
    '/api/session/revoke',
    '/api/session/relay',
  ],
  dependencies: [
    'observability-client',
    'phi-math-foundation',
  ],
} as ServiceManifest;

const app = createServiceApp(manifest);

// ---------------------------------------------------------------------------
// CORS configuration
// ---------------------------------------------------------------------------

// @ts-expect-error -- register is available on the Fastify instance from createServiceApp
app.register(import('@fastify/cors'), {
  origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) {
      cb(null, true);
      return;
    }
    if (ALLOWED_ORIGINS_SET.has(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`), false);
    }
  },
  credentials: true,
  maxAge: CORS_MAX_AGE_S,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Heady-Request-Id'],
});

// ---------------------------------------------------------------------------
// Cookie plugin
// ---------------------------------------------------------------------------

// @ts-expect-error -- register is available on the Fastify instance from createServiceApp
app.register(import('@fastify/cookie'), {
  secret: process.env.COOKIE_SECRET || 'heady-cookie-secret-change-in-production',
  parseOptions: {},
});

// ---------------------------------------------------------------------------
// Initialize Firebase before handling requests
// ---------------------------------------------------------------------------

app.addHook('onReady', async () => {
  initFirebase();
  app.log.info({
    msg: 'Firebase Admin SDK initialized',
    projectId: process.env.FIREBASE_PROJECT_ID ?? 'default',
  });
});

// ---------------------------------------------------------------------------
// Health endpoint
// ---------------------------------------------------------------------------

app.get('/health', async () => ({
  status: 'healthy',
  service: 'auth-session-server',
  version: '0.1.0',
  phi: PHI,
  sessionMaxAgeSec: SESSION_MAX_AGE_S,
  checkedAt: new Date().toISOString(),
}));

// ---------------------------------------------------------------------------
// POST /api/session/create
// Validates a Firebase ID token, creates an httpOnly session cookie.
// ---------------------------------------------------------------------------

app.post('/api/session/create', async (request, reply) => {
  const parseResult = CreateSessionSchema.safeParse(request.body);
  if (!parseResult.success) {
    reply.status(400);
    return {
      error: 'VALIDATION_ERROR',
      details: parseResult.error.flatten().fieldErrors,
    };
  }

  const { idToken, extended } = parseResult.data;

  let maxRetries = fib(3); // 2 retries
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      // Verify the ID token first
      const decodedToken = await admin.auth().verifyIdToken(idToken, /* checkRevoked */ true);

      // Determine session duration based on extended flag
      const expiresInMs = extended
        ? SESSION_EXTENDED_AGE_S * 1000
        : SESSION_MAX_AGE_MS;

      // Create a session cookie from the ID token
      const sessionCookie = await admin.auth().createSessionCookie(idToken, {
        expiresIn: expiresInMs,
      });

      // Set the httpOnly, Secure, SameSite=None cookie
      reply.setCookie(SESSION_COOKIE_NAME, sessionCookie, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: COOKIE_DOMAIN,
        path: '/',
        maxAge: extended ? SESSION_EXTENDED_AGE_S : SESSION_MAX_AGE_S,
      });

      reply.status(201);
      return {
        status: 'SESSION_CREATED',
        uid: decodedToken.uid,
        email: decodedToken.email ?? null,
        expiresInSeconds: extended ? SESSION_EXTENDED_AGE_S : SESSION_MAX_AGE_S,
      };
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt <= maxRetries) {
        const backoffMs = phiBackoff(attempt);
        app.log.warn({
          msg: 'Session create failed, retrying with phi-backoff',
          attempt,
          backoffMs,
          error: (err as Error).message,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  app.log.error({
    msg: 'Session creation failed after retries',
    maxRetries,
    error: (lastError as Error).message,
  });

  reply.status(401);
  return {
    error: 'AUTH_FAILED',
    message: 'Invalid or expired ID token',
  };
});

// ---------------------------------------------------------------------------
// POST /api/session/verify
// Verifies session cookie, returns user info.
// ---------------------------------------------------------------------------

app.post('/api/session/verify', async (request, reply) => {
  const sessionCookie = (request.cookies as Record<string, string | undefined>)?.[SESSION_COOKIE_NAME];

  if (!sessionCookie) {
    reply.status(401);
    return {
      error: 'NO_SESSION',
      message: 'No session cookie present',
    };
  }

  let maxRetries = fib(3); // 2 retries
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, /* checkRevoked */ true);

      return {
        status: 'VALID',
        uid: decodedClaims.uid,
        email: decodedClaims.email ?? null,
        name: decodedClaims.name ?? null,
        picture: decodedClaims.picture ?? null,
        emailVerified: decodedClaims.email_verified ?? false,
        authTime: decodedClaims.auth_time,
        issuedAt: decodedClaims.iat,
        expiresAt: decodedClaims.exp,
      };
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt <= maxRetries) {
        const backoffMs = phiBackoff(attempt);
        app.log.warn({
          msg: 'Session verify failed, retrying with phi-backoff',
          attempt,
          backoffMs,
          error: (err as Error).message,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  app.log.error({
    msg: 'Session verification failed after retries',
    error: (lastError as Error).message,
  });

  // Clear invalid cookie
  reply.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: COOKIE_DOMAIN,
    path: '/',
  });

  reply.status(401);
  return {
    error: 'INVALID_SESSION',
    message: 'Session cookie is invalid or revoked',
  };
});

// ---------------------------------------------------------------------------
// POST /api/session/revoke
// Invalidates session cookie and optionally revokes Firebase refresh tokens.
// ---------------------------------------------------------------------------

app.post('/api/session/revoke', async (request, reply) => {
  const sessionCookie = (request.cookies as Record<string, string | undefined>)?.[SESSION_COOKIE_NAME];

  // Clear cookie regardless
  reply.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: COOKIE_DOMAIN,
    path: '/',
  });

  // Parse optional body for uid-based server-side revocation
  const parseResult = RevokeSessionSchema.safeParse(request.body ?? {});
  const requestUid = parseResult.success ? parseResult.data.uid : undefined;

  // Determine uid to revoke: from body, or from session cookie
  let uidToRevoke = requestUid;

  if (!uidToRevoke && sessionCookie) {
    try {
      const decoded = await admin.auth().verifySessionCookie(sessionCookie);
      uidToRevoke = decoded.uid;
    } catch {
      // Cookie already invalid, just clear it
      app.log.info({ msg: 'Session cookie already invalid during revoke' });
    }
  }

  if (uidToRevoke) {
    let attempt = 0;
    const maxRetries = fib(3); // 2 retries

    while (attempt <= maxRetries) {
      try {
        await admin.auth().revokeRefreshTokens(uidToRevoke);
        app.log.info({ msg: 'Refresh tokens revoked', uid: uidToRevoke });
        break;
      } catch (err) {
        attempt += 1;
        if (attempt <= maxRetries) {
          const backoffMs = phiBackoff(attempt);
          app.log.warn({
            msg: 'Token revocation failed, retrying with phi-backoff',
            attempt,
            backoffMs,
            error: (err as Error).message,
          });
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else {
          app.log.error({
            msg: 'Token revocation failed after retries',
            uid: uidToRevoke,
            error: (err as Error).message,
          });
        }
      }
    }
  }

  reply.status(200);
  return {
    status: 'SESSION_REVOKED',
    uid: uidToRevoke ?? null,
  };
});

// ---------------------------------------------------------------------------
// GET /api/session/relay
// Serves relay iframe HTML for cross-domain authentication propagation.
// The iframe is embedded on each Heady domain and communicates session
// state via postMessage to the parent window.
// ---------------------------------------------------------------------------

app.get('/api/session/relay', async (request, reply) => {
  const relayHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Heady Session Relay</title>
  <style>body{display:none}</style>
</head>
<body>
<script>
(function() {
  'use strict';

  // Allowed parent origins (all 9 Heady domains + www variants)
  var ALLOWED = new Set(${JSON.stringify([...ALLOWED_ORIGINS_SET])});

  // PHI-derived heartbeat interval: ${Math.round(PHI_CUBED * 1000)}ms
  var HEARTBEAT_MS = ${Math.round(PHI_CUBED * 1000)};

  // Verify session by calling back to this server
  var VERIFY_URL = '/api/session/verify';

  function sendToParent(data) {
    if (window.parent === window) return;
    try {
      // Post to parent - parent must validate origin on receipt
      window.parent.postMessage(
        JSON.stringify({ type: 'heady:session', payload: data }),
        '*'
      );
    } catch (e) {
      // Silently fail - parent may have navigated away
    }
  }

  function checkSession() {
    fetch(VERIFY_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.status === 'VALID') {
        sendToParent({
          authenticated: true,
          uid: data.uid,
          email: data.email,
          name: data.name,
          expiresAt: data.expiresAt
        });
      } else {
        sendToParent({ authenticated: false });
      }
    })
    .catch(function() {
      sendToParent({ authenticated: false, error: 'NETWORK_ERROR' });
    });
  }

  // Listen for requests from parent
  window.addEventListener('message', function(event) {
    if (!event.origin || !ALLOWED.has(event.origin)) return;

    var msg;
    try {
      msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (e) { return; }

    if (msg && msg.type === 'heady:session:check') {
      checkSession();
    }
  });

  // Initial check on load
  checkSession();

  // Periodic heartbeat at phi-cubed interval
  setInterval(checkSession, HEARTBEAT_MS);
})();
</script>
</body>
</html>`;

  reply
    .header('Content-Type', 'text/html; charset=utf-8')
    .header('Cache-Control', `public, max-age=${RELAY_CACHE_S}`)
    .header('X-Frame-Options', 'ALLOWALL')
    .header('Content-Security-Policy', [
      "default-src 'none'",
      "script-src 'unsafe-inline'",
      `connect-src 'self'`,
      "frame-ancestors " + ALLOWED_ORIGINS.join(' '),
    ].join('; '))
    .status(200)
    .send(relayHtml);
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const port = Number(process.env.PORT ?? DEFAULT_PORT);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info({
    msg: `auth-session-server listening on ${port}`,
    port,
    phi: PHI,
    sessionMaxAgeSec: SESSION_MAX_AGE_S,
    corsOrigins: ALLOWED_ORIGINS.length,
    cookieDomain: COOKIE_DOMAIN,
  });
}).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
