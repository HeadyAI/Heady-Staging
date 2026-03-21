/**
 * Heady™-AI.org Edge Worker
 * 
 * FIX: heady-ai.com returns connection refused (HTTP 000) — DNS zone
 * either doesn't exist in Cloudflare or has no origin configured.
 * 
 * This Worker provides the origin + landing page.
 * Run dns/setup-zone.sh first to create the Cloudflare zone,
 * then deploy this Worker.
 * 
 * Purpose: heady-ai.com is the open/research-facing AI portal.
 */

const CLOUD_RUN_ORIGIN = 'https://heady-manager-609590223909.us-central1.run.app';

const HEADY_ALLOWED_ORIGINS = new Set([
  'https://headyme.com', 'https://www.headyme.com',
  'https://headysystems.com', 'https://www.headysystems.com',
  'https://heady-ai.com', 'https://www.heady-ai.com',
  'https://headybuddy.org', 'https://headybuddy.org',
  'https://headybuddy.org', 'https://www.headybuddy.org',
  'https://headymcp.com', 'https://www.headymcp.com',
  'https://headyio.com', 'https://www.headyio.com',
  'https://headybot.com', 'https://www.headybot.com',
  'https://headyapi.com', 'https://www.headyapi.com',
  'https://headylens.com', 'https://www.headylens.com',
  'https://headyfinance.com', 'https://www.headyfinance.com',
  'https://headyconnection.org', 'https://www.headyconnection.org',
  'https://headyconnection.com', 'https://www.headyconnection.com',
  'https://admin.headysystems.com',
]);

function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin && HEADY_ALLOWED_ORIGINS.has(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const CORS_HEADERS = getCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health
    if (url.pathname === '/health') {
      return Response.json({
        status: 'online',
        service: 'heady-ai-org',
        version: '2.0.0',
        domain: 'heady-ai.com',
        role: 'AI Research Portal',
        region: request.cf?.colo ?? 'unknown',
        timestamp: new Date().toISOString(),
      }, { headers: CORS_HEADERS });
    }

    // API proxy
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/mcp/')) {
      const targetUrl = `${CLOUD_RUN_ORIGIN}${url.pathname}${url.search}`;
      try {
        const response = await fetch(new Request(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== 'GET' ? request.body : undefined,
        }));
        const newHeaders = new Headers(response.headers);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
        return new Response(response.body, { status: response.status, headers: newHeaders });
      } catch (err) {
        return Response.json({ error: 'Origin unreachable' }, { status: 502, headers: CORS_HEADERS });
      }
    }

    // Landing page
    return new Response(LANDING_HTML, {
      headers: { 'Content-Type': 'text/html;charset=utf-8', ...CORS_HEADERS },
    });
  },
};

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Heady™ AI — Open Intelligence Research</title>
  <meta name="description" content="Heady™ AI: Open research in Continuous Semantic Logic, Sacred Geometry orchestration, and multi-agent intelligence.">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#0a0a1a;--brand:#f59e0b;--accent:#fbbf24;--text:#e8e8f0;--dim:#8888aa;--surface:rgba(20,20,50,0.6);--border:rgba(255,255,255,0.08)}
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:61.8px 61.8px;z-index:0}
    .container{max-width:800px;margin:0 auto;padding:4rem 2rem;position:relative;z-index:1}
    h1{font-size:2.5rem;font-weight:800;background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1rem}
    .subtitle{color:var(--dim);font-size:1.125rem;margin-bottom:3rem}
    .research-areas{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem;margin-bottom:3rem}
    .area{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;backdrop-filter:blur(20px)}
    .area h3{color:var(--brand);margin-bottom:0.5rem}
    .area p{color:var(--dim);font-size:0.85rem;line-height:1.5}
    .links{display:flex;gap:1rem;flex-wrap:wrap}
    .links a{padding:0.5rem 1rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--text);text-decoration:none;font-size:0.875rem}
    .links a:hover{border-color:var(--brand)}
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="container">
    <h1>Heady™ AI</h1>
    <p class="subtitle">Open intelligence research. Continuous Semantic Logic, Sacred Geometry orchestration, and autonomous multi-agent systems.</p>
    <div class="research-areas">
      <div class="area">
        <h3>CSL Engine</h3>
        <p>Continuous Semantic Logic — geometric AI gates replacing discrete boolean logic with vector operations.</p>
      </div>
      <div class="area">
        <h3>Sacred Geometry</h3>
        <p>Phi-ratio orchestration patterns for node placement, agent coordination, and state management.</p>
      </div>
      <div class="area">
        <h3>Vector Memory</h3>
        <p>384-dimensional embeddings projected to 3D space for spatial reasoning and persistent memory.</p>
      </div>
    </div>
    <div class="links">
      <a href="https://headyme.com">HeadyMe Dashboard</a>
      <a href="https://headysystems.com">HeadySystems</a>
      <a href="https://headyconnection.org">HeadyConnection</a>
      <a href="https://github.com/HeadyMe">GitHub</a>
    </div>
  </div>
</body>
</html>`;
