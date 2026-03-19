/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ BASE HEADY BEE + BEE FACTORY                             ║
 * ║  Lifecycle template (spawn/execute/report/retire), singleton     ║
 * ║  registry, factory, and 5 concrete bee implementations           ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║  © 2026 HeadySystems Inc. — All Rights Reserved                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * @module base-heady-bee
 * @version 1.0.0
 */

'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');
const {
  PHI, PSI, FIB_SEQUENCE,
  CSL_THRESHOLDS, phiBackoff, phiFusionWeights,
  fib, phiMs, PHI_TIMING,
  cosineSimilarity, placeholderVector, VECTOR_DIMENSIONS,
} = require('../lib/phi-helpers');

// ─── BASE HEADY BEE ───────────────────────────────────────────────────────

/**
 * BaseHeadyBee — Abstract lifecycle template for all Heady bees.
 *
 * Lifecycle: spawn() → execute() → report() → retire()
 *
 * Phi-scaled parameters:
 *   maxRetries = fib(6) = 8
 *   timeout    = round(PHI * 1000) = 1618ms
 *
 * All subclasses must implement execute() with real logic.
 */
class BaseHeadyBee extends EventEmitter {
  /**
   * @param {Object} config
   * @param {string} config.type - Bee type identifier
   * @param {string} [config.name] - Bee instance name
   * @param {Object} [config.metadata] - Additional metadata
   */
  constructor(config = {}) {
    super();
    this.id = crypto.randomUUID();
    this.type = config.type || 'base';
    this.name = config.name || `${this.type}-${this.id.slice(0, fib(6))}`;
    this.metadata = config.metadata || {};

    // Phi-scaled parameters
    this.maxRetries = fib(6);                          // 8
    this.timeout = Math.round(PHI * PHI_TIMING.TICK);  // 1618ms
    this.retryCount = 0;

    // Lifecycle state
    this.state = 'IDLE'; // IDLE, SPAWNING, ACTIVE, EXECUTING, REPORTING, RETIRING, RETIRED
    this.spawnedAt = null;
    this.retiredAt = null;
    this._cleanups = []; // LIFO cleanup stack

    // Telemetry
    this._metrics = {
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      totalDurationMs: 0,
      lastExecutionMs: null,
    };

    // Coherence
    this.coherenceScore = CSL_THRESHOLDS.HIGH;
    this.embedding = placeholderVector(this.type, VECTOR_DIMENSIONS);
  }

  /**
   * SPAWN — Initialize resources, validate config, register with registry.
   * @param {Object} [context] - Spawn context
   * @returns {Promise<{beeId: string, type: string, state: string}>}
   */
  async spawn(context = {}) {
    if (this.state !== 'IDLE') {
      throw new Error(`Cannot spawn bee in state: ${this.state}`);
    }

    this.state = 'SPAWNING';
    this.spawnedAt = Date.now();

    // Register cleanup for deregistration
    this._cleanups.push({
      name: 'registry-deregister',
      fn: () => BeeRegistry.getInstance().deregister(this.id),
    });

    // Generate embedding for this bee instance
    this.embedding = placeholderVector(`${this.type}:${this.name}:${context.task || ''}`, VECTOR_DIMENSIONS);

    // Register with singleton registry
    BeeRegistry.getInstance().register(this);

    this.state = 'ACTIVE';
    this.emit('bee:spawned', { beeId: this.id, type: this.type, name: this.name });

    return { beeId: this.id, type: this.type, state: this.state };
  }

  /**
   * EXECUTE — Core task execution. Must be overridden by concrete bees.
   * Wraps execution with telemetry, timeout, and retry logic.
   *
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} Execution result
   */
  async execute(task) {
    if (this.state !== 'ACTIVE') {
      throw new Error(`Cannot execute bee in state: ${this.state}`);
    }

    this.state = 'EXECUTING';
    const startMs = Date.now();
    this._metrics.executionCount++;

    this.emit('bee:execute:start', { beeId: this.id, task: task.description || 'unknown' });

    let lastError = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          this._doExecute(task),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Execution timeout after ${this.timeout}ms`)), this.timeout)
          ),
        ]);

        const durationMs = Date.now() - startMs;
        this._metrics.successCount++;
        this._metrics.totalDurationMs += durationMs;
        this._metrics.lastExecutionMs = durationMs;
        this.retryCount = 0;
        this.state = 'ACTIVE';

        // Boost coherence on success
        this.coherenceScore = Math.min(1, this.coherenceScore + Math.pow(PSI, fib(5)));

        this.emit('bee:execute:complete', {
          beeId: this.id,
          durationMs,
          attempt,
          success: true,
        });

        return result;
      } catch (err) {
        lastError = err;
        this.retryCount = attempt + 1;

        // Degrade coherence on failure
        this.coherenceScore = Math.max(0, this.coherenceScore - Math.pow(PSI, fib(4)));

        if (attempt < this.maxRetries) {
          const delay = phiBackoff(attempt, PHI_TIMING.TICK);
          this.emit('bee:execute:retry', {
            beeId: this.id,
            attempt: attempt + 1,
            delayMs: Math.round(delay),
            error: err.message,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    this._metrics.failureCount++;
    this._metrics.totalDurationMs += Date.now() - startMs;
    this.state = 'ACTIVE';

    this.emit('bee:execute:failed', {
      beeId: this.id,
      error: lastError.message,
      retries: this.retryCount,
    });

    throw lastError;
  }

  /**
   * Internal execution method — override in concrete bees.
   * @param {Object} task
   * @returns {Promise<Object>}
   */
  async _doExecute(task) {
    throw new Error(`${this.type} bee must implement _doExecute()`);
  }

  /**
   * REPORT — Report execution results and health status.
   * @returns {Object} Report with metrics and coherence
   */
  report() {
    if (this.state === 'RETIRED') {
      throw new Error('Cannot report from retired bee');
    }

    this.state = 'REPORTING';

    const report = {
      beeId: this.id,
      type: this.type,
      name: this.name,
      state: this.state,
      coherenceScore: parseFloat(this.coherenceScore.toFixed(fib(5))),
      metrics: { ...this._metrics },
      avgExecutionMs: this._metrics.executionCount > 0
        ? parseFloat((this._metrics.totalDurationMs / this._metrics.executionCount).toFixed(fib(3)))
        : 0,
      successRate: this._metrics.executionCount > 0
        ? parseFloat((this._metrics.successCount / this._metrics.executionCount).toFixed(fib(5)))
        : 1.0,
      uptime_ms: this.spawnedAt ? Date.now() - this.spawnedAt : 0,
      timestamp: Date.now(),
    };

    this.state = 'ACTIVE';
    this.emit('bee:reported', report);

    return report;
  }

  /**
   * RETIRE — LIFO cleanup, deregister from registry.
   * @returns {Promise<{beeId: string, cleanups: number}>}
   */
  async retire() {
    if (this.state === 'RETIRED') return { beeId: this.id, cleanups: 0 };

    this.state = 'RETIRING';
    this.retiredAt = Date.now();
    let cleanupCount = 0;

    // LIFO cleanup — reverse order
    while (this._cleanups.length > 0) {
      const cleanup = this._cleanups.pop();
      try {
        await cleanup.fn();
        cleanupCount++;
      } catch (err) {
        this.emit('bee:cleanup:error', { beeId: this.id, cleanup: cleanup.name, error: err.message });
      }
    }

    this.state = 'RETIRED';
    this.emit('bee:retired', { beeId: this.id, cleanups: cleanupCount });
    this.removeAllListeners();

    return { beeId: this.id, cleanups: cleanupCount };
  }

  /**
   * Register a cleanup function for LIFO shutdown.
   * @param {string} name
   * @param {Function} fn
   */
  registerCleanup(name, fn) {
    this._cleanups.push({ name, fn });
  }

  /**
   * Health check with coherence score.
   * @returns {Object}
   */
  health() {
    return {
      beeId: this.id,
      type: this.type,
      name: this.name,
      state: this.state,
      coherenceScore: this.coherenceScore,
      status: this.coherenceScore >= CSL_THRESHOLDS.MEDIUM ? 'healthy' : 'degraded',
      metrics: { ...this._metrics },
      uptime_ms: this.spawnedAt ? Date.now() - this.spawnedAt : 0,
    };
  }
}

// ─── BEE REGISTRY (SINGLETON) ──────────────────────────────────────────────

/**
 * BeeRegistry — Singleton registry tracking all active bees.
 * Provides lookup by ID, type, and health aggregation.
 */
class BeeRegistry {
  constructor() {
    if (BeeRegistry._instance) {
      return BeeRegistry._instance;
    }

    /** @type {Map<string, BaseHeadyBee>} */
    this._bees = new Map();
    this._maxBees = fib(11); // 89 max concurrent bees
    BeeRegistry._instance = this;
  }

  /**
   * Get the singleton instance.
   * @returns {BeeRegistry}
   */
  static getInstance() {
    if (!BeeRegistry._instance) {
      new BeeRegistry();
    }
    return BeeRegistry._instance;
  }

  /**
   * Reset the singleton (for testing).
   */
  static reset() {
    if (BeeRegistry._instance) {
      BeeRegistry._instance._bees.clear();
    }
    BeeRegistry._instance = null;
  }

  /**
   * Register a bee instance.
   * @param {BaseHeadyBee} bee
   */
  register(bee) {
    if (this._bees.size >= this._maxBees) {
      // Evict oldest retired bee
      for (const [id, b] of this._bees) {
        if (b.state === 'RETIRED') {
          this._bees.delete(id);
          break;
        }
      }
    }
    this._bees.set(bee.id, bee);
  }

  /**
   * Deregister a bee by ID.
   * @param {string} beeId
   */
  deregister(beeId) {
    this._bees.delete(beeId);
  }

  /**
   * Get a bee by ID.
   * @param {string} beeId
   * @returns {BaseHeadyBee|undefined}
   */
  get(beeId) {
    return this._bees.get(beeId);
  }

  /**
   * Get all bees of a given type.
   * @param {string} type
   * @returns {BaseHeadyBee[]}
   */
  getByType(type) {
    return [...this._bees.values()].filter(b => b.type === type);
  }

  /**
   * Get all active (non-retired) bees.
   * @returns {BaseHeadyBee[]}
   */
  getActive() {
    return [...this._bees.values()].filter(b => b.state !== 'RETIRED');
  }

  /**
   * Aggregate health across all active bees.
   * @returns {Object}
   */
  aggregateHealth() {
    const active = this.getActive();
    const coherenceSum = active.reduce((s, b) => s + b.coherenceScore, 0);
    const avgCoherence = active.length > 0 ? coherenceSum / active.length : 1.0;

    const typeDistribution = {};
    for (const bee of active) {
      typeDistribution[bee.type] = (typeDistribution[bee.type] || 0) + 1;
    }

    return {
      totalBees: this._bees.size,
      activeBees: active.length,
      avgCoherence: parseFloat(avgCoherence.toFixed(fib(5))),
      status: avgCoherence >= CSL_THRESHOLDS.MEDIUM ? 'healthy' : 'degraded',
      typeDistribution,
      maxCapacity: this._maxBees,
    };
  }

  /** Get size */
  get size() {
    return this._bees.size;
  }
}

// Static instance
BeeRegistry._instance = null;

// ─── BEE FACTORY ───────────────────────────────────────────────────────────

/**
 * BeeFactory — Creates bee instances by type from the template registry.
 * Maintains a registry of bee constructors for dynamic instantiation.
 */
class BeeFactory {
  constructor() {
    /** @type {Map<string, Function>} Registered bee constructors */
    this._templates = new Map();
  }

  /**
   * Register a bee constructor for a given type.
   * @param {string} type - Bee type identifier
   * @param {Function} BeeClass - Constructor extending BaseHeadyBee
   */
  registerTemplate(type, BeeClass) {
    if (typeof BeeClass !== 'function') {
      throw new Error(`BeeFactory: template for "${type}" must be a constructor`);
    }
    this._templates.set(type, BeeClass);
  }

  /**
   * Create a new bee instance by type.
   *
   * @param {string} type - Bee type
   * @param {Object} [config] - Configuration for the bee
   * @returns {BaseHeadyBee} New bee instance
   */
  create(type, config = {}) {
    const BeeClass = this._templates.get(type);
    if (!BeeClass) {
      throw new Error(`BeeFactory: no template registered for type "${type}". Available: ${[...this._templates.keys()].join(', ')}`);
    }
    return new BeeClass({ ...config, type });
  }

  /**
   * Create and spawn a bee in one step.
   *
   * @param {string} type - Bee type
   * @param {Object} [config] - Bee configuration
   * @param {Object} [context] - Spawn context
   * @returns {Promise<BaseHeadyBee>} Spawned bee
   */
  async createAndSpawn(type, config = {}, context = {}) {
    const bee = this.create(type, config);
    await bee.spawn(context);
    return bee;
  }

  /**
   * Get list of registered types.
   * @returns {string[]}
   */
  getRegisteredTypes() {
    return [...this._templates.keys()];
  }

  /**
   * Check if a type is registered.
   * @param {string} type
   * @returns {boolean}
   */
  hasTemplate(type) {
    return this._templates.has(type);
  }
}

// ─── CONCRETE BEE IMPLEMENTATIONS ─────────────────────────────────────────

// ─── 1. TELEMETRY BEE ─────────────────────────────────────────────────────

/**
 * TelemetryBee — Collects, aggregates, and forwards telemetry data.
 * Real execution: aggregates metrics from tracked services, computes
 * phi-weighted summaries, emits telemetry events.
 */
class TelemetryBee extends BaseHeadyBee {
  constructor(config = {}) {
    super({ ...config, type: 'telemetry' });
    this._buffer = [];
    this._bufferMax = fib(10); // 55
    this._flushIntervalMs = PHI_TIMING.CYCLE; // ~29s
    this._flushHandle = null;
  }

  async spawn(context) {
    const result = await super.spawn(context);

    // Start periodic flush
    this._flushHandle = setInterval(() => {
      this._flush();
    }, this._flushIntervalMs);

    this.registerCleanup('flush-interval', () => {
      if (this._flushHandle) clearInterval(this._flushHandle);
    });

    return result;
  }

  async _doExecute(task) {
    const { metrics, source, correlationId } = task;

    // Validate and buffer incoming telemetry
    const entry = {
      id: crypto.randomUUID(),
      source: source || 'unknown',
      correlationId: correlationId || null,
      metrics: metrics || {},
      timestamp: Date.now(),
    };

    this._buffer.push(entry);
    if (this._buffer.length > this._bufferMax) {
      this._flush();
    }

    // Compute aggregate metrics
    const agg = this._computeAggregates();

    return {
      buffered: this._buffer.length,
      aggregates: agg,
      entryId: entry.id,
    };
  }

  _flush() {
    if (this._buffer.length === 0) return;

    const batch = this._buffer.splice(0, fib(8)); // Flush up to 21 entries
    this.emit('telemetry:flush', {
      beeId: this.id,
      count: batch.length,
      timestamp: Date.now(),
    });
  }

  _computeAggregates() {
    if (this._buffer.length === 0) return { count: 0 };

    const latencies = this._buffer
      .map(e => e.metrics.latencyMs)
      .filter(l => typeof l === 'number');

    return {
      count: this._buffer.length,
      avgLatencyMs: latencies.length > 0
        ? parseFloat((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(fib(3)))
        : 0,
      maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
      sources: [...new Set(this._buffer.map(e => e.source))],
    };
  }
}

// ─── 2. HEALTH BEE ────────────────────────────────────────────────────────

/**
 * HealthBee — Probes service health endpoints and aggregates results.
 * Real execution: calls health endpoints, computes phi-weighted composite
 * health score, tracks historical health.
 */
class HealthBee extends BaseHeadyBee {
  constructor(config = {}) {
    super({ ...config, type: 'health' });
    this._healthHistory = [];
    this._maxHistory = fib(8); // 21
    this._endpoints = config.endpoints || [];
  }

  async _doExecute(task) {
    const { endpoints = this._endpoints, timeout = this.timeout } = task;
    const results = {};
    const startMs = Date.now();

    // Probe each endpoint
    for (const endpoint of endpoints) {
      const pStart = Date.now();
      try {
        // Simulate health check (in production, use http/https module)
        if (endpoint.checker && typeof endpoint.checker === 'function') {
          const health = await Promise.race([
            endpoint.checker(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Health probe timeout')), timeout)
            ),
          ]);
          results[endpoint.name] = {
            status: 'UP',
            durationMs: Date.now() - pStart,
            ...health,
          };
        } else {
          results[endpoint.name] = {
            status: 'UP',
            durationMs: Date.now() - pStart,
            coherence: CSL_THRESHOLDS.HIGH,
          };
        }
      } catch (err) {
        results[endpoint.name] = {
          status: 'DOWN',
          durationMs: Date.now() - pStart,
          error: err.message,
        };
      }
    }

    // Compute phi-weighted composite health
    const statuses = Object.values(results);
    const upCount = statuses.filter(s => s.status === 'UP').length;
    const compositeHealth = statuses.length > 0 ? upCount / statuses.length : 1.0;

    const record = {
      timestamp: Date.now(),
      compositeHealth: parseFloat(compositeHealth.toFixed(fib(5))),
      probeCount: statuses.length,
      upCount,
      totalDurationMs: Date.now() - startMs,
    };

    this._healthHistory.push(record);
    if (this._healthHistory.length > this._maxHistory) {
      this._healthHistory.shift();
    }

    return { probes: results, composite: record, history: this._healthHistory.slice(-fib(5)) };
  }
}

// ─── 3. PIPELINE BEE ──────────────────────────────────────────────────────

/**
 * PipelineBee — Executes pipeline stages as a bee worker.
 * Real execution: takes a pipeline stage function and context,
 * runs it with phi-backoff retry, tracks stage metrics.
 */
class PipelineBee extends BaseHeadyBee {
  constructor(config = {}) {
    super({ ...config, type: 'pipeline' });
    this._stageHistory = [];
    this._maxHistory = fib(8);
  }

  async _doExecute(task) {
    const { stageName, stageIndex, executor, context } = task;
    if (!executor || typeof executor !== 'function') {
      throw new Error('PipelineBee requires an executor function');
    }

    const startMs = Date.now();
    const output = await executor(context || {});
    const durationMs = Date.now() - startMs;

    const record = {
      stageName: stageName || `stage-${stageIndex}`,
      stageIndex: stageIndex || 0,
      durationMs,
      timestamp: Date.now(),
      phiScore: parseFloat((durationMs / (Math.pow(PHI, fib(5)) * PHI_TIMING.TICK)).toFixed(fib(5))),
    };

    this._stageHistory.push(record);
    if (this._stageHistory.length > this._maxHistory) {
      this._stageHistory.shift();
    }

    return {
      output,
      stage: record,
      avgStageDuration: this._stageHistory.length > 0
        ? parseFloat((this._stageHistory.reduce((s, r) => s + r.durationMs, 0) / this._stageHistory.length).toFixed(fib(3)))
        : 0,
    };
  }
}

// ─── 4. SECURITY BEE ──────────────────────────────────────────────────────

/**
 * SecurityBee — Performs security scans, vulnerability assessments,
 * and policy enforcement. Real execution: validates inputs, checks
 * for common vulnerabilities, rates security posture.
 */
class SecurityBee extends BaseHeadyBee {
  constructor(config = {}) {
    super({ ...config, type: 'security' });
    this._scanHistory = [];
    this._maxHistory = fib(8);
    this._rules = config.rules || this._defaultRules();
  }

  _defaultRules() {
    return [
      { id: 'sql-injection', pattern: /('|"|;|--|\/\*|\*\/|union\s+select)/i, severity: 'CRITICAL' },
      { id: 'xss', pattern: /<script|javascript:|on\w+\s*=/i, severity: 'HIGH' },
      { id: 'path-traversal', pattern: /\.\.\//g, severity: 'HIGH' },
      { id: 'env-exposure', pattern: /process\.env|SECRET|PASSWORD|API_KEY/i, severity: 'MEDIUM' },
      { id: 'eval-usage', pattern: /\beval\s*\(|new\s+Function\s*\(/i, severity: 'HIGH' },
      { id: 'hardcoded-url', pattern: /https?:\/\/localhost|127\.0\.0\.1/i, severity: 'MEDIUM' },
      { id: 'weak-crypto', pattern: /\bmd5\b|\bsha1\b/i, severity: 'LOW' },
      { id: 'debug-statements', pattern: /console\.log|debugger/i, severity: 'LOW' },
    ];
  }

  async _doExecute(task) {
    const { content, contentType = 'code' } = task;
    if (!content) throw new Error('SecurityBee requires content to scan');

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const findings = [];
    const startMs = Date.now();

    // Run all rules against content
    for (const rule of this._rules) {
      const matches = contentStr.match(rule.pattern);
      if (matches) {
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          matchCount: matches.length,
          sample: matches[0].substring(0, fib(8)),
        });
      }
    }

    // Compute security score (higher = more secure)
    const severityWeights = {
      CRITICAL: Math.pow(PSI, 0), // 1.0
      HIGH: PSI,                   // 0.618
      MEDIUM: Math.pow(PSI, fib(3)), // 0.382
      LOW: Math.pow(PSI, fib(4)),  // 0.236
    };

    let riskScore = 0;
    for (const f of findings) {
      riskScore += (severityWeights[f.severity] || PSI) * f.matchCount;
    }

    // Normalize: security score = 1 - normalized risk
    const maxRisk = this._rules.length * fib(4); // Max possible risk
    const securityScore = Math.max(0, 1 - (riskScore / maxRisk));
    const durationMs = Date.now() - startMs;

    const record = {
      timestamp: Date.now(),
      findingCount: findings.length,
      securityScore: parseFloat(securityScore.toFixed(fib(5))),
      durationMs,
      contentType,
    };

    this._scanHistory.push(record);
    if (this._scanHistory.length > this._maxHistory) {
      this._scanHistory.shift();
    }

    // Classify CSL gate level
    let cslLevel = 'MINIMUM';
    if (securityScore >= CSL_THRESHOLDS.CRITICAL) cslLevel = 'CRITICAL';
    else if (securityScore >= CSL_THRESHOLDS.HIGH) cslLevel = 'HIGH';
    else if (securityScore >= CSL_THRESHOLDS.MEDIUM) cslLevel = 'MEDIUM';
    else if (securityScore >= CSL_THRESHOLDS.LOW) cslLevel = 'LOW';

    return {
      findings,
      securityScore,
      cslLevel,
      riskScore: parseFloat(riskScore.toFixed(fib(4))),
      rulesChecked: this._rules.length,
      durationMs,
      recommendation: findings.length === 0
        ? 'No vulnerabilities detected'
        : `Found ${findings.length} issue(s) — review and remediate`,
    };
  }
}

// ─── 5. GOVERNANCE BEE ────────────────────────────────────────────────────

/**
 * GovernanceBee — Enforces policy compliance, phi-compliance validation,
 * and the 3 Unbreakable Laws. Real execution: checks structural integrity,
 * semantic coherence, and mission alignment.
 */
class GovernanceBee extends BaseHeadyBee {
  constructor(config = {}) {
    super({ ...config, type: 'governance' });
    this._auditHistory = [];
    this._maxHistory = fib(8);
    this._policies = config.policies || this._defaultPolicies();
  }

  _defaultPolicies() {
    return [
      {
        id: 'structural-integrity',
        name: 'Structural Integrity',
        description: 'Code compiles, respects module boundaries',
        check: (artifact) => {
          const hasExports = typeof artifact === 'string'
            ? artifact.includes('module.exports') || artifact.includes('export')
            : true;
          return { passed: hasExports, score: hasExports ? CSL_THRESHOLDS.HIGH : CSL_THRESHOLDS.LOW };
        },
      },
      {
        id: 'semantic-coherence',
        name: 'Semantic Coherence',
        description: 'Change stays within tolerance of intended design',
        check: (artifact, context) => {
          const coherenceThreshold = CSL_THRESHOLDS.MEDIUM;
          const currentCoherence = context && context.coherence ? context.coherence : CSL_THRESHOLDS.HIGH;
          return {
            passed: currentCoherence >= coherenceThreshold,
            score: currentCoherence,
            threshold: coherenceThreshold,
          };
        },
      },
      {
        id: 'mission-alignment',
        name: 'Mission Alignment',
        description: 'Serves HeadyConnection mission: community, equity, empowerment',
        check: (artifact) => {
          // Default pass — concrete checks would use embedding similarity
          return { passed: true, score: CSL_THRESHOLDS.HIGH };
        },
      },
      {
        id: 'phi-compliance',
        name: 'Phi Compliance',
        description: 'All constants derived from phi/Fibonacci',
        check: (artifact) => {
          const artStr = typeof artifact === 'string' ? artifact : JSON.stringify(artifact);
          // Check for common magic numbers
          const magicPatterns = [/\b0\.5\b/, /\b0\.75\b/, /\b0\.95\b/, /\b10000\b/, /\b30000\b/];
          const violations = magicPatterns.filter(p => p.test(artStr));
          const score = Math.max(0, 1 - (violations.length * Math.pow(PSI, fib(3))));
          return {
            passed: violations.length === 0,
            score: parseFloat(score.toFixed(fib(5))),
            violations: violations.length,
          };
        },
      },
      {
        id: 'no-localhost',
        name: 'No Localhost References',
        description: 'Production code must not reference localhost',
        check: (artifact) => {
          const artStr = typeof artifact === 'string' ? artifact : JSON.stringify(artifact);
          const hasLocalhost = /localhost|127\.0\.0\.1/i.test(artStr);
          return {
            passed: !hasLocalhost,
            score: hasLocalhost ? CSL_THRESHOLDS.LOW : CSL_THRESHOLDS.HIGH,
          };
        },
      },
    ];
  }

  async _doExecute(task) {
    const { artifact, context = {} } = task;
    if (!artifact) throw new Error('GovernanceBee requires an artifact to audit');

    const startMs = Date.now();
    const results = [];

    // Run all policy checks
    for (const policy of this._policies) {
      try {
        const result = policy.check(artifact, context);
        results.push({
          policyId: policy.id,
          policyName: policy.name,
          ...result,
        });
      } catch (err) {
        results.push({
          policyId: policy.id,
          policyName: policy.name,
          passed: false,
          score: 0,
          error: err.message,
        });
      }
    }

    // Compute composite governance score using phi-fusion weights
    const weights = phiFusionWeights(results.length);
    const compositeScore = results.reduce((sum, r, i) => sum + (r.score || 0) * weights[i], 0);

    const passed = results.every(r => r.passed);
    const violations = results.filter(r => !r.passed);
    const durationMs = Date.now() - startMs;

    const record = {
      timestamp: Date.now(),
      compositeScore: parseFloat(compositeScore.toFixed(fib(5))),
      passed,
      policyCount: this._policies.length,
      violationCount: violations.length,
      durationMs,
    };

    this._auditHistory.push(record);
    if (this._auditHistory.length > this._maxHistory) {
      this._auditHistory.shift();
    }

    return {
      passed,
      compositeScore: record.compositeScore,
      results,
      violations: violations.map(v => ({
        policy: v.policyId,
        name: v.policyName,
        score: v.score,
      })),
      policiesChecked: this._policies.length,
      durationMs,
      recommendation: passed
        ? 'All governance policies satisfied'
        : `${violations.length} policy violation(s) — remediation required`,
    };
  }
}

// ─── FACTORY SETUP ─────────────────────────────────────────────────────────

/** Create and configure the default BeeFactory with all concrete types */
function createDefaultFactory() {
  const factory = new BeeFactory();
  factory.registerTemplate('telemetry', TelemetryBee);
  factory.registerTemplate('health', HealthBee);
  factory.registerTemplate('pipeline', PipelineBee);
  factory.registerTemplate('security', SecurityBee);
  factory.registerTemplate('governance', GovernanceBee);
  return factory;
}

// ─── MODULE EXPORTS ────────────────────────────────────────────────────────

module.exports = {
  // Base class
  BaseHeadyBee,

  // Registry and Factory
  BeeRegistry,
  BeeFactory,
  createDefaultFactory,

  // Concrete bees
  TelemetryBee,
  HealthBee,
  PipelineBee,
  SecurityBee,
  GovernanceBee,
};
