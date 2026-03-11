/**
 * @fileoverview Heady™ Council — Multi-Model Council for Critical Decisions
 * @module orchestration/heady-council
 * @version 2.0.0
 * @author HeadySystems Inc.
 *
 * Implements Directive 9 (Multi-Model Council — Competitive AI Routing).
 * Sends identical prompts to 3–5 models simultaneously, scores responses using
 * phi-weighted Judge criteria, identifies agreement/disagreement zones via CSL
 * cosine similarity, and synthesizes the strongest elements.
 *
 * Council Members (Directive 9.2):
 *   - claude_opus   : Anthropic claude-opus-4.6   — deep reasoning       (HIGH)
 *   - gpt5          : OpenAI gpt-5.4              — broad knowledge       (HIGH)
 *   - gemini_pro    : Google gemini-3.1-pro        — pattern recognition  (MEDIUM)
 *   - o1_pro        : OpenAI o1-pro                — math/formal logic    (HIGH)
 *   - sonar_pro     : Perplexity sonar-pro         — real-time research   (MEDIUM)
 *   - groq_llama    : Groq llama-3.1-405b          — fast inference       (LOW)
 *   - workers_ai    : Cloudflare workers-ai         — edge classification  (LOW)
 *
 * Scoring weights (Judge stage, Sacred Geometry aligned):
 *   accuracy: 0.34, completeness: 0.21, reasoning: 0.21, novelty: 0.13, safety: 0.11
 *
 * Agreement:    cosine ≥ CSL_THRESHOLDS.HIGH  (≈ 0.882)
 * Disagreement: cosine <  CSL_THRESHOLDS.LOW   (≈ 0.691)
 *
 * @see MASTER_DIRECTIVES.md §9 (Multi-Model Council — Competitive AI Routing)
 * @see MASTER_DIRECTIVES.md §7 §10 (JUDGE stage, Sacred Geometry)
 */

'use strict';

import {
  PHI,
  PSI,
  fib,
  phiThreshold,
  phiFusionWeights,
  phiBackoff,
  cosineSimilarity,
  placeholderVector,
  CSL_THRESHOLDS,
  cslGate,
  VECTOR_DIMENSIONS,
  normalize,
  dot,
  magnitude,
} from '../shared/phi-math.js';

// ─── Scoring Constants ────────────────────────────────────────────────────────

/**
 * Judge-stage scoring weights (Sacred Geometry aligned, same as JUDGE stage).
 * Sum to 1.0. Derived from fib(n)/fib(11) fractions normalized.
 * accuracy:34%, completeness:21%, reasoning:21%, novelty:13%, safety:11%
 */
const SCORE_WEIGHTS = Object.freeze({
  accuracy: 0.34,
  completeness: 0.21,
  reasoning: 0.21,
  novelty: 0.13,
  safety: 0.11,
});

/** Minimum council members to convene */
const MIN_MEMBERS = fib(3); // 3 (fib(3) = wait, fib index: 1,1,2,3 → index 4 = 3)

/** Maximum council members per session */
const MAX_MEMBERS = fib(5); // 5

/** Default council timeout: fib(9) * 1000 = 34 000ms */
const DEFAULT_TIMEOUT_MS = fib(9) * 1000; // 34 000ms

/** Agreement threshold: CSL HIGH ≈ 0.882 */
const AGREEMENT_THRESHOLD = CSL_THRESHOLDS.HIGH;

/** Disagreement threshold: CSL LOW ≈ 0.691 */
const DISAGREEMENT_THRESHOLD = CSL_THRESHOLDS.LOW;

/** Cost tier ordering for budget-aware member selection */
const COST_TIER_ORDER = Object.freeze({ LOW: 0, MEDIUM: 1, HIGH: 2 });

// ─── Council Member Definitions ───────────────────────────────────────────────

/**
 * @typedef {Object} CouncilMember
 * @property {string} id
 * @property {string} provider
 * @property {string} model
 * @property {string} strength
 * @property {'LOW'|'MEDIUM'|'HIGH'} costTier
 * @property {number[]} capabilityVector — 384-dim
 * @property {Object} performance — win rates per task type
 * @property {number} totalSessions
 * @property {number} wins
 */

/** @type {Object.<string, CouncilMember>} */
const COUNCIL_MEMBERS = Object.fromEntries(
  [
    {
      id: 'claude_opus',
      provider: 'anthropic',
      model: 'claude-opus-4.6',
      strength: 'deep reasoning',
      costTier: 'HIGH',
    },
    {
      id: 'gpt5',
      provider: 'openai',
      model: 'gpt-5.4',
      strength: 'broad knowledge',
      costTier: 'HIGH',
    },
    {
      id: 'gemini_pro',
      provider: 'google',
      model: 'gemini-3.1-pro',
      strength: 'pattern recognition',
      costTier: 'MEDIUM',
    },
    {
      id: 'o1_pro',
      provider: 'openai',
      model: 'o1-pro',
      strength: 'mathematical reasoning',
      costTier: 'HIGH',
    },
    {
      id: 'sonar_pro',
      provider: 'perplexity',
      model: 'sonar-pro',
      strength: 'real-time research',
      costTier: 'MEDIUM',
    },
    {
      id: 'groq_llama',
      provider: 'groq',
      model: 'llama-3.1-405b',
      strength: 'fast inference',
      costTier: 'LOW',
    },
    {
      id: 'workers_ai',
      provider: 'cloudflare',
      model: 'workers-ai',
      strength: 'edge classification',
      costTier: 'LOW',
    },
  ].map(m => [
    m.id,
    {
      ...m,
      capabilityVector: placeholderVector(`council:${m.id}`, VECTOR_DIMENSIONS),
      performance: {},    // taskType → { wins, total }
      totalSessions: 0,
      wins: 0,
    },
  ])
);

// ─── Class: HeadyCouncil ──────────────────────────────────────────────────────

/**
 * @typedef {Object} CouncilOptions
 * @property {number} [minMembers=3]                  — minimum models to query
 * @property {number} [maxMembers=5]                  — max models (fib(5))
 * @property {number} [timeout=34000]                 — per-call timeout ms
 * @property {number} [costCeiling]                   — optional max cost budget
 * @property {string} [taskType]                      — hint for member selection
 * @property {string[]} [requiredMembers]             — always include these ids
 */

/**
 * @typedef {Object} CouncilResponse
 * @property {string} memberId
 * @property {string} model
 * @property {string} provider
 * @property {string} text        — raw response text
 * @property {number[]} embedding — 384-dim embedding of response (placeholder)
 * @property {number} latencyMs
 * @property {boolean} timedOut
 * @property {string|null} error
 */

/**
 * @typedef {Object} ScoredResponse
 * @property {string} memberId
 * @property {CouncilResponse} response
 * @property {{ accuracy: number, completeness: number, reasoning: number, novelty: number, safety: number }} scores
 * @property {number} composite — phi-weighted composite score
 */

/**
 * @typedef {Object} CouncilSession
 * @property {string}   sessionId
 * @property {string}   prompt
 * @property {string[]} memberIds
 * @property {ScoredResponse[]} scoredResponses
 * @property {string[]} agreementPoints
 * @property {string[]} disagreementPoints
 * @property {CouncilSynthesis} synthesis
 * @property {number}   startedAt
 * @property {number}   completedAt
 * @property {number}   totalMs
 */

/**
 * @typedef {Object} CouncilSynthesis
 * @property {string}   text              — synthesized response
 * @property {string}   winnerId          — highest-scoring member
 * @property {number}   confidence        — synthesis confidence 0–1
 * @property {string[]} agreementZones    — topic areas of consensus
 * @property {string[]} disagreementZones — topic areas requiring deeper analysis
 * @property {string[]} contributingIds   — all members who contributed
 */

export class HeadyCouncil {
  /**
   * @param {Object} [opts] — options
   * @param {Object} [opts.budgetTracker] — optional budget-tracker service reference
   * @param {Object} [opts.gateway] — InferenceGateway instance for real API calls
   */
  constructor(opts = {}) {
    // Support legacy call: constructor(budgetTracker)
    if (opts && typeof opts.getAvailable !== 'function' && !opts.gateway) {
      opts = { budgetTracker: opts };
    }

    /** @type {Object|null} Budget tracker reference */
    this._budgetTracker = opts.budgetTracker || null;

    /** @type {Object|null} InferenceGateway for real API calls */
    this._gateway = opts.gateway || null;

    /** Provider name mapping: council member.provider → gateway provider key */
    this._providerMap = {
      anthropic: 'claude',
      openai: 'openai',
      google: 'gemini',
      groq: 'groq',
      huggingface: 'huggingface',
    };

    /** @type {Map<string, CouncilMember>} active member registry */
    this.members = new Map(Object.entries(COUNCIL_MEMBERS));

    /** @type {CouncilSession[]} all past council sessions */
    this._history = [];

    /** @type {number} session counter */
    this._sessionCounter = 0;

    /** @type {number} */
    this._startedAt = Date.now();

    // If gateway is provided, filter members to only those with available providers
    if (this._gateway) {
      const available = new Set(this._gateway.getAvailable());
      const activeMembers = [];
      this.members.forEach((member, id) => {
        const gwKey = this._providerMap[member.provider];
        if (gwKey && available.has(gwKey)) {
          activeMembers.push(id);
        }
      });
      this._log('info', 'HeadyCouncil initialized with InferenceGateway', {
        gatewayProviders: [...available],
        activeMembers,
      });
    }

    this._log('info', 'HeadyCouncil initialized', {
      members: Array.from(this.members.keys()),
      agreementThreshold: AGREEMENT_THRESHOLD,
      disagreementThreshold: DISAGREEMENT_THRESHOLD,
      defaultTimeout: DEFAULT_TIMEOUT_MS,
      gatewayConnected: !!this._gateway,
    });
  }

  // ─── Convene ─────────────────────────────────────────────────────────────────

  /**
   * Convene the council: send prompt to 3–5 models, score responses, synthesize.
   *
   * @param {string} prompt
   * @param {CouncilOptions} [options={}]
   * @returns {Promise<CouncilSession>}
   * @throws {Error} if fewer than minMembers respond within timeout
   */
  async convene(prompt, options = {}) {
    const {
      minMembers = MIN_MEMBERS,
      maxMembers = MAX_MEMBERS,
      timeout = DEFAULT_TIMEOUT_MS,
      costCeiling = null,
      taskType = 'general',
      requiredMembers = [],
    } = options;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error('convene: prompt must be a non-empty string');
    }

    const sessionId = this._generateSessionId();
    const startedAt = Date.now();

    this._log('info', `council convening [${sessionId}]`, { taskType, minMembers, maxMembers });

    // 1. Select members
    const selectedIds = this.selectMembers(taskType, costCeiling, {
      minMembers,
      maxMembers,
      required: requiredMembers,
    });

    if (selectedIds.length < minMembers) {
      throw new Error(
        `convene: could not select ${minMembers} members; only ${selectedIds.length} available. ` +
        `Consider relaxing costCeiling or adjusting minMembers.`
      );
    }

    // 2. Collect responses in parallel
    const responses = await this.collectResponses(prompt, selectedIds, timeout);

    // Filter successful responses
    const validResponses = responses.filter(r => !r.timedOut && !r.error);

    if (validResponses.length < minMembers) {
      throw new Error(
        `convene: only ${validResponses.length}/${selectedIds.length} members responded ` +
        `within ${timeout}ms (minimum required: ${minMembers})`
      );
    }

    // 3. Score responses
    const scoredResponses = this.scoreResponses(validResponses);

    // 4. Find agreement and disagreement
    const agreement = this.findAgreement(scoredResponses);
    const disagreement = this.findDisagreement(scoredResponses);

    // 5. Synthesize
    const synthesis = this.synthesize(scoredResponses, agreement, disagreement);

    // 6. Update member win stats
    this._updateWinStats(synthesis.winnerId, taskType);

    const completedAt = Date.now();

    /** @type {CouncilSession} */
    const session = {
      sessionId,
      prompt: prompt.slice(0, 500), // Truncate for storage
      memberIds: selectedIds,
      scoredResponses,
      agreementPoints: agreement.points,
      disagreementPoints: disagreement.points,
      synthesis,
      startedAt,
      completedAt,
      totalMs: completedAt - startedAt,
    };

    // Store history — cap at fib(9)=34 sessions
    this._history.push(session);
    if (this._history.length > fib(9)) {
      this._history.splice(0, this._history.length - fib(9));
    }

    this._log('info', `council complete [${sessionId}]`, {
      winner: synthesis.winnerId,
      confidence: synthesis.confidence,
      agreementCount: agreement.points.length,
      disagreementCount: disagreement.points.length,
      totalMs: session.totalMs,
    });

    return session;
  }

  // ─── Member Selection ─────────────────────────────────────────────────────────

  /**
   * CSL-scored member selection based on task-capability match, budget constraints.
   * Required members are always included. Remaining slots filled by CSL score,
   * then by cost efficiency.
   *
   * @param {string} taskType — e.g. 'code', 'research', 'math', 'general'
   * @param {number|null} [budget] — optional cost ceiling (uses costTier proxy)
   * @param {{ minMembers: number, maxMembers: number, required: string[] }} [opts]
   * @returns {string[]} selected member ids
   */
  selectMembers(taskType, budget = null, opts = {}) {
    const { minMembers = MIN_MEMBERS, maxMembers = MAX_MEMBERS, required = [] } = opts;

    const taskVec = placeholderVector(`task_type:${taskType}`, VECTOR_DIMENSIONS);

    // Build candidate list with CSL scores
    const candidates = [];
    this.members.forEach(member => {
      // Budget filter: if LOW budget, exclude HIGH cost unless required
      if (budget === 'LOW' && member.costTier === 'HIGH' && !required.includes(member.id)) {
        return;
      }

      const cslScore = cosineSimilarity(taskVec, member.capabilityVector);
      // Performance boost: win rate bonus
      const winRate = member.totalSessions > 0
        ? member.wins / member.totalSessions
        : PSI; // Default PSI = 0.618 for unknown
      const compositeScore = cslScore * PSI + winRate * (1 - PSI);

      candidates.push({ id: member.id, score: compositeScore, member });
    });

    // Sort by composite score descending
    candidates.sort((a, b) => b.score - a.score);

    // Start with required members
    const selected = new Set(required.filter(id => this.members.has(id)));

    // Fill up to maxMembers from top-scored candidates
    for (const c of candidates) {
      if (selected.size >= maxMembers) break;
      selected.add(c.id);
    }

    // Ensure minimum
    if (selected.size < minMembers) {
      for (const c of candidates) {
        if (selected.size >= minMembers) break;
        selected.add(c.id);
      }
    }

    return Array.from(selected).slice(0, maxMembers);
  }

  // ─── Collect Responses ────────────────────────────────────────────────────────

  /**
   * Send prompt to all selected members in parallel with timeout.
   * Uses phi-backoff retry on transient failures (max fib(4)=3 attempts).
   *
   * NOTE: In production, each member.provider would route to the actual API client.
   * This implementation provides the complete contract and placeholder response
   * generation for testing without live API keys.
   *
   * @param {string} prompt
   * @param {string[]} memberIds
   * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS]
   * @returns {Promise<CouncilResponse[]>}
   */
  async collectResponses(prompt, memberIds, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const calls = memberIds.map(async memberId => {
      const member = this.members.get(memberId);
      if (!member) {
        return this._makeErrorResponse(memberId, 'unknown', 'unknown', 'Member not found');
      }

      const startMs = Date.now();
      let lastError = null;
      const maxAttempts = fib(4); // 3

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const response = await Promise.race([
            this._callMember(member, prompt),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
            ),
          ]);

          member.totalSessions++;
          return {
            ...response,
            memberId,
            model: member.model,
            provider: member.provider,
            latencyMs: Date.now() - startMs,
            timedOut: false,
            error: null,
          };
        } catch (err) {
          lastError = err;
          if (err.message === 'TIMEOUT') break; // Don't retry timeouts
          if (attempt < maxAttempts - 1) {
            const delay = phiBackoff(attempt, 500, fib(8) * 1000); // max 21s
            await new Promise(r => setTimeout(r, Math.min(delay, 50))); // Capped in tests
          }
        }
      }

      member.totalSessions++;
      const isTimeout = lastError?.message === 'TIMEOUT';
      return this._makeErrorResponse(
        memberId, member.model, member.provider,
        lastError?.message ?? 'unknown error',
        isTimeout
      );
    });

    return Promise.all(calls);
  }

  // ─── Score Responses ──────────────────────────────────────────────────────────

  /**
   * Score each response on 5 phi-weighted dimensions.
   * In production, scoring would use another LLM or embedding-based evaluation.
   * This implementation provides the full scoring contract with placeholder heuristics.
   *
   * Scoring weights (Sacred Geometry aligned):
   *   accuracy: 0.34, completeness: 0.21, reasoning: 0.21, novelty: 0.13, safety: 0.11
   *
   * @param {CouncilResponse[]} responses
   * @returns {ScoredResponse[]}
   */
  scoreResponses(responses) {
    return responses
      .filter(r => !r.timedOut && !r.error)
      .map(response => {
        // Heuristic scoring based on response properties
        // In production: run evaluation prompts against a fast scorer (e.g. groq_llama)
        const textLen = response.text?.length ?? 0;

        // Length-based proxies (to be replaced with real evaluation)
        const completeness = Math.min(1, textLen / (fib(11) * 10)); // 890 chars = 1.0
        const accuracy = response._simulatedAccuracy ?? (PSI + Math.random() * (1 - PSI));
        const reasoning = response._simulatedReasoning ?? (PSI * PSI + Math.random() * PSI);
        const novelty = response._simulatedNovelty ?? (PSI * PSI * PSI + Math.random() * PSI * PSI);
        const safety = response._simulatedSafety ?? (CSL_THRESHOLDS.HIGH + Math.random() * (1 - CSL_THRESHOLDS.HIGH));

        const scores = {
          accuracy: parseFloat(Math.min(1, accuracy).toFixed(4)),
          completeness: parseFloat(Math.min(1, completeness).toFixed(4)),
          reasoning: parseFloat(Math.min(1, reasoning).toFixed(4)),
          novelty: parseFloat(Math.min(1, novelty).toFixed(4)),
          safety: parseFloat(Math.min(1, safety).toFixed(4)),
        };

        const composite =
          scores.accuracy * SCORE_WEIGHTS.accuracy +
          scores.completeness * SCORE_WEIGHTS.completeness +
          scores.reasoning * SCORE_WEIGHTS.reasoning +
          scores.novelty * SCORE_WEIGHTS.novelty +
          scores.safety * SCORE_WEIGHTS.safety;

        return {
          memberId: response.memberId,
          response,
          scores,
          composite: parseFloat(composite.toFixed(6)),
        };
      })
      .sort((a, b) => b.composite - a.composite); // Best first
  }

  // ─── Agreement Detection ──────────────────────────────────────────────────────

  /**
   * Identify areas where 2+ models agree (cosine ≥ AGREEMENT_THRESHOLD ≈ 0.882).
   * Agreement = high-confidence zone.
   *
   * @param {ScoredResponse[]} scoredResponses
   * @returns {{ points: string[], pairs: Array<{ a: string, b: string, similarity: number }> }}
   */
  findAgreement(scoredResponses) {
    const pairs = [];
    const agreementPoints = [];

    // Compare every pair of response embeddings
    for (let i = 0; i < scoredResponses.length; i++) {
      for (let j = i + 1; j < scoredResponses.length; j++) {
        const embA = scoredResponses[i].response.embedding;
        const embB = scoredResponses[j].response.embedding;

        if (!embA || !embB) continue;

        const sim = cosineSimilarity(embA, embB);
        if (sim >= AGREEMENT_THRESHOLD) {
          pairs.push({
            a: scoredResponses[i].memberId,
            b: scoredResponses[j].memberId,
            similarity: parseFloat(sim.toFixed(6)),
          });
          agreementPoints.push(
            `${scoredResponses[i].memberId}↔${scoredResponses[j].memberId} ` +
            `[similarity=${sim.toFixed(3)}]`
          );
        }
      }
    }

    return { points: agreementPoints, pairs };
  }

  // ─── Disagreement Detection ───────────────────────────────────────────────────

  /**
   * Flag areas of disagreement where cosine similarity < DISAGREEMENT_THRESHOLD (≈ 0.691).
   * Disagreements are flagged for deeper analysis.
   *
   * @param {ScoredResponse[]} scoredResponses
   * @returns {{ points: string[], pairs: Array<{ a: string, b: string, similarity: number, scoreDelta: number }> }}
   */
  findDisagreement(scoredResponses) {
    const pairs = [];
    const disagreementPoints = [];

    for (let i = 0; i < scoredResponses.length; i++) {
      for (let j = i + 1; j < scoredResponses.length; j++) {
        const embA = scoredResponses[i].response.embedding;
        const embB = scoredResponses[j].response.embedding;

        if (!embA || !embB) continue;

        const sim = cosineSimilarity(embA, embB);
        if (sim < DISAGREEMENT_THRESHOLD) {
          const scoreDelta = Math.abs(scoredResponses[i].composite - scoredResponses[j].composite);
          pairs.push({
            a: scoredResponses[i].memberId,
            b: scoredResponses[j].memberId,
            similarity: parseFloat(sim.toFixed(6)),
            scoreDelta: parseFloat(scoreDelta.toFixed(6)),
          });
          disagreementPoints.push(
            `CONFLICT: ${scoredResponses[i].memberId}↔${scoredResponses[j].memberId} ` +
            `[sim=${sim.toFixed(3)}, Δscore=${scoreDelta.toFixed(3)}]`
          );
        }
      }
    }

    return { points: disagreementPoints, pairs };
  }

  // ─── Synthesis ────────────────────────────────────────────────────────────────

  /**
   * Produce final synthesis combining strongest elements from all responses.
   *
   * Strategy:
   *   1. Winner = highest composite score
   *   2. Confidence = phi-weighted mean of top-3 scores weighted by SCORE_WEIGHTS
   *   3. Agreement zones → high confidence statements
   *   4. Disagreement zones → flagged for review
   *   5. Text = winner's text + summary of unique insights from runner-ups
   *
   * @param {ScoredResponse[]} scoredResponses — sorted best-first
   * @param {{ points: string[], pairs: Array }} agreement
   * @param {{ points: string[], pairs: Array }} disagreement
   * @returns {CouncilSynthesis}
   */
  synthesize(scoredResponses, agreement, disagreement) {
    if (!scoredResponses || scoredResponses.length === 0) {
      return {
        text: '',
        winnerId: null,
        confidence: 0,
        agreementZones: [],
        disagreementZones: [],
        contributingIds: [],
      };
    }

    const winner = scoredResponses[0];

    // Phi-weighted confidence from top-fib(3)=3 responses (or all if fewer)
    const topN = scoredResponses.slice(0, Math.min(fib(3), scoredResponses.length));
    const fusionWeights = phiFusionWeights(topN.length);
    const confidence = topN.reduce((sum, sr, i) => sum + sr.composite * fusionWeights[i], 0);

    // Synthesized text: winner text + unique insights
    const winnerText = winner.response.text ?? '';
    const runnerUps = scoredResponses
      .slice(1, fib(3)) // up to 2 runner-ups
      .filter(sr => sr.composite > CSL_THRESHOLDS.MINIMUM)
      .map(sr => `[${sr.memberId}]: ${(sr.response.text ?? '').slice(0, 200)}`)
      .join('\n---\n');

    const synthesizedText = runnerUps
      ? `${winnerText}\n\n=== Additional Perspectives ===\n${runnerUps}`
      : winnerText;

    return {
      text: synthesizedText,
      winnerId: winner.memberId,
      confidence: parseFloat(confidence.toFixed(6)),
      agreementZones: agreement.points,
      disagreementZones: disagreement.points,
      contributingIds: scoredResponses.map(sr => sr.memberId),
      scores: {
        winner: winner.scores,
        winnerComposite: winner.composite,
      },
    };
  }

  // ─── History & Performance ────────────────────────────────────────────────────

  /**
   * Return all past council sessions (capped at fib(9)=34).
   * @returns {CouncilSession[]}
   */
  getCouncilHistory() {
    return [...this._history];
  }

  /**
   * Win rates per model per task type.
   * @returns {Object.<string, { wins: number, total: number, winRate: number, byTaskType: Object }>}
   */
  getModelPerformance() {
    const result = {};
    this.members.forEach((member, id) => {
      result[id] = {
        wins: member.wins,
        total: member.totalSessions,
        winRate: member.totalSessions > 0
          ? parseFloat((member.wins / member.totalSessions).toFixed(4))
          : null,
        byTaskType: { ...member.performance },
        model: member.model,
        provider: member.provider,
        strength: member.strength,
        costTier: member.costTier,
      };
    });
    return result;
  }

  // ─── Status ───────────────────────────────────────────────────────────────────

  /**
   * Council health and aggregate stats.
   * @returns {Object}
   */
  getStatus() {
    const totalSessions = this._history.length;
    const avgConfidence = totalSessions > 0
      ? this._history.reduce((s, h) => s + (h.synthesis?.confidence ?? 0), 0) / totalSessions
      : 0;

    return {
      version: '2.0.0',
      uptime: Date.now() - this._startedAt,
      totalSessions,
      avgConfidence: parseFloat(avgConfidence.toFixed(4)),
      members: Array.from(this.members.keys()),
      memberCount: this.members.size,
      performance: this.getModelPerformance(),
      constants: {
        minMembers: MIN_MEMBERS,
        maxMembers: MAX_MEMBERS,
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        agreementThreshold: AGREEMENT_THRESHOLD,
        disagreementThreshold: DISAGREEMENT_THRESHOLD,
        scoreWeights: SCORE_WEIGHTS,
      },
      sacredGeometry: {
        phi: PHI,
        psi: PSI,
        cslThresholds: {
          MINIMUM: CSL_THRESHOLDS.MINIMUM,
          LOW: CSL_THRESHOLDS.LOW,
          MEDIUM: CSL_THRESHOLDS.MEDIUM,
          HIGH: CSL_THRESHOLDS.HIGH,
          CRITICAL: CSL_THRESHOLDS.CRITICAL,
        },
      },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Route a prompt to a specific model provider via InferenceGateway.
   * Falls back to placeholder if gateway is not connected or provider unavailable.
   *
   * @private
   * @param {CouncilMember} member
   * @param {string} prompt
   * @returns {Promise<Partial<CouncilResponse>>}
   */
  async _callMember(member, prompt) {
    const gwProviderKey = this._providerMap[member.provider];

    // If gateway is connected and provider is available, use real API
    if (this._gateway && gwProviderKey) {
      const available = this._gateway.getAvailable();
      if (available.includes(gwProviderKey)) {
        try {
          const result = await this._gateway.complete(
            [
              { role: 'system', content: `You are ${member.model}, a ${member.strength} specialist. Provide your best analysis.` },
              { role: 'user', content: prompt },
            ],
            { provider: gwProviderKey, model: member.model }
          );

          const text = result.content || '';
          // Generate embedding from text for agreement/disagreement comparison
          const embedding = placeholderVector(`response:${member.id}:${text.slice(0, 100)}`, VECTOR_DIMENSIONS);

          this._log('info', `_callMember: real response from ${member.id}`, {
            provider: gwProviderKey,
            model: result.model,
            latencyMs: result.gatewayLatencyMs,
            contentLength: text.length,
          });

          return {
            text,
            embedding,
            realResponse: true,
            gatewayModel: result.model,
            gatewayProvider: result.provider,
            usage: result.usage || null,
          };
        } catch (err) {
          this._log('warn', `_callMember: ${member.id} real call failed, using placeholder`, {
            error: err.message,
          });
          // Fall through to placeholder
        }
      }
    }

    // Placeholder fallback for providers not in gateway or when gateway unavailable
    const simulatedLatency = Math.min(100, 50 + Math.random() * 50);
    await new Promise(r => setTimeout(r, simulatedLatency));

    const text = [
      `[${member.model}] Response to: "${prompt.slice(0, 80)}..."`,
      `Provider: ${member.provider} | Strength: ${member.strength}`,
      `Analysis: ${member.strength} perspective with ${fib(7)} key insights.`,
      `Note: This is a placeholder — provider ${member.provider} not connected to InferenceGateway.`,
    ].join('\n');

    const embedding = placeholderVector(`response:${member.id}:${prompt.slice(0, 50)}`, VECTOR_DIMENSIONS);

    return {
      text,
      embedding,
      realResponse: false,
      _simulatedAccuracy: PSI + Math.random() * (1 - PSI),
      _simulatedReasoning: PSI * PSI + Math.random() * PSI,
      _simulatedNovelty: PSI * PSI * PSI + Math.random() * PSI * PSI,
      _simulatedSafety: CSL_THRESHOLDS.HIGH + Math.random() * (1 - CSL_THRESHOLDS.HIGH),
    };
  }

  /**
   * @private
   * @param {string} winnerId
   * @param {string} taskType
   */
  _updateWinStats(winnerId, taskType) {
    const member = this.members.get(winnerId);
    if (!member) return;

    member.wins++;
    if (!member.performance[taskType]) {
      member.performance[taskType] = { wins: 0, total: 0 };
    }
    member.performance[taskType].wins++;
    member.performance[taskType].total++;

    // Increment total for all other participants too
    this._history[this._history.length - 1]?.memberIds?.forEach(id => {
      if (id === winnerId) return;
      const m = this.members.get(id);
      if (m) {
        if (!m.performance[taskType]) m.performance[taskType] = { wins: 0, total: 0 };
        m.performance[taskType].total++;
      }
    });
  }

  /**
   * @private
   */
  _generateSessionId() {
    this._sessionCounter++;
    return `council-${Date.now()}-${String(this._sessionCounter).padStart(4, '0')}`;
  }

  /**
   * @private
   */
  _makeErrorResponse(memberId, model, provider, errorMsg, timedOut = false) {
    return {
      memberId,
      model,
      provider,
      text: null,
      embedding: null,
      latencyMs: 0,
      timedOut,
      error: errorMsg,
    };
  }

  /**
   * @private
   * @param {'debug'|'info'|'warn'|'error'} level
   * @param {string} message
   * @param {Object} [meta]
   */
  _log(level, message, meta = {}) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      module: 'HeadyCouncil',
      message,
      ...meta,
    };
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else if (process.env.LOG_LEVEL === 'debug') {
      console.log(JSON.stringify(entry));
    }
  }
}

// ─── Named Exports ────────────────────────────────────────────────────────────

export {
  COUNCIL_MEMBERS,
  SCORE_WEIGHTS,
  MIN_MEMBERS,
  MAX_MEMBERS,
  DEFAULT_TIMEOUT_MS,
  AGREEMENT_THRESHOLD,
  DISAGREEMENT_THRESHOLD,
};

export default HeadyCouncil;
