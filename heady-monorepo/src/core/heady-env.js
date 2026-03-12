/**
 * ∞ Heady™ Env — .env File Loader
 * © 2026 Heady™Systems Inc. — PROPRIETARY AND CONFIDENTIAL
 *
 * dotenv wrapper with multi-file support.
 * Load order (each file can override the previous):
 *   1. .env              — base defaults
 *   2. .env.local        — local developer overrides (never committed)
 *   3. .env.production   — production-only vars (CI/CD injects)
 *   4. .env.{NODE_ENV}   — environment-specific overrides
 *
 * Usage:
 *   require('./src/core/heady-env').loadEnv();
 *   // or as dotenv compat:
 *   require('./src/core/heady-env').config();
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Parse a .env file into key/value pairs ────────────────────────────────
function parseEnvFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return {};
        const content = fs.readFileSync(filePath, 'utf8');
        const result = {};
        const lines = content.split('\n');

        for (const rawLine of lines) {
            const line = rawLine.trim();
            // Skip empty lines and comments
            if (!line || line.startsWith('#')) continue;

            // Find the first '=' sign
            const eqIdx = line.indexOf('=');
            if (eqIdx === -1) continue;

            const key = line.slice(0, eqIdx).trim();
            if (!key) continue;

            let value = line.slice(eqIdx + 1).trim();

            // Strip surrounding quotes (single or double)
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
                // Unescape newlines in double-quoted strings
                if (rawLine.includes('"')) {
                    value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                }
            }

            result[key] = value;
        }

        return result;
    } catch {
        return {};
    }
}

// ─── Apply env vars (only if not already set by process environment) ─────────
function applyEnv(vars, override = false) {
    for (const [key, value] of Object.entries(vars)) {
        if (override || process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

// ─── Load env files in priority order ─────────────────────────────────────
function loadEnv(opts = {}) {
    const rootDir = opts.cwd || process.cwd();
    const nodeEnv = process.env.NODE_ENV || 'development';
    const silent = opts.silent !== false;

    // Files loaded in order — later files take priority
    const filesToLoad = [
        path.join(rootDir, '.env'),
        path.join(rootDir, `.env.${nodeEnv}`),
        path.join(rootDir, '.env.local'),
    ];

    // In production, also load .env.production (non-overrideable base)
    if (nodeEnv === 'production') {
        filesToLoad.splice(1, 0, path.join(rootDir, '.env.production'));
    }

    let loadedCount = 0;
    let totalVars = 0;

    for (const filePath of filesToLoad) {
        const vars = parseEnvFile(filePath);
        const count = Object.keys(vars).length;
        if (count > 0) {
            applyEnv(vars, opts.override || false);
            loadedCount++;
            totalVars += count;
            if (!silent) {
                console.log(`[heady-env] Loaded ${count} vars from ${path.basename(filePath)}`);
            }
        }
    }

    return { loadedCount, totalVars };
}

// ─── dotenv-compatible config() ────────────────────────────────────────────
function config(opts = {}) {
    const result = loadEnv(opts);
    return { parsed: result };
}

// ─── Get a required env var (throws if missing) ────────────────────────────
function requireVar(key, description) {
    const val = process.env[key];
    if (val === undefined || val === '') {
        throw new Error(`[heady-env] Missing required environment variable: ${key}${description ? ` (${description})` : ''}`);
    }
    return val;
}

// ─── Get an optional env var with fallback ─────────────────────────────────
function optionalVar(key, fallback = undefined) {
    const val = process.env[key];
    return (val === undefined || val === '') ? fallback : val;
}

// ─── Set an env var programmatically ──────────────────────────────────────
function setVar(key, value) {
    process.env[key] = String(value);
}

// ─── Check if running in production ────────────────────────────────────────
function isProduction() {
    return process.env.NODE_ENV === 'production';
}

// ─── Check if running in development ───────────────────────────────────────
function isDevelopment() {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

module.exports = {
    loadEnv,
    config,
    parseEnvFile,
    applyEnv,
    requireVar,
    optionalVar,
    setVar,
    isProduction,
    isDevelopment,
};
