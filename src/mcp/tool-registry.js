'use strict';

const { logger } = require('../utils/logger');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this._registerBuiltinTools();
  }

  register(name, description, inputSchema, handler) {
    this.tools.set(name, { name, description, inputSchema, handler });
    logger.info(`[ToolRegistry] Registered: ${name}`);
  }

  getTool(name) {
    return this.tools.get(name) || null;
  }

  listTools() {
    return Array.from(this.tools.values()).map(({ name, description, inputSchema }) => ({
      name, description, inputSchema,
    }));
  }

  _registerBuiltinTools() {
    this.register('memory_ingest', 'Store a new memory with vector embedding', {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The memory content to store' },
        metadata: { type: 'object', description: 'Optional metadata tags' },
      },
      required: ['content'],
    }, async (args) => {
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      // TODO: Wire to actual memory store + embedding pipeline
      return { success: true, id, message: `Memory stored (stub): ${args.content.slice(0, 50)}...` };
    });

    this.register('memory_query', 'Query the 3D vector memory store', {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results', default: 10 },
      },
      required: ['query'],
    }, async (args) => {
      // TODO: Wire to vector search
      return { success: true, results: [], message: `Search stub for: "${args.query}"` };
    });

    this.register('agent_list', 'List all registered agents', {
      type: 'object', properties: {},
    }, async () => {
      const agents = require('../../config/agents.json');
      return { success: true, agents: agents.agents.map(a => ({ id: a.id, name: a.name, category: a.category })) };
    });

    this.register('agent_status', 'Get status of a specific agent', {
      type: 'object',
      properties: { agentId: { type: 'string', description: 'Agent ID' } },
      required: ['agentId'],
    }, async (args) => {
      const agents = require('../../config/agents.json');
      const agent = agents.agents.find(a => a.id === args.agentId);
      if (!agent) return { success: false, error: 'Agent not found' };
      return { success: true, agent, status: 'running' };
    });

    this.register('health_check', 'Run a system health check', {
      type: 'object', properties: {},
    }, async () => {
      return { success: true, status: 'ok', uptime: process.uptime() };
    });
  }
}

const toolRegistry = new ToolRegistry();
module.exports = { toolRegistry };
