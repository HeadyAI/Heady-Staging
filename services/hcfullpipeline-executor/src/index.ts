import { createServiceApp } from '@heady-ai/service-runtime';
import type { ServiceManifest } from '@heady-ai/contract-types';

const manifest: ServiceManifest = {
  "name": "hcfullpipeline-executor",
  "version": "0.1.0",
  "port": 4314,
  "summary": "21-stage pipeline execution and stage-level checkpointing.",
  "routes": [
    "/pipeline/run",
    "/pipeline/status"
  ],
  "dependencies": [
    "contract-types",
    "csl-gate"
  ]
} as ServiceManifest;
const app = createServiceApp(manifest);


app.post('/pipeline/run', async (request) => ({
  runId: crypto.randomUUID(),
  accepted: true,
  request: request.body,
  stages: 22,
  maintenanceStage: 'Stage 22: heady-maintenance system update cycle',
}));
app.get('/pipeline/status', async () => ({
  state: 'idle',
  stages: 22,
  hotPoolReserved: 13,
  stageManifest: [
    'Stage 1-21: Core HCFullPipeline stages',
    'Stage 22: heady-maintenance (scan → validate → brand → trim → commit → deploy → push)',
  ],
}));

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


const port = Number(process.env.PORT ?? 4314);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`hcfullpipeline-executor listening on ${port}`);
}).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
