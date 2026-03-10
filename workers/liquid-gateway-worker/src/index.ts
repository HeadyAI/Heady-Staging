/**
 * Heady™ Liquid Latent OS — Universal Gateway Worker
 * Routes all 47 sites + API services through a single Cloudflare Worker
 * φ-scaled caching, CSL-adaptive routing, 3D vector space projection
 */

// ── φ Constants ─────────────────────────────────────────────────────
const PHI = 1.6180339887498949;
const PSI = 0.6180339887498949; // 1/φ
const phiMs = (n: number) => Math.round(Math.pow(PHI, n) * 1000);

const PHI_TIMING = {
  TICK: phiMs(0),   // 1000ms
  PULSE: phiMs(1),   // 1618ms
  BEAT: phiMs(2),   // 2618ms
  BREATH: phiMs(3),   // 4236ms
  WAVE: phiMs(4),   // 6854ms
  SURGE: phiMs(5),   // 11090ms
  FLOW: phiMs(6),   // 17944ms
  CYCLE: phiMs(7),   // 29034ms
  TIDE: phiMs(8),   // 46979ms
  EPOCH: phiMs(9),   // 76013ms
} as const;

// ── Site Registry ───────────────────────────────────────────────────
// Maps hostname patterns to GitHub repo names for origin resolution
const SITE_REGISTRY: Record<string, { repo: string; tier: string; cacheTtl: number }> = {
  // Core sites
  'headysystems.com': { repo: 'headysystems', tier: 'core', cacheTtl: PHI_TIMING.EPOCH },
  'www.headysystems.com': { repo: 'headysystems', tier: 'core', cacheTtl: PHI_TIMING.EPOCH },
  'headyme.com': { repo: 'headyme', tier: 'core', cacheTtl: PHI_TIMING.EPOCH },
  'headyme-com.pages.dev': { repo: 'headyme-com', tier: 'core', cacheTtl: PHI_TIMING.EPOCH },
  'headyconnection.org': { repo: 'headyconnection', tier: 'core', cacheTtl: PHI_TIMING.EPOCH },
  'headyconnection-org.pages.dev': { repo: 'headyconnection-org', tier: 'core', cacheTtl: PHI_TIMING.EPOCH },
  'headybuddy.org': { repo: 'headybuddy-org', tier: 'core', cacheTtl: PHI_TIMING.EPOCH },
  'headybuddy.com': { repo: 'HeadyBuddy', tier: 'core', cacheTtl: PHI_TIMING.EPOCH },
  '1ime1.com': { repo: '1ime1', tier: 'core', cacheTtl: PHI_TIMING.EPOCH },
  'instant.headysystems.com': { repo: 'instant', tier: 'core', cacheTtl: PHI_TIMING.TIDE },

  // Product sites
  'headyos.com': { repo: 'headyos', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyapi.com': { repo: 'headyapi', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headymcp.com': { repo: 'headymcp-com', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyio.com': { repo: 'headyio-com', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyweb.com': { repo: 'HeadyWeb', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headydocs.com': { repo: 'headydocs', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyatlas.com': { repo: 'heady-atlas', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyimagine.com': { repo: 'heady-imagine', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'heady-ai.com': { repo: 'heady-ai', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headybot.com': { repo: 'headybot', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headysense.com': { repo: 'headysense', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyfinance.com': { repo: 'headyfinance', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headycloud.com': { repo: 'headycloud', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headystore.com': { repo: 'headystore', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headylens.com': { repo: 'headylens', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headymusic.com': { repo: 'headymusic', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyhealth.com': { repo: 'headyhealth', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headylegal.com': { repo: 'headylegal', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyestate.com': { repo: 'headyestate', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headygrants.com': { repo: 'headygrants', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyconnection.com': { repo: 'headyconnection-com', tier: 'product', cacheTtl: PHI_TIMING.TIDE },

  // Integration sites
  'headyvscode.com': { repo: 'heady-vscode', tier: 'integration', cacheTtl: PHI_TIMING.CYCLE },
  'headychrome.com': { repo: 'heady-chrome', tier: 'integration', cacheTtl: PHI_TIMING.CYCLE },
  'headyjetbrains.com': { repo: 'heady-jetbrains', tier: 'integration', cacheTtl: PHI_TIMING.CYCLE },
  'headydesktop.com': { repo: 'heady-desktop', tier: 'integration', cacheTtl: PHI_TIMING.CYCLE },
  'headymobile.com': { repo: 'heady-mobile', tier: 'integration', cacheTtl: PHI_TIMING.CYCLE },
  'headydiscord.com': { repo: 'heady-discord', tier: 'integration', cacheTtl: PHI_TIMING.CYCLE },
  'headyslack.com': { repo: 'heady-slack', tier: 'integration', cacheTtl: PHI_TIMING.CYCLE },
  'headyjules.com': { repo: 'heady-jules', tier: 'integration', cacheTtl: PHI_TIMING.CYCLE },

  // Internal / monitoring
  'admin.headysystems.com': { repo: 'admin-ui', tier: 'internal', cacheTtl: PHI_TIMING.FLOW },
  'metrics.headysystems.com': { repo: 'heady-metrics', tier: 'internal', cacheTtl: PHI_TIMING.FLOW },
  'logs.headysystems.com': { repo: 'heady-logs', tier: 'internal', cacheTtl: PHI_TIMING.FLOW },
  'traces.headysystems.com': { repo: 'heady-traces', tier: 'internal', cacheTtl: PHI_TIMING.FLOW },
  'sentinel.headysystems.com': { repo: 'heady-sentinel', tier: 'internal', cacheTtl: PHI_TIMING.FLOW },
  'observer.headysystems.com': { repo: 'heady-observer', tier: 'internal', cacheTtl: PHI_TIMING.FLOW },
  'patterns.headysystems.com': { repo: 'heady-patterns', tier: 'internal', cacheTtl: PHI_TIMING.FLOW },

  // AI / compute
  'critique.headysystems.com': { repo: 'heady-critique', tier: 'compute', cacheTtl: PHI_TIMING.SURGE },
  'pythia.headysystems.com': { repo: 'heady-pythia', tier: 'compute', cacheTtl: PHI_TIMING.SURGE },
  'vinci.headysystems.com': { repo: 'heady-vinci', tier: 'compute', cacheTtl: PHI_TIMING.SURGE },
  'montecarlo.headysystems.com': { repo: 'heady-montecarlo', tier: 'compute', cacheTtl: PHI_TIMING.SURGE },
  'kinetics.headysystems.com': { repo: 'heady-kinetics', tier: 'compute', cacheTtl: PHI_TIMING.SURGE },
  'maestro.headysystems.com': { repo: 'heady-maestro', tier: 'compute', cacheTtl: PHI_TIMING.SURGE },
  'builder.headysystems.com': { repo: 'heady-builder', tier: 'compute', cacheTtl: PHI_TIMING.SURGE },
  'stories.headysystems.com': { repo: 'heady-stories', tier: 'compute', cacheTtl: PHI_TIMING.SURGE },

  // Extended domains (auto-discovered from Cloudflare zones)
  '1imi1.com': { repo: '1imi1', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyadvisor.com': { repo: 'headyadvisor', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyagent.com': { repo: 'headyagent', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyaid.com': { repo: 'headyaid', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyarchive.com': { repo: 'headyarchive', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyassist.com': { repo: 'headyassist', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyassure.com': { repo: 'headyassure', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headybare.com': { repo: 'headybare', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headybet.com': { repo: 'headybet', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headybio.com': { repo: 'headybio', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headycheck.com': { repo: 'headycheck', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headycore.com': { repo: 'headycore', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headycorrections.com': { repo: 'headycorrections', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headycreator.com': { repo: 'headycreator', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headycrypt.com': { repo: 'headycrypt', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headydb.com': { repo: 'headydb', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyex.com': { repo: 'headyex', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyfed.com': { repo: 'headyfed', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyfield.com': { repo: 'headyfield', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headygov.com': { repo: 'headygov', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyhome.com': { repo: 'headyhome', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headykey.com': { repo: 'headykey', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headykiosk.com': { repo: 'headykiosk', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headylibrary.com': { repo: 'headylibrary', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headymanufacturing.com': { repo: 'headymanufacturing', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headymd.com': { repo: 'headymd', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headymx.com': { repo: 'headymx', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyplus.com': { repo: 'headyplus', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyrx.com': { repo: 'headyrx', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headysafe.com': { repo: 'headysafe', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headysecure.com': { repo: 'headysecure', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyship.com': { repo: 'headyship', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headystate.com': { repo: 'headystate', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headystudio.com': { repo: 'headystudio', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headytube.com': { repo: 'headytube', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headytxt.com': { repo: 'headytxt', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyu.com': { repo: 'headyu', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyusa.com': { repo: 'headyusa', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'headyvault.com': { repo: 'headyvault', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'openmindsplace.com': { repo: 'openmindsplace', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
  'openmindstop.com': { repo: 'openmindstop', tier: 'product', cacheTtl: PHI_TIMING.TIDE },
};

// ── 3D Vector Space for Service Routing ─────────────────────────────
interface Vec3 { x: number; y: number; z: number }

// Tier vectors in 3D space: (latency_priority, compute_weight, cache_affinity)
const TIER_VECTORS: Record<string, Vec3> = {
  core: { x: 1.0, y: 0.0, z: PHI },       // max cache, zero compute
  product: { x: PSI, y: 0.0, z: 1.0 },      // balanced cache
  integration: { x: PSI * PSI, y: PSI, z: PSI },      // moderate all
  internal: { x: 0.0, y: PSI, z: PSI * PSI },  // low cache, some compute
  compute: { x: 0.0, y: PHI, z: 0.0 },      // max compute, no cache
};

function vecMagnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function routingPriority(tier: string): number {
  const v = TIER_VECTORS[tier] || TIER_VECTORS.product;
  return vecMagnitude(v);
}

// ── CSL Adaptive Pressure ───────────────────────────────────────────
function cslBlend(a: number, b: number, pressure: number, threshold = 0.5): number {
  const sigmoid = 1 / (1 + Math.exp(-10 * (pressure - threshold)));
  return a * sigmoid + b * (1 - sigmoid);
}

// ── Colab Pro+ Runtime Endpoints ────────────────────────────────────
const COLAB_RUNTIMES = [
  { id: 'colab-1', region: 'us-east', endpoint: '', weight: PHI },
  { id: 'colab-2', region: 'us-west', endpoint: '', weight: 1.0 },
  { id: 'colab-3', region: 'eu-west', endpoint: '', weight: PSI },
];

function selectColabRuntime(requestRegion: string): typeof COLAB_RUNTIMES[0] {
  // φ-weighted selection: prefer closest region, fallback by golden ratio weights
  const regionMap: Record<string, string> = {
    'EWR': 'us-east', 'IAD': 'us-east', 'ORD': 'us-east', 'ATL': 'us-east',
    'LAX': 'us-west', 'SFO': 'us-west', 'SEA': 'us-west', 'DFW': 'us-west',
    'LHR': 'eu-west', 'CDG': 'eu-west', 'FRA': 'eu-west', 'AMS': 'eu-west',
  };
  const preferred = regionMap[requestRegion] || 'us-east';
  return COLAB_RUNTIMES.find(r => r.region === preferred) || COLAB_RUNTIMES[0];
}

// ── Types ───────────────────────────────────────────────────────────
interface Env {
  HEADY_CACHE: KVNamespace;
  HEADY_CONFIG: KVNamespace;
  BACKEND_ORIGIN: string;
  FIREBASE_API_KEY: string;
  NEON_CONNECTION: string;
  UPSTASH_REDIS_URL: string;
  UPSTASH_REDIS_TOKEN: string;
}

// ── Main Handler ────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const startTime = Date.now();

    // ── System endpoints ──
    if (url.pathname === '/health') {
      return Response.json({
        status: 'liquid',
        version: '4.0.0',
        phi: PHI,
        uptime: Date.now(),
        sites: Object.keys(SITE_REGISTRY).length,
        colabRuntimes: COLAB_RUNTIMES.length,
        vectorSpace: '3D',
        tiers: Object.keys(TIER_VECTORS),
      });
    }

    if (url.pathname === '/health/sites') {
      const sites = Object.entries(SITE_REGISTRY).map(([host, cfg]) => ({
        host,
        repo: cfg.repo,
        tier: cfg.tier,
        cacheTtl: cfg.cacheTtl,
        priority: routingPriority(cfg.tier),
        vector: TIER_VECTORS[cfg.tier],
      }));
      return Response.json({ sites, total: sites.length });
    }

    if (url.pathname === '/health/colab') {
      const colo = (request as any).cf?.colo || 'unknown';
      const selected = selectColabRuntime(colo);
      return Response.json({
        runtimes: COLAB_RUNTIMES,
        selected,
        requestColo: colo,
      });
    }

    if (url.pathname === '/health/vectors') {
      return Response.json({
        tiers: TIER_VECTORS,
        magnitudes: Object.fromEntries(
          Object.entries(TIER_VECTORS).map(([k, v]) => [k, vecMagnitude(v)])
        ),
        phi: PHI,
        psi: PSI,
      });
    }

    // ── Auth endpoints (Firebase) ──
    if (url.pathname === '/auth' || url.pathname === '/auth/') {
      return serveAuthPage(env);
    }
    if (url.pathname === '/auth/verify') {
      return handleAuthVerify(request, env);
    }

    // ── Clipboard API (edge-cached, Upstash Redis backed) ──
    if (url.pathname.startsWith('/clipboard/')) {
      return handleClipboard(request, url, env);
    }

    // ── CMS API proxy to Drupal ──
    if (url.pathname.startsWith('/api/cms/')) {
      return proxyToDrupal(request, url, env);
    }

    // ── API proxy to backend ──
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
      return proxyToBackend(request, url, env, ctx);
    }

    // ── Colab compute proxy ──
    if (url.pathname.startsWith('/compute/')) {
      const colo = (request as any).cf?.colo || 'EWR';
      const runtime = selectColabRuntime(colo);
      if (!runtime.endpoint) {
        return Response.json({
          error: 'Colab runtime not configured',
          runtime: runtime.id,
          configure: 'Set COLAB_*_ENDPOINT env vars',
        }, { status: 503 });
      }
      const backendUrl = `${runtime.endpoint}${url.pathname.replace('/compute', '')}`;
      return fetch(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }

    // ── Site routing ──
    const site = SITE_REGISTRY[hostname];
    if (site) {
      return serveSite(request, url, site, env, ctx);
    }

    // ── Wildcard: *.headysystems.com subdomain routing ──
    if (hostname.endsWith('.headysystems.com')) {
      const sub = hostname.replace('.headysystems.com', '');
      const wildcardSite = Object.values(SITE_REGISTRY).find(s =>
        s.repo === `heady-${sub}` || s.repo === sub
      );
      if (wildcardSite) {
        return serveSite(request, url, wildcardSite, env, ctx);
      }
    }

    // ── Default: proxy to Cloud Run dynamic-site-server ──
    // The dynamic-site-server renders rich branded content for ALL 60+ domains
    // based on Host header — never show the placeholder gateway page
    const cloudRunOrigin = env.BACKEND_ORIGIN || 'https://headyme-site-bf4q4zywhq-uc.a.run.app';
    try {
      const proxyUrl = `${cloudRunOrigin}${url.pathname}${url.search}`;
      const proxyResponse = await fetch(proxyUrl, {
        method: request.method,
        headers: new Headers({
          ...Object.fromEntries(request.headers),
          'Host': hostname,
          'X-Forwarded-Host': hostname,
          'X-Heady-Gateway': 'liquid-4.0',
        }),
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });
      // Clone response with gateway headers
      const body = await proxyResponse.text();
      return new Response(body, {
        status: proxyResponse.status,
        headers: {
          'Content-Type': proxyResponse.headers.get('Content-Type') || 'text/html; charset=utf-8',
          'X-Heady-Gateway': 'liquid-proxy',
          'X-Heady-Origin': 'cloud-run',
          'X-Heady-Host': hostname,
        },
      });
    } catch (err) {
      // Only show gateway HTML if Cloud Run is completely down
      return new Response(gatewayHTML(hostname), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  },
};

// ── Site Serving ────────────────────────────────────────────────────
async function serveSite(
  request: Request,
  url: URL,
  site: { repo: string; tier: string; cacheTtl: number },
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const cacheKey = `site:${site.repo}:${url.pathname}`;

  // Try KV cache first (φ-scaled TTL per tier)
  if (env.HEADY_CACHE) {
    const cached = await env.HEADY_CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': inferContentType(url.pathname),
          'X-Heady-Cache': 'HIT',
          'X-Heady-Tier': site.tier,
          'X-Heady-Repo': site.repo,
          'Cache-Control': `public, max-age=${Math.round(site.cacheTtl / 1000)}`,
        },
      });
    }
  }

  // Proxy to GitHub Pages or backend origin
  const originUrl = `https://headyme.github.io/${site.repo}${url.pathname === '/' ? '/index.html' : url.pathname}`;

  try {
    const response = await fetch(originUrl, {
      headers: { 'User-Agent': 'HeadyLiquidGateway/4.0' },
    });

    if (!response.ok) {
      // Fallback: try /index.html for SPA routing
      if (!url.pathname.includes('.')) {
        const spaResponse = await fetch(`https://headyme.github.io/${site.repo}/index.html`);
        if (spaResponse.ok) {
          const body = await spaResponse.text();
          if (env.HEADY_CACHE) {
            ctx.waitUntil(env.HEADY_CACHE.put(cacheKey, body, { expirationTtl: Math.round(site.cacheTtl / 1000) }));
          }
          return new Response(body, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'X-Heady-Cache': 'MISS',
              'X-Heady-Tier': site.tier,
              'X-Heady-Repo': site.repo,
            },
          });
        }
      }
      return new Response(`Site ${site.repo} not deployed yet`, { status: 404 });
    }

    const body = await response.text();

    // Cache in KV with φ-scaled TTL
    if (env.HEADY_CACHE) {
      ctx.waitUntil(env.HEADY_CACHE.put(cacheKey, body, { expirationTtl: Math.round(site.cacheTtl / 1000) }));
    }

    return new Response(body, {
      headers: {
        'Content-Type': inferContentType(url.pathname),
        'X-Heady-Cache': 'MISS',
        'X-Heady-Tier': site.tier,
        'X-Heady-Repo': site.repo,
        'Cache-Control': `public, max-age=${Math.round(site.cacheTtl / 1000)}`,
      },
    });
  } catch (err) {
    return new Response(`Gateway error: ${(err as Error).message}`, { status: 502 });
  }
}

// ── Clipboard API (Edge) ────────────────────────────────────────────
async function handleClipboard(request: Request, url: URL, env: Env): Promise<Response> {
  const redisUrl = env.UPSTASH_REDIS_URL || 'https://finer-sole-64861.upstash.io';
  const redisToken = env.UPSTASH_REDIS_TOKEN || '';

  if (!redisToken) {
    return Response.json({ error: 'Clipboard not configured — set UPSTASH_REDIS_TOKEN' }, { status: 503 });
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const channel = parts[1] || 'default';
  const action = parts[2] || 'list';
  const userId = 'default';

  async function redis(cmd: string[]) {
    const res = await fetch(redisUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
    });
    return res.json() as Promise<any>;
  }

  if (request.method === 'POST' && action === 'copy') {
    const data: any = await request.json();
    const itemId = crypto.randomUUID().slice(0, 16);
    const key = `clipboard:${userId}:${channel}:${itemId}`;
    const item = {
      id: itemId, channel, type: data.type || 'text',
      content: data.content || '', metadata: data.metadata || {},
      device: request.headers.get('X-Heady-Device') || 'edge',
      created_at: Date.now(),
    };
    await redis(['SET', key, JSON.stringify(item), 'EX', String(PHI_TIMING.CYCLE)]);
    await redis(['ZADD', `clipboard:${userId}:${channel}:list`, String(Date.now()), itemId]);
    return Response.json({ status: 'copied', item }, { status: 201 });
  }

  if (request.method === 'GET' && action === 'paste') {
    const listResult = await redis(['ZREVRANGE', `clipboard:${userId}:${channel}:list`, '0', '0']);
    const latestId = listResult?.result?.[0];
    if (!latestId) return Response.json({ error: 'empty', channel }, { status: 404 });
    const itemResult = await redis(['GET', `clipboard:${userId}:${channel}:${latestId}`]);
    const item = itemResult?.result ? JSON.parse(itemResult.result) : null;
    if (!item) return Response.json({ error: 'expired', channel }, { status: 404 });
    return Response.json({ status: 'pasted', item });
  }

  // Default: list items
  const listResult = await redis(['ZREVRANGE', `clipboard:${userId}:${channel}:list`, '0', '19']);
  const ids = listResult?.result || [];
  const items: any[] = [];
  for (const id of ids) {
    const r = await redis(['GET', `clipboard:${userId}:${channel}:${id}`]);
    if (r?.result) items.push(JSON.parse(r.result));
  }
  return Response.json({ channel, items, count: items.length });
}

// ── Drupal CMS Proxy ────────────────────────────────────────────────
async function proxyToDrupal(request: Request, url: URL, env: Env): Promise<Response> {
  const drupalOrigin = 'https://admin.headysystems.com';
  return fetch(`${drupalOrigin}${url.pathname}${url.search}`, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
}

// ── API Proxy ───────────────────────────────────────────────────────
async function proxyToBackend(request: Request, url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  const origin = env.BACKEND_ORIGIN || 'https://manager.headysystems.com';
  const backendUrl = `${origin}${url.pathname}${url.search}`;

  return fetch(backendUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
}

// ── Firebase Auth Page ──────────────────────────────────────────────
function serveAuthPage(env: Env): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Heady™ — Sign In</title>
  <style>
    :root {
      --phi: 1.618;
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #1e1e2e;
      --primary: #6c63ff;
      --primary-glow: rgba(108, 99, 255, 0.3);
      --text: #e4e4ef;
      --text-dim: #8888a0;
      --success: #4ecdc4;
      --error: #ff6b6b;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    /* φ-spiral background */
    body::before {
      content: '';
      position: fixed;
      top: 50%; left: 50%;
      width: 800px; height: 800px;
      transform: translate(-50%, -50%);
      background: conic-gradient(from 0deg, transparent 0%, var(--primary-glow) 15%, transparent 30%);
      animation: phi-spin 29.034s linear infinite;
      opacity: 0.15;
      border-radius: 50%;
    }
    @keyframes phi-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }

    .auth-container {
      position: relative;
      width: 100%;
      max-width: 420px;
      padding: 2rem;
    }
    .auth-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem 2rem;
      backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .logo {
      text-align: center;
      margin-bottom: 2rem;
    }
    .logo h1 {
      font-size: 1.618rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary), var(--success));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.02em;
    }
    .logo p {
      color: var(--text-dim);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-group label {
      display: block;
      font-size: 0.8125rem;
      color: var(--text-dim);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .form-group input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 0.9375rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
    }
    .form-group input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }
    .btn {
      width: 100%;
      padding: 0.8rem;
      border: none;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: var(--primary);
      color: white;
      box-shadow: 0 4px 14px var(--primary-glow);
      margin-bottom: 0.75rem;
    }
    .btn-primary:hover { box-shadow: 0 6px 20px var(--primary-glow); }
    .btn-google {
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .btn-github {
      background: #24292e;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .divider {
      display: flex;
      align-items: center;
      margin: 1.5rem 0;
      color: var(--text-dim);
      font-size: 0.8125rem;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }
    .divider span { padding: 0 1rem; }
    .toggle {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: var(--text-dim);
    }
    .toggle a {
      color: var(--primary);
      text-decoration: none;
      cursor: pointer;
      font-weight: 500;
    }
    .status {
      text-align: center;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      display: none;
    }
    .status.error { display: block; background: rgba(255,107,107,0.1); color: var(--error); border: 1px solid rgba(255,107,107,0.2); }
    .status.success { display: block; background: rgba(78,205,196,0.1); color: var(--success); border: 1px solid rgba(78,205,196,0.2); }
    .phi-badge {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.75rem;
      color: var(--text-dim);
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="auth-container">
    <div class="auth-card">
      <div class="logo">
        <h1>Heady\u2122</h1>
        <p>Liquid Latent OS</p>
      </div>

      <div id="status" class="status"></div>

      <form id="auth-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" placeholder="you@example.com" required autocomplete="email">
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary" id="submit-btn">Sign In</button>
      </form>

      <div class="divider"><span>or continue with</span></div>

      <button class="btn btn-google" id="google-btn">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Google
      </button>
      <button class="btn btn-github" id="github-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
        GitHub
      </button>

      <div class="toggle">
        <span id="toggle-text">Don't have an account?</span>
        <a id="toggle-link" onclick="toggleMode()">Sign up</a>
      </div>
    </div>
    <div class="phi-badge">\u03C6 = 1.6180339887 \u00B7 Liquid Latent OS v4.0</div>
  </div>

  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
    import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
             signInWithPopup, GoogleAuthProvider, GithubAuthProvider,
             onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';

    const app = initializeApp({
      apiKey: 'AIzaSyBLTu0h9Q09Cr05_3_Zj_3yent5cO3iaHE',
      authDomain: 'heady-ai.firebaseapp.com',
      projectId: 'heady-ai',
    });
    const auth = getAuth(app);
    let isSignUp = false;

    window.toggleMode = () => {
      isSignUp = !isSignUp;
      document.getElementById('submit-btn').textContent = isSignUp ? 'Create Account' : 'Sign In';
      document.getElementById('toggle-text').textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
      document.getElementById('toggle-link').textContent = isSignUp ? 'Sign in' : 'Sign up';
    };

    const showStatus = (msg, type) => {
      const el = document.getElementById('status');
      el.textContent = msg;
      el.className = 'status ' + type;
    };

    // Email/password auth
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      try {
        const fn = isSignUp ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
        const result = await fn(auth, email, password);
        const token = await result.user.getIdToken();
        showStatus('Authenticated! Redirecting...', 'success');
        // Store token and redirect
        document.cookie = 'heady_token=' + token + '; path=/; secure; samesite=strict; max-age=3600';
        setTimeout(() => window.location.href = '/', 1000);
      } catch (err) {
        showStatus(err.message.replace('Firebase: ', ''), 'error');
      }
    });

    // Google auth
    document.getElementById('google-btn').addEventListener('click', async () => {
      try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        const token = await result.user.getIdToken();
        document.cookie = 'heady_token=' + token + '; path=/; secure; samesite=strict; max-age=3600';
        showStatus('Authenticated via Google! Redirecting...', 'success');
        setTimeout(() => window.location.href = '/', 1000);
      } catch (err) {
        showStatus(err.message.replace('Firebase: ', ''), 'error');
      }
    });

    // GitHub auth
    document.getElementById('github-btn').addEventListener('click', async () => {
      try {
        const result = await signInWithPopup(auth, new GithubAuthProvider());
        const token = await result.user.getIdToken();
        document.cookie = 'heady_token=' + token + '; path=/; secure; samesite=strict; max-age=3600';
        showStatus('Authenticated via GitHub! Redirecting...', 'success');
        setTimeout(() => window.location.href = '/', 1000);
      } catch (err) {
        showStatus(err.message.replace('Firebase: ', ''), 'error');
      }
    });

    // Check existing auth
    onAuthStateChanged(auth, (user) => {
      if (user) {
        showStatus('Signed in as ' + user.email, 'success');
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ── Auth Verify Endpoint ────────────────────────────────────────────
async function handleAuthVerify(request: Request, env: Env): Promise<Response> {
  const cookie = request.headers.get('Cookie') || '';
  const tokenMatch = cookie.match(/heady_token=([^;]+)/);

  if (!tokenMatch) {
    return Response.json({ authenticated: false }, { status: 401 });
  }

  // Verify Firebase ID token via Google's public keys
  try {
    const token = tokenMatch[1];
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    if (payload.exp * 1000 < Date.now()) {
      return Response.json({ authenticated: false, reason: 'expired' }, { status: 401 });
    }

    // Check issuer
    if (payload.iss !== 'https://securetoken.google.com/heady-ai') {
      return Response.json({ authenticated: false, reason: 'invalid_issuer' }, { status: 401 });
    }

    return Response.json({
      authenticated: true,
      uid: payload.user_id || payload.sub,
      email: payload.email,
      provider: payload.firebase?.sign_in_provider,
    });
  } catch (err) {
    return Response.json({ authenticated: false, error: (err as Error).message }, { status: 401 });
  }
}

// ── Content Type Inference ──────────────────────────────────────────
function inferContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    woff2: 'font/woff2',
    woff: 'font/woff',
    ttf: 'font/ttf',
    webp: 'image/webp',
    xml: 'application/xml',
    txt: 'text/plain',
  };
  return types[ext || ''] || 'text/html; charset=utf-8';
}

// ── Gateway Landing HTML ────────────────────────────────────────────
function gatewayHTML(hostname: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Heady\u2122 Liquid Gateway</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0a0a0f; color: #e4e4ef; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { text-align: center; max-width: 480px; padding: 3rem 2rem; }
    h1 { font-size: 2rem; background: linear-gradient(135deg, #6c63ff, #4ecdc4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
    p { color: #8888a0; line-height: 1.618; }
    code { background: #12121a; padding: 0.2em 0.5em; border-radius: 4px; font-size: 0.875rem; color: #6c63ff; }
    .links { margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .links a { color: #6c63ff; text-decoration: none; padding: 0.5rem 1rem; border: 1px solid #1e1e2e; border-radius: 8px; font-size: 0.875rem; transition: border-color 0.2s; }
    .links a:hover { border-color: #6c63ff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Heady\u2122 Liquid Gateway</h1>
    <p>Hostname <code>${hostname}</code> is not mapped to a site yet.</p>
    <p>This gateway orchestrates ${Object.keys(SITE_REGISTRY).length} sites through \u03C6-scaled routing in 3D vector space.</p>
    <div class="links">
      <a href="/health">Health</a>
      <a href="/health/sites">Sites</a>
      <a href="/health/vectors">Vectors</a>
      <a href="/health/colab">Colab</a>
      <a href="/auth">Sign In</a>
    </div>
  </div>
</body>
</html>`;
}
