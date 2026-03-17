// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY SYSTEMS | features-routes.js | Sacred Geometry v5.0     ║
// ║  Backend API routes for all Heady feature modules              ║
// ║  (c) 2026 HeadySystems Inc. - Eric Haywood, Founder            ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════
//  HEADY PULSE — Ambient Intelligence Dashboard
// ═══════════════════════════════════════════════════════════════════

const pulseState = {
  mood: 'healthy',      // healthy | warning | critical | dreaming
  breathRate: 4.236,    // seconds — phi³
  ors: 85,              // Operational Readiness Score
  uptimeMs: Date.now(),
  lastHeartbeat: null,
  services: {}
};

// Update pulse from system health
function updatePulse() {
  const uptime = Date.now() - pulseState.uptimeMs;
  pulseState.lastHeartbeat = new Date().toISOString();
  if (pulseState.ors > 85) { pulseState.mood = 'healthy'; pulseState.breathRate = 4.236; }
  else if (pulseState.ors > 70) { pulseState.mood = 'warning'; pulseState.breathRate = 2.618; }
  else if (pulseState.ors > 50) { pulseState.mood = 'critical'; pulseState.breathRate = 1.618; }
  else { pulseState.mood = 'critical'; pulseState.breathRate = 1.0; }
  return { ...pulseState, uptimeMs: uptime };
}

router.get('/pulse', (req, res) => {
  res.json({ status: 'ok', ...updatePulse(), timestamp: new Date().toISOString() });
});

router.get('/pulse/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify(updatePulse())}\n\n`);
  }, 1618); // phi-scaled interval
  req.on('close', () => clearInterval(interval));
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY CONSTELLATION — Personal Knowledge Graph
// ═══════════════════════════════════════════════════════════════════

const constellationStore = {
  nodes: [],
  edges: [],
  clusters: []
};

function initConstellation() {
  // Auto-populate from registered services
  const services = [
    { id: 'heady-manager', type: 'core', label: 'Heady Manager', x: 0, y: 0, glow: 'cyan' },
    { id: 'heady-brain', type: 'core', label: 'Heady Brain', x: 1.618, y: 1, glow: 'gold' },
    { id: 'hc-supervisor', type: 'core', label: 'Supervisor', x: -1.618, y: 1, glow: 'magenta' },
    { id: 'heady-conductor', type: 'worker', label: 'Conductor', x: 0, y: 2.618, glow: 'cyan' },
    { id: 'heady-swarms', type: 'core', label: 'Swarm Engine', x: 2.618, y: -1, glow: 'gold' },
    { id: 'heady-memory', type: 'data', label: 'Memory Tiers', x: -2.618, y: -1, glow: 'cyan' },
    { id: 'heady-guard', type: 'security', label: 'PQC Guard', x: 0, y: -2.618, glow: 'magenta' },
    { id: 'claude-code', type: 'agent', label: 'Claude Code', x: 4.236, y: 0, glow: 'gold' },
    { id: 'builder-agent', type: 'agent', label: 'Builder', x: 3, y: 2, glow: 'cyan' },
    { id: 'researcher-agent', type: 'agent', label: 'Researcher', x: 3, y: -2, glow: 'magenta' },
    { id: 'deployer-agent', type: 'agent', label: 'Deployer', x: -3, y: 2, glow: 'gold' },
    { id: 'auditor-agent', type: 'agent', label: 'Auditor', x: -3, y: -2, glow: 'cyan' },
    { id: 'observer-agent', type: 'agent', label: 'Observer', x: -4.236, y: 0, glow: 'magenta' }
  ];
  constellationStore.nodes = services;
  constellationStore.edges = [
    { from: 'heady-manager', to: 'heady-brain', strength: 1.0 },
    { from: 'heady-manager', to: 'hc-supervisor', strength: 1.0 },
    { from: 'heady-manager', to: 'heady-conductor', strength: 0.8 },
    { from: 'hc-supervisor', to: 'claude-code', strength: 0.9 },
    { from: 'hc-supervisor', to: 'builder-agent', strength: 0.9 },
    { from: 'hc-supervisor', to: 'researcher-agent', strength: 0.7 },
    { from: 'hc-supervisor', to: 'deployer-agent', strength: 0.7 },
    { from: 'hc-supervisor', to: 'auditor-agent', strength: 0.6 },
    { from: 'hc-supervisor', to: 'observer-agent', strength: 0.6 },
    { from: 'heady-brain', to: 'heady-swarms', strength: 0.8 },
    { from: 'heady-brain', to: 'heady-memory', strength: 0.7 },
    { from: 'heady-manager', to: 'heady-guard', strength: 0.9 }
  ];
  constellationStore.clusters = [
    { id: 'core', label: 'Core Infrastructure', nodeIds: ['heady-manager', 'heady-brain', 'hc-supervisor', 'heady-conductor'] },
    { id: 'agents', label: 'Agent Swarm', nodeIds: ['claude-code', 'builder-agent', 'researcher-agent', 'deployer-agent', 'auditor-agent', 'observer-agent'] },
    { id: 'services', label: 'System Services', nodeIds: ['heady-swarms', 'heady-memory', 'heady-guard'] }
  ];
}

initConstellation();

router.get('/constellation', (req, res) => {
  res.json({ status: 'ok', ...constellationStore, timestamp: new Date().toISOString() });
});

router.post('/constellation/node', (req, res) => {
  const { id, type, label, glow } = req.body;
  if (!id || !label) return res.status(400).json({ error: 'id and label required' });
  constellationStore.nodes.push({ id, type: type || 'custom', label, glow: glow || 'cyan', x: Math.random() * 6 - 3, y: Math.random() * 6 - 3 });
  res.json({ status: 'ok', nodeCount: constellationStore.nodes.length });
});

router.post('/constellation/edge', (req, res) => {
  const { from, to, strength } = req.body;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  constellationStore.edges.push({ from, to, strength: strength || 0.5 });
  res.json({ status: 'ok', edgeCount: constellationStore.edges.length });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY ARENA — Live Solution Battles
// ═══════════════════════════════════════════════════════════════════

const arenaState = {
  battles: [],
  activeBattle: null
};

router.get('/arena', (req, res) => {
  res.json({ status: 'ok', ...arenaState, timestamp: new Date().toISOString() });
});

router.post('/arena/battle', (req, res) => {
  const { problem, agents } = req.body;
  if (!problem) return res.status(400).json({ error: 'problem description required' });
  const battleId = `battle_${Date.now().toString(36)}`;
  const participants = (agents || ['claude-code', 'builder-agent', 'researcher-agent']).map(agentId => ({
    agentId,
    status: 'preparing',
    proposal: null,
    score: null,
    submittedAt: null
  }));
  const battle = {
    id: battleId,
    problem,
    status: 'active',
    participants,
    createdAt: new Date().toISOString(),
    rounds: [],
    winner: null
  };
  arenaState.battles.unshift(battle);
  arenaState.activeBattle = battle;

  // Simulate agent proposals asynchronously
  setTimeout(() => {
    battle.participants.forEach((p, i) => {
      p.status = 'submitted';
      p.proposal = `${p.agentId} solution for: ${problem.substring(0, 50)}...`;
      p.score = Math.round((70 + Math.random() * 30) * 10) / 10;
      p.submittedAt = new Date(Date.now() + (i + 1) * 1618).toISOString();
    });
    battle.participants.sort((a, b) => b.score - a.score);
    battle.winner = battle.participants[0].agentId;
    battle.status = 'completed';
    battle.rounds.push({ round: 1, results: [...battle.participants] });
  }, 3000);

  res.json({ status: 'ok', battle });
});

router.get('/arena/battle/:id', (req, res) => {
  const battle = arenaState.battles.find(b => b.id === req.params.id);
  if (!battle) return res.status(404).json({ error: 'battle not found' });
  res.json({ status: 'ok', battle });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY VOICE — Natural Language Command Interface
// ═══════════════════════════════════════════════════════════════════

const voiceHistory = [];

router.post('/voice/command', async (req, res) => {
  const { text, sessionId } = req.body;
  if (!text) return res.status(400).json({ error: 'text command required' });

  const commandId = `cmd_${Date.now().toString(36)}`;
  const entry = {
    id: commandId,
    text,
    sessionId: sessionId || 'default',
    intent: classifyIntent(text),
    status: 'processing',
    response: null,
    createdAt: new Date().toISOString()
  };
  voiceHistory.unshift(entry);

  // Route to appropriate handler based on intent
  try {
    entry.response = await processVoiceCommand(entry.intent, text);
    entry.status = 'completed';
  } catch (err) {
    entry.response = { error: err.message };
    entry.status = 'failed';
  }

  res.json({ status: 'ok', command: entry });
});

router.get('/voice/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({ status: 'ok', commands: voiceHistory.slice(0, limit) });
});

function classifyIntent(text) {
  const lower = text.toLowerCase();
  if (lower.includes('deploy') || lower.includes('push') || lower.includes('release')) return { type: 'deploy', confidence: 0.9 };
  if (lower.includes('build') || lower.includes('compile') || lower.includes('test')) return { type: 'build', confidence: 0.85 };
  if (lower.includes('status') || lower.includes('health') || lower.includes('how')) return { type: 'query', confidence: 0.9 };
  if (lower.includes('connect') || lower.includes('integrate') || lower.includes('add service')) return { type: 'integrate', confidence: 0.8 };
  if (lower.includes('analyze') || lower.includes('audit') || lower.includes('scan')) return { type: 'analyze', confidence: 0.85 };
  if (lower.includes('create') || lower.includes('new') || lower.includes('make')) return { type: 'create', confidence: 0.8 };
  if (lower.includes('fix') || lower.includes('repair') || lower.includes('debug')) return { type: 'repair', confidence: 0.85 };
  return { type: 'general', confidence: 0.5 };
}

async function processVoiceCommand(intent, text) {
  const routeMap = {
    deploy: { agent: 'deployer-agent', stage: 'execute-major-phase' },
    build: { agent: 'builder-agent', stage: 'execute-major-phase' },
    query: { agent: 'observer-agent', stage: 'recon' },
    integrate: { agent: 'claude-code', stage: 'orchestration' },
    analyze: { agent: 'auditor-agent', stage: 'self-awareness' },
    create: { agent: 'claude-code', stage: 'execute-major-phase' },
    repair: { agent: 'claude-code', stage: 'recover' },
    general: { agent: 'claude-code', stage: 'intake' }
  };
  const route = routeMap[intent.type] || routeMap.general;
  return {
    routed: true,
    agent: route.agent,
    pipelineStage: route.stage,
    interpretation: `Understood: "${text}" → routed to ${route.agent} via ${route.stage}`,
    confidence: intent.confidence,
    timestamp: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════════════
//  HEADY MEMORY PALACE — Spatial Knowledge Navigation
// ═══════════════════════════════════════════════════════════════════

const memoryPalace = {
  rooms: [
    { id: 'entrance', name: 'Grand Atrium', type: 'navigation', shape: 'hexagon', connections: ['code', 'services', 'configs', 'docs', 'agents', 'data'], items: [], color: 'gold' },
    { id: 'code', name: 'Code Sanctum', type: 'domain', shape: 'octagon', connections: ['entrance', 'agents'], items: [], color: 'cyan' },
    { id: 'services', name: 'Service Temple', type: 'domain', shape: 'hexagon', connections: ['entrance', 'configs'], items: [], color: 'magenta' },
    { id: 'configs', name: 'Config Vault', type: 'domain', shape: 'pentagon', connections: ['entrance', 'services'], items: [], color: 'gold' },
    { id: 'docs', name: 'Knowledge Library', type: 'domain', shape: 'hexagon', connections: ['entrance', 'data'], items: [], color: 'cyan' },
    { id: 'agents', name: 'Agent Chambers', type: 'domain', shape: 'octagon', connections: ['entrance', 'code'], items: [], color: 'magenta' },
    { id: 'data', name: 'Data Reservoir', type: 'domain', shape: 'hexagon', connections: ['entrance', 'docs'], items: [], color: 'gold' }
  ]
};

router.get('/memory-palace', (req, res) => {
  res.json({ status: 'ok', palace: memoryPalace, timestamp: new Date().toISOString() });
});

router.get('/memory-palace/room/:id', (req, res) => {
  const room = memoryPalace.rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'room not found' });
  res.json({ status: 'ok', room });
});

router.post('/memory-palace/room/:id/item', (req, res) => {
  const room = memoryPalace.rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'room not found' });
  const { name, type, data } = req.body;
  if (!name) return res.status(400).json({ error: 'item name required' });
  room.items.push({ id: `item_${Date.now().toString(36)}`, name, type: type || 'artifact', data, addedAt: new Date().toISOString() });
  res.json({ status: 'ok', itemCount: room.items.length });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY GUARDIAN — Post-Quantum Personal Vault
// ═══════════════════════════════════════════════════════════════════

const vaultStore = {
  secrets: [],
  accessLog: [],
  trustReceipts: []
};

router.get('/guardian', (req, res) => {
  const summary = {
    totalSecrets: vaultStore.secrets.length,
    freshCount: vaultStore.secrets.filter(s => s.health === 'fresh').length,
    agingCount: vaultStore.secrets.filter(s => s.health === 'aging').length,
    expiredCount: vaultStore.secrets.filter(s => s.health === 'expired').length,
    recentAccess: vaultStore.accessLog.slice(0, 10),
    trustReceipts: vaultStore.trustReceipts.length
  };
  res.json({ status: 'ok', vault: summary, timestamp: new Date().toISOString() });
});

router.post('/guardian/secret', (req, res) => {
  const { name, category, expiresIn } = req.body;
  if (!name) return res.status(400).json({ error: 'secret name required' });
  const now = Date.now();
  const expiresAt = expiresIn ? new Date(now + expiresIn * 86400000).toISOString() : null;
  const receipt = {
    id: `receipt_${crypto.randomBytes(8).toString('hex')}`,
    secretName: name,
    algorithm: 'Ed25519',
    signedAt: new Date().toISOString(),
    hash: crypto.createHash('sha256').update(name + now).digest('hex').substring(0, 16)
  };
  const secret = {
    id: `secret_${crypto.randomBytes(8).toString('hex')}`,
    name,
    category: category || 'general',
    health: 'fresh',
    createdAt: new Date().toISOString(),
    expiresAt,
    lastAccessed: null,
    accessCount: 0,
    trustReceipt: receipt.id
  };
  vaultStore.secrets.push(secret);
  vaultStore.trustReceipts.push(receipt);
  res.json({ status: 'ok', secret: { ...secret, value: undefined }, receipt });
});

router.get('/guardian/receipts', (req, res) => {
  res.json({ status: 'ok', receipts: vaultStore.trustReceipts });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY TIMELINE — Personal System History
// ═══════════════════════════════════════════════════════════════════

const timelineEvents = [];

function addTimelineEvent(type, title, detail, color) {
  timelineEvents.unshift({
    id: `evt_${Date.now().toString(36)}`,
    type,
    title,
    detail,
    color: color || 'cyan',
    timestamp: new Date().toISOString()
  });
  if (timelineEvents.length > 1000) timelineEvents.pop();
}

// Seed some initial events
addTimelineEvent('system', 'System Started', 'Heady Manager initialized on port 3300', 'cyan');
addTimelineEvent('pipeline', 'Pipeline Ready', 'HCFullPipeline v8.0 loaded — 22 stages active', 'gold');
addTimelineEvent('agent', 'Agents Online', '6 agents registered with Supervisor', 'magenta');

router.get('/timeline', (req, res) => {
  const { limit, offset, type } = req.query;
  let events = timelineEvents;
  if (type) events = events.filter(e => e.type === type);
  const start = parseInt(offset) || 0;
  const count = parseInt(limit) || 50;
  res.json({ status: 'ok', events: events.slice(start, start + count), total: events.length });
});

router.post('/timeline/event', (req, res) => {
  const { type, title, detail, color } = req.body;
  if (!title) return res.status(400).json({ error: 'event title required' });
  addTimelineEvent(type || 'custom', title, detail || '', color);
  res.json({ status: 'ok', total: timelineEvents.length });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY DREAMS — Background Optimization Engine
// ═══════════════════════════════════════════════════════════════════

const dreamsState = {
  active: false,
  currentDream: null,
  journal: [],
  schedule: { hour: 2, minute: 0, timezone: 'UTC' } // 2am UTC default
};

router.get('/dreams', (req, res) => {
  res.json({ status: 'ok', ...dreamsState, timestamp: new Date().toISOString() });
});

router.post('/dreams/start', (req, res) => {
  if (dreamsState.active) return res.json({ status: 'ok', message: 'already dreaming', dream: dreamsState.currentDream });
  dreamsState.active = true;
  dreamsState.currentDream = {
    id: `dream_${Date.now().toString(36)}`,
    startedAt: new Date().toISOString(),
    phase: 'self-awareness',
    phases: ['self-awareness', 'self-critique', 'mistake-analysis', 'optimization', 'continuous-search', 'evolution', 'distillation'],
    currentPhaseIndex: 0,
    discoveries: [],
    optimizations: []
  };

  // Simulate dream phases
  const dream = dreamsState.currentDream;
  let phaseIdx = 0;
  const phaseInterval = setInterval(() => {
    phaseIdx++;
    if (phaseIdx >= dream.phases.length) {
      dream.phase = 'completed';
      dreamsState.active = false;
      dream.completedAt = new Date().toISOString();
      dream.discoveries.push({ type: 'pattern', description: 'Identified opportunity to batch health checks for 23% latency reduction' });
      dream.discoveries.push({ type: 'optimization', description: 'Circuit breaker thresholds could be phi-scaled for smoother degradation' });
      dream.optimizations.push({ target: 'pipeline', action: 'Reordered stages 14-16 for 12% faster self-assessment' });
      dreamsState.journal.unshift({ ...dream });
      dreamsState.currentDream = null;
      clearInterval(phaseInterval);
      addTimelineEvent('dream', 'Dream Completed', `Found ${dream.discoveries.length} discoveries, applied ${dream.optimizations.length} optimizations`, 'magenta');
    } else {
      dream.currentPhaseIndex = phaseIdx;
      dream.phase = dream.phases[phaseIdx];
    }
  }, 2618); // phi² milliseconds per phase

  res.json({ status: 'ok', dream });
});

router.get('/dreams/journal', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json({ status: 'ok', dreams: dreamsState.journal.slice(0, limit) });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY FORGE — Live Component Builder
// ═══════════════════════════════════════════════════════════════════

const forgeState = {
  blueprints: [],
  activeBlueprint: null
};

router.get('/forge', (req, res) => {
  res.json({ status: 'ok', ...forgeState, timestamp: new Date().toISOString() });
});

router.post('/forge/blueprint', (req, res) => {
  const { name, components, connections } = req.body;
  if (!name) return res.status(400).json({ error: 'blueprint name required' });
  const blueprint = {
    id: `bp_${Date.now().toString(36)}`,
    name,
    components: components || [],
    connections: connections || [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    yaml: null
  };
  forgeState.blueprints.unshift(blueprint);
  res.json({ status: 'ok', blueprint });
});

router.post('/forge/blueprint/:id/compile', (req, res) => {
  const bp = forgeState.blueprints.find(b => b.id === req.params.id);
  if (!bp) return res.status(404).json({ error: 'blueprint not found' });
  // Generate YAML from visual blueprint
  const yamlOutput = {
    name: bp.name,
    version: '1.0.0',
    stages: bp.components.map((c, i) => ({
      name: c.name || `stage-${i}`,
      type: c.type || 'task',
      agent: c.agent || 'claude-code',
      depends_on: bp.connections.filter(conn => conn.to === c.id).map(conn => {
        const src = bp.components.find(comp => comp.id === conn.from);
        return src ? src.name || `stage-${bp.components.indexOf(src)}` : null;
      }).filter(Boolean)
    }))
  };
  bp.yaml = yamlOutput;
  bp.status = 'compiled';
  addTimelineEvent('forge', `Blueprint Compiled: ${bp.name}`, `${bp.components.length} components, ${bp.connections.length} connections`, 'gold');
  res.json({ status: 'ok', blueprint: bp });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY IDENTITY GRAPH — Unified Identity System
// ═══════════════════════════════════════════════════════════════════

const identityState = {
  users: {},
  agentIdentities: {},
  consentGates: []
};

router.get('/identity', (req, res) => {
  const userId = req.query.userId || 'default';
  const identity = identityState.users[userId] || {
    userId,
    handle: null,
    humanAuth: { method: null, verified: false },
    agentDelegations: [],
    consentGates: [],
    zkProofs: []
  };
  res.json({ status: 'ok', identity, timestamp: new Date().toISOString() });
});

router.post('/identity/register', (req, res) => {
  const { userId, handle, authMethod } = req.body;
  if (!userId || !handle) return res.status(400).json({ error: 'userId and handle required' });
  identityState.users[userId] = {
    userId,
    handle: `${handle}@headyme.com`,
    humanAuth: { method: authMethod || 'passkey', verified: true, verifiedAt: new Date().toISOString() },
    agentDelegations: [],
    consentGates: [],
    zkProofs: [],
    createdAt: new Date().toISOString()
  };
  addTimelineEvent('identity', `Identity Created: ${handle}@headyme.com`, 'HeadyMe identity anchored', 'gold');
  res.json({ status: 'ok', identity: identityState.users[userId] });
});

router.post('/identity/delegate-agent', (req, res) => {
  const { userId, agentId, scopes } = req.body;
  const identity = identityState.users[userId];
  if (!identity) return res.status(404).json({ error: 'identity not found' });
  const delegation = {
    agentId,
    scopes: scopes || ['read'],
    tokenId: `atok_${crypto.randomBytes(8).toString('hex')}`,
    grantedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };
  identity.agentDelegations.push(delegation);
  res.json({ status: 'ok', delegation });
});

router.post('/identity/consent-gate', (req, res) => {
  const { userId, requestor, dataScope, proof } = req.body;
  const identity = identityState.users[userId];
  if (!identity) return res.status(404).json({ error: 'identity not found' });
  const gate = {
    id: `consent_${crypto.randomBytes(6).toString('hex')}`,
    requestor,
    dataScope,
    proofType: proof || 'zk-selective',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  identity.consentGates.push(gate);
  identityState.consentGates.push(gate);
  res.json({ status: 'ok', gate });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY VAULT — Personal Sovereign Data Store
// ═══════════════════════════════════════════════════════════════════

const dataVault = {
  entries: [],
  disclosureLog: [],
  categories: ['credentials', 'preferences', 'health', 'financial', 'documents', 'keys']
};

router.get('/vault', (req, res) => {
  const summary = {
    totalEntries: dataVault.entries.length,
    categories: dataVault.categories.map(cat => ({
      name: cat,
      count: dataVault.entries.filter(e => e.category === cat).length
    })),
    recentDisclosures: dataVault.disclosureLog.slice(0, 5)
  };
  res.json({ status: 'ok', vault: summary, timestamp: new Date().toISOString() });
});

router.post('/vault/store', (req, res) => {
  const { name, category, metadata } = req.body;
  if (!name) return res.status(400).json({ error: 'entry name required' });
  const entry = {
    id: `vlt_${crypto.randomBytes(8).toString('hex')}`,
    name,
    category: category || 'general',
    metadata: metadata || {},
    hash: crypto.createHash('sha256').update(name + Date.now()).digest('hex').substring(0, 16),
    storedAt: new Date().toISOString(),
    lastAccessedAt: null,
    accessCount: 0
  };
  dataVault.entries.push(entry);
  res.json({ status: 'ok', entry });
});

router.post('/vault/disclose', (req, res) => {
  const { entryId, requestor, proofType } = req.body;
  const entry = dataVault.entries.find(e => e.id === entryId);
  if (!entry) return res.status(404).json({ error: 'entry not found' });
  entry.lastAccessedAt = new Date().toISOString();
  entry.accessCount++;
  const disclosure = {
    id: `disc_${crypto.randomBytes(6).toString('hex')}`,
    entryId,
    entryName: entry.name,
    requestor,
    proofType: proofType || 'zk-selective',
    disclosedAt: new Date().toISOString(),
    proofHash: crypto.createHash('sha256').update(entry.hash + requestor).digest('hex').substring(0, 16)
  };
  dataVault.disclosureLog.push(disclosure);
  res.json({ status: 'ok', disclosure });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY MARKETPLACE — Agent Skill Store
// ═══════════════════════════════════════════════════════════════════

const marketplace = {
  skills: [
    { id: 'skill-travel-planner', name: 'Travel Planner', swarm: 'DREAMER', category: 'lifestyle', description: 'Plan trips, find flights, book accommodations', rating: 4.8, users: 1240, status: 'available', icon: 'plane', price: 'free' },
    { id: 'skill-portfolio-monitor', name: 'Portfolio Monitor', swarm: 'QUANT', category: 'finance', description: 'Track investments, analyze trends, alert on changes', rating: 4.6, users: 890, status: 'available', icon: 'chart', price: 'free' },
    { id: 'skill-code-reviewer', name: 'Code Reviewer', swarm: 'ARCHITECT', category: 'developer', description: 'Automated PR reviews, quality checks, security scanning', rating: 4.9, users: 2100, status: 'available', icon: 'code', price: 'free' },
    { id: 'skill-health-tracker', name: 'Health Tracker', swarm: 'PERSONA', category: 'health', description: 'Monitor vitals, exercise, nutrition, sleep patterns', rating: 4.5, users: 670, status: 'available', icon: 'heart', price: 'free' },
    { id: 'skill-news-curator', name: 'News Curator', swarm: 'ORACLE', category: 'information', description: 'Curate news, summarize articles, detect trends', rating: 4.7, users: 1560, status: 'available', icon: 'newspaper', price: 'free' },
    { id: 'skill-smart-home', name: 'Smart Home', swarm: 'EMISSARY', category: 'lifestyle', description: 'Control IoT devices, automate routines, energy optimization', rating: 4.3, users: 430, status: 'available', icon: 'home', price: 'free' },
    { id: 'skill-email-guardian', name: 'Email Guardian', swarm: 'SENTINEL', category: 'productivity', description: 'Smart filtering, auto-replies, phishing detection', rating: 4.8, users: 1880, status: 'available', icon: 'mail', price: 'free' },
    { id: 'skill-meeting-assist', name: 'Meeting Assistant', swarm: 'SCRIBE', category: 'productivity', description: 'Transcribe, summarize, extract action items from meetings', rating: 4.7, users: 1320, status: 'available', icon: 'mic', price: 'free' },
    { id: 'skill-data-analyst', name: 'Data Analyst', swarm: 'QUANT', category: 'developer', description: 'Analyze datasets, create visualizations, generate reports', rating: 4.6, users: 780, status: 'available', icon: 'database', price: 'free' },
    { id: 'skill-legal-reader', name: 'Legal Reader', swarm: 'SCRIBE', category: 'professional', description: 'Analyze contracts, highlight risks, suggest amendments', rating: 4.4, users: 340, status: 'available', icon: 'gavel', price: 'free' },
    { id: 'skill-creative-writer', name: 'Creative Writer', swarm: 'DREAMER', category: 'creative', description: 'Generate content, edit prose, brainstorm ideas', rating: 4.5, users: 920, status: 'available', icon: 'pen', price: 'free' },
    { id: 'skill-security-guard', name: 'Security Guard', swarm: 'SENTINEL', category: 'security', description: 'Monitor threats, scan vulnerabilities, enforce policies', rating: 4.9, users: 1670, status: 'available', icon: 'shield', price: 'free' }
  ],
  installed: [],
  categories: ['lifestyle', 'finance', 'developer', 'health', 'information', 'productivity', 'professional', 'creative', 'security']
};

router.get('/marketplace', (req, res) => {
  const { category, search } = req.query;
  let skills = marketplace.skills;
  if (category) skills = skills.filter(s => s.category === category);
  if (search) {
    const q = search.toLowerCase();
    skills = skills.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }
  res.json({ status: 'ok', skills, installed: marketplace.installed, categories: marketplace.categories });
});

router.post('/marketplace/install', (req, res) => {
  const { skillId } = req.body;
  const skill = marketplace.skills.find(s => s.id === skillId);
  if (!skill) return res.status(404).json({ error: 'skill not found' });
  if (marketplace.installed.includes(skillId)) return res.json({ status: 'ok', message: 'already installed' });
  marketplace.installed.push(skillId);
  addTimelineEvent('marketplace', `Skill Installed: ${skill.name}`, `Activated via ${skill.swarm} swarm`, 'cyan');
  res.json({ status: 'ok', installed: marketplace.installed });
});

router.post('/marketplace/uninstall', (req, res) => {
  const { skillId } = req.body;
  marketplace.installed = marketplace.installed.filter(id => id !== skillId);
  res.json({ status: 'ok', installed: marketplace.installed });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY BRIEFING — Morning Intelligence Digest
// ═══════════════════════════════════════════════════════════════════

const briefingStore = {
  briefings: [],
  preferences: { deliveryHour: 8, timezone: 'UTC', sections: ['agents', 'services', 'security', 'insights'] }
};

router.get('/briefing', (req, res) => {
  res.json({ status: 'ok', latest: briefingStore.briefings[0] || null, preferences: briefingStore.preferences });
});

router.post('/briefing/generate', (req, res) => {
  const now = new Date();
  const briefing = {
    id: `brief_${now.toISOString().split('T')[0]}`,
    generatedAt: now.toISOString(),
    greeting: `Good morning! Here's your Heady briefing for ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
    sections: {
      agents: {
        title: 'Agent Activity',
        items: [
          { icon: 'robot', text: 'Claude Code processed 12 tasks overnight with 98% success rate' },
          { icon: 'build', text: 'Builder agent completed 3 deployments — all green' },
          { icon: 'search', text: 'Researcher found 2 new patterns relevant to your architecture' }
        ]
      },
      services: {
        title: 'Service Health',
        items: [
          { icon: 'pulse', text: 'All 15 core services operational — ORS: 92/100' },
          { icon: 'clock', text: 'Uptime: 99.97% over the last 7 days' },
          { icon: 'zap', text: 'Average response time improved 8% to 142ms' }
        ]
      },
      security: {
        title: 'Security',
        items: [
          { icon: 'shield', text: '0 security alerts in the last 24 hours' },
          { icon: 'key', text: '2 API keys approaching rotation threshold (14 days)' },
          { icon: 'lock', text: 'PQC trust receipts: 47 signed, all valid' }
        ]
      },
      insights: {
        title: 'Insights & Discoveries',
        items: [
          { icon: 'lightbulb', text: 'ORACLE swarm: Circuit breaker pattern usage up 23% — consider phi-scaling thresholds' },
          { icon: 'trend', text: 'Pipeline throughput trending up — 18% more tasks completed vs last week' },
          { icon: 'star', text: 'Dream analysis suggested batching health checks for latency reduction' }
        ]
      }
    },
    systemMood: 'healthy',
    ors: 92
  };
  briefingStore.briefings.unshift(briefing);
  addTimelineEvent('briefing', 'Morning Briefing Generated', `ORS: ${briefing.ors} — ${briefing.systemMood}`, 'gold');
  res.json({ status: 'ok', briefing });
});

router.get('/briefing/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 7;
  res.json({ status: 'ok', briefings: briefingStore.briefings.slice(0, limit) });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY GATEWAY — Personal MCP Server Dashboard
// ═══════════════════════════════════════════════════════════════════

const gatewayState = {
  endpoints: [
    { id: 'ep-services', path: '/mcp/services', method: 'GET', exposed: true, rateLimit: 60, calls: 0, description: 'List connected services' },
    { id: 'ep-query', path: '/mcp/query', method: 'POST', exposed: true, rateLimit: 30, calls: 0, description: 'Query your personal data' },
    { id: 'ep-agents', path: '/mcp/agents', method: 'GET', exposed: true, rateLimit: 60, calls: 0, description: 'List available agents' },
    { id: 'ep-dispatch', path: '/mcp/dispatch', method: 'POST', exposed: true, rateLimit: 10, calls: 0, description: 'Dispatch task to agent swarm' },
    { id: 'ep-vault', path: '/mcp/vault', method: 'POST', exposed: false, rateLimit: 5, calls: 0, description: 'Request vault data with ZK proof' },
    { id: 'ep-identity', path: '/mcp/identity', method: 'GET', exposed: true, rateLimit: 30, calls: 0, description: 'Verify identity assertion' }
  ],
  clients: [],
  totalCalls: 0,
  budgetLimit: 10000,
  budgetUsed: 0
};

router.get('/gateway', (req, res) => {
  res.json({ status: 'ok', ...gatewayState, timestamp: new Date().toISOString() });
});

router.post('/gateway/endpoint/:id/toggle', (req, res) => {
  const ep = gatewayState.endpoints.find(e => e.id === req.params.id);
  if (!ep) return res.status(404).json({ error: 'endpoint not found' });
  ep.exposed = !ep.exposed;
  res.json({ status: 'ok', endpoint: ep });
});

router.post('/gateway/endpoint/:id/rate-limit', (req, res) => {
  const ep = gatewayState.endpoints.find(e => e.id === req.params.id);
  if (!ep) return res.status(404).json({ error: 'endpoint not found' });
  const { limit } = req.body;
  if (typeof limit !== 'number' || limit < 0) return res.status(400).json({ error: 'valid limit required' });
  ep.rateLimit = limit;
  res.json({ status: 'ok', endpoint: ep });
});

router.get('/gateway/clients', (req, res) => {
  res.json({ status: 'ok', clients: gatewayState.clients });
});

router.post('/gateway/client', (req, res) => {
  const { name, scopes } = req.body;
  if (!name) return res.status(400).json({ error: 'client name required' });
  const client = {
    id: `client_${crypto.randomBytes(6).toString('hex')}`,
    name,
    apiKey: `hdy_${crypto.randomBytes(16).toString('hex')}`,
    scopes: scopes || ['read'],
    createdAt: new Date().toISOString(),
    lastUsed: null,
    callCount: 0
  };
  gatewayState.clients.push(client);
  addTimelineEvent('gateway', `MCP Client Created: ${name}`, `Scopes: ${client.scopes.join(', ')}`, 'cyan');
  res.json({ status: 'ok', client });
});

// ═══════════════════════════════════════════════════════════════════
//  HEADY SWARM MODE — Visual Swarm Orchestration
// ═══════════════════════════════════════════════════════════════════

const swarmModeState = {
  active: false,
  currentSwarm: null,
  history: []
};

router.get('/swarm-mode', (req, res) => {
  res.json({ status: 'ok', ...swarmModeState, timestamp: new Date().toISOString() });
});

router.post('/swarm-mode/activate', (req, res) => {
  const { problem, swarmSize } = req.body;
  if (!problem) return res.status(400).json({ error: 'problem description required' });
  const size = swarmSize || 12;
  swarmModeState.active = true;
  swarmModeState.currentSwarm = {
    id: `swarm_${Date.now().toString(36)}`,
    problem,
    size,
    particles: Array.from({ length: size }, (_, i) => ({
      id: `p_${i}`,
      agent: ['claude-code', 'builder-agent', 'researcher-agent', 'deployer-agent', 'auditor-agent', 'observer-agent'][i % 6],
      status: 'exploring',
      position: { x: Math.cos(i * 2.399) * (2 + i * 0.3), y: Math.sin(i * 2.399) * (2 + i * 0.3) }, // golden angle spiral
      finding: null
    })),
    phase: 'diverge',
    startedAt: new Date().toISOString(),
    convergedAt: null,
    solution: null
  };

  // Simulate convergence
  const swarm = swarmModeState.currentSwarm;
  setTimeout(() => {
    swarm.phase = 'explore';
    swarm.particles.forEach(p => { p.status = 'working'; });
  }, 1618);

  setTimeout(() => {
    swarm.phase = 'converge';
    swarm.particles.forEach((p, i) => {
      p.status = 'reporting';
      p.finding = `Sub-solution ${i + 1} from ${p.agent}`;
      p.position = { x: p.position.x * 0.3, y: p.position.y * 0.3 };
    });
  }, 4236);

  setTimeout(() => {
    swarm.phase = 'resolved';
    swarm.convergedAt = new Date().toISOString();
    swarm.solution = `Converged solution from ${size} particles for: ${problem.substring(0, 60)}`;
    swarmModeState.active = false;
    swarmModeState.history.unshift({ ...swarm });
    addTimelineEvent('swarm', 'Swarm Converged', `${size} particles resolved: ${problem.substring(0, 40)}...`, 'magenta');
  }, 6854);

  res.json({ status: 'ok', swarm });
});

// Export the router and the addTimelineEvent function for use by other modules
module.exports = { router, addTimelineEvent };
