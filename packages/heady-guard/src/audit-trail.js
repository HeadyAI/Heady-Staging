/**
 * © 2026 HeadySystems Inc. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * AuditTrail — Immutable audit log with SHA-256 hash chain.
 *
 * Every entry is linked to its predecessor via a cryptographic hash,
 * forming a tamper-evident chain. Any modification to a past entry
 * breaks the chain and is detectable via verify().
 *
 * Features:
 *   - SHA-256 hash chain (genesis → HEAD)
 *   - Append-only semantics (no delete, no update)
 *   - Configurable max in-memory entries with archive rotation
 *   - Query by time range, type, actor, or custom filter
 *   - Full chain integrity verification
 *   - Export to JSON for external audit systems
 */

'use strict';

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ─── Entry types ──────────────────────────────────────────────────────────────
const AuditEntryType = Object.freeze({
  GOVERNANCE_DECISION: 'GOVERNANCE_DECISION',
  KILL_SWITCH_EVENT:   'KILL_SWITCH_EVENT',
  ACCESS_GRANT:        'ACCESS_GRANT',
  ACCESS_REVOKE:       'ACCESS_REVOKE',
  CONFIG_CHANGE:       'CONFIG_CHANGE',
  DEPLOYMENT:          'DEPLOYMENT',
  DATA_ACCESS:         'DATA_ACCESS',
  POLICY_VIOLATION:    'POLICY_VIOLATION',
  HALLUCINATION:       'HALLUCINATION',
  SYSTEM_EVENT:        'SYSTEM_EVENT',
  MANUAL_ENTRY:        'MANUAL_ENTRY',
});

// ─── Genesis hash ─────────────────────────────────────────────────────────────
const GENESIS_HASH = '0'.repeat(64);

class AuditTrail extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {number} [options.maxEntries]    - Max entries in active chain (default 50000)
   * @param {string} [options.trailId]       - Trail identifier
   * @param {boolean} [options.strict]       - Throw on append if chain is broken (default true)
   */
  constructor(options = {}) {
    super();

    this._trailId = options.trailId || `trail-${crypto.randomBytes(4).toString('hex')}`;
    this._maxEntries = options.maxEntries || 50_000;
    this._strict = options.strict !== undefined ? options.strict : true;

    /** @type {Array<AuditEntry>} */
    this._chain = [];

    /** @type {Array<Array<AuditEntry>>} Archived segments */
    this._archives = [];

    this._lastHash = GENESIS_HASH;
    this._sequence = 0;
    this._createdAt = Date.now();

    // Index maps for fast query
    this._indexByType = new Map();   // type → Set<sequence>
    this._indexByActor = new Map();  // actor → Set<sequence>
  }

  // ─── Getters ──────────────────────────────────────────────────────────────────

  get trailId() { return this._trailId; }
  get length() { return this._chain.length; }
  get headHash() { return this._lastHash; }
  get sequence() { return this._sequence; }

  get stats() {
    return {
      trailId: this._trailId,
      activeEntries: this._chain.length,
      archivedSegments: this._archives.length,
      totalEntries: this._sequence,
      headHash: this._lastHash,
      createdAt: this._createdAt,
    };
  }

  // ─── Core: Append ─────────────────────────────────────────────────────────────

  /**
   * Append a new entry to the audit trail.
   * Computes a SHA-256 hash linking this entry to the previous one.
   *
   * @param {object} entry
   * @param {string} entry.type      - One of AuditEntryType values
   * @param {string} entry.actor     - Who/what performed the action
   * @param {string} entry.action    - Description of the action
   * @param {object} [entry.detail]  - Arbitrary structured data
   * @param {string} [entry.target]  - Target of the action
   * @param {string} [entry.outcome] - Result: 'success' | 'failure' | 'denied' | 'escalated'
   * @returns {AuditEntry} The appended entry with hash and sequence
   */
  append(entry) {
    if (!entry || !entry.type || !entry.actor || !entry.action) {
      throw new Error('AuditTrail.append requires { type, actor, action }');
    }

    // Strict mode: verify chain integrity before appending
    if (this._strict && this._chain.length > 0) {
      const lastEntry = this._chain[this._chain.length - 1];
      const recomputedHash = this._computeHash(lastEntry);
      if (recomputedHash !== lastEntry.hash) {
        const err = new Error('AuditTrail chain integrity broken: last entry hash mismatch');
        this.emit('integrity:broken', { trailId: this._trailId, sequence: lastEntry.sequence });
        throw err;
      }
    }

    this._sequence++;
    const timestamp = Date.now();

    const auditEntry = {
      sequence: this._sequence,
      trailId: this._trailId,
      type: entry.type,
      actor: entry.actor,
      action: entry.action,
      target: entry.target || null,
      detail: entry.detail || null,
      outcome: entry.outcome || null,
      timestamp,
      isoTime: new Date(timestamp).toISOString(),
      previousHash: this._lastHash,
      hash: null, // computed below
    };

    // Compute SHA-256 hash of this entry (including previousHash link)
    auditEntry.hash = this._computeHash(auditEntry);
    this._lastHash = auditEntry.hash;

    // Append to chain
    this._chain.push(auditEntry);

    // Update indices
    this._addToIndex(this._indexByType, entry.type, this._sequence);
    this._addToIndex(this._indexByActor, entry.actor, this._sequence);

    // Archive rotation
    if (this._chain.length > this._maxEntries) {
      this._rotate();
    }

    this.emit('entry:appended', auditEntry);

    return auditEntry;
  }

  // ─── Core: Verify ─────────────────────────────────────────────────────────────

  /**
   * Verify the integrity of the entire active chain.
   * Walks from genesis (or archive boundary) to HEAD, re-computing every hash.
   *
   * @returns {{ valid: boolean, entries: number, brokenAt: number|null, detail: string }}
   */
  verify() {
    if (this._chain.length === 0) {
      return { valid: true, entries: 0, brokenAt: null, detail: 'Empty chain' };
    }

    let expectedPreviousHash = this._chain[0].previousHash;

    // Check the first entry's previousHash is either GENESIS or the last archived hash
    // (we allow both because archives may have been rotated)

    for (let i = 0; i < this._chain.length; i++) {
      const entry = this._chain[i];

      // Verify previousHash link
      if (entry.previousHash !== expectedPreviousHash) {
        this.emit('integrity:broken', {
          trailId: this._trailId,
          sequence: entry.sequence,
          expected: expectedPreviousHash,
          actual: entry.previousHash,
        });

        return {
          valid: false,
          entries: this._chain.length,
          brokenAt: entry.sequence,
          detail: `Previous hash mismatch at sequence ${entry.sequence}`,
        };
      }

      // Recompute and verify hash
      const recomputed = this._computeHash(entry);
      if (recomputed !== entry.hash) {
        this.emit('integrity:broken', {
          trailId: this._trailId,
          sequence: entry.sequence,
          expectedHash: recomputed,
          actualHash: entry.hash,
        });

        return {
          valid: false,
          entries: this._chain.length,
          brokenAt: entry.sequence,
          detail: `Hash mismatch at sequence ${entry.sequence}: entry has been tampered with`,
        };
      }

      expectedPreviousHash = entry.hash;
    }

    this.emit('integrity:verified', {
      trailId: this._trailId,
      entries: this._chain.length,
      headHash: this._lastHash,
    });

    return {
      valid: true,
      entries: this._chain.length,
      brokenAt: null,
      detail: `Chain verified: ${this._chain.length} entries, HEAD=${this._lastHash.slice(0, 16)}...`,
    };
  }

  // ─── Query ──────────────────────────────────────────────────────────────────

  /**
   * Query entries by time range.
   * @param {number} startMs - Start timestamp (inclusive)
   * @param {number} endMs   - End timestamp (inclusive)
   * @returns {Array<AuditEntry>}
   */
  queryByTimeRange(startMs, endMs) {
    return this._chain.filter(e => e.timestamp >= startMs && e.timestamp <= endMs);
  }

  /**
   * Query entries by type.
   * @param {string} type - AuditEntryType value
   * @returns {Array<AuditEntry>}
   */
  queryByType(type) {
    const sequences = this._indexByType.get(type);
    if (!sequences) return [];
    return this._chain.filter(e => sequences.has(e.sequence));
  }

  /**
   * Query entries by actor.
   * @param {string} actor
   * @returns {Array<AuditEntry>}
   */
  queryByActor(actor) {
    const sequences = this._indexByActor.get(actor);
    if (!sequences) return [];
    return this._chain.filter(e => sequences.has(e.sequence));
  }

  /**
   * Query entries using a custom predicate.
   * @param {Function} predicate - (entry) => boolean
   * @returns {Array<AuditEntry>}
   */
  query(predicate) {
    return this._chain.filter(predicate);
  }

  /**
   * Get the last N entries.
   * @param {number} n
   * @returns {Array<AuditEntry>}
   */
  tail(n = 10) {
    return this._chain.slice(-n);
  }

  /**
   * Get a single entry by sequence number.
   * @param {number} seq
   * @returns {AuditEntry|null}
   */
  getBySequence(seq) {
    return this._chain.find(e => e.sequence === seq) || null;
  }

  // ─── Export ─────────────────────────────────────────────────────────────────

  /**
   * Export the full active chain as a JSON-serializable object.
   * @returns {object}
   */
  export() {
    return {
      trailId: this._trailId,
      exportedAt: new Date().toISOString(),
      genesisHash: GENESIS_HASH,
      headHash: this._lastHash,
      totalSequence: this._sequence,
      activeEntries: this._chain.length,
      archivedSegments: this._archives.length,
      chain: this._chain.map(e => ({ ...e })),
    };
  }

  /**
   * Export only entries matching a predicate.
   * @param {Function} predicate
   * @returns {object}
   */
  exportFiltered(predicate) {
    const filtered = this._chain.filter(predicate);
    return {
      trailId: this._trailId,
      exportedAt: new Date().toISOString(),
      headHash: this._lastHash,
      filteredEntries: filtered.length,
      totalEntries: this._chain.length,
      entries: filtered.map(e => ({ ...e })),
    };
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  /**
   * Compute the SHA-256 hash for an audit entry.
   * The hash covers: sequence, type, actor, action, target, detail, outcome, timestamp, previousHash
   *
   * @param {AuditEntry} entry
   * @returns {string} hex-encoded SHA-256 hash
   */
  _computeHash(entry) {
    const payload = JSON.stringify({
      sequence: entry.sequence,
      trailId: entry.trailId,
      type: entry.type,
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      detail: entry.detail,
      outcome: entry.outcome,
      timestamp: entry.timestamp,
      previousHash: entry.previousHash,
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Rotate oldest half of the chain into archives.
   */
  _rotate() {
    const splitPoint = Math.floor(this._chain.length / 2);
    const archived = this._chain.splice(0, splitPoint);
    this._archives.push(archived);

    this.emit('chain:rotated', {
      trailId: this._trailId,
      archivedCount: archived.length,
      remainingCount: this._chain.length,
      totalArchives: this._archives.length,
      timestamp: Date.now(),
    });
  }

  /**
   * Add a sequence number to an index map.
   */
  _addToIndex(indexMap, key, sequence) {
    if (!indexMap.has(key)) {
      indexMap.set(key, new Set());
    }
    indexMap.get(key).add(sequence);
  }
}

module.exports = { AuditTrail, AuditEntryType, GENESIS_HASH };
