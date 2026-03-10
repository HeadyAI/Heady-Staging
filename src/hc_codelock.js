const { logger } = require('./utils/logger');
// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HeadyCodeLock — Codebase Governance & Approval Gate            ║
// ║  ∞ SACRED GEOMETRY ∞  No change flows without the owner's key   ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HCCodeLock — Codebase lockdown and change approval system.
 *
 * Enforces that all modifications to the Heady codebase go through an
 * explicit approval workflow. The owner (erich) must approve changes
 * before they are committed, pushed, or deployed.
 *
 * Features:
 *   - CODEOWNERS enforcement (who can touch what)
 *   - Change request queue with approval/deny workflow
 *   - Pre-commit hook integration
 *   - File integrity hashing (detect unauthorized changes)
 *   - Protected paths (configs, secrets, deploy scripts)
 *   - Audit trail of all approved changes
 *
 * Usage:
 *   const codelock = require('./hc_codelock');
 *   codelock.requestChange('update-pipeline', ['configs/hcfullpipeline.yaml'], 'Optimize stage ordering');
 *   codelock.approveChange('update-pipeline', 'erich');
 *   codelock.isLocked(); // true until owner unlocks
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ColorfulLogger = require('./hc_colorful_logger');
const log = new ColorfulLogger({ level: 'info' });

const HEADY_ROOT = path.resolve(__dirname, '..');
const LOCK_DIR = path.join(HEADY_ROOT, 'data', 'codelock');
const LOCK_FILE = path.join(LOCK_DIR, 'lock-state.json');
const QUEUE_FILE = path.join(LOCK_DIR, 'change-queue.json');
const AUDIT_FILE = path.join(LOCK_DIR, 'audit-log.jsonl');
const OWNERS_FILE = path.join(LOCK_DIR, 'CODEOWNERS.json');
const HASHES_FILE = path.join(LOCK_DIR, 'file-hashes.json');

// Latent space
let latent;
try { latent = require('./hc_latent_space'); } catch (e) {
  latent = { record: () => {} };
}

// ─── Ensure Directories ──────────────────────────────────────────
function ensureDirs() {
  try { fs.mkdirSync(LOCK_DIR, { recursive: true }); } catch (e) { log.warning("Failed to create codelock directory", { path: LOCK_DIR, error: e.message }); }
}

// ─── Lock State ──────────────────────────────────────────────────
function loadLockState() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  } catch (e) {
    // Default: LOCKED — owner must explicitly unlock
    const defaultState = {
      locked: true,
      owner: 'erich',
      lockedAt: new Date().toISOString(),
      lockedBy: 'system',
      reason: 'Initial lockdown — owner approval required for all changes',
      allowedUsers: ['erich'],
      protectedPaths: [
        'configs/',
        '.env',
        'render.yaml',
        'docker-compose.yml',
        'heady-manager.js',
        'mcp-servers/',
        'scripts/',
        'src/hc_codelock.js',
        'data/codelock/',
        'package.json',
        'package-lock.json'
      ],
      lockLevel: 'full' // full | protected-only | audit-only
    };
    saveLockState(defaultState);
    return defaultState;
  }
}

function saveLockState(state) {
  ensureDirs();
  fs.writeFileSync(LOCK_FILE, JSON.stringify(state, null, 2));
}

// ─── CODEOWNERS ──────────────────────────────────────────────────
function loadOwners() {
  try {
    return JSON.parse(fs.readFileSync(OWNERS_FILE, 'utf8'));
  } catch (e) {
    const defaultOwners = {
      version: '1.0',
      defaultOwner: 'erich',
      rules: [
        { pattern: '*', owners: ['erich'], approval: 'required' },
        { pattern: 'configs/*', owners: ['erich'], approval: 'required', protected: true },
        { pattern: '.env', owners: ['erich'], approval: 'required', protected: true },
        { pattern: 'mcp-servers/*', owners: ['erich'], approval: 'required' },
        { pattern: 'src/*', owners: ['erich'], approval: 'required' },
        { pattern: 'scripts/*', owners: ['erich'], approval: 'required', protected: true },
        { pattern: 'render.yaml', owners: ['erich'], approval: 'required', protected: true },
        { pattern: 'docs/*', owners: ['erich'], approval: 'review' },
        { pattern: 'frontend/*', owners: ['erich'], approval: 'review' },
        { pattern: 'public/*', owners: ['erich'], approval: 'review' },
        { pattern: 'tests/*', owners: ['erich'], approval: 'review' }
      ]
    };
    ensureDirs();
    fs.writeFileSync(OWNERS_FILE, JSON.stringify(defaultOwners, null, 2));
    return defaultOwners;
  }
}

function getFileOwner(filePath) {
  const owners = loadOwners();
  const relative = path.relative(HEADY_ROOT, path.resolve(HEADY_ROOT, filePath)).replace(/\\/g, '/');

  // Match most specific rule first (reverse order)
  for (let i = owners.rules.length - 1; i >= 0; i--) {
    const rule = owners.rules[i];
    const pattern = rule.pattern.replace('*', '');
    if (relative.startsWith(pattern) || relative === rule.pattern || rule.pattern === '*') {
      return { ...rule, file: relative };
    }
  }
  return { owners: [owners.defaultOwner], approval: 'required', file: relative };
}

// ─── Change Queue ────────────────────────────────────────────────
function loadQueue() {
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch (e) {
    return { pending: [], approved: [], denied: [] };
  }
}

function saveQueue(queue) {
  ensureDirs();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function requestChange(id, files, description, requestedBy = 'claude-agent') {
  const state = loadLockState();
  const queue = loadQueue();

  // Check if already exists
  if (queue.pending.find(c => c.id === id)) {
    return { success: false, error: `Change request '${id}' already pending` };
  }

  // Analyze ownership requirements
  const fileAnalysis = files.map(f => {
    const owner = getFileOwner(f);
    return {
      file: f,
      owners: owner.owners,
      approval: owner.approval,
      protected: owner.protected || false
    };
  });

  const hasProtected = fileAnalysis.some(f => f.protected);
  const requiresApproval = state.locked || fileAnalysis.some(f => f.approval === 'required');

  const change = {
    id,
    files: fileAnalysis,
    description,
    requestedBy,
    requestedAt: new Date().toISOString(),
    status: requiresApproval ? 'pending_approval' : 'auto_approved',
    hasProtectedFiles: hasProtected,
    lockLevel: state.lockLevel
  };

  if (requiresApproval) {
    queue.pending.push(change);
  } else {
    change.approvedBy = 'auto';
    change.approvedAt = new Date().toISOString();
    queue.approved.push(change);
  }

  saveQueue(queue);
  appendAudit('change_requested', { id, files: files.length, protected: hasProtected, requestedBy });
  latent.record('codelock', `Change requested: ${id} (${files.length} files)`, { id, hasProtected });

  return {
    success: true,
    id,
    status: change.status,
    requiresApproval,
    hasProtectedFiles: hasProtected,
    message: requiresApproval
      ? `Change '${id}' queued — waiting for owner approval`
      : `Change '${id}' auto-approved (audit-only mode)`
  };
}

function approveChange(changeId, approver) {
  const state = loadLockState();
  if (!state.allowedUsers.includes(approver)) {
    appendAudit('approve_denied', { changeId, approver, reason: 'not_authorized' });
    return { success: false, error: `'${approver}' is not authorized to approve changes` };
  }

  const queue = loadQueue();
  const idx = queue.pending.findIndex(c => c.id === changeId);
  if (idx === -1) {
    return { success: false, error: `No pending change request: ${changeId}` };
  }

  const change = queue.pending.splice(idx, 1)[0];
  change.status = 'approved';
  change.approvedBy = approver;
  change.approvedAt = new Date().toISOString();
  queue.approved.push(change);
  saveQueue(queue);

  appendAudit('change_approved', { changeId, approver, files: change.files.length });
  latent.record('codelock', `Change approved: ${changeId} by ${approver}`, { changeId, approver });

  return { success: true, change };
}

function denyChange(changeId, approver, reason = '') {
  const state = loadLockState();
  if (!state.allowedUsers.includes(approver)) {
    return { success: false, error: `'${approver}' is not authorized` };
  }

  const queue = loadQueue();
  const idx = queue.pending.findIndex(c => c.id === changeId);
  if (idx === -1) {
    return { success: false, error: `No pending change request: ${changeId}` };
  }

  const change = queue.pending.splice(idx, 1)[0];
  change.status = 'denied';
  change.deniedBy = approver;
  change.deniedAt = new Date().toISOString();
  change.denyReason = reason;
  queue.denied.push(change);
  saveQueue(queue);

  appendAudit('change_denied', { changeId, approver, reason });
  return { success: true, change };
}

function approveAll(approver) {
  const state = loadLockState();
  if (!state.allowedUsers.includes(approver)) {
    return { success: false, error: `'${approver}' is not authorized` };
  }

  const queue = loadQueue();
  const count = queue.pending.length;
  const now = new Date().toISOString();

  for (const change of queue.pending) {
    change.status = 'approved';
    change.approvedBy = approver;
    change.approvedAt = now;
    queue.approved.push(change);
  }
  queue.pending = [];
  saveQueue(queue);

  appendAudit('bulk_approve', { approver, count });
  return { success: true, approved: count };
}

// ─── Lock/Unlock ─────────────────────────────────────────────────
function lock(lockedBy = 'erich', reason = 'Manual lock') {
  const state = loadLockState();
  state.locked = true;
  state.lockedAt = new Date().toISOString();
  state.lockedBy = lockedBy;
  state.reason = reason;
  saveLockState(state);
  appendAudit('locked', { lockedBy, reason });
  latent.record('codelock', `Codebase LOCKED by ${lockedBy}: ${reason}`, { lockedBy });
  return { success: true, state };
}

function unlock(unlockedBy = 'erich', reason = 'Manual unlock') {
  const state = loadLockState();
  if (!state.allowedUsers.includes(unlockedBy)) {
    return { success: false, error: `'${unlockedBy}' is not authorized to unlock` };
  }
  state.locked = false;
  state.unlockedAt = new Date().toISOString();
  state.unlockedBy = unlockedBy;
  state.unlockReason = reason;
  saveLockState(state);
  appendAudit('unlocked', { unlockedBy, reason });
  latent.record('codelock', `Codebase UNLOCKED by ${unlockedBy}: ${reason}`, { unlockedBy });
  return { success: true, state };
}

function setLockLevel(level, setBy = 'erich') {
  const validLevels = ['full', 'protected-only', 'audit-only'];
  if (!validLevels.includes(level)) {
    return { success: false, error: `Invalid level. Use: ${validLevels.join(', ')}` };
  }
  const state = loadLockState();
  if (!state.allowedUsers.includes(setBy)) {
    return { success: false, error: `'${setBy}' is not authorized` };
  }
  state.lockLevel = level;
  saveLockState(state);
  appendAudit('level_changed', { level, setBy });
  return { success: true, level };
}

function addAllowedUser(username, addedBy = 'erich') {
  const state = loadLockState();
  if (!state.allowedUsers.includes(addedBy)) {
    return { success: false, error: `'${addedBy}' is not authorized` };
  }
  if (state.allowedUsers.includes(username)) {
    return { success: false, error: `'${username}' already allowed` };
  }
  state.allowedUsers.push(username);
  saveLockState(state);
  appendAudit('user_added', { username, addedBy });
  return { success: true, allowedUsers: state.allowedUsers };
}

function removeAllowedUser(username, removedBy = 'erich') {
  const state = loadLockState();
  if (username === 'erich') {
    return { success: false, error: 'Cannot remove the primary owner' };
  }
  if (!state.allowedUsers.includes(removedBy)) {
    return { success: false, error: `'${removedBy}' is not authorized` };
  }
  state.allowedUsers = state.allowedUsers.filter(u => u !== username);
  saveLockState(state);
  appendAudit('user_removed', { username, removedBy });
  return { success: true, allowedUsers: state.allowedUsers };
}

// ─── File Integrity ──────────────────────────────────────────────
function hashFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (e) {
    return null;
  }
}

function snapshotHashes() {
  const state = loadLockState();
  const hashes = {};

  function walkDir(dir, depth = 0) {
    if (depth > 4) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' ||
            entry.name === 'data' || entry.name === 'venv') continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(HEADY_ROOT, fullPath).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          walkDir(fullPath, depth + 1);
        } else if (entry.isFile() && /\.(js|yaml|yml|json|py|ps1|md|sh)$/.test(entry.name)) {
          hashes[relPath] = hashFile(fullPath);
        }
      }
    } catch (e) { /* skip */ }
  }

  walkDir(HEADY_ROOT);

  const snapshot = {
    timestamp: new Date().toISOString(),
    totalFiles: Object.keys(hashes).length,
    hashes
  };

  ensureDirs();
  fs.writeFileSync(HASHES_FILE, JSON.stringify(snapshot, null, 2));
  appendAudit('snapshot_taken', { totalFiles: snapshot.totalFiles });

  return { success: true, totalFiles: snapshot.totalFiles, timestamp: snapshot.timestamp };
}

function detectChanges() {
  let baseline;
  try {
    baseline = JSON.parse(fs.readFileSync(HASHES_FILE, 'utf8'));
  } catch (e) {
    return { success: false, error: 'No baseline snapshot. Run snapshotHashes() first.' };
  }

  const changes = { modified: [], added: [], deleted: [] };
  const currentFiles = new Set();

  function walkDir(dir, depth = 0) {
    if (depth > 4) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' ||
            entry.name === 'data' || entry.name === 'venv') continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(HEADY_ROOT, fullPath).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          walkDir(fullPath, depth + 1);
        } else if (entry.isFile() && /\.(js|yaml|yml|json|py|ps1|md|sh)$/.test(entry.name)) {
          currentFiles.add(relPath);
          const currentHash = hashFile(fullPath);
          if (!baseline.hashes[relPath]) {
            changes.added.push(relPath);
          } else if (baseline.hashes[relPath] !== currentHash) {
            changes.modified.push(relPath);
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  walkDir(HEADY_ROOT);

  for (const file of Object.keys(baseline.hashes)) {
    if (!currentFiles.has(file)) {
      changes.deleted.push(file);
    }
  }

  const hasChanges = changes.modified.length + changes.added.length + changes.deleted.length > 0;

  if (hasChanges) {
    appendAudit('changes_detected', {
      modified: changes.modified.length,
      added: changes.added.length,
      deleted: changes.deleted.length
    });
  }

  return {
    success: true,
    hasChanges,
    baseline: baseline.timestamp,
    changes,
    summary: {
      modified: changes.modified.length,
      added: changes.added.length,
      deleted: changes.deleted.length
    }
  };
}

// ─── Pre-Commit Hook Check ───────────────────────────────────────
function preCommitCheck(files) {
  const state = loadLockState();
  const queue = loadQueue();

  if (!state.locked && state.lockLevel === 'audit-only') {
    appendAudit('commit_audit', { files, mode: 'audit-only' });
    return { allowed: true, mode: 'audit-only' };
  }

  // Check if all files are in an approved change request
  const approvedFiles = new Set();
  for (const change of queue.approved) {
    if (change.status === 'approved') {
      for (const f of change.files) {
        approvedFiles.add(f.file || f);
      }
    }
  }

  const unapproved = files.filter(f => {
    const rel = path.relative(HEADY_ROOT, path.resolve(HEADY_ROOT, f)).replace(/\\/g, '/');
    return !approvedFiles.has(rel);
  });

  if (unapproved.length > 0 && state.locked) {
    appendAudit('commit_blocked', { files, unapproved, reason: 'locked' });
    return {
      allowed: false,
      reason: 'Codebase is locked. These files need owner approval:',
      unapproved,
      hint: 'Use requestChange() then approveChange() to unlock specific files'
    };
  }

  appendAudit('commit_allowed', { files });
  return { allowed: true };
}

// ─── Audit Log ───────────────────────────────────────────────────
function appendAudit(action, details = {}) {
  ensureDirs();
  const entry = {
    action,
    details,
    timestamp: new Date().toISOString()
  };
  try {
    fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n');
  } catch (e) { /* ignore */ }
}

function getAuditLog(limit = 50) {
  try {
    const lines = fs.readFileSync(AUDIT_FILE, 'utf8').split('\n').filter(Boolean);
    return lines
      .map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
      .filter(Boolean)
      .slice(-limit);
  } catch (e) {
    return [];
  }
}

// ─── Status ──────────────────────────────────────────────────────
function getStatus() {
  const state = loadLockState();
  const queue = loadQueue();
  const auditCount = getAuditLog(1000).length;

  let hashStatus = 'no snapshot';
  try {
    const h = JSON.parse(fs.readFileSync(HASHES_FILE, 'utf8'));
    hashStatus = `${h.totalFiles} files hashed at ${h.timestamp}`;
  } catch (e) { /* no snapshot */ }

  return {
    locked: state.locked,
    lockLevel: state.lockLevel,
    owner: state.owner,
    allowedUsers: state.allowedUsers,
    lockedAt: state.lockedAt,
    lockedBy: state.lockedBy,
    reason: state.reason,
    protectedPaths: state.protectedPaths,
    queue: {
      pending: queue.pending.length,
      approved: queue.approved.length,
      denied: queue.denied.length
    },
    pendingChanges: queue.pending.map(c => ({
      id: c.id, description: c.description,
      files: c.files.length, requestedBy: c.requestedBy, requestedAt: c.requestedAt
    })),
    fileIntegrity: hashStatus,
    auditEntries: auditCount
  };
}

// ─── Generate Git Pre-Commit Hook ────────────────────────────────
function generatePreCommitHook() {
  const hookContent = `#!/bin/sh
# HeadyCodeLock pre-commit hook
# Checks if changes are approved before allowing commit

node -e "
const codelock = require('./src/hc_codelock');
const { execSync } = require('child_process');
const files = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split('\\n').filter(Boolean);
const result = codelock.preCommitCheck(files);
if (!result.allowed) {
  logger.error('\\n❌ COMMIT BLOCKED by HeadyCodeLock');
  logger.error('Reason:', result.reason);
  if (result.unapproved) {
    result.unapproved.forEach(f => logger.error('  •', f));
  }
  logger.error('\\nUse the MCP tool heady_codelock_request to request approval.');
  process.exit(1);
} else {
  logger.info('✅ HeadyCodeLock: commit approved');
}
"
`;

  const hookPath = path.join(HEADY_ROOT, '.git', 'hooks', 'pre-commit');
  try {
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    appendAudit('hook_installed', { path: hookPath });
    return { success: true, path: hookPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  // Lock management
  isLocked: () => loadLockState().locked,
  lock,
  unlock,
  setLockLevel,
  getStatus,

  // User management
  addAllowedUser,
  removeAllowedUser,

  // Change workflow
  requestChange,
  approveChange,
  denyChange,
  approveAll,
  getQueue: loadQueue,

  // File integrity
  snapshotHashes,
  detectChanges,

  // Commit gate
  preCommitCheck,

  // Audit
  getAuditLog,

  // Setup
  generatePreCommitHook,
  getFileOwner
};
