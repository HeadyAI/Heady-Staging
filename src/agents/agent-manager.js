'use strict';

const https = require('https');
const agentConfig = require('../../config/agents.json');
const { logger } = require('../utils/logger');

// Maps agent categories to AI provider task types from config/providers.json routing
const CATEGORY_TO_TASK = {
  thinker: 'reasoning',
  builder: 'code',
  creative: 'creative',
  ops: 'validation',
  security: 'red_team',
  research: 'research',
};

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
        lastError: null,
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

    const task = CATEGORY_TO_TASK[agent.category] || 'reasoning';
    const prompt = this._buildPrompt(agent, payload);

    logger.info(`[AgentManager] Invoking ${agent.name} (${agent.category} -> ${task})`);

    try {
      const result = await this._dispatchToProvider(task, prompt, payload.options || {});
      agent.status = 'idle';
      agent.lastError = null;
      return {
        agent: agent.name,
        agentId: agent.id,
        category: agent.category,
        status: 'completed',
        result: result.result,
        metadata: result.metadata,
      };
    } catch (err) {
      agent.status = 'error';
      agent.lastError = err.message;
      logger.error(`[AgentManager] ${agent.name} invoke failed: ${err.message}`);
      throw err;
    }
  }

  _buildPrompt(agent, payload) {
    const systemContext = `You are ${agent.name}, a Heady AI agent.\nRole: ${agent.description}\nCategory: ${agent.category}`;
    const userInput = payload.prompt || payload.input || JSON.stringify(payload);
    return `${systemContext}\n\n${userInput}`;
  }

  async _dispatchToProvider(task, prompt, options) {
    const providersConfig = require('../../config/providers.json');
    const mapping = providersConfig.routing?.taskMapping?.[task] || providersConfig.routing?.fallbackChain || [];

    const dispatchers = {
      anthropic: () => this._callAnthropic(prompt, options),
      openai: () => this._callOpenAI(prompt, options),
      groq: () => this._callGroq(prompt, options),
    };

    for (const providerId of mapping) {
      const provider = providersConfig.providers.find(p => p.id === providerId);
      if (provider && process.env[provider.envKey] && dispatchers[providerId]) {
        const start = Date.now();
        const result = await dispatchers[providerId]();
        return { result, metadata: { provider: providerId, latency: Date.now() - start, task } };
      }
    }

    throw Object.assign(new Error('No AI provider available — configure at least one API key'), { statusCode: 503 });
  }

  async _callAnthropic(prompt, options) {
    const body = JSON.stringify({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const data = await this._httpsPost('api.anthropic.com', '/v1/messages', body, {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    });
    return JSON.parse(data).content?.[0]?.text || '';
  }

  async _callOpenAI(prompt, options) {
    const body = JSON.stringify({
      model: options.model || 'gpt-4o',
      max_tokens: options.maxTokens || 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const data = await this._httpsPost('api.openai.com', '/v1/chat/completions', body, {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    });
    return JSON.parse(data).choices?.[0]?.message?.content || '';
  }

  async _callGroq(prompt, options) {
    const body = JSON.stringify({
      model: options.model || 'llama-3.3-70b-versatile',
      max_tokens: options.maxTokens || 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const data = await this._httpsPost('api.groq.com', '/openai/v1/chat/completions', body, {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    });
    return JSON.parse(data).choices?.[0]?.message?.content || '';
  }

  _httpsPost(hostname, path, body, headers) {
    return new Promise((resolve, reject) => {
      const req = https.request({ hostname, path, method: 'POST', headers: {
        ...headers, 'Content-Length': Buffer.byteLength(body),
      }}, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) reject(new Error(`Provider ${hostname} returned ${res.statusCode}: ${data.slice(0, 200)}`));
          else resolve(data);
        });
      });
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('Provider request timed out')); });
      req.write(body);
      req.end();
    });
  }
}

module.exports = { AgentManager };
