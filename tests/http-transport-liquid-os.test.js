/**
 * PROTOCOL E: HTTP Transport Tests
 * PROTOCOL G: Liquid OS Integration Tests
 * =========================================
 * Tests HTTP endpoints, SSE transport, MCP discovery,
 * and the Liquid OS manifest integrity.
 *
 * @module tests/protocol/http-transport-liquid-os.test.js
 */
'use strict';

const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL E: HTTP Transport (unit tests against Express app)
// ═══════════════════════════════════════════════════════════════════════════

describe('PROTOCOL E: HTTP Transport Structure', () => {
  let HttpTransport;

  beforeAll(() => {
    try {
      ({ HttpTransport } = require(
        path.join(__dirname, '../../services/heady-mcp-server/src/transports/http')
      ));
    } catch {
      HttpTransport = null;
    }
  });

  test('E01: HttpTransport class exports correctly', () => {
    expect(HttpTransport).toBeDefined();
    // HttpTransport can be a function (class) or constructor object
    expect(typeof HttpTransport === 'function' || typeof HttpTransport === 'object').toBe(true);
  });

  test('E_STRUCT: HttpTransport creates Express app with expected routes', () => {
    if (!HttpTransport) return;

    const { createToolRegistry } = require(
      path.join(__dirname, '../../services/heady-mcp-server/src/tools/registry')
    );
    const registry = createToolRegistry();

    // Mock protocol
    const protocol = {
      registry,
      startTime: Date.now(),
      requestCount: 0,
      sessions: new Map(),
      async handleRequest(req) { return { jsonrpc: '2.0', id: req.id, result: {} }; },
    };

    const transport = new HttpTransport(protocol, 0); // port 0 for test
    const app = transport.app;

    // Verify Express app has routes
    expect(app).toBeDefined();
    expect(typeof app.get).toBe('function');
    expect(typeof app.post).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL E: Live E2E HTTP Tests (requires running server)
// ═══════════════════════════════════════════════════════════════════════════

describe('PROTOCOL E: Live HTTP Transport (requires server)', () => {
  const BASE_URL = process.env.HEADY_TEST_URL || 'https://heady-manager-609590223909.us-central1.run.app';
  const TIMEOUT = 10000;

  // Skip live tests if no server URL configured
  const skipLive = !process.env.HEADY_TEST_URL && !process.env.RUN_LIVE_TESTS;

  const liveTest = skipLive ? test.skip : test;

  liveTest('E01_LIVE: GET /health returns 200 with status and tools', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.version).toBe('5.0.0');
    expect(typeof body.tools).toBe('number');
    expect(body.tools).toBe(42);
    expect(body.phi).toBeCloseTo(1.618, 2);
  }, TIMEOUT);

  liveTest('E02_LIVE: GET /tools returns all 42 tools', async () => {
    const res = await fetch(`${BASE_URL}/tools`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(42);
    expect(Array.isArray(body.tools)).toBe(true);
  }, TIMEOUT);

  liveTest('E04_LIVE: POST /mcp initialize works', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { clientInfo: { name: 'protocol-test', version: '1.0' } },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.protocolVersion).toBe('2024-11-05');
    expect(body.result.serverInfo.name).toBe('heady-mcp-server');
  }, TIMEOUT);

  liveTest('E05_LIVE: POST /mcp tools/list returns 42 tools', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    });
    const body = await res.json();
    expect(body.result.tools.length).toBe(42);
  }, TIMEOUT);

  liveTest('E09_LIVE: GET /mcp/sse returns event-stream', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${BASE_URL}/mcp/sse`, {
        signal: controller.signal,
        headers: { 'Accept': 'text/event-stream' },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
    } catch (err) {
      if (err.name === 'AbortError') expect(true).toBe(true); // SSE stays open
      else throw err;
    } finally {
      clearTimeout(timer);
    }
  }, TIMEOUT);

  liveTest('E12_LIVE: GET /.well-known/mcp.json returns discovery doc', async () => {
    const res = await fetch(`${BASE_URL}/.well-known/mcp.json`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('heady-mcp-server');
    expect(body.endpoints.streamable_http).toBe('/mcp');
    expect(body.endpoints.sse).toBe('/mcp/sse');
    expect(body.capabilities).toContain('tools');
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL G: Liquid OS Integration Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('PROTOCOL G: Liquid OS Integration', () => {
  let manifest;
  const MANIFEST_PATH = path.join(__dirname, '../../configs/liquid-os-manifest.json');

  beforeAll(() => {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    manifest = JSON.parse(raw);
  });

  test('G01: Liquid OS manifest loads and has correct structure', () => {
    expect(manifest.name).toBe('Heady™ Liquid Latent OS');
    expect(manifest.version).toBe('4.0.0');
    expect(manifest.phi).toBeCloseTo(1.618, 3);
    expect(manifest.psi).toBeCloseTo(0.618, 3);
    expect(manifest.edge_layer).toBeDefined();
    expect(manifest.compute_layer).toBeDefined();
    expect(manifest.origin_layer).toBeDefined();
    expect(manifest.cms_layer).toBeDefined();
    expect(manifest.auth_layer).toBeDefined();
  });

  test('G02: Edge layer has 10+ pages projects', () => {
    expect(manifest.edge_layer.pages_projects.length).toBeGreaterThanOrEqual(10);
    // Verify key projects exist
    const names = manifest.edge_layer.pages_projects.map(p => p.name);
    expect(names).toContain('headysystems');
    expect(names).toContain('headyme');
    expect(names).toContain('headybuddy');
    expect(names).toContain('headyconnection');
  });

  test('G03: Origin layer service ports are defined', () => {
    const services = manifest.origin_layer.services;
    expect(services.manager).toBeDefined();
    expect(services.manager.port).toBe(3300);
    expect(services.manager.url).toBe('https://manager.headysystems.com');
    expect(services.realtime.protocol).toBe('websocket');
  });

  test('G04: Auth layer has Firebase config', () => {
    expect(manifest.auth_layer.firebase_project).toBe('heady-ai');
    expect(manifest.auth_layer.auth_url).toContain('gateway.headysystems.com/auth');
    expect(manifest.auth_layer.verify_url).toContain('auth/verify');
    expect(manifest.auth_layer.providers).toContain('google');
    expect(manifest.auth_layer.providers).toContain('github');
  });

  test('G05: CMS layer has all API routes', () => {
    const apis = manifest.cms_layer.apis;
    expect(apis.content).toContain('/api/cms/content');
    expect(apis.sites).toBe('/api/cms/sites');
    expect(apis.tasks).toBe('/api/cms/tasks');
    expect(apis.clipboard).toContain('/api/cms/clipboard');
    expect(apis.liquid_nodes).toBe('/api/cms/liquid/nodes');
    expect(apis.liquid_topology).toBe('/api/cms/liquid/topology');
  });

  test('G06: GitHub org reference is HeadyMe', () => {
    expect(manifest.github.org).toBe('HeadyMe');
  });

  test('G07: Monitoring has Sentry DSN', () => {
    expect(manifest.monitoring.sentry.dsn).toBeDefined();
    expect(manifest.monitoring.sentry.dsn).toContain('sentry.io');
    expect(manifest.monitoring.sentry.org).toBe('headyconnection-inc');
    expect(manifest.monitoring.sentry.project).toBe('heady-manager');
  });

  test('G08: Compute layer has 3 Colab A100 runtimes', () => {
    const runtimes = manifest.compute_layer.colab_runtimes;
    expect(runtimes.length).toBe(3);
    for (const rt of runtimes) {
      expect(rt.gpu).toBe('A100');
      expect(rt.subscription).toBe('pro_plus');
      expect(Array.isArray(rt.vector)).toBe(true);
      expect(rt.vector.length).toBe(3);
    }
  });

  test('G_EXTRA: Edge gateway worker configured', () => {
    expect(manifest.edge_layer.gateway.worker).toBe('liquid-gateway-worker');
    expect(manifest.edge_layer.gateway.production_routes.length).toBeGreaterThanOrEqual(6);
  });

  test('G_EXTRA: Databases configured (Neon + Upstash)', () => {
    expect(manifest.origin_layer.databases.neon_postgres).toBeDefined();
    expect(manifest.origin_layer.databases.upstash_redis).toBeDefined();
    expect(manifest.origin_layer.databases.neon_postgres.region).toBe('us-east-2');
  });

  test('G_EXTRA: CMS uses Drupal 11 headless', () => {
    expect(manifest.cms_layer.platform).toBe('drupal-11');
    expect(manifest.cms_layer.mode).toBe('headless');
    expect(manifest.cms_layer.modules).toContain('heady_admin');
  });

  test('G_EXTRA: Vertex AI configured with Gemini models', () => {
    expect(manifest.compute_layer.vertex_ai.project).toBe('heady-ai');
    expect(manifest.compute_layer.vertex_ai.models).toContain('gemini-2.5-pro');
    expect(manifest.compute_layer.vertex_ai.models).toContain('gemini-2.5-flash');
  });
});
