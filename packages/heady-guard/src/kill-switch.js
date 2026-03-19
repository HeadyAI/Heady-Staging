/**
 * © 2026 HeadySystems Inc. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * KillSwitch — Enterprise emergency shutdown protocol.
 *
 * Implements a three-phase kill-switch:
 *   1. ARM   — configure trigger thresholds and callbacks
 *   2. CHECK — evaluate live metrics against armed thresholds
 *   3. EXECUTE — flatten-and-sever (close positions, cancel orders, revoke tokens)
 *
 * All state transitions emit events for audit trail integration.
 */

'use strict';

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ─── Kill-switch states ──────────────────────────────────────────────────────
const KillSwitchState = Object.freeze({
  DISARMED:   'DISARMED',
  ARMED:      'ARMED',
  TRIGGERED:  'TRIGGERED',
  EXECUTING:  'EXECUTING',
  EXECUTED:   'EXECUTED',
  FAILED:     'FAILED',
});

// ─── Default thresholds ──────────────────────────────────────────────────────
const DEFAULT_THRESHOLDS = {
  errorRate:          0.25,   // 25% error rate triggers
  latencyP99Ms:       5000,   // 5s p99 latency triggers
  budgetExceeded:     true,   // budget breach triggers
  hallucinationRate:  0.15,   // 15% hallucination rate triggers
  memoryUsagePct:     0.95,   // 95% memory usage triggers
  consecutiveFailures: 10,    // 10 consecutive failures triggers
};

class KillSwitch extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {object} [options.thresholds]       - Override default thresholds
   * @param {Function[]} [options.onExecute]    - Callbacks invoked during execute()
   * @param {number} [options.cooldownMs]       - Minimum ms between executions (default 30000)
   * @param {boolean} [options.autoRearm]       - Re-arm automatically after cooldown (default false)
   */
  constructor(options = {}) {
    super();

    this._id = `ks-${crypto.randomBytes(4).toString('hex')}`;
    this._state = KillSwitchState.DISARMED;
    this._thresholds = { ...DEFAULT_THRESHOLDS };
    this._executeCallbacks = options.onExecute || [];
    this._cooldownMs = options.cooldownMs || 30_000;
    this._autoRearm = options.autoRearm || false;

    this._lastExecutionAt = null;
    this._triggerHistory = [];
    this._executionLog = [];
    this._checkCount = 0;
    this._breachCount = 0;

    // Sever targets registry: each entry = { name, handler: async () => result }
    this._severTargets = new Map();

    if (options.thresholds) {
      this.arm(options.thresholds);
    }
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  get id() { return this._id; }
  get state() { return this._state; }
  get isArmed() { return this._state === KillSwitchState.ARMED; }
  get isTriggered() { return this._state === KillSwitchState.TRIGGERED || this._state === KillSwitchState.EXECUTING; }
  get thresholds() { return { ...this._thresholds }; }

  get stats() {
    return {
      id: this._id,
      state: this._state,
      checkCount: this._checkCount,
      breachCount: this._breachCount,
      lastExecutionAt: this._lastExecutionAt,
      triggerHistoryLength: this._triggerHistory.length,
      executionLogLength: this._executionLog.length,
      severTargetCount: this._severTargets.size,
    };
  }

  // ─── ARM ─────────────────────────────────────────────────────────────────────

  /**
   * Configure trigger thresholds and transition to ARMED state.
   *
   * @param {object} config - Threshold overrides (merged with defaults)
   * @param {number} [config.errorRate]
   * @param {number} [config.latencyP99Ms]
   * @param {boolean} [config.budgetExceeded]
   * @param {number} [config.hallucinationRate]
   * @param {number} [config.memoryUsagePct]
   * @param {number} [config.consecutiveFailures]
   * @returns {KillSwitch} this (for chaining)
   */
  arm(config = {}) {
    const previousState = this._state;

    // Merge provided config over defaults
    for (const [key, value] of Object.entries(config)) {
      if (key in this._thresholds) {
        this._thresholds[key] = value;
      }
    }

    this._state = KillSwitchState.ARMED;

    this.emit('state:change', {
      id: this._id,
      from: previousState,
      to: KillSwitchState.ARMED,
      thresholds: { ...this._thresholds },
      timestamp: Date.now(),
    });

    this.emit('armed', {
      id: this._id,
      thresholds: { ...this._thresholds },
      timestamp: Date.now(),
    });

    return this;
  }

  /**
   * Transition to DISARMED state.
   * @returns {KillSwitch} this
   */
  disarm() {
    const previousState = this._state;
    this._state = KillSwitchState.DISARMED;

    this.emit('state:change', {
      id: this._id,
      from: previousState,
      to: KillSwitchState.DISARMED,
      timestamp: Date.now(),
    });

    this.emit('disarmed', {
      id: this._id,
      timestamp: Date.now(),
    });

    return this;
  }

  // ─── SEVER TARGETS ──────────────────────────────────────────────────────────

  /**
   * Register a sever target — an async function called during execute().
   *
   * @param {string} name     - Target name (e.g. 'positions', 'orders', 'tokens')
   * @param {Function} handler - async () => { severed: boolean, detail: string }
   * @returns {KillSwitch} this
   */
  registerSeverTarget(name, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`Sever target handler for "${name}" must be a function`);
    }
    this._severTargets.set(name, handler);

    this.emit('sever-target:registered', {
      id: this._id,
      target: name,
      totalTargets: this._severTargets.size,
      timestamp: Date.now(),
    });

    return this;
  }

  /**
   * Remove a sever target.
   * @param {string} name
   * @returns {boolean} whether it was removed
   */
  removeSeverTarget(name) {
    return this._severTargets.delete(name);
  }

  // ─── CHECK ───────────────────────────────────────────────────────────────────

  /**
   * Evaluate live metrics against armed thresholds.
   * If any threshold is breached, transitions to TRIGGERED and returns the breach report.
   *
   * @param {object} metrics
   * @param {number} [metrics.errorRate]           - Current error rate (0–1)
   * @param {number} [metrics.latencyP99Ms]        - Current p99 latency in ms
   * @param {boolean} [metrics.budgetExceeded]     - Whether budget has been exceeded
   * @param {number} [metrics.hallucinationRate]   - Current hallucination rate (0–1)
   * @param {number} [metrics.memoryUsagePct]      - Current memory usage (0–1)
   * @param {number} [metrics.consecutiveFailures] - Current consecutive failure count
   * @returns {{ triggered: boolean, breaches: Array, checkId: string }}
   */
  check(metrics = {}) {
    this._checkCount++;

    if (this._state !== KillSwitchState.ARMED) {
      return {
        triggered: false,
        breaches: [],
        checkId: `chk-${this._checkCount}`,
        reason: `KillSwitch is ${this._state}, not ARMED`,
      };
    }

    const checkId = `chk-${this._id}-${this._checkCount}`;
    const breaches = [];

    // Evaluate each threshold
    if (metrics.errorRate !== undefined && metrics.errorRate >= this._thresholds.errorRate) {
      breaches.push({
        metric: 'errorRate',
        value: metrics.errorRate,
        threshold: this._thresholds.errorRate,
      });
    }

    if (metrics.latencyP99Ms !== undefined && metrics.latencyP99Ms >= this._thresholds.latencyP99Ms) {
      breaches.push({
        metric: 'latencyP99Ms',
        value: metrics.latencyP99Ms,
        threshold: this._thresholds.latencyP99Ms,
      });
    }

    if (metrics.budgetExceeded !== undefined && metrics.budgetExceeded === true && this._thresholds.budgetExceeded === true) {
      breaches.push({
        metric: 'budgetExceeded',
        value: true,
        threshold: true,
      });
    }

    if (metrics.hallucinationRate !== undefined && metrics.hallucinationRate >= this._thresholds.hallucinationRate) {
      breaches.push({
        metric: 'hallucinationRate',
        value: metrics.hallucinationRate,
        threshold: this._thresholds.hallucinationRate,
      });
    }

    if (metrics.memoryUsagePct !== undefined && metrics.memoryUsagePct >= this._thresholds.memoryUsagePct) {
      breaches.push({
        metric: 'memoryUsagePct',
        value: metrics.memoryUsagePct,
        threshold: this._thresholds.memoryUsagePct,
      });
    }

    if (metrics.consecutiveFailures !== undefined && metrics.consecutiveFailures >= this._thresholds.consecutiveFailures) {
      breaches.push({
        metric: 'consecutiveFailures',
        value: metrics.consecutiveFailures,
        threshold: this._thresholds.consecutiveFailures,
      });
    }

    const triggered = breaches.length > 0;

    if (triggered) {
      this._breachCount++;
      this._state = KillSwitchState.TRIGGERED;

      const triggerRecord = {
        checkId,
        breaches,
        metrics: { ...metrics },
        timestamp: Date.now(),
      };

      this._triggerHistory.push(triggerRecord);

      this.emit('state:change', {
        id: this._id,
        from: KillSwitchState.ARMED,
        to: KillSwitchState.TRIGGERED,
        checkId,
        timestamp: Date.now(),
      });

      this.emit('triggered', triggerRecord);
    }

    this.emit('check', {
      checkId,
      triggered,
      breachCount: breaches.length,
      metrics: { ...metrics },
      timestamp: Date.now(),
    });

    return { triggered, breaches, checkId };
  }

  // ─── EXECUTE ─────────────────────────────────────────────────────────────────

  /**
   * Flatten-and-sever: execute the kill-switch protocol.
   *
   * Sequence:
   *   1. Close positions (registered sever targets)
   *   2. Cancel pending orders
   *   3. Revoke active tokens / sessions
   *   4. Run registered onExecute callbacks
   *   5. Transition to EXECUTED or FAILED
   *
   * @returns {Promise<{ executionId: string, results: Array, success: boolean, duration: number }>}
   */
  async execute() {
    if (this._state !== KillSwitchState.TRIGGERED && this._state !== KillSwitchState.ARMED) {
      const err = new Error(`Cannot execute kill-switch in state ${this._state}. Must be TRIGGERED or ARMED.`);
      this.emit('error', err);
      throw err;
    }

    // Cooldown guard
    if (this._lastExecutionAt && (Date.now() - this._lastExecutionAt) < this._cooldownMs) {
      const remaining = this._cooldownMs - (Date.now() - this._lastExecutionAt);
      const err = new Error(`Kill-switch cooldown active. ${remaining}ms remaining.`);
      this.emit('error', err);
      throw err;
    }

    const executionId = `exec-${this._id}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const startAt = Date.now();

    this._state = KillSwitchState.EXECUTING;
    this.emit('state:change', {
      id: this._id,
      from: KillSwitchState.TRIGGERED,
      to: KillSwitchState.EXECUTING,
      executionId,
      timestamp: startAt,
    });

    this.emit('executing', { executionId, timestamp: startAt });

    const results = [];
    let allSucceeded = true;

    // Phase 1: Execute all sever targets
    for (const [name, handler] of this._severTargets) {
      try {
        const result = await handler();
        results.push({
          phase: 'sever',
          target: name,
          success: true,
          result,
          timestamp: Date.now(),
        });

        this.emit('sever:complete', {
          executionId,
          target: name,
          success: true,
          result,
          timestamp: Date.now(),
        });
      } catch (err) {
        allSucceeded = false;
        results.push({
          phase: 'sever',
          target: name,
          success: false,
          error: err.message,
          timestamp: Date.now(),
        });

        this.emit('sever:failed', {
          executionId,
          target: name,
          error: err.message,
          timestamp: Date.now(),
        });
      }
    }

    // Phase 2: Execute onExecute callbacks
    for (let i = 0; i < this._executeCallbacks.length; i++) {
      try {
        const result = await this._executeCallbacks[i]({ executionId, results });
        results.push({
          phase: 'callback',
          index: i,
          success: true,
          result,
          timestamp: Date.now(),
        });
      } catch (err) {
        allSucceeded = false;
        results.push({
          phase: 'callback',
          index: i,
          success: false,
          error: err.message,
          timestamp: Date.now(),
        });
      }
    }

    // Finalize
    const duration = Date.now() - startAt;
    this._lastExecutionAt = Date.now();

    const finalState = allSucceeded ? KillSwitchState.EXECUTED : KillSwitchState.FAILED;
    this._state = finalState;

    const executionRecord = {
      executionId,
      results,
      success: allSucceeded,
      duration,
      timestamp: Date.now(),
    };

    this._executionLog.push(executionRecord);

    this.emit('state:change', {
      id: this._id,
      from: KillSwitchState.EXECUTING,
      to: finalState,
      executionId,
      duration,
      timestamp: Date.now(),
    });

    this.emit('executed', executionRecord);

    // Auto-rearm after cooldown if configured
    if (this._autoRearm) {
      setTimeout(() => {
        if (this._state === KillSwitchState.EXECUTED || this._state === KillSwitchState.FAILED) {
          this.arm(this._thresholds);
        }
      }, this._cooldownMs);
    }

    return executionRecord;
  }

  // ─── Introspection ──────────────────────────────────────────────────────────

  /**
   * Get the full trigger history.
   * @returns {Array}
   */
  getTriggerHistory() {
    return [...this._triggerHistory];
  }

  /**
   * Get the full execution log.
   * @returns {Array}
   */
  getExecutionLog() {
    return [...this._executionLog];
  }

  /**
   * Reset the kill-switch to DISARMED with cleared history.
   */
  reset() {
    const previousState = this._state;
    this._state = KillSwitchState.DISARMED;
    this._triggerHistory = [];
    this._executionLog = [];
    this._checkCount = 0;
    this._breachCount = 0;
    this._lastExecutionAt = null;

    this.emit('state:change', {
      id: this._id,
      from: previousState,
      to: KillSwitchState.DISARMED,
      reason: 'reset',
      timestamp: Date.now(),
    });

    this.emit('reset', { id: this._id, timestamp: Date.now() });
  }
}

module.exports = { KillSwitch, KillSwitchState, DEFAULT_THRESHOLDS };
