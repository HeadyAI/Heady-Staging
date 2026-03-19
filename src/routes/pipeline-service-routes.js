/*
 * © 2026 Heady™Systems Inc..
 * PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 *
 * Pipeline-as-a-Service Router — Layer 2 PRODUCT
 *
 * Lets enterprises plug custom webhook stages into HCFullPipeline.
 * Webhook stages are called via HTTP POST with stage context and must
 * respond within PHI^5 (11,090ms). Metered billing per tenant for
 * Stripe usage reporting.
 */

'use strict';

const express = require('../core/heady-server');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// Constants — φ-scaled, zero magic numbers
// ═══════════════════════════════════════════════════════════════

const PHI = 1.618033988749895;
const PHI_5 = Math.round(Math.pow(PHI, 5) * 1000); // 11,090ms — webhook timeout
const MAX_STAGES_PER_TENANT = Math.round(Math.pow(PHI, 8)); // 46
const MAX_CONCURRENT_RUNS = Math.round(Math.pow(PHI, 6));   // 17

// ═══════════════════════════════════════════════════════════════
// In-Memory Stores (production: back with Neon via tenantQuery)
// ═══════════════════════════════════════════════════════════════

const registeredStages = new Map();  // stageId → stage definition
const pipelineRuns = new Map();      // runId → run state
const tenantUsage = new Map();       // tenantId → { runs, lastResetAt }
const bus = new EventEmitter();

// ═══════════════════════════════════════════════════════════════
// Database — lazy-loaded neon-db for tenant isolation
// ═══════════════════════════════════════════════════════════════

let _db = null;
function getDb() {
    if (!_db) {
        try {
            _db = require('../services/neon-db');
        } catch (err) {
            logger.warn('[pipeline-service] neon-db not available — running in memory-only mode');
        }
    }
    return _db;
}

// ═══════════════════════════════════════════════════════════════
// Auth Middleware — tenant isolation via API key
// ═══════════════════════════════════════════════════════════════

async function authenticateTenant(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header', hint: 'Bearer <api_key>' });
    }

    const apiKey = authHeader.slice(7);
    const db = getDb();

    if (db) {
        try {
            const result = await db.validateApiKey(apiKey);
            if (!result.ok) {
                return res.status(403).json({ error: 'Invalid API key', reason: result.reason || 'key_not_found' });
            }
            req.tenantId = result.tenantId;
            req.tenantTier = result.tier;
            req.tenantScopes = result.scopes;
        } catch (err) {
            logger.error('[pipeline-service] API key validation error', { error: err.message });
            return res.status(500).json({ error: 'Authentication service unavailable' });
        }
    } else {
        // Fallback: derive tenant from hashed key (dev/test mode)
        req.tenantId = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 36);
        req.tenantTier = 'enterprise';
        req.tenantScopes = ['pipeline_service'];
    }

    next();
}

// ═══════════════════════════════════════════════════════════════
// Billing — metered usage tracking per tenant
// ═══════════════════════════════════════════════════════════════

function meterPipelineRun(tenantId) {
    const db = getDb();

    // Neon-backed metering for Stripe usage reporting
    if (db) {
        db.meterRequest(tenantId, 'pipeline_service_run').catch(err => {
            logger.error('[pipeline-service] Metering failed', { tenantId, error: err.message });
        });
    }

    // In-memory counter for rate limiting
    if (!tenantUsage.has(tenantId)) {
        tenantUsage.set(tenantId, { runs: 0, lastResetAt: Date.now() });
    }
    const usage = tenantUsage.get(tenantId);

    // Reset hourly window
    if (Date.now() - usage.lastResetAt > 3_600_000) {
        usage.runs = 0;
        usage.lastResetAt = Date.now();
    }
    usage.runs++;
}

// ═══════════════════════════════════════════════════════════════
// Webhook Executor — call enterprise webhook with stage context
// ═══════════════════════════════════════════════════════════════

async function callWebhook(stage, context) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PHI_5);

    try {
        const response = await fetch(stage.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Heady-Run-Id': context.runId,
                'X-Heady-Stage-Id': stage.stageId,
                'X-Heady-Stage-Name': stage.name,
                ...(stage.headers || {}),
            },
            body: JSON.stringify({
                runId: context.runId,
                stageId: stage.stageId,
                stageName: stage.name,
                input: context.input,
                metadata: context.metadata,
                previousResults: context.previousResults,
                ts: new Date().toISOString(),
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Webhook returned ${response.status}: ${body.slice(0, 500)}`);
        }

        return await response.json();
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`Webhook timed out after ${PHI_5}ms (PHI^5 limit)`);
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

// ═══════════════════════════════════════════════════════════════
// Pipeline Execution Engine — run stages in order
// ═══════════════════════════════════════════════════════════════

async function executePipeline(runId, run) {
    run.status = 'running';
    run.startedAt = new Date().toISOString();
    bus.emit('pipeline-service:run:start', { runId, tenantId: run.tenantId, stageCount: run.stages.length });

    const results = [];

    for (let i = 0; i < run.stages.length; i++) {
        const stageDef = run.stages[i];
        const stageState = {
            stageId: stageDef.stageId,
            name: stageDef.name,
            status: 'running',
            startedAt: new Date().toISOString(),
            finishedAt: null,
            result: null,
            error: null,
            metrics: {},
        };

        run.currentStage = i;
        run.stageResults[i] = stageState;
        bus.emit('pipeline-service:stage:start', { runId, stageId: stageDef.stageId, name: stageDef.name });

        try {
            const context = {
                runId,
                input: run.input,
                metadata: run.metadata,
                previousResults: results,
            };

            const result = await callWebhook(stageDef, context);
            stageState.result = result;
            stageState.status = 'completed';
            stageState.finishedAt = new Date().toISOString();
            stageState.metrics.durationMs = new Date(stageState.finishedAt) - new Date(stageState.startedAt);

            results.push({ stageId: stageDef.stageId, name: stageDef.name, result });
            bus.emit('pipeline-service:stage:complete', { runId, stageId: stageDef.stageId, metrics: stageState.metrics });
        } catch (err) {
            stageState.status = 'failed';
            stageState.error = err.message;
            stageState.finishedAt = new Date().toISOString();
            stageState.metrics.durationMs = new Date(stageState.finishedAt) - new Date(stageState.startedAt);

            bus.emit('pipeline-service:stage:failed', { runId, stageId: stageDef.stageId, error: err.message });

            // Fail-fast: abort remaining stages
            run.status = 'failed';
            run.error = `Stage "${stageDef.name}" failed: ${err.message}`;
            run.finishedAt = new Date().toISOString();
            run.metrics.durationMs = new Date(run.finishedAt) - new Date(run.startedAt);
            bus.emit('pipeline-service:run:complete', { runId, status: 'failed', error: run.error });
            return;
        }
    }

    run.status = 'completed';
    run.finishedAt = new Date().toISOString();
    run.metrics.durationMs = new Date(run.finishedAt) - new Date(run.startedAt);
    run.metrics.stagesExecuted = run.stages.length;
    bus.emit('pipeline-service:run:complete', { runId, status: 'completed', metrics: run.metrics });
}

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

// All routes require tenant authentication
router.use(authenticateTenant);

// ─── POST /register-stage — Register a webhook stage ─────────

/**
 * @swagger
 * /api/v1/pipeline-service/register-stage:
 *   post:
 *     summary: Register a webhook stage for pipeline execution
 *     security:
 *       - BearerAuth: []
 */
router.post('/register-stage', async (req, res) => {
    const { name, webhookUrl, description, position, headers } = req.body || {};

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Missing required field: name (string)' });
    }
    if (!webhookUrl || typeof webhookUrl !== 'string') {
        return res.status(400).json({ error: 'Missing required field: webhookUrl (string)' });
    }

    // Validate URL format
    try {
        new URL(webhookUrl);
    } catch {
        return res.status(400).json({ error: 'Invalid webhookUrl — must be a valid HTTPS URL' });
    }

    // Enforce per-tenant stage limit
    const tenantStages = Array.from(registeredStages.values()).filter(s => s.tenantId === req.tenantId);
    if (tenantStages.length >= MAX_STAGES_PER_TENANT) {
        return res.status(429).json({
            error: `Stage limit reached (max ${MAX_STAGES_PER_TENANT} per tenant, PHI^8)`,
        });
    }

    const stageId = `stg_${crypto.randomBytes(12).toString('hex')}`;
    const stage = {
        stageId,
        tenantId: req.tenantId,
        name: name.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        webhookUrl,
        description: description || '',
        position: typeof position === 'number' ? position : tenantStages.length,
        headers: headers || {},
        createdAt: new Date().toISOString(),
        invocations: 0,
        lastInvokedAt: null,
    };

    registeredStages.set(stageId, stage);

    logger.info('[pipeline-service] Stage registered', { stageId, name: stage.name, tenantId: req.tenantId });

    res.status(201).json({
        ok: true,
        stage: {
            stageId: stage.stageId,
            name: stage.name,
            webhookUrl: stage.webhookUrl,
            position: stage.position,
            createdAt: stage.createdAt,
        },
        webhookTimeout: `${PHI_5}ms (PHI^5)`,
        ts: new Date().toISOString(),
    });
});

// ─── POST /run — Execute pipeline with custom stages ─────────

/**
 * @swagger
 * /api/v1/pipeline-service/run:
 *   post:
 *     summary: Execute a pipeline run with registered webhook stages
 *     security:
 *       - BearerAuth: []
 */
router.post('/run', async (req, res) => {
    const { input, metadata, stageIds, skipStages } = req.body || {};

    // Resolve which stages to run
    const tenantStages = Array.from(registeredStages.values())
        .filter(s => s.tenantId === req.tenantId);

    let stagesToRun;
    if (Array.isArray(stageIds) && stageIds.length > 0) {
        // Run specific stages in specified order
        stagesToRun = stageIds
            .map(id => registeredStages.get(id))
            .filter(s => s && s.tenantId === req.tenantId);

        if (stagesToRun.length === 0) {
            return res.status(400).json({ error: 'None of the specified stageIds belong to your tenant' });
        }
    } else {
        // Run all tenant stages sorted by position
        stagesToRun = tenantStages.sort((a, b) => a.position - b.position);
    }

    if (stagesToRun.length === 0) {
        return res.status(400).json({ error: 'No stages registered. Use POST /register-stage first.' });
    }

    // Filter skip list
    if (Array.isArray(skipStages)) {
        stagesToRun = stagesToRun.filter(s => !skipStages.includes(s.stageId) && !skipStages.includes(s.name));
    }

    // Enforce concurrent run limit
    const activeRuns = Array.from(pipelineRuns.values())
        .filter(r => r.tenantId === req.tenantId && r.status === 'running');
    if (activeRuns.length >= MAX_CONCURRENT_RUNS) {
        return res.status(429).json({
            error: `Concurrent run limit reached (max ${MAX_CONCURRENT_RUNS}, PHI^6)`,
            activeRuns: activeRuns.length,
        });
    }

    const runId = `psr_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const run = {
        runId,
        tenantId: req.tenantId,
        status: 'pending',
        stages: stagesToRun,
        stageResults: [],
        currentStage: -1,
        input: input || {},
        metadata: metadata || {},
        error: null,
        metrics: {},
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null,
    };

    pipelineRuns.set(runId, run);

    // Meter the run for Stripe usage billing
    meterPipelineRun(req.tenantId);

    // Execute asynchronously — respond immediately with runId
    executePipeline(runId, run).catch(err => {
        run.status = 'failed';
        run.error = `Unhandled execution error: ${err.message}`;
        run.finishedAt = new Date().toISOString();
        logger.error('[pipeline-service] Unhandled pipeline error', { runId, error: err.message });
        bus.emit('pipeline-service:run:complete', { runId, status: 'failed', error: err.message });
    });

    res.status(202).json({
        ok: true,
        runId,
        status: 'pending',
        stageCount: stagesToRun.length,
        stages: stagesToRun.map(s => ({ stageId: s.stageId, name: s.name })),
        webhookTimeout: `${PHI_5}ms (PHI^5)`,
        pollUrl: `/api/v1/pipeline-service/runs/${runId}`,
        ts: new Date().toISOString(),
    });
});

// ─── GET /stages — List registered stages ────────────────────

/**
 * @swagger
 * /api/v1/pipeline-service/stages:
 *   get:
 *     summary: List all webhook stages registered by the tenant
 *     security:
 *       - BearerAuth: []
 */
router.get('/stages', (req, res) => {
    const tenantStages = Array.from(registeredStages.values())
        .filter(s => s.tenantId === req.tenantId)
        .sort((a, b) => a.position - b.position)
        .map(s => ({
            stageId: s.stageId,
            name: s.name,
            webhookUrl: s.webhookUrl,
            description: s.description,
            position: s.position,
            invocations: s.invocations,
            lastInvokedAt: s.lastInvokedAt,
            createdAt: s.createdAt,
        }));

    res.json({
        ok: true,
        count: tenantStages.length,
        limit: MAX_STAGES_PER_TENANT,
        stages: tenantStages,
        ts: new Date().toISOString(),
    });
});

// ─── GET /runs/:runId — Get run status ───────────────────────

/**
 * @swagger
 * /api/v1/pipeline-service/runs/{runId}:
 *   get:
 *     summary: Get the status and results of a pipeline run
 *     security:
 *       - BearerAuth: []
 */
router.get('/runs/:runId', (req, res) => {
    const run = pipelineRuns.get(req.params.runId);

    if (!run) {
        return res.status(404).json({ error: 'Run not found', runId: req.params.runId });
    }

    // Tenant isolation: only the owning tenant can view their run
    if (run.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Run not found', runId: req.params.runId });
    }

    res.json({
        ok: true,
        runId: run.runId,
        status: run.status,
        currentStage: run.currentStage,
        stageCount: run.stages.length,
        stages: run.stageResults.map(sr => ({
            stageId: sr.stageId,
            name: sr.name,
            status: sr.status,
            durationMs: sr.metrics?.durationMs || null,
            error: sr.error,
        })),
        input: run.input,
        error: run.error,
        metrics: run.metrics,
        createdAt: run.createdAt,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        ts: new Date().toISOString(),
    });
});

// ─── DELETE /stages/:stageId — Remove a stage ────────────────

/**
 * @swagger
 * /api/v1/pipeline-service/stages/{stageId}:
 *   delete:
 *     summary: Remove a registered webhook stage
 *     security:
 *       - BearerAuth: []
 */
router.delete('/stages/:stageId', (req, res) => {
    const stage = registeredStages.get(req.params.stageId);

    if (!stage) {
        return res.status(404).json({ error: 'Stage not found', stageId: req.params.stageId });
    }

    // Tenant isolation: only the owning tenant can delete their stage
    if (stage.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Stage not found', stageId: req.params.stageId });
    }

    registeredStages.delete(req.params.stageId);
    logger.info('[pipeline-service] Stage removed', { stageId: req.params.stageId, tenantId: req.tenantId });

    res.json({
        ok: true,
        deleted: req.params.stageId,
        ts: new Date().toISOString(),
    });
});

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

module.exports = router;
module.exports.bus = bus;
module.exports.registeredStages = registeredStages;
module.exports.pipelineRuns = pipelineRuns;
