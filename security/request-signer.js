/**
 * RequestSigner — HMAC-SHA256 Request Signing & Verification
 * Signs outgoing requests and verifies incoming ones using rotating secrets,
 * timestamp validation, and replay protection via nonce cache.
 * All constants φ-derived. CSL gates replace boolean. ESM only.
 * Author: Eric Haywood
 */
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto';

// ── φ-Math Foundation ────────────────────────────────────────────
const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI2 = 0.3819660113;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function phiThreshold(level, spread = PSI2) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH: phiThreshold(3),
  MEDIUM: phiThreshold(2),
  LOW: phiThreshold(1),
  MINIMUM: phiThreshold(0),
};

function hashSHA256(data) {
  return createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
}

// ── Nonce Cache (replay protection) ──────────────────────────────
class NonceCache {
  constructor(maxSize = FIB[16], ttlMs = FIB[10] * 60 * 1000) { // 987 entries, 55min TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  add(nonce) {
    this.gc();
    if (this.cache.has(nonce)) return false; // replay detected
    this.cache.set(nonce, Date.now());
    return true;
  }

  has(nonce) {
    this.gc();
    return this.cache.has(nonce);
  }

  gc() {
    const now = Date.now();
    for (const [nonce, ts] of this.cache) {
      if (now - ts > this.ttlMs) this.cache.delete(nonce);
    }
    // Trim if still over max
    while (this.cache.size > this.maxSize) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }

  stats() {
    return { size: this.cache.size, maxSize: this.maxSize, ttlMs: this.ttlMs };
  }
}

// ── Key Rotation ─────────────────────────────────────────────────
class KeyRotator {
  constructor(config = {}) {
    this.keys = new Map();
    this.rotationIntervalMs = config.rotationIntervalMs ?? FIB[13] * 60 * 1000; // 233 minutes
    this.maxKeys = config.maxKeys ?? FIB[5]; // 5 concurrent keys
    this.currentKeyId = null;
  }

  addKey(keyId, secret) {
    this.keys.set(keyId, { secret, createdAt: Date.now(), usageCount: 0 });
    this.currentKeyId = keyId;

    // Prune old keys
    while (this.keys.size > this.maxKeys) {
      const oldest = [...this.keys.entries()]
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldest[0] !== this.currentKeyId) {
        this.keys.delete(oldest[0]);
      }
    }
  }

  getKey(keyId) {
    const key = this.keys.get(keyId ?? this.currentKeyId);
    if (key) key.usageCount++;
    return key;
  }

  getCurrentKeyId() {
    return this.currentKeyId;
  }

  shouldRotate() {
    if (!this.currentKeyId) return true;
    const current = this.keys.get(this.currentKeyId);
    if (!current) return true;
    return Date.now() - current.createdAt > this.rotationIntervalMs;
  }

  rotate() {
    const newKeyId = `key-${Date.now()}-${randomBytes(FIB[6]).toString('hex')}`;
    const newSecret = randomBytes(FIB[9]).toString('base64'); // 34 bytes
    this.addKey(newKeyId, newSecret);
    return { keyId: newKeyId };
  }

  stats() {
    return {
      currentKeyId: this.currentKeyId,
      totalKeys: this.keys.size,
      maxKeys: this.maxKeys,
      shouldRotate: this.shouldRotate(),
    };
  }
}

// ── Request Signer ───────────────────────────────────────────────
class RequestSigner {
  constructor(config = {}) {
    this.keyRotator = new KeyRotator(config);
    this.nonceCache = new NonceCache();
    this.algorithm = 'sha256';
    this.timestampToleranceMs = config.timestampToleranceMs ?? FIB[10] * 1000; // 55s
    this.headerPrefix = config.headerPrefix ?? 'X-Heady';
    this.auditLog = [];
    this.maxAuditEntries = FIB[16];

    // Initialize with default key if provided
    if (config.secret) {
      this.keyRotator.addKey('default', config.secret);
    }
  }

  _audit(action, detail) {
    const entry = { ts: Date.now(), action, detail, hash: hashSHA256({ action, detail, ts: Date.now() }) };
    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-FIB[14]);
    }
  }

  _buildSigningString(method, path, timestamp, nonce, bodyHash) {
    return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join('\n');
  }

  sign(request) {
    // Auto-rotate if needed
    if (this.keyRotator.shouldRotate()) {
      this.keyRotator.rotate();
    }

    const keyId = this.keyRotator.getCurrentKeyId();
    const keyData = this.keyRotator.getKey(keyId);
    if (!keyData) return { error: 'No signing key available' };

    const timestamp = Date.now().toString();
    const nonce = randomBytes(FIB[8]).toString('hex'); // 21 bytes
    const body = request.body ? JSON.stringify(request.body) : '';
    const bodyHash = hashSHA256(body);

    const signingString = this._buildSigningString(
      request.method ?? 'GET',
      request.path ?? '/',
      timestamp,
      nonce,
      bodyHash
    );

    const signature = createHmac(this.algorithm, keyData.secret)
      .update(signingString)
      .digest('hex');

    this._audit('sign', { method: request.method, path: request.path, keyId });

    return {
      headers: {
        [`${this.headerPrefix}-Signature`]: signature,
        [`${this.headerPrefix}-Timestamp`]: timestamp,
        [`${this.headerPrefix}-Nonce`]: nonce,
        [`${this.headerPrefix}-KeyId`]: keyId,
        [`${this.headerPrefix}-BodyHash`]: bodyHash,
      },
      signature,
      keyId,
    };
  }

  verify(request, headers) {
    const signature = headers[`${this.headerPrefix}-Signature`];
    const timestamp = headers[`${this.headerPrefix}-Timestamp`];
    const nonce = headers[`${this.headerPrefix}-Nonce`];
    const keyId = headers[`${this.headerPrefix}-KeyId`];
    const bodyHash = headers[`${this.headerPrefix}-BodyHash`];

    if (!signature || !timestamp || !nonce || !keyId) {
      this._audit('verify-fail', { reason: 'missing-headers' });
      return { valid: false, reason: 'missing-required-headers' };
    }

    // Timestamp check
    const ts = parseInt(timestamp, 10);
    if (Math.abs(Date.now() - ts) > this.timestampToleranceMs) {
      this._audit('verify-fail', { reason: 'timestamp-expired' });
      return { valid: false, reason: 'timestamp-outside-tolerance' };
    }

    // Replay check
    if (this.nonceCache.has(nonce)) {
      this._audit('verify-fail', { reason: 'replay-detected' });
      return { valid: false, reason: 'nonce-replay-detected' };
    }

    // Key lookup
    const keyData = this.keyRotator.getKey(keyId);
    if (!keyData) {
      this._audit('verify-fail', { reason: 'unknown-key' });
      return { valid: false, reason: 'unknown-key-id' };
    }

    // Body hash verification
    const body = request.body ? JSON.stringify(request.body) : '';
    const computedBodyHash = hashSHA256(body);
    if (bodyHash !== computedBodyHash) {
      this._audit('verify-fail', { reason: 'body-tampered' });
      return { valid: false, reason: 'body-hash-mismatch' };
    }

    // Signature verification
    const signingString = this._buildSigningString(
      request.method ?? 'GET',
      request.path ?? '/',
      timestamp,
      nonce,
      bodyHash
    );

    const expected = createHmac(this.algorithm, keyData.secret)
      .update(signingString)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expected, 'hex');

    if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
      this._audit('verify-fail', { reason: 'signature-mismatch' });
      return { valid: false, reason: 'signature-mismatch' };
    }

    // Mark nonce as used
    this.nonceCache.add(nonce);

    this._audit('verify-success', { keyId, method: request.method });
    return { valid: true, keyId };
  }

  health() {
    return {
      keys: this.keyRotator.stats(),
      nonceCache: this.nonceCache.stats(),
      auditLogSize: this.auditLog.length,
    };
  }
}

export default RequestSigner;
export { RequestSigner, NonceCache, KeyRotator };
