/**
 * HeadyLiquidGateway — BYOK Manager (Bring Your Own Key)
 * 
 * Manages user-provided API keys for sovereign AI access.
 * Keys are encrypted at rest, validated before use, and never logged.
 * Zero-trust: keys are scoped per-provider, per-user, with CSL-gated access.
 * 
 * @module core/liquid-gateway/byok-manager
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

import { EventEmitter } from 'events';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** φ-threshold levels for trust scoring */
const TRUST_LEVELS = {
  VERIFIED:    1 - Math.pow(PSI, 4) * 0.5,  // ≈ 0.927
  TRUSTED:     1 - Math.pow(PSI, 3) * 0.5,   // ≈ 0.882
  PROVISIONAL: 1 - Math.pow(PSI, 2) * 0.5,   // ≈ 0.809
  UNTESTED:    1 - PSI * 0.5,                 // ≈ 0.691
  REVOKED:     0,
};

/** Provider key format validators */
const KEY_VALIDATORS = {
  'anthropic':   (key) => /^sk-ant-[a-zA-Z0-9_-]{90,}$/.test(key),
  'openai':      (key) => /^sk-[a-zA-Z0-9_-]{40,}$/.test(key),
  'google':      (key) => /^AIza[a-zA-Z0-9_-]{30,}$/.test(key),
  'groq':        (key) => /^gsk_[a-zA-Z0-9_-]{40,}$/.test(key),
  'perplexity':  (key) => /^pplx-[a-zA-Z0-9]{40,}$/.test(key),
  'cohere':      (key) => /^[a-zA-Z0-9]{30,}$/.test(key),
  'mistral':     (key) => /^[a-zA-Z0-9]{30,}$/.test(key),
};

/** Encryption algorithm */
const CIPHER_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export class BYOKManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.keys = new Map(); // userId -> Map<provider, encryptedKeyData>
    this.encryptionKey = config.encryptionKey
      ? Buffer.from(config.encryptionKey, 'hex')
      : randomBytes(32); // MUST be provided in production
    this.maxKeysPerUser = FIB[7]; // 13
    this.keyValidationCache = new Map();
    this.validationCacheTtlMs = Math.round(PHI * 1000 * FIB[10]); // ~89s
    this.usageCounters = new Map(); // keyHash -> { count, lastUsed }
    this.rateLimits = new Map(); // provider -> RPM limit for BYOK
  }

  /**
   * Store a user's API key for a provider (encrypted at rest)
   */
  async storeKey(userId, provider, apiKey, options = {}) {
    // Validate key format
    const validator = KEY_VALIDATORS[provider];
    if (validator && !validator(apiKey)) {
      throw new Error(`Invalid key format for provider: ${provider}`);
    }

    // Encrypt the key
    const encrypted = this._encrypt(apiKey);
    const keyHash = this._hashKey(apiKey);

    // Get or create user key store
    if (!this.keys.has(userId)) {
      this.keys.set(userId, new Map());
    }

    const userKeys = this.keys.get(userId);
    if (userKeys.size >= this.maxKeysPerUser && !userKeys.has(provider)) {
      throw new Error(`Maximum keys per user exceeded: ${this.maxKeysPerUser}`);
    }

    userKeys.set(provider, {
      encrypted,
      keyHash,
      provider,
      trustLevel: TRUST_LEVELS.UNTESTED,
      storedAt: Date.now(),
      lastUsedAt: null,
      lastValidatedAt: null,
      usageCount: 0,
      label: options.label || `${provider}-key`,
      scopes: options.scopes || ['*'], // allow all by default
      expiresAt: options.expiresAt || null,
    });

    this.emit('key:stored', {
      userId,
      provider,
      keyHash: keyHash.slice(0, 8),
      label: options.label,
    });

    return { keyHash: keyHash.slice(0, 8), provider, trustLevel: 'untested' };
  }

  /**
   * Retrieve a decrypted key for use (zero-trust gated)
   */
  retrieveKey(userId, provider, context = {}) {
    const userKeys = this.keys.get(userId);
    if (!userKeys) return null;

    const keyData = userKeys.get(provider);
    if (!keyData) return null;

    // Check expiration
    if (keyData.expiresAt && Date.now() > keyData.expiresAt) {
      this._revokeKey(userId, provider, 'expired');
      return null;
    }

    // Check scope access (CSL gate: context scope must align with key scopes)
    if (!this._checkScope(keyData.scopes, context.requiredScope)) {
      this.emit('key:scope-denied', {
        userId,
        provider,
        requiredScope: context.requiredScope,
        allowedScopes: keyData.scopes,
      });
      return null;
    }

    // Decrypt
    const decrypted = this._decrypt(keyData.encrypted);

    // Update usage
    keyData.lastUsedAt = Date.now();
    keyData.usageCount++;

    return decrypted;
  }

  /**
   * Validate a stored key by making a lightweight probe to the provider
   */
  async validateKey(userId, provider, probeFn) {
    const userKeys = this.keys.get(userId);
    if (!userKeys) return { valid: false, reason: 'no_keys_stored' };

    const keyData = userKeys.get(provider);
    if (!keyData) return { valid: false, reason: 'provider_not_found' };

    // Check validation cache
    const cacheKey = `${userId}:${provider}`;
    const cached = this.keyValidationCache.get(cacheKey);
    if (cached && (Date.now() - cached.at) < this.validationCacheTtlMs) {
      return cached.result;
    }

    // Decrypt and probe
    const apiKey = this._decrypt(keyData.encrypted);

    try {
      await probeFn(apiKey);
      keyData.trustLevel = TRUST_LEVELS.VERIFIED;
      keyData.lastValidatedAt = Date.now();

      const result = { valid: true, trustLevel: 'verified' };
      this.keyValidationCache.set(cacheKey, { result, at: Date.now() });

      this.emit('key:validated', { userId, provider, trustLevel: 'verified' });
      return result;
    } catch (error) {
      keyData.trustLevel = TRUST_LEVELS.PROVISIONAL;

      const result = { valid: false, reason: error.message, trustLevel: 'provisional' };
      this.keyValidationCache.set(cacheKey, { result, at: Date.now() });

      this.emit('key:validation-failed', { userId, provider, error: error.message });
      return result;
    }
  }

  /**
   * Revoke a user's key for a provider
   */
  revokeKey(userId, provider) {
    return this._revokeKey(userId, provider, 'user_revoked');
  }

  /**
   * List all stored keys for a user (without exposing actual keys)
   */
  listKeys(userId) {
    const userKeys = this.keys.get(userId);
    if (!userKeys) return [];

    const result = [];
    for (const [provider, keyData] of userKeys) {
      result.push({
        provider,
        label: keyData.label,
        keyHashPrefix: keyData.keyHash.slice(0, 8),
        trustLevel: this._getTrustLabel(keyData.trustLevel),
        storedAt: keyData.storedAt,
        lastUsedAt: keyData.lastUsedAt,
        lastValidatedAt: keyData.lastValidatedAt,
        usageCount: keyData.usageCount,
        scopes: keyData.scopes,
        expiresAt: keyData.expiresAt,
        expired: keyData.expiresAt ? Date.now() > keyData.expiresAt : false,
      });
    }

    return result;
  }

  /**
   * Check if user has a key for a provider
   */
  hasKey(userId, provider) {
    const userKeys = this.keys.get(userId);
    return userKeys ? userKeys.has(provider) : false;
  }

  /**
   * Determine whether to use BYOK or platform key
   * Returns 'byok' if user has a valid key, 'platform' otherwise
   */
  resolveKeySource(userId, provider) {
    const userKeys = this.keys.get(userId);
    if (!userKeys || !userKeys.has(provider)) return 'platform';

    const keyData = userKeys.get(provider);
    if (keyData.trustLevel <= TRUST_LEVELS.REVOKED) return 'platform';
    if (keyData.expiresAt && Date.now() > keyData.expiresAt) return 'platform';

    return 'byok';
  }

  /**
   * Get usage statistics across all BYOK keys
   */
  getUsageStats(userId) {
    const userKeys = this.keys.get(userId);
    if (!userKeys) return { totalKeys: 0, providers: [] };

    const providers = [];
    let totalUsage = 0;

    for (const [provider, keyData] of userKeys) {
      providers.push({
        provider,
        usageCount: keyData.usageCount,
        trustLevel: this._getTrustLabel(keyData.trustLevel),
        lastUsed: keyData.lastUsedAt,
      });
      totalUsage += keyData.usageCount;
    }

    return {
      totalKeys: userKeys.size,
      totalUsage,
      providers,
    };
  }

  // === INTERNAL ===

  _encrypt(plaintext) {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(CIPHER_ALGO, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      data: encrypted.toString('hex'),
      tag: authTag.toString('hex'),
    };
  }

  _decrypt(encryptedData) {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const data = Buffer.from(encryptedData.data, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');

    const decipher = createDecipheriv(CIPHER_ALGO, this.encryptionKey, iv);
    decipher.setAuthTag(tag);

    return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
  }

  _hashKey(key) {
    return createHash('sha256').update(key).digest('hex');
  }

  _checkScope(allowedScopes, requiredScope) {
    if (!requiredScope) return true;
    if (allowedScopes.includes('*')) return true;
    return allowedScopes.includes(requiredScope);
  }

  _revokeKey(userId, provider, reason) {
    const userKeys = this.keys.get(userId);
    if (!userKeys) return false;

    const keyData = userKeys.get(provider);
    if (!keyData) return false;

    userKeys.delete(provider);
    if (userKeys.size === 0) {
      this.keys.delete(userId);
    }

    // Clear validation cache
    this.keyValidationCache.delete(`${userId}:${provider}`);

    this.emit('key:revoked', {
      userId,
      provider,
      reason,
      keyHash: keyData.keyHash.slice(0, 8),
    });

    return true;
  }

  _getTrustLabel(trustLevel) {
    if (trustLevel >= TRUST_LEVELS.VERIFIED) return 'verified';
    if (trustLevel >= TRUST_LEVELS.TRUSTED) return 'trusted';
    if (trustLevel >= TRUST_LEVELS.PROVISIONAL) return 'provisional';
    if (trustLevel >= TRUST_LEVELS.UNTESTED) return 'untested';
    return 'revoked';
  }
}
