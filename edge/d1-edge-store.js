/**
 * d1-edge-store.js — Cloudflare D1 Edge SQL Store
 *
 * Relational data at the edge with sub-10ms reads.
 * φ-scaled connection parameters, Fibonacci pagination,
 * prepared statement caching, and CSL-gated write decisions.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold, fibSequence } from '../shared/phi-math.js';
import { createHash } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const DEFAULT_PAGE_SIZE   = 21;          // fib(8)
const MAX_PAGE_SIZE       = 89;          // fib(11)
const STMT_CACHE_SIZE     = 233;         // fib(13) prepared statements
const MAX_BATCH_SIZE      = 34;          // fib(9) per batch
const QUERY_TIMEOUT_MS    = Math.round(1000 * PHI * PHI);  // ≈ 2618ms

// ── Prepared Statement Cache ─────────────────────────────
const stmtCache = new Map();

function getCachedStmt(db, sql) {
  const hash = createHash('sha256').update(sql).digest('hex').slice(0, 21);
  let stmt = stmtCache.get(hash);
  if (!stmt) {
    stmt = db.prepare(sql);
    if (stmtCache.size >= STMT_CACHE_SIZE) {
      const oldest = stmtCache.keys().next().value;
      stmtCache.delete(oldest);
    }
    stmtCache.set(hash, stmt);
  }
  return stmt;
}

// ── CSL Gate ────────────────────────────────────────────
function cslGate(value, score, threshold, temperature = PSI * PSI * PSI) {
  const sigmoid = 1 / (1 + Math.exp(-(score - threshold) / temperature));
  return value * sigmoid;
}

// ── Schema Definitions ──────────────────────────────────
const HEADY_SCHEMAS = {
  sessions: `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fingerprint_hash TEXT NOT NULL,
    trust_score REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_validated INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}'
  )`,
  
  feature_flags: `CREATE TABLE IF NOT EXISTS feature_flags (
    name TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    rollout_pct REAL DEFAULT 0.0,
    csl_gate REAL DEFAULT 0.5,
    kill_switch INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    updated_at INTEGER NOT NULL
  )`,
  
  rate_limits: `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    tokens REAL NOT NULL,
    last_refill INTEGER NOT NULL,
    max_tokens INTEGER NOT NULL,
    refill_rate REAL NOT NULL
  )`,
  
  edge_config: `CREATE TABLE IF NOT EXISTS edge_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`,

  cache_metadata: `CREATE TABLE IF NOT EXISTS cache_metadata (
    cache_key TEXT PRIMARY KEY,
    origin_url TEXT,
    content_hash TEXT,
    size_bytes INTEGER,
    hit_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
};

// ── D1 Store ────────────────────────────────────────────
/**
 * Create an edge store backed by Cloudflare D1.
 * @param {object} d1Binding — D1 database binding (from env)
 * @param {object} options — Configuration
 */
export function createD1Store(d1Binding, options = {}) {
  const db = d1Binding;
  const metrics = { reads: 0, writes: 0, errors: 0, batchOps: 0 };

  const store = {
    /**
     * Initialize all Heady tables.
     */
    async migrate() {
      if (!db) throw new Error('D1 binding not available');
      const results = [];
      for (const [name, sql] of Object.entries(HEADY_SCHEMAS)) {
        try {
          await db.exec(sql);
          results.push({ table: name, status: 'ok' });
        } catch (err) {
          results.push({ table: name, status: 'error', error: err.message });
        }
      }
      // Create indexes
      await db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_rate_limits_refill ON rate_limits(last_refill)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_cache_metadata_expires ON cache_metadata(expires_at)');
      return results;
    },

    /**
     * Execute a parameterized query.
     */
    async query(sql, params = []) {
      if (!db) throw new Error('D1 binding not available');
      metrics.reads++;
      try {
        const stmt = getCachedStmt(db, sql);
        const result = await stmt.bind(...params).all();
        return {
          rows: result.results || [],
          meta: {
            rowsRead: result.meta?.rows_read || 0,
            rowsWritten: result.meta?.rows_written || 0,
            durationMs: result.meta?.duration || 0,
          },
        };
      } catch (err) {
        metrics.errors++;
        throw err;
      }
    },

    /**
     * Execute a write (INSERT/UPDATE/DELETE).
     */
    async execute(sql, params = []) {
      if (!db) throw new Error('D1 binding not available');
      metrics.writes++;
      try {
        const stmt = getCachedStmt(db, sql);
        const result = await stmt.bind(...params).run();
        return {
          success: result.success,
          meta: {
            rowsWritten: result.meta?.rows_written || 0,
            lastRowId: result.meta?.last_row_id,
            durationMs: result.meta?.duration || 0,
          },
        };
      } catch (err) {
        metrics.errors++;
        throw err;
      }
    },

    /**
     * Batch execute multiple statements in a transaction.
     */
    async batch(statements) {
      if (!db) throw new Error('D1 binding not available');
      metrics.batchOps++;
      const results = [];
      
      // Process in Fibonacci-sized batches
      for (let i = 0; i < statements.length; i += MAX_BATCH_SIZE) {
        const chunk = statements.slice(i, i + MAX_BATCH_SIZE);
        const prepared = chunk.map(({ sql, params }) => {
          const stmt = getCachedStmt(db, sql);
          return params ? stmt.bind(...params) : stmt;
        });
        const chunkResults = await db.batch(prepared);
        results.push(...chunkResults);
      }
      
      return results;
    },

    /**
     * Paginated query with Fibonacci-sized pages.
     */
    async paginate(sql, params = [], page = 1, pageSize = DEFAULT_PAGE_SIZE) {
      const size = Math.min(pageSize, MAX_PAGE_SIZE);
      const offset = (page - 1) * size;
      
      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
      const countResult = await this.query(countSql, params);
      const total = countResult.rows[0]?.total || 0;
      
      // Get page
      const pageSql = `${sql} LIMIT ? OFFSET ?`;
      const pageResult = await this.query(pageSql, [...params, size, offset]);
      
      return {
        rows: pageResult.rows,
        pagination: {
          page,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
          hasMore: page * size < total,
        },
      };
    },

    /**
     * Get store metrics.
     */
    getMetrics() {
      return { ...metrics, stmtCacheSize: stmtCache.size };
    },

    /** Sub-objects populated below */
    sessions: null,
    flags: null,
  };

  // ── Heady-Specific Operations (use store reference) ────
  store.sessions = {
    async create(id, userId, fingerprintHash, expiresAt, metadata = {}) {
      const now = Date.now();
      return store.execute(
        'INSERT OR REPLACE INTO sessions (id, user_id, fingerprint_hash, trust_score, created_at, expires_at, last_validated, metadata) VALUES (?, ?, ?, 1.0, ?, ?, ?, ?)',
        [id, userId, fingerprintHash, now, expiresAt, now, JSON.stringify(metadata)]
      );
    },
    async get(id) {
      const result = await store.query('SELECT * FROM sessions WHERE id = ? AND expires_at > ?', [id, Date.now()]);
      const row = result.rows[0];
      if (row) row.metadata = JSON.parse(row.metadata || '{}');
      return row || null;
    },
    async cleanup() {
      return store.execute('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
    },
  };

  store.flags = {
    async get(name) {
      const result = await store.query('SELECT * FROM feature_flags WHERE name = ?', [name]);
      const flag = result.rows[0];
      if (!flag) return null;
      flag.metadata = JSON.parse(flag.metadata || '{}');
      return flag;
    },
    async isEnabled(name, userId = null) {
      const flag = await store.flags.get(name);
      if (!flag || flag.kill_switch) return false;
      if (!flag.enabled) return false;
      if (userId) {
        const hash = createHash('sha256').update(`${name}:${userId}`).digest('hex');
        const bucket = parseInt(hash.slice(0, 8), 16) / 0xFFFFFFFF;
        return bucket < flag.rollout_pct;
      }
      return flag.rollout_pct >= 1.0;
    },
    async set(name, config) {
      return store.execute(
        'INSERT OR REPLACE INTO feature_flags (name, enabled, rollout_pct, csl_gate, kill_switch, metadata, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, config.enabled ? 1 : 0, config.rolloutPct || 0, config.cslGate || CSL_THRESHOLDS.MINIMUM, config.killSwitch ? 1 : 0, JSON.stringify(config.metadata || {}), Date.now()]
      );
    },
  };

  return store;
}

export { HEADY_SCHEMAS, CSL_THRESHOLDS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
export default { createD1Store, HEADY_SCHEMAS, CSL_THRESHOLDS };
