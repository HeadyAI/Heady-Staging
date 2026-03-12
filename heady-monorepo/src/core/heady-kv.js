/**
 * HeadyKV — Key-Value store with in-memory + optional Redis backend
 */
'use strict';

class HeadyKV {
  constructor(opts = {}) {
    this.namespace = opts.namespace || 'heady';
    this._store = new Map();
    this._ttls = new Map();

    // Try Redis
    this._redis = null;
    if (opts.redis) {
      this._redis = opts.redis;
    } else {
      try {
        const { createClient } = require('redis');
        if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
          const client = createClient({ url: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL });
          client.connect().then(() => { this._redis = client; }).catch(() => {});
        }
      } catch {}
    }
  }

  _key(k) { return `${this.namespace}:${k}`; }

  async set(key, value, opts = {}) {
    const fullKey = this._key(key);
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    this._store.set(fullKey, serialized);
    if (opts.ttlMs) {
      const timer = setTimeout(() => { this._store.delete(fullKey); this._ttls.delete(fullKey); }, opts.ttlMs);
      if (timer.unref) timer.unref();
      this._ttls.set(fullKey, { expires: Date.now() + opts.ttlMs, timer });
    }
    if (this._redis) {
      try {
        if (opts.ttlMs) {
          await this._redis.set(fullKey, serialized, { PX: opts.ttlMs });
        } else {
          await this._redis.set(fullKey, serialized);
        }
      } catch {}
    }
    return 'OK';
  }

  async get(key) {
    const fullKey = this._key(key);
    const ttl = this._ttls.get(fullKey);
    if (ttl && Date.now() > ttl.expires) {
      this._store.delete(fullKey);
      this._ttls.delete(fullKey);
      return null;
    }
    const raw = this._store.get(fullKey);
    if (raw !== undefined) {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    if (this._redis) {
      try {
        const val = await this._redis.get(fullKey);
        if (val !== null) {
          this._store.set(fullKey, val);
          try { return JSON.parse(val); } catch { return val; }
        }
      } catch {}
    }
    return null;
  }

  async del(key) {
    const fullKey = this._key(key);
    const ttl = this._ttls.get(fullKey);
    if (ttl) { clearTimeout(ttl.timer); this._ttls.delete(fullKey); }
    this._store.delete(fullKey);
    if (this._redis) { try { await this._redis.del(fullKey); } catch {} }
    return 1;
  }

  async exists(key) {
    return (await this.get(key)) !== null ? 1 : 0;
  }

  async keys(pattern = '*') {
    const prefix = this._key('');
    const re = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return [...this._store.keys()]
      .filter(k => k.startsWith(prefix))
      .map(k => k.slice(prefix.length))
      .filter(k => re.test(k));
  }
}

module.exports = HeadyKV;
