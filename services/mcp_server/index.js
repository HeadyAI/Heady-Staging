'use strict';

/**
 * @fileoverview Heady™ MCP Server Service
 * @description Standalone Model Context Protocol server with tool registry,
 *              resource serving, structured logging, and graceful shutdown.
 * @version 1.0.0
 */

const Fastify = require('fastify');

// ─── Configuration ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3321', 10);
const HOST = process.env.HOST || '0.0.0.0';

// ─── Tool Registry ─────────────────────────────────────────────────────────────

const MCP_TOOLS = [
    { name: 'heady_search', description: 'Search Heady vector memory', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'heady_store', description: 'Store data in Heady vector memory', inputSchema: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] } },
    { name: 'heady_health', description: 'Get Heady system health status', inputSchema: { type: 'object', properties: {} } },
    { name: 'heady_pipeline_run', description: 'Trigger an HCFullPipeline run', inputSchema: { type: 'object', properties: { task: { type: 'string' }, lane: { type: 'string', enum: ['fast', 'full', 'arena', 'learning'] } }, required: ['task'] } },
];

// ─── App ───────────────────────────────────────────────────────────────────────

const app = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
        name: 'heady-mcp-server',
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
    service: 'heady-mcp-server',
    version: '1.0.0',
    tools: MCP_TOOLS.length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
}));

app.get('/health/live', async () => ({ status: 'ok' }));
app.get('/health/ready', async () => ({ status: 'ok' }));

// ─── MCP Endpoints ─────────────────────────────────────────────────────────────

// MCP tool listing
app.get('/mcp/tools', async () => ({
    tools: MCP_TOOLS,
}));

// MCP tool invocation
app.post('/mcp/invoke', async (req, reply) => {
    const { name, arguments: args } = req.body || {};
    const tool = MCP_TOOLS.find(t => t.name === name);
    if (!tool) {
        return reply.status(404).send({ error: `Unknown tool: ${name}` });
    }

    logger.info({ tool: name, args }, 'MCP tool invoked');

    // Dispatch to tool handlers (stubs for now)
    switch (name) {
        case 'heady_health':
            return { result: { status: 'ok', uptime: process.uptime() } };
        case 'heady_search':
            return { result: { matches: [], note: 'Vector memory not yet connected' } };
        case 'heady_store':
            return { result: { stored: true, note: 'Vector memory not yet connected' } };
        case 'heady_pipeline_run':
            return { result: { runId: `run_${Date.now()}`, status: 'queued', note: 'Pipeline not yet connected' } };
        default:
            return reply.status(501).send({ error: `Tool ${name} not implemented` });
    }
});

// MCP resource listing
app.get('/mcp/resources', async () => ({
    resources: [
        { uri: 'heady://memory/vectors', name: 'Vector Memory', description: 'Heady 3D vector memory store' },
        { uri: 'heady://pipeline/status', name: 'Pipeline Status', description: 'Current HCFullPipeline state' },
    ],
}));

// MCP prompts (prompt templates)
app.get('/mcp/prompts', async () => ({
    prompts: [
        { name: 'heady_analyze', description: 'Analyze code or data using Heady intelligence' },
        { name: 'heady_explain', description: 'Explain a concept using Heady knowledge base' },
    ],
}));

// ─── Server ────────────────────────────────────────────────────────────────────

async function start() {
    try {
        await app.listen({ port: PORT, host: HOST });
        logger.info({ port: PORT, tools: MCP_TOOLS.length }, 'Heady™ MCP Server started');
    } catch (err) {
        logger.error(err, 'Failed to start MCP Server');
        process.exit(1);
    }
}

// Only auto-start when run directly (not when required by tests)
if (require.main === module) {
    // Graceful shutdown
    const shutdown = async (signal) => {
        logger.info({ signal }, 'Shutting down MCP Server');
        await app.close();
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    start();
}

module.exports = app;
