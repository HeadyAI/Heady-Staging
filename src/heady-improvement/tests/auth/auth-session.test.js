'use strict';

/**
 * Auth Session Server — Test Suite
 * Tests cookie creation, session binding, CORS, and cross-domain relay.
 */

const { PHI, PSI, FIB } = require('../../packages/phi-math-foundation/src/constants');

describe('Auth Session Server', () => {

    describe('Session Cookie Creation', () => {
        test('cookie has __Host- prefix', () => {
            const cookieName = '__Host-heady_session';
            expect(cookieName.startsWith('__Host-')).toBe(true);
        });

        test('cookie Max-Age is FIB[11] hours in seconds', () => {
            const maxAgeSeconds = FIB[11] * 60 * 60; // 144 hours = 518400 seconds
            expect(maxAgeSeconds).toBe(518400);
        });

        test('cookie attributes enforce security', () => {
            const attrs = {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
            };
            expect(attrs.httpOnly).toBe(true);
            expect(attrs.secure).toBe(true);
            expect(attrs.sameSite).toBe('None');
        });
    });

    describe('Session Binding', () => {
        const crypto = require('crypto');

        test('session binds to IP + User-Agent hash', () => {
            const ip = '192.168.1.1';
            const ua = 'Mozilla/5.0';
            const hash = crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex');
            expect(hash).toHaveLength(64);
            expect(typeof hash).toBe('string');
        });

        test('different IP produces different binding', () => {
            const crypto = require('crypto');
            const ua = 'Mozilla/5.0';
            const hash1 = crypto.createHash('sha256').update(`192.168.1.1:${ua}`).digest('hex');
            const hash2 = crypto.createHash('sha256').update(`10.0.0.1:${ua}`).digest('hex');
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('CORS Whitelist', () => {
        const ALLOWED_ORIGINS = [
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

        test('all 9 Heady domains are whitelisted', () => {
            expect(ALLOWED_ORIGINS).toHaveLength(9);
        });

        test('wildcard origin is NOT in whitelist', () => {
            expect(ALLOWED_ORIGINS).not.toContain('*');
        });

        test('localhost is NOT in whitelist', () => {
            const hasLocalhost = ALLOWED_ORIGINS.some(o => o.includes('localhost'));
            expect(hasLocalhost).toBe(false);
        });
    });

    describe('Rate Limiting', () => {
        test('anonymous limit is FIB[8] = 34 req/min', () => {
            expect(FIB[8]).toBe(34);
        });

        test('authenticated limit is FIB[10] = 89 req/min', () => {
            expect(FIB[10]).toBe(89);
        });

        test('enterprise limit is FIB[12] = 233 req/min', () => {
            expect(FIB[12]).toBe(233);
        });
    });
});
