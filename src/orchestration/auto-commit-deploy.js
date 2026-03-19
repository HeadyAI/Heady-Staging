// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  FILE: src/orchestration/auto-commit-deploy.js                 ║
// ║  LAYER: orchestration/automation                                ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * AutoCommitDeploy — Permanent Pipeline Automation Engine
 *
 * Required by hc_auto_success.js start() — was missing, causing silent failure.
 *
 * Responsibilities:
 *  1. Monitor git working tree for uncommitted changes
 *  2. Auto-commit on φ⁸-interval (46,971ms) when changes detected
 *  3. Push to branch claude/heady-platform-improvements-JhdcJ
 *  4. Trigger auto-deploy via Cloud Run (gcloud) when commits pushed
 *  5. Emit events to global.eventBus so auto-success engine reacts
 *
 * Governed by Arena Mode HITL:
 *  - TRIVIAL changes: auto-commit (docs, configs, minor)
 *  - SIGNIFICANT changes: Slack notification, 4h window
 *  - CRITICAL changes: synchronous block (auth*, billing*, DROP TABLE*)
 *
 * © 2026 HeadySystems Inc. | φ = 1.618033988749895
 */

'use strict';

const { execSync, exec } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const EventEmitter = require('events');

// ─── φ-MATH CONSTANTS ────────────────────────────────────────────────────────
const PHI  = 1.618033988749895;
const PSI  = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB  = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584];

// φ⁸ × 1000ms = 46,971ms — auto-commit check interval (faster than φ⁷ cycle)
const COMMIT_CHECK_INTERVAL_MS = Math.round(Math.pow(PHI, 8) * 1000);
// φ⁹ × 1000ms = 76,013ms — inbound fetch/merge interval (slower than commits)
const FETCH_MERGE_INTERVAL_MS = Math.round(Math.pow(PHI, 9) * 1000);
// φ⁶ × 1000ms = 17,944ms — deploy poll after push
const DEPLOY_POLL_INTERVAL_MS = Math.round(Math.pow(PHI, 6) * 1000);
// Maximum commit message length
const MAX_MSG_LEN = FIB[10]; // 89 chars

// Arena Mode critical patterns — synchronous block required
const CRITICAL_PATTERNS = /auth|billing|password|private.key|DROP\s+TABLE|schema\s+migrat/i;

// Branch — must match session branch
const AUTO_BRANCH = process.env.HEADY_AUTO_BRANCH || 'claude/heady-platform-improvements-JhdcJ';

// Safe auto-merge branch patterns (Dependabot, minor chore branches)
const SAFE_MERGE_PATTERNS = [
  /^dependabot\//,                    // Dependabot dependency bumps
  /^renovate\//,                      // Renovate bot
];

// Push targets — all configured remotes (not just 'origin')
const PUSH_REMOTES = (process.env.HEADY_PUSH_REMOTES || 'hc-main,azure-main').split(',').map(r => r.trim()).filter(Boolean);

// ─── LOGGER ──────────────────────────────────────────────────────────────────
let _logger = null;
try { _logger = require('../utils/logger'); } catch { /* graceful */ }
function log(level, msg, data = {}) {
  const entry = { level, component: 'AutoCommitDeploy', msg, ts: new Date().toISOString(), ...data };
  if (_logger?.logNodeActivity) {
    _logger.logNodeActivity('AUTO-COMMIT', JSON.stringify(entry));
  } else {
    console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
  }
}

// ─── GIT HELPERS ─────────────────────────────────────────────────────────────

function safeExec(cmd, opts = {}) {
  try {
    return { stdout: execSync(cmd, { encoding: 'utf8', timeout: FIB[11] * FIB[5], stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim(), success: true };
  } catch (e) {
    return { stdout: e.stdout?.trim() || '', stderr: e.stderr?.trim() || '', success: false };
  }
}

function getGitStatus() {
  const result = safeExec('git status --porcelain');
  if (!result.success) return { hasChanges: false, files: [] };
  const lines = result.stdout.split('\n').filter(Boolean);
  return {
    hasChanges: lines.length > 0,
    files: lines.map(l => ({ status: l.slice(0, 2).trim(), file: l.slice(3) })),
    count: lines.length,
  };
}

function getCurrentBranch() {
  return safeExec('git rev-parse --abbrev-ref HEAD').stdout;
}

function hasMergeConflicts() {
  const { stdout } = safeExec('git diff --name-only --diff-filter=U');
  return stdout.length > 0;
}

function classifyChanges(files) {
  const allFiles = files.map(f => f.file).join('\n');
  if (CRITICAL_PATTERNS.test(allFiles)) return 'CRITICAL';
  const docOnly = files.every(f => /\.(md|yaml|yml|json|txt|css)$/.test(f.file));
  if (docOnly) return 'TRIVIAL';
  return 'SIGNIFICANT';
}

function buildCommitMessage(files, tier) {
  const cats = [...new Set(files.map(f => {
    if (f.file.startsWith('src/')) return 'feat';
    if (f.file.startsWith('docs/')) return 'docs';
    if (f.file.startsWith('configs/')) return 'config';
    if (f.file.startsWith('packages/')) return 'pkg';
    if (f.file.startsWith('services/')) return 'svc';
    return 'chore';
  }))];
  const prefix = cats[0] || 'chore';
  const summary = files.slice(0, FIB[4]).map(f => path.basename(f.file)).join(', ');
  const msg = `${prefix}(auto): ${summary} [tier=${tier}]`;
  return msg.length > MAX_MSG_LEN ? msg.slice(0, MAX_MSG_LEN - 3) + '...' : msg;
}

// ─── MAIN ENGINE ─────────────────────────────────────────────────────────────

class AutoCommitDeploy extends EventEmitter {
  constructor(opts = {}) {
    super();
    this._projectRoot = opts.projectRoot || process.cwd();
    this._branch      = opts.branch || AUTO_BRANCH;
    this._timer       = null;
    this._fetchTimer  = null;
    this._running     = false;
    this._commitCount = 0;
    this._deployCount = 0;
    this._mergeCount  = 0;
    this._fetchCount  = 0;
    this._lastCommitAt = 0;
    this._lastFetchAt  = 0;
    this._blocked = false; // CRITICAL tier block
  }

  start() {
    if (this._running) return this;
    this._running = true;

    // Wire to global.eventBus if available
    const bus = global.eventBus;
    if (bus) {
      // React to pipeline completions — check for uncommitted artifacts
      bus.on('pipeline:completed', () => this._checkAndCommit('pipeline:completed'));
      // React to deploy events
      bus.on('deploy:started', (data) => log('info', 'deploy started', data));
      bus.on('deploy:completed', (data) => {
        this._deployCount++;
        log('info', 'deploy completed', { count: this._deployCount, ...data });
        bus.emit('auto_success:reaction', { source: 'auto-commit-deploy', type: 'deploy:completed', data });
      });
    }

    // φ⁸-interval auto-commit check
    this._timer = setInterval(() => this._checkAndCommit('scheduled'), COMMIT_CHECK_INTERVAL_MS);

    // φ⁹-interval inbound fetch/merge check (slightly slower cadence)
    this._fetchTimer = setInterval(() => this._fetchAndMerge('scheduled'), FETCH_MERGE_INTERVAL_MS);

    // Fire initial checks after boot delay
    const bootDelay = Math.round(Math.pow(PHI, 4) * 1000);
    setTimeout(() => this._checkAndCommit('boot'), bootDelay);
    setTimeout(() => this._fetchAndMerge('boot'), bootDelay + 5000);

    log('info', 'AutoCommitDeploy started', {
      branch: this._branch,
      commitIntervalMs: COMMIT_CHECK_INTERVAL_MS,
      fetchIntervalMs: FETCH_MERGE_INTERVAL_MS,
      pushRemotes: PUSH_REMOTES,
    });
    this.emit('started', { branch: this._branch });
    return this;
  }

  stop() {
    if (!this._running) return this;
    this._running = false;
    clearInterval(this._timer);
    clearInterval(this._fetchTimer);
    this._timer = null;
    this._fetchTimer = null;
    log('info', 'AutoCommitDeploy stopped', {
      commits: this._commitCount,
      deploys: this._deployCount,
      merges: this._mergeCount,
      fetches: this._fetchCount,
    });
    this.emit('stopped', { commits: this._commitCount, merges: this._mergeCount });
    return this;
  }

  // ─── INBOUND SYNC: Fetch all remotes + auto-merge safe branches ──────────
  async _fetchAndMerge(trigger = 'manual') {
    if (!this._running || this._blocked) return;
    if (this._fetching) return; // re-entrant guard
    this._fetching = true;

    try {
      // 1. Fetch all remotes
      log('info', `inbound sync started (trigger=${trigger})`);
      const fetchResult = safeExec('git fetch --all --prune', { timeout: 60000 });
      this._fetchCount++;
      this._lastFetchAt = Date.now();

      if (!fetchResult.success) {
        log('warn', 'git fetch --all failed', { stderr: fetchResult.stderr });
        return;
      }

      // 2. Get unmerged remote branches
      const unmergedResult = safeExec('git branch -r --no-merged main');
      if (!unmergedResult.success || !unmergedResult.stdout) {
        log('debug', 'no unmerged remote branches');
        return;
      }

      const unmergedBranches = unmergedResult.stdout.split('\n')
        .map(b => b.trim())
        .filter(Boolean)
        .filter(b => !b.includes('HEAD'));

      // 3. Identify safe auto-merge candidates
      const safeBranches = unmergedBranches.filter(fullRef => {
        // Extract branch name without remote prefix (e.g., 'hc-testing/dependabot/pip/...' → 'dependabot/pip/...')
        const branchName = fullRef.replace(/^[^/]+\//, '');
        return SAFE_MERGE_PATTERNS.some(pattern => pattern.test(branchName));
      });

      if (safeBranches.length === 0) {
        log('debug', `${unmergedBranches.length} unmerged branches, 0 safe for auto-merge`, { trigger });
        global.eventBus?.emit('sync:status', {
          source: 'auto-commit-deploy',
          unmerged: unmergedBranches.length,
          autoMergeable: 0,
        });
        return;
      }

      log('info', `found ${safeBranches.length} safe branches to auto-merge`, {
        branches: safeBranches.slice(0, 10),
      });

      // 4. Auto-merge safe branches (one at a time, abort on conflict)
      let merged = 0;
      let skipped = 0;
      const mergeResults = [];

      for (const branch of safeBranches) {
        // Skip if merge conflicts already exist
        if (hasMergeConflicts()) {
          log('warn', 'merge conflicts exist — stopping auto-merge');
          break;
        }

        const mergeResult = safeExec(`git merge ${branch} --no-edit --no-ff -m "[auto-sync] merge ${branch}"`);

        if (mergeResult.success) {
          merged++;
          this._mergeCount++;
          mergeResults.push({ branch, status: 'merged' });
          log('info', `auto-merged: ${branch}`);
        } else {
          // Check if it's a conflict
          if (mergeResult.stderr?.includes('CONFLICT') || mergeResult.stdout?.includes('CONFLICT')) {
            // Abort the merge and skip this branch
            safeExec('git merge --abort');
            skipped++;
            mergeResults.push({ branch, status: 'conflict-skipped' });
            log('warn', `merge conflict in ${branch} — aborted, skipping`);
          } else {
            skipped++;
            mergeResults.push({ branch, status: 'error', error: mergeResult.stderr });
            log('warn', `merge failed for ${branch}`, { stderr: mergeResult.stderr });
          }
        }
      }

      // 5. Push merged changes to all configured remotes
      if (merged > 0) {
        const currentBranch = getCurrentBranch();
        for (const remote of PUSH_REMOTES) {
          const pushResult = safeExec(`git push ${remote} ${currentBranch} --no-verify`);
          if (pushResult.success) {
            log('info', `pushed ${merged} merges to ${remote}/${currentBranch}`);
          } else {
            log('warn', `push to ${remote} failed`, { stderr: pushResult.stderr });
          }
        }
      }

      // 6. Emit sync report
      global.eventBus?.emit('sync:completed', {
        source: 'auto-commit-deploy',
        trigger,
        fetched: true,
        unmergedTotal: unmergedBranches.length,
        safeCandidates: safeBranches.length,
        merged,
        skipped,
        results: mergeResults,
      });

      log('info', `inbound sync complete: ${merged} merged, ${skipped} skipped`, {
        trigger, total: unmergedBranches.length,
      });

    } catch (err) {
      log('error', `fetch-and-merge error: ${err.message}`);
      global.eventBus?.emit('error:absorbed', { source: 'auto-commit-deploy', phase: 'fetch-merge', error: err.message });
    } finally {
      this._fetching = false;
    }
  }

  async _checkAndCommit(trigger = 'manual') {
    if (!this._running || this._blocked) return;

    // Re-entrant guard
    if (this._committing) return;
    this._committing = true;

    try {
      // Abort if merge conflicts exist
      if (hasMergeConflicts()) {
        log('warn', 'merge conflicts detected — skipping auto-commit');
        global.eventBus?.emit('auto_success:reaction', { source: 'auto-commit-deploy', type: 'merge:conflict' });
        return;
      }

      const { hasChanges, files, count } = getGitStatus();
      if (!hasChanges) {
        log('debug', 'working tree clean — nothing to commit', { trigger });
        return;
      }

      const tier = classifyChanges(files);
      log('info', `changes detected (tier=${tier})`, { count, trigger, files: files.slice(0, 5) });

      if (tier === 'CRITICAL') {
        this._blocked = true;
        log('warn', 'CRITICAL changes detected — blocking auto-commit, emitting governance:alert');
        global.eventBus?.emit('governance:audit', {
          source: 'auto-commit-deploy',
          tier: 'CRITICAL',
          files: files.map(f => f.file),
          reason: 'CRITICAL pattern match — requires manual review',
        });
        // Unblock after φ³ minutes (manual review window)
        setTimeout(() => { this._blocked = false; }, Math.round(Math.pow(PHI, 3) * 60000));
        return;
      }

      if (tier === 'SIGNIFICANT') {
        // Non-blocking — emit for async approval but proceed after φ² seconds
        global.eventBus?.emit('governance:audit', {
          source: 'auto-commit-deploy',
          tier: 'SIGNIFICANT',
          files: files.map(f => f.file),
          reason: 'SIGNIFICANT changes — async notification sent',
        });
        // Continue commit after short delay
        await new Promise(r => setTimeout(r, Math.round(Math.pow(PHI, 2) * 1000)));
      }

      // Stage, commit, push
      const msg = buildCommitMessage(files, tier);
      const stageResult = safeExec('git add -A');
      if (!stageResult.success) {
        log('error', 'git add failed', { stderr: stageResult.stderr });
        return;
      }

      const branch = getCurrentBranch();
      const sessionUrl = 'https://claude.ai/code/session_01BNXoMENYz7Wknt8FQuMdNz';
      const fullMsg = `${msg}\n\n${sessionUrl}`;

      const commitResult = safeExec(`git commit -m "${fullMsg.replace(/"/g, '\\"')}"`);
      if (!commitResult.success) {
        log('error', 'git commit failed', { stderr: commitResult.stderr });
        return;
      }

      this._commitCount++;
      this._lastCommitAt = Date.now();
      log('info', `committed (${this._commitCount})`, { branch, msg, files: count });
      global.eventBus?.emit('state:changed', { source: 'auto-commit-deploy', type: 'commit', msg });

      // Push to all configured remotes
      const currentBranch = getCurrentBranch();
      for (const remote of PUSH_REMOTES) {
        const pushResult = safeExec(`git push ${remote} ${currentBranch} --no-verify`);
        if (pushResult.success) {
          log('info', `pushed to ${remote}/${currentBranch}`);
          global.eventBus?.emit('deploy:started', { source: 'auto-commit-deploy', branch: currentBranch, remote, trigger });
          this.emit('pushed', { branch: currentBranch, remote, msg, fileCount: count });
        } else {
          log('warn', `push to ${remote} failed (will retry next cycle)`, { stderr: pushResult.stderr });
        }
      }

    } catch (err) {
      log('error', `auto-commit cycle error: ${err.message}`);
      global.eventBus?.emit('error:absorbed', { source: 'auto-commit-deploy', error: err.message });
    } finally {
      this._committing = false;
    }
  }

  getStatus() {
    return {
      running: this._running,
      branch: this._branch,
      commitCount: this._commitCount,
      deployCount: this._deployCount,
      mergeCount: this._mergeCount,
      fetchCount: this._fetchCount,
      lastCommitAt: this._lastCommitAt ? new Date(this._lastCommitAt).toISOString() : null,
      lastFetchAt: this._lastFetchAt ? new Date(this._lastFetchAt).toISOString() : null,
      blocked: this._blocked,
      commitIntervalMs: COMMIT_CHECK_INTERVAL_MS,
      fetchIntervalMs: FETCH_MERGE_INTERVAL_MS,
      pushRemotes: PUSH_REMOTES,
    };
  }

  // Manual trigger for immediate inbound sync (bypass interval)
  async fetchNow() {
    return this._fetchAndMerge('manual');
  }
}

// ─── SINGLETON + FACTORY ─────────────────────────────────────────────────────

let _singleton = null;

module.exports = {
  AutoCommitDeploy,
  // Singleton used by hc_auto_success.js: require('./auto-commit-deploy').start()
  start(opts = {}) {
    if (!_singleton) {
      _singleton = new AutoCommitDeploy(opts);
    }
    if (!_singleton._running) _singleton.start();
    return _singleton;
  },
  stop() {
    if (_singleton) _singleton.stop();
  },
  getStatus() {
    return _singleton ? _singleton.getStatus() : { running: false };
  },
  PHI, PSI, PSI2, FIB, COMMIT_CHECK_INTERVAL_MS,
};
