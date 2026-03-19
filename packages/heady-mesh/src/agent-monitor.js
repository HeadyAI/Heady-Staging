/**
 * HEADY_BRAND:BEGIN
 * HeadyMesh AgentMonitor — Real-time agent health monitoring + auto-healing
 * Layer 5 PRODUCT — observability for multi-agent deployments
 * (c) 2024-2026 HeadySystems Inc. All Rights Reserved.
 * HEADY_BRAND:END
 */
'use strict';

const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════════════════════
// PHI-MATH CONSTANTS (from shared/phi-math.js)
// ═══════════════════════════════════════════════════════════════════════════════

const PHI       = 1.6180339887498948;
const PSI       = 0.6180339887498949;
const PHI_SQ    = 2.618033988749895;
const FIB       = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

// Timing constants (phi-scaled milliseconds)
const HEALTH_POLL_MS     = Math.round(PHI * PHI * PHI * 1000);  // ~4236ms (phi^3)
const HEAL_TIMEOUT_MS    = Math.round(Math.pow(PHI, 5) * 1000); // ~11090ms (phi^5)
const ESCALATION_WAIT_MS = Math.round(Math.pow(PHI, 7) * 1000); // ~29034ms (phi^7)
const MAX_HEAL_ATTEMPTS  = FIB[4];                                // 3
const STALE_THRESHOLD_MS = Math.round(Math.pow(PHI, 8) * 1000);  // ~46979ms

// Health score thresholds (phi-geometric)
const HEALTH_THRESHOLDS = Object.freeze({
  HEALTHY:   1 - Math.pow(PSI, 4),  // ~0.854 — agent fully operational
  DEGRADED:  PSI,                    // ~0.618 — performance issues
  UNHEALTHY: PSI * PSI,             // ~0.382 — needs intervention
  DEAD:      Math.pow(PSI, 3),      // ~0.236 — no response
});

// Agent lifecycle states
const AGENT_STATE = Object.freeze({
  UNKNOWN:    'UNKNOWN',
  STARTING:   'STARTING',
  HEALTHY:    'HEALTHY',
  DEGRADED:   'DEGRADED',
  UNHEALTHY:  'UNHEALTHY',
  HEALING:    'HEALING',
  DEAD:       'DEAD',
  ESCALATED:  'ESCALATED',
});

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCULAR BUFFER — fixed-size metrics window
// ═══════════════════════════════════════════════════════════════════════════════

class CircularBuffer {
  constructor(capacity = FIB[8]) { // 21 entries default
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.size = 0;
  }

  push(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }

  toArray() {
    if (this.size === 0) return [];
    if (this.size < this.capacity) {
      return this.buffer.slice(0, this.size);
    }
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ];
  }

  latest(n = 1) {
    const arr = this.toArray();
    return arr.slice(-n);
  }

  average(accessor = v => v) {
    const arr = this.toArray();
    if (arr.length === 0) return 0;
    return arr.reduce((sum, item) => sum + accessor(item), 0) / arr.length;
  }

  clear() {
    this.head = 0;
    this.size = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT MONITOR
// ═══════════════════════════════════════════════════════════════════════════════

class AgentMonitor extends EventEmitter {
  /**
   * @param {Object} options
   * @param {EventEmitter} options.eventBus  — shared event bus for cross-system events
   * @param {number} [options.pollIntervalMs] — health poll interval (default phi^3 * 1000)
   * @param {number} [options.metricsWindowSize] — circular buffer capacity
   * @param {number} [options.maxHealAttempts] — max auto-heal retries before escalation
   */
  constructor(options = {}) {
    super();
    this.eventBus = options.eventBus || new EventEmitter();
    this.pollIntervalMs = options.pollIntervalMs || HEALTH_POLL_MS;
    this.metricsWindowSize = options.metricsWindowSize || FIB[8]; // 21
    this.maxHealAttempts = options.maxHealAttempts || MAX_HEAL_ATTEMPTS;

    // Agent registry: agentId -> { config, state, metrics, healAttempts, lastSeen, timer }
    this._agents = new Map();
    this._healHistory = new CircularBuffer(FIB[9]); // 34 entries
    this._running = false;

    // Wire up event bus listeners
    this.eventBus.on('agent:heartbeat', (data) => this._onHeartbeat(data));
    this.eventBus.on('agent:error', (data) => this._onAgentError(data));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Register an agent for monitoring.
   * @param {string} agentId  — unique agent identifier
   * @param {Object} config   — agent configuration
   * @param {string} config.type — agent type (e.g., 'builder', 'researcher')
   * @param {string} [config.healthEndpoint] — URL or callback for health check
   * @param {Function} [config.healthCheck] — custom health check function returning 0-1
   * @param {Function} [config.healFn] — custom healing function
   * @param {Object} [config.metadata] — arbitrary metadata
   */
  registerAgent(agentId, config = {}) {
    if (this._agents.has(agentId)) {
      this.emit('warn', { agentId, message: 'Agent already registered, updating config' });
    }

    const agent = {
      id: agentId,
      config: {
        type: config.type || 'generic',
        healthEndpoint: config.healthEndpoint || null,
        healthCheck: config.healthCheck || null,
        healFn: config.healFn || null,
        metadata: config.metadata || {},
      },
      state: AGENT_STATE.STARTING,
      healthScore: 1.0,
      metrics: new CircularBuffer(this.metricsWindowSize),
      healAttempts: 0,
      lastSeen: Date.now(),
      lastHealthCheck: null,
      registeredAt: Date.now(),
      timer: null,
    };

    this._agents.set(agentId, agent);

    // Start polling if monitor is running
    if (this._running) {
      this._startPolling(agentId);
    }

    this.emit('agent:registered', { agentId, config: agent.config });
    this.eventBus.emit('mesh:agent:registered', { agentId, type: agent.config.type });

    return agent;
  }

  /**
   * Unregister an agent and stop monitoring.
   * @param {string} agentId
   */
  unregisterAgent(agentId) {
    const agent = this._agents.get(agentId);
    if (!agent) return false;

    if (agent.timer) clearInterval(agent.timer);
    this._agents.delete(agentId);
    this.emit('agent:unregistered', { agentId });
    return true;
  }

  /**
   * Check health of a specific agent. Returns health score 0.0 - 1.0.
   * @param {string} agentId
   * @returns {Promise<Object>} health result { score, state, latencyMs }
   */
  async checkHealth(agentId) {
    const agent = this._agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not registered: ${agentId}`);
    }

    const start = Date.now();
    let score = 0;

    try {
      if (typeof agent.config.healthCheck === 'function') {
        // Custom health check function
        score = await agent.config.healthCheck(agentId);
        score = Math.max(0, Math.min(1, score)); // clamp 0-1
      } else {
        // Default: check heartbeat freshness
        const elapsed = Date.now() - agent.lastSeen;
        if (elapsed < HEALTH_POLL_MS) {
          score = 1.0;
        } else if (elapsed < STALE_THRESHOLD_MS) {
          // Phi-decay: score decreases as time increases
          score = Math.pow(PSI, elapsed / HEALTH_POLL_MS);
        } else {
          score = 0;
        }
      }
    } catch (err) {
      score = 0;
      this.emit('agent:healthCheckError', { agentId, error: err.message });
    }

    const latencyMs = Date.now() - start;
    const previousState = agent.state;

    // Update agent state
    agent.healthScore = score;
    agent.lastHealthCheck = Date.now();

    // Record metric in circular buffer
    agent.metrics.push({
      timestamp: Date.now(),
      score,
      latencyMs,
      state: agent.state,
    });

    // Determine new state based on health score
    const newState = this._scoreToState(score);
    agent.state = newState;

    const result = {
      agentId,
      score,
      state: newState,
      latencyMs,
      avgScore: agent.metrics.average(m => m.score),
    };

    // Emit state change if needed
    if (previousState !== newState) {
      this.emit('agent:stateChange', {
        agentId,
        from: previousState,
        to: newState,
        score,
      });
      this.eventBus.emit('mesh:agent:stateChange', {
        agentId,
        from: previousState,
        to: newState,
        score,
      });
    }

    // Trigger auto-healing if degraded
    if (score < HEALTH_THRESHOLDS.HEALTHY && newState !== AGENT_STATE.HEALING) {
      this._onHealthDegraded(agentId, result);
    }

    return result;
  }

  /**
   * Get current status of a specific agent.
   * @param {string} agentId
   * @returns {Object|null}
   */
  getAgentStatus(agentId) {
    const agent = this._agents.get(agentId);
    if (!agent) return null;

    const recentMetrics = agent.metrics.latest(FIB[5]); // last 5

    return {
      id: agent.id,
      type: agent.config.type,
      state: agent.state,
      healthScore: agent.healthScore,
      avgScore: agent.metrics.average(m => m.score),
      healAttempts: agent.healAttempts,
      lastSeen: agent.lastSeen,
      lastHealthCheck: agent.lastHealthCheck,
      registeredAt: agent.registeredAt,
      uptime: Date.now() - agent.registeredAt,
      recentMetrics,
      metadata: agent.config.metadata,
    };
  }

  /**
   * Get status of all monitored agents.
   * @returns {Object} { agents: [...], summary: { total, healthy, degraded, unhealthy, dead } }
   */
  getAllAgents() {
    const agents = [];
    const summary = { total: 0, healthy: 0, degraded: 0, unhealthy: 0, dead: 0, healing: 0 };

    for (const [agentId] of this._agents) {
      const status = this.getAgentStatus(agentId);
      agents.push(status);
      summary.total++;

      switch (status.state) {
        case AGENT_STATE.HEALTHY:
        case AGENT_STATE.STARTING:
          summary.healthy++;
          break;
        case AGENT_STATE.DEGRADED:
          summary.degraded++;
          break;
        case AGENT_STATE.UNHEALTHY:
        case AGENT_STATE.ESCALATED:
          summary.unhealthy++;
          break;
        case AGENT_STATE.DEAD:
          summary.dead++;
          break;
        case AGENT_STATE.HEALING:
          summary.healing++;
          break;
      }
    }

    // Compute mesh health: phi-weighted average of all agent scores
    const meshHealth = agents.length > 0
      ? agents.reduce((sum, a) => sum + a.healthScore, 0) / agents.length
      : 1.0;

    return {
      agents,
      summary,
      meshHealth,
      healHistory: this._healHistory.toArray(),
      timestamp: Date.now(),
    };
  }

  /**
   * Start monitoring all registered agents.
   */
  start() {
    if (this._running) return;
    this._running = true;

    for (const [agentId] of this._agents) {
      this._startPolling(agentId);
    }

    this.emit('monitor:started', { agentCount: this._agents.size });
  }

  /**
   * Stop monitoring all agents.
   */
  stop() {
    this._running = false;

    for (const [, agent] of this._agents) {
      if (agent.timer) {
        clearInterval(agent.timer);
        agent.timer = null;
      }
    }

    this.emit('monitor:stopped');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTO-HEALING (private)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Detect health degradation and initiate healing.
   * @private
   */
  _onHealthDegraded(agentId, health) {
    const agent = this._agents.get(agentId);
    if (!agent) return;

    const issue = {
      agentId,
      score: health.score,
      state: health.state,
      avgScore: health.avgScore,
      timestamp: Date.now(),
    };

    this.emit('agent:degraded', issue);

    // Determine severity
    if (health.score < HEALTH_THRESHOLDS.DEAD) {
      issue.severity = 'critical';
    } else if (health.score < HEALTH_THRESHOLDS.UNHEALTHY) {
      issue.severity = 'high';
    } else if (health.score < HEALTH_THRESHOLDS.DEGRADED) {
      issue.severity = 'medium';
    } else {
      issue.severity = 'low';
    }

    // Attempt auto-heal if within retry budget
    if (agent.healAttempts < this.maxHealAttempts) {
      this._attemptHeal(agentId, issue);
    } else {
      this._escalate(agentId, issue);
    }
  }

  /**
   * Try automated recovery for an agent.
   * Uses phi-backoff between attempts.
   * @private
   */
  async _attemptHeal(agentId, issue) {
    const agent = this._agents.get(agentId);
    if (!agent) return;

    agent.state = AGENT_STATE.HEALING;
    agent.healAttempts++;

    const healRecord = {
      agentId,
      attempt: agent.healAttempts,
      issue,
      startedAt: Date.now(),
      result: null,
    };

    this.emit('agent:healStart', {
      agentId,
      attempt: agent.healAttempts,
      maxAttempts: this.maxHealAttempts,
    });

    try {
      // Phi-backoff delay before heal attempt
      const backoffMs = Math.round(
        Math.pow(PHI, agent.healAttempts) * 1000
      );
      await this._delay(Math.min(backoffMs, HEAL_TIMEOUT_MS));

      let healed = false;

      if (typeof agent.config.healFn === 'function') {
        // Custom healing function
        healed = await Promise.race([
          agent.config.healFn(agentId, issue),
          this._delay(HEAL_TIMEOUT_MS).then(() => false),
        ]);
      } else {
        // Default healing: emit restart event, wait for heartbeat
        this.eventBus.emit('mesh:agent:restart', { agentId, issue });
        // Wait for heartbeat to confirm recovery
        healed = await this._waitForHeartbeat(agentId, HEAL_TIMEOUT_MS);
      }

      healRecord.result = healed ? 'success' : 'failed';
      healRecord.completedAt = Date.now();
      healRecord.durationMs = healRecord.completedAt - healRecord.startedAt;

      this._healHistory.push(healRecord);

      if (healed) {
        agent.state = AGENT_STATE.HEALTHY;
        agent.healAttempts = 0; // Reset on success
        this.emit('agent:healed', { agentId, attempt: healRecord.attempt });
        this.eventBus.emit('mesh:agent:healed', { agentId });
      } else {
        // Check if we should try again or escalate
        if (agent.healAttempts < this.maxHealAttempts) {
          this.emit('agent:healRetry', {
            agentId,
            attempt: agent.healAttempts,
            nextIn: Math.round(Math.pow(PHI, agent.healAttempts + 1) * 1000),
          });
        } else {
          this._escalate(agentId, issue);
        }
      }
    } catch (err) {
      healRecord.result = 'error';
      healRecord.error = err.message;
      healRecord.completedAt = Date.now();
      this._healHistory.push(healRecord);

      this.emit('agent:healError', { agentId, error: err.message });

      if (agent.healAttempts >= this.maxHealAttempts) {
        this._escalate(agentId, issue);
      }
    }
  }

  /**
   * Escalate to human when auto-heal exhausted.
   * @private
   */
  _escalate(agentId, issue) {
    const agent = this._agents.get(agentId);
    if (!agent) return;

    agent.state = AGENT_STATE.ESCALATED;

    const escalation = {
      agentId,
      issue,
      healAttempts: agent.healAttempts,
      maxAttempts: this.maxHealAttempts,
      agentType: agent.config.type,
      metrics: agent.metrics.toArray(),
      timestamp: Date.now(),
      message: `Agent ${agentId} (${agent.config.type}) failed ${agent.healAttempts} auto-heal attempts. Manual intervention required.`,
    };

    this.emit('agent:escalated', escalation);
    this.eventBus.emit('mesh:agent:escalated', escalation);

    // Stop polling this agent — it needs manual attention
    if (agent.timer) {
      clearInterval(agent.timer);
      agent.timer = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /** @private */
  _scoreToState(score) {
    if (score >= HEALTH_THRESHOLDS.HEALTHY) return AGENT_STATE.HEALTHY;
    if (score >= HEALTH_THRESHOLDS.DEGRADED) return AGENT_STATE.DEGRADED;
    if (score >= HEALTH_THRESHOLDS.DEAD) return AGENT_STATE.UNHEALTHY;
    return AGENT_STATE.DEAD;
  }

  /** @private */
  _startPolling(agentId) {
    const agent = this._agents.get(agentId);
    if (!agent || agent.timer) return;

    agent.timer = setInterval(async () => {
      try {
        await this.checkHealth(agentId);
      } catch (err) {
        this.emit('agent:pollError', { agentId, error: err.message });
      }
    }, this.pollIntervalMs);

    // Don't prevent process exit
    if (agent.timer.unref) agent.timer.unref();
  }

  /** @private */
  _onHeartbeat(data) {
    if (!data || !data.agentId) return;
    const agent = this._agents.get(data.agentId);
    if (!agent) return;

    agent.lastSeen = Date.now();

    // If agent was dead/escalated and sends heartbeat, consider it recovered
    if (agent.state === AGENT_STATE.DEAD || agent.state === AGENT_STATE.ESCALATED) {
      agent.state = AGENT_STATE.HEALTHY;
      agent.healAttempts = 0;
      this.emit('agent:recovered', { agentId: data.agentId });
    }
  }

  /** @private */
  _onAgentError(data) {
    if (!data || !data.agentId) return;
    const agent = this._agents.get(data.agentId);
    if (!agent) return;

    agent.metrics.push({
      timestamp: Date.now(),
      score: 0,
      error: data.error,
      state: AGENT_STATE.UNHEALTHY,
    });
  }

  /** @private */
  _waitForHeartbeat(agentId, timeoutMs) {
    return new Promise((resolve) => {
      const agent = this._agents.get(agentId);
      if (!agent) return resolve(false);

      const startLastSeen = agent.lastSeen;
      const checkInterval = Math.round(PHI * 1000); // check every ~1.618s
      let elapsed = 0;

      const checker = setInterval(() => {
        elapsed += checkInterval;
        const currentAgent = this._agents.get(agentId);

        if (!currentAgent) {
          clearInterval(checker);
          return resolve(false);
        }

        if (currentAgent.lastSeen > startLastSeen) {
          clearInterval(checker);
          return resolve(true);
        }

        if (elapsed >= timeoutMs) {
          clearInterval(checker);
          return resolve(false);
        }
      }, checkInterval);

      if (checker.unref) checker.unref();
    });
  }

  /** @private */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  AgentMonitor,
  CircularBuffer,
  AGENT_STATE,
  HEALTH_THRESHOLDS,
  HEALTH_POLL_MS,
  HEAL_TIMEOUT_MS,
  ESCALATION_WAIT_MS,
  MAX_HEAL_ATTEMPTS,
};
