#!/usr/bin/env node
'use strict';
/**
 * ─── Heady™ Vault Embed ─────────────────────────────────────────
 * Parse .heady/.shit → SecureKeyVault
 *
 * Reads the mixed-format secrets dump and stores each credential
 * into HeadyVault with proper domain tagging and metadata.
 *
 * Usage:  node scripts/vault-embed.js [--passphrase <secret>]
 * ────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');
const { vault, DOMAINS } = require('../src/services/secure-key-vault');

// ── Config ──────────────────────────────────────────────────────
const SECRETS_FILE = path.resolve(__dirname, '..', '.heady', '.shit');
const PASSPHRASE = process.argv.includes('--passphrase')
    ? process.argv[process.argv.indexOf('--passphrase') + 1]
    : process.env.HEADY_VAULT_PASSPHRASE || 'heady-vault-master-2026';

// ── Parse Helpers ───────────────────────────────────────────────

/** Extract all top-level JSON objects from a mixed-format string. */
function extractJSON(raw) {
    const objects = [];
    let depth = 0, start = null;
    for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '{') { if (depth === 0) start = i; depth++; }
        if (raw[i] === '}') {
            depth--;
            if (depth === 0 && start !== null) {
                try { objects.push(JSON.parse(raw.slice(start, i + 1))); }
                catch { /* malformed, skip */ }
                start = null;
            }
        }
    }
    return objects;
}

/** Extract KEY=VALUE pairs from a string. */
function extractEnvVars(raw) {
    const pairs = {};
    const re = /^([A-Z][A-Z0-9_]+)=(.+)$/gm;
    let m;
    while ((m = re.exec(raw)) !== null) {
        pairs[m[1]] = m[2].trim();
    }
    return pairs;
}

/** Extract bare tokens (lines that are just a token with no key= prefix). */
function extractBareTokens(raw) {
    const tokens = [];
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        // Skip empty, comments, KEY=VALUE, JSON, npmjs label
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('{') ||
            trimmed.startsWith('}') || trimmed.includes('=') || trimmed === 'npmjs') continue;
        // Token-like: long alphanumeric/dash/underscore string
        if (trimmed.length > 20 && /^[A-Za-z0-9_\-]+$/.test(trimmed)) {
            tokens.push(trimmed);
        }
    }
    return tokens;
}

// ── Domain Mapping ──────────────────────────────────────────────
const ENV_DOMAIN_MAP = {
    CLAUDE_API_KEY: { domain: 'anthropic', label: 'Claude API Key' },
    CLAUDE_CODE_OAUTH_TOKEN: { domain: 'anthropic', label: 'Claude Code OAuth Token' },
    ANTHROPIC_ADMIN_KEY: { domain: 'anthropic', label: 'Anthropic Admin Key' },
    ANTHROPIC_ORG_ID: { domain: 'anthropic', label: 'Anthropic Org ID' },
    ANTHROPIC_API_KEY: { domain: 'anthropic', label: 'Anthropic API Key' },
    CLAUDE_DEV_ADMIN_KEY: { domain: 'anthropic', label: 'Claude Dev Admin Key' },
    OPENAI_API_KEY: { domain: 'openai', label: 'OpenAI Service Account Key' },
    GEMINI_API_KEY: { domain: 'gcloud', label: 'Gemini API Key (primary)' },
    GEMINI_API_KEY_HEADY: { domain: 'gcloud', label: 'Gemini API Key (heady)' },
    GOOGLE_API_KEY: { domain: 'gcloud', label: 'Google API Key (primary)' },
    GOOGLE_API_KEY_SECONDARY: { domain: 'gcloud', label: 'Google API Key (secondary)' },
    GCLOUD_API_KEY: { domain: 'gcloud', label: 'GCloud API Key' },
    GOOGLE_CLOUD_API_KEY: { domain: 'gcloud', label: 'Google Cloud API Key' },
    FIREBASE_API_KEY: { domain: 'firebase', label: 'Firebase API Key' },
    PINECONE_API_KEY: { domain: 'supabase', label: 'Pinecone Vector DB Key' }, // closest domain
    STRIPE_SECRET_KEY: { domain: 'stripe', label: 'Stripe Live Secret Key' },
    OP_SERVICE_ACCOUNT_TOKEN: { domain: 'domain', label: '1Password Service Account' },
};

// ── Main ────────────────────────────────────────────────────────
async function main() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  Heady™ Vault Embed — .heady/.shit → SecureKeyVault ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // 1) Read raw secrets file
    if (!fs.existsSync(SECRETS_FILE)) {
        console.error(`✗ Secrets file not found: ${SECRETS_FILE}`);
        process.exit(1);
    }
    const raw = fs.readFileSync(SECRETS_FILE, 'utf8');
    console.log(`  ✓ Read ${SECRETS_FILE} (${raw.length} bytes)\n`);

    // 2) Unlock vault
    await vault.unlock(PASSPHRASE);
    console.log('  ✓ Vault unlocked\n');

    let stored = 0;
    let skipped = 0;

    // 3) Parse and store GCP service accounts
    const jsonCreds = extractJSON(raw);
    const seen = new Set();
    console.log(`── GCP Service Accounts (${jsonCreds.length} found) ──`);
    for (const cred of jsonCreds) {
        if (cred.type !== 'service_account') continue;
        const email = cred.client_email || 'unknown';
        const name = email.split('@')[0]; // e.g. heady-deployer, headyhc, headyio
        const key = `${name}::${cred.private_key_id}`;
        if (seen.has(key)) {
            console.log(`  ⊘ ${name} (duplicate key_id, skipped)`);
            skipped++;
            continue;
        }
        seen.add(key);
        await vault.store(
            `gcp-sa-${name}`,
            'gcloud',
            JSON.stringify(cred),
            {
                label: `GCP SA: ${email}`,
                project: cred.project_id,
                keyId: cred.private_key_id,
                format: 'service-account-json',
            }
        );
        console.log(`  ✓ gcp-sa-${name} → gcloud (project: ${cred.project_id})`);
        stored++;
    }

    // 4) Parse and store env-style API keys
    const envVars = extractEnvVars(raw);
    console.log(`\n── API Keys & Tokens (${Object.keys(envVars).length} found) ──`);
    for (const [key, value] of Object.entries(envVars)) {
        const mapping = ENV_DOMAIN_MAP[key];
        if (!mapping) {
            console.log(`  ? ${key} (no domain mapping, storing as 'domain')`);
            await vault.store(key.toLowerCase(), 'domain', value, { label: key, format: 'env-var' });
            stored++;
            continue;
        }
        await vault.store(
            key.toLowerCase().replace(/_/g, '-'),
            mapping.domain,
            value,
            { label: mapping.label, format: 'env-var', envKey: key }
        );
        console.log(`  ✓ ${key.toLowerCase().replace(/_/g, '-')} → ${mapping.domain} (${mapping.label})`);
        stored++;
    }

    // 5) Parse bare tokens (e.g., npm, orphan OAuth tokens)
    const bareTokens = extractBareTokens(raw);
    console.log(`\n── Bare Tokens (${bareTokens.length} found) ──`);
    for (let i = 0; i < bareTokens.length; i++) {
        const token = bareTokens[i];
        let name, domain, label;
        if (token.startsWith('npm_')) {
            name = 'npm-publish-token'; domain = 'domain'; label = 'npm Registry Token';
        } else if (token.startsWith('sk-ant-')) {
            name = `anthropic-orphan-token-${i}`; domain = 'anthropic'; label = 'Anthropic Orphan Token';
        } else {
            name = `bare-token-${i}`; domain = 'domain'; label = `Untagged Token #${i}`;
        }
        await vault.store(name, domain, token, { label, format: 'bare-token' });
        console.log(`  ✓ ${name} → ${domain} (${label})`);
        stored++;
    }

    // 6) Store the npm token from .npmrc for completeness
    const npmrcPath = path.join(process.env.HOME || '/home/headyme', '.npmrc');
    if (fs.existsSync(npmrcPath)) {
        const npmrc = fs.readFileSync(npmrcPath, 'utf8');
        const match = npmrc.match(/:_authToken=(.+)/);
        if (match) {
            await vault.store('npm-registry-active', 'domain', match[1].trim(), {
                label: 'npm Active Registry Token (from ~/.npmrc)',
                format: 'env-var',
                source: '~/.npmrc',
            });
            console.log('  ✓ npm-registry-active → domain (from ~/.npmrc)');
            stored++;
        }
    }

    // 7) Summary
    console.log('\n══════════════════════════════════════════════════════');
    console.log(`  Stored: ${stored} credentials`);
    console.log(`  Skipped: ${skipped} duplicates`);
    console.log(`  Vault health: ${JSON.stringify(await vault.getHealth())}`);
    console.log('══════════════════════════════════════════════════════\n');

    // 8) Lock vault
    vault.lock();
    console.log('  ✓ Vault locked\n');
}

main().catch(err => {
    console.error('✗ Vault embed failed:', err.message);
    process.exit(1);
});
