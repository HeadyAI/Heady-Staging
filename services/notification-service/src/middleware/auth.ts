import { Request, Response, NextFunction } from 'express';
import { AuthToken } from '../types';
import { logger } from '../logger';

const JWT_SECRET = process.env.JWT_SECRET || 'heady-notification-secret-key';

interface AuthRequest extends Request {
  user?: AuthToken;
  correlationId?: string;
}

export function cookieAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const correlationId = req.headers['x-correlation-id'] as string || req.headers['x-request-id'] as string;

  if (correlationId) {
    req.correlationId = correlationId;
    logger.setContext({ correlationId, requestId: correlationId });
  }

  const cookies = parseCookies(req.headers.cookie || '');
  const sessionCookie = cookies['__heady_session'];

  if (!sessionCookie) {
    logger.warn('auth', 'Missing session cookie', { path: req.path });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No session cookie provided',
      code: 'NO_SESSION'
    });
    return;
  }

  try {
    const token = verifySessionToken(sessionCookie);
    req.user = token;
    logger.debug('auth', 'Session verified', { userId: token.userId, sessionId: token.sessionId });
    next();
  } catch (error) {
    logger.warn('auth', 'Session verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired session',
      code: 'INVALID_SESSION'
    });
  }
}

export function wsTokenAuthMiddleware(token: string): AuthToken | null {
  try {
    return verifySessionToken(token);
  } catch (error) {
    logger.debug('auth', 'WebSocket token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}

function verifySessionToken(token: string): AuthToken {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  const currentTime = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < currentTime) {
    throw new Error('Token expired');
  }

  if (!payload.userId || !payload.sessionId) {
    throw new Error('Missing required token claims');
  }

  return {
    userId: payload.userId,
    sessionId: payload.sessionId,
    iat: payload.iat || 0,
    exp: payload.exp || 0
  };
}

export function setSecureCookie(
  res: Response,
  name: string,
  value: string,
  maxAgeSeconds: number
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(name, value, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: maxAgeSeconds * 1000,
    path: '/',
    domain: process.env.COOKIE_DOMAIN
  });
}

export function clearSecureCookie(res: Response, name: string): void {
  res.cookie(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/'
  });
}
