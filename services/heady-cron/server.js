/*
 * © 2026 Heady™ Systems Inc.
 * HeadyCron — Natural Language Scheduling with φ-Time Intervals
 *
 * Features:
 *  - Parse NL → cron expressions + conditional triggers
 *  - φ-scaled intervals (Fibonacci: 1,1,2,3,5,8,13,21,34,55 min)
 *  - Golden-ratio multiples for spaced repetition
 *  - Persistent task store with auto-execution
 *  - MCP-compatible API
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PHI = 1.618033988749895;
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const STORE_PATH = path.join(__dirname, '../../.heady_cache/cron-tasks.json');

// ── φ-Time Intervals ────────────────────────────────────────────────
function phiInterval(base, power) {
  return Math.round(base * Math.pow(PHI, power));
}

function fibonacciInterval(index) {
  return FIBONACCI[Math.min(index, FIBONACCI.length - 1)];
}

// ── NL → Cron Parser ────────────────────────────────────────────────
function parseNaturalLanguage(text) {
  const lower = text.toLowerCase();
  let intervalMs = null;
  let cron = null;
  let description = text;
  let action = null;

  // Extract action (after "then", "do", "run", "execute")
  const actionMatch = text.match(/(?:then|do|run|execute)\s+(.+)/i);
  if (actionMatch) action = actionMatch[1].trim();

  // φ-scaled intervals
  const phiMatch = lower.match(/every\s+φ[²³⁴⁵⁶⁷⁸]?\s*(seconds?|minutes?|hours?)/i) ||
                   lower.match(/every\s+phi\^?(\d+)\s*(seconds?|minutes?|hours?)/i);
  if (phiMatch) {
    const power = phiMatch[1] ? parseInt(phiMatch[1]) : 1;
    const unit = phiMatch[2] || phiMatch[1];
    const baseMs = unit.startsWith('second') ? 1000 : unit.startsWith('minute') ? 60000 : 3600000;
    intervalMs = phiInterval(baseMs, power);
    cron = `*/${Math.max(1, Math.round(intervalMs / 60000))} * * * *`;
  }

  // Fibonacci intervals
  const fibMatch = lower.match(/every\s+fibonacci\[?(\d+)\]?\s*(seconds?|minutes?|hours?)/i);
  if (fibMatch) {
    const idx = parseInt(fibMatch[1]);
    const unit = fibMatch[2];
    const baseMs = unit.startsWith('second') ? 1000 : unit.startsWith('minute') ? 60000 : 3600000;
    intervalMs = fibonacciInterval(idx) * baseMs;
    cron = `*/${Math.max(1, Math.round(intervalMs / 60000))} * * * *`;
  }

  // Standard intervals
  const stdMatch = lower.match(/every\s+(\d+)\s*(seconds?|minutes?|hours?|days?)/i);
  if (stdMatch && !intervalMs) {
    const val = parseInt(stdMatch[1]);
    const unit = stdMatch[2];
    if (unit.startsWith('second')) { intervalMs = val * 1000; cron = `* * * * *`; }
    if (unit.startsWith('minute')) { intervalMs = val * 60000; cron = `*/${val} * * * *`; }
    if (unit.startsWith('hour'))   { intervalMs = val * 3600000; cron = `0 */${val} * * *`; }
    if (unit.startsWith('day'))    { intervalMs = val * 86400000; cron = `0 0 */${val} * *`; }
  }

  // Time-of-day
  const timeMatch = lower.match(/(?:at|every day at)\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const min = parseInt(timeMatch[2] || '0');
    if (timeMatch[3] === 'pm' && hour < 12) hour += 12;
    if (timeMatch[3] === 'am' && hour === 12) hour = 0;
    cron = `${min} ${hour} * * *`;
    intervalMs = 86400000;
  }

  return { cron, intervalMs, description, action, phiScaled: !!phiMatch || !!fibMatch };
}

// ── Task Store ───────────────────────────────────────────────────────
function loadTasks() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return { tasks: [], version: 1 }; }
}

function saveTasks(store) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function addTask(nlText) {
  const parsed = parseNaturalLanguage(nlText);
  const store = loadTasks();
  const task = {
    id: `cron_${Date.now()}`,
    created: new Date().toISOString(),
    input: nlText,
    ...parsed,
    enabled: true,
    lastRun: null,
    runCount: 0
  };
  store.tasks.push(task);
  store.version++;
  saveTasks(store);
  return task;
}

// ── Task Runner ──────────────────────────────────────────────────────
const timers = new Map();

function startTask(task) {
  if (!task.intervalMs || timers.has(task.id)) return;
  const timer = setInterval(() => {
    task.lastRun = new Date().toISOString();
    task.runCount++;
    console.log(`[HeadyCron] Running: ${task.description} (${task.runCount}x)`);
    if (task.action) {
      try { execSync(task.action, { timeout: 30000, encoding: 'utf8' }); }
      catch (e) { console.error(`[HeadyCron] Task ${task.id} failed:`, e.message); }
    }
  }, task.intervalMs);
  timers.set(task.id, timer);
}

function stopTask(taskId) {
  const timer = timers.get(taskId);
  if (timer) { clearInterval(timer); timers.delete(taskId); }
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') {
    return res.end(JSON.stringify({ status: 'ok', service: 'heady-cron', activeTasks: timers.size }));
  }

  if (parsed.pathname === '/schedule' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body);
        const task = addTask(text);
        startTask(task);
        res.end(JSON.stringify({ created: task }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  if (parsed.pathname === '/tasks') {
    return res.end(JSON.stringify(loadTasks()));
  }

  if (parsed.pathname === '/phi-intervals') {
    const intervals = {};
    for (let p = 1; p <= 10; p++) {
      intervals[`phi^${p}_seconds`] = phiInterval(1, p);
      intervals[`phi^${p}_minutes`] = phiInterval(60, p);
    }
    intervals.fibonacci_minutes = FIBONACCI.slice(0, 12);
    return res.end(JSON.stringify(intervals, null, 2));
  }

  res.end(JSON.stringify({
    service: 'HeadyCron', version: '1.0.0',
    description: 'Natural language scheduling with φ-time intervals',
    endpoints: { '/schedule': 'POST {text}', '/tasks': 'GET', '/phi-intervals': 'GET', '/health': 'GET' }
  }));
});

const PORT = process.env.PORT || 8091;
server.listen(PORT, () => console.log(`⏱️ HeadyCron listening on :${PORT}`));

module.exports = { parseNaturalLanguage, phiInterval, fibonacciInterval, addTask };
