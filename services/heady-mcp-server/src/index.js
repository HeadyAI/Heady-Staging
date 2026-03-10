#!/usr/bin/env node
/**
 * Heady™ MCP Server v5.0 — Master Control Program
 * ================================================
 * Full MCP server with 42 tools, multiple transports, φ-scaled routing
 *
 * Transports:
 *   - stdio  (default for Claude Desktop / Claude Code / Cursor)
 *   - http   (Streamable HTTP for web clients)
 *   - sse    (Server-Sent Events for legacy clients)
 *
 * Environment:
 *   HEADY_MCP_TRANSPORT=stdio|http|sse  (default: auto-detect)
 *   HEADY_MCP_PORT=3310                 (HTTP/SSE port)
 *   HEADY_SERVICE_HOST=localhost         (upstream service host)
 *   HEADY_LOG_LEVEL=info               (pino log level)
 *
 * @module services/heady-mcp-server
 * @version 5.0.0
 * @license Proprietary — HeadySystems Inc.
 */
'use strict';

const { PHI, PSI, PORTS } = require('./config/phi-constants');
const { createToolRegistry } = require('./tools/registry');
const { StdioTransport } = require('./transports/stdio');
const { HttpTransport } = require('./transports/http');
const { createLogger } = require('./middleware/logger');

const PORT = parseInt(process.env.HEADY_MCP_PORT || PORTS.MCP_SERVER, 10);
const TRANSPORT = process.env.HEADY_MCP_TRANSPORT || 'auto';

const log = createLogger('heady-mcp');

// ── Server Info ─────────────────────────────────────────────────────────────
const SERVER_INFO = {
  name: 'heady-mcp-server',
  version: '5.0.0',
  description: 'Heady™ Master Control Program — 42 MCP tools, φ-scaled autonomous orchestration',
  vendor: 'HeadySystems Inc.',
  homepage: 'https://headymcp.com',
  protocolVersion: '2024-11-05',
};

// ── MCP Protocol Handler ────────────────────────────────────────────────────
class HeadyMCPProtocol {
  constructor() {
    this.registry = createToolRegistry();
    this.startTime = Date.now();
    this.requestCount = 0;
    this.sessions = new Map();
  }

  /**
   * Handle any MCP JSON-RPC request
   */
  async handleRequest(request) {
    this.requestCount++;
    const { method, params, id } = request;

    try {
      switch (method) {
        case 'initialize':
          return this._respond(id, this._initialize(params));
        case 'initialized':
          return this._respond(id, { acknowledged: true });
        case 'tools/list':
          return this._respond(id, this._listTools(params));
        case 'tools/call':
          return this._respond(id, await this._callTool(params));
        case 'resources/list':
          return this._respond(id, this._listResources());
        case 'resources/read':
          return this._respond(id, await this._readResource(params));
        case 'prompts/list':
          return this._respond(id, this._listPrompts());
        case 'prompts/get':
          return this._respond(id, this._getPrompt(params));
        case 'ping':
          return this._respond(id, { status: 'ok', uptime: Date.now() - this.startTime });
        case 'notifications/cancelled':
          return null; // swallow
        default:
          return this._error(id, -32601, `Method not found: ${method}`);
      }
    } catch (err) {
      log.error({ err, method }, 'MCP request failed');
      return this._error(id, -32603, err.message);
    }
  }

  // ── initialize ──────────────────────────────────────────────────────
  _initialize(params) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sessions.set(sessionId, {
      clientInfo: params?.clientInfo || {},
      created: Date.now(),
    });

    return {
      protocolVersion: SERVER_INFO.protocolVersion,
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
        prompts: { listChanged: false },
        logging: {},
      },
      serverInfo: {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
      },
      instructions: `You are connected to the Heady™ Master Control Program. You have access to ${this.registry.tools.length} tools spanning intelligence, orchestration, memory, security, multi-model AI, and DevOps. Use heady_health to check system status. Use heady_search to discover capabilities.`,
    };
  }

  // ── tools/list ──────────────────────────────────────────────────────
  _listTools(params) {
    let tools = this.registry.tools;

    // Support cursor-based pagination
    if (params?.cursor) {
      const idx = parseInt(params.cursor, 10);
      tools = tools.slice(idx);
    }

    return { tools };
  }

  // ── tools/call ──────────────────────────────────────────────────────
  async _callTool(params) {
    const { name, arguments: args } = params;
    const tool = this.registry.handlers.get(name);

    if (!tool) {
      throw new Error(`Unknown tool: ${name}. Use tools/list to see available tools.`);
    }

    const start = Date.now();
    const result = await tool.handler(args || {});
    const elapsed = Date.now() - start;

    log.info({ tool: name, elapsed }, 'Tool executed');

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
      _meta: {
        elapsed_ms: elapsed,
        phi_tier: tool.phiTier,
      },
    };
  }

  // ── resources/list ──────────────────────────────────────────────────
  _listResources() {
    return {
      resources: [
        {
          uri: 'heady://system/status',
          name: 'System Status',
          description: 'Current health and status of all Heady services',
          mimeType: 'application/json',
        },
        {
          uri: 'heady://system/services',
          name: 'Service Registry',
          description: 'All registered microservices and their endpoints',
          mimeType: 'application/json',
        },
        {
          uri: 'heady://docs/architecture',
          name: 'Architecture Overview',
          description: 'Heady platform architecture documentation',
          mimeType: 'text/markdown',
        },
        {
          uri: 'heady://docs/phi-constants',
          name: 'φ Constants Reference',
          description: 'All phi-scaled constants used across the system',
          mimeType: 'application/json',
        },
      ],
    };
  }

  // ── resources/read ──────────────────────────────────────────────────
  async _readResource(params) {
    const { uri } = params;
    const { getAllServiceEndpoints } = require('./config/services');
    const { PHI, PSI, PSI2, FIB, CSL, TIMEOUTS, RATE_LIMITS } = require('./config/phi-constants');

    switch (uri) {
      case 'heady://system/status':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              status: 'operational',
              uptime_ms: Date.now() - this.startTime,
              requests_served: this.requestCount,
              tools_registered: this.registry.tools.length,
              active_sessions: this.sessions.size,
              phi: PHI,
            }, null, 2),
          }],
        };

      case 'heady://system/services':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(getAllServiceEndpoints(), null, 2),
          }],
        };

      case 'heady://docs/phi-constants':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ PHI, PSI, PSI2, FIB, CSL, TIMEOUTS, RATE_LIMITS }, null, 2),
          }],
        };

      case 'heady://docs/architecture':
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: [
              '# Heady™ Architecture',
              '',
              '## Overview',
              'Heady is a sovereign AI operating system with 50+ microservices,',
              'φ-scaled parameters, CSL (Confidence Signal Logic) gates, and',
              '3D vector memory architecture.',
              '',
              '## Core Principles',
              '1. All constants derived from φ (1.618033988749895)',
              '2. CSL replaces boolean logic with confidence-weighted gates',
              '3. Concurrent-equals: no priorities, fair queuing',
              '4. Zero-trust security throughout',
              '5. Sacred Geometry (Fibonacci) informs pool sizes',
              '',
              '## Service Categories',
              '- Intelligence: Brain, Soul, Vinci, CSL Engine',
              '- Memory: 3D Vector Memory, pgvector + HNSW',
              '- Orchestration: Conductor, HCFP, AutoFlow',
              '- Execution: Coder, Battle Arena, Buddy',
              '- Security: Guard, Auth, Zero-Trust Gateway',
              '- Multi-Model: Claude, GPT, Gemini, Groq',
              '',
              '## Patents',
              '51 provisional patents covering φ-scaled architecture,',
              'CSL gates, 3D vector memory, and autonomous orchestration.',
            ].join('\n'),
          }],
        };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  // ── prompts/list ────────────────────────────────────────────────────
  _listPrompts() {
    return {
      prompts: [
        {
          name: 'heady-system-prompt',
          description: 'Inject Heady system context into conversation',
          arguments: [
            { name: 'focus', description: 'Focus area: code, research, ops, general', required: false },
          ],
        },
        {
          name: 'heady-deep-analysis',
          description: 'Deep analysis prompt with φ-scaled reasoning',
          arguments: [
            { name: 'target', description: 'What to analyze', required: true },
          ],
        },
      ],
    };
  }

  // ── prompts/get ─────────────────────────────────────────────────────
  _getPrompt(params) {
    const { name, arguments: args } = params;

    if (name === 'heady-system-prompt') {
      return {
        description: 'Heady system context',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are connected to Heady™ — a sovereign AI OS with ${this.registry.tools.length} MCP tools. Focus: ${args?.focus || 'general'}. Use heady_health to check status, heady_search to discover capabilities, heady_memory to access persistent vector memory. All parameters are φ-scaled (φ=${PHI}).`,
          },
        }],
      };
    }

    if (name === 'heady-deep-analysis') {
      return {
        description: 'Deep analysis with φ-scaled reasoning',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Perform a deep Heady™ analysis of: ${args?.target || 'the system'}. Use heady_analyze for code/architecture analysis, heady_risks for vulnerability scanning, heady_patterns for pattern detection. Apply CSL confidence gates (INCLUDE=${PSI.toFixed(3)}, BOOST=${PHI.toFixed(3)}) to weight findings.`,
          },
        }],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  }

  // ── JSON-RPC helpers ────────────────────────────────────────────────
  _respond(id, result) {
    if (id === undefined) return null; // notification
    return { jsonrpc: '2.0', id, result };
  }

  _error(id, code, message) {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}

// ── Bootstrap ───────────────────────────────────────────────────────────────
async function main() {
  const protocol = new HeadyMCPProtocol();
  const toolCount = protocol.registry.tools.length;

  log.info({ tools: toolCount, transport: TRANSPORT, port: PORT }, '🐝 Heady™ MCP Server starting');

  // Auto-detect transport
  let transport = TRANSPORT;
  if (transport === 'auto') {
    transport = process.stdin.isTTY === false && !process.env.HEADY_MCP_PORT ? 'stdio' : 'http';
  }

  if (transport === 'stdio') {
    const stdio = new StdioTransport(protocol);
    stdio.start();
    log.info({ tools: toolCount }, '🐝 Heady™ MCP running on stdio — ready for tool calls');
  } else {
    const http = new HttpTransport(protocol, PORT);
    http.start();
    log.info({ tools: toolCount, port: PORT, transport }, `🐝 Heady™ MCP running on http://0.0.0.0:${PORT}`);
  }
}

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  main().catch((err) => {
    log.fatal({ err }, 'Fatal error');
    process.exit(1);
  });
}

module.exports = { HeadyMCPProtocol, SERVER_INFO };
