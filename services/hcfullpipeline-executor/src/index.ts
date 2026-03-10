import { createServiceApp } from '@heady-ai/service-runtime';
import type { ServiceManifest } from '@heady-ai/contract-types';

const manifest: ServiceManifest = {
  "name": "hcfullpipeline-executor",
  "version": "4.0.0",
  "port": 4314,
  "summary": "Hybrid 21-stage pipeline execution with auto-success integration, circuit breakers, and phi-scaled budget tracking.",
  "routes": [
    "/pipeline/run",
    "/pipeline/status",
    "/pipeline/history",
    "/pipeline/last",
    "/pipeline/variants",
    "/pipeline/stages",
    "/pipeline/auto-success",
    "/pipeline/maintenance"
  ],
  "dependencies": [
    "contract-types",
    "csl-gate"
  ]
} as ServiceManifest;

const app = createServiceApp(manifest);

// ─── Lazy-load HybridPipeline (avoids circular deps at import time) ──────────

let _pipeline: any = null;

function getPipeline() {
  if (!_pipeline) {
    try {
      const { getHybridPipeline } = require('../../src/engines/hybrid-pipeline');
      _pipeline = getHybridPipeline();

      // Try to wire LLM router
      try {
        const { getLLMRouter } = require('../../src/engines/llm-router');
        _pipeline.setLLMRouter(getLLMRouter());
      } catch { /* LLM router optional */ }

      // Try to wire agent orchestrator
      try {
        const { getOrchestrator } = require('../../src/agent-orchestrator');
        _pipeline.setAgentOrchestrator(getOrchestrator());
      } catch { /* orchestrator optional */ }

      // Try to wire auto-success engine
      try {
        const { AutoSuccessEngine } = require('../../src/engines/auto-success-engine');
        _pipeline.setAutoSuccessEngine(new AutoSuccessEngine());
      } catch { /* auto-success optional */ }

      // Log events
      _pipeline.on('pipeline:start', (e: any) => {
        app.log.info({ runId: e.runId, variant: e.variant }, 'Pipeline started');
      });
      _pipeline.on('pipeline:complete', (e: any) => {
        app.log.info({
          runId: e.runId,
          variant: e.variant,
          durationMs: e.totalDurationMs,
          pass: e.passCount,
          fail: e.failCount,
        }, 'Pipeline complete');
      });
      _pipeline.on('stage:error', (e: any) => {
        app.log.warn({ runId: e.runId, stageId: e.stageId, error: e.error }, 'Stage error');
      });
      _pipeline.on('pipeline:budget-exceeded', (e: any) => {
        app.log.error({ runId: e.runId, usage: e.usage }, 'Budget exceeded');
      });
    } catch (err: any) {
      app.log.error({ err: err.message }, 'Failed to initialize HybridPipeline');
    }
  }
  return _pipeline;
}

// ─── Pipeline Routes ──────────────────────────────────────────────────────────

app.post('/pipeline/run', async (request) => {
  const pipeline = getPipeline();
  if (!pipeline) {
    return { error: 'Pipeline not initialized', accepted: false };
  }
  const result = await pipeline.run(request.body || {});
  return { accepted: true, ...result };
});

app.get('/pipeline/status', async () => {
  const pipeline = getPipeline();
  if (!pipeline) {
    return { state: 'uninitialized', error: 'Pipeline not loaded' };
  }
  return { state: 'ready', ...pipeline.getStats() };
});

app.get('/pipeline/history', async (request: any) => {
  const pipeline = getPipeline();
  if (!pipeline) return { runs: [] };
  const limit = parseInt(request.query?.limit || '10', 10);
  return { runs: pipeline.getHistory(limit) };
});

app.get('/pipeline/last', async () => {
  const pipeline = getPipeline();
  return { lastRun: pipeline?.getLastRun() || null };
});

app.get('/pipeline/variants', async () => {
  const { VARIANTS } = require('../../src/engines/hybrid-pipeline');
  return {
    variants: Object.entries(VARIANTS).map(([name, stages]: [string, any]) => ({
      name,
      stageCount: stages.length,
      stages,
    })),
  };
});

app.get('/pipeline/stages', async () => {
  const { STAGES, STAGE_TIMEOUTS, LANES } = require('../../src/engines/hybrid-pipeline');
  return {
    stages: STAGES.map((id: string, i: number) => ({
      id,
      order: i,
      timeout: STAGE_TIMEOUTS[id],
      lane: Object.entries(LANES).find(([, l]: [string, any]) => l.stages.includes(id))?.[0] || 'none',
    })),
  };
});

app.post('/pipeline/auto-success', async () => {
  const pipeline = getPipeline();
  if (!pipeline?._autoSuccessEngine) {
    return { error: 'Auto-success engine not connected' };
  }
  await pipeline._autoSuccessEngine.runCycle();
  return {
    results: pipeline._autoSuccessEngine.getLastCycleResults?.() || [],
  };
});

// Stage 22: Maintenance cycle integration
app.post('/pipeline/maintenance', async () => {
  const maintenanceUrl = process.env.HEADY_MAINTENANCE_URL || 'http://localhost:4320';
  try {
    const response = await fetch(`${maintenanceUrl}/maintenance/dry-run`, { method: 'POST' });
    const result = await response.json();
    return { stage: 22, name: 'heady-maintenance', accepted: true, result };
  } catch (error: any) {
    return { stage: 22, name: 'heady-maintenance', accepted: false, error: error.message };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 4314);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`hcfullpipeline-executor v4.0.0-hybrid listening on ${port}`);
  // Pre-initialize pipeline
  getPipeline();
}).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
