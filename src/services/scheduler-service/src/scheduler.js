'use strict';

const { JobStore } = require('./store');

// φ-math constants
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;

// FIB[5] = 5 → max retries
const MAX_RETRIES = 5;

// FIB[6] = 8 → circuit breaker opens after 8 consecutive failures
const CIRCUIT_BREAKER_THRESHOLD = 8;

// PHI * 10s = ~16.18s → circuit half-open timeout
const CIRCUIT_HALF_OPEN_MS = Math.round(PHI * 10000);

/**
 * Compute phi-backoff delay for retry.
 *
 * @param {number} attempt — 0-based
 * @param {number} [baseMs=1000]
 * @param {number} [maxMs=60000]
 * @returns {number}
 */
function phiBackoff(attempt, baseMs = 1000, maxMs = 60000) {
  const raw = baseMs * Math.pow(PHI, attempt);
  const jitter = (1 - PSI2) + Math.random() * (2 * PSI2);
  return Math.min(Math.round(raw * jitter), maxMs);
}

/**
 * Parse a simple cron expression (minute hour dom month dow).
 * Returns the next Date when the expression matches.
 *
 * @param {string} cronExpr — "* * * * *" format
 * @param {Date} [after] — find next match after this date
 * @returns {Date}
 */
function nextCronMatch(cronExpr, after = new Date()) {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Invalid cron expression: ${cronExpr}`);

  const [minExpr, hourExpr, domExpr, monExpr, dowExpr] = parts;

  function matches(expr, value, max) {
    if (expr === '*') return true;
    if (expr.includes('/')) {
      const [, step] = expr.split('/');
      return value % parseInt(step, 10) === 0;
    }
    if (expr.includes(',')) {
      return expr.split(',').map(Number).includes(value);
    }
    if (expr.includes('-')) {
      const [lo, hi] = expr.split('-').map(Number);
      return value >= lo && value <= hi;
    }
    return parseInt(expr, 10) === value;
  }

  const candidate = new Date(after.getTime() + 60000);
  candidate.setSeconds(0, 0);

  // Search up to 366 days ahead
  const limit = 366 * 24 * 60;
  for (let i = 0; i < limit; i++) {
    const min = candidate.getMinutes();
    const hour = candidate.getHours();
    const dom = candidate.getDate();
    const mon = candidate.getMonth() + 1;
    const dow = candidate.getDay();

    if (
      matches(minExpr, min, 59) &&
      matches(hourExpr, hour, 23) &&
      matches(domExpr, dom, 31) &&
      matches(monExpr, mon, 12) &&
      matches(dowExpr, dow, 6)
    ) {
      return candidate;
    }
    candidate.setTime(candidate.getTime() + 60000);
  }

  throw new Error(`No cron match found within 366 days for: ${cronExpr}`);
}

/**
 * @typedef {object} JobDefinition
 * @property {string} id
 * @property {string} name
 * @property {Function} handler — async () => void
 * @property {'interval'|'cron'|'oneshot'} type
 * @property {number} [intervalMs] — for interval type
 * @property {string} [cron] — for cron type
 * @property {number} [maxRetries=5]
 */

/**
 * Job scheduler with interval, cron, and one-shot support.
 * Features phi-backoff retries and circuit breaker.
 */
class Scheduler {
  /**
   * @param {object} params
   * @param {object} params.log — structured logger
   */
  constructor({ log }) {
    this._log = log;
    this._store = new JobStore();
    /** @type {Map<string, JobDefinition>} */
    this._jobs = new Map();
    /** @type {Map<string, NodeJS.Timeout>} */
    this._timers = new Map();
    this._running = false;
  }

  /**
   * Register a job with the scheduler.
   *
   * @param {JobDefinition} jobDef
   */
  register(jobDef) {
    if (this._jobs.has(jobDef.id)) {
      throw new Error(`Job '${jobDef.id}' is already registered`);
    }

    const job = {
      maxRetries: MAX_RETRIES,
      ...jobDef,
    };

    this._jobs.set(job.id, job);
    this._store.init(job.id);
    this._log.info('Job registered', { jobId: job.id, name: job.name, type: job.type });
  }

  /**
   * Start the scheduler — begins executing all registered jobs.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._log.info('Scheduler started');

    for (const [id, job] of this._jobs) {
      this._scheduleNext(id);
    }
  }

  /**
   * Stop the scheduler and clear all timers.
   */
  stop() {
    this._running = false;
    for (const [id, timer] of this._timers) {
      clearTimeout(timer);
    }
    this._timers.clear();
    this._log.info('Scheduler stopped');
  }

  /**
   * Schedule the next execution of a job.
   *
   * @param {string} jobId
   * @param {number} [delayMs] — override delay
   */
  _scheduleNext(jobId, delayMs) {
    if (!this._running) return;

    const job = this._jobs.get(jobId);
    if (!job) return;

    const state = this._store.get(jobId);

    // Check circuit breaker
    if (state.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      if (state.status !== 'circuit-open' && state.status !== 'circuit-half-open') {
        this._store.markCircuitOpen(jobId);
        this._log.warn('Circuit breaker OPEN', { jobId, failures: state.consecutiveFailures });

        // Schedule half-open probe
        const timer = setTimeout(() => {
          this._store.markCircuitHalfOpen(jobId);
          this._log.info('Circuit breaker HALF-OPEN, probing', { jobId });
          this._executeJob(jobId);
        }, CIRCUIT_HALF_OPEN_MS);

        this._timers.set(jobId, timer);
        const nextRun = new Date(Date.now() + CIRCUIT_HALF_OPEN_MS).toISOString();
        this._store.get(jobId).nextRun = nextRun;
        return;
      }
    }

    let delay = delayMs;

    if (delay === undefined) {
      switch (job.type) {
        case 'interval':
          delay = job.intervalMs;
          break;
        case 'cron': {
          const next = nextCronMatch(job.cron);
          delay = next.getTime() - Date.now();
          break;
        }
        case 'oneshot':
          delay = job.intervalMs || 0;
          break;
        default:
          delay = 60000;
      }
    }

    const nextRun = new Date(Date.now() + delay).toISOString();
    this._store.get(jobId).nextRun = nextRun;

    const timer = setTimeout(() => this._executeJob(jobId), delay);
    this._timers.set(jobId, timer);
  }

  /**
   * Execute a job.
   *
   * @param {string} jobId
   * @param {number} [retryAttempt=0]
   */
  async _executeJob(jobId, retryAttempt = 0) {
    if (!this._running) return;

    const job = this._jobs.get(jobId);
    if (!job) return;

    this._store.markRunning(jobId);
    this._log.debug('Executing job', { jobId, name: job.name, attempt: retryAttempt });

    try {
      await job.handler();

      // Success — reset circuit breaker if it was half-open
      const state = this._store.get(jobId);
      if (state.status === 'circuit-half-open' || state.consecutiveFailures > 0) {
        this._store.resetCircuit(jobId);
        this._log.info('Circuit breaker CLOSED', { jobId });
      }

      const nextRun = job.type === 'oneshot' ? null : new Date().toISOString();
      this._store.recordSuccess(jobId, nextRun);
      this._log.debug('Job completed', { jobId, name: job.name });

      // Schedule next run (not for oneshot)
      if (job.type !== 'oneshot') {
        this._scheduleNext(jobId);
      }
    } catch (err) {
      this._log.error('Job failed', { jobId, name: job.name, error: err.message, attempt: retryAttempt });

      if (retryAttempt < job.maxRetries) {
        const retryDelay = phiBackoff(retryAttempt);
        this._log.info('Retrying job', { jobId, attempt: retryAttempt + 1, retryDelay });

        const nextRun = new Date(Date.now() + retryDelay).toISOString();
        this._store.recordFailure(jobId, err.message, nextRun);

        const timer = setTimeout(() => this._executeJob(jobId, retryAttempt + 1), retryDelay);
        this._timers.set(jobId, timer);
      } else {
        this._store.recordFailure(jobId, err.message, null);
        this._log.warn('Job exhausted retries', { jobId, maxRetries: job.maxRetries });

        // Schedule next normal run (circuit breaker will handle if too many failures)
        if (job.type !== 'oneshot') {
          this._scheduleNext(jobId);
        }
      }
    }
  }

  /**
   * Manually trigger a job now.
   *
   * @param {string} jobId
   */
  triggerNow(jobId) {
    if (!this._jobs.has(jobId)) {
      throw new Error(`Job '${jobId}' not found`);
    }
    // Clear any pending timer
    const timer = this._timers.get(jobId);
    if (timer) clearTimeout(timer);
    this._executeJob(jobId);
  }

  /**
   * Get the state of all jobs.
   * @returns {object[]}
   */
  getJobStates() {
    return this._store.getAll();
  }

  /**
   * Get the state of a specific job.
   * @param {string} jobId
   * @returns {object|undefined}
   */
  getJobState(jobId) {
    return this._store.get(jobId);
  }

  /**
   * Get the underlying store.
   * @returns {JobStore}
   */
  getStore() {
    return this._store;
  }
}

module.exports = {
  Scheduler,
  phiBackoff,
  nextCronMatch,
  MAX_RETRIES,
  CIRCUIT_BREAKER_THRESHOLD,
  CIRCUIT_HALF_OPEN_MS,
};
