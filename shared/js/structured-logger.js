/**
 * Heady™ Structured JSON Logger
 * Production-grade logging — no console.log, structured JSON everywhere
 * Supports correlation IDs, service tagging, heady.domain spans
 * © 2026 HeadySystems Inc.
 */

const PHI = 1.618033988749895;

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || 1;

class HeadyLogger {
    constructor(serviceName, options = {}) {
        this.service = serviceName;
        this.version = options.version || process.env.SERVICE_VERSION || '1.0.0';
        this.domain = options.domain || 'unknown';
    }

    _log(level, message, data = {}) {
        if (LOG_LEVELS[level] < currentLevel) return;

        const entry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.service,
            version: this.version,
            domain: this.domain,
            message,
            ...data,
        };

        // Add correlation ID if available
        if (data.correlationId || data.req?.headers?.['x-correlation-id']) {
            entry.correlationId = data.correlationId || data.req?.headers?.['x-correlation-id'];
        }

        // Add trace context if OpenTelemetry is active
        if (data.span) {
            entry.traceId = data.span.spanContext?.()?.traceId;
            entry.spanId = data.span.spanContext?.()?.spanId;
        }

        const output = JSON.stringify(entry);
        if (level === 'error' || level === 'fatal') {
            process.stderr.write(output + '\n');
        } else {
            process.stdout.write(output + '\n');
        }
    }

    debug(msg, data) { this._log('debug', msg, data); }
    info(msg, data) { this._log('info', msg, data); }
    warn(msg, data) { this._log('warn', msg, data); }
    error(msg, data) { this._log('error', msg, data); }
    fatal(msg, data) { this._log('fatal', msg, data); }

    /**
     * Express request logging middleware
     */
    requestLogger() {
        return (req, res, next) => {
            const start = Date.now();
            const correlationId = req.headers['x-correlation-id'] || `${this.service}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            req.correlationId = correlationId;
            res.setHeader('X-Correlation-Id', correlationId);

            res.on('finish', () => {
                this.info('request', {
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    durationMs: Date.now() - start,
                    correlationId,
                    userAgent: req.headers['user-agent'],
                    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
                });
            });

            next();
        };
    }

    /**
     * Express error logging middleware
     */
    errorLogger() {
        return (err, req, res, next) => {
            this.error('unhandled_error', {
                error: err.message,
                stack: err.stack,
                method: req.method,
                path: req.path,
                correlationId: req.correlationId,
            });
            next(err);
        };
    }
}

function createLogger(serviceName, options) {
    return new HeadyLogger(serviceName, options);
}

module.exports = { createLogger, HeadyLogger, LOG_LEVELS };
