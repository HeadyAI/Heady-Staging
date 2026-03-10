/**
 * Heady™ pgvector Client v6.0
 * Persistence layer with async flush — RAM-first, pgvector-backed
 * Connection pooling via PgBouncer, HNSW index support
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const { createLogger } = require('./logger');
const {
  PHI, PSI, fib, phiBackoffWithJitter,
  CSL_THRESHOLDS, EMBEDDING_DIM, HNSW_PARAMS,
  POOL_SIZES, TIMING,
} = require('./phi-math');

const logger = createLogger('pgvector-client');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION — All phi-derived
// ═══════════════════════════════════════════════════════════

const PG_CONFIG = {
  host: process.env.PG_HOST || 'heady-pgbouncer',
  port: parseInt(process.env.PG_PORT, 10) || 6432,  // PgBouncer port
  database: process.env.PG_DATABASE || 'heady_vectors',
  user: process.env.PG_USER || 'heady',
  // Password MUST come from secret manager — no default
  max: fib(8),                     // 21 pool connections
  idleTimeoutMillis: fib(13) * 1000,  // 233s idle timeout
  connectionTimeoutMillis: fib(7) * 1000, // 13s connection timeout
  statement_timeout: fib(11) * 1000,  // 89s statement timeout
};

const FLUSH_INTERVAL_MS = fib(7) * 1000;     // 13s async flush interval
const FLUSH_BATCH_SIZE = fib(9);             // 34 records per batch
const WRITE_BUFFER_SIZE = fib(12);           // 144 max buffered writes
const MAX_QUERY_RETRIES = fib(5);            // 5 retries

// ═══════════════════════════════════════════════════════════
// WRITE BUFFER — RAM-first accumulation for async flush
// ═══════════════════════════════════════════════════════════

class WriteBuffer {
  constructor(maxSize = WRITE_BUFFER_SIZE) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.totalFlushed = 0;
    this.totalDropped = 0;
  }

  add(operation) {
    if (this.buffer.length >= this.maxSize) {
      // Evict oldest non-critical write
      const evictIdx = this.buffer.findIndex(op => op.priority !== 'critical');
      if (evictIdx >= 0) {
        this.buffer.splice(evictIdx, 1);
        this.totalDropped++;
      } else {
        this.totalDropped++;
        logger.warn({ message: 'Write buffer full — dropping operation', bufferSize: this.buffer.length });
        return false;
      }
    }
    this.buffer.push({
      ...operation,
      bufferedAt: Date.now(),
    });
    return true;
  }

  drain(count = FLUSH_BATCH_SIZE) {
    const batch = this.buffer.splice(0, count);
    this.totalFlushed += batch.length;
    return batch;
  }

  get size() {
    return this.buffer.length;
  }

  getStats() {
    return {
      buffered: this.buffer.length,
      maxSize: this.maxSize,
      totalFlushed: this.totalFlushed,
      totalDropped: this.totalDropped,
      pressure: this.buffer.length / this.maxSize,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// PGVECTOR CLIENT — Connection pool + vector operations
// ═══════════════════════════════════════════════════════════

class PgVectorClient {
  constructor(config = {}) {
    this.config = { ...PG_CONFIG, ...config };
    this.pool = null;
    this.writeBuffer = new WriteBuffer();
    this.flushTimer = null;
    this.connected = false;
    this.queryCount = 0;
    this.errorCount = 0;
  }

  async connect(password) {
    if (this.pool) return;

    try {
      const { Pool } = require('pg');
      
      this.pool = new Pool({
        ...this.config,
        password,
        ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: true } : false,
      });

      this.pool.on('error', (err) => {
        logger.error({ message: 'Unexpected pool error', error: err.message });
        this.errorCount++;
      });

      this.pool.on('connect', () => {
        logger.debug({ message: 'New pool connection established' });
      });

      // Verify connectivity
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.connected = true;
      this._startFlushLoop();

      logger.info({
        message: 'pgvector client connected',
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        poolMax: this.config.max,
      });
    } catch (error) {
      logger.error({ message: 'pgvector connection failed', error: error.message });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // VECTOR OPERATIONS
  // ═══════════════════════════════════════════════════════════

  async storeEmbedding(id, embedding, metadata = {}, options = {}) {
    this._validateEmbedding(embedding);
    
    const operation = {
      type: 'upsert_embedding',
      id,
      embedding,
      metadata,
      priority: options.priority || 'normal',
      table: options.table || 'embeddings',
    };

    if (options.immediate) {
      return this._executeEmbeddingUpsert(operation);
    }

    return this.writeBuffer.add(operation);
  }

  async searchSimilar(queryEmbedding, options = {}) {
    this._validateEmbedding(queryEmbedding);
    
    const topK = options.topK || fib(8);           // 21 results
    const threshold = options.threshold || CSL_THRESHOLDS.MINIMUM;  // 0.500
    const table = options.table || 'embeddings';
    const operator = options.operator || '<=>'; // cosine distance

    const sql = `
      SELECT id, metadata, 
             1 - (embedding ${operator} $1::vector) as similarity
      FROM ${table}
      WHERE 1 - (embedding ${operator} $1::vector) >= $2
      ORDER BY embedding ${operator} $1::vector
      LIMIT $3
    `;

    return this._query(sql, [
      `[${queryEmbedding.join(',')}]`,
      threshold,
      topK,
    ]);
  }

  async findByMetadata(filter, options = {}) {
    const table = options.table || 'embeddings';
    const limit = options.limit || fib(9);  // 34

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(filter)) {
      conditions.push(`metadata->>'${key}' = $${paramIdx}`);
      params.push(String(value));
      paramIdx++;
    }

    const sql = `
      SELECT id, metadata, created_at, updated_at
      FROM ${table}
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
      LIMIT $${paramIdx}
    `;
    params.push(limit);

    return this._query(sql, params);
  }

  async deleteEmbedding(id, table = 'embeddings') {
    return this._query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  async getEmbedding(id, table = 'embeddings') {
    const result = await this._query(
      `SELECT id, embedding, metadata, created_at, updated_at FROM ${table} WHERE id = $1`,
      [id]
    );
    return result.rows?.[0] || null;
  }

  // ═══════════════════════════════════════════════════════════
  // BATCH OPERATIONS
  // ═══════════════════════════════════════════════════════════

  async batchStoreEmbeddings(items, table = 'embeddings') {
    if (!items.length) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < items.length; i += FLUSH_BATCH_SIZE) {
        const batch = items.slice(i, i + FLUSH_BATCH_SIZE);
        const values = [];
        const params = [];
        let paramIdx = 1;

        for (const item of batch) {
          this._validateEmbedding(item.embedding);
          values.push(`($${paramIdx}, $${paramIdx + 1}::vector, $${paramIdx + 2}::jsonb)`);
          params.push(item.id, `[${item.embedding.join(',')}]`, JSON.stringify(item.metadata || {}));
          paramIdx += 3;
        }

        await client.query(
          `INSERT INTO ${table} (id, embedding, metadata)
           VALUES ${values.join(', ')}
           ON CONFLICT (id) DO UPDATE SET
             embedding = EXCLUDED.embedding,
             metadata = EXCLUDED.metadata,
             updated_at = NOW()`,
          params
        );
      }

      await client.query('COMMIT');

      logger.info({
        message: 'Batch embeddings stored',
        count: items.length,
        table,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INDEX MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  async createHNSWIndex(table = 'embeddings', column = 'embedding') {
    const indexName = `idx_${table}_${column}_hnsw`;
    const m = fib(8);               // 21
    const efConstruction = fib(12); // 144

    await this._query(`
      CREATE INDEX IF NOT EXISTS ${indexName}
      ON ${table}
      USING hnsw (${column} vector_cosine_ops)
      WITH (m = ${m}, ef_construction = ${efConstruction})
    `);

    logger.info({
      message: 'HNSW index created',
      index: indexName,
      m,
      efConstruction,
    });
  }

  async setSearchEfSearch(efSearch = fib(11)) {  // 89
    await this._query(`SET hnsw.ef_search = ${efSearch}`);
  }

  // ═══════════════════════════════════════════════════════════
  // ASYNC FLUSH LOOP — Background persistence
  // ═══════════════════════════════════════════════════════════

  _startFlushLoop() {
    if (this.flushTimer) clearInterval(this.flushTimer);

    this.flushTimer = setInterval(async () => {
      await this._flushBuffer();
    }, FLUSH_INTERVAL_MS);

    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  async _flushBuffer() {
    const batch = this.writeBuffer.drain();
    if (batch.length === 0) return;

    logger.debug({ message: 'Flushing write buffer', batchSize: batch.length });

    for (const op of batch) {
      try {
        switch (op.type) {
          case 'upsert_embedding':
            await this._executeEmbeddingUpsert(op);
            break;
          default:
            logger.warn({ message: 'Unknown buffer operation type', type: op.type });
        }
      } catch (error) {
        logger.error({
          message: 'Buffer flush operation failed',
          type: op.type,
          id: op.id,
          error: error.message,
        });
        // Re-buffer failed critical operations
        if (op.priority === 'critical') {
          op._retryCount = (op._retryCount || 0) + 1;
          if (op._retryCount < MAX_QUERY_RETRIES) {
            this.writeBuffer.add(op);
          }
        }
      }
    }
  }

  async _executeEmbeddingUpsert(op) {
    const table = op.table || 'embeddings';
    return this._query(
      `INSERT INTO ${table} (id, embedding, metadata)
       VALUES ($1, $2::vector, $3::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         embedding = EXCLUDED.embedding,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`,
      [op.id, `[${op.embedding.join(',')}]`, JSON.stringify(op.metadata)]
    );
  }

  // ═══════════════════════════════════════════════════════════
  // QUERY EXECUTION — with phi-backoff retry
  // ═══════════════════════════════════════════════════════════

  async _query(sql, params = []) {
    let lastError = null;
    for (let attempt = 0; attempt < MAX_QUERY_RETRIES; attempt++) {
      try {
        this.queryCount++;
        const result = await this.pool.query(sql, params);
        return result;
      } catch (error) {
        lastError = error;
        this.errorCount++;

        // Non-retryable errors
        if (_isNonRetryablePgError(error)) {
          throw error;
        }

        if (attempt < MAX_QUERY_RETRIES - 1) {
          const delay = phiBackoffWithJitter(attempt);
          logger.warn({
            message: 'Query retry',
            attempt,
            nextRetryMs: delay,
            error: error.message,
            code: error.code,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  _validateEmbedding(embedding) {
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding must be an array');
    }
    if (embedding.length !== EMBEDDING_DIM) {
      throw new Error(`Embedding dimension mismatch: got ${embedding.length}, expected ${EMBEDDING_DIM}`);
    }
    for (const v of embedding) {
      if (typeof v !== 'number' || !isFinite(v)) {
        throw new Error('Embedding contains non-finite values');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HEALTH & METRICS
  // ═══════════════════════════════════════════════════════════

  async getHealth() {
    try {
      const result = await this._query('SELECT NOW() as time, pg_database_size(current_database()) as db_size');
      return {
        status: 'healthy',
        connected: this.connected,
        pool: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount,
        },
        buffer: this.writeBuffer.getStats(),
        queries: this.queryCount,
        errors: this.errorCount,
        dbSize: result.rows[0]?.db_size,
        timestamp: result.rows[0]?.time,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SHUTDOWN
  // ═══════════════════════════════════════════════════════════

  async shutdown() {
    logger.info({ message: 'pgvector client shutting down' });

    // Final flush
    await this._flushBuffer();

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    this.connected = false;
    logger.info({ message: 'pgvector client shut down cleanly' });
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function _isNonRetryablePgError(error) {
  const nonRetryable = [
    '23505', // unique_violation
    '42P01', // undefined_table
    '42703', // undefined_column
    '22P02', // invalid_text_representation
    '23503', // foreign_key_violation
  ];
  return nonRetryable.includes(error.code);
}

// ═══════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════

let _instance = null;

function getClient(config) {
  if (!_instance) {
    _instance = new PgVectorClient(config);
  }
  return _instance;
}

module.exports = {
  PgVectorClient,
  getClient,
  WriteBuffer,
  PG_CONFIG,
  FLUSH_INTERVAL_MS,
  FLUSH_BATCH_SIZE,
  WRITE_BUFFER_SIZE,
};
