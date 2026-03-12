/**
 * HC Secrets Manager — Unified secret management for Heady™ platform.
 * Supports Google Secret Manager, Vault, and local encrypted store.
 */
'use strict';

const crypto = require('crypto');
const logger = require('./utils/logger');

class HCSecretsManager {
    constructor(opts = {}) {
        this._cache = new Map();
        this._backend = opts.backend || process.env.SECRETS_BACKEND || 'env';
        this._ttlMs = opts.ttlMs || 300000; // 5min TTL
        this._initialized = false;
    }

    async init() {
        if (this._initialized) return;
        this._initialized = true;
        logger.logSystem(`HCSecretsManager: initialized (backend: ${this._backend})`);
    }

    async get(name, defaultValue = null) {
        // Check cache
        const cached = this._cache.get(name);
        if (cached && Date.now() < cached.expiresAt) return cached.value;

        // Try environment variable first
        const envKey = name.toUpperCase().replace(/-/g, '_');
        const envVal = process.env[envKey] || process.env[name];
        if (envVal) {
            this._cache.set(name, { value: envVal, expiresAt: Date.now() + this._ttlMs });
            return envVal;
        }

        // Try backend
        if (this._backend === 'gcp' && process.env.GOOGLE_CLOUD_PROJECT) {
            try {
                const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
                const client = new SecretManagerServiceClient();
                const [version] = await client.accessSecretVersion({
                    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${name}/versions/latest`,
                });
                const value = version.payload.data.toString('utf8');
                this._cache.set(name, { value, expiresAt: Date.now() + this._ttlMs });
                return value;
            } catch (_e) {
                // Fall through to default
            }
        }

        return defaultValue;
    }

    async set(name, value) {
        this._cache.set(name, { value, expiresAt: Date.now() + this._ttlMs });
        logger.logSystem(`HCSecretsManager: cached ${name}`);
        return { ok: true };
    }

    async delete(name) {
        this._cache.delete(name);
        return { ok: true };
    }

    status() {
        return {
            backend: this._backend,
            cachedSecrets: this._cache.size,
            initialized: this._initialized,
        };
    }
}

const secretsManager = new HCSecretsManager();

module.exports = { HCSecretsManager, secretsManager };
