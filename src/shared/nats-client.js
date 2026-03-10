/**
 * Heady™ NATS JetStream Client v6.0
 * Inter-service async messaging with phi-backoff reconnection
 * Subjects follow heady.<domain>.<action> convention
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const { createLogger } = require('./logger');
const {
  PHI, PSI, fib, phiBackoffWithJitter,
  CSL_THRESHOLDS, TIMING,
} = require('./phi-math');

const logger = createLogger('nats-client');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION — Phi-Scaled
// ═══════════════════════════════════════════════════════════

const NATS_CONFIG = {
  servers: (process.env.NATS_SERVERS || 'nats://heady-nats:4222').split(','),
  maxReconnectAttempts: fib(7),       // 13 attempts
  reconnectTimeWait: fib(7) * 1000,   // 13s base
  pingInterval: fib(8) * 1000,        // 21s ping
  maxPingOut: fib(5),                  // 5 missed pings before disconnect
  name: process.env.SERVICE_NAME || 'heady-service',
};

const JETSTREAM_CONFIG = {
  maxAckPending: fib(12),             // 144 pending acks
  ackWaitMs: fib(9) * 1000,           // 34s ack wait
  maxDeliverMs: fib(5),               // 5 delivery attempts
  maxMsgSize: fib(20),                // 6765 bytes max message
};

// ═══════════════════════════════════════════════════════════
// STREAM DEFINITIONS — One per domain
// ═══════════════════════════════════════════════════════════

const STREAMS = Object.freeze({
  INFERENCE:     { name: 'HEADY_INFERENCE',     subjects: ['heady.inference.>'],     maxMsgs: fib(17), maxAgeNs: fib(11) * 3600e9 },  // 89 hours
  MEMORY:        { name: 'HEADY_MEMORY',        subjects: ['heady.memory.>'],        maxMsgs: fib(17), maxAgeNs: fib(12) * 3600e9 },  // 144 hours
  AGENT:         { name: 'HEADY_AGENT',         subjects: ['heady.agent.>'],         maxMsgs: fib(16), maxAgeNs: fib(11) * 3600e9 },
  ORCHESTRATION: { name: 'HEADY_ORCHESTRATION', subjects: ['heady.orchestration.>'], maxMsgs: fib(16), maxAgeNs: fib(10) * 3600e9 },
  SECURITY:      { name: 'HEADY_SECURITY',      subjects: ['heady.security.>'],      maxMsgs: fib(17), maxAgeNs: fib(13) * 3600e9 },  // 233 hours
  MONITORING:    { name: 'HEADY_MONITORING',     subjects: ['heady.monitoring.>'],    maxMsgs: fib(16), maxAgeNs: fib(10) * 3600e9 },
  WEB:           { name: 'HEADY_WEB',           subjects: ['heady.web.>'],           maxMsgs: fib(15), maxAgeNs: fib(9) * 3600e9 },
  DATA:          { name: 'HEADY_DATA',          subjects: ['heady.data.>'],          maxMsgs: fib(17), maxAgeNs: fib(12) * 3600e9 },
  INTEGRATION:   { name: 'HEADY_INTEGRATION',   subjects: ['heady.integration.>'],   maxMsgs: fib(15), maxAgeNs: fib(10) * 3600e9 },
  LIFECYCLE:     { name: 'HEADY_LIFECYCLE',      subjects: ['heady.lifecycle.>'],     maxMsgs: fib(16), maxAgeNs: fib(11) * 3600e9 },
});

// ═══════════════════════════════════════════════════════════
// HEADY NATS CLIENT
// ═══════════════════════════════════════════════════════════

class HeadyNatsClient {
  constructor(config = {}) {
    this.config = { ...NATS_CONFIG, ...config };
    this.nc = null;
    this.js = null;
    this.jsm = null;
    this.subscriptions = new Map();
    this.publishCount = 0;
    this.errorCount = 0;
    this.reconnectCount = 0;
    this.connected = false;
  }

  async connect(authToken) {
    try {
      const { connect, StringCodec, JSONCodec } = require('nats');
      
      this.sc = StringCodec();
      this.jc = JSONCodec();

      const connectOpts = {
        servers: this.config.servers,
        maxReconnectAttempts: this.config.maxReconnectAttempts,
        reconnectTimeWait: this.config.reconnectTimeWait,
        pingInterval: this.config.pingInterval,
        maxPingOut: this.config.maxPingOut,
        name: this.config.name,
      };

      if (authToken) {
        connectOpts.token = authToken;
      }

      this.nc = await connect(connectOpts);

      // Event handlers
      (async () => {
        for await (const s of this.nc.status()) {
          switch (s.type) {
            case 'reconnecting':
              logger.warn({ message: 'NATS reconnecting', data: s.data });
              break;
            case 'reconnect':
              this.reconnectCount++;
              logger.info({ message: 'NATS reconnected', count: this.reconnectCount });
              break;
            case 'disconnect':
              this.connected = false;
              logger.warn({ message: 'NATS disconnected' });
              break;
            case 'error':
              this.errorCount++;
              logger.error({ message: 'NATS error', error: String(s.data) });
              break;
          }
        }
      })().catch(() => {});

      // Get JetStream contexts
      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();

      this.connected = true;

      logger.info({
        message: 'NATS client connected',
        servers: this.config.servers,
        name: this.config.name,
      });

      // Ensure all streams exist
      await this._ensureStreams();

    } catch (error) {
      logger.error({ message: 'NATS connection failed', error: error.message });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STREAM MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  async _ensureStreams() {
    for (const [key, streamDef] of Object.entries(STREAMS)) {
      try {
        await this.jsm.streams.info(streamDef.name);
        logger.debug({ message: 'Stream exists', stream: streamDef.name });
      } catch (error) {
        if (error.code === '404' || error.message?.includes('not found')) {
          await this.jsm.streams.add({
            name: streamDef.name,
            subjects: streamDef.subjects,
            max_msgs: streamDef.maxMsgs,
            max_age: streamDef.maxAgeNs,
            storage: 'file',
            retention: 'limits',
            num_replicas: 1,
            discard: 'old',
          });
          logger.info({ message: 'Stream created', stream: streamDef.name, subjects: streamDef.subjects });
        } else {
          logger.error({ message: 'Stream check failed', stream: streamDef.name, error: error.message });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLISH — Fire-and-forget or JetStream-acked
  // ═══════════════════════════════════════════════════════════

  async publish(subject, data, options = {}) {
    if (!this.connected) {
      throw new NatsError('Not connected to NATS', 'NOT_CONNECTED');
    }

    const payload = this.jc.encode(this._wrapMessage(subject, data));
    
    if (options.jetstream !== false) {
      // JetStream publish with ack
      let lastError = null;
      for (let attempt = 0; attempt < fib(5); attempt++) {
        try {
          const ack = await this.js.publish(subject, payload, {
            msgID: options.msgId || _generateMsgId(),
            expect: options.expect,
          });
          this.publishCount++;
          logger.debug({
            message: 'JetStream publish',
            subject,
            stream: ack.stream,
            seq: ack.seq,
          });
          return ack;
        } catch (error) {
          lastError = error;
          if (attempt < fib(5) - 1) {
            await new Promise(r => setTimeout(r, phiBackoffWithJitter(attempt)));
          }
        }
      }
      throw new NatsError(`JetStream publish failed: ${lastError?.message}`, 'PUBLISH_FAILED');
    } else {
      // Core NATS publish (no ack)
      this.nc.publish(subject, payload);
      this.publishCount++;
    }
  }

  _wrapMessage(subject, data) {
    return {
      subject,
      data,
      timestamp: Date.now(),
      source: this.config.name,
      correlationId: _generateMsgId(),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SUBSCRIBE — Durable JetStream consumers
  // ═══════════════════════════════════════════════════════════

  async subscribe(subject, handler, options = {}) {
    const consumerName = options.consumer || `${this.config.name}-${subject.replace(/[.>*]/g, '-')}`;
    const durable = options.durable !== false;

    try {
      const consumerOpts = {
        durable_name: durable ? consumerName : undefined,
        filter_subject: subject,
        ack_policy: 'explicit',
        max_ack_pending: JETSTREAM_CONFIG.maxAckPending,
        ack_wait: JETSTREAM_CONFIG.ackWaitMs * 1e6,  // nanoseconds
        max_deliver: JETSTREAM_CONFIG.maxDeliverMs,
        deliver_policy: options.deliverPolicy || 'new',
      };

      // Find the correct stream for this subject
      const streamName = this._findStreamForSubject(subject);
      if (!streamName) {
        throw new NatsError(`No stream found for subject: ${subject}`, 'NO_STREAM');
      }

      // Ensure consumer exists
      try {
        await this.jsm.consumers.info(streamName, consumerName);
      } catch {
        await this.jsm.consumers.add(streamName, consumerOpts);
      }

      const sub = await this.js.pullSubscribe(subject, {
        stream: streamName,
        config: consumerOpts,
      });

      // Pull loop
      const pullLoop = async () => {
        while (this.connected) {
          try {
            const msgs = await sub.fetch({ batch: fib(6), expires: fib(7) * 1000 }); // batch 8, 13s timeout
            for await (const msg of msgs) {
              try {
                const decoded = this.jc.decode(msg.data);
                await handler(decoded, {
                  subject: msg.subject,
                  seq: msg.seq,
                  ack: () => msg.ack(),
                  nak: (delay) => msg.nak(delay),
                  working: () => msg.working(),
                });
                msg.ack();
              } catch (handlerError) {
                logger.error({
                  message: 'Handler error',
                  subject,
                  error: handlerError.message,
                });
                msg.nak(phiBackoffWithJitter(0));
              }
            }
          } catch (error) {
            if (this.connected) {
              logger.warn({ message: 'Pull error, retrying', subject, error: error.message });
              await new Promise(r => setTimeout(r, phiBackoffWithJitter(0)));
            }
          }
        }
      };

      pullLoop().catch(err => {
        logger.error({ message: 'Pull loop terminated', subject, error: err.message });
      });

      this.subscriptions.set(consumerName, { sub, subject, handler });

      logger.info({
        message: 'JetStream subscription active',
        subject,
        consumer: consumerName,
        stream: streamName,
      });

      return consumerName;
    } catch (error) {
      logger.error({ message: 'Subscribe failed', subject, error: error.message });
      throw error;
    }
  }

  _findStreamForSubject(subject) {
    for (const [, streamDef] of Object.entries(STREAMS)) {
      for (const pattern of streamDef.subjects) {
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/>/g, '.*') + '$');
        if (regex.test(subject)) {
          return streamDef.name;
        }
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // REQUEST-REPLY PATTERN
  // ═══════════════════════════════════════════════════════════

  async request(subject, data, timeoutMs = fib(9) * 1000) {  // 34s timeout
    if (!this.connected) {
      throw new NatsError('Not connected', 'NOT_CONNECTED');
    }

    const payload = this.jc.encode(this._wrapMessage(subject, data));
    const response = await this.nc.request(subject, payload, { timeout: timeoutMs });
    return this.jc.decode(response.data);
  }

  // ═══════════════════════════════════════════════════════════
  // HEALTH & METRICS
  // ═══════════════════════════════════════════════════════════

  async getHealth() {
    if (!this.connected || !this.nc) {
      return { status: 'disconnected' };
    }

    const streamInfos = {};
    for (const [key, streamDef] of Object.entries(STREAMS)) {
      try {
        const info = await this.jsm.streams.info(streamDef.name);
        streamInfos[key] = {
          messages: info.state.messages,
          bytes: info.state.bytes,
          consumers: info.state.consumer_count,
        };
      } catch {
        streamInfos[key] = { status: 'unavailable' };
      }
    }

    return {
      status: 'connected',
      servers: this.config.servers,
      name: this.config.name,
      published: this.publishCount,
      errors: this.errorCount,
      reconnects: this.reconnectCount,
      subscriptions: this.subscriptions.size,
      streams: streamInfos,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SHUTDOWN
  // ═══════════════════════════════════════════════════════════

  async shutdown() {
    logger.info({ message: 'NATS client shutting down' });
    this.connected = false;

    for (const [name, { sub }] of this.subscriptions) {
      try {
        sub.unsubscribe();
      } catch {
        // ignore
      }
    }
    this.subscriptions.clear();

    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
      this.nc = null;
    }

    logger.info({ message: 'NATS client shut down cleanly' });
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const crypto = require('crypto');

function _generateMsgId() {
  return crypto.randomBytes(fib(7)).toString('hex');  // 13 bytes
}

class NatsError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'NatsError';
    this.code = code;
  }
}

// ═══════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════

let _instance = null;

function getClient(config) {
  if (!_instance) {
    _instance = new HeadyNatsClient(config);
  }
  return _instance;
}

module.exports = {
  HeadyNatsClient,
  getClient,
  STREAMS,
  NATS_CONFIG,
  JETSTREAM_CONFIG,
  NatsError,
};
