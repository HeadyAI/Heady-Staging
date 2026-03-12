/**
 * ∞ Heady™ Server — Custom Express Wrapper + HeadyWebSocket
 * © 2026 Heady™Systems Inc. — PROPRIETARY AND CONFIDENTIAL
 *
 * Custom Express application factory with Sacred Geometry middleware hooks
 * and a HeadyWebSocket wrapper around the ws library.
 *
 * Usage:
 *   const createApp = require('./src/core/heady-server');
 *   // or (compat):
 *   const express = require('./src/core/heady-server');
 *   const app = express();
 *
 *   const { HeadyWebSocket } = require('./src/core/heady-server');
 *   const wss = new HeadyWebSocket.Server({ noServer: true });
 */

'use strict';

// ─── PHI Sacred Geometry Constants ─────────────────────────────────────────
const PHI = 1.6180339887;
// Fibonacci series: 34% Hot, 21% Warm, 13% Cold, 8% Reserve, 5% Governance
const FIBONACCI_POOLS = { hot: 34, warm: 21, cold: 13, reserve: 8, governance: 5 };

// ─── Express Setup ─────────────────────────────────────────────────────────
let express;
try {
    express = require('express');
} catch {
    // Fallback minimal express-like object if not installed yet
    express = () => {
        const handlers = [];
        const app = {
            use: (...args) => { handlers.push(args); return app; },
            get: () => app,
            post: () => app,
            put: () => app,
            delete: () => app,
            patch: () => app,
            set: () => app,
            listen: (port, host, cb) => { if (cb) cb(); return { close: () => {} }; },
            _handlers: handlers,
        };
        return app;
    };
    express.json = () => (req, res, next) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try { req.body = JSON.parse(body); } catch { req.body = {}; }
            next();
        });
    };
    express.urlencoded = () => (req, res, next) => next();
    express.static = () => (req, res, next) => next();
    express.Router = () => {
        const r = { use: () => r, get: () => r, post: () => r, put: () => r, delete: () => r };
        return r;
    };
}

// ─── Sacred Geometry Middleware Hooks ──────────────────────────────────────

/**
 * Request timing middleware using φ-derived thresholds.
 * Classifies requests by latency tier (Hot/Warm/Cold/Reserve/Governance).
 */
function sacredTimingMiddleware(opts = {}) {
    const thresholds = {
        hot: opts.hotMs || Math.round(PHI * 100),          // ~162ms
        warm: opts.warmMs || Math.round(PHI ** 2 * 100),   // ~262ms
        cold: opts.coldMs || Math.round(PHI ** 3 * 100),   // ~424ms
        reserve: opts.reserveMs || Math.round(PHI ** 4 * 100), // ~685ms
    };

    return function headySacredTiming(req, res, next) {
        const startHrTime = process.hrtime.bigint();
        res.setHeader('X-Heady-Sacred', 'φ=1.618');

        const onFinish = () => {
            const durationNs = Number(process.hrtime.bigint() - startHrTime);
            const durationMs = durationNs / 1_000_000;

            let tier;
            if (durationMs <= thresholds.hot) tier = 'hot';
            else if (durationMs <= thresholds.warm) tier = 'warm';
            else if (durationMs <= thresholds.cold) tier = 'cold';
            else if (durationMs <= thresholds.reserve) tier = 'reserve';
            else tier = 'governance';

            res.setHeader('X-Heady-Latency-Tier', tier);
            res.setHeader('X-Heady-Latency-Ms', durationMs.toFixed(2));

            if (req._headyTimingCb) {
                req._headyTimingCb({ durationMs, tier, path: req.path, method: req.method });
            }
        };

        res.on('finish', onFinish);
        res.on('close', onFinish);
        next();
    };
}

/**
 * Request ID middleware — assigns a unique request ID for distributed tracing.
 */
function requestIdMiddleware() {
    const { randomUUID } = require('crypto');
    return function headyRequestId(req, res, next) {
        req.id = req.headers['x-request-id'] || randomUUID();
        res.setHeader('X-Request-ID', req.id);
        next();
    };
}

/**
 * Heady™ signature middleware — adds platform identification headers.
 */
function headySignatureMiddleware(version = '3.1.0') {
    return function headySignature(req, res, next) {
        res.setHeader('X-Heady-Platform', 'HeadyMe/3.x');
        res.setHeader('X-Heady-Version', version);
        res.setHeader('X-Heady-Phi', PHI.toFixed(10));
        next();
    };
}

// ─── HeadyExpress — Express factory with Heady™ defaults ────────────────────

/**
 * Creates a pre-configured Express application with Heady™ defaults.
 * Includes Sacred Geometry middleware, request IDs, and Heady™ headers.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.json=true] - Enable JSON body parser
 * @param {boolean} [opts.urlencoded=true] - Enable URL-encoded body parser
 * @param {boolean} [opts.sacredTiming=true] - Enable Sacred Geometry timing
 * @param {boolean} [opts.requestId=true] - Enable request ID middleware
 * @param {boolean} [opts.headySignature=true] - Enable Heady™ headers
 * @param {string} [opts.version='3.1.0'] - Platform version
 * @returns {Express.Application}
 */
function createApp(opts = {}) {
    const {
        json = true,
        urlencoded = true,
        sacredTiming = true,
        requestId = true,
        headySignature = true,
        version = process.env.npm_package_version || '3.1.0',
        jsonLimit = process.env.HEADY_JSON_LIMIT || '50mb',
    } = opts;

    const app = express();

    if (headySignature) {
        app.use(headySignatureMiddleware(version));
    }

    if (requestId) {
        app.use(requestIdMiddleware());
    }

    if (sacredTiming) {
        app.use(sacredTimingMiddleware());
    }

    if (json) {
        app.use(express.json({ limit: jsonLimit, strict: false }));
    }

    if (urlencoded) {
        app.use(express.urlencoded({ extended: true, limit: jsonLimit }));
    }

    // Attach Sacred Geometry metadata
    app._heady = {
        phi: PHI,
        fibonacci: FIBONACCI_POOLS,
        version,
        startedAt: Date.now(),
    };

    return app;
}

// ─── HeadyWebSocket — ws wrapper with Heady™ extensions ─────────────────────

let ws;
try {
    ws = require('ws');
} catch {
    // Minimal stub if ws not installed
    ws = {
        Server: class MinimalWSServer {
            constructor() { this._handlers = {}; }
            on(event, handler) { this._handlers[event] = handler; return this; }
            emit(event, ...args) { if (this._handlers[event]) this._handlers[event](...args); }
            handleUpgrade(req, socket, head, cb) { socket.destroy(); }
            close(cb) { if (cb) cb(); }
        },
        WebSocket: class MinimalWS {
            constructor() { this.readyState = 3; }
            send() {}
            close() {}
            on() { return this; }
        },
        OPEN: 1,
        CLOSED: 3,
    };
}

/**
 * HeadyWebSocket — Enhanced ws.WebSocket with health tracking and
 * Sacred Geometry reconnection intervals.
 */
class HeadyWebSocket {
    constructor(url, protocols, options = {}) {
        this._ws = url ? new ws.WebSocket(url, protocols, options) : null;
        this._reconnectCount = 0;
        this._reconnectMax = options.reconnectMax || 8;
        this._baseReconnectMs = options.baseReconnectMs || 1000;
        this._heartbeatInterval = null;
        this._heartbeatMs = options.heartbeatMs || Math.round(PHI ** 5 * 1000); // ~11s
    }

    /**
     * Start heartbeat pings at φ^5 intervals (~11s).
     */
    startHeartbeat() {
        if (this._heartbeatInterval) return;
        this._heartbeatInterval = setInterval(() => {
            if (this._ws && this._ws.readyState === ws.OPEN) {
                this._ws.ping();
            }
        }, this._heartbeatMs);
        if (this._heartbeatInterval.unref) this._heartbeatInterval.unref();
    }

    stopHeartbeat() {
        if (this._heartbeatInterval) {
            clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = null;
        }
    }

    /**
     * Calculate reconnection delay using φ-backoff.
     * @param {number} attempt - Retry attempt number (0-indexed)
     */
    reconnectDelayMs(attempt) {
        return Math.min(
            Math.round(this._baseReconnectMs * Math.pow(PHI, attempt)),
            30000
        );
    }

    get readyState() {
        return this._ws ? this._ws.readyState : ws.WebSocket.CLOSED;
    }

    send(data, opts, cb) {
        if (this._ws) return this._ws.send(data, opts, cb);
    }

    close(code, reason) {
        this.stopHeartbeat();
        if (this._ws) this._ws.close(code, reason);
    }

    on(event, handler) {
        if (this._ws) this._ws.on(event, handler);
        return this;
    }

    off(event, handler) {
        if (this._ws) this._ws.off(event, handler);
        return this;
    }
}

// Expose Server class on HeadyWebSocket (mirrors ws.WebSocket.Server pattern)
HeadyWebSocket.Server = class HeadyWSServer extends ws.Server {
    constructor(options, callback) {
        super(options, callback);
        this._connectionCount = 0;
        this._phi = PHI;
    }

    get connectionCount() { return this._connectionCount; }
};

// Expose constants
HeadyWebSocket.OPEN = ws.OPEN || 1;
HeadyWebSocket.CLOSING = ws.CLOSING || 2;
HeadyWebSocket.CLOSED = ws.CLOSED || 3;
HeadyWebSocket.CONNECTING = ws.CONNECTING || 0;

// ─── Exports ───────────────────────────────────────────────────────────────

// Default export is the createApp factory (express-compatible)
module.exports = createApp;

// Named exports
module.exports.createApp = createApp;
module.exports.HeadyWebSocket = HeadyWebSocket;
module.exports.sacredTimingMiddleware = sacredTimingMiddleware;
module.exports.requestIdMiddleware = requestIdMiddleware;
module.exports.headySignatureMiddleware = headySignatureMiddleware;
module.exports.PHI = PHI;
module.exports.FIBONACCI_POOLS = FIBONACCI_POOLS;

// Expose express internals for middleware composition
module.exports.json = express.json ? express.json.bind(express) : () => (req, res, next) => next();
module.exports.urlencoded = express.urlencoded ? express.urlencoded.bind(express) : () => (req, res, next) => next();
module.exports.static = express.static ? express.static.bind(express) : () => (req, res, next) => next();
module.exports.Router = express.Router ? express.Router.bind(express) : () => {
    const r = {};
    ['use','get','post','put','delete','patch'].forEach(m => { r[m] = (...a) => r; });
    return r;
};
