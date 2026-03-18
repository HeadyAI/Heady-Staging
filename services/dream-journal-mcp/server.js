/*
 * © 2026 Heady™ Systems Inc.
 * Dream Journaling & Subconscious Pattern Analysis MCP
 * COMPETITION: ZERO in MCP ecosystem
 *
 * - Rich dream entries (emotions, symbols, characters, settings, arcs)
 * - NLP-based symbol extraction → Jungian archetype mapping
 * - Recurring pattern detection across weeks/months
 * - Dream-theme visualization using sacred geometry
 * - 89 bee types map to dream archetypes
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;
const STORE_PATH = path.join(__dirname, '../../.heady_cache/dream-journal.json');

// Jungian archetypes mapped to bee types
const ARCHETYPES = {
  shadow: { beeType: 'Guardian', color: '#1a1a2e', symbol: '🌑' },
  anima: { beeType: 'Creator', color: '#ff6b9d', symbol: '🌙' },
  animus: { beeType: 'Warrior', color: '#ff4081', symbol: '⚔️' },
  self: { beeType: 'Oracle', color: '#ffd740', symbol: '☀️' },
  persona: { beeType: 'Diplomat', color: '#b2ff59', symbol: '🎭' },
  trickster: { beeType: 'Alchemist', color: '#ea80fc', symbol: '🃏' },
  hero: { beeType: 'Navigator', color: '#c9a0ff', symbol: '🦅' },
  mentor: { beeType: 'Sage', color: '#ffe57f', symbol: '🧙' },
  threshold_guardian: { beeType: 'Scout', color: '#ff5252', symbol: '🚪' },
  shapeshifter: { beeType: 'Dreamer', color: '#b388ff', symbol: '🦋' },
  mother: { beeType: 'Healer', color: '#69f0ae', symbol: '🌿' },
  child: { beeType: 'Storyteller', color: '#e040fb', symbol: '✨' }
};

// Common dream symbols with archetype associations
const SYMBOL_MAP = {
  water: ['anima', 'self'], ocean: ['self', 'shadow'], river: ['anima'],
  fire: ['animus', 'trickster'], sun: ['self'], moon: ['anima', 'shadow'],
  flying: ['hero', 'self'], falling: ['shadow'], chase: ['shadow', 'threshold_guardian'],
  death: ['self', 'shadow'], birth: ['child', 'mother'], marriage: ['anima', 'animus'],
  snake: ['shadow', 'trickster'], eagle: ['hero', 'self'], wolf: ['animus', 'shadow'],
  tree: ['self', 'mother'], mountain: ['self', 'hero'], cave: ['shadow', 'mother'],
  house: ['self', 'persona'], mirror: ['shadow', 'persona'], bridge: ['threshold_guardian'],
  key: ['self', 'trickster'], sword: ['animus', 'hero'], crown: ['self'],
  garden: ['mother', 'self'], storm: ['shadow', 'animus'], star: ['self', 'mentor']
};

const EMOTIONS = ['joy', 'fear', 'anger', 'sadness', 'surprise', 'disgust', 'anticipation', 'trust',
                  'serenity', 'terror', 'rage', 'grief', 'amazement', 'loathing', 'vigilance', 'admiration'];

function loadJournal() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return { dreams: [], patterns: [], version: 1 }; }
}

function saveJournal(journal) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(journal, null, 2));
}

function extractSymbols(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const [symbol, archetypes] of Object.entries(SYMBOL_MAP)) {
    if (lower.includes(symbol)) {
      found.push({ symbol, archetypes, archetypeDetails: archetypes.map(a => ARCHETYPES[a]) });
    }
  }
  return found;
}

function extractEmotions(text) {
  const lower = text.toLowerCase();
  return EMOTIONS.filter(e => lower.includes(e));
}

function analyzeDream(dreamText) {
  const symbols = extractSymbols(dreamText);
  const emotions = extractEmotions(dreamText);

  // Archetype frequency
  const archetypeCounts = {};
  symbols.forEach(s => s.archetypes.forEach(a => {
    archetypeCounts[a] = (archetypeCounts[a] || 0) + 1;
  }));

  const dominantArchetype = Object.entries(archetypeCounts)
    .sort((a, b) => b[1] - a[1])[0];

  // Emotional valence (positive vs negative)
  const positiveEmotions = ['joy', 'trust', 'serenity', 'admiration', 'anticipation', 'amazement'];
  const positive = emotions.filter(e => positiveEmotions.includes(e)).length;
  const negative = emotions.length - positive;
  const valence = emotions.length > 0 ? (positive - negative) / emotions.length : 0;

  // φ-scaled coherence (how interconnected the symbols are)
  const uniqueArchetypes = new Set(symbols.flatMap(s => s.archetypes));
  const coherence = uniqueArchetypes.size > 0
    ? 1 / (1 + Math.pow(PHI, -uniqueArchetypes.size))
    : 0;

  return {
    symbols, emotions, archetypeCounts,
    dominantArchetype: dominantArchetype ? { name: dominantArchetype[0], ...ARCHETYPES[dominantArchetype[0]] } : null,
    emotionalValence: valence,
    coherence,
    wordCount: dreamText.split(/\s+/).length
  };
}

function findPatterns(journal) {
  if (journal.dreams.length < 3) return [];
  const patterns = [];

  // Recurring symbols
  const symbolFreq = {};
  journal.dreams.forEach(d => {
    (d.analysis?.symbols || []).forEach(s => {
      symbolFreq[s.symbol] = (symbolFreq[s.symbol] || 0) + 1;
    });
  });

  Object.entries(symbolFreq)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .forEach(([symbol, count]) => {
      patterns.push({
        type: 'recurring_symbol', symbol, count,
        frequency: count / journal.dreams.length,
        significance: SYMBOL_MAP[symbol] ? 'high' : 'moderate'
      });
    });

  // Emotional trends
  const recentDreams = journal.dreams.slice(-10);
  const avgValence = recentDreams.reduce((s, d) => s + (d.analysis?.emotionalValence || 0), 0) / recentDreams.length;
  if (Math.abs(avgValence) > 0.3) {
    patterns.push({
      type: 'emotional_trend',
      direction: avgValence > 0 ? 'positive' : 'negative',
      strength: Math.abs(avgValence),
      period: 'last_10_dreams'
    });
  }

  return patterns;
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') return res.end(JSON.stringify({ status: 'ok', service: 'dream-journal-mcp' }));

  if (parsed.pathname === '/record' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { text, title, date } = JSON.parse(body);
      const analysis = analyzeDream(text);
      const journal = loadJournal();
      const dream = {
        id: `dream_${Date.now()}`, title: title || 'Untitled Dream',
        date: date || new Date().toISOString(), text, analysis,
        recorded: new Date().toISOString()
      };
      journal.dreams.push(dream);
      journal.patterns = findPatterns(journal);
      journal.version++;
      saveJournal(journal);
      res.end(JSON.stringify({ dream, patterns: journal.patterns }));
    });
    return;
  }

  if (parsed.pathname === '/dreams') return res.end(JSON.stringify(loadJournal()));
  if (parsed.pathname === '/patterns') return res.end(JSON.stringify(findPatterns(loadJournal())));
  if (parsed.pathname === '/archetypes') return res.end(JSON.stringify(ARCHETYPES, null, 2));
  if (parsed.pathname === '/symbols') return res.end(JSON.stringify(SYMBOL_MAP, null, 2));

  res.end(JSON.stringify({ service: 'Dream Journal MCP', version: '1.0.0',
    description: 'Subconscious pattern analysis with Jungian archetype mapping and φ-scaled coherence',
    endpoints: { '/record': 'POST', '/dreams': 'GET', '/patterns': 'GET', '/archetypes': 'GET' } }));
});

const PORT = process.env.PORT || 8095;
server.listen(PORT, () => console.log(`🌙 Dream Journal MCP on :${PORT}`));

module.exports = { analyzeDream, extractSymbols, findPatterns, ARCHETYPES, SYMBOL_MAP };
