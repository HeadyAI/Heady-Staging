// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: services/liquid-nodes/index.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
const express = require('express');
const router = express.Router();
const { createLogger } = require('../../packages/structured-logger');
const log = createLogger('liquid-nodes-service');

// φ-scaled constants for health checks and timeouts
const PHI = 1.618;
const LIQUID_NODES_HEALTH_TIMEOUT = Math.round(1618); // 1.618 seconds

// Comprehensive liquid nodes registry, grouped by domain
const LIQUID_NODES_REGISTRY = {
  'ai-llm': [
    {
      name: 'anthropic',
      domain: 'ai-llm',
      port: null,
      envKeys: ['ANTHROPIC_API_KEY'],
      capabilities: ['text-generation', 'vision', 'function-calling', 'batch-processing'],
      description: 'Claude API for text generation and reasoning'
    },
    {
      name: 'openai',
      domain: 'ai-llm',
      port: null,
      envKeys: ['OPENAI_API_KEY'],
      capabilities: ['gpt-4', 'gpt-3.5-turbo', 'embeddings', 'moderation'],
      description: 'OpenAI GPT models and embedding API'
    },
    {
      name: 'groq',
      domain: 'ai-llm',
      port: null,
      envKeys: ['GROQ_API_KEY'],
      capabilities: ['fast-inference', 'llama', 'mixtral'],
      description: 'Groq fast LLM inference'
    },
    {
      name: 'perplexity',
      domain: 'ai-llm',
      port: null,
      envKeys: ['PERPLEXITY_API_KEY'],
      capabilities: ['web-search-llm', 'reasoning'],
      description: 'Perplexity AI with web search capabilities'
    },
    {
      name: 'huggingface',
      domain: 'ai-llm',
      port: null,
      envKeys: ['HF_TOKEN'],
      capabilities: ['model-hosting', 'inference', 'fine-tuning'],
      description: 'Hugging Face model hub and inference API'
    },
    {
      name: 'gemini',
      domain: 'ai-llm',
      port: null,
      envKeys: ['GEMINI_API_KEY'],
      capabilities: ['multimodal', 'vision', 'text-generation'],
      description: 'Google Gemini API'
    },
    {
      name: 'vertex-ai',
      domain: 'ai-llm',
      port: null,
      envKeys: ['GCLOUD_ACCESS_TOKEN'],
      capabilities: ['models', 'endpoints', 'predict', 'custom-training'],
      description: 'Google Cloud Vertex AI platform'
    }
  ],
  'infrastructure': [
    {
      name: 'postgres',
      domain: 'infrastructure',
      port: 5432,
      envKeys: ['DATABASE_URL'],
      capabilities: ['relational-db', 'transactions', 'json-support'],
      description: 'Primary PostgreSQL database'
    },
    {
      name: 'neon',
      domain: 'infrastructure',
      port: null,
      envKeys: ['NEON_API_KEY'],
      capabilities: ['serverless-postgres', 'branching', 'autoscaling'],
      description: 'Neon serverless PostgreSQL'
    },
    {
      name: 'upstash-redis',
      domain: 'infrastructure',
      port: null,
      envKeys: ['UPSTASH_REDIS_REST_URL'],
      capabilities: ['redis', 'caching', 'sessions', 'rate-limiting'],
      description: 'Upstash serverless Redis'
    },
    {
      name: 'firebase',
      domain: 'infrastructure',
      port: null,
      envKeys: ['FIREBASE_API_KEY'],
      capabilities: ['realtime-db', 'firestore', 'auth', 'storage'],
      description: 'Google Firebase platform'
    },
    {
      name: 'pinecone',
      domain: 'infrastructure',
      port: null,
      envKeys: ['PINECONE_API_KEY'],
      capabilities: ['vector-db', 'semantic-search', 'rag'],
      description: 'Pinecone vector database'
    },
    {
      name: 'pgvector',
      domain: 'infrastructure',
      port: 5432,
      envKeys: ['DATABASE_URL'],
      capabilities: ['vector-extension', 'embeddings', 'similarity-search'],
      description: 'PostgreSQL pgvector extension (same as postgres)'
    }
  ],
  'cloud-deploy': [
    {
      name: 'cloudflare',
      domain: 'cloud-deploy',
      port: null,
      envKeys: ['CLOUDFLARE_API_TOKEN'],
      capabilities: ['zones', 'dns', 'workers', 'pages', 'durable-objects'],
      description: 'Cloudflare edge network and workers'
    },
    {
      name: 'sentry',
      domain: 'cloud-deploy',
      port: null,
      envKeys: ['SENTRY_AUTH_TOKEN'],
      capabilities: ['error-tracking', 'performance-monitoring', 'release-tracking'],
      description: 'Sentry error and performance monitoring'
    },
    {
      name: 'render',
      domain: 'cloud-deploy',
      port: null,
      envKeys: ['RENDER_API_KEY'],
      capabilities: ['deployment', 'autoscaling', 'databases', 'services'],
      description: 'Render.com deployment platform'
    }
  ],
  'scm': [
    {
      name: 'github',
      domain: 'scm',
      port: null,
      envKeys: ['GITHUB_TOKEN'],
      capabilities: ['repos', 'code-search', 'gists', 'issues', 'pull-requests'],
      description: 'GitHub primary repository and API access'
    },
    {
      name: 'github-secondary',
      domain: 'scm',
      port: null,
      envKeys: ['GITHUB_TOKEN_SECONDARY'],
      capabilities: ['repos', 'code-search', 'gists', 'mirror-operations'],
      description: 'GitHub secondary token for multi-account operations'
    }
  ],
  'finance': [
    {
      name: 'stripe',
      domain: 'finance',
      port: null,
      envKeys: ['STRIPE_SECRET_KEY'],
      capabilities: ['payments', 'subscriptions', 'invoicing', 'webhooks'],
      description: 'Stripe payment processing and subscription management'
    }
  ],
  'auth': [
    {
      name: 'heady-auth',
      domain: 'auth',
      port: null,
      envKeys: ['HEADY_API_KEY'],
      capabilities: ['api-authentication', 'service-identity', 'key-rotation'],
      description: 'Heady system internal authentication'
    },
    {
      name: 'admin',
      domain: 'auth',
      port: null,
      envKeys: ['ADMIN_TOKEN'],
      capabilities: ['admin-access', 'governance-checks', 'system-control'],
      description: 'Administrator access token'
    }
  ],
  'latent-space-ops': [
    {
      name: 'colab-1',
      domain: 'latent-space-ops',
      port: null,
      envKeys: [],
      capabilities: ['notebook-runtime', 'gpu-access', 'code-execution'],
      description: 'Google Colab Pro+ membership slot 1',
      status: 'runtime'
    },
    {
      name: 'colab-2',
      domain: 'latent-space-ops',
      port: null,
      envKeys: [],
      capabilities: ['notebook-runtime', 'gpu-access', 'code-execution'],
      description: 'Google Colab Pro+ membership slot 2',
      status: 'runtime'
    },
    {
      name: 'colab-3',
      domain: 'latent-space-ops',
      port: null,
      envKeys: [],
      capabilities: ['notebook-runtime', 'gpu-access', 'code-execution'],
      description: 'Google Colab Pro+ membership slot 3',
      status: 'runtime'
    },
    {
      name: 'colab-4',
      domain: 'latent-space-ops',
      port: null,
      envKeys: [],
      capabilities: ['notebook-runtime', 'gpu-access', 'autonomous-learning', 'trial-and-error', 'qa'],
      description: 'Google Colab Pro+ membership slot 4 — Dedicated Learning Runtime',
      status: 'runtime'
    },
    {
      name: 'latent-vector-store',
      domain: 'latent-space-ops',
      port: null,
      envKeys: [],
      capabilities: ['store', 'search', 'list', 'delete', 'semantic-queries'],
      description: 'Latent space vector memory and semantic storage',
      status: 'active'
    }
  ]
};

// Compute status for each node based on environment variables
function computeNodeStatus(node) {
  if (node.status) return node.status; // Colab and latent-space have hardcoded status
  if (!node.envKeys || node.envKeys.length === 0) return 'unknown';
  const hasAnyKey = node.envKeys.some(key => !!process.env[key]);
  return hasAnyKey ? 'connected' : 'needs_token';
}

// GET / - Full registry with all nodes
router.get('/', (req, res) => {
  try {
    const allNodes = [];
    for (const [domain, nodes] of Object.entries(LIQUID_NODES_REGISTRY)) {
      for (const node of nodes) {
        allNodes.push({
          ...node,
          status: computeNodeStatus(node)
        });
      }
    }
    const active = allNodes.filter(n => n.status === 'connected' || n.status === 'active' || n.status === 'runtime').length;
    const summary = {
      total: allNodes.length,
      active,
      needsConfig: allNodes.filter(n => n.status === 'needs_token').length,
      runtime: allNodes.filter(n => n.status === 'runtime').length,
      unknown: allNodes.filter(n => n.status === 'unknown').length,
      byDomain: {}
    };
    for (const domain of Object.keys(LIQUID_NODES_REGISTRY)) {
      const domainNodes = allNodes.filter(n => n.domain === domain);
      summary.byDomain[domain] = {
        total: domainNodes.length,
        active: domainNodes.filter(n => n.status === 'connected' || n.status === 'active' || n.status === 'runtime').length
      };
    }
    res.json({ nodes: allNodes, summary, ts: new Date().toISOString() });
  } catch (err) {
    log.error('Error in GET /', { errorMessage: err.message, errorStack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

// GET /:domain - Filter nodes by domain
router.get('/:domain', (req, res) => {
  try {
    const { domain } = req.params;
    const domainNodes = LIQUID_NODES_REGISTRY[domain];
    if (!domainNodes) {
      return res.status(404).json({ error: `Domain '${domain}' not found`, validDomains: Object.keys(LIQUID_NODES_REGISTRY) });
    }
    const nodes = domainNodes.map(node => ({
      ...node,
      status: computeNodeStatus(node)
    }));
    const active = nodes.filter(n => n.status === 'connected' || n.status === 'active' || n.status === 'runtime').length;
    res.json({
      domain,
      nodes,
      summary: {
        total: nodes.length,
        active,
        needsConfig: nodes.filter(n => n.status === 'needs_token').length
      },
      ts: new Date().toISOString()
    });
  } catch (err) {
    log.error('Error in GET /:domain', { errorMessage: err.message, errorStack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

// GET /health/check - Health check and connectivity validation
router.get('/health/check', (req, res) => {
  try {
    const healthResults = {
      timestamp: new Date().toISOString(),
      timeout: LIQUID_NODES_HEALTH_TIMEOUT,
      nodes: {},
      summary: {
        healthy: 0,
        unhealthy: 0,
        unchecked: 0,
        errors: []
      }
    };

    // Check only connected nodes (skip needs_token, runtime, and unknown)
    const allNodes = [];
    for (const [domain, nodes] of Object.entries(LIQUID_NODES_REGISTRY)) {
      for (const node of nodes) {
        allNodes.push({ ...node, domain });
      }
    }

    for (const node of allNodes) {
      const status = computeNodeStatus(node);

      if (status === 'needs_token') {
        healthResults.nodes[node.name] = { status: 'unconfigured', reason: 'missing_env_key' };
        healthResults.summary.unchecked++;
      } else if (status === 'runtime' || status === 'active' || status === 'unknown') {
        healthResults.nodes[node.name] = { status: 'not_checked', reason: status === 'runtime' ? 'runtime_node' : status === 'active' ? 'always_active' : 'unknown_status' };
        healthResults.summary.unchecked++;
      }
    }

    res.json(healthResults);
  } catch (err) {
    log.error('Error in GET /health/check', { errorMessage: err.message, errorStack: err.stack });
    res.status(500).json({ error: err.message, timestamp: new Date().toISOString() });
  }
});

module.exports = { router, LIQUID_NODES_REGISTRY, computeNodeStatus };
