/**
 * @heady/nats-consumers — Event-Driven Message Consumers
 * 
 * NATS JetStream consumers for all Heady event streams.
 * φ-scaled batch sizes, ack windows, and backpressure.
 * CSL-gated message routing based on semantic relevance.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { PHI, PSI, PSI2, FIB, phiThreshold, phiBackoff, cslGate } from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';

const logger = createLogger({ service: 'nats-consumers' });

/** φ-scaled configuration */
const CONFIG = Object.freeze({
  natsUrl: process.env.NATS_URL || 'nats://nats.heady-internal:4222',
  consumerBatchSize: FIB[6],              // 8
  maxInflight: FIB[7],                    // 13
  ackWaitMs: parseInt(process.env.ACK_WAIT_MS || '6854', 10), // phiBackoff(4)
  maxDeliver: FIB[5],                     // 5
  idleHeartbeatMs: FIB[9] * 1000,        // 34s
  maxWaitingPulls: FIB[6],               // 8
  filterSubjectPrefix: 'heady.',
  deadLetterStream: 'HEADY_DLQ',
  routingConfidenceThreshold: phiThreshold(1), // ≈0.691
});

/**
 * Heady stream definitions — one per domain
 */
const STREAMS = Object.freeze({
  VECTORS: {
    name: 'HEADY_VECTORS',
    subjects: ['heady.vectors.>'],
    retention: 'limits',
    maxMsgs: FIB[20],                    // 6765
    maxAge: FIB[11] * 86400e9,           // 89 days in nanoseconds
    storage: 'file',
    replicas: 3,
    duplicateWindow: FIB[10] * 1e9,      // 55s dedup window
  },
  SWARM: {
    name: 'HEADY_SWARM',
    subjects: ['heady.swarm.>'],
    retention: 'limits',
    maxMsgs: FIB[17],                    // 1597
    maxAge: FIB[9] * 86400e9,            // 34 days
    storage: 'file',
    replicas: 3,
    duplicateWindow: FIB[9] * 1e9,       // 34s
  },
  SAGAS: {
    name: 'HEADY_SAGAS',
    subjects: ['heady.saga.>'],
    retention: 'limits',
    maxMsgs: FIB[14],                    // 377
    maxAge: FIB[8] * 86400e9,            // 21 days
    storage: 'file',
    replicas: 3,
    duplicateWindow: FIB[8] * 1e9,       // 21s
  },
  TELEMETRY: {
    name: 'HEADY_TELEMETRY',
    subjects: ['heady.telemetry.>'],
    retention: 'limits',
    maxMsgs: FIB[20],                    // 6765
    maxAge: FIB[7] * 86400e9,            // 13 days
    storage: 'file',
    replicas: 1,
    duplicateWindow: FIB[7] * 1e9,       // 13s
  },
  NOTIFICATIONS: {
    name: 'HEADY_NOTIFICATIONS',
    subjects: ['heady.notify.>'],
    retention: 'interest',
    maxMsgs: FIB[13],                    // 233
    maxAge: FIB[6] * 86400e9,            // 8 days
    storage: 'memory',
    replicas: 1,
    duplicateWindow: FIB[6] * 1e9,       // 8s
  },
});

/**
 * Consumer definitions — one per processing domain
 */
const CONSUMERS = Object.freeze({
  VECTOR_INGEST: {
    stream: 'HEADY_VECTORS',
    name: 'vector-ingest-worker',
    filterSubject: 'heady.vectors.ingest',
    durableName: 'vector-ingest-durable',
    ackPolicy: 'explicit',
    deliverPolicy: 'all',
    maxDeliver: CONFIG.maxDeliver,
    ackWait: CONFIG.ackWaitMs * 1e6, // Convert to nanoseconds
    maxAckPending: CONFIG.maxInflight,
  },
  VECTOR_INDEX: {
    stream: 'HEADY_VECTORS',
    name: 'vector-index-worker',
    filterSubject: 'heady.vectors.index',
    durableName: 'vector-index-durable',
    ackPolicy: 'explicit',
    deliverPolicy: 'all',
    maxDeliver: CONFIG.maxDeliver,
    ackWait: CONFIG.ackWaitMs * 1e6,
    maxAckPending: CONFIG.maxInflight,
  },
  SWARM_TASK: {
    stream: 'HEADY_SWARM',
    name: 'swarm-task-worker',
    filterSubject: 'heady.swarm.task.>',
    durableName: 'swarm-task-durable',
    ackPolicy: 'explicit',
    deliverPolicy: 'new',
    maxDeliver: CONFIG.maxDeliver,
    ackWait: CONFIG.ackWaitMs * 1e6,
    maxAckPending: FIB[8], // 21 — higher for swarm tasks
  },
  SAGA_EVENT: {
    stream: 'HEADY_SAGAS',
    name: 'saga-event-worker',
    filterSubject: 'heady.saga.event.>',
    durableName: 'saga-event-durable',
    ackPolicy: 'explicit',
    deliverPolicy: 'all',
    maxDeliver: FIB[6], // 8 — sagas need more retries
    ackWait: CONFIG.ackWaitMs * PHI * 1e6, // Longer ack for saga steps
    maxAckPending: CONFIG.maxInflight,
  },
  TELEMETRY_COLLECTOR: {
    stream: 'HEADY_TELEMETRY',
    name: 'telemetry-collector',
    filterSubject: 'heady.telemetry.>',
    durableName: 'telemetry-collector-durable',
    ackPolicy: 'explicit',
    deliverPolicy: 'new',
    maxDeliver: 3,
    ackWait: CONFIG.ackWaitMs * 1e6,
    maxAckPending: FIB[9], // 34 — high throughput
  },
});

/**
 * MessageHandler — wraps a NATS message with Heady semantics
 */
class HeadyMessage {
  constructor(subject, data, headers = {}) {
    this.id = randomUUID();
    this.subject = subject;
    this.data = data;
    this.headers = headers;
    this.receivedAt = Date.now();
    this.processedAt = null;
    this.attempts = 0;
  }

  get age() {
    return Date.now() - this.receivedAt;
  }

  toJSON() {
    return {
      id: this.id,
      subject: this.subject,
      data: this.data,
      receivedAt: this.receivedAt,
      processedAt: this.processedAt,
      attempts: this.attempts,
    };
  }
}

/**
 * ConsumerGroup — manages a set of consumers for a domain
 */
class ConsumerGroup extends EventEmitter {
  #handlers = new Map();
  #inflight = 0;
  #processed = 0;
  #failed = 0;
  #deadLettered = 0;

  constructor(name) {
    super();
    this.name = name;
  }

  /**
   * Register a handler for a subject pattern
   */
  on(subject, handler) {
    if (typeof handler === 'function') {
      this.#handlers.set(subject, handler);
      logger.info('Handler registered', { group: this.name, subject });
    }
    return this;
  }

  /**
   * Process a message through the appropriate handler
   */
  async processMessage(msg) {
    if (this.#inflight >= CONFIG.maxInflight) {
      this.emit('backpressure', { inflight: this.#inflight });
      const delay = phiBackoff(0, CONFIG.ackWaitMs / FIB[5]);
      await new Promise(r => setTimeout(r, delay));
    }

    this.#inflight++;
    msg.attempts++;

    try {
      // Find matching handler
      let handler = this.#handlers.get(msg.subject);
      if (!handler) {
        // Try wildcard match
        for (const [pattern, h] of this.#handlers) {
          if (this.#matchSubject(pattern, msg.subject)) {
            handler = h;
            break;
          }
        }
      }

      if (!handler) {
        logger.warn('No handler for subject', {
          group: this.name,
          subject: msg.subject,
        });
        return;
      }

      await handler(msg);
      msg.processedAt = Date.now();
      this.#processed++;

      this.emit('processed', {
        group: this.name,
        subject: msg.subject,
        durationMs: msg.processedAt - msg.receivedAt,
      });
    } catch (err) {
      this.#failed++;

      if (msg.attempts >= CONFIG.maxDeliver) {
        this.#deadLettered++;
        this.emit('dead-letter', {
          group: this.name,
          message: msg,
          error: err.message,
        });
        logger.error('Message moved to dead letter', {
          group: this.name,
          subject: msg.subject,
          attempts: msg.attempts,
          error: err.message,
        });
      } else {
        // Redeliver with φ-backoff
        const delay = phiBackoff(msg.attempts, CONFIG.ackWaitMs / FIB[5]);
        this.emit('retry', {
          group: this.name,
          message: msg,
          delayMs: delay,
          attempt: msg.attempts,
        });
      }
    } finally {
      this.#inflight--;
    }
  }

  /**
   * NATS-style subject pattern matching (supports * and >)
   */
  #matchSubject(pattern, subject) {
    const patternParts = pattern.split('.');
    const subjectParts = subject.split('.');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '>') return true; // Match rest
      if (patternParts[i] === '*') continue; // Match one
      if (i >= subjectParts.length) return false;
      if (patternParts[i] !== subjectParts[i]) return false;
    }

    return patternParts.length === subjectParts.length;
  }

  get stats() {
    return {
      name: this.name,
      inflight: this.#inflight,
      processed: this.#processed,
      failed: this.#failed,
      deadLettered: this.#deadLettered,
      handlers: Array.from(this.#handlers.keys()),
    };
  }
}

/**
 * NATSConsumerManager — lifecycle management for all consumers
 */
class NATSConsumerManager extends EventEmitter {
  #groups = new Map();
  #running = false;

  constructor() {
    super();
  }

  /**
   * Create a consumer group
   */
  createGroup(name) {
    const group = new ConsumerGroup(name);
    this.#groups.set(name, group);

    // Forward events
    group.on('processed', (data) => this.emit('message-processed', data));
    group.on('dead-letter', (data) => this.emit('dead-letter', data));
    group.on('backpressure', (data) => this.emit('backpressure', data));

    return group;
  }

  /**
   * Get or create a consumer group
   */
  getGroup(name) {
    return this.#groups.get(name) || this.createGroup(name);
  }

  /**
   * Start all consumer groups
   */
  async start() {
    this.#running = true;
    logger.info('NATS consumer manager started', {
      groups: Array.from(this.#groups.keys()),
      streamCount: Object.keys(STREAMS).length,
      consumerCount: Object.keys(CONSUMERS).length,
    });
    this.emit('started');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.#running = false;
    // Wait for inflight to drain
    const maxWait = CONFIG.ackWaitMs;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const totalInflight = Array.from(this.#groups.values())
        .reduce((sum, g) => sum + g.stats.inflight, 0);
      if (totalInflight === 0) break;
      await new Promise(r => setTimeout(r, 100));
    }
    logger.info('NATS consumer manager shut down');
    this.emit('stopped');
  }

  get stats() {
    const groupStats = {};
    for (const [name, group] of this.#groups) {
      groupStats[name] = group.stats;
    }
    return {
      running: this.#running,
      groups: groupStats,
    };
  }
}

export {
  NATSConsumerManager,
  ConsumerGroup,
  HeadyMessage,
  STREAMS,
  CONSUMERS,
  CONFIG as NATS_CONFIG,
};
