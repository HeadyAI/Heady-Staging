'use strict';
/**
 * Middleware Module — Barrel Export
 * Provides bulkhead, compression, graceful-shutdown, heady-auto-context, and rate-limiter.
 */
module.exports = {
    bulkhead: require('./bulkhead'),
    compression: require('./compression'),
    gracefulShutdown: require('./graceful-shutdown'),
    headyAutoContext: require('./heady-auto-context'),
    rateLimiter: require('./rate-limiter'),
};
