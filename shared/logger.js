/**
 * Heady™ Shared Logger — Structured JSON via Pino
 * Domain-tagged, request-id correlated, φ-scaled sampling
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */

'use strict';

const pino = require('pino');

const PHI = 1.618033988749895;
const PSI = 1 / PHI; // ≈ 0.618

/**
 * Create a domain-tagged pino logger
 * @param {object} opts
 * @param {string} opts.service – Service name (e.g. 'analytics-service')
 * @param {string} [opts.domain] – Heady domain tag (e.g. 'data', 'inference')
 * @param {string} [opts.level] – Log level (default: 'info')
 * @returns {import('pino').Logger}
 */
function createLogger({ service, domain = 'platform', level } = {}) {
    const logLevel = level || process.env.LOG_LEVEL || 'info';

    return pino({
        name: service,
        level: logLevel,
        base: {
            service,
            domain,
            version: process.env.SERVICE_VERSION || '4.0.0',
            env: process.env.NODE_ENV || 'development',
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: {
            req: pino.stdSerializers.req,
            res: pino.stdSerializers.res,
            err: pino.stdSerializers.err,
        },
        ...(process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' && (() => {
            try { require.resolve('pino-pretty'); return true; } catch { return false; }
        })() ? {
            transport: {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
            },
        } : {}),
    });
}

/**
 * Express middleware to attach request-id and log requests
 * @param {import('pino').Logger} logger
 */
function requestLogger(logger) {
    return (req, res, next) => {
        const requestId = req.headers['x-request-id'] || `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        req.id = requestId;
        req.log = logger.child({ requestId });

        res.setHeader('X-Request-Id', requestId);

        const startTime = process.hrtime.bigint();
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
            req.log.info({
                msg: 'request completed',
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                durationMs: +durationMs.toFixed(2),
                contentLength: res.getHeader('content-length'),
            });
        });

        next();
    };
}

/**
 * φ-scaled retry delay calculator
 * @param {number} attempt – Current attempt number (0-indexed)
 * @param {number} baseMs – Base delay in ms (default: 1000)
 * @returns {number} Delay in ms
 */
function phiBackoffMs(attempt, baseMs = 1000) {
    return Math.round(baseMs * Math.pow(PHI, attempt));
}

/**
 * Shorthand: require('shared/logger')('service-name')
 * Returns a pino logger tagged with the given service name.
 * @param {string} service
 * @returns {import('pino').Logger}
 */
function loggerFactory(service) {
    return createLogger({ service });
}

// Default export: shorthand factory
// Named exports: createLogger, requestLogger, phiBackoffMs, PHI, PSI
module.exports = Object.assign(loggerFactory, { createLogger, requestLogger, phiBackoffMs, PHI, PSI });
