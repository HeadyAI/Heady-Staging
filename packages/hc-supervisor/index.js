// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: packages/hc-supervisor/index.js                            ║
// ║  LAYER: packages                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HC-Supervisor — Multi-Agent Supervision & Coordination Package
 *
 * Bridges the HeadyOrchestrator (src/orchestration/) with the agent registry
 * (src/agents/index.js) to provide a production-grade Supervisor pattern:
 *
 *   1. Registers all agents (claude-code, builder, researcher, deployer, auditor, observer)
 *   2. Routes tasks via skill matching with phi-weighted scoring
 *   3. Executes through circuit breakers + bulkhead isolation
 *   4. Aggregates results with phi-weighted consensus
 *   5. Emits events for observability
 *
 * @module hc-supervisor
 * @version 2.0.0
 */

'use strict';

const { EventEmitter } = require('events');

// Import orchestration primitives
let HeadyOrchestrator, createAllAgents;
try {
  HeadyOrchestrator = require('../../src/orchestration/index.js').HeadyOrchestrator;
} catch (err) {
  // Standalone usage — provide minimal orchestrator
  HeadyOrchestrator = null;
}
try {
  createAllAgents = require('../../src/agents/index.js').createAllAgents;
} catch (err) {
  createAllAgents = null;
}

// Sacred Geometry constants
let PHI, PSI, fib;
try {
  const phiMath = require('../../shared/phi-math.js');
  PHI = phiMath.PHI;
  PSI = phiMath.PSI;
  fib = phiMath.fib;
} catch {
  PHI = 1.618033988749895;
  PSI = 0.618033988749895;
  fib = (n) => [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89][n] || 0;
}

/**
 * HCSupervisor — production Supervisor pattern for multi-agent coordination.
 *
 * Wraps HeadyOrchestrator with agent lifecycle management, fan-out execution,
 * and phi-weighted result aggregation.
 */
class HCSupervisor extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Array} [options.agents] - Pre-created agent instances (overrides auto-creation)
   * @param {Object} [options.resourcePolicies] - Resource policies from configs/
   * @param {Object} [options.serviceCatalog] - Service catalog from configs/
   * @param {number} [options.maxConcurrentTasks] - Max parallel tasks (default fib(6)=8)
   */
  constructor(options = {}) {
    super();

    this.maxConcurrentTasks = options.maxConcurrentTasks || fib(6); // 8
    this.agents = new Map();
    this.orchestrator = HeadyOrchestrator ? new HeadyOrchestrator(options.tuning || {}) : null;
    this.taskHistory = [];
    this.running = 0;
    this.startedAt = Date.now();

    // Register agents
    const agentList = options.agents || (createAllAgents ? createAllAgents(options) : []);
    for (const agent of agentList) {
      this.registerAgent(agent);
    }
  }

  /**
   * Register an agent with the supervisor.
   * @param {Object} agent - Agent instance with { id, skills, handle(), describe(), getStatus() }
   */
  registerAgent(agent) {
    this.agents.set(agent.id, {
      instance: agent,
      id: agent.id,
      skills: agent.skills || [],
      status: 'idle',
      taskCount: 0,
      lastActivity: null,
      consecutiveFailures: 0,
    });

    // Also register with orchestrator for skill routing
    if (this.orchestrator) {
      this.orchestrator.registerAgent(agent.id, agent.skills || [], 1.0);
    }

    this.emit('agent:registered', { agentId: agent.id, skills: agent.skills });
  }

  /**
   * Route a task to the best-matching agent based on skill overlap and load.
   * @param {Object} task - { type, requiredSkills?, data?, weight? }
   * @returns {Promise<Object>} Task result from the selected agent
   */
  async routeTask(task) {
    const taskId = task.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Find best agent by skill match
    const agent = this._findBestAgent(task);
    if (!agent) {
      const err = { taskId, status: 'failed', error: `No agent found for task type: ${task.type}` };
      this.taskHistory.push(err);
      this.emit('task:unroutable', err);
      return err;
    }

    // Execute
    const entry = this.agents.get(agent.id);
    entry.status = 'busy';
    entry.lastActivity = Date.now();
    this.running++;

    const start = Date.now();
    try {
      const result = await entry.instance.handle({ request: task, taskId });
      const duration = Date.now() - start;

      entry.taskCount++;
      entry.consecutiveFailures = 0;
      entry.status = 'idle';
      this.running--;

      const record = { taskId, agentId: agent.id, status: 'completed', durationMs: duration, result };
      this.taskHistory.push(record);
      this.emit('task:completed', record);
      return record;
    } catch (err) {
      const duration = Date.now() - start;
      entry.consecutiveFailures++;
      entry.status = entry.consecutiveFailures >= 3 ? 'degraded' : 'idle';
      this.running--;

      const record = { taskId, agentId: agent.id, status: 'failed', durationMs: duration, error: err.message };
      this.taskHistory.push(record);
      this.emit('task:failed', record);
      return record;
    }
  }

  /**
   * Fan-out: dispatch multiple tasks concurrently, respecting maxConcurrentTasks.
   * @param {Array<Object>} tasks - Array of task objects
   * @returns {Promise<Array<Object>>} Results for all tasks
   */
  async fanOut(tasks) {
    const results = [];
    const chunks = [];

    // Chunk tasks by maxConcurrentTasks
    for (let i = 0; i < tasks.length; i += this.maxConcurrentTasks) {
      chunks.push(tasks.slice(i, i + this.maxConcurrentTasks));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(task => this.routeTask(task))
      );
      results.push(...chunkResults.map(r => r.status === 'fulfilled' ? r.value : { status: 'failed', error: r.reason?.message }));
    }

    return results;
  }

  /**
   * Phi-weighted consensus: aggregate results from multiple agents working on the same task.
   * Uses PSI weighting — best result gets ~61.8% weight, second gets ~38.2%.
   * @param {Array<Object>} results - Array of { score, data } objects
   * @returns {Object} Best result with consensus score
   */
  phiConsensus(results) {
    if (!results || results.length === 0) return null;
    if (results.length === 1) return { ...results[0], consensusScore: 1.0 };

    // Sort by score descending
    const sorted = [...results].sort((a, b) => (b.score || 0) - (a.score || 0));

    // Phi-weighted fusion
    const weights = sorted.map((_, i) => Math.pow(PSI, i));
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    const consensusScore = sorted.reduce((sum, r, i) => sum + (r.score || 0) * normalizedWeights[i], 0);

    return {
      ...sorted[0],
      consensusScore,
      participantCount: sorted.length,
      method: 'phi-weighted',
    };
  }

  /**
   * Find the best agent for a task using skill matching + load balancing.
   * @private
   */
  _findBestAgent(task) {
    const requiredSkills = task.requiredSkills || [task.type];
    let bestAgent = null;
    let bestScore = -Infinity;

    for (const [, entry] of this.agents) {
      if (entry.status === 'degraded') continue;

      const matchedSkills = requiredSkills.filter(s => entry.skills.includes(s));
      if (matchedSkills.length === 0) continue;

      const skillScore = matchedSkills.length / requiredSkills.length;
      const healthScore = entry.consecutiveFailures === 0 ? 1.0 : 1.0 / (1 + entry.consecutiveFailures);
      const combinedScore = (skillScore * PHI) + (healthScore * PSI);

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestAgent = entry;
      }
    }

    return bestAgent;
  }

  /**
   * Get supervisor status for health/monitoring endpoints.
   */
  getStatus() {
    const agents = Array.from(this.agents.values()).map(a => ({
      id: a.id,
      skills: a.skills,
      status: a.status,
      taskCount: a.taskCount,
      consecutiveFailures: a.consecutiveFailures,
      lastActivity: a.lastActivity ? new Date(a.lastActivity).toISOString() : null,
    }));

    return {
      type: 'HCSupervisor',
      version: '2.0.0',
      agentCount: this.agents.size,
      agents,
      running: this.running,
      maxConcurrent: this.maxConcurrentTasks,
      totalTasksProcessed: this.taskHistory.length,
      successRate: this.taskHistory.length > 0
        ? this.taskHistory.filter(t => t.status === 'completed').length / this.taskHistory.length
        : 1.0,
      uptimeMs: Date.now() - this.startedAt,
      orchestratorActive: !!this.orchestrator,
    };
  }

  /**
   * Graceful shutdown — stop orchestrator and clear state.
   */
  async shutdown() {
    if (this.orchestrator) {
      this.orchestrator.shutdown();
    }
    this.emit('shutdown');
  }
}

// Legacy compatibility — keep the old API shape
const legacySupervisor = {
  supervise: () => { /* replaced by HCSupervisor */ },
  coordinate: () => { /* replaced by HCSupervisor */ },
};

module.exports = { HCSupervisor, ...legacySupervisor };
