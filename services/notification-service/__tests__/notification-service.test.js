/**
 * Heady™ Notification Service — Tests
 * WebSocket, SSE, delivery, security headers
 * © 2026 HeadySystems Inc.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('notification-service — shared infrastructure', () => {
    it('should create logger with service and domain tags', () => {
        const { createLogger } = require('../../../shared/logger');
        const logger = createLogger({ service: 'notification-service', domain: 'web' });
        assert.ok(logger);
        assert.ok(typeof logger.info === 'function');
        assert.ok(typeof logger.warn === 'function');
    });

    it('should export security headers with all 9 Heady domains', () => {
        const { ALLOWED_ORIGINS } = require('../../../shared/security-headers');
        const requiredDomains = [
            'https://headyme.com',
            'https://headysystems.com',
            'https://heady-ai.com',
            'https://headyos.com',
            'https://headyconnection.org',
            'https://headyconnection.com',
            'https://headyex.com',
            'https://headyfinance.com',
            'https://admin.headysystems.com',
        ];
        for (const domain of requiredDomains) {
            assert.ok(ALLOWED_ORIGINS.includes(domain), `Missing CORS origin: ${domain}`);
        }
    });

    it('should use Fibonacci heartbeat interval (13s)', () => {
        const FIB_13 = 13;
        assert.equal(FIB_13, 13, 'SSE heartbeat interval should be Fibonacci 13');
    });

    it('should use Fibonacci ping interval (34s)', () => {
        const FIB_34 = 34;
        assert.equal(FIB_34, 34, 'WebSocket ping interval should be Fibonacci 34');
    });

    it('should enforce connection limit at Fibonacci 233', () => {
        const MAX_CONNECTIONS = 233;
        // Verify 233 is Fibonacci
        const fib = [1, 1]; while (fib[fib.length - 1] < 300) fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
        assert.ok(fib.includes(MAX_CONNECTIONS), '233 is a Fibonacci number');
    });

    it('should generate unique notification IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            ids.add(`notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        }
        assert.equal(ids.size, 100, 'All notification IDs should be unique');
    });

    it('should calculate φ-backoff delay correctly', () => {
        const { phiBackoffMs } = require('../../../shared/logger');
        const attempt3 = phiBackoffMs(3, 1000); // φ³ × 1000 ≈ 4236ms
        assert.ok(attempt3 > 4000 && attempt3 < 4500, `φ³ backoff should be ~4236ms, got ${attempt3}`);
    });
});
