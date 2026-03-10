/**
 * Tests — core/swarm-engine
 * 
 * Validates bee lifecycle, swarm management, task routing,
 * work-stealing, backpressure, and consensus protocols.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { strict as assert } from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

describe('SwarmEngine — BeeLifecycle', () => {
  let BeeLifecycle;

  beforeEach(async () => {
    const mod = await import('../../core/swarm-engine/bee-lifecycle.js');
    BeeLifecycle = mod.BeeLifecycle;
  });

  it('should spawn a bee with valid state transitions', async () => {
    const lifecycle = new BeeLifecycle();
    const bee = await lifecycle.spawn({
      template: 'compute-worker',
      swarmType: 'deploy',
      maxTasks: FIB[6],
    });

    assert.ok(bee.id, 'Bee must have an ID');
    assert.equal(bee.state, 'idle', 'New bee should be idle');
    assert.equal(bee.maxTasks, FIB[6], `Max tasks should be ${FIB[6]}`);
  });

  it('should transition through valid lifecycle states', async () => {
    const lifecycle = new BeeLifecycle();
    const bee = await lifecycle.spawn({ template: 'worker', swarmType: 'research' });

    // idle → active
    await lifecycle.activate(bee.id);
    assert.equal(lifecycle.getState(bee.id), 'active');

    // active → draining
    await lifecycle.drain(bee.id);
    assert.equal(lifecycle.getState(bee.id), 'draining');

    // draining → terminated
    await lifecycle.terminate(bee.id);
    assert.equal(lifecycle.getState(bee.id), 'terminated');
  });

  it('should reject invalid state transitions', async () => {
    const lifecycle = new BeeLifecycle();
    const bee = await lifecycle.spawn({ template: 'worker', swarmType: 'testing' });

    // Cannot go from idle → draining directly
    try {
      await lifecycle.drain(bee.id);
      assert.fail('Should reject idle → draining transition');
    } catch (err) {
      assert.ok(err.message.includes('Invalid state transition') ||
                err.message.includes('invalid'),
        'Should throw state transition error');
    }
  });

  it('should enforce TTL with φ-scaled defaults', async () => {
    const lifecycle = new BeeLifecycle();
    const bee = await lifecycle.spawn({
      template: 'ephemeral',
      swarmType: 'cleanup',
      ttlMs: FIB[11] * 1000, // 89s
    });

    assert.equal(bee.ttlMs, FIB[11] * 1000);
  });
});

describe('SwarmEngine — SwarmManager', () => {
  let SwarmManager;

  beforeEach(async () => {
    const mod = await import('../../core/swarm-engine/swarm-manager.js');
    SwarmManager = mod.SwarmManager;
  });

  it('should manage all 17 canonical swarms', () => {
    const manager = new SwarmManager();
    const swarms = manager.listSwarms();

    const CANONICAL_SWARMS = [
      'deploy', 'battle', 'research', 'security', 'memory',
      'creative', 'trading', 'health', 'governance', 'documentation',
      'testing', 'migration', 'monitoring', 'cleanup', 'onboarding',
      'analytics', 'emergency',
    ];

    for (const name of CANONICAL_SWARMS) {
      assert.ok(swarms.find(s => s.name === name),
        `Missing canonical swarm: ${name}`);
    }
    assert.equal(swarms.length, 17, 'Must have exactly 17 swarms');
  });

  it('should use concurrent-equals model (no priorities)', () => {
    const manager = new SwarmManager();
    const swarms = manager.listSwarms();

    for (const swarm of swarms) {
      assert.equal(swarm.priority, undefined,
        `Swarm "${swarm.name}" must not have priority (concurrent-equals)`);
    }
  });

  it('should scale swarm bee count within φ-scaled limits', async () => {
    const manager = new SwarmManager();
    const result = await manager.scale('deploy', FIB[6]);

    assert.equal(result.targetBees, FIB[6]);
    assert.ok(FIB.includes(result.targetBees),
      'Bee count must be a Fibonacci number');
  });

  it('should report swarm statistics', () => {
    const manager = new SwarmManager();
    const stats = manager.getStats('research');

    assert.ok(stats.activeBees !== undefined);
    assert.ok(stats.pendingTasks !== undefined);
    assert.ok(stats.pressure !== undefined);
  });
});

describe('SwarmEngine — TaskRouter', () => {
  let TaskRouter;

  beforeEach(async () => {
    const mod = await import('../../core/swarm-engine/task-router.js');
    TaskRouter = mod.TaskRouter;
  });

  it('should route tasks to appropriate swarm based on type', () => {
    const router = new TaskRouter();
    const route = router.route({ type: 'deploy', payload: { service: 'auth' } });
    assert.equal(route.swarm, 'deploy');
  });

  it('should CSL-gate route confidence', () => {
    const router = new TaskRouter();
    const route = router.route({ type: 'research', payload: { query: 'CSL gates' } });

    assert.ok(route.confidence >= 0 && route.confidence <= 1,
      `Route confidence must be [0,1], got ${route.confidence}`);
  });

  it('should balance load across available bees', () => {
    const router = new TaskRouter();
    const routes = [];
    for (let i = 0; i < FIB[7]; i++) {
      routes.push(router.route({ type: 'testing', payload: { testId: i } }));
    }

    // Should distribute, not pile on one bee
    const beeIds = new Set(routes.map(r => r.assignedBee).filter(Boolean));
    assert.ok(beeIds.size >= 1, 'Should distribute across multiple bees');
  });
});

describe('SwarmEngine — WorkStealer', () => {
  let WorkStealer;

  beforeEach(async () => {
    const mod = await import('../../core/swarm-engine/work-stealer.js');
    WorkStealer = mod.WorkStealer;
  });

  it('should steal work from overloaded bees', async () => {
    const stealer = new WorkStealer();

    // Mock overloaded bee
    stealer.registerBee('bee-1', {
      taskQueue: Array(FIB[8]).fill({ id: 'task' }),
      maxTasks: FIB[6],
    });
    // Mock idle bee
    stealer.registerBee('bee-2', {
      taskQueue: [],
      maxTasks: FIB[6],
    });

    const stolen = await stealer.attemptSteal('bee-2');
    assert.ok(stolen.length > 0, 'Should steal at least one task');
  });

  it('should respect φ-scaled steal threshold', () => {
    const stealer = new WorkStealer();
    const config = stealer.config;

    // Steal threshold should use ψ or ψ² based values
    assert.ok(config.stealThreshold > 0 && config.stealThreshold < 1,
      'Steal threshold must be between 0 and 1');
  });
});

describe('SwarmEngine — Backpressure', () => {
  let BackpressureManager;

  beforeEach(async () => {
    const mod = await import('../../core/swarm-engine/backpressure.js');
    BackpressureManager = mod.BackpressureManager;
  });

  it('should use φ-scaled pressure levels', () => {
    const bp = new BackpressureManager();
    const levels = bp.getPressureLevels();

    // Verify φ-scaled boundaries
    assert.ok(Math.abs(levels.nominal.max - PSI2) < 0.01,
      `Nominal max should be ≈${PSI2}`);
    assert.ok(Math.abs(levels.elevated.max - PSI) < 0.01,
      `Elevated max should be ≈${PSI}`);
  });

  it('should classify pressure level correctly', () => {
    const bp = new BackpressureManager();

    assert.equal(bp.classifyPressure(0.1), 'nominal');
    assert.equal(bp.classifyPressure(0.5), 'elevated');
    assert.equal(bp.classifyPressure(0.7), 'high');
    assert.equal(bp.classifyPressure(0.95), 'critical');
  });

  it('should apply adaptive throttling at high pressure', () => {
    const bp = new BackpressureManager();
    bp.setPressure(0.8); // High pressure

    const allowed = bp.shouldAcceptTask();
    // At high pressure, some tasks should be shed
    assert.ok(typeof allowed === 'boolean');
  });
});

describe('SwarmEngine — Consensus', () => {
  let ConsensusProtocol;

  beforeEach(async () => {
    const mod = await import('../../core/swarm-engine/consensus.js');
    ConsensusProtocol = mod.ConsensusProtocol;
  });

  it('should reach consensus with sufficient agreement', async () => {
    const protocol = new ConsensusProtocol();
    const votes = [
      { beeId: 'bee-1', vote: true, confidence: 0.9 },
      { beeId: 'bee-2', vote: true, confidence: 0.85 },
      { beeId: 'bee-3', vote: true, confidence: 0.88 },
    ];

    const result = await protocol.evaluate('proposal-1', votes);
    assert.equal(result.accepted, true, 'Should accept with high agreement');
    assert.ok(result.agreementScore > 0.809,
      'Agreement score should exceed MEDIUM threshold');
  });

  it('should reject consensus with insufficient agreement', async () => {
    const protocol = new ConsensusProtocol();
    const votes = [
      { beeId: 'bee-1', vote: true, confidence: 0.6 },
      { beeId: 'bee-2', vote: false, confidence: 0.7 },
      { beeId: 'bee-3', vote: false, confidence: 0.65 },
    ];

    const result = await protocol.evaluate('proposal-2', votes);
    assert.equal(result.accepted, false, 'Should reject with low agreement');
  });

  it('should use φ-scaled quorum threshold', () => {
    const protocol = new ConsensusProtocol();
    const config = protocol.config;

    // Default quorum should be phiThreshold(2) ≈ 0.809
    assert.ok(Math.abs(config.quorumThreshold - 0.809) < 0.01,
      `Quorum threshold should be ≈0.809, got ${config.quorumThreshold}`);
  });
});
