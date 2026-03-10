'use strict';

/**
 * discord-bot test suite
 * Uses node:test + Fastify inject() (no TCP listener needed)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

let app;

before(async () => {
    process.env.LOG_LEVEL = 'silent';
    process.env.DISCORD_BOT_TOKEN = 'test-token-12345';
    app = require('../index.js');
    await app.ready();
});

after(async () => {
    await app.close();
});

describe('discord-bot service', () => {
    // ─── Health Checks ──────────────────────────────────────────────────────────

    it('GET /health returns healthy status', async () => {
        const res = await app.inject({ method: 'GET', url: '/health' });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.status, 'ok');
        assert.equal(body.service, 'heady-discord-bot');
        assert.equal(body.version, '1.0.0');
        assert.ok(body.uptime >= 0);
        assert.ok(body.timestamp);
    });

    it('GET /health/live returns ok', async () => {
        const res = await app.inject({ method: 'GET', url: '/health/live' });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.status, 'ok');
    });

    it('GET /health/ready returns ok when token is set', async () => {
        const res = await app.inject({ method: 'GET', url: '/health/ready' });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.status, 'ok');
    });

    // ─── Security Headers ────────────────────────────────────────────────────────

    it('responses include security headers', async () => {
        const res = await app.inject({ method: 'GET', url: '/health' });
        assert.equal(res.headers['x-content-type-options'], 'nosniff');
        assert.equal(res.headers['x-frame-options'], 'DENY');
        assert.ok(res.headers['strict-transport-security']?.includes('max-age='));
    });

    // ─── Webhook Endpoint ────────────────────────────────────────────────────────

    it('POST /webhook/discord returns ACK pong (type: 1)', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/webhook/discord',
            payload: { type: 1 },
        });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.type, 1);
    });

    // ─── Bot Status ───────────────────────────────────────────────────────────────

    it('GET /bot/status returns scaffold status', async () => {
        const res = await app.inject({ method: 'GET', url: '/bot/status' });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.connected, false);
        assert.equal(body.guilds, 0);
        assert.ok(body.note);
    });
});
