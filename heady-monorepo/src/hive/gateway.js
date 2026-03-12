/**
 * ∞ Heady™ Hive SDK — Gateway
 *
 * Unified LLM gateway for multi-provider model access.
 * Wraps the Heady™ model bridge with a standardized interface
 * that mirrors the heady-hive-sdk/lib/gateway API.
 *
 * This module serves as the local stub for the heady-hive-sdk package,
 * used when the external SDK is not installed.
 *
 * © 2026 Heady™Systems Inc. All rights reserved.
 */

const path = require('path');

// Try to load the Heady™ model bridge for actual LLM calls
let modelBridge = null;
try {
    modelBridge = require('../core/heady-model-bridge');
} catch (_e) { /* model bridge optional */ }

class HeadyGateway {
    constructor(config = {}) {
        this.config = {
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3,
            defaultModel: config.defaultModel || process.env.HEADY_DEFAULT_MODEL || 'gpt-4o-mini',
            ...config,
        };
        this._requestCount = 0;
        this._errorCount = 0;
    }

    /**
     * Send a chat completion request.
     * @param {Array|string} messages - Messages array or prompt string
     * @param {Object} [options] - Additional options
     * @returns {Promise<Object>} Response object
     */
    async chat(messages, options = {}) {
        this._requestCount++;
        try {
            if (modelBridge && typeof modelBridge.chat === 'function') {
                return await modelBridge.chat(messages, { ...this.config, ...options });
            }
            // Fallback: return a stub response
            const prompt = Array.isArray(messages)
                ? messages.map(m => m.content || m).join('\n')
                : String(messages);
            return {
                ok: true,
                text: `[HeadyGateway stub] Received: ${prompt.slice(0, 100)}`,
                model: this.config.defaultModel,
                provider: 'stub',
                ts: new Date().toISOString(),
            };
        } catch (err) {
            this._errorCount++;
            throw err;
        }
    }

    /**
     * Generate embeddings for text.
     * @param {string} text - Text to embed
     * @param {Object} [options] - Additional options
     * @returns {Promise<number[]>} Embedding vector
     */
    async embed(text, options = {}) {
        this._requestCount++;
        try {
            if (modelBridge && typeof modelBridge.embed === 'function') {
                return await modelBridge.embed(text, options);
            }
            // Fallback: return zero vector
            const dims = options.dims || 1536;
            return Array(dims).fill(0).map(() => Math.random() * 0.01);
        } catch (err) {
            this._errorCount++;
            throw err;
        }
    }

    /**
     * Get gateway health and stats.
     * @returns {Object}
     */
    getStats() {
        return {
            requests: this._requestCount,
            errors: this._errorCount,
            model: this.config.defaultModel,
            hasBridge: !!modelBridge,
            ts: new Date().toISOString(),
        };
    }

    /**
     * Stream a chat completion (returns async generator).
     * @param {Array|string} messages
     * @param {Object} [options]
     */
    async *stream(messages, options = {}) {
        const response = await this.chat(messages, options);
        yield response.text || '';
    }
}

// Singleton instance
let _instance = null;
function getGateway(config) {
    if (!_instance) _instance = new HeadyGateway(config);
    return _instance;
}

module.exports = HeadyGateway;
module.exports.HeadyGateway = HeadyGateway;
module.exports.getGateway = getGateway;
module.exports.default = HeadyGateway;
