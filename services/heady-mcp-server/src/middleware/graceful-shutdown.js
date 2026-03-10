/**
 * Heady™ Graceful Shutdown
 * Handles SIGTERM/SIGINT with φ-scaled timeout for draining requests
 */
'use strict';

const { PHI } = require('../config/phi-constants');
const logger = require('../../../../shared/logger')('graceful-shutdown');

/**
 * Setup graceful shutdown handler
 * @param {http.Server} server — Express/Node server instance
 * @param {object} [opts] — { timeout: ms, onShutdown: fn, sseClients: Map }
 */
function setupGracefulShutdown(server, opts = {}) {
  // φ-scaled timeout: PHI * 13 ≈ 21 seconds
  const timeoutMs = opts.timeout || Math.round(PHI * 13 * 1000);
  const onShutdown = opts.onShutdown || (() => { });
  const sseClients = opts.sseClients || new Map();

  // Track in-flight requests
  const inFlightRequests = new Set();

  // Intercept all requests to track them
  if (server.app) {
    server.app.use((req, res, next) => {
      inFlightRequests.add(req);

      res.on('finish', () => {
        inFlightRequests.delete(req);
      });

      res.on('close', () => {
        inFlightRequests.delete(req);
      });

      next();
    });
  }

  /**
   * Handle shutdown signal
   */
  async function handleShutdown(signal) {
    logger.info({ signal, msg: 'Received shutdown signal' });

    // Stop accepting new connections
    server.close(() => {
      logger.info({ msg: 'Server closed, no more connections accepted' });
    });

    // Close all SSE connections
    logger.info({ sseClients: sseClients.size, msg: 'Closing SSE connections' });
    for (const [clientId, res] of sseClients.entries()) {
      try {
        res.end();
      } catch (err) {
        logger.error({ err, clientId, msg: 'Error closing SSE client' });
      }
    }
    sseClients.clear();

    // Wait for in-flight requests with timeout
    const startTime = Date.now();
    while (inFlightRequests.size > 0) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        logger.warn({
          timeoutMs,
          inFlight: inFlightRequests.size,
          msg: 'Timeout reached, forcing exit',
        });
        break;
      }

      logger.info({ inFlight: inFlightRequests.size, elapsed, timeoutMs, msg: 'Waiting for in-flight requests' });
      await new Promise(r => setTimeout(r, 500));
    }

    // Call shutdown hook
    await onShutdown();

    logger.info({ msg: 'Graceful shutdown complete. Exiting.' });
    process.exit(0);
  }

  // Register signal handlers
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  return {
    getInFlightCount: () => inFlightRequests.size,
  };
}

module.exports = { setupGracefulShutdown };
