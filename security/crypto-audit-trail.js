// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ Crypto Audit Trail — SHA-256 Chained Hash Tamper Detection
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ═══════════════════════════════════════════════════════════════════════════════

import { PHI, PSI, FIB, sha256 } from '../shared/phi-math-v2.js';

class CryptoAuditTrail {
  #chain;
  #maxChainLength;
  #rotationSize;
  #archives;

  constructor() {
    this.#chain = [];
    this.#maxChainLength = FIB[20];
    this.#rotationSize = FIB[16];
    this.#archives = [];
  }

  async log(actor, action, resource, metadata = {}) {
    const previousHash = this.#chain.length > 0
      ? this.#chain[this.#chain.length - 1].hash
      : '0'.repeat(64);

    const payload = JSON.stringify({ actor, action, resource, metadata, previousHash, timestamp: Date.now() });
    const hash = await sha256(payload);

    const entry = {
      index: this.#chain.length,
      actor, action, resource, metadata,
      previousHash, hash, timestamp: Date.now(),
    };

    this.#chain.push(entry);

    if (this.#chain.length > this.#maxChainLength) {
      this.#archives.push(this.#chain.slice(0, this.#rotationSize));
      this.#chain = this.#chain.slice(this.#rotationSize);
    }

    return { hash, index: entry.index };
  }

  async verify(startIndex = 0, endIndex = null) {
    const end = endIndex || this.#chain.length;
    const results = { valid: true, checked: 0, errors: [] };

    for (let i = Math.max(1, startIndex); i < end; i++) {
      const entry = this.#chain[i];
      const prev = this.#chain[i - 1];

      if (entry.previousHash !== prev.hash) {
        results.valid = false;
        results.errors.push({
          index: i,
          expected: prev.hash,
          found: entry.previousHash,
          type: 'chain_break',
        });
      }

      const payload = JSON.stringify({
        actor: entry.actor, action: entry.action,
        resource: entry.resource, metadata: entry.metadata,
        previousHash: entry.previousHash, timestamp: entry.timestamp,
      });
      const recomputed = await sha256(payload);
      if (recomputed !== entry.hash) {
        results.valid = false;
        results.errors.push({
          index: i, expected: recomputed, found: entry.hash,
          type: 'hash_mismatch',
        });
      }

      results.checked++;
    }

    return results;
  }

  getChain(limit = FIB[8]) { return this.#chain.slice(-limit); }

  async detectTampering() {
    const verification = await this.verify();
    return {
      tampered: !verification.valid,
      chainLength: this.#chain.length,
      errors: verification.errors,
      archivedChains: this.#archives.length,
    };
  }

  exportChain() {
    return {
      chain: this.#chain,
      archives: this.#archives,
      metadata: {
        totalEntries: this.#chain.length + this.#archives.reduce((s, a) => s + a.length, 0),
        currentChainLength: this.#chain.length,
        archivedChains: this.#archives.length,
        exportedAt: Date.now(),
      },
    };
  }
}

export { CryptoAuditTrail };
export default CryptoAuditTrail;
