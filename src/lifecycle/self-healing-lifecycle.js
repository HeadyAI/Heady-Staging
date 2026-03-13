'use strict';

/**
 * self-healing-lifecycle.js
 *
 * Implements the complete self-healing lifecycle state machine for the Heady™ ecosystem.
 * All numeric constants are derived from phi-math-v2.js — no magic numbers here.
 *
 * State machine:
 *   HEALTHY → SUSPECT → QUARANTINED → RECOVERING → RESTORED → HEALTHY
 *   Any     → DEGRADED (partial function)
 *   QUARANTINED → DEAD (terminal, needs manual intervention)
 *
 * Component types: service | worker | agent | tool_connector | provider_route
 *
 * @module self-healing-lifecycle
 * @version 1.0.0
 */

const EventEmitter = require('events');

const {
  PHI,
  PSI,
  PHI_SQ,
  PHI_CB,
  PHI_TEMPERATURE,
  fib,
  fibNearest,   // nearestFib
  fibCeil,      // ceilFib
  fibFloor,     // floorFib
  CSL_THRESHOLDS,
  PRESSURE_LEVELS,
  phiFusionWeights,
  phiResourceWeights,
  phiMultiSplit,
  phiTokenBudgets,
  cslGate,
  cslBlend,
  adaptiveTemperature,
  cosineSimilarity,
  phiPriorityScore,
  phiBackoff,   // phiBackoff already includes jitter; use as phiBackoffWithJitter
} = require('../shared/phi-math');

// ─────────────────────────────────────────────────────────────────────────────
// PHI BACKOFF SEQUENCE  (pre-computed, matches task spec)
// [1000, 1618, 2618, 4236, 6854, 11090, 17944, 29034] ms
// ─────────────────────────────────────────────────────────────────────────────

/** @type {number[]} Deterministic phi-backoff sequence (no jitter) for reference */
const PHI_BACKOFF_SEQUENCE = Object.freeze(
  Array.from({ length: fib(5) + fib(4) }, (_, i) => Math.round(1000 * PHI ** i))
  // fib(5)=5 + fib(4)=3 = 8 entries — matches DEAD threshold fib(6)=8
);

// ─────────────────────────────────────────────────────────────────────────────
// FIBONACCI POOLS  (pool sizes for component instance management)
// ─────────────────────────────────────────────────────────────────────────────

/** @type {number[]} Fibonacci-derived pool sizes for component instance management */
const FIBONACCI_POOLS = Object.freeze([
  fib(5),   // 5   — micro pool
  fib(6),   // 8   — small pool
  fib(7),   // 13  — medium pool
  fib(8),   // 21  — large pool
  fib(9),   // 34  — XL pool
]);

// ─────────────────────────────────────────────────────────────────────────────
// STATE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All valid lifecycle states a component can occupy.
 * @enum {string}
 */
const STATE = Object.freeze({
  HEALTHY:     'HEALTHY',
  SUSPECT:     'SUSPECT',
  QUARANTINED: 'QUARANTINED',
  RECOVERING:  'RECOVERING',
  RESTORED:    'RESTORED',
  DEGRADED:    'DEGRADED',
  DEAD:        'DEAD',
});

/**
 * Valid component types in the Heady™ ecosystem.
 * @enum {string}
 */
const COMPONENT_TYPE = Object.freeze({
  SERVICE:        'service',
  WORKER:         'worker',
  AGENT:          'agent',
  TOOL_CONNECTOR: 'tool_connector',
  PROVIDER_ROUTE: 'provider_route',
});

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE THRESHOLDS  (all derived from phi-math-v2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Threshold at which an anomaly is flagged (drift score drops below this).
 * CSL_THRESHOLDS.MEDIUM ≈ 0.809
 * @type {number}
 */
const ANOMALY_DRIFT_THRESHOLD = CSL_THRESHOLDS.MEDIUM;

/**
 * Coherence score required to pass attestation and move RESTORED → HEALTHY.
 * CSL_THRESHOLDS.HIGH ≈ 0.882
 * @type {number}
 */
const ATTESTATION_PASS_THRESHOLD = CSL_THRESHOLDS.HIGH;

/**
 * Number of consecutive failures before entering QUARANTINED state.
 * fib(5) = 5
 * @type {number}
 */
const QUARANTINE_FAILURE_THRESHOLD = fib(5);

/**
 * Maximum total recovery attempts before declaring DEAD.
 * fib(6) = 8
 * @type {number}
 */
const MAX_RECOVERY_ATTEMPTS = fib(6);

/**
 * How long the circuit breaker stays open before entering half-open.
 * fib(7) × 1000 = 13000 ms
 * @type {number}
 */
const CIRCUIT_HALF_OPEN_AFTER_MS = fib(7) * 1000;

/**
 * Drift check interval in milliseconds.
 * fib(7) × 1000 = 13000 ms
 * @type {number}
 */
const DRIFT_CHECK_INTERVAL_MS = fib(7) * 1000;

/**
 * Cooldown period between successive recovery cycles (fib(8) × 1000 = 21000 ms).
 * @type {number}
 */
const RECOVERY_COOLDOWN_MS = fib(8) * 1000;

/**
 * Canary validation window (fib(6) × 1000 = 8000 ms) — component must pass health
 * checks continuously during this window before being considered RESTORED.
 * @type {number}
 */
const CANARY_VALIDATION_MS = fib(6) * 1000;

/**
 * Maximum history entries retained per component (fib(7) = 13).
 * @type {number}
 */
const MAX_HISTORY_SIZE = fib(7);

// ─────────────────────────────────────────────────────────────────────────────
// DRIFT DETECTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DriftDetector monitors a component's coherence by comparing successive
 * embedding snapshots via cosine similarity.
 *
 * A drift score below {@link ANOMALY_DRIFT_THRESHOLD} signals an anomaly.
 */
class DriftDetector {
  /**
   * @param {string} componentId - Owning component identifier
   * @param {number} [threshold=ANOMALY_DRIFT_THRESHOLD] - Drift threshold override
   */
  constructor(componentId, threshold = ANOMALY_DRIFT_THRESHOLD) {
    /** @type {string} */
    this.componentId = componentId;
    /** @type {number} */
    this.threshold = threshold;
    /** @type {number[]|null} */
    this._baseline = null;
    /** @type {number} */
    this._lastScore = 1.0;
    /** @type {number} */
    this._checkCount = 0;
    /** @type {number} */
    this._anomalyCount = 0;
  }

  /**
   * Sets the baseline embedding vector. Must be called before {@link check}.
   * @param {number[]} vector - Baseline embedding (e.g. 384-dimensional)
   * @returns {void}
   */
  setBaseline(vector) {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new TypeError('DriftDetector.setBaseline: vector must be a non-empty array');
    }
    this._baseline = vector.slice();
  }

  /**
   * Computes cosine similarity between the current vector and the baseline.
   * Applies adaptive temperature to soften the gate when entropy is high.
   *
   * @param {number[]} currentVector - Current embedding snapshot
   * @returns {{ score: number, isDrift: boolean, gated: number }}
   */
  check(currentVector) {
    if (!this._baseline) {
      return { score: 1.0, isDrift: false, gated: 1.0 };
    }
    if (currentVector.length !== this._baseline.length) {
      throw new Error(
        `DriftDetector: vector length mismatch (${currentVector.length} vs ${this._baseline.length})`
      );
    }

    const score = cosineSimilarity(currentVector, this._baseline);
    this._lastScore = score;
    this._checkCount++;

    // Entropy-responsive gate: when drift is high, widen the decision boundary
    const entropy = Math.max(0, 1 - score);
    const temp = adaptiveTemperature(entropy, 1.0);
    const gated = cslGate(score, score, this.threshold, temp);
    const isDrift = score < this.threshold;

    if (isDrift) this._anomalyCount++;

    return { score, isDrift, gated };
  }

  /**
   * Updates the baseline to the current vector (drift forgiveness after recovery).
   * @param {number[]} vector
   * @returns {void}
   */
  updateBaseline(vector) {
    this.setBaseline(vector);
    this._anomalyCount = 0;
  }

  /**
   * Returns detector summary statistics.
   * @returns {{ componentId: string, lastScore: number, checkCount: number, anomalyCount: number, threshold: number }}
   */
  stats() {
    return {
      componentId:  this.componentId,
      lastScore:    this._lastScore,
      checkCount:   this._checkCount,
      anomalyCount: this._anomalyCount,
      threshold:    this.threshold,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CIRCUIT BREAKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CircuitBreaker prevents cascading failures by blocking calls when a component
 * is repeatedly failing.
 *
 * States:
 *  CLOSED     → normal operation
 *  OPEN       → blocking all calls; transitions to HALF_OPEN after halfOpenAfterMs
 *  HALF_OPEN  → allows one probe; resets on success, opens on failure
 */
class CircuitBreaker {
  /**
   * @param {string} componentId
   * @param {{ failureThreshold?: number, halfOpenAfterMs?: number }} [opts]
   */
  constructor(componentId, opts = {}) {
    /** @type {string} */
    this.componentId = componentId;
    /** @type {number} Failures before opening. Defaults to fib(5)=5 */
    this.failureThreshold = opts.failureThreshold ?? QUARANTINE_FAILURE_THRESHOLD;
    /** @type {number} ms before half-open probe. Defaults to fib(7)*1000=13000 */
    this.halfOpenAfterMs = opts.halfOpenAfterMs ?? CIRCUIT_HALF_OPEN_AFTER_MS;

    /** @type {'CLOSED'|'OPEN'|'HALF_OPEN'} */
    this._state = 'CLOSED';
    /** @type {number} */
    this._failureCount = 0;
    /** @type {number|null} */
    this._openedAt = null;
  }

  /**
   * Returns true if a call should be allowed through.
   * @returns {boolean}
   */
  isAllowed() {
    if (this._state === 'CLOSED') return true;
    if (this._state === 'OPEN') {
      const elapsed = Date.now() - (this._openedAt ?? 0);
      if (elapsed >= this.halfOpenAfterMs) {
        this._state = 'HALF_OPEN';
        return true; // allow probe
      }
      return false;
    }
    // HALF_OPEN: allow exactly one probe
    return true;
  }

  /**
   * Records a successful operation.
   * @returns {void}
   */
  recordSuccess() {
    this._failureCount = 0;
    this._state = 'CLOSED';
    this._openedAt = null;
  }

  /**
   * Records a failed operation.
   * @returns {void}
   */
  recordFailure() {
    this._failureCount++;
    if (this._state === 'HALF_OPEN' || this._failureCount >= this.failureThreshold) {
      this._state = 'OPEN';
      this._openedAt = Date.now();
    }
  }

  /**
   * Forces the circuit breaker open (for quarantine scenarios).
   * @returns {void}
   */
  trip() {
    this._state = 'OPEN';
    this._openedAt = Date.now();
  }

  /**
   * Returns circuit breaker status summary.
   * @returns {{ componentId: string, state: string, failureCount: number, openedAt: number|null }}
   */
  status() {
    return {
      componentId:  this.componentId,
      state:        this._state,
      failureCount: this._failureCount,
      openedAt:     this._openedAt,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTESTATION GATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AttestationGate validates that a recovering component has returned to sufficient
 * coherence before being fully restored.
 *
 * Passes when the CSL gate score (blending coherence with canary check pass rate)
 * meets or exceeds {@link ATTESTATION_PASS_THRESHOLD}.
 */
class AttestationGate {
  /**
   * @param {string} componentId
   * @param {number} [threshold=ATTESTATION_PASS_THRESHOLD]
   */
  constructor(componentId, threshold = ATTESTATION_PASS_THRESHOLD) {
    /** @type {string} */
    this.componentId = componentId;
    /** @type {number} */
    this.threshold = threshold;
    /** @type {number[]} */
    this._canaryScores = [];
    /** @type {number} */
    this._maxCanaryScores = fib(5); // 5 canary checks
  }

  /**
   * Submits a canary health check result.
   * @param {number} passRate - Value in [0, 1]; 1.0 = full pass
   * @returns {void}
   */
  submitCanaryResult(passRate) {
    this._canaryScores.push(Math.max(0, Math.min(1, passRate)));
    if (this._canaryScores.length > this._maxCanaryScores) {
      this._canaryScores.shift();
    }
  }

  /**
   * Evaluates attestation against a coherence score.
   *
   * @param {number} coherenceScore - Cosine similarity from DriftDetector, in [0, 1]
   * @returns {{ passed: boolean, gatedScore: number, reason: string }}
   */
  evaluate(coherenceScore) {
    const canaryAvg = this._canaryScores.length > 0
      ? this._canaryScores.reduce((s, v) => s + v, 0) / this._canaryScores.length
      : 0;

    // Phi-priority fusion: coherence is primary factor, canary rate is secondary
    const fused = phiPriorityScore(coherenceScore, canaryAvg);

    // Apply CSL gate with attestation threshold
    const gatedScore = cslGate(fused, fused, this.threshold, PHI_TEMPERATURE);
    const passed = fused >= this.threshold;

    const reason = passed
      ? `Coherence ${coherenceScore.toFixed(4)} × canary ${canaryAvg.toFixed(4)} fused=${fused.toFixed(4)} ≥ threshold ${this.threshold.toFixed(4)}`
      : `Fused score ${fused.toFixed(4)} below attestation threshold ${this.threshold.toFixed(4)}`;

    return { passed, gatedScore, reason };
  }

  /**
   * Resets canary history (call when starting a new recovery cycle).
   * @returns {void}
   */
  reset() {
    this._canaryScores = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY PROTOCOL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RecoveryProtocol manages the sequence of timed recovery attempts for one
 * component, using phi-backoff delays and tracking attempt counts.
 */
class RecoveryProtocol {
  /**
   * @param {string} componentId
   * @param {{ maxAttempts?: number, baseMs?: number, maxMs?: number }} [opts]
   */
  constructor(componentId, opts = {}) {
    /** @type {string} */
    this.componentId = componentId;
    /** @type {number} */
    this.maxAttempts = opts.maxAttempts ?? MAX_RECOVERY_ATTEMPTS;
    /** @type {number} */
    this.baseMs = opts.baseMs ?? 1000;
    /** @type {number} */
    this.maxMs = opts.maxMs ?? 60000;

    /** @type {number} Current attempt index (0-based) */
    this._attempt = 0;
    /** @type {number[]} History of delay values used */
    this._delayHistory = [];
    /** @type {number|null} */
    this._cooldownUntil = null;
  }

  /**
   * Returns true if more recovery attempts are available.
   * @returns {boolean}
   */
  hasAttemptsRemaining() {
    return this._attempt < this.maxAttempts;
  }

  /**
   * Returns true if a cooldown period is currently active.
   * @returns {boolean}
   */
  isInCooldown() {
    return this._cooldownUntil !== null && Date.now() < this._cooldownUntil;
  }

  /**
   * Computes the next phi-backoff delay (with jitter) and increments the attempt counter.
   * @returns {{ delayMs: number, attempt: number, exhausted: boolean }}
   */
  nextDelay() {
    if (!this.hasAttemptsRemaining()) {
      return { delayMs: 0, attempt: this._attempt, exhausted: true };
    }
    const delayMs = phiBackoff(this._attempt, this.baseMs, this.maxMs);
    this._delayHistory.push(delayMs);
    const attempt = this._attempt;
    this._attempt++;
    return { delayMs, attempt, exhausted: false };
  }

  /**
   * Starts a cooldown period (call after a failed recovery cycle).
   * @returns {void}
   */
  startCooldown() {
    this._cooldownUntil = Date.now() + RECOVERY_COOLDOWN_MS;
  }

  /**
   * Resets the recovery protocol (call after successful recovery).
   * @returns {void}
   */
  reset() {
    this._attempt = 0;
    this._delayHistory = [];
    this._cooldownUntil = null;
  }

  /**
   * Returns protocol summary.
   * @returns {{ componentId: string, attempt: number, maxAttempts: number, delayHistory: number[], cooldownUntil: number|null }}
   */
  summary() {
    return {
      componentId:  this.componentId,
      attempt:      this._attempt,
      maxAttempts:  this.maxAttempts,
      delayHistory: this._delayHistory.slice(),
      cooldownUntil: this._cooldownUntil,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ComponentState tracks the current lifecycle state, transition history, and
 * health metrics for a single registered component.
 */
class ComponentState {
  /**
   * @param {string} id - Unique component identifier
   * @param {string} type - One of {@link COMPONENT_TYPE}
   * @param {{ initialVector?: number[], meta?: Object }} [opts]
   */
  constructor(id, type, opts = {}) {
    if (!Object.values(COMPONENT_TYPE).includes(type)) {
      throw new TypeError(`ComponentState: unknown type "${type}". Must be one of: ${Object.values(COMPONENT_TYPE).join(', ')}`);
    }

    /** @type {string} */
    this.id = id;
    /** @type {string} */
    this.type = type;
    /** @type {string} */
    this.state = STATE.HEALTHY;
    /** @type {Object} */
    this.meta = opts.meta ?? {};

    /** @type {number} Unix ms of last state change */
    this.lastTransitionAt = Date.now();
    /** @type {number} Consecutive failure count (resets on recovery) */
    this.consecutiveFailures = 0;
    /** @type {number} Total failures ever recorded */
    this.totalFailures = 0;
    /** @type {number} Total successful recoveries */
    this.totalRecoveries = 0;
    /** @type {number} Current health score in [0, 1] */
    this.healthScore = 1.0;
    /** @type {number} Current drift score in [0, 1] */
    this.driftScore = 1.0;

    /**
     * Transition history ring buffer (newest last).
     * @type {Array<{ from: string, to: string, reason: string, at: number }>}
     */
    this._history = [];

    /**
     * Sub-systems for this component.
     */
    this.driftDetector = new DriftDetector(id);
    this.circuitBreaker = new CircuitBreaker(id);
    this.recoveryProtocol = new RecoveryProtocol(id);
    this.attestationGate = new AttestationGate(id);

    // Seed baseline if an initial vector was provided
    if (opts.initialVector) {
      this.driftDetector.setBaseline(opts.initialVector);
    }
  }

  /**
   * Records a state transition in the component history.
   * The history ring buffer is capped at {@link MAX_HISTORY_SIZE} entries.
   *
   * @param {string} from - Previous state
   * @param {string} to   - New state
   * @param {string} reason - Human-readable reason for the transition
   * @returns {void}
   */
  recordTransition(from, to, reason) {
    const entry = { from, to, reason, at: Date.now() };
    this._history.push(entry);
    if (this._history.length > MAX_HISTORY_SIZE) {
      this._history.shift();
    }
    this.lastTransitionAt = entry.at;
  }

  /**
   * Returns the transition history (newest last, up to MAX_HISTORY_SIZE).
   * @returns {Array<{ from: string, to: string, reason: string, at: number }>}
   */
  history() {
    return this._history.slice();
  }

  /**
   * Returns a serialisable snapshot of this component's current state.
   * @returns {Object}
   */
  snapshot() {
    return {
      id:                  this.id,
      type:                this.type,
      state:               this.state,
      healthScore:         this.healthScore,
      driftScore:          this.driftScore,
      consecutiveFailures: this.consecutiveFailures,
      totalFailures:       this.totalFailures,
      totalRecoveries:     this.totalRecoveries,
      lastTransitionAt:    this.lastTransitionAt,
      circuitBreaker:      this.circuitBreaker.status(),
      recovery:            this.recoveryProtocol.summary(),
      drift:               this.driftDetector.stats(),
      meta:                this.meta,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-HEALING LIFECYCLE — MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SelfHealingLifecycle is the top-level orchestrator for the Heady™ ecosystem's
 * self-healing state machine.
 *
 * Usage:
 * ```js
 * const lifecycle = new SelfHealingLifecycle();
 * lifecycle.register('svc-auth', 'service');
 * lifecycle.on('state:changed', ({ componentId, from, to, reason }) => { ... });
 *
 * // Simulate a failure signal
 * lifecycle.reportFailure('svc-auth', 'HTTP 503 timeout');
 *
 * // Simulate a drift signal with an embedding
 * lifecycle.reportDrift('svc-auth', currentEmbedding);
 * ```
 *
 * @extends EventEmitter
 */
class SelfHealingLifecycle extends EventEmitter {
  /**
   * @param {{ driftCheckIntervalMs?: number, logger?: Function }} [opts]
   */
  constructor(opts = {}) {
    super();

    /** @type {Map<string, ComponentState>} */
    this._components = new Map();

    /** @type {number} */
    this._driftCheckIntervalMs = opts.driftCheckIntervalMs ?? DRIFT_CHECK_INTERVAL_MS;

    /**
     * Logger function. Defaults to console.log with ISO timestamp prefix.
     * @type {Function}
     */
    this._log = opts.logger ?? ((level, msg, ctx) => {
      const ts = new Date().toISOString();
      const ctxStr = ctx ? ` ${JSON.stringify(ctx)}` : '';
      console.log(`[${ts}] [${level.toUpperCase()}] ${msg}${ctxStr}`);
    });

    /** @type {Map<string, NodeJS.Timeout>} per-component drift check timers */
    this._driftTimers = new Map();

    /** @type {Map<string, NodeJS.Timeout>} per-component recovery timers */
    this._recoveryTimers = new Map();
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  /**
   * Registers a new component into the lifecycle manager.
   *
   * @param {string} id   - Unique component identifier
   * @param {string} type - One of service|worker|agent|tool_connector|provider_route
   * @param {{ initialVector?: number[], meta?: Object }} [opts]
   * @returns {ComponentState}
   * @throws {Error} If the component is already registered
   */
  register(id, type, opts = {}) {
    if (this._components.has(id)) {
      throw new Error(`SelfHealingLifecycle.register: component "${id}" is already registered`);
    }
    const cs = new ComponentState(id, type, opts);
    this._components.set(id, cs);

    this._log('info', `Component registered`, { id, type, state: STATE.HEALTHY });

    // Start periodic drift checks
    this._startDriftTimer(id);

    return cs;
  }

  /**
   * Deregisters a component and clears its timers.
   *
   * @param {string} id
   * @returns {boolean} true if removed, false if not found
   */
  deregister(id) {
    if (!this._components.has(id)) return false;
    this._clearTimers(id);
    this._components.delete(id);
    this._log('info', `Component deregistered`, { id });
    return true;
  }

  /**
   * Returns the {@link ComponentState} for the given id, or null.
   * @param {string} id
   * @returns {ComponentState|null}
   */
  get(id) {
    return this._components.get(id) ?? null;
  }

  /**
   * Returns snapshots of all registered components.
   * @returns {Object[]}
   */
  listAll() {
    return Array.from(this._components.values()).map(cs => cs.snapshot());
  }

  // ─── Signal Handlers ───────────────────────────────────────────────────────

  /**
   * Reports a failure signal for a component.
   * Drives transitions: HEALTHY→SUSPECT, SUSPECT→QUARANTINED, QUARANTINED→DEAD.
   *
   * @param {string} id     - Component identifier
   * @param {string} reason - Description of the failure
   * @returns {void}
   */
  reportFailure(id, reason = 'unspecified failure') {
    const cs = this._requireComponent(id);
    if (cs.state === STATE.DEAD) return; // terminal — no further signals

    cs.totalFailures++;
    cs.consecutiveFailures++;
    cs.circuitBreaker.recordFailure();
    cs.healthScore = Math.max(0, cs.healthScore - PSI ** fib(3)); // degrade by ψ³≈0.236

    this._log('warn', `Failure reported`, { id, reason, consecutiveFailures: cs.consecutiveFailures, state: cs.state });

    switch (cs.state) {
      case STATE.HEALTHY:
      case STATE.RESTORED:
        // First sign of trouble — move to SUSPECT
        this._transition(cs, STATE.SUSPECT, `Failure detected: ${reason}`);
        break;

      case STATE.SUSPECT:
        if (cs.consecutiveFailures >= QUARANTINE_FAILURE_THRESHOLD) {
          cs.circuitBreaker.trip();
          this._transition(cs, STATE.QUARANTINED, `Confirmed failure after ${cs.consecutiveFailures} consecutive failures (≥ fib(5)=${QUARANTINE_FAILURE_THRESHOLD}): ${reason}`);
          this._initiateRecovery(cs);
        }
        break;

      case STATE.QUARANTINED:
      case STATE.RECOVERING:
        // Failure during recovery — handled by the recovery protocol itself
        this._log('debug', `Failure signal while ${cs.state} — deferred to recovery protocol`, { id });
        break;

      case STATE.DEGRADED:
        // Degraded components track failures but don't auto-escalate beyond QUARANTINE
        if (cs.consecutiveFailures >= QUARANTINE_FAILURE_THRESHOLD) {
          cs.circuitBreaker.trip();
          this._transition(cs, STATE.QUARANTINED, `Degraded component confirmed failed: ${reason}`);
          this._initiateRecovery(cs);
        }
        break;

      default:
        break;
    }
  }

  /**
   * Reports a drift detection signal. Checks coherence against baseline
   * using the component's {@link DriftDetector}.
   *
   * @param {string}   id            - Component identifier
   * @param {number[]} currentVector - Current embedding snapshot
   * @returns {void}
   */
  reportDrift(id, currentVector) {
    const cs = this._requireComponent(id);
    if (cs.state === STATE.DEAD) return;

    const { score, isDrift } = cs.driftDetector.check(currentVector);
    cs.driftScore = score;

    if (isDrift) {
      this._log('warn', `Drift detected`, { id, driftScore: score.toFixed(4), threshold: ANOMALY_DRIFT_THRESHOLD.toFixed(4) });
      this.emit('anomaly:detected', { componentId: id, driftScore: score, threshold: ANOMALY_DRIFT_THRESHOLD });

      if (cs.state === STATE.HEALTHY || cs.state === STATE.RESTORED) {
        this._transition(cs, STATE.SUSPECT, `Drift score ${score.toFixed(4)} < threshold ${ANOMALY_DRIFT_THRESHOLD.toFixed(4)}`);
      }
    } else if (cs.state === STATE.SUSPECT && score >= ANOMALY_DRIFT_THRESHOLD) {
      // False alarm resolved
      cs.consecutiveFailures = 0;
      cs.healthScore = Math.min(1.0, cs.healthScore + PSI ** fib(4)); // recover ψ⁴≈0.146
      this._transition(cs, STATE.HEALTHY, `False alarm resolved — drift score ${score.toFixed(4)} returned above threshold`);
    }
  }

  /**
   * Reports a health check result (pass/fail) for a component.
   * Used during the RECOVERING → RESTORED transition via canary validation.
   *
   * @param {string}  id       - Component identifier
   * @param {boolean} passed   - Whether the health check passed
   * @param {number}  [score]  - Optional numeric health score [0, 1]
   * @returns {void}
   */
  reportHealthCheck(id, passed, score = passed ? 1.0 : 0.0) {
    const cs = this._requireComponent(id);
    if (cs.state === STATE.DEAD) return;

    cs.attestationGate.submitCanaryResult(passed ? 1.0 : 0.0);
    cs.healthScore = score;

    if (passed) {
      cs.circuitBreaker.recordSuccess();
      cs.consecutiveFailures = 0;
    }

    this._log('debug', `Health check reported`, { id, passed, score: score.toFixed(4), state: cs.state });
  }

  /**
   * Manually places a component into DEGRADED mode (partial function).
   *
   * @param {string} id
   * @param {string} [reason]
   * @returns {void}
   */
  setDegraded(id, reason = 'manual degradation') {
    const cs = this._requireComponent(id);
    if (cs.state === STATE.DEAD) return;
    this._transition(cs, STATE.DEGRADED, reason);
  }

  /**
   * Manually triggers a recovery cycle for a QUARANTINED or DEGRADED component.
   *
   * @param {string} id
   * @returns {void}
   */
  triggerRecovery(id) {
    const cs = this._requireComponent(id);
    if (cs.state !== STATE.QUARANTINED && cs.state !== STATE.DEGRADED) {
      this._log('warn', `triggerRecovery called on component not in QUARANTINED/DEGRADED state`, { id, state: cs.state });
      return;
    }
    this._initiateRecovery(cs);
  }

  /**
   * Runs attestation for a RECOVERING component and, if passed, transitions
   * it to RESTORED.
   *
   * @param {string}   id              - Component identifier
   * @param {number[]} currentVector   - Current embedding for coherence check
   * @returns {{ passed: boolean, reason: string }}
   */
  runAttestation(id, currentVector) {
    const cs = this._requireComponent(id);

    if (cs.state !== STATE.RECOVERING) {
      return { passed: false, reason: `Component ${id} is not in RECOVERING state (current: ${cs.state})` };
    }

    const { score } = cs.driftDetector.check(currentVector);
    cs.driftScore = score;

    const attestation = cs.attestationGate.evaluate(score);

    if (attestation.passed) {
      cs.driftDetector.updateBaseline(currentVector);
      this._transition(cs, STATE.RESTORED, `Attestation passed: ${attestation.reason}`);
      this.emit('attestation:passed', { componentId: id, gatedScore: attestation.gatedScore, reason: attestation.reason });
      // Schedule final RESTORED → HEALTHY transition after canary window
      this._scheduleRestoration(cs);
    } else {
      this._log('warn', `Attestation failed`, { id, reason: attestation.reason });
    }

    return { passed: attestation.passed, reason: attestation.reason };
  }

  // ─── Internal State Machine ────────────────────────────────────────────────

  /**
   * Executes a state transition, logs it, and emits the state:changed event.
   *
   * @private
   * @param {ComponentState} cs
   * @param {string} toState
   * @param {string} reason
   * @returns {void}
   */
  _transition(cs, toState, reason) {
    const fromState = cs.state;
    if (fromState === toState) return; // no-op

    cs.state = toState;
    cs.recordTransition(fromState, toState, reason);

    const logLevel = toState === STATE.DEAD ? 'error'
      : toState === STATE.QUARANTINED ? 'error'
      : toState === STATE.SUSPECT ? 'warn'
      : 'info';

    this._log(logLevel, `State transition: ${fromState} → ${toState}`, {
      componentId: cs.id,
      type:        cs.type,
      from:        fromState,
      to:          toState,
      reason,
      at:          new Date(cs.lastTransitionAt).toISOString(),
    });

    this.emit('state:changed', {
      componentId: cs.id,
      type:        cs.type,
      from:        fromState,
      to:          toState,
      reason,
      at:          cs.lastTransitionAt,
    });

    // Emit focused events for specific transitions
    if (toState === STATE.QUARANTINED) {
      this.emit('quarantine:entered', { componentId: cs.id, type: cs.type, reason, at: cs.lastTransitionAt });
    }
    if (toState === STATE.DEAD) {
      this.emit('component:dead', { componentId: cs.id, type: cs.type, reason, at: cs.lastTransitionAt });
    }
  }

  /**
   * Initiates the recovery protocol for a QUARANTINED component.
   * Transitions to RECOVERING and schedules the first phi-backoff retry.
   *
   * @private
   * @param {ComponentState} cs
   * @returns {void}
   */
  _initiateRecovery(cs) {
    if (cs.state === STATE.DEAD) return;

    // Enforce cooldown between recovery cycles
    if (cs.recoveryProtocol.isInCooldown()) {
      this._log('info', `Recovery deferred — cooldown active`, {
        id: cs.id,
        cooldownUntil: cs.recoveryProtocol.summary().cooldownUntil,
      });
      return;
    }

    if (!cs.recoveryProtocol.hasAttemptsRemaining()) {
      // Exhausted all recovery attempts
      this._transition(cs, STATE.DEAD, `Max recovery attempts exhausted (fib(6)=${MAX_RECOVERY_ATTEMPTS})`);
      return;
    }

    this._transition(cs, STATE.RECOVERING, `Recovery initiated (attempt ${cs.recoveryProtocol._attempt + 1}/${MAX_RECOVERY_ATTEMPTS})`);
    this.emit('recovery:started', {
      componentId: cs.id,
      attempt:     cs.recoveryProtocol._attempt,
      maxAttempts: MAX_RECOVERY_ATTEMPTS,
      at:          Date.now(),
    });
    cs.attestationGate.reset();

    this._scheduleRecoveryAttempt(cs);
  }

  /**
   * Schedules the next phi-backoff recovery attempt.
   *
   * @private
   * @param {ComponentState} cs
   * @returns {void}
   */
  _scheduleRecoveryAttempt(cs) {
    const { delayMs, attempt, exhausted } = cs.recoveryProtocol.nextDelay();

    if (exhausted) {
      this._transition(cs, STATE.DEAD, `Max recovery attempts exhausted (fib(6)=${MAX_RECOVERY_ATTEMPTS})`);
      return;
    }

    this._log('info', `Recovery attempt ${attempt + 1}/${MAX_RECOVERY_ATTEMPTS} scheduled`, {
      id: cs.id,
      delayMs,
      backoffSequence: PHI_BACKOFF_SEQUENCE,
    });

    const timer = setTimeout(() => {
      this._recoveryTimers.delete(cs.id);
      this._executeRecoveryAttempt(cs, attempt);
    }, delayMs);

    // Allow the process to exit if this is the only outstanding timer
    if (timer.unref) timer.unref();
    this._recoveryTimers.set(cs.id, timer);
  }

  /**
   * Executes one recovery attempt. Emits recovery:succeeded or recovery:failed.
   * In production, override this method or listen to events to inject real
   * restart / respawn logic.
   *
   * @private
   * @param {ComponentState} cs
   * @param {number} attempt
   * @returns {void}
   */
  _executeRecoveryAttempt(cs, attempt) {
    if (cs.state !== STATE.RECOVERING) return; // state may have changed

    this._log('info', `Executing recovery attempt ${attempt + 1}`, { id: cs.id });

    // Emit event so external handlers can perform the actual restart/respawn
    this.emit('recovery:attempt', {
      componentId: cs.id,
      type:        cs.type,
      attempt,
      maxAttempts: MAX_RECOVERY_ATTEMPTS,
      at:          Date.now(),
      /**
       * Callback to report the result back to the lifecycle.
       * Call `resolve(true)` on success, `resolve(false)` on failure.
       * @param {boolean} success
       */
      resolve: (success) => {
        if (success) {
          this._onRecoveryAttemptSuccess(cs, attempt);
        } else {
          this._onRecoveryAttemptFailure(cs, attempt);
        }
      },
    });
  }

  /**
   * Handles a successful recovery attempt — moves to RESTORED pending attestation.
   *
   * @private
   * @param {ComponentState} cs
   * @param {number} attempt
   * @returns {void}
   */
  _onRecoveryAttemptSuccess(cs, attempt) {
    if (cs.state !== STATE.RECOVERING) return;

    cs.consecutiveFailures = 0;
    cs.circuitBreaker.recordSuccess();
    cs.healthScore = Math.min(1.0, cs.healthScore + PSI); // boost by ψ≈0.618

    this.emit('recovery:succeeded', {
      componentId: cs.id,
      attempt,
      at:          Date.now(),
    });

    this._log('info', `Recovery attempt ${attempt + 1} succeeded — awaiting attestation`, { id: cs.id });

    // Transition to RESTORED; full HEALTHY restoration requires attestation
    this._transition(cs, STATE.RESTORED, `Recovery attempt ${attempt + 1} succeeded`);
    this._scheduleRestoration(cs);
  }

  /**
   * Handles a failed recovery attempt — retries with next phi-backoff step
   * or escalates to DEAD.
   *
   * @private
   * @param {ComponentState} cs
   * @param {number} attempt
   * @returns {void}
   */
  _onRecoveryAttemptFailure(cs, attempt) {
    if (cs.state !== STATE.RECOVERING) return;

    cs.totalFailures++;
    cs.circuitBreaker.recordFailure();
    cs.healthScore = Math.max(0, cs.healthScore - PSI ** fib(3));

    this.emit('recovery:failed', {
      componentId: cs.id,
      attempt,
      attemptsRemaining: MAX_RECOVERY_ATTEMPTS - attempt - 1,
      at:          Date.now(),
    });

    this._log('warn', `Recovery attempt ${attempt + 1} failed`, {
      id: cs.id,
      attemptsRemaining: MAX_RECOVERY_ATTEMPTS - attempt - 1,
    });

    if (!cs.recoveryProtocol.hasAttemptsRemaining()) {
      // Mark DEAD before transitioning back through QUARANTINED
      cs.recoveryProtocol.startCooldown();
      this._transition(cs, STATE.DEAD, `All ${MAX_RECOVERY_ATTEMPTS} recovery attempts (fib(6)) exhausted`);
    } else {
      // Back to QUARANTINED, then retry with next phi-backoff step
      this._transition(cs, STATE.QUARANTINED, `Recovery attempt ${attempt + 1} failed — requeuing`);
      this._scheduleRecoveryAttempt(cs);
    }
  }

  /**
   * Schedules the canary validation window after a component reaches RESTORED.
   * After the window, runs attestation automatically (if a baseline vector is set).
   *
   * @private
   * @param {ComponentState} cs
   * @returns {void}
   */
  _scheduleRestoration(cs) {
    if (cs.state !== STATE.RESTORED) return;

    this._log('info', `Canary validation window started (${CANARY_VALIDATION_MS}ms)`, { id: cs.id });

    const timer = setTimeout(() => {
      this._recoveryTimers.delete(cs.id);
      if (cs.state !== STATE.RESTORED) return;

      // If no drift detector baseline is set, grant HEALTHY directly
      if (!cs.driftDetector._baseline) {
        cs.totalRecoveries++;
        cs.recoveryProtocol.reset();
        cs.healthScore = 1.0;
        this._transition(cs, STATE.HEALTHY, 'Canary window passed — no baseline for attestation; granting HEALTHY');
        return;
      }

      // Attempt auto-attestation using the last known drift score as proxy
      const proxyScore = cs.driftScore;
      const attestation = cs.attestationGate.evaluate(proxyScore);

      if (attestation.passed) {
        cs.totalRecoveries++;
        cs.recoveryProtocol.reset();
        cs.healthScore = 1.0;
        this._transition(cs, STATE.HEALTHY, `Attestation passed after canary window: ${attestation.reason}`);
        this.emit('attestation:passed', {
          componentId:  cs.id,
          gatedScore:   attestation.gatedScore,
          reason:       attestation.reason,
        });
      } else {
        this._log('warn', `Attestation failed after canary window — re-quarantining`, { id: cs.id, reason: attestation.reason });
        this._transition(cs, STATE.QUARANTINED, `Attestation failed after canary window: ${attestation.reason}`);
        this._initiateRecovery(cs);
      }
    }, CANARY_VALIDATION_MS);

    if (timer.unref) timer.unref();
    this._recoveryTimers.set(cs.id, timer);
  }

  // ─── Drift Check Timer ─────────────────────────────────────────────────────

  /**
   * Starts the periodic drift check timer for a component.
   * Fires every {@link DRIFT_CHECK_INTERVAL_MS} ms.
   *
   * @private
   * @param {string} id
   * @returns {void}
   */
  _startDriftTimer(id) {
    this._clearDriftTimer(id);
    const interval = setInterval(() => {
      const cs = this._components.get(id);
      if (!cs || cs.state === STATE.DEAD) {
        this._clearDriftTimer(id);
        return;
      }
      // Emit a drift:check event so the host can provide the current embedding
      this.emit('drift:check', {
        componentId: id,
        type:        cs.type,
        state:       cs.state,
        at:          Date.now(),
        /**
         * Provide the current embedding vector to perform the drift check.
         * @param {number[]} vector
         */
        provide: (vector) => this.reportDrift(id, vector),
      });
    }, this._driftCheckIntervalMs);

    if (interval.unref) interval.unref();
    this._driftTimers.set(id, interval);
  }

  /**
   * @private
   * @param {string} id
   */
  _clearDriftTimer(id) {
    const t = this._driftTimers.get(id);
    if (t) { clearInterval(t); this._driftTimers.delete(id); }
  }

  /**
   * @private
   * @param {string} id
   */
  _clearRecoveryTimer(id) {
    const t = this._recoveryTimers.get(id);
    if (t) { clearTimeout(t); this._recoveryTimers.delete(id); }
  }

  /**
   * Clears all timers for a component.
   * @private
   * @param {string} id
   */
  _clearTimers(id) {
    this._clearDriftTimer(id);
    this._clearRecoveryTimer(id);
  }

  /**
   * Looks up a component by id, throwing if not found.
   * @private
   * @param {string} id
   * @returns {ComponentState}
   */
  _requireComponent(id) {
    const cs = this._components.get(id);
    if (!cs) throw new Error(`SelfHealingLifecycle: unknown component "${id}"`);
    return cs;
  }

  // ─── Shutdown ──────────────────────────────────────────────────────────────

  /**
   * Gracefully shuts down the lifecycle manager, clearing all timers.
   * @returns {void}
   */
  shutdown() {
    for (const id of this._components.keys()) {
      this._clearTimers(id);
    }
    this._log('info', 'SelfHealingLifecycle shutdown complete', {
      componentCount: this._components.size,
    });
  }

  // ─── Diagnostics ───────────────────────────────────────────────────────────

  /**
   * Returns a fleet-wide health summary, using phi-weighted priority scoring
   * to compute an aggregate health index.
   *
   * @returns {{ totalComponents: number, byState: Object<string, number>, healthIndex: number, components: Object[] }}
   */
  fleetHealth() {
    const all = Array.from(this._components.values());
    const byState = {};
    for (const s of Object.values(STATE)) byState[s] = 0;
    for (const cs of all) byState[cs.state]++;

    // Compute fleet health index: phi-weighted fusion of individual health scores,
    // but penalise DEAD/QUARANTINED heavily using PRESSURE_LEVELS thresholds.
    const scores = all.map(cs => {
      if (cs.state === STATE.DEAD)        return 0;
      if (cs.state === STATE.QUARANTINED) return PRESSURE_LEVELS.NOMINAL_MAX;  // ≈0.382
      if (cs.state === STATE.RECOVERING)  return PRESSURE_LEVELS.ELEVATED_MAX; // ≈0.618
      if (cs.state === STATE.SUSPECT)     return cs.healthScore * CSL_THRESHOLDS.MEDIUM;
      if (cs.state === STATE.DEGRADED)    return cs.healthScore * CSL_THRESHOLDS.LOW;
      return cs.healthScore; // HEALTHY / RESTORED
    });

    const healthIndex = scores.length > 0
      ? phiPriorityScore(...scores) / (scores.length > 1 ? scores.length / PHI : 1)
      : 1.0;

    return {
      totalComponents: all.length,
      byState,
      healthIndex: Math.max(0, Math.min(1, healthIndex)),
      components:  all.map(cs => cs.snapshot()),
    };
  }

  /**
   * Returns the phi-backoff sequence for inspection / documentation.
   * @returns {number[]}
   */
  getBackoffSequence() {
    return PHI_BACKOFF_SEQUENCE.slice();
  }

  /**
   * Returns Fibonacci pool sizes for component instance management.
   * @returns {number[]}
   */
  getFibonacciPools() {
    return FIBONACCI_POOLS.slice();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  SelfHealingLifecycle,
  ComponentState,
  RecoveryProtocol,
  CircuitBreaker,
  DriftDetector,
  AttestationGate,
  STATE,
  COMPONENT_TYPE,

  // Phi-derived thresholds (re-exported for consumers)
  ANOMALY_DRIFT_THRESHOLD,
  ATTESTATION_PASS_THRESHOLD,
  QUARANTINE_FAILURE_THRESHOLD,
  MAX_RECOVERY_ATTEMPTS,
  CIRCUIT_HALF_OPEN_AFTER_MS,
  DRIFT_CHECK_INTERVAL_MS,
  RECOVERY_COOLDOWN_MS,
  CANARY_VALIDATION_MS,
  MAX_HISTORY_SIZE,

  // Sequence constants
  PHI_BACKOFF_SEQUENCE,
  FIBONACCI_POOLS,
};
