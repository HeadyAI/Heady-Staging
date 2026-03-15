// ═══════════════════════════════════════════════════════════════════════════════
// HeadyEventSpine — Instantaneous Push-Based Event Bus
// ═══════════════════════════════════════════════════════════════════════════════
// Redis Streams with BLOCK 0 — zero-CPU idle, instant wakeup on new events.
// No polling. No intervals. No setInterval. Ever.
//
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ═══════════════════════════════════════════════════════════════════════════════

const STREAM_KEY = 'heady:events';
const CONSUMER_GROUP = 'hcfp-consumers';

/**
 * HeadyEventSpine — Event bus using Redis Streams.
 *
 * emit() — O(1) XADD, instant write
 * subscribe() — BLOCK 0 XREAD, consumes zero CPU while idle,
 *               awakens INSTANTLY on new message arrival
 *
 * This is the correct model for latent-space instantaneous delivery.
 * NEVER use setInterval, setTimeout-based polling, or sleep loops.
 */
export class HeadyEventSpine {
  constructor(redisClient) {
    this.redis = redisClient;
    this.streamKey = STREAM_KEY;
    this.consumerGroup = CONSUMER_GROUP;
    this.handlers = new Map(); // eventType → handler[]
    this.running = false;
  }

  /**
   * Emit an event to the stream — O(1), instant delivery
   */
  async emit(eventType, payload) {
    if (!this.redis) {
      // Fallback: in-memory dispatch for environments without Redis
      return this._inMemoryEmit(eventType, payload);
    }

    await this.redis.xadd(
      this.streamKey, '*',
      'type', eventType,
      'payload', JSON.stringify(payload),
      'correlationId', payload.correlationId ?? crypto.randomUUID(),
      'timestamp', new Date().toISOString()
    );
  }

  /**
   * Subscribe to events — BLOCK 0 = waits indefinitely with zero CPU burn
   * until a new message arrives. This is instantaneous delivery.
   */
  async subscribe(handler) {
    if (!this.redis) {
      // Fallback: register in-memory handler
      this._defaultHandler = handler;
      return;
    }

    this.running = true;
    let lastId = '$'; // Start from newest messages only

    while (this.running) {
      try {
        const results = await this.redis.xread(
          'BLOCK', 0,           // Block indefinitely — awakens INSTANTLY on new message
          'COUNT', 100,         // Process up to 100 messages per wake
          'STREAMS', this.streamKey, lastId
        );

        if (!results) continue;

        for (const [, messages] of results) {
          await Promise.all(messages.map(async ([id, fields]) => {
            lastId = id;
            const typeIdx = fields.indexOf('type');
            const payloadIdx = fields.indexOf('payload');

            const event = {
              id,
              type: typeIdx >= 0 ? fields[typeIdx + 1] : 'unknown',
              payload: payloadIdx >= 0 ? JSON.parse(fields[payloadIdx + 1]) : {},
            };

            await handler(event);
          }));
        }
      } catch (err) {
        // Log error and continue — don't crash the event loop
        console.error('[HeadyEventSpine] Stream error:', err.message);
        await new Promise(r => setTimeout(r, 1000)); // Brief pause on error only
      }
    }
  }

  /**
   * Register a typed event handler
   */
  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);
  }

  /**
   * In-memory emit fallback (no Redis)
   */
  async _inMemoryEmit(eventType, payload) {
    const event = {
      id: crypto.randomUUID(),
      type: eventType,
      payload,
    };

    // Fire typed handlers
    const handlers = this.handlers.get(eventType) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[HeadyEventSpine] Handler error for ${eventType}:`, err.message);
      }
    }

    // Fire default handler
    if (this._defaultHandler) {
      try {
        await this._defaultHandler(event);
      } catch (err) {
        console.error('[HeadyEventSpine] Default handler error:', err.message);
      }
    }
  }

  /**
   * Stop the subscribe loop gracefully
   */
  stop() {
    this.running = false;
  }
}

export default HeadyEventSpine;
