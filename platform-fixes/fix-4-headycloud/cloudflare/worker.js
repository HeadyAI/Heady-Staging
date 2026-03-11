/**
 * HeadyCloud Edge Worker — headycloud.com
 * 
 * FIX: headycloud.com returns 403 (Forbidden). Most likely cause:
 * 1. Cloudflare WAF/Access rule blocking requests, OR
 * 2. Default deny rule with no Worker to handle requests
 * 
 * This Worker provides an explicit origin that bypasses the 403.
 * Also run fix-waf-rules.sh to clean up any restrictive rules.
 * 
 * Purpose: HeadyCloud is the cloud orchestration layer.
 */

const CLOUD_RUN_ORIGIN = 'https://heady-manager-609590223909.us-central1.run.app';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-Service',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health
    if (url.pathname === '/health') {
      return Response.json({
        status: 'online',
        service: 'heady-cloud',
        version: '2.0.0',
        domain: 'headycloud.com',
        role: 'Cloud Orchestration',
        capabilities: ['orchestrator', 'deploy', 'console', 'monitor'],
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
  <title>HeadyCloud — Cloud Orchestration</title>
  <meta name="description" content="HeadyCloud: Multi-cloud orchestration, deployment automation, and infrastructure management for the Heady™ AI platform.">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#0a0a1a;--brand:#6366f1;--accent:#818cf8;--text:#e8e8f0;--dim:#8888aa;--surface:rgba(20,20,50,0.6);--border:rgba(255,255,255,0.08)}
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:61.8px 61.8px;z-index:0}
    .container{max-width:800px;margin:0 auto;padding:4rem 2rem;position:relative;z-index:1}
    h1{font-size:2.5rem;font-weight:800;background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1rem}
    .subtitle{color:var(--dim);font-size:1.125rem;margin-bottom:3rem}
    .services{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:3rem}
    .svc{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;backdrop-filter:blur(20px)}
    .svc h3{color:var(--brand);margin-bottom:0.5rem;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.04em}
    .svc p{color:var(--dim);font-size:0.85rem;line-height:1.5}
    .status-bar{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;display:flex;align-items:center;gap:0.75rem}
    .status-dot{width:10px;height:10px;border-radius:50%;background:#22c55e}
    .status-text{font-size:0.9rem}
    .status-dim{color:var(--dim);font-size:0.8rem;margin-left:auto}
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="container">
    <h1>HeadyCloud</h1>
    <p class="subtitle">Multi-cloud orchestration for the Heady™ AI platform. Deploy, scale, and monitor across Cloudflare, Google Cloud, and beyond.</p>
    <div class="services">
      <div class="svc">
        <h3>Orchestrator</h3>
        <p>Unified deployment pipeline across Cloud Run, Workers, and HuggingFace Spaces.</p>
      </div>
      <div class="svc">
        <h3>Deploy</h3>
        <p>Canary rollouts with phi-weighted traffic splitting and automatic rollback.</p>
      </div>
      <div class="svc">
        <h3>Console</h3>
        <p>Real-time service management, log streaming, and resource monitoring.</p>
      </div>
      <div class="svc">
        <h3>Monitor</h3>
        <p>Health probes, drift detection, and self-healing automation.</p>
      </div>
    </div>
    <div class="status-bar">
      <span class="status-dot"></span>
      <span class="status-text">All systems operational</span>
      <span class="status-dim">headycloud.com</span>
    </div>
  </div>
</body>
</html>`;
