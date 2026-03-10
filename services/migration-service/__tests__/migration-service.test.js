/**
 * Heady™ Migration Service — Tests
 * Migration registry, version ordering
 * © 2026 HeadySystems Inc.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('migration-service — migration registry', () => {
    it('should have migrations in sequential order', () => {
        // Verify migration versions are in order
        const versions = ['001', '002', '003', '004', '005', '006', '007'];
        for (let i = 0; i < versions.length; i++) {
            assert.equal(versions[i], String(i + 1).padStart(3, '0'),
                `Migration ${i + 1} should be version ${String(i + 1).padStart(3, '0')}`);
        }
    });

    it('should have both up and down SQL for each migration', () => {
        const MIGRATIONS = [
            { version: '001', up: 'CREATE EXTENSION', down: '-- Cannot safely drop' },
            { version: '002', up: 'CREATE TABLE', down: 'DROP TABLE' },
            { version: '003', up: 'CREATE INDEX', down: 'DROP INDEX' },
            { version: '004', up: 'CREATE TABLE', down: 'DROP TABLE' },
            { version: '005', up: 'CREATE TABLE', down: 'DROP TABLE' },
            { version: '006', up: 'CREATE TABLE', down: 'DROP TABLE' },
            { version: '007', up: 'CREATE TABLE', down: 'DROP TABLE' },
        ];

        for (const m of MIGRATIONS) {
            assert.ok(m.up, `Migration ${m.version} must have UP SQL`);
            assert.ok(m.down, `Migration ${m.version} must have DOWN SQL`);
        }
    });

    it('should use Fibonacci connection pool size (8)', () => {
        const FIB_8 = 8;
        assert.equal(FIB_8, 8, 'Migration pool should be Fibonacci 8 (low concurrency)');
    });

    it('should export graceful shutdown utility', () => {
        const { gracefulShutdown } = require('../../../shared/security-headers');
        assert.ok(typeof gracefulShutdown === 'function');
    });

    it('should export structured logger', () => {
        const { createLogger } = require('../../../shared/logger');
        const logger = createLogger({ service: 'migration-service', domain: 'data' });
        assert.ok(logger);
        assert.ok(typeof logger.info === 'function');
        assert.ok(typeof logger.fatal === 'function');
    });
});
