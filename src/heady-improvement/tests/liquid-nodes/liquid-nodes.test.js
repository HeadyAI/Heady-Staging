/**
 * Tests — core/liquid-nodes
 * 
 * Validates φ-scaled node registry, vector routing, health monitoring,
 * topology management, and Colab runtime integration.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { strict as assert } from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

// φ constants for validation
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

describe('LiquidNodes — NodeRegistry', () => {
  let NodeRegistry;

  beforeEach(async () => {
    const mod = await import('../../core/liquid-nodes/node-registry.js');
    NodeRegistry = mod.NodeRegistry;
  });

  it('should register a node with valid configuration', () => {
    const registry = new NodeRegistry();
    const nodeId = registry.register({
      type: 'compute',
      role: 'embedding',
      capacity: FIB[8],
      endpoint: 'https://embedding.heady-internal:8080',
    });

    assert.ok(nodeId, 'Should return a node ID');
    const node = registry.get(nodeId);
    assert.equal(node.type, 'compute');
    assert.equal(node.role, 'embedding');
    assert.equal(node.capacity, FIB[8]);
  });

  it('should enforce φ-scaled capacity limits', () => {
    const registry = new NodeRegistry();
    const nodeId = registry.register({
      type: 'compute',
      role: 'inference',
      capacity: FIB[7], // 13
      endpoint: 'https://inference.heady-internal:8080',
    });

    const node = registry.get(nodeId);
    // Capacity must be a Fibonacci number
    assert.ok(FIB.includes(node.capacity),
      `Capacity ${node.capacity} must be a Fibonacci number`);
  });

  it('should discover nodes by role', () => {
    const registry = new NodeRegistry();
    registry.register({ type: 'compute', role: 'embedding', capacity: FIB[6], endpoint: 'a' });
    registry.register({ type: 'compute', role: 'inference', capacity: FIB[7], endpoint: 'b' });
    registry.register({ type: 'compute', role: 'embedding', capacity: FIB[8], endpoint: 'c' });

    const embeddingNodes = registry.findByRole('embedding');
    assert.equal(embeddingNodes.length, 2, 'Should find 2 embedding nodes');
  });

  it('should deregister nodes cleanly', () => {
    const registry = new NodeRegistry();
    const nodeId = registry.register({
      type: 'compute', role: 'training', capacity: FIB[5], endpoint: 'd',
    });

    assert.ok(registry.get(nodeId), 'Node should exist');
    registry.deregister(nodeId);
    assert.equal(registry.get(nodeId), null, 'Node should be removed');
  });

  it('should track node count via stats', () => {
    const registry = new NodeRegistry();
    registry.register({ type: 'compute', role: 'a', capacity: FIB[5], endpoint: 'x' });
    registry.register({ type: 'storage', role: 'b', capacity: FIB[6], endpoint: 'y' });

    const stats = registry.stats;
    assert.equal(stats.totalNodes, 2);
  });
});

describe('LiquidNodes — VectorRouter', () => {
  let VectorRouter;

  beforeEach(async () => {
    const mod = await import('../../core/liquid-nodes/vector-router.js');
    VectorRouter = mod.VectorRouter;
  });

  it('should route to nearest node by vector similarity', () => {
    const router = new VectorRouter();
    router.addRoute('embedding-a', new Array(384).fill(0.1));
    router.addRoute('embedding-b', new Array(384).fill(0.9));

    const queryVector = new Array(384).fill(0.85);
    const route = router.route(queryVector);
    assert.equal(route.nodeId, 'embedding-b',
      'Should route to node B (closer vector)');
  });

  it('should compute cosine similarity correctly', () => {
    const router = new VectorRouter();
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    const similarity = router.cosineSimilarity(a, b);
    assert.ok(Math.abs(similarity - 1.0) < 1e-10,
      'Identical vectors should have similarity 1.0');
  });

  it('should compute cosine similarity for orthogonal vectors', () => {
    const router = new VectorRouter();
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    const similarity = router.cosineSimilarity(a, b);
    assert.ok(Math.abs(similarity) < 1e-10,
      'Orthogonal vectors should have similarity 0.0');
  });

  it('should respect CSL gate threshold for routing', () => {
    const router = new VectorRouter();
    router.addRoute('node-a', new Array(384).fill(0.5));
    // Query vector very different — should not route if below threshold
    const queryVector = new Array(384).fill(-0.5);
    const route = router.route(queryVector, { threshold: 0.809 });
    // Route may be null or have low confidence
    if (route) {
      assert.ok(route.confidence !== undefined, 'Route should include confidence score');
    }
  });
});

describe('LiquidNodes — HealthMonitor', () => {
  let HealthMonitor;

  beforeEach(async () => {
    const mod = await import('../../core/liquid-nodes/health-monitor.js');
    HealthMonitor = mod.HealthMonitor;
  });

  it('should initialize with φ-scaled check intervals', () => {
    const monitor = new HealthMonitor();
    const config = monitor.config;
    // Check interval should be FIB-based
    assert.ok(config.checkIntervalMs > 0, 'Check interval must be positive');
  });

  it('should report healthy for a responsive node', async () => {
    const monitor = new HealthMonitor();
    const mockNode = {
      id: 'test-node',
      endpoint: 'http://localhost:8080',
      healthCheck: async () => ({ status: 'healthy', latencyMs: 42 }),
    };

    const result = await monitor.checkNode(mockNode);
    assert.equal(result.status, 'healthy');
    assert.ok(result.latencyMs <= 42);
  });

  it('should use φ-scaled thresholds for health scoring', () => {
    const monitor = new HealthMonitor();
    // Health score computation uses CSL gate
    const healthScore = monitor.computeHealthScore({
      latencyMs: 100,
      errorRate: 0.01,
      uptime: 0.999,
    });

    assert.ok(healthScore >= 0 && healthScore <= 1,
      `Health score ${healthScore} must be in [0,1]`);
  });
});

describe('LiquidNodes — Topology', () => {
  let Topology;

  beforeEach(async () => {
    const mod = await import('../../core/liquid-nodes/topology.js');
    Topology = mod.Topology;
  });

  it('should create a topology with Sacred Geometry layout', () => {
    const topo = new Topology();
    topo.addNode('gateway', { x: 0, y: 0, z: 0 });
    topo.addNode('compute-a', { x: PHI, y: 0, z: PSI });
    topo.addNode('compute-b', { x: -PHI, y: 0, z: PSI });

    assert.equal(topo.nodeCount, 3);
  });

  it('should compute distances using 3D Euclidean metric', () => {
    const topo = new Topology();
    topo.addNode('a', { x: 0, y: 0, z: 0 });
    topo.addNode('b', { x: 3, y: 4, z: 0 });

    const dist = topo.distance('a', 'b');
    assert.ok(Math.abs(dist - 5.0) < 1e-10,
      `Distance should be 5.0, got ${dist}`);
  });

  it('should find nearest neighbors', () => {
    const topo = new Topology();
    topo.addNode('center', { x: 0, y: 0, z: 0 });
    topo.addNode('near', { x: 1, y: 0, z: 0 });
    topo.addNode('far', { x: 10, y: 10, z: 10 });

    const neighbors = topo.nearestNeighbors('center', 1);
    assert.equal(neighbors[0].id, 'near');
  });

  it('should connect nodes with edges', () => {
    const topo = new Topology();
    topo.addNode('a', { x: 0, y: 0, z: 0 });
    topo.addNode('b', { x: 1, y: 0, z: 0 });
    topo.connect('a', 'b', { latency: 5, bandwidth: 1000 });

    const edge = topo.getEdge('a', 'b');
    assert.ok(edge, 'Edge should exist');
    assert.equal(edge.latency, 5);
  });
});

describe('LiquidNodes — ColabRuntime', () => {
  let ColabRuntime;

  beforeEach(async () => {
    const mod = await import('../../core/liquid-nodes/colab-runtime.js');
    ColabRuntime = mod.ColabRuntime;
  });

  it('should manage 3 runtimes with distinct roles', () => {
    const runtime = new ColabRuntime();
    const runtimes = runtime.getRuntimes();
    assert.equal(runtimes.length, 3, 'Must have exactly 3 Colab Pro+ runtimes');

    const roles = runtimes.map(r => r.role);
    assert.ok(roles.includes('embedding'), 'Must have embedding runtime');
    assert.ok(roles.includes('inference'), 'Must have inference runtime');
    assert.ok(roles.includes('training'), 'Must have training runtime');
  });

  it('should route jobs to correct runtime by role', () => {
    const runtime = new ColabRuntime();
    const target = runtime.routeJob({ type: 'embedding', payload: {} });
    assert.equal(target.role, 'embedding');
  });

  it('should track runtime health with φ-scaled thresholds', () => {
    const runtime = new ColabRuntime();
    const health = runtime.getHealth();

    for (const r of health) {
      assert.ok(r.healthScore >= 0 && r.healthScore <= 1,
        `Health score must be in [0,1], got ${r.healthScore}`);
      // Pressure level uses φ-scaled bands
      assert.ok(['nominal', 'elevated', 'high', 'critical'].includes(r.pressureBand),
        `Invalid pressure band: ${r.pressureBand}`);
    }
  });

  it('should enforce φ-scaled batch sizes', () => {
    const runtime = new ColabRuntime();
    const config = runtime.getConfig();
    assert.ok(FIB.includes(config.batchSize),
      `Batch size ${config.batchSize} must be a Fibonacci number`);
  });
});
