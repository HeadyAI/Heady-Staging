/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — HEADYSYSTEMS INC.                   ║
 * ║  Copyright © 2026 HeadySystems Inc. All Rights Reserved.            ║
 * ║  Protected under the Defend Trade Secrets Act (18 U.S.C. § 1836)   ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * HeadyResearchPipeline — AutoContext-Enriched Research via Perplexity
 * ════════════════════════════════════════════════════════════════════════
 *
 * Chains HeadyAutoContext workspace scanning → Perplexity Sonar Pro
 * so every research query includes full Heady ecosystem context:
 *   - 27 domains, 21-stage HCFP, 51 provisional patents
 *   - CSL-gated relevance from workspace vector memory
 *   - Prior build patterns and architecture decisions
 *
 * Flow:
 *   1. AutoContext.enrich(task, {domain:'research'}) → workspace context
 *   2. Build enriched system prompt with Heady identity + architecture
 *   3. Send to Perplexity Sonar Pro with enriched context
 *   4. Return citations + sources + grounded result
 *
 * @module HeadyResearchPipeline
 */

'use strict';

const path = require('path');

// ─── Safe Imports ───────────────────────────────────────────────────────────
let logger;
try { logger = require('../../shared/logger')('research-pipeline'); } catch (_) {
    try { logger = require('../utils/logger'); } catch (__) {
        logger = { info: console.log, warn: console.warn, error: console.error, debug: () => { } };
    }
}

let HeadyAutoContext;
try { ({ HeadyAutoContext } = require('./heady-auto-context')); } catch (_) { HeadyAutoContext = null; }

// ─── Constants (φ-scaled) ───────────────────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 1 / PHI;  // ≈ 0.618
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

/** Max enriched context tokens to inject into research query */
const MAX_CONTEXT_TOKENS = FIB[10] * 10; // 890 tokens

/** Minimum CSL gate for source inclusion */
const CSL_INCLUDE = PSI * PSI; // ≈ 0.382

// ─── Heady Identity Context (always injected) ──────────────────────────────
const HEADY_IDENTITY_CONTEXT = `
You are researching for Heady™ — a sovereign AI operating system.

HEADY ECOSYSTEM CONTEXT:
- Founder: Eric Haywood | IP: 51 Provisional Patents
- Architecture: Concurrent-Equals, φ-Scaled (${PHI}), CSL-Gated
- Pipeline: 21-stage HCFullPipeline (fib(8)) cognitive pipeline
- Services: 50+ microservices, 15+ branded websites
- Domains: headyme.com, headysystems.com, headyapi.com, headyconnection.org,
  headybuddy.org, headymcp.com, headyio.com, headybot.com, heady-ai.com,
  headyos.com, perfecttrader.com, headysense.com, headyfinance.com,
  headyex.com, headyconnection.com
- Infrastructure: Google Cloud Run + Cloudflare Workers + pgvector
- Auth: 25 OAuth/API-key providers (Google, GitHub, Microsoft, Apple, OpenAI, Claude, etc.)
- Features: HeadyBuddy AI companion, HeadyBattle Arena, HeadyMCP server,
  HeadyAutoContext (always-on 384-dim vector memory), Sacred Geometry SDK

CSL GATES (Continuous Semantic Logic):
- include: ${(PSI * PSI).toFixed(3)} (minimum relevance)
- boost: ${PSI.toFixed(3)} (high relevance)
- critical: ${(PSI + 0.1).toFixed(3)} (always included)

RESEARCH REQUIREMENTS:
- Results MUST be specific to the Heady architecture
- Prefer production-proven patterns over theoretical
- Include exact GitHub repo URLs when possible
- Include exact CLI commands for deployment
- Reference real-world SaaS platforms as patterns to follow
`.trim();

/**
 * HeadyResearchPipeline — Context-enriched research engine
 */
class HeadyResearchPipeline {

    /**
     * @param {Object} opts
     * @param {string} opts.workspaceRoot - Project root directory
     * @param {Function} [opts.perplexityFn] - Function to call Perplexity API
     * @param {Object} [opts.autoContext] - Existing HeadyAutoContext instance
     * @param {string} [opts.model] - Perplexity model (default: sonar-pro)
     */
    constructor(opts = {}) {
        this._root = opts.workspaceRoot || process.cwd();
        this._perplexityFn = opts.perplexityFn || null;
        this._model = opts.model || 'sonar-pro';

        // Initialize or reuse AutoContext
        this._autoContext = opts.autoContext || null;
        if (!this._autoContext && HeadyAutoContext) {
            try {
                this._autoContext = new HeadyAutoContext({
                    workspaceRoot: this._root,
                    alwaysOn: false, // Don't start background indexer for research
                });
            } catch (e) {
                logger.warn('[ResearchPipeline] AutoContext init failed:', e.message);
            }
        }

        this._stats = {
            totalQueries: 0,
            avgEnrichTimeMs: 0,
            avgSourcesInjected: 0,
            totalCitationsReturned: 0,
        };

        logger.info('[ResearchPipeline] Initialized', {
            workspaceRoot: this._root,
            autoContext: !!this._autoContext,
            perplexity: !!this._perplexityFn,
            model: this._model,
        });
    }

    /**
     * Execute an AutoContext-enriched research query.
     *
     * @param {string} query - The research question
     * @param {Object} [opts]
     * @param {string} [opts.domain] - Focus domain: 'deploy', 'architecture', 'security', etc.
     * @param {string[]} [opts.focusFiles] - Files to inject as context
     * @param {boolean} [opts.deep] - Deep enrichment mode
     * @param {string} [opts.model] - Override Perplexity model
     * @returns {Object} { enrichedQuery, workspaceContext, result, citations, sources, stats }
     */
    async research(query, opts = {}) {
        const startMs = Date.now();

        // ── Step 1: AutoContext Enrichment ───────────────────────────────
        let workspaceContext = '';
        let sources = [];

        if (this._autoContext) {
            try {
                const enriched = await this._autoContext.enrich(query, {
                    domain: opts.domain || 'research',
                    focusFiles: opts.focusFiles,
                    deep: opts.deep !== false,
                    vectorSearch: true,
                });

                workspaceContext = enriched.systemContext || '';
                sources = enriched.sources || [];

                logger.info('[ResearchPipeline] AutoContext enriched', {
                    sourcesIncluded: sources.length,
                    tokensUsed: enriched.stats?.tokensUsed || 0,
                    scanTimeMs: enriched.stats?.scanTimeMs || 0,
                });
            } catch (e) {
                logger.warn('[ResearchPipeline] AutoContext enrich failed:', e.message);
            }
        }

        // ── Step 2: Build Enriched System Prompt ─────────────────────────
        const systemParts = [HEADY_IDENTITY_CONTEXT];

        if (workspaceContext) {
            // Truncate workspace context to budget
            const truncated = workspaceContext.length > MAX_CONTEXT_TOKENS * 4
                ? workspaceContext.slice(0, MAX_CONTEXT_TOKENS * 4) + '\n... (truncated)'
                : workspaceContext;
            systemParts.push(`\nWORKSPACE CONTEXT (from HeadyAutoContext):\n${truncated}`);
        }

        if (sources.length > 0) {
            const sourceList = sources
                .filter(s => s.relevance >= CSL_INCLUDE)
                .slice(0, FIB[5]) // top 8
                .map(s => `- ${s.path} (relevance: ${s.relevance.toFixed(3)}, type: ${s.type})`)
                .join('\n');
            systemParts.push(`\nRELEVANT FILES:\n${sourceList}`);
        }

        const enrichedSystem = systemParts.join('\n');

        // ── Step 3: Call Perplexity with Enriched Context ────────────────
        let result = null;
        let citations = [];

        if (this._perplexityFn) {
            try {
                const response = await this._perplexityFn({
                    model: opts.model || this._model,
                    messages: [
                        { role: 'system', content: enrichedSystem },
                        { role: 'user', content: query },
                    ],
                });

                result = response?.choices?.[0]?.message?.content || response?.content || response;
                citations = response?.citations || [];

                logger.info('[ResearchPipeline] Perplexity responded', {
                    resultLength: typeof result === 'string' ? result.length : 0,
                    citations: citations.length,
                });
            } catch (e) {
                logger.error('[ResearchPipeline] Perplexity call failed:', e.message);
                result = `Research query prepared but Perplexity call failed: ${e.message}`;
            }
        } else {
            // No Perplexity function — return the enriched query for manual use
            result = null;
            logger.info('[ResearchPipeline] No Perplexity function — returning enriched query only');
        }

        // ── Step 4: Record Stats ─────────────────────────────────────────
        const totalMs = Date.now() - startMs;
        this._stats.totalQueries++;
        this._stats.avgEnrichTimeMs = (
            this._stats.avgEnrichTimeMs * (this._stats.totalQueries - 1) + totalMs
        ) / this._stats.totalQueries;
        this._stats.avgSourcesInjected = (
            this._stats.avgSourcesInjected * (this._stats.totalQueries - 1) + sources.length
        ) / this._stats.totalQueries;
        this._stats.totalCitationsReturned += citations.length;

        return {
            enrichedQuery: `${enrichedSystem}\n\n---\n\n${query}`,
            workspaceContext,
            result,
            citations,
            sources,
            stats: {
                totalMs,
                sourcesInjected: sources.length,
                contextTokens: Math.ceil(enrichedSystem.length / 4),
                citationsReturned: citations.length,
                model: opts.model || this._model,
            },
        };
    }

    /**
     * Research with a specific architecture focus.
     * Pre-sets domain + focus files for deployment research.
     */
    async researchDeployment(query, opts = {}) {
        return this.research(query, {
            ...opts,
            domain: 'deploy',
            focusFiles: [
                'src/core/dynamic-site-server.js',
                'cloudbuild.yaml',
                'Dockerfile',
                'shared/security-headers.js',
                ...(opts.focusFiles || []),
            ],
        });
    }

    /**
     * Research with security focus.
     */
    async researchSecurity(query, opts = {}) {
        return this.research(query, {
            ...opts,
            domain: 'config',
            focusFiles: [
                'shared/security-headers.js',
                'shared/rate-limiter.js',
                'src/auth/auth-page-server.js',
                ...(opts.focusFiles || []),
            ],
        });
    }

    /**
     * Research with architecture focus.
     */
    async researchArchitecture(query, opts = {}) {
        return this.research(query, {
            ...opts,
            domain: 'code',
            deep: true,
            focusFiles: [
                'hcfullpipeline.json',
                'src/orchestration/hc-full-pipeline.js',
                'src/agent-orchestrator.js',
                ...(opts.focusFiles || []),
            ],
        });
    }

    /**
     * Get pipeline stats.
     */
    getStats() {
        return {
            ...this._stats,
            autoContextAvailable: !!this._autoContext,
            perplexityAvailable: !!this._perplexityFn,
        };
    }
}

// ─── Factory ────────────────────────────────────────────────────────────────

let _instance = null;

/**
 * Get or create a singleton research pipeline.
 */
function getResearchPipeline(opts = {}) {
    if (!_instance) {
        _instance = new HeadyResearchPipeline(opts);
    }
    return _instance;
}

module.exports = {
    HeadyResearchPipeline,
    getResearchPipeline,
    HEADY_IDENTITY_CONTEXT,
};
