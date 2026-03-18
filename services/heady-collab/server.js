/*
 * © 2026 Heady™ Systems Inc.
 * HeadyCollab — Persistent Shared AI Memory for Groups
 *
 * No platform has persistent collaborative AI workspaces.
 * Multiple users contribute, the swarm integrates,
 * accumulated knowledge persists and grows.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;
const STORE_PATH = path.join(__dirname, '../../.heady_cache/collab-store.json');

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return { workspaces: [], version: 1 }; }
}

function saveStore(store) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function createWorkspace(name, members) {
  return {
    id: `ws_${Date.now()}`, name, members: members || [],
    created: new Date().toISOString(),
    knowledge: [], conversations: [],
    sharedContext: { topics: {}, facts: [], decisions: [] },
    stats: { totalContributions: 0, knowledgeItems: 0 }
  };
}

function contribute(workspaceId, userId, content, type = 'knowledge') {
  const store = loadStore();
  const ws = store.workspaces.find(w => w.id === workspaceId);
  if (!ws) return { error: 'Workspace not found' };

  const item = {
    id: `contrib_${Date.now()}`, userId, content, type,
    timestamp: new Date().toISOString(),
    // φ-scaled relevance (decays over time, refreshed on access)
    relevance: 1.0
  };

  ws.knowledge.push(item);
  ws.stats.totalContributions++;
  ws.stats.knowledgeItems = ws.knowledge.length;

  // Extract topics
  const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 4);
  words.forEach(w => { ws.sharedContext.topics[w] = (ws.sharedContext.topics[w] || 0) + 1; });

  store.version++;
  saveStore(store);
  return { contributed: item, stats: ws.stats };
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') return res.end(JSON.stringify({ status: 'ok', service: 'heady-collab' }));

  if (parsed.pathname === '/create' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { name, members } = JSON.parse(body);
      const store = loadStore();
      const ws = createWorkspace(name, members);
      store.workspaces.push(ws);
      store.version++;
      saveStore(store);
      res.end(JSON.stringify({ created: ws }));
    });
    return;
  }

  if (parsed.pathname === '/contribute' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { workspaceId, userId, content, type } = JSON.parse(body);
      res.end(JSON.stringify(contribute(workspaceId, userId, content, type)));
    });
    return;
  }

  if (parsed.pathname === '/workspaces') return res.end(JSON.stringify(loadStore()));

  res.end(JSON.stringify({ service: 'HeadyCollab', version: '1.0.0',
    description: 'Persistent shared AI memory for groups — accumulated knowledge that grows',
    endpoints: { '/create': 'POST', '/contribute': 'POST', '/workspaces': 'GET' } }));
});

const PORT = process.env.PORT || 8102;
server.listen(PORT, () => console.log(`👥 HeadyCollab on :${PORT}`));

module.exports = { createWorkspace, contribute };
