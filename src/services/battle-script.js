#!/usr/bin/env node
/*
 * © 2026 Heady™Systems Inc..
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ heady battle — 10-Model Arena Dispatcher ═══
 *
 * Usage:
 *   npm run battle               # Start battle, create repos, dispatch all
 *   npm run battle -- --status   # Check battle status
 *   npm run battle -- --blueprint # Export blueprint JSON
 *   npm run battle -- --repos    # List repo manifest
 *
 * This script:
 *   1. Generates the comprehensive project blueprint
 *   2. Creates 9 private GitHub repos (one per contender)
 *   3. Seeds each repo with a README + context package optimized for that model
 *   4. Dispatches rebuild instructions to each model's API
 *   5. Monitors progress and collects results
 */

'use strict';
const logger = require('../shared/logger')('battle-script');

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const arena = require('../src/services/battle-arena');

const args = process.argv.slice(2);
const ROOT = path.resolve(__dirname, '..');

// ── Helpers ────────────────────────────────────────────────────
function run(cmd, opts = {}) {
    try {
        return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
    } catch (err) {
        if (opts.allowFail) return err.stderr || err.message;
        logger.error(`  ❌ ${cmd}\n     ${err.message}`);
        return null;
    }
}

// ── Commands ───────────────────────────────────────────────────

if (args.includes('--status')) {
    const status = arena.getStatus();
    logger.info(JSON.stringify(status, null, 2));
    process.exit(0);
}

if (args.includes('--blueprint')) {
    const bp = arena.generateBlueprint();
    const outPath = path.join(ROOT, 'configs', 'battle-blueprint.json');
    fs.writeFileSync(outPath, JSON.stringify(bp, null, 2));
    logger.info(`Blueprint exported to: ${outPath}`);
    logger.info(`Modules: ${Object.keys(bp.coreModules).length}`);
    logger.info(`Patterns: ${bp.patterns.length}`);
    logger.info(`Dependencies: ${bp.dependencies.production.length}`);
    process.exit(0);
}

if (args.includes('--repos')) {
    const repos = arena.getRepoManifest();
    logger.info('\n══ Battle Arena — Repo Manifest ══\n');
    repos.forEach((r, i) => {
        logger.info(`  ${i + 1}. ${r.repoName}`);
        logger.info(`     Model:    ${r.model}`);
        logger.info(`     Provider: ${r.provider}`);
        logger.info(`     Private:  ${r.isPrivate}`);
        logger.info('');
    });
    logger.info(`Total repos: ${repos.length}`);
    process.exit(0);
}

// ── Main Battle Dispatch ───────────────────────────────────────
async function main() {
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('  ⚔️  HEADY BATTLE ARENA — 10-Model Full Project Rebuild');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');

    // Start battle session
    const state = arena.startBattle();
    logger.info(`  Session: ${state.sessionId}`);
    logger.info(`  Contenders: ${state.contenders.length}`);
    logger.info('');

    // Export blueprint
    const bp = state.blueprint;
    const bpPath = path.join(ROOT, 'configs', 'battle-blueprint.json');
    fs.mkdirSync(path.dirname(bpPath), { recursive: true });
    fs.writeFileSync(bpPath, JSON.stringify(bp, null, 2));
    logger.info(`  📋 Blueprint exported (${Object.keys(bp.coreModules).length} modules, ${bp.patterns.length} patterns)`);
    logger.info('');

    // List contenders
    logger.info('  ── Contenders ──────────────────────────────────────');
    const contenders = arena.CONTENDERS;
    contenders.forEach((c, i) => {
        const icon = c.status === 'JUDGE' ? '👨‍⚖️' : '🤖';
        logger.info(`  ${icon} ${i + 1}. ${c.name.padEnd(16)} ${c.model.padEnd(30)} ${c.strength.slice(0, 50)}`);
    });
    logger.info('');

    // Create repos via GitHub CLI (if available)
    const ghAvailable = run('gh --version', { allowFail: true });
    const useGH = ghAvailable && !ghAvailable.includes('not found');

    if (useGH) {
        logger.info('  ── Creating GitHub Repos ────────────────────────────');
        const repos = arena.getRepoManifest();
        for (const repo of repos) {
            logger.info(`  📦 Creating HeadyMe/${repo.repoName}...`);
            run(`gh repo create HeadyMe/${repo.repoName} --private --description "${repo.description}" 2>/dev/null`, { allowFail: true });

            // Seed repo with context-optimized README
            const ctx = arena.getContextForModel(contenders.find(c => c.repoName === repo.repoName)?.id);
            if (ctx) {
                const readmeContent = `# ${repo.repoName}\n\n` +
                    `> Heady™ rebuild by **${repo.contender}** (${repo.model})\n\n` +
                    `## Battle Arena Session\n\n` +
                    `This repo is part of the 10-Model Battle Arena — a competitive evaluation where each AI model rebuilds the Heady™ Latent OS from scratch.\n\n` +
                    `## Context\n\n\`\`\`json\n${JSON.stringify(bp.project, null, 2)}\n\`\`\`\n\n` +
                    `## Modules to Implement\n\n${Object.entries(bp.coreModules).map(([k, v]) => `- **${k}**: ${v}`).join('\n')}\n\n` +
                    `## Model-Specific Focus\n\n${ctx.content.split('\n').slice(-1)[0]}\n`;

                const tmpFile = `/tmp/battle-readme-${repo.repoName}.md`;
                fs.writeFileSync(tmpFile, readmeContent);
                // Push README via gh CLI
                run(`cd /tmp && git clone https://github.com/HeadyMe/${repo.repoName}.git battle-${repo.repoName} 2>/dev/null && ` +
                    `cp ${tmpFile} battle-${repo.repoName}/README.md && ` +
                    `cd battle-${repo.repoName} && git add . && git commit -m "🐝 Battle Arena: initial context for ${repo.contender}" && git push 2>/dev/null`, { allowFail: true });
            }
            arena.markDispatched(contenders.find(c => c.repoName === repo.repoName)?.id);
        }
        logger.info('');
    } else {
        logger.info('  ⚠️  GitHub CLI (gh) not available — repos need manual creation');
        logger.info('     Install: https://cli.github.com/');
        logger.info('     Or create repos manually from the manifest:');
        logger.info(`     Run: npm run battle -- --repos`);
        logger.info('');
    }

    // Export per-model context packages
    logger.info('  ── Model Context Packages ──────────────────────────');
    const ctxDir = path.join(ROOT, 'configs', 'battle-contexts');
    fs.mkdirSync(ctxDir, { recursive: true });
    for (const c of contenders) {
        const ctx = arena.getContextForModel(c.id);
        if (ctx) {
            const ctxFile = path.join(ctxDir, `${c.id}-context.json`);
            fs.writeFileSync(ctxFile, JSON.stringify(ctx, null, 2));
            logger.info(`  📄 ${c.name.padEnd(16)} → ${c.id}-context.json`);
        }
    }
    logger.info('');

    // Summary
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('  ⚔️  BATTLE ARENA READY');
    logger.info('');
    logger.info('  Next steps:');
    logger.info('     1. Create repos:  gh repo create HeadyMe/<repo-name> --private');
    logger.info('     2. Dispatch each model with its context from configs/battle-contexts/');
    logger.info('     3. For Jules:  Open GitHub Issues with the blueprint as the task');
    logger.info('     4. For Codex:  Use OpenAI Codex API with the context package');
    logger.info('     5. For Claude: Use HeadyJules think mode with full blueprint');
    logger.info('     6. For GPT-5.4: Use HeadyCompute with latest model');
    logger.info('     7. For Gemini: Use HeadyPythia with full context window');
    logger.info('     8. For Groq:  Use HeadyFast for rapid iteration');
    logger.info('     9. For Perplexity: Use HeadyResearch for best-practice sourcing');
    logger.info('    10. For HF:    Use HuggingFace Inference API with open models');
    logger.info('');
    logger.info('  Monitor: npm run battle -- --status');
    logger.info('  APIs:    GET /api/battle/status');
    logger.info('           GET /api/battle/contenders');
    logger.info('           GET /api/battle/blueprint');
    logger.info('           GET /api/battle/context/:id');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');
}

main().catch(err => {
    logger.error('Battle dispatch failed:', err.message);
    process.exit(1);
});
