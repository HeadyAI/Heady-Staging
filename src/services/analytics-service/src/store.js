'use strict';

// FIB[16] = 987 max LRU cache entries
const LRU_MAX_ENTRIES = 987;

/**
 * Simple LRU cache with a Fibonacci-derived max size.
 */
class LRUCache {
  /**
   * @param {number} [maxSize=987]
   */
  constructor(maxSize = LRU_MAX_ENTRIES) {
    this._max = maxSize;
    /** @type {Map<string, any>} */
    this._map = new Map();
  }

  get(key) {
    if (!this._map.has(key)) return undefined;
    const val = this._map.get(key);
    // Move to end (most recently used)
    this._map.delete(key);
    this._map.set(key, val);
    return val;
  }

  set(key, value) {
    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this._max) {
      // Evict least recently used (first key)
      const firstKey = this._map.keys().next().value;
      this._map.delete(firstKey);
    }
    this._map.set(key, value);
  }

  has(key) {
    return this._map.has(key);
  }

  delete(key) {
    return this._map.delete(key);
  }

  clear() {
    this._map.clear();
  }

  get size() {
    return this._map.size;
  }

  values() {
    return Array.from(this._map.values());
  }

  entries() {
    return Array.from(this._map.entries());
  }
}

/**
 * Analytics data store with in-memory buffer and periodic PostgreSQL flush.
 */
class AnalyticsStore {
  /**
   * @param {object} params
   * @param {object|null} params.pgPool — pg Pool instance (null for in-memory only)
   * @param {object} params.log — structured logger
   * @param {number} [params.flushIntervalMs=21000] — flush interval (FIB[8]*1000)
   */
  constructor({ pgPool = null, log, flushIntervalMs = 21000 }) {
    this._pgPool = pgPool;
    this._log = log;
    this._flushIntervalMs = flushIntervalMs;
    this._eventBuffer = [];
    this._aggregateCache = new LRUCache(LRU_MAX_ENTRIES);
    this._flushTimer = null;
  }

  /**
   * Start the periodic flush timer.
   */
  start() {
    if (this._flushTimer) return;
    this._flushTimer = setInterval(() => this.flush(), this._flushIntervalMs);
    this._log.info('Store: flush timer started', { intervalMs: this._flushIntervalMs });
  }

  /**
   * Stop the flush timer and perform a final flush.
   */
  async stop() {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
    await this.flush();
    this._log.info('Store: stopped');
  }

  /**
   * Buffer an analytics event for later flush.
   *
   * @param {object} event
   */
  addEvent(event) {
    this._eventBuffer.push({
      ...event,
      received_at: new Date().toISOString(),
    });
  }

  /**
   * Store an aggregate metric.
   *
   * @param {string} key
   * @param {object} data
   */
  setAggregate(key, data) {
    this._aggregateCache.set(key, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Get an aggregate metric.
   *
   * @param {string} key
   * @returns {object|undefined}
   */
  getAggregate(key) {
    return this._aggregateCache.get(key);
  }

  /**
   * Get all aggregate entries.
   * @returns {[string, object][]}
   */
  getAllAggregates() {
    return this._aggregateCache.entries();
  }

  /**
   * Flush buffered events to PostgreSQL (if configured).
   */
  async flush() {
    if (this._eventBuffer.length === 0) return;

    const events = this._eventBuffer.splice(0);
    this._log.info('Store: flushing events', { count: events.length });

    if (!this._pgPool) {
      this._log.debug('Store: no pgPool, events discarded after aggregation');
      return;
    }

    const client = await this._pgPool.connect();
    try {
      await client.query('BEGIN');

      const insertSQL = `
        INSERT INTO analytics_events (
          event_type, path, referrer, user_agent_family,
          event_name, properties, session_id, received_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      for (const evt of events) {
        await client.query(insertSQL, [
          evt.event_type,
          evt.path || null,
          evt.referrer || null,
          evt.user_agent_family || null,
          evt.event_name || null,
          evt.properties ? JSON.stringify(evt.properties) : null,
          evt.session_id || null,
          evt.received_at,
        ]);
      }

      await client.query('COMMIT');
      this._log.info('Store: flush complete', { count: events.length });
    } catch (err) {
      await client.query('ROLLBACK');
      this._log.error('Store: flush failed, re-buffering', { error: err.message, count: events.length });
      this._eventBuffer.unshift(...events);
    } finally {
      client.release();
    }
  }

  /**
   * Get store stats.
   * @returns {object}
   */
  getStats() {
    return {
      bufferedEvents: this._eventBuffer.length,
      cachedAggregates: this._aggregateCache.size,
      maxCacheSize: LRU_MAX_ENTRIES,
    };
  }
}

module.exports = {
  AnalyticsStore,
  LRUCache,
  LRU_MAX_ENTRIES,
};
