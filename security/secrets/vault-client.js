/**
 * Heady Vault Client — Sacred Genesis v4.0.0
 * Secret management with envelope encryption and rotation tracking
 *
 * @module vault-client
 * @author Eric Haywood, HeadySystems Inc.
 */

'use strict';

const crypto = require('crypto');
const { PHI, PSI, fib, phiBackoff } = require('../../shared/phi-math');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ROTATION_INTERVAL_MS = fib(11) * 3600 * 1000;
const MAX_VERSIONS = fib(8);
const MAX_SECRETS = fib(16);

const vault = new Map();
const masterKeys = new Map();
let activeKeyId = null;

function generateMasterKey() {
  const keyId = `hk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const key = crypto.randomBytes(32);
  masterKeys.set(keyId, { key, createdAt: Date.now() });
  activeKeyId = keyId;
  return keyId;
}

function encrypt(value, keyId) {
  const kid = keyId || activeKeyId;
  const keyRecord = masterKeys.get(kid);
  if (!keyRecord) throw new Error(`Encryption key ${kid} not found`);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyRecord.key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(value, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString('base64'), tag: tag.toString('base64'), keyId: kid };
}

function decrypt(encrypted, iv, tag, keyId) {
  const keyRecord = masterKeys.get(keyId);
  if (!keyRecord) throw new Error(`Decryption key ${keyId} not found`);
  const decipher = crypto.createDecipheriv(ALGORITHM, keyRecord.key, Buffer.from(iv, 'base64'), { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function storeSecret(name, value) {
  if (!vault.has(name) && vault.size >= MAX_SECRETS) throw new Error(`Maximum secret capacity (${MAX_SECRETS}) reached`);
  const { encrypted, iv, tag, keyId } = encrypt(value);
  const versions = vault.get(name) || [];
  const version = versions.length + 1;
  const record = { name, encrypted, iv, tag, version, createdAt: new Date().toISOString(), rotateBy: new Date(Date.now() + ROTATION_INTERVAL_MS).toISOString(), keyId };
  versions.push(record);
  if (versions.length > MAX_VERSIONS) versions.shift();
  vault.set(name, versions);
  return { name, version, keyId, rotateBy: record.rotateBy };
}

function getSecret(name, version) {
  const versions = vault.get(name);
  if (!versions || versions.length === 0) return null;
  const record = version ? versions.find(v => v.version === version) : versions[versions.length - 1];
  if (!record) return null;
  const value = decrypt(record.encrypted, record.iv, record.tag, record.keyId);
  return { name, value, version: record.version };
}

function listSecrets() {
  const list = [];
  for (const [name, versions] of vault) {
    const latest = versions[versions.length - 1];
    list.push({ name, versions: versions.length, latestVersion: latest.version, rotateBy: latest.rotateBy, keyId: latest.keyId });
  }
  return list;
}

function checkRotation() {
  const now = Date.now();
  const results = [];
  for (const [name, versions] of vault) {
    const latest = versions[versions.length - 1];
    const rotateByDate = new Date(latest.rotateBy).getTime();
    results.push({ name, rotateBy: latest.rotateBy, overdue: now > rotateByDate });
  }
  return results;
}

generateMasterKey();

module.exports = { encrypt, decrypt, storeSecret, getSecret, listSecrets, checkRotation, generateMasterKey, ROTATION_INTERVAL_MS };
