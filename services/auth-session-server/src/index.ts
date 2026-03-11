import express from 'express';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createLogger, requestLoggingMiddleware } from './utils/logger.js';
import {
  corsMiddleware,
  validateRelayFrameOrigin,
} from './middleware/cors-config.js';
import {
  rateLimitMiddleware,
  startRateLimitCleanup,
  getRateLimitStats,
} from './middleware/rate-limiter.js';
import {
  createSession,
  validateSession,
  getSessionIdFromRequest,
  setSessionCookie,
  clearSessionCookie,
  revokeSession,
  getSessionStats,
  startSessionCleanup,
  refreshSession,
} from './utils/session.js';
import {
  verifyFirebaseToken,
  initializeFirebase,
  getFirebaseUser,
} from './utils/firebase.js';

const logger = createLogger('AuthServer');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT || '3310', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// Middleware Setup
// ============================================================================

// Body parsing
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ limit: '16kb', extended: true }));

// Cookie parsing
app.use(cookieParser());

// Request logging
app.use(requestLoggingMiddleware);

// CORS
app.use(corsMiddleware);

// Rate limiting
app.use(rateLimitMiddleware);

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/auth/session - Create session from Firebase ID token
 *
 * Request:
 * {
 *   "idToken": "firebase_id_token"
 * }
 *
 * Response:
 * {
 *   "sessionId": "uuid",
 *   "expiresAt": "2024-03-09T15:00:00Z",
 *   "userId": "uid"
 * }
 */
app.post('/api/auth/session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      logger.warn('Missing or invalid idToken');
      res.status(400).json({
        error: 'Invalid request',
        message: 'idToken is required',
      });
      return;
    }

    // Verify Firebase token
    const tokenVerification = await verifyFirebaseToken(idToken);

    if (!tokenVerification.valid || !tokenVerification.userId) {
      logger.warn('Firebase token verification failed', {
        error: tokenVerification.error,
      });
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid Firebase token',
      });
      return;
    }

    // Create session
    const session = createSession(
      tokenVerification.userId,
      idToken,
      req,
      tokenVerification.email,
    );

    // Set secure session cookie
    setSessionCookie(res, session);

    logger.info('Session created successfully', {
      userId: tokenVerification.userId,
      sessionId: session.sessionId,
    });

    res.status(201).json({
      sessionId: session.sessionId,
      userId: session.userId,
      email: session.email,
      expiresAt: new Date(session.expiresAt).toISOString(),
      expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
    });
  } catch (error) {
    logger.error('Session creation failed', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create session',
    });
  }
});

/**
 * POST /api/auth/verify - Verify session cookie
 *
 * Response:
 * {
 *   "valid": true,
 *   "userId": "uid",
 *   "email": "user@example.com",
 *   "expiresAt": "2024-03-09T15:00:00Z"
 * }
 */
app.post('/api/auth/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = getSessionIdFromRequest(req);

    if (!sessionId) {
      logger.debug('No session cookie found');
      res.status(401).json({
        valid: false,
        error: 'No session found',
      });
      return;
    }

    const validation = validateSession(sessionId, req);

    if (!validation.valid) {
      logger.warn('Session validation failed', {
        sessionId,
        error: validation.error,
      });

      if (validation.expired) {
        clearSessionCookie(res);
      }

      res.status(401).json({
        valid: false,
        error: validation.error,
        expired: validation.expired,
      });
      return;
    }

    const session = validation.session!;

    // Refresh session expiration
    refreshSession(session);

    logger.info('Session verified', {
      userId: session.userId,
      sessionId: session.sessionId,
    });

    res.status(200).json({
      valid: true,
      userId: session.userId,
      email: session.email,
      expiresAt: new Date(session.expiresAt).toISOString(),
      expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
    });
  } catch (error) {
    logger.error('Session verification failed', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify session',
    });
  }
});

/**
 * POST /api/auth/revoke - Revoke session
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Session revoked"
 * }
 */
app.post('/api/auth/revoke', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = getSessionIdFromRequest(req);

    if (!sessionId) {
      logger.debug('No session cookie to revoke');
      res.status(400).json({
        success: false,
        error: 'No session to revoke',
      });
      return;
    }

    const revoked = revokeSession(sessionId);

    if (!revoked) {
      logger.warn('Failed to revoke session', { sessionId });
      res.status(400).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    // Clear session cookie
    clearSessionCookie(res);

    logger.info('Session revoked', { sessionId });

    res.status(200).json({
      success: true,
      message: 'Session revoked',
    });
  } catch (error) {
    logger.error('Session revocation failed', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to revoke session',
    });
  }
});

/**
 * GET /api/auth/relay - Serve cross-domain relay iframe
 *
 * Returns HTML page that handles cross-domain session synchronization
 */
app.get('/api/auth/relay', (req: Request, res: Response): void => {
  try {
    // Validate origin for relay iframe
    const origin = req.headers.origin;

    if (origin && !validateRelayFrameOrigin(origin)) {
      logger.warn('Invalid origin for relay iframe', { origin });
      res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid origin',
      });
      return;
    }

    // Read and serve relay iframe HTML
    const relayPath = join(__dirname, 'relay', 'iframe.html');
    const relayHtml = readFileSync(relayPath, 'utf-8');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache

    res.status(200).send(relayHtml);

    logger.debug('Relay iframe served', { origin });
  } catch (error) {
    logger.error('Failed to serve relay iframe', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load relay iframe',
    });
  }
});

/**
 * GET /api/auth/health - Health check endpoint
 *
 * Response:
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-03-09T10:00:00Z",
 *   "stats": { ... }
 * }
 */
app.get('/api/auth/health', (req: Request, res: Response): void => {
  try {
    const sessionStats = getSessionStats();
    const rateLimitStats = getRateLimitStats();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      uptime: Math.floor(process.uptime()),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      stats: {
        sessions: sessionStats,
        rateLimit: rateLimitStats,
      },
    };

    res.status(200).json(health);

    logger.debug('Health check performed', health);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
});

/**
 * POST /api/auth/user - Get current user info
 *
 * Response:
 * {
 *   "uid": "user_id",
 *   "email": "user@example.com",
 *   "displayName": "User Name"
 * }
 */
app.post('/api/auth/user', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = getSessionIdFromRequest(req);

    if (!sessionId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No session found',
      });
      return;
    }

    const validation = validateSession(sessionId, req);

    if (!validation.valid || !validation.session) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid session',
      });
      return;
    }

    const session = validation.session;

    // Get user info from Firebase
    const user = await getFirebaseUser(session.userId);

    if (!user) {
      logger.warn('Failed to get user info', { userId: session.userId });
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    logger.info('User info retrieved', { userId: session.userId });

    res.status(200).json({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      disabled: user.disabled,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logger.error('Failed to get user info', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user info',
    });
  }
});

// ============================================================================
// Error Handling
// ============================================================================

/**
 * 404 Not Found handler
 */
app.use((req: Request, res: Response): void => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
  });

  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

/**
 * Global error handler
 */
app.use((error: Error, req: Request, res: Response, _next: Function): void => {
  logger.error('Unhandled error', error);

  // Check if response already sent
  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
  });
});

// ============================================================================
// Server Initialization
// ============================================================================

async function startServer(): Promise<void> {
  try {
    // Initialize Firebase Admin SDK
    initializeFirebase();

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('Server started', {
        port: PORT,
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    });

    // Start background cleanup tasks
    startSessionCleanup();
    startRateLimitCleanup();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Force shutting down');
        process.exit(1);
      }, 30000);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Force shutting down');
        process.exit(1);
      }, 30000);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', {
        promise,
        reason,
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
