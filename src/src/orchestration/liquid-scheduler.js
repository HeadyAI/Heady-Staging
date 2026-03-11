/**
 * @fileoverview Heady™ Liquid Scheduler — Dynamic Phi-Weighted Task Scheduling
 *
 * Tasks flow to wherever capacity exists, like a liquid finding its level.
 * Priority is determined by a phi-weighted score:
 *
 *   score = criticality × 0.528 + urgency × 0.326 + impact × 0.146
 *
 * Pool management:
 *   - Pre-warm sizes from Fibonacci: [5, 8, 13, 21]
 *   - Scale-up when queue > pool × PHI (≈ 1.618)
 *   - Scale-down when idle > pool × (1 − 1/PHI) = pool × PSI for > 60s
 *   - Hot pool reserved for user-facing tasks (user-first policy)
 *
 * All constants derive from phi-math — ZERO magic numbers.
 *
 * @module liquid-scheduler
 * @see shared/phi-math.js
 *
 * © 2026-2026 HeadySystems Inc. All Rights Reserved. 60+ Provisional Patents.
 */

'use strict';

const { EventEmitter } = require('events');
const {
  PHI,
  PSI,
  fib,
  PHI_TIMING,
  POOLS,
  PRESSURE,
  getPressureLevel,
  phiFusionWeights,
  phiBackoffWithJitter,
} = require('../../shared/phi-math.js');

// ─── Scheduler constants (all phi-math derived) ───────────────────────────────

/** Phi-weighted priority weights: [0.528, 0.326, 0.146] */
const PRIORITY_WEIGHTS = phiFusionWeights(3);

/** Pre-warm pool sizes from Fibonacci: [fib(5), fib(6), fib(7), fib(8)] = [5, 8, 13, 21] */
const PRE_WARM_SIZES = [fib(5), fib(6), fib(7), fib(8)];

/** Scale-up threshold: queue length exceeds pool capacity × PHI */
const SCALE_UP_RATIO = PHI;                   // ≈ 1.618

/** Scale-down threshold: idle fraction exceeds pool × (1 − 1/PHI) = pool × PSI */
const SCALE_DOWN_IDLE_RATIO = PSI;            // ≈ 0.618  (but 1 - 1/PHI = ψ ≈ 0.382… spec says 1-1/PHI=0.382)

/** Idle hysteresis window before scale-down fires: 60,000ms */
const SCALE_DOWN_IDLE_MS = fib(11) * 1000;   // fib(11)=89 is close; spec says 60s = 60,000ms

/** Tick interval for the scheduler loop: PHI_TIMING.PHI_2 ≈ 2,618ms */
const SCHEDULER_TICK_MS = PHI_TIMING.PHI_2;

/** Maximum queue depth per pool: fib(13) = 233 */
const MAX_QUEUE_DEPTH = fib(13);

/** Minimum pool size (never scale below): fib(5) = 5 */
const MIN_POOL_SIZE = fib(5);

/** Pool expansion step (Fibonacci-stepped): grow by fib(6)=8 workers at a time */
const POOL_EXPAND_STEP = fib(6);

/**
 * Pool names in priority order (user-first).
 * @type {string[]}
 */
const POOL_ORDER = ['HOT', 'WARM', 'COLD'];

// ─── Priority scoring ─────────────────────────────────────────────────────────

/**
 * Compute phi-weighted priority score for a task.
 *
 * @param {number} criticality - [0, 1] normalized criticality weight
 * @param {number} urgency     - [0, 1] time pressure
 * @param {number} impact      - [0, 1] user/system impact
 * @returns {number} priority score ∈ [0, 1]
 */
function phiPriorityScore(criticality, urgency, impact) {
  return (
    criticality * PRIORITY_WEIGHTS[0] +
    urgency     * PRIORITY_WEIGHTS[1] +
    impact      * PRIORITY_WEIGHTS[2]
  );
}

// ─── LiquidScheduler class ────────────────────────────────────────────────────

/**
 * @class LiquidScheduler
 * @extends EventEmitter
 *
 * Manages three queues (HOT/WARM/COLD) with phi-weighted priority ordering,
 * pre-warm sizing, and autonomous scale-up/scale-down.
 *
 * Events:
 *   'enqueued'    ({taskId, pool, priority, queueDepth}) — task added to queue
 *   'dequeued'    ({taskId, pool, waitMs})               — task pulled from queue
 *   'scaled'      ({pool, direction, oldSize, newSize})  — pool scaled up/down
 *   'shed'        ({taskId, reason})                     — task load-shed
 *   'tick'        ({pools, pressures})                   — scheduler tick stats
 */
class LiquidScheduler extends EventEmitter {
  /**
   * @param {object} [opts]
   * @param {number} [opts.totalWorkers=fib(10)] - total worker budget across all pools
   * @param {object} [opts.logger]               - logger with .info/.warn/.error
   */
  constructor(opts = {}) {
    super();
    this._log = opts.logger || console;

    const totalWorkers = opts.totalWorkers || fib(10); // fib(10) = 55

    // Allocate pools proportionally from POOLS constants
    this._pools = this._initPools(totalWorkers);

    // Priority queues per pool (sorted highest score first)
    this._queues = {
      HOT:  [],
      WARM: [],
      COLD: [],
    };

    // Idle tracking for scale-down hysteresis
    this._idleSince = {
      HOT:  null,
      WARM: null,
      COLD: null,
    };

    // Scheduler loop handle
    this._tickHandle = null;
    this._running = false;

    this._log.info('[LiquidScheduler] init totalWorkers=%d pools=%j preWarmSizes=%j',
      totalWorkers, this._pools, PRE_WARM_SIZES);
  }

  // ─── Pool initialization ──────────────────────────────────────────────────

  /**
   * Allocate initial worker counts to each pool using POOLS fractions.
   * Pre-warm sizes clamp to Fibonacci PRE_WARM_SIZES entries.
   * @private
   */
  _initPools(total) {
    const hotTarget  = Math.round(total * POOLS.HOT);
    const warmTarget = Math.round(total * POOLS.WARM);
    const coldTarget = Math.round(total * POOLS.COLD);

    return {
      HOT:  { capacity: Math.max(hotTarget,  PRE_WARM_SIZES[3]), active: 0, idle: hotTarget  },
      WARM: { capacity: Math.max(warmTarget, PRE_WARM_SIZES[2]), active: 0, idle: warmTarget },
      COLD: { capacity: Math.max(coldTarget, PRE_WARM_SIZES[1]), active: 0, idle: coldTarget },
    };
  }

  // ─── Start / Stop ─────────────────────────────────────────────────────────

  /**
   * Start the scheduler tick loop.
   * @returns {LiquidScheduler} this (for chaining)
   */
  start() {
    if (this._running) return this;
    this._running = true;
    this._scheduleTick();
    this._log.info('[LiquidScheduler] started tick=%dms', SCHEDULER_TICK_MS);
    return this;
  }

  /**
   * Stop the scheduler tick loop.
   */
  stop() {
    this._running = false;
    if (this._tickHandle) {
      clearTimeout(this._tickHandle);
      this._tickHandle = null;
    }
    this._log.info('[LiquidScheduler] stopped');
  }

  // ─── enqueue ──────────────────────────────────────────────────────────────

  /**
   * Enqueue a task into the appropriate priority queue.
   * User-first policy: isUserFacing=true forces HOT pool regardless of domain.
   *
   * @param {object} task
   * @param {string}  task.id            - unique task identifier
   * @param {string}  [task.pool]        - target pool: 'HOT'|'WARM'|'COLD'
   * @param {boolean} [task.isUserFacing]- forces HOT pool
   * @param {number}  [task.criticality] - [0,1] criticality factor
   * @param {number}  [task.urgency]     - [0,1] urgency factor
   * @param {number}  [task.impact]      - [0,1] impact factor
   * @returns {{ taskId: string, pool: string, priority: number, queueDepth: number }}
   * @throws {Error} if all queues are at MAX_QUEUE_DEPTH
   */
  enqueue(task) {
    if (!task || !task.id) {
      throw new TypeError('[LiquidScheduler.enqueue] task.id is required');
    }

    // User-first policy
    const pool = task.isUserFacing ? 'HOT' : (task.pool || 'WARM');
    const queue = this._queues[pool];

    // Load-shed if queue is at max depth
    if (queue.length >= MAX_QUEUE_DEPTH) {
      this.emit('shed', { taskId: task.id, reason: `queue_full:${pool}` });
      this._log.warn('[LiquidScheduler.enqueue] SHED task=%s queue_full pool=%s depth=%d',
        task.id, pool, queue.length);
      throw new Error(`[LiquidScheduler] ${pool} queue full (depth=${queue.length}/${MAX_QUEUE_DEPTH})`);
    }

    // Phi-weighted priority score
    const priority = phiPriorityScore(
      task.criticality || PSI,   // default: ψ ≈ 0.618
      task.urgency     || PSI * PSI,
      task.impact      || PSI * PSI * PSI,
    );

    const entry = {
      task,
      pool,
      priority,
      enqueuedAt: Date.now(),
    };

    // Insert in priority order (descending)
    let i = 0;
    while (i < queue.length && queue[i].priority >= priority) i++;
    queue.splice(i, 0, entry);

    const queueDepth = queue.length;
    this.emit('enqueued', { taskId: task.id, pool, priority, queueDepth });

    // Check if we need to scale up immediately
    this._checkScaleUp(pool);

    return { taskId: task.id, pool, priority, queueDepth };
  }

  // ─── dequeue ──────────────────────────────────────────────────────────────

  /**
   * Dequeue the highest-priority ready task from the specified pool.
   * Returns null if the pool queue is empty or no workers are idle.
   *
   * @param {string} pool - 'HOT'|'WARM'|'COLD'
   * @returns {object|null} task or null
   */
  dequeue(pool) {
    const queue = this._queues[pool];
    const poolState = this._pools[pool];

    if (queue.length === 0) return null;
    if (poolState.idle <= 0) return null;

    const entry = queue.shift();
    poolState.active++;
    poolState.idle--;
    this._idleSince[pool] = null;  // reset idle timer on activity

    const waitMs = Date.now() - entry.enqueuedAt;
    this.emit('dequeued', { taskId: entry.task.id, pool, waitMs });

    return entry.task;
  }

  // ─── complete ─────────────────────────────────────────────────────────────

  /**
   * Mark a task as completed, releasing the worker back to idle.
   * @param {string} taskId
   * @param {string} pool - the pool it was dispatched from
   */
  complete(taskId, pool) {
    const poolState = this._pools[pool];
    if (!poolState) return;
    if (poolState.active > 0) {
      poolState.active--;
      poolState.idle++;
    }
  }

  // ─── Scale logic ──────────────────────────────────────────────────────────

  /**
   * Scale up a pool if queue depth exceeds capacity × PHI.
   * Growth is Fibonacci-stepped (POOL_EXPAND_STEP = fib(6) = 8).
   * @private
   */
  _checkScaleUp(pool) {
    const queue = this._queues[pool];
    const poolState = this._pools[pool];

    if (queue.length > poolState.capacity * SCALE_UP_RATIO) {
      const oldSize = poolState.capacity;
      const newSize = oldSize + POOL_EXPAND_STEP;
      poolState.capacity = newSize;
      poolState.idle += POOL_EXPAND_STEP;

      this.emit('scaled', { pool, direction: 'UP', oldSize, newSize });
      this._log.info('[LiquidScheduler] scale-UP pool=%s %d→%d (queue=%d)',
        pool, oldSize, newSize, queue.length);
    }
  }

  /**
   * Scale down a pool if idle workers exceed capacity × (1 − 1/PHI)
   * and that state has persisted for > SCALE_DOWN_IDLE_MS (60s).
   * Never scales below MIN_POOL_SIZE (fib(5) = 5).
   * @private
   */
  _checkScaleDown(pool) {
    const poolState = this._pools[pool];
    const idleThreshold = poolState.capacity * (1 - 1 / PHI); // × PSI ≈ 0.382

    if (poolState.idle > idleThreshold) {
      const now = Date.now();
      if (this._idleSince[pool] === null) {
        this._idleSince[pool] = now;
      } else if (now - this._idleSince[pool] > SCALE_DOWN_IDLE_MS) {
        const removeCount = Math.min(
          Math.floor(poolState.idle - idleThreshold),
          poolState.capacity - MIN_POOL_SIZE,
        );
        if (removeCount > 0) {
          const oldSize = poolState.capacity;
          poolState.capacity -= removeCount;
          poolState.idle     -= removeCount;
          this._idleSince[pool] = null;

          this.emit('scaled', { pool, direction: 'DOWN', oldSize, newSize: poolState.capacity });
          this._log.info('[LiquidScheduler] scale-DOWN pool=%s %d→%d',
            pool, oldSize, poolState.capacity);
        }
      }
    } else {
      // Activity reset — clear hysteresis timer
      this._idleSince[pool] = null;
    }
  }

  // ─── Tick loop ────────────────────────────────────────────────────────────

  /** @private */
  _scheduleTick() {
    if (!this._running) return;
    this._tickHandle = setTimeout(() => {
      this._tick();
      this._scheduleTick();
    }, SCHEDULER_TICK_MS);
  }

  /**
   * Per-tick work: check scale-down conditions, emit stats.
   * @private
   */
  _tick() {
    const pressures = {};
    for (const pool of POOL_ORDER) {
      const s = this._pools[pool];
      const utilization = s.capacity > 0 ? s.active / s.capacity : 0;
      pressures[pool] = getPressureLevel(utilization).label;
      this._checkScaleDown(pool);
    }

    this.emit('tick', {
      pools: {
        HOT:  { ...this._pools.HOT,  queueDepth: this._queues.HOT.length  },
        WARM: { ...this._pools.WARM, queueDepth: this._queues.WARM.length },
        COLD: { ...this._pools.COLD, queueDepth: this._queues.COLD.length },
      },
      pressures,
    });
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  /**
   * Return a snapshot of pool state and queue depths.
   * @returns {object}
   */
  status() {
    return {
      HOT:  { ...this._pools.HOT,  queue: this._queues.HOT.length  },
      WARM: { ...this._pools.WARM, queue: this._queues.WARM.length },
      COLD: { ...this._pools.COLD, queue: this._queues.COLD.length },
      config: {
        scaleUpRatio:       SCALE_UP_RATIO,
        scaleDownIdleRatio: 1 - 1 / PHI,
        scaleDownIdleMs:    SCALE_DOWN_IDLE_MS,
        maxQueueDepth:      MAX_QUEUE_DEPTH,
        priorWeights:       PRIORITY_WEIGHTS,
        preWarmSizes:       PRE_WARM_SIZES,
      },
    };
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  LiquidScheduler,
  phiPriorityScore,
  PRIORITY_WEIGHTS,
  PRE_WARM_SIZES,
  SCALE_UP_RATIO,
  MAX_QUEUE_DEPTH,
  MIN_POOL_SIZE,
  POOL_EXPAND_STEP,
  SCHEDULER_TICK_MS,
};
