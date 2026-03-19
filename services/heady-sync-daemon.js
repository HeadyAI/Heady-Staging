// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY SYNC DAEMON — Intelligent Multi-Remote Git Sync         ║
// ║  FILE: services/heady-sync-daemon.js                           ║
// ║  LAYER: infrastructure                                          ║
// ║                                                                 ║
// ║  Monitors 16 remotes. Merges conflict-free. Deploys on green.  ║
// ║  Author: Eric Haywood                                           ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── φ Constants ─────────────────────────────────────────────────────────────
const PHI  = 1.618033988749895;
const PSI  = 1 / PHI;                  // ≈ 0.618
const PSI2 = PSI * PSI;                // ≈ 0.382
const FIB  = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── Logging ─────────────────────────────────────────────────────────────────
const LOG_PATH = null; // Set at runtime
function log(level, msg, data = {}) {
    const entry = {
        ts: new Date().toISOString(),
        level,
        service: 'heady-sync-daemon',
        msg,
        ...data,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
    return entry;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. REMOTE REGISTRY — Maps all 16 remotes with roles and priority
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Remote roles:
 *   source  — pull changes FROM this remote (primary truth)
 *   mirror  — push changes TO this remote (keep in sync)
 *   deploy  — push triggers CI/CD pipeline
 *   archive — read-only reference, don't push
 */
const REMOTE_ROLES = { SOURCE: 'source', MIRROR: 'mirror', DEPLOY: 'deploy', ARCHIVE: 'archive' };

class RemoteRegistry {
    constructor(root) {
        this._root = root;
        this._remotes = new Map();
        this._discover();
    }

    /** Auto-discover remotes from git config and classify them */
    _discover() {
        try {
            const raw = execSync('git remote -v', {
                cwd: this._root, encoding: 'utf8', timeout: FIB[7] * 1000, // 13s
            });
            const seen = new Set();
            for (const line of raw.trim().split('\n')) {
                const [name, url, type] = line.split(/\s+/);
                if (type !== '(fetch)' || seen.has(name)) continue;
                seen.add(name);

                this._remotes.set(name, {
                    name,
                    url: url.replace(/https?:\/\/[^@]+@/, 'https://***@'), // redact tokens in memory
                    rawUrl: url,
                    role: this._classifyRole(name),
                    priority: this._classifyPriority(name),
                    branch: 'main',
                    lastFetch: null,
                    lastError: null,
                    consecutiveFailures: 0,
                    backoffUntil: null,
                });
            }
        } catch (e) {
            log('ERROR', 'Failed to discover remotes', { error: e.message });
        }
    }

    _classifyRole(name) {
        // HeadyAI remotes are the source of truth
        if (name.startsWith('headyai')) return REMOTE_ROLES.SOURCE;
        // Azure remotes trigger CI/CD
        if (name.startsWith('azure-')) return REMOTE_ROLES.DEPLOY;
        // Production remote is deploy target
        if (name === 'production') return REMOTE_ROLES.DEPLOY;
        // HeadySystems are mirrors
        if (name.startsWith('hs-')) return REMOTE_ROLES.MIRROR;
        // Everything else is a mirror
        return REMOTE_ROLES.MIRROR;
    }

    _classifyPriority(name) {
        // φ-scaled priority: higher = merge first
        if (name === 'headyai') return 1.0;
        if (name === 'headyai-staging') return PSI;           // 0.618
        if (name === 'headyai-testing') return PSI2;          // 0.382
        if (name.startsWith('hs-')) return PSI;               // 0.618
        if (name.startsWith('hc-')) return PSI2;              // 0.382
        if (name === 'production') return 1.0;
        if (name.startsWith('azure-')) return PSI;            // 0.618
        if (name === 'staging') return PSI;
        if (name === 'heady-testing') return PSI2;
        return PSI2;
    }

    getAll() { return [...this._remotes.values()]; }
    getSources() { return this.getAll().filter(r => r.role === REMOTE_ROLES.SOURCE); }
    getMirrors() { return this.getAll().filter(r => r.role === REMOTE_ROLES.MIRROR); }
    getDeploy() { return this.getAll().filter(r => r.role === REMOTE_ROLES.DEPLOY); }
    get(name) { return this._remotes.get(name); }
    size() { return this._remotes.size; }

    /** Get remotes sorted by priority (highest first) */
    byPriority() {
        return this.getAll().sort((a, b) => b.priority - a.priority);
    }

    /** Check if a remote is in backoff */
    isBackedOff(name) {
        const r = this._remotes.get(name);
        if (!r || !r.backoffUntil) return false;
        return Date.now() < r.backoffUntil;
    }

    /** Record a failure and apply exponential backoff */
    recordFailure(name, error) {
        const r = this._remotes.get(name);
        if (!r) return;
        r.consecutiveFailures++;
        r.lastError = error;
        // Exponential backoff: φ^failures minutes, capped at fib(8)=21min
        const backoffMs = Math.min(
            Math.pow(PHI, r.consecutiveFailures) * 60000,
            FIB[8] * 60000, // 21 min cap
        );
        r.backoffUntil = Date.now() + backoffMs;
        log('WARN', `Remote ${name} backed off for ${(backoffMs / 60000).toFixed(1)}min`, {
            remote: name, failures: r.consecutiveFailures,
        });
    }

    /** Record a success and reset backoff */
    recordSuccess(name) {
        const r = this._remotes.get(name);
        if (!r) return;
        r.consecutiveFailures = 0;
        r.lastError = null;
        r.backoffUntil = null;
        r.lastFetch = Date.now();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SYNC ENGINE — Fetch, detect divergence, pull/merge, push mirrors
// ═══════════════════════════════════════════════════════════════════════════════

class SyncEngine {
    constructor(root, registry, opts = {}) {
        this._root = root;
        this._registry = registry;
        this._dryRun = opts.dryRun || false;
        this._timeout = opts.timeout || FIB[10] * 1000; // 55s
        this._history = [];
    }

    /** Execute a git command (with optional dry-run override) */
    _git(cmd, opts = {}) {
        const full = `git ${cmd}`;
        if (this._dryRun && !opts.allowInDryRun) {
            log('DEBUG', `[dry-run] ${full}`);
            return '[dry-run]';
        }
        try {
            return execSync(full, {
                cwd: this._root,
                encoding: 'utf8',
                timeout: opts.timeout || this._timeout,
                stdio: 'pipe',
            }).trim();
        } catch (e) {
            throw new Error(`git ${cmd}: ${e.stderr || e.message}`);
        }
    }

    /** Fetch all remotes in parallel (safe operation, always runs) */
    async fetchAll() {
        const results = [];
        const remotes = this._registry.getAll();

        const promises = remotes.map(async (remote) => {
            if (this._registry.isBackedOff(remote.name)) {
                return { remote: remote.name, status: 'backed-off', skipped: true };
            }
            try {
                // Use exec for parallel execution
                await new Promise((resolve, reject) => {
                    const child = exec(
                        `git fetch ${remote.name} --prune --tags`,
                        { cwd: this._root, timeout: this._timeout },
                        (err, stdout, stderr) => {
                            if (err) reject(err);
                            else resolve(stdout);
                        }
                    );
                });
                this._registry.recordSuccess(remote.name);
                return { remote: remote.name, status: 'ok', fetched: true };
            } catch (e) {
                this._registry.recordFailure(remote.name, e.message);
                return { remote: remote.name, status: 'error', error: e.message.slice(0, 200) };
            }
        });

        const settled = await Promise.allSettled(promises);
        for (const result of settled) {
            results.push(result.status === 'fulfilled' ? result.value : {
                status: 'error', error: result.reason?.message,
            });
        }

        const ok = results.filter(r => r.status === 'ok').length;
        const failed = results.filter(r => r.status === 'error').length;
        log('INFO', `Fetched ${ok}/${remotes.length} remotes (${failed} failed)`, {
            ok, failed, backedOff: results.filter(r => r.skipped).length,
        });

        return { results, summary: { ok, failed, total: remotes.length } };
    }

    /** Detect divergence between local and remote branches */
    detectDivergence() {
        const localHead = this._git('rev-parse HEAD', { allowInDryRun: true });
        const localBranch = this._git('rev-parse --abbrev-ref HEAD', { allowInDryRun: true });
        const divergence = [];

        for (const remote of this._registry.byPriority()) {
            const ref = `${remote.name}/${remote.branch}`;
            try {
                const remoteHead = this._git(`rev-parse ${ref}`, { allowInDryRun: true });
                if (remoteHead === localHead) {
                    divergence.push({
                        remote: remote.name, ref, status: 'synced',
                        role: remote.role, priority: remote.priority,
                    });
                    continue;
                }

                // Check ahead/behind
                const counts = this._git(
                    `rev-list --left-right --count ${localBranch}...${ref}`,
                    { allowInDryRun: true }
                );
                const [ahead, behind] = counts.split('\t').map(Number);

                let status = 'synced';
                if (ahead > 0 && behind > 0) status = 'diverged';
                else if (ahead > 0) status = 'ahead';
                else if (behind > 0) status = 'behind';

                divergence.push({
                    remote: remote.name, ref, status,
                    ahead, behind,
                    role: remote.role, priority: remote.priority,
                });
            } catch (e) {
                divergence.push({
                    remote: remote.name, ref, status: 'error',
                    error: e.message.slice(0, 100),
                    role: remote.role, priority: remote.priority,
                });
            }
        }

        const needsMerge = divergence.filter(d => d.status === 'behind' || d.status === 'diverged');
        const needsPush = divergence.filter(d => d.status === 'ahead');

        log('INFO', `Divergence check: ${needsMerge.length} behind, ${needsPush.length} ahead`, {
            synced: divergence.filter(d => d.status === 'synced').length,
        });

        return {
            localBranch,
            localHead: localHead.slice(0, 8),
            divergence,
            needsMerge,
            needsPush,
        };
    }

    /** Get the current local HEAD */
    getHead() {
        return this._git('rev-parse --short HEAD', { allowInDryRun: true });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. MERGE ORCHESTRATOR — Conflict-safe intelligent merging
// ═══════════════════════════════════════════════════════════════════════════════

class MergeOrchestrator {
    constructor(root, opts = {}) {
        this._root = root;
        this._dryRun = opts.dryRun || false;
        this._autoResolvePatterns = opts.autoResolvePatterns || [
            'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
            '*.log', 'logs/*', '.DS_Store',
        ];
        this._mergeHistory = [];
    }

    _git(cmd, opts = {}) {
        if (this._dryRun && !opts.allowInDryRun) {
            log('DEBUG', `[dry-run] git ${cmd}`);
            return '[dry-run]';
        }
        return execSync(`git ${cmd}`, {
            cwd: this._root, encoding: 'utf8',
            timeout: opts.timeout || FIB[10] * 1000, stdio: 'pipe', // 55s
        }).trim();
    }

    /**
     * Attempt to merge a remote branch into the current local branch.
     * Uses dry-run first to detect conflicts before committing.
     *
     * @param {string} remoteName - Name of the remote
     * @param {string} remoteBranch - Branch to merge from
     * @returns {Object} Merge result
     */
    merge(remoteName, remoteBranch = 'main') {
        const ref = `${remoteName}/${remoteBranch}`;
        const record = {
            id: `merge-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
            ref,
            startedAt: new Date().toISOString(),
            status: 'pending',
        };

        try {
            // Ensure clean working tree
            const status = this._git('status --porcelain', { allowInDryRun: true });
            if (status && status.trim()) {
                // Stash any uncommitted changes
                log('WARN', 'Stashing uncommitted changes before merge');
                this._git('stash push -m "heady-sync-daemon: pre-merge stash"');
                record.stashed = true;
            }

            // ── Step 1: Dry-run merge ────────────────────────────────────
            log('INFO', `Dry-run merge: ${ref}`);
            try {
                this._git(`merge --no-commit --no-ff ${ref}`);
            } catch (e) {
                // Dry-run revealed conflicts
                const conflicted = this._getConflictedFiles();
                const autoResolvable = conflicted.filter(f => this._isAutoResolvable(f));
                const realConflicts = conflicted.filter(f => !this._isAutoResolvable(f));

                if (realConflicts.length > 0) {
                    // Real conflicts — abort
                    this._git('merge --abort');
                    record.status = 'conflict';
                    record.conflicts = realConflicts;
                    record.autoResolvable = autoResolvable;
                    log('WARN', `Merge ${ref} aborted: ${realConflicts.length} real conflicts`, {
                        conflicts: realConflicts.slice(0, 10),
                    });
                    this._restoreStash(record);
                    this._mergeHistory.push(record);
                    return record;
                }

                // All conflicts are auto-resolvable
                if (autoResolvable.length > 0) {
                    log('INFO', `Auto-resolving ${autoResolvable.length} files`);
                    for (const file of autoResolvable) {
                        try {
                            this._git(`checkout --theirs -- "${file}"`);
                            this._git(`add "${file}"`);
                        } catch (_) {
                            // If auto-resolve fails on a file, skip it
                        }
                    }
                    record.autoResolved = autoResolvable;
                }
            }

            // ── Step 2: Check if merge actually changed anything ─────────
            const diff = this._git('diff --cached --stat', { allowInDryRun: true });
            if (!diff || !diff.trim()) {
                // Nothing to merge (already up to date or empty merge)
                try { this._git('merge --abort'); } catch (_) {}
                record.status = 'up-to-date';
                this._restoreStash(record);
                this._mergeHistory.push(record);
                return record;
            }

            // ── Step 3: Commit the merge ─────────────────────────────────
            const msg = `sync: merge ${ref} → local (heady-sync-daemon)`;
            this._git(`commit -m "${msg}"`);

            record.status = 'merged';
            record.message = msg;
            record.filesChanged = diff.split('\n').length - 1;
            record.completedAt = new Date().toISOString();

            log('INFO', `Merged ${ref} successfully (${record.filesChanged} files)`, {
                id: record.id,
            });

            this._restoreStash(record);
            this._mergeHistory.push(record);
            return record;

        } catch (e) {
            // Safety: always try to clean up
            try { this._git('merge --abort'); } catch (_) {}
            record.status = 'error';
            record.error = e.message.slice(0, 300);
            log('ERROR', `Merge ${ref} failed`, { error: record.error });
            this._restoreStash(record);
            this._mergeHistory.push(record);
            return record;
        }
    }

    /** Get list of conflicted files */
    _getConflictedFiles() {
        try {
            const output = this._git('diff --name-only --diff-filter=U', { allowInDryRun: true });
            return output ? output.split('\n').filter(Boolean) : [];
        } catch (_) {
            return [];
        }
    }

    /** Check if a file path matches auto-resolve patterns */
    _isAutoResolvable(filePath) {
        const basename = path.basename(filePath);
        return this._autoResolvePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return re.test(filePath) || re.test(basename);
            }
            return basename === pattern || filePath === pattern;
        });
    }

    /** Restore stash if we stashed before merge */
    _restoreStash(record) {
        if (record.stashed) {
            try {
                this._git('stash pop');
                record.stashRestored = true;
            } catch (e) {
                log('WARN', 'Failed to restore stash after merge', { error: e.message });
                record.stashRestoreError = e.message;
            }
        }
    }

    /** Push to a specific remote */
    pushTo(remoteName, branch = 'main') {
        if (this._dryRun) {
            log('DEBUG', `[dry-run] push to ${remoteName}/${branch}`);
            return { remote: remoteName, status: 'dry-run' };
        }
        try {
            this._git(`push ${remoteName} ${branch}`, { timeout: FIB[11] * 1000 }); // 89s
            return { remote: remoteName, status: 'pushed', branch };
        } catch (e) {
            return { remote: remoteName, status: 'error', error: e.message.slice(0, 200) };
        }
    }

    /** Push to all mirrors */
    pushAllMirrors(registry, branch = 'main') {
        const mirrors = [...registry.getMirrors(), ...registry.getDeploy()];
        const results = [];
        for (const remote of mirrors) {
            if (registry.isBackedOff(remote.name)) {
                results.push({ remote: remote.name, status: 'backed-off' });
                continue;
            }
            const result = this.pushTo(remote.name, branch);
            if (result.status === 'error') {
                registry.recordFailure(remote.name, result.error);
            } else {
                registry.recordSuccess(remote.name);
            }
            results.push(result);
        }
        const pushed = results.filter(r => r.status === 'pushed').length;
        log('INFO', `Pushed to ${pushed}/${mirrors.length} mirrors`);
        return results;
    }

    getHistory() { return this._mergeHistory.slice(-FIB[10]); } // last 55
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DEPENDABOT MANAGER — Clean up stale branches, auto-merge safe updates
// ═══════════════════════════════════════════════════════════════════════════════

class DependabotManager {
    constructor(root, opts = {}) {
        this._root = root;
        this._dryRun = opts.dryRun || false;
    }

    _git(cmd) {
        return execSync(`git ${cmd}`, {
            cwd: this._root, encoding: 'utf8', timeout: FIB[8] * 1000, stdio: 'pipe', // 21s
        }).trim();
    }

    /** Scan all remotes for Dependabot branches */
    scanBranches() {
        const raw = this._git('branch -a');
        const allBranches = raw.split('\n').map(l => l.trim().replace(/^\* /, ''));
        const depBranches = allBranches.filter(b => b.includes('dependabot/'));

        // Group by dependency
        const groups = new Map();
        for (const branch of depBranches) {
            // Format: remotes/{remote}/dependabot/{type}/{dep-name}
            const parts = branch.replace('remotes/', '').split('/');
            const remote = parts[0];
            const depType = parts[2]; // npm_and_yarn, github_actions, docker
            const depName = parts.slice(3).join('/');
            const key = `${depType}/${depName}`;

            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push({ branch, remote, depType, depName, fullRef: branch });
        }

        return {
            total: depBranches.length,
            groups: Object.fromEntries(groups),
            groupCount: groups.size,
        };
    }

    /** Prune stale remote-tracking branches that no longer exist on remotes */
    pruneStale() {
        if (this._dryRun) {
            log('DEBUG', '[dry-run] Would prune stale remote branches');
            return { status: 'dry-run' };
        }
        try {
            const output = this._git('remote prune --all 2>&1 || true');
            return { status: 'pruned', output };
        } catch (e) {
            return { status: 'error', error: e.message };
        }
    }

    /** Delete specific remote-tracking branches locally */
    deleteBranches(branches) {
        if (this._dryRun) {
            log('DEBUG', `[dry-run] Would delete ${branches.length} branches`);
            return { status: 'dry-run', count: branches.length };
        }
        const results = [];
        for (const branch of branches) {
            try {
                this._git(`branch -rd ${branch}`);
                results.push({ branch, deleted: true });
            } catch (e) {
                results.push({ branch, deleted: false, error: e.message });
            }
        }
        return { deleted: results.filter(r => r.deleted).length, total: branches.length, results };
    }

    /**
     * Smart cleanup: for each dependency group, keep only the latest branch
     * and prune duplicates (e.g., if puppeteer has 3 version bumps,
     * keep only the highest version).
     */
    smartCleanup() {
        const scan = this.scanBranches();
        const toDelete = [];

        for (const [key, branches] of Object.entries(scan.groups)) {
            if (branches.length <= 1) continue;

            // Sort by version (extract version from branch name)
            const sorted = branches.sort((a, b) => {
                const vA = a.depName.replace(/[^0-9.]/g, '');
                const vB = b.depName.replace(/[^0-9.]/g, '');
                return vB.localeCompare(vA, undefined, { numeric: true });
            });

            // Keep the first (latest), delete the rest
            for (let i = 1; i < sorted.length; i++) {
                toDelete.push(sorted[i].fullRef);
            }
        }

        if (toDelete.length === 0) {
            return { status: 'clean', message: 'No duplicate Dependabot branches found' };
        }

        log('INFO', `Dependabot cleanup: ${toDelete.length} stale branches to prune`);
        const deleteResult = this.deleteBranches(toDelete);
        return { ...deleteResult, cleaned: toDelete.length };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DEPLOY TRIGGER — Post-merge deployment to Cloud Run
// ═══════════════════════════════════════════════════════════════════════════════

class DeployTrigger {
    constructor(root, opts = {}) {
        this._root = root;
        this._enabled = opts.enabled !== false;
        this._dryRun = opts.dryRun || false;
        this._lastDeployAt = 0;
        this._cooldownMs = opts.cooldownMs || Math.round(PHI * PHI * 60000); // ≈ 2.6 min
        this._deployHistory = [];
        this._deployScript = opts.deployScript || path.join(root, 'scripts', 'deploy.js');
    }

    /** Check if we can deploy (respects cooldown) */
    canDeploy() {
        if (!this._enabled) return { can: false, reason: 'disabled' };
        const elapsed = Date.now() - this._lastDeployAt;
        if (elapsed < this._cooldownMs) {
            return {
                can: false,
                reason: 'cooldown',
                remainingMs: this._cooldownMs - elapsed,
            };
        }
        return { can: true };
    }

    /** Trigger deployment */
    async deploy(opts = {}) {
        const check = this.canDeploy();
        if (!check.can) {
            log('INFO', `Deploy skipped: ${check.reason}`);
            return { status: 'skipped', ...check };
        }

        if (this._dryRun) {
            log('DEBUG', '[dry-run] Would trigger deploy');
            return { status: 'dry-run' };
        }

        const record = {
            id: `deploy-${Date.now()}`,
            triggeredBy: opts.triggeredBy || 'sync-daemon',
            startedAt: new Date().toISOString(),
        };

        try {
            // Check if deploy script exists
            if (!fs.existsSync(this._deployScript)) {
                // Fallback: try gcloud deploy
                log('INFO', 'Deploy script not found, using gcloud deploy');
                const output = execSync(
                    'gcloud run deploy heady-manager --source . --region us-east1 --quiet 2>&1',
                    { cwd: this._root, encoding: 'utf8', timeout: FIB[13] * 1000, stdio: 'pipe' } // 233s
                );
                record.status = 'deployed';
                record.method = 'gcloud';
                record.output = output.slice(0, 500);
            } else {
                const output = execSync(
                    `node ${this._deployScript}`,
                    { cwd: this._root, encoding: 'utf8', timeout: FIB[13] * 1000, stdio: 'pipe' } // 233s
                );
                record.status = 'deployed';
                record.method = 'script';
                record.output = output.slice(0, 500);
            }

            this._lastDeployAt = Date.now();
            record.completedAt = new Date().toISOString();
            log('INFO', 'Deploy completed', { id: record.id, method: record.method });

        } catch (e) {
            record.status = 'failed';
            record.error = e.message.slice(0, 300);
            log('ERROR', 'Deploy failed', { error: record.error });
        }

        this._deployHistory.push(record);
        if (this._deployHistory.length > FIB[10]) this._deployHistory.shift(); // cap at 55
        return record;
    }

    getHistory() { return this._deployHistory; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SYNC SCHEDULER — φ-scaled intervals with jitter and backoff
// ═══════════════════════════════════════════════════════════════════════════════

class SyncScheduler {
    constructor(opts = {}) {
        this._intervalMs = opts.intervalMs || Math.round(PHI * PHI * PHI * 60000); // ≈ 4.2 min
        this._jitterMs = opts.jitterMs || FIB[8] * 1000; // ±21s (fib(8))
        this._timer = null;
        this._running = false;
        this._callback = opts.callback || (() => {});
        this._cycleCount = 0;
        this._lastCycleAt = null;
        this._quietHours = opts.quietHours || null; // { start: 2, end: 6 } (UTC hours)
    }

    /** Start the scheduler */
    start() {
        if (this._running) return { ok: false, reason: 'already running' };
        this._running = true;
        this._scheduleNext();
        log('INFO', `SyncScheduler started (interval: ${(this._intervalMs / 60000).toFixed(1)}min)`);
        return { ok: true, intervalMs: this._intervalMs };
    }

    /** Stop the scheduler */
    stop() {
        this._running = false;
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        log('INFO', 'SyncScheduler stopped');
        return { ok: true, cyclesRun: this._cycleCount };
    }

    /** Schedule the next cycle with jitter */
    _scheduleNext() {
        if (!this._running) return;
        const jitter = Math.round((Math.random() - 0.5) * 2 * this._jitterMs);
        const delay = this._intervalMs + jitter;

        this._timer = setTimeout(async () => {
            await this._runCycle();
            this._scheduleNext();
        }, delay);
    }

    /** Run a single sync cycle */
    async _runCycle() {
        // Check quiet hours
        if (this._isQuietHour()) {
            log('DEBUG', 'Quiet hours — skipping merge/push (fetch only)');
        }

        this._cycleCount++;
        this._lastCycleAt = Date.now();

        try {
            await this._callback({
                cycleNumber: this._cycleCount,
                isQuietHour: this._isQuietHour(),
            });
        } catch (e) {
            log('ERROR', `Sync cycle ${this._cycleCount} failed`, { error: e.message });
        }
    }

    _isQuietHour() {
        if (!this._quietHours) return false;
        const hour = new Date().getUTCHours();
        const { start, end } = this._quietHours;
        if (start < end) return hour >= start && hour < end;
        return hour >= start || hour < end; // wraps midnight
    }

    getStatus() {
        return {
            running: this._running,
            intervalMs: this._intervalMs,
            cycleCount: this._cycleCount,
            lastCycleAt: this._lastCycleAt ? new Date(this._lastCycleAt).toISOString() : null,
            isQuietHour: this._isQuietHour(),
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. HEADY SYNC DAEMON — The orchestrator that ties everything together
// ═══════════════════════════════════════════════════════════════════════════════

class HeadySyncDaemon {
    constructor(opts = {}) {
        this._root = opts.root || process.cwd();
        this._dryRun = opts.dryRun || false;
        this._autoDeploy = opts.autoDeploy !== false;

        // Components
        this.registry = new RemoteRegistry(this._root);
        this.engine = new SyncEngine(this._root, this.registry, { dryRun: this._dryRun });
        this.merger = new MergeOrchestrator(this._root, { dryRun: this._dryRun });
        this.dependabot = new DependabotManager(this._root, { dryRun: this._dryRun });
        this.deployer = new DeployTrigger(this._root, {
            dryRun: this._dryRun,
            enabled: this._autoDeploy,
        });
        this.scheduler = new SyncScheduler({
            intervalMs: opts.intervalMs,
            quietHours: opts.quietHours,
            callback: (ctx) => this.runCycle(ctx),
        });

        // State
        this._started = false;
        this._cycleHistory = [];
        this._logPath = path.join(this._root, 'logs', 'heady-sync-daemon.log');

        log('INFO', `HeadySyncDaemon initialized`, {
            root: this._root,
            remotes: this.registry.size(),
            dryRun: this._dryRun,
            autoDeploy: this._autoDeploy,
        });
    }

    /** Start the daemon */
    start() {
        if (this._started) return { ok: false, reason: 'already started' };
        this._started = true;

        // Ensure logs directory exists
        try { fs.mkdirSync(path.dirname(this._logPath), { recursive: true }); } catch (_) {}

        log('INFO', '═══ HeadySyncDaemon STARTED ═══');
        this.scheduler.start();

        // Run first cycle immediately
        setTimeout(() => this.runCycle({ cycleNumber: 0, isQuietHour: false }), FIB[4] * 1000); // 3s

        return { ok: true, remotes: this.registry.size() };
    }

    /** Stop the daemon */
    stop() {
        this._started = false;
        this.scheduler.stop();
        log('INFO', '═══ HeadySyncDaemon STOPPED ═══');
        return { ok: true, cyclesRun: this._cycleHistory.length };
    }

    /**
     * Run a single sync cycle — the core orchestration loop.
     *
     * 1. Fetch all remotes
     * 2. Detect divergence
     * 3. Merge from sources (if behind, priority-ordered)
     * 4. Push to mirrors (if merged or ahead)
     * 5. Deploy (if merged to main and auto-deploy enabled)
     * 6. Clean up Dependabot branches (every 13th cycle — Fibonacci)
     */
    async runCycle(ctx = {}) {
        const cycle = {
            id: `cycle-${Date.now()}`,
            number: ctx.cycleNumber || this._cycleHistory.length + 1,
            startedAt: new Date().toISOString(),
            steps: {},
        };

        try {
            // ── Step 1: Fetch ────────────────────────────────────────────
            cycle.steps.fetch = await this.engine.fetchAll();

            // ── Step 2: Detect divergence ────────────────────────────────
            cycle.steps.divergence = this.engine.detectDivergence();
            const { needsMerge, needsPush } = cycle.steps.divergence;

            // ── Step 3: Merge from sources (if not quiet hours) ──────────
            if (!ctx.isQuietHour && needsMerge.length > 0) {
                cycle.steps.merges = [];
                // Merge from highest priority first
                const sortedMerges = needsMerge.sort((a, b) => b.priority - a.priority);

                for (const remote of sortedMerges) {
                    // Only merge from sources (not mirrors or deploy targets)
                    if (remote.role !== REMOTE_ROLES.SOURCE) continue;

                    const result = this.merger.merge(remote.remote, 'main');
                    cycle.steps.merges.push(result);

                    // If first merge succeeds, re-check divergence for remaining
                    if (result.status === 'merged') {
                        break; // Merge one at a time to avoid compound conflicts
                    }
                }
            }

            // ── Step 4: Push to mirrors ──────────────────────────────────
            const merged = cycle.steps.merges?.some(m => m.status === 'merged');
            if (!ctx.isQuietHour && (merged || needsPush.length > 0)) {
                cycle.steps.push = this.merger.pushAllMirrors(this.registry);
            }

            // ── Step 5: Deploy (if merged) ───────────────────────────────
            if (merged && this._autoDeploy) {
                cycle.steps.deploy = await this.deployer.deploy({
                    triggeredBy: `sync-cycle-${cycle.number}`,
                });
            }

            // ── Step 6: Dependabot cleanup (every FIB[7]=13 cycles) ──────
            if (cycle.number % FIB[7] === 0) {
                cycle.steps.dependabot = this.dependabot.smartCleanup();
            }

            cycle.status = 'complete';

        } catch (e) {
            cycle.status = 'error';
            cycle.error = e.message;
            log('ERROR', `Sync cycle failed`, { error: e.message });
        }

        cycle.completedAt = new Date().toISOString();
        cycle.durationMs = new Date(cycle.completedAt) - new Date(cycle.startedAt);
        this._cycleHistory.push(cycle);

        // Keep last 100 cycles
        if (this._cycleHistory.length > 100) this._cycleHistory.shift();

        // Write cycle report to log
        this._appendLog(cycle);

        return cycle;
    }

    /** Manually trigger a sync cycle (API/CLI) */
    async trigger() {
        log('INFO', 'Manual sync triggered');
        return this.runCycle({ cycleNumber: this._cycleHistory.length + 1, isQuietHour: false });
    }

    /** Get daemon status */
    getStatus() {
        return {
            started: this._started,
            remotes: this.registry.size(),
            dryRun: this._dryRun,
            autoDeploy: this._autoDeploy,
            scheduler: this.scheduler.getStatus(),
            lastCycle: this._cycleHistory.length > 0
                ? this._cycleHistory[this._cycleHistory.length - 1]
                : null,
            totalCycles: this._cycleHistory.length,
            registry: this.registry.getAll().map(r => ({
                name: r.name, role: r.role, priority: r.priority,
                lastFetch: r.lastFetch ? new Date(r.lastFetch).toISOString() : null,
                failures: r.consecutiveFailures,
                backedOff: this.registry.isBackedOff(r.name),
            })),
        };
    }

    /** Get cycle history */
    getHistory(limit = FIB[8]) { // default 21
        return this._cycleHistory.slice(-limit);
    }

    /** Append cycle to log file */
    _appendLog(cycle) {
        try {
            const line = JSON.stringify({
                id: cycle.id,
                number: cycle.number,
                status: cycle.status,
                durationMs: cycle.durationMs,
                merged: cycle.steps.merges?.filter(m => m.status === 'merged').length || 0,
                pushed: cycle.steps.push?.filter(p => p.status === 'pushed').length || 0,
                ts: cycle.completedAt,
            }) + '\n';
            fs.appendFileSync(this._logPath, line);
        } catch (_) {}
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Express Route Registration
// ═══════════════════════════════════════════════════════════════════════════════

function registerSyncRoutes(app, daemon) {
    // Status
    app.get('/api/sync/status', (req, res) => {
        res.json({ ok: true, ...daemon.getStatus() });
    });

    // Manual trigger
    app.post('/api/sync/trigger', async (req, res) => {
        try {
            const result = await daemon.trigger();
            res.json({ ok: true, cycle: result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // Cycle history
    app.get('/api/sync/history', (req, res) => {
        const limit = parseInt(req.query.limit) || 20;
        res.json({ ok: true, history: daemon.getHistory(limit) });
    });

    // Divergence check (read-only)
    app.get('/api/sync/divergence', (req, res) => {
        try {
            const d = daemon.engine.detectDivergence();
            res.json({ ok: true, ...d });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // Dependabot scan
    app.get('/api/sync/dependabot', (req, res) => {
        try {
            const scan = daemon.dependabot.scanBranches();
            res.json({ ok: true, ...scan });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // Dependabot cleanup
    app.post('/api/sync/dependabot/cleanup', (req, res) => {
        try {
            const result = daemon.dependabot.smartCleanup();
            res.json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // Remote registry
    app.get('/api/sync/remotes', (req, res) => {
        res.json({
            ok: true,
            remotes: daemon.registry.getAll().map(r => ({
                name: r.name, role: r.role, priority: r.priority,
                url: r.url, // redacted
                lastFetch: r.lastFetch ? new Date(r.lastFetch).toISOString() : null,
                failures: r.consecutiveFailures,
            })),
        });
    });

    // Start/stop daemon
    app.post('/api/sync/start', (req, res) => {
        res.json({ ok: true, ...daemon.start() });
    });

    app.post('/api/sync/stop', (req, res) => {
        res.json({ ok: true, ...daemon.stop() });
    });

    // Deploy history
    app.get('/api/sync/deploy/history', (req, res) => {
        res.json({ ok: true, history: daemon.deployer.getHistory() });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const once = args.includes('--once');
    const root = args.find(a => a.startsWith('--root='))?.split('=')[1] || process.cwd();

    const daemon = new HeadySyncDaemon({ root, dryRun });

    if (once) {
        // Run single cycle and exit
        daemon.runCycle({ cycleNumber: 1, isQuietHour: false }).then(result => {
            console.log(JSON.stringify(result, null, 2));
            process.exit(result.status === 'complete' ? 0 : 1);
        });
    } else {
        // Daemon mode
        daemon.start();

        // Graceful shutdown
        process.on('SIGTERM', () => { daemon.stop(); process.exit(0); });
        process.on('SIGINT', () => { daemon.stop(); process.exit(0); });
    }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
    HeadySyncDaemon,
    RemoteRegistry,
    SyncEngine,
    MergeOrchestrator,
    DependabotManager,
    DeployTrigger,
    SyncScheduler,
    registerSyncRoutes,
    REMOTE_ROLES,
};
