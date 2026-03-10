/**
 * Heady™ Colab Task Router — CSL-Based Task Routing to Optimal Colab Runtime
 *
 * Routes GPU tasks to the Colab runtime with highest semantic affinity using:
 * - CSL cosine scoring between task embedding and runtime capability vectors
 * - φ-weighted load factor in routing decisions
 * - Task classification: embedding, inference, fine-tune, batch-process, experiment
 * - Overflow handling: Fibonacci queue depth fib(13) = 233
 * - Task priority via CSL gates (concurrent-equals with confidence weights)
 *
 * Author: Eric Haywood, eric@headysystems.com
 * © 2026 HeadySystems Inc. — 51 Provisional Patents
 */

'use strict';

const {
  PHI, PSI, PHI_SQ, fib, phiMs,
  CSL_THRESHOLDS, PHI_TIMING, POOLS, VECTOR,
  cosineSimilarity, normalize, cslGate, sigmoid,
  phiFusionWeights, getPressureLevel,
} = require('../shared/phi-math');

// ═══════════════════════════════════════════════════════════════════════════════
// φ-DERIVED CONSTANTS — ZERO MAGIC NUMBERS
// ═══════════════════════════════════════════════════════════════════════════════

const QUEUE_DEPTH           = fib(13);                    // 233 max queued tasks
const QUEUE_DRAIN_BATCH     = fib(6);                     // 8 tasks per drain cycle
const ROUTING_TIMEOUT_MS    = PHI_TIMING.PHI_3;          // 4,236ms routing decision timeout
const STALE_TASK_MS         = PHI_TIMING.PHI_9;          // 75,025ms — task considered stale
const PRIORITY_DECAY_RATE   = PSI;                        // 0.618 — priority decays by ψ per timeout
const MIN_ROUTING_SCORE     = CSL_THRESHOLDS.MINIMUM;    // 0.500 — noise floor for routing
const AFFINITY_GATE_TAU     = CSL_THRESHOLDS.DEFAULT;    // 0.618 — CSL gate threshold
const AFFINITY_GATE_TEMP    = Math.pow(PSI, 3);          // 0.236 — gate temperature

// Task type → pool affinity weights (φ-derived)
const TASK_POOL_AFFINITY = Object.freeze({
  'embedding':      { hot: POOLS.HOT, warm: POOLS.WARM, cold: POOLS.COLD },
  'inference':      { hot: POOLS.HOT + POOLS.WARM, warm: POOLS.COLD, cold: 0 },
  'fine-tune':      { hot: 0, warm: POOLS.HOT + POOLS.WARM, cold: POOLS.COLD },
  'batch-process':  { hot: POOLS.COLD, warm: POOLS.HOT, cold: POOLS.WARM },
  'vector-search':  { hot: POOLS.HOT, warm: POOLS.WARM, cold: POOLS.COLD },
  'hnsw-build':     { hot: 0, warm: POOLS.HOT, cold: POOLS.WARM },
  'projection':     { hot: POOLS.HOT, warm: POOLS.WARM, cold: POOLS.COLD },
  'experiment':     { hot: 0, warm: POOLS.COLD, cold: POOLS.HOT + POOLS.WARM },
  'drift-detection':{ hot: POOLS.COLD, warm: POOLS.WARM, cold: POOLS.HOT },
});

// CSL priority weights — concurrent-equals model (not boolean priority)
const PRIORITY_WEIGHTS = Object.freeze({
  REALTIME:   1.0,                          // 1.000 — user-facing, latency-critical
  HIGH:       PSI,                          // 0.618 — important background
  NORMAL:     PSI * PSI,                    // 0.382 — standard processing
  LOW:        Math.pow(PSI, 3),             // 0.236 — batch/analytics
  BACKGROUND: Math.pow(PSI, 4),             // 0.146 — experiments, low priority
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'colab-task-router',
    msg,
    ...meta,
  }) + '\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify a task and assign CSL priority weight.
 * Returns an enriched task object with classification metadata.
 */
function classifyTask(task) {
  const type = task.type || 'embedding';
  const poolAffinity = TASK_POOL_AFFINITY[type] || TASK_POOL_AFFINITY['embedding'];

  // Determine CSL priority weight from task metadata
  let priorityWeight;
  if (task.priority !== undefined && task.priority !== null) {
    // User-supplied priority is treated as a CSL confidence weight
    priorityWeight = Math.max(0, Math.min(1, task.priority));
  } else if (type === 'inference' || type === 'embedding') {
    priorityWeight = task.realtime ? PRIORITY_WEIGHTS.REALTIME : PRIORITY_WEIGHTS.HIGH;
  } else if (type === 'fine-tune' || type === 'batch-process') {
    priorityWeight = PRIORITY_WEIGHTS.NORMAL;
  } else if (type === 'experiment') {
    priorityWeight = PRIORITY_WEIGHTS.BACKGROUND;
  } else {
    priorityWeight = PRIORITY_WEIGHTS.NORMAL;
  }

  return {
    ...task,
    classification: {
      type,
      poolAffinity,
      priorityWeight,
      classifiedAt: Date.now(),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSL ROUTING SCORER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Score a runtime for a given task using CSL cosine routing.
 *
 * Composite score = cslGate(
 *   affinityScore × loadFactor × pressureFactor × taskMatch,
 *   cosineAlignment,
 *   τ = AFFINITY_GATE_TAU,
 *   temp = AFFINITY_GATE_TEMP
 * )
 *
 * @param {object} task - Classified task with embedding and classification
 * @param {object} runtime - Runtime state object
 * @returns {object} { score, components }
 */
function scoreRuntime(task, runtime) {
  const pool = runtime.pool;
  const classification = task.classification || classifyTask(task).classification;

  // 1. Pool affinity from task type → pool mapping
  const poolAffinity = classification.poolAffinity[pool] || 0;

  // 2. CSL cosine affinity between task embedding and runtime capability vector
  let cosineAffinity = poolAffinity; // Fallback if no embeddings
  if (task.embedding && runtime.capabilityVector) {
    cosineAffinity = cosineSimilarity(task.embedding, runtime.capabilityVector);
  }

  // 3. φ-weighted load factor: lighter load = higher score
  const loadFactor = 1 - (runtime.loadFactor * PSI);

  // 4. Pressure penalty from runtime utilization
  const pressureLabel = runtime.pressureLevel
    ? runtime.pressureLevel.label || runtime.pressureLevel
    : 'NOMINAL';
  const pressureFactor = pressureLabel === 'NOMINAL' ? 1
    : pressureLabel === 'ELEVATED' ? PSI
    : pressureLabel === 'HIGH' ? PSI * PSI
    : Math.pow(PSI, 3); // CRITICAL

  // 5. Task type match bonus
  const capabilities = runtime.capabilities || [];
  const typeMatch = capabilities.includes(classification.type) ? PHI : 1;

  // 6. GPU availability factor
  const gpuAvailable = runtime.isHealthy !== false && runtime.status === 'ACTIVE';
  const gpuFactor = gpuAvailable ? 1 : 0;

  // 7. Raw composite score
  const rawScore = poolAffinity * loadFactor * pressureFactor * typeMatch * gpuFactor;

  // 8. CSL-gated final score: smooth sigmoid gating by cosine alignment
  const gatedScore = cosineAffinity > MIN_ROUTING_SCORE
    ? cslGate(rawScore, cosineAffinity, AFFINITY_GATE_TAU, AFFINITY_GATE_TEMP)
    : rawScore * cosineAffinity;

  return {
    score: gatedScore,
    components: {
      poolAffinity,
      cosineAffinity: Number(cosineAffinity.toFixed(6)),
      loadFactor: Number(loadFactor.toFixed(4)),
      pressureFactor,
      typeMatch,
      gpuAvailable,
      rawScore: Number(rawScore.toFixed(6)),
      gatedScore: Number(gatedScore.toFixed(6)),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

class ColabTaskRouter {
  /**
   * @param {object} opts
   * @param {Map} opts.runtimes - Map of pool → ColabRuntime instances
   * @param {number} [opts.queueDepth] - Max queue depth (default fib(13)=233)
   */
  constructor(opts = {}) {
    this._runtimes = opts.runtimes || new Map();
    this._queueDepth = opts.queueDepth || QUEUE_DEPTH;
    this._queue = [];
    this._routingHistory = [];
    this._routingHistoryMax = fib(10); // 55 entries
    this._totalRouted = 0;
    this._totalQueued = 0;
    this._totalDropped = 0;
    this._totalOverflow = 0;
  }

  /**
   * Route a task to the optimal Colab runtime.
   *
   * @param {object} task - Task to route { type, data, embedding, preferPool, priority }
   * @returns {object} { runtime, score, queued, components } or { queued: true, queuePosition }
   */
  route(task) {
    // Classify the task
    const classifiedTask = classifyTask(task);

    // If preferred pool specified, try it first
    if (classifiedTask.preferPool) {
      const preferred = this._runtimes.get(classifiedTask.preferPool);
      if (preferred && preferred.isActive) {
        const { score, components } = scoreRuntime(classifiedTask, preferred);
        if (score > MIN_ROUTING_SCORE) {
          this._recordRouting(classifiedTask, preferred, score, components);
          return {
            runtime: preferred,
            pool: preferred.pool,
            score,
            queued: false,
            components,
          };
        }
      }
    }

    // Score all active runtimes
    const candidates = [];
    for (const [pool, runtime] of this._runtimes) {
      if (!runtime.isActive && runtime.isHealthy !== true) continue;
      const { score, components } = scoreRuntime(classifiedTask, runtime);
      candidates.push({ runtime, pool, score, components });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Route to best candidate above minimum threshold
    for (const candidate of candidates) {
      if (candidate.score >= MIN_ROUTING_SCORE) {
        this._recordRouting(classifiedTask, candidate.runtime, candidate.score, candidate.components);
        return {
          runtime: candidate.runtime,
          pool: candidate.pool,
          score: candidate.score,
          queued: false,
          components: candidate.components,
        };
      }
    }

    // No runtime available above threshold — route to best available anyway
    if (candidates.length > 0 && candidates[0].score > 0) {
      const best = candidates[0];
      this._recordRouting(classifiedTask, best.runtime, best.score, best.components);
      return {
        runtime: best.runtime,
        pool: best.pool,
        score: best.score,
        queued: false,
        components: best.components,
        belowThreshold: true,
      };
    }

    // All runtimes busy — enqueue with overflow handling
    return this.enqueue(classifiedTask);
  }

  /**
   * Enqueue a task when all runtimes are busy.
   * Queue is priority-ordered using CSL confidence weights.
   *
   * @param {object} task - Classified task
   * @returns {object} { queued, queuePosition } or { error }
   */
  enqueue(task) {
    if (this._queue.length >= this._queueDepth) {
      this._totalOverflow++;
      this._totalDropped++;

      // Overflow handling: drop lowest-priority task if new task has higher priority
      const newPriority = task.classification?.priorityWeight || PRIORITY_WEIGHTS.NORMAL;
      const lowestIdx = this._findLowestPriorityIndex();

      if (lowestIdx >= 0) {
        const lowestPriority = this._queue[lowestIdx].classification?.priorityWeight || 0;
        if (newPriority > lowestPriority) {
          const dropped = this._queue.splice(lowestIdx, 1)[0];
          log('warn', 'Queue overflow — dropped lower priority task', {
            droppedTaskId: dropped.id,
            droppedPriority: lowestPriority,
            newTaskId: task.id,
            newPriority,
          });
        } else {
          return {
            queued: false,
            error: 'HEADY-COLAB-003',
            message: `Queue full (${this._queueDepth}), task priority too low`,
            queueDepth: this._queue.length,
          };
        }
      }
    }

    // Insert task in priority-sorted position (CSL confidence weight ordering)
    const priority = task.classification?.priorityWeight || PRIORITY_WEIGHTS.NORMAL;
    let insertIdx = this._queue.length;
    for (let i = 0; i < this._queue.length; i++) {
      const qPriority = this._queue[i].classification?.priorityWeight || PRIORITY_WEIGHTS.NORMAL;
      if (priority > qPriority) {
        insertIdx = i;
        break;
      }
    }

    this._queue.splice(insertIdx, 0, {
      ...task,
      enqueuedAt: Date.now(),
    });

    this._totalQueued++;

    log('info', 'Task enqueued', {
      taskId: task.id,
      type: task.type,
      priority,
      queuePosition: insertIdx + 1,
      queueDepth: this._queue.length,
    });

    return {
      queued: true,
      queuePosition: insertIdx + 1,
      queueDepth: this._queue.length,
    };
  }

  /**
   * Dequeue the next task suitable for a given runtime.
   *
   * @param {object} runtime - Runtime to dequeue for
   * @returns {object|null} Task or null if no suitable task
   */
  dequeue(runtime) {
    for (let i = 0; i < this._queue.length; i++) {
      const task = this._queue[i];

      // Check pool preference
      if (task.preferPool && task.preferPool !== runtime.pool) continue;

      // Check capability match
      const type = task.classification?.type || task.type;
      if (type && runtime.capabilities && !runtime.capabilities.includes(type)) continue;

      // Check if task is stale
      if (task.enqueuedAt && (Date.now() - task.enqueuedAt) > STALE_TASK_MS) {
        this._queue.splice(i, 1);
        log('warn', 'Stale task removed from queue', {
          taskId: task.id,
          ageMs: Date.now() - task.enqueuedAt,
        });
        i--;
        continue;
      }

      // Score this runtime for the task
      const { score } = scoreRuntime(task, runtime);
      if (score > 0) {
        this._queue.splice(i, 1);
        return task;
      }
    }

    return null;
  }

  /**
   * Drain tasks from queue to available runtimes.
   *
   * @returns {Array<{task, runtime, score}>} Successfully routed tasks
   */
  drain() {
    const routed = [];
    let drained = 0;

    for (const [, runtime] of this._runtimes) {
      if (!runtime.isActive) continue;

      while (drained < QUEUE_DRAIN_BATCH) {
        const task = this.dequeue(runtime);
        if (!task) break;

        const { score, components } = scoreRuntime(task, runtime);
        routed.push({ task, runtime, score, components });
        drained++;
      }
    }

    if (routed.length > 0) {
      log('info', 'Queue drain cycle', {
        drained: routed.length,
        remaining: this._queue.length,
      });
    }

    return routed;
  }

  /**
   * Clean stale tasks from queue.
   */
  pruneStale() {
    const now = Date.now();
    const before = this._queue.length;

    this._queue = this._queue.filter(task => {
      if (task.enqueuedAt && (now - task.enqueuedAt) > STALE_TASK_MS) {
        log('warn', 'Pruned stale task', { taskId: task.id });
        return false;
      }
      return true;
    });

    const pruned = before - this._queue.length;
    if (pruned > 0) {
      log('info', 'Stale task pruning', { pruned, remaining: this._queue.length });
    }
    return pruned;
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  _findLowestPriorityIndex() {
    if (this._queue.length === 0) return -1;
    let lowestIdx = 0;
    let lowestPriority = Infinity;
    for (let i = 0; i < this._queue.length; i++) {
      const p = this._queue[i].classification?.priorityWeight || PRIORITY_WEIGHTS.NORMAL;
      if (p < lowestPriority) {
        lowestPriority = p;
        lowestIdx = i;
      }
    }
    return lowestIdx;
  }

  _recordRouting(task, runtime, score, components) {
    this._totalRouted++;
    this._routingHistory.push({
      taskId: task.id,
      type: task.type,
      pool: runtime.pool,
      score: Number(score.toFixed(6)),
      priority: task.classification?.priorityWeight,
      ts: Date.now(),
    });

    if (this._routingHistory.length > this._routingHistoryMax) {
      this._routingHistory.shift();
    }
  }

  // ─── Status & Metrics ────────────────────────────────────────────────────

  get queueDepth() {
    return this._queue.length;
  }

  get queueCapacity() {
    return this._queueDepth;
  }

  status() {
    const queueByType = {};
    const queueByPriority = {};

    for (const task of this._queue) {
      const type = task.classification?.type || task.type || 'unknown';
      queueByType[type] = (queueByType[type] || 0) + 1;

      const priority = task.classification?.priorityWeight || PRIORITY_WEIGHTS.NORMAL;
      const bucket = priority >= PRIORITY_WEIGHTS.REALTIME ? 'REALTIME'
        : priority >= PRIORITY_WEIGHTS.HIGH ? 'HIGH'
        : priority >= PRIORITY_WEIGHTS.NORMAL ? 'NORMAL'
        : priority >= PRIORITY_WEIGHTS.LOW ? 'LOW'
        : 'BACKGROUND';
      queueByPriority[bucket] = (queueByPriority[bucket] || 0) + 1;
    }

    return {
      queueDepth: this._queue.length,
      queueCapacity: this._queueDepth,
      queueUtilization: this._queue.length / this._queueDepth,
      queueByType,
      queueByPriority,
      totalRouted: this._totalRouted,
      totalQueued: this._totalQueued,
      totalDropped: this._totalDropped,
      totalOverflow: this._totalOverflow,
      recentRoutings: this._routingHistory.slice(-fib(5)), // Last 5 routings
    };
  }

  metrics() {
    const lines = [];
    lines.push(`heady_router_queue_depth ${this._queue.length}`);
    lines.push(`heady_router_queue_capacity ${this._queueDepth}`);
    lines.push(`heady_router_total_routed ${this._totalRouted}`);
    lines.push(`heady_router_total_queued ${this._totalQueued}`);
    lines.push(`heady_router_total_dropped ${this._totalDropped}`);
    lines.push(`heady_router_total_overflow ${this._totalOverflow}`);
    return lines.join('\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  ColabTaskRouter,
  classifyTask,
  scoreRuntime,
  TASK_POOL_AFFINITY,
  PRIORITY_WEIGHTS,
  QUEUE_DEPTH,
  QUEUE_DRAIN_BATCH,
  MIN_ROUTING_SCORE,
  AFFINITY_GATE_TAU,
  AFFINITY_GATE_TEMP,
  STALE_TASK_MS,
};
