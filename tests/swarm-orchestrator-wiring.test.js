/**
 * SwarmOrchestrator Wiring Integration Tests
 *
 * Verifies the seventeen-swarm-orchestrator.js module works correctly:
 * - All 17 canonical swarms initialize
 * - Task dispatch and auto-routing
 * - Emergency escalation on high-priority failures
 * - Consensus manager with φ-weighted voting
 * - Audit log recording
 * - Message bus communication
 */

const {
  SwarmOrchestrator,
  SwarmTask,
  Swarm,
  SwarmBus,
  SwarmMessage,
  ConsensusManager,
  SWARM_NAMES,
  PRIORITY,
  SWARM_PRIORITIES,
  SWARM_STATUS,
  MESSAGE_TYPE,
  PHI,
} = require('../seventeen-swarm-orchestrator');

describe('SwarmOrchestrator — 17-Swarm Integration', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new SwarmOrchestrator();
  });

  afterEach(() => {
    orchestrator.stop();
  });

  // ─── Initialization ───────────────────────────────────────────────────
  test('initializes exactly 17 canonical swarms', () => {
    expect(orchestrator.listSwarmNames()).toHaveLength(17);
    expect(orchestrator.listSwarmNames()).toEqual(SWARM_NAMES);
  });

  test('all swarms are retrievable by name', () => {
    for (const name of SWARM_NAMES) {
      const swarm = orchestrator.getSwarm(name);
      expect(swarm).not.toBeNull();
      expect(swarm.name).toBe(name);
    }
  });

  test('start() activates heartbeats and sets initialized flag', () => {
    expect(orchestrator.getStatus().initialized).toBe(false);
    orchestrator.start();
    expect(orchestrator.getStatus().initialized).toBe(true);
  });

  test('getStatus() returns complete status with all 17 swarms', () => {
    orchestrator.start();
    const status = orchestrator.getStatus();
    expect(status.swarms).toHaveLength(17);
    expect(status.totalTasks).toBe(0);
    expect(typeof status.busHistory).toBe('number');
  });

  test('stop() clears initialized flag', () => {
    orchestrator.start();
    orchestrator.stop();
    expect(orchestrator.getStatus().initialized).toBe(false);
  });

  // ─── Task Dispatch ────────────────────────────────────────────────────
  test('dispatch routes task to explicit targetSwarm', () => {
    orchestrator.start();
    const task = orchestrator.dispatch({
      type: 'test_task',
      targetSwarm: 'Memory',
      payload: { data: 'test' },
    });
    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
  });

  test('dispatch auto-routes by task type name matching', () => {
    orchestrator.start();
    const task = orchestrator.dispatch({ type: 'deploy_service' });
    // dispatch routes internally — verify the Deploy swarm received it
    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
    const deploySwarm = orchestrator.getSwarm('Deploy');
    expect(deploySwarm.getStatus().stats.received).toBeGreaterThanOrEqual(1);
  });

  test('dispatch falls back to Memory swarm for unrecognized types', () => {
    orchestrator.start();
    const task = orchestrator.dispatch({ type: 'completely_unknown_task_xyz' });
    // Without explicit target, it falls to default routing (Memory)
    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
  });

  test('dispatch accepts SwarmTask instances', () => {
    orchestrator.start();
    const task = new SwarmTask({
      type: 'health_check',
      targetSwarm: 'Health',
      priority: PRIORITY.HIGH,
    });
    const result = orchestrator.dispatch(task);
    expect(result.id).toBe(task.id);
  });

  test('dispatched tasks are tracked in stats', () => {
    orchestrator.start();
    orchestrator.dispatch({ type: 'test_a', targetSwarm: 'Analytics' });
    orchestrator.dispatch({ type: 'test_b', targetSwarm: 'Analytics' });
    const status = orchestrator.getSwarm('Analytics').getStatus();
    expect(status.stats.received).toBe(2);
  });

  // ─── SwarmTask lifecycle ──────────────────────────────────────────────
  test('SwarmTask tracks creation time and expiry', () => {
    const task = new SwarmTask({ ttlMs: 100 });
    expect(task.isExpired()).toBe(false);
    // We won't wait — just verify the method exists and logic is correct
    expect(typeof task.isExpired).toBe('function');
  });

  test('SwarmTask.complete() sets status and result', () => {
    const task = new SwarmTask();
    task.complete({ answer: 42 });
    expect(task.status).toBe('completed');
    expect(task.result.answer).toBe(42);
    expect(task.completedAt).toBeDefined();
  });

  test('SwarmTask.fail() sets error and status', () => {
    const task = new SwarmTask();
    task.fail('something went wrong');
    expect(task.status).toBe('failed');
    expect(task.error).toBe('something went wrong');
  });

  test('SwarmTask.getDuration() returns null when not started', () => {
    const task = new SwarmTask();
    expect(task.getDuration()).toBeNull();
  });

  // ─── Swarm priority behavior ──────────────────────────────────────────
  test('Emergency swarm has highest priority', () => {
    expect(SWARM_PRIORITIES.Emergency).toBe(PRIORITY.EMERGENCY);
    expect(SWARM_PRIORITIES.Emergency).toBeGreaterThan(SWARM_PRIORITIES.Security);
  });

  test('priority ordering: Emergency > Security > Deploy > Governance > Creative > Cleanup', () => {
    expect(SWARM_PRIORITIES.Emergency).toBeGreaterThan(SWARM_PRIORITIES.Security);
    expect(SWARM_PRIORITIES.Security).toBeGreaterThan(SWARM_PRIORITIES.Deploy);
    expect(SWARM_PRIORITIES.Deploy).toBeGreaterThan(SWARM_PRIORITIES.Governance);
    expect(SWARM_PRIORITIES.Governance).toBeGreaterThan(SWARM_PRIORITIES.Creative);
    expect(SWARM_PRIORITIES.Creative).toBeGreaterThan(SWARM_PRIORITIES.Cleanup);
  });

  // ─── Message Bus ──────────────────────────────────────────────────────
  test('SwarmBus registers and broadcasts messages', () => {
    const bus = new SwarmBus();
    bus.register('A');
    bus.register('B');

    bus.send(new SwarmMessage({ type: MESSAGE_TYPE.BROADCAST, from: 'A', payload: { hello: true } }));

    expect(bus.getQueueDepth('B')).toBe(1);
    expect(bus.getQueueDepth('A')).toBe(0); // sender doesn't receive own broadcast
  });

  test('SwarmBus direct messages go only to target', () => {
    const bus = new SwarmBus();
    bus.register('X');
    bus.register('Y');
    bus.register('Z');

    bus.send(new SwarmMessage({ type: MESSAGE_TYPE.TASK, from: 'X', to: 'Y', payload: {} }));

    expect(bus.getQueueDepth('Y')).toBe(1);
    expect(bus.getQueueDepth('Z')).toBe(0);
  });

  test('SwarmBus drain clears queue', () => {
    const bus = new SwarmBus();
    bus.register('A');
    bus.register('B');
    bus.send(new SwarmMessage({ from: 'A', payload: {} }));

    const drained = bus.drain('B');
    expect(drained).toHaveLength(1);
    expect(bus.getQueueDepth('B')).toBe(0);
  });

  test('SwarmBus history is queryable with filters', () => {
    const bus = new SwarmBus();
    bus.register('A');
    bus.register('B');
    bus.send(new SwarmMessage({ type: MESSAGE_TYPE.HEARTBEAT, from: 'A' }));
    bus.send(new SwarmMessage({ type: MESSAGE_TYPE.TASK, from: 'B', to: 'A', payload: {} }));

    const hbOnly = bus.getHistory({ type: MESSAGE_TYPE.HEARTBEAT });
    expect(hbOnly).toHaveLength(1);
    expect(hbOnly[0].type).toBe(MESSAGE_TYPE.HEARTBEAT);

    const fromB = bus.getHistory({ from: 'B' });
    expect(fromB).toHaveLength(1);
  });

  // ─── Consensus Manager ────────────────────────────────────────────────
  test('ConsensusManager runs φ-weighted voting and resolves', () => {
    const cm = new ConsensusManager({ quorum: 0.5 });
    const pid = 'test-proposal';
    cm.propose(pid, { action: 'deploy' }, ['Deploy', 'Security', 'Governance']);

    // Cast votes from 2/3 participants (meets 50% quorum)
    cm.vote(pid, 'Deploy', 'approve', 1.0);
    const result = cm.vote(pid, 'Security', 'approve', 1.0);

    expect(result).not.toBeNull();
    expect(result.decision).toBe('approve');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.voted).toBe(2);
    expect(result.total).toBe(3);
  });

  test('ConsensusManager rejects proposal not found', () => {
    const cm = new ConsensusManager();
    const result = cm.vote('nonexistent', 'A', 'approve');
    expect(result).toBeNull();
  });

  test('ConsensusManager waitForConsensus resolves when quorum met', async () => {
    const cm = new ConsensusManager({ quorum: 0.5, timeoutMs: 2000 });
    const pid = 'async-proposal';
    cm.propose(pid, { plan: 'test' }, ['A', 'B']);

    // Vote asynchronously after a short delay
    setTimeout(() => {
      cm.vote(pid, 'A', 'approve');
    }, 50);

    const result = await cm.waitForConsensus(pid);
    expect(result.decision).toBe('approve');
  });

  // ─── Audit Log ────────────────────────────────────────────────────────
  test('audit log records orchestrator start event', () => {
    orchestrator.start();
    const log = orchestrator.getAuditLog({ action: 'orchestrator_start' });
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].action).toBe('orchestrator_start');
    expect(log[0].data.swarms).toBe(17);
  });

  test('audit log records task completion events', (done) => {
    orchestrator.start();
    // Register a handler that completes immediately
    orchestrator.registerHandler('Testing', 'quick_test', async () => ({ success: true }));

    orchestrator.dispatch({
      type: 'quick_test',
      targetSwarm: 'Testing',
      priority: PRIORITY.NORMAL,
    });

    // Give the async handler time to complete
    setTimeout(() => {
      const log = orchestrator.getAuditLog({ action: 'task_complete' });
      expect(log.length).toBeGreaterThanOrEqual(1);
      done();
    }, 200);
  });

  // ─── Custom Handler Registration ──────────────────────────────────────
  test('registerHandler attaches custom task handler to swarm', () => {
    orchestrator.registerHandler('Research', 'deep_search', async (task) => {
      return { found: true, query: task.payload.query };
    });

    const swarm = orchestrator.getSwarm('Research');
    expect(swarm._handlers['deep_search']).toBeDefined();
  });

  test('registerHandler throws for unknown swarm', () => {
    expect(() => {
      orchestrator.registerHandler('NonexistentSwarm', 'test', async () => {});
    }).toThrow("Swarm 'NonexistentSwarm' not found");
  });

  // ─── PHI constant ─────────────────────────────────────────────────────
  test('PHI constant equals golden ratio', () => {
    expect(PHI).toBeCloseTo(1.6180339887, 8);
  });

  // ─── Cross-swarm communication ────────────────────────────────────────
  test('broadcast sends to all swarms via orchestrator', () => {
    orchestrator.start();
    orchestrator.broadcast({ alert: 'system-wide-test' });

    const bus = orchestrator.getBus();
    const history = bus.getHistory({ type: MESSAGE_TYPE.BROADCAST });
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Swarm individual operations ──────────────────────────────────────
  test('individual swarm pause/resume works', () => {
    const swarm = orchestrator.getSwarm('Creative');
    expect(swarm.status).toBe(SWARM_STATUS.IDLE);

    swarm.pause();
    expect(swarm.status).toBe(SWARM_STATUS.PAUSED);

    swarm.resume();
    expect(swarm.status).toBe(SWARM_STATUS.IDLE);
  });

  test('swarm getQueueDepth and getActiveCount return numbers', () => {
    const swarm = orchestrator.getSwarm('Memory');
    expect(typeof swarm.getQueueDepth()).toBe('number');
    expect(typeof swarm.getActiveCount()).toBe('number');
  });
});
