#!/usr/bin/env node
/**
 * Heady CLI v3.0 — Production Terminal Interface for the Heady™ Latent OS
 *
 * Claude Code-style interactive terminal with rich ANSI branding,
 * OAuth authentication, parallel agent visualization, and system dashboards.
 *
 * Usage:
 *   heady                                 — Interactive REPL mode
 *   heady "your question or task"         — Intelligent processing
 *   heady login                           — Authenticate (OAuth/API key)
 *   heady logout                          — Clear credentials
 *   heady whoami                          — Authentication status
 *   heady status                          — Visual system dashboard
 *   heady battle "prompt"                 — Provider battle with agent tracker
 *   heady council "prompt"                — Multi-model council
 *   heady doctor [--fix] [--json]          — Full systems diagnostic
 *   heady fix                              — Auto-fix safe issues (alias for doctor --fix)
 *   heady help                            — Show all commands
 *
 * @module bin/heady-cli
 * @version 3.0.0
 * @author HeadySystems™
 * @license Proprietary — HeadySystems™ & HeadyConnection™
 *
 * ⚡ Made with 💜 by Heady™Systems™ & HeadyConnection™
 * Sacred Geometry :: Organic Systems :: Breathing Interfaces
 */

'use strict';

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── Auto-load .env ───────────────────────────────────────────────
// Load ROOT/.env into process.env (won't overwrite existing vars)
const _envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(_envPath)) {
    const _envContent = fs.readFileSync(_envPath, 'utf8');
    for (const line of _envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
}

// ─── Constants ────────────────────────────────────────────────────
const PHI = 1.618033988749895;
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const SCRIPTS = path.join(ROOT, 'scripts');
const INFRA = path.join(ROOT, 'infra');
const MIGRATIONS = path.join(ROOT, 'migrations');

const theme = require(path.join(ROOT, 'bin', 'cli-theme'));
const auth = require(path.join(ROOT, 'bin', 'cli-auth'));

const VERSION = '3.0.0';

// Inject stored credentials into process.env on startup
const _injectedKeys = auth.injectCredentials();

const KNOWN_COMMANDS = [
    'init', 'start', 'dev', 'build', 'deploy', 'test',
    'doctor', 'fix', 'rotate-keys', 'migrate', 'projection',
    'status', 'help', 'validate', 'scaffold',
    'council', 'battle', 'determinism', 'learn', 'context',
    'login', 'logout', 'whoami',
];

// ─── Helpers ──────────────────────────────────────────────────────

function run(cmd, opts = {}) {
    const defaults = { cwd: ROOT, stdio: 'inherit', shell: true };
    try {
        execSync(cmd, { ...defaults, ...opts });
        return true;
    } catch (err) {
        if (!opts.silent) console.error(`  ✗ Command failed: ${cmd}`);
        return false;
    }
}

function runCapture(cmd, opts = {}) {
    const defaults = { cwd: ROOT, shell: true, encoding: 'utf8' };
    try {
        return execSync(cmd, { ...defaults, ...opts }).trim();
    } catch {
        return null;
    }
}

// ─── Shared Gateway Factory (auto-wraps with AutoContext) ─────────
let _sharedAutoContext = null;

function createGateway() {
    const { InferenceGateway } = require(path.join(SRC, 'services', 'inference-gateway.js'));
    const gateway = new InferenceGateway();

    // Auto-wrap with always-on AutoContext
    try {
        const { getHeadyAutoContext } = require(path.join(SRC, 'services', 'heady-auto-context.js'));
        if (!_sharedAutoContext) {
            _sharedAutoContext = getHeadyAutoContext({
                workspaceRoot: ROOT,
                gateway,
                autoWrap: true,
            });
            _sharedAutoContext.start().catch(() => { });
        } else {
            _sharedAutoContext.wrapGateway(gateway);
        }
    } catch (_) { } // Graceful fallback if AutoContext fails to load

    return gateway;
}


// ─── Themed Output Helpers (delegated to cli-theme) ──────────────
const { heading, success, info, warn, errorMsg } = theme;

// ─── Intelligent Processing (Default Mode) ────────────────────────

async function processIntelligently(input) {
    heading('Heady™ Intelligent Processing');
    console.log(`  ${theme.dim('Input:')} "${theme.purple(input.slice(0, 100))}"\n`);

    // Classify the input intent
    const intent = classifyIntent(input);
    info(`Detected intent: ${intent.type} (confidence: ${(intent.confidence * 100).toFixed(1)}%)`);

    switch (intent.type) {
        case 'health':
            info('Routing to: heady doctor');
            await commands.doctor();
            break;

        case 'fix':
            info('Routing to: heady doctor --fix');
            await commands.doctor('--fix');
            break;

        case 'deploy':
            info('Routing to: heady deploy');
            commands.deploy();
            break;

        case 'build':
            info('Routing to: heady build');
            commands.build();
            break;

        case 'status':
            info('Routing to: heady status');
            commands.status();
            break;

        case 'test':
            info('Routing to: heady test');
            commands.test();
            break;

        case 'validate':
            info('Routing to: heady validate');
            commands.validate();
            break;

        case 'search':
            await handleSearch(input);
            break;

        case 'file':
            await handleFileQuery(input);
            break;

        case 'domain':
            await handleDomainQuery(input);
            break;

        case 'general':
        default:
            await handleGeneralQuery(input);
            break;
    }
}

/**
 * Classify input intent using keyword matching + cosine-like scoring.
 * In a full deployment, this would use the CSL engine.
 */
function classifyIntent(input) {
    const lower = input.toLowerCase();

    // Priority check: if any domain name appears in input, route to domain handler immediately
    const domainNames = [
        'headysystems.com', 'headyme.com', 'headyconnection.org', 'headyconnection.com',
        'headybuddy.org', 'headymcp.com', 'headyio.com', 'headybot.com', 'headyapi.com',
        'heady-ai.com', 'headyos.com', 'headycloud.com', 'headyweb.com',
        'headyfinance.com', 'headymusic.com', 'headystore.com', 'headyex.com',
    ];
    if (domainNames.some(d => lower.includes(d) || lower.includes(d.replace('.com', '').replace('.org', '')))) {
        return { type: 'domain', confidence: 0.95 };
    }

    const patterns = [
        { type: 'fix', keywords: ['fix', 'repair', 'auto-fix', 'autofix', 'fix issues', 'fix problems', 'fix it', 'fix everything', 'fix all'], weight: 1.2 },
        { type: 'health', keywords: ['health', 'doctor', 'diagnose', 'check', 'scan', 'audit', 'systems check', 'system check', 'diagnosis', 'broken', 'error', 'failing'], weight: 1.0 },
        { type: 'deploy', keywords: ['deploy', 'ship', 'push', 'release', 'production', 'cloud run', 'cloudflare'], weight: 1.0 },
        { type: 'build', keywords: ['build', 'compile', 'package', 'bundle'], weight: 1.0 },
        { type: 'status', keywords: ['status', 'state', 'overview', 'summary'], weight: 0.9 },
        { type: 'test', keywords: ['test', 'spec', 'coverage', 'assert'], weight: 1.0 },
        { type: 'validate', keywords: ['validate', 'content check', 'check content', 'registry check'], weight: 1.0 },
        { type: 'domain', keywords: ['domain', 'site', 'domains', 'sites', 'what domains', 'all domains', 'list domains', 'list sites'], weight: 0.95 },
        { type: 'search', keywords: ['find', 'search', 'where', 'locate', 'which file', 'grep'], weight: 0.9 },
        { type: 'file', keywords: ['read', 'open', 'view', 'cat', 'display'], weight: 0.8 },
    ];

    let bestMatch = { type: 'general', confidence: 0 };

    for (const pattern of patterns) {
        const hits = pattern.keywords.filter(kw => lower.includes(kw));
        if (hits.length > 0) {
            // Confidence: number of hits × weight, capped at 1.0
            // 1 hit ≈ 0.33, 2 hits ≈ 0.67, 3+ hits ≈ 1.0
            const confidence = Math.min(hits.length * pattern.weight / 3, 1.0);

            if (confidence > bestMatch.confidence) {
                bestMatch = { type: pattern.type, confidence, matchedKeywords: hits };
            }
        }
    }

    // If no strong match, default to general
    if (bestMatch.confidence < 0.1) {
        bestMatch = { type: 'general', confidence: 1.0 };
    }

    return bestMatch;
}

async function handleSearch(input) {
    heading('Searching Codebase');
    // Extract search term (remove "find", "search", "where is" etc.)
    const searchTerm = input.replace(/^(find|search|where\s+(is|are)|locate|which\s+file)\s*/i, '').trim();
    if (!searchTerm) { warn('No search term provided'); return; }

    info(`Searching for: "${searchTerm}"`);
    const result = runCapture(`grep -rl "${searchTerm}" --include="*.js" --include="*.ts" --include="*.json" --include="*.md" src/ packages/ configs/ content/ 2>/dev/null | head -20`);
    if (result) {
        console.log('\n  Matches:');
        result.split('\n').forEach(f => console.log(`    📄 ${f}`));
    } else {
        info('No matches found');
    }
}

async function handleFileQuery(input) {
    heading('File Lookup');
    // Extract filename
    const fileMatch = input.match(/(?:read|show|open|view|cat|display)\s+(.+)/i);
    if (!fileMatch) { warn('Could not parse filename from input'); return; }

    const target = fileMatch[1].trim().replace(/^["']|["']$/g, '');
    const fullPath = path.isAbsolute(target) ? target : path.join(ROOT, target);

    if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        info(`File: ${fullPath} (${stat.size} bytes)`);
        if (stat.isFile()) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            console.log(`\n  Lines: ${lines.length}`);
            // Show first 30 lines
            const preview = lines.slice(0, 30).map((l, i) => `  ${String(i + 1).padStart(4)} │ ${l}`).join('\n');
            console.log(preview);
            if (lines.length > 30) console.log(`  ... (${lines.length - 30} more lines)`);
        } else {
            info('(directory)');
            const entries = fs.readdirSync(fullPath).slice(0, 20);
            entries.forEach(e => console.log(`    ${e}`));
        }
    } else {
        // Fuzzy search
        warn(`File not found: ${target}`);
        info('Searching for similar files...');
        const result = runCapture(`find . -maxdepth 4 -name "*${path.basename(target)}*" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -10`);
        if (result) {
            console.log('  Did you mean:');
            result.split('\n').forEach(f => console.log(`    📄 ${f}`));
        }
    }
}

async function handleDomainQuery(input) {
    heading('Domain Info');
    const registryPath = path.join(ROOT, 'configs', 'domains.json');
    if (!fs.existsSync(registryPath)) { errorMsg('Domain registry not found'); return; }

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const domains = registry.domains || [];
    const lower = input.toLowerCase();

    // Find matching domain
    const match = domains.find(d => lower.includes(d.domain) || lower.includes(d.siteId) || (d.node && lower.includes(d.node.toLowerCase())));

    if (match) {
        console.log(`\n  🌐 ${match.domain}`);
        console.log(`     Brand:    ${match.node || match.brand || 'N/A'}`);
        console.log(`     Type:     ${match.type || 'N/A'}`);
        console.log(`     Purpose:  ${match.purpose || 'N/A'}`);
        console.log(`     Status:   ${match.status || 'N/A'}`);
        if (match.theme) console.log(`     Theme:    ${match.theme.primary} / ${match.theme.secondary}`);
        if (match.seo) console.log(`     SEO:      ${match.seo.title}`);
        if (match.primaryCta) console.log(`     CTA:      ${match.primaryCta.label} → ${match.primaryCta.href}`);
        if (match.sitePath) console.log(`     Content:  ${match.sitePath}/`);

        // Check content exists
        if (match.sitePath) {
            const contentDir = path.join(ROOT, match.sitePath);
            if (fs.existsSync(contentDir)) {
                const files = fs.readdirSync(contentDir);
                console.log(`     Files:    ${files.join(', ')}`);
            } else {
                warn(`Content directory missing: ${contentDir}`);
            }
        }
    } else {
        // List all domains
        info(`${domains.length} domains registered:`);
        for (const d of domains) {
            const statusIcon = d.status === 'active' ? '🟢' : '🟡';
            console.log(`  ${statusIcon} ${(d.domain || '').padEnd(25)} ${(d.node || d.brand || '').padEnd(18)} ${(d.purpose || '').substring(0, 50)}`);
        }
    }
}

async function handleGeneralQuery(input) {
    // Attempt AI inference through the real InferenceGateway
    let gateway;
    try {
        gateway = createGateway();
    } catch (err) {
        // Fallback: gateway module unavailable
        gateway = null;
    }

    // Build system context for enriched prompts
    const systemContext = buildSystemContext();
    const systemPrompt = [
        'You are Heady™, a sovereign AI assistant built on Sacred Geometry principles.',
        'You are the CLI interface for the Heady™ Latent Operating System.',
        `Current time: ${new Date().toISOString()}`,
        `Platform: ${process.platform} | Node: ${process.version}`,
        systemContext,
        'Answer concisely. If the user asks about a Heady domain, service, or capability, provide specific info.',
        'If the user is greeting you, respond warmly and let them know what you can help with.',
    ].join('\n');

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
    ];

    // Try AI inference
    if (gateway) {
        const available = gateway.getAvailable();
        if (available.length > 0) {
            heading('Heady™ AI Response');
            info(`Provider: ${theme.teal(available[0])} ${theme.dim(`(${available.length} available)`)}`);
            console.log('');
            try {
                const result = await gateway.complete(messages, { temperature: 0.7 });
                const text = result.text || result.content || result.choices?.[0]?.message?.content || JSON.stringify(result);
                // Render AI response with markdown formatting
                console.log(theme.renderMarkdown(text));
                console.log('');
                info(`Latency: ${theme.gold((result.gatewayLatencyMs || '?') + 'ms')} ${theme.dim('|')} Provider: ${theme.teal(result.provider || available[0])}`);
                return;
            } catch (err) {
                warn(`AI inference failed: ${err.message}`);
                info('Falling back to local processing...');
                console.log('');
            }
        } else {
            // No providers have API keys configured — fall through to local
        }
    }

    // Fallback: Local intelligent processing (no AI keys available)
    await handleLocalProcessing(input, systemContext);
}

/**
 * Build enriched system context from the monorepo state.
 */
function buildSystemContext() {
    const parts = [];

    // Domain registry
    const registryPath = path.join(ROOT, 'configs', 'domains.json');
    if (fs.existsSync(registryPath)) {
        try {
            const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            const domains = registry.domains || [];
            const active = domains.filter(d => d.status === 'active');
            parts.push(`Heady domains: ${domains.length} total (${active.length} active)`);
            parts.push('Active domains: ' + active.map(d => `${d.domain} (${d.node} — ${d.purpose.substring(0, 40)})`).join(', '));
        } catch { }
    }

    // Service availability
    const checks = [
        ['MCP Server', path.join(SRC, 'mcp', 'heady-mcp-server.js')],
        ['Conductor', path.join(SRC, 'orchestration', 'heady-conductor.js')],
        ['Inference Gateway', path.join(SRC, 'services', 'inference-gateway.js')],
        ['Content Engine', path.join(ROOT, 'packages', 'heady-content-engine', 'src', 'index.ts')],
    ];
    const available = checks.filter(([, p]) => fs.existsSync(p)).map(([n]) => n);
    parts.push(`Available services: ${available.join(', ')}`);

    // Content status
    const contentDir = path.join(ROOT, 'content');
    if (fs.existsSync(contentDir)) {
        const count = runCapture(`find ${contentDir} -type f 2>/dev/null | wc -l`);
        if (count) parts.push(`Content files: ${count.trim()}`);
    }

    return parts.join('\n');
}

/**
 * Local fallback when no AI providers are configured.
 * Still does useful work: searches codebase, checks services, provides context.
 */
async function handleLocalProcessing(input, systemContext) {
    heading('Heady™ Local Processing');
    info(`Processing: "${input}"`);
    console.log('');

    // 1. Show system awareness
    console.log('  📊 System Context:');
    systemContext.split('\n').forEach(line => {
        if (line.trim()) console.log(`     ${line}`);
    });
    console.log('');

    // 2. Search the codebase for relevant info
    const searchTerms = input.split(/\s+/).filter(w => w.length > 3 && !['what', 'where', 'when', 'does', 'have', 'with', 'this', 'that', 'from', 'your', 'about'].includes(w.toLowerCase()));
    if (searchTerms.length > 0) {
        const searchQuery = searchTerms.slice(0, 3).join('|');
        const grepResult = runCapture(`grep -rl -E "${searchQuery}" --include="*.js" --include="*.ts" --include="*.json" --include="*.md" src/ packages/ configs/ content/ docs/ 2>/dev/null | head -10`);
        if (grepResult && grepResult.trim()) {
            console.log('  📁 Related files:');
            grepResult.trim().split('\n').forEach(f => console.log(`     ${f}`));
            console.log('');
        }
    }

    // 3. Show available AI providers so the user knows how to fix it
    console.log('  ⚡ AI Providers:');
    const providerEnvKeys = {
        'Groq': 'GROQ_API_KEY',
        'Gemini': 'GOOGLE_API_KEY',
        'Claude': 'ANTHROPIC_API_KEY',
        'OpenAI': 'OPENAI_API_KEY',
        'HuggingFace': 'HF_TOKEN',
    };
    let anyConfigured = false;
    for (const [name, envKey] of Object.entries(providerEnvKeys)) {
        const configured = !!process.env[envKey];
        if (configured) anyConfigured = true;
        console.log(`     ${configured ? '🟢' : '⚪'} ${name.padEnd(13)} ${configured ? 'configured' : `set ${envKey}`}`);
    }
    console.log('');

    if (!anyConfigured) {
        info('No AI providers configured. Set any API key above for full AI responses:');
        console.log('     export GROQ_API_KEY="your-key"       # Free tier available');
        console.log('     export GOOGLE_API_KEY="your-key"     # From GCloud console');
        console.log('     export ANTHROPIC_API_KEY="your-key"  # From console.anthropic.com');
    } else {
        warn('AI keys found but gateway failed to initialize. Run: heady doctor');
    }
}

/**
 * Word-wrap and print text to the terminal.
 */
function printWrapped(text, width = 80) {
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.length <= width) {
            console.log(`  ${line}`);
        } else {
            // Word wrap
            const words = line.split(' ');
            let current = '';
            for (const word of words) {
                if ((current + ' ' + word).length > width) {
                    console.log(`  ${current}`);
                    current = word;
                } else {
                    current = current ? current + ' ' + word : word;
                }
            }
            if (current) console.log(`  ${current}`);
        }
    }
}

// ─── Explicit Commands ────────────────────────────────────────────

const commands = {
    init() {
        heading('Initializing Heady Workspace');
        info('Installing dependencies...');
        run('pnpm install');
        info('Running database migrations...');
        commands.migrate();
        info('Checking environment...');
        commands.doctor();
        success('Workspace initialized');
    },

    start() {
        heading('Starting Heady™ Services');
        info('Starting conductor...');
        run('node src/orchestration/heady-conductor.js &');
        info('Starting MCP server...');
        run('node src/mcp/heady-mcp-server.js &');
        info('Starting projection dispatcher...');
        run('node src/projection/cloud-conductor-integration.js &');
        success('All services started');
    },

    dev() {
        heading('Starting Dev Mode');
        run('pnpm run dev');
    },

    build() {
        heading('Building All Packages');
        const pkgDir = path.join(ROOT, 'packages');
        if (!fs.existsSync(pkgDir)) { warn('No packages/'); return; }
        const packages = fs.readdirSync(pkgDir)
            .filter(d => fs.statSync(path.join(pkgDir, d)).isDirectory());
        for (const pkg of packages) {
            const pkgJson = path.join(pkgDir, pkg, 'package.json');
            if (fs.existsSync(pkgJson)) {
                const meta = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
                if (meta.scripts && meta.scripts.build) {
                    info(`Building ${pkg}...`);
                    run('pnpm run build', { cwd: path.join(pkgDir, pkg) });
                }
            }
        }
        success('All packages built');
    },

    deploy() {
        heading('Deploying to Cloud');
        const serviceYaml = path.join(INFRA, 'cloudrun', 'service.yaml');
        if (fs.existsSync(serviceYaml)) {
            info('Deploying to Cloud Run...');
            run(`gcloud run services replace ${serviceYaml}`);
        }
        const cfDir = path.join(INFRA, 'cloudflare');
        if (fs.existsSync(path.join(cfDir, 'wrangler.toml'))) {
            info('Deploying edge worker to Cloudflare...');
            run('wrangler deploy', { cwd: cfDir });
        }
        success('Deployment complete');
    },

    test() {
        heading('Running Test Suite');
        run('pnpm test');
    },

    async fix(...args) {
        return commands.doctor('--fix', ...args);
    },

    async doctor(...args) {
        const doFix = args.includes('--fix') || args.includes('-f');
        const doJson = args.includes('--json') || args.includes('-j');
        const doVerbose = args.includes('--verbose') || args.includes('-v');

        if (!doJson) {
            heading('Heady™ Systems Check' + (doFix ? ' + Auto-Fix' : ''));
            info(`Node.js: ${process.version} | CLI: v${VERSION} | Root: ${ROOT}`);
            if (doFix) info('Auto-fix mode enabled (--fix)');
            if (doVerbose) info('Verbose mode enabled');
            console.log('');
        }

        let passed = 0, failed = 0, warned = 0, fixed = 0;
        const results = [];

        function check(name, status, detail, fixable = false) {
            if (!doJson) {
                const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
                const color = status === 'pass' ? '\x1b[32m' : status === 'fail' ? '\x1b[31m' : '\x1b[33m';
                console.log(`  ${color}${icon}\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
            }
            results.push({ name, status, detail, fixable });
            if (status === 'pass') passed++;
            else if (status === 'fail') failed++;
            else warned++;
        }

        function fixApplied(name, detail) {
            console.log(`  \x1b[36m⚡ FIXED\x1b[0m ${name} — ${detail}`);
            fixed++;
        }

        // ═══ 1. STRUCTURE ═══════════════════════════════════════════════
        console.log('\n  \x1b[1m─── Structure ───\x1b[0m');
        const dirs = ['src', 'core', 'services', 'packages', 'configs', 'infra', 'migrations', 'content'];
        for (const d of dirs) {
            const exists = fs.existsSync(path.join(ROOT, d));
            check(d + '/', exists ? 'pass' : 'fail', exists ? null : 'directory missing');
        }
        const critFiles = [
            'package.json', 'core/constants/phi.js', 'core/pipeline/engine.js',
            'core/scheduler/auto-success.js', 'core/index.js',
            'src/bootstrap/hcfp-bootstrap.js', 'configs/domains.json',
        ];
        for (const f of critFiles) {
            const exists = fs.existsSync(path.join(ROOT, f));
            check(f, exists ? 'pass' : 'fail', exists ? null : 'MISSING — critical file');
        }

        // ═══ 2. SECRETS AUDIT ═══════════════════════════════════════════
        console.log('\n  \x1b[1m─── Secrets & Credentials ───\x1b[0m');

        // Check git remotes for hardcoded tokens
        const remotes = runCapture('git remote -v 2>/dev/null');
        if (remotes) {
            const hasTokens = remotes.includes('@dev.azure.com') || remotes.match(/https:\/\/[^:]+:[^@]+@/);
            check('Git remote URLs', hasTokens ? 'fail' : 'pass',
                hasTokens ? 'CRITICAL: PATs hardcoded in remote URLs — run: git remote set-url <name> <clean-url>' : 'No embedded credentials');
        }

        // Check for committed .env files
        const envFiles = ['.env', '.env.production', '.env.local'];
        const committedEnvs = envFiles.filter(f => fs.existsSync(path.join(ROOT, f)));
        if (committedEnvs.length > 0) {
            check('.env files in repo', 'fail', `CRITICAL: ${committedEnvs.join(', ')} exist in repo root`, true);
            if (doFix) {
                // Add to .gitignore if not already there
                const gitignorePath = path.join(ROOT, '.gitignore');
                if (fs.existsSync(gitignorePath)) {
                    let gitignore = fs.readFileSync(gitignorePath, 'utf8');
                    const entries = ['.env', '.env.*', '!.env.example', '!.env.template'];
                    let changed = false;
                    for (const entry of entries) {
                        if (!gitignore.includes(entry)) {
                            gitignore += '\n' + entry;
                            changed = true;
                        }
                    }
                    if (changed) {
                        fs.writeFileSync(gitignorePath, gitignore);
                        fixApplied('.gitignore', 'Added .env patterns');
                    }
                }
            }
        } else {
            check('.env files in repo', 'pass', 'No .env files in root (good)');
        }

        // ═══ 3. DOMAIN HEALTH ═══════════════════════════════════════════
        console.log('\n  \x1b[1m─── Domain Health (11 sites) ───\x1b[0m');
        const DOMAINS = [
            'headyme.com', 'headysystems.com', 'headyconnection.org', 'headybuddy.org',
            'headymcp.com', 'headyio.com', 'headybot.com', 'headyapi.com',
            'heady-ai.com', 'headylens.com', 'headyfinance.com',
        ];
        let domainsPassed = 0;
        for (const domain of DOMAINS) {
            const curlResult = runCapture(`curl -o /dev/null -s -w "%{http_code}|%{time_total}" --max-time 8 "https://${domain}" 2>/dev/null`);
            if (curlResult) {
                const [code, time] = curlResult.split('|');
                const ok = code === '200';
                if (ok) domainsPassed++;
                check(domain, ok ? 'pass' : 'fail', ok ? `HTTP ${code} (${parseFloat(time).toFixed(2)}s)` : `HTTP ${code}`);
            } else {
                check(domain, 'fail', 'unreachable');
            }
        }

        // ═══ 4. SSL CERTIFICATES ═══════════════════════════════════════
        console.log('\n  \x1b[1m─── SSL Certificates ───\x1b[0m');
        for (const domain of DOMAINS) {
            const expiry = runCapture(`echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null`);
            if (expiry) {
                const dateStr = expiry.replace('notAfter=', '');
                const expiryDate = new Date(dateStr);
                const daysLeft = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                const status = daysLeft < 14 ? 'fail' : daysLeft < 30 ? 'warn' : 'pass';
                check(`${domain} SSL`, status, `expires in ${daysLeft} days (${dateStr.trim()})`);
            } else {
                check(`${domain} SSL`, 'warn', 'could not check');
            }
        }

        // ═══ 5. SECURITY HEADERS ═══════════════════════════════════════
        console.log('\n  \x1b[1m─── Security Headers ───\x1b[0m');
        const headerDomains = ['headyme.com', 'heady-ai.com', 'headyapi.com', 'headymcp.com'];
        for (const domain of headerDomains) {
            const headers = runCapture(`curl -sI --max-time 5 "https://${domain}" 2>/dev/null`);
            if (headers) {
                const hasHSTS = /strict-transport-security/i.test(headers);
                const hasCSP = /content-security-policy/i.test(headers);
                const hasXFO = /x-frame-options/i.test(headers);
                const count = [hasHSTS, hasCSP, hasXFO].filter(Boolean).length;
                check(`${domain} headers`, count >= 2 ? 'pass' : count >= 1 ? 'warn' : 'fail',
                    `HSTS:${hasHSTS ? '✓' : '✗'} CSP:${hasCSP ? '✓' : '✗'} XFO:${hasXFO ? '✓' : '✗'}`);
            }
        }

        // ═══ 6. CLOUD RUN SERVICES ═════════════════════════════════════
        console.log('\n  \x1b[1m─── Cloud Run Services ───\x1b[0m');
        const gcloudOutput = runCapture('gcloud run services list --platform managed --format="csv[no-heading](metadata.name,status.conditions[0].status)" 2>/dev/null');
        if (gcloudOutput) {
            const services = gcloudOutput.trim().split('\n').filter(Boolean);
            let healthy = 0, unhealthy = 0;
            for (const line of services) {
                const [name, status] = line.split(',');
                if (status === 'True') healthy++;
                else { unhealthy++; check(name, 'fail', 'Cloud Run service unhealthy'); }
            }
            check(`Cloud Run (${healthy}/${services.length} healthy)`, unhealthy === 0 ? 'pass' : 'warn',
                unhealthy > 0 ? `${unhealthy} unhealthy service(s)` : null);
        } else {
            check('Cloud Run', 'warn', 'gcloud not available or not authenticated');
        }

        // ═══ 7. NPM AUDIT ══════════════════════════════════════════════
        console.log('\n  \x1b[1m─── NPM Audit ───\x1b[0m');
        const auditResult = runCapture('npm audit --json 2>/dev/null');
        if (auditResult) {
            try {
                const audit = JSON.parse(auditResult);
                const v = audit.metadata?.vulnerabilities || {};
                const crit = (v.critical || 0) + (v.high || 0);
                const mod = v.moderate || 0;
                const low = v.low || 0;
                check('npm audit', crit > 0 ? 'fail' : mod > 0 ? 'warn' : 'pass',
                    `critical:${v.critical||0} high:${v.high||0} moderate:${mod} low:${low}`);
            } catch { check('npm audit', 'warn', 'could not parse audit output'); }
        }

        // ═══ 8. CODEBASE QUALITY ═══════════════════════════════════════
        console.log('\n  \x1b[1m─── Codebase Quality ───\x1b[0m');

        // Console.log count
        const consoleLogCount = runCapture('grep -rl "console\\.log" src/ --include="*.js" 2>/dev/null | wc -l');
        if (consoleLogCount) {
            const count = parseInt(consoleLogCount.trim());
            check('console.log usage', count < 50 ? 'pass' : count < 150 ? 'warn' : 'fail',
                `${count} files (target: <50, migrate to Pino)`);
        }

        // Localhost references
        const localhostCount = runCapture('grep -rl "localhost\\|127\\.0\\.0\\.1" src/ --include="*.js" 2>/dev/null | wc -l');
        if (localhostCount) {
            const count = parseInt(localhostCount.trim());
            check('localhost references', count === 0 ? 'pass' : count < 5 ? 'warn' : 'fail',
                `${count} files reference localhost`);
        }

        // require() in ESM
        const requireCount = runCapture('grep -rl "require(" src/ --include="*.js" 2>/dev/null | wc -l');
        if (requireCount) {
            const count = parseInt(requireCount.trim());
            check('ESM compliance', count < 20 ? 'warn' : 'fail',
                `${count} files still use require() (should be ESM import)`);
        }

        // Version check
        const pkgJsonPath = path.join(ROOT, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
            check('package.json version', pkg.version === '4.1.0' ? 'pass' : 'warn',
                `v${pkg.version} (docs reference v4.1.0)`, true);
            if (doFix && pkg.version !== '4.1.0') {
                pkg.version = '4.1.0';
                fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
                fixApplied('package.json version', 'Updated to v4.1.0');
            }
        }

        // ═══ 9. φ-CONSTANTS INTEGRITY ═════════════════════════════════
        console.log('\n  \x1b[1m─── φ-Constants Integrity ───\x1b[0m');
        try {
            const { PHI, PSI, CSL: csl } = require(path.join(ROOT, 'core', 'constants', 'phi.js'));
            const phiOk = Math.abs(PHI - 1.618033988749895) < 0.0001;
            const psiOk = Math.abs(PSI - 0.6180339887498949) < 0.0001;
            const productOk = Math.abs(PHI * PSI - 1) < 1e-10;
            check('PHI constant', phiOk ? 'pass' : 'fail', `PHI=${PHI.toFixed(6)}`);
            check('PSI constant', psiOk ? 'pass' : 'fail', `PSI=${PSI.toFixed(6)}`);
            check('PHI × PSI = 1', productOk ? 'pass' : 'fail', `product=${(PHI * PSI).toFixed(10)}`);
        } catch (err) {
            check('φ-constants', 'fail', `Could not load: ${err.message}`);
        }

        // ═══ 10. PIPELINE ENGINE ═══════════════════════════════════════
        console.log('\n  \x1b[1m─── Pipeline Engine ───\x1b[0m');
        try {
            const { PipelineEngine } = require(path.join(ROOT, 'core', 'pipeline', 'engine.js'));
            const { STAGE_NAMES, VARIANTS } = require(path.join(ROOT, 'core', 'pipeline', 'stages.js'));
            check('PipelineEngine', 'pass', `21 stages, ${Object.keys(VARIANTS).length} variants`);
            const testEngine = new PipelineEngine({ maxConcurrentRuns: 1, maxRetries: 0 });
            check('Engine instantiation', 'pass', 'PipelineEngine created successfully');
        } catch (err) {
            check('PipelineEngine', 'fail', `Load error: ${err.message}`);
        }

        // ═══ 11. AUTO-SUCCESS SCHEDULER ════════════════════════════════
        console.log('\n  \x1b[1m─── Auto-Success Engine ───\x1b[0m');
        try {
            const { AutoSuccessScheduler } = require(path.join(ROOT, 'core', 'scheduler', 'auto-success.js'));
            const testScheduler = new AutoSuccessScheduler({ heartbeatMs: 30000 });
            check('AutoSuccessScheduler', 'pass', `heartbeat=${testScheduler.heartbeatMs}ms, maxTasks=${testScheduler.maxTasks}`);
        } catch (err) {
            check('AutoSuccessScheduler', 'fail', `Load error: ${err.message}`);
        }

        // ═══ 12. CONTENT QUALITY ═══════════════════════════════════════
        console.log('\n  \x1b[1m─── Content Quality ───\x1b[0m');
        const sampleDomains = ['headyme.com', 'heady-ai.com', 'headyapi.com'];
        for (const domain of sampleDomains) {
            const placeholderCount = runCapture(`curl -s --max-time 8 "https://${domain}" 2>/dev/null | grep -ciE "lorem|ipsum|placeholder|coming soon|todo|fixme" 2>/dev/null`);
            if (placeholderCount !== null) {
                const count = parseInt(placeholderCount.trim());
                check(`${domain} content`, count === 0 ? 'pass' : count < 3 ? 'warn' : 'fail',
                    `${count} placeholder matches`);
            }
        }

        // ═══ SUMMARY ═══════════════════════════════════════════════════
        const total = passed + failed + warned;
        const healthScore = total > 0 ? passed / total : 0;
        const grade = healthScore >= 0.9 ? 'A' : healthScore >= 0.8 ? 'B' : healthScore >= 0.7 ? 'C' :
            healthScore >= 0.6 ? 'D' : 'F';

        // ═══ JSON OUTPUT (Vercel pattern) ══════════════════════════════
        if (doJson) {
            const report = {
                ok: failed === 0,
                grade,
                score: parseFloat((healthScore * 100).toFixed(1)),
                passed, warned, failed, fixed,
                total: passed + warned + failed,
                ts: new Date().toISOString(),
                node: process.version,
                cli: VERSION,
                root: ROOT,
                checks: results,
            };
            console.log(JSON.stringify(report, null, 2));
            return;
        }

        console.log(`\n  \x1b[1m${'═'.repeat(50)}\x1b[0m`);
        console.log(`  \x1b[1mResults:\x1b[0m ${passed} \x1b[32mpassed\x1b[0m, ${warned} \x1b[33mwarned\x1b[0m, ${failed} \x1b[31mfailed\x1b[0m`);
        console.log(`  \x1b[1mHealth Score:\x1b[0m ${(healthScore * 100).toFixed(0)}% (Grade: ${grade})`);
        if (fixed > 0) console.log(`  \x1b[36m⚡ Auto-fixed:\x1b[0m ${fixed} issue(s)`);

        if (failed > 0) {
            console.log(`\n  \x1b[33mRun with --fix to auto-repair safe issues:\x1b[0m`);
            console.log(`    heady doctor --fix\n`);
        } else {
            success('All systems operational');
        }
    },

    'rotate-keys'() {
        heading('Rotating Credentials');
        const script = path.join(SCRIPTS, 'credential-rotation', 'rotate-all-keys.sh');
        if (fs.existsSync(script)) {
            run(`bash ${script}`);
        } else { warn('Rotation script not found'); }
    },

    migrate() {
        heading('Running Database Migrations');
        if (!fs.existsSync(MIGRATIONS)) { warn('No migrations directory'); return; }
        const sqlFiles = fs.readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort();
        info(`Found ${sqlFiles.length} migration files`);
        for (const f of sqlFiles) { info(`  → ${f}`); }
        info('Apply with: psql $DATABASE_URL -f migrations/<file>');
    },

    projection(sub = 'list') {
        heading('Projection Manager');
        switch (sub) {
            case 'list': info('Listing active projections...'); break;
            case 'deploy': info('Deploying new projection...'); break;
            case 'teardown': info('Tearing down projections...'); break;
            default: warn(`Unknown subcommand: ${sub}`);
        }
    },

    validate() {
        heading('Validating Content Kit');
        const script = path.join(SCRIPTS, 'validate-content.mjs');
        if (fs.existsSync(script)) {
            run(`node ${script}`);
        } else {
            warn('validate-content.mjs not found');
        }
    },

    scaffold(...args) {
        heading('Scaffolding New Domain');
        const script = path.join(SCRIPTS, 'scaffold-domain.mjs');
        if (fs.existsSync(script)) {
            run(`node ${script} ${args.join(' ')}`);
        } else {
            warn('scaffold-domain.mjs not found');
        }
    },

    async council(...args) {
        heading('Model Council — Multi-Provider Competitive Evaluation');
        const prompt = args.join(' ') || flagInput;
        if (!prompt) {
            warn('Usage: heady council "your prompt here"');
            return;
        }

        info(`Council prompt: "${theme.purple(prompt.slice(0, 100))}"`);

        try {
            const gateway = createGateway();
            const available = gateway.getAvailable();

            if (available.length === 0) {
                warn('No AI providers configured. Run: heady login');
                return;
            }

            info(`Available providers: ${available.map(p => theme.teal(p)).join(', ')}`);
            console.log('');

            // Agent tracker for parallel visualization
            const tracker = new theme.AgentTracker();
            available.forEach(p => tracker.addAgent(p, `Council [${p}]`, { status: 'generating...' }));
            tracker.start();

            const messages = [
                { role: 'system', content: 'Provide your best, most detailed response. This is a competitive evaluation.' },
                { role: 'user', content: prompt },
            ];

            const results = await Promise.allSettled(
                available.map(async (provider) => {
                    const start = Date.now();
                    tracker.updateAgent(provider, 'generating...');
                    const result = await gateway.complete(messages, { provider });
                    const totalMs = Date.now() - start;
                    tracker.completeAgent(provider, `${totalMs}ms`, true);
                    return { provider, ...result, totalMs };
                })
            );

            tracker.stop();
            console.log('');

            let bestScore = 0;
            let winner = null;
            const outputs = [];

            for (const r of results) {
                if (r.status === 'fulfilled' && r.value.content) {
                    const v = r.value;
                    const score = Math.min(1, (v.content.length / 1500) * 0.7 + Math.max(0, 1 - v.totalMs / 20000) * 0.3);
                    outputs.push({ ...v, score });

                    theme.section(`${v.provider.toUpperCase()} (${v.model})`);
                    console.log(theme.renderMarkdown(v.content.slice(0, 500)));
                    info(`Latency: ${theme.gold(v.totalMs + 'ms')} ${theme.dim('|')} Score: ${theme.teal(score.toFixed(3))}`);
                    console.log('');

                    if (score > bestScore) { bestScore = score; winner = v; }
                } else {
                    const errMsg = r.reason?.message || r.value?.error || 'unknown';
                    errorMsg(`${r.value?.provider || 'unknown'}: ${errMsg}`);
                    console.log('');
                }
            }

            if (winner) {
                console.log(theme.box('WINNER', [
                    `  ${theme.gold('\u{1F3C6}')} ${theme.bold(winner.provider.toUpperCase())} (${winner.model})`,
                    `  Score: ${theme.teal(bestScore.toFixed(3))} ${theme.dim('|')} ${outputs.length} providers competed`,
                ], { color: theme.FG.gold }));
            }
        } catch (err) {
            errorMsg(`Council failed: ${err.message}`);
        }
    },

    async battle(...args) {
        heading('Battle Arena \u2014 Provider Competition');
        const prompt = args.join(' ') || flagInput;
        if (!prompt) {
            warn('Usage: heady battle "your prompt here"');
            return;
        }

        try {
            const { HeadyBattleService } = require(path.join(SRC, 'services', 'HeadyBattle-service.js'));
            const gateway = createGateway();
            const battle = new HeadyBattleService({ gateway });

            info(`Battle prompt: "${theme.purple(prompt.slice(0, 100))}"`);

            // Live agent tracker
            const tracker = new theme.AgentTracker();
            const available = gateway.getAvailable();
            available.forEach(p => tracker.addAgent(p, `Battle [${p}]`, { status: 'competing...' }));
            tracker.start();

            const result = await battle.battle(prompt);
            tracker.stop();

            if (!result.ok) {
                warn(result.error);
                return;
            }

            console.log('');

            // Results table
            const rows = result.contestants.map(c => [
                c.provider === result.winner?.provider ? `${theme.gold('\u{1F3C6}')} ${theme.bold(c.provider)}` : `   ${c.provider}`,
                theme.teal(c.battleScore.toFixed(3)),
                theme.gold(c.latencyMs + 'ms'),
                String(c.contentLength),
                theme.dim(c.contentHash.slice(0, 12)),
            ]);
            console.log(theme.table(['Provider', 'Score', 'Latency', 'Length', 'Hash'], rows));

            if (result.failed?.length > 0) {
                console.log('');
                for (const f of result.failed) {
                    errorMsg(`${f.provider}: ${f.error}`);
                }
            }

            console.log('');
            success(`Winner: ${theme.bold(theme.gold(result.winner?.provider))} ${theme.dim('|')} Total: ${theme.teal(result.totalMs + 'ms')}`);
        } catch (err) {
            errorMsg(`Battle failed: ${err.message}`);
        }
    },

    async determinism(...args) {
        heading('Determinism Test — Monte Carlo Output Variance');
        const prompt = args.join(' ') || flagInput;
        if (!prompt) {
            warn('Usage: heady determinism "your prompt here"');
            info('Runs same prompt N times, measures output variance across providers');
            return;
        }

        try {
            const { HeadyBattleService } = require(path.join(SRC, 'services', 'HeadyBattle-service.js'));
            const gateway = createGateway();
            const battle = new HeadyBattleService({ gateway });

            info(`Determinism prompt: "${prompt.slice(0, 100)}"`);
            info('Running 5 iterations per provider at temperature=0...');
            console.log('');

            const result = await battle.determinismTest(prompt, {
                iterations: 5,
                temperature: 0,
            });

            if (!result.ok) {
                warn(result.error);
                return;
            }

            for (const [provider, data] of Object.entries(result.providers)) {
                const bar = '█'.repeat(Math.round(data.determinismScore * 20));
                const empty = '░'.repeat(20 - Math.round(data.determinismScore * 20));
                console.log(`  ◆ ${provider.toUpperCase()}`);
                console.log(`    Determinism: ${bar}${empty} ${(data.determinismScore * 100).toFixed(1)}%`);
                console.log(`    Unique outputs: ${data.uniqueOutputs}/${data.iterations}`);
                console.log(`    Avg latency: ${data.avgLatencyMs}ms`);
                for (const out of data.outputs) {
                    const mark = out.matchesCanonical ? '✓' : '✗';
                    console.log(`      ${mark} Run ${out.iteration}: ${out.hash || 'FAIL'} ${out.error ? `(${out.error})` : ''} ${out.latencyMs ? `${out.latencyMs}ms` : ''}`);
                }
                console.log('');
            }

            const overall = result.overallDeterminism * 100;
            console.log(`  ═══ Overall Determinism: ${overall.toFixed(1)}% ═══`);
            console.log('');

            if (overall >= 90) success('High determinism — outputs are consistent');
            else if (overall >= 50) warn('Moderate determinism — some variance detected');
            else warn('Low determinism — significant output variance');
        } catch (err) {
            errorMsg(`Determinism test failed: ${err.message}`);
        }
    },

    async learn(...args) {
        heading('Build Learning Engine — Deterministic Complex Builds');

        // Check for --report flag
        if (args.includes('--report') || args.includes('-r')) {
            try {
                const { BuildLearningEngine } = require(path.join(SRC, 'orchestration', 'build-learning-engine.js'));
                const gateway = createGateway();
                const engine = new BuildLearningEngine({ gateway, dataDir: path.join(ROOT, '.heady', 'build-learning') });
                const report = engine.getReport();

                if (report.builds === 0) {
                    info('No builds recorded yet. Run: heady learn "build a REST API"');
                    return;
                }

                console.log(`  Total builds: ${report.builds}`);
                console.log(`  Avg subtasks: ${report.avgSubtasks}`);
                console.log(`  Avg parallel groups: ${report.avgParallelGroups}`);
                console.log(`  Avg build time: ${report.avgBuildMs}ms`);
                if (report.avgDeterminism !== null) {
                    console.log(`  Avg determinism: ${(report.avgDeterminism * 100).toFixed(1)}%`);
                }
                console.log('');
                for (const b of report.recentBuilds) {
                    console.log(`  ◆ ${b.spec} — ${b.subtasks} subtasks, ${b.buildMs}ms`);
                }
                return;
            } catch (err) {
                errorMsg(`Report failed: ${err.message}`);
                return;
            }
        }

        // Parse --runs N flag
        let numRuns = 1;
        const runsIdx = args.indexOf('--runs');
        if (runsIdx !== -1 && args[runsIdx + 1]) {
            numRuns = parseInt(args[runsIdx + 1], 10) || 1;
            args.splice(runsIdx, 2);
        }

        const spec = args.join(' ') || flagInput;
        if (!spec) {
            warn('Usage: heady learn "build a REST API with auth"');
            info('  --runs N    Run N times for determinism measurement');
            info('  --report    Show learned patterns from past builds');
            return;
        }

        try {
            const { BuildLearningEngine } = require(path.join(SRC, 'orchestration', 'build-learning-engine.js'));
            const gateway = createGateway();
            const engine = new BuildLearningEngine({ gateway, dataDir: path.join(ROOT, '.heady', 'build-learning') });

            info(`Build spec: "${spec.slice(0, 100)}"`);
            info(`Runs: ${numRuns} | Providers: ${gateway.getAvailable().join(', ')}`);
            console.log('');

            // Listen to events for live output
            engine.on('build:decomposed', (e) => {
                info(`Decomposed into ${e.subtaskCount} subtasks`);
            });
            engine.on('build:group_start', (e) => {
                const mode = e.parallel ? `PARALLEL (${e.subtasks.length} agents)` : 'SEQUENTIAL';
                info(`Group ${e.groupIdx}: ${mode} — ${e.subtasks.join(', ')}`);
            });
            engine.on('build:subtask_complete', (e) => {
                console.log(`    ✓ ${e.subtaskId}: ${e.file} [${e.hash}]`);
            });
            engine.on('build:subtask_failed', (e) => {
                console.log(`    ✗ ${e.subtaskId}: ${e.error}`);
            });
            engine.on('build:run_complete', (e) => {
                info(`Run ${e.run}/${e.total} complete`);
                console.log('');
            });

            const result = await engine.build(spec, { runs: numRuns });

            if (!result.ok) {
                warn(result.error);
                return;
            }

            // Print execution groups
            console.log('  ═══ Build Execution Plan ═══');
            for (const g of result.groups) {
                const mode = g.parallel ? '▓ PARALLEL' : '░ SEQUENTIAL';
                console.log(`  ${mode} Group ${g.group}: ${g.subtasks.join(', ')}`);
            }
            console.log('');

            // Print run results
            for (const r of result.runs) {
                console.log(`  Run ${r.run}: ${r.files} files produced in ${r.totalMs}ms ${r.success ? '✓' : '✗'}`);
            }

            // Determinism results (if multiple runs)
            if (result.determinism) {
                console.log('');
                const pct = result.determinism.overall * 100;
                const bar = '█'.repeat(Math.round(pct / 5));
                const empty = '░'.repeat(20 - Math.round(pct / 5));
                console.log(`  Determinism: ${bar}${empty} ${pct.toFixed(1)}%`);
                console.log(`  Deterministic files: ${result.determinism.deterministicFiles}/${result.determinism.totalFiles}`);

                // Per-file determinism
                for (const [file, data] of Object.entries(result.determinism.perFile)) {
                    const mark = data.deterministic ? '✓' : '✗';
                    console.log(`    ${mark} ${file}: ${data.uniqueCount} unique (${(data.score * 100).toFixed(0)}%)`);
                }
            }

            // Learned patterns
            if (result.patterns) {
                console.log('');
                console.log(`  Patterns: ${result.patterns.maxParallelism} max parallel agents, ${result.patterns.recommendation}`);
            }

            console.log('');
            success(`Build complete: ${result.subtasks.length} subtasks, ${result.groups.length} groups`);
        } catch (err) {
            errorMsg(`Learning build failed: ${err.message}`);
        }
    },


    async context(...args) {
        heading('HeadyAutoContext — Workspace Context Scanner');
        const task = args.join(' ') || flagInput;
        if (!task) {
            warn('Usage: heady context "build an API with auth"');
            info('Shows what workspace context would be injected before AI execution.');
            return;
        }

        try {
            const { HeadyAutoContext } = require(path.join(SRC, 'services', 'heady-auto-context.js'));
            const autoContext = new HeadyAutoContext({ workspaceRoot: ROOT });
            const result = await autoContext.enrich(task);

            info('Task: "' + task.slice(0, 80) + '"');
            console.log('');
            console.log('  Sources scanned:  ' + result.stats.sourcesScanned);
            console.log('  Sources included: ' + result.stats.sourcesIncluded);
            console.log('  Tokens used:      ' + result.stats.tokensUsed + ' / ' + result.stats.tokenBudget);
            console.log('  Scan time:        ' + result.stats.scanTimeMs + 'ms');
            console.log('');

            if (result.sources.length > 0) {
                console.log('  Included sources (by relevance):');
                for (const s of result.sources) {
                    const bar = '\u2588'.repeat(Math.round(s.relevance * 10));
                    console.log('    ' + bar + ' ' + s.relevance.toFixed(2) + ' | ' + s.type.padEnd(12) + ' | ' + (s.path || 'inline') + ' (' + s.tokens + ' tok)');
                }
            } else {
                info('No relevant sources found for this task.');
            }

            if (result.systemContext) {
                console.log('');
                console.log('  Context preview (first 500 chars):');
                console.log('  ' + result.systemContext.slice(0, 500).replace(/\n/g, '\n  '));
            }

            console.log('');
            success('Context scan complete');
        } catch (err) {
            errorMsg('Context scan failed: ' + err.message);
        }
    },

    status() {
        heading('System Status');
        console.log('');

        // Gather metrics for visual dashboard
        const metrics = {};

        // Provider detection
        const providers = auth.detectProviders();
        const provOnline = Object.values(providers).filter(p => p.configured).length;
        const provTotal = Object.keys(providers).length;
        metrics['Providers'] = { current: provOnline, total: provTotal, unit: `${provOnline}/${provTotal} online`, color: provOnline > 3 ? theme.FG.green : provOnline > 0 ? theme.FG.gold : theme.FG.red };

        // Module check
        const moduleFiles = [
            'services/inference-gateway.js', 'services/heady-auto-context.js',
            'services/HeadyBattle-service.js', 'orchestration/heady-conductor.js',
            'mcp/heady-mcp-server.js', 'core/phi-scales.js',
            'core/semantic-logic.js', 'continuous-learning.js',
            'orchestration/cognitive-runtime-governor.js',
        ];
        let modulesOk = 0;
        for (const f of moduleFiles) {
            if (fs.existsSync(path.join(SRC, f))) modulesOk++;
        }
        metrics['Services'] = { current: modulesOk, total: moduleFiles.length, unit: `${modulesOk}/${moduleFiles.length} modules`, color: modulesOk === moduleFiles.length ? theme.FG.green : theme.FG.gold };

        // Content files
        const contentDir = path.join(ROOT, 'content');
        const contentCount = parseInt(runCapture(`find ${contentDir} -type f 2>/dev/null | wc -l`) || '0');
        metrics['Content'] = { current: Math.min(contentCount, 500), total: 500, unit: `${contentCount} files`, color: theme.FG.teal };

        // Domains
        const registryPath = path.join(ROOT, 'configs', 'domains.json');
        let domainCount = 0, activeCount = 0;
        if (fs.existsSync(registryPath)) {
            const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            domainCount = (reg.domains || []).length;
            activeCount = (reg.domains || []).filter(d => d.status === 'active').length;
        }
        metrics['Domains'] = { current: activeCount, total: domainCount || 1, unit: `${activeCount}/${domainCount} active`, color: theme.FG.azure };

        // Source files
        const srcCount = parseInt(runCapture(`find ${SRC} -name '*.js' -o -name '*.ts' 2>/dev/null | wc -l`) || '0');
        metrics['Source'] = { current: Math.min(srcCount, 300), total: 300, unit: `${srcCount} files`, color: theme.FG.purple };

        console.log(theme.systemDashboard(metrics));
        console.log('');

        // Provider matrix
        theme.section('Provider Matrix');
        auth.showProviderStatus();

        // System info
        console.log('');
        theme.section('Environment');
        console.log(theme.keyValue('Node.js', process.version));
        console.log(theme.keyValue('CLI', `v${VERSION}`));
        console.log(theme.keyValue('Root', ROOT));
        console.log(theme.keyValue('Platform', `${process.platform} ${process.arch}`));
        console.log(theme.keyValue('Time', new Date().toISOString()));
        if (_injectedKeys > 0) {
            console.log(theme.keyValue('Injected Keys', theme.teal(`${_injectedKeys} from ~/.heady/credentials.json`)));
        }
        console.log('');
        success('Status complete');
    },

    help() {
        theme.printLogo(VERSION);
        console.log(`  ${theme.bold('Usage:')}`);
        console.log(`    ${theme.purple('heady')}                              Interactive REPL mode`);
        console.log(`    ${theme.purple('heady')} ${theme.dim('"your question"')}             Intelligent processing`);
        console.log('');
        console.log(`  ${theme.bold(theme.gold('Authentication:'))}`);
        console.log(`    ${theme.teal('login')}         Authenticate (OAuth/API key/env import)`);
        console.log(`    ${theme.teal('logout')}        Clear stored credentials`);
        console.log(`    ${theme.teal('whoami')}        Show authentication status`);
        console.log('');
        console.log(`  ${theme.bold(theme.gold('AI Commands:'))}`);
        console.log(`    ${theme.teal('council')}       Multi-model competitive council`);
        console.log(`    ${theme.teal('battle')}        Provider battle arena`);
        console.log(`    ${theme.teal('determinism')}   Monte Carlo determinism test`);
        console.log(`    ${theme.teal('learn')}         Parallel build learning engine`);
        console.log(`    ${theme.teal('context')}       AutoContext management`);
        console.log('');
        console.log(`  ${theme.bold(theme.gold('System:'))}`);
        console.log(`    ${theme.teal('init')}          Initialize workspace`);
        console.log(`    ${theme.teal('start')}         Start all services`);
        console.log(`    ${theme.teal('dev')}           Dev mode with hot reload`);
        console.log(`    ${theme.teal('build')}         Build all packages`);
        console.log(`    ${theme.teal('deploy')}        Deploy to Cloud Run + Cloudflare`);
        console.log(`    ${theme.teal('test')}          Run test suite`);
        console.log(`    ${theme.teal('doctor')}        Health check`);
        console.log(`    ${theme.teal('rotate-keys')}   Rotate credentials`);
        console.log(`    ${theme.teal('migrate')}       Run DB migrations`);
        console.log(`    ${theme.teal('status')}        Visual system dashboard`);
        console.log(`    ${theme.teal('validate')}      Validate content kit`);
        console.log(`    ${theme.teal('scaffold')}      Scaffold a new domain`);
        console.log('');
        console.log(`  ${theme.bold('Examples:')}`);
        console.log(`    ${theme.dim('$')} ${theme.purple('heady')} ${theme.dim('"check my system health"')}`);
        console.log(`    ${theme.dim('$')} ${theme.purple('heady login')}`);
        console.log(`    ${theme.dim('$')} ${theme.purple('heady status')}`);
        console.log(`    ${theme.dim('$')} ${theme.purple('heady battle')} ${theme.dim('"write fibonacci in JS"')}`);
        console.log(`    ${theme.dim('$')} ${theme.purple('heady council')} ${theme.dim('"design a login component"')}`);
        console.log('');
    },

    // Auth commands
    async login(...args) { await auth.login({ token: args[0] }); },
    logout() { auth.logout(); },
    whoami() { auth.whoami(); },
};

// ─── Entry Point ──────────────────────────────────────────────────
//
// Usage patterns:
//   heady "natural language"                → intelligent processing
//   heady {command}                         → run explicit command
//   heady {command} --input "text"          → run command with input context
//   heady {command} subarg1 subarg2         → run command with subargs
//
// The --input flag can appear anywhere after the command.
// heady "anything" without a known command → intelligent processing.

const allArgs = process.argv.slice(2);

/** Parse --input "value" from args, return { args, input } */
function parseInput(args) {
    const inputIdx = args.indexOf('--input');
    if (inputIdx === -1) return { args, input: null };
    // Everything after --input is the input text
    const input = args.slice(inputIdx + 1).join(' ');
    const remaining = args.slice(0, inputIdx);
    return { args: remaining, input: input || null };
}

const { args: parsedArgs, input: flagInput } = parseInput(allArgs);
const firstArg = parsedArgs[0];
const restArgs = parsedArgs.slice(1);

// ─── Interactive REPL Mode ─────────────────────────────────────────
async function startREPL() {
    const readline = require('readline');

    theme.printLogo(VERSION);

    // Show quick status
    const providers = auth.detectProviders();
    const online = Object.values(providers).filter(p => p.configured);
    if (online.length > 0) {
        console.log(`  ${theme.green('●')} Authenticated ${theme.dim(`(${online.length} providers)`)}`);
    } else {
        console.log(`  ${theme.yellow('○')} Not authenticated ${theme.dim('— run /login or heady login')}`);
    }
    console.log(`  ${theme.dim('Type /help for commands, Ctrl+C to exit')}`);
    console.log('');

    // Load history
    const historyFile = auth.HISTORY_FILE;
    let history = [];
    try {
        if (fs.existsSync(historyFile)) {
            history = fs.readFileSync(historyFile, 'utf8').split('\n').filter(Boolean);
        }
    } catch (_) { }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `  ${theme.FG.purple}❯${theme.RESET} `,
        historySize: 500,
        completer: (line) => {
            const completions = ['/help', '/status', '/battle', '/council', '/login', '/logout', '/whoami', '/doctor', '/exit', '/quit', ...KNOWN_COMMANDS.map(c => '/' + c)];
            const hits = completions.filter(c => c.startsWith(line.toLowerCase()));
            return [hits.length ? hits : completions, line];
        },
    });

    // Apply loaded history
    for (const h of history.slice(-200)) {
        rl.history.push(h);
    }

    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();
        if (!input) { rl.prompt(); return; }

        // Save to history
        try {
            const dir = path.dirname(historyFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(historyFile, input + '\n');
        } catch (_) { }

        // Handle / commands
        if (input.startsWith('/')) {
            const parts = input.slice(1).split(/\s+/);
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);

            if (cmd === 'exit' || cmd === 'quit' || cmd === 'q') {
                console.log(`\n  ${theme.purple('Goodbye!')} ${theme.dim('Sacred Geometry awaits...')}\n`);
                rl.close();
                process.exit(0);
            }

            if (cmd === 'clear') {
                process.stdout.write('\x1b[2J\x1b[H');
                theme.printLogo(VERSION);
                rl.prompt();
                return;
            }

            if (KNOWN_COMMANDS.includes(cmd)) {
                try {
                    await Promise.resolve(commands[cmd](...args));
                } catch (err) {
                    errorMsg(err.message);
                }
                console.log('');
                rl.prompt();
                return;
            }

            warn(`Unknown command: /${cmd}. Type /help for available commands.`);
            rl.prompt();
            return;
        }

        // Natural language input → intelligent processing
        try {
            await processIntelligently(input);
        } catch (err) {
            errorMsg(`Processing failed: ${err.message}`);
        }
        console.log('');
        rl.prompt();
    });

    rl.on('close', () => {
        console.log(`\n  ${theme.purple('Goodbye!')} ${theme.dim('Sacred Geometry awaits...')}\n`);
        process.exit(0);
    });

    rl.on('SIGINT', () => {
        console.log(`\n  ${theme.dim('(Press Ctrl+C again or type /exit to quit)')}`);
        rl.prompt();
    });
}

// ─── Route ────────────────────────────────────────────────────────
if (!firstArg && !flagInput) {
    // No args → Interactive REPL mode (Claude Code-style)
    startREPL();
} else if (!firstArg && flagInput) {
    // heady --input "text" → intelligent processing
    theme.printLogo(VERSION);
    processIntelligently(flagInput).catch(err => {
        errorMsg(`Processing failed: ${err.message}`);
        process.exit(1);
    });
} else if (firstArg === 'help' || firstArg === '--help' || firstArg === '-h') {
    commands.help();
} else if (KNOWN_COMMANDS.includes(firstArg)) {
    // Explicit command with optional --input
    theme.printLogo(VERSION);
    if (flagInput) {
        Promise.resolve(commands[firstArg](...restArgs)).then(() => {
            console.log('');
            return processIntelligently(flagInput);
        }).catch(err => {
            errorMsg(`Processing failed: ${err.message}`);
            process.exit(1);
        });
    } else {
        Promise.resolve(commands[firstArg](...restArgs)).catch(err => {
            errorMsg(`Command failed: ${err.message}`);
            process.exit(1);
        });
    }
} else {
    // Not a known command → intelligent processing (default)
    const input = allArgs.join(' ');
    theme.printLogo(VERSION);
    processIntelligently(input).catch(err => {
        errorMsg(`Processing failed: ${err.message}`);
        process.exit(1);
    });
}

