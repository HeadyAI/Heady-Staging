// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/hc_vector_router.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * VectorRouter — Semantic Vector Space Task Router
 *
 * Replaces arbitrary priority enums with trigram-based cosine similarity
 * routing. Every task description is embedded into 128-dimensional vector
 * space and matched to the most capable agent via semantic similarity.
 *
 * Architecture:
 *   - Trigram hash embedding (128-dim, L2-normalized) — same algo as hc_latent_space
 *   - Cosine similarity scoring for agent matching
 *   - CSL_GATES thresholds: include (0.382), boost (0.618), inject (0.718)
 *   - PHI-decay weighted multi-route for load balancing [1.0, 0.618, 0.382]
 *   - LRU vector cache (FIB[9]=55 entries) to avoid recomputation
 *   - Pre-seeded with all 10 Heady system agents
 *
 * Usage:
 *   const { route, routeBatch, routeWeighted } = require('./hc_vector_router');
 *   const match = route('deploy to render and run health checks');
 *   // → { agent: 'deployer', score: 0.72, confidence: 'inject', alternatives: [...] }
 *
 *   const grouped = await routeBatch([{ id: 't1', description: 'build npm' }, ...]);
 *   // → { builder: [tasks...], deployer: [tasks...] }
 */

// ─── Dependencies (with graceful fallbacks) ───────────────────────
let PHI, PSI, FIB, CSL_GATES;
try {
  ({ PHI, PSI, FIB, CSL_GATES } = require('../packages/phi-math'));
} catch (e) {
  PHI = 1.618033988749895;
  PSI = 0.618033988749895;
  FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
  CSL_GATES = { include: 0.382, boost: 0.618, inject: 0.718 };
}

let logger;
try {
  const { createLogger } = require('../packages/structured-logger');
  logger = createLogger('vector-router', 'routing');
} catch (e) {
  logger = { info: () => {}, warn: console.warn, error: console.error, debug: () => {} };
}

let latent;
try {
  latent = require('./hc_latent_space');
} catch (e) {
  latent = { record: () => {}, search: () => ({ results: [] }) };
}

// ─── Constants (all derived from phi-math, no magic numbers) ─────
const VECTOR_DIMS = 128;                     // embedding dimensions
const CACHE_MAX_SIZE = FIB[9];               // 55 — LRU cache capacity
const PHI_WEIGHT_DECAY = [1.0, PSI, PSI * PSI]; // [1.0, 0.618, 0.382]
const DEFAULT_TOP_K = FIB[2];               // 3 alternatives

// ═══════════════════════════════════════════════════════════════════
// Trigram Text Embedding
// ═══════════════════════════════════════════════════════════════════

/**
 * Convert text to a normalized 128-dim trigram vector.
 * Identical algorithm to hc_latent_space.js for cross-module consistency.
 * @param {string} text
 * @returns {Float32Array}
 */
function embed(text) {
  const vec = new Float32Array(VECTOR_DIMS);
  const normalized = String(text).toLowerCase().replace(/[^a-z0-9 ]/g, '');

  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.substring(i, i + 3);
    let hash = 0;
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) - hash) + trigram.charCodeAt(j);
      hash = hash & hash;
    }
    vec[Math.abs(hash) % VECTOR_DIMS] += 1;
  }

  // L2 normalize to unit vector
  let norm = 0;
  for (let i = 0; i < VECTOR_DIMS; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < VECTOR_DIMS; i++) vec[i] /= norm;

  return vec;
}

// ═══════════════════════════════════════════════════════════════════
// Cosine Similarity
// ═══════════════════════════════════════════════════════════════════

/**
 * Cosine similarity between two L2-normalized vectors.
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {number} 0.0 – 1.0
 */
function similarity(a, b) {
  let dot = 0;
  for (let i = 0; i < VECTOR_DIMS; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

/**
 * Rank candidate agents by similarity to a query vector.
 * @param {Float32Array} queryVec
 * @param {Array<{name, vector}>} candidates
 * @returns {Array<{name, score}>} sorted descending
 */
function rankAgainst(queryVec, candidates) {
  return candidates
    .map(c => ({ name: c.name, score: similarity(queryVec, c.vector) }))
    .sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════════
// LRU Vector Cache
// ═══════════════════════════════════════════════════════════════════

const _cache = new Map(); // text_hash → Float32Array

function textHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h) + text.charCodeAt(i);
    h = h & h;
  }
  return h.toString(36);
}

function getCached(text) {
  const key = textHash(text);
  if (_cache.has(key)) {
    // Move to end (most-recently-used)
    const val = _cache.get(key);
    _cache.delete(key);
    _cache.set(key, val);
    return val;
  }
  return null;
}

function setCached(text, vector) {
  const key = textHash(text);
  if (_cache.size >= CACHE_MAX_SIZE) {
    // Evict least-recently-used (first entry)
    _cache.delete(_cache.keys().next().value);
  }
  _cache.set(key, vector);
}

function getOrEmbed(text) {
  const cached = getCached(text);
  if (cached) return cached;
  const vec = embed(text);
  setCached(text, vec);
  return vec;
}

// ═══════════════════════════════════════════════════════════════════
// VectorRouter Class
// ═══════════════════════════════════════════════════════════════════

class VectorRouter {
  constructor() {
    this._agents = new Map(); // name → { name, capabilities[], vector, registeredAt }
    this._stats = {
      totalRouted: 0,
      highConfidence: 0,
      belowThreshold: 0,
      cacheHits: 0,
      errors: 0,
    };
  }

  /**
   * Register an agent with its capability strings.
   * Capabilities are joined and embedded to create the agent's semantic signature.
   * @param {string} name - Agent name
   * @param {string[]} capabilities - Descriptive capability strings
   */
  register(name, capabilities) {
    if (!name || !Array.isArray(capabilities) || capabilities.length === 0) {
      throw new Error('Agent requires name and non-empty capabilities array');
    }
    const capText = capabilities.join(' ');
    const vector = embed(capText);
    this._agents.set(name, { name, capabilities, vector, registeredAt: Date.now() });
    logger.debug('Agent registered', { agent: name, capCount: capabilities.length });
  }

  /**
   * Deregister an agent.
   * @param {string} name
   */
  deregister(name) {
    this._agents.delete(name);
    logger.info('Agent deregistered', { agent: name });
  }

  /**
   * Route a single task to the best matching agent.
   * @param {string} taskDescription
   * @returns {{ agent: string|null, score: number, confidence: string, alternatives: [] }}
   */
  route(taskDescription) {
    if (!taskDescription) {
      return { agent: null, score: 0, confidence: 'invalid', alternatives: [] };
    }

    const cachedVec = getCached(taskDescription);
    if (cachedVec) this._stats.cacheHits++;
    const queryVec = cachedVec || embed(taskDescription);
    if (!cachedVec) setCached(taskDescription, queryVec);

    const candidates = Array.from(this._agents.values());
    if (candidates.length === 0) {
      return { agent: null, score: 0, confidence: 'no_agents', alternatives: [] };
    }

    const ranked = rankAgainst(queryVec, candidates);
    const best = ranked[0];
    const alternatives = ranked.slice(1, DEFAULT_TOP_K + 1);

    this._stats.totalRouted++;

    let confidence;
    if (best.score < CSL_GATES.include) {
      confidence = 'below_threshold';
      this._stats.belowThreshold++;
      logger.warn('Route below threshold', { task: taskDescription.slice(0, 60), score: best.score });
      latent.record('ai', `Vector route below threshold: "${taskDescription.slice(0, 60)}"`, { score: best.score, agent: null });
      return { agent: null, score: best.score, confidence, alternatives };
    } else if (best.score >= CSL_GATES.inject) {
      confidence = 'inject';
      this._stats.highConfidence++;
    } else if (best.score >= CSL_GATES.boost) {
      confidence = 'boost';
      this._stats.highConfidence++;
    } else {
      confidence = 'include';
    }

    logger.debug('Route decision', { agent: best.name, score: best.score, confidence });
    latent.record('ai', `Vector route: "${taskDescription.slice(0, 60)}" → ${best.name}`, {
      agent: best.name, score: best.score, confidence,
    });

    return { agent: best.name, score: best.score, confidence, alternatives };
  }

  /**
   * Route multiple tasks concurrently. Returns tasks grouped by destination agent.
   * @param {Array<{id, description, ...}>} tasks
   * @returns {Promise<{[agentName]: Array}>}
   */
  async routeBatch(tasks) {
    if (!Array.isArray(tasks)) throw new Error('routeBatch requires an array of tasks');

    const routeResults = await Promise.all(
      tasks.map(async task => {
        try {
          const result = this.route(task.description || task.name || String(task.id));
          return { task, ...result };
        } catch (e) {
          this._stats.errors++;
          logger.error('Batch route error', { taskId: task.id, error: e.message });
          return { task, agent: null, score: 0, confidence: 'error' };
        }
      })
    );

    // Group by agent (null tasks go to 'unrouted')
    const grouped = {};
    for (const r of routeResults) {
      const key = r.agent || 'unrouted';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r.task);
    }

    logger.info('Batch route complete', {
      total: tasks.length,
      agents: Object.keys(grouped).filter(k => k !== 'unrouted').length,
      unrouted: (grouped.unrouted || []).length,
    });

    return grouped;
  }

  /**
   * Return top-N agents with PHI-decay weights for load balancing.
   * Weights: [1.0, 0.618, 0.382] for positions [0, 1, 2].
   * @param {string} taskDescription
   * @param {number} count - Number of candidates (default: 3)
   * @returns {Array<{agent, score, weight}>}
   */
  routeWeighted(taskDescription, count = DEFAULT_TOP_K) {
    const queryVec = getOrEmbed(taskDescription);
    const candidates = Array.from(this._agents.values());
    const ranked = rankAgainst(queryVec, candidates).slice(0, count);

    return ranked.map((r, i) => ({
      agent: r.name,
      score: r.score,
      weight: PHI_WEIGHT_DECAY[i] !== undefined ? PHI_WEIGHT_DECAY[i] : Math.pow(PSI, i + 1),
    }));
  }

  /**
   * Return registered agent stats.
   */
  listAgents() {
    return Array.from(this._agents.values()).map(a => ({
      name: a.name,
      capabilities: a.capabilities,
      registeredAt: new Date(a.registeredAt).toISOString(),
    }));
  }

  /**
   * Cache and routing statistics.
   */
  getStats() {
    const hitRate = this._stats.totalRouted > 0
      ? Math.round((this._stats.cacheHits / this._stats.totalRouted) * 100)
      : 0;
    return {
      ...this._stats,
      cacheSize: _cache.size,
      cacheMaxSize: CACHE_MAX_SIZE,
      cacheHitRatePct: hitRate,
      registeredAgents: this._agents.size,
      phi: PHI,
      cslGates: CSL_GATES,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Pre-Seeded Heady Agent Registry
// ═══════════════════════════════════════════════════════════════════

const HEADY_AGENTS = [
  {
    name: 'builder',
    capabilities: ['build npm compile webpack deploy package install dependencies node javascript typescript'],
  },
  {
    name: 'deployer',
    capabilities: ['deploy render cloud infrastructure docker kubernetes release publish push rollout'],
  },
  {
    name: 'auditor',
    capabilities: ['audit security scan lint eslint vulnerability compliance check review code quality'],
  },
  {
    name: 'researcher',
    capabilities: ['research search news trends analysis concepts knowledge discover learn explore'],
  },
  {
    name: 'observer',
    capabilities: ['health monitor ping status uptime metrics alert observe watch probe availability latency'],
  },
  {
    name: 'claude-code',
    capabilities: ['code analysis documentation architecture review refactor planning governance alignment task'],
  },
  {
    name: 'colab-primary',
    capabilities: ['embedding vector semantic similarity search index encode representation dense retrieval'],
  },
  {
    name: 'colab-secondary',
    capabilities: ['inference prediction model gpu compute generation output completion reasoning'],
  },
  {
    name: 'colab-tertiary',
    capabilities: ['training optimization fine-tune learning pattern update weights gradient epoch'],
  },
  {
    name: 'colab-learning',
    capabilities: ['autonomous learning trial error socratic risk analysis qa quality assurance self-improvement'],
  },
];

// ═══════════════════════════════════════════════════════════════════
// Singleton Instance (pre-seeded)
// ═══════════════════════════════════════════════════════════════════

const router = new VectorRouter();

for (const agent of HEADY_AGENTS) {
  router.register(agent.name, agent.capabilities);
}

logger.info('VectorRouter initialized', {
  agents: HEADY_AGENTS.length,
  cacheCapacity: CACHE_MAX_SIZE,
  phi: PHI,
  cslGates: CSL_GATES,
});

// ═══════════════════════════════════════════════════════════════════
// Convenience Exports
// ═══════════════════════════════════════════════════════════════════

/**
 * Route a single task description to the best agent.
 * @param {string} taskDescription
 */
function route(taskDescription) {
  return router.route(taskDescription);
}

/**
 * Route multiple tasks concurrently, grouped by agent.
 * @param {Array<{id, description}>} tasks
 */
function routeBatch(tasks) {
  return router.routeBatch(tasks);
}

/**
 * Get top-N weighted agent candidates for a task.
 * @param {string} taskDescription
 * @param {number} count
 */
function routeWeighted(taskDescription, count) {
  return router.routeWeighted(taskDescription, count);
}

module.exports = {
  VectorRouter,       // class — for custom instances
  router,             // singleton pre-seeded with all 10 Heady agents
  route,              // convenience: router.route(desc)
  routeBatch,         // convenience: router.routeBatch(tasks)
  routeWeighted,      // convenience: router.routeWeighted(desc, n)
  embed,              // raw embedding function
  similarity,         // raw cosine similarity
  HEADY_AGENTS,       // agent definitions (for reference/inspection)
  CSL_GATES,          // routing thresholds
  PHI,                // golden ratio constant
};
