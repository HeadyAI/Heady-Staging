/*
 * © 2026 Heady™ Systems Inc.
 * Habit Formation with Reinforcement Learning MCP
 * COMPETITION: ZERO
 *
 * - Models habit loops (cue → routine → reward) as RL states/actions
 * - Multi-armed bandit for optimal intervention timing
 * - φ-scaled difficulty progression (each level 1.618× harder)
 * - CSL-compatible continuous habit evaluation
 * - Personalized nudging strategies
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;
const STORE_PATH = path.join(__dirname, '../../.heady_cache/habit-store.json');

function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return { habits: [], globalStats: { totalCompletions: 0, longestStreak: 0 }, version: 1 }; }
}

function saveStore(store) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// ── φ-Scaled Difficulty Levels ───────────────────────────────────────
function difficultyThreshold(level) {
  // Each level requires φ× more completions than previous
  return Math.round(Math.pow(PHI, level) * 3);
}

function calculateLevel(completions) {
  let level = 0;
  while (difficultyThreshold(level + 1) <= completions) level++;
  return level;
}

// ── Multi-Armed Bandit for Intervention Timing ───────────────────────
// Thompson Sampling: each nudge time gets a Beta distribution
function selectOptimalTime(habit) {
  const arms = habit.nudgeTimes || {
    'morning': { successes: 1, failures: 1 },
    'afternoon': { successes: 1, failures: 1 },
    'evening': { successes: 1, failures: 1 },
    'night': { successes: 1, failures: 1 }
  };

  // Sample from Beta distribution for each arm
  let bestTime = 'morning', bestSample = -1;
  for (const [time, stats] of Object.entries(arms)) {
    // Simple Beta approximation using mean + variance
    const mean = stats.successes / (stats.successes + stats.failures);
    const variance = 1 / (stats.successes + stats.failures + 1);
    const sample = mean + (Math.random() - 0.5) * Math.sqrt(variance) * 2;
    if (sample > bestSample) { bestSample = sample; bestTime = time; }
  }
  return { time: bestTime, confidence: bestSample };
}

// ── Habit Loop Modeling ──────────────────────────────────────────────
function createHabit(name, cue, routine, reward, frequency = 'daily') {
  return {
    id: `habit_${Date.now()}`, name, cue, routine, reward, frequency,
    created: new Date().toISOString(),
    completions: [], streak: 0, longestStreak: 0,
    level: 0, totalCompletions: 0,
    nextLevelAt: difficultyThreshold(1),
    nudgeTimes: { morning: { successes: 1, failures: 1 }, afternoon: { successes: 1, failures: 1 },
                  evening: { successes: 1, failures: 1 }, night: { successes: 1, failures: 1 } },
    cslState: 0.0 // Continuous semantic state (0 = not formed, 1 = automatic)
  };
}

function completeHabit(habitId, timeOfDay) {
  const store = loadStore();
  const habit = store.habits.find(h => h.id === habitId);
  if (!habit) return { error: 'Habit not found' };

  const now = new Date().toISOString();
  habit.completions.push({ date: now, timeOfDay });
  habit.totalCompletions++;
  habit.streak++;
  if (habit.streak > habit.longestStreak) habit.longestStreak = habit.streak;
  store.globalStats.totalCompletions++;
  if (habit.longestStreak > store.globalStats.longestStreak) store.globalStats.longestStreak = habit.longestStreak;

  // Update multi-armed bandit
  if (timeOfDay && habit.nudgeTimes[timeOfDay]) {
    habit.nudgeTimes[timeOfDay].successes++;
  }

  // Level progression (φ-scaled)
  const newLevel = calculateLevel(habit.totalCompletions);
  const leveledUp = newLevel > habit.level;
  habit.level = newLevel;
  habit.nextLevelAt = difficultyThreshold(newLevel + 1);

  // CSL state evolution (approaches 1.0 asymptotically via φ)
  habit.cslState = 1 - Math.pow(PHI, -habit.totalCompletions * 0.1);

  store.version++;
  saveStore(store);

  return {
    habit, leveledUp,
    nextOptimalTime: selectOptimalTime(habit),
    cslState: habit.cslState,
    message: leveledUp
      ? `🎉 Level ${habit.level}! Next level at ${habit.nextLevelAt} completions (φ-scaled).`
      : `✅ Streak: ${habit.streak} | Progress: ${habit.totalCompletions}/${habit.nextLevelAt}`
  };
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') return res.end(JSON.stringify({ status: 'ok', service: 'habit-formation-mcp' }));

  if (parsed.pathname === '/create' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { name, cue, routine, reward, frequency } = JSON.parse(body);
      const store = loadStore();
      const habit = createHabit(name, cue, routine, reward, frequency);
      store.habits.push(habit);
      store.version++;
      saveStore(store);
      res.end(JSON.stringify({ created: habit }));
    });
    return;
  }

  if (parsed.pathname === '/complete' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { habitId, timeOfDay } = JSON.parse(body);
      res.end(JSON.stringify(completeHabit(habitId, timeOfDay)));
    });
    return;
  }

  if (parsed.pathname === '/habits') return res.end(JSON.stringify(loadStore()));

  if (parsed.pathname === '/phi-levels') {
    const levels = [];
    for (let i = 0; i < 15; i++) levels.push({ level: i, requiredCompletions: difficultyThreshold(i) });
    return res.end(JSON.stringify(levels));
  }

  res.end(JSON.stringify({ service: 'Habit Formation RL MCP', version: '1.0.0',
    description: 'RL-optimized habit formation with φ-scaled difficulty and multi-armed bandit intervention timing',
    endpoints: { '/create': 'POST', '/complete': 'POST', '/habits': 'GET', '/phi-levels': 'GET' } }));
});

const PORT = process.env.PORT || 8096;
server.listen(PORT, () => console.log(`🔄 Habit Formation RL MCP on :${PORT}`));

module.exports = { createHabit, completeHabit, difficultyThreshold, selectOptimalTime };
