/*
 * © 2026 Heady™ Systems Inc.
 * Emotional Intelligence & Mood Tracking MCP
 *
 * - Plutchik's emotion wheel (8 primary × 3 intensity = 24 states)
 * - Correlates emotional patterns with activities/topics
 * - CBT-style cognitive reframing tools
 * - φ-scaled emotional balance metrics
 * - Longitudinal emotional intelligence reports
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;
const STORE_PATH = path.join(__dirname, '../../.heady_cache/mood-store.json');

// Plutchik's Emotion Wheel
const EMOTIONS = {
  // Primary → [low intensity, medium, high intensity]
  joy:          ['serenity', 'joy', 'ecstasy'],
  trust:        ['acceptance', 'trust', 'admiration'],
  fear:         ['apprehension', 'fear', 'terror'],
  surprise:     ['distraction', 'surprise', 'amazement'],
  sadness:      ['pensiveness', 'sadness', 'grief'],
  disgust:      ['boredom', 'disgust', 'loathing'],
  anger:        ['annoyance', 'anger', 'rage'],
  anticipation: ['interest', 'anticipation', 'vigilance']
};

// Dyads (emotion combinations)
const DYADS = {
  love: ['joy', 'trust'], submission: ['trust', 'fear'],
  awe: ['fear', 'surprise'], disapproval: ['surprise', 'sadness'],
  remorse: ['sadness', 'disgust'], contempt: ['disgust', 'anger'],
  aggressiveness: ['anger', 'anticipation'], optimism: ['anticipation', 'joy']
};

// CBT Reframing patterns
const REFRAMES = {
  catastrophizing: { pattern: 'Imagining worst-case outcomes', reframe: 'What evidence supports this fear? What\'s the most likely outcome?' },
  black_white: { pattern: 'All-or-nothing thinking', reframe: 'Can you find a middle ground? Most situations have nuance.' },
  mind_reading: { pattern: 'Assuming you know what others think', reframe: 'Have you asked them directly? What other interpretations exist?' },
  filtering: { pattern: 'Focusing only on negatives', reframe: 'What positive aspects are you overlooking? List three good things.' },
  personalization: { pattern: 'Blaming yourself for external events', reframe: 'What factors were outside your control? Who else was involved?' },
  overgeneralization: { pattern: 'Using "always" and "never" thinking', reframe: 'When has the opposite been true? Is this really every single time?' }
};

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return { entries: [], insights: [], version: 1 }; }
}

function saveStore(store) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function recordMood(emotion, intensity, context) {
  const store = loadStore();
  const entry = {
    id: `mood_${Date.now()}`,
    timestamp: new Date().toISOString(),
    emotion, intensity: Math.min(3, Math.max(1, intensity)),
    label: EMOTIONS[emotion] ? EMOTIONS[emotion][intensity - 1] : emotion,
    context: context || {},
    isPositive: ['joy', 'trust', 'anticipation', 'surprise'].includes(emotion)
  };

  store.entries.push(entry);

  // Compute insights after 5+ entries
  if (store.entries.length >= 5) {
    const recent = store.entries.slice(-20);
    const positive = recent.filter(e => e.isPositive).length;
    const negative = recent.length - positive;

    // φ-scaled emotional balance (golden ratio between positive and negative)
    const ratio = positive / Math.max(1, negative);
    const phiBalance = Math.abs(ratio - PHI) < 0.5 ? 'optimal' : ratio > PHI ? 'high-positive' : 'needs-attention';

    store.insights = [{
      type: 'emotional_balance',
      posNegRatio: ratio.toFixed(3),
      phiTarget: PHI.toFixed(3),
      balance: phiBalance,
      period: `last ${recent.length} entries`,
      dominantEmotion: Object.entries(
        recent.reduce((acc, e) => { acc[e.emotion] = (acc[e.emotion] || 0) + 1; return acc; }, {})
      ).sort((a, b) => b[1] - a[1])[0]?.[0]
    }];
  }

  store.version++;
  saveStore(store);
  return { entry, insights: store.insights };
}

function getReframe(pattern) {
  return REFRAMES[pattern] || { error: 'Unknown pattern', available: Object.keys(REFRAMES) };
}

function emotionalReport() {
  const store = loadStore();
  if (store.entries.length === 0) return { message: 'No mood entries yet' };

  const recent = store.entries.slice(-50);
  const emotionCounts = {};
  recent.forEach(e => { emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1; });

  const avgIntensity = recent.reduce((s, e) => s + e.intensity, 0) / recent.length;
  const positive = recent.filter(e => e.isPositive).length;

  return {
    totalEntries: store.entries.length,
    recentEntries: recent.length,
    emotionDistribution: emotionCounts,
    averageIntensity: avgIntensity.toFixed(2),
    positivityRate: (positive / recent.length * 100).toFixed(1) + '%',
    phiBalance: (positive / Math.max(1, recent.length - positive)).toFixed(3),
    phiTarget: PHI.toFixed(3),
    insights: store.insights
  };
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') return res.end(JSON.stringify({ status: 'ok', service: 'emotional-intelligence-mcp' }));

  if (parsed.pathname === '/record' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { emotion, intensity, context } = JSON.parse(body);
      res.end(JSON.stringify(recordMood(emotion, intensity || 2, context)));
    });
    return;
  }

  if (parsed.pathname === '/report') return res.end(JSON.stringify(emotionalReport(), null, 2));
  if (parsed.pathname === '/emotions') return res.end(JSON.stringify(EMOTIONS, null, 2));
  if (parsed.pathname === '/dyads') return res.end(JSON.stringify(DYADS, null, 2));
  if (parsed.pathname === '/reframe') {
    const pattern = parsed.query.pattern;
    return res.end(JSON.stringify(pattern ? getReframe(pattern) : REFRAMES, null, 2));
  }

  res.end(JSON.stringify({ service: 'Emotional Intelligence MCP', version: '1.0.0',
    endpoints: { '/record': 'POST', '/report': 'GET', '/emotions': 'GET', '/reframe?pattern=': 'GET' } }));
});

const PORT = process.env.PORT || 8097;
server.listen(PORT, () => console.log(`💜 Emotional Intelligence MCP on :${PORT}`));

module.exports = { recordMood, emotionalReport, getReframe, EMOTIONS, DYADS };
