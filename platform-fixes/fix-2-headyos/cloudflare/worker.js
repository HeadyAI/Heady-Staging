/**
 * HeadyOS Edge Worker — headyos.com
 * 
 * FIX: headyos.com returns 530 (origin error) because Cloudflare has the zone
 * but no origin is configured. This Worker provides the origin.
 * 
 * Purpose: HeadyOS is the runtime layer of the Heady™ ecosystem.
 * Routes /api/* to Cloud Run heady-manager, serves static pages otherwise.
 * 
 * Deploy: wrangler deploy --name heady-os-worker
 */

const PHI = 1.6180339887;

const CLOUD_RUN_ORIGIN = 'https://heady-manager-609590223909.us-central1.run.app';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-Service',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/health' || url.pathname === '/health/live') {
      return Response.json({
        status: 'online',
        service: 'heady-os',
        version: '2.0.0',
        domain: 'headyos.com',
        role: 'OS Runtime Layer',
        capabilities: ['kernel', 'runtime', 'scheduler', 'memory'],
        region: request.cf?.colo ?? 'unknown',
        timestamp: new Date().toISOString(),
      }, { headers: CORS_HEADERS });
    }

    // API routes → proxy to Cloud Run
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = `${CLOUD_RUN_ORIGIN}${url.pathname}${url.search}`;
      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? request.body : undefined,
      });
      proxyRequest.headers.set('X-Forwarded-Host', 'headyos.com');
      proxyRequest.headers.set('X-Heady-Service', 'heady-os');

      try {
        const response = await fetch(proxyRequest);
        const newHeaders = new Headers(response.headers);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      } catch (err) {
        return Response.json(
          { error: 'Origin unreachable', detail: err.message },
          { status: 502, headers: CORS_HEADERS }
        );
      }
    }

    // MCP endpoint
    if (url.pathname.startsWith('/mcp/')) {
      const targetUrl = `${CLOUD_RUN_ORIGIN}${url.pathname}${url.search}`;
      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? request.body : undefined,
      });
      proxyRequest.headers.set('X-Forwarded-Host', 'headyos.com');

      try {
        const response = await fetch(proxyRequest);
        return new Response(response.body, {
          status: response.status,
          headers: response.headers,
        });
      } catch (err) {
        return Response.json(
          { error: 'MCP origin unreachable' },
          { status: 502, headers: CORS_HEADERS }
        );
      }
    }

    // Static pages
    return new Response(LANDING_HTML, {
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        ...CORS_HEADERS,
      },
    });
  },
};

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HeadyOS — The Runtime Layer</title>
  <meta name="description" content="HeadyOS: Kernel, runtime, scheduler, and memory management for the Heady™ AI platform.">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{
      --bg:#0a0a1a;--surface:rgba(20,20,50,0.6);--border:rgba(255,255,255,0.08);
      --brand:#10b981;--accent:#34d399;
      --text:#e8e8f0;--dim:#8888aa;--phi:1.6180339887;
    }
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
    .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:61.8px 61.8px;z-index:0}
    .container{max-width:800px;margin:0 auto;padding:4rem 2rem;position:relative;z-index:1}
    h1{font-size:2.5rem;font-weight:800;background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1rem}
    .subtitle{color:var(--dim);font-size:1.125rem;margin-bottom:3rem;max-width:600px}
    .capabilities{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:3rem}
    .cap-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;backdrop-filter:blur(20px)}
    .cap-card h3{color:var(--brand);font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem}
    .cap-card p{color:var(--dim);font-size:0.85rem;line-height:1.5}
    .api-info{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem}
    .api-info h2{font-size:1.125rem;margin-bottom:1rem}
    code{font-family:'JetBrains Mono',monospace;background:rgba(255,255,255,0.05);padding:0.2rem 0.5rem;border-radius:4px;font-size:0.85rem}
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="container">
    <h1>HeadyOS</h1>
    <p class="subtitle">The runtime layer for the Heady™ AI platform. Kernel services, process scheduling, memory management, and device-to-cloud orchestration.</p>
    <div class="capabilities">
      <div class="cap-card">
        <h3>Kernel</h3>
        <p>Core service lifecycle management, process isolation, and resource allocation.</p>
      </div>
      <div class="cap-card">
        <h3>Runtime</h3>
        <p>Node.js execution environment with phi-scaled resource pools and circuit breakers.</p>
      </div>
      <div class="cap-card">
        <h3>Scheduler</h3>
        <p>Autonomous task scheduling with Sacred Geometry-weighted priority queues.</p>
      </div>
      <div class="cap-card">
        <h3>Memory</h3>
        <p>384-dimensional vector memory with 3D spatial projection and GPU acceleration.</p>
      </div>
    </div>
    <div class="api-info">
      <h2>API Access</h2>
      <p style="color:var(--dim);margin-bottom:0.75rem">HeadyOS API is available at:</p>
      <p><code>https://headyos.com/api/</code></p>
      <p style="color:var(--dim);margin-top:0.75rem;font-size:0.85rem">Health: <code>GET /health</code> &middot; MCP: <code>/mcp/tools</code></p>
    </div>
  </div>
</body>
</html>`;
