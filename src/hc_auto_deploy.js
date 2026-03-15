const { logger } = require('./utils/logger');
// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  Heady Auto-Deploy Engine                                        ║
// ║  ∞ SACRED GEOMETRY ∞  Automatic Git + Deploy Pipeline           ║
// ║  Handles: commit, push, multi-remote sync, Cloud Run deploy     ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HCAutoDeploy — The missing auto-deploy implementation for Heady.
 *
 * Consumes: AUTO_DEPLOY, AUTO_TRAIN from .env
 * Integrates: git commit/push, multi-remote sync, Cloud Run auto-deploy
 * Schedule: Configurable via cron expressions or programmatic triggers
 *
 * Usage:
 *   const autoDeploy = require('./hc_auto_deploy');
 *   autoDeploy.start();          // Start scheduled auto-deploy
 *   autoDeploy.runOnce();        // Single deploy cycle
 *   autoDeploy.stop();           // Stop scheduler
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const ColorfulLogger = require('./hc_colorful_logger');
const colorfulLog = new ColorfulLogger({ level: 'info' });

const HEADY_ROOT = path.resolve(__dirname, '..');

// Latent Space integration — all ops recorded
let latent;
try {
  latent = require('./hc_latent_space');
} catch (e) {
  // Graceful fallback if latent space module not available
  latent = { record: () => { }, search: () => ({ results: [] }), wrap: (cat, desc, fn) => fn };
}

// ─── Configuration ────────────────────────────────────────────────
function loadConfig() {
  const env = {};
  try {
    const envContent = fs.readFileSync(path.join(HEADY_ROOT, '.env'), 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
      }
    }
  } catch (e) { colorfulLog.warning("Failed to load .env file", { error: e.message }); }

  // Also try .env.local for overrides
  try {
    const localContent = fs.readFileSync(path.join(HEADY_ROOT, '.env.local'), 'utf8');
    for (const line of localContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
      }
    }
  } catch (e) { colorfulLog.warning("Failed to load .env.local file", { error: e.message }); }

  return {
    autoDeployEnabled: (process.env.AUTO_DEPLOY || env.AUTO_DEPLOY || 'false') === 'true',
    autoTrainEnabled: (process.env.AUTO_TRAIN || env.AUTO_TRAIN || 'false') === 'true',

    githubToken: process.env.GITHUB_TOKEN || env.GITHUB_TOKEN || '',
    remotes: {
      primary: process.env.GIT_REMOTE_PRIMARY || env.GIT_REMOTE_PRIMARY || 'heady-me',
      sandbox: process.env.GIT_REMOTE_SANDBOX || env.GIT_REMOTE_SANDBOX || 'sandbox',
      production: process.env.GIT_REMOTE_PRODUCTION || env.GIT_REMOTE_PRODUCTION || 'origin'
    },
    cloudEndpoints: {
      headyMe: process.env.CLOUD_HEADYME_URL || env.CLOUD_HEADYME_URL || '',
      headySystems: process.env.CLOUD_HEADYSYSTEMS_URL || env.CLOUD_HEADYSYSTEMS_URL || '',
      headyConnection: process.env.CLOUD_HEADYCONNECTION_URL || env.CLOUD_HEADYCONNECTION_URL || ''
    },
    productionGateThreshold: parseInt(process.env.PRODUCTION_GATE_THRESHOLD || env.PRODUCTION_GATE_THRESHOLD || '100', 10),
    // Schedule: default every 15 minutes
    cronExpression: process.env.AUTO_DEPLOY_CRON || env.AUTO_DEPLOY_CRON || '*/15 * * * *'
  };
}

// ─── Logging ──────────────────────────────────────────────────────
const LOG_DIR = path.join(HEADY_ROOT, 'logs');
function ensureLogDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) { /* exists */ }
}

function log(level, message, data = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    component: 'hc-auto-deploy',
    message,
    ...(data ? { data } : {})
  };
  const line = JSON.stringify(entry);

  // Console (structured)
  if (level === 'error') {
    logger.error(line);
  } else {
    logger.info(line);
  }

  // File
  ensureLogDir();
  try {
    fs.appendFileSync(path.join(LOG_DIR, 'auto-deploy.log'), line + '\n');
  } catch (e) { /* ignore file log errors */ }
}

// ─── Git Operations ───────────────────────────────────────────────
function gitExec(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: HEADY_ROOT,
      encoding: 'utf8',
      timeout: 29034, // φ⁶ × 1000
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opts
    }).trim();
  } catch (error) {
    throw new Error(`Git command failed: ${cmd}\n${error.stderr || error.message}`);
  }
}

function hasUncommittedChanges() {
  const status = gitExec('git status --porcelain');
  return status.length > 0;
}

function hasMergeConflicts() {
  const status = gitExec('git status --porcelain');
  return status.split('\n').some(line => line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD'));
}

function getCurrentBranch() {
  return gitExec('git rev-parse --abbrev-ref HEAD');
}

function getLastCommitMessage() {
  return gitExec('git log -1 --pretty=%B');
}

function getChangedFilesSummary() {
  const status = gitExec('git status --porcelain');
  const lines = status.split('\n').filter(Boolean);
  const added = lines.filter(l => l.startsWith('?') || l.startsWith('A')).length;
  const modified = lines.filter(l => l.startsWith('M') || l.startsWith(' M')).length;
  const deleted = lines.filter(l => l.startsWith('D') || l.startsWith(' D')).length;
  return { total: lines.length, added, modified, deleted, files: lines.slice(0, 20).map(l => l.substring(3)) };
}

function autoCommit(message) {
  gitExec('git add -A');

  // Check if there's actually anything staged
  const staged = gitExec('git diff --cached --stat');
  if (!staged) {
    log('info', 'Nothing to commit after staging');
    return null;
  }

  const commitMsg = message || `[auto-deploy] ${new Date().toISOString().split('T')[0]} — automated commit`;
  gitExec(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);

  const hash = gitExec('git rev-parse --short HEAD');
  log('info', 'Auto-commit created', { hash, message: commitMsg });
  return hash;
}

function pushToRemote(remote, branch) {
  try {
    gitExec(`git push ${remote} ${branch} 2>&1`);
    log('info', `Pushed to ${remote}/${branch}`);
    return { success: true, remote, branch };
  } catch (error) {
    log('error', `Push failed to ${remote}/${branch}`, { error: error.message });
    return { success: false, remote, branch, error: error.message };
  }
}

function syncAllRemotes(branch) {
  const config = loadConfig();
  const results = [];

  for (const [name, remote] of Object.entries(config.remotes)) {
    if (!remote) continue;
    // Check if remote exists
    try {
      gitExec(`git remote get-url ${remote}`);
      results.push(pushToRemote(remote, branch));
    } catch (e) {
      log('warn', `Remote '${remote}' (${name}) not configured, skipping`);
      results.push({ success: false, remote, branch, error: 'Remote not configured' });
    }
  }

  return results;
}

// ─── Health Checks ────────────────────────────────────────────────
function httpGet(url, timeout = 11090) { // φ⁵ × 1000
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function checkCloudHealth(endpoint) {
  if (!endpoint) return { healthy: false, reason: 'No endpoint configured' };
  try {
    const res = await httpGet(`${endpoint}/api/health`);
    return { healthy: res.status === 200, status: res.status, data: res.data };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

// ─── Production Gate ──────────────────────────────────────────────
async function evaluateProductionGate(config) {
  const checks = {
    noMergeConflicts: !hasMergeConflicts(),
    hasChanges: hasUncommittedChanges(),
    branchIsMain: ['main', 'master'].includes(getCurrentBranch()),
    configValid: config.autoDeployEnabled
  };

  // Optional: cloud health check
  if (config.cloudEndpoints.headyMe) {
    try {
      const health = await checkCloudHealth(config.cloudEndpoints.headyMe);
      checks.cloudHealthy = health.healthy;
    } catch (e) {
      checks.cloudHealthy = false;
    }
  }

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const score = Math.round((passed / total) * 100);

  return {
    passed: score >= config.productionGateThreshold,
    score,
    threshold: config.productionGateThreshold,
    checks
  };
}



// ─── Main Deploy Cycle ────────────────────────────────────────────
async function runDeployCycle(options = {}) {
  const config = loadConfig();
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    config: { autoDeployEnabled: config.autoDeployEnabled, autoTrainEnabled: config.autoTrainEnabled },
    steps: {}
  };

  log('info', 'Starting auto-deploy cycle', { trigger: options.trigger || 'scheduled' });
  latent.record('deploy', 'Auto-deploy cycle started', { trigger: options.trigger || 'scheduled' });

  // Step 1: Check if auto-deploy is enabled
  if (!config.autoDeployEnabled && !options.force) {
    log('info', 'Auto-deploy is disabled (AUTO_DEPLOY != true)');
    results.steps.enabled = false;
    results.outcome = 'skipped';
    return results;
  }

  // Step 2: Check for merge conflicts (blocker)
  if (hasMergeConflicts()) {
    log('error', 'Merge conflicts detected — cannot auto-deploy');
    results.steps.mergeConflicts = true;
    results.outcome = 'blocked';
    return results;
  }
  results.steps.mergeConflicts = false;

  // Step 3: Check for uncommitted changes
  const changes = getChangedFilesSummary();
  results.steps.changes = changes;

  if (changes.total === 0) {
    log('info', 'No changes to deploy');
    results.outcome = 'no_changes';
    return results;
  }

  // Step 4: Auto-commit
  try {
    const hash = autoCommit(options.message);
    results.steps.commit = { success: true, hash };
  } catch (error) {
    log('error', 'Auto-commit failed', { error: error.message });
    results.steps.commit = { success: false, error: error.message };
    results.outcome = 'commit_failed';
    return results;
  }

  // Step 5: Push to all remotes
  const branch = getCurrentBranch();
  const pushResults = syncAllRemotes(branch);
  results.steps.push = pushResults;

  const anyPushSucceeded = pushResults.some(r => r.success);
  if (!anyPushSucceeded) {
    log('error', 'All pushes failed');
    results.outcome = 'push_failed';
    return results;
  }

  // Step 6: Cloud Run auto-deploys from git push — no manual trigger needed

  // Step 7: Record result
  results.outcome = 'success';
  results.duration = Date.now() - startTime;
  log('info', 'Auto-deploy cycle complete', { outcome: results.outcome, duration: results.duration });
  latent.record('deploy', 'Auto-deploy cycle completed successfully', {
    duration: results.duration, changes: results.steps.changes,
    pushResults: results.steps.push?.map(p => ({ remote: p.remote, success: p.success }))
  });

  // Save deploy record
  saveDeployRecord(results);

  return results;
}



function saveDeployRecord(record) {
  const recordsDir = path.join(HEADY_ROOT, 'data', 'deploy-records');
  try {
    fs.mkdirSync(recordsDir, { recursive: true });
    const filename = `deploy-${record.timestamp.replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(recordsDir, filename), JSON.stringify(record, null, 2));
  } catch (e) {
    log('warn', 'Could not save deploy record', { error: e.message });
  }
}

// ─── Scheduler ────────────────────────────────────────────────────
let schedulerInterval = null;

function parseCronToMs(cronExpr) {
  // Simple cron parser for common patterns
  // */15 * * * * = every 15 minutes
  // */5 * * * * = every 5 minutes
  // 0 * * * * = every hour
  const parts = cronExpr.split(/\s+/);
  if (parts.length < 5) return 15 * 60 * 1000; // default 15 min

  const minute = parts[0];
  if (minute.startsWith('*/')) {
    const interval = parseInt(minute.substring(2), 10);
    return interval * 60 * 1000;
  }
  if (minute === '0') return 60 * 60 * 1000; // hourly
  return 15 * 60 * 1000; // default
}

function start() {
  const config = loadConfig();

  if (!config.autoDeployEnabled) {
    log('info', 'Auto-deploy disabled in config. Set AUTO_DEPLOY=true in .env to enable.');
    return;
  }

  const intervalMs = parseCronToMs(config.cronExpression);
  log('info', `Auto-deploy scheduler starting (interval: ${intervalMs / 1000}s, cron: ${config.cronExpression})`);

  // Run immediately on start
  runDeployCycle({ trigger: 'startup' }).catch(e => log('error', 'Deploy cycle error', { error: e.message }));

  // Then schedule recurring
  schedulerInterval = setInterval(() => {
    runDeployCycle({ trigger: 'scheduled' }).catch(e => log('error', 'Deploy cycle error', { error: e.message }));
  }, intervalMs);

  log('info', 'Auto-deploy scheduler active');
}

function stop() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    log('info', 'Auto-deploy scheduler stopped');
  }
}

async function runOnce(options = {}) {
  return runDeployCycle({ trigger: 'manual', ...options });
}

// ─── Status ───────────────────────────────────────────────────────
function getStatus() {
  const config = loadConfig();
  let branch = 'unknown', changes = false, conflicts = false, lastCommit = '';
  try { branch = getCurrentBranch(); } catch (e) { branch = `error: ${e.message.substring(0, 50)}`; }
  try { changes = hasUncommittedChanges(); } catch (e) { /* ignore */ }
  try { conflicts = hasMergeConflicts(); } catch (e) { /* ignore */ }
  try { lastCommit = getLastCommitMessage(); } catch (e) { /* ignore */ }

  // Read recent deploy records
  let recentDeploys = [];
  try {
    const recordsDir = path.join(HEADY_ROOT, 'data', 'deploy-records');
    if (fs.existsSync(recordsDir)) {
      const files = fs.readdirSync(recordsDir).sort().reverse().slice(0, 5);
      recentDeploys = files.map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(recordsDir, f), 'utf8')); }
        catch (e) { return { file: f, error: 'parse error' }; }
      });
    }
  } catch (e) { /* no records */ }

  return {
    autoDeployEnabled: config.autoDeployEnabled,
    autoTrainEnabled: config.autoTrainEnabled,
    schedulerRunning: schedulerInterval !== null,
    cronExpression: config.cronExpression,
    git: {
      branch,
      hasUncommittedChanges: changes,
      hasMergeConflicts: conflicts,
      lastCommit: lastCommit.substring(0, 100)
    },
    remotes: config.remotes,
    cloudEndpoints: Object.fromEntries(
      Object.entries(config.cloudEndpoints).map(([k, v]) => [k, v ? 'configured' : 'missing'])
    ),

    recentDeploys: recentDeploys.map(d => ({
      timestamp: d.timestamp, outcome: d.outcome, duration: d.duration
    }))
  };
}

// ─── CLI Mode ─────────────────────────────────────────────────────
if (require.main === module) {
  const arg = process.argv[2];

  if (arg === 'start') {
    start();
  } else if (arg === 'run' || arg === 'once') {
    runOnce({ force: process.argv.includes('--force') })
      .then(r => { logger.info(JSON.stringify(r, null, 2)); process.exit(0); })
      .catch(e => { logger.error(e.message); process.exit(1); });
  } else if (arg === 'status') {
    logger.info(JSON.stringify(getStatus(), null, 2));
  } else {
    logger.info('Usage: node hc_auto_deploy.js [start|run|once|status] [--force]');
    logger.info('  start  — Start the auto-deploy scheduler');
    logger.info('  run    — Run a single deploy cycle');
    logger.info('  status — Show current deploy status');
  }
}

module.exports = { start, stop, runOnce, runDeployCycle, getStatus };
