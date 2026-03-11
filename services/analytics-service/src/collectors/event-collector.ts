import { v4 as uuidv4 } from 'uuid';
import { AnalyticsEvent, EventBatch, CSLGate } from '../types';
import { logger } from '../logger';
import { cslGateEngine } from '../csl-gates';
import { EVENT_FLUSH_INTERVAL_MS, BATCH_SIZE } from '../constants';
import crypto from 'crypto';

export class EventCollector {
  private eventQueue: AnalyticsEvent[] = [];
  private eventBatches: Map<string, EventBatch> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private eventsProcessed: number = 0;
  private batchesProcessed: number = 0;
  private lastFlushTime: number = Date.now();
  private invalidEventCount: number = 0;

  constructor() {
    this.startFlushTimer();
    logger.info('event_collector', 'Event collector initialized', {
      flushInterval: EVENT_FLUSH_INTERVAL_MS,
      batchSize: BATCH_SIZE
    });
  }

  addEvent(event: Omit<AnalyticsEvent, 'id'>): string {
    const eventWithId: AnalyticsEvent = {
      ...event,
      id: uuidv4()
    };

    const validityGate = cslGateEngine.evaluateEventValidity(eventWithId);

    if (!validityGate.decision) {
      this.invalidEventCount += 1;
      logger.warn('event_collector', 'Invalid event rejected', {
        reason: validityGate.reason,
        eventName: eventWithId.eventName,
        userId: eventWithId.userId
      });
      return '';
    }

    this.eventQueue.push(eventWithId);
    this.eventsProcessed += 1;

    logger.trace('event_collector', 'Event added to queue', {
      eventId: eventWithId.id,
      eventName: eventWithId.eventName,
      userId: eventWithId.userId,
      queueSize: this.eventQueue.length
    });

    if (this.eventQueue.length >= BATCH_SIZE) {
      this.flushBatch();
    }

    return eventWithId.id;
  }

  private startFlushTimer(): void {
    this.flushInterval = setInterval(() => {
      if (this.eventQueue.length > 0) {
        const batchReadinessGate = cslGateEngine.evaluateBatchReadiness(
          this.eventQueue.length,
          BATCH_SIZE,
          Date.now() - this.lastFlushTime,
          EVENT_FLUSH_INTERVAL_MS
        );

        if (batchReadinessGate.decision) {
          this.flushBatch();
        }
      }
    }, EVENT_FLUSH_INTERVAL_MS);

    logger.debug('event_collector', 'Flush timer started', { interval: EVENT_FLUSH_INTERVAL_MS });
  }

  private flushBatch(): void {
    const startTime = Date.now();

    if (this.eventQueue.length === 0) {
      return;
    }

    const batchId = uuidv4();
    const events = this.eventQueue.splice(0, BATCH_SIZE);

    const batch: EventBatch = {
      id: batchId,
      events,
      createdAt: startTime,
      processed: false
    };

    this.eventBatches.set(batchId, batch);
    this.batchesProcessed += 1;
    this.lastFlushTime = startTime;

    logger.info('event_collector', 'Batch flushed', {
      batchId,
      eventCount: events.length,
      duration: Date.now() - startTime,
      queueRemaining: this.eventQueue.length
    });
  }

  markBatchProcessed(batchId: string): void {
    const batch = this.eventBatches.get(batchId);

    if (batch) {
      batch.processed = true;
      batch.flushedAt = Date.now();
      logger.debug('event_collector', 'Batch marked as processed', { batchId });
    }
  }

  getBatchesForStorage(): EventBatch[] {
    const unprocessedBatches = Array.from(this.eventBatches.values())
      .filter(batch => !batch.processed)
      .sort((a, b) => a.createdAt - b.createdAt);

    return unprocessedBatches;
  }

  getCollectorStats(): {
    queueSize: number;
    eventsProcessed: number;
    batchesProcessed: number;
    invalidEvents: number;
    lastFlushTime: number;
  } {
    return {
      queueSize: this.eventQueue.length,
      eventsProcessed: this.eventsProcessed,
      batchesProcessed: this.batchesProcessed,
      invalidEvents: this.invalidEventCount,
      lastFlushTime: this.lastFlushTime
    };
  }

  hashUserId(userId: string): string {
    return crypto
      .createHash('sha256')
      .update(userId)
      .digest('hex');
  }

  anonymizeIpAddress(ipAddress: string): string {
    const parts = ipAddress.split('.');

    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }

    return ipAddress;
  }

  cleanupOldBatches(maxAgeHours: number): number {
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    let deletedCount = 0;

    this.eventBatches.forEach((batch, batchId) => {
      if (batch.processed && (now - batch.createdAt) > maxAgeMs) {
        this.eventBatches.delete(batchId);
        deletedCount += 1;
      }
    });

    if (deletedCount > 0) {
      logger.info('event_collector', 'Old batches cleaned up', {
        deletedCount,
        maxAgeHours,
        remainingBatches: this.eventBatches.size
      });
    }

    return deletedCount;
  }

  shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    if (this.eventQueue.length > 0) {
      this.flushBatch();
    }

    logger.info('event_collector', 'Event collector shut down', {
      remainingQueueSize: this.eventQueue.length,
      totalBatches: this.eventBatches.size
    });
  }
}

export const eventCollector = new EventCollector();
