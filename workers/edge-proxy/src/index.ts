/**
 * Heady Edge Proxy — Cloudflare Worker
 * 
 * High-performance reverse proxy at the edge for all Heady services.
 * Routes by hostname and path to correct Render origins per cloud layer.
 * Handles CORS, auth headers, rate limiting, and edge metrics.
 */

interface Env {
  RENDER_ORIGIN_SYS: string;
  RENDER_ORIGIN_ME: string;
  RENDER_ORIGIN_CONN: string;
  RENDER_ORIGIN_WEB: string;
  HEADY_API_KEY?: string;
}

interface RouteConfig {
  origin: string;
  pathRewrite?: string;
  cache?: boolean;
  rateLimit?: number;
}

const ROUTE_TABLE: Record<string, (env: Env) => RouteConfig> = {
  // HeadySystems API
  'api.heady.systems': (env) => ({
    origin: env.RENDER_ORIGIN_SYS || 'https://heady-manager-headysystems.onrender.com',
    cache: false,
  }),
  // HeadyMe API  
  'api.me.heady.systems': (env) => ({
    origin: env.RENDER_ORIGIN_ME || 'https://heady-manager-headyme.onrender.com',
    cache: false,
  }),
  // HeadyConnection API
  'api.conn.heady.systems': (env) => ({
    origin: env.RENDER_ORIGIN_CONN || 'https://heady-manager-headyconnection.onrender.com',
    cache: false,
  }),
  // HeadyWeb
  'api.web.heady.systems': (env) => ({
    origin: env.RENDER_ORIGIN_WEB || 'https://heady-manager-headyweb.onrender.com',
    cache: false,
  }),
  // Brain endpoints
  'brain.heady.systems': (env) => ({
    origin: env.RENDER_ORIGIN_SYS || 'https://heady-manager-headysystems.onrender.com',
    pathRewrite: '/api/orchestrator',
    cache: false,
  }),
  'brain.me.heady.systems': (env) => ({
    origin: env.RENDER_ORIGIN_ME || 'https://heady-manager-headyme.onrender.com',
    pathRewrite: '/api/orchestrator',
    cache: false,
  }),
};

// Path-based routing for single-domain setups (headysystems.com)
function resolveByPath(pathname: string, env: Env): RouteConfig {
  if (pathname.startsWith('/api/me/') || pathname.startsWith('/me/')) {
    return {
      origin: env.RENDER_ORIGIN_ME || 'https://heady-manager-headyme.onrender.com',
      pathRewrite: pathname.replace(/^\/(api\/)?me/, '/api'),
    };
  }
  if (pathname.startsWith('/api/conn/') || pathname.startsWith('/conn/')) {
    return {
      origin: env.RENDER_ORIGIN_CONN || 'https://heady-manager-headyconnection.onrender.com',
      pathRewrite: pathname.replace(/^\/(api\/)?conn/, '/api'),
    };
  }
  if (pathname.startsWith('/api/web/') || pathname.startsWith('/web/')) {
    return {
      origin: env.RENDER_ORIGIN_WEB || 'https://heady-manager-headyweb.onrender.com',
      pathRewrite: pathname.replace(/^\/(api\/)?web/, '/api'),
    };
  }
  if (pathname.startsWith('/brain/')) {
    return {
      origin: env.RENDER_ORIGIN_SYS || 'https://heady-manager-headysystems.onrender.com',
      pathRewrite: pathname.replace('/brain/', '/api/orchestrator/'),
    };
  }
  // Default: HeadySystems
  return {
    origin: env.RENDER_ORIGIN_SYS || 'https://heady-manager-headysystems.onrender.com',
  };
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-API-Key, X-Workspace-ID, X-Brain-Profile',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const startTime = Date.now();

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request.headers.get('Origin')),
      });
    }

    // Resolve route
    let routeConfig: RouteConfig;
    const hostnameResolver = ROUTE_TABLE[url.hostname];
    
    if (hostnameResolver) {
      routeConfig = hostnameResolver(env);
    } else {
      routeConfig = resolveByPath(url.pathname, env);
    }

    // Build backend URL
    const backendUrl = new URL(url.pathname, routeConfig.origin);
    backendUrl.search = url.search;

    if (routeConfig.pathRewrite) {
      backendUrl.pathname = routeConfig.pathRewrite;
      if (url.pathname.includes('?')) {
        backendUrl.search = url.search;
      }
    }

    // Build backend request with forwarded headers
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || 'unknown');
    headers.set('X-Forwarded-Proto', 'https');
    headers.set('X-Forwarded-Host', url.hostname);
    headers.set('X-Heady-Edge', 'cloudflare-worker');
    headers.set('X-Heady-Layer', 'production');
    headers.delete('Host');

    try {
      const backendResponse = await fetch(backendUrl.toString(), {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : undefined,
      });

      const latency = Date.now() - startTime;

      // Clone response and add edge headers
      const responseHeaders = new Headers(backendResponse.headers);
      const cors = corsHeaders(request.headers.get('Origin'));
      for (const [k, v] of Object.entries(cors)) {
        responseHeaders.set(k, v);
      }
      responseHeaders.set('X-Heady-Edge-Latency', `${latency}ms`);
      responseHeaders.set('X-Heady-Origin', routeConfig.origin);
      responseHeaders.set('Server', 'Heady Edge');

      // Cache control for static assets
      if (routeConfig.cache && backendResponse.ok) {
        responseHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      }

      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });
    } catch (err: any) {
      const latency = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          error: 'Edge proxy error',
          message: err.message || 'Backend unreachable',
          origin: routeConfig.origin,
          latency_ms: latency,
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'X-Heady-Edge-Latency': `${latency}ms`,
            ...corsHeaders(request.headers.get('Origin')),
          },
        }
      );
    }
  },
};
