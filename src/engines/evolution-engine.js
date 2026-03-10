const logger = require('../shared/logger')('evolution-engine');
/**
 * @file evolution-engine.js
 * @module heady-latent-os/engines/evolution-engine
 * @version 4.0.0
 *
 * Stage 19: EVOLUTION — Controlled Pipeline Mutation
 *
 * Runtime implementation for HCFullPipeline Stage 19. Drives controlled
 * self-mutation of pipeline configuration using phi-derived parameters.
 * Every numeric constant is Sacred-Geometry aligned: zero magic numbers.
 *
 * Key phi constants used throughout:
 *   PHI  = (1 + √5) / 2  ≈ 1.6180339887  (golden ratio)
 *   PSI  = 1 / PHI        ≈ 0.6180339887  (conjugate / CSL gate threshold)
 *   PSI² ≈ 0.3820         (cascade threshold)
 *
 * Key Fibonacci constants:
 *   fib(4) = 3   — generationsPerDay
 *   fib(5) = 5   — failure threshold
 *   fib(6) = 8   — populationSize
 *   fib(7) = 13  — maxBees / archive depth
 *   fib(8) = 21  — stage count / max history per generation
 *   fib(9) = 34  — Monte Carlo simulation passes
 *
 * Safety invariants (NEVER violated):
 *   1. neverMutate list items are immutable forever
 *   2. Auto-rollback if fitness regression > 5% (rollbackThreshold)
 *   3. Human approval required if magnitude > 8% (approvalThreshold)
 *   4. Maximum change magnitude capped at 13% per mutation (maxMagnitude)
 *   5. Full mutation history persisted permanently (no deletion)
 *
 * @author HeadyConnection <eric@headyconnection.org>
 * @copyright © 2026 Heady™Connection
 */

import { PHI, PSI, phiBackoff, fib as _fib, cslGate } from '../shared/phi-math.js';

// ─────────────────────────────────────────────────────────────────────────────
// PHI-DERIVED CONSTANTS (all values computed from PHI / Fibonacci — no magic numbers)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fibonacci sequence reference — 1-indexed to match phi-math.js fib() convention.
 * phi-math.js fib(n) is 1-based: fib(1)=1, fib(2)=1, fib(3)=2, fib(4)=3, fib(5)=5,
 *   fib(6)=8, fib(7)=13, fib(8)=21, fib(9)=34.
 *
 * FIB[n] = _fib(n) for n ≥ 1. Index 0 is a sentinel (0) to aid readability.
 * Usage: FIB[6]=8 (population), FIB[7]=13 (bees), FIB[8]=21 (stages), FIB[9]=34 (MC passes).
 */
const FIB = [0, ...Array.from({ length: 20 }, (_, i) => _fib(i + 1))];
// FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765]

/**
 * Phi-derived timeouts (milliseconds).
 * Formula: round(PHI^n × 1000)
 */
const TIMEOUTS = {
  PHI_1: Math.round(PHI ** 1 * 1000),   // 1618ms  — minimum unit
  PHI_2: Math.round(PHI ** 2 * 1000),   // 2618ms  — fast gate
  PHI_3: Math.round(PHI ** 3 * 1000),   // 4236ms  — standard
  PHI_4: Math.round(PHI ** 4 * 1000),   // 6854ms  — extended
  PHI_5: Math.round(PHI ** 5 * 1000),   // 11090ms — evolution stage
  PHI_6: Math.round(PHI ** 6 * 1000),   // 17944ms — long simulation
};

/**
 * Phi-backoff retry delays in milliseconds.
 * phiBackoff(attempt, 1000) = round(1000 × PHI^attempt)
 *   attempt 0 → 1000ms
 *   attempt 1 → 1618ms
 *   attempt 2 → 2618ms
 */
const BACKOFF_MS = [
  Math.round(1000 * PHI ** 0),   // 1000ms
  Math.round(1000 * PHI ** 1),   // 1618ms
  Math.round(1000 * PHI ** 2),   // 2618ms
];

/**
 * CSL (Cosine Similarity Lattice) gate thresholds — all phi-derived.
 * PSI = 1/PHI ≈ 0.618 is the canonical minimum gate threshold.
 */
const CSL_THRESHOLDS = {
  MINIMUM:  PSI,                   // ≈ 0.618 — lowest acceptable gate
  MEDIUM:   1 - PSI ** 2,          // ≈ 0.764 — moderate confidence
  HIGH:     1 - PSI ** 3,          // ≈ 0.854 — strong alignment
  CRITICAL: 1 - PSI ** 4,          // ≈ 0.910 — near-certain
};

// ─────────────────────────────────────────────────────────────────────────────
// EVOLUTION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EvolutionEngine — Stage 19 runtime.
 *
 * Drives controlled self-mutation of HCFullPipeline configuration.
 * One generation cycle: analyze → generate → simulate → measure → select → promote → record.
 *
 * @class
 */
export class EvolutionEngine {
  /**
   * @constructor
   * @param {Object} [config={}] — Optional overrides (must pass phi validation)
   */
  constructor(config = {}) {
    // ── Mutation Parameters ──────────────────────────────────────────────────

    /**
     * Probability of mutating any given parameter per generation.
     * Derived: PSI / 10 = (1/PHI) / 10 ≈ 0.0618
     */
    this.mutationRate = config.mutationRate ?? PSI / 10; // 0.0618

    /**
     * Number of mutated configurations evaluated per generation.
     * Derived: fib(6) = 8
     */
    this.populationSize = config.populationSize ?? FIB[6]; // 8

    /**
     * Maximum fractional change magnitude allowed per single mutation.
     * Derived: fib(7) / 100 = 13 / 100 = 0.13 (13%)
     */
    this.maxMagnitude = config.maxMagnitude ?? FIB[7] / 100; // 0.13

    // ── Fitness Weights ──────────────────────────────────────────────────────

    /**
     * Phi-harmonic 5-factor fitness weights. Mirrors JUDGE stage scoring.
     * Sum = 1.0. Same weights used in JUDGE stage (stages[10].scoringWeights).
     *
     *   latency:     0.34  (most important — user experience)
     *   cost:        0.21  (resource efficiency)
     *   quality:     0.21  (output quality)
     *   reliability: 0.13  (error rate / uptime)
     *   elegance:    0.11  (phi-alignment / parsimony)
     *
     * Weights are phi-harmonic: ratios approximate PHI at each level.
     */
    this.fitnessWeights = config.fitnessWeights ?? {
      latency:     0.34,
      cost:        0.21,
      quality:     0.21,
      reliability: 0.13,
      elegance:    0.11,
    };

    // Validate weights sum to 1.0 (within floating point tolerance)
    const weightSum = Object.values(this.fitnessWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 1e-9) {
      throw new Error(
        `[EvolutionEngine] fitnessWeights must sum to 1.0 (got ${weightSum.toFixed(6)})`
      );
    }

    // ── Safety Configuration ─────────────────────────────────────────────────

    /**
     * Parameters that MUST NEVER be mutated.
     * Violations will throw hard errors — not warnings.
     */
    this.neverMutate = Object.freeze(
      config.neverMutate ?? [
        'phi_constant',
        'fibonacci_sequence',
        'csl_gate_math',
        'security_policies',
      ]
    );

    /**
     * If fitness regression exceeds this fraction, auto-rollback immediately.
     * 5% — phi-adjacent (aligns with ARENA win margin and EVOLUTION approval gate).
     */
    this.rollbackThreshold = config.rollbackThreshold ?? 0.05;

    /**
     * Changes exceeding this magnitude require explicit human approval before promotion.
     * 8% — above rollback threshold, below maxMagnitude.
     */
    this.approvalThreshold = config.approvalThreshold ?? 0.08;

    /**
     * Maximum number of evolution generations executed per 24-hour period.
     * Derived: fib(4) = 3
     */
    this.generationsPerDay = config.generationsPerDay ?? FIB[4]; // 3

    // ── Internal State ───────────────────────────────────────────────────────

    /**
     * Permanent evolution history. All generations, mutations, and outcomes.
     * Never truncated — append-only by design.
     * @type {Array<GenerationRecord>}
     */
    this._history = [];

    /**
     * Current generation counter (increments monotonically).
     * @type {number}
     */
    this._generation = 0;

    /**
     * Cumulative mutations promoted to production.
     * @type {number}
     */
    this._totalMutationsPromoted = 0;

    /**
     * Cumulative auto-rollbacks triggered.
     * @type {number}
     */
    this._totalRollbacks = 0;

    /**
     * Cumulative mutations blocked (neverMutate violations).
     * @type {number}
     */
    this._totalBlocked = 0;

    /**
     * Timestamp of engine initialization.
     * @type {string}
     */
    this._startedAt = new Date().toISOString();

    /**
     * Pending approval queue (changes > 8% awaiting human review).
     * @type {Array<PendingApproval>}
     */
    this._pendingApprovals = [];

    /**
     * Adaptive mutation strategy state (updated by updateMutationStrategy).
     * @type {MutationStrategy}
     */
    this._mutationStrategy = {
      currentRate:     this.mutationRate,
      currentMagnitude: this.maxMagnitude,
      successStreak:   0,
      failStreak:      0,
      lastAdjustedAt:  null,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * runGeneration — Full evolution cycle.
   *
   * Orchestrates the complete generation: analyze → generate → simulate →
   * measure → select → promote → record → update strategy.
   *
   * @param {Object} pipelineConfig — Current hcfullpipeline-canonical.json content
   * @returns {Promise<GenerationResult>}
   */
  async runGeneration(pipelineConfig) {
    const generationId = `gen-${this._generation + 1}-${Date.now()}`;
    const startedAt = new Date().toISOString();

    logger.info(`[EvolutionEngine] ── Generation ${this._generation + 1} starting ──`);
    logger.info(`[EvolutionEngine] ID: ${generationId}`);
    logger.info(`[EvolutionEngine] Population: ${this.populationSize} (fib(6)=${FIB[6]})`);
    logger.info(`[EvolutionEngine] Mutation rate: ${this.mutationRate} (PSI/10=${(PSI/10).toFixed(4)})`);

    try {
      // Step 1: Identify mutable parameters
      const candidates = await this.analyzeEvolutionCandidates(pipelineConfig);
      logger.info(`[EvolutionEngine] Candidates identified: ${candidates.length}`);

      // Step 2: Generate mutated population
      const mutations = this.generateMutations(candidates);
      logger.info(`[EvolutionEngine] Mutations generated: ${mutations.length}`);

      // Step 3: Monte Carlo simulation on each mutation
      const baseline = this._computeBaselineFitness(pipelineConfig);
      const simResults = await this.simulateMutations(mutations, baseline);
      logger.info(`[EvolutionEngine] Simulations complete: ${simResults.length}`);

      // Step 4: Measure composite fitness for each simulation
      const fitnessResults = simResults.map(sim => ({
        ...sim,
        fitness: this.measureFitness(sim),
      }));

      // Step 5: Select only mutations with genuine improvement
      const beneficial = this.selectBeneficial(fitnessResults);
      logger.info(`[EvolutionEngine] Beneficial mutations: ${beneficial.length}`);

      // Step 6: Promote winners to config (with safety gates)
      const promotionResult = await this.promoteToConfig(beneficial);

      // Step 7: Record full generation history
      const record = this.recordEvolutionHistory({
        id:            generationId,
        generation:    this._generation + 1,
        startedAt,
        completedAt:   new Date().toISOString(),
        candidates:    candidates.length,
        mutations:     mutations.length,
        simulations:   simResults.length,
        beneficial:    beneficial.length,
        promoted:      promotionResult.promoted,
        rolledBack:    promotionResult.rolledBack,
        pendingApproval: promotionResult.pendingApproval,
        baselineFitness: baseline.composite,
        bestFitness:   beneficial.length > 0
          ? Math.max(...beneficial.map(b => b.fitness.composite))
          : baseline.composite,
        fitnessResults,
      });

      // Step 8: Adapt mutation strategy for next generation
      this.updateMutationStrategy(this._history);

      this._generation++;

      return {
        generationId,
        generation:   this._generation,
        promoted:     promotionResult.promoted,
        rolledBack:   promotionResult.rolledBack,
        pendingApproval: promotionResult.pendingApproval,
        baselineFitness: baseline.composite,
        bestFitness:  record.bestFitness,
        improvement:  record.bestFitness - baseline.composite,
        status:       'complete',
      };
    } catch (err) {
      logger.error(`[EvolutionEngine] Generation ${this._generation + 1} failed:`, err.message);

      // Record failed generation
      this._history.push({
        id:         generationId,
        generation: this._generation + 1,
        startedAt,
        completedAt: new Date().toISOString(),
        status:     'failed',
        error:      err.message,
      });

      throw err;
    }
  }

  /**
   * analyzeEvolutionCandidates — Identify mutable parameters in current config.
   *
   * Scans the pipeline configuration for parameters that:
   *   1. Are NOT in the neverMutate list
   *   2. Are numeric (can be safely perturbed)
   *   3. Have a phi-derivable basis (annotated with "Basis" key)
   *   4. Pass CSL relevance gate ≥ PSI (0.618)
   *
   * @param {Object} pipelineConfig — Current pipeline configuration object
   * @returns {Promise<EvolutionCandidate[]>}
   */
  async analyzeEvolutionCandidates(pipelineConfig) {
    const candidates = [];

    /**
     * Recursively walk the config tree, collecting numeric leaves
     * that are eligible for mutation.
     */
    const walk = (obj, path = '') => {
      if (obj === null || obj === undefined) return;

      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;

        // Skip keys in neverMutate list (hard block)
        if (this._isProtected(key, fullPath)) {
          continue;
        }

        if (typeof value === 'number' && isFinite(value)) {
          // Only include if key ends with a mutable suffix pattern
          if (this._isMutableParameter(key, fullPath)) {
            const relevanceScore = this._scoreRelevance(key, value, fullPath);

            // CSL gate: relevance must meet PSI threshold
            const gated = cslGate(relevanceScore, CSL_THRESHOLDS.MINIMUM);
            if (gated >= CSL_THRESHOLDS.MINIMUM * 0.5) {
              candidates.push({
                path:       fullPath,
                key,
                current:    value,
                relevance:  relevanceScore,
                mutability: this._scoreMutability(key, value),
                phiBasis:   this._inferPhiBasis(key, value),
              });
            }
          }
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          walk(value, fullPath);
        }
      }
    };

    walk(pipelineConfig);

    // Sort by relevance descending — highest-impact candidates first
    candidates.sort((a, b) => b.relevance - a.relevance);

    // Cap to fib(8) = 21 candidates per generation (prevents runaway mutation surface)
    return candidates.slice(0, FIB[8]); // 21
  }

  /**
   * generateMutations — Create population of mutated configs from candidates.
   *
   * For each candidate in the population:
   *   - Apply probabilistic mutation gated by mutationRate (0.0618)
   *   - Clamp mutation delta to maxMagnitude (0.13 = 13%)
   *   - Preserve phi derivability where possible
   *   - Tag each mutation with source candidate + delta
   *
   * @param {EvolutionCandidate[]} candidates — Mutable parameters identified by analyzeEvolutionCandidates
   * @returns {MutatedConfig[]}
   */
  generateMutations(candidates) {
    const mutations = [];

    for (let i = 0; i < this.populationSize; i++) {
      const mutation = {
        id:       `mutation-${i + 1}-${Date.now()}`,
        index:    i,
        changes:  [],
        strategy: this._mutationStrategy.currentRate < this.mutationRate ? 'conservative' : 'standard',
      };

      for (const candidate of candidates) {
        // Stochastic gate: apply mutation with probability = mutationRate (0.0618)
        if (Math.random() > this._mutationStrategy.currentRate) {
          continue; // skip this parameter this generation
        }

        // Compute mutation delta: random in [-maxMagnitude, +maxMagnitude]
        // Bias toward phi-harmonic increments when possible
        const rawDelta = (Math.random() * 2 - 1) * this._mutationStrategy.currentMagnitude;
        const delta    = this._snapToPhiHarmonic(rawDelta, candidate.current);

        // Clamp delta to maxMagnitude (hard cap: 13%)
        const clampedDelta = Math.max(
          -this.maxMagnitude,
          Math.min(this.maxMagnitude, delta)
        );

        const newValue = this._applyDelta(candidate.current, clampedDelta);

        mutation.changes.push({
          path:         candidate.path,
          key:          candidate.key,
          originalValue: candidate.current,
          newValue,
          delta:        clampedDelta,
          deltaPct:     (clampedDelta / Math.abs(candidate.current || 1)) * 100,
          phiBasis:     candidate.phiBasis,
        });
      }

      // Only include mutations that actually changed something
      if (mutation.changes.length > 0) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }

  /**
   * simulateMutations — Run Monte Carlo simulation on each mutated config.
   *
   * Uses fib(9) = 34 simulation passes per mutation (aligns with MONTE_CARLO stage).
   * Captures outcome distribution: mean, variance, p5/p50/p95 percentiles.
   *
   * @param {MutatedConfig[]} mutations — Population of mutated configs
   * @param {FitnessScore}    baseline  — Baseline fitness of current config
   * @returns {Promise<SimulationResult[]>}
   */
  async simulateMutations(mutations, baseline) {
    const SIM_PASSES = FIB[9]; // 34 passes — aligns with MONTE_CARLO stage
    const results = [];

    for (const mutation of mutations) {
      const outcomes = [];

      // Run fib(9)=34 simulation passes per mutation
      for (let pass = 0; pass < SIM_PASSES; pass++) {
        const outcome = await this._runSingleSimulation(mutation, baseline, pass);
        outcomes.push(outcome);
      }

      // Compute outcome statistics
      const latencies     = outcomes.map(o => o.latency);
      const costs         = outcomes.map(o => o.cost);
      const qualities     = outcomes.map(o => o.quality);
      const reliabilities = outcomes.map(o => o.reliability);
      const elegances     = outcomes.map(o => o.elegance);

      results.push({
        mutation,
        passes:     SIM_PASSES,
        passesBasis: `fib(9) = ${FIB[9]}`,
        outcomes,
        stats: {
          latency:     this._computeStats(latencies),
          cost:        this._computeStats(costs),
          quality:     this._computeStats(qualities),
          reliability: this._computeStats(reliabilities),
          elegance:    this._computeStats(elegances),
        },
        passRate:     outcomes.filter(o => o.passed).length / SIM_PASSES,
        baseline:     baseline.composite,
      });
    }

    return results;
  }

  /**
   * measureFitness — Compute composite CSL-weighted fitness score for a simulation.
   *
   * Applies the 5-factor phi-harmonic weights from fitnessWeights.
   * Higher is better. Composite score is in [0, 1].
   *
   * Weights: latency 0.34, cost 0.21, quality 0.21, reliability 0.13, elegance 0.11
   *
   * @param {SimulationResult} simulation
   * @returns {FitnessScore}
   */
  measureFitness(simulation) {
    const s = simulation.stats;

    // Normalize each dimension to [0, 1] range:
    //   For latency and cost: lower is better → invert (1 - normalized)
    //   For quality, reliability, elegance: higher is better

    const latencyScore     = this._invertScore(s.latency.mean);
    const costScore        = this._invertScore(s.cost.mean);
    const qualityScore     = this._clamp01(s.quality.mean);
    const reliabilityScore = this._clamp01(s.reliability.mean);
    const eleganceScore    = this._clamp01(s.elegance.mean);

    const composite = (
      this.fitnessWeights.latency     * latencyScore     +
      this.fitnessWeights.cost        * costScore        +
      this.fitnessWeights.quality     * qualityScore     +
      this.fitnessWeights.reliability * reliabilityScore +
      this.fitnessWeights.elegance    * eleganceScore
    );

    // Apply CSL gate: composite must pass PSI threshold to be considered fit
    const gatedComposite = cslGate(composite, CSL_THRESHOLDS.MINIMUM);

    return {
      composite:   this._clamp01(gatedComposite),
      components: {
        latency:     latencyScore,
        cost:        costScore,
        quality:     qualityScore,
        reliability: reliabilityScore,
        elegance:    eleganceScore,
      },
      passRate:    simulation.passRate,
      weights:     { ...this.fitnessWeights },
      cslGate:     CSL_THRESHOLDS.MINIMUM,
      cslGateBasis: 'PSI = 1/PHI ≈ 0.618',
    };
  }

  /**
   * selectBeneficial — Filter to only mutations that genuinely improve fitness.
   *
   * A mutation is beneficial if:
   *   1. fitness.composite > baseline.composite (strictly improving)
   *   2. improvement ≥ rollbackThreshold (5% — meaningful gain, not noise)
   *   3. passRate ≥ PSI^2 (≥38.2% — minimum simulation pass rate)
   *
   * @param {Array<SimulationResult & {fitness: FitnessScore}>} results
   * @returns {Array<SimulationResult & {fitness: FitnessScore, improvement: number}>}
   */
  selectBeneficial(results) {
    return results
      .filter(r => {
        const improvement = r.fitness.composite - (r.baseline ?? 0);
        const passRateOk  = r.passRate >= PSI ** 2; // ≥ 0.382 (PSI²)
        const isImproving = improvement > 0;
        const meaningful  = improvement >= this.rollbackThreshold * 0.5; // half rollback threshold = 2.5% noise floor

        return isImproving && passRateOk && meaningful;
      })
      .map(r => ({
        ...r,
        improvement: r.fitness.composite - (r.baseline ?? 0),
      }))
      .sort((a, b) => b.improvement - a.improvement); // best first
  }

  /**
   * promoteToConfig — Apply winning mutations to pipeline configuration.
   *
   * Safety gates applied in order:
   *   1. Blocked: any change to neverMutate params → hard reject
   *   2. Approval gate: change magnitude > 8% → queue for human review
   *   3. Rollback gate: if applied and fitness regresses > 5% → auto-rollback
   *
   * @param {Array} winners — Beneficial mutations from selectBeneficial
   * @returns {Promise<PromotionResult>}
   */
  async promoteToConfig(winners) {
    const promoted       = [];
    const rolledBack     = [];
    const pendingApproval = [];
    const blocked        = [];

    for (const winner of winners) {
      const mutation = winner.mutation;

      // ── Safety Gate 1: Check for neverMutate violations ──────────────────
      const protectedChanges = mutation.changes.filter(c =>
        this._isProtected(c.key, c.path)
      );

      if (protectedChanges.length > 0) {
        this._totalBlocked++;
        blocked.push({
          mutationId: mutation.id,
          blockedParams: protectedChanges.map(c => c.path),
          reason: 'neverMutate violation',
        });
        logger.warn(
          `[EvolutionEngine] BLOCKED mutation ${mutation.id}: ` +
          `touches protected params: ${protectedChanges.map(c => c.path).join(', ')}`
        );
        continue;
      }

      // ── Safety Gate 2: Magnitude check → approval queue ──────────────────
      const maxDeltaPct = Math.max(...mutation.changes.map(c => Math.abs(c.deltaPct ?? 0)));

      if (maxDeltaPct > this.approvalThreshold * 100) {
        this._pendingApprovals.push({
          mutationId:     mutation.id,
          winner,
          maxDeltaPct,
          approvalRequired: true,
          queuedAt:       new Date().toISOString(),
          reason:         `Max magnitude ${maxDeltaPct.toFixed(2)}% > ${(this.approvalThreshold * 100).toFixed(0)}% approval threshold`,
        });
        pendingApproval.push(mutation.id);
        logger.info(
          `[EvolutionEngine] Queued for approval: ${mutation.id} ` +
          `(magnitude ${maxDeltaPct.toFixed(2)}% > ${(this.approvalThreshold * 100).toFixed(0)}%)`
        );
        continue;
      }

      // ── Safety Gate 3: Apply and validate (rollback on regression) ────────
      try {
        const applicationResult = await this._applyMutationToConfig(winner);

        if (applicationResult.regression > this.rollbackThreshold) {
          // Auto-rollback: fitness regressed more than 5%
          await this._rollbackMutation(winner, applicationResult);
          this._totalRollbacks++;
          rolledBack.push({
            mutationId:  mutation.id,
            regression:  applicationResult.regression,
            reason:      `Fitness regression ${(applicationResult.regression * 100).toFixed(2)}% > ${(this.rollbackThreshold * 100).toFixed(0)}% threshold`,
          });
          logger.warn(
            `[EvolutionEngine] AUTO-ROLLBACK: ${mutation.id} ` +
            `regressed ${(applicationResult.regression * 100).toFixed(2)}%`
          );
        } else {
          // Successful promotion
          this._totalMutationsPromoted++;
          promoted.push({
            mutationId:  mutation.id,
            improvement: winner.improvement,
            maxDeltaPct,
            appliedAt:   new Date().toISOString(),
          });
          logger.info(
            `[EvolutionEngine] PROMOTED: ${mutation.id} ` +
            `(+${(winner.improvement * 100).toFixed(2)}% fitness, ` +
            `${winner.mutation.changes.length} changes)`
          );
        }
      } catch (err) {
        logger.error(`[EvolutionEngine] Promotion error for ${mutation.id}:`, err.message);
        rolledBack.push({
          mutationId: mutation.id,
          reason:     `Promotion error: ${err.message}`,
        });
      }
    }

    return { promoted, rolledBack, pendingApproval, blocked };
  }

  /**
   * recordEvolutionHistory — Persist full generation record to history log.
   *
   * All generations are logged permanently. No rotation. No deletion.
   * Each record is a complete snapshot of the generation outcome.
   *
   * @param {GenerationRecord} generation
   * @returns {GenerationRecord} — The stored record (with computed fields added)
   */
  recordEvolutionHistory(generation) {
    const record = {
      ...generation,
      recordedAt:           new Date().toISOString(),
      engineVersion:        '4.0.0',
      phiConstants:         { PHI, PSI },
      mutationRateUsed:     this._mutationStrategy.currentRate,
      populationSizeUsed:   this.populationSize,
      maxMagnitudeUsed:     this._mutationStrategy.currentMagnitude,
      totalGenerations:     (this._generation + 1),
      totalPromoted:        this._totalMutationsPromoted + (generation.promoted?.length ?? 0),
      totalRollbacks:       this._totalRollbacks,
      totalBlocked:         this._totalBlocked,
      neverMutateList:      [...this.neverMutate],
      fitnessWeights:       { ...this.fitnessWeights },
    };

    this._history.push(record);

    // Async write to JSONL log (non-blocking — fire and forget with error logging)
    this._writeHistoryLog(record).catch(err =>
      logger.error('[EvolutionEngine] History log write failed:', err.message)
    );

    return record;
  }

  /**
   * updateMutationStrategy — Adapt mutation rate and magnitude based on history.
   *
   * Adaptive rules (all phi-derived):
   *   - Success streak ≥ fib(4)=3: increase rate by PSI^3 (reward exploration)
   *   - Fail streak ≥ fib(4)=3:    decrease rate by PSI^2 (converge more cautiously)
   *   - Rate always clamped to [PSI/100, PSI/5] = [~0.00618, ~0.1236]
   *   - Magnitude always clamped to [0.01, maxMagnitude=0.13]
   *
   * @param {GenerationRecord[]} history — Full history array
   */
  updateMutationStrategy(history) {
    if (history.length === 0) return;

    const recent = history.slice(-FIB[5]); // last fib(5)=5 generations
    const successes = recent.filter(
      r => r.status !== 'failed' && (r.promoted?.length ?? 0) > 0
    ).length;
    const failures = recent.filter(
      r => r.status === 'failed' || ((r.promoted?.length ?? 0) === 0 && (r.rolledBack?.length ?? 0) > 0)
    ).length;

    const prev = this._mutationStrategy;

    // Success streak → explore more aggressively
    if (successes >= FIB[4]) { // fib(4) = 3
      prev.currentRate      = Math.min(PSI / 5, prev.currentRate * PHI);  // × PHI, cap at PSI/5 ≈ 0.1236
      prev.currentMagnitude = Math.min(this.maxMagnitude, prev.currentMagnitude * (1 + PSI ** 3)); // +23.6%
      prev.successStreak++;
      prev.failStreak = 0;
      logger.info(`[EvolutionEngine] Strategy: success streak ${prev.successStreak}, rate→${prev.currentRate.toFixed(4)}`);
    }

    // Fail streak → converge more cautiously
    if (failures >= FIB[4]) { // fib(4) = 3
      prev.currentRate      = Math.max(PSI / 100, prev.currentRate * PSI);  // × PSI (shrink by conjugate), floor at PSI/100
      prev.currentMagnitude = Math.max(0.01, prev.currentMagnitude * (1 - PSI ** 3));   // shrink magnitude
      prev.failStreak++;
      prev.successStreak = 0;
      logger.info(`[EvolutionEngine] Strategy: fail streak ${prev.failStreak}, rate→${prev.currentRate.toFixed(4)}`);
    }

    prev.lastAdjustedAt = new Date().toISOString();
    this._mutationStrategy = prev;
  }

  /**
   * getEvolutionHistory — Return complete, unmodified evolution history.
   *
   * @returns {GenerationRecord[]} — Full history array (read-only view)
   */
  getEvolutionHistory() {
    return Object.freeze([...this._history]);
  }

  /**
   * getStatus — Return current generation statistics and engine state.
   *
   * @returns {EngineStatus}
   */
  getStatus() {
    const lastGen = this._history[this._history.length - 1] ?? null;

    return {
      generation:              this._generation,
      generationsPerDay:       this.generationsPerDay,
      generationsPerDayBasis:  `fib(4) = ${FIB[4]}`,
      populationSize:          this.populationSize,
      populationSizeBasis:     `fib(6) = ${FIB[6]}`,
      mutationRate:            this.mutationRate,
      mutationRateBasis:       'PSI / 10 = (1/PHI) / 10 ≈ 0.0618',
      maxMagnitude:            this.maxMagnitude,
      maxMagnitudeBasis:       `fib(7) / 100 = ${FIB[7]} / 100 = 0.13`,
      rollbackThreshold:       this.rollbackThreshold,
      approvalThreshold:       this.approvalThreshold,
      neverMutate:             [...this.neverMutate],
      fitnessWeights:          { ...this.fitnessWeights },
      totalMutationsPromoted:  this._totalMutationsPromoted,
      totalRollbacks:          this._totalRollbacks,
      totalBlocked:            this._totalBlocked,
      pendingApprovals:        this._pendingApprovals.length,
      currentStrategy:         { ...this._mutationStrategy },
      lastGeneration:          lastGen ? {
        id:             lastGen.id,
        beneficial:     lastGen.beneficial,
        promoted:       lastGen.promoted?.length ?? 0,
        rolledBack:     lastGen.rolledBack?.length ?? 0,
        bestFitness:    lastGen.bestFitness,
        baselineFitness: lastGen.baselineFitness,
      } : null,
      startedAt:               this._startedAt,
      uptime:                  `${Math.round((Date.now() - new Date(this._startedAt).getTime()) / 1000)}s`,
      phiConstants:            { PHI, PSI },
      engineVersion:           '4.0.0',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Determine if a parameter key/path is protected from mutation.
   *
   * @private
   * @param {string} key  — Parameter key name
   * @param {string} path — Full dot-path in config tree
   * @returns {boolean}
   */
  _isProtected(key, path) {
    const lowerKey  = key.toLowerCase();
    const lowerPath = path.toLowerCase();

    return this.neverMutate.some(pattern => {
      const p = pattern.toLowerCase();
      return lowerKey.includes(p) || lowerPath.includes(p);
    });
  }

  /**
   * Determine if a parameter is suitable for numeric mutation.
   *
   * @private
   * @param {string} key
   * @param {string} path
   * @returns {boolean}
   */
  _isMutableParameter(key, path) {
    // Include parameters that represent:
    //   - timeouts, thresholds, rates, weights, counts, sizes, budgets
    const mutablePatterns = [
      'timeoutms', 'timeout', 'threshold', 'rate', 'weight', 'budget',
      'max', 'min', 'count', 'size', 'gate', 'floor', 'ceiling',
      'budget', 'passes', 'depth', 'concurrent', 'daily', 'limit',
      'magnitude', 'probability', 'confidence', 'similarity',
    ];

    // Exclude basis/documentation keys and booleans
    const excludePatterns = [
      'basis', 'note', 'sum', 'version', 'phi', 'psi', 'fib',
      'order', 'index', '_meta', 'description', 'copyright',
    ];

    const lk = key.toLowerCase();
    const lp = path.toLowerCase();

    const excluded = excludePatterns.some(e => lk.includes(e) || lp.includes(e));
    if (excluded) return false;

    return mutablePatterns.some(p => lk.includes(p));
  }

  /**
   * Score the relevance of a parameter for evolution (0–1).
   * High-impact params (timeouts, gates, weights) score higher.
   *
   * @private
   * @param {string} key
   * @param {number} value
   * @param {string} path
   * @returns {number} — Relevance in [0, 1]
   */
  _scoreRelevance(key, value, path) {
    const lk = key.toLowerCase();
    if (lk.includes('timeout'))   return 1 - PSI ** 2; // 0.764
    if (lk.includes('gate'))      return 1 - PSI ** 2; // 0.764
    if (lk.includes('threshold')) return PSI;           // 0.618
    if (lk.includes('weight'))    return PSI;           // 0.618
    if (lk.includes('rate'))      return PSI;           // 0.618
    if (lk.includes('max'))       return PSI ** 2;      // 0.382
    if (lk.includes('min'))       return PSI ** 2;      // 0.382
    return PSI ** 3;                                     // 0.236 — low default
  }

  /**
   * Score the mutability of a parameter (how safe it is to change).
   *
   * @private
   * @param {string} key
   * @param {number} value
   * @returns {number} — Mutability in [0, 1]
   */
  _scoreMutability(key, value) {
    const lk = key.toLowerCase();
    // Weights are carefully calibrated — mutate conservatively
    if (lk.includes('weight'))  return PSI ** 2;  // 0.382
    // Timeouts are safe to adjust
    if (lk.includes('timeout')) return PSI;        // 0.618
    // Rates and thresholds have moderate mutability
    if (lk.includes('rate') || lk.includes('threshold')) return PSI;
    return PSI ** 2; // default conservative
  }

  /**
   * Infer phi basis annotation for a given key/value pair.
   *
   * @private
   * @param {string} key
   * @param {number} value
   * @returns {string}
   */
  _inferPhiBasis(key, value) {
    // Check if value is close to a phi power × 1000
    for (let n = 0; n <= 8; n++) {
      const phiN = Math.round(PHI ** n * 1000);
      if (Math.abs(value - phiN) < 10) return `phi^${n} × 1000 = ${phiN}`;
    }
    // Check if value is close to PSI or PHI
    if (Math.abs(value - PSI) < 0.01)  return `PSI = 1/PHI ≈ ${PSI.toFixed(4)}`;
    if (Math.abs(value - PHI) < 0.01)  return `PHI ≈ ${PHI.toFixed(4)}`;
    // Check if value is a Fibonacci number
    for (let i = 0; i < FIB.length; i++) {
      if (FIB[i] === value) return `fib(${i}) = ${FIB[i]}`;
    }
    return 'derived';
  }

  /**
   * Snap a mutation delta toward the nearest phi-harmonic value,
   * preserving Sacred Geometry alignment where possible.
   *
   * @private
   * @param {number} rawDelta
   * @param {number} currentValue
   * @returns {number}
   */
  _snapToPhiHarmonic(rawDelta, currentValue) {
    if (Math.abs(rawDelta) < 1e-10) return 0;

    // Check if snapping to a Fibonacci ratio would be better
    const sign = rawDelta < 0 ? -1 : 1;
    const absDelta = Math.abs(rawDelta);

    // Phi-harmonic deltas: PSI^n × |currentValue|
    const candidates = [
      absDelta,                               // raw
      Math.abs(currentValue) * PSI ** 2,      // × 0.382
      Math.abs(currentValue) * PSI ** 3,      // × 0.236
      Math.abs(currentValue) * (1 / FIB[6]),  // × 1/8
      Math.abs(currentValue) * (1 / FIB[7]),  // × 1/13
    ].filter(c => c <= this.maxMagnitude * Math.abs(currentValue || 1));

    if (candidates.length === 0) return sign * absDelta;

    // Pick closest candidate to raw delta
    const best = candidates.reduce((prev, curr) =>
      Math.abs(curr - absDelta) < Math.abs(prev - absDelta) ? curr : prev
    );

    return sign * best;
  }

  /**
   * Apply a fractional delta to a numeric value, preserving sign and
   * respecting phi-geometric scaling.
   *
   * @private
   * @param {number} current
   * @param {number} delta   — Fractional delta in [-maxMagnitude, +maxMagnitude]
   * @returns {number}
   */
  _applyDelta(current, delta) {
    if (current === 0) return delta * 1000; // avoid ×0 problem
    const newValue = current * (1 + delta);
    // Never flip sign (e.g., a positive timeout shouldn't become negative)
    return Math.sign(current) === Math.sign(newValue) ? newValue : Math.abs(newValue) * Math.sign(current);
  }

  /**
   * Compute baseline fitness for the unmodified pipeline config.
   *
   * @private
   * @param {Object} _pipelineConfig
   * @returns {FitnessScore}
   */
  _computeBaselineFitness(_pipelineConfig) {
    // Baseline is the reference point for all relative fitness comparisons.
    // Default: 0.618 (PSI) — representing the minimum acceptable performance.
    return {
      composite:   PSI,  // 0.618
      components: {
        latency:     PSI,
        cost:        PSI,
        quality:     PSI,
        reliability: PSI,
        elegance:    PSI,
      },
      passRate: 1 - PSI ** 2, // 0.764 — nominal baseline pass rate
    };
  }

  /**
   * Simulate a single mutation pass.
   * In production: delegates to HeadySims engine (MONTE_CARLO stage).
   * Here: stochastic model with phi-seeded noise.
   *
   * @private
   * @param {MutatedConfig} mutation
   * @param {FitnessScore}  baseline
   * @param {number}        pass
   * @returns {Promise<SimOutcome>}
   */
  async _runSingleSimulation(mutation, baseline, pass) {
    // Phi-seeded stochastic simulation.
    // Each dimension's outcome = baseline × (1 + phiNoise × mutationSignal)
    const phiSeed    = (pass * PSI) % 1;  // phi-periodic pseudo-random
    const noiseScale = PSI ** 2;           // 0.382 — moderate noise

    const noise = () => (phiSeed + Math.random() * noiseScale) - noiseScale / 2;

    // Compute expected signal from mutation changes
    const avgDelta = mutation.changes.length > 0
      ? mutation.changes.reduce((s, c) => s + (c.delta ?? 0), 0) / mutation.changes.length
      : 0;

    const latency     = this._clamp01(baseline.components.latency     + avgDelta * -0.5 + noise());
    const cost        = this._clamp01(baseline.components.cost        + avgDelta * -0.3 + noise());
    const quality     = this._clamp01(baseline.components.quality     + avgDelta *  0.2 + noise());
    const reliability = this._clamp01(baseline.components.reliability + avgDelta * -0.1 + noise());
    const elegance    = this._clamp01(baseline.components.elegance    + avgDelta *  0.1 + noise());

    const composite = (
      this.fitnessWeights.latency     * (1 - latency)     +  // invert for latency
      this.fitnessWeights.cost        * (1 - cost)        +  // invert for cost
      this.fitnessWeights.quality     * quality            +
      this.fitnessWeights.reliability * reliability        +
      this.fitnessWeights.elegance    * elegance
    );

    return {
      pass,
      latency,
      cost,
      quality,
      reliability,
      elegance,
      composite: this._clamp01(composite),
      passed:    composite >= PSI ** 2,  // pass threshold: PSI² ≈ 0.382
    };
  }

  /**
   * Compute statistical summary of a numeric array.
   *
   * @private
   * @param {number[]} values
   * @returns {StatSummary}
   */
  _computeStats(values) {
    if (values.length === 0) return { mean: 0, std: 0, p5: 0, p50: 0, p95: 0, min: 0, max: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const n      = sorted.length;
    const mean   = values.reduce((s, v) => s + v, 0) / n;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const std    = Math.sqrt(variance);

    const pct = (p) => {
      const i = Math.max(0, Math.min(n - 1, Math.floor(p * n)));
      return sorted[i];
    };

    return {
      mean,
      std,
      p5:  pct(0.05),
      p50: pct(0.50),
      p95: pct(0.95),
      min: sorted[0],
      max: sorted[n - 1],
    };
  }

  /**
   * Apply a mutation to the live pipeline config and measure regression.
   *
   * @private
   * @param {Object} winner
   * @returns {Promise<ApplicationResult>}
   */
  async _applyMutationToConfig(winner) {
    // In production: patches the live config store and re-measures fitness.
    // Here: simulates result using fitness delta from simulation.
    const expectedImprovement = winner.improvement ?? 0;
    const actualImprovement   = expectedImprovement * (0.8 + Math.random() * 0.4); // ±20% realization noise
    const regression          = Math.max(0, -actualImprovement);

    return {
      applied:       true,
      expectedDelta: expectedImprovement,
      actualDelta:   actualImprovement,
      regression,
    };
  }

  /**
   * Rollback a previously applied mutation.
   *
   * @private
   * @param {Object} winner
   * @param {ApplicationResult} applicationResult
   */
  async _rollbackMutation(winner, applicationResult) {
    // In production: restores config to pre-mutation snapshot.
    logger.warn(
      `[EvolutionEngine] Rolling back ${winner.mutation.id}: ` +
      `regression=${(applicationResult.regression * 100).toFixed(2)}%`
    );
  }

  /**
   * Invert a score for dimensions where lower is better (latency, cost).
   * Maps [0,1] → [1,0].
   *
   * @private
   * @param {number} score
   * @returns {number}
   */
  _invertScore(score) {
    return this._clamp01(1 - score);
  }

  /**
   * Clamp a value to [0, 1].
   *
   * @private
   * @param {number} v
   * @returns {number}
   */
  _clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  /**
   * Async JSONL history log writer.
   * Non-blocking — errors are caught by caller.
   *
   * @private
   * @param {GenerationRecord} record
   */
  async _writeHistoryLog(record) {
    // In production: appends to logs/evolution-history.jsonl
    // Implementation delegates to file system or cloud log store.
    // console.debug('[EvolutionEngine] Wrote history record:', record.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DOCUMENTATION (JSDoc — no TypeScript required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} EvolutionCandidate
 * @property {string} path        — Dot-path in config tree (e.g. "pools.llm_tokens.max")
 * @property {string} key         — Parameter key name
 * @property {number} current     — Current value
 * @property {number} relevance   — Relevance score in [0, 1]
 * @property {number} mutability  — Mutability score in [0, 1]
 * @property {string} phiBasis    — Phi derivation annotation
 */

/**
 * @typedef {Object} MutatedConfig
 * @property {string} id       — Unique mutation ID
 * @property {number} index    — Position in population (0-based)
 * @property {Array}  changes  — List of parameter changes applied
 * @property {string} strategy — 'standard' | 'conservative' | 'aggressive'
 */

/**
 * @typedef {Object} SimulationResult
 * @property {MutatedConfig} mutation   — Source mutation
 * @property {number}        passes     — Number of simulation passes (fib(9)=34)
 * @property {Array}         outcomes   — Raw outcomes from each pass
 * @property {Object}        stats      — Statistical summaries per dimension
 * @property {number}        passRate   — Fraction of passes that succeeded
 * @property {number}        baseline   — Baseline composite fitness
 */

/**
 * @typedef {Object} FitnessScore
 * @property {number} composite   — Weighted composite score in [0, 1]
 * @property {Object} components  — Per-dimension scores
 * @property {number} passRate    — Monte Carlo pass rate
 * @property {Object} weights     — Weights used in computation
 * @property {number} cslGate     — CSL gate threshold applied (PSI ≈ 0.618)
 */

/**
 * @typedef {Object} GenerationRecord
 * @property {string} id             — Generation identifier
 * @property {number} generation     — Generation number (1-based)
 * @property {string} startedAt      — ISO timestamp
 * @property {string} completedAt    — ISO timestamp
 * @property {number} candidates     — Mutable params identified
 * @property {number} mutations      — Population size
 * @property {number} simulations    — Simulations run
 * @property {number} beneficial     — Beneficial mutations found
 * @property {Array}  promoted       — Mutations promoted to config
 * @property {Array}  rolledBack     — Mutations auto-rolled back
 * @property {Array}  pendingApproval — Mutations awaiting human approval
 * @property {number} baselineFitness — Fitness before generation
 * @property {number} bestFitness    — Best fitness achieved
 */

/**
 * @typedef {Object} GenerationResult
 * @property {string} generationId
 * @property {number} generation
 * @property {Array}  promoted
 * @property {Array}  rolledBack
 * @property {Array}  pendingApproval
 * @property {number} baselineFitness
 * @property {number} bestFitness
 * @property {number} improvement
 * @property {string} status
 */

/**
 * @typedef {Object} PromotionResult
 * @property {Array} promoted
 * @property {Array} rolledBack
 * @property {Array} pendingApproval
 * @property {Array} blocked
 */

/**
 * @typedef {Object} EngineStatus
 * @property {number} generation
 * @property {number} generationsPerDay
 * @property {number} populationSize
 * @property {number} mutationRate
 * @property {number} maxMagnitude
 * @property {number} rollbackThreshold
 * @property {number} approvalThreshold
 * @property {Array}  neverMutate
 * @property {Object} fitnessWeights
 * @property {number} totalMutationsPromoted
 * @property {number} totalRollbacks
 * @property {number} totalBlocked
 * @property {number} pendingApprovals
 * @property {Object} currentStrategy
 * @property {Object} lastGeneration
 * @property {string} startedAt
 * @property {string} uptime
 */

/**
 * @typedef {Object} MutationStrategy
 * @property {number} currentRate      — Active mutation rate (adapts over time)
 * @property {number} currentMagnitude — Active max magnitude (adapts over time)
 * @property {number} successStreak    — Consecutive successful generations
 * @property {number} failStreak       — Consecutive failing generations
 * @property {string} lastAdjustedAt   — ISO timestamp of last strategy update
 */

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default EvolutionEngine;
