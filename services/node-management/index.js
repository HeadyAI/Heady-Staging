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
// ║  FILE: services/node-management/index.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
const express = require('express');
const router = express.Router();
const { createLogger } = require('../../packages/structured-logger');
const log = createLogger('node-management-service');

let _deps = {};

/**
 * Initialize the node management service with dependencies
 * @param {Object} deps - Dependencies object
 * @param {Function} deps.loadRegistry - Function to load registry data
 * @param {Function} deps.saveRegistry - Function to save registry data
 */
function init(deps) {
  _deps = deps;
  log.info('Node management service initialized with dependencies');
}

/**
 * GET /api/nodes
 * List all nodes from the registry
 */
router.get('/', async (req, res) => {
  try {
    log.debug('Fetching all nodes from registry');
    const registry = await _deps.loadRegistry();
    
    const nodes = registry.nodes || [];
    log.info(`Retrieved ${nodes.length} nodes from registry`);
    
    res.json({
      success: true,
      count: nodes.length,
      nodes: nodes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log.error(`Error fetching nodes: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nodes',
      message: error.message
    });
  }
});

/**
 * GET /api/nodes/:nodeId
 * Get a specific node by ID
 */
router.get('/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    log.debug(`Fetching node: ${nodeId}`);
    
    const registry = await _deps.loadRegistry();
    const node = registry.nodes?.find(n => n.id === nodeId || n.nodeId === nodeId);
    
    if (!node) {
      log.warn(`Node not found: ${nodeId}`);
      return res.status(404).json({
        success: false,
        error: 'Node not found',
        nodeId: nodeId
      });
    }
    
    log.info(`Retrieved node: ${nodeId}`);
    res.json({
      success: true,
      node: node,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log.error(`Error fetching node ${req.params.nodeId}: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch node',
      message: error.message
    });
  }
});

/**
 * POST /api/nodes/:nodeId/activate
 * Activate a specific node
 */
router.post('/:nodeId/activate', async (req, res) => {
  try {
    const { nodeId } = req.params;
    log.info(`Activating node: ${nodeId}`);
    
    const registry = await _deps.loadRegistry();
    const nodeIndex = registry.nodes?.findIndex(n => n.id === nodeId || n.nodeId === nodeId);
    
    if (nodeIndex === undefined || nodeIndex === -1) {
      log.warn(`Node not found for activation: ${nodeId}`);
      return res.status(404).json({
        success: false,
        error: 'Node not found',
        nodeId: nodeId
      });
    }
    
    // Activate the node
    registry.nodes[nodeIndex].active = true;
    registry.nodes[nodeIndex].status = 'active';
    registry.nodes[nodeIndex].activatedAt = new Date().toISOString();
    
    // Save the updated registry
    await _deps.saveRegistry(registry);
    
    log.info(`Node activated successfully: ${nodeId}`);
    res.json({
      success: true,
      message: 'Node activated successfully',
      node: registry.nodes[nodeIndex],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log.error(`Error activating node ${req.params.nodeId}: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      error: 'Failed to activate node',
      message: error.message
    });
  }
});

/**
 * POST /api/nodes/:nodeId/deactivate
 * Deactivate a specific node
 */
router.post('/:nodeId/deactivate', async (req, res) => {
  try {
    const { nodeId } = req.params;
    log.info(`Deactivating node: ${nodeId}`);
    
    const registry = await _deps.loadRegistry();
    const nodeIndex = registry.nodes?.findIndex(n => n.id === nodeId || n.nodeId === nodeId);
    
    if (nodeIndex === undefined || nodeIndex === -1) {
      log.warn(`Node not found for deactivation: ${nodeId}`);
      return res.status(404).json({
        success: false,
        error: 'Node not found',
        nodeId: nodeId
      });
    }
    
    // Deactivate the node
    registry.nodes[nodeIndex].active = false;
    registry.nodes[nodeIndex].status = 'inactive';
    registry.nodes[nodeIndex].deactivatedAt = new Date().toISOString();
    
    // Save the updated registry
    await _deps.saveRegistry(registry);
    
    log.info(`Node deactivated successfully: ${nodeId}`);
    res.json({
      success: true,
      message: 'Node deactivated successfully',
      node: registry.nodes[nodeIndex],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log.error(`Error deactivating node ${req.params.nodeId}: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate node',
      message: error.message
    });
  }
});

module.exports = {
  router,
  init
};
