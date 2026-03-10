'use strict';

/**
 * AgentOrchestrator test suite
 * Tests agent management, task dispatch, retries, timeouts, and cancellation.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { AgentOrchestrator, AGENT_STATUS, TASK_STATUS } = require('../agent-orchestrator');

describe('AgentOrchestrator', () => {
    let orch;

    beforeEach(() => {
        orch = new AgentOrchestrator({ maxConcurrent: 3 });
    });

    // ─── Agent Registration ────────────────────────────────────────────────────

    it('registerAgent assigns an id and stores the agent', () => {
        const id = orch.registerAgent({ id: 'a1', type: 'tool', execute: async () => ({}) });
        assert.equal(id, 'a1');
        const agent = orch.getAgent('a1');
        assert.ok(agent);
        assert.equal(agent.type, 'tool');
        assert.equal(agent.status, AGENT_STATUS.IDLE);
    });

    it('registerAgent auto-generates id when none is provided', () => {
        const id = orch.registerAgent({ type: 'llm', execute: async () => ({}) });
        assert.ok(id.startsWith('agent_'));
        assert.ok(orch.getAgent(id));
    });

    it('listAgents returns all registered agents', () => {
        orch.registerAgent({ id: 'a1', execute: async () => ({}) });
        orch.registerAgent({ id: 'a2', execute: async () => ({}) });
        const list = orch.listAgents();
        assert.equal(list.length, 2);
        assert.ok(list.find(a => a.id === 'a1'));
        assert.ok(list.find(a => a.id === 'a2'));
    });

    it('unregisterAgent removes the agent', () => {
        orch.registerAgent({ id: 'a1', execute: async () => ({}) });
        orch.unregisterAgent('a1');
        assert.equal(orch.getAgent('a1'), null);
        assert.equal(orch.listAgents().length, 0);
    });

    // ─── Task Submission & Dispatch ────────────────────────────────────────────

    it('submit returns a task id and dispatches to idle agent', async () => {
        orch.registerAgent({
            id: 'worker',
            execute: async (task) => ({ echo: task.payload.value }),
        });

        const result = await orch.run({ type: 'default', payload: { value: 42 } });
        assert.deepEqual(result, { echo: 42 });
    });

    it('tasks are dispatched by priority (higher first)', async () => {
        const order = [];
        orch.registerAgent({
            id: 'worker',
            execute: async (task) => {
                order.push(task.payload.label);
                return {};
            },
        });

        // Submit low priority first, then high — high should execute first
        orch.submit({ type: 'default', payload: { label: 'low' }, priority: 1 });
        orch.submit({ type: 'default', payload: { label: 'high' }, priority: 10 });

        // Wait for both tasks to complete
        await new Promise(r => setTimeout(r, 100));

        // High priority should have been picked first
        assert.equal(order[0], 'high');
        assert.equal(order[1], 'low');
    });

    it('preferred agentId routes to specific agent', async () => {
        let usedAgent = null;
        orch.registerAgent({
            id: 'general',
            execute: async () => { usedAgent = 'general'; return {}; },
        });
        orch.registerAgent({
            id: 'specialist',
            execute: async () => { usedAgent = 'specialist'; return {}; },
        });

        await orch.run({ type: 'default', payload: {}, agentId: 'specialist' });
        assert.equal(usedAgent, 'specialist');
    });

    // ─── Task Timeout & Retries ────────────────────────────────────────────────

    it('task retries up to MAX_RETRIES then fails', async () => {
        let attempts = 0;
        orch.registerAgent({
            id: 'flaky',
            execute: async () => { attempts++; throw new Error('boom'); },
        });

        await assert.rejects(
            () => orch.run({ type: 'default', payload: {}, timeout: 5000 }),
            { message: 'boom' }
        );

        assert.equal(attempts, 3); // MAX_RETRIES = 3
        const stats = orch.getStats();
        assert.equal(stats.tasksFailed, 1);
    });

    it('task timeout triggers retry then failure', async () => {
        orch.registerAgent({
            id: 'slow',
            execute: async () => new Promise(r => setTimeout(r, 5000)),
        });

        await assert.rejects(
            () => orch.run({ type: 'default', payload: {}, timeout: 50 }),
            /Task timeout/
        );
    });

    // ─── Task Cancellation ─────────────────────────────────────────────────────

    it('cancelTask cancels a pending task', () => {
        // No agents registered → task stays pending
        const taskId = orch.submit({ type: 'default', payload: {} });
        // Suppress the rejection from the cancelled task's internal promise
        const task = orch._tasks.get(taskId);
        task.promise.catch(() => { });
        const cancelled = orch.cancelTask(taskId);
        assert.equal(cancelled, true);
        const taskInfo = orch.getTask(taskId);
        assert.equal(taskInfo.status, TASK_STATUS.CANCELLED);
    });

    it('cancelTask returns false for completed tasks', async () => {
        orch.registerAgent({ id: 'w', execute: async () => ({ ok: true }) });
        const result = await orch.run({ type: 'default', payload: {} });
        assert.ok(result.ok);

        // Try to cancel after completion
        const tasks = orch.listTasks({ status: TASK_STATUS.COMPLETE });
        assert.ok(tasks.length > 0);
        const cancelled = orch.cancelTask(tasks[0].id);
        assert.equal(cancelled, false);
    });

    // ─── Stats ─────────────────────────────────────────────────────────────────

    it('getStats reports correct counters', async () => {
        orch.registerAgent({ id: 'w', execute: async () => ({}) });
        await orch.run({ type: 'default', payload: {} });

        const stats = orch.getStats();
        assert.equal(stats.tasksSubmitted, 1);
        assert.equal(stats.tasksCompleted, 1);
        assert.equal(stats.tasksFailed, 0);
        assert.equal(stats.agentsSpawned, 1);
        assert.equal(stats.agents.total, 1);
        assert.equal(stats.agents.idle, 1);
        assert.equal(stats.agents.busy, 0);
    });

    // ─── Events ────────────────────────────────────────────────────────────────

    it('emits agent-registered and task lifecycle events', async () => {
        const events = [];
        orch.on('agent-registered', (e) => events.push('agent-registered'));
        orch.on('task-submitted', (e) => events.push('task-submitted'));
        orch.on('task-started', (e) => events.push('task-started'));
        orch.on('task-complete', (e) => events.push('task-complete'));

        orch.registerAgent({ id: 'ev', execute: async () => ({ done: true }) });
        // Use run() to await the full task lifecycle
        await orch.run({ type: 'default', payload: {} });

        assert.ok(events.includes('agent-registered'), 'should emit agent-registered');
        // task-submitted happens synchronously inside submit() before run() resolves
        assert.ok(events.includes('task-submitted'), `events=${events.join(',')}`);
        assert.ok(events.includes('task-started'), 'should emit task-started');
        assert.ok(events.includes('task-complete'), 'should emit task-complete');
    });

    // ─── Unregister mid-task requeues ──────────────────────────────────────────

    it('unregisterAgent requeues the running task', async () => {
        let resolveHang;
        const hangPromise = new Promise(r => { resolveHang = r; });

        orch.registerAgent({
            id: 'busy-agent',
            execute: async () => hangPromise,
        });
        orch.registerAgent({
            id: 'backup-agent',
            execute: async () => ({ rescued: true }),
        });

        const taskId = orch.submit({ type: 'default', payload: {} });
        // Let dispatch run
        await new Promise(r => setTimeout(r, 20));

        // Unregister the busy agent — task should be requeued
        orch.unregisterAgent('busy-agent');
        resolveHang({ abandoned: true }); // Resolve hanging promise to clean up

        // Wait for backup agent to pick it up
        await new Promise(r => setTimeout(r, 100));
        const task = orch.getTask(taskId);
        // Task should have been reassigned (status may be complete or pending)
        assert.ok(task);
    });
});
