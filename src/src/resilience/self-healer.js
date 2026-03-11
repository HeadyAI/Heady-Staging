/**
 * @fileoverview Heady™ Self-Healer — Lifecycle State Machine + Quarantine + Restore
 *
 * Manages the health lifecycle of any Heady™ component (agent, worker, service,
 * tool connector, provider route). Integrates with CircuitBreaker and DriftDetector.
 *
 * Lifecycle states:
 *   HEALTHY     → normal operation
 *   SUSPECT     → early warning signals received
 *   QUARANTINED → isolated, no work dispatched
 *   RECOVERING  → active recovery in progress (phi-backoff probes)
 *   RESTORED    → attestation passed, returning to service
 *
 * Transition signals:
 *   HEALTHY    → SUSPECT     : health < HIGH threshold (≈ 0.882)
 *   SUSPECT    → QUARANTINED : health < LOW threshold  (≈ 0.691) OR circuit opens
 *   SUSPECT    → HEALTHY     : health recovers above CRITICAL (≈ 0.927)
 *   QUARANTINED→ RECOVERING  : after phi-backoff isolation period
 *   RECOVERING → RESTORED    : attestation probes (fib(4)=3) all pass
 *   RECOVERING → QUARANTINED : probe fails → re-quarantine
 *   RESTORED   → HEALTHY     : commit to healthy after fib(3)=2 stable cycles
 *   ANY        → QUARANTINED : manual quarantine() call
 *
 * © 2026-2026 HeadySystems Inc. All Rights Reserved.
 */

'use strict';

const {
  fib,
  PSI,
  PHI,
  CSL_THRESHOLDS,
  phiBackoffWithJitter,
  PHI_TIMING,
} = require('../../shared/phi-math.js');

// ─── Lifecycle states ─────────────────────────────────────────────────────────

const HEALTH_STATE = Object.freeze({
  HEALTHY:     'HEALTHY',
  SUSPECT:     'SUSPECT',
  QUARANTINED: 'QUARANTINED',
  RECOVERING:  'RECOVERING',
  RESTORED:    'RESTORED',
});

// ─── Threshold constants (all phi-math) ──────────────────────────────────────

/** Health → SUSPECT transition: CSL HIGH ≈ 0.882 */
const SUSPECT_THRESHOLD     = CSL_THRESHOLDS.HIGH;

/** SUSPECT → QUARANTINE transition: CSL LOW ≈ 0.691 */
const QUARANTINE_THRESHOLD  = CSL_THRESHOLDS.LOW;

/** Recovery → RESTORED: CSL CRITICAL ≈ 0.927 */
const RESTORE_THRESHOLD     = CSL_THRESHOLDS.CRITICAL;

/** SUSPECT → HEALTHY recovery: CSL CRITICAL ≈ 0.927 */
const RECOVER_HEALTHY_THRESHOLD = CSL_THRESHOLDS.CRITICAL;

/** Required attestation probe successes: fib(4) = 3 */
const ATTESTATION_PROBES    = fib(4);

/** Stable cycles before RESTORED → HEALTHY: fib(3) = 2 */
const STABLE_CYCLES         = fib(3);

/** Base isolation (quarantine) duration: PHI_TIMING.PHI_3 ≈ 4,236ms */
const ISOLATION_BASE_MS     = PHI_TIMING.PHI_3;

/** Max isolation duration: PHI_TIMING.PHI_7 ≈ 29,034ms */
const ISOLATION_MAX_MS      = PHI_TIMING.PHI_7;

// ─── SelfHealer class ─────────────────────────────────────────────────────────

/**
 * @class SelfHealer
 *
 * @example
 * const healer = new SelfHealer('embedding-worker-3', {
 *   circuitBreaker: myCircuitBreaker,
 *   onStateChange: (state, prev, reason) => logger.info({ state, prev, reason }),
 * });
 *
 * // Feed health signals from circuit breaker, drift detector, etc.
 * healer.signal(0.95);  // health score 0–1
 *
 * // Manual quarantine
 * healer.quarantine('OOM detected');
 *
 * // Attestation probe (call your real health-check function)
 * await healer.probe(() => fetch('/health').then(r => r.ok));
 */
class SelfHealer {
  /**
   * @param {string} name - component identifier
   * @param {object} [opts]
   * @param {object}   [opts.circuitBreaker]   - CircuitBreaker instance to integrate
   * @param {Function} [opts.onStateChange]    - callback(newState, prevState, reason)
   * @param {Function} [opts.onQuarantine]     - callback(name, reason)
   * @param {Function} [opts.onRestore]        - callback(name)
   * @param {number}   [opts.isolationBaseMs]  - quarantine duration base
   * @param {number}   [opts.isolationMaxMs]   - quarantine duration max
   */
  constructor(name, opts = {}) {
    this.name            = name;
    this.circuitBreaker  = opts.circuitBreaker  || null;
    this.onStateChange   = opts.onStateChange   || null;
    this.onQuarantine    = opts.onQuarantine    || null;
    this.onRestore       = opts.onRestore       || null;
    this.isolationBaseMs = opts.isolationBaseMs || ISOLATION_BASE_MS;
    this.isolationMaxMs  = opts.isolationMaxMs  || ISOLATION_MAX_MS;

    // State
    this._state           = HEALTH_STATE.HEALTHY;
    this._healthScore     = 1.0;
    this._isolationAttempt = 0;
    this._isolationEndsAt  = null;
    this._attestationPassed = 0;
    this._stableCycles     = 0;

    // History log (fib(9)=34 entries, ring buffer)
    this._historySize  = fib(9);
    this._history      = [];
    this._incidentCount = 0;
    this._stateEnteredAt = Date.now();
  }

  // ─── State accessors ───────────────────────────────────────────────────────

  get state() { return this._state; }
  get isHealthy() { return this._state === HEALTH_STATE.HEALTHY; }
  get isQuarantined() { return this._state === HEALTH_STATE.QUARANTINED; }
  get isRecovering() { return this._state === HEALTH_STATE.RECOVERING; }
  get canAcceptWork() {
    return this._state === HEALTH_STATE.HEALTHY ||
           this._state === HEALTH_STATE.RESTORED;
  }

  // ─── Transitions ──────────────────────────────────────────────────────────

  /**
   * @private
   */
  _transition(newState, reason = '') {
    const prev = this._state;
    if (prev === newState) return;

    this._state = newState;
    this._stateEnteredAt = Date.now();
    this._logEvent('transition', { from: prev, to: newState, reason });

    if (this.onStateChange) {
      try { this.onStateChange(newState, prev, reason); }
      catch (_) {}
    }

    if (newState === HEALTH_STATE.QUARANTINED && this.onQuarantine) {
      try { this.onQuarantine(this.name, reason); }
      catch (_) {}
    }

    if (newState === HEALTH_STATE.HEALTHY && this.onRestore) {
      try { this.onRestore(this.name); }
      catch (_) {}
    }
  }

  /**
   * @private
   * Schedule release from quarantine (phi-backoff based on isolation attempt).
   */
  _scheduleRelease() {
    const delay = phiBackoffWithJitter(
      this._isolationAttempt,
      this.isolationBaseMs,
      this.isolationMaxMs
    );
    this._isolationEndsAt = Date.now() + delay;
    this._logEvent('quarantine_scheduled', { delay, attempt: this._isolationAttempt });
  }

  /** @private */
  _logEvent(type, data = {}) {
    const entry = { ts: Date.now(), type, state: this._state, ...data };
    this._history.push(entry);
    if (this._history.length > this._historySize) this._history.shift();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Feed a health score (0–1) into the state machine.
   * Called by circuit breakers, drift detectors, load monitors, etc.
   *
   * @param {number} healthScore - 0 = fully failed, 1 = fully healthy
   * @param {string} [source]    - label for the signal source
   */
  signal(healthScore, source = 'unknown') {
    this._healthScore = healthScore;
    this._logEvent('signal', { score: healthScore, source });

    switch (this._state) {
      case HEALTH_STATE.HEALTHY:
        if (healthScore < SUSPECT_THRESHOLD) {
          this._incidentCount++;
          this._transition(HEALTH_STATE.SUSPECT, `score ${healthScore.toFixed(3)} < ${SUSPECT_THRESHOLD} from ${source}`);
        }
        break;

      case HEALTH_STATE.SUSPECT:
        if (healthScore < QUARANTINE_THRESHOLD) {
          this._isolationAttempt++;
          this._attestationPassed = 0;
          this._scheduleRelease();
          this._transition(HEALTH_STATE.QUARANTINED, `score ${healthScore.toFixed(3)} < ${QUARANTINE_THRESHOLD}`);
        } else if (healthScore >= RECOVER_HEALTHY_THRESHOLD) {
          this._transition(HEALTH_STATE.HEALTHY, `score ${healthScore.toFixed(3)} recovered`);
        }
        break;

      case HEALTH_STATE.QUARANTINED:
        // Check if isolation period has elapsed → move to RECOVERING
        if (this._isolationEndsAt && Date.now() >= this._isolationEndsAt) {
          this._attestationPassed = 0;
          this._transition(HEALTH_STATE.RECOVERING, 'isolation period elapsed');
        }
        break;

      case HEALTH_STATE.RECOVERING:
        // Recovering is driven by probe(), not signal()
        // But if health score is catastrophic, re-quarantine
        if (healthScore < QUARANTINE_THRESHOLD) {
          this._isolationAttempt++;
          this._attestationPassed = 0;
          this._scheduleRelease();
          this._transition(HEALTH_STATE.QUARANTINED, `score ${healthScore.toFixed(3)} deteriorated during recovery`);
        }
        break;

      case HEALTH_STATE.RESTORED:
        if (healthScore >= RECOVER_HEALTHY_THRESHOLD) {
          this._stableCycles++;
          if (this._stableCycles >= STABLE_CYCLES) {
            this._stableCycles = 0;
            this._isolationAttempt = 0;
            this._transition(HEALTH_STATE.HEALTHY, `${STABLE_CYCLES} stable cycles passed`);
          }
        } else if (healthScore < QUARANTINE_THRESHOLD) {
          this._stableCycles = 0;
          this._isolationAttempt++;
          this._scheduleRelease();
          this._transition(HEALTH_STATE.QUARANTINED, `score ${healthScore.toFixed(3)} regressed from RESTORED`);
        }
        break;
    }

    // Also check circuit breaker state if integrated
    this._syncCircuitBreaker();
  }

  /**
   * @private
   * If integrated circuit breaker is OPEN, force to QUARANTINED.
   */
  _syncCircuitBreaker() {
    if (!this.circuitBreaker) return;
    if (this.circuitBreaker.isOpen &&
        this._state !== HEALTH_STATE.QUARANTINED &&
        this._state !== HEALTH_STATE.RECOVERING) {
      this._isolationAttempt++;
      this._scheduleRelease();
      this._transition(HEALTH_STATE.QUARANTINED, 'circuit breaker OPEN');
    }
  }

  /**
   * Manually quarantine this component (for external events: OOM, OOD, etc.).
   * @param {string} [reason]
   */
  quarantine(reason = 'manual') {
    this._isolationAttempt++;
    this._attestationPassed = 0;
    this._scheduleRelease();
    this._transition(HEALTH_STATE.QUARANTINED, reason);
  }

  /**
   * Run an attestation probe function. Should return true if the component
   * is healthy enough to restore, false otherwise.
   *
   * Call repeatedly from RECOVERING state until ATTESTATION_PROBES pass.
   *
   * @param {function(): Promise<boolean>} probeFn - async attestation function
   * @returns {Promise<{passed: boolean, attestationPassed: number, needed: number}>}
   */
  async probe(probeFn) {
    if (this._state !== HEALTH_STATE.RECOVERING) {
      return { passed: false, attestationPassed: this._attestationPassed, needed: ATTESTATION_PROBES };
    }

    let passed = false;
    try {
      passed = !!(await probeFn());
    } catch (err) {
      this._logEvent('probe_error', { error: err.message });
      passed = false;
    }

    this._logEvent('probe', { passed, count: this._attestationPassed + 1 });

    if (passed) {
      this._attestationPassed++;
      if (this._attestationPassed >= ATTESTATION_PROBES) {
        this._stableCycles = 0;
        this._transition(HEALTH_STATE.RESTORED, `${ATTESTATION_PROBES} attestation probes passed`);
      }
    } else {
      // Failed probe → re-quarantine with longer backoff
      this._isolationAttempt++;
      this._attestationPassed = 0;
      this._scheduleRelease();
      this._transition(HEALTH_STATE.QUARANTINED, 'attestation probe failed');
    }

    return {
      passed,
      attestationPassed: this._attestationPassed,
      needed: ATTESTATION_PROBES,
    };
  }

  /**
   * Full status snapshot for monitoring / dashboards.
   * @returns {object}
   */
  status() {
    return {
      name:              this.name,
      state:             this._state,
      healthScore:       this._healthScore,
      canAcceptWork:     this.canAcceptWork,
      isolationAttempt:  this._isolationAttempt,
      isolationEndsIn:   this._isolationEndsAt
        ? Math.max(0, this._isolationEndsAt - Date.now())
        : null,
      attestationPassed: this._attestationPassed,
      attestationNeeded: ATTESTATION_PROBES,
      stableCycles:      this._stableCycles,
      stableCyclesNeeded: STABLE_CYCLES,
      stateEnteredAt:    this._stateEnteredAt,
      incidentCount:     this._incidentCount,
      recentHistory:     this._history.slice(-fib(6) /* 8 */),
    };
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  SelfHealer,
  HEALTH_STATE,
  SUSPECT_THRESHOLD,
  QUARANTINE_THRESHOLD,
  RESTORE_THRESHOLD,
  RECOVER_HEALTHY_THRESHOLD,
  ATTESTATION_PROBES,
  STABLE_CYCLES,
  ISOLATION_BASE_MS,
  ISOLATION_MAX_MS,
};
