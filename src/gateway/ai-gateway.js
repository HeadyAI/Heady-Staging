import https from 'https';
import { logger } from '../utils/logger.js';
import { rateLimiter } from './rate-limiter.js';
import { authenticateJWT } from './auth.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Provider-specific API call implementations
const PROVIDER_DISPATCH = {
  anthropic: async (prompt, options) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
    const model = options.model || 'claude-sonnet-4-20250514';
    const body = JSON.stringify({
      model,
      max_tokens: options.maxTokens || 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const data = await httpsPost('api.anthropic.com', '/v1/messages', body, {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    });
    const parsed = JSON.parse(data);
    return {
      result: parsed.content?.[0]?.text || '',
      model: parsed.model,
      tokens: parsed.usage ? parsed.usage.input_tokens + parsed.usage.output_tokens : 0,
    };
  },

  openai: async (prompt, options) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not configured');
    const model = options.model || 'gpt-4o';
    const body = JSON.stringify({
      model,
      max_tokens: options.maxTokens || 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const data = await httpsPost('api.openai.com', '/v1/chat/completions', body, {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    });
    const parsed = JSON.parse(data);
    return {
      result: parsed.choices?.[0]?.message?.content || '',
      model: parsed.model,
      tokens: parsed.usage ? parsed.usage.total_tokens : 0,
    };
  },

  groq: async (prompt, options) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY not configured');
    const model = options.model || 'llama-3.3-70b-versatile';
    const body = JSON.stringify({
      model,
      max_tokens: options.maxTokens || 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const data = await httpsPost('api.groq.com', '/openai/v1/chat/completions', body, {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    });
    const parsed = JSON.parse(data);
    return {
      result: parsed.choices?.[0]?.message?.content || '',
      model: parsed.model,
      tokens: parsed.usage ? parsed.usage.total_tokens : 0,
    };
  },
};

function httpsPost(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'POST', headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Provider returned ${res.statusCode}: ${data.slice(0, 200)}`));
        } else {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Provider request timed out')); });
    req.write(body);
    req.end();
  });
}

function selectProvider(task, providers) {
  const mapping = providers.routing?.taskMapping?.[task] || providers.routing?.fallbackChain || [];
  for (const providerId of mapping) {
    const provider = providers.providers.find(p => p.id === providerId);
    if (provider && process.env[provider.envKey]) {
      return provider;
    }
  }
  return null;
}

function setupGateway(app) {
  app.post('/api/ai/route', authenticateJWT, rateLimiter, async (req, res, next) => {
    try {
      const { task, prompt, options = {} } = req.body;
      if (!task || !prompt) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'task and prompt are required' } });
      }
      const providers = require('../../config/providers.json');
      const selected = selectProvider(task, providers);

      if (!selected) {
        return res.status(503).json({ error: { code: 'NO_PROVIDER', message: 'No AI provider available with a configured API key' } });
      }

      const dispatch = PROVIDER_DISPATCH[selected.id];
      if (!dispatch) {
        return res.status(503).json({ error: { code: 'UNSUPPORTED_PROVIDER', message: `Provider "${selected.id}" dispatch not implemented` } });
      }

      logger.info(`[AIGateway] Routing "${task}" to ${selected.name} (${selected.id})`);
      const start = Date.now();
      const result = await dispatch(prompt, options);
      const latency = Date.now() - start;

      res.json({
        provider: selected.id,
        task,
        result: result.result,
        metadata: { latency, model: result.model, tokens: result.tokens },
      });
    } catch (err) {
      logger.error(`[AIGateway] Provider error: ${err.message}`);
      next(err);
    }
  });

  // ── HeadyBuddy Chat — simplified endpoint for chat widget ──
  app.post('/api/ai/chat', async (req, res, next) => {
    try {
      const { message, session, site, host, model } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'message is required' });
      }

      // System prompt for HeadyBuddy
      const systemPrompt = `You are HeadyBuddy, the AI companion for ${site || 'Heady'}. You are helpful, concise, and knowledgeable about everything in the Heady™ ecosystem. Keep responses brief (1-3 sentences) unless asked for detail. Be warm and personal.`;
      const fullPrompt = `${systemPrompt}\n\nUser: ${message}\n\nHeadyBuddy:`;

      // Auto-select provider: prefer Groq (fast), then OpenAI, then Anthropic
      const providerOrder = ['groq', 'openai', 'anthropic'];
      let result = null;
      let usedProvider = null;

      for (const providerId of providerOrder) {
        const dispatch = PROVIDER_DISPATCH[providerId];
        if (!dispatch) continue;
        try {
          result = await dispatch(fullPrompt, { maxTokens: 256, model: model === 'auto' ? undefined : model });
          usedProvider = providerId;
          break;
        } catch (err) {
          logger.warn(`[AIGateway] Chat: ${providerId} unavailable (${err.message})`);
          continue;
        }
      }

      if (!result) {
        return res.status(503).json({ error: 'No AI provider available. Check API keys.', response: `I'm running in local mode on ${site || 'Heady'}. Connect an AI provider key to enable full cloud chat.` });
      }

      res.json({
        response: result.result,
        provider: usedProvider,
        model: result.model,
        tokens: result.tokens,
        site,
      });
    } catch (err) {
      logger.error(`[AIGateway] Chat error: ${err.message}`);
      next(err);
    }
  });

  // Provider status — never leak env key names
  app.get('/api/ai/providers', (req, res) => {
    const providers = require('../../config/providers.json');
    const withStatus = providers.providers.map(p => ({
      id: p.id,
      name: p.name,
      models: p.models,
      priority: p.priority,
      strengths: p.strengths,
      rateLimit: p.rateLimit,
      available: !!process.env[p.envKey],
    }));
    res.json({ providers: withStatus, routing: providers.routing });
  });
}

export { setupGateway };