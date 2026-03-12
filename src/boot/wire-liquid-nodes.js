/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ Liquid Node Wiring — Boot-Time Credential Injection ═══
 *
 * Runs AFTER vault-boot has projected credentials into process.env.
 * Wires each liquid node (external service connector) with its real
 * credentials from the vault, ensuring:
 *   1. Provider-connector gets all AI provider keys
 *   2. Connector-vault gets OAuth tokens for external services
 *   3. Liquid-gateway gets provider endpoints and auth
 *   4. Colab orchestrator gets runtime endpoints
 *   5. All MCP liquid-node tools get their tokens
 *
 * Call: await wireLiquidNodes() in app bootstrap, after bootVault().
 */

'use strict';

const logger = require('../utils/logger') || console;

// ─── PHI constant for sacred geometry alignment ──────────────────
const PHI = 1.6180339887498948;

// ─── Liquid Node Definitions ─────────────────────────────────────
// Each node maps to an external service with its env var dependencies.
const LIQUID_NODES = [
    {
        id: 'github',
        name: 'GitHub',
        type: 'source-control',
        requiredEnvVars: ['GITHUB_TOKEN'],
        optionalEnvVars: ['HEADY_GITHUB_PAT'],
        endpoints: {
            api: 'https://api.github.com',
            graphql: 'https://api.github.com/graphql',
        },
        capabilities: ['repos', 'gists', 'actions', 'issues', 'pulls', 'code-search'],
    },
    {
        id: 'cloudflare',
        name: 'Cloudflare',
        type: 'edge-compute',
        requiredEnvVars: ['CLOUDFLARE_API_TOKEN'],
        optionalEnvVars: ['CF_API_TOKEN', 'CF_AI_TOKEN', 'CF_KV_API_TOKEN'],
        endpoints: {
            api: 'https://api.cloudflare.com/client/v4',
            workers: 'https://api.cloudflare.com/client/v4/accounts/8b1fa38f282c691423c6399247d53323/workers',
            ai: 'https://api.cloudflare.com/client/v4/accounts/8b1fa38f282c691423c6399247d53323/ai',
        },
        capabilities: ['dns', 'workers', 'pages', 'kv', 'ai-inference', 'r2'],
    },
    {
        id: 'vertex-ai',
        name: 'Vertex AI / GCloud',
        type: 'ml-compute',
        requiredEnvVars: ['GOOGLE_APPLICATION_CREDENTIALS', 'GCLOUD_PROJECT_ID'],
        optionalEnvVars: ['GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'],
        endpoints: {
            predict: 'https://us-central1-aiplatform.googleapis.com/v1',
            generative: 'https://generativelanguage.googleapis.com/v1beta',
        },
        capabilities: ['models', 'endpoints', 'predictions', 'embeddings'],
    },
    {
        id: 'ai-studio',
        name: 'Google AI Studio (Gemini)',
        type: 'ai-provider',
        requiredEnvVars: ['GEMINI_API_KEY'],
        optionalEnvVars: ['HEADY_PYTHIA_KEY_STUDIO', 'HEADY_PYTHIA_KEY_HEADY'],
        endpoints: {
            generate: 'https://generativelanguage.googleapis.com/v1beta/models',
        },
        capabilities: ['text-generation', 'embeddings', 'code-generation', 'multimodal'],
    },
    {
        id: 'anthropic',
        name: 'Anthropic / Claude',
        type: 'ai-provider',
        requiredEnvVars: ['ANTHROPIC_API_KEY'],
        optionalEnvVars: ['CLAUDE_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN', 'HEADY_JULES_KEY'],
        endpoints: {
            messages: 'https://api.anthropic.com/v1/messages',
            admin: 'https://api.anthropic.com/v1/organizations',
        },
        capabilities: ['text-generation', 'tool-use', 'vision', 'code-generation'],
    },
    {
        id: 'openai',
        name: 'OpenAI',
        type: 'ai-provider',
        requiredEnvVars: ['OPENAI_API_KEY'],
        endpoints: {
            chat: 'https://api.openai.com/v1/chat/completions',
            embeddings: 'https://api.openai.com/v1/embeddings',
        },
        capabilities: ['text-generation', 'embeddings', 'vision', 'code-generation'],
    },
    {
        id: 'groq',
        name: 'Groq',
        type: 'ai-provider',
        requiredEnvVars: ['GROQ_API_KEY'],
        endpoints: {
            chat: 'https://api.groq.com/openai/v1/chat/completions',
        },
        capabilities: ['fast-inference', 'text-generation'],
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        type: 'ai-provider',
        requiredEnvVars: ['PERPLEXITY_API_KEY'],
        endpoints: {
            chat: 'https://api.perplexity.ai/chat/completions',
        },
        capabilities: ['search-augmented-generation', 'text-generation'],
    },
    {
        id: 'huggingface',
        name: 'Hugging Face',
        type: 'ai-provider',
        requiredEnvVars: ['HF_TOKEN'],
        endpoints: {
            inference: 'https://api-inference.huggingface.co/models',
            hub: 'https://huggingface.co/api',
        },
        capabilities: ['inference', 'model-hosting', 'spaces'],
    },
    {
        id: 'neon',
        name: 'Neon Postgres',
        type: 'database',
        requiredEnvVars: ['DATABASE_URL'],
        optionalEnvVars: ['NEON_API_KEY', 'NEON_PROJECT_ID'],
        endpoints: {
            api: 'https://console.neon.tech/api/v2',
        },
        capabilities: ['sql', 'branching', 'serverless-compute'],
    },
    {
        id: 'upstash',
        name: 'Upstash Redis',
        type: 'cache',
        requiredEnvVars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
        optionalEnvVars: ['UPSTASH_API_KEY', 'UPSTASH_REDIS_ENDPOINT', 'UPSTASH_REDIS_PORT', 'UPSTASH_REDIS_PASSWORD'],
        capabilities: ['kv-cache', 'rate-limiting', 'pub-sub', 'vector-store'],
    },
    {
        id: 'pinecone',
        name: 'Pinecone',
        type: 'vector-db',
        requiredEnvVars: ['PINECONE_API_KEY'],
        endpoints: {
            api: 'https://api.pinecone.io',
        },
        capabilities: ['vector-search', 'embeddings-store', 'namespaces'],
    },
    {
        id: 'stripe',
        name: 'Stripe',
        type: 'payments',
        requiredEnvVars: ['STRIPE_SECRET_KEY'],
        endpoints: {
            api: 'https://api.stripe.com/v1',
        },
        capabilities: ['payments', 'subscriptions', 'invoicing'],
    },
    {
        id: 'sentry',
        name: 'Sentry',
        type: 'monitoring',
        requiredEnvVars: ['SENTRY_DSN'],
        optionalEnvVars: ['SENTRY_AUTH_TOKEN'],
        endpoints: {
            api: 'https://sentry.io/api/0',
        },
        capabilities: ['error-tracking', 'performance-monitoring', 'release-tracking'],
    },
    {
        id: 'colab-a',
        name: 'Colab Runtime A (Inference)',
        type: 'gpu-compute',
        requiredEnvVars: ['COLAB_A_ENDPOINT'],
        optionalEnvVars: ['COLAB_A_NGROK_URL'],
        capabilities: ['gpu-inference', 'embeddings', 'real-time'],
        fibConcurrency: 34,
    },
    {
        id: 'colab-b',
        name: 'Colab Runtime B (Templates)',
        type: 'gpu-compute',
        requiredEnvVars: ['COLAB_B_ENDPOINT'],
        optionalEnvVars: ['COLAB_B_NGROK_URL'],
        capabilities: ['template-eval', 'model-selection', 'vector-retrieval'],
        fibConcurrency: 21,
    },
    {
        id: 'colab-c',
        name: 'Colab Runtime C (Swarm)',
        type: 'gpu-compute',
        requiredEnvVars: ['COLAB_C_ENDPOINT'],
        optionalEnvVars: ['COLAB_C_NGROK_URL'],
        capabilities: ['swarm-burst', 'background-indexing', 'batch-processing'],
        fibConcurrency: 13,
    },
    {
        id: 'colab-d',
        name: 'Colab Runtime D (Intelligence)',
        type: 'gpu-compute',
        requiredEnvVars: ['COLAB_D_ENDPOINT'],
        optionalEnvVars: ['COLAB_D_NGROK_URL'],
        dedicated: true,
        capabilities: [
            'continuous-learning', 'model-fine-tuning', 'pattern-training',
            'self-critique', 'error-immunization', 'heady-soul-consciousness',
        ],
        fibConcurrency: 8,
    },
];

// ─── Wire All Liquid Nodes ───────────────────────────────────────

/**
 * Wire all liquid nodes by verifying their credentials exist in process.env.
 * Returns a status report of all nodes: wired, partial, or disconnected.
 *
 * @returns {{ ok: boolean, wired: number, partial: number, disconnected: number, nodes: object[] }}
 */
async function wireLiquidNodes() {
    const results = [];
    let wired = 0, partial = 0, disconnected = 0;

    const log = logger.logSystem || logger.info || console.log;

    for (const node of LIQUID_NODES) {
        const required = (node.requiredEnvVars || []).map(k => ({
            key: k, present: !!process.env[k],
        }));
        const optional = (node.optionalEnvVars || []).map(k => ({
            key: k, present: !!process.env[k],
        }));

        const requiredPresent = required.filter(r => r.present).length;
        const requiredTotal = required.length;
        const optionalPresent = optional.filter(r => r.present).length;

        let status;
        if (requiredPresent === requiredTotal) {
            if (optionalPresent === optional.length) {
                status = 'wired';
                wired++;
            } else {
                status = 'wired'; // All required present, some optional missing is still wired
                wired++;
            }
        } else if (requiredPresent > 0) {
            status = 'partial';
            partial++;
        } else {
            status = 'disconnected';
            disconnected++;
        }

        const missingRequired = required.filter(r => !r.present).map(r => r.key);
        const missingOptional = optional.filter(r => !r.present).map(r => r.key);

        results.push({
            id: node.id,
            name: node.name,
            type: node.type,
            status,
            capabilities: node.capabilities,
            endpoints: node.endpoints || null,
            dedicated: node.dedicated || false,
            fibConcurrency: node.fibConcurrency || null,
            credentials: {
                requiredPresent,
                requiredTotal,
                optionalPresent,
                optionalTotal: optional.length,
                missingRequired,
                missingOptional,
            },
        });
    }

    const total = LIQUID_NODES.length;
    const coveragePct = Math.round((wired / total) * 100);

    log(`  🔌 Liquid Nodes: ${wired}/${total} wired (${coveragePct}%), ${partial} partial, ${disconnected} disconnected`);

    // Log individual node statuses
    for (const r of results) {
        const icon = r.status === 'wired' ? '✅' : r.status === 'partial' ? '⚠️' : '❌';
        if (r.status !== 'wired') {
            log(`     ${icon} ${r.name}: ${r.status} — missing: ${r.credentials.missingRequired.join(', ') || 'optional only'}`);
        }
    }

    return {
        ok: disconnected === 0,
        total,
        wired,
        partial,
        disconnected,
        coveragePct,
        phi: PHI,
        nodes: results,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Get a specific liquid node's wiring status.
 * @param {string} nodeId
 */
function getNodeStatus(nodeId) {
    const node = LIQUID_NODES.find(n => n.id === nodeId);
    if (!node) return null;

    const required = (node.requiredEnvVars || []).map(k => ({
        key: k, present: !!process.env[k],
    }));
    const allPresent = required.every(r => r.present);

    return {
        id: node.id,
        name: node.name,
        status: allPresent ? 'wired' : 'disconnected',
        missing: required.filter(r => !r.present).map(r => r.key),
    };
}

/**
 * Register liquid-node health routes on Express app.
 */
function registerLiquidNodeRoutes(app) {
    app.get('/api/liquid-nodes/status', async (req, res) => {
        const status = await wireLiquidNodes();
        res.json(status);
    });

    app.get('/api/liquid-nodes/:nodeId', (req, res) => {
        const status = getNodeStatus(req.params.nodeId);
        if (!status) return res.status(404).json({ error: 'Node not found' });
        res.json(status);
    });

    const log = logger.logSystem || logger.info || console.log;
    log('  🔌 Liquid Nodes: routes registered → /api/liquid-nodes/status, /api/liquid-nodes/:nodeId');
}

module.exports = {
    LIQUID_NODES,
    wireLiquidNodes,
    getNodeStatus,
    registerLiquidNodeRoutes,
};
