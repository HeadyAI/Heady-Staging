---
name: heady-swarm-evolution
description: >
  Heady Swarm Evolution — genetic algorithm optimization engine for evolving agent configurations,
  prompt strategies, routing tables, and system parameters across generations. Uses φ-scaled
  mutation rates, Fibonacci-sized populations, CSL fitness scoring via cosine coherence, tournament
  selection with ELO-weighted brackets, and crossover operators that blend 384D embedding
  representations. Agents compete, breed, and evolve toward optimal configurations without manual
  tuning. Use when optimizing agent prompts, routing strategies, pipeline configurations, model
  selection heuristics, or any system parameter that benefits from evolutionary search. Keywords:
  genetic algorithm, evolution, mutation, crossover, fitness, population, generation, optimization,
  agent evolution, prompt evolution, parameter tuning, tournament selection, swarm optimization.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Swarm Evolution

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Optimizing agent prompt strategies through competitive evolution
- Tuning routing tables, model selection weights, or pipeline configs
- Running evolutionary search over system parameters instead of manual grid search
- Evolving HeadyBee worker templates for specialized tasks
- Auto-discovering optimal CSL gate thresholds for new services
- Breeding superior agent configurations from high-performing ancestors

## Architecture

```
Initial Population (Fibonacci-sized: 21 or 34 individuals)
  │
  ▼
Fitness Evaluation
  ├─→ Task Performance (accuracy, speed, coherence)
  ├─→ CSL Coherence Score (cosine similarity to goal embedding)
  └─→ Resource Efficiency (tokens consumed, latency)
      │
      ▼
Tournament Selection (φ-bracket: top 61.8% advance)
      │
      ▼
Genetic Operators
  ├─→ Crossover (embedding-space blending, φ-weighted)
  ├─→ Mutation (φ-scaled perturbation: PHI^(-generation) amplitude)
  └─→ Elitism (preserve top FIB[4]=3 unchanged)
      │
      ▼
New Generation → Repeat until convergence or max generations (FIB[8]=21)
      │
      ▼
Champion Extraction → Deploy best individual to production
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Evolution Constants
const POPULATION_SIZES = { small: FIB[8], medium: FIB[9], large: FIB[10] }; // 21, 34, 55
const MAX_GENERATIONS = FIB[8];                // 21 generations max
const ELITE_COUNT = FIB[4];                    // 3 elites preserved unchanged
const TOURNAMENT_SIZE = FIB[5];                // 5 individuals per tournament
const SELECTION_PRESSURE = PSI;                // 0.618 — top 61.8% survive
const MUTATION_BASE_RATE = PSI * PSI;          // 0.382 — initial mutation rate
const MUTATION_DECAY = PSI;                    // Rate decays by 0.618 per generation
const CROSSOVER_BLEND = [PSI, 1 - PSI];       // 0.618/0.382 parent weighting
const CONVERGENCE_THRESHOLD = 0.972;           // CSL DEDUP — population too similar
const MIN_DIVERSITY = 0.691;                   // CSL LOW — force mutation if below
const FITNESS_WEIGHTS = {
  performance: PHI,      // 1.618 — primary objective
  coherence: 1.0,        // 1.000 — semantic alignment
  efficiency: PSI,       // 0.618 — resource usage
};
```

## Instructions

### 1. Genome Representation

Each individual is a genome encoded as a 384D embedding plus parameter vector:

```javascript
class Genome {
  constructor(config) {
    this.id = generateId();
    this.embedding = config.embedding || randomEmbedding(384);
    this.parameters = config.parameters || {};
    this.generation = config.generation || 0;
    this.parents = config.parents || [];
    this.fitness = null;
    this.lineage = [];
  }

  static fromPromptStrategy(strategy, embeddingProvider) {
    // Encode a prompt strategy as a genome
    const embedding = await embeddingProvider.embed(
      JSON.stringify(strategy), { dimensions: 384 }
    );
    return new Genome({ embedding, parameters: strategy });
  }

  static fromRoutingConfig(config, embeddingProvider) {
    const embedding = await embeddingProvider.embed(
      JSON.stringify(config), { dimensions: 384 }
    );
    return new Genome({ embedding, parameters: config });
  }
}
```

### 2. Fitness Evaluation

Score each genome against real tasks:

```javascript
class FitnessEvaluator {
  async evaluate(genome, testSuite) {
    const results = await Promise.all(
      testSuite.map(test => this.runTest(genome, test))
    );

    const performance = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const coherence = results.reduce((sum, r) => sum + r.coherenceScore, 0) / results.length;
    const efficiency = results.reduce((sum, r) => sum + r.efficiency, 0) / results.length;

    // φ-weighted composite fitness
    const totalWeight = FITNESS_WEIGHTS.performance + FITNESS_WEIGHTS.coherence + FITNESS_WEIGHTS.efficiency;
    const fitness = (
      performance * FITNESS_WEIGHTS.performance +
      coherence * FITNESS_WEIGHTS.coherence +
      efficiency * FITNESS_WEIGHTS.efficiency
    ) / totalWeight;

    genome.fitness = fitness;
    return { genome, fitness, breakdown: { performance, coherence, efficiency } };
  }
}
```

### 3. Tournament Selection

Select parents via φ-bracket tournaments:

```javascript
function tournamentSelect(population, tournamentSize = TOURNAMENT_SIZE) {
  const selected = [];
  const targetSize = Math.floor(population.length * SELECTION_PRESSURE);

  while (selected.length < targetSize) {
    // Random tournament bracket
    const bracket = [];
    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      bracket.push(population[idx]);
    }
    // Winner is highest fitness
    bracket.sort((a, b) => b.fitness - a.fitness);
    selected.push(bracket[0]);
  }

  return selected;
}
```

### 4. Genetic Operators

#### Crossover (Embedding-Space Blending)

```javascript
function crossover(parentA, parentB) {
  const childEmbedding = new Float32Array(384);
  const [wA, wB] = CROSSOVER_BLEND; // [0.618, 0.382]

  for (let d = 0; d < 384; d++) {
    childEmbedding[d] = parentA.embedding[d] * wA + parentB.embedding[d] * wB;
  }

  // Normalize
  const magnitude = Math.sqrt(childEmbedding.reduce((sum, v) => sum + v * v, 0));
  for (let d = 0; d < 384; d++) childEmbedding[d] /= magnitude;

  // Blend parameters
  const childParams = blendParameters(parentA.parameters, parentB.parameters, wA);

  return new Genome({
    embedding: childEmbedding,
    parameters: childParams,
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    parents: [parentA.id, parentB.id],
  });
}
```

#### Mutation (φ-Scaled Perturbation)

```javascript
function mutate(genome, generation) {
  const rate = MUTATION_BASE_RATE * Math.pow(MUTATION_DECAY, generation);
  const amplitude = PSI / Math.pow(PHI, generation); // Shrinks over time

  const mutated = new Float32Array(genome.embedding);
  for (let d = 0; d < 384; d++) {
    if (Math.random() < rate) {
      mutated[d] += (Math.random() - 0.5) * 2 * amplitude;
    }
  }

  // Normalize
  const magnitude = Math.sqrt(mutated.reduce((sum, v) => sum + v * v, 0));
  for (let d = 0; d < 384; d++) mutated[d] /= magnitude;

  // Mutate parameters
  const mutatedParams = mutateParameters(genome.parameters, rate, amplitude);

  return new Genome({
    embedding: mutated,
    parameters: mutatedParams,
    generation: genome.generation + 1,
    parents: [genome.id],
  });
}
```

### 5. Diversity Monitoring

Prevent premature convergence:

```javascript
function measureDiversity(population) {
  let totalDist = 0;
  let pairs = 0;
  for (let i = 0; i < population.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + FIB[5], population.length); j++) {
      totalDist += 1 - cosineSimilarity(population[i].embedding, population[j].embedding);
      pairs++;
    }
  }
  return pairs > 0 ? totalDist / pairs : 0;
}

function checkConvergence(population) {
  const diversity = measureDiversity(population);
  if (diversity < (1 - CONVERGENCE_THRESHOLD)) return { converged: true, diversity };
  if (diversity < (1 - MIN_DIVERSITY)) return { converged: false, diversity, action: 'inject-diversity' };
  return { converged: false, diversity, action: 'continue' };
}
```

### 6. Evolution Loop

```javascript
class SwarmEvolution {
  async evolve(initialPopulation, testSuite, options = {}) {
    const popSize = options.populationSize || POPULATION_SIZES.medium;
    let population = initialPopulation.slice(0, popSize);
    const history = [];

    for (let gen = 0; gen < MAX_GENERATIONS; gen++) {
      // Evaluate fitness
      await Promise.all(population.map(g => this.evaluator.evaluate(g, testSuite)));

      // Sort by fitness
      population.sort((a, b) => b.fitness - a.fitness);

      // Record generation stats
      history.push({
        generation: gen,
        bestFitness: population[0].fitness,
        avgFitness: population.reduce((s, g) => s + g.fitness, 0) / population.length,
        diversity: measureDiversity(population),
      });

      // Check convergence
      const conv = checkConvergence(population);
      if (conv.converged) break;

      // Elitism — preserve top performers
      const nextGen = population.slice(0, ELITE_COUNT);

      // Selection
      const parents = tournamentSelect(population);

      // Breed next generation
      while (nextGen.length < popSize) {
        const pA = parents[Math.floor(Math.random() * parents.length)];
        const pB = parents[Math.floor(Math.random() * parents.length)];
        let child = crossover(pA, pB);
        child = mutate(child, gen);
        nextGen.push(child);
      }

      // Diversity injection if needed
      if (conv.action === 'inject-diversity') {
        const injectCount = FIB[4]; // Inject 3 random individuals
        for (let i = 0; i < injectCount; i++) {
          nextGen[nextGen.length - 1 - i] = new Genome({ generation: gen + 1 });
        }
      }

      population = nextGen;
    }

    return {
      champion: population[0],
      topPerformers: population.slice(0, FIB[5]),
      history,
      generations: history.length,
    };
  }
}
```

## Integration Points

| Heady Component | Evolution Target | Population Size |
|---|---|---|
| HeadyConductor | Routing table weights | FIB[9] = 34 |
| BattleArena | Prompt strategies | FIB[8] = 21 |
| Gateway | Provider selection heuristics | FIB[8] = 21 |
| HeadyBee Factory | Worker template configs | FIB[9] = 34 |
| CSL Engine | Gate threshold optimization | FIB[10] = 55 |
| LLM Router | Model-task affinity matrix | FIB[9] = 34 |

## API

```javascript
const { SwarmEvolution } = require('@heady/swarm-evolution');

const evolution = new SwarmEvolution({ evaluator, embeddingProvider });

const result = await evolution.evolve(initialPopulation, testSuite, {
  populationSize: FIB[9],
  maxGenerations: FIB[8],
});

// result: { champion, topPerformers, history, generations }
evolution.health();
await evolution.shutdown();
```

## Health Endpoint

```json
{
  "status": "healthy",
  "coherenceScore": 0.891,
  "activeEvolutions": 2,
  "completedEvolutions": 13,
  "bestChampionFitness": 0.934,
  "averageGenerationsToConverge": 8,
  "totalGenomesEvaluated": 714,
  "version": "1.0.0"
}
```
