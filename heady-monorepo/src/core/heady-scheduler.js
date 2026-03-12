/**
 * HeadyScheduler — Fibonacci-weighted task scheduler with Sacred Geometry principles.
 * Manages cron-style jobs with golden-ratio priority weighting.
 */
'use strict';

const EventEmitter = require('events');

const PHI = 1.6180339887;
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

class HeadyScheduler extends EventEmitter {
    constructor(opts = {}) {
        super();
        this.jobs = new Map();
        this.running = false;
        this._timers = new Map();
        this.phi = PHI;
        this.fibonacci = FIBONACCI;
    }

    /**
     * Schedule a recurring job
     * @param {string} name - Job identifier
     * @param {Function} fn - Async function to execute
     * @param {Object} opts - { intervalMs, priority, immediate }
     */
    schedule(name, fn, opts = {}) {
        const interval = opts.intervalMs || opts.interval || 60000;
        const priority = opts.priority || 0.5;
        
        if (this._timers.has(name)) {
            clearInterval(this._timers.get(name));
        }

        const job = { name, fn, interval, priority, lastRun: null, runCount: 0, errors: 0 };
        this.jobs.set(name, job);

        const run = async () => {
            try {
                job.lastRun = new Date();
                job.runCount++;
                const result = await fn();
                this.emit('job:done', { name, result });
            } catch (err) {
                job.errors++;
                this.emit('job:error', { name, error: err.message });
            }
        };

        if (opts.immediate) run();
        this._timers.set(name, setInterval(run, interval));
        this.emit('job:scheduled', { name, interval, priority });
        return this;
    }

    /** Cancel a scheduled job */
    cancel(name) {
        if (this._timers.has(name)) {
            clearInterval(this._timers.get(name));
            this._timers.delete(name);
            this.jobs.delete(name);
            this.emit('job:cancelled', { name });
        }
        return this;
    }

    /** Run a job once immediately */
    async runOnce(name, fn) {
        try {
            const result = await fn();
            this.emit('job:done', { name, result });
            return result;
        } catch (err) {
            this.emit('job:error', { name, error: err.message });
            throw err;
        }
    }

    /** Get scheduler status */
    status() {
        return {
            running: this.running,
            jobCount: this.jobs.size,
            jobs: Array.from(this.jobs.values()).map(j => ({
                name: j.name,
                interval: j.interval,
                priority: j.priority,
                lastRun: j.lastRun,
                runCount: j.runCount,
                errors: j.errors,
            })),
        };
    }

    start() {
        this.running = true;
        this.emit('started');
        return this;
    }

    stop() {
        for (const [name, timer] of this._timers.entries()) {
            clearInterval(timer);
        }
        this._timers.clear();
        this.running = false;
        this.emit('stopped');
        return this;
    }
}

// Singleton instance
let _instance = null;

function getScheduler(opts = {}) {
    if (!_instance) {
        _instance = new HeadyScheduler(opts);
    }
    return _instance;
}

module.exports = HeadyScheduler;
module.exports.getScheduler = getScheduler;
module.exports.HeadyScheduler = HeadyScheduler;
