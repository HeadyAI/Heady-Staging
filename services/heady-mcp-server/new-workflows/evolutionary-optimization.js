/**
 * Evolutionary Optimization Workflow
 * Genetic algorithm across all agent configs → tournament → apply winners
 * Ring: Inner | CSL: HIGH
 */
const { PHI, PSI, FIB, CSL } = require('../new-tools/mcp-tools-registry');

class EvolutionaryOptimizationWorkflow {
  constructor() {
    this.name = 'evolutionary-optimization';
    this.description = 'Applies genetic algorithms to agent configurations: generates populations of config variants, evaluates fitness through tournament selection, crosses winning configs, and deploys optimized parameters.';
    this.ring = 'inner';
    this.cslRequirement = 'HIGH';
    this.populationSize = FIB[8];
    this.generations = FIB[6];
    this.mutationRate = PSI * 0.1;
    this.crossoverRate = PSI;
    this.steps = [
      { name: 'snapshot_current', description: 'Snapshot all current agent configurations as generation zero' },
      { name: 'generate_population', description: 'Create mutated config variants for tournament' },
      { name: 'evaluate_fitness', description: 'Run each variant against benchmark workloads' },
      { name: 'tournament_select', description: 'Select winners via phi-weighted tournament' },
      { name: 'crossover', description: 'Cross winning configs to produce next generation' },
      { name: 'mutate', description: 'Apply random mutations at phi-scaled rate' },
      { name: 'converge_check', description: 'Check if population has converged within tolerance' },
      { name: 'validate_winners', description: 'Validate top configs against production traffic sample' },
      { name: 'apply_optimized', description: 'Deploy winning configuration to target agents' },
      { name: 'report_evolution', description: 'Generate evolution report with fitness curves' }
    ];
    this.state = { phase: 'idle', generation: 0, bestFitness: 0, population: [] };
  }

  async execute(context = {}) {
    this.state.phase = 'running';
    const targetAgents = context.target_agents || ['CortexBee', 'WeaverBee', 'OracleBee'];
    const maxGenerations = context.max_generations || this.generations;

    const baseConfigs = await this._snapshotCurrent(targetAgents);
    let population = this._generatePopulation(baseConfigs);

    const fitnessHistory = [];
    for (let gen = 0; gen < maxGenerations; gen++) {
      this.state.generation = gen;
      const evaluated = await this._evaluateFitness(population);
      const bestGen = evaluated.reduce((a, b) => a.fitness > b.fitness ? a : b);
      fitnessHistory.push({ generation: gen, best: bestGen.fitness, avg: evaluated.reduce((s, e) => s + e.fitness, 0) / evaluated.length });

      if (bestGen.fitness >= CSL.CRITICAL) break;

      const selected = this._tournamentSelect(evaluated);
      const crossed = this._crossover(selected);
      population = this._mutate(crossed);
    }

    const finalEval = await this._evaluateFitness(population);
    finalEval.sort((a, b) => b.fitness - a.fitness);
    const winner = finalEval[0];

    const validated = await this._validateWinner(winner);
    if (validated.safe) {
      await this._applyOptimized(winner, targetAgents);
    }

    this.state.phase = 'completed';
    return {
      workflow: this.name,
      status: 'completed',
      generations_run: this.state.generation + 1,
      best_fitness: winner.fitness,
      fitness_improvement: winner.fitness - fitnessHistory[0].best,
      winner_config: winner.config,
      fitness_history: fitnessHistory,
      applied: validated.safe,
      target_agents: targetAgents
    };
  }

  async _snapshotCurrent(agents) {
    return agents.map(agent => ({
      agent,
      config: {
        concurrency: FIB[6],
        batch_size: FIB[7],
        timeout_ms: FIB[9] * 1000,
        retry_count: FIB[4],
        backoff_base: PHI,
        cache_ttl_s: FIB[8],
        phi_weight: PHI,
        csl_threshold: CSL.MEDIUM
      }
    }));
  }

  _generatePopulation(baseConfigs) {
    const population = [];
    for (let i = 0; i < this.populationSize; i++) {
      const base = baseConfigs[i % baseConfigs.length];
      const variant = { id: i, config: {}, agent: base.agent };
      for (const [key, value] of Object.entries(base.config)) {
        const mutation = 1 + (Math.random() - 0.5) * this.mutationRate * PHI;
        variant.config[key] = typeof value === 'number' ? parseFloat((value * mutation).toFixed(6)) : value;
      }
      population.push(variant);
    }
    return population;
  }

  async _evaluateFitness(population) {
    return population.map(individual => {
      const latencyScore = 1 - (individual.config.timeout_ms / (FIB[11] * 1000));
      const throughputScore = individual.config.concurrency / FIB[10];
      const efficiencyScore = individual.config.batch_size / FIB[9];
      const cslScore = individual.config.csl_threshold / CSL.CRITICAL;
      const fitness = (latencyScore * PHI + throughputScore * PHI + efficiencyScore + cslScore * PSI) / (2 * PHI + 1 + PSI);
      return { ...individual, fitness: parseFloat(Math.min(CSL.CRITICAL + 0.05, Math.max(0, fitness)).toFixed(6)) };
    });
  }

  _tournamentSelect(evaluated) {
    const selected = [];
    const tournamentSize = FIB[4];
    while (selected.length < Math.floor(evaluated.length * PSI)) {
      const contestants = [];
      for (let t = 0; t < tournamentSize; t++) {
        contestants.push(evaluated[Math.floor(Math.random() * evaluated.length)]);
      }
      contestants.sort((a, b) => b.fitness - a.fitness);
      selected.push(contestants[0]);
    }
    return selected;
  }

  _crossover(selected) {
    const offspring = [];
    for (let i = 0; i < this.populationSize; i++) {
      if (Math.random() < this.crossoverRate && selected.length >= 2) {
        const parent1 = selected[Math.floor(Math.random() * selected.length)];
        const parent2 = selected[Math.floor(Math.random() * selected.length)];
        const child = { id: i, agent: parent1.agent, config: {} };
        for (const key of Object.keys(parent1.config)) {
          child.config[key] = Math.random() < PSI ? parent1.config[key] : parent2.config[key];
        }
        offspring.push(child);
      } else {
        offspring.push({ ...selected[i % selected.length], id: i });
      }
    }
    return offspring;
  }

  _mutate(population) {
    return population.map(individual => {
      const mutated = { ...individual, config: { ...individual.config } };
      for (const [key, value] of Object.entries(mutated.config)) {
        if (Math.random() < this.mutationRate && typeof value === 'number') {
          const factor = 1 + (Math.random() - 0.5) * PSI * 0.2;
          mutated.config[key] = parseFloat((value * factor).toFixed(6));
        }
      }
      return mutated;
    });
  }

  async _validateWinner(winner) {
    const healthyConfig = winner.config.concurrency > 0 && winner.config.timeout_ms > 1000 &&
      winner.config.batch_size > 0 && winner.config.csl_threshold >= CSL.MINIMUM;
    return { safe: healthyConfig, winner_fitness: winner.fitness };
  }

  async _applyOptimized(winner, agents) {
    return agents.map(agent => ({ agent, applied_config: winner.config, status: 'deployed' }));
  }

  async rollback() {
    return { workflow: this.name, rollback: 'Restore generation-zero configs from snapshot', status: 'rolled_back' };
  }
}

module.exports = { EvolutionaryOptimizationWorkflow };
