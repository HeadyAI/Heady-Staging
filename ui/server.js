import express from 'express';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import structuredLogger from '@heady/structured-logger';
const { createLogger } = structuredLogger.default || structuredLogger;
const logger = createLogger('ui-server');


// Initialize actual backend instances
let colabManager, swarmManager, topology, vectorRouter;

async function initCore() {
  try {
    const { ColabRuntimeManager } = await import('../core/liquid-nodes/colab-runtime.js');
    const { SwarmManager } = await import('../core/swarm-engine/swarm-manager.js');
    const { Topology } = await import('../core/liquid-nodes/topology.js');
    const { VectorRouter } = await import('../core/liquid-nodes/vector-router.js');

    colabManager = new ColabRuntimeManager();
    swarmManager = new SwarmManager();
    topology = new Topology();
    vectorRouter = new VectorRouter();

    colabManager.initialize();
    swarmManager.initialize();

    logger.info({ msg: "Core engines initialized successfully." });
  } catch (err) {
    logger.error({ msg: "Failed to initialize core engines:", err: err.message });
  }
}

initCore();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3307;

app.use(express.json());

app.use('/colab', express.static(resolve(__dirname, 'colab-runtime-panel')));
app.use('/swarm', express.static(resolve(__dirname, 'swarm-monitor')));
app.use('/topology', express.static(resolve(__dirname, 'topology-dashboard')));
app.use('/vector', express.static(resolve(__dirname, 'vector-explorer')));


// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'ui-server',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/system-status', (req, res) => {
  if (!colabManager) {
    return res.status(503).json({ error: 'Core services initializing...' });
  }

  const runtimes = colabManager.getAllRuntimes();
  const swarms = swarmManager.getMeshStatus();

  const colabData = (Array.isArray(runtimes) ? runtimes : Object.values(runtimes)).map(r => ({
    id: r.id, name: r.name, region: r.region, gpu: r.gpu, vram: r.vramGB,
    state: r.state, utilization: r.metrics?.gpuUtilization || 0,
    memUsed: (r.metrics?.gpuMemoryUsedMB || 0) / 1024, temp: r.metrics?.gpuTemperatureC || 30,
    opsExecuted: r.metrics?.opsExecuted || 0, queued: r.taskQueue?.length || 0, errors: r.metrics?.errorCount || 0
  }));

  const swarmData = {
    totalSwarms: swarms.swarms.length,
    totalBees: swarms.activeBees,
    status: swarms.swarms.every(s => s.pressure === 'nominal' || s.pressure === 'elevated') ? 'NOMINAL' : 'ELEVATED',
    details: swarms.swarms.map(s => ({
      name: s.name,
      beeCount: s.bees,
      utilization: s.load,
      queued: s.queuedTasks,
      pressure: s.pressure
    }))
  };

  res.json({
    runtimes: colabData,
    swarms: swarmData,
    topology: { nodes: [] },
    vector: { active: true }
  });
});

app.listen(port, () => {
  logger.info({ msg: "UI API Server listening", port });
});
