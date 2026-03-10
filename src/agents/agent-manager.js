'use strict';

const agentConfig = require('../../config/agents.json');
const { logger } = require('../utils/logger');

class AgentManager {
  constructor() {
    this.agents = new Map();
    this._loadAgents();
  }

  _loadAgents() {
    for (const agent of agentConfig.agents) {
      this.agents.set(agent.id, {
        ...agent,
        status: 'idle',
        lastActive: null,
        invocations: 0,
      });
    }
    logger.info(`[AgentManager] Loaded ${this.agents.size} agents`);
  }

  listAll() {
    return Array.from(this.agents.values());
  }

  getAgent(id) {
    return this.agents.get(id) || null;
  }

  getStatusAll() {
    return Array.from(this.agents.values()).map(a => ({
      id: a.id, name: a.name, status: a.status,
      category: a.category, persistent: a.persistent,
      invocations: a.invocations,
    }));
  }

  async invoke(id, payload) {
    const agent = this.agents.get(id);
    if (!agent) throw Object.assign(new Error('Agent not found'), { statusCode: 404 });

    agent.status = 'working';
    agent.lastActive = new Date().toISOString();
    agent.invocations++;
    logger.info(`[AgentManager] Invoking ${agent.name}`);

    // TODO: Route to actual agent implementation
    const result = { agent: agent.name, status: 'completed', result: `[STUB] ${agent.name} processed request` };
    agent.status = 'idle';
    return result;
  }
}

module.exports = { AgentManager };
