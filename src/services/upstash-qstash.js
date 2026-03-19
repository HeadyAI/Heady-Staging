/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * Upstash QStash Client — Durable Task Dispatch
 *
 * v9.0 Blueprint §1: QStash handles HTTP-based task dispatch for
 * cross-service orchestration with automatic retries, DLQ, and CRON.
 * Retries are free and don't count toward message quotas.
 *
 * Set QSTASH_TOKEN in env (from Upstash Console → QStash → Tokens).
 */

'use strict';

const { getLogger } = require('./structured-logger');
const logger = getLogger('upstash-qstash');

const QSTASH_URL = 'https://qstash.upstash.io/v2';
const QSTASH_TOKEN = process.env.QSTASH_TOKEN || '';
const isConfigured = !!QSTASH_TOKEN;

class QStashClient {
    constructor(token = QSTASH_TOKEN) {
        this.token = token;
        this._stats = { published: 0, errors: 0 };
    }

    async _request(path, method = 'POST', body = null, extraHeaders = {}) {
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...extraHeaders,
        };

        const res = await fetch(`${QSTASH_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            const text = await res.text();
            this._stats.errors++;
            throw new Error(`QStash ${res.status}: ${text}`);
        }

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return res.json();
        }
        return res.text();
    }

    /**
     * Publish a message to a destination URL.
     * QStash will deliver it with automatic retries.
     *
     * @param {string} destination - Target URL (Cloud Run, Worker, etc.)
     * @param {object} body - JSON payload
     * @param {object} [opts] - Options
     * @param {number} [opts.retries=3] - Max retry count
     * @param {number} [opts.delaySec] - Delay before first delivery
     * @param {string} [opts.deduplicationId] - Prevent duplicate messages
     * @param {string} [opts.callbackUrl] - URL to call after delivery
     * @param {string} [opts.failureCallbackUrl] - URL to call on final failure
     */
    async publish(destination, body, opts = {}) {
        const headers = {};

        if (opts.retries !== undefined) {
            headers['Upstash-Retries'] = String(opts.retries);
        }
        if (opts.delaySec) {
            headers['Upstash-Delay'] = `${opts.delaySec}s`;
        }
        if (opts.deduplicationId) {
            headers['Upstash-Deduplication-Id'] = opts.deduplicationId;
        }
        if (opts.callbackUrl) {
            headers['Upstash-Callback'] = opts.callbackUrl;
        }
        if (opts.failureCallbackUrl) {
            headers['Upstash-Failure-Callback'] = opts.failureCallbackUrl;
        }

        const result = await this._request(
            `/publish/${encodeURIComponent(destination)}`,
            'POST',
            body,
            headers
        );

        this._stats.published++;
        logger.info('QStash message published', { destination, messageId: result.messageId });
        return result;
    }

    /**
     * Publish a message to a QStash topic (fan-out).
     */
    async publishToTopic(topicName, body, opts = {}) {
        return this.publish(`https://qstash.upstash.io/v2/topics/${topicName}`, body, opts);
    }

    /**
     * Schedule a recurring CRON job.
     *
     * @param {string} destination - Target URL
     * @param {string} cron - CRON expression (e.g., "0/5 * * * *")
     * @param {object} body - JSON payload
     */
    async schedule(destination, cron, body) {
        return this._request(
            `/schedules/${encodeURIComponent(destination)}`,
            'POST',
            body,
            { 'Upstash-Cron': cron }
        );
    }

    /**
     * List active schedules.
     */
    async listSchedules() {
        return this._request('/schedules', 'GET');
    }

    /**
     * Delete a schedule by ID.
     */
    async deleteSchedule(scheduleId) {
        return this._request(`/schedules/${scheduleId}`, 'DELETE');
    }

    /**
     * Get message delivery status.
     */
    async getEvents(opts = {}) {
        const params = new URLSearchParams();
        if (opts.cursor) params.set('cursor', opts.cursor);
        const qs = params.toString();
        return this._request(`/events${qs ? `?${qs}` : ''}`, 'GET');
    }

    /**
     * Dispatch a pipeline stage task to Cloud Run.
     * Convenience method for the 22-stage pipeline.
     *
     * @param {string} stage - Stage name (e.g., "extract", "transform")
     * @param {object} payload - Task payload
     * @param {string} [baseUrl] - Cloud Run service base URL
     */
    async dispatchPipelineTask(stage, payload, baseUrl = process.env.CLOUD_RUN_URL) {
        if (!baseUrl) throw new Error('CLOUD_RUN_URL not configured for pipeline dispatch');

        return this.publish(`${baseUrl}/api/pipeline/${stage}`, {
            stage,
            payload,
            dispatchedAt: new Date().toISOString(),
            source: 'qstash',
        }, {
            retries: 3,
            callbackUrl: `${baseUrl}/api/pipeline/callback`,
            failureCallbackUrl: `${baseUrl}/api/pipeline/dlq`,
        });
    }

    getStats() {
        return { ...this._stats, configured: isConfigured };
    }
}

// ── Singleton ───────────────────────────────────────────────
let _instance = null;

function getQStashClient() {
    if (_instance) return _instance;

    if (!isConfigured) {
        logger.warn('QStash not configured (set QSTASH_TOKEN). Durable task dispatch unavailable.');
        return null;
    }

    _instance = new QStashClient();
    logger.info('QStash client initialized');
    return _instance;
}

module.exports = {
    QStashClient,
    getQStashClient,
    isConfigured,
};
