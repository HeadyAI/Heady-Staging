/**
 * BeeFactory — Dynamic Agent Worker Factory
 * Creates, manages, and recycles specialized Bee workers for the Heady swarm.
 * All constants φ-derived. CSL gates replace boolean logic. ESM only.
 * Author: Eric Haywood
 */
import { createHash } from 'crypto';

// ── φ-Math Foundation ────────────────────────────────────────────
const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI2 = 0.3819660113;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function phiThreshold(level, spread = PSI2) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),  // ≈0.927
  HIGH: phiThreshold(3),      // ≈0.882
  MEDIUM: phiThreshold(2),    // ≈0.809
  LOW: phiThreshold(1),       // ≈0.691
  MINIMUM: phiThreshold(0),   // ≈0.500
};

function cslGate(value, score, tau = CSL_THRESHOLDS.MEDIUM, temp = Math.pow(PSI, 3)) {
  return value * (1 / (1 + Math.exp(-(score - tau) / temp)));
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

function hashSHA256(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ── Bee Specialization Catalog ───────────────────────────────────
const BEE_CATALOG = {
  'code-generation': {
    name: 'JULES',
    capabilities: ['generate', 'refactor', 'inline-suggest'],
    pool: 'hot',
    timeoutMs: FIB[9] * 1000,        // 34s
    maxConcurrent: FIB[6],            // 8
    memoryMb: FIB[12],                // 144
    embeddingDim: FIB[16] < 384 ? 384 : FIB[16],
  },
  'code-review': {
    name: 'OBSERVER',
    capabilities: ['analyze', 'lint', 'security-scan'],
    pool: 'hot',
    timeoutMs: FIB[10] * 1000,       // 55s
    maxConcurrent: FIB[5],            // 5
    memoryMb: FIB[11],                // 89
    embeddingDim: 384,
  },
  'security-audit': {
    name: 'MURPHY',
    capabilities: ['vuln-scan', 'threat-model', 'pentest-sim'],
    pool: 'hot',
    timeoutMs: FIB[11] * 1000,       // 89s
    maxConcurrent: FIB[4],            // 3
    memoryMb: FIB[12],                // 144
    embeddingDim: 384,
  },
  'architecture': {
    name: 'ATLAS',
    capabilities: ['design', 'document', 'dependency-graph'],
    pool: 'hot',
    timeoutMs: FIB[11] * 1000,       // 89s
    maxConcurrent: FIB[4],            // 3
    memoryMb: FIB[13],                // 233
    embeddingDim: 384,
  },
  'research': {
    name: 'SOPHIA',
    capabilities: ['web-search', 'paper-analysis', 'citation'],
    pool: 'warm',
    timeoutMs: FIB[12] * 1000,       // 144s
    maxConcurrent: FIB[5],            // 5
    memoryMb: FIB[12],                // 144
    embeddingDim: 384,
  },
  'creative': {
    name: 'MUSE',
    capabilities: ['ideate', 'compose', 'visual-design'],
    pool: 'warm',
    timeoutMs: FIB[11] * 1000,       // 89s
    maxConcurrent: FIB[4],            // 3
    memoryMb: FIB[11],                // 89
    embeddingDim: 384,
  },
  'translation': {
    name: 'BRIDGE',
    capabilities: ['translate', 'localize', 'cultural-adapt'],
    pool: 'warm',
    timeoutMs: FIB[10] * 1000,       // 55s
    maxConcurrent: FIB[6],            // 8
    memoryMb: FIB[11],                // 89
    embeddingDim: 384,
  },
  'cleanup': {
    name: 'JANITOR',
    capabilities: ['gc', 'orphan-detect', 'compress', 'archive'],
    pool: 'cold',
    timeoutMs: FIB[13] * 1000,       // 233s
    maxConcurrent: FIB[3],            // 2
    memoryMb: FIB[10],                // 55
    embeddingDim: 384,
  },
  'monitoring': {
    name: 'SENTINEL',
    capabilities: ['watch', 'alert', 'correlate', 'escalate'],
    pool: 'warm',
    timeoutMs: FIB[10] * 1000,       // 55s
    maxConcurrent: FIB[5],            // 5
    memoryMb: FIB[10],                // 55
    embeddingDim: 384,
  },
  'innovation': {
    name: 'NOVA',
    capabilities: ['brainstorm', 'prototype', 'experiment'],
    pool: 'warm',
    timeoutMs: FIB[12] * 1000,       // 144s
    maxConcurrent: FIB[3],            // 2
    memoryMb: FIB[12],                // 144
    embeddingDim: 384,
  },
  'encryption': {
    name: 'CIPHER',
    capabilities: ['encrypt', 'decrypt', 'key-manage', 'zero-knowledge'],
    pool: 'hot',
    timeoutMs: FIB[9] * 1000,        // 34s
    maxConcurrent: FIB[4],            // 3
    memoryMb: FIB[11],                // 89
    embeddingDim: 384,
  },
  'observation': {
    name: 'LENS',
    capabilities: ['introspect', 'profile', 'trace', 'snapshot'],
    pool: 'warm',
    timeoutMs: FIB[10] * 1000,       // 55s
    maxConcurrent: FIB[5],            // 5
    memoryMb: FIB[10],                // 55
    embeddingDim: 384,
  },
};

// ── Bee Instance ─────────────────────────────────────────────────
class BeeInstance {
  constructor(id, specialization, catalogEntry) {
    this.id = id;
    this.specialization = specialization;
    this.name = catalogEntry.name;
    this.capabilities = catalogEntry.capabilities;
    this.pool = catalogEntry.pool;
    this.timeoutMs = catalogEntry.timeoutMs;
    this.memoryMb = catalogEntry.memoryMb;
    this.embeddingDim = catalogEntry.embeddingDim;
    this.state = 'idle';    // idle | active | draining | terminated
    this.createdAt = Date.now();
    this.lastActiveAt = Date.now();
    this.tasksCompleted = 0;
    this.tasksFailed = 0;
    this.coherenceScore = 1.0;
    this.embedding = this._initEmbedding();
    this.taskQueue = [];
    this.maxQueueDepth = FIB[13]; // 233
  }

  _initEmbedding() {
    const dim = this.embeddingDim;
    const vec = new Float32Array(dim);
    let seed = 42;
    for (let i = 0; i < dim; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      vec[i] = (seed / 0x7fffffff - PSI) * PHI;
    }
    return vec;
  }

  canAcceptTask(taskEmbedding) {
    const similarity = cosineSimilarity(this.embedding, taskEmbedding);
    const queueLoad = this.taskQueue.length / this.maxQueueDepth;
    const availability = cslGate(1.0, 1.0 - queueLoad, CSL_THRESHOLDS.LOW);
    const alignment = cslGate(1.0, similarity, CSL_THRESHOLDS.MINIMUM);
    const stateReady = this.state === 'idle' || this.state === 'active' ? 1.0 : 0.0;
    return alignment * availability * stateReady * this.coherenceScore;
  }

  assignTask(task) {
    this.state = 'active';
    this.lastActiveAt = Date.now();
    this.taskQueue.push({
      ...task,
      assignedAt: Date.now(),
      hash: hashSHA256({ taskId: task.id, beeId: this.id, ts: Date.now() }),
    });
    return { beeId: this.id, queued: this.taskQueue.length };
  }

  completeTask(taskId, success) {
    const idx = this.taskQueue.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      this.taskQueue.splice(idx, 1);
    }
    if (success) {
      this.tasksCompleted++;
      this.coherenceScore = Math.min(1.0, this.coherenceScore + Math.pow(PSI, 5));
    } else {
      this.tasksFailed++;
      this.coherenceScore = Math.max(0, this.coherenceScore - Math.pow(PSI, 3));
    }
    if (this.taskQueue.length === 0) {
      this.state = 'idle';
    }
    this.lastActiveAt = Date.now();
  }

  drain() {
    this.state = 'draining';
    return this.taskQueue.length;
  }

  terminate() {
    this.state = 'terminated';
    this.taskQueue = [];
  }

  health() {
    const uptime = Date.now() - this.createdAt;
    const idleTime = Date.now() - this.lastActiveAt;
    const successRate = this.tasksCompleted + this.tasksFailed > 0
      ? this.tasksCompleted / (this.tasksCompleted + this.tasksFailed)
      : 1.0;
    return {
      id: this.id,
      name: this.name,
      specialization: this.specialization,
      state: this.state,
      coherenceScore: this.coherenceScore,
      successRate,
      uptimeMs: uptime,
      idleMs: idleTime,
      queueDepth: this.taskQueue.length,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      pool: this.pool,
    };
  }
}

// ── BeeFactory ───────────────────────────────────────────────────
class BeeFactory {
  constructor(config = {}) {
    this.bees = new Map();
    this.nextId = 1;
    this.maxBeesPerSpec = config.maxBeesPerSpec ?? FIB[6];   // 8
    this.maxTotalBees = config.maxTotalBees ?? FIB[10];      // 55
    this.idleTimeoutMs = config.idleTimeoutMs ?? FIB[12] * 1000; // 144s
    this.coherenceThreshold = CSL_THRESHOLDS.LOW;            // ≈0.691
    this.auditLog = [];
    this.maxAuditEntries = FIB[16];  // 987
  }

  _audit(action, detail) {
    const entry = {
      ts: Date.now(),
      action,
      detail,
      hash: hashSHA256({ action, detail, ts: Date.now() }),
    };
    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-FIB[14]); // keep last 377
    }
    return entry;
  }

  spawn(specialization) {
    const catalogEntry = BEE_CATALOG[specialization];
    if (!catalogEntry) {
      return { error: `Unknown specialization: ${specialization}` };
    }

    const specCount = [...this.bees.values()]
      .filter(b => b.specialization === specialization && b.state !== 'terminated')
      .length;

    const maxForSpec = catalogEntry.maxConcurrent;
    const spawnAllowed = cslGate(1.0, 1.0 - (specCount / maxForSpec), CSL_THRESHOLDS.LOW);
    const totalAllowed = cslGate(1.0, 1.0 - (this.bees.size / this.maxTotalBees), CSL_THRESHOLDS.MINIMUM);

    if (spawnAllowed < CSL_THRESHOLDS.MINIMUM || totalAllowed < CSL_THRESHOLDS.MINIMUM) {
      return { error: 'Spawn denied — capacity threshold exceeded', spawnAllowed, totalAllowed };
    }

    const id = `bee-${this.nextId++}-${specialization}`;
    const bee = new BeeInstance(id, specialization, catalogEntry);
    this.bees.set(id, bee);

    this._audit('spawn', { id, specialization, pool: catalogEntry.pool });
    return { id, name: bee.name, pool: bee.pool, specialization };
  }

  findBestBee(specialization, taskEmbedding) {
    const candidates = [...this.bees.values()]
      .filter(b => b.specialization === specialization && b.state !== 'terminated' && b.state !== 'draining');

    if (candidates.length === 0) {
      const spawned = this.spawn(specialization);
      if (spawned.error) return { error: spawned.error };
      return this.bees.get(spawned.id);
    }

    let bestBee = null;
    let bestScore = -1;
    for (const bee of candidates) {
      const score = bee.canAcceptTask(taskEmbedding);
      const gatedScore = cslGate(score, bee.coherenceScore, this.coherenceThreshold);
      if (gatedScore > bestScore) {
        bestScore = gatedScore;
        bestBee = bee;
      }
    }

    if (!bestBee || bestScore < CSL_THRESHOLDS.MINIMUM) {
      const spawned = this.spawn(specialization);
      if (spawned.error) return { error: spawned.error };
      return this.bees.get(spawned.id);
    }

    return bestBee;
  }

  assignTask(specialization, task) {
    const taskEmbedding = task.embedding ?? new Float32Array(384);
    const bee = this.findBestBee(specialization, taskEmbedding);
    if (bee.error) return bee;

    const result = bee.assignTask(task);
    this._audit('assign', { beeId: bee.id, taskId: task.id });
    return result;
  }

  completeTask(beeId, taskId, success) {
    const bee = this.bees.get(beeId);
    if (!bee) return { error: `Bee not found: ${beeId}` };
    bee.completeTask(taskId, success);
    this._audit('complete', { beeId, taskId, success });
    return bee.health();
  }

  drainBee(beeId) {
    const bee = this.bees.get(beeId);
    if (!bee) return { error: `Bee not found: ${beeId}` };
    const remaining = bee.drain();
    this._audit('drain', { beeId, remainingTasks: remaining });
    return { beeId, state: 'draining', remainingTasks: remaining };
  }

  terminateBee(beeId) {
    const bee = this.bees.get(beeId);
    if (!bee) return { error: `Bee not found: ${beeId}` };
    bee.terminate();
    this._audit('terminate', { beeId });
    return { beeId, state: 'terminated' };
  }

  reapIdle() {
    const now = Date.now();
    const reaped = [];
    for (const [id, bee] of this.bees) {
      if (bee.state === 'terminated') continue;
      const idle = now - bee.lastActiveAt;
      const shouldReap = cslGate(1.0, idle / this.idleTimeoutMs, CSL_THRESHOLDS.MEDIUM);
      if (shouldReap > CSL_THRESHOLDS.HIGH && bee.taskQueue.length === 0) {
        bee.terminate();
        reaped.push(id);
      }
    }
    if (reaped.length > 0) {
      this._audit('reap', { reaped });
    }
    return reaped;
  }

  reapTerminated() {
    const removed = [];
    for (const [id, bee] of this.bees) {
      if (bee.state === 'terminated') {
        this.bees.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }

  healthAll() {
    const beeHealths = [];
    const poolCounts = { hot: 0, warm: 0, cold: 0 };
    for (const bee of this.bees.values()) {
      if (bee.state !== 'terminated') {
        const h = bee.health();
        beeHealths.push(h);
        poolCounts[bee.pool] = (poolCounts[bee.pool] ?? 0) + 1;
      }
    }
    return {
      totalBees: beeHealths.length,
      maxCapacity: this.maxTotalBees,
      poolDistribution: poolCounts,
      bees: beeHealths,
      auditLogSize: this.auditLog.length,
    };
  }

  catalog() {
    return Object.entries(BEE_CATALOG).map(([key, val]) => ({
      specialization: key,
      name: val.name,
      pool: val.pool,
      capabilities: val.capabilities,
      maxConcurrent: val.maxConcurrent,
      timeoutMs: val.timeoutMs,
      memoryMb: val.memoryMb,
    }));
  }
}

export default BeeFactory;
export { BeeFactory, BeeInstance, BEE_CATALOG };
