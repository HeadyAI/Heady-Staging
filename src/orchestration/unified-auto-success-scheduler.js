'use strict';

/**
 * Heady™ Unified Auto-Success Scheduler
 *
 * Merges the two competing auto-success engines:
 * - Timer-based cycles (auto-success-engine.js) for background compute
 * - Event-driven reactions (hc_auto_success.js) for immediate responses
 *
 * Single scheduler: event-driven for real-time + φ⁷-timed for idle compute.
 * Target: 100% of idle compute cycles consumed by auto-success tasks.
 *
 * © 2026 HeadySystems Inc. All Rights Reserved.
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const { PHI, PSI, fib, phiMs, PHI_TIMING, POOLS } = require('../../shared/phi-math');

// ─── Constants ──────────────────────────────────────────────────────────────

const CYCLE_MS = PHI_TIMING.CYCLE || Math.round(Math.pow(PHI, 7) * 1000);  // 29,034ms
const TASK_TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;
const MAX_CUMULATIVE_FAILURES = fib(6); // 8
const POOL_REBALANCE_INTERVAL = fib(8); // Every 21 cycles

const CSL = Object.freeze({
  MINIMUM: 0.500,
  LOW:     0.618,
  MEDIUM:  0.809,
  HIGH:    0.882,
});

// Event triggers that cause immediate task execution
const REACTION_EVENTS = [
  'pipeline:completed', 'pipeline:failed', 'pipeline:started',
  'health:degraded', 'health:recovered',
  'security:alert', 'deploy:completed', 'deploy:failed',
  'error:pattern', 'config:drift',
  'billing:subscription:created', 'billing:usage:reported',
  'code-dojo:challenge:completed', 'training:session:complete',
  'marketplace:agent:deployed',
];

// ─── Main Class ─────────────────────────────────────────────────────────────

class UnifiedAutoSuccessScheduler extends EventEmitter {
  constructor({ eventBus, vectorMemory, pipelineBridge, catalog = [] } = {}) {
    super();
    this._bus = eventBus;
    this._vectorMemory = vectorMemory;
    this._bridge = pipelineBridge;
    this._running = false;
    this._timer = null;
    this._cycleN = 0;

    // Pool management
    this._pools = { hot: [], warm: [], cold: [] };
    this._executing = new Set();

    // Task state
    this._taskResults = new Map();    // taskId → last result
    this._failureCounts = new Map();  // taskId → cumulative failures
    this._completionLog = [];         // Ring buffer of recent completions

    // Metrics
    this._metrics = {
      totalExecuted: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      tasksPerHour: 0,
      cycleCount: 0,
      poolRebalances: 0,
      eventReactions: 0,
      lastCycleMs: 0,
      categoryStats: {},
    };

    // Load catalog
    this._loadCatalog(catalog);
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  start() {
    if (this._running) return this;
    this._running = true;

    // Wire event-driven reactions
    if (this._bus) {
      for (const event of REACTION_EVENTS) {
        this._bus.on(event, (data) => this._onEvent(event, data));
      }
    }

    // Start φ⁷-timed background cycles
    this._timer = setInterval(() => this._onCycle(), CYCLE_MS);

    // First cycle after short delay
    setTimeout(() => this._onCycle(), Math.round(phiMs(3))); // ~4.2s warmup

    this.emit('scheduler:started', { cycleMs: CYCLE_MS, poolSizes: this._getPoolSizes() });
    return this;
  }

  stop() {
    if (!this._running) return this;
    this._running = false;

    clearInterval(this._timer);
    this._timer = null;

    if (this._bus) {
      for (const event of REACTION_EVENTS) {
        this._bus.removeAllListeners(event);
      }
    }

    this.emit('scheduler:stopped', { totalCycles: this._cycleN, metrics: this.getMetrics() });
    return this;
  }

  // ─── Catalog Loading ──────────────────────────────────────────────────────

  _loadCatalog(catalog) {
    for (const task of catalog) {
      this._assignPool(task);
    }
  }

  addTask(task) {
    this._assignPool(task);
  }

  _assignPool(task) {
    const pool = task.pool || this._inferPool(task);
    if (!this._pools[pool]) this._pools[pool] = [];
    this._pools[pool].push({ ...task, _poolAssignment: pool, _addedAt: Date.now() });
  }

  _inferPool(task) {
    if (task.weight >= 5) return 'hot';
    if (task.weight >= 3) return 'warm';
    return 'cold';
  }

  // ─── Event-Driven Execution ───────────────────────────────────────────────

  async _onEvent(event, data) {
    if (!this._running) return;
    this._metrics.eventReactions++;

    // Find relevant tasks for this event
    const relevantTasks = this._findTasksForEvent(event);
    if (relevantTasks.length === 0) return;

    // Execute top-priority tasks immediately (max fib(5) = 5 concurrent)
    const batch = relevantTasks.slice(0, fib(5));
    const results = await Promise.allSettled(
      batch.map(task => this._executeTask(task, { trigger: event, data }))
    );

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        this._onTaskComplete(batch[i], results[i].value);
      } else {
        this._onTaskFailed(batch[i], results[i].reason);
      }
    }
  }

  _findTasksForEvent(event) {
    const all = [...this._pools.hot, ...this._pools.warm, ...this._pools.cold];
    return all.filter(t => {
      if (t.triggers && t.triggers.includes(event)) return true;
      // Category-based matching
      if (event.includes('security') && t.category?.includes('security')) return true;
      if (event.includes('pipeline') && t.category?.includes('pipeline')) return true;
      if (event.includes('deploy') && t.category?.includes('deploy')) return true;
      if (event.includes('billing') && t.category?.includes('monetization')) return true;
      return false;
    });
  }

  // ─── Timer-Driven Background Cycles ───────────────────────────────────────

  async _onCycle() {
    if (!this._running) return;
    const cycleStart = Date.now();
    this._cycleN++;
    this._metrics.cycleCount = this._cycleN;

    // Rebalance pools every fib(8)=21 cycles
    if (this._cycleN % POOL_REBALANCE_INTERVAL === 0) {
      this._rebalancePools();
    }

    // Execute from pools: hot first, then warm, then cold
    const hotBatch = this._selectBatch(this._pools.hot, Math.ceil(fib(5) * POOLS.HOT / (POOLS.HOT + POOLS.WARM + POOLS.COLD)));
    const warmBatch = this._selectBatch(this._pools.warm, Math.ceil(fib(5) * POOLS.WARM / (POOLS.HOT + POOLS.WARM + POOLS.COLD)));
    const coldBatch = this._selectBatch(this._pools.cold, Math.ceil(fib(3) * POOLS.COLD / (POOLS.HOT + POOLS.WARM + POOLS.COLD)));

    const batch = [...hotBatch, ...warmBatch, ...coldBatch];
    if (batch.length === 0) return;

    // Execute all in parallel
    const results = await Promise.allSettled(
      batch.map(task => this._executeTask(task, { trigger: 'cycle', cycle: this._cycleN }))
    );

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        this._onTaskComplete(batch[i], results[i].value);
      } else {
        this._onTaskFailed(batch[i], results[i].reason);
      }
    }

    this._metrics.lastCycleMs = Date.now() - cycleStart;
    this._updateThroughput();

    this.emit('scheduler:cycle', {
      cycle: this._cycleN,
      executed: batch.length,
      durationMs: this._metrics.lastCycleMs,
    });
  }

  _selectBatch(pool, maxSize) {
    // Select tasks not currently executing, weighted by priority
    return pool
      .filter(t => !this._executing.has(t.id))
      .sort((a, b) => (b.weight || 3) - (a.weight || 3))
      .slice(0, maxSize);
  }

  // ─── Task Execution ───────────────────────────────────────────────────────

  async _executeTask(task, context = {}) {
    if (this._executing.has(task.id)) return { skipped: true, reason: 'already_executing' };
    this._executing.add(task.id);

    try {
      this._metrics.totalExecuted++;

      // Execute with timeout
      const result = await Promise.race([
        this._runTask(task, context),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Task timeout')), TASK_TIMEOUT_MS)),
      ]);

      return result;
    } finally {
      this._executing.delete(task.id);
    }
  }

  async _runTask(task, context) {
    // If task has an executor function, call it
    if (typeof task.execute === 'function') {
      return await task.execute(context);
    }

    // Default: return metadata (task is declarative, execution handled externally)
    return {
      taskId: task.id,
      category: task.category,
      status: 'completed',
      executedAt: new Date().toISOString(),
      context,
    };
  }

  // ─── Task Lifecycle Handlers ──────────────────────────────────────────────

  _onTaskComplete(task, result) {
    this._metrics.totalSucceeded++;
    this._taskResults.set(task.id, { status: 'completed', result, at: Date.now() });
    this._failureCounts.delete(task.id);

    // Track category stats
    const cat = task.category || 'unknown';
    if (!this._metrics.categoryStats[cat]) this._metrics.categoryStats[cat] = { success: 0, failed: 0 };
    this._metrics.categoryStats[cat].success++;

    // Log completion (ring buffer, max fib(18) = 2584)
    this._completionLog.push({ taskId: task.id, at: Date.now(), status: 'completed' });
    if (this._completionLog.length > fib(18)) this._completionLog.shift();

    // Re-queue perpetual optimization tasks with threshold increase
    if (task.category === 'perpetual-optimization' || task.perpetual) {
      task._thresholdBoost = (task._thresholdBoost || 0) + 0.1;
      // Task stays in pool for next cycle
    }

    this.emit('task:completed', { taskId: task.id, category: cat });
    if (this._bus) this._bus.emit('auto-success:task:completed', { taskId: task.id, category: cat, result });
  }

  _onTaskFailed(task, error) {
    this._metrics.totalFailed++;
    const failures = (this._failureCounts.get(task.id) || 0) + 1;
    this._failureCounts.set(task.id, failures);

    const cat = task.category || 'unknown';
    if (!this._metrics.categoryStats[cat]) this._metrics.categoryStats[cat] = { success: 0, failed: 0 };
    this._metrics.categoryStats[cat].failed++;

    this._taskResults.set(task.id, { status: 'failed', error: error?.message, at: Date.now(), failures });

    // Escalate if cumulative failures exceed threshold
    if (failures >= MAX_CUMULATIVE_FAILURES) {
      this.emit('task:escalated', { taskId: task.id, failures, error: error?.message });
      if (this._bus) this._bus.emit('auto-success:task:escalated', { taskId: task.id, failures });
    }

    this.emit('task:failed', { taskId: task.id, error: error?.message, failures });
  }

  // ─── Pool Rebalancing ─────────────────────────────────────────────────────

  _rebalancePools() {
    this._metrics.poolRebalances++;

    // Move tasks between pools based on recent performance
    for (const pool of ['warm', 'cold']) {
      const toPromote = [];
      for (let i = this._pools[pool].length - 1; i >= 0; i--) {
        const task = this._pools[pool][i];
        const result = this._taskResults.get(task.id);

        // Promote to hotter pool if frequently triggered by events
        if (result && result.status === 'completed' && task.weight >= 4 && pool === 'warm') {
          toPromote.push(i);
        }
      }

      for (const idx of toPromote) {
        const [task] = this._pools[pool].splice(idx, 1);
        task._poolAssignment = pool === 'cold' ? 'warm' : 'hot';
        this._pools[task._poolAssignment].push(task);
      }
    }

    this.emit('scheduler:rebalanced', { poolSizes: this._getPoolSizes() });
  }

  // ─── Metrics ──────────────────────────────────────────────────────────────

  _updateThroughput() {
    const oneHourAgo = Date.now() - 3600000;
    const recentCompletions = this._completionLog.filter(c => c.at > oneHourAgo).length;
    this._metrics.tasksPerHour = recentCompletions;
  }

  _getPoolSizes() {
    return {
      hot: this._pools.hot.length,
      warm: this._pools.warm.length,
      cold: this._pools.cold.length,
      total: this._pools.hot.length + this._pools.warm.length + this._pools.cold.length,
    };
  }

  getMetrics() {
    this._updateThroughput();
    return {
      ...this._metrics,
      poolSizes: this._getPoolSizes(),
      executing: this._executing.size,
      successRate: this._metrics.totalExecuted > 0
        ? Math.round((this._metrics.totalSucceeded / this._metrics.totalExecuted) * 1000) / 1000
        : 1.0,
      phi: PHI,
    };
  }

  getStatus() {
    return {
      running: this._running,
      cycleN: this._cycleN,
      cycleMs: CYCLE_MS,
      poolSizes: this._getPoolSizes(),
      executing: this._executing.size,
      metrics: this.getMetrics(),
      lastCycleMs: this._metrics.lastCycleMs,
      reactionEvents: REACTION_EVENTS.length,
    };
  }
}

module.exports = { UnifiedAutoSuccessScheduler, REACTION_EVENTS, CSL };
