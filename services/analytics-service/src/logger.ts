import pino from 'pino';

interface StructuredLogContext {
  timestamp: string;
  level: string;
  service: string;
  correlationId?: string;
  userId?: string;
  eventId?: string;
  requestId?: string;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  }
});

class StructuredLogger {
  private context: Partial<StructuredLogContext> = {
    service: 'analytics-service'
  };

  setContext(context: Partial<StructuredLogContext>): void {
    this.context = { ...this.context, ...context };
  }

  private createLog(
    level: string,
    action: string,
    message: string,
    metadata?: Record<string, unknown>,
    duration?: number,
    error?: Error
  ): StructuredLogContext {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: 'analytics-service',
      action,
      message,
      metadata,
      duration,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      } : undefined,
      ...this.context
    };
  }

  info(action: string, message: string, metadata?: Record<string, unknown>, duration?: number): void {
    const log = this.createLog('INFO', action, message, metadata, duration);
    pinoLogger.info(log);
  }

  warn(action: string, message: string, metadata?: Record<string, unknown>, duration?: number): void {
    const log = this.createLog('WARN', action, message, metadata, duration);
    pinoLogger.warn(log);
  }

  error(action: string, message: string, error?: Error, metadata?: Record<string, unknown>): void {
    const log = this.createLog('ERROR', action, message, metadata, undefined, error);
    pinoLogger.error(log);
  }

  debug(action: string, message: string, metadata?: Record<string, unknown>): void {
    const log = this.createLog('DEBUG', action, message, metadata);
    pinoLogger.debug(log);
  }

  trace(action: string, message: string, metadata?: Record<string, unknown>): void {
    const log = this.createLog('TRACE', action, message, metadata);
    pinoLogger.trace(log);
  }

  fatal(action: string, message: string, error?: Error): void {
    const log = this.createLog('FATAL', action, message, undefined, undefined, error);
    pinoLogger.fatal(log);
    process.exit(1);
  }
}

export const logger = new StructuredLogger();
