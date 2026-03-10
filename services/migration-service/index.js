/**
 * Heady™ Migration Service — Database Schema Versioning
 * Runs pgvector migrations with rollback support
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */

'use strict';

const express = require('express');
const { Pool } = require('pg');
const { createLogger, requestLogger } = require('../../shared/logger');
const { securityHeaders, gracefulShutdown } = require('../../shared/security-headers');

const app = express();
const PORT = process.env.SERVICE_PORT || 3398;
const FIB_8 = 8;

const logger = createLogger({ service: 'migration-service', domain: 'data' });

app.use(express.json({ limit: '256kb' }));
app.use(securityHeaders());
app.use(requestLogger(logger));

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT) || 6432,
    database: process.env.PGDATABASE || 'heady_vector',
    user: process.env.PGUSER || 'heady',
    password: process.env.PGPASSWORD,
    max: FIB_8, // Migrations are low-concurrency
});

pool.on('error', (err) => logger.error({ err }, 'Unexpected pool error'));

async function initMigrationTable() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS heady_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        rolled_back_at TIMESTAMPTZ,
        checksum VARCHAR(64)
      );
    `);
        logger.info('Migration table initialized');
    } catch (err) {
        logger.error({ err }, 'Failed to initialize migration table');
        throw err;
    }
}

// Built-in migrations
const MIGRATIONS = [
    {
        version: '001',
        name: 'create_vector_extension',
        up: `CREATE EXTENSION IF NOT EXISTS vector;`,
        down: `-- Cannot safely drop vector extension`,
    },
    {
        version: '002',
        name: 'create_embeddings_table',
        up: `
      CREATE TABLE IF NOT EXISTS heady_embeddings (
        id BIGSERIAL PRIMARY KEY,
        content_hash VARCHAR(64) NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        source VARCHAR(100),
        embedding vector(384) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_embeddings_hash ON heady_embeddings(content_hash);
    `,
        down: `DROP TABLE IF EXISTS heady_embeddings;`,
    },
    {
        version: '003',
        name: 'create_hnsw_index',
        up: `CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON heady_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 32, ef_construction = 200);`,
        down: `DROP INDEX IF EXISTS idx_embeddings_hnsw;`,
    },
    {
        version: '004',
        name: 'create_sessions_table',
        up: `
      CREATE TABLE IF NOT EXISTS heady_sessions (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON heady_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON heady_sessions(expires_at);
    `,
        down: `DROP TABLE IF EXISTS heady_sessions;`,
    },
    {
        version: '005',
        name: 'create_analytics_events',
        up: `
      CREATE TABLE IF NOT EXISTS heady_events (
        id BIGSERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        session_id VARCHAR(64),
        user_id VARCHAR(128),
        domain VARCHAR(100),
        path VARCHAR(500),
        referrer VARCHAR(500),
        user_agent VARCHAR(500),
        country VARCHAR(2),
        properties JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_events_type ON heady_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_domain ON heady_events(domain);
      CREATE INDEX IF NOT EXISTS idx_events_created ON heady_events(created_at);
    `,
        down: `DROP TABLE IF EXISTS heady_events;`,
    },
    {
        version: '006',
        name: 'create_search_index',
        up: `
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
    `,
        down: `DROP TABLE IF EXISTS heady_search_index;`,
    },
    {
        version: '007',
        name: 'create_notifications_table',
        up: `
      CREATE TABLE IF NOT EXISTS heady_notifications (
        id BIGSERIAL PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200),
        message TEXT,
        data JSONB DEFAULT '{}',
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON heady_notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_unread ON heady_notifications(user_id) WHERE read_at IS NULL;
    `,
        down: `DROP TABLE IF EXISTS heady_notifications;`,
    },
];

// Health check
app.get('/health', (_, res) => res.json({
    status: 'healthy',
    service: 'migration-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
}));

// Run pending migrations
app.post('/api/v1/migrate', async (req, res) => {
    const applied = [];

    try {
        const { rows: existing } = await pool.query(
            `SELECT version FROM heady_migrations WHERE rolled_back_at IS NULL`
        );
        const appliedVersions = new Set(existing.map(r => r.version));

        for (const migration of MIGRATIONS) {
            if (appliedVersions.has(migration.version)) continue;

            try {
                await pool.query('BEGIN');
                await pool.query(migration.up);
                await pool.query(
                    `INSERT INTO heady_migrations (version, name) VALUES ($1, $2)`,
                    [migration.version, migration.name]
                );
                await pool.query('COMMIT');
                applied.push({ version: migration.version, name: migration.name });
                logger.info({ version: migration.version, name: migration.name }, 'Migration applied');
            } catch (err) {
                await pool.query('ROLLBACK');
                logger.error({ err, version: migration.version }, 'Migration failed');
                return res.status(500).json({
                    error: `Migration ${migration.version} failed: ${err.message}`,
                    applied,
                });
            }
        }

        res.json({ applied, total: applied.length });
    } catch (err) {
        logger.error({ err }, 'Migration check failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rollback last migration
app.post('/api/v1/rollback', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM heady_migrations WHERE rolled_back_at IS NULL ORDER BY id DESC LIMIT 1`
        );
        if (!rows.length) return res.json({ message: 'Nothing to rollback' });

        const last = rows[0];
        const migration = MIGRATIONS.find(m => m.version === last.version);
        if (!migration) {
            return res.status(404).json({ error: `Migration ${last.version} not found in registry` });
        }

        await pool.query('BEGIN');
        await pool.query(migration.down);
        await pool.query(
            `UPDATE heady_migrations SET rolled_back_at = NOW() WHERE version = $1`,
            [last.version]
        );
        await pool.query('COMMIT');
        logger.info({ version: last.version, name: last.name }, 'Migration rolled back');
        res.json({ rolledBack: { version: last.version, name: last.name } });
    } catch (err) {
        await pool.query('ROLLBACK').catch(() => { });
        logger.error({ err }, 'Rollback failed');
        res.status(500).json({ error: `Rollback failed: ${err.message}` });
    }
});

// Status
app.get('/api/v1/status', async (_, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM heady_migrations ORDER BY id`);
        const pending = MIGRATIONS.filter(
            m => !rows.find(r => r.version === m.version && !r.rolled_back_at)
        ).length;
        res.json({ migrations: rows, pending, totalDefined: MIGRATIONS.length });
    } catch (err) {
        logger.error({ err }, 'Status check failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});

initMigrationTable().then(() => {
    const server = app.listen(PORT, () => {
        logger.info({ port: PORT, totalMigrations: MIGRATIONS.length }, 'migration-service listening');
    });
    gracefulShutdown(server, logger, { pool });
}).catch((err) => {
    logger.fatal({ err }, 'Failed to start migration-service');
    process.exit(1);
});

module.exports = app;
