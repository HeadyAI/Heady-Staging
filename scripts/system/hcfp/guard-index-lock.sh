#!/bin/bash
# © 2026 Heady Systems LLC.
# Guard Index Lock — Remove stale .git/index.lock
# Runs every 5 minutes via crontab

REPO="/home/headyme/Heady"
LOG="$REPO/logs/guard-index.log"

cd "$REPO" || exit 1

if [ -f .git/index.lock ]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -c %Y .git/index.lock 2>/dev/null || echo 0) ))
    if [ "$LOCK_AGE" -gt 120 ]; then
        echo "[$(date)] Removing stale .git/index.lock (age: ${LOCK_AGE}s)" >> "$LOG"
        rm -f .git/index.lock
    fi
fi
