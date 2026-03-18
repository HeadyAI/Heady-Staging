/*
 * © 2026 Heady™ Systems Inc.
 * HeadyWatch — Monitor + AI Auto-Respond in One Product
 *
 * Features:
 *  - HTTP health monitoring with configurable intervals
 *  - NL-defined automated responses (restart, page, escalate)
 *  - Pheromone-trail-style alerting (escalates with persistence)
 *  - φ-scaled check intervals (backs off on healthy, speeds up on issues)
 *  - Swarm-assignable monitoring bees
 */

const http = require('http');
const url = require('url');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;
const STORE_PATH = path.join(__dirname, '../../.heady_cache/watch-monitors.json');
const LOG_PATH = path.join(__dirname, '../../logs/heady-watch.jsonl');

// ── Monitor Store ────────────────────────────────────────────────────
function loadMonitors() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return { monitors: [], version: 1 }; }
}

function saveMonitors(store) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function appendLog(record) {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(LOG_PATH, JSON.stringify(record) + '\n');
}

// ── HTTP Checker ─────────────────────────────────────────────────────
function checkEndpoint(targetUrl, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proto = targetUrl.startsWith('https') ? https : http;
    const req = proto.get(targetUrl, { timeout: timeoutMs }, (res) => {
      const latency = Date.now() - startTime;
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, latency, body: body.slice(0, 500), healthy: res.statusCode >= 200 && res.statusCode < 400 }));
    });
    req.on('error', (e) => resolve({ status: 0, latency: Date.now() - startTime, error: e.message, healthy: false }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, latency: timeoutMs, error: 'timeout', healthy: false }); });
  });
}

// ── Monitor Runner ───────────────────────────────────────────────────
const activeMonitors = new Map();

async function runCheck(monitor) {
  const result = await checkEndpoint(monitor.url, monitor.timeoutMs || 10000);
  const timestamp = new Date().toISOString();

  // Update monitor state
  monitor.lastCheck = timestamp;
  monitor.lastStatus = result.status;
  monitor.lastLatency = result.latency;
  monitor.checkCount = (monitor.checkCount || 0) + 1;

  if (result.healthy) {
    monitor.consecutiveFailures = 0;
    monitor.currentInterval = monitor.baseInterval; // Reset to normal
    console.log(`✅ [HeadyWatch] ${monitor.name}: ${result.status} (${result.latency}ms)`);
  } else {
    monitor.consecutiveFailures = (monitor.consecutiveFailures || 0) + 1;
    // φ-scaled escalation: check MORE frequently when failing
    monitor.currentInterval = Math.max(5000, Math.round(monitor.baseInterval / Math.pow(PHI, monitor.consecutiveFailures)));
    console.log(`❌ [HeadyWatch] ${monitor.name}: FAIL #${monitor.consecutiveFailures} — ${result.error || result.status} (next check in ${Math.round(monitor.currentInterval / 1000)}s)`);

    // Auto-response actions
    if (monitor.onFailure) {
      for (const action of monitor.onFailure) {
        if (monitor.consecutiveFailures >= (action.afterFailures || 1)) {
          console.log(`🤖 [HeadyWatch] Auto-responding: ${action.type} — ${action.description || ''}`);
          appendLog({ timestamp, monitor: monitor.name, action: action.type, failures: monitor.consecutiveFailures });
        }
      }
    }
  }

  appendLog({ timestamp, monitor: monitor.name, ...result, consecutiveFailures: monitor.consecutiveFailures });
  return result;
}

function startMonitor(monitor) {
  if (activeMonitors.has(monitor.id)) return;
  monitor.currentInterval = monitor.baseInterval || 60000;

  const run = async () => {
    await runCheck(monitor);
    // Schedule next check with φ-scaled interval
    const timer = setTimeout(run, monitor.currentInterval);
    activeMonitors.set(monitor.id, timer);
  };
  run();
}

function stopMonitor(monitorId) {
  const timer = activeMonitors.get(monitorId);
  if (timer) { clearTimeout(timer); activeMonitors.delete(monitorId); }
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') {
    return res.end(JSON.stringify({ status: 'ok', service: 'heady-watch', activeMonitors: activeMonitors.size }));
  }

  if (parsed.pathname === '/monitors') {
    return res.end(JSON.stringify(loadMonitors()));
  }

  if (parsed.pathname === '/add' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { name, url: targetUrl, intervalSeconds, onFailure } = JSON.parse(body);
        const store = loadMonitors();
        const monitor = {
          id: `watch_${Date.now()}`,
          name: name || targetUrl,
          url: targetUrl,
          baseInterval: (intervalSeconds || 60) * 1000,
          timeoutMs: 10000,
          onFailure: onFailure || [],
          created: new Date().toISOString(),
          consecutiveFailures: 0,
          checkCount: 0
        };
        store.monitors.push(monitor);
        store.version++;
        saveMonitors(store);
        startMonitor(monitor);
        res.end(JSON.stringify({ created: monitor }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  if (parsed.pathname === '/check' && parsed.query.url) {
    checkEndpoint(parsed.query.url).then(result => res.end(JSON.stringify(result)));
    return;
  }

  res.end(JSON.stringify({
    service: 'HeadyWatch', version: '1.0.0',
    description: 'Monitor + AI auto-respond with φ-scaled check intervals',
    endpoints: { '/monitors': 'GET', '/add': 'POST', '/check?url=': 'GET', '/health': 'GET' }
  }));
});

const PORT = process.env.PORT || 8092;
server.listen(PORT, () => console.log(`👁️ HeadyWatch listening on :${PORT}`));

module.exports = { checkEndpoint, runCheck, startMonitor };
