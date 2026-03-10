/**
 * Heady™ Hybrid Search Service
 * Full-text (BM25) + vector (pgvector cosine) combined search
 * Reciprocal Rank Fusion (RRF) for result merging
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */

'use strict';

const express = require('express');
const { Pool } = require('pg');
const { createLogger, requestLogger } = require('../../shared/logger');
const { securityHeaders, gracefulShutdown } = require('../../shared/security-headers');

const app = express();
const PORT = process.env.SERVICE_PORT || 3397;
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const RRF_K = 55; // Fibonacci constant for RRF
const FIB_21 = 21;
const FIB_34 = 34;
const FIB_384 = 384; // Embedding dimension

const logger = createLogger({ service: 'search-service', domain: 'data' });

app.use(express.json({ limit: '2mb' }));
app.use(securityHeaders());
app.use(requestLogger(logger));

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT) || 6432, // Via PgBouncer
    database: process.env.PGDATABASE || 'heady_vector',
    user: process.env.PGUSER || 'heady',
    password: process.env.PGPASSWORD,
    max: FIB_34,
});

pool.on('error', (err) => logger.error({ err }, 'Unexpected pool error'));

// Initialize search tables
async function initSearch() {
    try {
        await pool.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      CREATE TABLE IF NOT EXISTS heady_search_index (
        id BIGSERIAL PRIMARY KEY,
        content_type VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        url VARCHAR(500),
        source VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        embedding vector(384),
        search_vector tsvector,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_search_embedding ON heady_search_index USING hnsw (embedding vector_cosine_ops) WITH (m = 32, ef_construction = 200);
      CREATE INDEX IF NOT EXISTS idx_search_fts ON heady_search_index USING gin (search_vector);
      CREATE INDEX IF NOT EXISTS idx_search_trgm ON heady_search_index USING gin (title gin_trgm_ops);
    `);
        logger.info('Search tables initialized');
    } catch (err) {
        logger.error({ err }, 'Failed to initialize search tables');
        throw err;
    }
}

// Health check
app.get('/health', (_, res) => res.json({
    status: 'healthy',
    service: 'search-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
}));

// Hybrid search: BM25 + vector + RRF fusion
app.post('/api/v1/search', async (req, res) => {
    const { query, embedding, limit = FIB_21, contentType } = req.body;
    if (!query && !embedding) {
        return res.status(400).json({ error: 'query or embedding required' });
    }

    const safeLimit = Math.min(Math.max(parseInt(limit) || FIB_21, 1), 100);

    try {
        const results = {};

        // Full-text search (BM25-style via tsvector)
        if (query && typeof query === 'string') {
            const ftsParams = contentType
                ? [query.slice(0, 500), safeLimit, String(contentType).slice(0, 50)]
                : [query.slice(0, 500), safeLimit];
            const typeFilter = contentType ? 'AND content_type = $3' : '';

            const ftsResults = await pool.query(`
        SELECT id, title, url, content_type, ts_rank(search_vector, plainto_tsquery('english', $1)) as score
        FROM heady_search_index
        WHERE search_vector @@ plainto_tsquery('english', $1) ${typeFilter}
        ORDER BY score DESC LIMIT $2
      `, ftsParams);

            ftsResults.rows.forEach((row, rank) => {
                results[row.id] = { ...row, fts_rank: rank + 1, fts_score: row.score };
            });
        }

        // Vector similarity search
        if (embedding && Array.isArray(embedding) && embedding.length === FIB_384) {
            const vecParams = contentType
                ? [`[${embedding.join(',')}]`, safeLimit, String(contentType).slice(0, 50)]
                : [`[${embedding.join(',')}]`, safeLimit];
            const vecTypeFilter = contentType ? 'AND content_type = $3' : '';

            const vecResults = await pool.query(`
        SELECT id, title, url, content_type, 1 - (embedding <=> $1::vector) as score
        FROM heady_search_index
        WHERE embedding IS NOT NULL ${vecTypeFilter}
        ORDER BY embedding <=> $1::vector LIMIT $2
      `, vecParams);

            vecResults.rows.forEach((row, rank) => {
                if (results[row.id]) {
                    results[row.id].vec_rank = rank + 1;
                    results[row.id].vec_score = row.score;
                } else {
                    results[row.id] = { ...row, vec_rank: rank + 1, vec_score: row.score };
                }
            });
        }

        // Reciprocal Rank Fusion
        const fused = Object.values(results).map(r => {
            const ftsRRF = r.fts_rank ? 1 / (RRF_K + r.fts_rank) : 0;
            const vecRRF = r.vec_rank ? 1 / (RRF_K + r.vec_rank) : 0;
            return { ...r, rrf_score: ftsRRF + vecRRF };
        });

        fused.sort((a, b) => b.rrf_score - a.rrf_score);

        res.json({
            query: query ? String(query).slice(0, 100) : undefined,
            results: fused.slice(0, safeLimit),
            total: fused.length,
            fusion: 'rrf',
            rrf_k: RRF_K,
        });
    } catch (err) {
        req.log.error({ err }, 'Search query failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Index content
app.post('/api/v1/index', async (req, res) => {
    const { title, body, url, contentType, source, metadata, embedding } = req.body;
    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'title (string) required' });
    }

    try {
        const embeddingValue = embedding && Array.isArray(embedding) && embedding.length === FIB_384
            ? `[${embedding.join(',')}]`
            : null;

        const { rows } = await pool.query(`
      INSERT INTO heady_search_index (title, body, url, content_type, source, metadata, embedding, search_vector)
      VALUES ($1, $2, $3, $4, $5, $6, $7::vector, to_tsvector('english', $1 || ' ' || COALESCE($2, '')))
      RETURNING id
    `, [
            String(title).slice(0, 1000),
            body ? String(body).slice(0, 50000) : null,
            url ? String(url).slice(0, 500) : null,
            contentType ? String(contentType).slice(0, 50) : null,
            source ? String(source).slice(0, 100) : null,
            JSON.stringify(metadata || {}),
            embeddingValue,
        ]);

        logger.info({ id: rows[0]?.id, contentType, source }, 'Content indexed');
        res.json({ indexed: true, id: rows[0]?.id });
    } catch (err) {
        req.log.error({ err }, 'Index operation failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});

initSearch().then(() => {
    const server = app.listen(PORT, () => {
        logger.info({ port: PORT }, 'search-service listening');
    });
    gracefulShutdown(server, logger, { pool });
}).catch((err) => {
    logger.fatal({ err }, 'Failed to start search-service');
    process.exit(1);
});

module.exports = app;
