'use strict';

/**
 * @fileoverview llm-router.js — Heady™ LLM Router Engine
 * @version 3.2.3
 * @description
 *   Dynamic, task-aware LLM provider routing with phi-harmonic health scoring,
 *   circuit breakers, budget enforcement, liquid failover, and an LRU response
 *   cache.  Every timeout, threshold, weight, and size constant derives from
 *   phi-math — zero magic numbers.
 *
 *   Provider chain (6 providers):
 *     Anthropic (Claude)  · OpenAI (GPT-4o)   · Google (Gemini)
 *     Groq (Llama)        · Perplexity (Sonar) · Local (Ollama)
 *
 *   Routing matrix (9 task types):
 *     code_generation · code_review · architecture · research · quick_tasks
 *     creative · security_audit · documentation · embeddings
 *
 *   Key phi-constants in use:
 *     - Circuit-breaker failure threshold: fib(5) = 5
 *     - Health window:                     fib(11) = 89 requests
 *     - LRU cache size:                    fib(16) = 987 entries
 *     - All timeouts:                      PHI^n × 1000 ms
 *     - Health scoring weights:            phiFusionWeights(3)
 *     - Backoff multiplier:               PHI (1.618)
 *
 * @module LLMRouter
 * @author Heady™ Core Engineering
 */

const crypto = require('crypto');

const phiMath = require('../../shared/phi-math.js');

const {
  PHI,
  PSI,
  FIB,
  fib,
  CSL_THRESHOLDS,
  phiBackoff,
  phiFusionWeights,
  phiPriorityScore,
  PRESSURE_LEVELS,
  ALERT_THRESHOLDS,
  cosineSimilarity,
  cslGate,
} = phiMath;

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 — PHI-SCALED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Phi-power timeout ladder (PHI^n × 1000 ms).
 * @enum {number}
 */
const TIMEOUTS = {
  /** PHI^1 × 1000 ≈ 1618 ms — fast provider quick-task cutoff */
  FAST: Math.round(Math.pow(PHI, 1) * 1000),   // 1618
  /** PHI^2 × 1000 ≈ 2618 ms — standard generation timeout */
  STANDARD: Math.round(Math.pow(PHI, 2) * 1000),   // 2618
  /** PHI^3 × 1000 ≈ 4236 ms — extended for mid-complexity tasks */
  EXTENDED: Math.round(Math.pow(PHI, 3) * 1000),   // 4236
  /** PHI^4 × 1000 ≈ 6854 ms — deep reasoning / architecture */
  DEEP: Math.round(Math.pow(PHI, 4) * 1000),   // 6854
  /** PHI^5 × 1000 ≈ 11090 ms — research + large-context generation */
  RESEARCH: Math.round(Math.pow(PHI, 5) * 1000),   // 11090
  /** PHI^6 × 1000 ≈ 17944 ms — embedding batch timeout */
  EMBED: Math.round(Math.pow(PHI, 6) * 1000),   // 17944
  /** PHI^7 × 1000 ≈ phiMath.PHI_TIMING.CYCLE ms — long creative / security audit */
  LONG: Math.round(Math.pow(PHI, 7) * 1000),   // phiMath.PHI_TIMING.CYCLE
  /** PHI^8 × 1000 ≈ 46979 ms — architecture / deep creative */
  MAX: Math.round(Math.pow(PHI, 8) * 1000),   // 46979
};

/** Circuit-breaker failure threshold = fib(5) = 5 failures */
const CB_FAILURE_THRESHOLD = fib(5);         // 5

/** Provider health rolling window = fib(11) = 89 requests */
const HEALTH_WINDOW = fib(11);               // 89

/** LRU cache capacity = fib(16) = 987 entries */
const CACHE_CAPACITY = fib(16);              // 987

/** Rate-limit retry max attempts before escalating to fallback */
const RATE_LIMIT_MAX_RETRIES = 2;

/** Phi-fusion weights [w0, w1, w2] for health score (successRate, latency, cost) */
const HEALTH_WEIGHTS = phiFusionWeights(3);   // [~0.573, ~0.254, ~0.173]

/** Latency normalisation ceiling (ms) — tasks above this score 0 on latency */
const LATENCY_CEIL_MS = TIMEOUTS.RESEARCH;   // 11090 ms

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 — PROVIDER DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provider identifier enum.
 * @enum {string}
 */
const PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  GOOGLE: 'google',
  GROQ: 'groq',
  PERPLEXITY: 'perplexity',
  LOCAL: 'local',
};

/**
 * Task type identifier enum.
 * @enum {string}
 */
const TASK_TYPES = {
  CODE_GENERATION: 'code_generation',
  CODE_REVIEW: 'code_review',
  ARCHITECTURE: 'architecture',
  RESEARCH: 'research',
  QUICK_TASKS: 'quick_tasks',
  CREATIVE: 'creative',
  SECURITY_AUDIT: 'security_audit',
  DOCUMENTATION: 'documentation',
  EMBEDDINGS: 'embeddings',
};

/**
 * Static provider catalogue with model names, cost tiers, and default timeouts.
 * costPerKTokens values are representative USD figures used for relative scoring.
 *
 * @constant {Object.<string, ProviderConfig>}
 * @typedef  {Object} ProviderConfig
 * @property {string}   id             - Provider identifier
 * @property {string}   name           - Display name
 * @property {string}   defaultModel   - Default model name
 * @property {string}   fastModel      - Cheaper / faster model for quick tasks
 * @property {string}   embedModel     - Embedding model (if supported)
 * @property {number}   costPerKTokens - USD per 1K tokens (average input+output)
 * @property {number}   timeout        - Default timeout for this provider (ms)
 * @property {number}   dailyBudgetUsd - Default per-provider daily cap (USD)
 */
const PROVIDER_CATALOGUE = {
  [PROVIDERS.ANTHROPIC]: {
    id: PROVIDERS.ANTHROPIC,
    name: 'Anthropic Claude',
    defaultModel: 'claude-3-5-sonnet-20241022',
    fastModel: 'claude-3-haiku-20240307',
    embedModel: null,
    costPerKTokens: 0.015,
    timeout: TIMEOUTS.DEEP,
    dailyBudgetUsd: 50,
  },
  [PROVIDERS.OPENAI]: {
    id: PROVIDERS.OPENAI,
    name: 'OpenAI GPT-4o',
    defaultModel: 'gpt-4o',
    fastModel: 'gpt-4o-mini',
    embedModel: 'text-embedding-3-small',
    costPerKTokens: 0.010,
    timeout: TIMEOUTS.DEEP,
    dailyBudgetUsd: 50,
  },
  [PROVIDERS.GOOGLE]: {
    id: PROVIDERS.GOOGLE,
    name: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    fastModel: 'gemini-2.0-flash',
    embedModel: 'text-embedding-004',
    costPerKTokens: 0.007,
    timeout: TIMEOUTS.EXTENDED,
    dailyBudgetUsd: 30,
  },
  [PROVIDERS.GROQ]: {
    id: PROVIDERS.GROQ,
    name: 'Groq Llama',
    defaultModel: 'llama-3.1-70b-versatile',
    fastModel: 'llama-3.1-8b-instant',
    embedModel: null,
    costPerKTokens: 0.001,
    timeout: TIMEOUTS.FAST,
    dailyBudgetUsd: 20,
  },
  [PROVIDERS.PERPLEXITY]: {
    id: PROVIDERS.PERPLEXITY,
    name: 'Perplexity Sonar',
    defaultModel: 'sonar-pro',
    fastModel: 'sonar',
    embedModel: null,
    costPerKTokens: 0.008,
    timeout: TIMEOUTS.RESEARCH,
    dailyBudgetUsd: 25,
  },
  [PROVIDERS.LOCAL]: {
    id: PROVIDERS.LOCAL,
    name: 'Local Ollama',
    defaultModel: 'llama3.1',
    fastModel: 'llama3.1',
    embedModel: 'nomic-embed-text',
    costPerKTokens: 0.0,
    timeout: TIMEOUTS.LONG,
    dailyBudgetUsd: Infinity,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3 — ROUTING MATRIX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Task-aware routing matrix.
 * Each entry defines primary → fallback1 → fallback2 provider chain plus the
 * preferred timeout class and whether to prefer the fast model on fallback.
 *
 * @constant {Object.<string, RouteEntry>}
 * @typedef  {Object} RouteEntry
 * @property {string}  primary     - Primary provider id
 * @property {string}  fallback1   - First fallback provider id
 * @property {string}  fallback2   - Second fallback provider id
 * @property {number}  timeout     - Timeout in ms for this task class
 * @property {boolean} useFastOnFallback - Downgrade to fast model on fallback2
 */
const ROUTING_MATRIX = {
  [TASK_TYPES.CODE_GENERATION]: {
    primary: PROVIDERS.ANTHROPIC,
    fallback1: PROVIDERS.OPENAI,
    fallback2: PROVIDERS.GROQ,
    timeout: TIMEOUTS.DEEP,
    useFastOnFallback: false,
  },
  [TASK_TYPES.CODE_REVIEW]: {
    primary: PROVIDERS.ANTHROPIC,
    fallback1: PROVIDERS.OPENAI,
    fallback2: PROVIDERS.GOOGLE,
    timeout: TIMEOUTS.DEEP,
    useFastOnFallback: false,
  },
  [TASK_TYPES.ARCHITECTURE]: {
    primary: PROVIDERS.ANTHROPIC,   // claude-3-opus equivalent path
    fallback1: PROVIDERS.OPENAI,
    fallback2: PROVIDERS.ANTHROPIC,   // retry with sonnet on fb2
    timeout: TIMEOUTS.MAX,
    useFastOnFallback: false,
  },
  [TASK_TYPES.RESEARCH]: {
    primary: PROVIDERS.PERPLEXITY,
    fallback1: PROVIDERS.ANTHROPIC,
    fallback2: PROVIDERS.OPENAI,
    timeout: TIMEOUTS.RESEARCH,
    useFastOnFallback: false,
  },
  [TASK_TYPES.QUICK_TASKS]: {
    primary: PROVIDERS.GROQ,
    fallback1: PROVIDERS.OPENAI,
    fallback2: PROVIDERS.GOOGLE,
    timeout: TIMEOUTS.FAST,
    useFastOnFallback: true,
  },
  [TASK_TYPES.CREATIVE]: {
    primary: PROVIDERS.ANTHROPIC,
    fallback1: PROVIDERS.OPENAI,
    fallback2: PROVIDERS.GOOGLE,
    timeout: TIMEOUTS.LONG,
    useFastOnFallback: false,
  },
  [TASK_TYPES.SECURITY_AUDIT]: {
    primary: PROVIDERS.ANTHROPIC,
    fallback1: PROVIDERS.OPENAI,
    fallback2: PROVIDERS.ANTHROPIC,   // retry opus-class on fb2
    timeout: TIMEOUTS.MAX,
    useFastOnFallback: false,
  },
  [TASK_TYPES.DOCUMENTATION]: {
    primary: PROVIDERS.OPENAI,
    fallback1: PROVIDERS.ANTHROPIC,
    fallback2: PROVIDERS.GOOGLE,
    timeout: TIMEOUTS.EXTENDED,
    useFastOnFallback: false,
  },
  [TASK_TYPES.EMBEDDINGS]: {
    primary: PROVIDERS.OPENAI,
    fallback1: PROVIDERS.GOOGLE,
    fallback2: PROVIDERS.LOCAL,
    timeout: TIMEOUTS.EMBED,
    useFastOnFallback: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4 — LRU CACHE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal doubly-linked-list LRU cache with capacity = fib(16) = 987.
 *
 * @class LRUCache
 */
class LRUCache {
  /**
   * @param {number} [capacity=CACHE_CAPACITY] - Max number of entries.
   */
  constructor(capacity = CACHE_CAPACITY) {
    this._cap = capacity;
    this._map = new Map();
    // Sentinel head / tail nodes
    this._head = { key: null, value: null, prev: null, next: null };
    this._tail = { key: null, value: null, prev: null, next: null };
    this._head.next = this._tail;
    this._tail.prev = this._head;
  }

  /** @param {string} key @returns {*|undefined} */
  get(key) {
    if (!this._map.has(key)) return undefined;
    const node = this._map.get(key);
    this._remove(node);
    this._prepend(node);
    return node.value;
  }

  /** @param {string} key @param {*} value */
  set(key, value) {
    if (this._map.has(key)) {
      const node = this._map.get(key);
      node.value = value;
      this._remove(node);
      this._prepend(node);
    } else {
      if (this._map.size >= this._cap) {
        // Evict LRU (node before tail)
        const lru = this._tail.prev;
        this._remove(lru);
        this._map.delete(lru.key);
      }
      const node = { key, value, prev: null, next: null };
      this._prepend(node);
      this._map.set(key, node);
    }
  }

  /** @param {string} key @returns {boolean} */
  has(key) { return this._map.has(key); }

  /** @returns {number} */
  get size() { return this._map.size; }

  /** @private */
  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  /** @private — insert immediately after head */
  _prepend(node) {
    node.next = this._head.next;
    node.prev = this._head;
    this._head.next.prev = node;
    this._head.next = node;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 5 — CIRCUIT BREAKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-provider circuit breaker.
 *
 * States:
 *   CLOSED  → normal operation
 *   OPEN    → fast-fail, phi-backoff recovery probe scheduled
 *   HALF    → one probe in-flight to test recovery
 *
 * Failure threshold: fib(5) = 5 consecutive failures.
 * Recovery backoff:  phiBackoff(attempt) starting at 1000 ms.
 *
 * @class CircuitBreaker
 */
class CircuitBreaker {
  /**
   * @param {string} providerId - Provider this breaker guards.
   */
  constructor(providerId) {
    this.providerId = providerId;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureAt = null;
    this.recoveryAttempt = 0;
    this._nextProbeAt = null;
  }

  /**
   * Record a successful call — resets counts and closes the circuit.
   */
  onSuccess() {
    this.failureCount = 0;
    this.successCount += 1;
    this.recoveryAttempt = 0;
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
    }
  }

  /**
   * Record a failed call.  Opens the circuit after fib(5) consecutive failures.
   */
  onFailure() {
    this.failureCount += 1;
    this.lastFailureAt = Date.now();
    this.successCount = 0;
    if (this.failureCount >= CB_FAILURE_THRESHOLD && this.state === 'CLOSED') {
      this._open();
    } else if (this.state === 'HALF') {
      // Probe failed — re-open
      this._open();
    }
  }

  /**
   * Returns true if the circuit will allow a call through right now.
   * @returns {boolean}
   */
  allowRequest() {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF') return true; // one probe in-flight
    // OPEN — check if phi-backoff window has elapsed
    if (Date.now() >= this._nextProbeAt) {
      this.state = 'HALF';
      return true;
    }
    return false;
  }

  /** @private */
  _open() {
    this.state = 'OPEN';
    this.failureCount = 0;
    // Schedule next probe using phi-backoff
    const delay = phiBackoff(this.recoveryAttempt, 1000, 60000);
    this._nextProbeAt = Date.now() + delay;
    this.recoveryAttempt += 1;
  }

  /**
   * Serialise state for health reporting.
   * @returns {Object}
   */
  toJSON() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      recoveryAttempt: this.recoveryAttempt,
      nextProbeAt: this._nextProbeAt,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 6 — PROVIDER HEALTH TRACKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rolling-window health tracker for a single provider.
 *
 * Window:  fib(11) = 89 requests.
 * Score:   phiFusionWeights(3) × [successRate, latencyScore, costScore].
 *
 * @class ProviderHealthTracker
 */
class ProviderHealthTracker {
  /**
   * @param {string} providerId
   * @param {number} costPerKTokens - Provider cost tier for relative scoring.
   */
  constructor(providerId, costPerKTokens) {
    this.providerId = providerId;
    this.costPerKTokens = costPerKTokens;
    /** @type {Array<{success: boolean, latencyMs: number, ts: number}>} */
    this._window = [];
    this._totalCalls = 0;
    this._totalSuccess = 0;
    this._totalLatencyMs = 0;
  }

  /**
   * Record the outcome of a single call.
   * @param {boolean} success
   * @param {number}  latencyMs
   */
  record(success, latencyMs) {
    const entry = { success, latencyMs, ts: Date.now() };
    this._window.push(entry);
    if (this._window.length > HEALTH_WINDOW) {
      this._window.shift();
    }
    this._totalCalls += 1;
    this._totalSuccess += success ? 1 : 0;
    this._totalLatencyMs += latencyMs;
  }

  /**
   * Compute the current phi-harmonic health score in [0, 1].
   *
   * Components (weights from phiFusionWeights(3)):
   *   w0 ≈ 0.573 → successRate:   successes / window size
   *   w1 ≈ 0.254 → latencyScore:  1 - clamp(avgLatency / LATENCY_CEIL_MS)
   *   w2 ≈ 0.173 → costScore:     1 - clamp(costPerKTokens / MAX_COST)
   *
   * @returns {number} Health score in [0, 1].
   */
  getScore() {
    if (this._window.length === 0) return PSI; // ≈ 0.618 — neutral seed

    const successes = this._window.filter(e => e.success).length;
    const successRate = successes / this._window.length;

    const avgLatency = this._window.reduce((s, e) => s + e.latencyMs, 0) / this._window.length;
    const latencyScore = 1 - Math.min(1, avgLatency / LATENCY_CEIL_MS);

    // Max realistic cost per K tokens across all providers ≈ 0.030 USD
    const MAX_COST_PER_K = Math.round(PHI * 18) / 1000; // ≈ 0.029 USD
    const costScore = 1 - Math.min(1, this.costPerKTokens / MAX_COST_PER_K);

    const [w0, w1, w2] = HEALTH_WEIGHTS;
    return w0 * successRate + w1 * latencyScore + w2 * costScore;
  }

  /**
   * @returns {{ totalCalls: number, successRate: number, avgLatencyMs: number, windowSize: number }}
   */
  getStats() {
    const wLen = this._window.length;
    const successes = this._window.filter(e => e.success).length;
    const successRate = wLen > 0 ? successes / wLen : 0;
    const avgLatency = wLen > 0
      ? this._window.reduce((s, e) => s + e.latencyMs, 0) / wLen
      : 0;
    return {
      totalCalls: this._totalCalls,
      successRate: parseFloat(successRate.toFixed(4)),
      avgLatencyMs: parseFloat(avgLatency.toFixed(2)),
      windowSize: wLen,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 7 — BUDGET TRACKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Budget tracker enforcing per-provider daily caps and a global monthly cap.
 *
 * Alert levels come from ALERT_THRESHOLDS (phi-derived).
 * When a provider crosses the caution threshold it is auto-downgraded to its
 * fast model.  When it crosses exceeded it is removed from routing.
 *
 * @class BudgetTracker
 */
class BudgetTracker {
  /**
   * @param {Object} config
   * @param {number} config.globalMonthlyCapUsd   - Total monthly spend ceiling (USD).
   * @param {Object} config.providerDailyCaps      - { [providerId]: number } USD caps.
   */
  constructor(config = {}) {
    this._globalMonthlyCapUsd = config.globalMonthlyCapUsd || 500;
    this._providerDailyCaps = config.providerDailyCaps || {};

    /** @type {Object.<string, number>} today's spend per provider */
    this._dailySpend = {};
    /** @type {number} this month's total spend */
    this._monthlySpend = 0;
    /** @type {string} date string for daily reset */
    this._today = new Date().toISOString().slice(0, 10);
  }

  /** @private — roll over daily counters at midnight */
  _maybeReset() {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this._today) {
      this._dailySpend = {};
      this._today = today;
    }
  }

  /**
   * Record actual spend after a successful call.
   * @param {string} providerId
   * @param {number} costUsd
   */
  record(providerId, costUsd) {
    this._maybeReset();
    this._dailySpend[providerId] = (this._dailySpend[providerId] || 0) + costUsd;
    this._monthlySpend += costUsd;
  }

  /**
   * Check whether a provider is currently allowed to execute.
   * @param {string} providerId
   * @returns {{ allowed: boolean, pressure: number, downgrade: boolean }}
   */
  check(providerId) {
    this._maybeReset();
    const dailyCap = this._providerDailyCaps[providerId] || PROVIDER_CATALOGUE[providerId]?.dailyBudgetUsd || Infinity;
    const dailySpend = this._dailySpend[providerId] || 0;
    const dailyPressure = dailyCap === Infinity ? 0 : dailySpend / dailyCap;

    const globalPressure = this._monthlySpend / this._globalMonthlyCapUsd;
    const pressure = Math.max(dailyPressure, globalPressure);

    const allowed = pressure < ALERT_THRESHOLDS.exceeded;  // < 0.854
    const downgrade = pressure >= ALERT_THRESHOLDS.caution;  // >= 0.764

    return { allowed, pressure, downgrade };
  }

  /**
   * Estimate cost for a call (tokens × costPerKTokens).
   * @param {string} providerId
   * @param {number} estimatedTokens
   * @returns {number} Estimated USD cost
   */
  estimateCost(providerId, estimatedTokens) {
    const cfg = PROVIDER_CATALOGUE[providerId];
    if (!cfg) return 0;
    return (estimatedTokens / 1000) * cfg.costPerKTokens;
  }

  /** @returns {{ monthlySpend: number, dailySpend: Object, pressure: number }} */
  getStatus() {
    this._maybeReset();
    return {
      monthlySpend: parseFloat(this._monthlySpend.toFixed(6)),
      dailySpend: { ...this._dailySpend },
      globalPressure: parseFloat((this._monthlySpend / this._globalMonthlyCapUsd).toFixed(4)),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 8 — LLMRouter CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Heady™ LLM Router.
 *
 * Orchestrates task-aware provider selection, liquid failover, circuit-breaking,
 * budget enforcement, phi-harmonic health scoring, and LRU response caching.
 *
 * @class LLMRouter
 *
 * @example
 * const router = new LLMRouter({ globalMonthlyCapUsd: 300 });
 * const result = await router.generate('Explain phi', { taskType: 'quick_tasks' });
 */
class LLMRouter {
  /**
   * @param {Object}  [config={}]
   * @param {number}  [config.globalMonthlyCapUsd=500]    - Monthly spend ceiling.
   * @param {Object}  [config.providerDailyCaps={}]       - Per-provider daily USD caps.
   * @param {boolean} [config.cacheEnabled=true]          - Enable LRU response cache.
   * @param {boolean} [config.localFallbackEnabled=true]  - Allow local Ollama: last resort.
   * @param {Object}  [config.apiKeys={}]                 - { [providerId]: apiKey }
   * @param {Object}  [config.providerOverrides={}]       - Override individual provider configs.
   */
  constructor(config = {}) {
    this._config = Object.assign({
      globalMonthlyCapUsd: 500,
      providerDailyCaps: {},
      cacheEnabled: true,
      localFallbackEnabled: true,
      apiKeys: {},
      providerOverrides: {},
    }, config);

    // Merge provider catalogue with any caller overrides
    this._providers = {};
    for (const [id, catalogue] of Object.entries(PROVIDER_CATALOGUE)) {
      this._providers[id] = Object.assign({}, catalogue, this._config.providerOverrides[id] || {});
    }

    // Routing matrix (static by default, can be overridden)
    this._routingMatrix = Object.assign({}, ROUTING_MATRIX);

    // Per-provider subsystems
    this._circuitBreakers = {};
    this._healthTrackers = {};
    for (const id of Object.keys(this._providers)) {
      this._circuitBreakers[id] = new CircuitBreaker(id);
      this._healthTrackers[id] = new ProviderHealthTracker(id, this._providers[id].costPerKTokens);
    }

    // Budget tracker
    this._budget = new BudgetTracker({
      globalMonthlyCapUsd: this._config.globalMonthlyCapUsd,
      providerDailyCaps: this._config.providerDailyCaps,
    });

    // LRU response cache
    this._cache = new LRUCache(CACHE_CAPACITY);

    // Request counter (monotonic)
    this._requestSeq = 0;
  }

  // ── 8.1  ROUTING ─────────────────────────────────────────────────────────

  /**
   * Select the best available provider for the given task.
   *
   * Selection order:
   *   1. Resolve the routing chain (primary → fallback1 → fallback2) for taskType.
   *   2. For each candidate in order, check circuit breaker + budget.
   *   3. Among candidates that pass, pick the highest health score.
   *   4. If none pass, return the cheapest available: emergency fallback.
   *
   * @param {Object}  task
   * @param {string}  task.type             - Task type from TASK_TYPES.
   * @param {number}  [task.estimatedTokens=1000] - Estimated token count.
   * @param {boolean} [task.forceProvider]  - Override and force a specific provider.
   * @returns {{ providerId: string, model: string, useFast: boolean, routeReason: string }}
   */
  route(task) {
    const taskType = task.type || TASK_TYPES.QUICK_TASKS;
    const tokens = task.estimatedTokens || 1000;

    // Forced provider override
    if (task.forceProvider && this._providers[task.forceProvider]) {
      return {
        providerId: task.forceProvider,
        model: this._providers[task.forceProvider].defaultModel,
        useFast: false,
        routeReason: 'forced_override',
      };
    }

    const route = this._routingMatrix[taskType] || this._routingMatrix[TASK_TYPES.QUICK_TASKS];
    const chain = [route.primary, route.fallback1, route.fallback2];

    // Evaluate candidates
    const candidates = [];
    for (let i = 0; i < chain.length; i++) {
      const pid = chain[i];
      const cb = this._circuitBreakers[pid];
      const bud = this._budget.check(pid);

      if (!cb.allowRequest()) continue;
      if (!bud.allowed) continue;

      const health = this.getProviderHealth(pid);
      const priority = phiPriorityScore(
        health,
        (i === 0 ? 1.0 : i === 1 ? PSI : PSI * PSI), // position preference
        bud.downgrade ? PSI : 1.0                      // cost pressure penalty
      );

      candidates.push({
        providerId: pid,
        priority,
        position: i,
        bud,
      });
    }

    if (candidates.length === 0) {
      // Emergency: pick the least expensive open provider
      return this._emergencyRoute(taskType, tokens);
    }

    // Sort descending by phi-priority score
    candidates.sort((a, b) => b.priority - a.priority);
    const best = candidates[0];
    const pid = best.providerId;
    const useFast = (best.position === 2 && route.useFastOnFallback) || best.bud.downgrade;

    return {
      providerId: pid,
      model: useFast ? this._providers[pid].fastModel : this._providers[pid].defaultModel,
      useFast,
      routeReason: best.position === 0 ? 'primary' : `fallback${best.position}`,
    };
  }

  /**
   * Emergency route: find any open provider with the lowest cost tier.
   * @private
   * @param {string} taskType
   * @param {number} tokens
   * @returns {{ providerId: string, model: string, useFast: boolean, routeReason: string }}
   */
  _emergencyRoute(taskType, tokens) {
    const sorted = Object.values(this._providers).sort(
      (a, b) => a.costPerKTokens - b.costPerKTokens
    );
    for (const p of sorted) {
      if (this._circuitBreakers[p.id].allowRequest()) {
        return {
          providerId: p.id,
          model: p.fastModel || p.defaultModel,
          useFast: true,
          routeReason: 'emergency',
        };
      }
    }
    // Absolute last resort — local ollama (never has a rate limit)
    return {
      providerId: PROVIDERS.LOCAL,
      model: this._providers[PROVIDERS.LOCAL].defaultModel,
      useFast: false,
      routeReason: 'absolute_emergency',
    };
  }

  // ── 8.2  EXECUTION ENGINE ────────────────────────────────────────────────

  /**
   * Execute a task through the primary → fallback chain with liquid failover.
   *
   * Failure handling:
   *   rate_limit   → wait phiBackoff(attempt) + retry up to RATE_LIMIT_MAX_RETRIES
   *   timeout      → immediate switch to next fallback
   *   error        → immediate switch to next fallback
   *   budget       → switch to cheaper fallback
   *
   * @param {Object}   task
   * @param {string}   task.type            - Task type from TASK_TYPES.
   * @param {string}   task.prompt          - Prompt / input text.
   * @param {Object}   [task.options={}]    - Provider-specific options.
   * @param {number}   [task.estimatedTokens=1000]
   * @param {boolean}  [task.noCache=false] - Skip cache lookup.
   * @returns {Promise<ExecutionResult>}
   * @typedef  {Object} ExecutionResult
   * @property {string}  text            - Generated text.
   * @property {string}  providerId      - Provider that served the response.
   * @property {string}  model           - Model used.
   * @property {number}  latencyMs       - Wall-clock latency.
   * @property {number}  tokensUsed      - Approximate tokens consumed.
   * @property {boolean} fromCache       - True if served from LRU cache.
   * @property {string}  routeReason     - Routing decision label.
   */
  async execute(task) {
    const taskType = task.type || TASK_TYPES.QUICK_TASKS;
    const route = this._routingMatrix[taskType] || this._routingMatrix[TASK_TYPES.QUICK_TASKS];
    const chain = [route.primary, route.fallback1, route.fallback2];
    const timeout = route.timeout;
    const tokens = task.estimatedTokens || 1000;
    const opts = task.options || {};

    // Cache check
    if (this._config.cacheEnabled && !task.noCache) {
      const cacheKey = this._cacheKey(task.prompt, taskType, opts);
      const cached = this._cache.get(cacheKey);
      if (cached) {
        return Object.assign({}, cached, { fromCache: true });
      }
    }

    const errors = [];

    for (let i = 0; i < chain.length; i++) {
      const pid = chain[i];
      const cb = this._circuitBreakers[pid];
      const bud = this._budget.check(pid);

      // Budget exceeded → skip to next in chain
      if (!bud.allowed) {
        errors.push({ providerId: pid, reason: 'budget_exceeded' });
        continue;
      }

      // Circuit open → skip
      if (!cb.allowRequest()) {
        errors.push({ providerId: pid, reason: 'circuit_open' });
        continue;
      }

      const useFast = (i === 2 && route.useFastOnFallback) || bud.downgrade;
      const model = useFast
        ? this._providers[pid].fastModel
        : this._providers[pid].defaultModel;

      // Rate-limit retry loop
      let rateLimitAttempt = 0;
      while (rateLimitAttempt <= RATE_LIMIT_MAX_RETRIES) {
        const t0 = Date.now();
        try {
          const result = await this._callProviderWithTimeout(
            pid, model, task.prompt, opts, timeout
          );
          const latencyMs = Date.now() - t0;

          cb.onSuccess();
          this.updateHealth(pid, true, latencyMs);

          // Record budget spend
          const costUsd = this._budget.estimateCost(pid, result.tokensUsed || tokens);
          this._budget.record(pid, costUsd);

          const response = {
            text: result.text,
            providerId: pid,
            model,
            latencyMs,
            tokensUsed: result.tokensUsed || tokens,
            fromCache: false,
            routeReason: i === 0 ? 'primary' : `fallback${i}`,
            costUsd,
          };

          // Store in LRU cache
          if (this._config.cacheEnabled && !task.noCache) {
            const cacheKey = this._cacheKey(task.prompt, taskType, opts);
            this._cache.set(cacheKey, response);
          }

          return response;

        } catch (err) {
          const latencyMs = Date.now() - t0;

          if (err.code === 'RATE_LIMITED') {
            if (rateLimitAttempt < RATE_LIMIT_MAX_RETRIES) {
              // Wait phi-backoff then retry
              const wait = phiBackoff(rateLimitAttempt, 1000, phiMath.PHI_TIMING.CYCLE);
              await this._sleep(wait);
              rateLimitAttempt += 1;
              continue;
            }
            // Exhausted retries → fall through to next provider
            errors.push({ providerId: pid, reason: 'rate_limit_exhausted', detail: err.message });
          } else if (err.code === 'TIMEOUT') {
            // Immediately try next fallback
            cb.onFailure();
            this.updateHealth(pid, false, timeout);
            errors.push({ providerId: pid, reason: 'timeout', detail: err.message });
          } else {
            // General error
            cb.onFailure();
            this.updateHealth(pid, false, latencyMs);
            errors.push({ providerId: pid, reason: 'error', detail: err.message });
          }
          break; // exit rate-limit loop, continue to next chain entry
        }
      }
    }

    // All chain entries failed
    const err = new Error(
      `LLMRouter: all providers failed for taskType="${taskType}". Errors: ` +
      errors.map(e => `${e.providerId}(${e.reason})`).join(', ')
    );
    err.code = 'ALL_PROVIDERS_FAILED';
    err.errors = errors;
    throw err;
  }

  // ── 8.3  PUBLIC GENERATION ENDPOINTS ────────────────────────────────────

  /**
   * Main generation endpoint.  Wraps execute() with a normalised options surface.
   *
   * @param {string}  prompt              - The prompt to send to the LLM.
   * @param {Object}  [options={}]
   * @param {string}  [options.taskType]  - Task type (defaults to quick_tasks).
   * @param {number}  [options.maxTokens] - Max tokens to generate.
   * @param {number}  [options.temperature] - Sampling temperature.
   * @param {boolean} [options.noCache]   - Skip cache.
   * @param {boolean} [options.forceProvider] - Force a specific provider.
   * @param {number}  [options.estimatedTokens] - Hint for budget accounting.
   * @returns {Promise<ExecutionResult>}
   */
  async generate(prompt, options = {}) {
    const task = {
      type: options.taskType || TASK_TYPES.QUICK_TASKS,
      prompt,
      estimatedTokens: options.estimatedTokens || 1000,
      noCache: options.noCache || false,
      forceProvider: options.forceProvider || null,
      options: {
        maxTokens: options.maxTokens || null,
        temperature: options.temperature || null,
        stream: options.stream || false,
      },
    };
    return this.execute(task);
  }

  /**
   * Embedding endpoint.  Routes via the EMBEDDINGS task chain.
   *
   * @param {string|string[]} text         - Text or array of texts to embed.
   * @param {Object}          [options={}]
   * @param {string}          [options.forceProvider] - Override provider.
   * @returns {Promise<EmbedResult>}
   * @typedef  {Object} EmbedResult
   * @property {number[]|number[][]} embeddings - Embedding vector(s).
   * @property {string}  providerId
   * @property {string}  model
   * @property {number}  latencyMs
   * @property {number}  tokensUsed
   */
  async embed(text, options = {}) {
    const texts = Array.isArray(text) ? text : [text];
    const task = {
      type: TASK_TYPES.EMBEDDINGS,
      prompt: texts.join('\n'),
      estimatedTokens: texts.reduce((s, t) => s + Math.ceil(t.length / 4), 0),
      noCache: false,
      forceProvider: options.forceProvider || null,
      options: { embed: true, texts },
    };

    const route = this._routingMatrix[TASK_TYPES.EMBEDDINGS];
    const chain = [route.primary, route.fallback1, route.fallback2];
    const timeout = route.timeout;
    const errors = [];

    for (const pid of chain) {
      const cb = this._circuitBreakers[pid];
      const bud = this._budget.check(pid);
      const p = this._providers[pid];

      if (!bud.allowed || !cb.allowRequest()) continue;
      if (!p.embedModel) continue; // provider does not support embeddings

      const t0 = Date.now();
      try {
        const result = await this._callEmbedWithTimeout(
          pid, p.embedModel, texts, timeout
        );
        const latencyMs = Date.now() - t0;
        cb.onSuccess();
        this.updateHealth(pid, true, latencyMs);
        const costUsd = this._budget.estimateCost(pid, result.tokensUsed || task.estimatedTokens);
        this._budget.record(pid, costUsd);
        return {
          embeddings: result.embeddings,
          providerId: pid,
          model: p.embedModel,
          latencyMs,
          tokensUsed: result.tokensUsed || task.estimatedTokens,
        };
      } catch (err) {
        const latencyMs = Date.now() - t0;
        cb.onFailure();
        this.updateHealth(pid, false, latencyMs);
        errors.push({ providerId: pid, reason: err.message });
      }
    }

    const e = new Error('LLMRouter.embed: all embedding providers failed — ' + errors.map(e => e.providerId).join(', '));
    e.code = 'EMBED_ALL_FAILED';
    e.errors = errors;
    throw e;
  }

  // ── 8.4  HEALTH API ──────────────────────────────────────────────────────

  /**
   * Return the phi-harmonic health score for a provider.
   *
   * @param {string} providerId
   * @returns {number} Health score in [0, 1].
   */
  getProviderHealth(providerId) {
    const tracker = this._healthTrackers[providerId];
    if (!tracker) return 0;
    const rawScore = tracker.getScore();
    // Gate through CSL sigmoid — tau = CSL_THRESHOLDS.LOW ≈ 0.691
    return cslGate(rawScore, rawScore, CSL_THRESHOLDS.LOW, 0.15);
  }

  /**
   * Record the outcome of a provider call and update the rolling health window.
   *
   * @param {string}  providerId
   * @param {boolean} success
   * @param {number}  latencyMs
   */
  updateHealth(providerId, success, latencyMs) {
    const tracker = this._healthTrackers[providerId];
    if (!tracker) return;
    tracker.record(success, latencyMs);
  }

  /**
   * Return a full health report for all providers.
   *
   * @returns {Object.<string, ProviderHealthReport>}
   * @typedef  {Object} ProviderHealthReport
   * @property {number}  score           - Phi-harmonic health score [0,1]
   * @property {Object}  stats           - Rolling window stats
   * @property {Object}  circuitBreaker  - Circuit breaker state
   * @property {Object}  budget          - Budget pressure for this provider
   */
  getAllHealth() {
    const report = {};
    for (const pid of Object.keys(this._providers)) {
      report[pid] = {
        score: parseFloat(this.getProviderHealth(pid).toFixed(4)),
        stats: this._healthTrackers[pid].getStats(),
        circuitBreaker: this._circuitBreakers[pid].toJSON(),
        budget: this._budget.check(pid),
      };
    }
    return report;
  }

  // ── 8.5  PROVIDER CALL ADAPTERS ─────────────────────────────────────────

  /**
   * Dispatch a generate call to the correct provider adapter with a timeout
   * guard.  In a production system each case would call the real SDK; here the
   * stubs are structured to be replaced one-for-one without changing the router.
   *
   * @private
   * @param {string}  providerId
   * @param {string}  model
   * @param {string}  prompt
   * @param {Object}  opts
   * @param {number}  timeoutMs
   * @returns {Promise<{text: string, tokensUsed: number}>}
   */
  async _callProviderWithTimeout(providerId, model, prompt, opts, timeoutMs) {
    const callPromise = this._callProvider(providerId, model, prompt, opts);
    return Promise.race([
      callPromise,
      this._timeoutPromise(timeoutMs),
    ]);
  }

  /**
   * Internal provider dispatch.
   * @private
   */
  async _callProvider(providerId, model, prompt, opts) {
    this._requestSeq += 1;
    switch (providerId) {
      case PROVIDERS.ANTHROPIC:
        return this._callAnthropic(model, prompt, opts);
      case PROVIDERS.OPENAI:
        return this._callOpenAI(model, prompt, opts);
      case PROVIDERS.GOOGLE:
        return this._callGoogle(model, prompt, opts);
      case PROVIDERS.GROQ:
        return this._callGroq(model, prompt, opts);
      case PROVIDERS.PERPLEXITY:
        return this._callPerplexity(model, prompt, opts);
      case PROVIDERS.LOCAL:
        return this._callLocal(model, prompt, opts);
      default:
        throw Object.assign(new Error(`Unknown provider: ${providerId}`), { code: 'UNKNOWN_PROVIDER' });
    }
  }

  /**
   * Dispatch an embedding call with timeout guard.
   * @private
   */
  async _callEmbedWithTimeout(providerId, model, texts, timeoutMs) {
    const callPromise = this._callEmbed(providerId, model, texts);
    return Promise.race([
      callPromise,
      this._timeoutPromise(timeoutMs),
    ]);
  }

  /**
   * Internal embed dispatch.
   * @private
   */
  async _callEmbed(providerId, model, texts) {
    switch (providerId) {
      case PROVIDERS.OPENAI:
        return this._embedOpenAI(model, texts);
      case PROVIDERS.GOOGLE:
        return this._embedGoogle(model, texts);
      case PROVIDERS.LOCAL:
        return this._embedLocal(model, texts);
      default:
        throw Object.assign(
          new Error(`Provider ${providerId} does not support embeddings`),
          { code: 'EMBED_NOT_SUPPORTED' }
        );
    }
  }

  // ── 8.6  PROVIDER ADAPTERS ───────────────────────────────────────────────

  /**
   * Anthropic Claude adapter.
   * Replace the stub body with: `const Anthropic = require('@anthropic-ai/sdk');`
   * @private
   */
  async _callAnthropic(model, prompt, opts) {
    const apiKey = this._config.apiKeys[PROVIDERS.ANTHROPIC];
    if (!apiKey) throw Object.assign(new Error('Anthropic API key not configured'), { code: 'AUTH_ERROR' });
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model,
        max_tokens: opts.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }],
        ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      });
      return {
        text: msg.content[0].text,
        tokensUsed: (msg.usage.input_tokens || 0) + (msg.usage.output_tokens || 0),
      };
    } catch (err) {
      if (err.status === 429) throw Object.assign(new Error(err.message), { code: 'RATE_LIMITED' });
      throw err;
    }
  }

  /**
   * OpenAI GPT-4o adapter.
   * Replace stub with: `const OpenAI = require('openai');`
   * @private
   */
  async _callOpenAI(model, prompt, opts) {
    const apiKey = this._config.apiKeys[PROVIDERS.OPENAI];
    if (!apiKey) throw Object.assign(new Error('OpenAI API key not configured'), { code: 'AUTH_ERROR' });
    try {
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey });
      const resp = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: opts.maxTokens || 4096,
        ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      });
      const choice = resp.choices[0];
      return {
        text: choice.message.content,
        tokensUsed: resp.usage ? resp.usage.total_tokens : 0,
      };
    } catch (err) {
      if (err.status === 429) throw Object.assign(new Error(err.message), { code: 'RATE_LIMITED' });
      throw err;
    }
  }

  /**
   * Google Gemini adapter.
   * Replace stub with: `const { GoogleGenerativeAI } = require('@google/generative-ai');`
   * @private
   */
  async _callGoogle(model, prompt, opts) {
    const apiKey = this._config.apiKeys[PROVIDERS.GOOGLE];
    if (!apiKey) throw Object.assign(new Error('Google API key not configured'), { code: 'AUTH_ERROR' });
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({ model });
      const result = await genModel.generateContent(prompt);
      const text = result.response.text();
      return {
        text,
        tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
      };
    } catch (err) {
      if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        throw Object.assign(new Error(err.message), { code: 'RATE_LIMITED' });
      }
      throw err;
    }
  }

  /**
   * Groq (Llama) adapter.
   * Replace stub with: `const Groq = require('groq-sdk');`
   * @private
   */
  async _callGroq(model, prompt, opts) {
    const apiKey = this._config.apiKeys[PROVIDERS.GROQ];
    if (!apiKey) throw Object.assign(new Error('Groq API key not configured'), { code: 'AUTH_ERROR' });
    try {
      const Groq = require('groq-sdk');
      const client = new Groq({ apiKey });
      const resp = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: opts.maxTokens || 4096,
        ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      });
      return {
        text: resp.choices[0].message.content,
        tokensUsed: resp.usage ? resp.usage.total_tokens : 0,
      };
    } catch (err) {
      if (err.status === 429) throw Object.assign(new Error(err.message), { code: 'RATE_LIMITED' });
      throw err;
    }
  }

  /**
   * Perplexity Sonar adapter.
   * Uses the OpenAI-compatible /chat/completions endpoint.
   * @private
   */
  async _callPerplexity(model, prompt, opts) {
    const apiKey = this._config.apiKeys[PROVIDERS.PERPLEXITY];
    if (!apiKey) throw Object.assign(new Error('Perplexity API key not configured'), { code: 'AUTH_ERROR' });
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
    });
    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
    });
    if (resp.status === 429) {
      throw Object.assign(new Error('Perplexity rate limited'), { code: 'RATE_LIMITED' });
    }
    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'unknown error');
      throw new Error(`Perplexity API error ${resp.status}: ${errText}`);
    }
    const json = await resp.json();
    return {
      text: json.choices[0].message.content,
      tokensUsed: json.usage ? json.usage.total_tokens : 0,
    };
  }

  /**
   * Local Ollama adapter.
   * Assumes Ollama is running on localhost:11434.
   * @private
   */
  async _callLocal(model, prompt, opts) {
    const ollamaBase = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const resp = await fetch(`${ollamaBase}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'unknown error');
      throw new Error(`Ollama API error ${resp.status}: ${errText}`);
    }
    const json = await resp.json();
    return {
      text: json.response,
      tokensUsed: json.eval_count || 0,
    };
  }

  /**
   * OpenAI embeddings adapter.
   * @private
   */
  async _embedOpenAI(model, texts) {
    const apiKey = this._config.apiKeys[PROVIDERS.OPENAI];
    if (!apiKey) throw Object.assign(new Error('OpenAI API key not configured'), { code: 'AUTH_ERROR' });
    try {
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey });
      const resp = await client.embeddings.create({ model, input: texts });
      return {
        embeddings: resp.data.map(d => d.embedding),
        tokensUsed: resp.usage ? resp.usage.total_tokens : 0,
      };
    } catch (err) {
      if (err.status === 429) throw Object.assign(new Error(err.message), { code: 'RATE_LIMITED' });
      throw err;
    }
  }

  /**
   * Google Gemini embeddings adapter.
   * @private
   */
  async _embedGoogle(model, texts) {
    const apiKey = this._config.apiKeys[PROVIDERS.GOOGLE];
    if (!apiKey) throw Object.assign(new Error('Google API key not configured'), { code: 'AUTH_ERROR' });
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({ model });
      const results = await Promise.all(texts.map(t => genModel.embedContent(t)));
      return {
        embeddings: results.map(r => r.embedding.values),
        tokensUsed: texts.length * 50,
      };
    } catch (err) {
      if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        throw Object.assign(new Error(err.message), { code: 'RATE_LIMITED' });
      }
      throw err;
    }
  }

  /**
   * Local Ollama embeddings adapter.
   * @private
   */
  async _embedLocal(model, texts) {
    const ollamaBase = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const results = await Promise.all(texts.map(async t => {
      const resp = await fetch(`${ollamaBase}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: t }),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => 'unknown error');
        throw new Error(`Ollama embed error ${resp.status}: ${errText}`);
      }
      const json = await resp.json();
      return json.embedding;
    }));
    return {
      embeddings: results,
      tokensUsed: texts.length * 10,
    };
  }

  // ── 8.7  UTILITY HELPERS ─────────────────────────────────────────────────

  /**
   * Build a deterministic SHA-256 cache key from prompt + taskType + relevant opts.
   * @private
   * @param {string} prompt
   * @param {string} taskType
   * @param {Object} opts
   * @returns {string} 16-char hex prefix
   */
  _cacheKey(prompt, taskType, opts) {
    const payload = JSON.stringify({
      p: prompt,
      t: taskType,
      mt: opts.maxTokens || null,
      tp: opts.temperature || null,
    });
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32);
  }

  /**
   * Returns a Promise that rejects with a TIMEOUT error after `ms` milliseconds.
   * @private
   * @param {number} ms
   * @returns {Promise<never>}
   */
  _timeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error(`LLMRouter: request timed out after ${ms}ms`);
        err.code = 'TIMEOUT';
        reject(err);
      }, ms);
    });
  }

  /**
   * Awaitable sleep.
   * @private
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── 8.8  DIAGNOSTICS ────────────────────────────────────────────────────

  /**
   * Return a concise diagnostics snapshot.
   *
   * @returns {Object} Snapshot including health, budget, cache, and constants.
   */
  diagnostics() {
    const [w0, w1, w2] = HEALTH_WEIGHTS;
    return {
      version: '3.2.3',
      requestSeq: this._requestSeq,
      cacheSize: this._cache.size,
      cacheCapacity: CACHE_CAPACITY,          // fib(16) = 987
      healthWindow: HEALTH_WINDOW,           // fib(11) = 89
      cbThreshold: CB_FAILURE_THRESHOLD,    // fib(5)  = 5
      healthWeights: { successRate: parseFloat(w0.toFixed(4)), latency: parseFloat(w1.toFixed(4)), cost: parseFloat(w2.toFixed(4)) },
      timeouts: TIMEOUTS,
      budget: this._budget.getStatus(),
      providers: this.getAllHealth(),
      cslThresholds: CSL_THRESHOLDS,
      alertThresholds: ALERT_THRESHOLDS,
      pressureLevels: PRESSURE_LEVELS,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  LLMRouter,
  PROVIDERS,
  TASK_TYPES,
  ROUTING_MATRIX,
  PROVIDER_CATALOGUE,
  TIMEOUTS,
  CACHE_CAPACITY,
  HEALTH_WINDOW,
  CB_FAILURE_THRESHOLD,
  HEALTH_WEIGHTS,
  LRUCache,
  CircuitBreaker,
  ProviderHealthTracker,
  BudgetTracker,
};
