'use strict';

/**
 * mcp_server test suite
 * Uses node:test + Fastify inject() (no TCP listener needed)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

let app;

before(async () => {
    process.env.LOG_LEVEL = 'silent';
    app = require('../index.js');
    await app.ready();
});

after(async () => {
    await app.close();
});

describe('mcp_server service', () => {
    // ─── Health ─────────────────────────────────────────────────────────────────

    it('GET /health returns ok with tool count', async () => {
        const res = await app.inject({ method: 'GET', url: '/health' });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.status, 'ok');
        assert.equal(body.service, 'heady-mcp-server');
        assert.equal(body.tools, 4);
        assert.ok(body.uptime >= 0);
    });

    it('GET /health/live returns ok', async () => {
        const res = await app.inject({ method: 'GET', url: '/health/live' });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.status, 'ok');
    });

    it('GET /health/ready returns ok', async () => {
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

    // ─── MCP Tool Listing ────────────────────────────────────────────────────────

    it('GET /mcp/tools returns all registered tools', async () => {
        const res = await app.inject({ method: 'GET', url: '/mcp/tools' });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.ok(Array.isArray(body.tools));
        assert.equal(body.tools.length, 4);
        const names = body.tools.map(t => t.name);
        assert.ok(names.includes('heady_search'));
        assert.ok(names.includes('heady_store'));
        assert.ok(names.includes('heady_health'));
        assert.ok(names.includes('heady_pipeline_run'));
    });

    // ─── MCP Tool Invocation ──────────────────────────────────────────────────────

    it('POST /mcp/invoke heady_health returns status', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/mcp/invoke',
            payload: { name: 'heady_health', arguments: {} },
        });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.result.status, 'ok');
        assert.ok(body.result.uptime >= 0);
    });

    it('POST /mcp/invoke heady_search returns matches array', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/mcp/invoke',
            payload: { name: 'heady_search', arguments: { query: 'test' } },
        });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.ok(Array.isArray(body.result.matches));
    });

    it('POST /mcp/invoke heady_store returns stored confirmation', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/mcp/invoke',
            payload: { name: 'heady_store', arguments: { key: 'k', value: 'v' } },
        });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.result.stored, true);
    });

    it('POST /mcp/invoke heady_pipeline_run returns queued status', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/mcp/invoke',
            payload: { name: 'heady_pipeline_run', arguments: { task: 'test-task' } },
        });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.equal(body.result.status, 'queued');
        assert.ok(body.result.runId);
    });

    it('POST /mcp/invoke unknown tool returns 404', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/mcp/invoke',
            payload: { name: 'nonexistent_tool', arguments: {} },
        });
        assert.equal(res.statusCode, 404);
        const body = JSON.parse(res.payload);
        assert.ok(body.error.includes('nonexistent_tool'));
    });

    // ─── MCP Resources & Prompts ──────────────────────────────────────────────────

    it('GET /mcp/resources returns resource list', async () => {
        const res = await app.inject({ method: 'GET', url: '/mcp/resources' });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.ok(Array.isArray(body.resources));
        assert.ok(body.resources.length >= 2);
        assert.ok(body.resources.some(r => r.uri.startsWith('heady://')));
    });

    it('GET /mcp/prompts returns prompt list', async () => {
        const res = await app.inject({ method: 'GET', url: '/mcp/prompts' });
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.payload);
        assert.ok(Array.isArray(body.prompts));
        assert.ok(body.prompts.length >= 2);
        assert.ok(body.prompts.some(p => p.name === 'heady_analyze'));
    });
});
