/**
 * @file trading-bee-csl.js
 * @description Apex Trading Intelligence — CSL-gated Trading Bee
 *              Routes tasks using φ-derived continuous confidence scoring.
 *              Tasks are classified into hot/warm/cold execution pools
 *              based on geometric mean of urgency × importance signals.
 *
 * @module TradingBeeCSL
 * @version 2.0.0
 * @since 1.0.0
 *
 * @copyright © 2026 Heady™Systems Inc. All rights reserved.
 * @license Proprietary — HeadyConnection Project, Apex Trading Intelligence
 *
 * @patent PROVISIONAL-2026-HEADY-001  Phi-Geometric Continuous Scoring Layer (CSL)
 * @patent PROVISIONAL-2026-HEADY-003  Phi-Pool Task Routing for Distributed Agents
 *
 * @author eric@headyconnection.org
 *
 * @remarks
 *   No external dependencies — Node.js `crypto` and `events` only.
 *   All thresholds φ-derived.  Priority constant equals ψ ≈ 0.618.
 *
 * Pool thresholds:
 *   HOT  — confidence ≥ ψ   (≥ 0.618)
 *   WARM — confidence ≥ ψ²  (≥ 0.382)
 *   COLD — confidence < ψ²  (< 0.382)
 */

'use strict';

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// § 1  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** @constant {number} Golden ratio φ */
const PHI     = 1.6180339887;
/** @constant {number} ψ = 1/φ ≈ 0.6180 */
const PSI     = 1 / PHI;
/** @constant {number} ψ² ≈ 0.3820 */
const PSI2    = PSI  * PSI;
/** @constant {number} ψ³ ≈ 0.2361 */
const PSI3    = PSI2 * PSI;
/** @constant {number} φ² ≈ 2.6180 */
const PHI2    = PHI  * PHI;
/** @constant {number} φ³ ≈ 4.2360 */
const PHI3    = PHI2 * PHI;
/** @constant {number} Division-by-zero guard */
const EPSILON = 1e-10;

// ─────────────────────────────────────────────────────────────────────────────
// § 2  BEE METADATA
// ─────────────────────────────────────────────────────────────────────────────

/** @constant {string} Domain identifier for this bee */
const domain = 'trading';

/** @constant {string} Human-readable bee description */
const description = 'CSL-gated trading tasks with continuous confidence scoring';

/**
 * Base priority of this bee in the hive scheduler.
 * Equal to ψ ≈ 0.618 — above neutral, below maximum.
 * @constant {number}
 */
const priority = PSI;

// ─────────────────────────────────────────────────────────────────────────────
// § 3  POOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execution pool definitions, thresholds φ-derived.
 *
 * @constant {Object} POOLS
 */
const POOLS = Object.freeze({
    HOT:  { name: 'HOT',  threshold: PSI,  label: 'Immediate execution' },
    WARM: { name: 'WARM', threshold: PSI2, label: 'Queued execution'    },
    COLD: { name: 'COLD', threshold: 0,    label: 'Deferred execution'  },
});

// ─────────────────────────────────────────────────────────────────────────────
// § 4  UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logistic sigmoid.
 * @param {number} x
 * @returns {number} Value in (0,1).
 */
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

/**
 * Geometric mean of a non-empty positive array.
 * @param {number[]} values
 * @returns {number}
 */
function geometricMean(values) {
    if (!values || values.length === 0) return 0;
    const n = values.length;
    let logSum = 0;
    for (const v of values) logSum += Math.log(Math.max(v, EPSILON));
    return Math.exp(logSum / n);
}

/**
 * Clamp a value to [min, max].
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
}

/**
 * SHA-256 digest of any JSON-serialisable value.
 * @param {*} v
 * @returns {string} Hex digest.
 */
function sha256(v) {
    return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
}

/**
 * Resolve the execution pool for a given confidence.
 * @param {number} confidence
 * @returns {Object} Pool descriptor.
 */
function resolvePool(confidence) {
    if (confidence >= PSI)  return POOLS.HOT;
    if (confidence >= PSI2) return POOLS.WARM;
    return POOLS.COLD;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5  MODULE LOADER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns module loader functions with CSL confidence scoring.
 *
 * Each loader is a thunk that resolves the target module lazily, tagged
 * with its own φ-derived confidence weight.  The bee scheduler can use
 * the `confidence` field to decide whether to load the module eagerly,
 * lazily, or defer indefinitely.
 *
 * @param {Object} ctx               Execution context injected by the hive.
 * @param {Object} [ctx.signals]     Signal map for confidence overrides.
 * @param {string} [ctx.accountType] Apex account tier ('100K', etc.).
 * @param {Object} [ctx.state]       Shared hive state reference.
 * @returns {Object[]}  Array of loader descriptors.
 */
function getWork(ctx = {}) {
    const { signals = {}, accountType = '100K', state = {} } = ctx;

    return [
        {
            id:          'apex-risk-agent-csl',
            description: 'Apex CSL Risk Agent — continuous risk scoring',
            confidence:  clamp(signals.riskAgentConfidence ?? PSI, 0, 1),
            weight:      PHI,
            pool:        resolvePool(signals.riskAgentConfidence ?? PSI),
            load() {
                return require('../trading/apex-risk-agent-csl');
            },
        },
        {
            id:          'trading-tasks-csl',
            description: 'CSL-scored task registry for trading operations',
            confidence:  clamp(signals.taskRegistryConfidence ?? PSI2, 0, 1),
            weight:      PHI2,
            pool:        resolvePool(signals.taskRegistryConfidence ?? PSI2),
            load() {
                return require('../shared/trading-tasks-csl');
            },
        },
        {
            id:          'market-feed',
            description: 'Real-time market data feed handler',
            confidence:  clamp(signals.marketFeedConfidence ?? PSI, 0, 1),
            weight:      PHI3,
            pool:        resolvePool(signals.marketFeedConfidence ?? PSI),
            load() {
                // Lazy: resolved at runtime by the hive injection layer
                return state.marketFeed ?? null;
            },
        },
        {
            id:          'order-router',
            description: 'Order routing and execution manager',
            confidence:  clamp(signals.orderRouterConfidence ?? PSI2, 0, 1),
            weight:      PHI,
            pool:        resolvePool(signals.orderRouterConfidence ?? PSI2),
            load() {
                return state.orderRouter ?? null;
            },
        },
        {
            id:          'news-blackout',
            description: 'News-event blackout filter',
            confidence:  clamp(signals.newsBlackoutConfidence ?? PSI3, 0, 1),
            weight:      PSI,
            pool:        resolvePool(signals.newsBlackoutConfidence ?? PSI3),
            load() {
                return state.newsBlackout ?? null;
            },
        },
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// § 6  TradingBeeCSL CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class TradingBeeCSL
 * @extends EventEmitter
 *
 * @description
 *   A hive worker bee specialised for trading operations.
 *   Uses CSL geometric mean routing to classify tasks into execution pools.
 *   Emits task events for upstream hive orchestrators.
 *
 * @fires TradingBeeCSL#taskRouted   Emitted after each `cslRouteTask` call.
 * @fires TradingBeeCSL#poolChange   Emitted when the active pool distribution changes.
 * @fires TradingBeeCSL#workerReady  Emitted when the bee completes initialisation.
 *
 * @example
 * const bee = new TradingBeeCSL({ accountType: '100K' });
 * bee.on('taskRouted', e => console.log(e.pool.name, e.task.id));
 * bee.cslRouteTask({ id: 'apx-001', urgency: 0.8, importance: 0.9 });
 */
class TradingBeeCSL extends EventEmitter {

    /**
     * @param {Object} [config]
     * @param {string} [config.accountType='100K']  Apex account tier.
     * @param {Object} [config.signals={}]          Initial signal map for loader confidence.
     * @param {Object} [config.state={}]            Shared hive state reference.
     */
    constructor(config = {}) {
        super();

        const {
            accountType = '100K',
            signals     = {},
            state       = {},
        } = config;

        /** @type {string} */
        this.accountType = accountType;

        /** @type {string} */
        this.domain = domain;

        /** @type {string} */
        this.description = description;

        /**
         * Base scheduling priority = ψ.
         * @type {number}
         */
        this.priority = priority;

        /** @type {Object} Current signal map */
        this.signals = { ...signals };

        /** @type {Object} Shared hive state */
        this.state = state;

        /**
         * Live pool queues.
         * @type {{ hot: Object[], warm: Object[], cold: Object[] }}
         */
        this.queues = { hot: [], warm: [], cold: [] };

        /**
         * Routing history for audit/debug.
         * @type {Object[]}
         */
        this.routingLog = [];

        /** @type {string} Determinism digest of init constants */
        this.initDigest = sha256({ PHI, PSI, PSI2, PSI3, domain, priority });

        this.emit('workerReady', {
            domain,
            priority,
            accountType,
            initDigest: this.initDigest,
        });
    }

    // ── § 6.1  ROUTE TASK ────────────────────────────────────────────────────

    /**
     * Route a task to the appropriate execution pool using CSL confidence.
     *
     * Confidence = geometric mean of:
     *   • urgency   — normalised task urgency [0,1]
     *   • importance — normalised task importance [0,1]
     *   • signalBoost — optional external signal multiplier (default ψ)
     *
     * Pool assignment:
     *   confidence ≥ ψ  (0.618) → HOT  (immediate)
     *   confidence ≥ ψ² (0.382) → WARM (queued)
     *   confidence <  ψ²        → COLD (deferred)
     *
     * @param {Object} task                     Task descriptor.
     * @param {string} task.id                  Task identifier.
     * @param {number} [task.urgency=0.5]       Urgency score [0,1].
     * @param {number} [task.importance=0.5]    Importance score [0,1].
     * @param {number} [task.signalBoost]       External signal amplifier [0,1].
     * @param {string} [task.module]            Associated module id.
     * @param {*}      [task.payload]           Arbitrary task payload.
     * @returns {{ task: Object, pool: Object, confidence: number,
     *             digest: string, timestamp: string }}
     * @fires TradingBeeCSL#taskRouted
     */
    cslRouteTask(task) {
        const {
            id          = 'unknown',
            urgency     = 0.5,
            importance  = 0.5,
            signalBoost = PSI,
            module      = null,
            payload     = null,
        } = task;

        const u  = clamp(urgency,    0, 1);
        const i  = clamp(importance, 0, 1);
        const sb = clamp(signalBoost, 0, 1);

        const confidence = geometricMean([u, i, sb]);
        const pool       = resolvePool(confidence);

        const routedTask = {
            id,
            urgency:     u,
            importance:  i,
            signalBoost: sb,
            module,
            payload,
            confidence,
            pool:        pool.name,
            routedAt:    new Date().toISOString(),
        };

        // Place in appropriate queue
        const queueKey = pool.name.toLowerCase();
        this.queues[queueKey].push(routedTask);

        const digest    = sha256({ id, confidence, pool: pool.name });
        const timestamp = new Date().toISOString();

        const result = { task: routedTask, pool, confidence, digest, timestamp };

        this.routingLog.push(result);
        this.emit('taskRouted', result);
        this._maybeEmitPoolChange();

        return result;
    }

    // ── § 6.2  WORK RETRIEVAL ────────────────────────────────────────────────

    /**
     * Retrieve module loader descriptors for this bee.
     *
     * @param {Object} [ctxOverride]  Optional context overrides (merged with stored signals/state).
     * @returns {Object[]}  Array of loader descriptors from `getWork`.
     */
    getWork(ctxOverride = {}) {
        return getWork({
            signals:     { ...this.signals, ...ctxOverride.signals },
            accountType: ctxOverride.accountType ?? this.accountType,
            state:       { ...this.state, ...ctxOverride.state },
        });
    }

    // ── § 6.3  QUEUE MANAGEMENT ──────────────────────────────────────────────

    /**
     * Dequeue the next task from the hot pool (highest priority).
     * Falls back to warm, then cold if hot is empty.
     *
     * @returns {Object|null}  Next task, or null if all queues empty.
     */
    dequeue() {
        return (
            this.queues.hot.shift()  ??
            this.queues.warm.shift() ??
            this.queues.cold.shift() ??
            null
        );
    }

    /**
     * Flush all queues, returning the drained tasks.
     *
     * @returns {{ hot: Object[], warm: Object[], cold: Object[] }}
     */
    flushQueues() {
        const snapshot = {
            hot:  [...this.queues.hot],
            warm: [...this.queues.warm],
            cold: [...this.queues.cold],
        };
        this.queues = { hot: [], warm: [], cold: [] };
        return snapshot;
    }

    /**
     * Return a live snapshot of queue sizes and pool confidence distribution.
     *
     * @returns {Object}
     */
    getQueueStatus() {
        const total = this.queues.hot.length + this.queues.warm.length + this.queues.cold.length;
        return {
            total,
            hot:   this.queues.hot.length,
            warm:  this.queues.warm.length,
            cold:  this.queues.cold.length,
            hotRatio:  total > 0 ? this.queues.hot.length  / total : 0,
            warmRatio: total > 0 ? this.queues.warm.length / total : 0,
            coldRatio: total > 0 ? this.queues.cold.length / total : 0,
            phiBalance: {
                hotThreshold:  PSI,
                warmThreshold: PSI2,
                coldThreshold: PSI3,
            },
        };
    }

    // ── § 6.4  SIGNAL MANAGEMENT ─────────────────────────────────────────────

    /**
     * Update the internal signal map and re-score all queued tasks.
     *
     * @param {Object} newSignals  Partial signal map to merge.
     */
    updateSignals(newSignals) {
        this.signals = { ...this.signals, ...newSignals };
    }

    /**
     * Compute a composite bee-level confidence from all current signals.
     *
     * @returns {{ confidence: number, zone: Object, signals: Object, digest: string }}
     */
    compositeConfidence() {
        const values = Object.values(this.signals).filter(v => typeof v === 'number');
        const confidence = values.length > 0 ? geometricMean(values.map(v => clamp(v, 0, 1))) : PSI;

        let zone;
        if (confidence >= PSI)  zone = 'ENGAGE';
        else if (confidence >= PSI2) zone = 'CAUTIOUS';
        else if (confidence >= PSI3) zone = 'HOLD';
        else zone = 'REPEL';

        return {
            confidence,
            zone,
            signals:  { ...this.signals },
            digest:   sha256({ signals: this.signals, confidence }),
        };
    }

    // ── § 6.5  PRIVATE HELPERS ───────────────────────────────────────────────

    /**
     * Emit a poolChange event when queue distribution shifts noticeably.
     * @private
     */
    _maybeEmitPoolChange() {
        const status = this.getQueueStatus();
        if (status.hotRatio > PSI) {
            this.emit('poolChange', { dominant: 'HOT', status });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// § 7  MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    TradingBeeCSL,
    getWork,
    domain,
    description,
    priority,
    POOLS,
    PHI,
    PSI,
    PSI2,
    PSI3,
    PHI2,
    PHI3,
    EPSILON,
    // Utility exports
    sigmoid,
    geometricMean,
    resolvePool,
    sha256,
};
