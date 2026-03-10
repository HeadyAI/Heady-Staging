/**
 * Heady™ Connection Pool Wrapper for pgvector
 * Fibonacci-scaled pool sizes, health-checked connections
 * Auto-connects through PgBouncer when available
 * © 2026 HeadySystems Inc.
 */

const { Pool } = require('pg');

const PHI = 1.618033988749895;

// Fibonacci-scaled pool parameters
const POOL_CONFIG = {
    max: 34,                              // Fibonacci — max pool connections
    min: 5,                               // Fibonacci — minimum idle connections
    idleTimeoutMillis: 55 * 1000,         // Fibonacci — close idle connections after 55s
    connectionTimeoutMillis: Math.round(PHI * PHI * 1000), // φ² ≈ 2618ms
    allowExitOnIdle: false,
    statement_timeout: 21 * 1000,         // Fibonacci — kill queries after 21s
};

function createPool(options = {}) {
    const config = {
        host: options.host || process.env.PGHOST || 'localhost',
        port: options.port || process.env.PGPORT || 6432, // PgBouncer default
        database: options.database || process.env.PGDATABASE || 'heady_vector',
        user: options.user || process.env.PGUSER || 'heady',
        password: options.password || process.env.PGPASSWORD,
        ...POOL_CONFIG,
        ...options,
    };

    const pool = new Pool(config);

    // Connection health monitoring
    pool.on('error', (err) => {
        console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            service: options.serviceName || 'unknown',
            message: 'pg_pool_error',
            error: err.message,
        }));
    });

    pool.on('connect', (client) => {
        // Set pgvector search params for HNSW
        client.query("SET hnsw.ef_search = 100"); // Optimal for recall > 0.95
    });

    // Health check function
    pool.healthCheck = async () => {
        try {
            const result = await pool.query('SELECT 1 as ok, NOW() as time');
            return { healthy: true, time: result.rows[0].time, poolSize: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
        } catch (err) {
            return { healthy: false, error: err.message };
        }
    };

    return pool;
}

module.exports = { createPool, POOL_CONFIG };
