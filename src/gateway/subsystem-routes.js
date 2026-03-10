// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/gateway/subsystem-routes.js                            ║
// ║  LAYER: backend/src                                               ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * Subsystem Routes — API endpoints for Colab Cluster, Swarm Coordinator,
 * Bee Factory, Universal Agent Prompt, and Liquid Node infrastructure.
 *
 * Wires all subsystems into the Express app and exposes health, status,
 * and task execution endpoints for each subsystem.
 *
 * @module subsystem-routes
 * @version 1.0.0
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { ColabRuntimeCluster } = require('../colab/colab-runtime-nodes.js');
const { loadUniversalPrompt, buildAgentPrompt, buildCompactDirective,
        getPromptHash, CSL_GATES, ARCHETYPES, COLAB_RUNTIMES,
        SWARM_MATRIX } = require('../agents/universal-agent-prompt.js');

// Lazy-load bee factory and swarm coordinator (CJS modules)
let BeeFactory, SwarmCoordinator;
try {
  BeeFactory = require('../bees/bee-factory.js');
  SwarmCoordinator = require('../bees/swarm-coordinator.js');
} catch (err) {
  console.warn('[SubsystemRoutes] Bee/Swarm modules not loaded:', err.message);
}

// ── Subsystem Singletons ──

let colabCluster = null;
let beeFactory = null;
let swarmCoordinator = null;

/**
 * Initialize all subsystems. Called once at server startup.
 * @returns {Promise<Object>} Initialized subsystem references
 */
async function initializeSubsystems() {
  const results = { colab: false, bees: false, swarms: false, prompt: false };

  // 1. Initialize Colab Runtime Cluster (3 Colab Pro+ A100s)
  try {
    colabCluster = new ColabRuntimeCluster();
    await colabCluster.initialize();
    results.colab = true;
    console.log('[SubsystemRoutes] Colab Runtime Cluster initialized (3 runtimes: Cortex, Synapse, Reflex)');
  } catch (err) {
    console.warn('[SubsystemRoutes] Colab cluster init failed:', err.message);
  }

  // 2. Initialize Bee Factory (17 swarms, up to 10,000 bees)
  try {
    if (BeeFactory) {
      const FactoryClass = BeeFactory.BeeFactory || BeeFactory.default || BeeFactory;
      if (typeof FactoryClass === 'function') {
        beeFactory = new FactoryClass();
        results.bees = true;
        console.log('[SubsystemRoutes] Bee Factory initialized');
      }
    }
  } catch (err) {
    console.warn('[SubsystemRoutes] Bee Factory init failed:', err.message);
  }

  // 3. Initialize Swarm Coordinator
  try {
    if (SwarmCoordinator) {
      const CoordClass = SwarmCoordinator.SwarmCoordinator || SwarmCoordinator.default || SwarmCoordinator;
      if (typeof CoordClass === 'function') {
        swarmCoordinator = new CoordClass({ beeFactory });
        results.swarms = true;
        console.log('[SubsystemRoutes] Swarm Coordinator initialized (17 swarms)');
      }
    }
  } catch (err) {
    console.warn('[SubsystemRoutes] Swarm Coordinator init failed:', err.message);
  }

  // 4. Pre-load Universal Prompt (warm the cache)
  try {
    loadUniversalPrompt();
    results.prompt = true;
    console.log(`[SubsystemRoutes] Universal Agent Prompt loaded (hash: ${getPromptHash()})`);
  } catch (err) {
    console.warn('[SubsystemRoutes] Universal Prompt load failed:', err.message);
  }

  return results;
}

/**
 * Set up all subsystem API routes on the Express app.
 * @param {import('express').Express} app - Express application
 */
function setupSubsystemRoutes(app) {

  // ═══════════════════════════════════════════════════════════════
  // COLAB CLUSTER ROUTES
  // ═══════════════════════════════════════════════════════════════

  app.get('/api/colab/cluster/health', (req, res) => {
    if (!colabCluster) {
      return res.status(503).json({ error: 'Colab cluster not initialized', status: 'offline' });
    }
    res.json(colabCluster.getClusterHealth());
  });

  app.get('/api/colab/runtimes', (req, res) => {
    if (!colabCluster) {
      return res.status(503).json({ error: 'Colab cluster not initialized' });
    }
    const health = colabCluster.getClusterHealth();
    res.json(health.nodes);
  });

  app.get('/api/colab/runtimes/:id', (req, res) => {
    if (!colabCluster) {
      return res.status(503).json({ error: 'Colab cluster not initialized' });
    }
    const node = colabCluster.nodes.get(req.params.id);
    if (!node) return res.status(404).json({ error: 'Runtime not found' });
    res.json(node.getHealth());
  });

  app.post('/api/colab/execute', async (req, res, next) => {
    try {
      if (!colabCluster) {
        return res.status(503).json({ error: 'Colab cluster not initialized' });
      }
      const { type, data } = req.body;
      if (!type) return res.status(400).json({ error: 'Missing task type' });

      const result = await colabCluster.executeTask({
        id: `task-${Date.now()}`,
        type,
        data,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SWARM & BEE ROUTES
  // ═══════════════════════════════════════════════════════════════

  app.get('/api/swarms/status', (req, res) => {
    if (!swarmCoordinator) {
      return res.json({
        status: 'not_initialized',
        swarmMatrix: SWARM_MATRIX,
        message: 'Swarm coordinator defined but not instantiated',
      });
    }
    const status = typeof swarmCoordinator.getStatus === 'function'
      ? swarmCoordinator.getStatus()
      : { status: 'active', type: 'SwarmCoordinator' };
    res.json(status);
  });

  app.get('/api/bees/status', (req, res) => {
    if (!beeFactory) {
      return res.json({
        status: 'not_initialized',
        message: 'Bee factory defined but not instantiated',
      });
    }
    const status = typeof beeFactory.getStatus === 'function'
      ? beeFactory.getStatus()
      : { status: 'active', type: 'BeeFactory' };
    res.json(status);
  });

  app.get('/api/swarms/matrix', (req, res) => {
    res.json({
      totalSwarms: SWARM_MATRIX.length,
      swarms: SWARM_MATRIX,
      beeFactoryActive: !!beeFactory,
      swarmCoordinatorActive: !!swarmCoordinator,
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UNIVERSAL AGENT PROMPT ROUTES
  // ═══════════════════════════════════════════════════════════════

  app.get('/api/universal-prompt/status', (req, res) => {
    res.json({
      loaded: !!getPromptHash(),
      hash: getPromptHash(),
      archetypes: ARCHETYPES.map(a => ({ name: a.name, domain: a.domain, gate: a.gate })),
      cslGates: CSL_GATES,
      colabRuntimes: COLAB_RUNTIMES.map(r => ({ id: r.id, codename: r.codename, role: r.role })),
      swarmCount: SWARM_MATRIX.length,
    });
  });

  app.get('/api/universal-prompt/full', (req, res) => {
    const prompt = loadUniversalPrompt();
    res.type('text/markdown').send(prompt);
  });

  app.post('/api/universal-prompt/build', (req, res) => {
    const { agentId, skills, pool, ring, stage, runId, readinessScore } = req.body;
    if (!agentId) return res.status(400).json({ error: 'Missing agentId' });

    const prompt = buildAgentPrompt(
      { id: agentId, skills: skills || [], pool: pool || 'warm', ring: ring || 'middle' },
      { stage, runId, readinessScore }
    );
    res.type('text/markdown').send(prompt);
  });

  app.post('/api/universal-prompt/compact', (req, res) => {
    const { agentId, skills, pool } = req.body;
    if (!agentId) return res.status(400).json({ error: 'Missing agentId' });

    const directive = buildCompactDirective({
      id: agentId, skills: skills || [], pool: pool || 'warm',
    });
    res.type('text/plain').send(directive);
  });

  // ═══════════════════════════════════════════════════════════════
  // COMBINED SUBSYSTEM OVERVIEW
  // ═══════════════════════════════════════════════════════════════

  app.get('/api/subsystems', (req, res) => {
    const overview = {
      colabCluster: colabCluster ? colabCluster.getClusterHealth() : { status: 'offline' },
      swarmCoordinator: swarmCoordinator
        ? (typeof swarmCoordinator.getStatus === 'function' ? swarmCoordinator.getStatus() : { status: 'active' })
        : { status: 'offline' },
      beeFactory: beeFactory
        ? (typeof beeFactory.getStatus === 'function' ? beeFactory.getStatus() : { status: 'active' })
        : { status: 'offline' },
      universalPrompt: {
        loaded: !!getPromptHash(),
        hash: getPromptHash(),
        archetypeCount: ARCHETYPES.length,
        swarmCount: SWARM_MATRIX.length,
        colabRuntimeCount: COLAB_RUNTIMES.length,
      },
      timestamp: new Date().toISOString(),
    };
    res.json(overview);
  });
}

/**
 * Shutdown all subsystems gracefully.
 * @returns {Promise<void>}
 */
async function shutdownSubsystems() {
  if (colabCluster) {
    await colabCluster.shutdown();
    console.log('[SubsystemRoutes] Colab cluster shut down');
  }
  if (beeFactory && typeof beeFactory.shutdown === 'function') {
    await beeFactory.shutdown();
    console.log('[SubsystemRoutes] Bee factory shut down');
  }
  if (swarmCoordinator && typeof swarmCoordinator.shutdown === 'function') {
    await swarmCoordinator.shutdown();
    console.log('[SubsystemRoutes] Swarm coordinator shut down');
  }
}

export {
  setupSubsystemRoutes,
  initializeSubsystems,
  shutdownSubsystems,
  colabCluster,
  beeFactory,
  swarmCoordinator,
};
