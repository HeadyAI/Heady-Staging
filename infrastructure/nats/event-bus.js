/**
 * Heady™ NATS JetStream Event Bus Client
 * Central async message broker for service-to-service communication
 * Subjects per domain: heady.memory.*, heady.inference.*, heady.agents.*
 * © 2026 HeadySystems Inc.
 */

const { connect, StringCodec, AckPolicy, DeliverPolicy } = require('nats');

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const RECONNECT_DELAY_MS = Math.round(PHI * 1000); // ~1618ms
const MAX_RECONNECT_ATTEMPTS = 89; // Fibonacci

const sc = StringCodec();

class HeadyEventBus {
    constructor(options = {}) {
        this.nc = null;
        this.js = null;
        this.serviceName = options.serviceName || process.env.SERVICE_NAME || 'unknown';
        this.natsUrl = options.natsUrl || process.env.NATS_URL || 'nats://nats:4222';
        this.streams = new Map();
    }

    async connect() {
        this.nc = await connect({
            servers: this.natsUrl,
            name: this.serviceName,
            reconnect: true,
            maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectTimeWait: RECONNECT_DELAY_MS,
            pingInterval: 13 * 1000, // Fibonacci
            maxPingOut: 5, // Fibonacci
        });

        this.js = this.nc.jetstream();
        const jsm = await this.nc.jetstreamManager();

        // Ensure core streams exist
        const coreStreams = [
            { name: 'HEADY_MEMORY', subjects: ['heady.memory.>'] },
            { name: 'HEADY_INFERENCE', subjects: ['heady.inference.>'] },
            { name: 'HEADY_AGENTS', subjects: ['heady.agents.>'] },
            { name: 'HEADY_AUTH', subjects: ['heady.auth.>'] },
            { name: 'HEADY_CONTENT', subjects: ['heady.content.>'] },
            { name: 'HEADY_EVENTS', subjects: ['heady.events.>'] },
        ];

        for (const stream of coreStreams) {
            try {
                await jsm.streams.add({
                    name: stream.name,
                    subjects: stream.subjects,
                    retention: 'limits',
                    max_msgs: 987 * 1000, // Fibonacci × 1000
                    max_age: 89 * 24 * 60 * 60 * 1e9, // 89 days in nanoseconds (Fibonacci)
                    max_bytes: 1024 * 1024 * 1024, // 1GB
                    storage: 'file',
                    num_replicas: 1,
                    discard: 'old',
                });
            } catch (err) {
                if (!err.message?.includes('already in use')) {
                    console.error(`[NATS] Failed to create stream ${stream.name}:`, err.message);
                }
            }
        }

        console.log(`[NATS] Connected: ${this.serviceName} → ${this.natsUrl}`);
        return this;
    }

    /**
     * Publish event to JetStream
     */
    async publish(subject, data, headers = {}) {
        const payload = JSON.stringify({
            source: this.serviceName,
            timestamp: new Date().toISOString(),
            correlationId: `${this.serviceName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            data,
        });

        const ack = await this.js.publish(subject, sc.encode(payload));
        return { seq: ack.seq, stream: ack.stream };
    }

    /**
     * Subscribe to JetStream with durable consumer
     */
    async subscribe(subject, handler, options = {}) {
        const consumerName = options.consumerName || `${this.serviceName}-${subject.replace(/[.>*]/g, '-')}`;

        const sub = await this.js.subscribe(subject, {
            durable: consumerName,
            ack_policy: AckPolicy.Explicit,
            deliver_policy: DeliverPolicy.New,
            max_deliver: 5, // Fibonacci: max 5 retries before DLQ
            ack_wait: Math.round(PHI * PHI * PHI * 1e9), // φ³ ≈ 4.236 seconds in nanoseconds
        });

        (async () => {
            for await (const msg of sub) {
                try {
                    const parsed = JSON.parse(sc.decode(msg.data));
                    await handler(parsed, msg);
                    msg.ack();
                } catch (err) {
                    console.error(`[NATS] Handler error on ${subject}:`, err.message);
                    // After max_deliver, message goes to DLQ
                    if (msg.info.redeliveryCount >= 4) { // φ³ ≈ 4 rounded
                        await this.publish(`heady.dlq.${subject}`, {
                            originalSubject: subject,
                            error: err.message,
                            data: sc.decode(msg.data),
                            deliveryCount: msg.info.redeliveryCount,
                        });
                    }
                    msg.nak();
                }
            }
        })();

        return sub;
    }

    async disconnect() {
        if (this.nc) {
            await this.nc.drain();
            await this.nc.close();
        }
    }
}

module.exports = { HeadyEventBus };
