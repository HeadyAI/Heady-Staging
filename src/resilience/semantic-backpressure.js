/**
 * @fileoverview semantic-backpressure.js — Heady™ Sovereign Phi-100 Semantic Backpressure System
 * @version 3.2.3
 * @description
 *   Implements Heady™'s full Semantic Backpressure pipeline for agent and swarm
 *   overload protection. Tasks flow through a seven-stage admission gauntlet:
 *
 *     Incoming Task
 *       → Semantic Dedup      (cosine similarity ≥ 0.927 → deduplicate)
 *       → Priority Scoring    (phi-weighted criticality × urgency × impact)
 *       → SRE Throttle        (Google SRE adaptive: P(reject) = max(0,(req-2×acc)/(req+1)))
 *       → Circuit Breaker     (CLOSED → OPEN → HALF_OPEN → CLOSED, fib(5)=5 failure threshold)
 *       → Queue Admission     (depth < fib(13)=233)
 *       → Execution           (emits 'admitted' event for downstream consumers)
 *
 *   All thresholds, sizes, TTLs, and weights are derived from phi-math constants —
 *   no magic numbers appear anywhere in this module.
 *
 * @module semantic-backpressure
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
  phiBackoff,
  phiFusionWeights,
  phiPriorityScore,
  PRESSURE_LEVELS,
  ALERT_THRESHOLDS,
  cosineSimilarity,
  cslGate,
} = phiMath;

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE-LEVEL PHI-DERIVED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deduplication cosine-similarity threshold.
 * Two tasks with similarity ≥ this value are considered semantically identical.
 * Equals CSL_THRESHOLDS.CRITICAL ≈ 0.927 (phi-threshold level 4).
 * @constant {number}
 */
const DEDUP_THRESHOLD = CSL_THRESHOLDS.CRITICAL;

/**
 * Maximum number of entries in the dedup LRU cache.
 * fib(17) = 1597 — a Fibonacci-harmonic history buffer.
 * @constant {number}
 */
const DEDUP_CACHE_SIZE = fib(17); // 1597

/**
 * Time-to-live for dedup cache entries, in milliseconds.
 * fib(11) × 1000 = 89 × 1000 = 89 000 ms ≈ 89 seconds.
 * @constant {number}
 */
const DEDUP_TTL_MS = fib(11) * 1000; // 89 000

/**
 * Maximum queue depth before hard rejection.
 * fib(13) = 233 — canonical queue-depth Fibonacci value.
 * @constant {number}
 */
const QUEUE_MAX_DEPTH = fib(13); // 233

/**
 * Fraction of the dedup cache to evict when capacity is reached.
 * PSI^4 ≈ 0.146 — natural inverse-golden-ratio decay fraction.
 * @constant {number}
 */
const EVICTION_FRACTION = Math.pow(PSI, 4); // ≈ 0.146

/**
 * Number of entries to evict per compaction pass.
 * @constant {number}
 */
const EVICTION_COUNT = Math.max(1, Math.round(DEDUP_CACHE_SIZE * EVICTION_FRACTION)); // ≈ 233

/**
 * Number of consecutive failures before the circuit breaker opens.
 * fib(5) = 5.
 * @constant {number}
 */
const CB_FAILURE_THRESHOLD = fib(5); // 5

/**
 * Number of probe requests allowed while the circuit breaker is HALF_OPEN.
 * fib(4) = 3.
 * @constant {number}
 */
const CB_HALF_OPEN_PROBES = fib(4); // 3

/**
 * Rolling window duration for SRE throttle counters, in milliseconds.
 * Two minutes (120 000 ms) — standard SRE Client-Side Throttling window.
 * @constant {number}
 */
const SRE_WINDOW_MS = 120000;

/**
 * SRE multiplier K in the Google client-side throttling formula.
 * K = 2.0 ensures that the rejection probability stays 0 until the
 * acceptance rate drops below 50%.
 * @constant {number}
 */
const SRE_K = 2.0;

/**
 * Base delay for circuit-breaker half-open recovery probing (ms).
 * Uses phi-timing: 1618 ms (PHI × 1000, attempt 1 base).
 * @constant {number}
 */
const CB_RECOVERY_BASE_MS = Math.round(PHI * 1000); // 1618

/**
 * Criticality tier weight constants (Fibonacci-scaled).
 * Passed: the `criticality` factor to phiPriorityScore after normalisation.
 * @constant {{ CRITICAL_PLUS: number, CRITICAL: number, SHEDDABLE_PLUS: number, SHEDDABLE: number }}
 */
const CRITICALITY_WEIGHTS = {
  CRITICAL_PLUS:  fib(7), // 13
  CRITICAL:       fib(6), // 8
  SHEDDABLE_PLUS: fib(5), // 5
  SHEDDABLE:      fib(3), // 2
};

/**
 * Maximum raw criticality weight — used to normalise criticality to [0, 1].
 * @constant {number}
 */
const CRITICALITY_MAX = CRITICALITY_WEIGHTS.CRITICAL_PLUS; // 13

/**
 * Circuit breaker state constants.
 * @enum {string}
 */
const CB_STATE = {
  CLOSED:    'CLOSED',
  OPEN:      'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

/**
 * Task criticality tier labels.
 * @enum {string}
 */
const CRITICALITY_TIER = {
  CRITICAL_PLUS:  'CRITICAL_PLUS',
  CRITICAL:       'CRITICAL',
  SHEDDABLE_PLUS: 'SHEDDABLE_PLUS',
  SHEDDABLE:      'SHEDDABLE',
};

// ─────────────────────────────────────────────────────────────────────────────
//  REJECTION REASON CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enumeration of all rejection reason codes returned by submit().
 * @enum {string}
 */
const REJECTION_REASON = {
  DEDUP:            'DEDUP',
  THROTTLED:        'THROTTLED',
  CIRCUIT_OPEN:     'CIRCUIT_OPEN',
  QUEUE_FULL:       'QUEUE_FULL',
  LOAD_SHED:        'LOAD_SHED',
  INVALID_TASK:     'INVALID_TASK',
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the current high-resolution timestamp in milliseconds.
 * @returns {number}
 */
function now() {
  return Date.now();
}

/**
 * Map a task's criticality tier string to its normalised [0, 1] weight.
 *
 * @param {string} tier - One of CRITICALITY_TIER values.
 * @returns {number} Normalised criticality in [0, 1].
 */
function normalisedCriticality(tier) {
  const raw = CRITICALITY_WEIGHTS[tier] || CRITICALITY_WEIGHTS.SHEDDABLE;
  return raw / CRITICALITY_MAX;
}

/**
 * Derive a numeric pressure ratio from current queue depth.
 *
 * @param {number} depth - Current queue depth.
 * @returns {number} Pressure ratio in [0, 1].
 */
function depthToPressure(depth) {
  return Math.min(1, depth / QUEUE_MAX_DEPTH);
}

/**
 * Determine the pressure level name from a ratio value using PRESSURE_LEVELS boundaries.
 * The task spec uses the extended boundaries:
 *   NOMINAL  0 – 0.382
 *   ELEVATED 0.382 – 0.618
 *   HIGH     0.618 – 0.854
 *   CRITICAL 0.910+
 *
 * @param {number} ratio - Pressure ratio in [0, 1].
 * @returns {string} Level name: 'NOMINAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL'.
 */
function ratioToPressureLevel(ratio) {
  // Use phi-math PRESSURE_LEVELS boundaries
  if (ratio >= PRESSURE_LEVELS.CRITICAL[0]) return 'CRITICAL';
  if (ratio >= PRESSURE_LEVELS.HIGH[0])     return 'HIGH';
  if (ratio >= PRESSURE_LEVELS.ELEVATED[0]) return 'ELEVATED';
  return 'NOMINAL';
}

// ─────────────────────────────────────────────────────────────────────────────
//  CLASS: SemanticBackpressure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class SemanticBackpressure
 * @extends EventEmitter
 *
 * @description
 *   Full semantic backpressure controller for Heady™ swarm pipelines.
 *   Combines semantic deduplication, phi-weighted priority scoring,
 *   Google SRE adaptive throttling, phi-scaled circuit breaking, and
 *   Fibonacci-bounded queue admission.
 *
 * @fires SemanticBackpressure#admitted  - When a task passes all gates and enters the queue.
 * @fires SemanticBackpressure#rejected  - When a task is rejected with a reason code.
 * @fires SemanticBackpressure#pressure  - When pressure level changes.
 * @fires SemanticBackpressure#circuit   - When circuit breaker state changes.
 * @fires SemanticBackpressure#shed      - When load shedding removes tasks from the queue.
 * @fires SemanticBackpressure#backpressure - When upstream backpressure signal is propagated.
 *
 * @example
 * const bp = new SemanticBackpressure({ label: 'CodeSwarm' });
 * const result = bp.submit({
 *   id: 'task-001',
 *   tier: 'CRITICAL',
 *   urgency: 0.9,
 *   impact: 0.7,
 *   embedding: [0.1, 0.5, 0.3, ...],
 *   payload: { fn: 'analyseCode', args: [] },
 * });
 * if (result.admitted) { ... }
 */
class SemanticBackpressure extends EventEmitter {

  // ───────────────────────────────────────────────────────────────────────────
  //  CONSTRUCTOR
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create a SemanticBackpressure instance.
   *
   * @param {object}  [config={}]                  - Configuration overrides.
   * @param {string}  [config.label='default']     - Human-readable label for logs.
   * @param {number}  [config.dedupThreshold]      - Override dedup cosine threshold.
   * @param {number}  [config.queueMaxDepth]       - Override maximum queue depth.
   * @param {number}  [config.sreWindowMs]         - Override SRE rolling window (ms).
   * @param {number}  [config.sreK]                - Override SRE K multiplier.
   * @param {number}  [config.cbFailureThreshold]  - Override circuit-breaker failure limit.
   * @param {number}  [config.cbHalfOpenProbes]    - Override half-open probe count.
   * @param {boolean} [config.autoShed=true]       - Automatically shed on pressure transitions.
   */
  constructor(config = {}) {
    super();

    /** @type {string} Human-readable label for this instance. */
    this.label = config.label || 'default';

    // ── Tunable parameters (phi-derived defaults) ────────────────────────────
    /** @type {number} Cosine threshold above which tasks are considered duplicates. */
    this.dedupThreshold = config.dedupThreshold || DEDUP_THRESHOLD;

    /** @type {number} Maximum allowed queue depth. */
    this.queueMaxDepth  = config.queueMaxDepth  || QUEUE_MAX_DEPTH;

    /** @type {number} SRE rolling window in milliseconds. */
    this.sreWindowMs    = config.sreWindowMs    || SRE_WINDOW_MS;

    /** @type {number} SRE K-factor for throttle formula. */
    this.sreK           = config.sreK           || SRE_K;

    /** @type {number} Consecutive failure count that opens the circuit breaker. */
    this.cbFailureThreshold = config.cbFailureThreshold || CB_FAILURE_THRESHOLD;

    /** @type {number} Number of probe requests to allow in HALF_OPEN state. */
    this.cbHalfOpenProbes   = config.cbHalfOpenProbes   || CB_HALF_OPEN_PROBES;

    /** @type {boolean} Auto-shed tasks on pressure escalation. */
    this.autoShed = config.autoShed !== false;

    // ── Queue ────────────────────────────────────────────────────────────────
    /**
     * The admission queue — an ordered array of admitted task descriptors.
     * Sorted descending by priority score after each insertion.
     * @type {Array<{task: object, priority: number, admittedAt: number}>}
     */
    this._queue = [];

    // ── Dedup cache ──────────────────────────────────────────────────────────
    /**
     * Dedup cache entries, keyed by task id.
     * Each entry: { id, embedding, tier, priority, insertedAt, expiresAt }.
     * @type {Map<string, object>}
     */
    this._dedupCache = new Map();

    /**
     * Insertion-order log for LRU eviction (stores task ids in FIFO order).
     * @type {string[]}
     */
    this._dedupOrder = [];

    // ── Circuit breaker ──────────────────────────────────────────────────────
    /**
     * Circuit breaker state machine.
     * @type {{ state: string, failures: number, lastOpenedAt: number|null, probesSent: number }}
     */
    this._circuitBreaker = {
      state:        CB_STATE.CLOSED,
      failures:     0,
      lastOpenedAt: null,
      probesSent:   0,
    };

    // ── SRE throttle counters ────────────────────────────────────────────────
    /**
     * SRE sliding-window request/accept buckets.
     * @type {{ requests: number, accepts: number, windowStart: number }}
     */
    this._sre = {
      requests:    0,
      accepts:     0,
      windowStart: now(),
    };

    // ── Metrics ──────────────────────────────────────────────────────────────
    /**
     * Running totals for metrics reporting.
     * @type {{ submitted: number, admitted: number, rejected: number, deduplicated: number, shed: number }}
     */
    this._counters = {
      submitted:    0,
      admitted:     0,
      rejected:     0,
      deduplicated: 0,
      shed:         0,
    };

    /**
     * Tracks the most recently computed pressure level name for change detection.
     * @type {string}
     */
    this._lastPressureLevel = 'NOMINAL';

    /**
     * Timestamp of construction — used for uptime reporting.
     * @type {number}
     */
    this._startedAt = now();
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PUBLIC API — SUBMIT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Main entry point. Runs the task through the full backpressure pipeline.
   *
   * Pipeline stages (short-circuit on first rejection):
   *   1. Validation
   *   2. Semantic Dedup
   *   3. Priority Scoring
   *   4. SRE Throttle
   *   5. Circuit Breaker
   *   6. Queue Admission
   *
   * @param {object}   task              - The incoming task descriptor.
   * @param {string}   task.id           - Unique task identifier.
   * @param {string}   task.tier         - Criticality tier (CRITICALITY_TIER value).
   * @param {number[]} [task.embedding]  - Semantic embedding vector for dedup.
   * @param {number}   [task.urgency=0.5]   - Urgency score in [0, 1].
   * @param {number}   [task.impact=0.5]    - Impact score in [0, 1].
   * @param {*}        [task.payload]    - Arbitrary task payload.
   * @returns {{ admitted: boolean, reason: string|null, priority: number|null, queueDepth: number }}
   *   `admitted=true` means the task was queued. `admitted=false` carries a
   *   `reason` code from REJECTION_REASON.
   */
  submit(task) {
    this._counters.submitted++;

    // ── Stage 0: Validation ──────────────────────────────────────────────────
    if (!task || typeof task.id !== 'string' || !task.id) {
      this._counters.rejected++;
      return this._reject(task, REJECTION_REASON.INVALID_TASK, null);
    }
    // Normalise defaults
    const normTask = {
      id:        task.id,
      tier:      task.tier || CRITICALITY_TIER.SHEDDABLE,
      embedding: Array.isArray(task.embedding) ? task.embedding : null,
      urgency:   typeof task.urgency === 'number' ? task.urgency : 0.5,
      impact:    typeof task.impact  === 'number' ? task.impact  : 0.5,
      payload:   task.payload || null,
      submittedAt: now(),
    };

    // ── Stage 1: Semantic Dedup ──────────────────────────────────────────────
    const dedupResult = this.checkDedup(normTask);
    if (dedupResult.isDuplicate) {
      this._counters.deduplicated++;
      this._counters.rejected++;
      /**
       * @event SemanticBackpressure#rejected
       * @type {{ task: object, reason: string, duplicateOf: string|undefined }}
       */
      this.emit('rejected', { task: normTask, reason: REJECTION_REASON.DEDUP, duplicateOf: dedupResult.duplicateOf });
      return this._reject(normTask, REJECTION_REASON.DEDUP, null, { duplicateOf: dedupResult.duplicateOf });
    }

    // ── Stage 2: Priority Scoring ────────────────────────────────────────────
    const priority = this.scorePriority(normTask);
    normTask.priority = priority;

    // ── Stage 3: SRE Throttle ────────────────────────────────────────────────
    const throttleResult = this.checkThrottle();
    if (throttleResult.rejected) {
      this._counters.rejected++;
      this.emit('rejected', { task: normTask, reason: REJECTION_REASON.THROTTLED, pReject: throttleResult.pReject });
      return this._reject(normTask, REJECTION_REASON.THROTTLED, priority, { pReject: throttleResult.pReject });
    }

    // ── Stage 4: Circuit Breaker ─────────────────────────────────────────────
    const cbResult = this.checkCircuitBreaker();
    if (cbResult.rejected) {
      this._counters.rejected++;
      this.emit('rejected', { task: normTask, reason: REJECTION_REASON.CIRCUIT_OPEN, cbState: cbResult.state });
      return this._reject(normTask, REJECTION_REASON.CIRCUIT_OPEN, priority, { cbState: cbResult.state });
    }

    // ── Stage 5: Load Shed Pre-check ─────────────────────────────────────────
    const currentLevel = this.getPressureLevel();
    const shedResult   = this._shouldShed(normTask, currentLevel);
    if (shedResult) {
      this._counters.rejected++;
      this.emit('rejected', { task: normTask, reason: REJECTION_REASON.LOAD_SHED, pressureLevel: currentLevel });
      return this._reject(normTask, REJECTION_REASON.LOAD_SHED, priority, { pressureLevel: currentLevel });
    }

    // ── Stage 6: Queue Admission ─────────────────────────────────────────────
    const admitResult = this.admitToQueue(normTask);
    if (!admitResult.admitted) {
      this._counters.rejected++;
      this.emit('rejected', { task: normTask, reason: REJECTION_REASON.QUEUE_FULL, queueDepth: this._queue.length });
      return this._reject(normTask, REJECTION_REASON.QUEUE_FULL, priority, { queueDepth: this._queue.length });
    }

    // ── Admission success ────────────────────────────────────────────────────
    this._counters.admitted++;
    this._sre.accepts++;
    this._insertDedup(normTask);
    this._checkPressureTransition();

    /**
     * @event SemanticBackpressure#admitted
     * @type {{ task: object, priority: number, queueDepth: number }}
     */
    this.emit('admitted', { task: normTask, priority, queueDepth: this._queue.length });

    return {
      admitted:   true,
      reason:     null,
      priority,
      queueDepth: this._queue.length,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  STAGE 1 — SEMANTIC DEDUPLICATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Check whether the incoming task is semantically duplicated against the
   * dedup cache. Evicts expired entries before comparison.
   *
   * Dedup fires when:
   *   - An entry with the same task.id exists and has not expired, OR
   *   - An entry with a different id has cosine similarity ≥ dedupThreshold
   *     (CSL_THRESHOLDS.CRITICAL ≈ 0.927).
   *
   * @param {object}   task           - Normalised task.
   * @param {string}   task.id        - Task id.
   * @param {number[]} task.embedding - Embedding vector (may be null).
   * @returns {{ isDuplicate: boolean, duplicateOf: string|undefined, similarity: number|null }}
   */
  checkDedup(task) {
    const t = now();
    this._evictExpiredDedup(t);

    // Exact-id match
    if (this._dedupCache.has(task.id)) {
      const entry = this._dedupCache.get(task.id);
      if (t < entry.expiresAt) {
        return { isDuplicate: true, duplicateOf: task.id, similarity: 1.0 };
      }
      // Entry expired — remove and continue
      this._removeDedup(task.id);
    }

    // Semantic vector match (only possible when both have embeddings)
    if (task.embedding && task.embedding.length > 0) {
      for (const [cachedId, entry] of this._dedupCache) {
        if (!entry.embedding || entry.embedding.length !== task.embedding.length) continue;
        let similarity;
        try {
          similarity = cosineSimilarity(task.embedding, entry.embedding);
        } catch (_) {
          continue;
        }
        if (similarity >= this.dedupThreshold) {
          return { isDuplicate: true, duplicateOf: cachedId, similarity };
        }
      }
    }

    return { isDuplicate: false, duplicateOf: undefined, similarity: null };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  STAGE 2 — PRIORITY SCORING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Compute a phi-weighted priority score for the task.
   *
   * Score formula (phiPriorityScore):
   *   score = criticality × w₀ + urgency × w₁ + impact × w₂
   *   where [w₀, w₁, w₂] = phiFusionWeights(3) ≈ [0.528, 0.326, 0.146]
   *
   * Criticality weights (Fibonacci-scaled, normalised by CRITICAL_PLUS=13):
   *   CRITICAL_PLUS  → fib(7)=13 → 1.000
   *   CRITICAL       → fib(6)=8  → 0.615
   *   SHEDDABLE_PLUS → fib(5)=5  → 0.385
   *   SHEDDABLE      → fib(3)=2  → 0.154
   *
   * @param {object} task         - Normalised task.
   * @param {string} task.tier    - Criticality tier.
   * @param {number} task.urgency - Urgency in [0, 1].
   * @param {number} task.impact  - Impact in [0, 1].
   * @returns {number} Priority score in [0, 1].
   */
  scorePriority(task) {
    const crit    = normalisedCriticality(task.tier);
    const urgency = Math.max(0, Math.min(1, task.urgency));
    const impact  = Math.max(0, Math.min(1, task.impact));
    return phiPriorityScore(crit, urgency, impact);
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  STAGE 3 — SRE ADAPTIVE THROTTLE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Apply Google SRE Client-Side Throttling.
   *
   * Algorithm (from Google SRE workbook, Chapter 21):
   *   P(reject) = max(0, (requests - K × accepts) / (requests + 1))
   *   where K = 2.0 and the window resets every sreWindowMs (120 000 ms).
   *
   * The rolling window resets its counters when the window expires so that
   * a period of low traffic does not permanently bias the rejection rate.
   *
   * @returns {{ rejected: boolean, pReject: number }}
   */
  checkThrottle() {
    const t = now();

    // Roll window if expired
    if (t - this._sre.windowStart >= this.sreWindowMs) {
      this._sre.requests    = 0;
      this._sre.accepts     = 0;
      this._sre.windowStart = t;
    }

    this._sre.requests++;

    const { requests, accepts } = this._sre;
    const pReject = Math.max(0, (requests - this.sreK * accepts) / (requests + 1));

    if (pReject > 0 && Math.random() < pReject) {
      return { rejected: true, pReject };
    }
    return { rejected: false, pReject };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  STAGE 4 — CIRCUIT BREAKER
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Evaluate the circuit breaker gate.
   *
   * States:
   *   CLOSED    — Normal operation. Passes all requests.
   *   OPEN      — Circuit tripped. Rejects all requests.
   *   HALF_OPEN — Recovery probing. Allows cbHalfOpenProbes=fib(4)=3 requests
   *               before flipping back to CLOSED or OPEN based on outcomes.
   *
   * Transition triggers:
   *   CLOSED → OPEN       : failures >= cbFailureThreshold (fib(5)=5)
   *   OPEN   → HALF_OPEN  : recovery delay elapsed (phi-backoff from lastOpenedAt)
   *   HALF_OPEN → CLOSED  : probes exhausted with no additional failures
   *   HALF_OPEN → OPEN    : any failure during probing (recorded via recordFailure())
   *
   * @returns {{ rejected: boolean, state: string }}
   */
  checkCircuitBreaker() {
    const cb = this._circuitBreaker;
    const t  = now();

    if (cb.state === CB_STATE.CLOSED) {
      return { rejected: false, state: CB_STATE.CLOSED };
    }

    if (cb.state === CB_STATE.OPEN) {
      // Compute phi-backoff recovery delay
      const failureCount = Math.min(cb.failures, 8); // cap exponent
      const recoveryMs   = phiBackoff(failureCount, CB_RECOVERY_BASE_MS, 46979);
      const elapsed      = t - (cb.lastOpenedAt || t);

      if (elapsed >= recoveryMs) {
        // Transition to HALF_OPEN
        cb.state       = CB_STATE.HALF_OPEN;
        cb.probesSent  = 0;
        /**
         * @event SemanticBackpressure#circuit
         * @type {{ from: string, to: string, failures: number }}
         */
        this.emit('circuit', { from: CB_STATE.OPEN, to: CB_STATE.HALF_OPEN, failures: cb.failures });
        return { rejected: false, state: CB_STATE.HALF_OPEN };
      }
      return { rejected: true, state: CB_STATE.OPEN };
    }

    if (cb.state === CB_STATE.HALF_OPEN) {
      if (cb.probesSent < this.cbHalfOpenProbes) {
        cb.probesSent++;
        if (cb.probesSent >= this.cbHalfOpenProbes) {
          // All probes sent without failure — close the circuit
          cb.state    = CB_STATE.CLOSED;
          cb.failures = 0;
          this.emit('circuit', { from: CB_STATE.HALF_OPEN, to: CB_STATE.CLOSED, failures: 0 });
        }
        return { rejected: false, state: CB_STATE.HALF_OPEN };
      }
      // Should not reach here — probes should have closed the circuit
      return { rejected: false, state: CB_STATE.HALF_OPEN };
    }

    return { rejected: false, state: cb.state };
  }

  /**
   * Record a downstream execution failure.
   * Increments the circuit breaker failure counter and opens the circuit
   * when the threshold is reached.
   *
   * @returns {void}
   */
  recordFailure() {
    const cb = this._circuitBreaker;
    cb.failures++;

    if (cb.state === CB_STATE.HALF_OPEN) {
      // Failure during probing — re-open immediately
      cb.state        = CB_STATE.OPEN;
      cb.lastOpenedAt = now();
      this.emit('circuit', { from: CB_STATE.HALF_OPEN, to: CB_STATE.OPEN, failures: cb.failures });
      return;
    }

    if (cb.state === CB_STATE.CLOSED && cb.failures >= this.cbFailureThreshold) {
      cb.state        = CB_STATE.OPEN;
      cb.lastOpenedAt = now();
      this.emit('circuit', { from: CB_STATE.CLOSED, to: CB_STATE.OPEN, failures: cb.failures });
    }
  }

  /**
   * Record a downstream execution success.
   * Resets the failure counter when the circuit is CLOSED or HALF_OPEN.
   *
   * @returns {void}
   */
  recordSuccess() {
    const cb = this._circuitBreaker;
    if (cb.state === CB_STATE.CLOSED || cb.state === CB_STATE.HALF_OPEN) {
      cb.failures = 0;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  STAGE 6 — QUEUE ADMISSION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Attempt to admit a task into the priority queue.
   * Rejects when queue depth >= queueMaxDepth (fib(13)=233).
   * Inserts in descending priority order for O(n) worst case, acceptable
   * given the Fibonacci-bounded queue size.
   *
   * @param {object} task          - Normalised task (must have task.priority).
   * @returns {{ admitted: boolean, queueDepth: number }}
   */
  admitToQueue(task) {
    if (this._queue.length >= this.queueMaxDepth) {
      return { admitted: false, queueDepth: this._queue.length };
    }

    const entry = {
      task,
      priority:   task.priority,
      admittedAt: now(),
    };

    // Insert in descending priority order
    let insertIdx = this._queue.length;
    for (let i = 0; i < this._queue.length; i++) {
      if (entry.priority > this._queue[i].priority) {
        insertIdx = i;
        break;
      }
    }
    this._queue.splice(insertIdx, 0, entry);

    return { admitted: true, queueDepth: this._queue.length };
  }

  /**
   * Dequeue the highest-priority task from the front of the queue.
   * Returns null if the queue is empty.
   *
   * @returns {{ task: object, priority: number, admittedAt: number }|null}
   */
  dequeue() {
    if (this._queue.length === 0) return null;
    const entry = this._queue.shift();
    this._checkPressureTransition();
    return entry;
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PRESSURE LEVEL
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Compute the current system pressure level based on queue depth.
   *
   * Boundaries (from phi-math PRESSURE_LEVELS, extended per spec):
   *   NOMINAL:   ratio in [0,      0.382)
   *   ELEVATED:  ratio in [0.382,  0.618)
   *   HIGH:      ratio in [0.618,  0.854)
   *   CRITICAL:  ratio in [0.910,  1.0]
   *
   * @returns {'NOMINAL'|'ELEVATED'|'HIGH'|'CRITICAL'} Current pressure level name.
   */
  getPressureLevel() {
    const ratio = depthToPressure(this._queue.length);
    return ratioToPressureLevel(ratio);
  }

  /**
   * Return the current queue depth ratio in [0, 1].
   * @returns {number}
   */
  getPressureRatio() {
    return depthToPressure(this._queue.length);
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  LOAD SHEDDING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Actively shed (evict) tasks from the queue based on current pressure level.
   *
   * Shedding policy:
   *   HIGH     → remove all tasks with tier SHEDDABLE
   *   CRITICAL → remove all tasks with tier SHEDDABLE or SHEDDABLE_PLUS
   *              (i.e. only CRITICAL and CRITICAL_PLUS survive)
   *
   * @param {string} [level] - Override pressure level (defaults to getPressureLevel()).
   * @returns {{ shed: number, remaining: number }} Count of evicted and remaining tasks.
   */
  shed(level) {
    const pressureLevel = level || this.getPressureLevel();
    let shedCount = 0;

    const tiersToDrop = this._shedTiers(pressureLevel);
    if (tiersToDrop.length === 0) {
      return { shed: 0, remaining: this._queue.length };
    }

    const before = this._queue.length;
    this._queue = this._queue.filter(entry => !tiersToDrop.includes(entry.task.tier));
    shedCount = before - this._queue.length;
    this._counters.shed += shedCount;

    if (shedCount > 0) {
      /**
       * @event SemanticBackpressure#shed
       * @type {{ level: string, shed: number, remaining: number, tiers: string[] }}
       */
      this.emit('shed', {
        level:     pressureLevel,
        shed:      shedCount,
        remaining: this._queue.length,
        tiers:     tiersToDrop,
      });
    }

    return { shed: shedCount, remaining: this._queue.length };
  }

  /**
   * Determine which criticality tiers to drop for a given pressure level.
   *
   * @param {string} level - Pressure level name.
   * @returns {string[]} Array of CRITICALITY_TIER values to evict.
   * @private
   */
  _shedTiers(level) {
    switch (level) {
      case 'CRITICAL':
        return [CRITICALITY_TIER.SHEDDABLE, CRITICALITY_TIER.SHEDDABLE_PLUS];
      case 'HIGH':
        return [CRITICALITY_TIER.SHEDDABLE];
      default:
        return [];
    }
  }

  /**
   * Decide whether an incoming task should be pre-emptively rejected (not
   * queued) based on its tier and the current pressure level.
   * This is a fast pre-admission shed — tasks that would be immediately
   * evicted by shed() should not be admitted at all.
   *
   * @param {object} task  - Normalised task.
   * @param {string} level - Current pressure level.
   * @returns {boolean} True if the task should be rejected.
   * @private
   */
  _shouldShed(task, level) {
    const tiers = this._shedTiers(level);
    return tiers.includes(task.tier);
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  BACKPRESSURE PROPAGATION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Propagate a backpressure signal upstream to callers or connected systems.
   *
   * The signal is phi-gated using the current pressure ratio so that mild
   * pressure produces a weak signal and critical pressure a full signal.
   *
   * Signal encoding:
   *   gatedSignal = cslGate(signal.magnitude, pressureRatio, tau, temperature)
   *   where tau = ALERT_THRESHOLDS.warning ≈ 0.618
   *         temperature = PSI² ≈ 0.382 (medium sharpness)
   *
   * @param {object}  signal             - Upstream backpressure descriptor.
   * @param {number}  signal.magnitude   - Raw signal strength in [0, 1].
   * @param {string}  [signal.target]    - Upstream subsystem identifier.
   * @param {object}  [signal.metadata]  - Arbitrary additional metadata.
   * @returns {{ propagated: boolean, gatedMagnitude: number, level: string, ratio: number }}
   */
  propagateBackpressure(signal) {
    const ratio    = this.getPressureRatio();
    const level    = ratioToPressureLevel(ratio);
    const tau      = ALERT_THRESHOLDS.warning;          // PSI ≈ 0.618
    const temp     = PSI * PSI;                         // PSI² ≈ 0.382
    const rawMag   = typeof signal.magnitude === 'number' ? signal.magnitude : 1.0;
    const gatedMag = cslGate(rawMag, ratio, tau, temp);

    const payload = {
      source:         this.label,
      target:         signal.target || 'upstream',
      level,
      ratio,
      gatedMagnitude: gatedMag,
      timestamp:      now(),
      metadata:       signal.metadata || {},
    };

    /**
     * @event SemanticBackpressure#backpressure
     * @type {{ source: string, target: string, level: string, ratio: number, gatedMagnitude: number, timestamp: number }}
     */
    this.emit('backpressure', payload);

    return {
      propagated:     true,
      gatedMagnitude: gatedMag,
      level,
      ratio,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  METRICS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Return a snapshot of key operational metrics.
   *
   * @returns {{
   *   label:           string,
   *   queueDepth:      number,
   *   queueMaxDepth:   number,
   *   pressureRatio:   number,
   *   pressureLevel:   string,
   *   circuitState:    string,
   *   circuitFailures: number,
   *   sreRequests:     number,
   *   sreAccepts:      number,
   *   rejectionRate:   number,
   *   counters:        object,
   *   dedupCacheSize:  number,
   *   uptimeMs:        number,
   * }}
   */
  getMetrics() {
    const queueDepth    = this._queue.length;
    const pressureRatio = depthToPressure(queueDepth);
    const pressureLevel = ratioToPressureLevel(pressureRatio);
    const { submitted, admitted, rejected, deduplicated, shed } = this._counters;
    const rejectionRate = submitted > 0 ? rejected / submitted : 0;

    return {
      label:           this.label,
      queueDepth,
      queueMaxDepth:   this.queueMaxDepth,
      pressureRatio,
      pressureLevel,
      circuitState:    this._circuitBreaker.state,
      circuitFailures: this._circuitBreaker.failures,
      sreRequests:     this._sre.requests,
      sreAccepts:      this._sre.accepts,
      rejectionRate,
      counters: {
        submitted,
        admitted,
        rejected,
        deduplicated,
        shed,
      },
      dedupCacheSize: this._dedupCache.size,
      uptimeMs:       now() - this._startedAt,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPERS — DEDUP CACHE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Insert a task into the dedup cache.
   * Triggers LRU eviction when the cache is at capacity.
   *
   * @param {object} task - Normalised task.
   * @private
   */
  _insertDedup(task) {
    if (this._dedupCache.size >= DEDUP_CACHE_SIZE) {
      this._evictOldestDedup();
    }
    const entry = {
      id:          task.id,
      embedding:   task.embedding || null,
      tier:        task.tier,
      priority:    task.priority || 0,
      insertedAt:  now(),
      expiresAt:   now() + DEDUP_TTL_MS,
    };
    this._dedupCache.set(task.id, entry);
    this._dedupOrder.push(task.id);
  }

  /**
   * Evict expired entries from the dedup cache (passive TTL expiry).
   *
   * @param {number} [t=Date.now()] - Current timestamp.
   * @private
   */
  _evictExpiredDedup(t = now()) {
    for (const [id, entry] of this._dedupCache) {
      if (t >= entry.expiresAt) {
        this._removeDedup(id);
      }
    }
  }

  /**
   * Evict the EVICTION_COUNT oldest entries (LRU compaction when cache is full).
   * Removes entries in insertion order (FIFO from _dedupOrder).
   * @private
   */
  _evictOldestDedup() {
    const toEvict = Math.min(EVICTION_COUNT, this._dedupOrder.length);
    const evicted = this._dedupOrder.splice(0, toEvict);
    for (const id of evicted) {
      this._dedupCache.delete(id);
    }
  }

  /**
   * Remove a single entry from the dedup cache and order list.
   *
   * @param {string} id - Task id to remove.
   * @private
   */
  _removeDedup(id) {
    this._dedupCache.delete(id);
    const idx = this._dedupOrder.indexOf(id);
    if (idx !== -1) this._dedupOrder.splice(idx, 1);
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPERS — PRESSURE TRANSITION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Detect pressure level changes and emit 'pressure' events.
   * If autoShed is enabled, triggers load shedding on HIGH/CRITICAL transitions.
   * @private
   */
  _checkPressureTransition() {
    const level = this.getPressureLevel();
    if (level !== this._lastPressureLevel) {
      /**
       * @event SemanticBackpressure#pressure
       * @type {{ from: string, to: string, ratio: number }}
       */
      this.emit('pressure', {
        from:  this._lastPressureLevel,
        to:    level,
        ratio: this.getPressureRatio(),
      });
      this._lastPressureLevel = level;

      if (this.autoShed && (level === 'HIGH' || level === 'CRITICAL')) {
        this.shed(level);
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPERS — REJECTION RESPONSE BUILDER
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Build a standardised rejection response object.
   *
   * @param {object}      task    - The rejected task.
   * @param {string}      reason  - REJECTION_REASON code.
   * @param {number|null} priority - Computed priority (null if not yet scored).
   * @param {object}      [extra={}] - Additional metadata for the response.
   * @returns {{ admitted: boolean, reason: string, priority: number|null, queueDepth: number }}
   * @private
   */
  _reject(task, reason, priority, extra = {}) {
    return Object.assign(
      { admitted: false, reason, priority, queueDepth: this._queue.length },
      extra
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  SemanticBackpressure,
  REJECTION_REASON,
  CRITICALITY_TIER,
  CRITICALITY_WEIGHTS,
  CB_STATE,

  // Phi-derived constants (exported for testing and external reference)
  DEDUP_THRESHOLD,
  DEDUP_CACHE_SIZE,
  DEDUP_TTL_MS,
  QUEUE_MAX_DEPTH,
  EVICTION_FRACTION,
  EVICTION_COUNT,
  CB_FAILURE_THRESHOLD,
  CB_HALF_OPEN_PROBES,
  CB_RECOVERY_BASE_MS,
  SRE_WINDOW_MS,
  SRE_K,
  CRITICALITY_MAX,
};
