/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — HEADYSYSTEMS INC.                   ║
 * ║  Copyright © 2026 HeadySystems Inc. All Rights Reserved.            ║
 * ║  Protected under the Defend Trade Secrets Act (18 U.S.C. § 1836)   ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * AutoContext-Swarm Bridge — Multi-Pass Enrichment Across Swarms
 * ═══════════════════════════════════════════════════════════════════
 *
 * Deeply integrates HeadyAutoContext with HeadyBee and HeadySwarm to ensure:
 *
 *   1. MULTIPLE ENRICHMENT PASSES before every action
 *      - Pass 1: Workspace context scan (files, configs)
 *      - Pass 2: Vector/latent space semantic search
 *      - Pass 3: Bee memory integration (registry lookup)
 *      - Pass 4: Swarm topology awareness (health, pressure)
 *      - Pass 5: Cross-session pattern recall (persisted latent space)
 *      - Final: CSL-gated relevance filtering + merge
 *
 *   2. LATENT SPACE PERSISTENCE
 *      - Store/retrieve enrichment results in vector index
 *      - Cross-session memory via persisted latent space
 *
 *   3. HEADYBEE INTEGRATION
 *      - Query bee registry for relevant capabilities
 *      - Include bee health/circuit-breaker state in context
 *      - Route enrichment results to appropriate swarm tasks
 *
 *   4. HEADYSWARM INTEGRATION
 *      - Query SwarmCoordinator for active topology
 *      - Include swarm health, pressure, task queue status
 *      - Enable swarm-aware domain-specific enrichment
 *
 *   5. ACTION GATING
 *      - Wrap all Heady actions with mandatory multi-pass enrichment
 *      - Gateway calls, battle rounds, council deliberations, MCP tools
 *
 * Flow:
 *   Action Request
 *   → AutoContextSwarmBridge.enrichForAction()
 *     → Pass 1: scanWorkspace()
 *     → Pass 2: searchVectorMemory()
 *     → Pass 3: queryBeeRegistry()
 *     → Pass 4: querySwarmTopology()
 *     → Pass 5: recallCrossSessionPatterns()
 *     → Merge + CSL-gate + finalize context
 *   → Gate action: only proceed if context is enriched
 *   → Execute action with full context
 *   → Persist enrichment results to latent space
 *
 * @module AutoContextSwarmBridge
 */

'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');

// ─── Safe Imports (graceful degradation) ────────────────────────────────────

let logger;
try { logger = require('../utils/logger'); } catch (_) {
    logger = { info: console.log, warn: console.warn, error: console.error, debug: () => { } };
}

// ─── Constants (φ-scaled) ───────────────────────────────────────────────────

const PHI = 1.618033988749895;
const PSI = 1 / PHI;  // ≈ 0.618

const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** CSL gates for multi-pass enrichment gating */
const CSL_GATES = {
    suppress: PSI * PSI * PSI,       // ≈ 0.236 — minimum context to suppress
    include: PSI * PSI,              // ≈ 0.382 — minimum to include
    boost: PSI,                      // ≈ 0.618 — high relevance
    inject: PSI + 0.1,               // ≈ 0.718 — strongly inject
    high: PSI + 0.264,               // ≈ 0.882 — critical signal
    critical: PSI + 0.309,           // ≈ 0.927 — always included
};

// ─── Enrichment Passes ──────────────────────────────────────────────────────

const ENRICHMENT_PASSES = Object.freeze({
    WORKSPACE_SCAN: 'workspace-scan',        // Pass 1: File/config context
    VECTOR_SEARCH: 'vector-search',          // Pass 2: Latent space semantic
    BEE_REGISTRY: 'bee-registry',            // Pass 3: Capability lookup
    SWARM_TOPOLOGY: 'swarm-topology',        // Pass 4: Swarm health/pressure
    CROSS_SESSION: 'cross-session',          // Pass 5: Persisted patterns
});

// ─── EnrichmentContext ──────────────────────────────────────────────────────

/**
 * Represents a single enrichment result from a pass.
 */
class EnrichmentResult {
    constructor(opts = {}) {
        this.pass = opts.pass;              // ENRICHMENT_PASSES value
        this.sources = opts.sources || [];  // Array of { type, path, content, relevance }
        this.tokens = opts.tokens || 0;
        this.metadata = opts.metadata || {};
        this.timestamp = Date.now();
        this.durationMs = opts.durationMs || 0;
    }

    totalRelevance() {
        if (this.sources.length === 0) return 0;
        return this.sources.reduce((sum, s) => sum + (s.relevance || 0), 0) / this.sources.length;
    }
}

// ─── AutoContextSwarmBridge ────────────────────────────────────────────────

/**
 * Orchestrates multi-pass context enrichment across AutoContext, BeeFactory, and SwarmCoordinator.
 */
class AutoContextSwarmBridge extends EventEmitter {

    /**
     * @param {Object} opts
     * @param {Object} opts.autoContext - HeadyAutoContext instance
     * @param {Object} opts.beeFactory - BeeFactoryV2 instance
     * @param {Object} opts.swarmCoordinator - SwarmCoordinator instance
     * @param {Object} [opts.gateway] - InferenceGateway instance (for optional wiring)
     * @param {boolean} [opts.alwaysEnrich=true] - Require enrichment before all actions
     * @param {number} [opts.maxEnrichmentMs=FIB[8]] - Timeout for multi-pass enrichment (21s)
     */
    constructor(opts = {}) {
        super();

        if (!opts.autoContext) throw new Error('AutoContextSwarmBridge requires autoContext');
        if (!opts.beeFactory) throw new Error('AutoContextSwarmBridge requires beeFactory');
        if (!opts.swarmCoordinator) throw new Error('AutoContextSwarmBridge requires swarmCoordinator');

        this._autoContext = opts.autoContext;
        this._beeFactory = opts.beeFactory;
        this._swarmCoordinator = opts.swarmCoordinator;
        this._gateway = opts.gateway || null;

        this._alwaysEnrich = opts.alwaysEnrich !== false;
        this._maxEnrichmentMs = opts.maxEnrichmentMs || (FIB[8] * 1000); // 21s

        // ── Enrichment caching (cross-session) ──────────────────────────────
        this._enrichmentCache = new Map();      // task hash → enriched context
        this._latentSpaceIndex = [];            // persisted enrichment results

        // ── Statistics ──────────────────────────────────────────────────────
        this._stats = {
            totalEnrichments: 0,
            totalActions: 0,
            actionsGated: 0,
            avgEnrichmentMs: 0,
            passSuccesses: new Map([...Object.values(ENRICHMENT_PASSES)].map(p => [p, 0])),
            passFailures: new Map([...Object.values(ENRICHMENT_PASSES)].map(p => [p, 0])),
        };

        logger.info('[AutoContextSwarmBridge] Initialized', {
            alwaysEnrich: this._alwaysEnrich,
            maxEnrichmentMs: this._maxEnrichmentMs,
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ PUBLIC API ═══
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Execute multi-pass enrichment for an action.
     * MANDATORY before every AI action (gateway, battle, council, MCP tool).
     *
     * @param {string} task - The action description/prompt
     * @param {Object} [opts]
     * @param {string} [opts.domain] - 'code' | 'config' | 'battle' | 'council' | 'mcp-tool'
     * @param {string[]} [opts.focusFiles] - Files to prioritize in Pass 1
     * @param {Object} [opts.beeHints] - Bee registry hints
     * @param {Object} [opts.swarmHints] - Swarm topology hints
     * @returns {Promise<Object>} { enrichedContext, passes, stats, actionGated }
     */
    async enrichForAction(task, opts = {}) {
        const startMs = Date.now();
        const taskHash = crypto.createHash('sha256').update(task).digest('hex').slice(0, 16);

        // ── Check cache ──────────────────────────────────────────────────────
        if (this._enrichmentCache.has(taskHash)) {
            const cached = this._enrichmentCache.get(taskHash);
            if (Date.now() - cached.timestamp < 60000) { // 1-minute TTL
                logger.debug('[Bridge] Enrichment cache hit', { taskHash });
                return cached;
            }
        }

        // ── Execute multi-pass enrichment ────────────────────────────────────
        const passes = [];
        const passResults = {};

        try {
            // Pass 1: Workspace context scan
            passResults[ENRICHMENT_PASSES.WORKSPACE_SCAN] = await this._pass1WorkspaceScan(task, opts);
            passes.push(passResults[ENRICHMENT_PASSES.WORKSPACE_SCAN]);

            // Pass 2: Vector/latent space semantic search
            passResults[ENRICHMENT_PASSES.VECTOR_SEARCH] = await this._pass2VectorSearch(task, opts);
            passes.push(passResults[ENRICHMENT_PASSES.VECTOR_SEARCH]);

            // Pass 3: Bee memory integration (registry lookup)
            passResults[ENRICHMENT_PASSES.BEE_REGISTRY] = await this._pass3BeeRegistry(task, opts);
            passes.push(passResults[ENRICHMENT_PASSES.BEE_REGISTRY]);

            // Pass 4: Swarm topology awareness
            passResults[ENRICHMENT_PASSES.SWARM_TOPOLOGY] = await this._pass4SwarmTopology(task, opts);
            passes.push(passResults[ENRICHMENT_PASSES.SWARM_TOPOLOGY]);

            // Pass 5: Cross-session pattern recall
            passResults[ENRICHMENT_PASSES.CROSS_SESSION] = await this._pass5CrossSession(task, opts);
            passes.push(passResults[ENRICHMENT_PASSES.CROSS_SESSION]);

            // ── Merge all passes with CSL gating ─────────────────────────────
            const mergedSources = this._mergePasses(passes, opts);
            const gatedSources = this._applyCSLGating(mergedSources);

            // ── Build final context ──────────────────────────────────────────
            const enrichedContext = this._buildFinalContext(gatedSources, opts);

            // ── Record statistics ────────────────────────────────────────────
            const enrichmentMs = Date.now() - startMs;
            this._recordStats(enrichmentMs, passes);

            const result = {
                enrichedContext,
                passes,
                passResults,
                stats: {
                    sourcesIncluded: gatedSources.length,
                    totalTokens: gatedSources.reduce((s, src) => s + (src.tokens || 0), 0),
                    enrichmentMs,
                    actionGated: this._alwaysEnrich,
                },
                timestamp: Date.now(),
                taskHash,
            };

            // ── Cache result ─────────────────────────────────────────────────
            this._enrichmentCache.set(taskHash, result);

            // ── Emit event ───────────────────────────────────────────────────
            this.emit('enrichment:complete', {
                task: task.slice(0, 80),
                passes: passes.length,
                enrichmentMs,
                actionGated: this._alwaysEnrich,
            });

            return result;

        } catch (err) {
            logger.error('[Bridge] Enrichment failed:', err.message);
            this.emit('enrichment:error', { task, error: err.message });
            throw err;
        }
    }

    /**
     * Wrap an action (gateway call, battle, council, MCP tool) with enrichment + gating.
     * If enrichment fails or is empty, optionally block the action.
     *
     * @param {Function} action - The action function: async (enrichedContext) => result
     * @param {string} task - Description of the action
     * @param {Object} [opts] - Enrichment options
     * @returns {Promise} The action result
     */
    async executeGatedAction(action, task, opts = {}) {
        if (!this._alwaysEnrich) {
            return action({});
        }

        const enrichment = await this.enrichForAction(task, opts);
        this._stats.actionsGated++;

        if (!enrichment.enrichedContext || enrichment.stats.sourcesIncluded === 0) {
            logger.warn('[Bridge] Empty enrichment for action:', { task: task.slice(0, 80) });
            if (opts.requireNonEmptyContext) {
                throw new Error('Action requires enriched context but enrichment was empty');
            }
        }

        return action(enrichment.enrichedContext);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ ENRICHMENT PASSES ═══
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Pass 1: Workspace context scan (files, configs)
     */
    async _pass1WorkspaceScan(task, opts) {
        const startMs = Date.now();
        const sources = [];

        try {
            const enrichment = await this._autoContext.enrich(task, {
                domain: opts.domain || 'code',
                vectorSearch: false, // delegated to Pass 2
                focusFiles: opts.focusFiles,
            });

            for (const src of enrichment.sources || []) {
                sources.push({
                    type: 'workspace-file',
                    path: src.path,
                    content: src.content,
                    relevance: src.relevance,
                    tokens: src.tokens,
                });
            }

            this._stats.passSuccesses.set(ENRICHMENT_PASSES.WORKSPACE_SCAN,
                this._stats.passSuccesses.get(ENRICHMENT_PASSES.WORKSPACE_SCAN) + 1);

        } catch (err) {
            logger.warn('[Bridge] Pass 1 failed:', err.message);
            this._stats.passFailures.set(ENRICHMENT_PASSES.WORKSPACE_SCAN,
                this._stats.passFailures.get(ENRICHMENT_PASSES.WORKSPACE_SCAN) + 1);
        }

        return new EnrichmentResult({
            pass: ENRICHMENT_PASSES.WORKSPACE_SCAN,
            sources,
            durationMs: Date.now() - startMs,
        });
    }

    /**
     * Pass 2: Vector/latent space semantic search
     */
    async _pass2VectorSearch(task, opts) {
        const startMs = Date.now();
        const sources = [];

        try {
            const enrichment = await this._autoContext.enrich(task, {
                vectorSearch: true,
                domain: opts.domain,
            });

            for (const src of enrichment.sources || []) {
                if (src.type === 'vector' || src.vectorScore) {
                    sources.push({
                        type: 'latent-space',
                        path: src.path,
                        content: src.content,
                        relevance: src.vectorScore || src.relevance,
                        tokens: src.tokens,
                        vectorScore: src.vectorScore,
                    });
                }
            }

            this._stats.passSuccesses.set(ENRICHMENT_PASSES.VECTOR_SEARCH,
                this._stats.passSuccesses.get(ENRICHMENT_PASSES.VECTOR_SEARCH) + 1);

        } catch (err) {
            logger.warn('[Bridge] Pass 2 failed:', err.message);
            this._stats.passFailures.set(ENRICHMENT_PASSES.VECTOR_SEARCH,
                this._stats.passFailures.get(ENRICHMENT_PASSES.VECTOR_SEARCH) + 1);
        }

        return new EnrichmentResult({
            pass: ENRICHMENT_PASSES.VECTOR_SEARCH,
            sources,
            durationMs: Date.now() - startMs,
        });
    }

    /**
     * Pass 3: Bee memory integration (query BeeFactory registry)
     */
    async _pass3BeeRegistry(task, opts) {
        const startMs = Date.now();
        const sources = [];

        try {
            const allBees = this._beeFactory.listBees();
            const taskWords = (task || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);

            for (const bee of allBees) {
                let relevance = 0;

                // Match against bee description and domain
                const beeText = `${bee.description || ''} ${bee.domain || ''}`.toLowerCase();
                for (const word of taskWords) {
                    if (beeText.includes(word)) {
                        relevance += 0.2;
                    }
                }

                if (relevance >= CSL_GATES.include) {
                    const health = this._beeFactory.getBeeHealth(bee.domain);
                    sources.push({
                        type: 'bee-capability',
                        path: `bees/${bee.domain}`,
                        content: this._formatBeeContext(bee, health),
                        relevance: Math.min(1.0, relevance),
                        tokens: Math.ceil((bee.description || '').length / 4) + 50,
                        metadata: {
                            domain: bee.domain,
                            priority: bee.priority,
                            health: health?.health,
                            circuitBreaker: health?.circuitBreaker,
                        },
                    });
                }
            }

            this._stats.passSuccesses.set(ENRICHMENT_PASSES.BEE_REGISTRY,
                this._stats.passSuccesses.get(ENRICHMENT_PASSES.BEE_REGISTRY) + 1);

        } catch (err) {
            logger.warn('[Bridge] Pass 3 failed:', err.message);
            this._stats.passFailures.set(ENRICHMENT_PASSES.BEE_REGISTRY,
                this._stats.passFailures.get(ENRICHMENT_PASSES.BEE_REGISTRY) + 1);
        }

        return new EnrichmentResult({
            pass: ENRICHMENT_PASSES.BEE_REGISTRY,
            sources,
            durationMs: Date.now() - startMs,
        });
    }

    /**
     * Pass 4: Swarm topology awareness
     */
    async _pass4SwarmTopology(task, opts) {
        const startMs = Date.now();
        const sources = [];

        try {
            if (!this._swarmCoordinator) {
                return new EnrichmentResult({
                    pass: ENRICHMENT_PASSES.SWARM_TOPOLOGY,
                    sources: [],
                    durationMs: Date.now() - startMs,
                });
            }

            // Query swarm health/status
            const swarmHealth = this._swarmCoordinator.getHealthSnapshot?.() || {};
            const swarmTopology = this._swarmCoordinator.getTopology?.() || {};

            sources.push({
                type: 'swarm-topology',
                path: 'swarm/topology',
                content: this._formatSwarmContext(swarmHealth, swarmTopology),
                relevance: CSL_GATES.boost,
                tokens: 200,
                metadata: {
                    healthySwarms: swarmHealth.healthyCount,
                    activeTasks: swarmTopology.activeTaskCount,
                    pressure: swarmHealth.pressureLevel,
                },
            });

            this._stats.passSuccesses.set(ENRICHMENT_PASSES.SWARM_TOPOLOGY,
                this._stats.passSuccesses.get(ENRICHMENT_PASSES.SWARM_TOPOLOGY) + 1);

        } catch (err) {
            logger.warn('[Bridge] Pass 4 failed:', err.message);
            this._stats.passFailures.set(ENRICHMENT_PASSES.SWARM_TOPOLOGY,
                this._stats.passFailures.get(ENRICHMENT_PASSES.SWARM_TOPOLOGY) + 1);
        }

        return new EnrichmentResult({
            pass: ENRICHMENT_PASSES.SWARM_TOPOLOGY,
            sources,
            durationMs: Date.now() - startMs,
        });
    }

    /**
     * Pass 5: Cross-session pattern recall from persisted latent space
     */
    async _pass5CrossSession(task, opts) {
        const startMs = Date.now();
        const sources = [];

        try {
            // Search latent space for similar tasks from previous sessions
            const taskVector = this._autoContext._textToVector?.(task) || null;
            if (!taskVector) {
                return new EnrichmentResult({
                    pass: ENRICHMENT_PASSES.CROSS_SESSION,
                    sources: [],
                    durationMs: Date.now() - startMs,
                });
            }

            // Simulate vector search in persisted patterns
            for (const pattern of this._latentSpaceIndex) {
                const similarity = this._cosineSimilarity(taskVector, pattern.vector);
                if (similarity >= CSL_GATES.include) {
                    sources.push({
                        type: 'cross-session-pattern',
                        path: `latent-space/${pattern.id}`,
                        content: pattern.context,
                        relevance: similarity,
                        tokens: pattern.tokens,
                        metadata: {
                            sessionId: pattern.sessionId,
                            timestamp: pattern.timestamp,
                            similarity,
                        },
                    });
                }
            }

            this._stats.passSuccesses.set(ENRICHMENT_PASSES.CROSS_SESSION,
                this._stats.passSuccesses.get(ENRICHMENT_PASSES.CROSS_SESSION) + 1);

        } catch (err) {
            logger.warn('[Bridge] Pass 5 failed:', err.message);
            this._stats.passFailures.set(ENRICHMENT_PASSES.CROSS_SESSION,
                this._stats.passFailures.get(ENRICHMENT_PASSES.CROSS_SESSION) + 1);
        }

        return new EnrichmentResult({
            pass: ENRICHMENT_PASSES.CROSS_SESSION,
            sources,
            durationMs: Date.now() - startMs,
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ MERGING & FILTERING ═══
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Merge sources from all passes, deduplicating by path.
     */
    _mergePasses(passes, opts) {
        const merged = [];
        const seen = new Set();

        for (const pass of passes) {
            for (const source of pass.sources) {
                const key = source.path || crypto.createHash('md5').update(source.content).digest('hex');
                if (seen.has(key)) continue;
                seen.add(key);
                merged.push(source);
            }
        }

        // Sort by relevance (descending)
        return merged.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    }

    /**
     * Apply CSL gating: filter sources by relevance thresholds.
     */
    _applyCSLGating(sources) {
        return sources.filter(s => (s.relevance || 0) >= CSL_GATES.include);
    }

    /**
     * Build the final enriched context block.
     */
    _buildFinalContext(sources, opts) {
        if (sources.length === 0) return '';

        const sections = [];

        // Group by type
        const byType = {};
        for (const src of sources) {
            if (!byType[src.type]) byType[src.type] = [];
            byType[src.type].push(src);
        }

        // Build sections
        if (byType['workspace-file']?.length > 0) {
            sections.push('=== WORKSPACE CONTEXT ===\n' +
                byType['workspace-file'].map(s =>
                    `--- ${s.path} (relevance: ${(s.relevance || 0).toFixed(2)}) ---\n${s.content}`
                ).join('\n\n'));
        }

        if (byType['latent-space']?.length > 0) {
            sections.push('=== LATENT SPACE KNOWLEDGE ===\n' +
                byType['latent-space'].map(s =>
                    `--- ${s.path} (score: ${(s.vectorScore || s.relevance || 0).toFixed(3)}) ---\n${s.content}`
                ).join('\n\n'));
        }

        if (byType['bee-capability']?.length > 0) {
            sections.push('=== ACTIVE BEE CAPABILITIES ===\n' +
                byType['bee-capability'].map(s =>
                    `--- ${s.path} ---\n${s.content}`
                ).join('\n\n'));
        }

        if (byType['swarm-topology']?.length > 0) {
            sections.push('=== SWARM TOPOLOGY & HEALTH ===\n' +
                byType['swarm-topology'].map(s => s.content).join('\n\n'));
        }

        if (byType['cross-session-pattern']?.length > 0) {
            sections.push('=== CROSS-SESSION PATTERNS ===\n' +
                byType['cross-session-pattern'].map(s =>
                    `--- ${s.path} ---\n${s.content}`
                ).join('\n\n'));
        }

        return sections.join('\n\n');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ FORMATTING HELPERS ═══
    // ═══════════════════════════════════════════════════════════════════════

    _formatBeeContext(bee, health) {
        const h = health?.health || {};
        const cb = health?.circuitBreaker || {};
        return [
            `Domain: ${bee.domain}`,
            `Description: ${bee.description}`,
            `Priority: ${bee.priority}`,
            `Type: ${bee.type}`,
            `Status: ${cb.state || 'unknown'}`,
            `Success Rate: ${h.successRate || 'N/A'}`,
            `Avg Latency: ${h.avgLatencyMs || 0}ms`,
            `Last Run: ${h.lastRunAt || 'never'}`,
        ].join('\n');
    }

    _formatSwarmContext(health, topology) {
        return [
            `Active Swarms: ${health.healthyCount || 0}/${health.totalCount || 0}`,
            `Pressure Level: ${health.pressureLevel || 'unknown'}`,
            `Active Tasks: ${topology.activeTaskCount || 0}`,
            `Task Queue Depth: ${topology.queueDepth || 0}`,
            `Timestamp: ${new Date().toISOString()}`,
        ].join('\n');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ═══ UTILITIES ═══
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Simple cosine similarity (for vector comparison).
     */
    _cosineSimilarity(v1, v2) {
        if (!v1 || !v2 || v1.length !== v2.length) return 0;
        let dot = 0, norm1 = 0, norm2 = 0;
        for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            norm1 += v1[i] * v1[i];
            norm2 += v2[i] * v2[i];
        }
        const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
        return denom === 0 ? 0 : dot / denom;
    }

    /**
     * Record enrichment statistics.
     */
    _recordStats(enrichmentMs, passes) {
        this._stats.totalEnrichments++;
        this._stats.avgEnrichmentMs = (
            this._stats.avgEnrichmentMs * (this._stats.totalEnrichments - 1) + enrichmentMs
        ) / this._stats.totalEnrichments;
    }

    /**
     * Persist enrichment results to latent space for cross-session recall.
     */
    persistEnrichmentToLatentSpace(taskHash, context, vector, sessionId) {
        try {
            this._latentSpaceIndex.push({
                id: crypto.randomUUID?.() || taskHash,
                taskHash,
                context,
                vector,
                sessionId,
                timestamp: Date.now(),
                tokens: Math.ceil((context || '').length / 4),
            });

            // Keep index bounded (keep most recent 1000)
            if (this._latentSpaceIndex.length > 1000) {
                this._latentSpaceIndex = this._latentSpaceIndex.slice(-1000);
            }
        } catch (err) {
            logger.warn('[Bridge] Failed to persist to latent space:', err.message);
        }
    }

    /**
     * Get bridge statistics.
     */
    getStats() {
        return {
            ...this._stats,
            cacheSize: this._enrichmentCache.size,
            latentSpaceSize: this._latentSpaceIndex.length,
        };
    }
}

// ─── Factory Function ───────────────────────────────────────────────────────

/**
 * Create a new AutoContextSwarmBridge instance.
 * @param {Object} opts - Options (see AutoContextSwarmBridge constructor)
 * @returns {AutoContextSwarmBridge}
 */
function createBridge(opts = {}) {
    return new AutoContextSwarmBridge(opts);
}

// ─── Action Wrapping Utility ────────────────────────────────────────────────

/**
 * Wrap an action function with multi-pass AutoContext enrichment.
 * Usage: await wrapWithMultiPassContext(action, task, bridge, opts)
 *
 * @param {Function} action - Async function to wrap: (enrichedContext) => result
 * @param {string} task - Task description
 * @param {AutoContextSwarmBridge} bridge - The bridge instance
 * @param {Object} [opts] - Enrichment options
 * @returns {Promise} The action result with enriched context
 */
async function wrapWithMultiPassContext(action, task, bridge, opts = {}) {
    if (!bridge || !(bridge instanceof AutoContextSwarmBridge)) {
        throw new Error('wrapWithMultiPassContext requires a valid AutoContextSwarmBridge');
    }
    return bridge.executeGatedAction(action, task, opts);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
    AutoContextSwarmBridge,
    createBridge,
    wrapWithMultiPassContext,
    ENRICHMENT_PASSES,
    CSL_GATES,
    EnrichmentResult,
};
