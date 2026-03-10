/**
 * Heady™ Scheduler Service — φ-Scaled Cron
 * Fibonacci-interval batch jobs with circuit breaker
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */

'use strict';

const express = require('express');
const { createLogger, requestLogger, phiBackoffMs } = require('../../shared/logger');
const { securityHeaders, gracefulShutdown } = require('../../shared/security-headers');

const app = express();
const PORT = process.env.SERVICE_PORT || 3396;
const PHI = 1.618033988749895;
const FIB_5 = 5;
const FIB_89 = 89;

const logger = createLogger({ service: 'scheduler-service', domain: 'orchestration' });

app.use(express.json({ limit: '256kb' }));
app.use(securityHeaders());
app.use(requestLogger(logger));

// Job registry
const jobs = new Map();
const jobHistory = [];

// Fibonacci intervals in seconds for scheduling
const FIB_INTERVALS = {
    '5s': 5, '8s': 8, '13s': 13, '21s': 21, '34s': 34,
    '55s': 55, '89s': 89, '5m': 300, '8m': 480, '13m': 780,
    '21m': 1260, '34m': 2040,
};

class ScheduledJob {
    constructor(name, intervalKey, handler, options = {}) {
        this.name = name;
        this.interval = FIB_INTERVALS[intervalKey] || FIB_89;
        this.handler = handler;
        this.enabled = true;
        this.lastRun = null;
        this.nextRun = Date.now() + this.interval * 1000;
        this.runCount = 0;
        this.failCount = 0;
        this.maxFailures = options.maxFailures || FIB_5;
        this.circuitOpen = false;
        this.timer = null;
    }

    start() {
        this.timer = setInterval(async () => {
            if (!this.enabled || this.circuitOpen) return;

            this.lastRun = new Date().toISOString();
            this.runCount++;

            try {
                await this.handler();
                this.failCount = 0;
                this.nextRun = Date.now() + this.interval * 1000;
                jobHistory.push({ job: this.name, status: 'success', at: this.lastRun });
                // Trim history to Fibonacci 89
                if (jobHistory.length > FIB_89) jobHistory.splice(0, jobHistory.length - FIB_89);
                logger.info({ job: this.name, runCount: this.runCount }, 'Job completed');
            } catch (err) {
                this.failCount++;
                jobHistory.push({ job: this.name, status: 'failed', error: err.message, at: this.lastRun });
                logger.error({ err, job: this.name, failCount: this.failCount }, 'Job failed');

                if (this.failCount >= this.maxFailures) {
                    this.circuitOpen = true;
                    const resetMs = Math.round(PHI * PHI * PHI * this.interval * 1000);
                    logger.warn({ job: this.name, resetMs }, 'Circuit breaker opened');
                    setTimeout(() => {
                        this.circuitOpen = false;
                        this.failCount = 0;
                        logger.info({ job: this.name }, 'Circuit breaker reset');
                    }, resetMs);
                }
            }
        }, this.interval * 1000);

        return this;
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
        this.enabled = false;
    }

    toJSON() {
        return {
            name: this.name, interval: this.interval, enabled: this.enabled,
            lastRun: this.lastRun, nextRun: new Date(this.nextRun).toISOString(),
            runCount: this.runCount, failCount: this.failCount, circuitOpen: this.circuitOpen,
        };
    }
}

// Health check
app.get('/health', (_, res) => res.json({
    status: 'healthy',
    service: 'scheduler-service',
    jobs: jobs.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
}));

// Register a job
app.post('/api/v1/jobs', (req, res) => {
    const { name, interval, endpoint, method = 'POST' } = req.body;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name (string) required' });
    }
    if (!interval || !FIB_INTERVALS[interval]) {
        return res.status(400).json({ error: `interval required, valid: ${Object.keys(FIB_INTERVALS).join(', ')}` });
    }
    if (jobs.has(name)) {
        return res.status(409).json({ error: `Job '${name}' already exists` });
    }

    const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const httpMethod = allowedMethods.includes(String(method).toUpperCase()) ? String(method).toUpperCase() : 'POST';

    const job = new ScheduledJob(name, interval, async () => {
        if (endpoint) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            try {
                const resp = await fetch(endpoint, {
                    method: httpMethod,
                    headers: { 'Content-Type': 'application/json', 'X-Heady-Scheduler': name },
                    signal: controller.signal,
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            } finally {
                clearTimeout(timeoutId);
            }
        }
    });

    jobs.set(name, job);
    job.start();
    logger.info({ job: name, interval }, 'Job registered');
    res.json({ registered: true, job: job.toJSON() });
});

// List all jobs
app.get('/api/v1/jobs', (_, res) => {
    res.json({ jobs: Array.from(jobs.values()).map(j => j.toJSON()) });
});

// Job history (last Fibonacci 89 entries)
app.get('/api/v1/jobs/history', (_, res) => {
    res.json({ history: jobHistory.slice(-FIB_89) });
});

// Delete a job
app.delete('/api/v1/jobs/:name', (req, res) => {
    const job = jobs.get(req.params.name);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    job.stop();
    jobs.delete(req.params.name);
    logger.info({ job: req.params.name }, 'Job deleted');
    res.json({ deleted: true });
});

const srv = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'scheduler-service listening');
});

gracefulShutdown(srv, logger, {});

module.exports = app;
