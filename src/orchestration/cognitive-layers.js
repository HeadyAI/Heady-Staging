/**
 * @fileoverview cognitive-layers.js — Heady™ Sovereign Phi-100 7-Animal Cognitive Layer Orchestration
 * @version 3.2.3
 * @description
 *   Implements the 7-Animal Cognitive Layer Orchestration for the Heady™ Sovereign Phi-100
 *   platform. Each cognitive layer is modelled as an animal archetype that embodies a distinct
 *   intelligence mode:
 *
 *   1. ANT      (Swarm Intelligence)   — parallel micro-task decomposition, emergent coordination
 *   2. BEE      (Hive Mind)            — collaborative workflows, resource sharing, hive consensus
 *   3. DOLPHIN  (Social Intelligence)  — multi-agent communication, empathy modelling, group dynamics
 *   4. CROW     (Tool Use)             — external tool orchestration, creative problem solving, cache strategies
 *   5. ELEPHANT (Memory)               — long-term recall, episodic memory, spatial mapping
 *   6. OWL      (Wisdom)               — pattern recognition, strategic planning, nocturnal deep processing
 *   7. OCTOPUS  (Adaptation)           — multi-modal processing, camouflage (context switching), distributed intelligence
 *
 *   Layer activation is governed by CSL (Cosine Similarity Layer) gating at CSL_THRESHOLDS.LOW (≈0.691).
 *   When multiple layers exceed the threshold they are blended using phi-geometric fusion weights.
 *   Resource allocation across all 7 layers uses phiResourceWeights(7) so the highest-priority
 *   layer (OWL) always receives the largest share of system resources.
 *
 *   Priority order (highest → lowest):
 *     OWL > OCTOPUS > ELEPHANT > DOLPHIN > CROW > BEE > ANT
 *
 *   Max concurrency per layer follows the Fibonacci sequence:
 *     OWL=1, OCTOPUS=2, ELEPHANT=3, DOLPHIN=5, CROW=8, BEE=13, ANT=21
 *
 *   Layer health is tracked over a rolling window of fib(8)=21 recent activation outcomes.
 *
 * @module cognitive-layers
 * @author Heady™ Core Engineering
 */

'use strict';

const EventEmitter = require('events');

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 — PHI-MATH IMPORTS
// ─────────────────────────────────────────────────────────────────────────────

let phiMath = null; try { phiMath = require('../../shared/phi-math.js'); } catch(e) { /* graceful */ }

const {
  PHI,
  PSI,
  FIB,
  fib,
  CSL_THRESHOLDS,
  phiFusionWeights,
  phiResourceWeights,
  phiPriorityScore,
  PRESSURE_LEVELS,
  cosineSimilarity,
  cslGate,
} = phiMath;

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 — COGNITIVE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Object} Canonical cognitive architecture configuration. */
const COGNITIVE_CONFIG = (function() { try { return require("../../configs/heady-cognitive-config.json"); } catch { try { return require("../../heady-cognition/config/heady-cognitive-config.json"); } catch { return {}; } } })();

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3 — LAYER CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical priority ordering for the 7 cognitive layers, highest first.
 * OWL leads because strategic wisdom gates all lower cognition; OCTOPUS is
 * second due to its multi-modal adaptive coverage; ANT is last as pure
 * execution-plane parallelism.
 * @constant {string[]}
 */
const LAYER_PRIORITY_ORDER = [
  'OWL',
  'OCTOPUS',
  'ELEPHANT',
  'DOLPHIN',
  'CROW',
  'BEE',
  'ANT',
];

/**
 * Maximum concurrent activations per layer, assigned from the Fibonacci
 * sequence starting at index 1 (fib(1)=1) for the highest-priority layer
 * and increasing as priority decreases.
 *
 * OWL=1, OCTOPUS=2, ELEPHANT=3, DOLPHIN=5, CROW=8, BEE=13, ANT=21
 * @constant {Object.<string, number>}
 */
const LAYER_MAX_CONCURRENCY = {
  OWL:      fib(1),   // 1  — deep wisdom is single-threaded by design
  OCTOPUS:  fib(2),   // 2  — dual-hemisphere adaptation
  ELEPHANT: fib(3),   // 3  — triple-store memory (episodic, semantic, spatial)
  DOLPHIN:  fib(4),   // 5  — social pod dynamics
  CROW:     fib(5),   // 8  — tool cache size aligns with Fibonacci cache rule
  BEE:      fib(6),   // 13 — hive quorum scale
  ANT:      fib(7),   // 21 — swarm micro-parallelism
};

/**
 * Dimensionality of capability embeddings used for CSL scoring.
 * Matches the sentence-transformer default defined in the cognitive config.
 * @constant {number}
 */
const EMBEDDING_DIM = COGNITIVE_CONFIG.phi_constants.vector_dimensions; // 384

/**
 * Rolling window size for layer health tracking.
 * fib(8) = 21 recent activations — aligns with ANT max concurrency for a
 * statistically meaningful health window at every priority level.
 * @constant {number}
 */
const HEALTH_WINDOW_SIZE = fib(8); // 21

/**
 * Layer activation threshold: CSL_THRESHOLDS.LOW ≈ 0.691.
 * A task must achieve at least this cosine similarity against a layer's
 * capability embedding to trigger that layer's activation.
 * @constant {number}
 */
const ACTIVATION_THRESHOLD = CSL_THRESHOLDS.LOW; // ≈ 0.691

/**
 * Phi-power timeouts in milliseconds per BUILD_SPEC rule #4.
 * Each is PHI^n × 1000 rounded to the nearest millisecond.
 * @constant {Object.<string, number>}
 */
const TIMEOUTS = {
  CLASSIFY:   Math.round(PHI  * 1000),  // 1618 ms  — classification pass
  ACTIVATE:   Math.round(PHI * PHI * 1000),  // 2618 ms  — layer activation
  ORCHESTRATE: Math.round(Math.pow(PHI, 3) * 1000), // 4236 ms  — full orchestration
  BLEND:      Math.round(Math.pow(PHI, 4) * 1000),  // 6854 ms  — multi-layer blend
  HEALTH:     Math.round(Math.pow(PHI, 2) * 1000),  // 2618 ms  — health check
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4 — CAPABILITY EMBEDDING SEEDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic 384-dimensional mock capability embedding for a
 * cognitive layer. The seed value is derived from the layer's index in the
 * priority order, producing maximally distinct vectors. Each dimension is
 * computed as sin(seed × φ × d) + cos(seed × d / φ) then normalised so the
 * resulting vector has unit length — identical to how real sentence-transformer
 * embeddings would be normalised before cosine comparison.
 *
 * @param {number} seed - Deterministic seed value unique to each layer.
 * @returns {number[]} Normalised unit-length vector of length EMBEDDING_DIM.
 */
function generateCapabilityEmbedding(seed) {
  const raw = new Array(EMBEDDING_DIM);
  for (let d = 0; d < EMBEDDING_DIM; d++) {
    raw[d] = Math.sin(seed * PHI * (d + 1)) + Math.cos(seed * (d + 1) / PHI);
  }
  // L2-normalise to unit length
  const magnitude = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0));
  return magnitude === 0 ? raw : raw.map(v => v / magnitude);
}

/**
 * Capability embeddings for all 7 cognitive layers.
 * Seeds are spaced by φ to maximise orthogonality between layers.
 * @constant {Object.<string, number[]>}
 */
const LAYER_EMBEDDINGS = {
  OWL:      generateCapabilityEmbedding(1),
  OCTOPUS:  generateCapabilityEmbedding(Math.round(PHI)),
  ELEPHANT: generateCapabilityEmbedding(Math.round(PHI * PHI)),
  DOLPHIN:  generateCapabilityEmbedding(Math.round(Math.pow(PHI, 3))),
  CROW:     generateCapabilityEmbedding(Math.round(Math.pow(PHI, 4))),
  BEE:      generateCapabilityEmbedding(Math.round(Math.pow(PHI, 5))),
  ANT:      generateCapabilityEmbedding(Math.round(Math.pow(PHI, 6))),
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 5 — RESOURCE ALLOCATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Phi-geometric resource weights across the 7 layers, ordered by priority.
 * phiResourceWeights(7) yields descending PSI-geometric shares summing to 1.0.
 * Index 0 → OWL (highest priority, largest share), index 6 → ANT (lowest).
 * @constant {number[]}
 */
const RESOURCE_WEIGHTS = phiResourceWeights(7);

/**
 * Map of layer name → allocated resource weight fraction.
 * @constant {Object.<string, number>}
 */
const LAYER_RESOURCE_ALLOCATION = Object.fromEntries(
  LAYER_PRIORITY_ORDER.map((name, i) => [name, RESOURCE_WEIGHTS[i]])
);

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 6 — LAYER DESCRIPTORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete static descriptor for each cognitive layer, combining the task
 * specification's animal metaphors with the phi-math constants loaded above.
 *
 * @typedef  {Object} LayerDescriptor
 * @property {string}   name              - Canonical layer identifier
 * @property {string}   archetype         - Animal metaphor
 * @property {string}   mode              - Cognitive mode label
 * @property {string}   description       - Human-readable purpose description
 * @property {string[]} capabilities      - Capability tags used for task matching
 * @property {number}   activationWeight  - Baseline activation weight (0–1)
 * @property {number}   maxConcurrency    - Fibonacci-bound concurrency limit
 * @property {number}   resourceWeight    - Phi-allocated resource fraction
 * @property {number[]} embedding         - 384D unit-length capability embedding
 */

/**
 * @constant {Object.<string, LayerDescriptor>}
 */
const LAYER_DESCRIPTORS = {
  ANT: {
    name:             'ANT',
    archetype:        'ANT',
    mode:             'Swarm Intelligence',
    description:      'Parallel micro-task decomposition, emergent coordination, zero-skip batch execution',
    capabilities: [
      'parallel_task_decomposition',
      'micro_task_execution',
      'swarm_coordination',
      'emergent_consensus',
      'batch_processing',
      'queue_discipline',
      'instruction_fidelity',
      'repetition_consistency',
    ],
    activationWeight:  PSI * PSI,                        // ≈ 0.382 — execution plane baseline
    maxConcurrency:    LAYER_MAX_CONCURRENCY.ANT,        // 21
    resourceWeight:    LAYER_RESOURCE_ALLOCATION.ANT,
    embedding:         LAYER_EMBEDDINGS.ANT,
  },

  BEE: {
    name:             'BEE',
    archetype:        'BEE',
    mode:             'Hive Mind',
    description:      'Collaborative workflows, resource sharing, hive consensus, 10 000-bee scale design',
    capabilities: [
      'collaborative_workflow',
      'resource_sharing',
      'hive_consensus',
      'swarm_dispatch',
      'ten_thousand_bee_scale',
      'collective_decision_making',
      'workflow_orchestration',
      'distributed_coordination',
    ],
    activationWeight:  PSI,                              // ≈ 0.618 — natural phi inverse
    maxConcurrency:    LAYER_MAX_CONCURRENCY.BEE,        // 13
    resourceWeight:    LAYER_RESOURCE_ALLOCATION.BEE,
    embedding:         LAYER_EMBEDDINGS.BEE,
  },

  DOLPHIN: {
    name:             'DOLPHIN',
    archetype:        'DOLPHIN',
    mode:             'Social Intelligence',
    description:      'Multi-agent communication, empathy modelling, group dynamics, lateral ideation',
    capabilities: [
      'multi_agent_communication',
      'empathy_modelling',
      'group_dynamics',
      'lateral_ideation',
      'cross_domain_synthesis',
      'analogy_generation',
      'constraint_inversion',
      'novel_recombination',
    ],
    activationWeight:  1.0,                              // CRITICAL layer from config
    maxConcurrency:    LAYER_MAX_CONCURRENCY.DOLPHIN,    // 5
    resourceWeight:    LAYER_RESOURCE_ALLOCATION.DOLPHIN,
    embedding:         LAYER_EMBEDDINGS.DOLPHIN,
  },

  CROW: {
    name:             'CROW',
    archetype:        'CROW',
    mode:             'Tool Use',
    description:      'External tool orchestration, creative problem solving, cache strategies, adaptive retrieval',
    capabilities: [
      'external_tool_orchestration',
      'creative_problem_solving',
      'cache_strategy',
      'adaptive_retrieval',
      'api_integration',
      'resource_discovery',
      'intelligent_caching',
      'tool_selection',
    ],
    activationWeight:  PSI,                              // ≈ 0.618 — pragmatic execution tier
    maxConcurrency:    LAYER_MAX_CONCURRENCY.CROW,       // 8
    resourceWeight:    LAYER_RESOURCE_ALLOCATION.CROW,
    embedding:         LAYER_EMBEDDINGS.CROW,
  },

  ELEPHANT: {
    name:             'ELEPHANT',
    archetype:        'ELEPHANT',
    mode:             'Memory',
    description:      'Long-term recall, episodic memory, spatial mapping, cross-session continuity',
    capabilities: [
      'long_term_recall',
      'episodic_memory_retrieval',
      'spatial_mapping',
      'cross_session_continuity',
      'context_threading',
      'preference_persistence',
      'decision_history_tracking',
      'deep_focus_maintenance',
    ],
    activationWeight:  PSI,                              // ≈ 0.618 — memory tier uses phi inverse
    maxConcurrency:    LAYER_MAX_CONCURRENCY.ELEPHANT,   // 3
    resourceWeight:    LAYER_RESOURCE_ALLOCATION.ELEPHANT,
    embedding:         LAYER_EMBEDDINGS.ELEPHANT,
  },

  OWL: {
    name:             'OWL',
    archetype:        'OWL',
    mode:             'Wisdom',
    description:      'Pattern recognition, strategic planning, nocturnal deep processing, first principles reasoning',
    capabilities: [
      'pattern_recognition',
      'strategic_planning',
      'first_principles_analysis',
      'temporal_pattern_recognition',
      'socratic_decomposition',
      'logical_consistency_checking',
      'assumption_surfacing',
      'wisdom_synthesis',
    ],
    activationWeight:  1.0,                              // CRITICAL layer — highest authority
    maxConcurrency:    LAYER_MAX_CONCURRENCY.OWL,        // 1
    resourceWeight:    LAYER_RESOURCE_ALLOCATION.OWL,
    embedding:         LAYER_EMBEDDINGS.OWL,
  },

  OCTOPUS: {
    name:             'OCTOPUS',
    archetype:        'OCTOPUS',
    mode:             'Adaptation',
    description:      'Multi-modal processing, camouflage (context switching), distributed intelligence across 8 cognitive arms',
    capabilities: [
      'multi_modal_processing',
      'context_switching',
      'distributed_intelligence',
      'adaptive_camouflage',
      'parallel_arm_cognition',
      'environment_sensing',
      'dynamic_reconfiguration',
      'modality_fusion',
    ],
    activationWeight:  1.0,                              // CRITICAL layer — adaptive coverage
    maxConcurrency:    LAYER_MAX_CONCURRENCY.OCTOPUS,    // 2
    resourceWeight:    LAYER_RESOURCE_ALLOCATION.OCTOPUS,
    embedding:         LAYER_EMBEDDINGS.OCTOPUS,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 7 — TASK EMBEDDING HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a lightweight 384D task embedding from a task object's textual
 * features. In production this would call a sentence-transformer model; here
 * we derive a deterministic pseudo-embedding from the task's string content
 * using phi-harmonic hashing so that all math stays inside phi-math.js.
 *
 * The function hashes the task description + type + tags into a float seed,
 * then generates a normalised sinusoidal embedding from that seed. Different
 * tasks will produce different embeddings; semantically similar task text
 * will cluster due to the character-code summation.
 *
 * @param {Object}   task             - Task descriptor.
 * @param {string}   [task.description] - Human-readable task description.
 * @param {string}   [task.type]        - Task type string.
 * @param {string[]} [task.tags]        - Optional semantic tag array.
 * @param {number[]} [task.embedding]   - Pre-computed embedding (pass-through).
 * @returns {number[]} Normalised 384D task embedding.
 */
function deriveTaskEmbedding(task) {
  // If the caller already provided a normalised embedding, use it directly.
  if (Array.isArray(task.embedding) && task.embedding.length === EMBEDDING_DIM) {
    return task.embedding;
  }

  // Build a deterministic character-sum seed from all textual task fields.
  const text = [
    task.description || '',
    task.type        || '',
    ...(task.tags    || []),
  ].join(' ');

  let charSum = 0;
  for (let i = 0; i < text.length; i++) {
    charSum += text.charCodeAt(i) * PHI * (i + 1);
  }
  // Normalise the seed to a stable float in [1, PHI^6] to avoid degenerate cases
  const seed = 1 + (charSum % Math.pow(PHI, 6));

  return generateCapabilityEmbedding(seed);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 8 — CognitiveLayers CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class CognitiveLayers
 * @extends EventEmitter
 * @description
 *   The central orchestrator for the 7-Animal Cognitive Layer system. Manages
 *   layer state, health tracking, CSL-based task classification, multi-layer
 *   blending, and phi-weighted resource allocation.
 *
 *   Events emitted:
 *   - `layerActivated`    {layerName, task, score, timestamp}
 *   - `layerDeactivated`  {layerName, taskId, outcome, timestamp}
 *   - `taskClassified`    {task, matches, scores, timestamp}
 *   - `blendCompleted`    {layers, blendedResult, weights, timestamp}
 */
class CognitiveLayers extends EventEmitter {

  /**
   * @constructor
   * @param {Object} [config={}] - Optional runtime configuration overrides.
   * @param {number} [config.activationThreshold] - CSL threshold override (default: CSL_THRESHOLDS.LOW).
   * @param {boolean} [config.arenaMode]           - Enable Arena Mode critique rounds (default: true).
   * @param {Object} [config.resourceOverrides]    - Per-layer resource weight overrides.
   */
  constructor(config = {}) {
    super();

    /**
     * Runtime configuration merged with defaults from the cognitive config.
     * @type {Object}
     */
    this._config = Object.assign(
      {},
      COGNITIVE_CONFIG.fusion_engine,
      { activationThreshold: ACTIVATION_THRESHOLD },
      config
    );

    /**
     * Activation threshold — CSL_THRESHOLDS.LOW unless overridden.
     * @type {number}
     */
    this._activationThreshold = this._config.activationThreshold;

    /**
     * Per-layer runtime state map.
     * @type {Map.<string, LayerState>}
     */
    this._layers = new Map();

    /**
     * Global orchestration call counter, used for audit correlation.
     * @type {number}
     */
    this._orchestrationCount = 0;

    // Initialise all 7 layers from descriptors
    this._initLayers();
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PRIVATE: _initLayers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Initialise runtime state for all 7 cognitive layers.
   * Called once during construction; idempotent if called again.
   *
   * Each layer state tracks:
   * - descriptor         Static descriptor (name, capabilities, embedding, …)
   * - isActive           Whether the layer is currently processing
   * - activeCount        Number of in-flight activations
   * - healthWindow       Rolling array of fib(8)=21 recent activation booleans
   * - totalActivations   Lifetime activation count
   * - totalSuccesses     Lifetime successful activation count
   * - lastActivatedAt    Timestamp of most recent activation
   * - lastDeactivatedAt  Timestamp of most recent deactivation
   * - priorityIndex      Position in LAYER_PRIORITY_ORDER (0 = highest)
   *
   * @private
   */
  _initLayers() {
    LAYER_PRIORITY_ORDER.forEach((name, priorityIndex) => {
      this._layers.set(name, {
        descriptor:        LAYER_DESCRIPTORS[name],
        isActive:          false,
        activeCount:       0,
        healthWindow:      [],      // boolean[] — true = success, false = failure
        totalActivations:  0,
        totalSuccesses:    0,
        lastActivatedAt:   null,
        lastDeactivatedAt: null,
        priorityIndex,
      });
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: classifyTask
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Determine which cognitive layer(s) should handle a given task by computing
   * the cosine similarity between the task's derived embedding and each layer's
   * 384D capability embedding, then applying the CSL gate at ACTIVATION_THRESHOLD.
   *
   * Returns layers sorted by descending CSL score so that the highest-match
   * layer appears first. Layers below ACTIVATION_THRESHOLD are excluded.
   *
   * Emits `taskClassified` event with full scoring detail.
   *
   * @param {Object}   task               - Task to classify.
   * @param {string}   [task.description] - Task description text.
   * @param {string}   [task.type]        - Task type tag.
   * @param {string[]} [task.tags]        - Semantic tags.
   * @param {number[]} [task.embedding]   - Pre-computed 384D embedding (optional).
   * @returns {Array.<{layerName: string, score: number, gatedScore: number}>}
   *   Sorted match array; empty if no layer clears the threshold.
   */
  classifyTask(task) {
    const taskEmbedding = deriveTaskEmbedding(task);
    const matches       = [];

    for (const [name, state] of this._layers) {
      const rawScore   = cosineSimilarity(taskEmbedding, state.descriptor.embedding);
      const gatedScore = cslGate(
        rawScore,
        rawScore,
        this._activationThreshold,
        PSI * PSI  // temperature = ≈0.382 — sharp gate for clean classification
      );

      if (rawScore >= this._activationThreshold) {
        matches.push({
          layerName:   name,
          score:       rawScore,
          gatedScore,
          priorityIdx: state.priorityIndex,
        });
      }
    }

    // Sort by descending raw score; break ties by priority index (lower = higher priority)
    matches.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      return Math.abs(scoreDiff) > PSI * PSI * PSI  // > ~0.236 is a meaningful difference
        ? scoreDiff
        : a.priorityIdx - b.priorityIdx;
    });

    this.emit('taskClassified', {
      task,
      matches,
      scores:    Object.fromEntries(matches.map(m => [m.layerName, m.score])),
      timestamp: Date.now(),
    });

    return matches;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: activateLayer
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Activate a specific cognitive layer for task processing. Enforces the
   * max concurrency limit for the layer and tracks activation state.
   *
   * Returns a result envelope with the layer's synthetic processing output,
   * a confidence score (CSL-gated), and metadata. On success the layer's
   * health window is updated. Deactivation is recorded automatically.
   *
   * Emits `layerActivated` at the start and `layerDeactivated` on completion.
   *
   * @param {string} layerName - Canonical layer name (e.g. 'OWL').
   * @param {Object} task      - Task descriptor to process.
   * @returns {{
   *   layerName: string,
   *   success:   boolean,
   *   output:    Object,
   *   score:     number,
   *   duration:  number,
   *   timestamp: number,
   * }} Activation result envelope.
   * @throws {Error} If layerName is not a recognised cognitive layer.
   */
  activateLayer(layerName, task) {
    const state = this._layers.get(layerName);
    if (!state) {
      throw new Error(`CognitiveLayers.activateLayer: unknown layer "${layerName}"`);
    }

    const descriptor = state.descriptor;

    // Enforce Fibonacci max-concurrency limit
    if (state.activeCount >= descriptor.maxConcurrency) {
      return {
        layerName,
        success:   false,
        output:    null,
        score:     0,
        duration:  0,
        timestamp: Date.now(),
        reason:    `Layer ${layerName} at max concurrency (${descriptor.maxConcurrency})`,
      };
    }

    const startMs = Date.now();

    // Update activation state
    state.activeCount      += 1;
    state.isActive          = true;
    state.totalActivations += 1;
    state.lastActivatedAt   = startMs;

    this.emit('layerActivated', {
      layerName,
      task,
      score:     descriptor.activationWeight,
      timestamp: startMs,
    });

    // Compute CSL score for this specific task→layer pairing
    const taskEmbedding = deriveTaskEmbedding(task);
    const rawCslScore   = cosineSimilarity(taskEmbedding, descriptor.embedding);
    const gatedScore    = cslGate(
      rawCslScore,
      rawCslScore,
      this._activationThreshold,
      PSI * PSI
    );

    // Build synthetic layer output — in production this would delegate to the
    // layer's actual processing pipeline; here we produce a structured envelope.
    const output = this._buildLayerOutput(layerName, task, gatedScore);

    const success  = gatedScore >= this._activationThreshold * PSI; // ≥ LOW × PSI ≈ 0.427
    const duration = Date.now() - startMs;

    // Update health window (rolling HEALTH_WINDOW_SIZE entries)
    state.healthWindow.push(success);
    if (state.healthWindow.length > HEALTH_WINDOW_SIZE) {
      state.healthWindow.shift();
    }
    if (success) state.totalSuccesses += 1;

    // Deactivation bookkeeping
    state.activeCount       = Math.max(0, state.activeCount - 1);
    state.isActive          = state.activeCount > 0;
    state.lastDeactivatedAt = Date.now();

    this.emit('layerDeactivated', {
      layerName,
      taskId:    task.id || task.description || 'unknown',
      outcome:   success ? 'SUCCESS' : 'BELOW_THRESHOLD',
      timestamp: state.lastDeactivatedAt,
    });

    return {
      layerName,
      success,
      output,
      score:     gatedScore,
      duration,
      timestamp: startMs,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PRIVATE: _buildLayerOutput
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Construct the structured output envelope that a cognitive layer returns
   * when processing a task. Each animal archetype has a distinct output shape
   * that reflects its cognitive mode.
   *
   * @param {string} layerName  - Canonical layer name.
   * @param {Object} task       - Task being processed.
   * @param {number} cslScore   - Gated CSL score for this activation.
   * @returns {Object} Layer-specific output envelope.
   * @private
   */
  _buildLayerOutput(layerName, task, cslScore) {
    const descriptor  = LAYER_DESCRIPTORS[layerName];
    const resourceFrac = descriptor.resourceWeight;
    const base = {
      layer:       layerName,
      mode:        descriptor.mode,
      cslScore,
      resourceFrac,
      taskId:      task.id || null,
      processedAt: Date.now(),
    };

    switch (layerName) {
      case 'ANT':
        return Object.assign(base, {
          strategy:       'PARALLEL_MICRO_DECOMPOSITION',
          microTasks:     this._decomposeIntoMicroTasks(task),
          batchSize:      fib(5),                        // 5 — minimum viable Fibonacci batch
          concurrencySlots: LAYER_MAX_CONCURRENCY.ANT,   // 21
          emergenceScore: cslScore * PSI,               // dampened by PSI for emergence uncertainty
        });

      case 'BEE':
        return Object.assign(base, {
          strategy:          'HIVE_CONSENSUS',
          hiveSize:          fib(6),                     // 13 — hive quorum count
          quorumThreshold:   CSL_THRESHOLDS.MEDIUM,      // ≈ 0.764 — consensus requires medium confidence
          resourcePools:     phiResourceWeights(fib(4)), // 5-way phi resource split
          collaborationScore: cslScore * descriptor.activationWeight,
        });

      case 'DOLPHIN':
        return Object.assign(base, {
          strategy:        'SOCIAL_INTELLIGENCE',
          agentCount:      LAYER_MAX_CONCURRENCY.DOLPHIN,  // 5 — dolphin pod
          empathyScore:    cslScore * PHI * PSI,           // PHI × PSI = 1 (golden ratio identity)
          groupDynamics:   'DISTRIBUTED_CONSENSUS',
          communicationBandwidth: phiPriorityScore(cslScore, PSI, PSI * PSI),
        });

      case 'CROW':
        return Object.assign(base, {
          strategy:     'TOOL_ORCHESTRATION',
          cacheSize:    fib(5),                           // 8 — Fibonacci cache rule
          toolSlots:    LAYER_MAX_CONCURRENCY.CROW,       // 8
          creativityIndex: cslScore * PHI,               // amplified by PHI for creative boost
          cacheStrategy:   'PHI_LRU',                    // phi-weighted least-recently-used
        });

      case 'ELEPHANT':
        return Object.assign(base, {
          strategy:       'EPISODIC_RECALL',
          memoryDepth:    fib(9),                        // 34 — deep memory horizon
          recallScore:    cslScore,
          spatialDims:    COGNITIVE_CONFIG.phi_constants.projection_dimensions, // 3
          evictionPolicy: COGNITIVE_CONFIG.cognitive_layers.elephant_memory
            ? COGNITIVE_CONFIG.cognitive_layers.elephant_memory.eviction_weights
            : { importance: 0.486, recency: 0.300, relevance: 0.214 },
          continuityScore: cslScore * PSI,
        });

      case 'OWL':
        return Object.assign(base, {
          strategy:         'DEEP_WISDOM',
          patternDepth:     fib(7),                      // 13 — pattern recognition horizon
          strategicScore:   cslScore * descriptor.activationWeight,
          firstPrinciples:  true,
          nocturnalMode:    new Date().getHours() >= 20 || new Date().getHours() < 6,
          wisdomThreshold:  CSL_THRESHOLDS.HIGH,         // ≈ 0.809 — OWL demands high coherence
        });

      case 'OCTOPUS':
        return Object.assign(base, {
          strategy:         'MULTI_MODAL_ADAPTATION',
          cognitiveArms:    fib(5),                      // 8 — octopus has 8 arms / cognitive channels
          modalitiesActive: Math.min(fib(5), Math.ceil(cslScore * fib(5))),
          camouflageDepth:  cslScore * PHI,             // context-switching depth
          adaptationScore:  cslScore * descriptor.activationWeight,
          distributedIQ:    phiPriorityScore(cslScore, cslScore * PSI, cslScore * PSI * PSI),
        });

      default:
        return base;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PRIVATE: _decomposeIntoMicroTasks
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Decompose a task into a Fibonacci-sized array of micro-task descriptors
   * for ANT layer parallel execution. The number of micro-tasks is bounded
   * by the ANT max concurrency (fib(7) = 21) and scales with task complexity.
   *
   * @param {Object} task - Task to decompose.
   * @returns {Object[]} Array of micro-task descriptor objects.
   * @private
   */
  _decomposeIntoMicroTasks(task) {
    const complexity  = task.complexity || PSI;   // default to PSI for unknown complexity
    const rawCount    = Math.ceil(complexity * LAYER_MAX_CONCURRENCY.ANT);
    // Snap to nearest Fibonacci number ≤ ANT max concurrency (21)
    const fibCounts   = FIB.filter(f => f <= LAYER_MAX_CONCURRENCY.ANT);
    const microCount  = fibCounts.reduce((prev, curr) =>
      Math.abs(curr - rawCount) < Math.abs(prev - rawCount) ? curr : prev
    );

    return Array.from({ length: microCount }, (_, i) => ({
      microId:    `${task.id || 'task'}_micro_${i + 1}`,
      slot:       i,
      weight:     phiFusionWeights(microCount)[i],
      priority:   Math.pow(PSI, i),                // phi-decay priority per slot
    }));
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: orchestrate
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Run a task through the appropriate cognitive layers in priority order.
   * Classification determines which layers to activate; if multiple layers
   * clear the ACTIVATION_THRESHOLD their outputs are blended via
   * phiFusionWeights. If no layer clears the threshold the task is escalated
   * to OWL (the highest-priority layer) as the last-resort handler.
   *
   * @param {Object} task - Task to orchestrate through the cognitive system.
   * @returns {{
   *   taskId:          string|null,
   *   activatedLayers: string[],
   *   blended:         boolean,
   *   result:          Object,
   *   orchestrationId: number,
   *   duration:        number,
   *   timestamp:       number,
   * }} Orchestration result with full provenance.
   */
  orchestrate(task) {
    const startMs          = Date.now();
    this._orchestrationCount += 1;
    const orchestrationId  = this._orchestrationCount;

    // Step 1 — Classify the task to find matching layers
    const matches = this.classifyTask(task);

    let activatedLayers;
    let result;
    let blended = false;

    if (matches.length === 0) {
      // No layer cleared the threshold — escalate to OWL as sovereign fallback
      activatedLayers = ['OWL'];
      const owlResult = this.activateLayer('OWL', task);
      result = owlResult.output;
    } else if (matches.length === 1) {
      // Single layer match — activate directly
      activatedLayers = [matches[0].layerName];
      const singleResult = this.activateLayer(matches[0].layerName, task);
      result = singleResult.output;
    } else {
      // Multiple layers match — activate all in priority order then blend
      activatedLayers = matches.map(m => m.layerName);

      // Sort matches by LAYER_PRIORITY_ORDER to ensure phi-weight assignment
      // follows the canonical priority sequence
      const sortedMatches = matches.slice().sort(
        (a, b) => a.priorityIdx - b.priorityIdx
      );

      const layerResults = sortedMatches.map(m =>
        this.activateLayer(m.layerName, task)
      );

      result  = this.blendLayers(layerResults, task);
      blended = true;
    }

    return {
      taskId:          task.id || null,
      activatedLayers,
      blended,
      result,
      orchestrationId,
      duration:        Date.now() - startMs,
      timestamp:       startMs,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: blendLayers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Combine outputs from multiple activated layers using phi-geometric fusion
   * weights. The highest-scoring (first in array) layer receives the largest
   * weight (PSI^0) and each subsequent layer is discounted by PSI.
   *
   * The blended result preserves the union of all layer fields, with numeric
   * values weighted by their respective fusion weight. Non-numeric fields from
   * the highest-weight layer take precedence.
   *
   * Emits `blendCompleted` event with full provenance.
   *
   * @param {Array.<{layerName: string, success: boolean, output: Object, score: number}>}
   *   layerResults - Array of activation result envelopes (ordered by priority).
   * @param {Object} task - Original task (used for event payload).
   * @returns {Object} Blended cognitive output envelope.
   */
  blendLayers(layerResults, task) {
    const n       = layerResults.length;
    const weights = phiFusionWeights(n);

    // Base envelope from highest-weight layer
    const primary  = layerResults[0].output || {};
    const blended  = Object.assign({}, primary, {
      _blend:        true,
      _blendedFrom:  layerResults.map(r => r.layerName),
      _blendWeights: weights,
      _blendN:       n,
    });

    // Accumulate numeric fields weighted by fusion weights
    for (let i = 1; i < n; i++) {
      const w      = weights[i];
      const output = layerResults[i].output || {};
      for (const key of Object.keys(output)) {
        if (typeof output[key] === 'number' && typeof blended[key] === 'number') {
          // Weighted blend: primary already has weights[0] baked in implicitly;
          // we add secondary contributions proportionally.
          blended[key] = blended[key] * weights[0] + output[key] * w;
        }
      }
    }

    // Overall blended CSL score is the phi-weighted average of individual scores
    blended.cslScore = layerResults.reduce((acc, r, i) => acc + (r.score || 0) * weights[i], 0);

    this.emit('blendCompleted', {
      layers:        layerResults.map(r => r.layerName),
      blendedResult: blended,
      weights,
      timestamp:     Date.now(),
    });

    return blended;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: getLayerHealth
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Compute the health score for a named cognitive layer based on the rolling
   * window of fib(8)=21 recent activation outcomes.
   *
   * Health = successCount / windowSize, normalised to [0, 1].
   * Layers with no activation history return PSI (≈0.618) — the phi-neutral
   * baseline — rather than 0 or 1, reflecting genuine uncertainty.
   *
   * @param {string} layerName - Canonical layer name.
   * @returns {{
   *   layerName:        string,
   *   health:           number,
   *   windowSize:       number,
   *   successCount:     number,
   *   totalActivations: number,
   *   lifetimeSuccess:  number,
   *   isActive:         boolean,
   *   activeCount:      number,
   * }} Health status object.
   * @throws {Error} If layerName is not recognised.
   */
  getLayerHealth(layerName) {
    const state = this._layers.get(layerName);
    if (!state) {
      throw new Error(`CognitiveLayers.getLayerHealth: unknown layer "${layerName}"`);
    }

    const window       = state.healthWindow;
    const windowSize   = window.length;
    const successCount = window.filter(Boolean).length;

    // Phi-neutral baseline when no history exists
    const health = windowSize === 0
      ? PSI
      : successCount / windowSize;

    const lifetimeSuccess = state.totalActivations === 0
      ? PSI
      : state.totalSuccesses / state.totalActivations;

    return {
      layerName,
      health,
      windowSize,
      successCount,
      totalActivations: state.totalActivations,
      lifetimeSuccess,
      isActive:         state.isActive,
      activeCount:      state.activeCount,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: getSystemCognition
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Return aggregate cognitive state across all 7 layers, including overall
   * system health, pressure level, resource utilisation, and per-layer summary.
   *
   * System health is the phi-weighted average of individual layer health scores,
   * where weights follow phiResourceWeights(7) (highest-priority OWL carries
   * the largest influence).
   *
   * @returns {{
   *   systemHealth:      number,
   *   pressureLevel:     string,
   *   activeLayerCount:  number,
   *   totalActivations:  number,
   *   resourceUtilisation: number,
   *   layers:            Object.<string, Object>,
   *   orchestrationCount: number,
   *   timestamp:         number,
   * }} Aggregate system cognition state.
   */
  getSystemCognition() {
    const layerHealthReports = {};
    let weightedHealthSum    = 0;
    let totalActivations     = 0;
    let totalActiveCount     = 0;
    let totalConcurrencyMax  = 0;

    LAYER_PRIORITY_ORDER.forEach((name, i) => {
      const report = this.getLayerHealth(name);
      layerHealthReports[name] = report;

      weightedHealthSum  += report.health * RESOURCE_WEIGHTS[i];
      totalActivations   += report.totalActivations;
      totalActiveCount   += report.activeCount;
      totalConcurrencyMax += LAYER_MAX_CONCURRENCY[name];
    });

    const systemHealth       = weightedHealthSum; // weights already sum to 1.0
    const resourceUtilisation = totalConcurrencyMax > 0
      ? totalActiveCount / totalConcurrencyMax
      : 0;

    // Map utilisation to PRESSURE_LEVELS
    let pressureLevel = 'NOMINAL';
    if (resourceUtilisation >= PRESSURE_LEVELS.CRITICAL[0]) {
      pressureLevel = 'CRITICAL';
    } else if (resourceUtilisation >= PRESSURE_LEVELS.HIGH[0]) {
      pressureLevel = 'HIGH';
    } else if (resourceUtilisation >= PRESSURE_LEVELS.ELEVATED[0]) {
      pressureLevel = 'ELEVATED';
    }

    return {
      systemHealth,
      pressureLevel,
      activeLayerCount:    this.getActiveCount(),
      totalActivations,
      resourceUtilisation,
      layers:              layerHealthReports,
      orchestrationCount:  this._orchestrationCount,
      timestamp:           Date.now(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: getActiveCount
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Return the number of cognitive layers that currently have at least one
   * in-flight activation (activeCount > 0).
   *
   * @returns {number} Count of currently active layers (0–7).
   */
  getActiveCount() {
    let count = 0;
    for (const [, state] of this._layers) {
      if (state.isActive) count += 1;
    }
    return count;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: getLayerDescriptor
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Retrieve the static descriptor for a named layer.
   *
   * @param {string} layerName - Canonical layer name.
   * @returns {LayerDescriptor} Static layer descriptor.
   * @throws {Error} If layerName is not recognised.
   */
  getLayerDescriptor(layerName) {
    const state = this._layers.get(layerName);
    if (!state) {
      throw new Error(`CognitiveLayers.getLayerDescriptor: unknown layer "${layerName}"`);
    }
    return state.descriptor;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: resetLayerHealth
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Clear the health window for a named layer, resetting it to the phi-neutral
   * baseline. Useful after a major system event (e.g. deployment, config reload)
   * that invalidates historical health signals.
   *
   * @param {string} layerName - Canonical layer name, or '*' to reset all layers.
   * @returns {void}
   */
  resetLayerHealth(layerName) {
    if (layerName === '*') {
      for (const [, state] of this._layers) {
        state.healthWindow = [];
      }
      return;
    }
    const state = this._layers.get(layerName);
    if (!state) {
      throw new Error(`CognitiveLayers.resetLayerHealth: unknown layer "${layerName}"`);
    }
    state.healthWindow = [];
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: getPriorityOrder
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Return the canonical priority order of the 7 cognitive layers as a
   * read-only array (highest priority first).
   *
   * @returns {string[]} Copy of LAYER_PRIORITY_ORDER.
   */
  getPriorityOrder() {
    return LAYER_PRIORITY_ORDER.slice();
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC: getResourceAllocation
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Return the phi-geometric resource allocation map for all 7 layers.
   *
   * @returns {Object.<string, number>} Per-layer resource weight fractions (sum = 1.0).
   */
  getResourceAllocation() {
    return Object.assign({}, LAYER_RESOURCE_ALLOCATION);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 9 — FACTORY HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Factory function: construct and return a new CognitiveLayers instance
 * pre-configured from the canonical heady-cognitive-config.json.
 *
 * @param {Object} [overrides={}] - Optional constructor overrides.
 * @returns {CognitiveLayers} Fully initialised cognitive layer orchestrator.
 * @example
 * const { createCognitiveLayers } = (function() { try { return require('./cognitive-layers'); } catch(e) { return {}; } })();
 * const layers = createCognitiveLayers();
 * const result = layers.orchestrate({ description: 'Analyse system logs', type: 'analysis' });
 */
function createCognitiveLayers(overrides = {}) {
  return new CognitiveLayers(overrides);
}

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Primary class
  CognitiveLayers,

  // Factory
  createCognitiveLayers,

  // Static constants (exposed for testing and external introspection)
  LAYER_PRIORITY_ORDER,
  LAYER_MAX_CONCURRENCY,
  LAYER_DESCRIPTORS,
  LAYER_RESOURCE_ALLOCATION,
  LAYER_EMBEDDINGS,
  ACTIVATION_THRESHOLD,
  HEALTH_WINDOW_SIZE,
  TIMEOUTS,
  EMBEDDING_DIM,

  // Re-export phi-math primitives used by this module
  phiMath,
};
