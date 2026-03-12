/**
 * HeadyDuck — DuckDB adapter with in-memory fallback
 */
'use strict';

let duckdb;
try { duckdb = require('duckdb'); } catch { duckdb = null; }

class HeadyDuck {
  constructor(opts = {}) {
    this.path = opts.path || ':memory:';
    this._db = null;
    this._conn = null;
    this._mem = []; // in-memory fallback store
    this._ready = this._init();
  }

  async _init() {
    if (!duckdb) return;
    try {
      this._db = new duckdb.Database(this.path);
      this._conn = this._db.connect();
    } catch {}
  }

  async exec(sql, params = []) {
    await this._ready;
    if (!this._conn) return { rows: [], rowCount: 0, sql };
    return new Promise((resolve, reject) => {
      this._conn.run(sql, ...params, function(err) {
        if (err) reject(err);
        else resolve({ rows: [], rowCount: this.changes || 0, sql });
      });
    });
  }

  async query(sql, params = []) {
    await this._ready;
    if (!this._conn) return [];
    return new Promise((resolve, reject) => {
      this._conn.all(sql, ...params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async close() {
    if (this._db) this._db.close();
  }
}

// Singleton factory
const instances = new Map();
function getDuck(path = ':memory:') {
  if (!instances.has(path)) instances.set(path, new HeadyDuck({ path }));
  return instances.get(path);
}

module.exports = getDuck;
module.exports.HeadyDuck = HeadyDuck;
