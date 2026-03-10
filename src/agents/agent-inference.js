/**
 * Agent Inference — Multi-model AI routing for Heady agents
 * Routes to optimal provider based on agent category using CSL relevance
 *
 * Category → Provider mapping (capability-based, not priority-based):
 *   Thinker    → Anthropic (Claude) — best reasoning
 *   Builder    → Anthropic (Claude) — best code generation
 *   Creative   → OpenAI (GPT-4o) — creative flexibility
 *   Validator  → Groq (fast) — speed for evaluation loops
 *   Operations → Groq (fast) — low-latency ops tasks
 *   Assistant  → Anthropic (Claude) — conversational quality
 *
 * © 2026 HeadySystems Inc.
 */

const PHI = 1.6180339887498948;

export const PROVIDER_MAP = {
  Thinker:    { provider: 'anthropic', model: 'claude-sonnet-4-6' },
  Builder:    { provider: 'anthropic', model: 'claude-sonnet-4-6' },
  Creative:   { provider: 'openai',    model: 'gpt-4o' },
  Validator:  { provider: 'groq',      model: 'llama-3.3-70b-versatile' },
  Operations: { provider: 'groq',      model: 'llama-3.3-70b-versatile' },
  Assistant:  { provider: 'anthropic', model: 'claude-sonnet-4-6' },
};

export const PROVIDER_CONFIGS = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    format: 'anthropic',
    timeout: Math.round(PHI * 15000),
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    format: 'openai',
    timeout: Math.round(PHI * 12000),
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    format: 'openai',
    timeout: Math.round(PHI * 5000),
  },
};

export async function infer(category, systemPrompt, userMessage, opts = {}) {
  const mapping = PROVIDER_MAP[category] || PROVIDER_MAP.Thinker;
  const config = PROVIDER_CONFIGS[mapping.provider];
  const apiKey = process.env[config.keyEnv];

  if (!apiKey) {
    return { provider: mapping.provider, model: mapping.model, error: `${config.keyEnv} not configured`, fallback: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout || config.timeout);

  try {
    let headers, body;

    if (config.format === 'anthropic') {
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      };
      body = JSON.stringify({
        model: opts.model || mapping.model,
        max_tokens: opts.maxTokens || 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
    } else {
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };
      body = JSON.stringify({
        model: opts.model || mapping.model,
        max_tokens: opts.maxTokens || 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });
    }

    const res = await fetch(config.url, { method: 'POST', headers, body, signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json();

    let content = '';
    if (config.format === 'anthropic') {
      content = data.content?.[0]?.text || JSON.stringify(data);
    } else {
      content = data.choices?.[0]?.message?.content || JSON.stringify(data);
    }

    return {
      provider: mapping.provider,
      model: opts.model || mapping.model,
      content,
      usage: data.usage || null,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      provider: mapping.provider,
      model: mapping.model,
      error: err.message,
      fallback: true,
    };
  }
}
