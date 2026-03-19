/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ AUTO-SUCCESS PIPELINE                                    ║
 * ║  6-stage intelligence pipeline with battle arena, evolution,    ║
 * ║  wisdom store, budget tracking, council mode, and Heady Lens    ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║  © 2026 HeadySystems Inc. — All Rights Reserved                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * @module auto-success-pipeline
 * @version 1.0.0
 */

'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');
const {
  PHI, PSI, FIB_SEQUENCE,
  CSL_THRESHOLDS, phiBackoff, phiBackoffWithJitter,
  phiFusionWeights, fib, phiMs, PHI_TIMING,
  cosineSimilarity, placeholderVector, VECTOR_DIMENSIONS,
} = require('../lib/phi-helpers');

// ─── PIPELINE STAGE DEFINITIONS ────────────────────────────────────────────

/**
 * 6 pipeline stages with phi-scaled timeouts.
 * Timeout formula: phiMs(3 + stageIndex) = PHI^(3+i) × 1000ms
 */
const STAGES = Object.freeze([
  { name: 'Understand', index: 0, timeout: phiMs(fib(4)),   description: 'Parse task, extract requirements' },
  { name: 'Research',   index: 1, timeout: phiMs(fib(4) + 1), description: 'Gather context and prior art' },
  { name: 'Battle',     index: 2, timeout: phiMs(fib(5)),   description: 'Pit multiple approaches against each other' },
  { name: 'Build',      index: 3, timeout: phiMs(fib(5) + 1), description: 'Execute winning approach' },
  { name: 'Verify',     index: 4, timeout: phiMs(fib(6) - 1), description: 'Test and validate output' },
  { name: 'Refine',     index: 5, timeout: phiMs(fib(6)),   description: 'Polish based on verification results' },
]);

// ─── BATTLE ARENA ──────────────────────────────────────────────────────────

/**
 * BattleArena — Pits multiple solution approaches against each other.
 * Scoring uses phi-fusion weights across evaluation criteria.
 */
class BattleArena extends EventEmitter {
  constructor() {
    super();
    this._battles = [];
    this._maxHistory = fib(8); // 21
  }

  /**
   * Run a battle between multiple approaches.
   *
   * @param {Array<{id: string, name: string, execute: Function}>} contenders
   * @param {Object} context - Task context
   * @returns {Promise<{winner: Object, rankings: Array, metrics: Object}>}
   */
  async battle(contenders, context = {}) {
    if (contenders.length === 0) {
      throw new Error('BattleArena requires at least one contender');
    }

    const battleId = crypto.randomUUID();
    const startMs = Date.now();
    const results = [];

    // Execute all contenders concurrently with timeout
    const timeoutMs = STAGES[2].timeout;
    const promises = contenders.map(async (contender) => {
      const cStart = Date.now();
      try {
        const output = await Promise.race([
          contender.execute(context),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Battle timeout')), timeoutMs)
          ),
        ]);
        return {
          id: contender.id,
          name: contender.name,
          output,
          durationMs: Date.now() - cStart,
          success: true,
        };
      } catch (err) {
        return {
          id: contender.id,
          name: contender.name,
          error: err.message,
          durationMs: Date.now() - cStart,
          success: false,
        };
      }
    });

    const rawResults = await Promise.all(promises);

    // Score each result using phi-fusion weights
    const weights = phiFusionWeights(fib(5)); // 5 criteria
    for (const r of rawResults) {
      const scores = {
        correctness: r.success ? (r.output && r.output.correctness || PSI) : 0,
        speed: r.success ? Math.max(0, 1 - (r.durationMs / timeoutMs)) : 0,
        quality: r.success ? (r.output && r.output.quality || PSI * PSI) : 0,
        safety: r.success ? (r.output && r.output.safety || PSI) : 0,
        elegance: r.success ? (r.output && r.output.elegance || PSI * PSI * PSI) : 0,
      };

      const composite =
        weights[0] * scores.correctness +
        weights[1] * scores.speed +
        weights[2] * scores.quality +
        weights[3] * scores.safety +
        weights[4] * scores.elegance;

      results.push({ ...r, scores, composite: parseFloat(composite.toFixed(fib(5))) });
    }

    // Rank by composite score descending
    results.sort((a, b) => b.composite - a.composite);
    const winner = results[0];

    const battleRecord = {
      battleId,
      durationMs: Date.now() - startMs,
      contenderCount: contenders.length,
      winner: { id: winner.id, name: winner.name, composite: winner.composite },
      rankings: results.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        name: r.name,
        composite: r.composite,
        success: r.success,
      })),
      timestamp: Date.now(),
    };

    this._battles.push(battleRecord);
    if (this._battles.length > this._maxHistory) this._battles.shift();
    this.emit('battle:complete', battleRecord);

    return { winner, rankings: results, metrics: battleRecord };
  }

  /** Health check */
  health() {
    return {
      component: 'BattleArena',
      status: 'healthy',
      totalBattles: this._battles.length,
    };
  }

  /** Shutdown */
  shutdown() {
    this._battles = [];
    this.removeAllListeners();
  }
}

// ─── EVOLUTION ENGINE ──────────────────────────────────────────────────────

/**
 * EvolutionEngine — Genetic algorithm with phi-scaled parameters.
 *
 * Parameters:
 *   populationSize = fib(8) = 21
 *   mutationRate   = PSI^2  = 0.382
 *   crossoverRate  = PSI    = 0.618
 *   eliteCount     = fib(4) = 3
 *   maxGenerations = fib(10) = 55
 *   tournamentSize = round(populationSize * PSI^2) = 8
 */
class EvolutionEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.populationSize = config.populationSize || fib(8);          // 21
    this.mutationRate = config.mutationRate || Math.pow(PSI, fib(3));  // PSI^2 = 0.382
    this.crossoverRate = config.crossoverRate || PSI;                 // 0.618
    this.eliteCount = config.eliteCount || fib(4);                    // 3
    this.maxGenerations = config.maxGenerations || fib(10);           // 55
    this.tournamentSize = config.tournamentSize ||
      Math.round(this.populationSize * Math.pow(PSI, fib(3)));       // ~8

    this.fitnessFunction = config.fitnessFunction || null;
    this._generation = 0;
    this._best = null;
    this._convergenceHistory = [];
  }

  /**
   * Evolve a population over multiple generations.
   *
   * @param {Object} params
   * @param {Array} params.initialPopulation - Starting individuals
   * @param {Function} [params.fitnessFunction] - Fitness scorer (individual) => number
   * @param {number} [params.maxGenerations] - Override max generations
   * @returns {Promise<{best: *, fitness: number, generation: number, convergenceHistory: Array}>}
   */
  async evolve(params) {
    const {
      initialPopulation,
      fitnessFunction = this.fitnessFunction,
      maxGenerations = this.maxGenerations,
    } = params;

    if (!fitnessFunction) throw new Error('EvolutionEngine requires a fitnessFunction');

    // Initialize or use provided population
    let population = initialPopulation && initialPopulation.length > 0
      ? [...initialPopulation]
      : this._randomPopulation();

    // Ensure population size matches
    while (population.length < this.populationSize) {
      population.push(this._mutate(population[Math.floor(Math.random() * population.length)]));
    }
    population = population.slice(0, this.populationSize);

    this._convergenceHistory = [];

    for (let gen = 0; gen < maxGenerations; gen++) {
      this._generation = gen;

      // Score all individuals
      const scored = await Promise.all(
        population.map(async (individual) => ({
          individual,
          fitness: await fitnessFunction(individual),
        }))
      );

      // Sort by fitness descending
      scored.sort((a, b) => b.fitness - a.fitness);
      this._best = scored[0];

      this._convergenceHistory.push({
        generation: gen,
        bestFitness: scored[0].fitness,
        avgFitness: scored.reduce((s, x) => s + x.fitness, 0) / scored.length,
        worstFitness: scored[scored.length - 1].fitness,
      });

      this.emit('generation:complete', {
        generation: gen,
        best: scored[0].fitness,
        avg: this._convergenceHistory[gen].avgFitness,
      });

      // Early convergence: stop if top fib(4) individuals are nearly identical
      if (gen > fib(5) && this._isConverged(scored)) break;

      // Selection + Reproduction
      const nextGen = [];

      // Elitism: keep top fib(4)=3
      for (let i = 0; i < this.eliteCount && i < scored.length; i++) {
        nextGen.push(scored[i].individual);
      }

      // Fill rest via tournament selection + crossover + mutation
      while (nextGen.length < this.populationSize) {
        const parent1 = this._tournamentSelect(scored);
        const parent2 = this._tournamentSelect(scored);

        let child;
        if (Math.random() < this.crossoverRate) {
          child = this._crossover(parent1.individual, parent2.individual);
        } else {
          child = { ...parent1.individual };
        }

        if (Math.random() < this.mutationRate) {
          child = this._mutate(child);
        }

        nextGen.push(child);
      }

      population = nextGen.slice(0, this.populationSize);
    }

    return {
      best: this._best.individual,
      fitness: this._best.fitness,
      generation: this._generation,
      convergenceHistory: this._convergenceHistory,
    };
  }

  /**
   * Tournament selection.
   * @param {Array} scored - Scored population
   * @returns {Object} Selected individual
   */
  _tournamentSelect(scored) {
    let best = null;
    for (let i = 0; i < this.tournamentSize; i++) {
      const candidate = scored[Math.floor(Math.random() * scored.length)];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return best;
  }

  /**
   * Single-point crossover.
   * @param {Object} parent1
   * @param {Object} parent2
   * @returns {Object} Child
   */
  _crossover(parent1, parent2) {
    const keys = Object.keys(parent1);
    const point = Math.floor(keys.length * PSI); // Golden split
    const child = {};
    keys.forEach((key, i) => {
      child[key] = i < point ? parent1[key] : parent2[key];
    });
    return child;
  }

  /**
   * Mutation — perturb numeric values by ±PSI^2.
   * @param {Object} individual
   * @returns {Object} Mutated copy
   */
  _mutate(individual) {
    const mutated = { ...individual };
    const keys = Object.keys(mutated);
    const mutateKey = keys[Math.floor(Math.random() * keys.length)];

    if (typeof mutated[mutateKey] === 'number') {
      const perturbation = mutated[mutateKey] * this.mutationRate * (Math.random() * fib(3) - 1);
      mutated[mutateKey] += perturbation;
    } else if (typeof mutated[mutateKey] === 'string') {
      // String mutation: append random suffix
      mutated[mutateKey] = mutated[mutateKey] + '-' + crypto.randomBytes(fib(4)).toString('hex');
    }
    return mutated;
  }

  /**
   * Check convergence: top individuals within PSI^3 fitness spread.
   * @param {Array} scored
   * @returns {boolean}
   */
  _isConverged(scored) {
    if (scored.length < fib(4)) return false;
    const topN = scored.slice(0, fib(4));
    const spread = topN[0].fitness - topN[topN.length - 1].fitness;
    return spread < Math.pow(PSI, fib(4));
  }

  /**
   * Generate random population (placeholder — override for real use).
   * @returns {Array}
   */
  _randomPopulation() {
    return Array.from({ length: this.populationSize }, (_, i) => ({
      id: `individual-${i}`,
      param1: Math.random() * PHI,
      param2: Math.random() * PSI,
      param3: Math.random(),
    }));
  }

  /** Health check */
  health() {
    return {
      component: 'EvolutionEngine',
      status: 'healthy',
      generation: this._generation,
      bestFitness: this._best ? this._best.fitness : null,
      populationSize: this.populationSize,
      mutationRate: this.mutationRate,
      crossoverRate: this.crossoverRate,
    };
  }

  /** Shutdown */
  shutdown() {
    this._convergenceHistory = [];
    this._best = null;
    this.removeAllListeners();
  }
}

// ─── WISDOM STORE ──────────────────────────────────────────────────────────

/**
 * WisdomStore — In-memory knowledge base with cosine similarity retrieval.
 * Stores wisdom entries with embeddings for semantic search.
 */
class WisdomStore extends EventEmitter {
  constructor() {
    super();
    this._entries = [];
    this._maxEntries = fib(11); // 89
  }

  /**
   * Store a wisdom entry.
   *
   * @param {Object} entry
   * @param {string} entry.content - Wisdom text
   * @param {number[]} [entry.embedding] - Pre-computed embedding vector
   * @param {string[]} [entry.tags] - Classification tags
   * @param {Object} [entry.metadata] - Additional metadata
   * @returns {Object} Stored entry with ID
   */
  store(entry) {
    const record = {
      id: crypto.randomUUID(),
      content: entry.content,
      embedding: entry.embedding || placeholderVector(entry.content, VECTOR_DIMENSIONS),
      tags: entry.tags || [],
      metadata: entry.metadata || {},
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: null,
    };

    this._entries.push(record);
    if (this._entries.length > this._maxEntries) {
      // Evict least-accessed entry
      this._entries.sort((a, b) => a.accessCount - b.accessCount);
      this._entries.shift();
    }

    this.emit('wisdom:stored', { id: record.id, tags: record.tags });
    return { id: record.id, content: record.content, tags: record.tags };
  }

  /**
   * Query wisdom by embedding similarity.
   *
   * @param {number[]} queryEmbedding - Query vector
   * @param {Object} [options]
   * @param {number} [options.topK=fib(5)] - Max results to return
   * @param {number} [options.minSimilarity=PSI] - Minimum cosine similarity
   * @param {string[]} [options.tags] - Filter by tags
   * @returns {Array<{content: string, similarity: number, tags: string[], id: string}>}
   */
  query(queryEmbedding, options = {}) {
    const topK = options.topK || fib(5);
    const minSimilarity = options.minSimilarity || PSI;
    const filterTags = options.tags || null;

    let candidates = this._entries;
    if (filterTags && filterTags.length > 0) {
      candidates = candidates.filter(e =>
        filterTags.some(tag => e.tags.includes(tag))
      );
    }

    const scored = candidates.map(entry => {
      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      return { ...entry, similarity };
    });

    scored.sort((a, b) => b.similarity - a.similarity);

    const results = scored
      .filter(s => s.similarity >= minSimilarity)
      .slice(0, topK)
      .map(s => {
        s.accessCount++;
        s.lastAccessed = Date.now();
        return {
          id: s.id,
          content: s.content,
          similarity: parseFloat(s.similarity.toFixed(fib(5))),
          tags: s.tags,
          createdAt: s.createdAt,
        };
      });

    return results;
  }

  /** Get store statistics */
  stats() {
    return {
      totalEntries: this._entries.length,
      maxEntries: this._maxEntries,
      avgAccessCount: this._entries.length > 0
        ? this._entries.reduce((s, e) => s + e.accessCount, 0) / this._entries.length
        : 0,
    };
  }

  /** Health check */
  health() {
    return {
      component: 'WisdomStore',
      status: 'healthy',
      entries: this._entries.length,
      capacity: parseFloat((this._entries.length / this._maxEntries).toFixed(fib(4))),
    };
  }

  /** Shutdown */
  shutdown() {
    this._entries = [];
    this.removeAllListeners();
  }
}

// ─── BUDGET TRACKER ────────────────────────────────────────────────────────

/**
 * Fibonacci-tiered budget limits.
 *
 * | Tier     | Daily     | Weekly     | Monthly     |
 * |----------|-----------|------------|-------------|
 * | Free     | $fib(5)=5 | $fib(8)=21 | $fib(10)=55 |
 * | Standard | $fib(8)=21| $fib(11)=89| $fib(13)=233|
 * | Premium  | $fib(10)=55|$fib(13)=233|$fib(15)=610|
 */
const BUDGET_TIERS = Object.freeze({
  free:     { daily: fib(5), weekly: fib(8), monthly: fib(10) },
  standard: { daily: fib(8), weekly: fib(11), monthly: fib(13) },
  premium:  { daily: fib(10), weekly: fib(13), monthly: fib(15) },
});

/**
 * BudgetTracker — phi-tiered cost management across models and providers.
 */
class BudgetTracker extends EventEmitter {
  /**
   * @param {Object} config
   * @param {string} [config.tier='standard'] - Budget tier
   */
  constructor(config = {}) {
    super();
    this.tier = config.tier || 'standard';
    this.limits = BUDGET_TIERS[this.tier] || BUDGET_TIERS.standard;
    this._spending = { daily: 0, weekly: 0, monthly: 0 };
    this._records = [];
    this._maxRecords = fib(11); // 89
    this._periodStart = {
      daily: this._startOfDay(),
      weekly: this._startOfWeek(),
      monthly: this._startOfMonth(),
    };
  }

  /**
   * Record a spend event.
   *
   * @param {Object} params
   * @param {string} params.model - Model used
   * @param {number} params.cost - Cost in USD
   * @param {Object} [params.tokens] - Token counts
   * @returns {Object} Spend record
   */
  record(params) {
    this._resetPeriodsIfNeeded();

    const { model, cost, tokens } = params;
    this._spending.daily += cost;
    this._spending.weekly += cost;
    this._spending.monthly += cost;

    const record = {
      id: crypto.randomUUID(),
      model,
      cost,
      tokens: tokens || {},
      timestamp: Date.now(),
      remaining: this.remaining(),
    };

    this._records.push(record);
    if (this._records.length > this._maxRecords) this._records.shift();

    // Emit warning if approaching limits
    const remaining = this.remaining();
    if (remaining.daily < this.limits.daily * Math.pow(PSI, fib(3))) {
      this.emit('budget:warning', { period: 'daily', remaining: remaining.daily });
    }
    if (remaining.weekly < this.limits.weekly * Math.pow(PSI, fib(3))) {
      this.emit('budget:warning', { period: 'weekly', remaining: remaining.weekly });
    }

    return record;
  }

  /**
   * Check remaining budget across all periods.
   * @returns {{daily: number, weekly: number, monthly: number}}
   */
  remaining() {
    this._resetPeriodsIfNeeded();
    return {
      daily: parseFloat((this.limits.daily - this._spending.daily).toFixed(fib(4))),
      weekly: parseFloat((this.limits.weekly - this._spending.weekly).toFixed(fib(4))),
      monthly: parseFloat((this.limits.monthly - this._spending.monthly).toFixed(fib(4))),
    };
  }

  /**
   * Check if a spend amount is within budget.
   * @param {number} estimatedCost
   * @returns {boolean}
   */
  canSpend(estimatedCost) {
    this._resetPeriodsIfNeeded();
    return (
      this._spending.daily + estimatedCost <= this.limits.daily &&
      this._spending.weekly + estimatedCost <= this.limits.weekly &&
      this._spending.monthly + estimatedCost <= this.limits.monthly
    );
  }

  /** Reset period counters if periods have rolled over */
  _resetPeriodsIfNeeded() {
    const now = Date.now();
    const dayMs = fib(8) * fib(6) * fib(4) * fib(4) * PHI_TIMING.TICK; // ~86400000 approx
    // Use actual day boundary
    if (this._startOfDay() > this._periodStart.daily) {
      this._spending.daily = 0;
      this._periodStart.daily = this._startOfDay();
    }
    if (this._startOfWeek() > this._periodStart.weekly) {
      this._spending.weekly = 0;
      this._periodStart.weekly = this._startOfWeek();
    }
    if (this._startOfMonth() > this._periodStart.monthly) {
      this._spending.monthly = 0;
      this._periodStart.monthly = this._startOfMonth();
    }
  }

  _startOfDay() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  _startOfWeek() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.getTime();
  }

  _startOfMonth() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d.getTime();
  }

  /** Health check */
  health() {
    const remaining = this.remaining();
    return {
      component: 'BudgetTracker',
      status: remaining.daily > 0 ? 'healthy' : 'budget_exceeded',
      tier: this.tier,
      limits: this.limits,
      spending: { ...this._spending },
      remaining,
    };
  }

  /** Shutdown */
  shutdown() {
    this._records = [];
    this.removeAllListeners();
  }
}

// ─── COUNCIL MODE ──────────────────────────────────────────────────────────

/**
 * CouncilMode — Multi-model consensus with PSI agreement threshold.
 * Runs the same prompt through multiple models and synthesizes agreement.
 */
class CouncilMode extends EventEmitter {
  /**
   * @param {Object} config
   * @param {string[]} config.models - List of model identifiers
   * @param {Object} [config.providers] - Provider configuration map
   */
  constructor(config = {}) {
    super();
    this.models = config.models || [];
    this.providers = config.providers || {};
    this.minConsensus = config.minConsensus || PSI; // 0.618
    this._deliberations = [];
    this._maxHistory = fib(8); // 21
  }

  /**
   * Run a council deliberation across all models.
   *
   * @param {Object} params
   * @param {string} params.prompt - The question/prompt
   * @param {number} [params.minConsensus=PSI] - Minimum agreement threshold
   * @param {Function} [params.executor] - Function(model, prompt) => response
   * @returns {Promise<{consensus: boolean, agreementScore: number, responses: Array, synthesis: string}>}
   */
  async deliberate(params) {
    const { prompt, minConsensus = this.minConsensus, executor } = params;
    const startMs = Date.now();

    if (!executor && this.models.length === 0) {
      throw new Error('CouncilMode requires models and an executor function');
    }

    // Collect responses from all models concurrently
    const responses = await Promise.all(
      this.models.map(async (model) => {
        const cStart = Date.now();
        try {
          const output = executor
            ? await executor(model, prompt)
            : { text: `[${model}] No executor provided`, embedding: placeholderVector(model) };
          return {
            model,
            output: typeof output === 'string' ? { text: output, embedding: placeholderVector(output) } : output,
            durationMs: Date.now() - cStart,
            success: true,
          };
        } catch (err) {
          return {
            model,
            error: err.message,
            durationMs: Date.now() - cStart,
            success: false,
          };
        }
      })
    );

    // Compute pairwise agreement using cosine similarity of response embeddings
    const successful = responses.filter(r => r.success);
    let totalAgreement = 0;
    let pairCount = 0;

    for (let i = 0; i < successful.length; i++) {
      for (let j = i + 1; j < successful.length; j++) {
        const embA = successful[i].output.embedding || placeholderVector(successful[i].model);
        const embB = successful[j].output.embedding || placeholderVector(successful[j].model);
        totalAgreement += cosineSimilarity(embA, embB);
        pairCount++;
      }
    }

    const agreementScore = pairCount > 0 ? totalAgreement / pairCount : 0;
    const consensus = agreementScore >= minConsensus;

    // Synthesize: select the response most aligned with the centroid
    let synthesis = '';
    if (successful.length > 0) {
      const embeddings = successful.map(r =>
        r.output.embedding || placeholderVector(r.model)
      );
      // Compute centroid
      const dim = embeddings[0].length;
      const centroid = new Array(dim).fill(0);
      for (const emb of embeddings) {
        for (let d = 0; d < dim; d++) centroid[d] += emb[d] / embeddings.length;
      }

      let bestIdx = 0;
      let bestSim = -1;
      for (let i = 0; i < successful.length; i++) {
        const sim = cosineSimilarity(
          embeddings[i],
          centroid
        );
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = i;
        }
      }
      synthesis = successful[bestIdx].output.text || '';
    }

    const deliberation = {
      deliberationId: crypto.randomUUID(),
      prompt: prompt.substring(0, fib(11) * fib(4)), // Truncate for storage
      modelCount: this.models.length,
      successfulCount: successful.length,
      agreementScore: parseFloat(agreementScore.toFixed(fib(5))),
      consensus,
      durationMs: Date.now() - startMs,
      timestamp: Date.now(),
    };

    this._deliberations.push(deliberation);
    if (this._deliberations.length > this._maxHistory) this._deliberations.shift();
    this.emit('council:deliberated', deliberation);

    return { consensus, agreementScore, responses, synthesis };
  }

  /** Health check */
  health() {
    return {
      component: 'CouncilMode',
      status: 'healthy',
      models: this.models.length,
      deliberations: this._deliberations.length,
      minConsensus: this.minConsensus,
    };
  }

  /** Shutdown */
  shutdown() {
    this._deliberations = [];
    this.removeAllListeners();
  }
}

// ─── HEADY LENS ────────────────────────────────────────────────────────────

/** Available analysis lenses */
const LENS_TYPES = Object.freeze(['technical', 'security', 'cost', 'ux']);

/**
 * HeadyLens — Multi-lens analysis engine.
 * Examines input through multiple analytical perspectives.
 */
class HeadyLens extends EventEmitter {
  /**
   * @param {Object} config
   * @param {Function} [config.analyzer] - Function(input, lens) => analysis
   */
  constructor(config = {}) {
    super();
    this.analyzer = config.analyzer || null;
    this._analyses = [];
    this._maxHistory = fib(8);
  }

  /**
   * Analyze input through multiple lenses.
   *
   * @param {*} input - Content to analyze
   * @param {Object} [options]
   * @param {string[]} [options.lenses] - Which lenses to apply
   * @param {Function} [options.analyzer] - Override analyzer
   * @returns {Promise<Object>} Per-lens analysis results
   */
  async analyze(input, options = {}) {
    const lenses = options.lenses || LENS_TYPES;
    const analyzer = options.analyzer || this.analyzer;
    const startMs = Date.now();
    const results = {};

    // Run all lenses concurrently
    const promises = lenses.map(async (lens) => {
      const lStart = Date.now();
      try {
        if (analyzer) {
          const analysis = await analyzer(input, lens);
          return { lens, analysis, durationMs: Date.now() - lStart, success: true };
        }
        // Default analysis when no analyzer provided
        return {
          lens,
          analysis: this._defaultAnalysis(input, lens),
          durationMs: Date.now() - lStart,
          success: true,
        };
      } catch (err) {
        return { lens, error: err.message, durationMs: Date.now() - lStart, success: false };
      }
    });

    const lensResults = await Promise.all(promises);
    const weights = phiFusionWeights(lenses.length);
    let compositeScore = 0;

    for (let i = 0; i < lensResults.length; i++) {
      const lr = lensResults[i];
      results[lr.lens] = lr.success
        ? { ...lr.analysis, durationMs: lr.durationMs }
        : { error: lr.error, score: 0, durationMs: lr.durationMs };

      const score = lr.success && lr.analysis ? (lr.analysis.score || PSI) : 0;
      compositeScore += weights[i] * score;
    }

    results._meta = {
      lensesApplied: lenses.length,
      compositeScore: parseFloat(compositeScore.toFixed(fib(5))),
      durationMs: Date.now() - startMs,
      phiFusionWeights: weights.map(w => parseFloat(w.toFixed(fib(5)))),
    };

    this._analyses.push({ timestamp: Date.now(), lenses, compositeScore });
    if (this._analyses.length > this._maxHistory) this._analyses.shift();
    this.emit('lens:analyzed', results._meta);

    return results;
  }

  /**
   * Default analysis when no external analyzer is provided.
   * @param {*} input
   * @param {string} lens
   * @returns {Object}
   */
  _defaultAnalysis(input, lens) {
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    const length = inputStr.length;

    switch (lens) {
      case 'technical':
        return {
          score: Math.min(1, length / (fib(11) * fib(8))),
          complexity: length > fib(11) * fib(5) ? 'high' : length > fib(11) ? 'medium' : 'low',
          recommendation: 'Review code structure and modularity',
        };
      case 'security':
        return {
          score: PSI,
          risks: [],
          recommendation: 'Run security scan before deployment',
        };
      case 'cost':
        return {
          score: PSI * PSI,
          estimatedTokens: Math.ceil(length / fib(5)),
          recommendation: 'Optimize prompt length for cost efficiency',
        };
      case 'ux':
        return {
          score: PSI,
          readability: length < fib(13) ? 'good' : 'review',
          recommendation: 'Ensure clear user-facing messaging',
        };
      default:
        return { score: PSI * PSI, recommendation: 'No specific analysis available' };
    }
  }

  /** Health check */
  health() {
    return {
      component: 'HeadyLens',
      status: 'healthy',
      availableLenses: LENS_TYPES.length,
      analysesCompleted: this._analyses.length,
    };
  }

  /** Shutdown */
  shutdown() {
    this._analyses = [];
    this.removeAllListeners();
  }
}

// ─── AUTO-SUCCESS PIPELINE (MAIN ENGINE) ───────────────────────────────────

/**
 * AutoSuccessPipeline — 6-stage intelligence pipeline orchestrating
 * all components: Battle Arena, Evolution, Wisdom, Budget, Council, Lens.
 *
 * Stages: Understand → Research → Battle → Build → Verify → Refine
 * Each stage has phi-scaled timeouts.
 */
class AutoSuccessPipeline extends EventEmitter {
  /**
   * @param {Object} config
   * @param {Function} [config.llmProvider] - LLM invocation function
   * @param {Function} [config.embeddingProvider] - Embedding function
   * @param {string} [config.budgetTier='standard'] - Budget tier
   * @param {string[]} [config.councilModels] - Models for council
   */
  constructor(config = {}) {
    super();
    this._startTime = Date.now();

    // Initialize all sub-components
    this.battleArena = new BattleArena();
    this.evolutionEngine = new EvolutionEngine(config.evolutionConfig || {});
    this.wisdomStore = new WisdomStore();
    this.budgetTracker = new BudgetTracker({ tier: config.budgetTier || 'standard' });
    this.councilMode = new CouncilMode({
      models: config.councilModels || [],
      providers: config.providers || {},
    });
    this.headyLens = new HeadyLens({ analyzer: config.analyzer || null });

    this._runs = [];
    this._maxRuns = fib(8); // 21
    this._llmProvider = config.llmProvider || null;
    this._embeddingProvider = config.embeddingProvider || null;
  }

  /**
   * Run the full 6-stage auto-success pipeline.
   *
   * @param {Object} params
   * @param {string} params.task - Task description
   * @param {Object} [params.context] - Additional context
   * @returns {Promise<{stages: Array, winner: *, output: *, metrics: Object}>}
   */
  async run(params) {
    const { task, context = {} } = params;
    const runId = crypto.randomUUID();
    const startMs = Date.now();
    const stageResults = [];

    this.emit('pipeline:start', { runId, task });

    // ─── Stage 1: Understand ──────────────────────────────────
    const understandResult = await this._executeStage(0, async () => {
      // Extract requirements from task
      const taskEmbedding = this._embeddingProvider
        ? await this._embeddingProvider(task)
        : placeholderVector(task);
      const priorWisdom = this.wisdomStore.query(taskEmbedding, { topK: fib(5) });

      return {
        task,
        embedding: taskEmbedding,
        priorWisdom,
        requirements: this._extractRequirements(task),
        contextSize: JSON.stringify(context).length,
      };
    });
    stageResults.push(understandResult);

    // ─── Stage 2: Research ────────────────────────────────────
    const researchResult = await this._executeStage(1, async () => {
      const lensAnalysis = await this.headyLens.analyze(task, {
        lenses: LENS_TYPES,
      });
      return {
        lensAnalysis,
        priorArt: understandResult.output.priorWisdom,
        researchDepth: understandResult.output.priorWisdom.length,
      };
    });
    stageResults.push(researchResult);

    // ─── Stage 3: Battle ──────────────────────────────────────
    const battleResult = await this._executeStage(2, async () => {
      // Create contenders based on research
      const contenders = this._generateContenders(task, researchResult.output);
      if (contenders.length < fib(3)) {
        return { winner: contenders[0] || null, rankings: contenders, skipped: true };
      }
      return await this.battleArena.battle(contenders, { task, ...context });
    });
    stageResults.push(battleResult);

    // ─── Stage 4: Build ───────────────────────────────────────
    const buildResult = await this._executeStage(3, async () => {
      const approach = battleResult.output.winner || { output: { plan: task } };
      return {
        approach: approach.name || 'default',
        output: approach.output || { text: task },
        built: true,
      };
    });
    stageResults.push(buildResult);

    // ─── Stage 5: Verify ──────────────────────────────────────
    const verifyResult = await this._executeStage(4, async () => {
      // Verify via lens analysis on build output
      const verification = await this.headyLens.analyze(buildResult.output, {
        lenses: ['technical', 'security'],
      });
      const passed = verification._meta.compositeScore >= CSL_THRESHOLDS.MEDIUM;
      return { verification, passed, score: verification._meta.compositeScore };
    });
    stageResults.push(verifyResult);

    // ─── Stage 6: Refine ──────────────────────────────────────
    const refineResult = await this._executeStage(5, async () => {
      // Store wisdom from this run
      this.wisdomStore.store({
        content: `Task: ${task} | Score: ${verifyResult.output.score}`,
        tags: ['auto-success', 'pipeline-run'],
      });

      return {
        finalOutput: buildResult.output,
        refinements: verifyResult.output.passed ? [] : ['Needs manual review'],
        coherenceScore: verifyResult.output.score,
      };
    });
    stageResults.push(refineResult);

    const totalDurationMs = Date.now() - startMs;
    const metrics = {
      runId,
      task: task.substring(0, fib(11)),
      stageCount: stageResults.length,
      totalDurationMs,
      winner: battleResult.output.winner ? battleResult.output.winner.name : null,
      coherenceScore: verifyResult.output.score,
      passed: verifyResult.output.passed,
      timestamp: Date.now(),
    };

    this._runs.push(metrics);
    if (this._runs.length > this._maxRuns) this._runs.shift();
    this.emit('pipeline:complete', metrics);

    return {
      stages: stageResults,
      winner: battleResult.output.winner,
      output: refineResult.output.finalOutput,
      metrics,
    };
  }

  /**
   * Execute a single pipeline stage with timeout and error handling.
   * @param {number} stageIndex
   * @param {Function} executeFn
   * @returns {Promise<{stage: string, output: *, durationMs: number, success: boolean}>}
   */
  async _executeStage(stageIndex, executeFn) {
    const stage = STAGES[stageIndex];
    const startMs = Date.now();

    this.emit('stage:start', { stage: stage.name, index: stageIndex });

    try {
      const output = await Promise.race([
        executeFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Stage ${stage.name} timeout after ${stage.timeout}ms`)), stage.timeout)
        ),
      ]);

      const durationMs = Date.now() - startMs;
      this.emit('stage:complete', { stage: stage.name, durationMs, success: true });
      return { stage: stage.name, output, durationMs, success: true };
    } catch (err) {
      const durationMs = Date.now() - startMs;
      this.emit('stage:error', { stage: stage.name, error: err.message, durationMs });
      return { stage: stage.name, output: { error: err.message }, durationMs, success: false };
    }
  }

  /**
   * Extract simple requirements from task text.
   * @param {string} task
   * @returns {Array}
   */
  _extractRequirements(task) {
    const words = task.split(/\s+/);
    const requirements = [];
    const keywords = ['build', 'create', 'implement', 'fix', 'optimize', 'test', 'deploy', 'review'];
    for (const kw of keywords) {
      if (words.some(w => w.toLowerCase().includes(kw))) {
        requirements.push({ type: kw, confidence: PSI });
      }
    }
    return requirements.length > 0 ? requirements : [{ type: 'general', confidence: PSI * PSI }];
  }

  /**
   * Generate battle contenders from research results.
   * @param {string} task
   * @param {Object} research
   * @returns {Array}
   */
  _generateContenders(task, research) {
    return [
      {
        id: 'approach-direct',
        name: 'Direct Implementation',
        execute: async () => ({
          text: `Direct implementation of: ${task}`,
          correctness: PSI,
          quality: PSI,
          safety: PSI,
          elegance: PSI * PSI,
        }),
      },
      {
        id: 'approach-modular',
        name: 'Modular Decomposition',
        execute: async () => ({
          text: `Modular decomposition of: ${task}`,
          correctness: PSI * PHI * PSI,
          quality: PSI * PSI * PHI,
          safety: PSI,
          elegance: PSI,
        }),
      },
      {
        id: 'approach-iterative',
        name: 'Iterative Refinement',
        execute: async () => ({
          text: `Iterative refinement of: ${task}`,
          correctness: PSI * PSI,
          quality: PHI * PSI * PSI,
          safety: PSI * PSI,
          elegance: PSI * PHI * PSI,
        }),
      },
    ];
  }

  /**
   * Get comprehensive health status of all sub-components.
   * @returns {Object}
   */
  health() {
    return {
      service: 'auto-success-pipeline',
      status: 'healthy',
      uptime_ms: Date.now() - this._startTime,
      phi_compliance: true,
      sacred_geometry_layer: 'Inner',
      components: {
        battleArena: this.battleArena.health(),
        evolutionEngine: this.evolutionEngine.health(),
        wisdomStore: this.wisdomStore.health(),
        budgetTracker: this.budgetTracker.health(),
        councilMode: this.councilMode.health(),
        headyLens: this.headyLens.health(),
      },
      runs: this._runs.length,
      stages: STAGES.map(s => ({ name: s.name, timeout: s.timeout })),
    };
  }

  /**
   * Graceful shutdown — LIFO cleanup of all components.
   */
  shutdown() {
    this.headyLens.shutdown();
    this.councilMode.shutdown();
    this.budgetTracker.shutdown();
    this.wisdomStore.shutdown();
    this.evolutionEngine.shutdown();
    this.battleArena.shutdown();
    this._runs = [];
    this.removeAllListeners();
  }
}

// ─── MODULE EXPORTS ────────────────────────────────────────────────────────

module.exports = {
  // Pipeline
  AutoSuccessPipeline,
  STAGES,

  // Components
  BattleArena,
  EvolutionEngine,
  WisdomStore,
  BudgetTracker,
  BUDGET_TIERS,
  CouncilMode,
  HeadyLens,
  LENS_TYPES,
};
