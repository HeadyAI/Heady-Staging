/* © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL. */
// STUB — awaiting full implementation

'use strict';

class NeonDB {
  constructor(url = null) {
    this.url = url || process.env.DATABASE_URL;
    this.connection = null;
  }

  connect() {
    return {
      ok: false,
      reason: 'not-implemented',
      connected: false
    };
  }

  query(sql, params = []) {
    return {
      ok: false,
      reason: 'not-implemented',
      rows: [],
      error: null
    };
  }

  close() {
    try {
      if (this.connection && this.connection.end) {
        this.connection.end();
      }
    } catch (err) {
      // ignore
    }
    this.connection = null;
  }
}

module.exports = { NeonDB };
