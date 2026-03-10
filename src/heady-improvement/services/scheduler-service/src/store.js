'use strict';

/**
 * Persistent job state store.
 * Tracks last-run, next-run, run-count, and failure-count for each job.
 */
class JobStore {
  constructor() {
    /** @type {Map<string, object>} */
    this._state = new Map();
  }

  /**
   * Initialize state for a job.
   *
   * @param {string} jobId
   * @param {object} initial
   */
  init(jobId, initial = {}) {
    if (this._state.has(jobId)) return;
    this._state.set(jobId, {
      lastRun: null,
      nextRun: initial.nextRun || null,
      runCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      lastError: null,
      status: 'idle',
      createdAt: new Date().toISOString(),
      ...initial,
    });
  }

  /**
   * Get the state for a job.
   *
   * @param {string} jobId
   * @returns {object|undefined}
   */
  get(jobId) {
    return this._state.get(jobId);
  }

  /**
   * Record a successful run.
   *
   * @param {string} jobId
   * @param {string|null} nextRun — ISO timestamp of next run
   */
  recordSuccess(jobId, nextRun) {
    const state = this._state.get(jobId);
    if (!state) return;
    state.lastRun = new Date().toISOString();
    state.nextRun = nextRun;
    state.runCount++;
    state.consecutiveFailures = 0;
    state.lastError = null;
    state.status = 'idle';
  }

  /**
   * Record a failed run.
   *
   * @param {string} jobId
   * @param {string} error — error message
   * @param {string|null} nextRun — ISO timestamp of retry
   */
  recordFailure(jobId, error, nextRun) {
    const state = this._state.get(jobId);
    if (!state) return;
    state.lastRun = new Date().toISOString();
    state.nextRun = nextRun;
    state.runCount++;
    state.failureCount++;
    state.consecutiveFailures++;
    state.lastError = error;
    state.status = 'idle';
  }

  /**
   * Mark a job as currently running.
   *
   * @param {string} jobId
   */
  markRunning(jobId) {
    const state = this._state.get(jobId);
    if (state) state.status = 'running';
  }

  /**
   * Mark a job's circuit breaker as open.
   *
   * @param {string} jobId
   */
  markCircuitOpen(jobId) {
    const state = this._state.get(jobId);
    if (state) state.status = 'circuit-open';
  }

  /**
   * Mark a job's circuit breaker as half-open.
   *
   * @param {string} jobId
   */
  markCircuitHalfOpen(jobId) {
    const state = this._state.get(jobId);
    if (state) state.status = 'circuit-half-open';
  }

  /**
   * Reset consecutive failures (circuit closed).
   *
   * @param {string} jobId
   */
  resetCircuit(jobId) {
    const state = this._state.get(jobId);
    if (state) {
      state.consecutiveFailures = 0;
      state.status = 'idle';
    }
  }

  /**
   * Get all job states.
   * @returns {object[]}
   */
  getAll() {
    const result = [];
    for (const [id, state] of this._state) {
      result.push({ id, ...state });
    }
    return result;
  }

  /**
   * Remove a job.
   * @param {string} jobId
   */
  remove(jobId) {
    this._state.delete(jobId);
  }
}

module.exports = {
  JobStore,
};
