/**
 * Heady™ Saga Coordinator
 * Distributed transaction management with compensatable steps
 * Each step: execute → compensate (rollback)
 * © 2026 HeadySystems Inc.
 */

const PHI = 1.618033988749895;
const STEP_TIMEOUT_MS = Math.round(PHI * PHI * PHI * 1000); // φ³ ≈ 4236ms

class SagaCoordinator {
    constructor(name, eventBus = null) {
        this.name = name;
        this.steps = [];
        this.eventBus = eventBus;
        this.executionLog = [];
    }

    /**
     * Add a step to the saga
     * Each step must have execute() and compensate() functions
     */
    step(name, execute, compensate) {
        this.steps.push({ name, execute, compensate });
        return this; // Chainable
    }

    /**
     * Execute the saga — all steps or rollback
     */
    async execute(context = {}) {
        const sagaId = `saga-${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const completedSteps = [];
        const log = { sagaId, name: this.name, startedAt: new Date().toISOString(), steps: [] };

        for (const step of this.steps) {
            const stepLog = { name: step.name, startedAt: new Date().toISOString() };

            try {
                // Execute with timeout
                const result = await Promise.race([
                    step.execute(context),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`Step ${step.name} timed out after ${STEP_TIMEOUT_MS}ms`)), STEP_TIMEOUT_MS)
                    ),
                ]);

                completedSteps.push(step);
                context[`${step.name}_result`] = result;
                stepLog.status = 'completed';
                stepLog.completedAt = new Date().toISOString();

            } catch (error) {
                stepLog.status = 'failed';
                stepLog.error = error.message;
                stepLog.failedAt = new Date().toISOString();
                log.steps.push(stepLog);

                // Compensate all completed steps in reverse order
                log.compensation = { startedAt: new Date().toISOString(), steps: [] };

                for (const completed of [...completedSteps].reverse()) {
                    const compLog = { name: completed.name, startedAt: new Date().toISOString() };
                    try {
                        await completed.compensate(context);
                        compLog.status = 'compensated';
                    } catch (compError) {
                        compLog.status = 'compensation_failed';
                        compLog.error = compError.message;
                    }
                    compLog.completedAt = new Date().toISOString();
                    log.compensation.steps.push(compLog);
                }

                log.compensation.completedAt = new Date().toISOString();
                log.status = 'rolled_back';
                log.completedAt = new Date().toISOString();

                // Publish saga failure event
                if (this.eventBus) {
                    await this.eventBus.publish(`heady.events.saga.failed`, { sagaId, name: this.name, error: error.message });
                }

                this.executionLog.push(log);
                throw new SagaError(this.name, step.name, error, log);
            }

            log.steps.push(stepLog);
        }

        log.status = 'completed';
        log.completedAt = new Date().toISOString();

        if (this.eventBus) {
            await this.eventBus.publish(`heady.events.saga.completed`, { sagaId, name: this.name });
        }

        this.executionLog.push(log);
        return { sagaId, context, log };
    }
}

class SagaError extends Error {
    constructor(sagaName, stepName, cause, log) {
        super(`Saga "${sagaName}" failed at step "${stepName}": ${cause.message}`);
        this.sagaName = sagaName;
        this.stepName = stepName;
        this.cause = cause;
        this.log = log;
    }
}

// Example: User signup saga
function createSignupSaga(services, eventBus) {
    return new SagaCoordinator('user-signup', eventBus)
        .step('create_firebase_account',
            async (ctx) => { ctx.firebaseUid = await services.auth.createUser(ctx.email, ctx.password); return ctx.firebaseUid; },
            async (ctx) => { if (ctx.firebaseUid) await services.auth.deleteUser(ctx.firebaseUid); }
        )
        .step('index_vector_memory',
            async (ctx) => { return await services.memory.indexUser(ctx.firebaseUid, ctx.profile); },
            async (ctx) => { await services.memory.deleteUser(ctx.firebaseUid); }
        )
        .step('create_drupal_account',
            async (ctx) => { return await services.drupal.createUser(ctx.firebaseUid, ctx.profile); },
            async (ctx) => { await services.drupal.deleteUser(ctx.firebaseUid); }
        )
        .step('send_welcome',
            async (ctx) => { return await services.notify.sendWelcome(ctx.email); },
            async () => { /* No compensation needed for notifications */ }
        );
}

module.exports = { SagaCoordinator, SagaError, createSignupSaga };
