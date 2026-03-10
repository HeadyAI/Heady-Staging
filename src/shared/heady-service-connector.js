const pino = require('pino');
const logger = pino();
/**
 * Heady™ Service Connector — Dynamic Service Discovery & Connection
 * 
 * Automatically discovers, health-checks, and connects to all Heady™ services.
 * Used by VS Code extension, Chrome extension, SDK, and standalone scripts.
 *
 * Features:
 *   - Auto-discovers available services via registry endpoint
 *   - Health-checks each service before routing
 *   - Fallback chain: manager → edge → MCP direct
 *   - Caches healthy endpoints for fast reconnection
 *   - Exposes unified API for chat, MCP tools, memory, and buddy
 *
 * Usage:
 *   const connector = new HeadyServiceConnector({ apiKey: 'hdy_...' });
 *   await connector.discover();
 *   const reply = await connector.chat('Explain quantum computing');
 *   const tools = await connector.listTools();
 *   const result = await connector.callTool('memory.store', { ... });
 *
 * @module heady-service-connector
 * @version 3.2.3
 * @author HeadySystems™
 * @license Proprietary
 *
 * ⚡ Made with 💜 by Heady™Systems™ & HeadyConnection™
 */

'use strict';

const PHI = 1.618033988749895;

// ─── Default Service Endpoints ────────────────────────────────────

const DEFAULT_SERVICES = {
    manager: {
        name: 'Heady™ Manager',
        url: 'https://manager.headysystems.com',
        healthPath: '/api/health',
        chatPath: '/api/v1/chat/completions',
        mcpPath: '/api/mcp',
        buddyPath: '/api/buddy/output',
        role: 'primary',
    },
    edge: {
        name: 'Heady™ Edge',
        url: 'https://heady.headyme.com',
        healthPath: '/api/health',
        chatPath: '/api/v1/chat/completions',
        role: 'edge',
    },
    mcp: {
        name: 'Heady™ MCP',
        url: 'https://mcp.headymcp.com',
        healthPath: '/health',
        mcpPath: '/',
        role: 'mcp',
    },
    api: {
        name: 'Heady™ API',
        url: 'https://api.headysystems.com',
        healthPath: '/api/health',
        chatPath: '/api/v1/chat/completions',
        role: 'api',
    },
};

const MODELS = [
    { id: 'heady-flash', name: 'Heady Flash', speed: 'fast', tier: 'free', emoji: '⚡' },
    { id: 'heady-edge', name: 'Heady™ Edge', speed: 'ultra', tier: 'free', emoji: '🌐' },
    { id: 'heady-buddy', name: 'Heady™ Buddy', speed: 'medium', tier: 'pro', emoji: '🤝' },
    { id: 'heady-reason', name: 'Heady Reason', speed: 'slow', tier: 'premium', emoji: '🧠' },
    { id: 'heady-battle-v1', name: 'Heady™ Battle', speed: 'slow', tier: 'premium', emoji: '🏆' },
];

// ─── Service Connector Class ──────────────────────────────────────

class HeadyServiceConnector {
    constructor(options = {}) {
        this.apiKey = options.apiKey || '';
        this.model = options.model || 'heady-flash';
        this.timeout = options.timeout || 15000;
        this.services = { ...DEFAULT_SERVICES };
        this.healthCache = new Map();
        this.preferredService = null;
        this.startTime = Date.now();
    }

    // ─── Discovery ────────────────────────────────────────────────

    /**
     * Discover available services by health-checking all known endpoints.
     * Sets preferredService to the fastest healthy endpoint.
     */
    async discover() {
        const results = [];

        for (const [key, svc] of Object.entries(this.services)) {
            const start = Date.now();
            try {
                const response = await this._fetch(`${svc.url}${svc.healthPath}`, { timeout: 4236 }); // φ³ × 1000
                const data = await response.json();
                const latencyMs = Date.now() - start;
                results.push({
                    key,
                    ...svc,
                    status: data.status || 'healthy',
                    latencyMs,
                    version: data.version,
                    healthy: true,
                });
                this.healthCache.set(key, { healthy: true, latencyMs, checkedAt: Date.now() });
            } catch (err) {
                results.push({
                    key,
                    ...svc,
                    status: 'unreachable',
                    error: err.message,
                    healthy: false,
                });
                this.healthCache.set(key, { healthy: false, checkedAt: Date.now() });
            }
        }

        // Pick fastest healthy service as preferred
        const healthy = results.filter(r => r.healthy).sort((a, b) => a.latencyMs - b.latencyMs);
        this.preferredService = healthy[0]?.key || 'manager';

        return {
            services: results,
            preferred: this.preferredService,
            healthyCount: healthy.length,
            totalCount: results.length,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get current connection status for all services
     */
    getStatus() {
        const entries = [];
        for (const [key, health] of this.healthCache) {
            entries.push({ service: key, ...health, ...this.services[key] });
        }
        return {
            preferred: this.preferredService,
            model: this.model,
            uptime: Date.now() - this.startTime,
            services: entries,
        };
    }

    // ─── Chat ─────────────────────────────────────────────────────

    /**
     * Send a chat message through the preferred service.
     * Falls back to other services if primary fails.
     */
    async chat(message, options = {}) {
        const model = options.model || this.model;
        const serviceKeys = this._getFallbackChain();

        for (const key of serviceKeys) {
            const svc = this.services[key];
            if (!svc?.chatPath) continue;

            try {
                const response = await this._fetch(`${svc.url}${svc.chatPath}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                            { role: 'user', content: message },
                        ],
                        temperature: options.temperature ?? 0.7,
                        max_tokens: options.maxTokens,
                    }),
                });

                const data = await response.json();

                if (data.choices?.[0]?.message?.content) {
                    return {
                        content: data.choices[0].message.content,
                        model: data.model || model,
                        service: key,
                        usage: data.usage,
                    };
                }
                if (data.error) throw new Error(data.error.message);
                return { content: data.response || data.text || JSON.stringify(data), model, service: key };
            } catch (err) {
                // Try next service in fallback chain
                continue;
            }
        }

        throw new Error('All services unreachable — check your connection or API key');
    }

    // ─── MCP Tools ────────────────────────────────────────────────

    /**
     * List all available MCP tools from the server
     */
    async listTools() {
        const svc = this.services[this.preferredService || 'manager'];
        const mcpPath = svc?.mcpPath || '/api/mcp';
        const response = await this._mcpRequest(svc.url + mcpPath, 'tools/list', {});
        return response.result?.tools || [];
    }

    /**
     * Call a specific MCP tool by name
     */
    async callTool(name, args = {}) {
        const svc = this.services[this.preferredService || 'manager'];
        const mcpPath = svc?.mcpPath || '/api/mcp';
        const response = await this._mcpRequest(svc.url + mcpPath, 'tools/call', { name, arguments: args });
        if (response.error) throw new Error(response.error.message);
        return response.result;
    }

    // ─── Buddy ────────────────────────────────────────────────────

    /**
     * Get Buddy's latest output (A2UI directives)
     */
    async getBuddyOutput() {
        const svc = this.services['manager'];
        const response = await this._fetch(`${svc.url}${svc.buddyPath || '/api/buddy/output'}`);
        return response.json();
    }

    /**
     * Send a message to Buddy and get a companion-style response
     */
    async buddyChat(message) {
        return this.chat(message, {
            model: 'heady-buddy',
            systemPrompt: `You are HeadyBuddy, a friendly and capable AI companion. You remember context, proactively help, and do all the digital legwork for your user. You're warm, professional, and action-oriented. When you can do something yourself (research, code, analyze), just do it and report back. Never make the user do unnecessary work. Format responses with markdown for readability.`,
        });
    }

    // ─── Memory ───────────────────────────────────────────────────

    /**
     * Store a memory vector
     */
    async storeMemory(userId, position, embedding, metadata) {
        return this.callTool('memory.store', {
            userId,
            x: position.x, y: position.y, z: position.z,
            embedding,
            metadata,
        });
    }

    /**
     * Query memory by vector similarity
     */
    async queryMemory(userId, embedding, limit = 10) {
        return this.callTool('memory.query', { userId, embedding, limit });
    }

    // ─── Convenience ──────────────────────────────────────────────

    /**
     * Quick explain: send text and get an explanation
     */
    async explain(text) {
        return this.chat(`[INTELLIGENCE] Explain this in detail:\n\n${text}`);
    }

    /**
     * Quick refactor: send code and get improvements
     */
    async refactor(code, language = 'javascript') {
        return this.chat(`[CODE TASK] Refactor and improve this ${language} code:\n\n${code}`);
    }

    /**
     * Quick audit: security and compliance scan
     */
    async audit(code) {
        return this.chat(`[AUDIT] Security and compliance audit:\n\n${code}`, { model: 'heady-reason' });
    }

    /**
     * Battle validate: run through arena
     */
    async battleValidate(code) {
        return this.chat(`[BATTLE] Validate for regressions, security, quality:\n\n${code}`, { model: 'heady-battle-v1' });
    }

    /**
     * Set the active model
     */
    setModel(modelId) {
        this.model = modelId;
    }

    /**
     * Get available models
     */
    getModels() {
        return MODELS;
    }

    // ─── Internals ────────────────────────────────────────────────

    _getFallbackChain() {
        const preferred = this.preferredService || 'manager';
        const all = Object.keys(this.services);
        return [preferred, ...all.filter(k => k !== preferred)];
    }

    async _fetch(url, options = {}) {
        const timeout = options.timeout || this.timeout;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
                    ...(options.headers || {}),
                },
            });
            clearTimeout(timer);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        } catch (err) {
            clearTimeout(timer);
            throw err;
        }
    }

    async _mcpRequest(url, method, params) {
        const response = await this._fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params,
            }),
        });
        return response.json();
    }
}

// ─── Standalone CLI mode ──────────────────────────────────────────

if (typeof require !== 'undefined' && require.main === module) {
    (async () => {
        logger.info(`
╔═══════════════════════════════════════════════════════╗
║  🔌 Heady™ Service Connector v3.2.3                  ║
║  Dynamic Service Discovery & Connection               ║
╚═══════════════════════════════════════════════════════╝
`);
        const connector = new HeadyServiceConnector();
        logger.info('  Discovering services...\n');
        const discovery = await connector.discover();

        for (const svc of discovery.services) {
            const icon = svc.healthy ? '✓' : '✗';
            const latency = svc.healthy ? `${svc.latencyMs}ms` : svc.error;
            logger.info(`  ${icon} ${svc.name.padEnd(20)} ${svc.url.padEnd(45)} ${latency}`);
        }

        logger.info(`\n  Preferred: ${discovery.preferred}`);
        logger.info(`  Healthy:   ${discovery.healthyCount}/${discovery.totalCount}`);
        logger.info(`\n  Available models:`);
        MODELS.forEach(m => logger.info(`    ${m.emoji} ${m.id.padEnd(18)} ${m.tier.padEnd(8)} ${m.speed}`));
        logger.info(`\n  Usage in your code:`);
        logger.info(`    const { HeadyServiceConnector } = require('./heady-service-connector');`);
        logger.info(`    const heady = new HeadyServiceConnector({ apiKey: 'hdy_...' });`);
        logger.info(`    await heady.discover();`);
        logger.info(`    const reply = await heady.chat('Hello!');`);
        logger.info(`    const tools = await heady.listTools();`);
        logger.info('');
    })();
}

// ─── Exports ──────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HeadyServiceConnector, DEFAULT_SERVICES, MODELS };
}
if (typeof window !== 'undefined') {
    window.HeadyServiceConnector = HeadyServiceConnector;
    window.HEADY_MODELS = MODELS;
}
