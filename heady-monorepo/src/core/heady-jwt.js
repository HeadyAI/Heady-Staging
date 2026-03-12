/**
 * HeadyJWT — JWT sign/verify wrapper
 * Uses jsonwebtoken if available, falls back to pure-crypto HMAC-SHA256 implementation.
 */
'use strict';

const crypto = require('crypto');

let jwt;
try { jwt = require('jsonwebtoken'); } catch { jwt = null; }

class HeadyJWT {
  constructor(opts = {}) {
    this.secret = opts.secret || process.env.JWT_SECRET || 'heady-secret-change-in-production';
    this.algorithm = opts.algorithm || 'HS256';
    this.issuer = opts.issuer || 'heady-systems';
  }

  async sign(payload, opts = {}) {
    if (jwt) {
      return jwt.sign(payload, this.secret, {
        algorithm: this.algorithm,
        issuer: this.issuer,
        ...opts,
      });
    }
    // Pure crypto fallback
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, iss: this.issuer })).toString('base64url');
    const sig = crypto.createHmac('sha256', this.secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  }

  async verify(token) {
    if (jwt) {
      return jwt.verify(token, this.secret, { algorithms: [this.algorithm], issuer: this.issuer });
    }
    // Pure crypto fallback
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    const [header, body, sig] = parts;
    const expected = crypto.createHmac('sha256', this.secret).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) throw new Error('JWT signature verification failed');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) throw new Error('JWT expired');
    return payload;
  }
}

module.exports = HeadyJWT;
