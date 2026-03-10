/**
 * Tests — core/async-engine
 * 
 * Validates task decomposition, parallel execution,
 * DAG scheduling, and φ-scaled concurrency limits.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { strict as assert } from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

describe('AsyncEngine — TaskDecomposer', () => {
  let TaskDecomposer;

  beforeEach(async () => {
    const mod = await import('../../core/async-engine/task-decomposer.js');
    TaskDecomposer = mod.TaskDecomposer;
  });

  it('should decompose a complex task into subtasks', async () => {
    const decomposer = new TaskDecomposer();
    const task = {
      id: 'deploy-service',
      type: 'deployment',
      steps: ['build', 'test', 'deploy', 'verify'],
    };

    const subtasks = await decomposer.decompose(task);
    assert.ok(subtasks.length >= 4, 'Should create at least 4 subtasks');
    assert.ok(subtasks.every(s => s.id && s.parentId === task.id),
      'All subtasks should reference parent');
  });

  it('should build dependency DAG', async () => {
    const decomposer = new TaskDecomposer();
    const subtasks = [
      { id: 'build', dependencies: [] },
      { id: 'test', dependencies: ['build'] },
      { id: 'deploy', dependencies: ['test'] },
      { id: 'verify', dependencies: ['deploy'] },
    ];

    const dag = decomposer.buildDAG(subtasks);
    assert.equal(dag.nodes.length, 4);
    assert.equal(dag.edges.length, 3);

    // Topological order: build → test → deploy → verify
    const order = dag.topologicalSort();
    assert.equal(order[0], 'build');
    assert.equal(order[3], 'verify');
  });

  it('should detect cycles in DAG', () => {
    const decomposer = new TaskDecomposer();
    const subtasks = [
      { id: 'a', dependencies: ['c'] },
      { id: 'b', dependencies: ['a'] },
      { id: 'c', dependencies: ['b'] },
    ];

    try {
      const dag = decomposer.buildDAG(subtasks);
      dag.topologicalSort();
      assert.fail('Should detect cycle');
    } catch (err) {
      assert.ok(err.message.includes('cycle') || err.message.includes('Cycle'),
        'Should throw cycle detection error');
    }
  });

  it('should identify parallelizable groups', async () => {
    const decomposer = new TaskDecomposer();
    const subtasks = [
      { id: 'fetch-a', dependencies: [] },
      { id: 'fetch-b', dependencies: [] },
      { id: 'fetch-c', dependencies: [] },
      { id: 'merge', dependencies: ['fetch-a', 'fetch-b', 'fetch-c'] },
    ];

    const groups = decomposer.parallelGroups(subtasks);
    // First group should contain all 3 fetch tasks (parallel)
    assert.equal(groups[0].length, 3, 'First group should have 3 parallel tasks');
    // Second group should contain merge
    assert.equal(groups[1].length, 1, 'Second group should have 1 task');
  });

  it('should use φ-scaled max subtask depth', () => {
    const decomposer = new TaskDecomposer();
    const config = decomposer.config;
    assert.ok(FIB.includes(config.maxDepth),
      `Max depth ${config.maxDepth} must be a Fibonacci number`);
  });
});

describe('AsyncEngine — ParallelExecutor', () => {
  let ParallelExecutor;

  beforeEach(async () => {
    const mod = await import('../../core/async-engine/parallel-executor.js');
    ParallelExecutor = mod.ParallelExecutor;
  });

  it('should execute independent tasks in parallel', async () => {
    const executor = new ParallelExecutor();
    const startTime = Date.now();

    const tasks = Array.from({ length: FIB[5] }, (_, i) => ({
      id: `task-${i}`,
      execute: () => new Promise(resolve =>
        setTimeout(() => resolve({ done: true }), 50)
      ),
    }));

    const results = await executor.executeAll(tasks);
    const elapsed = Date.now() - startTime;

    assert.equal(results.length, FIB[5]);
    assert.ok(results.every(r => r.result.done === true));
    // Parallel execution should be faster than sequential (5×50ms=250ms)
    assert.ok(elapsed < 200, `Should be parallel, took ${elapsed}ms`);
  });

  it('should respect φ-scaled concurrency limit', async () => {
    const executor = new ParallelExecutor({ maxConcurrency: FIB[5] });
    let maxConcurrent = 0;
    let current = 0;

    const tasks = Array.from({ length: FIB[8] }, (_, i) => ({
      id: `task-${i}`,
      execute: async () => {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        await new Promise(r => setTimeout(r, 20));
        current--;
        return { done: true };
      },
    }));

    await executor.executeAll(tasks);
    assert.ok(maxConcurrent <= FIB[5],
      `Max concurrent ${maxConcurrent} should not exceed ${FIB[5]}`);
  });

  it('should handle task failures without stopping others', async () => {
    const executor = new ParallelExecutor();
    const tasks = [
      { id: 'ok-1', execute: async () => ({ status: 'ok' }) },
      { id: 'fail', execute: async () => { throw new Error('task failed'); } },
      { id: 'ok-2', execute: async () => ({ status: 'ok' }) },
    ];

    const results = await executor.executeAll(tasks);
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    assert.equal(successes.length, 2, 'Two tasks should succeed');
    assert.equal(failures.length, 1, 'One task should fail');
  });

  it('should execute DAG-ordered groups sequentially between waves', async () => {
    const executor = new ParallelExecutor();
    const executionOrder = [];

    const groups = [
      // Wave 1: parallel
      [
        { id: 'a', execute: async () => { executionOrder.push('a'); } },
        { id: 'b', execute: async () => { executionOrder.push('b'); } },
      ],
      // Wave 2: after wave 1
      [
        { id: 'c', execute: async () => { executionOrder.push('c'); } },
      ],
    ];

    await executor.executeDAG(groups);

    // 'c' must come after both 'a' and 'b'
    const cIndex = executionOrder.indexOf('c');
    const aIndex = executionOrder.indexOf('a');
    const bIndex = executionOrder.indexOf('b');
    assert.ok(cIndex > aIndex, 'c must execute after a');
    assert.ok(cIndex > bIndex, 'c must execute after b');
  });

  it('should emit progress events', async () => {
    const executor = new ParallelExecutor();
    const progressEvents = [];

    executor.on('progress', (data) => progressEvents.push(data));

    const tasks = [
      { id: 't1', execute: async () => ({ ok: true }) },
      { id: 't2', execute: async () => ({ ok: true }) },
    ];

    await executor.executeAll(tasks);
    assert.ok(progressEvents.length >= 2,
      'Should emit at least 2 progress events');
  });
});
