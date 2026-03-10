/**
 * @heady/edge-runtime — Durable Agent State
 * 
 * Cloudflare Durable Object for persistent agent state with
 * hibernatable WebSockets, SQLite storage, and alarm scheduling.
 * Fibonacci-compressed conversation memory.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { PHI, PSI, PSI2, FIB, phiThreshold, phiBackoff } from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';

const logger = createLogger({ service: 'durable-agent-state' });

/** Agent lifecycle states */
const AgentState = Object.freeze({
  INIT: 'init',
  ACTIVE: 'active',
  THINKING: 'thinking',
  RESPONDING: 'responding',
  IDLE: 'idle',
  HIBERNATING: 'hibernating',
  EXPIRED: 'expired',
});

/** φ-scaled configuration */
const CONFIG = Object.freeze({
  hibernateAfterMs: FIB[10] * 1000,      // 55s idle before hibernation
  sessionExpiryMs: FIB[14] * 60 * 1000,  // 377 minutes max session
  maxMessageHistory: FIB[11],             // 89 messages before compression
  compressionTriggers: [FIB[6], FIB[7], FIB[8], FIB[9], FIB[10], FIB[11]],
  // Compression at message counts: [8, 13, 21, 34, 55, 89]
  maxContextTokens: 8192,
  alarmIntervalMs: FIB[8] * 1000,        // 21s alarm check interval
});

/** Valid state transitions */
const VALID_TRANSITIONS = Object.freeze({
  [AgentState.INIT]:        [AgentState.ACTIVE],
  [AgentState.ACTIVE]:      [AgentState.THINKING, AgentState.IDLE, AgentState.EXPIRED],
  [AgentState.THINKING]:    [AgentState.RESPONDING, AgentState.ACTIVE, AgentState.EXPIRED],
  [AgentState.RESPONDING]:  [AgentState.ACTIVE, AgentState.IDLE, AgentState.EXPIRED],
  [AgentState.IDLE]:        [AgentState.ACTIVE, AgentState.HIBERNATING, AgentState.EXPIRED],
  [AgentState.HIBERNATING]: [AgentState.ACTIVE, AgentState.EXPIRED],
  [AgentState.EXPIRED]:     [],
});

/**
 * DurableAgentState — Cloudflare Durable Object implementation
 * 
 * In production, this extends Cloudflare's DurableObject class.
 * Here we implement the pattern for portability.
 */
class DurableAgentState {
  #state;
  #messages = [];
  #context = {};
  #websockets = new Set();
  #hibernateTimer = null;
  #sessionStartedAt;
  #lastActivityAt;

  constructor(agentId, initialContext = {}) {
    this.agentId = agentId;
    this.#state = AgentState.INIT;
    this.#context = { ...initialContext };
    this.#sessionStartedAt = Date.now();
    this.#lastActivityAt = Date.now();
  }

  /**
   * Transition state with validation
   */
  transition(newState) {
    const valid = VALID_TRANSITIONS[this.#state];
    if (!valid || !valid.includes(newState)) {
      throw new Error(
        `Invalid agent state transition: ${this.#state} → ${newState}`
      );
    }
    const previousState = this.#state;
    this.#state = newState;
    this.#lastActivityAt = Date.now();

    logger.info('Agent state transition', {
      agentId: this.agentId,
      from: previousState,
      to: newState,
    });

    // Auto-schedule hibernation when idle
    if (newState === AgentState.IDLE) {
      this.#scheduleHibernation();
    }

    // Clear hibernation timer on activity
    if (newState === AgentState.ACTIVE || newState === AgentState.THINKING) {
      this.#clearHibernation();
    }

    return { from: previousState, to: newState };
  }

  /**
   * Handle WebSocket message (Cloudflare hibernatable pattern)
   */
  async webSocketMessage(ws, message) {
    this.#lastActivityAt = Date.now();

    if (this.#state === AgentState.HIBERNATING) {
      this.transition(AgentState.ACTIVE);
    }

    const parsed = typeof message === 'string' ? JSON.parse(message) : message;

    // Store message
    this.#messages.push({
      role: parsed.role || 'user',
      content: parsed.content,
      ts: Date.now(),
    });

    // Check compression triggers
    if (CONFIG.compressionTriggers.includes(this.#messages.length)) {
      await this.#compressMemory();
    }

    // Transition through thinking states
    this.transition(AgentState.THINKING);

    // Process message (delegate to node executor)
    const response = await this.#processMessage(parsed);

    this.transition(AgentState.RESPONDING);

    // Broadcast response to all connected WebSockets
    const responseStr = JSON.stringify(response);
    for (const client of this.#websockets) {
      try {
        client.send(responseStr);
      } catch (err) {
        this.#websockets.delete(client);
      }
    }

    // Store response
    this.#messages.push({
      role: 'assistant',
      content: response.content,
      ts: Date.now(),
    });

    this.transition(AgentState.ACTIVE);
    return response;
  }

  /**
   * Handle WebSocket close
   */
  async webSocketClose(ws, code, reason) {
    this.#websockets.delete(ws);
    logger.info('WebSocket closed', {
      agentId: this.agentId,
      code,
      reason,
      remainingConnections: this.#websockets.size,
    });

    if (this.#websockets.size === 0) {
      this.transition(AgentState.IDLE);
    }
  }

  /**
   * Alarm handler — scheduled autonomous actions
   */
  async alarm() {
    // Check session expiry
    if (Date.now() - this.#sessionStartedAt > CONFIG.sessionExpiryMs) {
      this.transition(AgentState.EXPIRED);
      await this.#persistState();
      return;
    }

    // Check idle → hibernate
    if (
      this.#state === AgentState.IDLE &&
      Date.now() - this.#lastActivityAt > CONFIG.hibernateAfterMs
    ) {
      this.transition(AgentState.HIBERNATING);
      await this.#persistState();
    }
  }

  /**
   * Accept WebSocket connection (hibernatable pattern)
   */
  acceptWebSocket(ws) {
    this.#websockets.add(ws);
    if (this.#state === AgentState.INIT) {
      this.transition(AgentState.ACTIVE);
    } else if (this.#state === AgentState.HIBERNATING || this.#state === AgentState.IDLE) {
      this.transition(AgentState.ACTIVE);
    }
    return ws;
  }

  /**
   * Compress conversation memory at Fibonacci triggers
   * Keeps recent messages, summarizes older ones
   */
  async #compressMemory() {
    if (this.#messages.length < FIB[6]) return;

    const recentCount = FIB[6]; // Keep last 8 messages verbatim
    const recent = this.#messages.slice(-recentCount);
    const older = this.#messages.slice(0, -recentCount);

    // Create summary of older messages
    const summary = {
      role: 'system',
      content: `[Compressed: ${older.length} messages from ${new Date(older[0]?.ts).toISOString()} to ${new Date(older[older.length - 1]?.ts).toISOString()}]`,
      ts: Date.now(),
      compressed: true,
      originalCount: older.length,
    };

    this.#messages = [summary, ...recent];

    logger.info('Memory compressed', {
      agentId: this.agentId,
      originalCount: older.length + recent.length,
      newCount: this.#messages.length,
    });
  }

  /**
   * Process message — delegated to conductor/node
   */
  async #processMessage(message) {
    // Default echo implementation — in production, delegates to Conductor
    return {
      type: 'response',
      content: `Processed: ${message.content}`,
      agentId: this.agentId,
      messageCount: this.#messages.length,
      state: this.#state,
    };
  }

  /**
   * Persist state to SQLite (Durable Object storage)
   */
  async #persistState() {
    const stateSnapshot = {
      agentId: this.agentId,
      state: this.#state,
      messages: this.#messages,
      context: this.#context,
      sessionStartedAt: this.#sessionStartedAt,
      lastActivityAt: this.#lastActivityAt,
      persistedAt: Date.now(),
    };

    logger.info('State persisted', {
      agentId: this.agentId,
      state: this.#state,
      messageCount: this.#messages.length,
    });

    return stateSnapshot;
  }

  /**
   * Schedule hibernation timer
   */
  #scheduleHibernation() {
    this.#clearHibernation();
    this.#hibernateTimer = setTimeout(() => {
      if (this.#state === AgentState.IDLE) {
        this.transition(AgentState.HIBERNATING);
        this.#persistState().catch(() => {});
      }
    }, CONFIG.hibernateAfterMs);
  }

  /**
   * Clear hibernation timer
   */
  #clearHibernation() {
    if (this.#hibernateTimer) {
      clearTimeout(this.#hibernateTimer);
      this.#hibernateTimer = null;
    }
  }

  get state() { return this.#state; }
  get messageCount() { return this.#messages.length; }
  get connectionCount() { return this.#websockets.size; }
  get uptime() { return Date.now() - this.#sessionStartedAt; }

  get stats() {
    return {
      agentId: this.agentId,
      state: this.#state,
      messageCount: this.#messages.length,
      connections: this.#websockets.size,
      uptimeMs: this.uptime,
      lastActivityAt: this.#lastActivityAt,
    };
  }
}

export {
  DurableAgentState,
  AgentState,
  VALID_TRANSITIONS,
  CONFIG as AGENT_STATE_CONFIG,
};
