/**
 * Heady™ Scheduler Service — Tests
 * Job lifecycle, circuit breaker, input validation
 * © 2026 HeadySystems Inc.
 */
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const PORT = 19396;
process.env.SERVICE_PORT = String(PORT);
process.env.NODE_ENV = 'test';

let server;

function makeRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = { method, hostname: 'localhost', port: PORT, path, headers: {} };
        if (body) {
            const payload = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(payload);
        }
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

describe('scheduler-service', () => {
    before(async () => {
        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 500));
        const app = require('../index.js');
        await new Promise(resolve => setTimeout(resolve, 200));
    });

    after(() => {
        // Cleanup any timers
        process.removeAllListeners('SIGTERM');
        process.removeAllListeners('SIGINT');
    });

    it('should respond healthy on /health', async () => {
        const res = await makeRequest('GET', '/health');
        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'healthy');
        assert.equal(res.body.service, 'scheduler-service');
        assert.ok(typeof res.body.uptime === 'number');
        assert.ok(res.body.timestamp);
    });

    it('should include security headers', async () => {
        const res = await makeRequest('GET', '/health');
        assert.ok(res.headers['x-content-type-options'] === 'nosniff');
        assert.ok(res.headers['x-frame-options'] === 'DENY');
    });

    it('should reject job without name', async () => {
        const res = await makeRequest('POST', '/api/v1/jobs', { interval: '13s' });
        assert.equal(res.status, 400);
        assert.ok(res.body.error.includes('name'));
    });

    it('should reject job with invalid interval', async () => {
        const res = await makeRequest('POST', '/api/v1/jobs', { name: 'test-job', interval: '999s' });
        assert.equal(res.status, 400);
        assert.ok(res.body.error.includes('interval'));
    });

    it('should register a valid job', async () => {
        const res = await makeRequest('POST', '/api/v1/jobs', {
            name: 'test-heartbeat',
            interval: '89s',
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.registered, true);
        assert.equal(res.body.job.name, 'test-heartbeat');
        assert.equal(res.body.job.interval, 89);
        assert.equal(res.body.job.enabled, true);
    });

    it('should reject duplicate job name', async () => {
        const res = await makeRequest('POST', '/api/v1/jobs', {
            name: 'test-heartbeat',
            interval: '13s',
        });
        assert.equal(res.status, 409);
    });

    it('should list all jobs', async () => {
        const res = await makeRequest('GET', '/api/v1/jobs');
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body.jobs));
        assert.ok(res.body.jobs.length >= 1);
    });

    it('should return job history', async () => {
        const res = await makeRequest('GET', '/api/v1/jobs/history');
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body.history));
    });

    it('should delete a job', async () => {
        const res = await makeRequest('DELETE', '/api/v1/jobs/test-heartbeat');
        assert.equal(res.status, 200);
        assert.equal(res.body.deleted, true);
    });

    it('should 404 on unknown job deletion', async () => {
        const res = await makeRequest('DELETE', '/api/v1/jobs/nonexistent');
        assert.equal(res.status, 404);
    });

    it('should handle CORS preflight', async () => {
        const res = await makeRequest('OPTIONS', '/health');
        assert.equal(res.status, 204);
    });
});
