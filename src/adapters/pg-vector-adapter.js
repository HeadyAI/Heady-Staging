/*
 * © 2026 HeadySystems Inc. — PROPRIETARY AND CONFIDENTIAL
 *
 * PgVectorAdapter — PostgreSQL/pgvector Persistence Backend for VectorMemory
 * ===========================================================================
 *
 * Solves CRITICAL gaps fix-026, fix-027, fix-028 from MASTER_IMPROVEMENT_PLAN.md:
 *   - "VectorMemory disconnected from pgvector production backend"
 *   - "Missing queryMemory() method causes buddy-core:632 crash"
 *   - "Missing ingestMemory() method causes self-awareness:173 crash"
 *
 * Implements the persistence adapter interface expected by VectorMemory:
 *   { store(id, vector, metadata, importance), search(queryVector, k, filter), delete(id) }
 *
 * Also exposes standalone:
 *   queryMemory(queryVector, k, threshold)  — semantic search alias
 *   ingestMemory(id, vector, metadata, importance) — store alias
 *
 * Schema (auto-created on connect):
 *   CREATE TABLE IF NOT EXISTS memory_vectors (
 *     id          TEXT PRIMARY KEY,
 *     embedding   vector(384),        -- pgvector column
 *     metadata    JSONB NOT NULL DEFAULT '{}',
 *     importance  REAL NOT NULL DEFAULT 0.5,
 *     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX IF NOT EXISTS memory_vectors_hnsw
 *     ON memory_vectors USING hnsw (embedding vector_cosine_ops)
 *     WITH (m = 21, ef_construction = 89);   -- fib(8), fib(11) — φ-derived
 *
 * Usage:
 *   const adapter = new PgVectorAdapter({ connectionString: process.env.DATABASE_URL });
 *   await adapter.connect();
 *   const vm = new VectorMemory({ persistence: adapter });
 *
 * © 2026 HeadySystems Inc. | φ = 1.618033988749895
 */

'use strict';

// ─── φ-Math ───────────────────────────────────────────────────────────────────
const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584];

// HNSW parameters — φ-derived Fibonacci indices
const HNSW_M              = FIB[7];   // 21  — max connections per layer
const HNSW_EF_CONSTRUCTION = FIB[10]; // 89  — build-time candidate pool
const HNSW_EF_SEARCH       = FIB[9];  // 55  — query-time candidate pool
const DEFAULT_DIM          = 384;
const DEFAULT_K            = FIB[6];  // 13  — default result count
const DEFAULT_THRESHOLD    = 0.500;   // CSL MINIMUM gate

// Retry config — φ-exponential backoff
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 377; // fib(13)

// ─── Logger ───────────────────────────────────────────────────────────────────
let _logger = null;
try { _logger = require('../utils/logger'); } catch { /* optional */ }
function log(level, msg, data = {}) {
    const entry = { level, component: 'PgVectorAdapter', msg, ts: new Date().toISOString(), ...data };
    if (_logger?.logNodeActivity) {
        _logger.logNodeActivity('PG-VECTOR', JSON.stringify(entry));
    }
}

// ─── PgVectorAdapter ─────────────────────────────────────────────────────────

class PgVectorAdapter {
    /**
     * @param {object} opts
     * @param {string} [opts.connectionString] - PostgreSQL connection URL (default: process.env.DATABASE_URL)
     * @param {string} [opts.tableName]        - Table name (default: 'memory_vectors')
     * @param {number} [opts.dimensions]       - Vector dimensions (default: 384)
     * @param {object} [opts.pool]             - Existing pg.Pool instance (overrides connectionString)
     */
    constructor(opts = {}) {
        this.connectionString = opts.connectionString || process.env.DATABASE_URL;
        this.tableName = opts.tableName || 'memory_vectors';
        this.dimensions = opts.dimensions || DEFAULT_DIM;
        this._pool = opts.pool || null;
        this._connected = false;
        this._pg = null;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    async connect() {
        if (this._connected) return this;

        if (!this._pool) {
            if (!this.connectionString) {
                throw new Error('PgVectorAdapter: connectionString or DATABASE_URL required');
            }
            // Lazy require pg — not bundled by default
            try {
                const { Pool } = require('pg');
                this._pool = new Pool({
                    connectionString: this.connectionString,
                    max: FIB[6],         // 13 connections — φ-scaled pool
                    idleTimeoutMillis: Math.round(PHI * 30000),
                    connectionTimeoutMillis: FIB[10] * 100, // 8.9s
                });
            } catch (err) {
                throw new Error(`PgVectorAdapter: 'pg' package not installed — run: npm install pg\n${err.message}`);
            }
        }

        // Ensure pgvector extension and schema
        await this._ensureSchema();
        this._connected = true;
        log('info', `PgVectorAdapter connected`, { table: this.tableName, dim: this.dimensions });
        return this;
    }

    async disconnect() {
        if (this._pool && !this._pool._externalPool) {
            await this._pool.end().catch(() => {});
        }
        this._connected = false;
    }

    async _ensureSchema() {
        const client = await this._pool.connect();
        try {
            await client.query('CREATE EXTENSION IF NOT EXISTS vector');
            await client.query(`
                CREATE TABLE IF NOT EXISTS ${this.tableName} (
                    id          TEXT PRIMARY KEY,
                    embedding   vector(${this.dimensions}),
                    metadata    JSONB NOT NULL DEFAULT '{}',
                    importance  REAL NOT NULL DEFAULT 0.5,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                    accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS ${this.tableName}_hnsw
                ON ${this.tableName}
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = ${HNSW_M}, ef_construction = ${HNSW_EF_CONSTRUCTION})
            `);
            log('debug', 'Schema ensured', { table: this.tableName });
        } finally {
            client.release();
        }
    }

    // ─── Core Persistence API (VectorMemory interface) ────────────────────────

    /**
     * Store a vector entry (VectorMemory.persistence.store interface).
     * @param {string} id
     * @param {Float64Array|number[]} vector
     * @param {object} metadata
     * @param {number} importance
     */
    async store(id, vector, metadata = {}, importance = 0.5) {
        if (!this._connected) await this.connect();

        const embedding = this._toPostgresVector(vector);
        const metaJson = JSON.stringify(metadata);

        return this._withRetry(async () => {
            await this._pool.query(`
                INSERT INTO ${this.tableName} (id, embedding, metadata, importance)
                VALUES ($1, $2::vector, $3::jsonb, $4)
                ON CONFLICT (id) DO UPDATE SET
                    embedding   = EXCLUDED.embedding,
                    metadata    = EXCLUDED.metadata,
                    importance  = EXCLUDED.importance,
                    accessed_at = now()
            `, [id, embedding, metaJson, importance]);
        });
    }

    /**
     * Semantic search using pgvector cosine distance.
     * Returns top-K results above threshold, sorted by similarity DESC.
     * @param {Float64Array|number[]} queryVector
     * @param {number} [k=13]
     * @param {object} [filter] - Metadata filter { key: value } — uses JSONB @> operator
     * @param {number} [threshold=0.500]
     * @returns {Promise<Array<{id, score, metadata, importance}>>}
     */
    async search(queryVector, k = DEFAULT_K, filter = null, threshold = DEFAULT_THRESHOLD) {
        if (!this._connected) await this.connect();

        const embedding = this._toPostgresVector(queryVector);
        const params = [embedding, k];
        let whereClause = `1 - (embedding <=> $1::vector) >= ${threshold}`;

        if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
            params.push(JSON.stringify(filter));
            whereClause += ` AND metadata @> $${params.length}::jsonb`;
        }

        return this._withRetry(async () => {
            const result = await this._pool.query(`
                SELECT
                    id,
                    metadata,
                    importance,
                    1 - (embedding <=> $1::vector) AS score
                FROM ${this.tableName}
                WHERE ${whereClause}
                ORDER BY embedding <=> $1::vector
                LIMIT $2
            `, params);

            return result.rows.map(row => ({
                id: row.id,
                score: parseFloat(row.score),
                metadata: typeof row.metadata === 'object' ? row.metadata : JSON.parse(row.metadata || '{}'),
                importance: parseFloat(row.importance),
            }));
        });
    }

    /**
     * Delete entry by ID.
     * @param {string} id
     */
    async delete(id) {
        if (!this._connected) await this.connect();

        return this._withRetry(async () => {
            await this._pool.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
        });
    }

    // ─── queryMemory / ingestMemory — High-Level API ──────────────────────────

    /**
     * queryMemory — semantic search alias.
     * Fixes crash in buddy-core.js:632 and self-awareness.js:173.
     *
     * @param {Float64Array|number[]} queryVector
     * @param {number}  [limit=13]      - Max results
     * @param {number}  [threshold=0.5] - Min cosine similarity (CSL MINIMUM)
     * @param {object}  [filter]        - Optional metadata filter
     * @returns {Promise<Array<{id, score, metadata, importance}>>}
     */
    async queryMemory(queryVector, limit = DEFAULT_K, threshold = DEFAULT_THRESHOLD, filter = null) {
        return this.search(queryVector, limit, filter, threshold);
    }

    /**
     * ingestMemory — store alias with text-first signature.
     * Fixes crash in self-awareness.js:173.
     *
     * @param {string}  id
     * @param {Float64Array|number[]} vector
     * @param {object}  [metadata]
     * @param {number}  [importance=0.5]
     */
    async ingestMemory(id, vector, metadata = {}, importance = 0.5) {
        return this.store(id, vector, metadata, importance);
    }

    // ─── Batch Operations ─────────────────────────────────────────────────────

    /**
     * Batch store for initial seeding or bulk ingestion.
     * @param {Array<{id, vector, metadata, importance}>} entries
     * @param {number} [batchSize=89] — fib(10) rows per transaction
     */
    async batchStore(entries, batchSize = FIB[10]) {
        if (!this._connected) await this.connect();
        if (!entries || entries.length === 0) return { stored: 0 };

        let stored = 0;
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            const client = await this._pool.connect();
            try {
                await client.query('BEGIN');
                for (const e of batch) {
                    const embedding = this._toPostgresVector(e.vector);
                    await client.query(`
                        INSERT INTO ${this.tableName} (id, embedding, metadata, importance)
                        VALUES ($1, $2::vector, $3::jsonb, $4)
                        ON CONFLICT (id) DO UPDATE SET
                            embedding   = EXCLUDED.embedding,
                            metadata    = EXCLUDED.metadata,
                            importance  = EXCLUDED.importance,
                            accessed_at = now()
                    `, [e.id, embedding, JSON.stringify(e.metadata || {}), e.importance ?? 0.5]);
                    stored++;
                }
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                log('error', 'batchStore transaction failed', { error: err.message, batchStart: i });
                throw err;
            } finally {
                client.release();
            }
        }

        log('info', `batchStore complete`, { stored, total: entries.length });
        return { stored };
    }

    /**
     * Count total entries in the table.
     */
    async count() {
        if (!this._connected) await this.connect();
        const result = await this._pool.query(`SELECT COUNT(*)::int AS n FROM ${this.tableName}`);
        return result.rows[0].n;
    }

    /**
     * Update accessed_at for LRU sync-back from RAM layer.
     * @param {string[]} ids
     */
    async touchBatch(ids) {
        if (!ids || ids.length === 0) return;
        if (!this._connected) await this.connect();
        await this._pool.query(
            `UPDATE ${this.tableName} SET accessed_at = now() WHERE id = ANY($1)`,
            [ids]
        );
    }

    // ─── Status ───────────────────────────────────────────────────────────────

    async getStatus() {
        const connected = this._connected;
        let entryCount = 0;
        let indexStats = null;

        if (connected) {
            try {
                entryCount = await this.count();
                const idx = await this._pool.query(`
                    SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
                    FROM pg_stat_user_indexes
                    WHERE tablename = $1
                    LIMIT 5
                `, [this.tableName]);
                indexStats = idx.rows;
            } catch { /* ignore stats errors */ }
        }

        return {
            connected,
            table: this.tableName,
            dimensions: this.dimensions,
            entryCount,
            indexStats,
            hnswConfig: { m: HNSW_M, ef_construction: HNSW_EF_CONSTRUCTION, ef_search: HNSW_EF_SEARCH },
            phi: PHI,
        };
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    /**
     * Convert Float64Array/number[] to pgvector string format '[0.1,0.2,...]'
     */
    _toPostgresVector(vector) {
        if (typeof vector === 'string') return vector; // already formatted
        const arr = vector instanceof Float64Array || vector instanceof Float32Array
            ? Array.from(vector)
            : vector;
        return '[' + arr.join(',') + ']';
    }

    /**
     * φ-exponential backoff retry wrapper.
     */
    async _withRetry(fn, attempt = 0) {
        try {
            return await fn();
        } catch (err) {
            if (attempt >= MAX_RETRIES) throw err;
            const delayMs = Math.round(RETRY_BASE_MS * Math.pow(PHI, attempt));
            log('warn', `PgVector op failed, retrying`, { attempt, delayMs, error: err.message });
            await new Promise(r => setTimeout(r, delayMs));
            return this._withRetry(fn, attempt + 1);
        }
    }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _instance = null;

/**
 * Get or create the singleton PgVectorAdapter.
 * Auto-connects on first call if DATABASE_URL is set.
 * @param {object} [opts]
 */
async function getPgVectorAdapter(opts = {}) {
    if (!_instance) {
        _instance = new PgVectorAdapter(opts);
        if (process.env.DATABASE_URL || opts.connectionString) {
            try {
                await _instance.connect();
            } catch (err) {
                log('warn', 'PgVectorAdapter auto-connect failed — will retry on first use', { error: err.message });
            }
        }
    }
    return _instance;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
    PgVectorAdapter,
    getPgVectorAdapter,
    DEFAULT_DIM,
    DEFAULT_K,
    DEFAULT_THRESHOLD,
    HNSW_M,
    HNSW_EF_CONSTRUCTION,
    HNSW_EF_SEARCH,
};
