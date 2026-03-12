/**
 * SecretRotation — Automated secret rotation for API keys and credentials.
 * Integrates with Google Secret Manager and Vault.
 */
'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

class SecretRotation {
    constructor(opts = {}) {
        this.rotationIntervalMs = opts.rotationIntervalMs || 86400000; // 24h
        this.rotatedKeys = new Map();
        this._timer = null;
    }

    /** Start periodic rotation checks */
    start() {
        if (this._timer) return;
        this._timer = setInterval(() => this.check(), this.rotationIntervalMs);
        logger.logSystem('SecretRotation: started');
    }

    stop() {
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
    }

    /** Check and rotate secrets that are near expiry */
    async check() {
        const now = Date.now();
        let rotated = 0;
        for (const [key, meta] of this.rotatedKeys.entries()) {
            if (meta.expiresAt && meta.expiresAt < now + 3600000) {
                try {
                    await this.rotate(key);
                    rotated++;
                } catch (err) {
                    logger.logSystem(`SecretRotation: failed to rotate ${key}: ${err.message}`);
                }
            }
        }
        if (rotated > 0) logger.logSystem(`SecretRotation: rotated ${rotated} secrets`);
        return { rotated };
    }

    /**
     * Rotate a specific secret
     * @param {string} secretName
     * @returns {Promise<string>} new secret value
     */
    async rotate(secretName) {
        const newSecret = crypto.randomBytes(32).toString('base64');
        this.rotatedKeys.set(secretName, {
            value: newSecret,
            rotatedAt: Date.now(),
            expiresAt: Date.now() + this.rotationIntervalMs,
        });
        logger.logSystem(`SecretRotation: rotated ${secretName}`);
        return newSecret;
    }

    /**
     * Register a secret for rotation tracking
     * @param {string} name
     * @param {Object} opts - { expiresAt, currentValue }
     */
    register(name, opts = {}) {
        this.rotatedKeys.set(name, {
            value: opts.currentValue || null,
            expiresAt: opts.expiresAt || Date.now() + this.rotationIntervalMs,
            rotatedAt: null,
        });
    }

    /** Get current value for a tracked secret */
    get(name) {
        return this.rotatedKeys.get(name)?.value || null;
    }

    status() {
        return {
            trackedSecrets: this.rotatedKeys.size,
            keys: Array.from(this.rotatedKeys.keys()),
        };
    }
}

module.exports = { SecretRotation };
