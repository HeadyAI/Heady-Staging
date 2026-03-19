/**
 * HeadyBattle Service
 * Real competitive evaluation engine — runs identical prompts through multiple
 * AI providers via InferenceGateway and scores outputs.
 * © 2026 Heady™Systems Inc.
 */

'use strict';

const { PHI_TIMING } = require('../shared/phi-math');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const crypto = require('crypto');

// ─── HeadyAutoContext — enrich every battle with workspace context ──────────
let _getAutoContext;
try { ({ getAutoContext: _getAutoContext } = require('./heady-auto-context')); }
catch (_) { _getAutoContext = () => null; }

class HeadyBattleService extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            validationInterval: config.validationInterval || PHI_TIMING.CYCLE,
            maxResults: config.maxResults || 500,
            threshold: config.threshold || 0.7,
            ...config,
        };
        /** @type {Object|null} InferenceGateway instance */
        this._gateway = config.gateway || null;
        this.isRunning = false;
        this.battleCount = 0;
        this.results = [];
        this._interval = null;
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        logger.info('[HeadyBattle] Service started', {
            gatewayConnected: !!this._gateway,
        });
        this.emit('started');
    }

    async stop() {
        if (!this.isRunning) return;
        this.isRunning = false;

        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }

        logger.info('[HeadyBattle] Service stopped');
        this.emit('stopped');
    }

    /**
     * Run a competitive battle: send identical prompt to all available providers,
     * collect outputs, score and rank them.
     *
     * @param {string} prompt - The prompt to send to all providers
     * @param {Object} [opts] - Options
     * @param {string} [opts.metric='quality'] - Metric to optimize
     * @param {number} [opts.temperature=0.7] - Temperature for generation
     * @returns {Object} Battle result with winner, contestants, and scores
     */
    async battle(prompt, opts = {}) {
        if (!prompt || typeof prompt !== 'string') {
            return { ok: false, error: 'Prompt string required' };
        }

        this.battleCount++;
        const battleId = `battle-${this.battleCount}-${Date.now()}`;
        const metric = opts.metric || 'quality';

        // If gateway connected, run real battle
        if (this._gateway) {
            const available = this._gateway.getAvailable();
            if (available.length === 0) {
                return { ok: false, error: 'No AI providers available' };
            }

            logger.info('[HeadyBattle] Starting real battle', {
                id: battleId,
                providers: available,
                prompt: prompt.slice(0, 80),
            });

            // ── AutoContext enrichment — inject workspace context BEFORE battle ──
            let enrichedPrompt = prompt;
            let contextStats = null;
            const autoCtx = _getAutoContext();
            if (autoCtx) {
                try {
                    const enrichResult = await autoCtx.enrichForBattle(prompt, opts);
                    enrichedPrompt = enrichResult.enrichedPrompt || prompt;
                    contextStats = enrichResult.stats;
                    logger.info('[HeadyBattle] AutoContext enriched', contextStats);
                } catch (e) {
                    logger.warn('[HeadyBattle] AutoContext enrich failed (proceeding without):', e.message);
                }
            }

            const messages = [
                { role: 'system', content: 'Provide your best, most complete response. Be concise but thorough.' },
                { role: 'user', content: enrichedPrompt },
            ];

            // Fire at all available providers in parallel
            const startTime = Date.now();
            const contestantResults = await Promise.allSettled(
                available.map(async (providerKey) => {
                    const provStart = Date.now();
                    try {
                        const result = await this._gateway.complete(messages, {
                            provider: providerKey,
                            temperature: opts.temperature || 0.7,
                        });
                        return {
                            provider: providerKey,
                            model: result.model,
                            content: result.content,
                            latencyMs: Date.now() - provStart,
                            contentHash: crypto.createHash('sha256').update(result.content || '').digest('hex').slice(0, 16),
                            contentLength: (result.content || '').length,
                            usage: result.usage || null,
                            ok: true,
                        };
                    } catch (err) {
                        return {
                            provider: providerKey,
                            model: null,
                            content: null,
                            latencyMs: Date.now() - provStart,
                            error: err.message,
                            ok: false,
                        };
                    }
                })
            );

            const contestants = contestantResults
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);

            const successful = contestants.filter(c => c.ok);
            const totalMs = Date.now() - startTime;

            // Score contestants
            const scored = successful.map(c => ({
                ...c,
                battleScore: this._scoreOutput(c, metric),
            }));

            scored.sort((a, b) => b.battleScore - a.battleScore);
            const winner = scored[0] || null;

            const result = {
                id: battleId,
                ts: new Date().toISOString(),
                prompt: prompt.slice(0, 200),
                winner,
                contestants: scored,
                failed: contestants.filter(c => !c.ok),
                totalMs,
                metric,
                validated: winner ? winner.battleScore >= this.config.threshold : false,
                providerCount: available.length,
                successCount: successful.length,
            };

            this.results.push(result);
            if (this.results.length > this.config.maxResults) {
                this.results.shift();
            }

            this.emit('battle:complete', result);
            logger.info('[HeadyBattle] Battle complete', {
                id: battleId,
                winner: winner?.provider,
                score: winner?.battleScore,
                totalMs,
            });

            return { ok: true, ...result };
        }

        // Fallback: no gateway — basic candidate comparison
        return { ok: false, error: 'No InferenceGateway connected' };
    }

    /**
     * Score an output based on heuristics.
     * In future: use an LLM-as-judge or embedding-based scoring.
     */
    _scoreOutput(contestant, metric) {
        if (!contestant.ok || !contestant.content) return 0;
        const len = contestant.content.length;

        switch (metric) {
            case 'speed':
                // Lower latency = higher score
                return Math.max(0, 1 - (contestant.latencyMs / PHI_TIMING.CYCLE));
            case 'detail':
                // More content = higher score (diminishing returns)
                return Math.min(1, len / 2000);
            case 'quality':
            default:
                // Balanced: content length + speed penalty
                const contentScore = Math.min(1, len / 1500);
                const speedScore = Math.max(0, 1 - (contestant.latencyMs / 20000));
                return contentScore * 0.7 + speedScore * 0.3;
        }
    }

    /**
     * Run Monte Carlo determinism test: same prompt N times on same provider.
     * Measures output variance to quantify determinism.
     *
     * @param {string} prompt - Prompt to test
     * @param {Object} [opts] - Options
     * @param {number} [opts.iterations=5] - Number of iterations
     * @param {string} [opts.provider] - Specific provider to test (or all)
     * @param {number} [opts.temperature=0] - Temperature (0 = most deterministic)
     * @returns {Object} Determinism report
     */
    async determinismTest(prompt, opts = {}) {
        if (!this._gateway) {
            return { ok: false, error: 'No InferenceGateway connected' };
        }

        const iterations = opts.iterations || 5;
        const temperature = opts.temperature ?? 0;
        const providers = opts.provider
            ? [opts.provider]
            : this._gateway.getAvailable();

        const report = {
            id: `determinism-${Date.now()}`,
            ts: new Date().toISOString(),
            prompt: prompt.slice(0, 200),
            iterations,
            temperature,
            providers: {},
        };

        for (const provider of providers) {
            const messages = [
                { role: 'user', content: prompt },
            ];

            const outputs = [];
            for (let i = 0; i < iterations; i++) {
                try {
                    // Reset circuit breakers between iterations
                    const result = await this._gateway.complete(messages, {
                        provider,
                        temperature,
                    });
                    const hash = crypto.createHash('sha256')
                        .update(result.content || '')
                        .digest('hex');
                    outputs.push({
                        iteration: i + 1,
                        content: result.content,
                        hash,
                        model: result.model,
                        latencyMs: result.gatewayLatencyMs,
                    });
                } catch (err) {
                    outputs.push({
                        iteration: i + 1,
                        error: err.message,
                        hash: null,
                    });
                }
            }

            // Calculate determinism metrics
            const successful = outputs.filter(o => o.hash);
            const hashes = successful.map(o => o.hash);
            const uniqueHashes = [...new Set(hashes)];
            const determinismScore = successful.length > 0
                ? 1 - ((uniqueHashes.length - 1) / Math.max(1, successful.length - 1))
                : 0;

            // Find the canonical (most common) output
            const hashCounts = {};
            hashes.forEach(h => { hashCounts[h] = (hashCounts[h] || 0) + 1; });
            const canonicalHash = Object.entries(hashCounts)
                .sort((a, b) => b[1] - a[1])[0]?.[0];
            const canonicalOutput = successful.find(o => o.hash === canonicalHash);

            report.providers[provider] = {
                iterations: outputs.length,
                successful: successful.length,
                uniqueOutputs: uniqueHashes.length,
                determinismScore: parseFloat(determinismScore.toFixed(4)),
                canonicalHash: canonicalHash || null,
                canonicalContent: canonicalOutput?.content?.slice(0, 500) || null,
                avgLatencyMs: successful.length > 0
                    ? Math.round(successful.reduce((s, o) => s + (o.latencyMs || 0), 0) / successful.length)
                    : null,
                outputs: outputs.map(o => ({
                    iteration: o.iteration,
                    hash: o.hash?.slice(0, 16),
                    latencyMs: o.latencyMs,
                    matchesCanonical: o.hash === canonicalHash,
                    error: o.error || null,
                })),
            };
        }

        // Overall determinism across all providers
        const allScores = Object.values(report.providers).map(p => p.determinismScore);
        report.overallDeterminism = allScores.length > 0
            ? parseFloat((allScores.reduce((s, v) => s + v, 0) / allScores.length).toFixed(4))
            : 0;

        this.results.push(report);
        this.emit('determinism:complete', report);

        return { ok: true, ...report };
    }

    /**
     * Get current validation metrics.
     */
    getMetrics() {
        return {
            service: 'HeadyBattle',
            running: this.isRunning,
            battleCount: this.battleCount,
            gatewayConnected: !!this._gateway,
            recentResults: this.results.slice(-10),
        };
    }

    async health() {
        return {
            ok: this.isRunning || !!this._gateway,
            service: 'HeadyBattle',
            battleCount: this.battleCount,
            gatewayConnected: !!this._gateway,
            ts: new Date().toISOString(),
        };
    }
}

function getHeadyBattleService(config = {}) {
    return new HeadyBattleService(config);
}

module.exports = { getHeadyBattleService, HeadyBattleService };
