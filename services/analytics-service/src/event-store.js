'use strict';

/**
 * HEADY™ Analytics Service Event Store
 * Privacy-first in-memory event storage with LRU eviction
 * Copyright (c) HeadySystems Inc. Eric Haywood, founder. All rights reserved.
 */

const { createHash } = require('crypto');
const { appendFileSync, existsSync, writeFileSync, readFileSync } = require('fs');
const { resolve } = require('path');
const {
  MAX_EVENTS_IN_BUFFER,
  EVENT_PERSISTENCE_INTERVAL,
  SESSION_ID_HASH_ALGORITHM,
  ANONYMIZATION_ENABLED,
} = require('./constants');

class EventStore {
  constructor() {
    this.circularBuffer = [];
    this.maxSize = MAX_EVENTS_IN_BUFFER;
    this.writePointer = 0;
    this.eventCount = 0;
    this.lruMap = new Map(); // Track access order for LRU
    this.persistencePath = resolve(__dirname, '../data/events.jsonl');
    this.lastPersistTime = Date.now();
    this.persistenceInterval = EVENT_PERSISTENCE_INTERVAL;
    this.isShuttingDown = false;

    this.initializePersistenceFile();
    this.schedulePeriodicPersistence();
  }

  initializePersistenceFile() {
    const dir = resolve(__dirname, '../data');
    if (!existsSync(dir)) {
      try {
        require('fs').mkdirSync(dir, { recursive: true });
      } catch (e) {
        // Directory may already exist
      }
    }

    if (!existsSync(this.persistencePath)) {
      writeFileSync(this.persistencePath, '', 'utf8');
    }
  }

  schedulePeriodicPersistence() {
    this.persistenceTimer = setInterval(() => {
      if (!this.isShuttingDown && this.eventCount > 0) {
        this.flushToFile();
      }
    }, this.persistenceInterval);
  }

  hashSessionId(sessionId) {
    if (!ANONYMIZATION_ENABLED) {
      return sessionId;
    }
    return createHash(SESSION_ID_HASH_ALGORITHM)
      .update(sessionId)
      .digest('hex');
  }

  addEvent(event) {
    if (this.isShuttingDown) {
      return null;
    }

    const sanitizedEvent = {
      id: this.generateEventId(),
      timestamp: event.timestamp || Date.now(),
      type: event.type || 'unknown',
      serviceName: event.serviceName || 'unknown',
      hashedSessionId: this.hashSessionId(event.sessionId || ''),
      eventMetadata: event.metadata || {},
      requestCount: event.requestCount || 1,
      latency: event.latency || 0,
      errorFlag: event.errorFlag || false,
      errorMessage: event.errorMessage || null,
      conversionFlag: event.conversionFlag || false,
      funnelName: event.funnelName || null,
      funnelStep: event.funnelStep || null,
      agentId: event.agentId || null,
      skillName: event.skillName || null,
    };

    if (this.eventCount < this.maxSize) {
      this.circularBuffer.push(sanitizedEvent);
      this.eventCount++;
    } else {
      // Circular buffer is full - overwrite oldest (LRU eviction)
      this.circularBuffer[this.writePointer] = sanitizedEvent;
      this.writePointer = (this.writePointer + 1) % this.maxSize;
    }

    // Track LRU access
    this.lruMap.set(sanitizedEvent.id, Date.now());
    if (this.lruMap.size > this.maxSize) {
      // Remove oldest LRU entry
      const oldestId = Array.from(this.lruMap.entries())
        .sort((a, b) => a[1] - b[1])[0][0];
      this.lruMap.delete(oldestId);
    }

    return sanitizedEvent.id;
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getEvent(eventId) {
    const event = this.circularBuffer.find(e => e.id === eventId);
    if (event) {
      this.lruMap.set(eventId, Date.now());
    }
    return event || null;
  }

  getEventsByTimeRange(startTime, endTime) {
    return this.circularBuffer.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  getEventsByServiceName(serviceName) {
    return this.circularBuffer.filter(e => e.serviceName === serviceName);
  }

  getEventsByType(type) {
    return this.circularBuffer.filter(e => e.type === type);
  }

  getAllEvents() {
    return [...this.circularBuffer];
  }

  getEventStats() {
    return {
      totalEventsStored: this.eventCount,
      bufferCapacity: this.maxSize,
      bufferUtilization: (this.eventCount / this.maxSize * 100).toFixed(2),
      lruTrackedCount: this.lruMap.size,
    };
  }

  flushToFile() {
    if (this.eventCount === 0) {
      return;
    }

    try {
      const eventsToWrite = this.circularBuffer
        .slice(0, this.eventCount)
        .map(e => JSON.stringify(e))
        .join('\n');

      if (eventsToWrite) {
        appendFileSync(this.persistencePath, eventsToWrite + '\n', 'utf8');
      }

      this.lastPersistTime = Date.now();
    } catch (error) {
      console.error('Failed to flush events to file:', error);
    }
  }

  loadEventsFromFile() {
    if (!existsSync(this.persistencePath)) {
      return [];
    }

    try {
      const content = readFileSync(this.persistencePath, 'utf8');
      if (!content) {
        return [];
      }

      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        })
        .filter(e => e !== null);
    } catch (error) {
      console.error('Failed to load events from file:', error);
      return [];
    }
  }

  clearBuffer() {
    this.circularBuffer = [];
    this.writePointer = 0;
    this.eventCount = 0;
    this.lruMap.clear();
  }

  getBufferUtilization() {
    return (this.eventCount / this.maxSize) * 100;
  }

  evictLRUEvent() {
    if (this.lruMap.size === 0) {
      return null;
    }

    const oldestId = Array.from(this.lruMap.entries())
      .sort((a, b) => a[1] - b[1])[0][0];

    this.lruMap.delete(oldestId);
    const index = this.circularBuffer.findIndex(e => e.id === oldestId);
    if (index !== -1) {
      this.circularBuffer.splice(index, 1);
      this.eventCount--;
    }

    return oldestId;
  }

  shutdown() {
    this.isShuttingDown = true;
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }
    this.flushToFile();
  }
}

module.exports = new EventStore();
