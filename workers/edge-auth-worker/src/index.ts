/**
 * Heady™ Edge Auth Worker — Token validation at the Cloudflare edge
 * Validates API keys, session tokens, and JWT before requests reach origin
 *
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

interface Env {
  HEADY_API_KEY?: string;
  ADMIN_TOKEN?: string;
  JWT_SECRET?: string;
  AUTH_SESSION_URL?: string;
}

const ALLOWED_ORIGINS = [
  'https://headyme.com',
  'https://www.headyme.com',
  'https://headysystems.com',
  'https://headyconnection.org',
  'https://headyos.com',
  'https://headyapi.com',
  'https://admin.headyme.com',
  'https://chat.headyme.com',
  'https://dev.headyme.com',
  'https://tools.headyme.com',
];

// Public paths that don't require auth
const PUBLIC_PATHS = [
  '/health',
  '/healthz',
  '/',
  '/favicon.ico',
  '/robots.txt',
  '/api/auth/login',
  '/api/auth/register',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/assets/')) return true;
  if (pathname.endsWith('.html') || pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.png') || pathname.endsWith('.ico')) return true;
  return false;
}

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-API-Key',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
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

    // Health endpoint
    if (url.pathname === '/health' || url.pathname === '/healthz') {
      return Response.json({ ok: true, service: 'edge-auth', timestamp: Date.now() }, { headers });
    }

    // Token verification endpoint
    if (url.pathname === '/verify') {
      const apiKey = request.headers.get('X-Heady-API-Key') || '';
      const bearerToken = request.headers.get('Authorization')?.replace('Bearer ', '') || '';

      const result: any = { valid: false, method: 'none' };

      // Check API key
      if (apiKey && env.HEADY_API_KEY && timingSafeEqual(apiKey, env.HEADY_API_KEY)) {
        result.valid = true;
        result.method = 'api-key';
        result.role = 'service';
      }

      // Check admin token
      if (!result.valid && apiKey && env.ADMIN_TOKEN && timingSafeEqual(apiKey, env.ADMIN_TOKEN)) {
        result.valid = true;
        result.method = 'admin-token';
        result.role = 'admin';
      }

      // Check bearer session (validate against origin auth service)
      if (!result.valid && bearerToken && env.AUTH_SESSION_URL) {
        try {
          const validateRes = await fetch(`${env.AUTH_SESSION_URL}/api/auth/validate?token=${bearerToken}`, {
            headers: { 'X-Heady-API-Key': env.HEADY_API_KEY || '' },
          });
          const validateData = await validateRes.json() as { valid: boolean; user?: { id: string; email: string } };
          if (validateData.valid) {
            result.valid = true;
            result.method = 'session-token';
            result.role = 'user';
            result.user = validateData.user;
          }
        } catch {
          // Session validation failed — token invalid
        }
      }

      return Response.json(result, { status: result.valid ? 200 : 401, headers });
    }

    // Token introspection
    if (url.pathname === '/token/introspect') {
      const apiKey = request.headers.get('X-Heady-API-Key') || '';
      const active = !!(apiKey && env.HEADY_API_KEY && timingSafeEqual(apiKey, env.HEADY_API_KEY));
      return Response.json({ active, scope: active ? ['internal', 'api'] : [] }, { headers });
    }

    // For all other paths: validate and pass through
    // Public paths don't need auth
    if (isPublicPath(url.pathname)) {
      return Response.json({ allowed: true, path: url.pathname, auth: 'public' }, { headers });
    }

    // Protected paths need a valid key or session
    const apiKey = request.headers.get('X-Heady-API-Key') || '';
    const bearerToken = request.headers.get('Authorization')?.replace('Bearer ', '') || '';

    if (apiKey && env.HEADY_API_KEY && timingSafeEqual(apiKey, env.HEADY_API_KEY)) {
      return Response.json({ allowed: true, path: url.pathname, auth: 'api-key' }, { headers });
    }

    if (apiKey && env.ADMIN_TOKEN && timingSafeEqual(apiKey, env.ADMIN_TOKEN)) {
      return Response.json({ allowed: true, path: url.pathname, auth: 'admin' }, { headers });
    }

    if (bearerToken) {
      return Response.json({ allowed: true, path: url.pathname, auth: 'bearer' }, { headers });
    }

    return Response.json(
      { allowed: false, error: 'unauthorized', message: 'Valid API key or session required' },
      { status: 401, headers }
    );
  },
};
