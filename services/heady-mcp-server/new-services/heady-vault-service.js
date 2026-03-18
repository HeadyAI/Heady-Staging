'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };

const SERVICE_NAME = 'heady-vault';
const PORT = 3412;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/** Rotation intervals per tier in ms: FIB[index] * 24h */
const ROTATION_INTERVALS = {
  standard: FIB[8] * 24 * 3600 * 1000,   // 21 days
  sensitive: FIB[7] * 24 * 3600 * 1000,   // 13 days
  critical: FIB[6] * 24 * 3600 * 1000     // 8 days
};

/**
 * Structured JSON logger with correlation ID support.
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [meta={}] - Additional metadata
 */
function log(level, msg, meta = {}) {
  const entry = { timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failures = 0;
    this.threshold = opts.threshold || FIB[8];
    this.resetTimeout = opts.resetTimeout || FIB[10] * 1000;
    this.lastFailure = 0;
  }
  async execute(fn) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailure;
      const backoff = this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]));
      if (elapsed < backoff) throw new Error(`Circuit ${this.name} OPEN`);
      this.state = 'HALF_OPEN';
    }
    try {
      const result = await fn();
      this.failures = 0; this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'OPEN';
      throw err;
    }
  }
}

const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) {
  log('info', `${signal} received, graceful shutdown`);
  while (shutdownHandlers.length) await shutdownHandlers.pop()();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Encrypt plaintext using AES-256-GCM with the given key.
 * @param {string} plaintext - Data to encrypt
 * @param {Buffer} key - 32-byte encryption key
 * @returns {{ iv: string, ciphertext: string, authTag: string }} Encrypted envelope
 */
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), ciphertext: encrypted.toString('hex'), authTag: cipher.getAuthTag().toString('hex') };
}

/**
 * Decrypt ciphertext using AES-256-GCM with the given key.
 * @param {{ iv: string, ciphertext: string, authTag: string }} envelope - Encrypted data
 * @param {Buffer} key - 32-byte encryption key
 * @returns {string} Decrypted plaintext
 */
function decrypt(envelope, key) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * VaultBee - Centralized secret management bee with envelope encryption.
 * Master key encrypts data encryption keys (DEKs); DEKs encrypt secrets.
 * Supports phi-scheduled rotation based on sensitivity tier.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class VaultBee {
  constructor() {
    this.masterKey = crypto.randomBytes(KEY_LENGTH);
    this.secrets = new Map();
    this.auditLog = [];
    this.circuit = new CircuitBreaker('vault-crypto');
    this.startTime = Date.now();
    this.coherence = CSL.CRITICAL;
    this.rotationTimers = new Map();
  }

  spawn() { log('info', 'VaultBee spawned — master key generated', { phase: 'spawn' }); }
  execute() { log('info', 'VaultBee executing — vault open', { phase: 'execute' }); }
  report() {
    return { service: SERVICE_NAME, secretCount: this.secrets.size, auditEntries: this.auditLog.length, uptime: Date.now() - this.startTime };
  }
  retire() {
    for (const timer of this.rotationTimers.values()) clearTimeout(timer);
    this.rotationTimers.clear();
    log('info', 'VaultBee retiring — vault sealed', { phase: 'retire' });
  }

  _audit(action, key, correlationId) {
    const entry = { timestamp: new Date().toISOString(), action, key, correlationId: correlationId || 'system' };
    this.auditLog.push(entry);
    log('info', `Audit: ${action} on ${key}`, { action, key, correlationId });
  }

  _generateDEK() { return crypto.randomBytes(KEY_LENGTH); }

  _encryptDEK(dek) { return encrypt(dek.toString('hex'), this.masterKey); }

  _decryptDEK(encryptedDek) {
    const hexKey = decrypt(encryptedDek, this.masterKey);
    return Buffer.from(hexKey, 'hex');
  }

  _scheduleRotation(key) {
    const secret = this.secrets.get(key);
    if (!secret) return;
    if (this.rotationTimers.has(key)) clearTimeout(this.rotationTimers.get(key));
    const interval = ROTATION_INTERVALS[secret.tier] || ROTATION_INTERVALS.standard;
    const timer = setTimeout(() => { this.rotateSecret(key); }, interval);
    timer.unref();
    this.rotationTimers.set(key, timer);
  }

  storeSecret(key, value, tier, correlationId) {
    if (!['standard', 'sensitive', 'critical'].includes(tier)) tier = 'standard';
    const dek = this._generateDEK();
    const encryptedDek = this._encryptDEK(dek);
    const encryptedValue = encrypt(value, dek);
    this.secrets.set(key, { encryptedDek, encryptedValue, tier, createdAt: Date.now(), rotatedAt: Date.now(), version: 1 });
    this._audit('STORE', key, correlationId);
    this._scheduleRotation(key);
    return { key, tier, version: 1, rotationInterval: ROTATION_INTERVALS[tier] };
  }

  retrieveSecret(key, correlationId) {
    const secret = this.secrets.get(key);
    if (!secret) throw new Error(`Secret ${key} not found`);
    const dek = this._decryptDEK(secret.encryptedDek);
    const value = decrypt(secret.encryptedValue, dek);
    this._audit('READ', key, correlationId);
    return { key, value, tier: secret.tier, version: secret.version, createdAt: new Date(secret.createdAt).toISOString() };
  }

  rotateSecret(key, correlationId) {
    const secret = this.secrets.get(key);
    if (!secret) throw new Error(`Secret ${key} not found`);
    const oldDek = this._decryptDEK(secret.encryptedDek);
    const plainValue = decrypt(secret.encryptedValue, oldDek);
    const newDek = this._generateDEK();
    secret.encryptedDek = this._encryptDEK(newDek);
    secret.encryptedValue = encrypt(plainValue, newDek);
    secret.rotatedAt = Date.now();
    secret.version++;
    this._audit('ROTATE', key, correlationId || 'scheduler');
    this._scheduleRotation(key);
    return { key, version: secret.version, rotatedAt: new Date(secret.rotatedAt).toISOString() };
  }

  getAuditLog() {
    return this.auditLog.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

const bee = new VaultBee();
bee.spawn();
bee.execute();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: process.uptime(), coherence: bee.coherence, timestamp: new Date().toISOString() });
});

app.post('/secrets', async (req, res) => {
  try {
    const { key, value, tier } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'key and value required' });
    const result = await bee.circuit.execute(() => bee.storeSecret(key, value, tier || 'standard', req.correlationId));
    res.status(201).json(result);
  } catch (err) {
    res.status(err.message.includes('OPEN') ? 503 : 400).json({ error: err.message });
  }
});

app.get('/secrets/:key', async (req, res) => {
  try {
    const result = await bee.circuit.execute(() => bee.retrieveSecret(req.params.key, req.correlationId));
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 503).json({ error: err.message });
  }
});

app.post('/rotate/:key', async (req, res) => {
  try {
    const result = await bee.circuit.execute(() => bee.rotateSecret(req.params.key, req.correlationId));
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 503).json({ error: err.message });
  }
});

app.get('/audit', (_req, res) => { res.json(bee.getAuditLog()); });

onShutdown(() => { bee.retire(); return Promise.resolve(); });
const server = app.listen(PORT, () => {
  log('info', `${SERVICE_NAME} listening on port ${PORT}`, { port: PORT, pools: POOLS });
});
onShutdown(() => new Promise(resolve => server.close(resolve)));

module.exports = { app, VaultBee, encrypt, decrypt };
