/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Heady™ Graceful Shutdown — src/lifecycle/graceful-shutdown.js
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LIFO cleanup stack for deterministic shutdown. Components register cleanup
 * handlers in order; shutdown executes them in reverse (Last-In-First-Out).
 *
 * Handles: SIGTERM, SIGINT, uncaughtException, unhandledRejection
 *
 * © HeadySystems Inc. — Sacred Geometry :: Organic Systems :: Breathing Interfaces
 */

'use strict';

const { fib, phiInterval } = require('../../shared/phi-math');

class GracefulShutdown {
  /**
   * @param {object} [opts]
   * @param {number} [opts.timeoutMs] - Force-kill timeout (default fib(9)*1000=34000ms)
   * @param {Function} [opts.logger]
   * @param {boolean} [opts.registerSignals] - Auto-register SIGTERM/SIGINT (default true)
   */
  constructor(opts = {}) {
    this.timeoutMs = opts.timeoutMs || fib(9) * 1000; // 34 seconds
    this.logger = opts.logger || console;

    this._stack = [];        // LIFO cleanup handlers
    this._shutting = false;
    this._exitCode = 0;

    if (opts.registerSignals !== false) {
      this._registerSignals();
    }
  }

  /**
   * Register a cleanup handler. Executed in LIFO order during shutdown.
   * @param {string} name - Component name for logging
   * @param {Function} fn - async () → void
   * @param {object} [opts]
   * @param {number} [opts.timeoutMs] - Per-handler timeout (default 5000)
   * @param {boolean} [opts.critical] - If true, failure is logged as error
   */
  register(name, fn, opts = {}) {
    this._stack.push({
      name,
      fn,
      timeoutMs: opts.timeoutMs || 5000,
      critical: opts.critical || false,
    });
  }

  /**
   * Trigger graceful shutdown.
   * @param {string} [reason='manual']
   * @param {number} [exitCode=0]
   */
  async shutdown(reason = 'manual', exitCode = 0) {
    if (this._shutting) {
      this.logger.warn?.('[GracefulShutdown] Already shutting down');
      return;
    }
    this._shutting = true;
    this._exitCode = exitCode;

    this.logger.info?.(`[GracefulShutdown] Starting shutdown (reason: ${reason})`);

    const forceTimer = setTimeout(() => {
      this.logger.error?.('[GracefulShutdown] Force-kill timeout reached');
      process.exit(this._exitCode || 1);
    }, this.timeoutMs);
    if (forceTimer.unref) forceTimer.unref();

    // Execute handlers in LIFO order
    const handlers = [...this._stack].reverse();
    const results = [];

    for (const handler of handlers) {
      const start = Date.now();
      try {
        await Promise.race([
          handler.fn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), handler.timeoutMs)
          ),
        ]);
        const elapsed = Date.now() - start;
        results.push({ name: handler.name, status: 'OK', elapsed });
        this.logger.info?.(`[GracefulShutdown] ✓ ${handler.name} (${elapsed}ms)`);
      } catch (err) {
        const elapsed = Date.now() - start;
        results.push({ name: handler.name, status: 'FAILED', error: err.message, elapsed });
        if (handler.critical) {
          this.logger.error?.(`[GracefulShutdown] ✗ ${handler.name} (CRITICAL): ${err.message}`);
        } else {
          this.logger.warn?.(`[GracefulShutdown] ✗ ${handler.name}: ${err.message}`);
        }
      }
    }

    clearTimeout(forceTimer);

    const failed = results.filter(r => r.status === 'FAILED');
    this.logger.info?.(`[GracefulShutdown] Complete: ${results.length - failed.length}/${results.length} handlers succeeded`);

    if (typeof process !== 'undefined') {
      process.exit(this._exitCode);
    }
  }

  /**
   * Check if shutdown is in progress.
   */
  isShuttingDown() {
    return this._shutting;
  }

  _registerSignals() {
    const handle = (signal) => {
      this.logger.info?.(`[GracefulShutdown] Received ${signal}`);
      this.shutdown(signal, signal === 'SIGTERM' ? 0 : 1);
    };

    process.on('SIGTERM', () => handle('SIGTERM'));
    process.on('SIGINT', () => handle('SIGINT'));

    process.on('uncaughtException', (err) => {
      this.logger.fatal?.('[GracefulShutdown] Uncaught exception', err);
      this.shutdown('uncaughtException', 1);
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.fatal?.('[GracefulShutdown] Unhandled rejection', reason);
      this.shutdown('unhandledRejection', 1);
    });
  }

  /**
   * Get registered handlers (for debugging).
   */
  handlers() {
    return this._stack.map(h => ({
      name: h.name,
      critical: h.critical,
      timeoutMs: h.timeoutMs,
    }));
  }
}

module.exports = { GracefulShutdown };
