/*
 * © 2026 Heady™Systems Inc..
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * CSL Cognitive Filter — Continuous Semantic Logic {-1, 0, +1} Classification
 *
 * Core decision matrix for Buddy's memory routing and swarm computation.
 * Uses CSL gates (continuous sigmoid activation) to classify all signals
 * into three states:
 *   +1 (Core Resonance)  → Persistent truth, commit to K3D vector storage
 *    0 (Ephemeral State)  → Transient noise, volatile Redis cache only
 *   -1 (Repel State)      → Adversarial quarantine, Shadow Index
 */

'use strict';

const EventEmitter = require('events');
const logger = require('../utils/logger');
const CSL = require('../core/semantic-logic');

// ─── CSL States ──────────────────────────────────────────────────────────────
const CSL_STATE = Object.freeze({
    CORE_RESONANCE: +1,  // Persistent truth — commit to K3D
    EPHEMERAL: 0,  // Transient noise — volatile cache only
    REPEL: -1,  // Adversarial quarantine — Shadow Index
});

// ─── CSL Cognitive Filter ────────────────────────────────────────────────────
class CSLCognitiveFilter extends EventEmitter {
    constructor(opts = {}) {
        super();
        this._shadowIndex = [];     // Quarantined -1 signals
        this._resonanceLog = [];    // Committed +1 signals
        this._ephemeralCount = 0;   // Count of 0 signals (not stored)
        this._vectorMemory = opts.vectorMemory || null;
        this._redisCache = opts.redisCache || null;
        this._thresholds = {
            resonanceConfidence: opts.resonanceThreshold || 0.691,   // phiThreshold(1) — LOW
            repelConfidence: opts.repelThreshold || 0.382,           // ψ² ≈ 0.382
            maxShadowSize: opts.maxShadowSize || 610,               // fib(15) = 610
            decayInterval: opts.decayInterval || 3524578,           // fib(33) ≈ 58 min
        };
        this._stats = { classified: 0, resonance: 0, ephemeral: 0, repelled: 0 };

        // Start decay timer for shadow index
        this._decayTimer = setInterval(() => this._decayShadowIndex(), this._thresholds.decayInterval);
        if (this._decayTimer.unref) this._decayTimer.unref();
    }

    /**
     * Classify a signal into {-1, 0, +1} using CSL gates.
     * @param {Object} signal - The input signal to classify
     * @param {string} signal.type - Signal type (e.g., 'user_input', 'agent_output', 'error')
     * @param {*} signal.data - The actual data payload
     * @param {Object} [signal.context] - Additional context
     * @returns {Object} { state: -1|0|+1, action: string, signal }
     */
    classify(signal) {
        this._stats.classified++;
        const features = this._extractFeatures(signal);
        const state = this._applyCSLGate(features);

        const result = { state, features, signal, ts: Date.now() };

        switch (state) {
            case CSL_STATE.CORE_RESONANCE:
                this._handleResonance(result);
                break;
            case CSL_STATE.EPHEMERAL:
                this._handleEphemeral(result);
                break;
            case CSL_STATE.REPEL:
                this._handleRepel(result);
                break;
        }

        this.emit('classified', result);
        return result;
    }

    /**
     * Batch classify an array of signals — sparse computation.
     * Returns only non-zero results (ignores noise).
     */
    sparseClassify(signals) {
        const results = [];
        for (const signal of signals) {
            const result = this.classify(signal);
            if (result.state !== CSL_STATE.EPHEMERAL) {
                results.push(result);
            }
        }
        return results;
    }

    /**
     * Extract classification features from a signal.
     */
    _extractFeatures(signal) {
        const features = {
            confidence: 0.500, // phiThreshold(0) — MINIMUM
            novelty: 0.500,    // phiThreshold(0) — MINIMUM
            adversarial: false,
            verified: false,
            frequency: 0,
            type: signal.type || 'unknown',
        };

        // Confidence from explicit metadata — pipe through CSL Soft Gate
        if (signal.confidence !== undefined) {
            features.confidence = CSL.soft_gate(signal.confidence, 0.500, 13); // fib(7)=13 steepness
        }
        if (signal.verified) features.verified = true;

        // Adversarial detection: failed compilations, blocked prompts, errors
        if (signal.type === 'error' || signal.type === 'blocked' || signal.type === 'compilation_failure') {
            features.adversarial = true;
            features.confidence = Math.min(features.confidence, 0.236); // ψ³ ≈ 0.236
        }

        // High-value: verified proofs, user confirmations, successful actions
        if (signal.type === 'verified_proof' || signal.type === 'user_confirmation' || signal.type === 'action_success') {
            features.verified = true;
            features.confidence = Math.max(features.confidence, 0.882); // phiThreshold(3) — HIGH
        }

        // Novelty scoring: check shadow index for prior similar failures
        const shadowMatch = this._shadowIndex.find(s =>
            s.signal && s.signal.type === signal.type &&
            JSON.stringify(s.signal.data).slice(0, 89) === JSON.stringify(signal.data).slice(0, 89) // fib(11)=89
        );
        if (shadowMatch) {
            features.adversarial = true;
            features.confidence = 0.146; // ψ⁴ — Known bad pattern
            features.frequency = (shadowMatch.frequency || 0) + 1;
        }

        return features;
    }

    /**
     * Apply CSL Gate: {-1, 0, +1} classification.
     * Uses continuous sigmoid activation instead of hard thresholds.
     */
    _applyCSLGate(features) {
        // Forced REPEL for known adversarial signals
        if (features.adversarial) {
            return CSL_STATE.REPEL;
        }

        // Compute effective score: base confidence boosted by verification
        let effectiveScore = features.confidence;
        if (features.verified) effectiveScore = Math.min(1.0, effectiveScore + 0.146); // ψ⁴ ≈ 0.146 boost
        if (features.novelty > 0.691) effectiveScore = Math.min(1.0, effectiveScore + 0.090); // ψ⁵ ≈ 0.090 boost

        // CSL Gate: continuous sigmoid classification
        const gate = CSL.ternary_gate(
            effectiveScore,
            this._thresholds.resonanceConfidence,
            this._thresholds.repelConfidence,
            13  // fib(7)=13 steepness
        );

        // Attach activation metadata for downstream consumers
        features._cslActivation = {
            resonance: gate.resonanceActivation,
            repel: gate.repelActivation,
            raw: gate.raw,
        };

        return gate.state === 1 ? CSL_STATE.CORE_RESONANCE
            : gate.state === -1 ? CSL_STATE.REPEL
                : CSL_STATE.EPHEMERAL;
    }

    /**
     * +1: Core Resonance — commit to K3D vector storage.
     */
    async _handleResonance(result) {
        this._stats.resonance++;
        this._resonanceLog.push({
            ts: result.ts,
            type: result.signal.type,
            confidence: result.features.confidence,
        });

        // Keep resonance log bounded — fib(16)=987 max, trim to fib(13)=233
        if (this._resonanceLog.length > 987) {
            this._resonanceLog = this._resonanceLog.slice(-233);
        }

        // Deep Consolidation Protocol: commit to K3D
        if (this._vectorMemory && typeof this._vectorMemory.ingestMemory === 'function') {
            try {
                await this._vectorMemory.ingestMemory({
                    content: JSON.stringify(result.signal.data),
                    type: 'core_resonance',
                    metadata: {
                        csl_state: +1,
                        confidence: result.features.confidence,
                        source: result.signal.type,
                    },
                });
            } catch (err) {
                logger.error?.(`CSL K3D commit failed: ${err.message}`) ||
                    logger.error(`CSL K3D commit failed: ${err.message}`);
            }
        }

        this.emit('resonance', result);
    }

    /**
     * 0: Ephemeral — volatile cache only, evaporates on session close.
     */
    _handleEphemeral(result) {
        this._stats.ephemeral++;
        this._ephemeralCount++;

        // If Redis is available, store in volatile cache with TTL
        if (this._redisCache && typeof this._redisCache.set === 'function') {
            const key = `csl:ephemeral:${result.ts}`;
            this._redisCache.set(key, JSON.stringify(result.signal.data), 'EX', 233) // fib(13)=233s TTL
                .catch(() => { }); // fire and forget
        }
    }

    /**
     * -1: Repel — quarantine into Shadow Index.
     */
    _handleRepel(result) {
        this._stats.repelled++;

        const shadowEntry = {
            ts: result.ts,
            signal: { type: result.signal.type, data: result.signal.data },
            reason: result.features.adversarial ? 'adversarial_detection' : 'low_confidence',
            confidence: result.features.confidence,
            frequency: result.features.frequency || 1,
        };

        this._shadowIndex.push(shadowEntry);

        // Bound shadow index — fib(15)=610 max
        if (this._shadowIndex.length > this._thresholds.maxShadowSize) {
            this._shadowIndex = this._shadowIndex.slice(-Math.floor(this._thresholds.maxShadowSize / 2));
        }

        this.emit('repel', result);
    }

    /**
     * Decay old shadow entries to prevent stale quarantines.
     */
    _decayShadowIndex() {
        const cutoff = Date.now() - (this._thresholds.decayInterval * 21); // fib(8)=21 decay cycles
        const before = this._shadowIndex.length;
        this._shadowIndex = this._shadowIndex.filter(e => e.ts > cutoff);
        const removed = before - this._shadowIndex.length;
        if (removed > 0) {
            this.emit('shadow_decay', { removed, remaining: this._shadowIndex.length });
        }
    }

    /**
     * Query the Shadow Index for known-bad patterns.
     */
    queryShadowIndex(query) {
        const queryStr = typeof query === 'string' ? query : JSON.stringify(query);
        return this._shadowIndex.filter(entry =>
            JSON.stringify(entry.signal.data).includes(queryStr)
        );
    }

    /**
     * Get CSL cognitive filter stats.
     */
    getStats() {
        return {
            ...this._stats,
            shadowIndexSize: this._shadowIndex.length,
            resonanceLogSize: this._resonanceLog.length,
            ephemeralCount: this._ephemeralCount,
            distribution: {
                resonance: this._stats.classified > 0 ? (this._stats.resonance / this._stats.classified * 100).toFixed(1) + '%' : '0%',
                ephemeral: this._stats.classified > 0 ? (this._stats.ephemeral / this._stats.classified * 100).toFixed(1) + '%' : '0%',
                repelled: this._stats.classified > 0 ? (this._stats.repelled / this._stats.classified * 100).toFixed(1) + '%' : '0%',
            },
        };
    }

    /**
     * Register API routes.
     */
    registerRoutes(app) {
        app.get('/api/v2/csl/stats', (req, res) => res.json({ ok: true, ...this.getStats() }));
        app.get('/api/v2/csl/shadow', (req, res) => {
            const query = req.query.q;
            const results = query ? this.queryShadowIndex(query) : this._shadowIndex.slice(-21); // fib(8)=21
            res.json({ ok: true, count: results.length, entries: results });
        });
        app.post('/api/v2/csl/classify', (req, res) => {
            const result = this.classify(req.body);
            res.json({ ok: true, state: result.state, stateName: ['REPEL', 'EPHEMERAL', 'CORE_RESONANCE'][result.state + 1], features: result.features });
        });
        // Backward-compatible aliases
        app.get('/api/v2/ternary/stats', (req, res) => res.redirect(301, '/api/v2/csl/stats'));
        app.get('/api/v2/ternary/shadow', (req, res) => res.redirect(301, `/api/v2/csl/shadow${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`));
        app.post('/api/v2/ternary/classify', (req, res) => res.redirect(307, '/api/v2/csl/classify'));
    }

    destroy() {
        if (this._decayTimer) clearInterval(this._decayTimer);
    }
}

// Backward-compatible exports
const TernaryDecisionMatrix = CSLCognitiveFilter;
const TERNARY = CSL_STATE;

module.exports = { CSLCognitiveFilter, CSL_STATE, TernaryDecisionMatrix, TERNARY };
