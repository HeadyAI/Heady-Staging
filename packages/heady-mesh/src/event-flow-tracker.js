/**
 * HEADY_BRAND:BEGIN
 * HeadyMesh EventFlowTracker — Event flow observability and bottleneck detection
 * Layer 5 PRODUCT — traces event chains across multi-agent deployments
 * (c) 2024-2026 HeadySystems Inc. All Rights Reserved.
 * HEADY_BRAND:END
 */
'use strict';

const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════════════════════
// PHI-MATH CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PHI    = 1.6180339887498948;
const PSI    = 0.6180339887498949;
const PHI_SQ = 2.618033988749895;
const FIB    = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

// Bottleneck threshold: events taking longer than phi^4 * 1000 ms (~6854ms) flagged
const BOTTLENECK_LATENCY_MS = Math.round(Math.pow(PHI, 4) * 1000);
// Max tracked flows per time window
const MAX_TRACKED_FLOWS = FIB[10]; // 55
// Default flow TTL (auto-expire incomplete flows after phi^8 * 1000 ms ~47s)
const FLOW_TTL_MS = Math.round(Math.pow(PHI, 8) * 1000);

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCULAR BUFFER
// ═══════════════════════════════════════════════════════════════════════════════

class CircularBuffer {
  constructor(capacity = FIB[8]) {
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
    if (this.size < this.capacity) return this.buffer.slice(0, this.size);
    return [...this.buffer.slice(this.head), ...this.buffer.slice(0, this.head)];
  }

  latest(n = 1) {
    return this.toArray().slice(-n);
  }

  clear() {
    this.head = 0;
    this.size = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT FLOW TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

class EventFlowTracker {
  /**
   * @param {EventEmitter} eventBus — shared event bus to intercept events from
   * @param {Object} [options]
   * @param {number} [options.maxFlows] — max tracked flows in circular buffer
   * @param {number} [options.bottleneckThresholdMs] — latency threshold for bottleneck flagging
   * @param {number} [options.flowTtlMs] — TTL for incomplete flows
   */
  constructor(eventBus, options = {}) {
    this.eventBus = eventBus || new EventEmitter();
    this.maxFlows = options.maxFlows || MAX_TRACKED_FLOWS;
    this.bottleneckThresholdMs = options.bottleneckThresholdMs || BOTTLENECK_LATENCY_MS;
    this.flowTtlMs = options.flowTtlMs || FLOW_TTL_MS;

    // Active flows: correlationId -> { events: [], startedAt, completedAt }
    this._activeFlows = new Map();

    // Completed flows (circular buffer)
    this._completedFlows = new CircularBuffer(FIB[9]); // 34 completed flows

    // Event log (circular buffer for raw events)
    this._eventLog = new CircularBuffer(FIB[12]); // 144 events

    // Stats counters per event type
    this._eventStats = new Map();

    // Bottleneck records
    this._bottlenecks = new CircularBuffer(FIB[8]); // 21 bottlenecks

    // TTL cleanup interval
    this._cleanupTimer = setInterval(() => this._expireFlows(), this.flowTtlMs);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();

    // Auto-intercept events from the event bus
    this._intercepting = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start intercepting all events from the event bus.
   * @param {string[]} [eventPatterns] — specific event names to track, or all if omitted
   */
  startIntercepting(eventPatterns = null) {
    if (this._intercepting) return;
    this._intercepting = true;
    this._eventPatterns = eventPatterns;

    const originalEmit = this.eventBus.emit.bind(this.eventBus);
    const self = this;

    this.eventBus.emit = function(eventName, ...args) {
      // Only track matching patterns (or all if no filter)
      if (!self._eventPatterns || self._eventPatterns.some(p => eventName.startsWith(p))) {
        const data = args[0] || {};
        self.trackEvent(eventName, data);
      }
      return originalEmit(eventName, ...args);
    };

    this._originalEmit = originalEmit;
  }

  /**
   * Stop intercepting events.
   */
  stopIntercepting() {
    if (!this._intercepting) return;
    this._intercepting = false;
    if (this._originalEmit) {
      this.eventBus.emit = this._originalEmit;
      this._originalEmit = null;
    }
  }

  /**
   * Record an event in the flow tracker.
   * Events with a correlationId are grouped into flows.
   * @param {string} event — event name/type
   * @param {Object} data — event payload
   * @returns {Object} recorded event entry
   */
  trackEvent(event, data = {}) {
    const now = Date.now();
    const correlationId = data.correlationId || data.flowId || null;

    const entry = {
      event,
      data: this._sanitizeData(data),
      timestamp: now,
      correlationId,
    };

    // Record in raw event log
    this._eventLog.push(entry);

    // Update per-event-type stats
    this._updateStats(event, now);

    // If correlated, track in flow
    if (correlationId) {
      this._addToFlow(correlationId, entry);
    }

    return entry;
  }

  /**
   * Mark a flow as started (creates correlation context).
   * @param {string} correlationId
   * @param {Object} [metadata]
   * @returns {Object} flow record
   */
  startFlow(correlationId, metadata = {}) {
    const flow = {
      correlationId,
      events: [],
      startedAt: Date.now(),
      completedAt: null,
      metadata,
      totalLatencyMs: 0,
    };
    this._activeFlows.set(correlationId, flow);
    return flow;
  }

  /**
   * Mark a flow as completed.
   * @param {string} correlationId
   * @returns {Object|null} completed flow
   */
  completeFlow(correlationId) {
    const flow = this._activeFlows.get(correlationId);
    if (!flow) return null;

    flow.completedAt = Date.now();
    flow.totalLatencyMs = flow.completedAt - flow.startedAt;

    // Check if this flow is a bottleneck
    if (flow.totalLatencyMs > this.bottleneckThresholdMs) {
      this._bottlenecks.push({
        correlationId,
        totalLatencyMs: flow.totalLatencyMs,
        eventCount: flow.events.length,
        slowestEvent: this._findSlowestEvent(flow),
        timestamp: Date.now(),
      });
    }

    // Move to completed flows circular buffer
    this._completedFlows.push(flow);
    this._activeFlows.delete(correlationId);

    return flow;
  }

  /**
   * Get event flows within a time range.
   * @param {Object} timeRange
   * @param {number} timeRange.start — start timestamp (ms)
   * @param {number} timeRange.end — end timestamp (ms)
   * @returns {Object} { active: [...], completed: [...], events: [...] }
   */
  getEventFlow(timeRange = {}) {
    const start = timeRange.start || 0;
    const end = timeRange.end || Date.now();

    // Filter active flows
    const active = [];
    for (const [, flow] of this._activeFlows) {
      if (flow.startedAt >= start && flow.startedAt <= end) {
        active.push(flow);
      }
    }

    // Filter completed flows
    const completed = this._completedFlows.toArray().filter(
      f => f.startedAt >= start && (f.completedAt || f.startedAt) <= end
    );

    // Filter raw events
    const events = this._eventLog.toArray().filter(
      e => e.timestamp >= start && e.timestamp <= end
    );

    return {
      active,
      completed,
      events,
      timeRange: { start, end, durationMs: end - start },
      timestamp: Date.now(),
    };
  }

  /**
   * Identify slow event chains (bottlenecks).
   * @returns {Object[]} bottleneck records sorted by latency descending
   */
  getBottlenecks() {
    const bottlenecks = this._bottlenecks.toArray();

    // Also scan active flows for in-progress bottlenecks
    const now = Date.now();
    const activeBottlenecks = [];
    for (const [correlationId, flow] of this._activeFlows) {
      const elapsed = now - flow.startedAt;
      if (elapsed > this.bottleneckThresholdMs) {
        activeBottlenecks.push({
          correlationId,
          totalLatencyMs: elapsed,
          eventCount: flow.events.length,
          slowestEvent: this._findSlowestEvent(flow),
          active: true,
          timestamp: now,
        });
      }
    }

    const all = [...bottlenecks, ...activeBottlenecks];
    all.sort((a, b) => b.totalLatencyMs - a.totalLatencyMs);

    return {
      bottlenecks: all,
      thresholdMs: this.bottleneckThresholdMs,
      activeFlows: this._activeFlows.size,
      timestamp: Date.now(),
    };
  }

  /**
   * Get event frequency and latency statistics.
   * @returns {Object} { eventTypes: { [name]: { count, avgIntervalMs, ... } }, totals }
   */
  getEventStats() {
    const eventTypes = {};
    let totalEvents = 0;

    for (const [eventName, stats] of this._eventStats) {
      const intervals = stats.intervals.toArray();
      const avgInterval = intervals.length > 0
        ? intervals.reduce((s, v) => s + v, 0) / intervals.length
        : 0;

      // Compute standard deviation
      const variance = intervals.length > 1
        ? intervals.reduce((s, v) => s + Math.pow(v - avgInterval, 2), 0) / (intervals.length - 1)
        : 0;

      eventTypes[eventName] = {
        count: stats.count,
        firstSeen: stats.firstSeen,
        lastSeen: stats.lastSeen,
        avgIntervalMs: Math.round(avgInterval),
        stdDevMs: Math.round(Math.sqrt(variance)),
        minIntervalMs: intervals.length > 0 ? Math.min(...intervals) : 0,
        maxIntervalMs: intervals.length > 0 ? Math.max(...intervals) : 0,
        ratePerSecond: stats.count > 1
          ? (stats.count / ((stats.lastSeen - stats.firstSeen) / 1000)).toFixed(3)
          : 0,
      };

      totalEvents += stats.count;
    }

    // Completed flow latency stats
    const completedFlows = this._completedFlows.toArray();
    const flowLatencies = completedFlows.map(f => f.totalLatencyMs).filter(l => l > 0);
    const avgFlowLatency = flowLatencies.length > 0
      ? flowLatencies.reduce((s, v) => s + v, 0) / flowLatencies.length
      : 0;

    return {
      eventTypes,
      totals: {
        totalEvents,
        uniqueEventTypes: this._eventStats.size,
        activeFlows: this._activeFlows.size,
        completedFlows: completedFlows.length,
        bottleneckCount: this._bottlenecks.toArray().length,
      },
      flowLatency: {
        avgMs: Math.round(avgFlowLatency),
        minMs: flowLatencies.length > 0 ? Math.min(...flowLatencies) : 0,
        maxMs: flowLatencies.length > 0 ? Math.max(...flowLatencies) : 0,
        p95Ms: this._percentile(flowLatencies, 0.95),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Shutdown tracker and clean up.
   */
  destroy() {
    this.stopIntercepting();
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
    this._activeFlows.clear();
    this._eventStats.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /** @private */
  _addToFlow(correlationId, entry) {
    let flow = this._activeFlows.get(correlationId);
    if (!flow) {
      flow = this.startFlow(correlationId);
    }

    // Compute inter-event latency within the flow
    if (flow.events.length > 0) {
      const prevEvent = flow.events[flow.events.length - 1];
      entry.interEventLatencyMs = entry.timestamp - prevEvent.timestamp;
    } else {
      entry.interEventLatencyMs = 0;
    }

    flow.events.push(entry);

    // Guard against runaway flows
    if (flow.events.length > this.maxFlows) {
      this.completeFlow(correlationId);
    }
  }

  /** @private */
  _updateStats(eventName, timestamp) {
    let stats = this._eventStats.get(eventName);
    if (!stats) {
      stats = {
        count: 0,
        firstSeen: timestamp,
        lastSeen: timestamp,
        intervals: new CircularBuffer(FIB[8]), // 21 intervals
      };
      this._eventStats.set(eventName, stats);
    }

    // Record interval since last occurrence
    if (stats.count > 0) {
      stats.intervals.push(timestamp - stats.lastSeen);
    }

    stats.count++;
    stats.lastSeen = timestamp;
  }

  /** @private */
  _findSlowestEvent(flow) {
    if (!flow.events || flow.events.length < 2) return null;

    let slowest = null;
    let maxLatency = 0;

    for (const event of flow.events) {
      if (event.interEventLatencyMs > maxLatency) {
        maxLatency = event.interEventLatencyMs;
        slowest = {
          event: event.event,
          latencyMs: event.interEventLatencyMs,
          timestamp: event.timestamp,
        };
      }
    }

    return slowest;
  }

  /** @private */
  _expireFlows() {
    const now = Date.now();
    const expired = [];

    for (const [correlationId, flow] of this._activeFlows) {
      if (now - flow.startedAt > this.flowTtlMs) {
        flow.completedAt = now;
        flow.totalLatencyMs = now - flow.startedAt;
        flow.expired = true;
        this._completedFlows.push(flow);
        expired.push(correlationId);
      }
    }

    for (const id of expired) {
      this._activeFlows.delete(id);
    }
  }

  /** @private */
  _percentile(sortedValues, p) {
    if (sortedValues.length === 0) return 0;
    const sorted = [...sortedValues].sort((a, b) => a - b);
    const idx = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  /** @private — strip large payloads to avoid memory bloat */
  _sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > FIB[10] * 10) { // >550 chars
        sanitized[key] = value.slice(0, FIB[10] * 10) + '...[truncated]';
      } else if (Buffer.isBuffer(value)) {
        sanitized[key] = `<Buffer ${value.length} bytes>`;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  EventFlowTracker,
  BOTTLENECK_LATENCY_MS,
  MAX_TRACKED_FLOWS,
  FLOW_TTL_MS,
};
