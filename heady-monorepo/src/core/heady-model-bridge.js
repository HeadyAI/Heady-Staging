/**
 * HeadyModelBridge — Unified chat interface across all LLM providers
 * Routes to appropriate provider based on model name or environment.
 */
'use strict';

const logger = require('../utils/logger');

async function chat(messages, opts = {}) {
  const model = opts.model || process.env.HEADY_DEFAULT_MODEL || 'claude-sonnet-4-5';
  const maxTokens = opts.max_tokens || opts.maxTokens || 4096;

  // Determine provider from model name
  let provider;
  if (model.startsWith('claude')) provider = 'anthropic';
  else if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) provider = 'openai';
  else if (model.startsWith('gemini')) provider = 'google';
  else if (model.startsWith('llama') || model.startsWith('mixtral')) provider = 'groq';
  else provider = 'anthropic'; // default

  try {
    if (provider === 'anthropic') {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const systemMsg = Array.isArray(messages) ? messages.find(m => m.role === 'system') : null;
      const userMsgs = Array.isArray(messages) ? messages.filter(m => m.role !== 'system') : [{ role: 'user', content: messages }];
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemMsg?.content,
        messages: userMsgs,
        stream: false,
        ...opts,
      });
      return { content: res.content[0]?.text || '', model, provider, usage: res.usage };
    }

    if (provider === 'openai') {
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model,
        messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
        max_tokens: maxTokens,
        ...opts,
      });
      return { content: res.choices[0]?.message?.content || '', model, provider, usage: res.usage };
    }

    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model, messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }], max_tokens: maxTokens }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      return { content: data.choices?.[0]?.message?.content || '', model, provider };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (err) {
    logger.error('[HeadyModelBridge] chat error', { error: err.message, model, provider });
    throw err;
  }
}

async function embed(text, opts = {}) {
  const model = opts.model || 'text-embedding-3-small';
  const client = (() => { try { const OpenAI = require('openai'); return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); } catch { return null; } })();
  if (!client) throw new Error('OpenAI SDK required for embeddings');
  const res = await client.embeddings.create({ model, input: typeof text === 'string' ? text : text.join('\n') });
  return res.data[0]?.embedding || [];
}

module.exports = { chat, embed };
