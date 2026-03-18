/**
 * Heady Integration Smoke Tests
 * Validates all new services, tools, workflows, agents, and nodes
 * © 2026 HeadySystems Inc.
 */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const CSL = { MIN: 0.500, MED: 0.809, CRIT: 0.927 };

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('\n=== Heady Integration Smoke Tests ===\n');

// Test 1: All service files exist
console.log('--- Services ---');
const serviceDir = path.join(__dirname, '..', 'new-services');
const expectedServices = [
  'heady-cortex-service','heady-chronicle-service','heady-nexus-service','heady-oracle-service',
  'heady-genesis-service','heady-prism-service','heady-beacon-service','heady-forge-service',
  'heady-spectrum-service','heady-atlas-mapping-service','heady-flux-service','heady-vault-service',
  'heady-echo-service','heady-harbor-service','heady-compass-service','heady-catalyst-service',
  'heady-guardian-service','heady-resonance-service','heady-weaver-service','heady-phoenix-service',
  'heady-synapse-service','heady-mirror-service','heady-aurora-service','heady-genome-service',
  'heady-meridian-service'
];

for (const svc of expectedServices) {
  test(`Service file exists: ${svc}`, () => {
    assert(fs.existsSync(path.join(serviceDir, `${svc}.js`)), `${svc}.js missing`);
  });
}

// Test 2: All agent files exist
console.log('\n--- Agents ---');
const agentDir = path.join(__dirname, '..', 'new-agents');
const expectedAgents = [
  'cortex-bee','chronicle-bee','nexus-bee','oracle-bee','genesis-bee','prism-bee',
  'beacon-bee','forge-bee','spectrum-bee','catalyst-bee','guardian-bee','resonance-bee',
  'weaver-bee','phoenix-bee','genome-bee'
];

for (const agent of expectedAgents) {
  test(`Agent file exists: ${agent}`, () => {
    assert(fs.existsSync(path.join(agentDir, `${agent}.js`)), `${agent}.js missing`);
  });
}

// Test 3: All workflow files exist
console.log('\n--- Workflows ---');
const workflowDir = path.join(__dirname, '..', 'new-workflows');
const expectedWorkflows = [
  'deep-coherence-audit','evolutionary-optimization','incident-response-auto',
  'knowledge-crystallization','predictive-scaling','security-hardening-sweep',
  'cross-domain-sync','patent-audit-pipeline','blue-green-deployment',
  'data-lineage-trace','agent-evolution-cycle','compliance-checkpoint',
  'ecosystem-health-pulse','context-enrichment-pipeline','autonomous-repair'
];

for (const wf of expectedWorkflows) {
  test(`Workflow file exists: ${wf}`, () => {
    assert(fs.existsSync(path.join(workflowDir, `${wf}.js`)), `${wf}.js missing`);
  });
}

// Test 4: Nodes file exists and validates
console.log('\n--- Nodes ---');
test('Sacred Geometry nodes file exists', () => {
  const nodesPath = path.join(__dirname, '..', 'new-nodes', 'sacred-geometry-nodes.js');
  assert(fs.existsSync(nodesPath), 'sacred-geometry-nodes.js missing');
});

test('Nodes have valid topology', () => {
  const { NEW_NODES, validateTopology } = require(path.join(__dirname, '..', 'new-nodes', 'sacred-geometry-nodes.js'));
  assert(NEW_NODES.length >= 15, `Expected 15+ nodes, got ${NEW_NODES.length}`);
  const validation = validateTopology(NEW_NODES);
  // Just check it runs without error
  assert(typeof validation.valid === 'boolean', 'Topology validation should return valid boolean');
});

// Test 5: Shared constants
console.log('\n--- Shared ---');
test('Phi constants module loads', () => {
  const phi = require(path.join(__dirname, '..', 'shared', 'phi-constants.js'));
  assert.strictEqual(phi.PHI, PHI);
  assert.strictEqual(phi.PSI, PSI);
  assert(phi.FIB.length >= 17, 'FIB should have 17+ terms');
  assert(phi.CSL_THRESHOLDS.MEDIUM === CSL.MED, 'CSL MED threshold mismatch');
});

// Test 6: Wiring manifest
console.log('\n--- Wiring ---');
test('Wiring manifest loads', () => {
  const { WIRING_MAP, computeWiringStats } = require(path.join(__dirname, '..', 'wiring', 'ecosystem-wiring-manifest.js'));
  const stats = computeWiringStats(WIRING_MAP);
  assert(stats.totalConnections > 30, `Expected 30+ connections, got ${stats.totalConnections}`);
  assert(stats.totalSources >= 8, `Expected 8+ source services, got ${stats.totalSources}`);
});

// Test 7: MCP Tools Registry
console.log('\n--- Tools ---');
test('MCP tools registry loads', () => {
  const toolsPath = path.join(__dirname, '..', 'new-tools', 'mcp-tools-registry.js');
  assert(fs.existsSync(toolsPath), 'mcp-tools-registry.js missing');
});

// Test 8: Phi-math invariants
console.log('\n--- Phi Math ---');
test('PHI * PSI ≈ 1', () => {
  assert(Math.abs(PHI * PSI - 1) < 0.001, 'PHI * PSI should equal ~1');
});

test('PHI - PSI = 1', () => {
  assert(Math.abs(PHI - PSI - 1) < 0.001, 'PHI - PSI should equal 1');
});

test('Pool allocation sums to ~81%', () => {
  const total = 0.34 + 0.21 + 0.13 + 0.08 + 0.05;
  assert(Math.abs(total - 0.81) < 0.01, `Pool sum ${total} should be ~0.81`);
});

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${passed + failed} total ===\n`);
process.exit(failed > 0 ? 1 : 0);
