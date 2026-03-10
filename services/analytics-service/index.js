/**
 * Heady™ Analytics Service — Privacy-First, Self-Hosted
 * Usage analytics, funnel tracking, conversion metrics
 * NOT Google Analytics — all data stays in pgvector
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */

'use strict';

const express = require('express');
const { Pool } = require('pg');
const { createLogger, requestLogger } = require('../../shared/logger');
const { securityHeaders, gracefulShutdown } = require('../../shared/security-headers');

const app = express();
const PORT = process.env.SERVICE_PORT || 3394;
const PHI = 1.618033988749895;
const FIB_34 = 34;
const FIB_55 = 55;
const FIB_13 = 13;

const logger = createLogger({ service: 'analytics-service', domain: 'data' });

app.use(express.json({ limit: '1mb' }));
app.use(securityHeaders());
app.use(requestLogger(logger));

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'heady_vector',
    user: process.env.PGUSER || 'heady',
    password: process.env.PGPASSWORD,
    max: FIB_34,
    idleTimeoutMillis: FIB_55 * 1000,
});

pool.on('error', (err) => logger.error({ err }, 'Unexpected pool error'));

async function initTables() {
    try {
        await pool.query(`
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
      CREATE INDEX IF NOT EXISTS idx_events_session ON heady_events(session_id);
    `);
        logger.info('Analytics tables initialized');
    } catch (err) {
        logger.error({ err }, 'Failed to initialize analytics tables');
        throw err;
    }
}

// Health check
app.get('/health', (_, res) => res.json({
    status: 'healthy',
    service: 'analytics-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
}));

// Track event
app.post('/api/v1/events', async (req, res) => {
    const { eventType, sessionId, userId, domain, path, referrer, properties } = req.body;

    if (!eventType || typeof eventType !== 'string') {
        return res.status(400).json({ error: 'eventType (string) required' });
    }
    if (eventType.length > 100) {
        return res.status(400).json({ error: 'eventType exceeds 100 characters' });
    }

    const userAgent = (req.headers['user-agent'] || '').slice(0, 500);
    const country = (req.headers['cf-ipcountry'] || '').slice(0, 2);

    try {
        await pool.query(
            `INSERT INTO heady_events (event_type, session_id, user_id, domain, path, referrer, user_agent, country, properties)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                eventType.slice(0, 100),
                sessionId ? String(sessionId).slice(0, 64) : null,
                userId ? String(userId).slice(0, 128) : null,
                domain ? String(domain).slice(0, 100) : null,
                path ? String(path).slice(0, 500) : null,
                referrer ? String(referrer).slice(0, 500) : null,
                userAgent,
                country,
                JSON.stringify(properties || {}),
            ]
        );
        res.json({ tracked: true });
    } catch (err) {
        req.log.error({ err }, 'Failed to track event');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get metrics for a domain
app.get('/api/v1/metrics/:domain', async (req, res) => {
    const { domain } = req.params;
    const hours = Math.min(Math.max(parseInt(req.query.hours) || 24, 1), 8760);

    try {
        const [pageviews, uniqueSessions, topPaths, eventBreakdown] = await Promise.all([
            pool.query(`SELECT COUNT(*) as count FROM heady_events WHERE domain = $1 AND event_type = 'pageview' AND created_at > NOW() - make_interval(hours => $2)`, [domain, hours]),
            pool.query(`SELECT COUNT(DISTINCT session_id) as count FROM heady_events WHERE domain = $1 AND created_at > NOW() - make_interval(hours => $2)`, [domain, hours]),
            pool.query(`SELECT path, COUNT(*) as views FROM heady_events WHERE domain = $1 AND event_type = 'pageview' AND created_at > NOW() - make_interval(hours => $2) GROUP BY path ORDER BY views DESC LIMIT $3`, [domain, hours, FIB_13]),
            pool.query(`SELECT event_type, COUNT(*) as count FROM heady_events WHERE domain = $1 AND created_at > NOW() - make_interval(hours => $2) GROUP BY event_type ORDER BY count DESC`, [domain, hours]),
        ]);

        res.json({
            domain,
            period: `${hours}h`,
            pageviews: parseInt(pageviews.rows[0]?.count || 0),
            uniqueSessions: parseInt(uniqueSessions.rows[0]?.count || 0),
            topPaths: topPaths.rows,
            eventBreakdown: eventBreakdown.rows,
        });
    } catch (err) {
        req.log.error({ err, domain }, 'Failed to fetch metrics');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Funnel analysis
app.post('/api/v1/funnels', async (req, res) => {
    const { domain, steps, hours = 24 } = req.body;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ error: 'steps (string[]) required' });
    }
    if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ error: 'domain (string) required' });
    }

    const sanitizedHours = Math.min(Math.max(parseInt(hours) || 24, 1), 8760);

    try {
        const results = [];
        for (const step of steps.slice(0, FIB_13)) {
            const { rows } = await pool.query(
                `SELECT COUNT(DISTINCT session_id) as sessions FROM heady_events WHERE domain = $1 AND event_type = $2 AND created_at > NOW() - make_interval(hours => $3)`,
                [domain, String(step), sanitizedHours]
            );
            results.push({ step: String(step), sessions: parseInt(rows[0]?.sessions || 0) });
        }
        res.json({ domain, funnel: results });
    } catch (err) {
        req.log.error({ err, domain }, 'Funnel query failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
initTables().then(() => {
    const server = app.listen(PORT, () => {
        logger.info({ port: PORT }, 'analytics-service listening');
    });
    gracefulShutdown(server, logger, { pool });
}).catch((err) => {
    logger.fatal({ err }, 'Failed to start analytics-service');
    process.exit(1);
});

module.exports = app; // For testing
