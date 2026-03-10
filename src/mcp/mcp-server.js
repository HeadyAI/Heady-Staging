'use strict';

const { logger } = require('../utils/logger');
const { authenticateMCP } = require('../gateway/auth');
const { rateLimiter } = require('../gateway/rate-limiter');
const { toolRegistry } = require('./tool-registry');

function setupMCPRoutes(app) {
  const mcpBase = '/mcp/v1';

  // List available tools
  app.get(`${mcpBase}/tools/list`, authenticateMCP, (req, res) => {
    res.json({ tools: toolRegistry.listTools() });
  });

  // Get tool schema
  app.get(`${mcpBase}/tools/:toolName/schema`, authenticateMCP, (req, res) => {
    const tool = toolRegistry.getTool(req.params.toolName);
    if (!tool) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Tool "${req.params.toolName}" not found` } });
    }
    res.json({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema });
  });

  // Invoke a tool
  app.post(`${mcpBase}/tools/:toolName`, authenticateMCP, rateLimiter, async (req, res, next) => {
    try {
      const tool = toolRegistry.getTool(req.params.toolName);
      if (!tool) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Tool "${req.params.toolName}" not found` } });
      }

      logger.info(`[MCP] Invoking tool: ${req.params.toolName}`);
      const result = await tool.handler(req.body.arguments || {});
      res.json({ result });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { setupMCPRoutes };
