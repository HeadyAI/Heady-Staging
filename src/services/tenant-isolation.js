/**
 * Multi-Tenant Isolation Layer — Postgres-Backed Tenant Management
 * for HeadyConnection™ IaaS deployment.
 *
 * Provides per-tenant data isolation via Neon RLS, request context
 * via AsyncLocalStorage, hashed API key auth, quota enforcement,
 * and Stripe metering integration.
 *
 * @module src/services/tenant-isolation
 * @version 2.0.0
 * @author HeadySystems™
 * @license Proprietary — HeadySystems™ & HeadyConnection™
 */

'use strict';

const { EventEmitter } = require('events');
const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// ─── Tier Definitions ───────────────────────────────────────────────
const TIER_CONFIG = {
    developer:  { multiplier: 1,                 rpm: FIB[12],                 features: ['vector_memory', 'basic_search'] },
    starter:    { multiplier: PHI,               rpm: Math.round(FIB[12] * PHI),  features: ['vector_memory', 'basic_search', 'namespaces', 'webhooks'] },
    pro:        { multiplier: PHI * PHI,         rpm: Math.round(FIB[12] * PHI * PHI), features: ['vector_memory', 'basic_search', 'namespaces', 'webhooks', 'batch_ops', 'analytics'] },
    enterprise: { multiplier: PHI * PHI * PHI,   rpm: Math.round(FIB[12] * PHI * PHI * PHI), features: ['all'] },
};

// ─── Tenant Context (AsyncLocalStorage) ─────────────────────────────
class TenantContext {
    constructor() {
        this.storage = new AsyncLocalStorage();
    }

    run(tenantId, callback) {
        return this.storage.run({ tenantId, startedAt: Date.now() }, callback);
    }

    getTenantId() {
        return this.storage.getStore()?.tenantId || null;
    }

    getStore() {
        return this.storage.getStore();
    }
}

// ─── Main Isolation Class ───────────────────────────────────────────
class TenantIsolation {
    constructor(opts = {}) {
        this.context = new TenantContext();
        this.events = new EventEmitter();
        this.db = opts.db || null; // neon-db module injected at init

        // In-memory cache for hot tenants (TTL: 60s)
        this._cache = new Map();
        this._cacheTTL = 60_000;

        // Rate limit windows (in-memory, per-process)
        this._rateWindows = new Map();
    }

    /** Inject the database module (call once at startup) */
    setDatabase(db) {
        this.db = db;
    }

    // ─── Tenant CRUD (Postgres-backed) ──────────────────────────────

    /**
     * Register a new tenant and generate an API key.
     * @returns {{ tenantId, apiKey, keyPrefix, tier }}
     */
    async registerTenant({ companyName, contactEmail, tier = 'developer', stripeCustomerId = null }) {
        if (!this.db) throw new Error('Database not initialized');

        // Insert tenant
        const result = await this.db.query(
            `INSERT INTO tenants (company_name, contact_email, subscription_tier, stripe_customer_id, rate_limit_rpm)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING tenant_id`,
            [companyName, contactEmail, tier, stripeCustomerId, TIER_CONFIG[tier]?.rpm || FIB[12]]
        );

        if (!result.ok || result.rows.length === 0) {
            throw new Error(`Failed to create tenant: ${result.error}`);
        }

        const tenantId = result.rows[0].tenant_id;

        // Generate API key: hc_<32 random hex chars>
        const rawKey = `hc_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.slice(0, 11); // 'hc_' + 8 chars

        await this.db.query(
            `INSERT INTO api_keys (key_hash, tenant_id, key_prefix, label, scopes)
             VALUES ($1, $2, $3, $4, $5)`,
            [keyHash, tenantId, keyPrefix, `${companyName} default key`, ['read', 'write']]
        );

        this.events.emit('tenant:registered', { tenantId, tier, companyName });

        return {
            tenantId,
            apiKey: rawKey,  // Only time the plaintext key is ever exposed
            keyPrefix,
            tier,
            rateLimitRpm: TIER_CONFIG[tier]?.rpm || FIB[12],
        };
    }

    /**
     * Get tenant by ID (cached).
     */
    async getTenant(tenantId) {
        // Check cache
        const cached = this._cache.get(tenantId);
        if (cached && Date.now() - cached._cachedAt < this._cacheTTL) {
            return cached;
        }

        if (!this.db) return null;

        const result = await this.db.query(
            `SELECT tenant_id, company_name, contact_email, subscription_tier,
                    request_count, rate_limit_rpm, is_active, metadata, created_at
             FROM tenants WHERE tenant_id = $1`,
            [tenantId]
        );

        if (!result.ok || result.rows.length === 0) return null;

        const tenant = result.rows[0];
        tenant._cachedAt = Date.now();
        this._cache.set(tenantId, tenant);
        return tenant;
    }

    /**
     * Deactivate a tenant (soft delete).
     */
    async deactivateTenant(tenantId) {
        if (!this.db) return;
        await this.db.query(
            'UPDATE tenants SET is_active = false WHERE tenant_id = $1',
            [tenantId]
        );
        this._cache.delete(tenantId);
        this.events.emit('tenant:deactivated', { tenantId });
    }

    // ─── API Key Auth ───────────────────────────────────────────────

    /**
     * Validate an API key from an Authorization header.
     * @param {string} authHeader — 'Bearer hc_...'
     * @returns {{ ok, tenantId, scopes, tier } | { ok: false }}
     */
    async authenticateRequest(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { ok: false, reason: 'missing_auth' };
        }

        const rawKey = authHeader.slice(7);
        if (!rawKey.startsWith('hc_')) {
            return { ok: false, reason: 'invalid_key_format' };
        }

        if (!this.db) {
            return { ok: false, reason: 'db_unavailable' };
        }

        return this.db.validateApiKey(rawKey);
    }

    // ─── Express Middleware ─────────────────────────────────────────

    /**
     * Auth middleware — validates API key, sets tenant context + RLS.
     */
    middleware() {
        return async (req, res, next) => {
            const auth = await this.authenticateRequest(req.headers.authorization);

            if (!auth.ok) {
                return res.status(401).json({
                    error: 'unauthorized',
                    message: auth.reason === 'missing_auth'
                        ? 'Missing Authorization header. Use: Bearer hc_<your_api_key>'
                        : 'Invalid or expired API key',
                });
            }

            // Set RLS context in the database
            if (this.db) {
                await this.db.setTenantContext(auth.tenantId);
            }

            // Run within AsyncLocalStorage context
            this.context.run(auth.tenantId, () => {
                req.tenantId = auth.tenantId;
                req.tenantTier = auth.tier;
                req.tenantScopes = auth.scopes;
                next();
            });
        };
    }

    /**
     * Rate limiting middleware (per-tenant, in-memory windows).
     */
    rateLimiter() {
        return async (req, res, next) => {
            const tenantId = req.tenantId;
            if (!tenantId) return next();

            const tenant = await this.getTenant(tenantId);
            if (!tenant) return next();

            const now = Date.now();
            const windowKey = tenantId;

            if (!this._rateWindows.has(windowKey) || this._rateWindows.get(windowKey).resetAt < now) {
                this._rateWindows.set(windowKey, { count: 0, resetAt: now + 60_000 });
            }

            const window = this._rateWindows.get(windowKey);
            window.count++;

            const limit = tenant.rate_limit_rpm || FIB[12];

            if (window.count > limit) {
                return res.status(429).json({
                    error: 'rate_limit_exceeded',
                    limit,
                    retryAfter: Math.ceil((window.resetAt - now) / 1000),
                });
            }

            // Meter the request for Stripe billing
            if (this.db) {
                this.db.meterRequest(tenantId, 'api_call').catch(() => {});
            }

            next();
        };
    }

    // ─── Data Isolation Helpers ──────────────────────────────────────

    getRedisPrefix(tenantId) {
        return `heady:t:${tenantId}`;
    }

    getVectorNamespace(tenantId, namespace = 'default') {
        return `${tenantId}:${namespace}`;
    }

    // ─── Health ─────────────────────────────────────────────────────

    health() {
        return {
            service: 'tenant-isolation',
            version: '2.0.0',
            backing: this.db ? 'postgres' : 'none',
            cachedTenants: this._cache.size,
            activeRateWindows: this._rateWindows.size,
            tiers: Object.keys(TIER_CONFIG),
        };
    }
}

module.exports = { TenantIsolation, TenantContext, TIER_CONFIG };
