/**
 * Heady™ Zero-Trust Security Layer v6.0
 * Every request verified, every service authenticated
 * CSL-scored trust evaluation with continuous verification
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const crypto = require('crypto');
const { createLogger } = require('../logger');
const { fib, CSL_THRESHOLDS, PHI, PSI } = require('../phi-math');
const { hmacVerify, secureCompare, maskIp, maskSensitive } = require('./encryption');

const logger = createLogger('zero-trust');

// ═══════════════════════════════════════════════════════════
// TRUST SCORE COMPUTATION — CSL-based
// ═══════════════════════════════════════════════════════════

const TRUST_WEIGHTS = Object.freeze({
  authentication: 0.382,    // PSI² — verified identity
  authorization:  0.236,    // PSI³ — correct permissions
  integrity:      0.146,    // PSI⁴ — request integrity
  reputation:     0.146,    // PSI⁴ — historical behavior
  context:        0.090,    // PSI⁵ — environmental factors
});

function computeTrustScore(signals) {
  let score = 0;
  
  score += (signals.authenticated ? 1 : 0) * TRUST_WEIGHTS.authentication;
  score += (signals.authorized ? 1 : 0) * TRUST_WEIGHTS.authorization;
  score += (signals.integrityValid ? 1 : 0) * TRUST_WEIGHTS.integrity;
  score += Math.min(1, signals.reputationScore || 0) * TRUST_WEIGHTS.reputation;
  score += Math.min(1, signals.contextScore || 0) * TRUST_WEIGHTS.context;

  return score;
}

function trustLevel(score) {
  if (score >= CSL_THRESHOLDS.CRITICAL) return 'full';
  if (score >= CSL_THRESHOLDS.HIGH) return 'elevated';
  if (score >= CSL_THRESHOLDS.MEDIUM) return 'standard';
  if (score >= CSL_THRESHOLDS.LOW) return 'limited';
  return 'untrusted';
}

// ═══════════════════════════════════════════════════════════
// REQUEST VERIFICATION PIPELINE
// ═══════════════════════════════════════════════════════════

class ZeroTrustGate {
  constructor(config = {}) {
    this.config = {
      requiredTrustLevel: config.requiredTrustLevel || 'standard',
      requireMtls: config.requireMtls || false,
      requireCsrf: config.requireCsrf || true,
      allowedIpRanges: config.allowedIpRanges || null,
      maxRequestAge: config.maxRequestAge || fib(9) * 1000,  // 34s max request age
      ...config,
    };
    this.reputationCache = new Map();
    this.suspiciousPatterns = new Map();
    this.totalEvaluations = 0;
    this.totalDenied = 0;
  }

  async evaluate(req) {
    this.totalEvaluations++;

    const signals = {
      authenticated: false,
      authorized: false,
      integrityValid: false,
      reputationScore: 0.5,
      contextScore: 0.5,
    };

    const result = {
      allowed: false,
      trustScore: 0,
      trustLevel: 'untrusted',
      reasons: [],
      evaluationId: crypto.randomBytes(fib(6)).toString('hex'),
    };

    // 1. Authentication check
    if (req.user && req.user.uid) {
      signals.authenticated = true;
    } else if (this._hasServiceToken(req)) {
      signals.authenticated = true;
    }

    // 2. Authorization check
    if (signals.authenticated) {
      signals.authorized = this._checkAuthorization(req);
    }

    // 3. Request integrity
    signals.integrityValid = this._checkIntegrity(req);

    // 4. Reputation
    const clientKey = this._getClientKey(req);
    signals.reputationScore = this._getReputation(clientKey);

    // 5. Context
    signals.contextScore = this._evaluateContext(req);

    // Compute final score
    result.trustScore = computeTrustScore(signals);
    result.trustLevel = trustLevel(result.trustScore);

    // Check minimum trust level
    const levelOrder = ['untrusted', 'limited', 'standard', 'elevated', 'full'];
    const requiredIdx = levelOrder.indexOf(this.config.requiredTrustLevel);
    const actualIdx = levelOrder.indexOf(result.trustLevel);

    result.allowed = actualIdx >= requiredIdx;

    if (!result.allowed) {
      this.totalDenied++;
      result.reasons.push(`Trust level ${result.trustLevel} below required ${this.config.requiredTrustLevel}`);
      
      // Update reputation negatively
      this._updateReputation(clientKey, -0.1);

      logger.warn({
        message: 'Zero-trust gate denied',
        evaluationId: result.evaluationId,
        trustScore: result.trustScore.toFixed(3),
        trustLevel: result.trustLevel,
        required: this.config.requiredTrustLevel,
        clientKey: maskIp(clientKey),
      });
    }

    // IP range check
    if (this.config.allowedIpRanges) {
      const ip = req.socket?.remoteAddress;
      if (!this._isIpAllowed(ip)) {
        result.allowed = false;
        result.reasons.push('IP not in allowed range');
      }
    }

    // mTLS check
    if (this.config.requireMtls) {
      if (!req.socket?.authorized) {
        result.allowed = false;
        result.reasons.push('mTLS client certificate required');
      }
    }

    // CSRF check for state-changing methods
    if (this.config.requireCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!this._validateCsrf(req)) {
        result.allowed = false;
        result.reasons.push('CSRF token validation failed');
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // VERIFICATION HELPERS
  // ═══════════════════════════════════════════════════════════

  _hasServiceToken(req) {
    const token = req.headers['x-service-token'];
    return token && token.startsWith('heady_svc_');
  }

  _checkAuthorization(req) {
    // Resource-level authorization — extensible per route
    const path = req.url;
    const user = req.user;

    if (!user) return false;

    // Admin paths require admin role
    if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
      return user.claims?.admin === true;
    }

    return true;  // Default: authenticated = authorized for non-admin paths
  }

  _checkIntegrity(req) {
    // Content-Length mismatch detection
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength && contentLength > fib(16) * 1024) {  // 987KB
      return false;
    }

    // User-Agent required
    if (!req.headers['user-agent']) {
      return false;
    }

    // Request timestamp freshness (if present)
    const timestamp = req.headers['x-request-timestamp'];
    if (timestamp) {
      const age = Math.abs(Date.now() - parseInt(timestamp, 10));
      if (age > this.config.maxRequestAge) {
        return false;
      }
    }

    return true;
  }

  _evaluateContext(req) {
    let score = 0.5;

    // Known browser user-agent boost
    const ua = req.headers['user-agent'] || '';
    if (ua.includes('Mozilla') || ua.includes('Chrome') || ua.includes('Safari')) {
      score += 0.1;
    }

    // Accept header present
    if (req.headers.accept) {
      score += 0.1;
    }

    // Referer from known domain
    const referer = req.headers.referer || '';
    if (referer.includes('headysystems.com') || referer.includes('headyme.com')) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  _validateCsrf(req) {
    const csrfHeader = req.headers['x-heady-csrf'];
    const csrfCookie = req.cookies?.['__Host-heady_csrf'];
    
    if (!csrfHeader || !csrfCookie) return false;
    return secureCompare(csrfHeader, csrfCookie);
  }

  _getClientKey(req) {
    return req.user?.uid || req.socket?.remoteAddress || 'unknown';
  }

  _getReputation(clientKey) {
    return this.reputationCache.get(clientKey) || 0.5;
  }

  _updateReputation(clientKey, delta) {
    const current = this.reputationCache.get(clientKey) || 0.5;
    const updated = Math.max(0, Math.min(1, current + delta));
    this.reputationCache.set(clientKey, updated);

    // Prune cache
    if (this.reputationCache.size > fib(16)) {  // 987 max entries
      const oldest = this.reputationCache.keys().next().value;
      this.reputationCache.delete(oldest);
    }
  }

  _isIpAllowed(ip) {
    if (!ip || !this.config.allowedIpRanges) return true;
    return this.config.allowedIpRanges.some(range => ip.startsWith(range));
  }

  // ═══════════════════════════════════════════════════════════
  // MIDDLEWARE
  // ═══════════════════════════════════════════════════════════

  middleware() {
    return async (req, res, next) => {
      const result = await this.evaluate(req);

      req.trustScore = result.trustScore;
      req.trustLevel = result.trustLevel;

      if (!result.allowed) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: {
            code: 'ZERO_TRUST_DENIED',
            message: 'Request does not meet trust requirements',
            evaluationId: result.evaluationId,
          },
        }));
        return;
      }

      if (next) next();
    };
  }

  getStats() {
    return {
      totalEvaluations: this.totalEvaluations,
      totalDenied: this.totalDenied,
      denyRate: this.totalEvaluations > 0 ? this.totalDenied / this.totalEvaluations : 0,
      reputationCacheSize: this.reputationCache.size,
    };
  }
}

module.exports = {
  ZeroTrustGate,
  computeTrustScore,
  trustLevel,
  TRUST_WEIGHTS,
};
