#!/usr/bin/env bash
# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  AUTO-COMMIT-PUSH — HCFullPipeline Stage 12                    ║
# ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces   ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END
#
# Automatically stages, commits, and pushes all changes to all remotes.
# Called by hcfullpipeline after task completions, file integrations,
# and config updates. Also runs via cron every 5 minutes.
#
# Usage:
#   ./scripts/auto-commit-push.sh [commit-message]
#   ./scripts/auto-commit-push.sh  # uses auto-generated message
#
# Cron: */5 * * * * /home/headyme/Heady/scripts/auto-commit-push.sh

set -euo pipefail

# ─── Cron-safe environment ────────────────────────────────────────
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin:$PATH"
export HOME="${HOME:-/home/headyme}"
export GIT_SSH_COMMAND="ssh -o BatchMode=yes -o StrictHostKeyChecking=no"

REPO_DIR="${HEADY_REPO_DIR:-/home/headyme/Heady}"
REMOTES="${HEADY_REMOTES:-heady-testing staging production}"
BRANCH="${HEADY_BRANCH:-main}"
PIPELINE_FILE="configs/hcfullpipeline.yaml"
LOG_DIR="$REPO_DIR/logs"
LOG_FILE="$LOG_DIR/auto-commit.log"
LOCK_FILE="/tmp/heady-auto-commit.lock"

# ─── Ensure log dir exists ────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ─── Logging helper ───────────────────────────────────────────────
log() {
  local ts
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "[$ts] $*" | tee -a "$LOG_FILE"
}

# ─── Lock to prevent concurrent runs ──────────────────────────────
if [ -f "$LOCK_FILE" ]; then
  lock_age=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)))
  if [ "$lock_age" -lt 300 ]; then
    log "SKIP — another auto-commit is running (lock age: ${lock_age}s)"
    exit 0
  else
    log "WARN — stale lock (${lock_age}s old), removing"
    rm -f "$LOCK_FILE"
  fi
fi
trap 'rm -f "$LOCK_FILE"' EXIT
echo $$ > "$LOCK_FILE"

cd "$REPO_DIR"

# ─── Ensure git identity for cron ─────────────────────────────────
git config user.name "HeadyAutoCommit" 2>/dev/null || true
git config user.email "auto@headysystems.com" 2>/dev/null || true

# ─── Count changes ────────────────────────────────────────────────
untracked=$(git ls-files --others --exclude-standard | wc -l)
modified=$(git diff --name-only | wc -l)
staged=$(git diff --cached --name-only | wc -l)
total=$((untracked + modified + staged))

if [ "$total" -eq 0 ]; then
  log "HEARTBEAT — working tree clean, nothing to commit"
  exit 0
fi

# ─── Build commit message ────────────────────────────────────────
if [ $# -gt 0 ]; then
  MSG="$*"
else
  PIPELINE_VER=$(grep 'version:' "$PIPELINE_FILE" 2>/dev/null | tail -1 | sed 's/.*version: *"\(.*\)"/\1/' || echo "unknown")
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  MSG="feat: HCFullPipeline v${PIPELINE_VER} auto-commit — ${total} files (${untracked} new, ${modified} modified) [${TIMESTAMP}]"
fi

log "═══════════════════════════════════════════════════════"
log "  HEADY AUTO-COMMIT-PUSH"
log "  Files: ${total} (${untracked} new, ${modified} modified, ${staged} staged)"
log "  Message: ${MSG}"
log "═══════════════════════════════════════════════════════"

# ─── Stage all ────────────────────────────────────────────────────
git add -A
log "✓ Staged all changes"

# ─── Commit ───────────────────────────────────────────────────────
git commit -m "$MSG" --no-verify
log "✓ Committed"

# ─── Push to all remotes ──────────────────────────────────────────
push_ok=0
push_fail=0
for remote in $REMOTES; do
  log "  Pushing to ${remote}/${BRANCH}..."
  if git push "$remote" "$BRANCH" 2>>"$LOG_FILE"; then
    log "  ✓ ${remote}"
    push_ok=$((push_ok + 1))
  else
    # Pull-merge on reject, then retry
    log "  ↓ Pulling ${remote} first..."
    git config pull.rebase false 2>/dev/null
    if git pull "$remote" "$BRANCH" --no-edit 2>>"$LOG_FILE"; then
      # Auto-resolve any conflicts by accepting both
      conflicted=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
      if [ -n "$conflicted" ]; then
        for cf in $conflicted; do
          sed -i '/^<<<<<<< HEAD$/d; /^=======$/d; /^>>>>>>> /d' "$cf"
          git add "$cf"
        done
        git commit --no-edit --no-verify 2>/dev/null || true
        log "  ✓ Auto-resolved merge conflicts"
      fi
      if git push "$remote" "$BRANCH" 2>>"$LOG_FILE"; then
        log "  ✓ ${remote} (after merge)"
        push_ok=$((push_ok + 1))
      else
        log "  ✗ ${remote} FAILED after merge"
        push_fail=$((push_fail + 1))
      fi
    else
      log "  ✗ ${remote} pull FAILED"
      push_fail=$((push_fail + 1))
    fi
  fi
done

log "═══════════════════════════════════════════════════════"
log "  ✓ AUTO-COMMIT-PUSH COMPLETE — ${push_ok} ok, ${push_fail} failed"
log "═══════════════════════════════════════════════════════"

# ─── Trim log to last 1000 lines ──────────────────────────────────
if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt 1000 ]; then
  tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
