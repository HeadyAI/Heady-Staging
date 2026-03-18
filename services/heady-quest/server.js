/*
 * © 2026 Heady™ Systems Inc.
 * HeadyQuest — Gamified AI Challenges Using Swarm Mechanics
 *
 * - Daily/weekly AI challenges with Fibonacci difficulty curve
 * - XP for prompt crafting, achievement badges, leaderboards
 * - Completing quests unlocks bee types and swarm configs
 * - φ-weighted scoring system
 * - Quest marketplace for community challenges
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
const STORE_PATH = path.join(__dirname, '../../.heady_cache/quest-store.json');

// ── Quest Templates ──────────────────────────────────────────────────
const QUEST_TEMPLATES = [
  { id: 'research_unknown', name: 'Terra Incognita', desc: 'Research and summarize a topic you know nothing about', xp: 50, category: 'exploration', difficulty: 1, unlocks: 'Scout bee' },
  { id: 'business_plan', name: 'Architect\'s Vision', desc: 'Create a complete business plan from scratch', xp: 150, category: 'creation', difficulty: 3, unlocks: 'Strategist bee' },
  { id: 'debug_blind', name: 'Blind Healer', desc: 'Debug code without being told the bug', xp: 100, category: 'analysis', difficulty: 2, unlocks: 'Healer bee' },
  { id: 'creative_story', name: 'Dreamer\'s Tale', desc: 'Write a short story with AI assistance', xp: 75, category: 'creation', difficulty: 1, unlocks: 'Dreamer bee' },
  { id: 'data_analysis', name: 'Oracle\'s Insight', desc: 'Analyze a dataset and extract 3 non-obvious insights', xp: 120, category: 'analysis', difficulty: 2, unlocks: 'Oracle bee' },
  { id: 'teach_concept', name: 'Sage\'s Path', desc: 'Explain a complex concept so a 10-year-old would understand', xp: 80, category: 'teaching', difficulty: 2, unlocks: 'Sage bee' },
  { id: 'prompt_master', name: 'Alchemist\'s Formula', desc: 'Craft a single prompt that produces 1000+ word quality output', xp: 100, category: 'mastery', difficulty: 2, unlocks: 'Alchemist bee' },
  { id: 'multi_model', name: 'Arena Champion', desc: 'Compare responses from 3+ models on the same question', xp: 130, category: 'comparison', difficulty: 3, unlocks: 'Warrior bee' },
  { id: 'workflow_build', name: 'Navigator\'s Map', desc: 'Build a multi-step AI workflow with 5+ stages', xp: 200, category: 'engineering', difficulty: 4, unlocks: 'Navigator bee' },
  { id: 'daily_reflection', name: 'Mirror\'s Truth', desc: 'Write a daily reflection using AI as a thinking partner', xp: 30, category: 'mindfulness', difficulty: 1, unlocks: 'Mentor bee' }
];

// ── Achievement System ───────────────────────────────────────────────
const ACHIEVEMENTS = {
  first_quest: { name: 'First Steps', icon: '🌱', xp: 25 },
  streak_3: { name: 'Momentum', icon: '🔥', xp: 50 },
  streak_7: { name: 'Unstoppable', icon: '⚡', xp: 100 },
  streak_21: { name: 'Fibonacci Master', icon: '🌀', xp: 250 },
  all_categories: { name: 'Renaissance Mind', icon: '🎭', xp: 500 },
  level_5: { name: 'Apprentice', icon: '📘', xp: 150 },
  level_10: { name: 'Journeyman', icon: '📗', xp: 300 },
  level_21: { name: 'Fibonacci Sage', icon: '📕', xp: 1000 }
};

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return { profile: { xp: 0, level: 0, streak: 0, longestStreak: 0, questsCompleted: 0, unlockedBees: [], achievements: [], lastQuestDate: null }, completedQuests: [], version: 1 }; }
}

function saveStore(store) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function xpForLevel(level) {
  return Math.round(FIBONACCI[Math.min(level + 2, FIBONACCI.length - 1)] * 50);
}

function completeQuest(questId) {
  const store = loadStore();
  const template = QUEST_TEMPLATES.find(q => q.id === questId);
  if (!template) return { error: 'Unknown quest' };

  // φ-weighted XP (streak multiplier)
  const streakMultiplier = 1 + (store.profile.streak * 0.1 * PHI);
  const earnedXP = Math.round(template.xp * streakMultiplier);

  store.profile.xp += earnedXP;
  store.profile.questsCompleted++;
  store.profile.streak++;
  if (store.profile.streak > store.profile.longestStreak) store.profile.longestStreak = store.profile.streak;
  store.profile.lastQuestDate = new Date().toISOString();

  // Unlock bee type
  if (template.unlocks && !store.profile.unlockedBees.includes(template.unlocks)) {
    store.profile.unlockedBees.push(template.unlocks);
  }

  // Level up check (Fibonacci XP thresholds)
  while (store.profile.xp >= xpForLevel(store.profile.level + 1)) {
    store.profile.level++;
  }

  // Check achievements
  const newAchievements = [];
  if (store.profile.questsCompleted === 1 && !store.profile.achievements.includes('first_quest')) {
    store.profile.achievements.push('first_quest'); newAchievements.push(ACHIEVEMENTS.first_quest);
  }
  if (store.profile.streak >= 3 && !store.profile.achievements.includes('streak_3')) {
    store.profile.achievements.push('streak_3'); newAchievements.push(ACHIEVEMENTS.streak_3);
  }
  if (store.profile.streak >= 7 && !store.profile.achievements.includes('streak_7')) {
    store.profile.achievements.push('streak_7'); newAchievements.push(ACHIEVEMENTS.streak_7);
  }

  store.completedQuests.push({ questId, completedAt: new Date().toISOString(), earnedXP, streakMultiplier });
  store.version++;
  saveStore(store);

  return {
    completed: template, earnedXP, streakMultiplier: streakMultiplier.toFixed(2),
    profile: store.profile, newAchievements,
    nextLevelXP: xpForLevel(store.profile.level + 1),
    unlockedBee: template.unlocks
  };
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') return res.end(JSON.stringify({ status: 'ok', service: 'heady-quest' }));

  if (parsed.pathname === '/quests') return res.end(JSON.stringify(QUEST_TEMPLATES));

  if (parsed.pathname === '/complete' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { questId } = JSON.parse(body);
      res.end(JSON.stringify(completeQuest(questId)));
    });
    return;
  }

  if (parsed.pathname === '/profile') return res.end(JSON.stringify(loadStore().profile, null, 2));
  if (parsed.pathname === '/achievements') return res.end(JSON.stringify(ACHIEVEMENTS, null, 2));

  res.end(JSON.stringify({ service: 'HeadyQuest', version: '1.0.0',
    description: 'Gamified AI challenges — Fibonacci difficulty, φ-weighted XP, bee type unlocks',
    endpoints: { '/quests': 'GET', '/complete': 'POST', '/profile': 'GET', '/achievements': 'GET' } }));
});

const PORT = process.env.PORT || 8099;
server.listen(PORT, () => console.log(`🏆 HeadyQuest on :${PORT}`));

module.exports = { completeQuest, QUEST_TEMPLATES, ACHIEVEMENTS };
