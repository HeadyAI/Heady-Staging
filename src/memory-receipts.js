/**
 * ═══ Memory Receipts — SPEC-3 ═══
 *
 * Every knowledge vault operation emits a receipt:
 * stored vs dropped, reason codes, references to artifacts.
 */

const crypto = require("crypto");

class MemoryReceipts {
    constructor(opts = {}) {
        this.receipts = [];
        this.maxReceipts = opts.maxReceipts || 5000;
        this.stats = { ingested: 0, embedded: 0, stored: 0, dropped: 0 };
    }

    // ─── Emit a receipt ──────────────────────────────────────────
    emit(receipt) {
        const r = {
            id: crypto.randomUUID(),
            operation: receipt.operation || "UNKNOWN",  // INGEST | EMBED | STORE | DROP
            source: receipt.source || "unknown",
            sourceId: receipt.sourceId || null,
            documentId: receipt.documentId || null,
            stored: receipt.stored !== false,
            reason: receipt.reason || null,
            contentHash: receipt.contentHash || null,
            details: receipt.details || {},
            ts: new Date().toISOString(),
        };

        this.receipts.push(r);
        if (this.receipts.length > this.maxReceipts) this.receipts.shift();

        // Update stats
        if (r.operation === "INGEST") this.stats.ingested++;
        if (r.operation === "EMBED") this.stats.embedded++;
        if (r.stored) this.stats.stored++;
        if (!r.stored) this.stats.dropped++;

        return r;
    }

    // ─── Convenience methods ─────────────────────────────────────
    ingest(source, sourceId, opts = {}) {
        return this.emit({ operation: "INGEST", source, sourceId, stored: true, ...opts });
    }

    embed(documentId, provider, model, opts = {}) {
        return this.emit({
            operation: "EMBED",
            documentId,
            stored: true,
            details: { provider, model, ...opts.details },
            ...opts,
        });
    }

    store(source, sourceId, documentId, opts = {}) {
        return this.emit({ operation: "STORE", source, sourceId, documentId, stored: true, ...opts });
    }

    drop(source, sourceId, reason, opts = {}) {
        return this.emit({ operation: "DROP", source, sourceId, stored: false, reason, ...opts });
    }

    // ─── Query ───────────────────────────────────────────────────
    getReceipts(filter = {}, limit = 50) {
        let results = this.receipts;
        if (filter.operation) results = results.filter(r => r.operation === filter.operation);
        if (filter.source) results = results.filter(r => r.source === filter.source);
        if (filter.stored !== undefined) results = results.filter(r => r.stored === filter.stored);
        return results.slice(-limit);
    }

    getStats() {
        return {
            ...this.stats,
            total: this.receipts.length,
            storedRate: this.stats.stored / Math.max(1, this.stats.stored + this.stats.dropped),
        };
    }
}

module.exports = MemoryReceipts;
