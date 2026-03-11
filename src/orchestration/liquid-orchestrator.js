'use strict';
/**
 * liquid-orchestrator.js — LiquidOrchestrator
 * Dynamic liquid architecture engine for the Heady™ Sovereign AI Platform.
 *
 * Responsibilities:
 *   1. Dynamic bee creation with Fibonacci pool pre-warming
 *   2. Liquid routing (no fixed assignment — pure dynamic)
 *   3. Adaptive phi-stepped scaling with pressure-based load shedding
 *   4. Resource federation across Cloud Run / Cloudflare Workers / Colab GPU
 *   5. Swarm coordination (17 swarms, Fibonacci-sized bee pools)
 *   6. Full lifecycle management: SPAWN→INITIALIZE→READY→ACTIVE→DRAINING→SHUTDOWN→DEAD
 */

const { EventEmitter } = require('events');
const phi = require('../../shared/phi-math.js');
const {
  PHI, PSI, PHI_SQ, FIBONACCI, fib, phiBackoff,
  phiThreshold, phiFusionWeights, phiResourceWeights,
  phiTimeout, cslGate, pressureLevel,
  CSL_THRESHOLDS, PRESSURE_LEVELS, ALERT_THRESHOLDS,
  nearestFib
} = phi;

// ─── Cognitive config constants ────────────────────────────────────────────────
const MAX_CONCURRENT_BEES  = 10000;
const SWARM_COUNT          = 17;                  // prime + phi-adjacent
const STALE_TIMEOUT_MS     = fib(10) * 1000;      // 55000ms — no heartbeat → dead

// ─── Fibonacci pre-warm sizes for new swarms ─────────────────────────────────
const PREWARM_SIZES = [fib(5), fib(6), fib(7), fib(8)]; // [5, 8, 13, 21]

// ─── Scale trigger thresholds ─────────────────────────────────────────────────
const SCALE_UP_TRIGGER     = PHI;                // queue > pool × 1.618 → scale up
const SCALE_DOWN_TRIGGER   = 1 - PSI;            // idle > pool × (1-1/φ) → scale down (≈0.382)
const SCALE_DOWN_IDLE_MS   = 60 * 1000;          // 60s idle before scale-down

// ─── Phi admission priority scoring ──────────────────────────────────────────
const PRIORITY_WEIGHTS = phiFusionWeights(3); // [~0.528, ~0.326, ~0.146]
// → [criticality, urgency, user_impact]

// ─── CSL provider selection threshold ────────────────────────────────────────
const PROVIDER_CSL_THRESHOLD = PSI;             // 0.618

// ─── Max queue depth per swarm ────────────────────────────────────────────────
const MAX_QUEUE_DEPTH = fib(13);                // 233

// ─── Circuit breaker config ───────────────────────────────────────────────────
const CB_FAILURE_THRESHOLD = fib(5);            // 5
const CB_PROBE_COUNT       = fib(4);            // 3

// ─── Bee lifecycle states ─────────────────────────────────────────────────────
const BEE_STATES = {
  SPAWN:      'SPAWN',
  INITIALIZE: 'INITIALIZE',
  READY:      'READY',
  ACTIVE:     'ACTIVE',
  DRAINING:   'DRAINING',
  SHUTDOWN:   'SHUTDOWN',
  DEAD:       'DEAD'
};

// ─── Provider definitions (resource federation) ──────────────────────────────
const PROVIDERS = {
  CloudRun: {
    id:               'CloudRun',
    capabilities:     [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, PHI * PSI, PHI_SQ * PSI],
    latencyMs:        Math.round(fib(7) * PHI * 10),   // ≈210ms
    costPerUnit:      PSI * PSI * PSI,                  // ≈0.236
    maxConcurrency:   fib(9) * PHI_SQ,                  // 34 × 2.618 ≈ 89
    provisioned:      true
  },
  CloudflareWorkers: {
    id:               'CloudflareWorkers',
    capabilities:     [0.8, 0.7, 0.9, 0.6, PHI * PSI, 0.5, 0.4, PHI_SQ * PSI * PSI],
    latencyMs:        Math.round(fib(5) * PHI * 10),   // ≈81ms
    costPerUnit:      PSI * PSI * PSI * PSI,            // ≈0.146
    maxConcurrency:   fib(11) * PHI,                    // 89 × 1.618 ≈ 144
    provisioned:      true
  },
  ColabGPU: {
    id:               'ColabGPU',
    capabilities:     [0.6, 0.5, 0.7, 1.0, 0.9, 0.8, PHI * PSI * PSI, PHI_SQ * PSI * PSI],
    latencyMs:        Math.round(fib(10) * PHI * 10),  // ≈889ms
    costPerUnit:      PSI * PHI,                        // 1.0 (normalized)
    maxConcurrency:   fib(8),                           // 21
    provisioned:      false   // on-demand
  }
};

// Task capability vector (simplified 8-dim): code, review, sec, arch, research, doc, creative, gpu
function taskCapabilityVector(task) {
  const domain = (task.domain || '').toLowerCase();
  const v = new Array(8).fill(0);
  if (/code|gen|impl|build/.test(domain))       v[0] = 1.0;
  if (/review|audit|check/.test(domain))         v[1] = 1.0;
  if (/security|sec|auth/.test(domain))          v[2] = 1.0;
  if (/arch|design|system/.test(domain))         v[3] = 1.0;
  if (/research|study|data/.test(domain))        v[4] = 1.0;
  if (/doc|readme|guide/.test(domain))           v[5] = 1.0;
  if (/creative|art|content/.test(domain))       v[6] = 1.0;
  if (/model|train|gpu|ml|ai/.test(domain))      v[7] = 1.0;
  // Default: spread uniform
  const anySet = v.some(x => x > 0);
  if (!anySet) v.fill(PSI * PSI); // 0.382 each
  // Normalize
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm > 0 ? v.map(x => x / norm) : v;
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ─── CircuitBreaker (provider-level) ─────────────────────────────────────────
class ProviderCircuitBreaker {
  constructor(providerId) {
    this.providerId      = providerId;
    this.state           = 'CLOSED';
    this.failureCount    = 0;
    this.openedAt        = null;
    this.recoveryAttempt = 0;
    this.probeCount      = 0;
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      const backoffMs = phiBackoff(this.recoveryAttempt, fib(7) * PHI * 100, fib(12) * 1000);
      const elapsed   = Date.now() - (this.openedAt || 0);
      if (elapsed < backoffMs) {
        throw new Error(`Provider ${this.providerId} circuit OPEN — backoff ${Math.round(backoffMs)}ms`);
      }
      this.state      = 'HALF_OPEN';
      this.probeCount = 0;
    }
    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.probeCount++;
      if (this.probeCount >= CB_PROBE_COUNT) {
        this.state = 'CLOSED'; this.failureCount = 0;
        this.probeCount = 0; this.recoveryAttempt = 0;
      }
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  _onFailure() {
    this.failureCount++;
    if (this.state === 'HALF_OPEN' || this.failureCount >= CB_FAILURE_THRESHOLD) {
      this.state           = 'OPEN';
      this.openedAt        = Date.now();
      this.recoveryAttempt++;
    }
  }

  reset() {
    this.state = 'CLOSED'; this.failureCount = 0;
    this.probeCount = 0; this.recoveryAttempt = 0; this.openedAt = null;
  }
}

// ─── Bee ──────────────────────────────────────────────────────────────────────
class Bee {
  constructor(beeId, swarmId, providerId, options = {}) {
    this.beeId         = beeId;
    this.swarmId       = swarmId;
    this.providerId    = providerId;
    this.state         = BEE_STATES.SPAWN;
    this.createdAt     = Date.now();
    this.lastHeartbeat = Date.now();
    this.activeTaskId  = null;
    this.tasksCompleted = 0;
    this.tasksErrored  = 0;
    this._executeFn    = options.executeFn || null;
    this._checkpoints  = [];
  }

  isAlive() {
    return this.state !== BEE_STATES.DEAD && this.state !== BEE_STATES.SHUTDOWN;
  }

  isReady() {
    return this.state === BEE_STATES.READY;
  }

  isStale() {
    return Date.now() - this.lastHeartbeat > STALE_TIMEOUT_MS;
  }

  heartbeat() {
    this.lastHeartbeat = Date.now();
  }

  async initialize() {
    this.state = BEE_STATES.INITIALIZE;
    // Simulate init time: phi-fraction of base init budget
    const initMs = Math.round(fib(5) * PHI * PSI * 10); // ≈31ms
    await new Promise(r => setTimeout(r, Math.min(initMs, 20))); // cap sim
    this.state = BEE_STATES.READY;
    this.heartbeat();
    return this;
  }

  async execute(task) {
    if (this.state !== BEE_STATES.READY) {
      throw new Error(`Bee ${this.beeId} not READY (state=${this.state})`);
    }
    this.state        = BEE_STATES.ACTIVE;
    this.activeTaskId = task.id;
    this.heartbeat();

    try {
      let result;
      if (typeof this._executeFn === 'function') {
        result = await this._executeFn(task, this);
      } else {
        // Default simulated execution
        const execMs = fib(5) * PHI * PSI * Math.random() * 20; // small sim
        await new Promise(r => setTimeout(r, Math.min(execMs, 30)));
        result = { beeId: this.beeId, taskId: task.id, status: 'executed', simulated: true };
      }
      this.tasksCompleted++;
      this.checkpoint({ taskId: task.id, status: 'completed', ts: Date.now() });
      return result;
    } finally {
      this.state        = BEE_STATES.READY;
      this.activeTaskId = null;
      this.heartbeat();
    }
  }

  checkpoint(data) {
    this._checkpoints.push(data);
    if (this._checkpoints.length > fib(7)) this._checkpoints.shift(); // keep last 13
  }

  async drain() {
    this.state = BEE_STATES.DRAINING;
    // Wait for active task to complete (poll every phi×100ms)
    const pollMs  = Math.round(PHI * 100); // ≈162ms
    const timeoutMs = fib(10) * 1000;       // 55s
    const start   = Date.now();
    while (this.activeTaskId && (Date.now() - start) < timeoutMs) {
      await new Promise(r => setTimeout(r, pollMs));
    }
  }

  async shutdown() {
    await this.drain();
    this.state = BEE_STATES.SHUTDOWN;
    // Checkpoint final state
    this.checkpoint({ status: 'shutdown', ts: Date.now(), tasksCompleted: this.tasksCompleted });
    this.state = BEE_STATES.DEAD;
  }
}

// ─── Swarm ────────────────────────────────────────────────────────────────────
class Swarm {
  constructor(swarmId, options = {}) {
    this.swarmId      = swarmId;
    this.bees         = new Map();    // beeId → Bee
    this.taskQueue    = [];           // pending tasks
    this._beeCounter  = 0;
    this._preferredProvider = options.preferredProvider || 'CloudRun';
  }

  get size()         { return this.bees.size; }
  get readyCount()   { return [...this.bees.values()].filter(b => b.isReady()).length; }
  get activeCount()  { return [...this.bees.values()].filter(b => b.state === BEE_STATES.ACTIVE).length; }
  get aliveCount()   { return [...this.bees.values()].filter(b => b.isAlive()).length; }

  addBee(bee) {
    this.bees.set(bee.beeId, bee);
  }

  removeBee(beeId) {
    this.bees.delete(beeId);
  }

  nextReadyBee() {
    for (const bee of this.bees.values()) {
      if (bee.isReady()) return bee;
    }
    return null;
  }

  getTopology() {
    return {
      swarmId:      this.swarmId,
      size:         this.size,
      readyCount:   this.readyCount,
      activeCount:  this.activeCount,
      queueDepth:   this.taskQueue.length,
      beeStates:    Object.fromEntries(
        [...this.bees.values()].map(b => [b.beeId, b.state])
      )
    };
  }
}

// ─── LiquidOrchestrator ───────────────────────────────────────────────────────
class LiquidOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();

    this._swarms            = new Map();   // swarmId → Swarm
    this._allBees           = new Map();   // beeId → Bee
    this._globalQueue       = [];          // tasks waiting for any bee
    this._providerBreakers  = new Map();   // providerId → ProviderCircuitBreaker
    this._taskCounter       = 0;
    this._totalDispatched   = 0;
    this._totalCompleted    = 0;
    this._totalErrored      = 0;
    this._startedAt         = Date.now();
    this._shuttingDown      = false;

    // Metrics
    this._dispatchLatencies = [];
    this._maxLatencySamples = fib(14); // 377

    // Initialize provider circuit breakers
    for (const pid of Object.keys(PROVIDERS)) {
      this._providerBreakers.set(pid, new ProviderCircuitBreaker(pid));
    }

    // Initialize swarms
    this._initSwarms();

    // Heartbeat monitor: every fib(9)×1000 = 34000ms
    this._heartbeatInterval = setInterval(
      () => this._monitorHeartbeats(),
      fib(9) * 1000
    ).unref();

    // Scaling monitor: every fib(8)×1000 = 21000ms
    this._scalingInterval = setInterval(
      () => this._adaptiveScale(),
      fib(8) * 1000
    ).unref();

    // Queue drainer: every fib(5)×100 = 500ms
    this._drainInterval = setInterval(
      () => this._drainGlobalQueue(),
      fib(5) * 100
    ).unref();
  }

  // ─── Swarm Init ─────────────────────────────────────────────────────────────
  _initSwarms() {
    for (let i = 0; i < SWARM_COUNT; i++) {
      const swarmId = `swarm-${String(i).padStart(2, '0')}`;
      // Assign preferred provider round-robin across providers
      const providerKeys  = Object.keys(PROVIDERS);
      const preferredProv = providerKeys[i % providerKeys.length];
      const swarm = new Swarm(swarmId, { preferredProvider: preferredProv });
      this._swarms.set(swarmId, swarm);
    }
  }

  // ─── Public: spawn() ────────────────────────────────────────────────────────
  async spawn(swarmId, count = fib(5), options = {}) {
    if (this._shuttingDown) throw new Error('LiquidOrchestrator is shutting down');

    // Clamp count to a Fibonacci number
    const fibCount    = nearestFib(count);
    const targetCount = Math.min(fibCount, MAX_CONCURRENT_BEES - this._allBees.size);

    const swarm = this._swarms.get(swarmId);
    if (!swarm) throw new Error(`Unknown swarm: ${swarmId}`);

    const spawned = [];
    for (let i = 0; i < targetCount; i++) {
      if (this._allBees.size >= MAX_CONCURRENT_BEES) break;

      const beeId    = `${swarmId}-bee-${++this._taskCounter}-${Date.now()}`;
      const provider = options.providerId || swarm._preferredProvider;
      const bee      = new Bee(beeId, swarmId, provider, {
        executeFn: options.executeFn || null
      });

      // Initialize
      await bee.initialize();

      swarm.addBee(bee);
      this._allBees.set(beeId, bee);
      spawned.push(bee);

      this.emit('bee:spawned', { beeId, swarmId, state: bee.state });
    }

    return spawned;
  }

  // ─── Public: route() ────────────────────────────────────────────────────────
  async route(task) {
    if (this._shuttingDown) throw new Error('LiquidOrchestrator is shutting down');

    task.id = task.id || `task-${++this._taskCounter}-${Date.now()}`;

    const routeStart = Date.now();
    this._totalDispatched++;

    // 1. Phi-weighted priority scoring for queue admission
    const priorityScore = this._scorePriority(task);

    // 2. Check queue depth — shed if overpressured
    const queuePressure = this._globalQueue.length / MAX_QUEUE_DEPTH;
    const level         = pressureLevel(queuePressure);
    if (level === 'CRITICAL' && !task.critical) {
      this.emit('task:shed', { taskId: task.id, reason: 'critical_pressure', level });
      throw new Error(`Task ${task.id} shed — global queue at CRITICAL pressure`);
    }

    // 3. CSL-scored provider selection
    const provider = this._selectProvider(task);

    // 4. Find available bee (any swarm)
    const bee = this._findAvailableBee(task);

    if (bee) {
      return this._dispatchToBee(bee, task, provider, routeStart, priorityScore);
    }

    // 5. No bee available — enqueue
    this._enqueue(task, priorityScore);

    return {
      taskId:        task.id,
      status:        'queued',
      priorityScore: +priorityScore.toFixed(6),
      queueDepth:    this._globalQueue.length,
      provider:      provider?.id || null,
      queuePressure: +queuePressure.toFixed(6),
      level
    };
  }

  _findAvailableBee(task) {
    // Try preferred domain swarm first, then any swarm
    for (const swarm of this._swarms.values()) {
      const bee = swarm.nextReadyBee();
      if (bee) return bee;
    }
    return null;
  }

  async _dispatchToBee(bee, task, provider, routeStart, priorityScore) {
    const cb = provider ? this._providerBreakers.get(provider.id) : null;

    let result;
    try {
      if (cb) {
        result = await cb.call(() => bee.execute(task));
      } else {
        result = await bee.execute(task);
      }
      this._totalCompleted++;
    } catch (err) {
      this._totalErrored++;
      bee.tasksErrored++;
      this.emit('task:error', { taskId: task.id, beeId: bee.beeId, error: err.message });
      throw err;
    }

    const latencyMs = Date.now() - routeStart;
    this._recordLatency(latencyMs);

    this.emit('task:completed', {
      taskId:    task.id,
      beeId:     bee.beeId,
      swarmId:   bee.swarmId,
      latencyMs,
      provider:  provider?.id || null
    });

    return {
      taskId:        task.id,
      status:        'completed',
      beeId:         bee.beeId,
      swarmId:       bee.swarmId,
      provider:      provider?.id || null,
      latencyMs,
      priorityScore: +priorityScore.toFixed(6),
      result
    };
  }

  // ─── Queue ───────────────────────────────────────────────────────────────────
  _enqueue(task, priorityScore) {
    // Insert in priority order (highest score first)
    task._priorityScore = priorityScore;
    task._enqueuedAt    = Date.now();

    let inserted = false;
    for (let i = 0; i < this._globalQueue.length; i++) {
      if (priorityScore > this._globalQueue[i]._priorityScore) {
        this._globalQueue.splice(i, 0, task);
        inserted = true;
        break;
      }
    }
    if (!inserted) this._globalQueue.push(task);

    // Enforce max depth — shed lowest priority tail
    while (this._globalQueue.length > MAX_QUEUE_DEPTH) {
      const shed = this._globalQueue.pop();
      this.emit('task:shed', { taskId: shed.id, reason: 'queue_overflow' });
    }
    this.emit('task:queued', { taskId: task.id, queueDepth: this._globalQueue.length });
  }

  async _drainGlobalQueue() {
    if (this._globalQueue.length === 0) return;
    const task = this._globalQueue[0];
    const bee  = this._findAvailableBee(task);
    if (!bee) return;

    this._globalQueue.shift();
    const provider  = this._selectProvider(task);
    const routeStart = Date.now();

    try {
      await this._dispatchToBee(bee, task, provider, routeStart, task._priorityScore || 0);
    } catch (_) { /* error already emitted */ }
  }

  // ─── Priority Scoring ────────────────────────────────────────────────────────
  _scorePriority(task) {
    const criticality = task.critical ? 1.0 : (task.priority === 'high' ? PSI : PSI * PSI);
    const urgency     = task.urgent   ? 1.0 : (task.deadline ? Math.max(0, 1 - (task.deadline - Date.now()) / (fib(9) * 10000)) : PSI * PSI);
    const userImpact  = task.userFacing ? PHI * PSI * PSI : PSI * PSI * PSI;

    const [w0, w1, w2] = PRIORITY_WEIGHTS;
    return Math.min(1.0, w0 * criticality + w1 * urgency + w2 * userImpact);
  }

  // ─── Provider Selection ──────────────────────────────────────────────────────
  _selectProvider(task) {
    const taskVec = taskCapabilityVector(task);
    let   best    = null;
    let   bestScore = -Infinity;

    for (const [pid, provider] of Object.entries(PROVIDERS)) {
      const cb = this._providerBreakers.get(pid);
      if (cb && cb.state === 'OPEN') continue;
      if (!provider.provisioned && !task.allowOnDemand) continue;

      const capSim = cosineSim(taskVec, provider.capabilities);
      // CSL gate
      const gated  = cslGate(capSim, capSim, PROVIDER_CSL_THRESHOLD, 0.05);
      const score  = gated - provider.costPerUnit * PSI;  // penalize cost by ψ

      if (score > bestScore) {
        bestScore = score;
        best      = provider;
      }
    }
    return best;
  }

  // ─── Adaptive Scaling ────────────────────────────────────────────────────────
  async _adaptiveScale() {
    if (this._shuttingDown) return;

    for (const swarm of this._swarms.values()) {
      await this._scaleSwarm(swarm);
    }
    this.emit('scaling:cycle', { topology: this.getTopology() });
  }

  async _scaleSwarm(swarm) {
    const poolSize  = swarm.size;
    const queueLen  = this._globalQueue.length; // approximate per-swarm share
    const idleBees  = [...swarm.bees.values()].filter(b => b.isReady());
    const idleMs    = idleBees.map(b => Date.now() - b.lastHeartbeat);
    const longIdle  = idleMs.filter(t => t > SCALE_DOWN_IDLE_MS).length;

    // Scale up: queue depth > pool × φ
    if (poolSize > 0 && queueLen > poolSize * SCALE_UP_TRIGGER) {
      const stepSize = nearestFib(Math.ceil(poolSize * (PHI - 1)));
      if (this._allBees.size + stepSize <= MAX_CONCURRENT_BEES) {
        await this.spawn(swarm.swarmId, stepSize);
        this.emit('scaling:up', { swarmId: swarm.swarmId, added: stepSize, newSize: swarm.size });
      }
    }

    // Scale down: idle > pool × (1-1/φ) for > 60s
    if (poolSize > PREWARM_SIZES[0] && longIdle > poolSize * SCALE_DOWN_TRIGGER) {
      const toRemove = nearestFib(Math.ceil(longIdle * PSI)); // shed ψ-fraction of long-idle
      let removed    = 0;
      for (const bee of idleBees) {
        if (removed >= toRemove) break;
        const idleTime = Date.now() - bee.lastHeartbeat;
        if (idleTime > SCALE_DOWN_IDLE_MS && bee.isReady()) {
          await bee.shutdown();
          swarm.removeBee(bee.beeId);
          this._allBees.delete(bee.beeId);
          removed++;
          this.emit('bee:scaled-down', { beeId: bee.beeId, swarmId: swarm.swarmId, idleTime });
        }
      }
      if (removed > 0) {
        this.emit('scaling:down', { swarmId: swarm.swarmId, removed, newSize: swarm.size });
      }
    }
  }

  // ─── Public: scale() ────────────────────────────────────────────────────────
  async scale(swarmId, targetDelta) {
    const swarm = this._swarms.get(swarmId);
    if (!swarm) throw new Error(`Unknown swarm: ${swarmId}`);

    const fibDelta = nearestFib(Math.abs(targetDelta));
    if (targetDelta > 0) {
      await this.spawn(swarmId, fibDelta);
    } else {
      let removed = 0;
      for (const bee of swarm.bees.values()) {
        if (removed >= fibDelta) break;
        if (bee.isReady()) {
          await bee.shutdown();
          swarm.removeBee(bee.beeId);
          this._allBees.delete(bee.beeId);
          removed++;
        }
      }
    }
    return { swarmId, delta: targetDelta, newSize: swarm.size };
  }

  // ─── Heartbeat Monitor ───────────────────────────────────────────────────────
  async _monitorHeartbeats() {
    const stale = [];
    for (const [beeId, bee] of this._allBees.entries()) {
      if (bee.isStale() && bee.isAlive()) {
        stale.push(bee);
      }
    }

    for (const bee of stale) {
      this.emit('bee:stale', { beeId: bee.beeId, swarmId: bee.swarmId, lastHeartbeat: bee.lastHeartbeat });
      // Mark dead
      bee.state = BEE_STATES.DEAD;
      const swarm = this._swarms.get(bee.swarmId);
      if (swarm) swarm.removeBee(bee.beeId);
      this._allBees.delete(bee.beeId);

      // Respawn replacement
      if (!this._shuttingDown) {
        try {
          await this.spawn(bee.swarmId, 1, { providerId: bee.providerId });
          this.emit('bee:respawned', { replacedBeeId: bee.beeId, swarmId: bee.swarmId });
        } catch (err) {
          this.emit('bee:respawn-failed', { beeId: bee.beeId, error: err.message });
        }
      }
    }
  }

  // ─── Topology ───────────────────────────────────────────────────────────────
  getTopology() {
    const swarms = {};
    for (const [swarmId, swarm] of this._swarms.entries()) {
      swarms[swarmId] = swarm.getTopology();
    }

    const providerStates = {};
    for (const [pid, cb] of this._providerBreakers.entries()) {
      providerStates[pid] = cb.state;
    }

    return {
      swarmCount:       SWARM_COUNT,
      totalBees:        this._allBees.size,
      maxConcurrentBees: MAX_CONCURRENT_BEES,
      globalQueueDepth: this._globalQueue.length,
      maxQueueDepth:    MAX_QUEUE_DEPTH,
      prewarmSizes:     PREWARM_SIZES,
      swarms,
      providers:        providerStates,
      scaleUpTrigger:   +SCALE_UP_TRIGGER.toFixed(6),
      scaleDownTrigger: +SCALE_DOWN_TRIGGER.toFixed(6),
      staleTimeoutMs:   STALE_TIMEOUT_MS
    };
  }

  // ─── Health ──────────────────────────────────────────────────────────────────
  getHealth() {
    const totalBees   = this._allBees.size;
    const activeBees  = [...this._allBees.values()].filter(b => b.state === BEE_STATES.ACTIVE).length;
    const readyBees   = [...this._allBees.values()].filter(b => b.isReady()).length;
    const staleBees   = [...this._allBees.values()].filter(b => b.isStale()).length;

    const queuePressure  = totalBees > 0 ? this._globalQueue.length / MAX_QUEUE_DEPTH : 0;
    const level          = pressureLevel(queuePressure);

    const sorted = [...this._dispatchLatencies].sort((a, b) => a - b);
    const p50    = percentile(sorted, 50);
    const p95    = percentile(sorted, 95);
    const p99    = percentile(sorted, 99);

    const errorRate = this._totalDispatched > 0
      ? this._totalErrored / this._totalDispatched
      : 0;

    const healthy = level !== 'CRITICAL' && errorRate < ALERT_THRESHOLDS.warning && staleBees === 0;

    return {
      healthy,
      level,
      totalBees, activeBees, readyBees, staleBees,
      queueDepth:     this._globalQueue.length,
      queuePressure:  +queuePressure.toFixed(6),
      totalDispatched: this._totalDispatched,
      totalCompleted:  this._totalCompleted,
      totalErrored:    this._totalErrored,
      errorRate:      +errorRate.toFixed(6),
      latencyP50:     p50, latencyP95: p95, latencyP99: p99,
      uptimeMs:       Date.now() - this._startedAt,
      phiConstants: {
        scaleUpAt:   +SCALE_UP_TRIGGER.toFixed(6),
        scaleDownAt: +SCALE_DOWN_TRIGGER.toFixed(6),
        staleAfterMs: STALE_TIMEOUT_MS,
        cslThreshold: +PROVIDER_CSL_THRESHOLD.toFixed(6)
      }
    };
  }

  // ─── Latency Recording ───────────────────────────────────────────────────────
  _recordLatency(ms) {
    this._dispatchLatencies.push(ms);
    if (this._dispatchLatencies.length > this._maxLatencySamples) {
      const evict = Math.floor(this._maxLatencySamples * (1 - 1 / PHI));
      this._dispatchLatencies.splice(0, evict);
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  async shutdown() {
    this._shuttingDown = true;
    clearInterval(this._heartbeatInterval);
    clearInterval(this._scalingInterval);
    clearInterval(this._drainInterval);

    // Graceful shutdown: drain all bees
    const drainPromises = [];
    for (const bee of this._allBees.values()) {
      drainPromises.push(bee.shutdown().catch(() => {}));
    }
    await Promise.all(drainPromises);

    this._allBees.clear();
    for (const swarm of this._swarms.values()) swarm.bees.clear();

    this.emit('orchestrator:shutdown', {
      uptimeMs:       Date.now() - this._startedAt,
      totalCompleted: this._totalCompleted,
      totalErrored:   this._totalErrored
    });
  }
}

// ─── Shared percentile utility ────────────────────────────────────────────────
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

module.exports = LiquidOrchestrator;
module.exports.Bee                  = Bee;
module.exports.Swarm                = Swarm;
module.exports.ProviderCircuitBreaker = ProviderCircuitBreaker;
module.exports.BEE_STATES           = BEE_STATES;
module.exports.PROVIDERS            = PROVIDERS;
module.exports.SWARM_COUNT          = SWARM_COUNT;
module.exports.MAX_CONCURRENT_BEES  = MAX_CONCURRENT_BEES;
module.exports.STALE_TIMEOUT_MS     = STALE_TIMEOUT_MS;
module.exports.PREWARM_SIZES        = PREWARM_SIZES;
module.exports.SCALE_UP_TRIGGER     = SCALE_UP_TRIGGER;
module.exports.SCALE_DOWN_TRIGGER   = SCALE_DOWN_TRIGGER;
