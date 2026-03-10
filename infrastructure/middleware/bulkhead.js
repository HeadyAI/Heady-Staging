/**
 * bulkhead.js — Bulkhead Pattern Middleware for Heady™ Services
 * Fibonacci-sized concurrent request pools. φ-scaled queue timeouts.
 * NO priority queuing — all requests have equal standing.
 * © 2024-2026 HeadySystems Inc. 51 Provisional Patents.
 */
'use strict';

const PHI = 1.618033988749895;

export class Bulkhead {
    constructor(config = {}) {
        this.maxConcurrent = config.maxConcurrent || 34; // Fibonacci
        this.maxQueue = config.maxQueue || 55;           // Fibonacci
        this.queueTimeoutMs = config.queueTimeoutMs || Math.round(PHI * PHI * PHI * 1000); // ≈ 4236ms
        this.active = 0;
        this.queue = [];
        this.stats = { accepted: 0, rejected: 0, completed: 0, timedOut: 0 };
    }

    middleware() {
        return (req, res, next) => {
            if (this.active < this.maxConcurrent) {
                this._execute(req, res, next);
            } else if (this.queue.length < this.maxQueue) {
                this._enqueue(req, res, next);
            } else {
                this._reject(req, res);
            }
        };
    }

    _execute(req, res, next) {
        this.active++;
        this.stats.accepted++;
        const done = () => { this.active--; this.stats.completed++; this._dequeue(); };
        res.on('finish', done);
        res.on('close', done);
        next();
    }

    _enqueue(req, res, next) {
        const timer = setTimeout(() => {
            const idx = this.queue.findIndex(q => q.t === timer);
            if (idx !== -1) {
                this.queue.splice(idx, 1);
                this.stats.timedOut++;
                res.status(503).json({ error: 'Bulkhead queue timeout', active: this.active, queued: this.queue.length });
            }
        }, this.queueTimeoutMs);
        this.queue.push({ req, res, next, t: timer });
    }

    _dequeue() {
        if (this.queue.length > 0 && this.active < this.maxConcurrent) {
            const { req, res, next, t } = this.queue.shift();
            clearTimeout(t);
            this._execute(req, res, next);
        }
    }

    _reject(req, res) {
        this.stats.rejected++;
        res.status(429).json({ error: 'Bulkhead full', active: this.active, maxConcurrent: this.maxConcurrent });
    }

    getStats() {
        return { ...this.stats, active: this.active, queued: this.queue.length };
    }
}

export function createBulkhead(config) {
    const b = new Bulkhead(config);
    const mw = b.middleware();
    mw.getStats = () => b.getStats();
    return mw;
}

export default createBulkhead;
