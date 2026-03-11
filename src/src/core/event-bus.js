/**
 * Heady™ Latent OS — Spatial Event Bus
 * Cross-swarm coordination with octant indexing and phi-weighted priority.
 *
 * Architecture:
 *   - Namespaced channels: task | lifecycle | health | drift | alert | learning
 *   - Octant indexing maps events to spatial coordinates (8 octants = 2³)
 *   - Ring buffer of fib(12)=144 events for history replay
 *   - Phi-weighted priority queue for processing order
 *
 * © 2026-2026 HeadySystems Inc. All Rights Reserved. 60+ Provisional Patents.
 */

'use strict';

const EventEmitter = require('events');
const {
  PHI, PSI, fib, phiFusionWeights,
  PHI_TIMING, CSL_THRESHOLDS,
} = require('../../shared/phi-math');

// ─── Channel Definitions ──────────────────────────────────────────────────────

/** All valid namespaced channels */
const CHANNELS = Object.freeze([
  'task',
  'lifecycle',
  'health',
  'drift',
  'alert',
  'learning',
]);

/** Channel priority weights (phi-fusion across 6 channels) */
const CHANNEL_WEIGHTS = Object.freeze(
  CHANNELS.reduce((acc, ch, i) => {
    const weights = phiFusionWeights(CHANNELS.length);
    acc[ch] = weights[i];
    return acc;
  }, {})
);

// ─── Ring Buffer ──────────────────────────────────────────────────────────────

/** Fixed-capacity ring buffer for event history */
const HISTORY_CAPACITY = fib(12); // 144

class RingBuffer {
  constructor(capacity) {
    this._capacity = capacity;
    this._buf      = new Array(capacity);
    this._head     = 0; // next write position
    this._size     = 0;
  }

  push(item) {
    this._buf[this._head] = item;
    this._head = (this._head + 1) % this._capacity;
    if (this._size < this._capacity) this._size++;
  }

  /** Returns events oldest-first */
  toArray() {
    if (this._size === 0) return [];
    const start = this._size < this._capacity
      ? 0
      : this._head; // oldest slot when full
    const result = [];
    for (let i = 0; i < this._size; i++) {
      result.push(this._buf[(start + i) % this._capacity]);
    }
    return result;
  }

  get size()     { return this._size; }
  get capacity() { return this._capacity; }
}

// ─── Octant Indexing ──────────────────────────────────────────────────────────

/**
 * Map a 3-axis coherence vector to an octant index (0–7).
 * Axes represent: semantic alignment, temporal urgency, spatial proximity.
 * Each axis is quantised: >= PSI (0.618) → 1, else → 0.
 *
 * @param {number} semantic   0–1 semantic alignment score
 * @param {number} temporal   0–1 temporal urgency score
 * @param {number} spatial    0–1 spatial proximity score
 * @returns {number} octant index 0–7
 */
function octantIndex(semantic, temporal, spatial) {
  const s = semantic >= PSI ? 1 : 0;
  const t = temporal >= PSI ? 1 : 0;
  const p = spatial  >= PSI ? 1 : 0;
  return (s << 2) | (t << 1) | p;
}

/**
 * Compute phi-weighted priority from channel weight + coherence scores.
 * Higher score → processed first.
 *
 * @param {string} channel   event channel name
 * @param {number} coherence 0–1 overall coherence
 * @returns {number} priority score
 */
function computePriority(channel, coherence) {
  const channelW = CHANNEL_WEIGHTS[channel] || PSI;
  return channelW * PHI + coherence * PSI;
}

// ─── EventBus Class ───────────────────────────────────────────────────────────

/**
 * Spatial Event Bus — hub for all intra-OS cross-swarm events.
 *
 * @fires EventBus#task
 * @fires EventBus#lifecycle
 * @fires EventBus#health
 * @fires EventBus#drift
 * @fires EventBus#alert
 * @fires EventBus#learning
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(fib(10)); // 55 — enough for large swarms

    /** @type {RingBuffer} event history ring buffer */
    this._history = new RingBuffer(HISTORY_CAPACITY);

    /** @type {number} total events processed since boot */
    this._processed = 0;

    /** @type {Map<string,number>} per-channel event counts */
    this._channelCounts = new Map(CHANNELS.map(ch => [ch, 0]));

    /** @type {number} bus instantiation timestamp */
    this._startedAt = Date.now();
  }

  // ─── Core API ───────────────────────────────────────────────────────────────

  /**
   * Emit a phi-prioritised event on a namespaced channel.
   *
   * @param {string} channel     one of CHANNELS
   * @param {object} event       event payload
   * @param {string} [event.id]
   * @param {string} [event.type]
   * @param {object} [event.data]
   * @param {number} [event.semantic]  0–1 semantic alignment
   * @param {number} [event.temporal]  0–1 temporal urgency
   * @param {number} [event.spatial]   0–1 spatial proximity
   * @returns {boolean} true if any listener received the event
   */
  emit(channel, event = {}) {
    if (!CHANNELS.includes(channel)) {
      throw new Error(`[EventBus] Unknown channel: "${channel}". Valid: ${CHANNELS.join(', ')}`);
    }

    const semantic  = typeof event.semantic  === 'number' ? event.semantic  : PSI;
    const temporal  = typeof event.temporal  === 'number' ? event.temporal  : PSI;
    const spatial   = typeof event.spatial   === 'number' ? event.spatial   : PSI;
    const coherence = (semantic + temporal + spatial) / 3;

    /** @type {EnrichedEvent} */
    const enriched = {
      id:        event.id   || `${channel}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      channel,
      type:      event.type || channel,
      data:      event.data || {},
      semantic,
      temporal,
      spatial,
      coherence,
      octant:    octantIndex(semantic, temporal, spatial),
      priority:  computePriority(channel, coherence),
      ts:        Date.now(),
    };

    this._history.push(enriched);
    this._processed++;
    this._channelCounts.set(channel, (this._channelCounts.get(channel) || 0) + 1);

    return super.emit(channel, enriched);
  }

  /**
   * Register a persistent handler for a channel.
   * @param {string}   channel
   * @param {Function} handler  receives enriched event object
   */
  on(channel, handler) {
    if (!CHANNELS.includes(channel)) {
      throw new Error(`[EventBus] Cannot subscribe to unknown channel: "${channel}"`);
    }
    return super.on(channel, handler);
  }

  /**
   * Register a one-time handler for a channel.
   * @param {string}   channel
   * @param {Function} handler
   */
  once(channel, handler) {
    if (!CHANNELS.includes(channel)) {
      throw new Error(`[EventBus] Cannot subscribe once to unknown channel: "${channel}"`);
    }
    return super.once(channel, handler);
  }

  /**
   * Remove a handler from a channel.
   * @param {string}   channel
   * @param {Function} handler
   */
  off(channel, handler) {
    return super.removeListener(channel, handler);
  }

  // ─── Diagnostics ────────────────────────────────────────────────────────────

  /**
   * Returns a snapshot of bus health and usage metrics.
   * @returns {object}
   */
  stats() {
    const counts = {};
    for (const [ch, n] of this._channelCounts) counts[ch] = n;
    return {
      processed:       this._processed,
      historySize:     this._history.size,
      historyCapacity: this._history.capacity,
      channelCounts:   counts,
      uptimeMs:        Date.now() - this._startedAt,
      phiCapacity:     HISTORY_CAPACITY,   // fib(12) = 144
      coherenceGate:   CSL_THRESHOLDS.COHERENCE,
    };
  }

  /**
   * Returns all buffered events (oldest-first).
   * @returns {EnrichedEvent[]}
   */
  history() {
    return this._history.toArray();
  }

  /**
   * Returns recent events filtered by channel.
   * @param {string} channel
   * @returns {EnrichedEvent[]}
   */
  historyByChannel(channel) {
    return this._history.toArray().filter(e => e.channel === channel);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/** Module-level singleton — one bus per process */
const _instance = new EventBus();

module.exports = {
  EventBus,
  CHANNELS,
  CHANNEL_WEIGHTS,
  HISTORY_CAPACITY,
  octantIndex,
  computePriority,
  RingBuffer,
  /** @type {EventBus} Process-scoped singleton event bus */
  bus: _instance,
};
