'use strict';

const { createHash, randomBytes } = require('node:crypto');

const SESSION_COOKIE_NAME = '__Host-heady_session';
const FINGERPRINT_COOKIE_NAME = '__heady_fp';
const REPLAY_WINDOW_MS = 300000; // 5 minutes

/**
 * Compute a client fingerprint from IP + User-Agent.
 *
 * @param {string} ip
 * @param {string} userAgent
 * @returns {string}
 */
function computeFingerprint(ip, userAgent) {
  return createHash('sha256')
    .update(`${ip}|${userAgent}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * In-memory token replay detection store.
 * Tracks recently used tokens to detect replay attacks.
 */
class ReplayDetector {
  /**
   * @param {number} [windowMs=300000] — replay detection window
   * @param {number} [maxEntries=10000]
   */
  constructor(windowMs = REPLAY_WINDOW_MS, maxEntries = 10000) {
    this._windowMs = windowMs;
    this._maxEntries = maxEntries;
    /** @type {Map<string, number>} tokenHash → timestamp */
    this._seen = new Map();
    this._cleanupTimer = setInterval(() => this._cleanup(), windowMs);
  }

  stop() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  /**
   * Check if a token+nonce combination has been seen recently.
   * If not seen, records it and returns false.
   * If seen, returns true (replay detected).
   *
   * @param {string} token
   * @param {string} nonce
   * @returns {boolean} true if replay detected
   */
  check(token, nonce) {
    const key = createHash('sha256')
      .update(`${token}|${nonce}`)
      .digest('hex')
      .slice(0, 32);

    if (this._seen.has(key)) {
      return true; // replay detected
    }

    this._seen.set(key, Date.now());

    // Evict if over capacity
    if (this._seen.size > this._maxEntries) {
      const oldest = this._seen.keys().next().value;
      this._seen.delete(oldest);
    }

    return false;
  }

  _cleanup() {
    const cutoff = Date.now() - this._windowMs;
    for (const [key, ts] of this._seen) {
      if (ts < cutoff) {
        this._seen.delete(key);
      }
    }
  }
}

/**
 * Create session security middleware.
 * Validates __Host- prefix cookies, IP+UA fingerprint binding, and replay detection.
 *
 * @param {object} [options]
 * @param {boolean} [options.enforceFingerprint=true]
 * @param {boolean} [options.enableReplayDetection=true]
 * @param {object} [options.log]
 * @returns {Function} Express middleware
 */
function createSessionSecurityMiddleware(options = {}) {
  const {
    enforceFingerprint = true,
    enableReplayDetection = true,
    log = null,
  } = options;

  const replayDetector = enableReplayDetection ? new ReplayDetector() : null;

  return function sessionSecurityMiddleware(req, res, next) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];

    // No session cookie — allow request through (auth middleware handles auth)
    if (!sessionCookie) {
      next();
      return;
    }

    // Fingerprint validation
    if (enforceFingerprint) {
      const storedFingerprint = req.cookies?.[FINGERPRINT_COOKIE_NAME];
      if (storedFingerprint) {
        const ip = req.ip || req.socket?.remoteAddress || '';
        const userAgent = req.get('user-agent') || '';
        const currentFingerprint = computeFingerprint(ip, userAgent);

        if (currentFingerprint !== storedFingerprint) {
          if (log) {
            log.warn('Session fingerprint mismatch', {
              ip,
              storedFp: storedFingerprint.slice(0, 4) + '...',
              currentFp: currentFingerprint.slice(0, 4) + '...',
            });
          }
          res.status(401).json({
            code: 'HEADY-SESSION-001',
            message: 'Session binding violation',
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
    }

    // Replay detection
    if (enableReplayDetection && replayDetector) {
      const requestNonce = req.headers['x-request-nonce'];
      if (requestNonce) {
        const isReplay = replayDetector.check(sessionCookie.slice(0, 32), requestNonce);
        if (isReplay) {
          if (log) {
            log.warn('Replay attack detected', { nonce: requestNonce });
          }
          res.status(401).json({
            code: 'HEADY-SESSION-002',
            message: 'Request replay detected',
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
    }

    next();
  };
}

module.exports = {
  createSessionSecurityMiddleware,
  computeFingerprint,
  ReplayDetector,
  SESSION_COOKIE_NAME,
  FINGERPRINT_COOKIE_NAME,
  REPLAY_WINDOW_MS,
};
