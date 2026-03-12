/**
 * Heady™ Neon — Postgres Pool Provider
 *
 * Wraps the pg (node-postgres) Pool with Neon-specific configuration.
 * Falls back to the @neondatabase/serverless driver if available.
 * © 2026 Heady™Systems Inc.
 */

'use strict';

let Pool = null;
let Client = null;

// Try @neondatabase/serverless first (optimised for Neon's HTTP endpoint)
try {
    const neon = require('@neondatabase/serverless');
    Pool = neon.Pool || neon.NeonPool;
    Client = neon.Client || neon.NeonClient;
} catch (_e) {}

// Fall back to standard pg driver
if (!Pool) {
    try {
        const pg = require('pg');
        Pool = pg.Pool;
        Client = pg.Client;
    } catch (_e) {}
}

// Last resort: provide a no-op Pool that surfaces clear errors
if (!Pool) {
    class StubPool {
        constructor() {
            this._warn();
        }

        _warn() {
            console.warn(
                '[heady-neon] Neither @neondatabase/serverless nor pg is installed. ' +
                'Database operations will fail. Run: npm install pg'
            );
        }

        async connect() {
            throw new Error('[heady-neon] No Postgres driver installed (pg or @neondatabase/serverless).');
        }

        async query() {
            throw new Error('[heady-neon] No Postgres driver installed (pg or @neondatabase/serverless).');
        }

        async end() {}
    }

    class StubClient extends StubPool {}

    Pool = StubPool;
    Client = StubClient;
}

module.exports = { Pool, Client };
