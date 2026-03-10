'use strict';

const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { initFirebaseAdmin } = require('./firebase-admin');
const { createSession, refreshSession, revokeSession, SESSION_COOKIE_NAME } = require('./session');
const { createCorsMiddleware, requireAuth } = require('./middleware');

const PORT = parseInt(process.env.PORT, 10) || 3380;
const SERVICE_NAME = 'auth-session-server';
const startTime = Date.now();

// Structured JSON logger (no console.log)
const log = {
  _write(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE_NAME,
      message,
      ...meta,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  info(msg, meta) { this._write('info', msg, meta); },
  warn(msg, meta) { this._write('warn', msg, meta); },
  error(msg, meta) { this._write('error', msg, meta); },
  debug(msg, meta) { this._write('debug', msg, meta); },
};

// Initialize Firebase Admin
initFirebaseAdmin();

const app = express();

app.set('trust proxy', true);
app.use(helmet());
app.use(createCorsMiddleware());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    checks: [
      {
        name: 'firebase-admin',
        status: 'healthy',
        latency: 0,
        detail: 'initialized',
      },
    ],
  });
});

// POST /session — create a new session from Firebase ID token
app.post('/session', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    res.status(400).json({
      code: 'HEADY-AUTH-003',
      message: 'Missing or invalid idToken in request body',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const ip = req.ip || req.socket?.remoteAddress || '';
    const userAgent = req.get('user-agent') || '';
    const result = await createSession(idToken, ip, userAgent);

    res.cookie(result.cookieName, result.cookie, result.options);

    // Store fingerprint in a separate cookie for validation
    res.cookie('__heady_fp', result.fingerprint, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: result.options.maxAge,
    });

    log.info('Session created', { uid: result.user.uid, provider: result.user.provider });

    res.status(201).json({
      user: result.user,
      expiresIn: result.options.maxAge / 1000,
    });
  } catch (err) {
    log.error('Session creation failed', { error: err.message });
    res.status(401).json({
      code: 'HEADY-AUTH-004',
      message: 'Failed to create session: invalid token',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /session/refresh — refresh an existing session
app.post('/session/refresh', requireAuth(log), async (req, res) => {
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
  const ip = req.ip || '';
  const userAgent = req.get('user-agent') || '';

  try {
    const result = await refreshSession(sessionCookie, ip, userAgent);

    if (!result) {
      res.json({ refreshed: false, message: 'Session is still fresh' });
      return;
    }

    res.cookie(result.cookieName, result.cookie, result.options);
    log.info('Session refreshed', { uid: req.user.uid });
    res.json({ refreshed: true });
  } catch (err) {
    log.error('Session refresh failed', { error: err.message });
    res.status(500).json({
      code: 'HEADY-AUTH-005',
      message: 'Failed to refresh session',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /session/revoke — revoke a session
app.post('/session/revoke', async (req, res) => {
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];

  if (!sessionCookie) {
    res.status(400).json({
      code: 'HEADY-AUTH-006',
      message: 'No session to revoke',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    await revokeSession(sessionCookie);

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    res.clearCookie('__heady_fp', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    log.info('Session revoked');
    res.json({ revoked: true });
  } catch (err) {
    log.error('Session revocation failed', { error: err.message });
    res.status(500).json({
      code: 'HEADY-AUTH-007',
      message: 'Failed to revoke session',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /session/me — get current user
app.get('/session/me', requireAuth(log), (req, res) => {
  res.json({ user: req.user });
});

// Graceful shutdown
let server;

function shutdown(signal) {
  log.info('Shutdown initiated', { signal });
  if (server) {
    server.close(() => {
      log.info('Server closed');
      process.exit(0);
    });
    // Force close after FIB[7]*1000 = 13s
    setTimeout(() => {
      log.warn('Forced shutdown');
      process.exit(1);
    }, 13000);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server = app.listen(PORT, () => {
  log.info('Server started', { port: PORT, service: SERVICE_NAME });
});

module.exports = app;
