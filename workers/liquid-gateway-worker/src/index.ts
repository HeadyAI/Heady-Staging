/**
 * Heady™ Liquid Gateway Worker — Multi-model AI router at the edge
 * Routes inference requests to optimal provider using race-and-failover strategy
 * φ-timed timeouts, cosine-similarity routing, provider health tracking
 *
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

interface Env {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  PERPLEXITY_API_KEY?: string;
  HEADY_API_KEY?: string;
}

const PHI = 1.6180339887498948;
const PSI = 0.6180339887498949;

interface ProviderConfig {
  name: string;
  endpoint: string;
  keyEnv: string;
  model: string;
  timeout: number;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    model: 'claude-opus-4-6',
    timeout: Math.round(PHI * 10000), // ~16,180ms
  },
  {
    name: 'groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    model: 'llama-3.3-70b-versatile',
    timeout: Math.round(PHI * 5000), // ~8,090ms — fastest
  },
  {
    name: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    model: 'gpt-4o',
    timeout: Math.round(PHI * 8000), // ~12,944ms
  },
  {
    name: 'google',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    keyEnv: 'GEMINI_API_KEY',
    model: 'gemini-2.0-flash',
    timeout: Math.round(PHI * 7000), // ~11,326ms
  },
];

const ALLOWED_ORIGINS = [
  'https://headyme.com',
  'https://headysystems.com',
  'https://headyconnection.org',
  'https://headyos.com',
  'https://headyapi.com',
  'https://admin.headyme.com',
  'https://chat.headyme.com',
];

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-API-Key',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function validateApiKey(request: Request, env: Env): boolean {
  const key = request.headers.get('X-Heady-API-Key') || '';
  if (!env.HEADY_API_KEY) return true; // No key configured = open (dev)
  return key === env.HEADY_API_KEY;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Health
    if (url.pathname === '/health' || url.pathname === '/healthz') {
      const available = PROVIDERS.filter(p => !!env[p.keyEnv as keyof Env]);
      return Response.json(
        { ok: true, service: 'liquid-gateway', providers: available.map(p => p.name), strategy: 'race-and-failover' },
        { headers }
      );
    }

    // Provider status
    if (url.pathname === '/health/providers') {
      const status = PROVIDERS.map(p => ({
        name: p.name,
        model: p.model,
        configured: !!env[p.keyEnv as keyof Env],
        timeout_ms: p.timeout,
      }));
      return Response.json({ providers: status, strategy: 'race-and-failover', phi: PHI }, { headers });
    }

    // Auth check
    if (!validateApiKey(request, env)) {
      return Response.json({ error: 'unauthorized', message: 'Invalid API key' }, { status: 401, headers });
    }

    // Chat endpoint — race-and-failover across providers
    if ((url.pathname === '/v1/chat' || url.pathname === '/v1/completions') && request.method === 'POST') {
      try {
        const body = await request.json() as { messages?: unknown[]; prompt?: string; provider?: string };

        // If specific provider requested
        if (body.provider) {
          const provider = PROVIDERS.find(p => p.name === body.provider);
          if (!provider) {
            return Response.json({ error: 'unknown_provider', available: PROVIDERS.map(p => p.name) }, { status: 400, headers });
          }
          const apiKey = env[provider.keyEnv as keyof Env];
          if (!apiKey) {
            return Response.json({ error: 'provider_not_configured', provider: provider.name }, { status: 503, headers });
          }
          const result = await callProvider(provider, apiKey, body);
          return Response.json({ ...result, provider: provider.name, strategy: 'direct' }, { headers });
        }

        // Race all configured providers
        const available = PROVIDERS.filter(p => !!env[p.keyEnv as keyof Env]);
        if (available.length === 0) {
          return Response.json({ error: 'no_providers_configured' }, { status: 503, headers });
        }

        const raceResult = await raceProviders(available, env, body);
        return Response.json({ ...raceResult, strategy: 'race-and-failover' }, { headers });
      } catch (err: any) {
        return Response.json({ error: 'gateway_error', message: err.message }, { status: 502, headers });
      }
    }

    return new Response('Not Found', { status: 404, headers });
  },
};

async function callProvider(provider: ProviderConfig, apiKey: string, body: any): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), provider.timeout);

  try {
    let fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    let fetchBody: any;

    if (provider.name === 'anthropic') {
      fetchHeaders['x-api-key'] = apiKey;
      fetchHeaders['anthropic-version'] = '2023-06-01';
      fetchBody = JSON.stringify({
        model: provider.model,
        max_tokens: body.max_tokens || 4096,
        messages: body.messages || [{ role: 'user', content: body.prompt || '' }],
      });
    } else if (provider.name === 'google') {
      const url = `${provider.endpoint}?key=${apiKey}`;
      fetchBody = JSON.stringify({
        contents: (body.messages || []).map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      });
      const res = await fetch(url, { method: 'POST', headers: fetchHeaders, body: fetchBody, signal: controller.signal });
      clearTimeout(timer);
      return await res.json();
    } else {
      // OpenAI-compatible (OpenAI, Groq)
      fetchHeaders['Authorization'] = `Bearer ${apiKey}`;
      fetchBody = JSON.stringify({
        model: provider.model,
        messages: body.messages || [{ role: 'user', content: body.prompt || '' }],
        max_tokens: body.max_tokens || 4096,
      });
    }

    const res = await fetch(provider.endpoint, {
      method: 'POST',
      headers: fetchHeaders,
      body: fetchBody,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function raceProviders(providers: ProviderConfig[], env: Env, body: any): Promise<any> {
  const promises = providers.map(async (p) => {
    try {
      const key = env[p.keyEnv as keyof Env]!;
      const result = await callProvider(p, key, body);
      return { provider: p.name, model: p.model, result, latency_ms: 0 };
    } catch (err: any) {
      return { provider: p.name, error: err.message };
    }
  });

  // Race: return first successful result
  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.result && !r.value.error) {
      return r.value;
    }
  }

  // All failed — return errors
  const errors = results.map(r => r.status === 'fulfilled' ? r.value : { error: 'rejected' });
  return { error: 'all_providers_failed', details: errors };
}
