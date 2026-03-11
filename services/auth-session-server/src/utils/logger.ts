import type { Request, Response } from 'express';

export interface LogContext {
  [key: string]: unknown;
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: string, message: string, data?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...data,
    };

    // Use console methods to output structured JSON
    // In production, pipe to centralized logging service
    if (level === 'ERROR') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  info(message: string, data?: LogContext): void {
    this.log('INFO', message, data);
  }

  debug(message: string, data?: LogContext): void {
    this.log('DEBUG', message, data);
  }

  warn(message: string, data?: LogContext): void {
    this.log('WARN', message, data);
  }

  error(message: string, error?: unknown, data?: LogContext): void {
    const errorData = {
      ...data,
      ...(error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
          }
        : { error: String(error) }),
    };

    this.log('ERROR', message, errorData);
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: Function): void {
  const logger = createLogger('HTTP');
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();

  // Attach request ID to response headers
  res.setHeader('X-Request-Id', String(requestId));

  // Store original send function
  const originalSend = res.send;

  // Override send to log response
  res.send = function (data: unknown): Response {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      status,
      duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      size: typeof data === 'string' ? data.length : 0,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  logger.debug('Request started', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  createLogger,
  requestLoggingMiddleware,
};
