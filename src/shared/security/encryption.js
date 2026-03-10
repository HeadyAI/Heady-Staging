/**
 * Heady™ Encryption Utilities v6.0
 * AES-256-GCM encryption, HMAC signing, secure random generation
 * Zero plaintext secrets in memory longer than necessary
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const crypto = require('crypto');
const { fib } = require('../phi-math');

// ═══════════════════════════════════════════════════════════
// AES-256-GCM ENCRYPTION
// ═══════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = fib(8);  // 21 bytes
const KEY_ITERATIONS = fib(16) * fib(8);  // 987 * 21 = 20727 PBKDF2 iterations

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const derivedKey = _deriveKey(key, iv.slice(0, SALT_LENGTH));

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: iv + tag + ciphertext (all base64)
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(encryptedBase64, key) {
  const data = Buffer.from(encryptedBase64, 'base64');

  const iv = data.slice(0, IV_LENGTH);
  const tag = data.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.slice(IV_LENGTH + TAG_LENGTH);

  const derivedKey = _deriveKey(key, iv.slice(0, SALT_LENGTH));

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext) + decipher.final('utf8');
}

function _deriveKey(password, salt) {
  const keyMaterial = typeof password === 'string' ? password : password.toString('utf8');
  return crypto.pbkdf2Sync(keyMaterial, salt, KEY_ITERATIONS, 32, 'sha512');
}

// ═══════════════════════════════════════════════════════════
// HMAC SIGNING
// ═══════════════════════════════════════════════════════════

function hmacSign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function hmacVerify(data, signature, secret) {
  const expected = hmacSign(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

// ═══════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function sha384(data) {
  return crypto.createHash('sha384').update(data).digest('hex');
}

function hashToken(token) {
  return sha256(token).slice(0, fib(9));  // 34 chars
}

// ═══════════════════════════════════════════════════════════
// SECURE RANDOM GENERATION
// ═══════════════════════════════════════════════════════════

function generateSecureId(byteLength = fib(8)) {  // 21 bytes = 42 hex chars
  return crypto.randomBytes(byteLength).toString('hex');
}

function generateSessionId() {
  return crypto.randomBytes(fib(9)).toString('hex');  // 34 bytes = 68 hex chars
}

function generateCsrfToken() {
  return crypto.randomBytes(fib(8)).toString('hex');  // 21 bytes = 42 hex chars
}

function generateApiKey() {
  // Format: heady_<base64url 34-byte random>
  return 'heady_' + crypto.randomBytes(fib(9)).toString('base64url');
}

function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');  // 256-bit key
}

// ═══════════════════════════════════════════════════════════
// CONSTANT-TIME COMPARISON
// ═══════════════════════════════════════════════════════════

function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ═══════════════════════════════════════════════════════════
// DATA MASKING — For logging
// ═══════════════════════════════════════════════════════════

function maskSensitive(value) {
  if (!value || typeof value !== 'string') return '***';
  if (value.length <= fib(5)) return '***';  // 5 chars or less
  return value.slice(0, fib(4)) + '...' + value.slice(-fib(4));  // 3...3 visible
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return local.slice(0, 2) + '***@' + domain;
}

function maskIp(ip) {
  if (!ip) return '***';
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.slice(0, fib(6)) + '...';  // 8 chars for IPv6
}

module.exports = {
  encrypt,
  decrypt,
  hmacSign,
  hmacVerify,
  sha256,
  sha384,
  hashToken,
  generateSecureId,
  generateSessionId,
  generateCsrfToken,
  generateApiKey,
  generateEncryptionKey,
  secureCompare,
  maskSensitive,
  maskEmail,
  maskIp,
  ALGORITHM,
};
