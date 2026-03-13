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
// ║  FILE: services/registry/index.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
// ═══════════════════════════════════════════════════════════════════════════
// 💎 Sacred Geometry Registry Service
// ═══════════════════════════════════════════════════════════════════════════
// Microservice handling registry CRUD operations for components, docs, notebooks,
// patterns, workflows, and AI nodes. Extracted from heady-manager.js

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const { createLogger } = require('../../packages/structured-logger');
const log = createLogger('registry-service');

// Registry file path
const REGISTRY_PATH = path.join(__dirname, '../../heady-registry.json');

// ─── Utility ────────────────────────────────────────────────────────────────
/**
 * Safely read and parse a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {object|null} Parsed JSON or null if error
 */
function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// ─── Registry Load/Save ──────────────────────────────────────────────────────
/**
 * Load registry from disk
 * @returns {object} Registry object or empty default
 */
function loadRegistry() {
  return readJsonSafe(REGISTRY_PATH) || {
    nodes: {},
    tools: {},
    workflows: {},
    services: {},
    skills: {},
    components: [],
    environments: [],
    docs: [],
    notebooks: [],
    patterns: [],
    aiNodes: []
  };
}

/**
 * Save registry to disk
 * @param {object} data - Registry data to save
 */
function saveRegistry(data) {
  try {
    fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2), 'utf8');
    log.info('Registry saved successfully');
  } catch (error) {
    log.error(`Failed to save registry: ${error.message}`);
    throw error;
  }
}

// ─── Registry Endpoints ──────────────────────────────────────────────────────

/**
 * GET /
 * Get full registry
 *
 * @summary Get registry data
 * @responses
 *   200:
 *     description: Registry data
 */
router.get('/', (req, res) => {
  const registryPath = path.join(__dirname, '../../heady-registry.json');
  const registry = readJsonSafe(registryPath);
  if (!registry) return res.status(404).json({ error: 'Registry not found' });
  res.json(registry);
});

/**
 * GET /component/:id
 * Get a specific component by ID
 *
 * @summary Get component data
 * @param {string} id
 *   type: string
 * @responses
 *   200:
 *     description: Component data
 */
router.get('/component/:id', (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, '../../heady-registry.json'));
  if (!registry) return res.status(404).json({ error: 'Registry not found' });
  const comp = (registry.components || []).find(c => c.id === req.params.id);
  if (!comp) return res.status(404).json({ error: `Component '${req.params.id}' not found` });
  res.json(comp);
});

/**
 * GET /environments
 * Get environments data
 *
 * @summary Get environments data
 * @responses
 *   200:
 *     description: Environments data
 */
router.get('/environments', (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, '../../heady-registry.json'));
  if (!registry) return res.status(404).json({ error: 'Registry not found' });
  res.json({ environments: registry.environments || [], ts: new Date().toISOString() });
});

/**
 * GET /docs
 * Get docs data
 *
 * @summary Get docs data
 * @responses
 *   200:
 *     description: Docs data
 */
router.get('/docs', (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, '../../heady-registry.json'));
  if (!registry) return res.status(404).json({ error: 'Registry not found' });
  res.json({ docs: registry.docs || [], ts: new Date().toISOString() });
});

/**
 * GET /notebooks
 * Get notebooks data
 *
 * @summary Get notebooks data
 * @responses
 *   200:
 *     description: Notebooks data
 */
router.get('/notebooks', (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, '../../heady-registry.json'));
  if (!registry) return res.status(404).json({ error: 'Registry not found' });
  res.json({ notebooks: registry.notebooks || [], ts: new Date().toISOString() });
});

/**
 * GET /patterns
 * Get patterns data
 *
 * @summary Get patterns data
 * @responses
 *   200:
 *     description: Patterns data
 */
router.get('/patterns', (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, '../../heady-registry.json'));
  if (!registry) return res.status(404).json({ error: 'Registry not found' });
  res.json({ patterns: registry.patterns || [], ts: new Date().toISOString() });
});

/**
 * GET /workflows
 * Get workflows data
 *
 * @summary Get workflows data
 * @responses
 *   200:
 *     description: Workflows data
 */
router.get('/workflows', (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, '../../heady-registry.json'));
  if (!registry) return res.status(404).json({ error: 'Registry not found' });
  res.json({ workflows: registry.workflows || [], ts: new Date().toISOString() });
});

/**
 * GET /ai-nodes
 * Get AI nodes data
 *
 * @summary Get AI nodes data
 * @responses
 *   200:
 *     description: AI nodes data
 */
router.get('/ai-nodes', (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, '../../heady-registry.json'));
  if (!registry) return res.status(404).json({ error: 'Registry not found' });
  res.json({ aiNodes: registry.aiNodes || [], ts: new Date().toISOString() });
});

// ─── Exports ────────────────────────────────────────────────────────────────
module.exports = { router, loadRegistry, saveRegistry };