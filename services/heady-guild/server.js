/*
 * © 2026 Heady™ Systems Inc.
 * HeadyGuild — Consumer Multi-Agent Teams
 *
 * MASSIVE GAP: CrewAI (15K stars), AutoGen (28K), LangGraph —
 * all developer-only. No consumer platform lets non-technical users
 * assemble personal AI teams.
 *
 * - Visually assemble teams from 89 bee types
 * - Assign roles (researcher, writer, critic, fact-checker)
 * - Hexagonal lattice visualization
 * - Share guild configs in HeadyRecipe Marketplace
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;
const STORE_PATH = path.join(__dirname, '../../.heady_cache/guild-store.json');

const BEE_ROLES = {
  researcher: { icon: '🔍', skills: ['search', 'summarize', 'fact-check'], swarm: 'Researcher' },
  writer: { icon: '✍️', skills: ['compose', 'edit', 'proofread'], swarm: 'Creator' },
  critic: { icon: '🧐', skills: ['evaluate', 'challenge', 'improve'], swarm: 'Analyst' },
  factchecker: { icon: '✅', skills: ['verify', 'source', 'cite'], swarm: 'Guardian' },
  strategist: { icon: '♟️', skills: ['plan', 'prioritize', 'optimize'], swarm: 'Navigator' },
  creative: { icon: '🎨', skills: ['ideate', 'design', 'innovate'], swarm: 'Alchemist' },
  mediator: { icon: '🤝', skills: ['negotiate', 'synthesize', 'align'], swarm: 'Diplomat' },
  executor: { icon: '⚡', skills: ['implement', 'automate', 'deliver'], swarm: 'Warrior' },
  mentor: { icon: '🧙', skills: ['guide', 'teach', 'advise'], swarm: 'Sage' },
  scout: { icon: '🦅', skills: ['explore', 'discover', 'alert'], swarm: 'Scout' }
};

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return { guilds: [], version: 1 }; }
}

function saveStore(store) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function createGuild(name, description, members) {
  const guild = {
    id: `guild_${Date.now()}`, name, description,
    created: new Date().toISOString(),
    members: members.map((m, i) => ({
      position: i,
      role: m.role,
      ...BEE_ROLES[m.role],
      name: m.name || `${BEE_ROLES[m.role]?.icon || '🐝'} ${m.role}`,
      // Hexagonal position in lattice
      hexX: Math.cos((i / members.length) * Math.PI * 2) * PHI,
      hexY: Math.sin((i / members.length) * Math.PI * 2) * PHI
    })),
    taskLog: [],
    effectiveness: 0.5
  };
  return guild;
}

function assignTask(guildId, task) {
  const store = loadStore();
  const guild = store.guilds.find(g => g.id === guildId);
  if (!guild) return { error: 'Guild not found' };

  // Route task to most appropriate member based on role skills
  const assignments = guild.members.map(member => {
    const relevance = (member.skills || []).some(s => task.toLowerCase().includes(s)) ? 0.8 : 0.3;
    return { member: member.name, role: member.role, relevance, assigned: relevance > 0.5 };
  });

  const taskEntry = {
    id: `task_${Date.now()}`, task, assignments,
    created: new Date().toISOString(), status: 'assigned'
  };

  guild.taskLog.push(taskEntry);
  store.version++;
  saveStore(store);

  return { task: taskEntry, guild: guild.name };
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') return res.end(JSON.stringify({ status: 'ok', service: 'heady-guild' }));

  if (parsed.pathname === '/create' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { name, description, members } = JSON.parse(body);
      const store = loadStore();
      const guild = createGuild(name, description, members || [{ role: 'researcher' }, { role: 'writer' }, { role: 'critic' }]);
      store.guilds.push(guild);
      store.version++;
      saveStore(store);
      res.end(JSON.stringify({ created: guild }));
    });
    return;
  }

  if (parsed.pathname === '/assign' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { guildId, task } = JSON.parse(body);
      res.end(JSON.stringify(assignTask(guildId, task)));
    });
    return;
  }

  if (parsed.pathname === '/guilds') return res.end(JSON.stringify(loadStore()));
  if (parsed.pathname === '/roles') return res.end(JSON.stringify(BEE_ROLES, null, 2));

  res.end(JSON.stringify({ service: 'HeadyGuild', version: '1.0.0',
    description: 'Consumer multi-agent teams — assemble personal AI squads from 89 bee types',
    endpoints: { '/create': 'POST', '/assign': 'POST', '/guilds': 'GET', '/roles': 'GET' } }));
});

const PORT = process.env.PORT || 8098;
server.listen(PORT, () => console.log(`⚔️ HeadyGuild on :${PORT}`));

module.exports = { createGuild, assignTask, BEE_ROLES };
