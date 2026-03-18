'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-genome';
const PORT = 3424;
const POP_SIZE = FIB[8]; // 21 individuals per generation
const TOURNEY = FIB[5]; // 5 tournament size

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta }) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) { this.name = name; this.state = 'CLOSED'; this.failures = 0; this.threshold = opts.threshold || FIB[8]; this.resetTimeout = opts.resetTimeout || FIB[10] * 1000; this.lastFailure = 0; }
  async execute(fn) {
    if (this.state === 'OPEN') { const elapsed = Date.now() - this.lastFailure; if (elapsed < this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]))) throw new Error(`Circuit ${this.name} OPEN`); this.state = 'HALF_OPEN'; }
    try { const r = await fn(); this.failures = 0; this.state = 'CLOSED'; return r; } catch (e) { this.failures++; this.lastFailure = Date.now(); if (this.failures >= this.threshold) this.state = 'OPEN'; throw e; }
  }
}

const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) { log('info', `${signal} received, graceful shutdown`); while (shutdownHandlers.length) await shutdownHandlers.pop()(); process.exit(0); }
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

class BaseHeadyBee {
  constructor(name) { this.name = name; this.startedAt = Date.now(); this.status = 'idle'; }
  async spawn() { this.status = 'spawned'; log('info', `${this.name} spawned`); }
  async execute() { this.status = 'executing'; }
  async report() { this.status = 'reporting'; }
  async retire() { this.status = 'retired'; log('info', `${this.name} retired`); }
}

/** Default fitness: phi-weighted mean of gene values normalized to [0,1]. */
function defaultFitness(genome) {
  let ws = 0, wt = 0;
  for (let i = 0; i < genome.length; i++) { const w = Math.pow(PSI, i); ws += genome[i] * w; wt += w; }
  return parseFloat((ws / wt).toFixed(6));
}

/**
 * GenomeBee — Genetic algorithm optimization for agent configs, prompt strategies,
 * and routing tables. Uses phi-scaled mutation rates that decay over generations,
 * tournament selection (size 5), and single-point crossover at phi-ratio position.
 * @class GenomeBee
 * @extends BaseHeadyBee
 */
class GenomeBee extends BaseHeadyBee {
  constructor() { super('GenomeBee'); this.populations = new Map(); }

  /** Create population of FIB[8] (21) random individuals. */
  createPopulation(name, genomeSize, fitnessFunction = 'default') {
    if (this.populations.has(name)) return this._summary(this.populations.get(name));
    const individuals = [];
    for (let i = 0; i < POP_SIZE; i++) { const g = []; for (let j = 0; j < genomeSize; j++) g.push(Math.random()); individuals.push({ id: crypto.randomUUID(), genome: g, fitness: null }); }
    const pop = { name, genomeSize, fitnessFunction, individuals, generation: 0, bestFitness: null, bestGenome: null, history: [], createdAt: Date.now() };
    this._evaluateAll(pop);
    this.populations.set(name, pop);
    log('info', `Population created: ${name}`, { genomeSize, size: POP_SIZE });
    return this._summary(pop);
  }

  _evaluateAll(pop) {
    const fn = pop.fitnessFunction === 'coherence' ? (g) => parseFloat(Math.min(defaultFitness(g) * PHI, CSL.CRITICAL).toFixed(6)) : defaultFitness;
    for (const ind of pop.individuals) ind.fitness = fn(ind.genome);
    pop.individuals.sort((a, b) => b.fitness - a.fitness);
    pop.bestFitness = pop.individuals[0].fitness;
    pop.bestGenome = [...pop.individuals[0].genome];
  }

  /** Tournament selection: pick TOURNEY (5) random, return fittest. */
  _select(individuals) {
    const c = [];
    for (let i = 0; i < TOURNEY; i++) c.push(individuals[Math.floor(Math.random() * individuals.length)]);
    c.sort((a, b) => b.fitness - a.fitness);
    return c[0];
  }

  /** Single-point crossover at phi-ratio position (index = length * PSI). */
  _crossover(p1, p2) { const cp = Math.floor(p1.length * PSI); return p1.map((g, i) => i < cp ? g : p2[i]); }

  /** Mutate with phi-scaled rate: rate = PSI / generation, magnitude = value * (random - PSI) * PSI. */
  _mutate(genome, gen) {
    const rate = gen > 0 ? PSI / gen : PSI;
    return genome.map(g => Math.random() < rate ? parseFloat(Math.max(0, Math.min(1, g + g * (Math.random() - PSI) * PSI)).toFixed(6)) : g);
  }

  /**
   * Evolve population for N generations. Elitism preserves best individual.
   * @param {string} name - Population name.
   * @param {number} generations - Number of generations to run.
   * @returns {Object} Best genome and fitness after evolution.
   */
  async evolve(name, generations = 1) {
    const pop = this.populations.get(name);
    if (!pop) throw new Error(`Population ${name} not found`);
    for (let g = 0; g < generations; g++) {
      pop.generation++;
      const next = [{ id: crypto.randomUUID(), genome: [...pop.individuals[0].genome], fitness: null }];
      while (next.length < POP_SIZE) {
        const p1 = this._select(pop.individuals), p2 = this._select(pop.individuals);
        next.push({ id: crypto.randomUUID(), genome: this._mutate(this._crossover(p1.genome, p2.genome), pop.generation), fitness: null });
      }
      pop.individuals = next;
      this._evaluateAll(pop);
      const stats = this._genStats(pop);
      pop.history.push(stats);
    }
    log('info', `Evolved ${name} for ${generations} gens`, { total: pop.generation, best: pop.bestFitness });
    return { name, generation: pop.generation, bestGenome: pop.bestGenome, bestFitness: pop.bestFitness };
  }

  /** Calculate diversity as average pairwise Euclidean distance (sampled). */
  _diversity(inds) {
    let total = 0, pairs = 0;
    const n = Math.min(inds.length, FIB[6]); // sample 8
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let d = 0; for (let k = 0; k < inds[i].genome.length; k++) d += Math.pow(inds[i].genome[k] - inds[j].genome[k], 2); total += Math.sqrt(d); pairs++; }
    return pairs > 0 ? total / pairs : 0;
  }

  _genStats(pop) {
    const f = pop.individuals.map(i => i.fitness).sort((a, b) => a - b);
    return { generation: pop.generation, bestFitness: f[f.length - 1], worstFitness: f[0], avgFitness: parseFloat((f.reduce((a, b) => a + b, 0) / f.length).toFixed(6)), diversity: parseFloat(this._diversity(pop.individuals).toFixed(6)) };
  }

  getBest(name) { const p = this.populations.get(name); if (!p) throw new Error(`Population ${name} not found`); return { name, generation: p.generation, bestGenome: p.bestGenome, bestFitness: p.bestFitness }; }

  getStats(name) { const p = this.populations.get(name); if (!p) throw new Error(`Population ${name} not found`); return { name, ...this._genStats(p), populationSize: POP_SIZE, genomeSize: p.genomeSize, historyLength: p.history.length }; }

  _summary(p) { return { name: p.name, genomeSize: p.genomeSize, generation: p.generation, populationSize: POP_SIZE, bestFitness: p.bestFitness, createdAt: p.createdAt }; }
  async execute() { await super.execute(); log('info', 'GenomeBee executing'); }
  async report() { await super.report(); const r = []; for (const p of this.populations.values()) r.push(this._summary(p)); return r; }
  async retire() { await super.retire(); }
}

const app = express();
app.use(express.json());
const bee = new GenomeBee();
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

/** @route GET /health — Service health check with coherence. */
app.get('/health', (_req, res) => {
  const uptime = (Date.now() - bee.startedAt) / 1000;
  res.json({ status: 'ok', service: SERVICE_NAME, uptime, coherence: parseFloat(Math.min(CSL.HIGH, CSL.MEDIUM + (uptime / (uptime + FIB[10])) * (CSL.HIGH - CSL.MEDIUM)).toFixed(6)), timestamp: new Date().toISOString() });
});

/** @route POST /population — Create a new population. */
app.post('/population', (req, res) => { if (!req.body.name || !req.body.genomeSize) return res.status(400).json({ error: 'name and genomeSize required' }); res.status(201).json(bee.createPopulation(req.body.name, req.body.genomeSize, req.body.fitnessFunction)); });

/** @route POST /population/:name/evolve — Run N generations. */
app.post('/population/:name/evolve', async (req, res) => { try { res.json(await bee.evolve(req.params.name, req.body.generations || 1)); } catch (e) { res.status(404).json({ error: e.message }); } });

/** @route GET /population/:name/best — Current best genome and fitness. */
app.get('/population/:name/best', (req, res) => { try { res.json(bee.getBest(req.params.name)); } catch (e) { res.status(404).json({ error: e.message }); } });

/** @route GET /population/:name/stats — Generation count, fitness, diversity. */
app.get('/population/:name/stats', (req, res) => { try { res.json(bee.getStats(req.params.name)); } catch (e) { res.status(404).json({ error: e.message }); } });

bee.spawn().then(() => { bee.execute(); const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening on port ${PORT}`)); onShutdown(() => new Promise(r => server.close(r))); onShutdown(() => bee.retire()); });

module.exports = { GenomeBee, CircuitBreaker, app };
