/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — HEADYSYSTEMS INC.                   ║
 * ║  Copyright © 2026 HeadySystems Inc. All Rights Reserved.            ║
 * ║  Protected under the Defend Trade Secrets Act (18 U.S.C. § 1836)   ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * HeadyAutoContext v2 — Always-On Latent Space Context Intelligence
 * ═══════════════════════════════════════════════════════════════════
 *
 * The central nervous system for context injection across the entire
 * Heady ecosystem. Operates as an always-on background service that:
 *
 *   1. CONTINUOUSLY watches the workspace for changes (fs watcher)
 *   2. MAINTAINS a live vector index of all project knowledge in RAM
 *   3. INJECTS optimal context BEFORE every AI action (gateway, battle, MC)
 *   4. PERSISTS learned patterns to latent space for cross-session memory
 *
 * Integration Points:
 *   - InferenceGateway.complete() → auto-enriched via middleware
 *   - HeadyBattle rounds → context injected before each battle
 *   - HeadyCouncil deliberations → context injected for each model
 *   - HeadyMC simulations → context shapes risk scenarios
 *   - Antigravity IDE → workspace context for coding tasks
 *
 * Flow:
 *   Request → AutoContext.enrich() → [workspace scan, vector search,
 *     pattern match, CSL relevance gate] → Enriched Prompt
 *
 * @module HeadyAutoContext
 */

'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ─── Safe Imports (graceful degradation) ────────────────────────────────────

let logger;
try { logger = require('../utils/logger'); } catch (_) {
    logger = { info: console.log, warn: console.warn, error: console.error, debug: () => { } };
}

let VectorMemory;
try { ({ VectorMemory } = require('../vector-memory')); } catch (_) { VectorMemory = null; }

let cosineSimilarity;
try { ({ cosineSimilarity } = require('../vector-space-ops')); } catch (_) { cosineSimilarity = null; }

// ─── Constants (φ-scaled) ───────────────────────────────────────────────────

const PHI = 1.618033988749895;
const PSI = 1 / PHI;  // ≈ 0.618
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** No token budget — inject ALL relevant context for maximum intelligence */

/** Relevance thresholds — CSL gates at φ intervals */
const CSL_GATES = {
    include: PSI * PSI,     // ≈ 0.382 — minimum to include in context
    boost: PSI,             // ≈ 0.618 — high relevance
    critical: PSI + 0.1,    // ≈ 0.718 — always included
};

/** File extensions to scan */
const CODE_EXTENSIONS = new Set([
    '.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs',
    '.json', '.yaml', '.yml', '.md', '.html', '.css',
    '.sql', '.sh', '.toml', '.mjs', '.cjs',
]);

/** Config files with boosted relevance */
const CONFIG_FILES = new Set([
    'package.json', 'tsconfig.json', '.env.example',
    'Dockerfile', 'docker-compose.yml', 'wrangler.toml',
    'turbo.json', 'firebase.json',
]);

/** Directories to skip */
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', '.next',
    'coverage', '.turbo', '.cache', '__pycache__',
    '_archive', 'backup', 'backups', '.backup',
    'Heady-pre-production-9f2f0642-main',
    '_downloads', 'heady-full-rebuild',
]);

/** Background indexer interval — φ-scaled (13 seconds) */
const INDEX_INTERVAL_MS = FIB[7] * 1000; // 21 seconds

/** Maximum file cache entries */
const MAX_CACHE_SIZE = FIB[9]; // 55

/** Workspace scan depth */
const MAX_SCAN_DEPTH = FIB[5]; // 8

// ─── ContextSource ──────────────────────────────────────────────────────────

class ContextSource {
    constructor(opts) {
        this.type = opts.type;       // 'file' | 'config' | 'pattern' | 'schema' | 'vector' | 'prior_build'
        this.path = opts.path || null;
        this.content = opts.content;
        this.relevance = opts.relevance || 0.5;
        this.tokens = Math.ceil((opts.content || '').length / 4);
        this.vectorScore = opts.vectorScore || 0;
    }
}

// ─── HeadyAutoContext ───────────────────────────────────────────────────────

class HeadyAutoContext extends EventEmitter {

    /**
     * @param {Object} opts
     * @param {string} opts.workspaceRoot - Project root directory
     * @param {Object} [opts.gateway] - InferenceGateway instance
     * @param {Object} [opts.vectorMemory] - VectorMemory instance (for latent space search)
     * @param {string} [opts.patternsDir] - Build learning patterns directory
     * @param {boolean} [opts.alwaysOn=true] - Enable background indexer
     * @param {string} [opts.vectorPersistPath] - Path for vector persistence
     */
    constructor(opts = {}) {
        super();
        if (!opts.workspaceRoot) throw new Error('HeadyAutoContext requires workspaceRoot');

        this._root = opts.workspaceRoot;
        this._gateway = opts.gateway || null;

        this._patternsDir = opts.patternsDir || path.join(this._root, '.heady', 'build-learning');

        // ── Vector Memory (latent space) ─────────────────────────────────
        this._vectorMemory = opts.vectorMemory || null;
        if (!this._vectorMemory && VectorMemory) {
            this._vectorMemory = new VectorMemory({ defaultNamespace: 'autocontext' });
        }
        this._vectorPersistPath = opts.vectorPersistPath ||
            path.join(this._root, '.heady', 'autocontext-vectors.jsonl');

        // ── Caches ───────────────────────────────────────────────────────
        this._cache = new Map();       // filePath → { content, mtime, tokens }
        this._fileIndex = null;        // Lazy workspace index
        this._indexVersion = 0;        // Increments on rescan

        // ── Stats ────────────────────────────────────────────────────────
        this._stats = {
            totalEnrichments: 0,
            totalTokensInjected: 0,
            avgEnrichTimeMs: 0,
            vectorSearches: 0,
            cacheHits: 0,
            cacheMisses: 0,
            lastEnrichAt: null,
        };

        // ── Always-On Background Indexer ─────────────────────────────────
        this._alwaysOn = opts.alwaysOn !== false;
        this._indexerInterval = null;
        this._watcher = null;
        this._dirty = true;

        if (this._alwaysOn) {
            this._startBackgroundIndexer();
        }

        // ── Load persisted vectors ───────────────────────────────────────
        this._loadPersistedVectors();

        logger.info('[AutoContext] Initialized', {
            workspaceRoot: this._root,
            alwaysOn: this._alwaysOn,
            vectorMemory: !!this._vectorMemory,
            tokenBudget: this._tokenBudget,
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ PUBLIC API ═══
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Enrich a prompt with optimal workspace context before AI execution.
     * THE main entry point — call this before EVERY InferenceGateway call.
     *
     * @param {string} task - The task description or user prompt
     * @param {Object} [opts]
     * @param {string[]} [opts.focusFiles] - Specific files to prioritize
     * @param {string} [opts.domain] - 'code' | 'config' | 'deploy' | 'research' | 'battle' | 'council'
     * @param {number} [opts.tokenBudget] - Override default budget
     * @param {boolean} [opts.vectorSearch] - Search latent space vectors (default: true)
     * @param {boolean} [opts.deep] - Deep enrichment mode (more tokens, more sources)
     * @returns {Object} { systemContext, enrichedPrompt, sources, stats }
     */
    async enrich(task, opts = {}) {
        const startMs = Date.now();

        // ── 1: Ensure index is current ───────────────────────────────────
        if (!this._fileIndex || this._dirty) {
            this._fileIndex = this._scanWorkspace();
            this._dirty = false;
        }

        // ── 2: Gather ALL context sources ────────────────────────────────
        const sources = [];

        // 2a: Config files (always relevant)
        sources.push(...this._gatherConfigs());

        // 2b: Files matching task keywords (filesystem relevance)
        sources.push(...this._gatherByRelevance(task));

        // 2c: Focus files (explicitly requested)
        if (opts.focusFiles?.length) {
            sources.push(...this._gatherFocusFiles(opts.focusFiles));
        }

        // 2d: Vector memory search (latent space — the key upgrade)
        if (opts.vectorSearch !== false && this._vectorMemory) {
            sources.push(...await this._searchVectorMemory(task));
        }

        // 2e: Prior build patterns
        sources.push(...this._gatherPriorPatterns(task));

        // 2f: Domain-specific context
        if (opts.domain) {
            sources.push(...this._gatherDomainContext(opts.domain));
        }

        // ── 3: Deduplicate ───────────────────────────────────────────────
        const deduped = this._deduplicateSources(sources);

        // ── 4: CSL-gated relevance filter ────────────────────────────────
        const gated = deduped.filter(s => s.relevance >= CSL_GATES.include);

        // ── 5: Rank by relevance (include ALL gated sources) ────────────
        const packed = this._rankByRelevance(gated);

        // ── 6: Build context injection block ─────────────────────────────
        const systemContext = this._buildContextBlock(packed);

        // ── 7: Record stats ──────────────────────────────────────────────
        const enrichTimeMs = Date.now() - startMs;
        const tokensUsed = packed.reduce((s, c) => s + c.tokens, 0);

        this._stats.totalEnrichments++;
        this._stats.totalTokensInjected += tokensUsed;
        this._stats.avgEnrichTimeMs = (
            this._stats.avgEnrichTimeMs * (this._stats.totalEnrichments - 1) + enrichTimeMs
        ) / this._stats.totalEnrichments;
        this._stats.lastEnrichAt = Date.now();

        const stats = {
            sourcesScanned: sources.length,
            sourcesGated: gated.length,
            sourcesIncluded: packed.length,
            tokensUsed,
            scanTimeMs: enrichTimeMs,
            vectorHits: sources.filter(s => s.type === 'vector').length,
        };

        this.emit('context:enriched', { task: task.slice(0, 80), ...stats });
        logger.info('[AutoContext] Enriched', stats);

        return {
            systemContext,
            enrichedPrompt: systemContext
                ? `${systemContext}\n\n---\n\n${task}`
                : task,
            sources: packed.map(s => ({
                type: s.type,
                path: s.path,
                relevance: s.relevance,
                tokens: s.tokens,
                vectorScore: s.vectorScore,
            })),
            stats,
        };
    }

    /**
     * Wrap an InferenceGateway call with automatic context enrichment.
     * Drop-in replacement for gateway.complete().
     */
    async completeWithContext(messages, gatewayOpts = {}, contextOpts = {}) {
        if (!this._gateway) throw new Error('HeadyAutoContext.completeWithContext requires gateway');

        const userMsg = [...messages].reverse().find(m => m.role === 'user');
        const task = userMsg?.content || '';

        const { systemContext } = await this.enrich(task, contextOpts);

        const enrichedMessages = [...messages];
        if (systemContext) {
            const sysIdx = enrichedMessages.findIndex(m => m.role === 'system');
            if (sysIdx >= 0) {
                enrichedMessages[sysIdx] = {
                    ...enrichedMessages[sysIdx],
                    content: enrichedMessages[sysIdx].content + '\n\n' + systemContext,
                };
            } else {
                enrichedMessages.unshift({ role: 'system', content: systemContext });
            }
        }

        return this._gateway.complete(enrichedMessages, gatewayOpts);
    }

    /**
     * Create a middleware function that auto-injects context into any gateway call.
     * Wire this into InferenceGateway or express routes.
     *
     * @param {Object} [opts] - Default enrich options
     * @returns {Function} Middleware: (messages, gatewayOpts) => enrichedMessages
     */
    createMiddleware(opts = {}) {
        const self = this;
        return async function autoContextMiddleware(messages, gatewayOpts = {}) {
            const userMsg = [...messages].reverse().find(m => m.role === 'user');
            const task = userMsg?.content || '';

            const { systemContext } = await self.enrich(task, {
                ...opts,
                domain: gatewayOpts.domain || opts.domain,
                deep: gatewayOpts.deep || opts.deep,
            });

            if (!systemContext) return messages;

            const result = [...messages];
            const sysIdx = result.findIndex(m => m.role === 'system');
            if (sysIdx >= 0) {
                result[sysIdx] = {
                    ...result[sysIdx],
                    content: result[sysIdx].content + '\n\n' + systemContext,
                };
            } else {
                result.unshift({ role: 'system', content: systemContext });
            }
            return result;
        };
    }

    /**
     * Enrich context for a HeadyBattle round.
     * Includes all relevant sources — no budget cap.
     */
    async enrichForBattle(task, battleConfig = {}) {
        return this.enrich(task, {
            domain: 'battle',
            deep: true,
            vectorSearch: true,
            focusFiles: battleConfig.focusFiles,
        });
    }

    /**
     * Enrich context for HeadyCouncil deliberation.
     * Provides council-specific context with model capabilities awareness.
     */
    async enrichForCouncil(task, councilOpts = {}) {
        const { systemContext, sources, stats } = await this.enrich(task, {
            domain: 'council',
            tokenBudget: TOKEN_BUDGETS.deep,
            deep: true,
            vectorSearch: true,
        });

        // Add council-specific preamble
        const councilPreamble = [
            '=== COUNCIL DELIBERATION CONTEXT ===',
            `Models participating: ${(councilOpts.models || ['claude', 'gemini', 'gpt']).join(', ')}`,
            `Task complexity: ${stats.sourcesIncluded > 10 ? 'EXPANSIVE' : stats.sourcesIncluded > 5 ? 'MODERATE' : 'FOCUSED'}`,
            `Vector memory hits: ${stats.vectorHits}`,
            '',
        ].join('\n');

        return {
            systemContext: councilPreamble + (systemContext || ''),
            sources,
            stats,
        };
    }

    /**
     * Enrich context for HeadyMC (Monte Carlo) simulation.
     * Provides risk-aware context for scenario modeling.
     */
    async enrichForMonteCarlo(scenario, signals = {}) {
        const { systemContext } = await this.enrich(
            `Monte Carlo simulation: ${scenario.name || 'unnamed'} — ${JSON.stringify(signals).slice(0, 200)}`,
            { domain: 'config', tokenBudget: TOKEN_BUDGETS.minimal, vectorSearch: true }
        );
        return { systemContext };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ VECTOR MEMORY (LATENT SPACE) ═══
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Search vector memory for semantically similar context.
     * Uses lightweight keyword-based vector generation (no external embeddings).
     */
    async _searchVectorMemory(task) {
        if (!this._vectorMemory) return [];
        const sources = [];

        try {
            // Generate a lightweight query vector from task keywords
            const queryVector = this._textToVector(task);

            const results = this._vectorMemory.search(queryVector, FIB[5], CSL_GATES.include);
            this._stats.vectorSearches++;

            for (const result of results) {
                sources.push(new ContextSource({
                    type: 'vector',
                    path: result.metadata?.path || result.key,
                    content: result.metadata?.summary ||
                        `[Vector match: ${result.key} (score: ${result.score.toFixed(3)})]`,
                    relevance: result.score,
                    vectorScore: result.score,
                }));
            }
        } catch (e) {
            logger.warn('[AutoContext] Vector search failed:', e.message);
        }

        return sources;
    }

    /**
     * Index a file into vector memory for future semantic search.
     */
    indexFile(relPath, content) {
        if (!this._vectorMemory) return;

        try {
            const vector = this._textToVector(content);
            const summary = this._summarizeContent(content, relPath);

            this._vectorMemory.store(relPath, vector, {
                path: relPath,
                summary,
                indexedAt: Date.now(),
                tokens: Math.ceil(content.length / 4),
            }, 'autocontext');
        } catch (e) {
            logger.debug('[AutoContext] Index failed for', relPath, e.message);
        }
    }

    /**
     * Bulk index all workspace files into vector memory.
     */
    async indexWorkspace() {
        if (!this._fileIndex) this._fileIndex = this._scanWorkspace();
        let indexed = 0;

        const allFiles = [
            ...(this._fileIndex.files || []),
            ...(this._fileIndex.configs || []),
            ...(this._fileIndex.schemas || []),
        ];

        for (const relPath of allFiles) {
            const content = this._readFile(relPath);
            if (content) {
                this.indexFile(relPath, content);
                indexed++;
            }
        }

        logger.info('[AutoContext] Workspace indexed', { files: indexed });
        this.emit('context:indexed', { files: indexed });

        // Persist vectors
        await this._persistVectors();
        return indexed;
    }

    /**
     * Lightweight text → vector conversion.
     * Creates a 384-dim feature vector from keyword frequencies.
     * Not as good as transformer embeddings but works offline with zero latency.
     */
    _textToVector(text) {
        const dim = 384;
        const vector = new Float64Array(dim);
        const words = (text || '').toLowerCase().split(/[\s\W]+/).filter(w => w.length > 2);

        for (const word of words) {
            // Hash word to deterministic positions in the vector
            let h = 0;
            for (let i = 0; i < word.length; i++) {
                h = ((h << 5) - h + word.charCodeAt(i)) | 0;
            }

            // Spread energy across multiple dimensions (like a sparse encoding)
            for (let i = 0; i < 3; i++) {
                const idx = Math.abs((h + i * 127) % dim);
                vector[idx] += 1.0 / (1 + i * PHI); // φ-decay for higher harmonics
            }
        }

        // L2 normalize
        let norm = 0;
        for (let i = 0; i < dim; i++) norm += vector[i] * vector[i];
        norm = Math.sqrt(norm) || 1;
        for (let i = 0; i < dim; i++) vector[i] /= norm;

        return vector;
    }

    _summarizeContent(content, relPath) {
        const ext = path.extname(relPath);
        const lines = content.split('\n');
        const firstComment = lines.find(l => l.trim().startsWith('*') || l.trim().startsWith('//'));
        return (firstComment || lines[0] || relPath).trim().slice(0, 200);
    }

    async _persistVectors() {
        if (!this._vectorMemory) return;
        try {
            const dir = path.dirname(this._vectorPersistPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            await this._vectorMemory.persist(this._vectorPersistPath);
            logger.debug('[AutoContext] Vectors persisted to', this._vectorPersistPath);
        } catch (e) {
            logger.warn('[AutoContext] Vector persist failed:', e.message);
        }
    }

    async _loadPersistedVectors() {
        if (!this._vectorMemory) return;
        try {
            if (fs.existsSync(this._vectorPersistPath)) {
                const count = await this._vectorMemory.load(this._vectorPersistPath);
                logger.info('[AutoContext] Loaded', count, 'persisted vectors');
            }
        } catch (e) {
            logger.debug('[AutoContext] No persisted vectors:', e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ BACKGROUND INDEXER (ALWAYS-ON) ═══
    // ═══════════════════════════════════════════════════════════════════════

    _startBackgroundIndexer() {
        // Periodic rescan
        this._indexerInterval = setInterval(() => {
            if (this._dirty) {
                this._fileIndex = this._scanWorkspace();
                this._dirty = false;
                this.emit('context:reindexed', { version: this._indexVersion });
            }
        }, INDEX_INTERVAL_MS);

        // Don't prevent process exit
        if (this._indexerInterval.unref) this._indexerInterval.unref();

        // Filesystem watcher (marks index as dirty on changes)
        try {
            const watchDirs = ['src', 'configs', 'packages', 'apps', 'services'].map(d =>
                path.join(this._root, d)
            ).filter(d => fs.existsSync(d));

            for (const dir of watchDirs) {
                try {
                    const w = fs.watch(dir, { recursive: true }, (eventType, filename) => {
                        if (filename && !filename.includes('node_modules')) {
                            this._dirty = true;
                            // Also re-index the changed file in vector memory
                            const relPath = path.join(path.relative(this._root, dir), filename);
                            const content = this._readFile(relPath);
                            if (content) this.indexFile(relPath, content);
                        }
                    });
                    if (w.unref) w.unref();
                } catch (_) { /* some dirs may not be watchable */ }
            }
        } catch (_) { /* fs.watch not available */ }

        logger.info('[AutoContext] Background indexer started (interval: ' + INDEX_INTERVAL_MS + 'ms)');
    }

    /**
     * Stop background indexer. Call on shutdown.
     */
    stop() {
        if (this._indexerInterval) {
            clearInterval(this._indexerInterval);
            this._indexerInterval = null;
        }
        logger.info('[AutoContext] Stopped');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ WORKSPACE SCANNING ═══
    // ═══════════════════════════════════════════════════════════════════════

    _scanWorkspace() {
        const index = { files: [], configs: [], schemas: [] };
        this._indexVersion++;

        const walk = (dir, depth = 0) => {
            if (depth > MAX_SCAN_DEPTH) return;

            let entries;
            try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
            catch (_) { return; }

            for (const entry of entries) {
                if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
                if (SKIP_DIRS.has(entry.name)) continue;

                const fullPath = path.join(dir, entry.name);
                const relPath = path.relative(this._root, fullPath);

                if (entry.isDirectory()) {
                    walk(fullPath, depth + 1);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (!CODE_EXTENSIONS.has(ext)) continue;

                    if (CONFIG_FILES.has(entry.name)) {
                        index.configs.push(relPath);
                    } else if (entry.name.includes('schema') || entry.name.includes('types')) {
                        index.schemas.push(relPath);
                    } else {
                        index.files.push(relPath);
                    }
                }
            }
        };

        walk(this._root);

        logger.debug('[AutoContext] Workspace scanned v' + this._indexVersion, {
            files: index.files.length,
            configs: index.configs.length,
            schemas: index.schemas.length,
        });

        return index;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ CONTEXT GATHERERS ═══
    // ═══════════════════════════════════════════════════════════════════════

    _gatherConfigs() {
        const sources = [];
        for (const relPath of (this._fileIndex?.configs || [])) {
            const content = this._readFile(relPath);
            if (content) {
                sources.push(new ContextSource({
                    type: 'config',
                    path: relPath,
                    content: this._truncate(content, 1500),
                    relevance: 0.9,
                }));
            }
        }
        return sources;
    }

    _gatherByRelevance(task) {
        const sources = [];
        const taskWords = this._extractKeywords(task);
        if (taskWords.length === 0) return sources;

        for (const relPath of (this._fileIndex?.files || []).slice(0, 300)) {
            const fileName = path.basename(relPath, path.extname(relPath)).toLowerCase();
            const dirParts = path.dirname(relPath).split('/').map(p => p.toLowerCase());
            const allParts = [fileName, ...dirParts];

            let relevance = 0;
            for (const word of taskWords) {
                if (allParts.some(p => p.includes(word))) relevance += 0.3;
            }

            if (relevance >= CSL_GATES.include) {
                const content = this._readFile(relPath);
                if (content) {
                    const contentLower = content.slice(0, 3000).toLowerCase();
                    for (const word of taskWords) {
                        if (contentLower.includes(word)) relevance += 0.1;
                    }

                    sources.push(new ContextSource({
                        type: 'file',
                        path: relPath,
                        content: this._truncate(content, 2000),
                        relevance: Math.min(1.0, relevance),
                    }));
                }
            }
        }

        // Schemas
        for (const relPath of (this._fileIndex?.schemas || [])) {
            const content = this._readFile(relPath);
            if (content) {
                sources.push(new ContextSource({
                    type: 'schema',
                    path: relPath,
                    content: this._truncate(content, 1500),
                    relevance: 0.7,
                }));
            }
        }

        return sources;
    }

    _gatherFocusFiles(focusFiles) {
        const sources = [];
        for (const filePath of focusFiles) {
            const relPath = path.isAbsolute(filePath)
                ? path.relative(this._root, filePath)
                : filePath;
            const content = this._readFile(relPath);
            if (content) {
                sources.push(new ContextSource({
                    type: 'file',
                    path: relPath,
                    content: this._truncate(content, 4000),
                    relevance: 1.0,
                }));
            }
        }
        return sources;
    }

    _gatherPriorPatterns(task) {
        const sources = [];
        const patternsFile = path.join(this._patternsDir, 'patterns.json');

        try {
            if (fs.existsSync(patternsFile)) {
                const patterns = JSON.parse(fs.readFileSync(patternsFile, 'utf8'));
                const entries = Object.values(patterns);

                if (entries.length > 0) {
                    const taskWords = this._extractKeywords(task);
                    const relevant = entries
                        .map(p => {
                            const specWords = this._extractKeywords(p.spec || '');
                            const overlap = taskWords.filter(w => specWords.includes(w)).length;
                            return { ...p, overlap };
                        })
                        .filter(p => p.overlap > 0)
                        .sort((a, b) => b.overlap - a.overlap)
                        .slice(0, FIB[4]); // top 5

                    if (relevant.length > 0) {
                        const summary = relevant.map(p =>
                            `Spec: "${p.spec?.slice(0, 100)}" → ${p.subtaskCount} subtasks, ` +
                            `${p.parallelGroups} groups, determinism: ${p.determinism ?? 'N/A'}, ` +
                            `build: ${p.avgBuildMs}ms`
                        ).join('\n');

                        sources.push(new ContextSource({
                            type: 'prior_build',
                            path: 'patterns.json',
                            content: `Prior Build Patterns:\n${summary}`,
                            relevance: PSI, // ≈ 0.618
                        }));
                    }
                }
            }
        } catch (_) { }

        return sources;
    }

    _gatherDomainContext(domain) {
        const sources = [];
        const domainDirs = {
            code: ['src', 'lib', 'packages'],
            config: ['configs', 'settings'],
            deploy: ['scripts', 'cloudflare', 'infra'],
            research: ['docs', 'heady-cognition'],
            battle: ['src/services', 'src/orchestration', 'src/intelligence'],
            council: ['src/orchestration', 'src/services', 'heady-cognition/prompts'],
        };

        const dirs = domainDirs[domain] || domainDirs.code;

        for (const dir of dirs) {
            const fullDir = path.join(this._root, dir);
            if (!fs.existsSync(fullDir)) continue;

            try {
                const entries = fs.readdirSync(fullDir, { withFileTypes: true })
                    .filter(e => e.isFile())
                    .slice(0, FIB[5]); // 8

                for (const entry of entries) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (!CODE_EXTENSIONS.has(ext)) continue;

                    const relPath = path.join(dir, entry.name);
                    const content = this._readFile(relPath);
                    if (content) {
                        sources.push(new ContextSource({
                            type: 'file',
                            path: relPath,
                            content: this._truncate(content, 1500),
                            relevance: 0.5,
                        }));
                    }
                }
            } catch (_) { }
        }

        return sources;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ PACKING & RANKING ═══
    // ═══════════════════════════════════════════════════════════════════════

    _deduplicateSources(sources) {
        const seen = new Set();
        return sources.filter(s => {
            const key = s.path || crypto.createHash('md5').update(s.content).digest('hex');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Rank all sources by relevance — NO budget cap.
     * Critical sources first, then by descending relevance.
     */
    _rankByRelevance(sources) {
        const critical = sources.filter(s => s.relevance >= CSL_GATES.critical);
        const rest = sources.filter(s => s.relevance < CSL_GATES.critical)
            .sort((a, b) => b.relevance - a.relevance);
        return [...critical, ...rest];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ CONTEXT BLOCK BUILDER ═══
    // ═══════════════════════════════════════════════════════════════════════

    _buildContextBlock(sources) {
        if (sources.length === 0) return '';

        const sections = [];

        const configs = sources.filter(s => s.type === 'config');
        const schemas = sources.filter(s => s.type === 'schema');
        const files = sources.filter(s => s.type === 'file');
        const vectors = sources.filter(s => s.type === 'vector');
        const patterns = sources.filter(s => s.type === 'prior_build');

        if (configs.length > 0) {
            sections.push('=== PROJECT CONFIGURATION ===\n' +
                configs.map(s => `--- ${s.path} ---\n${s.content}`).join('\n\n'));
        }

        if (vectors.length > 0) {
            sections.push('=== LATENT SPACE KNOWLEDGE (Vector Memory) ===\n' +
                vectors.map(s => `--- ${s.path} (score: ${s.vectorScore.toFixed(3)}) ---\n${s.content}`).join('\n\n'));
        }

        if (schemas.length > 0) {
            sections.push('=== SCHEMAS & TYPES ===\n' +
                schemas.map(s => `--- ${s.path} ---\n${s.content}`).join('\n\n'));
        }

        if (files.length > 0) {
            sections.push('=== RELEVANT SOURCE FILES ===\n' +
                files.map(s => `--- ${s.path} (relevance: ${s.relevance.toFixed(2)}) ---\n${s.content}`).join('\n\n'));
        }

        if (patterns.length > 0) {
            sections.push('=== PRIOR BUILD KNOWLEDGE ===\n' +
                patterns.map(s => s.content).join('\n'));
        }

        return sections.join('\n\n');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ UTILITIES ═══
    // ═══════════════════════════════════════════════════════════════════════

    _readFile(relPath) {
        const absPath = path.join(this._root, relPath);

        const cached = this._cache.get(relPath);
        try {
            const stat = fs.statSync(absPath);
            if (cached && cached.mtime >= stat.mtimeMs) {
                this._stats.cacheHits++;
                return cached.content;
            }

            this._stats.cacheMisses++;
            const content = fs.readFileSync(absPath, 'utf8');
            this._cache.set(relPath, {
                content,
                mtime: stat.mtimeMs,
                tokens: Math.ceil(content.length / 4),
            });

            // LRU eviction
            if (this._cache.size > MAX_CACHE_SIZE) {
                const oldest = this._cache.keys().next().value;
                this._cache.delete(oldest);
            }

            return content;
        } catch (_) {
            return null;
        }
    }

    _truncate(content, maxChars) {
        if (content.length <= maxChars) return content;
        return content.slice(0, maxChars) + '\n... [truncated]';
    }

    _extractKeywords(text) {
        return (text || '')
            .toLowerCase()
            .split(/[\s\W]+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    }

    /** Invalidate the workspace index (call after significant changes) */
    invalidate() {
        this._fileIndex = null;
        this._dirty = true;
        this._cache.clear();
    }

    /** Get service health stats */
    getStats() {
        return {
            ...this._stats,
            indexVersion: this._indexVersion,
            cacheSize: this._cache.size,
            fileIndexSize: this._fileIndex
                ? (this._fileIndex.files.length + this._fileIndex.configs.length + this._fileIndex.schemas.length)
                : 0,
            vectorMemoryStats: this._vectorMemory?.stats() || null,
            alwaysOn: this._alwaysOn,
        };
    }
}

// ─── Stop Words ──────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are',
    'was', 'has', 'had', 'not', 'but', 'all', 'can', 'her',
    'will', 'one', 'each', 'make', 'like', 'use', 'build',
    'create', 'add', 'new', 'file', 'code', 'function',
    'should', 'would', 'could', 'also', 'need', 'want',
    'just', 'get', 'set', 'run', 'let', 'var', 'const',
]);

// ─── Singleton Factory ──────────────────────────────────────────────────────

let _instance = null;

/**
 * Get or create the singleton AutoContext instance.
 * Call this everywhere to ensure a single always-on service.
 */
function getAutoContext(opts = {}) {
    if (!_instance && opts.workspaceRoot) {
        _instance = new HeadyAutoContext(opts);
    }
    return _instance;
}

/**
 * Wire AutoContext into an InferenceGateway instance.
 * After calling this, ALL gateway.complete() calls get auto-context.
 */
function wireGateway(gateway, autoContext) {
    if (!gateway || !autoContext) return;

    const originalComplete = gateway.complete.bind(gateway);
    const originalBattle = gateway.battle?.bind(gateway);
    const originalRace = gateway.race?.bind(gateway);

    // Wrap complete()
    gateway.complete = async function (messages, opts = {}) {
        const enriched = await autoContext.createMiddleware()(messages, opts);
        return originalComplete(enriched, opts);
    };

    // Wrap battle()
    if (originalBattle) {
        gateway.battle = async function (messages, opts = {}) {
            const { enrichedPrompt } = await autoContext.enrichForBattle(
                messages.find(m => m.role === 'user')?.content || '',
                opts
            );
            const enrichedMessages = messages.map(m =>
                m.role === 'user' ? { ...m, content: enrichedPrompt } : m
            );
            return originalBattle(enrichedMessages, opts);
        };
    }

    // Wrap race()
    if (originalRace) {
        gateway.race = async function (messages, opts = {}) {
            const enriched = await autoContext.createMiddleware()(messages, opts);
            return originalRace(enriched, opts);
        };
    }

    logger.info('[AutoContext] Wired into InferenceGateway (complete, battle, race)');
    return gateway;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
    HeadyAutoContext,
    ContextSource,
    getAutoContext,
    wireGateway,
    CSL_GATES,
};
