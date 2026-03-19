import os from 'os';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const startTime = Date.now();
let startupComplete = false;

function setupHealthRoutes(app) {
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: require('../../package.json').version,
    });
  });

  app.get('/health/deep', async (req, res) => {
    const services = {};
    const checks = [
      { name: 'memory_store', check: () => checkMemoryStore() },
      { name: 'mcp_tools', check: () => checkMCPTools() },
      { name: 'agent_manager', check: () => checkAgentManager() },
      { name: 'config_files', check: () => checkConfigFiles() },
      { name: 'data_dirs', check: () => checkDataDirs() },
    ];

    const results = await Promise.allSettled(
      checks.map(async ({ name, check }) => {
        const start = Date.now();
        try {
          const result = await check();
          return { name, data: { status: 'ok', latency: Date.now() - start, ...result } };
        } catch (err) {
          return { name, data: { status: 'error', latency: Date.now() - start, error: err.message } };
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') services[r.value.name] = r.value.data;
      else services[r.reason?.name || 'unknown'] = { status: 'error', error: r.reason?.message };
    }

    const allOk = Object.values(services).every(s => s.status === 'ok');
    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      services,
      system: {
        memory: { total: os.totalmem(), free: os.freemem(), usedPct: Math.round((1 - os.freemem() / os.totalmem()) * 100) },
        cpus: os.cpus().length,
        loadAvg: os.loadavg(),
        nodeVersion: process.version,
        pid: process.pid,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/ready', (req, res) => {
    if (startupComplete) res.json({ status: 'ready' });
    else res.status(503).json({ status: 'not_ready' });
  });

  app.get('/health/startup', (req, res) => {
    if (startupComplete) res.json({ status: 'started' });
    else res.status(503).json({ status: 'starting' });
  });

  setTimeout(() => { startupComplete = true; }, 35000);
}

async function checkMemoryStore() {
  const storePath = process.env.MEMORY_STORE_PATH || './data/memory';
  const accessible = fs.existsSync(storePath);
  let memoryCount = 0;
  const indexPath = path.join(storePath, 'index.json');
  if (fs.existsSync(indexPath)) {
    try {
      const raw = await fs.promises.readFile(indexPath, 'utf8');
      const data = JSON.parse(raw);
      memoryCount = Array.isArray(data) ? data.length : 0;
    } catch { /* corrupt index */ }
  }
  return { accessible, memoryCount, path: storePath };
}

async function checkMCPTools() {
  const { toolRegistry } = await import('../mcp/tool-registry.js');
  const tools = toolRegistry.listTools();
  return { toolCount: tools.length, tools: tools.map(t => t.name) };
}

async function checkAgentManager() {
  const agentConfig = require('../../config/agents.json');
  return { agentCount: agentConfig.agents.length, categories: [...new Set(agentConfig.agents.map(a => a.category))] };
}

async function checkConfigFiles() {
  const required = [
    'config/agents.json',
    'config/providers.json',
    'configs/hcfullpipeline.yaml',
    'configs/resource-policies.yaml',
    'configs/service-catalog.yaml',
  ];
  const results = {};
  for (const f of required) {
    results[f] = fs.existsSync(f);
  }
  const allPresent = Object.values(results).every(Boolean);
  if (!allPresent) throw new Error('Missing config files: ' + Object.entries(results).filter(([,v]) => !v).map(([k]) => k).join(', '));
  return { files: Object.keys(results).length, allPresent };
}

async function checkDataDirs() {
  const dirs = ['data/memory', 'data/logs', 'data/checkpoints'];
  const results = {};
  for (const d of dirs) {
    results[d] = fs.existsSync(d);
  }
  return { dirs: results };
}

export { setupHealthRoutes };
