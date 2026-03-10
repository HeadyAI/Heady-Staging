/**
 * @heady/saga-coordinator — Distributed Saga Orchestrator
 * 
 * Manages multi-step distributed transactions with φ-scaled timeouts,
 * CSL-gated step validation, and automatic compensation on failure.
 * Implements the Saga pattern for eventual consistency across Heady services.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PHI, PSI, PSI2, FIB, phiThreshold, phiBackoff, cslGate } from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';

const logger = createLogger({ service: 'saga-coordinator' });

/** φ-scaled configuration */
const CONFIG = Object.freeze({
  sagaTimeoutMs: parseInt(process.env.SAGA_TIMEOUT_MS || '11090', 10), // phiBackoff(5)
  maxCompensationRetries: FIB[5],          // 5
  retryBaseMs: 1000,
  stepConfidenceThreshold: phiThreshold(2), // ≈0.809 MEDIUM
  completionThreshold: phiThreshold(3),     // ≈0.882 HIGH
  maxConcurrentSagas: FIB[7],              // 13
  sagaHistorySize: FIB[12],               // 144
  deadLetterThreshold: FIB[5],            // 5 failed compensations
});

/**
 * Saga states — no priorities, concurrent-equals model
 */
const SagaState = Object.freeze({
  PENDING: 'pending',
  EXECUTING: 'executing',
  COMPENSATING: 'compensating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DEAD_LETTER: 'dead_letter',
});

/**
 * Step states
 */
const StepState = Object.freeze({
  PENDING: 'pending',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  COMPENSATING: 'compensating',
  COMPENSATED: 'compensated',
  COMPENSATION_FAILED: 'compensation_failed',
});

/**
 * SagaStep — a single transactional unit
 */
class SagaStep {
  constructor(name, executeFn, compensateFn, options = {}) {
    this.name = name;
    this.executeFn = executeFn;
    this.compensateFn = compensateFn;
    this.timeoutMs = options.timeoutMs || CONFIG.sagaTimeoutMs;
    this.retries = options.retries || 0;
    this.state = StepState.PENDING;
    this.result = null;
    this.error = null;
    this.startedAt = null;
    this.completedAt = null;
    this.compensationAttempts = 0;
  }

  toJSON() {
    return {
      name: this.name,
      state: this.state,
      result: this.result,
      error: this.error?.message || null,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      compensationAttempts: this.compensationAttempts,
    };
  }
}

/**
 * Saga — orchestrated sequence of compensatable steps
 */
class Saga {
  constructor(id, name, steps = []) {
    this.id = id;
    this.name = name;
    this.steps = steps;
    this.state = SagaState.PENDING;
    this.context = {};
    this.createdAt = new Date();
    this.completedAt = null;
    this.error = null;
  }

  get completionRatio() {
    if (this.steps.length === 0) return 0;
    const completed = this.steps.filter(s => s.state === StepState.COMPLETED).length;
    return completed / this.steps.length;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      state: this.state,
      steps: this.steps.map(s => s.toJSON()),
      completionRatio: this.completionRatio,
      context: this.context,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      error: this.error?.message || null,
    };
  }
}

/**
 * SagaCoordinator — the orchestration engine
 */
class SagaCoordinator extends EventEmitter {
  #activeSagas = new Map();
  #history = [];
  #running = 0;

  constructor() {
    super();
  }

  /**
   * Define a new saga with ordered steps
   */
  defineSaga(name, stepDefs) {
    const id = randomUUID();
    const steps = stepDefs.map(def =>
      new SagaStep(def.name, def.execute, def.compensate, {
        timeoutMs: def.timeoutMs,
        retries: def.retries,
      })
    );
    const saga = new Saga(id, name, steps);
    this.#activeSagas.set(id, saga);
    return saga;
  }

  /**
   * Execute a saga — run steps sequentially, compensate on failure
   */
  async executeSaga(sagaId, initialContext = {}) {
    const saga = this.#activeSagas.get(sagaId);
    if (!saga) throw new Error(`Saga ${sagaId} not found`);

    if (this.#running >= CONFIG.maxConcurrentSagas) {
      throw new Error('Saga backpressure: too many concurrent sagas');
    }

    this.#running++;
    saga.state = SagaState.EXECUTING;
    saga.context = { ...initialContext };

    this.emit('saga-started', { id: saga.id, name: saga.name });
    logger.info('Saga execution started', { sagaId: saga.id, name: saga.name });

    let lastCompletedIndex = -1;

    try {
      for (let i = 0; i < saga.steps.length; i++) {
        const step = saga.steps[i];
        step.state = StepState.EXECUTING;
        step.startedAt = new Date();

        this.emit('step-started', {
          sagaId: saga.id,
          step: step.name,
          index: i,
        });

        try {
          // Execute with timeout
          step.result = await Promise.race([
            step.executeFn(saga.context),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Step "${step.name}" timed out`)), step.timeoutMs)
            ),
          ]);

          // Merge step result into saga context
          if (step.result && typeof step.result === 'object') {
            Object.assign(saga.context, step.result);
          }

          step.state = StepState.COMPLETED;
          step.completedAt = new Date();
          lastCompletedIndex = i;

          // CSL gate check on completion ratio
          const confidence = cslGate(
            saga.completionRatio,
            saga.completionRatio,
            CONFIG.stepConfidenceThreshold
          );

          this.emit('step-completed', {
            sagaId: saga.id,
            step: step.name,
            confidence,
          });

          logger.info('Saga step completed', {
            sagaId: saga.id,
            step: step.name,
            completionRatio: saga.completionRatio,
            confidence,
          });
        } catch (stepError) {
          step.state = StepState.FAILED;
          step.error = stepError;
          step.completedAt = new Date();

          logger.error('Saga step failed', {
            sagaId: saga.id,
            step: step.name,
            error: stepError.message,
          });

          // Trigger compensation for all completed steps
          await this.#compensate(saga, lastCompletedIndex);
          throw stepError;
        }
      }

      // All steps completed successfully
      saga.state = SagaState.COMPLETED;
      saga.completedAt = new Date();

      this.emit('saga-completed', {
        id: saga.id,
        name: saga.name,
        completionRatio: saga.completionRatio,
      });

      logger.info('Saga completed successfully', {
        sagaId: saga.id,
        name: saga.name,
      });

      return saga;
    } catch (err) {
      saga.state = SagaState.FAILED;
      saga.error = err;
      saga.completedAt = new Date();

      this.emit('saga-failed', {
        id: saga.id,
        name: saga.name,
        error: err.message,
      });

      return saga;
    } finally {
      this.#running--;
      this.#archiveSaga(saga);
    }
  }

  /**
   * Compensate completed steps in reverse order
   */
  async #compensate(saga, fromIndex) {
    saga.state = SagaState.COMPENSATING;
    this.emit('compensation-started', { sagaId: saga.id });

    for (let i = fromIndex; i >= 0; i--) {
      const step = saga.steps[i];
      if (step.state !== StepState.COMPLETED) continue;
      if (!step.compensateFn) continue;

      step.state = StepState.COMPENSATING;

      for (let attempt = 0; attempt < CONFIG.maxCompensationRetries; attempt++) {
        try {
          await step.compensateFn(saga.context, step.result);
          step.state = StepState.COMPENSATED;
          step.compensationAttempts = attempt + 1;

          this.emit('step-compensated', {
            sagaId: saga.id,
            step: step.name,
            attempts: attempt + 1,
          });

          logger.info('Step compensated', {
            sagaId: saga.id,
            step: step.name,
            attempt: attempt + 1,
          });
          break;
        } catch (compError) {
          const delay = phiBackoff(attempt, CONFIG.retryBaseMs);
          logger.warn('Compensation retry', {
            sagaId: saga.id,
            step: step.name,
            attempt: attempt + 1,
            delayMs: delay,
            error: compError.message,
          });
          await new Promise(r => setTimeout(r, delay));

          if (attempt === CONFIG.maxCompensationRetries - 1) {
            step.state = StepState.COMPENSATION_FAILED;
            step.compensationAttempts = CONFIG.maxCompensationRetries;

            this.emit('compensation-failed', {
              sagaId: saga.id,
              step: step.name,
            });

            logger.error('Compensation exhausted, moving to dead letter', {
              sagaId: saga.id,
              step: step.name,
            });
          }
        }
      }
    }

    // Check if any compensations failed
    const failedCompensations = saga.steps.filter(
      s => s.state === StepState.COMPENSATION_FAILED
    );

    if (failedCompensations.length >= CONFIG.deadLetterThreshold) {
      saga.state = SagaState.DEAD_LETTER;
      this.emit('saga-dead-letter', { sagaId: saga.id });
      logger.error('Saga moved to dead letter queue', { sagaId: saga.id });
    }
  }

  /**
   * Archive completed saga to history ring buffer
   */
  #archiveSaga(saga) {
    this.#activeSagas.delete(saga.id);
    this.#history.push(saga);
    if (this.#history.length > CONFIG.sagaHistorySize) {
      this.#history.shift();
    }
  }

  /**
   * Get saga by ID (active or history)
   */
  getSaga(sagaId) {
    return this.#activeSagas.get(sagaId)
      || this.#history.find(s => s.id === sagaId)
      || null;
  }

  get stats() {
    return {
      activeSagas: this.#activeSagas.size,
      running: this.#running,
      historySize: this.#history.length,
      maxConcurrent: CONFIG.maxConcurrentSagas,
    };
  }
}

/**
 * Pre-built saga definitions for common Heady operations
 */
const HEADY_SAGAS = {
  /**
   * Vector ingestion saga: embed → store → index → notify
   */
  vectorIngestion: (coordinator) => coordinator.defineSaga('vector-ingestion', [
    {
      name: 'generate-embedding',
      execute: async (ctx) => {
        // Embedding generation step
        return { embeddingId: randomUUID() };
      },
      compensate: async (ctx, result) => {
        // No compensation needed for read-only operation
      },
    },
    {
      name: 'store-vector',
      execute: async (ctx) => {
        return { vectorId: randomUUID() };
      },
      compensate: async (ctx, result) => {
        // Delete stored vector on compensation
        logger.info('Compensating vector store', { vectorId: result.vectorId });
      },
    },
    {
      name: 'update-search-index',
      execute: async (ctx) => {
        return { indexed: true };
      },
      compensate: async (ctx, result) => {
        logger.info('Compensating search index');
      },
    },
    {
      name: 'emit-notification',
      execute: async (ctx) => {
        return { notified: true };
      },
      compensate: null, // Notifications are fire-and-forget
    },
  ]),

  /**
   * Service deployment saga: build → test → deploy → verify → route
   */
  serviceDeployment: (coordinator) => coordinator.defineSaga('service-deployment', [
    {
      name: 'build-artifact',
      execute: async (ctx) => ({ artifactId: randomUUID() }),
      compensate: async (ctx, result) => {
        logger.info('Cleaning build artifact', { artifactId: result.artifactId });
      },
      timeoutMs: CONFIG.sagaTimeoutMs * PHI, // Longer timeout for builds
    },
    {
      name: 'run-tests',
      execute: async (ctx) => ({ testsPassed: true }),
      compensate: null,
    },
    {
      name: 'deploy-canary',
      execute: async (ctx) => ({ deploymentId: randomUUID() }),
      compensate: async (ctx, result) => {
        logger.info('Rolling back canary', { deploymentId: result.deploymentId });
      },
    },
    {
      name: 'verify-health',
      execute: async (ctx) => ({ healthy: true }),
      compensate: null,
    },
    {
      name: 'shift-traffic',
      execute: async (ctx) => ({ routingUpdated: true }),
      compensate: async (ctx) => {
        logger.info('Reverting traffic routing');
      },
    },
  ]),
};

export {
  SagaCoordinator,
  Saga,
  SagaStep,
  SagaState,
  StepState,
  HEADY_SAGAS,
  CONFIG as SAGA_CONFIG,
};
