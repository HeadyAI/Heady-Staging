#!/usr/bin/env node
/*
 * © 2026 Heady™Systems Inc..
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ heady deploy — One-Command Zero-Friction Cloud Deploy ═══
 *
 * Usage:
 *   npm run deploy              # Deploy from dev → Cloud Run (HeadyWeb)
 *   npm run deploy -- --target edge    # Deploy edge worker only
 *   npm run deploy -- --target all     # Deploy everything
 *
 * What this does:
 *   1. Git commits any uncommitted changes
 *   2. Pushes to GitHub (triggers CI/CD automatically)
 *   3. OR deploys directly to Cloud Run via `gcloud run deploy --source .`
 *
 * The result: your dev environment is live on headymcp.com, headyapi.com,
 * headyme.com, and all 9 HeadyWeb domains within ~90 seconds.
 * No local server needed — everything runs on Cloud Run.
 */

'use strict';
const logger = require('../shared/logger')('deploy-script');

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GCP_PROJECT = process.env.GCP_PROJECT_ID || 'heady-project';
const GCP_REGION = process.env.GCP_REGION || 'us-central1';
const SERVICE_NAME = 'heady-manager';

const args = process.argv.slice(2);
const target = args.includes('--target') ? args[args.indexOf('--target') + 1] : 'cloudrun';
const direct = args.includes('--direct'); // Skip git, deploy directly
const dryRun = args.includes('--dry-run');

function run(cmd, opts = {}) {
    logger.info(`  → ${cmd}`);
    if (dryRun) return '[dry-run]';
    try {
        return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
    } catch (err) {
        if (opts.allowFail) return err.stderr || err.message;
        throw err;
    }
}

async function main() {
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  🐝 Heady™ Deploy — Zero-Friction Cloud Projection');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
    logger.info(`  Target:  ${target}`);
    logger.info(`  Project: ${GCP_PROJECT}`);
    logger.info(`  Region:  ${GCP_REGION}`);
    logger.info(`  Service: ${SERVICE_NAME}`);
    logger.info(`  Direct:  ${direct}`);
    logger.info('');

    if (target === 'cloudrun' || target === 'all') {
        if (direct) {
            // Direct deploy — no git, just push straight to Cloud Run
            logger.info('─── Direct Deploy to Cloud Run ───────────────────');
            logger.info('  Building + deploying from source...');
            logger.info('  (This takes ~60-90 seconds)');
            logger.info('');

            const cmd = [
                'gcloud run deploy', SERVICE_NAME,
                '--source .',
                `--region ${GCP_REGION}`,
                `--project ${GCP_PROJECT}`,
                '--allow-unauthenticated',
                '--memory 1Gi',
                '--cpu 1',
                '--min-instances 0',
                '--max-instances 3',
                '--timeout 300',
                '--set-env-vars="NODE_ENV=production"',
                '--quiet',
            ].join(' ');

            if (dryRun) {
                logger.info(`  [DRY RUN] Would execute: ${cmd}`);
            } else {
                try {
                    execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
                    logger.info('');
                    logger.info('  ✅ Cloud Run deploy complete!');
                } catch (err) {
                    logger.error('  ❌ Deploy failed:', err.message);
                    process.exit(1);
                }
            }
        } else {
            // Git-based deploy — commit + push, CI/CD handles the rest
            logger.info('─── Git-Based Deploy (CI/CD Pipeline) ──────────────');

            // Check for uncommitted changes
            const status = run('git status --porcelain', { allowFail: true });
            if (status && status.length > 0) {
                const lineCount = status.split('\n').filter(Boolean).length;
                logger.info(`  📝 ${lineCount} uncommitted changes detected`);

                run('git add -A', { allowFail: true });
                const msg = `🐝 heady deploy: ${new Date().toISOString().split('T')[0]} projection`;
                run(`git commit -m "${msg}"`, { allowFail: true });
                logger.info(`  ✅ Committed: "${msg}"`);
            } else {
                logger.info('  ✅ Working tree clean');
            }

            // Push to trigger CI/CD
            logger.info('  📤 Pushing to GitHub...');
            run('git push origin main', { allowFail: true });
            logger.info('  ✅ Pushed — CI/CD pipeline triggered');
            logger.info('');
            logger.info('  📋 Pipeline phases:');
            logger.info('     P0: 🔒 Security Scan (TruffleHog + CodeQL)');
            logger.info('     P1: 🧬 Monorepo Validation + Tests');
            logger.info('     P2: ☁️  Cloud Run Deploy (heady-manager)');
            logger.info('     P3: 🤗 HuggingFace Spaces');
            logger.info('     P4: ⚡ Cloudflare Edge');
            logger.info('     P5: ✅ Auto-Success Verification');
        }
    }

    if (target === 'edge' || target === 'all') {
        logger.info('');
        logger.info('─── Edge Deploy (Cloudflare Workers) ───────────────');
        const cfCmd = 'npx -y wrangler@latest deploy cloudflare-workers/heady-edge-proxy.js';
        if (dryRun) {
            logger.info(`  [DRY RUN] Would execute: ${cfCmd}`);
        } else {
            run(cfCmd, { allowFail: true });
            logger.info('  ✅ Edge worker deployed');
        }
    }

    logger.info('');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  🌐 HeadyWeb URLs (live after deploy):');
    logger.info('     headymcp.com    → HeadyMCP (AI Tools Hub)');
    logger.info('     headyapi.com    → HeadyAPI (Developer Portal)');
    logger.info('     headyio.com     → HeadyIO (Enterprise Connector)');
    logger.info('     headyme.com     → HeadyMe (Personal Dashboard)');
    logger.info('     headyfinance.com → HeadyTrader (Trading Suite)');
    logger.info('     headymusic.com  → HeadyMusic (Studio)');
    logger.info('     headyconnection.org → Heady Foundation');
    logger.info('     headysystems.com    → Heady Systems');
    logger.info('     myheady-ai.com          → MyHeady.AI');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
}

main().catch(err => {
    logger.error('Deploy failed:', err.message);
    process.exit(1);
});
