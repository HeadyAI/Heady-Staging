/**
 * backend/app.js — MCP Server entrypoint
 * Referenced by `npm run start:mcp` in package.json
 * Delegates to the real MCP server at src/mcp/heady-mcp-server.js
 */
'use strict';

require('../src/mcp/heady-mcp-server.js');
