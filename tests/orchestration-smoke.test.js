/**
 * Smoke test — core orchestration module loading
 *
 * Validates that all critical orchestration, bee/swarm, and liquid-node
 * modules load without crashing and export the expected interfaces.
 * Run with: node --test tests/orchestration-smoke.test.js
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ─── Bee / Swarm layer ──────────────────────────────────────────────────────

describe('bee-factory', () => {
  it('loads and exports BeeFactory class', () => {
    const mod = require('../src/bees/bee-factory');
    assert.equal(typeof mod.BeeFactory, 'function', 'BeeFactory must be a class');
    assert.equal(typeof mod.LIFECYCLE, 'object');
    assert.ok(mod.MAX_TOTAL_BEES > 0, 'MAX_TOTAL_BEES must be positive');
  });

  it('can register a swarm and spawn bees', () => {
    const { BeeFactory } = require('../src/bees/bee-factory');
    const factory = new BeeFactory({ logger: { info() {}, warn() {}, error() {} } });
    const swarm = factory.registerSwarm('test-swarm', 'compute', 0);
    assert.equal(swarm.id, 'test-swarm');
    assert.ok(swarm.bees.size > 0, 'Pre-warm should have spawned bees');
    const status = factory.status();
    assert.ok(status.total > 0);
  });
});

describe('swarm-coordinator', () => {
  it('loads and exports SwarmCoordinator class', () => {
    const mod = require('../src/bees/swarm-coordinator');
    assert.equal(typeof mod.SwarmCoordinator, 'function');
    assert.ok(mod.ROUTE_THRESHOLD > 0);
    assert.ok(mod.MAX_CONCURRENT_DISPATCH > 0);
  });
});

// ─── Liquid layer ────────────────────────────────────────────────────────────

describe('liquid-node', () => {
  it('loads and exports LiquidNode class', () => {
    const mod = require('../src/liquid/liquid-node');
    assert.equal(typeof mod.LiquidNode, 'function');
    assert.ok(mod.NODE_STATES);
    assert.ok(mod.POOL_TYPES);
  });

  it('computes real scoreForTask', () => {
    const { LiquidNode } = require('../src/liquid/liquid-node');
    const node = new LiquidNode({ type: 'compute' });
    const taskEmb = new Float32Array(384);
    for (let i = 0; i < 384; i++) taskEmb[i] = Math.random() - 0.5;
    const score = node.scoreForTask(taskEmb);
    assert.equal(typeof score, 'number');
    assert.ok(!Number.isNaN(score), 'scoreForTask must not return NaN');
    assert.ok(score >= -1 && score <= 2, `score ${score} out of expected range`);
  });

  it('computes real coherence from design embedding', () => {
    const { LiquidNode } = require('../src/liquid/liquid-node');
    const node = new LiquidNode({ type: 'test' });
    node._updateCoherence();
    // Fresh node: capabilities === designEmbedding → coherence ≈ 1.0
    assert.ok(node.coherenceScore > 0.99, `Fresh node coherence should be ~1.0, got ${node.coherenceScore}`);
    // Mutate capabilities to trigger drift
    node.capabilities[0] = -node.capabilities[0];
    node.capabilities[1] = -node.capabilities[1];
    node._updateCoherence();
    assert.ok(node.coherenceScore < 1.0, 'Mutated node should have coherence < 1.0');
  });
});

describe('liquid-mesh', () => {
  it('loads and exports LiquidMesh class', () => {
    const mod = require('../src/liquid/liquid-mesh');
    assert.equal(typeof mod.LiquidMesh, 'function');
  });
});

describe('liquid-task-executor', () => {
  it('loads and exports LiquidTaskExecutor and TaskDAG', () => {
    const mod = require('../src/liquid/liquid-task-executor');
    assert.equal(typeof mod.LiquidTaskExecutor, 'function');
    assert.equal(typeof mod.TaskDAG, 'function');
    assert.equal(typeof mod.DeadLetterQueue, 'function');
  });
});

// ─── Conductor / Council ─────────────────────────────────────────────────────

describe('heady-conductor', () => {
  it('loads and exports HeadyConductor class', () => {
    const mod = require('../src/orchestration/heady-conductor');
    assert.equal(typeof mod.HeadyConductor, 'function');
    assert.ok(mod.DOMAINS);
    assert.equal(typeof mod.embedTask, 'function');
  });

  it('classifies a task into a domain with real cosine scoring', () => {
    const { HeadyConductor } = require('../src/orchestration/heady-conductor');
    const conductor = new HeadyConductor({ logger: { info() {}, warn() {}, error() {} } });
    const result = conductor.classify({ id: 'test-1', description: 'review this code for security vulnerabilities' });
    assert.ok(result.domain, 'Must classify into a domain');
    assert.ok(result.score > 0, 'Score must be positive');
    // Should route to SECURITY or CODE_REVIEW
    assert.ok(['SECURITY', 'CODE_REVIEW'].includes(result.domain.id),
      `Expected SECURITY or CODE_REVIEW, got ${result.domain.id}`);
  });
});

describe('heady-council', () => {
  it('loads as CJS and exports HeadyCouncil class', () => {
    const mod = require('../src/orchestration/heady-council');
    assert.equal(typeof mod.HeadyCouncil, 'function');
    assert.ok(mod.COUNCIL_MEMBERS);
    assert.equal(Object.keys(mod.COUNCIL_MEMBERS).length, 7, 'Must have 7 council members');
  });
});
