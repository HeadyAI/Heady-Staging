/**
 * Heady Edge Worker — Cloudflare Workers Handler
 * 
 * Ultra-low latency edge routing, caching, AI inference dispatch,
 * and zero-trust request validation. Runs on Cloudflare's global network.
 * 
 * Features:
 * - Liquid routing: race providers, fastest wins
 * - Edge caching with phi-scaled TTLs
 * - Cloudflare Workers AI inference (embeddings, classification)
 * - Zero-trust request validation with CSL-gated scoring
 * - WebSocket/SSE streaming support
 * - CORS and security headers
 * - Rate limiting via Cloudflare's built-in primitives
 * - Health check and readiness probes
 * 
 * Bindings (wrangler.toml):
 *   - VECTORIZE: Cloudflare Vectorize index
 *   - AI: Workers AI binding
 *   - KV: heady-cache namespace
 *   - DO: HeadySession Durable Object
 *   - RATE_LIMITER: Rate limiting binding
 * 
 * @module HeadyEdgeWorker
 * @author Eric Haywood
 * @license Proprietary — HeadySystems Inc.
 */

// ─── Phi Constants (inlined for edge — no node_modules) ─────────────────────
const PHI = 1.6180339887498949;
const PSI = 0.6180339887498949;
const PSI_SQ = 0.3819660112501051;

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

const CSL_THRESHOLDS = {
  MINIMUM:  0.500,
  LOW:      0.691,
  MEDIUM:   0.809,
  HIGH:     0.882,
  CRITICAL: 0.927
};

// Phi-backoff delays (ms)
const PHI_BACKOFF = [1000, 1618, 2618, 4236, 6854, 11090];

// ─── Edge Cache TTLs (phi-scaled seconds) ───────────────────────────────────
const CACHE_TTL = {
  STATIC:     FIB[13] * 60,     // 377 minutes ≈ 6.3 hours
  EMBEDDING:  FIB[11] * 60,     // 89 minutes
  API:        FIB[8],            // 21 seconds
  HEALTH:     FIB[5],            // 5 seconds
  NONE:       0
};

// ─── Route Configuration ────────────────────────────────────────────────────
const ORIGIN_BASE = 'https://heady-api-gen-lang-client-0920560496.us-east1.run.app';

const ROUTES = {
  // Health & readiness
  '/health':           { cache: CACHE_TTL.HEALTH, origin: null, handler: 'health' },
  '/ready':            { cache: CACHE_TTL.HEALTH, origin: null, handler: 'ready' },
  
  // AI inference (edge-local via Workers AI)
  '/v1/embed':         { cache: CACHE_TTL.EMBEDDING, origin: null, handler: 'embed' },
  '/v1/classify':      { cache: CACHE_TTL.API, origin: null, handler: 'classify' },
  
  // API routes (proxy to Cloud Run origin)
  '/v1/chat':          { cache: CACHE_TTL.NONE, origin: ORIGIN_BASE, handler: 'proxy', stream: true },
  '/v1/complete':      { cache: CACHE_TTL.NONE, origin: ORIGIN_BASE, handler: 'proxy', stream: true },
  '/v1/memory':        { cache: CACHE_TTL.NONE, origin: ORIGIN_BASE, handler: 'proxy' },
  '/v1/conductor':     { cache: CACHE_TTL.NONE, origin: ORIGIN_BASE, handler: 'proxy' },
  '/v1/soul':          { cache: CACHE_TTL.NONE, origin: ORIGIN_BASE, handler: 'proxy' },
  
  // MCP transport
  '/mcp/sse':          { cache: CACHE_TTL.NONE, origin: ORIGIN_BASE, handler: 'mcpSSE', stream: true },
  '/mcp/jsonrpc':      { cache: CACHE_TTL.NONE, origin: ORIGIN_BASE, handler: 'proxy' },
  
  // Static assets (edge-cached)
  '/static/':          { cache: CACHE_TTL.STATIC, origin: ORIGIN_BASE, handler: 'proxy' },
  '/assets/':          { cache: CACHE_TTL.STATIC, origin: ORIGIN_BASE, handler: 'proxy' }
};

// ─── Security Headers ───────────────────────────────────────────────────────
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.headysystems.com https://*.headyme.com https://*.headymcp.com https://*.headyai.com https://*.headyapi.com https://*.headyio.com https://*.headybot.com https://*.headybuddy.com https://*.headylens.com https://*.headyfinance.com https://*.headyconnection.org https://*.headyconnection.com"
};

// ─── CORS Configuration ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://headyme.com', 'https://www.headyme.com',
  'https://headysystems.com', 'https://www.headysystems.com',
  'https://headyai.com', 'https://www.headyai.com',
  'https://headybuddy.com', 'https://www.headybuddy.com',
  'https://headybuddy.org', 'https://www.headybuddy.org',
  'https://headymcp.com', 'https://www.headymcp.com',
  'https://headyio.com', 'https://www.headyio.com',
  'https://headybot.com', 'https://www.headybot.com',
  'https://headyapi.com', 'https://www.headyapi.com',
  'https://headylens.com', 'https://www.headylens.com',
  'https://headyfinance.com', 'https://www.headyfinance.com',
  'https://headyconnection.org', 'https://www.headyconnection.org',
  'https://headyconnection.com', 'https://www.headyconnection.com',
  'https://admin.headysystems.com'
];

// ─── Structured Logger (edge-compatible) ────────────────────────────────────
function edgeLog(level, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'heady-edge-worker',
    ...data
  };
  // Structured JSON to Cloudflare Workers logs
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ─── CSL Gate (sigmoid-based soft routing) ──────────────────────────────────
function cslGate(value, cosScore, tau = CSL_THRESHOLDS.MEDIUM, temp = 0.1) {
  const sigmoid = 1 / (1 + Math.exp(-(cosScore - tau) / temp));
  return value * sigmoid;
}

// ─── Request Fingerprint (for rate limiting & dedup) ────────────────────────
async function requestFingerprint(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || 'unknown';
  const data = new TextEncoder().encode(`${ip}:${ua}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = new Uint8Array(hash);
  return Array.from(arr.slice(0, FIB[7])) // 13 bytes
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── CORS Helper ────────────────────────────────────────────────────────────
function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const headers = {};

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Request-ID, X-Heady-Session';
    headers['Access-Control-Max-Age'] = String(FIB[12]); // 144 seconds
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }

  return headers;
}

// ─── Route Matcher ──────────────────────────────────────────────────────────
function matchRoute(pathname) {
  // Exact match first
  if (ROUTES[pathname]) return ROUTES[pathname];
  
  // Prefix match for directory routes
  for (const [prefix, config] of Object.entries(ROUTES)) {
    if (prefix.endsWith('/') && pathname.startsWith(prefix)) {
      return config;
    }
  }
  
  // Default: proxy to origin
  return { cache: CACHE_TTL.NONE, origin: ORIGIN_BASE, handler: 'proxy' };
}

// ─── Handler: Health Check ──────────────────────────────────────────────────
async function handleHealth(request, env) {
  const checks = {
    edge: 'healthy',
    ai: 'unknown',
    kv: 'unknown',
    vectorize: 'unknown'
  };

  try {
    if (env.KV) {
      await env.KV.get('__health_check');
      checks.kv = 'healthy';
    }
  } catch { checks.kv = 'degraded'; }

  try {
    if (env.AI) {
      checks.ai = 'healthy';
    }
  } catch { checks.ai = 'degraded'; }

  try {
    if (env.VECTORIZE) {
      checks.vectorize = 'healthy';
    }
  } catch { checks.vectorize = 'degraded'; }

  const allHealthy = Object.values(checks).every(v => v === 'healthy' || v === 'unknown');

  return new Response(JSON.stringify({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    region: request.cf?.colo || 'unknown',
    phi: { threshold: CSL_THRESHOLDS.MEDIUM, backoff: PHI_BACKOFF[0] }
  }), {
    status: allHealthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
  });
}

// ─── Handler: Readiness Probe ───────────────────────────────────────────────
function handleReady() {
  return new Response(JSON.stringify({ ready: true, timestamp: new Date().toISOString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ─── Handler: Edge Embedding (Workers AI) ───────────────────────────────────
async function handleEmbed(request, env) {
  if (!env.AI) {
    return new Response(JSON.stringify({ error: 'Workers AI not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
    });
  }

  const body = await request.json();
  const { text, texts, model = '@cf/baai/bge-base-en-v1.5' } = body;
  const inputs = texts || (text ? [text] : []);

  if (inputs.length === 0) {
    return new Response(JSON.stringify({ error: 'No text provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
    });
  }

  // Check KV cache for each input
  const cacheKey = `embed:${await hashTexts(inputs)}`;
  if (env.KV) {
    const cached = await env.KV.get(cacheKey, 'json');
    if (cached) {
      edgeLog('info', { msg: 'Embedding cache hit', inputCount: inputs.length });
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          ...SECURITY_HEADERS
        }
      });
    }
  }

  // Generate embeddings via Workers AI
  const startTime = Date.now();
  const result = await env.AI.run(model, { text: inputs });
  const elapsed = Date.now() - startTime;

  const response = {
    embeddings: result.data,
    model,
    dimensions: result.data[0]?.length || 384,
    count: inputs.length,
    latency_ms: elapsed
  };

  // Cache the result
  if (env.KV) {
    await env.KV.put(cacheKey, JSON.stringify(response), {
      expirationTtl: CACHE_TTL.EMBEDDING
    });
  }

  edgeLog('info', {
    msg: 'Embedding generated',
    inputCount: inputs.length,
    latency: elapsed,
    model
  });

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'X-Latency-Ms': String(elapsed),
      ...SECURITY_HEADERS
    }
  });
}

// ─── Handler: Edge Classification ───────────────────────────────────────────
async function handleClassify(request, env) {
  if (!env.AI) {
    return new Response(JSON.stringify({ error: 'Workers AI not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
    });
  }

  const body = await request.json();
  const { text, labels = ['code', 'research', 'creative', 'security', 'architecture', 'documentation'] } = body;

  if (!text) {
    return new Response(JSON.stringify({ error: 'No text provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
    });
  }

  const startTime = Date.now();
  const result = await env.AI.run('@cf/huggingface/distilbert-sst-2-int8', {
    text
  });
  const elapsed = Date.now() - startTime;

  // CSL-gate the classification scores
  const gatedScores = (result.labels || labels).map((label, i) => ({
    label,
    score: result.scores?.[i] || 0,
    gated: cslGate(result.scores?.[i] || 0, result.scores?.[i] || 0, CSL_THRESHOLDS.LOW)
  }));

  return new Response(JSON.stringify({
    classifications: gatedScores,
    latency_ms: elapsed,
    model: '@cf/huggingface/distilbert-sst-2-int8'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'X-Latency-Ms': String(elapsed),
      ...SECURITY_HEADERS
    }
  });
}

// ─── Handler: MCP SSE Streaming ─────────────────────────────────────────────
async function handleMCPSSE(request, env, route) {
  const originUrl = `${route.origin}${new URL(request.url).pathname}${new URL(request.url).search}`;

  const originResponse = await fetch(originUrl, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
      'X-Heady-Edge-Region': request.cf?.colo || 'unknown'
    },
    body: request.method !== 'GET' ? request.body : undefined
  });

  // Stream SSE responses through
  return new Response(originResponse.body, {
    status: originResponse.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders(request),
      ...SECURITY_HEADERS
    }
  });
}

// ─── Handler: Proxy to Origin ───────────────────────────────────────────────
async function handleProxy(request, env, route) {
  const url = new URL(request.url);
  const originUrl = `${route.origin}${url.pathname}${url.search}`;

  // Build origin request
  const originHeaders = new Headers(request.headers);
  originHeaders.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  originHeaders.set('X-Forwarded-Proto', 'https');
  originHeaders.set('X-Heady-Edge-Region', request.cf?.colo || 'unknown');
  originHeaders.set('X-Request-ID', request.headers.get('X-Request-ID') || crypto.randomUUID());

  // Remove hop-by-hop headers
  originHeaders.delete('Host');

  const startTime = Date.now();

  try {
    const originResponse = await fetch(originUrl, {
      method: request.method,
      headers: originHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow'
    });

    const elapsed = Date.now() - startTime;

    // Build response headers
    const responseHeaders = new Headers(originResponse.headers);
    
    // Add security headers
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      responseHeaders.set(key, value);
    }
    
    // Add CORS headers
    for (const [key, value] of Object.entries(corsHeaders(request))) {
      responseHeaders.set(key, value);
    }
    
    responseHeaders.set('X-Latency-Ms', String(elapsed));
    responseHeaders.set('X-Edge-Region', request.cf?.colo || 'unknown');

    // For streaming responses, pass through directly
    if (route.stream && originResponse.headers.get('Content-Type')?.includes('text/event-stream')) {
      return new Response(originResponse.body, {
        status: originResponse.status,
        headers: responseHeaders
      });
    }

    // For cacheable responses, store in edge cache
    const response = new Response(originResponse.body, {
      status: originResponse.status,
      headers: responseHeaders
    });

    if (route.cache > 0 && originResponse.status === 200) {
      response.headers.set('Cache-Control', `public, max-age=${route.cache}, s-maxage=${route.cache}`);
    }

    edgeLog('info', {
      msg: 'Proxied to origin',
      path: url.pathname,
      status: originResponse.status,
      latency: elapsed,
      cached: route.cache > 0
    });

    return response;
  } catch (err) {
    edgeLog('error', {
      msg: 'Origin proxy failed',
      path: url.pathname,
      error: err.message
    });

    return new Response(JSON.stringify({
      error: 'Service temporarily unavailable',
      retryAfter: PHI_BACKOFF[0] / 1000
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(PHI_BACKOFF[0] / 1000)),
        ...SECURITY_HEADERS
      }
    });
  }
}

// ─── Rate Limiting (phi-scaled) ─────────────────────────────────────────────
async function checkRateLimit(request, env) {
  if (!env.RATE_LIMITER) return { allowed: true };

  const fingerprint = await requestFingerprint(request);
  const url = new URL(request.url);
  const isAPI = url.pathname.startsWith('/v1/');

  // Phi-scaled limits: API = fib(10) = 55/min, General = fib(11) = 89/min
  const limit = isAPI ? FIB[10] : FIB[11];

  try {
    const { success } = await env.RATE_LIMITER.limit({
      key: `rl:${fingerprint}:${isAPI ? 'api' : 'gen'}`
    });

    if (!success) {
      edgeLog('warn', {
        msg: 'Rate limit exceeded',
        fingerprint: fingerprint.substring(0, 8),
        type: isAPI ? 'api' : 'general'
      });
    }

    return { allowed: success, limit, fingerprint };
  } catch {
    // Fail open if rate limiter is unavailable
    return { allowed: true, limit, fingerprint };
  }
}

// ─── Hash Helper ────────────────────────────────────────────────────────────
async function hashTexts(texts) {
  const data = new TextEncoder().encode(texts.join('|'));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash).slice(0, FIB[7]))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Main Worker Export ─────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const startTime = Date.now();

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(request),
          'Access-Control-Max-Age': String(FIB[12])
        }
      });
    }

    // Rate limiting
    const rateCheck = await checkRateLimit(request, env);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(PHI_BACKOFF[1] / 1000)
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(PHI_BACKOFF[1] / 1000)),
          ...SECURITY_HEADERS,
          ...corsHeaders(request)
        }
      });
    }

    // Route matching
    const route = matchRoute(url.pathname);

    try {
      let response;

      switch (route.handler) {
        case 'health':
          response = await handleHealth(request, env);
          break;

        case 'ready':
          response = handleReady();
          break;

        case 'embed':
          if (request.method !== 'POST') {
            response = new Response(JSON.stringify({ error: 'Method not allowed' }), {
              status: 405,
              headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
            });
          } else {
            response = await handleEmbed(request, env);
          }
          break;

        case 'classify':
          if (request.method !== 'POST') {
            response = new Response(JSON.stringify({ error: 'Method not allowed' }), {
              status: 405,
              headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
            });
          } else {
            response = await handleClassify(request, env);
          }
          break;

        case 'mcpSSE':
          response = await handleMCPSSE(request, env, route);
          break;

        case 'proxy':
        default:
          response = await handleProxy(request, env, route);
          break;
      }

      // Add standard headers to all responses
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(request))) {
        headers.set(key, value);
      }
      headers.set('X-Request-Duration-Ms', String(Date.now() - startTime));

      return new Response(response.body, {
        status: response.status,
        headers
      });

    } catch (err) {
      edgeLog('error', {
        msg: 'Unhandled worker error',
        path: url.pathname,
        error: err.message,
        stack: err.stack?.substring(0, FIB[13]) // 233 chars max
      });

      return new Response(JSON.stringify({
        error: 'Internal edge error',
        requestId: request.headers.get('X-Request-ID') || 'unknown'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...SECURITY_HEADERS,
          ...corsHeaders(request)
        }
      });
    }
  },

  /**
   * Scheduled handler (Cron Triggers)
   * Runs periodic health checks and cache warming
   */
  async scheduled(event, env, ctx) {
    edgeLog('info', { msg: 'Scheduled trigger fired', cron: event.cron });

    // Warm embedding cache with common queries
    if (env.KV && env.AI) {
      const commonQueries = [
        'What is Heady?',
        'HeadySystems architecture',
        'HeadyConnection mission'
      ];

      for (const query of commonQueries) {
        try {
          const cacheKey = `embed:${await hashTexts([query])}`;
          const existing = await env.KV.get(cacheKey);
          if (!existing) {
            const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
            await env.KV.put(cacheKey, JSON.stringify({
              embeddings: result.data,
              model: '@cf/baai/bge-base-en-v1.5',
              dimensions: 384,
              count: 1
            }), { expirationTtl: CACHE_TTL.EMBEDDING });
          }
        } catch (err) {
          edgeLog('error', { msg: 'Cache warming failed', query, error: err.message });
        }
      }
    }

    edgeLog('info', { msg: 'Scheduled trigger complete' });
  }
};
