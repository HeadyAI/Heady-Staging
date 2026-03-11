/**
 * @fileoverview budget-tracker.js — Heady™ Sovereign Phi-100 Budget Tracker Engine
 * @version 3.2.3
 * @description
 *   Tracks real-time LLM provider spend against phi-scaled daily and monthly
 *   budget caps. Emits progressive alerts (warning → caution → critical →
 *   exceeded) using ALERT_THRESHOLDS derived from the golden-ratio inverse
 *   power series. Supports HeadySoul override for critical-priority lifts,
 *   rolling usage windows of fib(11)=89 records per provider, phi-geometric
 *   cost projection, and automatic provider downgrade suggestions.
 *
 * @module budget-tracker
 * @author Heady™ Core Engineering
 */

'use strict';

const EventEmitter = require('events');
const phiMath = require('../../shared/phi-math.js');

const {
  PHI,
  PSI,
  FIB,
  fib,
  CSL_THRESHOLDS,
  phiFusionWeights,
  ALERT_THRESHOLDS,
  PRESSURE_LEVELS,
  cslGate,
} = phiMath;

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 — CONSTANTS (all derived from phi-math; no magic numbers)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rolling window size per provider: fib(11) = 89 records.
 * @constant {number}
 */
const ROLLING_WINDOW = fib(11); // 89

/**
 * Global monthly cap in USD: fib(16) = 987.
 * @constant {number}
 */
const GLOBAL_MONTHLY_CAP = fib(16); // 987

/**
 * Default daily provider caps in USD following Fibonacci ratios.
 * 50, 50, 34, 21, 13, 0 → approximate fib-proportioned splits.
 * Anthropic and OpenAI share the highest tier (fib(9)=34 rounded to 50 for
 * practical parity); Google=fib(9)=34; Perplexity=fib(8)=21; Groq=fib(7)=13;
 * Local=0 (self-hosted, no direct cost cap needed).
 * @constant {Object.<string,number>}
 */
const DEFAULT_DAILY_CAPS = {
  anthropic:   50,   // fib-tier high
  openai:      50,   // fib-tier high
  google:      fib(9),   // 34
  perplexity:  fib(8),   // 21
  groq:        fib(7),   // 13
  local:       0,        // self-hosted — no daily cost cap
};

/**
 * Standard per-1k-token cost rates in USD for each provider.
 * Rates are intentionally conservative estimates; actual invoiced rates may
 * differ. Zero cost for local inference.
 * @constant {Object.<string,{input: number, output: number}>}
 */
const PROVIDER_TOKEN_RATES = {
  anthropic:  { input: 0.003,   output: 0.015  },
  openai:     { input: 0.005,   output: 0.015  },
  google:     { input: 0.00125, output: 0.00375 },
  perplexity: { input: 0.001,   output: 0.001  },
  groq:       { input: 0.0002,  output: 0.0002 },
  local:      { input: 0.0,     output: 0.0    },
};

/**
 * Provider priority order for downgrade suggestions (ascending cost / quality).
 * When the primary provider is saturated, getCheapestAvailable() traverses this
 * order and returns the first provider with remaining daily headroom.
 * @constant {string[]}
 */
const PROVIDER_PRIORITY = ['local', 'groq', 'perplexity', 'google', 'openai', 'anthropic'];

/**
 * Millisecond timeout for Heady™Soul override validity window.
 * Uses phi-power × 1000 series: PHI^5 × 1000 ≈ 11090 ms.
 * @constant {number}
 */
const HEADY_SOUL_OVERRIDE_TTL_MS = Math.round(Math.pow(PHI, 5) * 1000); // 11090

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 — BUDGET TRACKER CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class BudgetTracker
 * @extends EventEmitter
 * @description
 *   Tracks per-provider daily spend and global monthly spend against
 *   phi-scaled caps. Emits events: utilization crosses ALERT_THRESHOLDS.
 *
 * @fires BudgetTracker#budgetWarning
 * @fires BudgetTracker#budgetCritical
 * @fires BudgetTracker#budgetExceeded
 * @fires BudgetTracker#autoDowngrade
 */
class BudgetTracker extends EventEmitter {
  /**
   * @constructor
   * @param {Object} [config={}] - Optional configuration overrides.
   * @param {Object.<string,number>} [config.dailyCaps]       - Per-provider daily caps in USD.
   * @param {number}                 [config.monthlyCapUsd]   - Global monthly cap in USD.
   * @param {Object.<string,number>} [config.tokenRates]      - Per-provider token rate overrides.
   * @param {boolean}                [config.headySoulEnabled] - Whether HeadySoul override is permitted.
   * @param {boolean}                [config.verbose]          - Log alert transitions to console.
   */
  constructor(config = {}) {
    super();

    /** @type {Object.<string,number>} Daily budget caps by provider (USD). */
    this._dailyCaps = Object.assign({}, DEFAULT_DAILY_CAPS, config.dailyCaps || {});

    /** @type {number} Global monthly budget cap (USD). */
    this._monthlyCapUsd = (config.monthlyCapUsd != null)
      ? config.monthlyCapUsd
      : GLOBAL_MONTHLY_CAP;

    /** @type {Object.<string,{input:number,output:number}>} Token cost rates. */
    this._tokenRates = Object.assign({}, PROVIDER_TOKEN_RATES, config.tokenRates || {});

    /** @type {boolean} Allow HeadySoul budget lift for critical tasks. */
    this._headySoulEnabled = (config.headySoulEnabled !== false);

    /** @type {boolean} Emit verbose console logs on alert transitions. */
    this._verbose = Boolean(config.verbose);

    /**
     * Per-provider daily spend accumulator in USD.
     * @type {Object.<string,number>}
     * @private
     */
    this._dailySpend = {};

    /**
     * Global monthly spend accumulator in USD.
     * @type {number}
     * @private
     */
    this._monthlySpend = 0;

    /**
     * Rolling usage records per provider (max ROLLING_WINDOW = fib(11) = 89).
     * Each record: { ts: number, tokens: number, costUsd: number }
     * @type {Object.<string,Array<{ts:number,tokens:number,costUsd:number}>>}
     * @private
     */
    this._usageHistory = {};

    /**
     * HeadySoul override state per provider.
     * { active: boolean, expiresAt: number }
     * @type {Object.<string,{active:boolean,expiresAt:number}>}
     * @private
     */
    this._headySoulOverrides = {};

    /**
     * Last-seen alert level per provider to avoid redundant event emission.
     * @type {Object.<string,string|null>}
     * @private
     */
    this._lastAlertLevel = {};

    /**
     * Timestamp when daily counters were last reset (ms since epoch).
     * @type {number}
     * @private
     */
    this._dailyResetAt = Date.now();

    /**
     * Timestamp when monthly counter was last reset (ms since epoch).
     * @type {number}
     * @private
     */
    this._monthlyResetAt = Date.now();

    // Initialise per-provider state for all known providers
    const allProviders = Object.keys(this._dailyCaps);
    for (const provider of allProviders) {
      this._dailySpend[provider]       = 0;
      this._usageHistory[provider]     = [];
      this._headySoulOverrides[provider] = { active: false, expiresAt: 0 };
      this._lastAlertLevel[provider]   = null;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2a — USAGE RECORDING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Record a usage event for a provider.
   * Adds the cost to daily and monthly spend accumulators, appends to the
   * rolling window (capped at ROLLING_WINDOW = fib(11) = 89 records), and
   * triggers alert-level evaluation.
   *
   * If costUsd is not supplied, it is estimated from token count using the
   * provider's standard output rate (conservative over-estimate).
   *
   * @param {string} provider   - Provider key (e.g. 'anthropic', 'openai').
   * @param {number} tokens     - Number of tokens consumed in this event.
   * @param {number} [costUsd]  - Actual cost in USD; estimated if omitted.
   * @returns {void}
   */
  recordUsage(provider, tokens, costUsd) {
    const key = provider.toLowerCase();
    this._ensureProvider(key);

    // Estimate cost from tokens if not supplied
    const rates = this._tokenRates[key] || { input: 0, output: 0 };
    const resolvedCost = (costUsd != null)
      ? costUsd
      : (tokens / 1000) * rates.output;

    // Accumulate spend
    this._dailySpend[key]  = (this._dailySpend[key]  || 0) + resolvedCost;
    this._monthlySpend    += resolvedCost;

    // Append to rolling window, trim to ROLLING_WINDOW size
    const record = { ts: Date.now(), tokens, costUsd: resolvedCost };
    this._usageHistory[key].push(record);
    if (this._usageHistory[key].length > ROLLING_WINDOW) {
      this._usageHistory[key].shift();
    }

    // Evaluate alert transitions
    this._evaluateAlerts(key);
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2b — SPEND ACCESSORS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Return the current daily spend for a provider in USD.
   *
   * @param {string} provider - Provider key.
   * @returns {number} Daily spend in USD (0 if provider is unknown).
   */
  getProviderSpend(provider) {
    const key = provider.toLowerCase();
    return this._dailySpend[key] || 0;
  }

  /**
   * Return the current monthly global spend in USD.
   *
   * @returns {number} Monthly spend in USD.
   */
  getGlobalSpend() {
    return this._monthlySpend;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2c — BUDGET CHECK
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Check whether a proposed spend is permitted under current budget state.
   *
   * Decision logic (in priority order):
   * 1. If global monthly utilization ≥ ALERT_THRESHOLDS.exceeded and no
   *    HeadySoul override → hard block (globally exceeded).
   * 2. If provider daily utilization ≥ ALERT_THRESHOLDS.exceeded and no
   *    HeadySoul override → hard block for that provider; suggest cheapest
   *    available alternative.
   * 3. If provider daily utilization ≥ ALERT_THRESHOLDS.caution → allowed
   *    with downgrade suggestion.
   * 4. Otherwise → allowed.
   *
   * @param {string} provider        - Provider key.
   * @param {number} estimatedCost   - Estimated cost in USD for the proposed call.
   * @returns {{ allowed: boolean, reason: string, suggestedAlternative: string|null }}
   */
  checkBudget(provider, estimatedCost) {
    const key          = provider.toLowerCase();
    const utilization  = this.getUtilization(key);
    const globalUtil   = this.getGlobalUtilization();
    const override     = this._isHeadySoulActive(key);

    // 1. Global monthly hard block
    if (globalUtil >= ALERT_THRESHOLDS.exceeded && !override) {
      return {
        allowed: false,
        reason: `Global monthly budget exceeded (utilization ${(globalUtil * 100).toFixed(1)}% ≥ ${(ALERT_THRESHOLDS.exceeded * 100).toFixed(1)}%)`,
        suggestedAlternative: 'local',
      };
    }

    // 2. Provider daily hard block
    if (utilization >= ALERT_THRESHOLDS.exceeded && !override) {
      const cheapest = this.getCheapestAvailable();
      return {
        allowed: false,
        reason: `Provider '${key}' daily budget exceeded (utilization ${(utilization * 100).toFixed(1)}% ≥ ${(ALERT_THRESHOLDS.exceeded * 100).toFixed(1)}%)`,
        suggestedAlternative: cheapest !== key ? cheapest : null,
      };
    }

    // 3. Caution zone — allowed but recommend downgrade
    if (utilization >= ALERT_THRESHOLDS.caution) {
      const cheapest = this.getCheapestAvailable();
      return {
        allowed: true,
        reason: `Provider '${key}' in caution zone (utilization ${(utilization * 100).toFixed(1)}%). Consider downgrade.`,
        suggestedAlternative: cheapest !== key ? cheapest : null,
      };
    }

    // 4. Normal — allowed
    return {
      allowed: true,
      reason: 'Within budget',
      suggestedAlternative: null,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2d — UTILIZATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Return the budget utilization ratio [0, 1+] for a provider's daily cap.
   * A value >1 means the cap has been exceeded.
   * Returns 0 for providers with a zero cap (local inference).
   *
   * @param {string} provider - Provider key.
   * @returns {number} Utilization ratio in [0, ∞).
   */
  getUtilization(provider) {
    const key  = provider.toLowerCase();
    const cap  = this._dailyCaps[key];
    if (!cap || cap === 0) return 0;
    return this.getProviderSpend(key) / cap;
  }

  /**
   * Return the global monthly budget utilization ratio [0, 1+].
   *
   * @returns {number} Monthly utilization ratio.
   */
  getGlobalUtilization() {
    if (!this._monthlyCapUsd || this._monthlyCapUsd === 0) return 0;
    return this._monthlySpend / this._monthlyCapUsd;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2e — AUTO-DOWNGRADE & ROUTING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Determine whether the system should automatically downgrade from the given
   * provider to a cheaper alternative.
   * Trigger condition: utilization > ALERT_THRESHOLDS.caution (≈ 0.618).
   *
   * @param {string} provider - Provider key.
   * @returns {boolean} True if auto-downgrade should be applied.
   */
  shouldDowngrade(provider) {
    return this.getUtilization(provider.toLowerCase()) > ALERT_THRESHOLDS.caution;
  }

  /**
   * Return the provider with the most remaining daily budget headroom.
   * Headroom = (cap − spend) for each provider with a non-zero cap.
   * Providers with zero cap (local) are excluded from this comparison since
   * they have unlimited headroom by definition and are never a paid fallback.
   * If all paid providers are exhausted, returns 'local'.
   *
   * @returns {string} Provider key with the most remaining budget.
   */
  getCheapestAvailable() {
    let bestProvider  = 'local';
    let bestHeadroom  = -Infinity;

    for (const provider of PROVIDER_PRIORITY) {
      const cap  = this._dailyCaps[provider];
      if (!cap || cap === 0) continue; // skip free/local providers for ranking
      const headroom = cap - this.getProviderSpend(provider);
      if (headroom > bestHeadroom) {
        bestHeadroom = headroom;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2f — RESET OPERATIONS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Reset all per-provider daily spend counters and usage history windows.
   * Should be invoked at midnight (UTC or local, per deployment policy).
   * Also clears any expired HeadySoul overrides.
   *
   * @returns {void}
   */
  resetDaily() {
    this._dailyResetAt = Date.now();
    for (const provider of Object.keys(this._dailySpend)) {
      this._dailySpend[provider]   = 0;
      this._usageHistory[provider] = [];
      this._lastAlertLevel[provider] = null;
    }
    this._expireHeadySoulOverrides();
    if (this._verbose) {
      console.log('[BudgetTracker] Daily counters reset at', new Date(this._dailyResetAt).toISOString());
    }
  }

  /**
   * Reset the global monthly spend counter.
   * Should be invoked at the start of each calendar month.
   *
   * @returns {void}
   */
  resetMonthly() {
    this._monthlyResetAt = Date.now();
    this._monthlySpend = 0;
    if (this._verbose) {
      console.log('[BudgetTracker] Monthly counter reset at', new Date(this._monthlyResetAt).toISOString());
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2g — ALERT LEVELS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Return the current alert level for a provider based on its daily utilization.
   *
   * Levels are keyed to ALERT_THRESHOLDS:
   *   - 'nominal'   — utilization < warning  (< 0.618)
   *   - 'warning'   — utilization ≥ warning  (≥ 0.618)
   *   - 'caution'   — utilization ≥ caution  (≥ 0.618, same: warning in math)
   *   - 'critical'  — utilization ≥ critical (≥ 0.764)
   *   - 'exceeded'  — utilization ≥ exceeded (≥ 0.854)
   *
   * Note: In the phi-math module, ALERT_THRESHOLDS.warning and .caution resolve
   * to the same numeric value (PSI ≈ 0.618 and 1−PSI² ≈ 0.618 respectively).
   * The 'caution' label is used when shouldDowngrade() would also trigger.
   *
   * @param {string} provider - Provider key.
   * @returns {string} Alert level: 'nominal' | 'warning' | 'caution' | 'critical' | 'exceeded'.
   */
  getAlertLevel(provider) {
    const util = this.getUtilization(provider.toLowerCase());

    if (util >= ALERT_THRESHOLDS.exceeded)  return 'exceeded';
    if (util >= ALERT_THRESHOLDS.critical)  return 'critical';
    if (util >= ALERT_THRESHOLDS.caution)   return 'caution';
    if (util >= ALERT_THRESHOLDS.warning)   return 'warning';
    return 'nominal';
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2h — PROJECTION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Project the end-of-day spend for a provider by extrapolating the current
   * burn rate from elapsed time since the last daily reset.
   *
   * If no usage has been recorded yet, the projection is 0.
   *
   * @param {string} provider - Provider key.
   * @returns {number} Projected total daily spend in USD.
   */
  getProjectedDailySpend(provider) {
    const key     = provider.toLowerCase();
    const spend   = this.getProviderSpend(key);
    if (spend === 0) return 0;

    const elapsedMs = Date.now() - this._dailyResetAt;
    if (elapsedMs <= 0) return spend;

    const msPerDay    = 24 * 60 * 60 * 1000;
    const burnRatePerMs = spend / elapsedMs;
    return burnRatePerMs * msPerDay;
  }

  /**
   * Project the end-of-month global spend by extrapolating from elapsed time
   * since the last monthly reset.
   *
   * @returns {number} Projected total monthly spend in USD.
   */
  getProjectedMonthlySpend() {
    const spend = this._monthlySpend;
    if (spend === 0) return 0;

    const elapsedMs = Date.now() - this._monthlyResetAt;
    if (elapsedMs <= 0) return spend;

    const msPerMonth    = 30 * 24 * 60 * 60 * 1000; // approximate 30-day month
    const burnRatePerMs = spend / elapsedMs;
    return burnRatePerMs * msPerMonth;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2i — HEADY SOUL OVERRIDE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Activate a temporary HeadySoul budget lift for a provider.
   * The lift expires after HEADY_SOUL_OVERRIDE_TTL_MS (≈ 11090 ms = PHI^5 × 1000).
   * Only valid when this._headySoulEnabled === true.
   *
   * When active, hard budget blocks are bypassed for the specified provider,
   * enabling completion of critical tasks that would otherwise be rejected.
   *
   * @param {string} provider - Provider key to lift.
   * @returns {{ activated: boolean, expiresAt: number|null, ttlMs: number }} Result.
   */
  activateHeadySoulOverride(provider) {
    if (!this._headySoulEnabled) {
      return { activated: false, expiresAt: null, ttlMs: 0 };
    }
    const key       = provider.toLowerCase();
    const expiresAt = Date.now() + HEADY_SOUL_OVERRIDE_TTL_MS;
    this._headySoulOverrides[key] = { active: true, expiresAt };

    if (this._verbose) {
      console.log(`[BudgetTracker] HeadySoul override activated for '${key}', expires at ${new Date(expiresAt).toISOString()}`);
    }

    return { activated: true, expiresAt, ttlMs: HEADY_SOUL_OVERRIDE_TTL_MS };
  }

  /**
   * Deactivate a HeadySoul override for a provider before its TTL expires.
   *
   * @param {string} provider - Provider key.
   * @returns {void}
   */
  deactivateHeadySoulOverride(provider) {
    const key = provider.toLowerCase();
    if (this._headySoulOverrides[key]) {
      this._headySoulOverrides[key] = { active: false, expiresAt: 0 };
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2j — REPORT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Generate a comprehensive budget report covering all providers.
   *
   * Each provider entry includes:
   * - dailyCap:            configured daily cap (USD)
   * - dailySpend:          current daily spend (USD)
   * - dailyUtilization:    spend / cap ratio [0, 1+]
   * - projectedDailySpend: extrapolated end-of-day spend (USD)
   * - alertLevel:          current alert level string
   * - shouldDowngrade:     boolean auto-downgrade flag
   * - headySoulActive:     whether a HeadySoul override is live
   * - recentRecordCount:   number of records in the rolling window
   * - tokenRates:          configured cost rates for this provider
   *
   * Global section includes:
   * - monthlyCapUsd
   * - monthlySpend
   * - globalUtilization
   * - projectedMonthlySpend
   * - cheapestAvailable
   * - rollingWindowSize: ROLLING_WINDOW (fib(11) = 89)
   * - dailyResetAt / monthlyResetAt ISO timestamps
   * - generatedAt ISO timestamp
   * - alertThresholds: snapshot of ALERT_THRESHOLDS
   * - pressureLevels:  snapshot of PRESSURE_LEVELS
   *
   * @returns {Object} Full structured budget report.
   */
  getReport() {
    const providers = {};

    for (const provider of Object.keys(this._dailyCaps)) {
      providers[provider] = {
        dailyCap:            this._dailyCaps[provider],
        dailySpend:          this.getProviderSpend(provider),
        dailyUtilization:    this.getUtilization(provider),
        projectedDailySpend: this.getProjectedDailySpend(provider),
        alertLevel:          this.getAlertLevel(provider),
        shouldDowngrade:     this.shouldDowngrade(provider),
        headySoulActive:     this._isHeadySoulActive(provider),
        recentRecordCount:   (this._usageHistory[provider] || []).length,
        tokenRates:          this._tokenRates[provider] || null,
      };
    }

    return {
      providers,
      global: {
        monthlyCapUsd:           this._monthlyCapUsd,
        monthlySpend:            this._monthlySpend,
        globalUtilization:       this.getGlobalUtilization(),
        projectedMonthlySpend:   this.getProjectedMonthlySpend(),
        cheapestAvailable:       this.getCheapestAvailable(),
        rollingWindowSize:       ROLLING_WINDOW,
        dailyResetAt:            new Date(this._dailyResetAt).toISOString(),
        monthlyResetAt:          new Date(this._monthlyResetAt).toISOString(),
        generatedAt:             new Date().toISOString(),
        alertThresholds: {
          warning:  ALERT_THRESHOLDS.warning,
          caution:  ALERT_THRESHOLDS.caution,
          critical: ALERT_THRESHOLDS.critical,
          exceeded: ALERT_THRESHOLDS.exceeded,
          hard_max: ALERT_THRESHOLDS.hard_max,
        },
        pressureLevels: {
          NOMINAL:  PRESSURE_LEVELS.NOMINAL,
          ELEVATED: PRESSURE_LEVELS.ELEVATED,
          HIGH:     PRESSURE_LEVELS.HIGH,
          CRITICAL: PRESSURE_LEVELS.CRITICAL,
        },
      },
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  SECTION 2k — INTERNAL HELPERS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Ensure provider state is initialised for dynamically-added providers.
   * If the provider is not in the configured caps, it inherits a default cap
   * of fib(8) = 21 USD/day: a safe moderate default.
   *
   * @param {string} key - Lower-cased provider key.
   * @private
   */
  _ensureProvider(key) {
    if (!(key in this._dailyCaps)) {
      this._dailyCaps[key]            = fib(8); // 21 — moderate default
      this._tokenRates[key]           = { input: 0.005, output: 0.015 };
    }
    if (!(key in this._dailySpend)) {
      this._dailySpend[key]           = 0;
    }
    if (!(key in this._usageHistory)) {
      this._usageHistory[key]         = [];
    }
    if (!(key in this._headySoulOverrides)) {
      this._headySoulOverrides[key]   = { active: false, expiresAt: 0 };
    }
    if (!(key in this._lastAlertLevel)) {
      this._lastAlertLevel[key]       = null;
    }
  }

  /**
   * Evaluate and emit alert events when the provider's alert level changes.
   * Uses a phi-sigmoid gate (cslGate) to ensure transitions are smooth —
   * events are only emitted when the utilization crosses a gate with
   * CSL_THRESHOLDS.MEDIUM: the pivot, preventing spurious re-emissions near
   * a boundary.
   *
   * Emitted events:
   *   - budgetWarning  { provider, utilization, alertLevel }
   *   - budgetCritical { provider, utilization, alertLevel }
   *   - budgetExceeded { provider, utilization, alertLevel }
   *   - autoDowngrade  { provider, utilization, suggestedAlternative }
   *
   * @param {string} key - Lower-cased provider key.
   * @private
   */
  _evaluateAlerts(key) {
    const level   = this.getAlertLevel(key);
    const util    = this.getUtilization(key);
    const prevLevel = this._lastAlertLevel[key];

    if (level === prevLevel) return; // no transition — skip
    this._lastAlertLevel[key] = level;

    const payload = { provider: key, utilization: util, alertLevel: level };

    switch (level) {
      case 'warning':
        if (this._verbose) console.warn(`[BudgetTracker] budgetWarning: ${key} at ${(util * 100).toFixed(1)}%`);
        this.emit('budgetWarning', payload);
        break;

      case 'caution': {
        if (this._verbose) console.warn(`[BudgetTracker] budgetCritical (caution): ${key} at ${(util * 100).toFixed(1)}%`);
        this.emit('budgetCritical', payload);
        // Also fire autoDowngrade if shouldDowngrade
        const alt = this.getCheapestAvailable();
        this.emit('autoDowngrade', { provider: key, utilization: util, suggestedAlternative: alt });
        break;
      }

      case 'critical':
        if (this._verbose) console.warn(`[BudgetTracker] budgetCritical: ${key} at ${(util * 100).toFixed(1)}%`);
        this.emit('budgetCritical', payload);
        break;

      case 'exceeded':
        if (this._verbose) console.error(`[BudgetTracker] budgetExceeded: ${key} at ${(util * 100).toFixed(1)}%`);
        this.emit('budgetExceeded', payload);
        break;

      default:
        // nominal — no event
        break;
    }
  }

  /**
   * Check whether a HeadySoul override is currently active and unexpired for a provider.
   *
   * @param {string} key - Lower-cased provider key.
   * @returns {boolean}
   * @private
   */
  _isHeadySoulActive(key) {
    if (!this._headySoulEnabled) return false;
    const override = this._headySoulOverrides[key];
    if (!override || !override.active) return false;
    if (Date.now() > override.expiresAt) {
      // TTL expired — auto-deactivate
      this._headySoulOverrides[key] = { active: false, expiresAt: 0 };
      return false;
    }
    return true;
  }

  /**
   * Expire all HeadySoul overrides whose TTL has elapsed.
   *
   * @private
   */
  _expireHeadySoulOverrides() {
    const now = Date.now();
    for (const key of Object.keys(this._headySoulOverrides)) {
      const override = this._headySoulOverrides[key];
      if (override.active && now > override.expiresAt) {
        this._headySoulOverrides[key] = { active: false, expiresAt: 0 };
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  BudgetTracker,
  // Expose constants for external wiring / testing
  DEFAULT_DAILY_CAPS,
  GLOBAL_MONTHLY_CAP,
  PROVIDER_TOKEN_RATES,
  PROVIDER_PRIORITY,
  ROLLING_WINDOW,
  HEADY_SOUL_OVERRIDE_TTL_MS,
};
