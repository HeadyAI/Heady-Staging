/**
 * Heady™ Core Auto-Success Scheduler — Test Suite
 * ═══════════════════════════════════════════════════
 *
 * Tests core/scheduler/auto-success.js (AutoSuccessScheduler)
 * with φ-scaled category intervals and 144-task capacity.
 */
'use strict';

const { AutoSuccessScheduler, TASK_STATE } = require('../core/scheduler/auto-success');

describe('Core AutoSuccessScheduler', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new AutoSuccessScheduler({ heartbeatMs: 100, maxTasks: 10 });
  });

  afterEach(() => {
    scheduler.stop();
  });

  // ─── Instantiation ──────────────────────────────────────────────

  test('instantiates with custom heartbeat and maxTasks', () => {
    expect(scheduler).toBeDefined();
    expect(scheduler.heartbeatMs).toBe(100);
    expect(scheduler.maxTasks).toBe(10);
    expect(scheduler.totalExecutions).toBe(0);
  });

  // ─── Task Registration ─────────────────────────────────────────

  test('registerTask registers and getTaskStatus returns it', () => {
    scheduler.registerTask('test:ping', {
      handler: async () => 'pong',
      category: 'HEALTH',
    });

    const status = scheduler.getTaskStatus('test:ping');
    expect(status).not.toBeNull();
    expect(status.taskId).toBe('test:ping');
    expect(status.category).toBe('HEALTH');
    expect(status.state).toBe(TASK_STATE.PENDING);
    expect(status.enabled).toBe(true);
  });

  test('registerTask emits task:registered event', () => {
    const events = [];
    scheduler.on('task:registered', (e) => events.push(e));

    scheduler.registerTask('test:event', {
      handler: async () => 'ok',
      category: 'MONITORING',
    });

    expect(events).toHaveLength(1);
    expect(events[0].taskId).toBe('test:event');
    expect(events[0].category).toBe('MONITORING');
  });

  test('removeTask removes and returns true', () => {
    scheduler.registerTask('test:remove', {
      handler: async () => 'ok',
      category: 'CLEANUP',
    });

    expect(scheduler.removeTask('test:remove')).toBe(true);
    expect(scheduler.getTaskStatus('test:remove')).toBeNull();
  });

  test('removeTask returns false for unknown task', () => {
    expect(scheduler.removeTask('nonexistent')).toBe(false);
  });

  // ─── Max Capacity ──────────────────────────────────────────────

  test('enforces max task limit', () => {
    for (let i = 0; i < 10; i++) {
      scheduler.registerTask(`task:${i}`, {
        handler: async () => 'ok',
        category: 'GENERAL',
      });
    }

    expect(() => {
      scheduler.registerTask('task:overflow', {
        handler: async () => 'ok',
        category: 'GENERAL',
      });
    }).toThrow('max tasks reached');
  });

  // ─── Lifecycle ─────────────────────────────────────────────────

  test('start/stop lifecycle works', () => {
    const events = [];
    scheduler.on('started', (e) => events.push('started'));
    scheduler.on('stopped', (e) => events.push('stopped'));

    scheduler.start();
    expect(scheduler._running).toBe(true);

    scheduler.stop();
    expect(scheduler._running).toBe(false);
    expect(events).toEqual(['started', 'stopped']);
  });

  test('start is idempotent', () => {
    scheduler.start();
    scheduler.start(); // Should not throw or create duplicate timers
    expect(scheduler._running).toBe(true);
  });

  // ─── Task Execution ────────────────────────────────────────────

  test('task executes on heartbeat', async () => {
    let executed = false;
    scheduler.registerTask('test:exec', {
      handler: async () => { executed = true; return 'done'; },
      category: 'HEALTH',
      intervalMs: 1, // Runs immediately
    });

    scheduler.start();
    // Wait for at least one heartbeat cycle
    await new Promise(r => setTimeout(r, 200));
    scheduler.stop();

    expect(executed).toBe(true);
    const status = scheduler.getTaskStatus('test:exec');
    expect(status.metrics.runs).toBeGreaterThanOrEqual(1);
    expect(status.metrics.successes).toBeGreaterThanOrEqual(1);
  });

  test('failed task is recorded in metrics', async () => {
    scheduler.registerTask('test:fail', {
      handler: async () => { throw new Error('deliberate failure'); },
      category: 'SECURITY',
      intervalMs: 1,
    });

    scheduler.start();
    await new Promise(r => setTimeout(r, 200));
    scheduler.stop();

    const status = scheduler.getTaskStatus('test:fail');
    expect(status.metrics.runs).toBeGreaterThanOrEqual(1);
    expect(status.metrics.failures).toBeGreaterThanOrEqual(1);
    expect(status.lastError).toBe('deliberate failure');
  });

  // ─── Enable/Disable ────────────────────────────────────────────

  test('disabled task does not execute', async () => {
    let executed = false;
    scheduler.registerTask('test:disabled', {
      handler: async () => { executed = true; },
      category: 'CLEANUP',
      intervalMs: 1,
    });

    scheduler.setTaskEnabled('test:disabled', false);
    scheduler.start();
    await new Promise(r => setTimeout(r, 200));
    scheduler.stop();

    expect(executed).toBe(false);
  });

  // ─── Health ────────────────────────────────────────────────────

  test('health() returns correct shape', () => {
    scheduler.registerTask('test:health', {
      handler: async () => 'ok',
      category: 'MONITORING',
    });

    const health = scheduler.health();
    expect(health).toHaveProperty('running', false);
    expect(health).toHaveProperty('uptime', 0);
    expect(health).toHaveProperty('cycleCount', 0);
    expect(health.tasks).toHaveProperty('total', 1);
    expect(health.tasks).toHaveProperty('enabled', 1);
    expect(health.tasks).toHaveProperty('running', 0);
    expect(health).toHaveProperty('totalExecutions', 0);
    expect(health).toHaveProperty('successRate', 1);
  });

  // ─── Category Grouping ─────────────────────────────────────────

  test('getTasksByCategory groups tasks correctly', () => {
    scheduler.registerTask('sec:1', { handler: async () => 'ok', category: 'SECURITY' });
    scheduler.registerTask('sec:2', { handler: async () => 'ok', category: 'SECURITY' });
    scheduler.registerTask('mon:1', { handler: async () => 'ok', category: 'MONITORING' });

    const byCategory = scheduler.getTasksByCategory();
    expect(byCategory.SECURITY).toHaveLength(2);
    expect(byCategory.MONITORING).toHaveLength(1);
  });

  // ─── φ-Scaled Intervals ────────────────────────────────────────

  test('category intervals are φ-scaled', () => {
    const security = scheduler._categoryInterval('SECURITY');
    const health = scheduler._categoryInterval('HEALTH');
    const maintenance = scheduler._categoryInterval('MAINTENANCE');

    // SECURITY runs 2x faster than HEALTH
    expect(security).toBeLessThan(health);
    // MAINTENANCE runs slower than HEALTH (by φ²)
    expect(maintenance).toBeGreaterThan(health);
  });
});
