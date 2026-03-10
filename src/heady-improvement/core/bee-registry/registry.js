/**
 * HeadyBee Registry — Dynamic Bee Factory & Template Registry
 * 
 * Runtime bee instance management with CSL-gated spawning,
 * auto-tuning based on performance metrics, and swarm assignment.
 * 
 * @module core/bee-registry/registry
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

import { EventEmitter } from 'events';
import { BEE_TEMPLATES, RESOURCE_CLASSES, SWARM_TYPES } from './bee-templates.js';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const PSI3 = PSI * PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** φ-threshold levels */
const phiThreshold = (level, spread = 0.5) => 1 - Math.pow(PSI, level) * spread;
const CSL_HIGH = phiThreshold(3);    // ≈ 0.882
const CSL_MEDIUM = phiThreshold(2);  // ≈ 0.809
const CSL_LOW = phiThreshold(1);     // ≈ 0.691

/** CSL cosine similarity for 8D domain embeddings */
const cosineSimilarity = (a, b) => {
  let dot = 0, magA = 0, magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

export class BeeRegistry extends EventEmitter {
  constructor(config = {}) {
    super();
    this.templates = new Map();
    this.instances = new Map();
    this.swarmAssignments = new Map(); // swarmType -> Set<instanceId>
    this.performanceMetrics = new Map(); // beeType -> metrics
    this.maxInstances = config.maxInstances || FIB[12]; // 144
    this.autoTuneIntervalMs = config.autoTuneIntervalMs || Math.round(PHI * 1000 * FIB[10]); // ~89s
    this.autoTuneTimer = null;

    // Initialize swarm assignment maps
    for (const swarm of SWARM_TYPES) {
      this.swarmAssignments.set(swarm, new Set());
    }

    // Load canonical templates
    this._loadCanonicalTemplates();
  }

  /**
   * Get a bee template by type
   */
  getTemplate(beeType) {
    return this.templates.get(beeType) || null;
  }

  /**
   * List all registered bee templates
   */
  listTemplates() {
    const result = [];
    for (const [type, template] of this.templates) {
      result.push({
        type,
        displayName: template.displayName,
        description: template.description,
        pool: template.pool,
        resourceClass: template.resourceClass,
        capabilities: template.capabilities,
        swarmAffinity: template.swarmAffinity,
        instanceCount: this._getInstanceCount(type),
      });
    }
    return result;
  }

  /**
   * Register a custom bee template (extending canonical set)
   */
  registerTemplate(beeType, template) {
    if (!template.domainEmbedding || template.domainEmbedding.length !== 8) {
      throw new Error('Template must have 8D domainEmbedding');
    }
    if (!template.resourceClass || !RESOURCE_CLASSES[template.resourceClass]) {
      throw new Error('Invalid resourceClass: ' + template.resourceClass);
    }

    this.templates.set(beeType, {
      ...template,
      registeredAt: Date.now(),
      custom: true,
    });

    this.emit('template:registered', { beeType, custom: true });
  }

  /**
   * Spawn a bee instance from a template
   * Returns the instance with full lifecycle methods
   */
  spawn(beeType, context = {}) {
    const template = this.templates.get(beeType);
    if (!template) {
      throw new Error(`Unknown bee type: ${beeType}`);
    }

    if (this.instances.size >= this.maxInstances) {
      // Retire oldest idle bee
      this._retireOldestIdle();
      if (this.instances.size >= this.maxInstances) {
        throw new Error(`Max instance limit reached: ${this.maxInstances}`);
      }
    }

    const resourceConfig = RESOURCE_CLASSES[template.resourceClass];
    const activeCount = this._getInstanceCount(beeType);
    if (activeCount >= resourceConfig.maxConcurrent) {
      throw new Error(`Max concurrent limit for ${beeType}: ${resourceConfig.maxConcurrent}`);
    }

    const instanceId = `${beeType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const instance = {
      id: instanceId,
      beeType,
      state: 'spawning',
      template,
      context,
      spawnedAt: Date.now(),
      lastActiveAt: Date.now(),
      executionCount: 0,
      totalLatency: 0,
      failureCount: 0,
      resourceConfig,
      swarmMemberships: new Set(),

      // Lifecycle methods
      async execute(task) {
        this.state = 'executing';
        this.lastActiveAt = Date.now();
        this.executionCount++;
        const start = Date.now();

        try {
          // Task execution delegated to registered handler or context handler
          const handler = context.handler || (() => { throw new Error('No handler registered'); });
          const result = await Promise.race([
            handler(task, this),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Bee execution timeout')), resourceConfig.timeoutMs)
            ),
          ]);

          this.state = 'idle';
          this.totalLatency += Date.now() - start;
          return result;
        } catch (error) {
          this.state = 'error';
          this.failureCount++;
          this.totalLatency += Date.now() - start;
          throw error;
        }
      },

      report() {
        return {
          id: this.id,
          beeType: this.beeType,
          state: this.state,
          executionCount: this.executionCount,
          avgLatency: this.executionCount > 0
            ? Math.round(this.totalLatency / this.executionCount)
            : 0,
          failureRate: this.executionCount > 0
            ? this.failureCount / this.executionCount
            : 0,
          uptime: Date.now() - this.spawnedAt,
          swarmMemberships: [...this.swarmMemberships],
        };
      },
    };

    instance.state = 'idle';
    this.instances.set(instanceId, instance);

    // Auto-assign to swarms based on affinity
    for (const swarm of template.swarmAffinity) {
      this._assignToSwarm(instanceId, swarm);
    }

    this.emit('bee:spawned', { instanceId, beeType, pool: template.pool });
    return instance;
  }

  /**
   * Retire a bee instance (LIFO cleanup)
   */
  retire(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    instance.state = 'retired';

    // Remove from swarms
    for (const swarm of instance.swarmMemberships) {
      const members = this.swarmAssignments.get(swarm);
      if (members) members.delete(instanceId);
    }

    // Record performance metrics for auto-tuning
    this._recordPerformance(instance);

    this.instances.delete(instanceId);
    this.emit('bee:retired', {
      instanceId,
      beeType: instance.beeType,
      report: instance.report(),
    });

    return true;
  }

  /**
   * Find the best bee type for a given task using CSL domain matching
   */
  findBestBeeForTask(taskEmbedding, requiredCapabilities = []) {
    let bestType = null;
    let bestScore = 0;

    for (const [beeType, template] of this.templates) {
      // CSL cosine similarity for domain alignment
      const domainScore = cosineSimilarity(template.domainEmbedding, taskEmbedding);

      // Capability coverage check
      const capabilityCoverage = requiredCapabilities.length > 0
        ? requiredCapabilities.filter(c => template.capabilities.includes(c)).length
          / requiredCapabilities.length
        : 1.0;

      // φ-fusion: domain(0.618) + capability(0.382)
      const score = domainScore * PSI + capabilityCoverage * PSI2;

      if (score > bestScore) {
        bestScore = score;
        bestType = beeType;
      }
    }

    return bestType ? { beeType: bestType, score: bestScore } : null;
  }

  /**
   * Get all bees in a specific swarm
   */
  getSwarmMembers(swarmType) {
    const memberIds = this.swarmAssignments.get(swarmType);
    if (!memberIds) return [];

    return [...memberIds]
      .map(id => this.instances.get(id))
      .filter(Boolean)
      .map(i => i.report());
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const poolCounts = { hot: 0, warm: 0, cold: 0 };
    const stateCounts = { idle: 0, executing: 0, error: 0, spawning: 0 };
    const typeCounts = {};

    for (const [, instance] of this.instances) {
      const pool = instance.template.pool;
      poolCounts[pool] = (poolCounts[pool] || 0) + 1;
      stateCounts[instance.state] = (stateCounts[instance.state] || 0) + 1;
      typeCounts[instance.beeType] = (typeCounts[instance.beeType] || 0) + 1;
    }

    const swarmSizes = {};
    for (const [swarm, members] of this.swarmAssignments) {
      if (members.size > 0) swarmSizes[swarm] = members.size;
    }

    return {
      totalTemplates: this.templates.size,
      totalInstances: this.instances.size,
      maxInstances: this.maxInstances,
      poolCounts,
      stateCounts,
      typeCounts,
      swarmSizes,
    };
  }

  /**
   * Start auto-tuning loop
   */
  startAutoTune() {
    if (this.autoTuneTimer) return;
    this.autoTuneTimer = setInterval(() => this._autoTune(), this.autoTuneIntervalMs);
    this.emit('autotune:started');
  }

  /**
   * Stop auto-tuning
   */
  stopAutoTune() {
    if (this.autoTuneTimer) {
      clearInterval(this.autoTuneTimer);
      this.autoTuneTimer = null;
    }
  }

  /**
   * Shutdown all instances gracefully
   */
  async shutdown() {
    this.stopAutoTune();

    // LIFO retirement
    const instanceIds = [...this.instances.keys()].reverse();
    for (const id of instanceIds) {
      this.retire(id);
    }

    this.emit('registry:shutdown');
  }

  // === INTERNAL ===

  _loadCanonicalTemplates() {
    for (const [beeType, template] of Object.entries(BEE_TEMPLATES)) {
      this.templates.set(beeType, { ...template, custom: false });
    }
  }

  _getInstanceCount(beeType) {
    let count = 0;
    for (const [, instance] of this.instances) {
      if (instance.beeType === beeType) count++;
    }
    return count;
  }

  _assignToSwarm(instanceId, swarmType) {
    const members = this.swarmAssignments.get(swarmType);
    if (members) {
      members.add(instanceId);
      const instance = this.instances.get(instanceId);
      if (instance) instance.swarmMemberships.add(swarmType);
    }
  }

  _retireOldestIdle() {
    let oldestIdle = null;
    let oldestTime = Infinity;

    for (const [id, instance] of this.instances) {
      if (instance.state === 'idle' && instance.lastActiveAt < oldestTime) {
        oldestTime = instance.lastActiveAt;
        oldestIdle = id;
      }
    }

    if (oldestIdle) {
      this.retire(oldestIdle);
    }
  }

  _recordPerformance(instance) {
    const key = instance.beeType;
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, {
        totalExecutions: 0,
        totalFailures: 0,
        totalLatency: 0,
        instanceCount: 0,
      });
    }

    const metrics = this.performanceMetrics.get(key);
    metrics.totalExecutions += instance.executionCount;
    metrics.totalFailures += instance.failureCount;
    metrics.totalLatency += instance.totalLatency;
    metrics.instanceCount++;
  }

  _autoTune() {
    for (const [beeType, metrics] of this.performanceMetrics) {
      if (metrics.totalExecutions === 0) continue;

      const failureRate = metrics.totalFailures / metrics.totalExecutions;
      const avgLatency = metrics.totalLatency / metrics.totalExecutions;
      const template = this.templates.get(beeType);
      if (!template) continue;

      // If failure rate above φ-threshold HIGH, increase retries
      if (failureRate > (1 - CSL_HIGH)) {
        template.retries = Math.min(template.retries + 1, FIB[6]);
        this.emit('autotune:adjusted', {
          beeType,
          adjustment: 'retries-increased',
          value: template.retries,
          reason: `failure rate ${(failureRate * 100).toFixed(1)}%`,
        });
      }

      // If avg latency approaching timeout, increase backoff
      const resourceConfig = RESOURCE_CLASSES[template.resourceClass];
      if (avgLatency > resourceConfig.timeoutMs * PSI) {
        template.backoffBaseMs = Math.round(template.backoffBaseMs * PHI);
        this.emit('autotune:adjusted', {
          beeType,
          adjustment: 'backoff-increased',
          value: template.backoffBaseMs,
          reason: `avg latency ${Math.round(avgLatency)}ms`,
        });
      }
    }
  }
}
