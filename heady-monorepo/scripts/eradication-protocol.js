/**
 * Eradication Protocol
 * Prunes stale files and vectors from the monorepo before public projection.
 * © 2026 Heady™Systems Inc.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Patterns for files that should be excluded from public projections
const STALE_PATTERNS = [
    /\.heady-cache$/,
    /\.tmp$/,
    /~$/,
    /\.DS_Store$/,
    /Thumbs\.db$/,
];

const PROTECTED_DIRS = new Set([
    'node_modules',
    '.git',
    '.env',
]);

/**
 * Execute the eradication protocol — scan for and clean up stale artifacts.
 * @param {object} opts
 * @param {boolean} [opts.dryRun=false] - Preview without deleting
 * @param {string} [opts.root] - Root directory to scan (default: monorepo root)
 * @returns {Promise<{ok: boolean, erased: string[], skipped: string[], ts: string}>}
 */
async function executeEradicationProtocol(opts = {}) {
    const { dryRun = false, root = ROOT } = opts;
    const erased = [];
    const skipped = [];

    function scan(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir);
        } catch (_e) {
            return;
        }

        for (const entry of entries) {
            if (PROTECTED_DIRS.has(entry)) continue;

            const fullPath = path.join(dir, entry);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch (_e) {
                continue;
            }

            if (stat.isDirectory()) {
                scan(fullPath);
            } else if (STALE_PATTERNS.some((p) => p.test(entry))) {
                const rel = fullPath.replace(root + '/', '');
                if (dryRun) {
                    skipped.push(rel);
                } else {
                    try {
                        fs.unlinkSync(fullPath);
                        erased.push(rel);
                    } catch (e) {
                        skipped.push(rel + ' (error: ' + e.message + ')');
                    }
                }
            }
        }
    }

    scan(root);

    return {
        ok: true,
        erased,
        skipped,
        dryRun,
        ts: new Date().toISOString(),
        summary: `Erased ${erased.length} stale artifact(s)${dryRun ? ' (dry run)' : ''}`,
    };
}

module.exports = { executeEradicationProtocol };
