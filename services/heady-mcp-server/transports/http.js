/**
 * transports/http.js — MCP HTTP transport (Streamable HTTP + SSE)
 * Provides HTTP endpoint for MCP JSON-RPC over HTTP POST
 */
'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

class HttpTransport {
  constructor(protocol, port) {
    this.protocol = protocol;
    this.port = port;
    this.app = express();
    this._setup();
  }

  _setup() {
    this.app.use(cors());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());

    // MCP JSON-RPC endpoint
    this.app.post('/mcp', async (req, res) => {
      try {
        const response = await this.protocol.handleRequest(req.body);
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

    // Health endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        server: 'heady-mcp-server',
        version: '5.0.0',
        uptime_ms: process.uptime() * 1000,
      });
    });

    // SSE endpoint for event streaming
    this.app.get('/sse', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ type: 'connected', server: 'heady-mcp-server' })}\n\n`);
      req.on('close', () => res.end());
    });
  }

  start() {
    this.server = this.app.listen(this.port, '0.0.0.0');
  }

  stop() {
    if (this.server) this.server.close();
  }
}

module.exports = { HttpTransport };
