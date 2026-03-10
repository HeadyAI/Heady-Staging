const crypto = require('crypto');
const { fib, phiWindow } = require('./phi-math');

const secret = process.env.HEADY_INTERSERVICE_SECRET || 'heady-interservice-secret';
const maxSkewMs = phiWindow(fib(7)) * 1000;

function canonicalBody(rawBody) {
  return typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
}

function signRequest(rawBody, source, timestamp = String(Date.now())) {
  return crypto.createHmac('sha256', secret).update(`${source}:${timestamp}:${canonicalBody(rawBody)}`).digest('hex');
}

function verifySignedRequest(rawBody, signature, source, timestamp) {
  if (!signature || !source || !timestamp) {
    return { ok: false, reason: 'missing_signature_headers' };
  }
  const skew = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(skew) || skew > maxSkewMs) {
    return { ok: false, reason: 'timestamp_out_of_bounds', maxSkewMs };
  }
  const expected = signRequest(rawBody, source, timestamp);
  if (expected.length !== String(signature).length) {
    return { ok: false, reason: 'invalid_signature' };
  }
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))) {
    return { ok: false, reason: 'invalid_signature' };
  }
  return { ok: true };
}

function signedHeaders(rawBody, source, requestId) {
  const timestamp = String(Date.now());
  return {
    'content-type': 'application/json',
    'x-heady-source': source,
    'x-heady-timestamp': timestamp,
    'x-heady-signature': signRequest(rawBody, source, timestamp),
    'x-request-id': requestId
  };
}

module.exports = {
  canonicalBody,
  signRequest,
  signedHeaders,
  verifySignedRequest
};
