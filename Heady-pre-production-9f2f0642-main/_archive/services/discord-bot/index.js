'use strict';

/**
 * @fileoverview Heady™ Discord Bot Service
 * @description Fastify-based Discord bot gateway with health endpoint,
 *              structured logging, security headers, and graceful shutdown.
 * @version 1.0.0
 */

const Fastify = require('fastify');

// ─── Configuration ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3320', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

// ─── App ───────────────────────────────────────────────────────────────────────

const app = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
        name: 'heady-discord-bot',
    },
});
const logger = app.log;

// Security headers
app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

// ─── Health ────────────────────────────────────────────────────────────────────

app.get('/health', async () => ({
    status: 'ok',
    service: 'heady-discord-bot',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
}));

app.get('/health/live', async () => ({ status: 'ok' }));
app.get('/health/ready', async () => ({
    status: DISCORD_TOKEN ? 'ok' : 'not_configured',
    reason: DISCORD_TOKEN ? null : 'DISCORD_BOT_TOKEN not set',
}));

// ─── Bot Routes (placeholder) ──────────────────────────────────────────────────

app.post('/webhook/discord', async (req, reply) => {
    // Discord webhook interaction handler
    // TODO: Implement Discord Interactions API verification and dispatch
    logger.info({ body: req.body }, 'Discord webhook received');
    return reply.status(200).send({ type: 1 }); // ACK pong
});

app.get('/bot/status', async () => ({
    connected: false,
    guilds: 0,
    note: 'Bot service scaffolded — connect discord.js client for full functionality',
}));

// ─── Server ────────────────────────────────────────────────────────────────────

async function start() {
    try {
        await app.listen({ port: PORT, host: HOST });
        logger.info({ port: PORT }, 'Heady™ Discord Bot service started');
    } catch (err) {
        logger.error(err, 'Failed to start Discord Bot service');
        process.exit(1);
    }
}

// Only auto-start when run directly (not when required by tests)
if (require.main === module) {
    // Graceful shutdown
    const shutdown = async (signal) => {
        logger.info({ signal }, 'Shutting down Discord Bot service');
        await app.close();
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    start();
}

module.exports = app;
