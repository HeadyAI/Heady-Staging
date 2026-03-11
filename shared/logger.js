'use strict';

/**
 * @fileoverview Heady™ Shared Logger Factory
 * @description Pino-based structured logger with service name + domain tagging.
 *              All services should use this factory for consistent log format.
 * @version 1.0.0
 */

const pino = require('pino');

const HEADY_DOMAINS = [
    'headyme.com',
    'headysystems.com',
    'headyapi.com',
    'headyconnection.org',
    'headybuddy.org',
    'headymcp.com',
    'headyio.com',
    'headybot.com',
    'heady-ai.com',
    'headyos.com',
    'headysense.com',
    'headyex.com',
    'headyfinance.com',
    'headyconnection.com',
    'perfecttrader.com',
    'headyai.me',
];

/**
 * Create a structured pino logger for a Heady service.
 * @param {object} opts
 * @param {string} opts.service  - Service name (e.g. 'analytics-service')
 * @param {string} [opts.domain] - Primary domain (e.g. 'headyapi.com')
 * @param {string} [opts.level]  - Log level (default: env LOG_LEVEL or 'info')
 * @returns {import('pino').Logger}
 */
function createLogger(opts = {}) {
    const { service = 'heady', domain, level } = opts;
    return pino({
        level: level || process.env.LOG_LEVEL || 'info',
        name: service,
        base: {
            service,
            domain: domain || HEADY_DOMAINS[0],
            pid: process.pid,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    });
}

module.exports = { createLogger, HEADY_DOMAINS };
