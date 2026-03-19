/**
 * Heady™ MCP HTTP Transport
 * Supports both Streamable HTTP (POST /mcp) and SSE (/mcp/sse)
 */
'use strict';

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { RATE_LIMITS, PHI } = require('../config/phi-constants');
const { getAllServiceEndpoints } = require('../config/services');

class HttpTransport {
  constructor(protocol, port) {
    this.protocol = protocol;
    this.port = port;
    this.app = express();
    this.sseClients = new Map();
    this._setup();
  }

  _setup() {
    const app = this.app;

    // Security: Remove X-Powered-By header
    app.disable('x-powered-by');

    // Security headers
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      next();
    });

    // Middleware
    app.use(cors({
      origin: [
        /^https?:\/\/(www\.)?headysystems\.com$/,
        /^https?:\/\/(www\.)?headyme\.com$/,
        /^https?:\/\/(www\.)?headyai\.com$/,
        /^https?:\/\/(www\.)?headybuddy\.(com|org)$/,
        /^https?:\/\/(www\.)?headyconnection\.(com|org)$/,
        /^https?:\/\/(www\.)?headymcp\.com$/,
        /^https?:\/\/(www\.)?headyio\.com$/,
        /^https?:\/\/(www\.)?headybot\.com$/,
        /^https?:\/\/(www\.)?headyapi\.com$/,
        /^https?:\/\/(www\.)?headylens\.com$/,
        /^https?:\/\/(www\.)?headyfinance\.com$/,
        /^https?:\/\/admin\.headysystems\.com$/,
      ],
      credentials: true,
    }));
    app.use(express.json({ limit: '10mb' }));

    // ── Health endpoint ─────────────────────────────────────────────
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'heady-mcp-server',
        version: '5.0.0',
        uptime_ms: Date.now() - this.protocol.startTime,
        tools: this.protocol.registry.tools.length,
        phi: PHI,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Service discovery ───────────────────────────────────────────
    app.get('/services', (req, res) => {
      res.json({
        services: getAllServiceEndpoints(),
        mcp_tools: this.protocol.registry.tools.length,
      });
    });

    // ── Streamable HTTP MCP endpoint ────────────────────────────────
    app.post('/mcp', async (req, res) => {
      try {
        const request = req.body;

        // Handle batch requests
        if (Array.isArray(request)) {
          const responses = [];
          for (const r of request) {
            const resp = await this.protocol.handleRequest(r);
            if (resp) responses.push(resp);
          }
          return res.json(responses);
        }

        const response = await this.protocol.handleRequest(request);
        if (response) {
          res.json(response);
        } else {
          res.status(204).end();
        }
      } catch (err) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id || null,
          error: { code: -32603, message: err.message },
        });
      }
    });

    // ── SSE endpoint for streaming ──────────────────────────────────
    app.get('/mcp/sse', (req, res) => {
      const clientId = uuidv4();

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Send the endpoint event
      const messageUrl = `${req.protocol}://${req.get('host')}/mcp/message?sessionId=${clientId}`;
      res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);

      this.sseClients.set(clientId, res);

      req.on('close', () => {
        this.sseClients.delete(clientId);
      });
    });

    // ── SSE message receiver ────────────────────────────────────────
    app.post('/mcp/message', async (req, res) => {
      const { sessionId } = req.query;
      const sseClient = this.sseClients.get(sessionId);

      if (!sseClient) {
        return res.status(404).json({ error: 'Session not found' });
      }

      try {
        const response = await this.protocol.handleRequest(req.body);
        if (response) {
          sseClient.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
        }
        res.status(202).json({ accepted: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Tool listing shortcut ───────────────────────────────────────
    app.get('/tools', (req, res) => {
      res.json({
        tools: this.protocol.registry.tools,
        total: this.protocol.registry.tools.length,
      });
    });

    // ── MCP discovery well-known endpoint ───────────────────────────
    app.get('/.well-known/mcp.json', (req, res) => {
      res.json({
        name: 'heady-mcp-server',
        version: '5.0.0',
        description: `Heady™ Master Control Program — ${this.protocol.registry.tools.length} MCP tools`,
        endpoints: {
          streamable_http: '/mcp',
          sse: '/mcp/sse',
          health: '/health',
          tools: '/tools',
        },
        capabilities: ['tools', 'resources', 'prompts', 'logging'],
        contact: 'eric@headyconnection.org',
        homepage: 'https://headymcp.com',
      });
    });

    // ── Root landing ────────────────────────────────────────────────
    app.get('/', (req, res) => {
      const accepts = req.accepts(['html', 'json']);
      if (accepts === 'json') {
        return res.json({
          name: 'Heady™ MCP Server',
          version: '5.0.0',
          tools: this.protocol.registry.tools.length,
          endpoints: { mcp: '/mcp', sse: '/mcp/sse', health: '/health', tools: '/tools' },
        });
      }
      res.send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Heady™ MCP Server — 55 Tools, φ-Scaled Orchestration</title>
<meta name="description" content="Heady MCP Server — 55 tools for AI orchestration, memory, code generation, and analysis via Model Context Protocol.">
<meta property="og:title" content="Heady™ MCP Server">
<meta property="og:description" content="55 MCP tools for AI orchestration, memory, code generation, and analysis.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://headymcp.com">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="https://headymcp.com">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐝</text></svg>">
<style>body{font-family:system-ui;background:#0a0a0f;color:#e0e0e0;max-width:800px;margin:0 auto;padding:2rem}
h1{color:#7c5eff}a{color:#40e0d0}code{background:#1a1a2e;padding:2px 6px;border-radius:4px}
.tools{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin:1rem 0}
.tool{background:#1a1a2e;padding:0.5rem;border-radius:4px;font-size:0.85rem}</style></head>
<body>
<h1>🐝 Heady™ MCP Server v5.0.0</h1>
<p>${this.protocol.registry.tools.length} tools registered | φ-scaled orchestration | CSL gates</p>
<h2>Endpoints</h2>
<ul>
<li><code>POST /mcp</code> — Streamable HTTP (JSON-RPC)</li>
<li><code>GET /mcp/sse</code> — Server-Sent Events</li>
<li><code>GET /health</code> — Health check</li>
<li><code>GET /tools</code> — List all tools</li>
<li><code>GET /.well-known/mcp.json</code> — MCP discovery</li>
</ul>
<h2>Connect</h2>
<p>Add to <code>claude_desktop_config.json</code>:</p>
<pre><code>{
  "mcpServers": {
    "heady": {
      "command": "node",
      "args": ["path/to/services/heady-mcp-server/src/index.js"],
      "env": { "HEADY_MCP_TRANSPORT": "stdio" }
    }
  }
}</code></pre>
<h2>Tools</h2>
<div class="tools">
${this.protocol.registry.tools.map(t => `<div class="tool"><strong>${t.name}</strong><br>${t.description.slice(0, 80)}...</div>`).join('\n')}
</div>
</body></html>`);
    });
  }

  start() {
    this.app.listen(this.port, '0.0.0.0');
  }
}

module.exports = { HttpTransport };
