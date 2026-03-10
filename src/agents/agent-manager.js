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
    logger.info(`[AgentManager] Invoking ${agent.name} (${agent.category})`);

    try {
      // Dynamic import of the agent's ESM module
      const agentFile = `./heady-${id.replace('heady-', '')}.js`;
      const agentModule = await import(agentFile);
      const AgentClass = Object.values(agentModule).find(v => typeof v === 'function' && v.prototype?.run);

      if (AgentClass) {
        const instance = new AgentClass();
        const result = await instance.execute(payload);
        agent.status = 'idle';
        return { agent: agent.name, status: 'completed', ...result };
      }

      // Fallback: use inference directly for agents without dedicated class
      const { infer } = await import('./agent-inference.js');
      const systemPrompt = `You are ${agent.name}, a ${agent.category} agent. Mission: ${agent.mission}. Respond with actionable results.`;
      const userMessage = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const result = await infer(agent.category, systemPrompt, userMessage);
      agent.status = 'idle';
      return { agent: agent.name, status: 'completed', ...result };
    } catch (err) {
      agent.status = 'error';
      logger.error(`[AgentManager] ${agent.name} failed: ${err.message}`);
      throw err;
    }
  }
}

module.exports = { AgentManager };
