/*
 * © 2026 Heady™ Systems Inc.
 * HeadyBridge — Natural Language Service Connections
 *
 * No NL-to-integration tool is platform-agnostic.
 * HeadyBridge uses MCP as the universal adapter layer.
 * Describe connections in plain English, get working integrations.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;
const STORE_PATH = path.join(__dirname, '../../.heady_cache/bridge-store.json');

// ── Service Registry ─────────────────────────────────────────────────
const KNOWN_SERVICES = {
  github: { type: 'api', baseUrl: 'https://api.github.com', auth: 'token', mcp: 'github-mcp-server' },
  slack: { type: 'webhook', baseUrl: 'https://hooks.slack.com', auth: 'webhook_url' },
  discord: { type: 'webhook', baseUrl: 'https://discord.com/api', auth: 'bot_token' },
  notion: { type: 'api', baseUrl: 'https://api.notion.com', auth: 'bearer', mcp: 'notion-mcp' },
  postgres: { type: 'database', connection: 'postgresql://', mcp: 'postgres-mcp' },
  redis: { type: 'cache', connection: 'redis://' },
  cloudflare: { type: 'api', baseUrl: 'https://api.cloudflare.com', auth: 'bearer' },
  stripe: { type: 'api', baseUrl: 'https://api.stripe.com', auth: 'bearer' },
  openai: { type: 'ai', baseUrl: 'https://api.openai.com', auth: 'bearer' },
  anthropic: { type: 'ai', baseUrl: 'https://api.anthropic.com', auth: 'x-api-key' },
  google_cloud: { type: 'cloud', baseUrl: 'https://cloud.google.com', auth: 'service_account', mcp: 'cloudrun' }
};

// ── NL → Bridge Parser ──────────────────────────────────────────────
function parseConnection(text) {
  const lower = text.toLowerCase();
  const services = Object.keys(KNOWN_SERVICES).filter(s => lower.includes(s.replace('_', ' ')));

  let trigger = null, action = null;
  const whenMatch = lower.match(/when\s+(.+?)(?:,|then|do|→)/);
  if (whenMatch) trigger = whenMatch[1].trim();

  const thenMatch = lower.match(/(?:then|do|→|send|post|create|update|notify)\s+(.+)/);
  if (thenMatch) action = thenMatch[1].trim();

  return {
    services, trigger, action,
    sourceService: services[0] || null,
    targetService: services[1] || services[0] || null,
    mcpServers: services.map(s => KNOWN_SERVICES[s]?.mcp).filter(Boolean),
    bridgeType: trigger ? 'event-driven' : 'on-demand',
    config: services.map(s => ({ name: s, ...KNOWN_SERVICES[s] }))
  };
}

function createBridge(nlText) {
  const parsed = parseConnection(nlText);
  const bridge = {
    id: `bridge_${Date.now()}`, input: nlText,
    created: new Date().toISOString(), ...parsed,
    status: 'configured', executions: 0
  };
  return bridge;
}

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return { bridges: [], version: 1 }; }
}

function saveStore(store) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') return res.end(JSON.stringify({ status: 'ok', service: 'heady-bridge' }));

  if (parsed.pathname === '/connect' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { text } = JSON.parse(body);
      const bridge = createBridge(text);
      const store = loadStore();
      store.bridges.push(bridge);
      store.version++;
      saveStore(store);
      res.end(JSON.stringify({ created: bridge }));
    });
    return;
  }

  if (parsed.pathname === '/bridges') return res.end(JSON.stringify(loadStore()));
  if (parsed.pathname === '/services') return res.end(JSON.stringify(KNOWN_SERVICES, null, 2));

  res.end(JSON.stringify({ service: 'HeadyBridge', version: '1.0.0',
    description: 'NL service connections using MCP as universal adapter layer',
    endpoints: { '/connect': 'POST {text}', '/bridges': 'GET', '/services': 'GET' } }));
});

const PORT = process.env.PORT || 8101;
server.listen(PORT, () => console.log(`🌉 HeadyBridge on :${PORT}`));

module.exports = { parseConnection, createBridge, KNOWN_SERVICES };
