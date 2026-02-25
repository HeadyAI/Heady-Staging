/**
 * Heady Logger — Structured JSON logging for production observability
 * Outputs structured JSON to stdout, compatible with CloudWatch, Datadog, Grafana Loki.
 * Supports log levels, request correlation, and child loggers.
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? LOG_LEVELS.info;

class Logger {
    constructor(context = {}) {
        this.context = context;
    }

    _log(level, message, data = {}) {
        if (LOG_LEVELS[level] > CURRENT_LEVEL) return;

        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: this.context.service || 'heady',
            ...this.context,
            ...data,
        };

        // Remove undefined values
        for (const key of Object.keys(entry)) {
            if (entry[key] === undefined) delete entry[key];
        }

        const line = JSON.stringify(entry);
        if (level === 'error') {
            process.stderr.write(line + '\n');
        } else {
            process.stdout.write(line + '\n');
        }
    }

    error(message, data) { this._log('error', message, data); }
    warn(message, data) { this._log('warn', message, data); }
    info(message, data) { this._log('info', message, data); }
    debug(message, data) { this._log('debug', message, data); }
    trace(message, data) { this._log('trace', message, data); }

    /**
     * Create a child logger with inherited + additional context
     * @param {Object} childContext
     * @returns {Logger}
     */
    child(childContext) {
        return new Logger({ ...this.context, ...childContext });
    }
}

// Pre-configured loggers for major services
const loggers = {
    manager: new Logger({ service: 'heady-manager' }),
    brain: new Logger({ service: 'hc-brain' }),
    coder: new Logger({ service: 'heady-coder' }),
    resilience: new Logger({ service: 'resilience' }),
    auth: new Logger({ service: 'auth' }),
    edge: new Logger({ service: 'edge' }),
    hcfp: new Logger({ service: 'hcfp' }),
};

function getLogger(service) {
    if (!loggers[service]) {
        loggers[service] = new Logger({ service });
    }
    return loggers[service];
}

module.exports = { Logger, getLogger, loggers, LOG_LEVELS };
