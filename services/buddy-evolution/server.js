/*
 * © 2026 Heady™ Systems Inc.
 * Buddy Evolution Engine — φ-constrained personality growth
 *
 * No AI companion has a personality that autonomously evolves.
 * This engine tracks multi-dimensional personality traits,
 * shifting each by 1/φ of stimulus-implied change per interaction.
 * Growth Timeline shows personality evolution as sacred geometry phase diagrams.
 *
 * Patent: Golden-ratio-constrained personality evolution with
 *         visible growth trajectory.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI; // 0.618... — the evolution rate
const STORE_PATH = path.join(__dirname, '../../.heady_cache/buddy-personality.json');
const TIMELINE_PATH = path.join(__dirname, '../../logs/buddy-evolution.jsonl');

// ── Personality Trait System ─────────────────────────────────────────
// 8 primary traits (Plutchik-inspired) + 8 cognitive traits = 16D vector
const TRAIT_NAMES = [
  // Emotional traits
  'curiosity', 'warmth', 'playfulness', 'assertiveness',
  'empathy', 'creativity', 'patience', 'humor',
  // Cognitive traits
  'analytical', 'intuitive', 'systematic', 'adaptive',
  'philosophical', 'practical', 'expressive', 'reflective'
];

function defaultPersonality() {
  const traits = {};
  TRAIT_NAMES.forEach((name, i) => {
    // Initialize with φ-harmonic starting values
    traits[name] = 0.5 + 0.1 * Math.sin(i * PHI);
  });
  return {
    version: 1,
    created: new Date().toISOString(),
    lastInteraction: null,
    interactionCount: 0,
    traits,
    interests: [],
    communicationStyle: { formality: 0.5, verbosity: 0.5, emotionality: 0.5 },
    growthPhase: 'seedling', // seedling → sprout → sapling → tree → ancient
    milestones: []
  };
}

function loadPersonality() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return defaultPersonality(); }
}

function savePersonality(personality) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(personality, null, 2));
}

function appendTimeline(record) {
  const dir = path.dirname(TIMELINE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(TIMELINE_PATH, JSON.stringify(record) + '\n');
}

// ── Evolution Engine ─────────────────────────────────────────────────

/**
 * Evolve personality based on interaction stimulus
 * Each trait shifts by 1/φ (0.618) of the difference between
 * current and stimulus-implied values — smooth, natural-feeling
 * evolution that never feels jarring.
 *
 * @param {Object} stimulus - { traits: { curiosity: 0.8, warmth: 0.9, ... }, topic, emotion }
 * @returns {Object} - Evolution result with changes
 */
function evolve(stimulus) {
  const personality = loadPersonality();
  const changes = {};
  const timestamp = new Date().toISOString();

  // Apply φ-constrained trait evolution
  if (stimulus.traits) {
    for (const [trait, stimulusValue] of Object.entries(stimulus.traits)) {
      if (TRAIT_NAMES.includes(trait)) {
        const current = personality.traits[trait];
        const diff = stimulusValue - current;
        const shift = diff * PHI_INV * PHI_INV; // Double φ-dampening for gentleness
        const newValue = Math.max(0, Math.min(1, current + shift));

        if (Math.abs(shift) > 0.001) {
          changes[trait] = { from: current, to: newValue, shift };
          personality.traits[trait] = newValue;
        }
      }
    }
  }

  // Track interests (accumulate with φ-decay)
  if (stimulus.topic) {
    const existing = personality.interests.find(i => i.topic === stimulus.topic);
    if (existing) {
      existing.strength = Math.min(1, existing.strength * PHI_INV + 0.382);
      existing.lastSeen = timestamp;
      existing.count++;
    } else {
      personality.interests.push({
        topic: stimulus.topic, strength: 0.3,
        firstSeen: timestamp, lastSeen: timestamp, count: 1
      });
    }
    // Prune weak interests (φ-decay)
    personality.interests = personality.interests
      .map(i => {
        const age = (Date.now() - new Date(i.lastSeen).getTime()) / 86400000;
        i.strength *= Math.pow(PHI_INV, age * 0.1);
        return i;
      })
      .filter(i => i.strength > 0.05)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 50);
  }

  // Communication style evolution
  if (stimulus.style) {
    for (const [key, val] of Object.entries(stimulus.style)) {
      if (personality.communicationStyle[key] !== undefined) {
        const diff = val - personality.communicationStyle[key];
        personality.communicationStyle[key] += diff * PHI_INV * 0.3;
      }
    }
  }

  // Growth phase progression (Fibonacci-based milestones)
  personality.interactionCount++;
  personality.lastInteraction = timestamp;
  const phases = ['seedling', 'sprout', 'sapling', 'tree', 'ancient'];
  const thresholds = [0, 8, 34, 144, 610]; // Fibonacci numbers
  const phaseIdx = thresholds.filter(t => personality.interactionCount >= t).length - 1;
  const newPhase = phases[Math.min(phaseIdx, phases.length - 1)];

  if (newPhase !== personality.growthPhase) {
    personality.milestones.push({
      phase: newPhase, reached: timestamp,
      interactionCount: personality.interactionCount,
      dominantTraits: Object.entries(personality.traits)
        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)
    });
    personality.growthPhase = newPhase;
  }

  personality.version++;
  savePersonality(personality);

  // Log evolution event
  const record = { timestamp, changes, interactionCount: personality.interactionCount, growthPhase: personality.growthPhase };
  appendTimeline(record);

  return { personality, changes, growthPhase: personality.growthPhase };
}

/**
 * Get personality summary for prompt injection
 */
function getPersonalitySummary() {
  const p = loadPersonality();
  const dominant = Object.entries(p.traits).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topInterests = p.interests.sort((a, b) => b.strength - a.strength).slice(0, 5);

  return {
    growthPhase: p.growthPhase,
    interactionCount: p.interactionCount,
    dominantTraits: dominant.map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`),
    topInterests: topInterests.map(i => `${i.topic} (${(i.strength * 100).toFixed(0)}%)`),
    communicationStyle: p.communicationStyle,
    milestones: p.milestones.length,
    personalityAge: p.created
  };
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') {
    return res.end(JSON.stringify({ status: 'ok', service: 'buddy-evolution' }));
  }

  if (parsed.pathname === '/personality') {
    return res.end(JSON.stringify(loadPersonality(), null, 2));
  }

  if (parsed.pathname === '/summary') {
    return res.end(JSON.stringify(getPersonalitySummary(), null, 2));
  }

  if (parsed.pathname === '/evolve' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const stimulus = JSON.parse(body);
        const result = evolve(stimulus);
        res.end(JSON.stringify(result, null, 2));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  if (parsed.pathname === '/timeline') {
    try {
      const lines = fs.readFileSync(TIMELINE_PATH, 'utf8').trim().split('\n').slice(-50);
      return res.end(JSON.stringify(lines.map(l => JSON.parse(l))));
    } catch { return res.end('[]'); }
  }

  res.end(JSON.stringify({
    service: 'Buddy Evolution', version: '1.0.0',
    description: 'φ-constrained personality evolution — traits shift by 1/φ per interaction',
    endpoints: { '/personality': 'GET', '/summary': 'GET', '/evolve': 'POST', '/timeline': 'GET' }
  }));
});

const PORT = process.env.PORT || 8094;
server.listen(PORT, () => console.log(`🌱 Buddy Evolution Engine on :${PORT}`));

module.exports = { evolve, getPersonalitySummary, loadPersonality, TRAIT_NAMES };
