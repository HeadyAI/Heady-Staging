/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ LLM ROUTER                                              ║
 * ║  Dynamic LLM Provider Routing with Task-Aware Model Selection    ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║  60+ Provisional Patents — All Rights Reserved                   ║
 * ║  © 2026-2026 HeadySystems Inc. All Rights Reserved.              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Routes LLM requests by task type using CSL cosine similarity, with
 * liquid failover, budget tracking, and arena mode (3-model synthesis).
 *
 * @module llm-router
 */

const { EventEmitter } = require("events");
const { PHI, PSI, PSI_2, PSI_3, fib, FIBONACCI, phiBackoff, phiBackoffWithJitter, phiFusionWeights, phiFusionScore, CSL_THRESHOLDS, TIMEOUT_TIERS, } = (function() { try { return require("../shared/phi-math.js"); } catch(e) { return {}; } })();
const { cslAND, cslCONSENSUS, normalize } = (function() { try { return require("../shared/csl-engine.js"); } catch(e) { return {}; } })();

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Budget auto-downgrade threshold: ψ ≈ 0.618 */
const BUDGET_DOWNGRADE_RATIO = PSI; // 0.618

/** Circuit-breaker failure threshold: fib(5) = 5 */
const CB_FAILURE_THRESHOLD = fib(5); // 5

/** Half-open probes: fib(3) = 2 */
const CB_HALF_OPEN_PROBES = fib(3); // 2

/** Heartbeat interval: fib(7) × 1000 = 13 000 ms */
const HEARTBEAT_INTERVAL_MS = fib(7) * 1000; // 13 000

/** Arena mode minimum contestants: fib(4) = 3 */
const ARENA_MIN_CONTESTANTS = fib(4); // 3

/** Rate limit retry delay base: fib(6) × 1000 = 8 000 ms */
const RATE_LIMIT_RETRY_BASE_MS = fib(6) * 1000; // 8 000

/** CSL capability vector dimension: fib(9) = 34 */
const CAP_VEC_DIM = fib(9); // 34

/** Default max tokens for a single request: fib(11) × fib(4) = 89 × 3 = 267 → rounded to fib(8)×fib(6) = 21×8 = 168, use 512 (fib values) */
const DEFAULT_MAX_TOKENS = fib(8) * fib(6); // 21 × 8 = 168 — see spec note; use fib(9)×fib(5)=34×5=170 ≈ 200; practical default: fib(10)*fib(5)=55×5=275

// ─── TASK TYPES ──────────────────────────────────────────────────────────────

/**
 * Canonical task type identifiers.
 */
const TASK_TYPES = Object.freeze({
  CODE_GENERATION: 'code_generation',
  CODE_REVIEW:     'code_review',
  ARCHITECTURE:    'architecture',
  RESEARCH:        'research',
  QUICK_TASKS:     'quick_tasks',
  CREATIVE:        'creative',
  SECURITY:        'security',
  DOCS:            'docs',
  EMBEDDINGS:      'embeddings',
});

// ─── ROUTING MATRIX ──────────────────────────────────────────────────────────

/**
 * Task → primary/fallback1/fallback2 routing matrix.
 * All model IDs use lowercase-hyphen convention.
 */
const ROUTING_MATRIX = Object.freeze({
  [TASK_TYPES.CODE_GENERATION]: {
    primary:   'claude-3-5-sonnet-20241022',
    fallback1: 'gpt-4o',
    fallback2: 'gemini-2.5-pro',
  },
  [TASK_TYPES.CODE_REVIEW]: {
    primary:   'claude-3-5-sonnet-20241022',
    fallback1: 'gpt-4o',
    fallback2: 'gemini-2.0-flash',
  },
  [TASK_TYPES.ARCHITECTURE]: {
    primary:   'claude-3-5-sonnet-20241022',
    fallback1: 'gpt-4o',
    fallback2: 'gemini-2.5-pro',
  },
  [TASK_TYPES.RESEARCH]: {
    primary:   'sonar-pro',
    fallback1: 'gemini-2.0-flash',
    fallback2: 'gpt-4o',
  },
  [TASK_TYPES.QUICK_TASKS]: {
    primary:   'gemini-2.0-flash',
    fallback1: 'llama-3.3-70b-versatile',
    fallback2: 'gpt-4o-mini',
  },
  [TASK_TYPES.CREATIVE]: {
    primary:   'claude-3-5-sonnet-20241022',
    fallback1: 'gpt-4o',
    fallback2: 'gemini-2.5-pro',
  },
  [TASK_TYPES.SECURITY]: {
    primary:   'claude-3-5-sonnet-20241022',
    fallback1: 'gpt-4o',
    fallback2: 'gemini-2.0-flash',
  },
  [TASK_TYPES.DOCS]: {
    primary:   'gpt-4o',
    fallback1: 'claude-3-5-sonnet-20241022',
    fallback2: 'gemini-2.0-flash',
  },
  [TASK_TYPES.EMBEDDINGS]: {
    primary:   'text-embedding-3-large',
    fallback1: 'nomic-embed-text-v1.5',
    fallback2: 'bge-m3',
  },
});

// ─── PROVIDER REGISTRY ───────────────────────────────────────────────────────

/**
 * Default provider → endpoint + key mapping.
 * Keyed by model family.
 */
const PROVIDER_ENDPOINTS = Object.freeze({
  'claude':      { baseUrl: 'https://api.anthropic.com/v1',                  envKey: 'ANTHROPIC_API_KEY' },
  'gpt-4o':      { baseUrl: 'https://api.openai.com/v1',                     envKey: 'OPENAI_API_KEY' },
  'gpt-4o-mini': { baseUrl: 'https://api.openai.com/v1',                     envKey: 'OPENAI_API_KEY' },
  'gemini':      { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', envKey: 'GEMINI_API_KEY' },
  'sonar':       { baseUrl: 'https://api.perplexity.ai',                     envKey: 'PERPLEXITY_API_KEY' },
  'llama':       { baseUrl: 'https://api.groq.com/openai/v1',               envKey: 'GROQ_API_KEY' },
  'ollama':      { baseUrl: 'http://localhost:11434',                         envKey: null },
});

/** Monthly budget cap (USD) global: ψ² × fib(10) × $10 ≈ 0.382 × 55 × $10 = $210 */
const MONTHLY_CAP_USD = PSI_2 * fib(10) * 10; // ≈ 210

/** Per-provider daily cap (USD): PHI × $10 ≈ $16.18 */
const DAILY_CAP_USD = PHI * 10; // ≈ 16.18

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function _seededVec(seed, dim) {
  const v = new Float64Array(dim);
  for (let i = 0; i < dim; i++) v[i] = Math.sin(seed.charCodeAt(i % seed.length) * PHI + i * PSI);
  return normalize(v);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── CIRCUIT BREAKER ─────────────────────────────────────────────────────────

class CircuitBreaker {
  constructor(modelId) {
    this.modelId  = modelId;
    this.state    = 'closed';
    this.failures = 0;
    this.openedAt = null;
    this.attempt  = 0;
    this.probes   = 0;
  }
  recordSuccess() {
    this.failures = 0;
    this.state    = 'closed';
    this.attempt  = 0;
    this.probes   = 0;
  }
  recordFailure() {
    this.failures++;
    if (this.failures >= CB_FAILURE_THRESHOLD) {
      this.state    = 'open';
      this.openedAt = Date.now();
      this.attempt++;
    }
  }
  canRequest() {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.openedAt > phiBackoff(this.attempt - 1)) {
        this.state  = 'half_open';
        this.probes = 0;
      } else return false;
    }
    return this.probes++ < CB_HALF_OPEN_PROBES;
  }
}

// ─── MODEL RECORD ────────────────────────────────────────────────────────────

class ModelRecord {
  constructor({ modelId, providerFamily, baseUrl, dailyCapUsd, costPerToken }) {
    this.modelId       = modelId;
    this.providerFamily = providerFamily;
    this.baseUrl       = baseUrl;
    this.dailyCapUsd   = dailyCapUsd ?? DAILY_CAP_USD;
    this.costPerToken  = costPerToken ?? PSI_10; // ψ¹⁰ per token
    this.apiKey        = null;
    this.dailySpend    = 0;
    this.monthlySpend  = 0;
    this.callCount     = 0;
    this.errorCount    = 0;
    this.lastReset     = Date.now();
    this.cb            = new CircuitBreaker(modelId);
    this.capVec        = _seededVec(modelId, CAP_VEC_DIM);
  }

  checkReset() {
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (Date.now() - this.lastReset > oneDayMs) {
      this.dailySpend = 0;
      this.lastReset  = Date.now();
    }
  }

  get budgetExhausted() {
    this.checkReset();
    return this.dailySpend / this.dailyCapUsd >= BUDGET_DOWNGRADE_RATIO;
  }
}

// ─── LLM ROUTER ──────────────────────────────────────────────────────────────

/**
 * LLMRouter — Dynamic task-aware LLM provider routing.
 *
 * Classifies request task type using CSL cosine similarity, looks up
 * the routing matrix for primary/fallback1/fallback2 models, and
 * applies liquid failover with phi-backoff. Supports arena mode where
 * 3+ models respond and a CSL consensus synthesizes the winner.
 *
 * @extends EventEmitter
 */
class LLMRouter extends EventEmitter {
  /**
   * @param {object} [opts]
   * @param {boolean} [opts.enableHeartbeat=true]
   * @param {number}  [opts.monthlyCap]  - Override global monthly cap (USD).
   */
  constructor(opts = {}) {
    super();
    this._models       = new Map();
    this._monthlyCap   = opts.monthlyCap ?? MONTHLY_CAP_USD;
    this._monthlySpend = 0;
    this._heartbeatRef = null;

    /** @type {import('../governance/governance-engine').GovernanceEngine|null} */
    this._governanceEngine = opts.governanceEngine || null;

    this._registerDefaultModels();

    if (opts.enableHeartbeat !== false) {
      this._startHeartbeat();
    }
  }

  // ─── MODEL REGISTRATION ────────────────────────────────────────────────────

  /** @private */
  _registerDefaultModels() {
    const models = [
      { modelId: 'claude-3-5-sonnet-20241022', providerFamily: 'claude', baseUrl: PROVIDER_ENDPOINTS.claude.baseUrl },
      { modelId: 'gpt-4o',                     providerFamily: 'gpt-4o', baseUrl: PROVIDER_ENDPOINTS['gpt-4o'].baseUrl },
      { modelId: 'gpt-4o-mini',                providerFamily: 'gpt-4o-mini', baseUrl: PROVIDER_ENDPOINTS['gpt-4o-mini'].baseUrl },
      { modelId: 'gemini-2.0-flash',           providerFamily: 'gemini', baseUrl: PROVIDER_ENDPOINTS.gemini.baseUrl },
      { modelId: 'gemini-2.5-pro',             providerFamily: 'gemini', baseUrl: PROVIDER_ENDPOINTS.gemini.baseUrl },
      { modelId: 'sonar-pro',                  providerFamily: 'sonar',  baseUrl: PROVIDER_ENDPOINTS.sonar.baseUrl },
      { modelId: 'llama-3.3-70b-versatile',    providerFamily: 'llama',  baseUrl: PROVIDER_ENDPOINTS.llama.baseUrl },
    ];
    for (const m of models) {
      this._models.set(m.modelId, new ModelRecord(m));
    }
  }

  /**
   * Register a custom model or update an existing one.
   * @param {object} cfg - ModelRecord-compatible config.
   */
  addProvider(cfg) {
    this._models.set(cfg.modelId, new ModelRecord(cfg));
    this.emit('provider:added', { modelId: cfg.modelId });
  }

  // ─── TASK CLASSIFICATION ───────────────────────────────────────────────────

  /**
   * Classify the task type of a request using CSL cosine similarity.
   * Compares the prompt's seeded vector against per-task-type vectors.
   *
   * @param {string} prompt
   * @returns {string} TASK_TYPES value.
   */
  classifyTask(prompt) {
    const promptVec = _seededVec(prompt.slice(0, fib(8)), CAP_VEC_DIM);

    let bestType  = TASK_TYPES.QUICK_TASKS;
    let bestScore = -Infinity;

    for (const taskType of Object.values(TASK_TYPES)) {
      const taskVec = _seededVec(taskType, CAP_VEC_DIM);
      const score   = cslAND(promptVec, taskVec);
      if (score > bestScore) { bestScore = score; bestType = taskType; }
    }

    this.emit('task:classified', { taskType: bestType, score: bestScore });
    return bestType;
  }

  // ─── MODEL EXECUTION ───────────────────────────────────────────────────────

  /**
   * Execute a request against a single model.
   * @param {ModelRecord} model
   * @param {object}      request
   * @param {AbortSignal} [signal]
   * @returns {Promise<object>}
   */
  async _execute(model, request, signal) {
    const apiKey  = model.apiKey || request.apiKey;
    const headers = {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };

    const body = JSON.stringify({
      model:      model.modelId,
      messages:   request.messages,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...request.extra,
    });

    const start = Date.now();
    const res   = await fetch(`${model.baseUrl}/chat/completions`, {
      method: 'POST', headers, body, signal,
    });
    const latencyMs = Date.now() - start;

    if (res.status === 429) {
      const err     = new Error(`[${model.modelId}] rate limited`);
      err.isRateLimit = true;
      throw err;
    }

    if (!res.ok) {
      const err = new Error(`[${model.modelId}] HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    model.cb.recordSuccess();
    if (this._governanceEngine) {
      this._governanceEngine.circuitBreakerSuccess(model.providerFamily);
    }
    model.callCount++;

    // Budget tracking
    const tokens = data.usage?.total_tokens ?? 0;
    const cost   = tokens * model.costPerToken;
    model.dailySpend   += cost;
    model.monthlySpend += cost;
    this._monthlySpend += cost;

    this.emit('request:success', { modelId: model.modelId, latencyMs, tokens, cost });
    return data;
  }

  // ─── LIQUID FAILOVER ───────────────────────────────────────────────────────

  /**
   * Route a request through the liquid failover chain:
   * primary → (rate_limit? wait) → fallback1 → fallback2.
   * Auto-downgrades to fallbacks when primary has consumed ψ=61.8% of daily budget.
   *
   * @param {object}  request
   * @param {string}  [request.taskType]  - Override auto-classification.
   * @param {string}  [request.apiKey]    - BYOK override.
   * @returns {Promise<{result: object, modelId: string, taskType: string}>}
   */
  async route(request) {
    // Global monthly budget guard
    if (this._monthlySpend / this._monthlyCap >= BUDGET_DOWNGRADE_RATIO) {
      this.emit('budget:monthly-warning', { spend: this._monthlySpend, cap: this._monthlyCap });
    }

    const prompt   = request.messages?.find(m => m.role === 'user')?.content ?? '';
    const taskType = request.taskType ?? this.classifyTask(prompt);
    const matrix   = ROUTING_MATRIX[taskType] ?? ROUTING_MATRIX[TASK_TYPES.QUICK_TASKS];

    const modelChain = [matrix.primary, matrix.fallback1, matrix.fallback2]
      .map(id => this._models.get(id))
      .filter(Boolean)
      // Skip budget-exhausted non-final models (always attempt fallback2)
      .filter((m, idx) => idx === fib(3) - 1 || !m.budgetExhausted);

    let lastError;
    for (let attempt = 0; attempt < modelChain.length; attempt++) {
      const model = modelChain[attempt];

      // Governance-level circuit breaker check (provider family)
      if (this._governanceEngine && !this._governanceEngine.circuitBreakerCanRequest(model.providerFamily)) {
        this.emit('cb:governance-blocked', { modelId: model.modelId, provider: model.providerFamily, attempt });
        continue;
      }

      if (!model.cb.canRequest()) {
        this.emit('cb:blocked', { modelId: model.modelId, attempt });
        continue;
      }

      try {
        const result = await this._execute(model, request);
        return { result, modelId: model.modelId, taskType };
      } catch (err) {
        lastError = err;

        if (err.isRateLimit) {
          const waitMs = phiBackoff(attempt, RATE_LIMIT_RETRY_BASE_MS);
          this.emit('rate-limit:wait', { modelId: model.modelId, waitMs });
          await sleep(waitMs);
          // Retry same model once before moving on
          try {
            const result = await this._execute(model, request);
            return { result, modelId: model.modelId, taskType };
          } catch (retryErr) {
            lastError = retryErr;
          }
        }

        model.cb.recordFailure();
        if (this._governanceEngine) {
          this._governanceEngine.circuitBreakerFailure(model.providerFamily);
        }
        model.errorCount++;
        this.emit('request:error', { modelId: model.modelId, error: err.message, attempt });

        if (attempt < modelChain.length - 1) {
          await sleep(phiBackoffWithJitter(attempt));
        }
      }
    }

    throw lastError || new Error('LLMRouter: entire model chain exhausted');
  }

  // ─── ARENA MODE ────────────────────────────────────────────────────────────

  /**
   * Arena mode: send the same prompt to ARENA_MIN_CONTESTANTS=3 models in parallel,
   * CSL-score each response against the task intent vector, and synthesize a winner.
   *
   * @param {object}   request
   * @param {string[]} [modelIds] - Explicit contestant model IDs (min 3).
   * @returns {Promise<{winner: string, synthesis: string, scores: object[], taskType: string}>}
   */
  async arenaMode(request, modelIds) {
    const prompt   = request.messages?.find(m => m.role === 'user')?.content ?? '';
    const taskType = request.taskType ?? this.classifyTask(prompt);
    const taskVec  = _seededVec(taskType, CAP_VEC_DIM);

    let contestants;
    if (modelIds?.length >= ARENA_MIN_CONTESTANTS) {
      contestants = modelIds.map(id => this._models.get(id)).filter(Boolean);
    } else {
      // Pick top ARENA_MIN_CONTESTANTS models by CSL score
      const ranked = [...this._models.values()]
        .filter(m => m.cb.canRequest() && !m.budgetExhausted)
        .map(m => ({ model: m, score: cslAND(taskVec, m.capVec) }))
        .sort((a, b) => b.score - a.score);
      contestants = ranked.slice(0, ARENA_MIN_CONTESTANTS).map(r => r.model);
    }

    if (contestants.length < fib(3)) { // fib(3)=2 minimum to be useful
      throw new Error('LLMRouter.arenaMode: insufficient available contestants');
    }

    this.emit('arena:start', { contestants: contestants.map(m => m.modelId), taskType });

    // Fire all contestants in parallel
    const settled = await Promise.allSettled(
      contestants.map(m => this._execute(m, request).then(r => ({ modelId: m.modelId, result: r })))
    );

    // Collect successful responses
    const responses = settled
      .filter(s => s.status === 'fulfilled')
      .map(s => s.value);

    if (responses.length === 0) {
      throw new Error('LLMRouter.arenaMode: all contestants failed');
    }

    // CSL-score each response content against task intent vector
    const scored = responses.map(({ modelId, result }) => {
      const content  = result.choices?.[0]?.message?.content ?? '';
      const respVec  = _seededVec(content.slice(0, fib(8)), CAP_VEC_DIM);
      const score    = cslAND(taskVec, respVec);
      return { modelId, result, content, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const winner = scored[0];

    // Synthesize winner content (phi-weighted blend of top responses)
    const weights = phiFusionWeights(Math.min(scored.length, ARENA_MIN_CONTESTANTS));
    const synthParts = scored
      .slice(0, weights.length)
      .map((s, i) => `[${s.modelId} w=${weights[i].toFixed(fib(3))}]\n${s.content}`);
    const synthesis = synthParts.join('\n\n---\n\n');

    this.emit('arena:complete', {
      winner: winner.modelId,
      scores: scored.map(s => ({ modelId: s.modelId, score: +s.score.toFixed(fib(3)) })),
    });

    return {
      winner:   winner.modelId,
      synthesis,
      result:   winner.result,
      scores:   scored.map(s => ({ modelId: s.modelId, score: s.score })),
      taskType,
    };
  }

  // ─── BUDGET STATUS ─────────────────────────────────────────────────────────

  /**
   * Return comprehensive budget status for all models and global cap.
   * @returns {object}
   */
  getBudgetStatus() {
    const perModel = [...this._models.values()].map(m => {
      m.checkReset();
      return {
        modelId:       m.modelId,
        dailySpend:    +m.dailySpend.toFixed(6),
        dailyCap:      m.dailyCapUsd,
        dailyRatio:    +(m.dailySpend / m.dailyCapUsd).toFixed(fib(3)),
        degraded:      m.budgetExhausted,
        monthlySpend:  +m.monthlySpend.toFixed(6),
      };
    });

    return {
      globalMonthlySpend: +this._monthlySpend.toFixed(6),
      globalMonthlyCap:   +this._monthlyCap.toFixed(2),
      globalRatio:        +(this._monthlySpend / this._monthlyCap).toFixed(fib(3)),
      downgradeThreshold: BUDGET_DOWNGRADE_RATIO,
      perModel,
    };
  }

  // ─── HEALTH MONITORING ─────────────────────────────────────────────────────

  /** @private */
  _startHeartbeat() {
    this._heartbeatRef = setInterval(() => {
      this._runHeartbeat().catch(err =>
        this.emit('heartbeat:error', { error: err.message })
      );
    }, HEARTBEAT_INTERVAL_MS);
    if (this._heartbeatRef.unref) this._heartbeatRef.unref();
  }

  /** @private */
  async _runHeartbeat() {
    const checks = [...this._models.values()].map(async (m) => {
      try {
        const endpoint = `${m.baseUrl}/models`;
        await fetch(endpoint, {
          method: 'GET',
          signal: AbortSignal.timeout(fib(5) * 1000), // 5 000 ms
        });
        this.emit('heartbeat:ok', { modelId: m.modelId });
      } catch {
        this.emit('heartbeat:degraded', { modelId: m.modelId });
      }
    });
    await Promise.allSettled(checks);
  }

  /** Stop the heartbeat. */
  stopHeartbeat() {
    if (this._heartbeatRef) {
      clearInterval(this._heartbeatRef);
      this._heartbeatRef = null;
    }
  }

  /** Set a BYOK API key for a model. */
  setApiKey(modelId, apiKey) {
    const m = this._models.get(modelId);
    if (!m) throw new Error(`LLMRouter: unknown model '${modelId}'`);
    m.apiKey = apiKey;
    this.emit('provider:key-set', { modelId });
  }
}

module.exports = LLMRouter;
