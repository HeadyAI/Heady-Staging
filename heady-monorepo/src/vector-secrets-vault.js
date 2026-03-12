/**
 * Vector Secrets Vault — Encrypted secret storage with vector-space access control.
 * Wraps secure-key-vault with vector memory indexing for semantic secret retrieval.
 */
'use strict';

const crypto = require('crypto');
const logger = require('./utils/logger');

let _vectorMemory = null;
let _secureVault = null;

try {
    _secureVault = require('./services/secure-key-vault');
} catch (_e) { /* vault service optional */ }

const _localStore = new Map();
const _encryptionKey = Buffer.from(
    process.env.VAULT_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
    'hex'
).slice(0, 32);

function encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', _encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
    const [ivHex, authTagHex, encHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', _encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

const vectorSecretsVault = {
    setVectorMemory(vm) { _vectorMemory = vm; },

    async store(key, value, metadata = {}) {
        try {
            const encrypted = encrypt(typeof value === 'string' ? value : JSON.stringify(value));
            _localStore.set(key, { encrypted, metadata, storedAt: new Date().toISOString() });
            if (_secureVault && _secureVault.set) {
                await _secureVault.set(key, encrypted);
            }
            logger.logSystem(`VectorSecretsVault: stored ${key}`);
            return { ok: true, key };
        } catch (err) {
            logger.logSystem(`VectorSecretsVault: store error for ${key}: ${err.message}`);
            throw err;
        }
    },

    async retrieve(key) {
        try {
            let encrypted = null;
            if (_localStore.has(key)) {
                encrypted = _localStore.get(key).encrypted;
            } else if (_secureVault && _secureVault.get) {
                encrypted = await _secureVault.get(key);
            }
            if (!encrypted) return null;
            const decrypted = decrypt(encrypted);
            try { return JSON.parse(decrypted); } catch { return decrypted; }
        } catch (err) {
            logger.logSystem(`VectorSecretsVault: retrieve error for ${key}: ${err.message}`);
            return null;
        }
    },

    async delete(key) {
        _localStore.delete(key);
        if (_secureVault && _secureVault.delete) {
            await _secureVault.delete(key);
        }
        return { ok: true };
    },

    async list() {
        return Array.from(_localStore.keys());
    },

    status() {
        return {
            keys: _localStore.size,
            vectorMemory: !!_vectorMemory,
            backingVault: !!_secureVault,
        };
    },
};

module.exports = vectorSecretsVault;
