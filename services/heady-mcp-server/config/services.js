/**
 * config/services.js — Service endpoint registry
 * Referenced by resources/read handler in index.js
 */
'use strict';

const { PORTS } = require('./phi-constants');

const HOST = process.env.HEADY_SERVICE_HOST || 'localhost';

function getAllServiceEndpoints() {
  return {
    'heady-mcp-server': { host: HOST, port: PORTS.MCP_SERVER, protocol: 'stdio/http', status: 'active' },
    'heady-gateway': { host: HOST, port: PORTS.GATEWAY, protocol: 'http', status: 'configured' },
    'heady-api': { host: HOST, port: PORTS.API, protocol: 'http', status: 'configured' },
  };
}

module.exports = { getAllServiceEndpoints };
