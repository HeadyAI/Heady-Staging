/**
 * @fileoverview WisdomStore — Long-term memory of learned patterns, anti-regression
 * guards, and pipeline knowledge for the Heady™ Latent OS.
 *
 * Data persisted to wisdom.json. All sizes use Fibonacci numbers; all confidence
 * thresholds use CSL phi-harmonic levels imported from shared/phi-math.js.
 *
 * @module services/wisdom-store
 * @version 1.0.0
 */

'use strict';

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  PSI,
  PSI2,
  fib,
  cosineSimilarity,
  CSL_THRESHOLDS,
  phiFusionWeights,
} from '../shared/phi-math.js';

// ─── Module Constants ──────────────────────────────────────────────────────────

/** Maximum number of stored patterns (Fibonacci 14 = 377). */
const MAX_PATTERNS    = fib(14); // 377

/** Maximum retained history entries (Fibonacci 17 = 1597). */
const MAX_HISTORY     = fib(17); // 1597

/** Eviction window: patterns with no hits in this many days are candidates (fib(11)=89). */
const STALE_DAYS      = fib(11); // 89

/** Default top-N optimizations returned (fib(6)=8). */
const DEFAULT_TOP_N   = fib(6);  // 8

/** Embedding dimensionality placeholder (standard sentence-transformer size). */
const EMBEDDING_DIM   = 384;

/** Semantic similarity gate for pattern retrieval (PSI ≈ 0.618). */
const SIMILARITY_GATE = PSI;     // 0.618

/** Confidence boost per hit: Δconf = (1 − conf) × PSI² */
const HIT_BOOST       = PSI2;    // ≈ 0.382

/** Confidence decay per miss: conf *= (1 − PSI²) */
const MISS_DECAY      = 1 - PSI2; // ≈ 0.618

/** Version tag embedded in persisted JSON. */
const STORE_VERSION   = '1.0.0';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generates a deterministic placeholder embedding for a string.
 * In production, replace with actual sentence-transformer inference.
 * @param {string} text
 * @returns {number[]} 384-dimensional unit vector
 */
function generatePlaceholderEmbedding(text) {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % EMBEDDING_DIM] += text.charCodeAt(i) / 255;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

/**
 * Returns the current ISO date-time string.
 * @returns {string}
 */
function now() {
  return new Date().toISOString();
}

/**
 * Days elapsed since a given ISO date string.
 * @param {string} isoDate
 * @returns {number}
 */
function daysSince(isoDate) {
  return (Date.now() - new Date(isoDate).getTime()) / 86_400_000;
}

// ─── Class ────────────────────────────────────────────────────────────────────

/**
 * @class WisdomStore
 * @description Long-term memory store for patterns, prevention rules, and optimizations
 * learned through pipeline runs. Implements phi-scaled confidence scoring, semantic
 * search with CSL cosine gating, and anti-regression checks.
 */
export class WisdomStore {
  /**
   * @param {object} [config={}]
   * @param {number} [config.maxPatterns=377]   Override max stored patterns.
   * @param {number} [config.maxHistory=1597]   Override max history entries.
   * @param {boolean} [config.verbose=false]    Enable verbose logging.
   */
  constructor(config = {}) {
    /** @type {number} */
    this._maxPatterns = config.maxPatterns ?? MAX_PATTERNS;

    /** @type {number} */
    this._maxHistory = config.maxHistory ?? MAX_HISTORY;

    /** @type {boolean} */
    this._verbose = config.verbose ?? false;

    /**
     * Pattern store: id → Pattern
     * @type {Map<string, Pattern>}
     */
    this._patterns = new Map();

    /**
     * Prevention rules: id → PreventionRule
     * @type {Map<string, PreventionRule>}
     */
    this._preventionRules = new Map();

    /**
     * Optimizations: id → Optimization
     * @type {Map<string, Optimization>}
     */
    this._optimizations = new Map();

    /**
     * Append-only log of store events (bounded to _maxHistory).
     * @type {Array<HistoryEntry>}
     */
    this._history = [];

    /** @type {WisdomMetrics} */
    this._metrics = {
      totalPatterns:  0,
      totalHits:      0,
      totalMisses:    0,
      hitRate:        0,
      lastUpdated:    now(),
    };

    this._log('WisdomStore initialised', {
      maxPatterns: this._maxPatterns,
      maxHistory:  this._maxHistory,
      similarityGate: SIMILARITY_GATE,
      hitBoost:    HIT_BOOST,
      missDecay:   MISS_DECAY,
    });
  }

  // ─── Pattern Management ────────────────────────────────────────────────────

  /**
   * Store a new learned pattern.
   * If the store is at capacity, the lowest-confidence pattern is evicted first.
   *
   * @param {Partial<Pattern>} patternData - Fields to initialise the pattern with.
   * @returns {Pattern} The fully initialised pattern.
   */
  addPattern(patternData) {
    if (this._patterns.size >= this._maxPatterns) {
      this._evictLowestConfidence();
    }

    /** @type {Pattern} */
    const pattern = {
      id:          patternData.id          ?? `pat_${randomUUID()}`,
      description: patternData.description ?? '',
      domain:      patternData.domain      ?? 'general',
      solution:    patternData.solution    ?? '',
      confidence:  patternData.confidence  ?? CSL_THRESHOLDS.LOW,   // 0.691
      hitCount:    0,
      lastHit:     null,
      createdAt:   now(),
      embedding:   patternData.embedding   ?? generatePlaceholderEmbedding(
        `${patternData.description ?? ''} ${patternData.domain ?? ''}`,
      ),
      tags:        patternData.tags        ?? [],
    };

    this._patterns.set(pattern.id, pattern);
    this._metrics.totalPatterns = this._patterns.size;
    this._metrics.lastUpdated   = now();
    this._appendHistory({ type: 'ADD_PATTERN', patternId: pattern.id, timestamp: now() });

    this._log('Pattern added', { id: pattern.id, domain: pattern.domain });
    return pattern;
  }

  /**
   * Semantic search for a pattern matching a query string.
   * Uses cosine similarity gated at SIMILARITY_GATE (PSI ≈ 0.618).
   *
   * @param {string} query
   * @param {number} [threshold=PSI] - Minimum cosine similarity to accept.
   * @returns {Pattern | null} Best matching pattern, or null if none exceeds threshold.
   */
  findPattern(query, threshold = SIMILARITY_GATE) {
    const queryEmbedding = generatePlaceholderEmbedding(query);
    let bestScore = -Infinity;
    let bestPattern = null;

    for (const pattern of this._patterns.values()) {
      const score = cosineSimilarity(queryEmbedding, pattern.embedding);
      if (score > bestScore) {
        bestScore   = score;
        bestPattern = pattern;
      }
    }

    if (bestPattern && bestScore >= threshold) {
      this._log('Pattern found', { id: bestPattern.id, score: bestScore.toFixed(4) });
      return bestPattern;
    }

    this._log('No pattern above threshold', { query, bestScore: bestScore.toFixed(4), threshold });
    return null;
  }

  /**
   * Record a successful hit for a pattern; boost confidence by phi-decay rule.
   * Confidence = min(1.0, conf + (1 − conf) × PSI²)
   *
   * @param {string} id - Pattern id.
   * @returns {Pattern | null} Updated pattern, or null if not found.
   */
  hitPattern(id) {
    const pattern = this._patterns.get(id);
    if (!pattern) {
      this._log('hitPattern: id not found', { id });
      return null;
    }

    pattern.hitCount  += 1;
    pattern.lastHit    = now();
    pattern.confidence = Math.min(1.0, pattern.confidence + (1 - pattern.confidence) * HIT_BOOST);

    this._metrics.totalHits += 1;
    this._updateHitRate();
    this._metrics.lastUpdated = now();
    this._appendHistory({ type: 'HIT_PATTERN', patternId: id, timestamp: now(), confidence: pattern.confidence });

    this._log('Pattern hit', { id, hitCount: pattern.hitCount, confidence: pattern.confidence.toFixed(4) });
    return pattern;
  }

  /**
   * Record a miss for a pattern; decay confidence by phi rule.
   * Confidence = max(0, conf × (1 − PSI²))
   *
   * @param {string} id - Pattern id.
   * @returns {Pattern | null} Updated pattern, or null if not found.
   */
  missPattern(id) {
    const pattern = this._patterns.get(id);
    if (!pattern) {
      this._log('missPattern: id not found', { id });
      return null;
    }

    pattern.confidence = Math.max(0, pattern.confidence * MISS_DECAY);

    this._metrics.totalMisses += 1;
    this._updateHitRate();
    this._metrics.lastUpdated = now();
    this._appendHistory({ type: 'MISS_PATTERN', patternId: id, timestamp: now(), confidence: pattern.confidence });

    this._log('Pattern miss', { id, confidence: pattern.confidence.toFixed(4) });
    return pattern;
  }

  // ─── Prevention Rules ─────────────────────────────────────────────────────

  /**
   * Store a prevention rule learned from mistake analysis.
   *
   * @param {Partial<PreventionRule>} ruleData
   * @returns {PreventionRule}
   */
  addPreventionRule(ruleData) {
    /** @type {PreventionRule} */
    const rule = {
      id:          ruleData.id          ?? `rule_${randomUUID()}`,
      description: ruleData.description ?? '',
      trigger:     ruleData.trigger     ?? '',
      action:      ruleData.action      ?? '',
      severity:    ruleData.severity    ?? 'MEDIUM',
      hitCount:    0,
      createdAt:   now(),
      source:      ruleData.source      ?? 'mistake-analysis',
      embedding:   ruleData.embedding   ?? generatePlaceholderEmbedding(
        `${ruleData.trigger ?? ''} ${ruleData.action ?? ''}`,
      ),
    };

    this._preventionRules.set(rule.id, rule);
    this._metrics.lastUpdated = now();
    this._appendHistory({ type: 'ADD_PREVENTION_RULE', ruleId: rule.id, timestamp: now() });

    this._log('Prevention rule added', { id: rule.id, severity: rule.severity });
    return rule;
  }

  /**
   * Check whether a proposed action matches any prevention rule.
   * Matching uses cosine similarity against rule embeddings at SIMILARITY_GATE.
   *
   * @param {string} action - Description of the action about to be taken.
   * @returns {{ blocked: boolean, rule: PreventionRule | null, score: number }}
   */
  checkPreventionRules(action) {
    if (this._preventionRules.size === 0) {
      return { blocked: false, rule: null, score: 0 };
    }

    const actionEmbedding = generatePlaceholderEmbedding(action);
    let bestScore = -Infinity;
    let bestRule  = null;

    for (const rule of this._preventionRules.values()) {
      const score = cosineSimilarity(actionEmbedding, rule.embedding);
      if (score > bestScore) {
        bestScore = score;
        bestRule  = rule;
      }
    }

    const blocked = bestRule !== null && bestScore >= SIMILARITY_GATE;
    if (blocked) {
      bestRule.hitCount += 1;
      this._appendHistory({ type: 'PREVENTION_TRIGGERED', ruleId: bestRule.id, timestamp: now(), score: bestScore });
    }

    return { blocked, rule: blocked ? bestRule : null, score: bestScore };
  }

  // ─── Optimizations ────────────────────────────────────────────────────────

  /**
   * Store an optimization discovered by the optimization-ops pipeline stage.
   *
   * @param {Partial<Optimization>} optData
   * @returns {Optimization}
   */
  addOptimization(optData) {
    /** @type {Optimization} */
    const opt = {
      id:          optData.id          ?? `opt_${randomUUID()}`,
      description: optData.description ?? '',
      domain:      optData.domain      ?? 'general',
      cslImpact:   optData.cslImpact   ?? 0,
      appliedCount: 0,
      createdAt:   now(),
      lastApplied: null,
      params:      optData.params      ?? {},
      tags:        optData.tags        ?? [],
    };

    this._optimizations.set(opt.id, opt);
    this._metrics.lastUpdated = now();
    this._appendHistory({ type: 'ADD_OPTIMIZATION', optId: opt.id, timestamp: now() });

    this._log('Optimization added', { id: opt.id, cslImpact: opt.cslImpact });
    return opt;
  }

  /**
   * Return the top-N optimizations ranked by CSL impact score.
   *
   * @param {number} [n=DEFAULT_TOP_N] - Number of results to return (default fib(6)=8).
   * @returns {Optimization[]}
   */
  getTopOptimizations(n = DEFAULT_TOP_N) {
    return [...this._optimizations.values()]
      .sort((a, b) => b.cslImpact - a.cslImpact)
      .slice(0, n);
  }

  // ─── Eviction ────────────────────────────────────────────────────────────

  /**
   * Remove patterns whose confidence has decayed below CSL_THRESHOLDS.MINIMUM (0.500)
   * AND that have had no hits within the last STALE_DAYS (89) days.
   *
   * @returns {{ evicted: number, ids: string[] }}
   */
  evictStalePatterns() {
    const evictedIds = [];

    for (const [id, pattern] of this._patterns.entries()) {
      const belowMinConf = pattern.confidence < CSL_THRESHOLDS.MINIMUM;
      const stale        = pattern.lastHit === null
        ? daysSince(pattern.createdAt) > STALE_DAYS
        : daysSince(pattern.lastHit)   > STALE_DAYS;

      if (belowMinConf && stale) {
        this._patterns.delete(id);
        evictedIds.push(id);
      }
    }

    if (evictedIds.length > 0) {
      this._metrics.totalPatterns = this._patterns.size;
      this._metrics.lastUpdated   = now();
      this._appendHistory({ type: 'EVICT_STALE', count: evictedIds.length, ids: evictedIds, timestamp: now() });
      this._log('Evicted stale patterns', { count: evictedIds.length });
    }

    return { evicted: evictedIds.length, ids: evictedIds };
  }

  // ─── Anti-Regression Score ───────────────────────────────────────────────

  /**
   * Compute an anti-regression health score [0, 1].
   *
   * Score = φ-weighted blend of:
   *   - Prevention coverage (rules that have been triggered / total rules)
   *   - Pattern health     (avg confidence of retained patterns)
   *   - Hit rate           (hitRate from metrics)
   *
   * @returns {{ score: number, breakdown: object }}
   */
  computeAntiRegressionScore() {
    const [w1, w2, w3] = phiFusionWeights(3);

    // Prevention coverage
    const totalRules = this._preventionRules.size;
    const triggeredRules = totalRules > 0
      ? [...this._preventionRules.values()].filter(r => r.hitCount > 0).length
      : 0;
    const preventionCoverage = totalRules > 0 ? triggeredRules / totalRules : 0;

    // Pattern health
    const patterns = [...this._patterns.values()];
    const avgConfidence = patterns.length > 0
      ? patterns.reduce((s, p) => s + p.confidence, 0) / patterns.length
      : 0;

    // Hit rate
    const hitRate = this._metrics.hitRate;

    const score = preventionCoverage * w1 + avgConfidence * w2 + hitRate * w3;

    return {
      score: Math.min(1, score),
      breakdown: {
        preventionCoverage,
        avgConfidence,
        hitRate,
        weights: { preventionCoverage: w1, avgConfidence: w2, hitRate: w3 },
      },
    };
  }

  // ─── Metrics & Status ────────────────────────────────────────────────────

  /**
   * Return current wisdom metrics snapshot.
   * @returns {WisdomMetrics}
   */
  getMetrics() {
    return { ...this._metrics };
  }

  /**
   * Return a full health status object.
   * @returns {WisdomStatus}
   */
  getStatus() {
    const antiRegression = this.computeAntiRegressionScore();
    return {
      version:          STORE_VERSION,
      health:           antiRegression.score >= CSL_THRESHOLDS.MEDIUM ? 'HEALTHY' : 'DEGRADED',
      patternCount:     this._patterns.size,
      patternCapacity:  this._maxPatterns,
      patternUsage:     this._patterns.size / this._maxPatterns,
      preventionRules:  this._preventionRules.size,
      optimizations:    this._optimizations.size,
      metrics:          this.getMetrics(),
      antiRegression,
      thresholds: {
        similarityGate:      SIMILARITY_GATE,
        evictionConfidence:  CSL_THRESHOLDS.MINIMUM,
        staleDays:           STALE_DAYS,
      },
    };
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  /**
   * Persist the store to a JSON file.
   *
   * @param {string} filepath - Destination path (e.g. './wisdom.json').
   * @returns {void}
   * @throws {Error} If write fails.
   */
  persist(filepath) {
    try {
      const data = {
        version:         STORE_VERSION,
        patterns:        Object.fromEntries(this._patterns),
        preventionRules: Object.fromEntries(this._preventionRules),
        optimizations:   Object.fromEntries(this._optimizations),
        metrics:         this._metrics,
        history:         this._history,
      };
      writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
      this._log('Store persisted', { filepath, patterns: this._patterns.size });
    } catch (err) {
      throw new Error(`WisdomStore.persist failed: ${err.message}`);
    }
  }

  /**
   * Load store state from a previously persisted JSON file.
   *
   * @param {string} filepath
   * @returns {void}
   * @throws {Error} If read or parse fails.
   */
  load(filepath) {
    if (!existsSync(filepath)) {
      throw new Error(`WisdomStore.load: file not found — ${filepath}`);
    }
    try {
      const raw  = readFileSync(filepath, 'utf-8');
      const data = JSON.parse(raw);

      this._patterns        = new Map(Object.entries(data.patterns        ?? {}));
      this._preventionRules = new Map(Object.entries(data.preventionRules ?? {}));
      this._optimizations   = new Map(Object.entries(data.optimizations   ?? {}));
      this._metrics         = data.metrics  ?? this._metrics;
      this._history         = data.history  ?? [];

      this._log('Store loaded', { filepath, patterns: this._patterns.size });
    } catch (err) {
      throw new Error(`WisdomStore.load failed: ${err.message}`);
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Evict the pattern with the lowest confidence to make room.
   * @private
   */
  _evictLowestConfidence() {
    let minConf = Infinity;
    let minId   = null;

    for (const [id, p] of this._patterns.entries()) {
      if (p.confidence < minConf) {
        minConf = p.confidence;
        minId   = id;
      }
    }

    if (minId) {
      this._patterns.delete(minId);
      this._metrics.totalPatterns = this._patterns.size;
      this._appendHistory({ type: 'EVICT_CAPACITY', patternId: minId, timestamp: now() });
    }
  }

  /**
   * Recompute the hit rate metric.
   * @private
   */
  _updateHitRate() {
    const total = this._metrics.totalHits + this._metrics.totalMisses;
    this._metrics.hitRate = total > 0 ? this._metrics.totalHits / total : 0;
  }

  /**
   * Append an event to the bounded history log.
   * @private
   * @param {object} entry
   */
  _appendHistory(entry) {
    this._history.push(entry);
    if (this._history.length > this._maxHistory) {
      this._history.splice(0, this._history.length - this._maxHistory);
    }
  }

  /**
   * Conditional verbose logger.
   * @private
   * @param {string} msg
   * @param {object} [meta]
   */
  _log(msg, meta = {}) {
    if (this._verbose) {
      console.log(`[WisdomStore] ${msg}`, meta);
    }
  }
}

// ─── JSDoc Type Definitions ───────────────────────────────────────────────────

/**
 * @typedef {object} Pattern
 * @property {string}   id          - Unique identifier.
 * @property {string}   description - Human-readable description.
 * @property {string}   domain      - Domain tag (e.g. 'nlp', 'hardware').
 * @property {string}   solution    - The learned solution or recommendation.
 * @property {number}   confidence  - Confidence score in [0, 1].
 * @property {number}   hitCount    - Times this pattern was successfully recalled.
 * @property {string|null} lastHit  - ISO timestamp of last hit, or null.
 * @property {string}   createdAt   - ISO timestamp of creation.
 * @property {number[]} embedding   - 384-dimensional semantic vector.
 * @property {string[]} tags        - Categorisation tags.
 */

/**
 * @typedef {object} PreventionRule
 * @property {string} id
 * @property {string} description
 * @property {string} trigger      - Pattern that activates the rule.
 * @property {string} action       - What is prevented.
 * @property {string} severity     - 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'.
 * @property {number} hitCount
 * @property {string} createdAt
 * @property {string} source       - Pipeline stage that generated the rule.
 * @property {number[]} embedding
 */

/**
 * @typedef {object} Optimization
 * @property {string} id
 * @property {string} description
 * @property {string} domain
 * @property {number} cslImpact    - CSL-scored impact magnitude.
 * @property {number} appliedCount
 * @property {string} createdAt
 * @property {string|null} lastApplied
 * @property {object} params
 * @property {string[]} tags
 */

/**
 * @typedef {object} WisdomMetrics
 * @property {number} totalPatterns
 * @property {number} totalHits
 * @property {number} totalMisses
 * @property {number} hitRate
 * @property {string} lastUpdated
 */

/**
 * @typedef {object} WisdomStatus
 * @property {string}         version
 * @property {string}         health
 * @property {number}         patternCount
 * @property {number}         patternCapacity
 * @property {number}         patternUsage
 * @property {number}         preventionRules
 * @property {number}         optimizations
 * @property {WisdomMetrics}  metrics
 * @property {object}         antiRegression
 * @property {object}         thresholds
 */

/**
 * @typedef {object} HistoryEntry
 * @property {string} type
 * @property {string} timestamp
 */
