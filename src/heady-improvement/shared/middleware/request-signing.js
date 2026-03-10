'use strict';

const { createHmac, timingSafeEqual } = require('node:crypto');

// FIB[8] = 21 seconds maximum clock skew allowed
const MAX_CLOCK_SKEW_SEC = 21;

const SIGNATURE_HEADER = 'x-service-signature';
const TIMESTAMP_HEADER = 'x-service-timestamp';
const SERVICE_HEADER = 'x-service-name';

/**
 * Sign a request payload for inter-service communication.
 *
 * @param {object} params
 * @param {string} params.secret — HMAC shared secret
 * @param {string} params.serviceName — sending service name
 * @param {string} params.method — HTTP method
 * @param {string} params.path — request path
 * @param {string|object} [params.body] — request body
 * @param {number} [params.timestamp] — Unix epoch seconds (default: now)
 * @returns {{ signature: string, timestamp: number, headers: object }}
 */
function signRequest({ secret, serviceName, method, path, body, timestamp }) {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const bodyStr = typeof body === 'object' ? JSON.stringify(body) : (body || '');
  const payload = `${ts}.${method.toUpperCase()}.${path}.${bodyStr}`;

  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return {
    signature,
    timestamp: ts,
    headers: {
      [SIGNATURE_HEADER]: signature,
      [TIMESTAMP_HEADER]: String(ts),
      [SERVICE_HEADER]: serviceName,
    },
  };
}

/**
 * Verify a signed inter-service request.
 *
 * @param {object} params
 * @param {string} params.secret — HMAC shared secret
 * @param {string} params.signature — received signature
 * @param {number} params.timestamp — received timestamp
 * @param {string} params.method — HTTP method
 * @param {string} params.path — request path
 * @param {string} [params.body] — request body string
 * @returns {{ valid: boolean, reason?: string }}
 */
function verifyRequest({ secret, signature, timestamp, method, path, body }) {
  const now = Math.floor(Date.now() / 1000);
  const skew = Math.abs(now - timestamp);

  if (skew > MAX_CLOCK_SKEW_SEC) {
    return {
      valid: false,
      reason: `Clock skew ${skew}s exceeds maximum ${MAX_CLOCK_SKEW_SEC}s`,
    };
  }

  const bodyStr = body || '';
  const payload = `${timestamp}.${method.toUpperCase()}.${path}.${bodyStr}`;
  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expBuf.length) {
    return { valid: false, reason: 'Invalid signature length' };
  }

  if (!timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'Signature mismatch' };
  }

  return { valid: true };
}

/**
 * Create Express middleware that verifies inter-service request signatures.
 *
 * @param {object} options
 * @param {string} options.secret — HMAC shared secret
 * @param {string[]} [options.excludePaths] — paths to skip verification
 * @param {object} [options.log]
 * @returns {Function} Express middleware
 */
function createSignatureVerificationMiddleware(options) {
  const { secret, excludePaths = ['/health', '/healthz'], log = null } = options;

  return function signatureMiddleware(req, res, next) {
    if (excludePaths.includes(req.path)) {
      next();
      return;
    }

    const signature = req.headers[SIGNATURE_HEADER];
    const timestampStr = req.headers[TIMESTAMP_HEADER];
    const serviceName = req.headers[SERVICE_HEADER];

    if (!signature || !timestampStr) {
      next();
      return;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      res.status(400).json({
        code: 'HEADY-SIG-001',
        message: 'Invalid timestamp in signature header',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let bodyStr = '';
    if (req.body) {
      bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const result = verifyRequest({
      secret,
      signature,
      timestamp,
      method: req.method,
      path: req.path,
      body: bodyStr,
    });

    if (!result.valid) {
      if (log) {
        log.warn('Request signature verification failed', {
          reason: result.reason,
          service: serviceName,
          path: req.path,
        });
      }
      res.status(403).json({
        code: 'HEADY-SIG-002',
        message: 'Invalid request signature',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.verifiedService = serviceName;
    next();
  };
}

module.exports = {
  signRequest,
  verifyRequest,
  createSignatureVerificationMiddleware,
  MAX_CLOCK_SKEW_SEC,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  SERVICE_HEADER,
};
