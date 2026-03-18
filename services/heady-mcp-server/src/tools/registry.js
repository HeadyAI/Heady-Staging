/**
 * Heady™ MCP Tool Registry
 * All 42 tools registered with handlers wired to upstream services
 *
 * Each tool has:
 *   - name, description, inputSchema (MCP spec)
 *   - handler(args) → Promise<result>  (wired to service or local)
 *   - category, phiTier (metadata)
 */
'use strict';

const { PHI, PSI, PSI2, FIB, CSL } = require('../config/phi-constants');
const { callService, checkServiceHealth } = require('./service-client');
const { getAllServiceEndpoints } = require('../config/services');
const { DRUPAL_TOOLS } = require('./drupal-integration');
const { AEGIS_TOOLS } = require('./aegis');
const { MANDALA_TOOLS } = require('./mandala');
const { MNEMOSYNE_TOOLS } = require('./mnemosyne');
// ── 55 Novel MCP Tools (7 category modules) ──
const { PHYSICAL_WORLD_TOOLS } = require('./physical-world');
const { CREATIVE_MEDIA_TOOLS } = require('./creative-media');
const { SCIENCE_RESEARCH_TOOLS } = require('./science-research');
const { SOCIAL_LEGAL_HEALTH_TOOLS } = require('./social-legal-health');
const { EDUCATION_KNOWLEDGE_TOOLS } = require('./education-knowledge');
const { BUSINESS_DEVOPS_TOOLS } = require('./business-devops');
const { WILD_IDEAS_TOOLS } = require('./wild-ideas');

function createToolRegistry() {
  const tools = [];
  const handlers = new Map();

  function register(def) {
    tools.push({
      name: def.name,
      description: def.description,
      inputSchema: def.inputSchema,
    });
    handlers.set(def.name, {
      handler: def.handler,
      category: def.category,
      phiTier: def.phiTier || 0,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // TIER 1 — CRITICAL INTELLIGENCE (φ^0 priority)
  // ═══════════════════════════════════════════════════════════════════

  register({
    name: 'heady_deep_scan',
    description: 'Deep project scanning: maps files, extracts structure, generates embeddings into 3D vector memory.',
    category: 'intelligence',
    phiTier: 0,
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory to scan' },
        maxDepth: { type: 'integer', default: 10, description: 'Max scan depth' },
      },
      required: ['directory'],
    },
    handler: (args) => callService('heady-brain', '/deep-scan', args),
  });

  register({
    name: 'heady_auto_flow',
    description: 'Full auto-success pipeline — chains Battle + Coder + Analyze + Risks + Patterns via HCFP.',
    category: 'orchestration',
    phiTier: 0,
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description' },
        code: { type: 'string', description: 'Initial code to process' },
        context: { type: 'string', description: 'Additional context' },
      },
      required: ['task'],
    },
    handler: (args) => callService('hcfp', '/auto-flow', args),
  });

  register({
    name: 'heady_memory',
    description: 'Search HeadyMemory (3D vector space) for persistent facts, embeddings, and knowledge.',
    category: 'memory',
    phiTier: 0,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'integer', default: 5, description: 'Max results' },
        minScore: { type: 'number', default: 0.6, description: 'Minimum similarity score' },
      },
      required: ['query'],
    },
    handler: (args) => callService('heady-memory', '/search', args),
  });

  register({
    name: 'heady_embed',
    description: 'Generate vector embeddings via Heady™ embedding service (384D, nomic-embed-text).',
    category: 'memory',
    phiTier: 0,
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to embed' },
        model: { type: 'string', default: 'nomic-embed-text', description: 'Embedding model' },
      },
      required: ['text'],
    },
    handler: (args) => callService('heady-memory', '/embed', args),
  });

  register({
    name: 'heady_soul',
    description: 'HeadySoul — awareness layer: values arbiter, coherence guardian, mission alignment check.',
    category: 'intelligence',
    phiTier: 0,
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Content to evaluate' },
        action: { type: 'string', enum: ['analyze', 'optimize', 'learn'], default: 'analyze' },
      },
      required: ['content'],
    },
    handler: (args) => callService('heady-soul', '/evaluate', args),
  });

  register({
    name: 'heady_vinci',
    description: 'HeadyVinci — session planner: topology maintainer, multi-step reasoning engine.',
    category: 'intelligence',
    phiTier: 0,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['learn', 'predict', 'recognize', 'plan'], default: 'predict' },
        data: { type: 'string', description: 'Input data' },
      },
      required: ['data'],
    },
    handler: (args) => callService('heady-vinci', '/process', args),
  });

  // ═══════════════════════════════════════════════════════════════════
  // TIER 2 — ANALYSIS & EXECUTION (φ^1 priority)
  // ═══════════════════════════════════════════════════════════════════

  register({
    name: 'heady_analyze',
    description: 'Unified analysis — code, research, architecture, security, performance, academic, news.',
    category: 'analysis',
    phiTier: 1,
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Content to analyze' },
        type: { type: 'string', enum: ['code', 'text', 'security', 'performance', 'architecture', 'general', 'deep-scan', 'research', 'academic', 'news'], default: 'general' },
        language: { type: 'string', description: 'Programming language (for code)' },
        focus: { type: 'string', description: 'Specific focus area' },
      },
      required: ['content'],
    },
    handler: (args) => callService('heady-brain', '/analyze', args),
  });

  register({
    name: 'heady_risks',
    description: 'Risk assessment, vulnerability scanning, mitigation plans with CSL-weighted severity.',
    category: 'security',
    phiTier: 1,
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Content to assess' },
        action: { type: 'string', enum: ['assess', 'mitigate', 'scan'], default: 'assess' },
        scope: { type: 'string', default: 'all', description: 'Scope of assessment' },
      },
      required: ['content'],
    },
    handler: (args) => callService('heady-guard', '/risks', args),
  });

  register({
    name: 'heady_coder',
    description: 'Code generation and multi-assistant workflows via Heady™Coder.',
    category: 'execution',
    phiTier: 1,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Code generation prompt' },
        action: { type: 'string', enum: ['generate', 'orchestrate', 'scaffold'], default: 'generate' },
        language: { type: 'string', description: 'Target language' },
        framework: { type: 'string', description: 'Target framework' },
      },
      required: ['prompt'],
    },
    handler: (args) => callService('heady-coder', '/generate', args),
  });

  register({
    name: 'heady_battle',
    description: 'HeadyBattle Arena — AI node competition, evaluation, leaderboard, cross-model comparison.',
    category: 'execution',
    phiTier: 1,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['session', 'evaluate', 'arena', 'leaderboard', 'compare'] },
        task: { type: 'string', description: 'Task for evaluation' },
        code: { type: 'string', description: 'Code to evaluate' },
        nodes: { type: 'array', items: { type: 'string' }, description: 'AI nodes to compete' },
      },
      required: ['action'],
    },
    handler: (args) => callService('heady-battle', '/arena', args),
  });

  register({
    name: 'heady_patterns',
    description: 'Design pattern detection and deep code analysis — antipatterns, suggestions, library matching.',
    category: 'analysis',
    phiTier: 1,
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to analyze' },
        action: { type: 'string', enum: ['analyze', 'library', 'suggest'], default: 'analyze' },
        language: { type: 'string', description: 'Programming language' },
      },
      required: ['code'],
    },
    handler: (args) => callService('heady-brain', '/patterns', args),
  });

  register({
    name: 'heady_refactor',
    description: 'Code refactoring suggestions — clean code, SOLID, DRY, with phi-weighted priority.',
    category: 'execution',
    phiTier: 1,
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to refactor' },
        language: { type: 'string', description: 'Language' },
        goals: { type: 'array', items: { type: 'string' }, description: 'Refactoring goals' },
      },
      required: ['code'],
    },
    handler: (args) => callService('heady-coder', '/refactor', args),
  });

  // ═══════════════════════════════════════════════════════════════════
  // TIER 3 — MULTI-MODEL AI (φ^2 priority)
  // ═══════════════════════════════════════════════════════════════════

  register({
    name: 'heady_chat',
    description: 'Chat with Heady™ Brain — multi-model inference with automatic routing.',
    category: 'ai',
    phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Chat message' },
        system: { type: 'string', description: 'System prompt' },
        model: { type: 'string', default: 'heady-brain', description: 'Model to use' },
        temperature: { type: 'number', default: 0.7 },
        max_tokens: { type: 'integer', default: 4096 },
      },
      required: ['message'],
    },
    handler: (args) => callService('heady-brain', '/chat', args),
  });

  register({
    name: 'heady_claude',
    description: 'Advanced reasoning via Anthropic Claude with extended thinking.',
    category: 'ai',
    phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message for Claude' },
        action: { type: 'string', enum: ['chat', 'think', 'analyze'], default: 'chat' },
        system: { type: 'string', description: 'System prompt' },
        thinkingBudget: { type: 'integer', default: 32768 },
      },
      required: ['message'],
    },
    handler: (args) => callService('heady-brain', '/claude', args),
  });

  register({
    name: 'heady_openai',
    description: 'GPT integration with function calling — GPT-4o, o1, o3.',
    category: 'ai',
    phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message for GPT' },
        action: { type: 'string', enum: ['chat', 'complete'], default: 'chat' },
        model: { type: 'string', default: 'gpt-4o' },
      },
      required: ['message'],
    },
    handler: (args) => callService('heady-brain', '/openai', args),
  });

  register({
    name: 'heady_gemini',
    description: 'Multimodal AI via Google Gemini — text, image, video analysis.',
    category: 'ai',
    phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Prompt for Gemini' },
        action: { type: 'string', enum: ['generate', 'analyze'], default: 'generate' },
      },
      required: ['prompt'],
    },
    handler: (args) => callService('heady-brain', '/gemini', args),
  });

  register({
    name: 'heady_groq',
    description: 'Ultra-fast inference via Groq LPU — sub-100ms latency.',
    category: 'ai',
    phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message for Groq' },
        action: { type: 'string', enum: ['chat', 'complete'], default: 'chat' },
      },
      required: ['message'],
    },
    handler: (args) => callService('heady-brain', '/groq', args),
  });

  register({
    name: 'heady_complete',
    description: 'Code/text completion via Heady™ Brain with multi-model fallback.',
    category: 'ai',
    phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Completion prompt' },
        language: { type: 'string', description: 'Language hint' },
        max_tokens: { type: 'integer', default: 2048 },
      },
      required: ['prompt'],
    },
    handler: (args) => callService('heady-brain', '/complete', args),
  });

  register({
    name: 'heady_buddy',
    description: 'HeadyBuddy — multi-provider personal AI assistant with memory.',
    category: 'ai',
    phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message for Buddy' },
        action: { type: 'string', enum: ['chat', 'memory', 'skills', 'tasks', 'providers'], default: 'chat' },
        provider: { type: 'string', default: 'auto' },
      },
      required: ['message'],
    },
    handler: (args) => callService('heady-buddy', '/chat', args),
  });

  // ═══════════════════════════════════════════════════════════════════
  // TIER 4 — OPS & DEPLOYMENT (φ^3 priority)
  // ═══════════════════════════════════════════════════════════════════

  register({
    name: 'heady_deploy',
    description: 'Trigger deployment/service actions — deploy, restart, status, logs, scale.',
    category: 'ops',
    phiTier: 3,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['deploy', 'restart', 'status', 'logs', 'scale'] },
        service: { type: 'string', description: 'Service name' },
        config: { type: 'object', description: 'Deploy config' },
      },
      required: ['action'],
    },
    handler: (args) => callService('heady-conductor', '/deploy', args),
  });

  register({
    name: 'heady_health',
    description: 'Check health/status of all Heady services with φ-scaled telemetry.',
    category: 'ops',
    phiTier: 3,
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', enum: ['all', 'brain', 'memory', 'soul', 'vinci', 'conductor', 'coder', 'battle', 'buddy', 'guard', 'mcp', 'auth', 'gateway', 'billing', 'analytics', 'search', 'scheduler'], default: 'all' },
      },
    },
    handler: async (args) => {
      if (args.service && args.service !== 'all') {
        return checkServiceHealth(args.service === 'mcp' ? 'heady-brain' : `heady-${args.service}`);
      }
      // Check all services
      const endpoints = getAllServiceEndpoints();
      const results = {};
      const checks = Object.keys(endpoints).map(async (name) => {
        results[name] = await checkServiceHealth(name);
      });
      await Promise.allSettled(checks);
      const healthy = Object.values(results).filter(r => r.status === 'healthy').length;
      return {
        overall: healthy === Object.keys(results).length ? 'all_healthy' : 'degraded',
        healthy_count: healthy,
        total_services: Object.keys(results).length,
        phi: PHI,
        services: results,
      };
    },
  });

  register({
    name: 'heady_ops',
    description: 'DevOps automation — infrastructure, monitoring, scaling.',
    category: 'ops',
    phiTier: 3,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['deploy', 'infrastructure', 'monitor', 'scale'] },
        service: { type: 'string' },
        config: { type: 'object' },
      },
      required: ['action'],
    },
    handler: (args) => callService('heady-conductor', '/ops', args),
  });

  register({
    name: 'heady_maintenance',
    description: 'Health monitoring, backups, updates, restoration.',
    category: 'ops',
    phiTier: 3,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['status', 'backup', 'update', 'restore'], default: 'status' },
        service: { type: 'string' },
      },
      required: ['action'],
    },
    handler: (args) => callService('heady-maid', '/maintenance', args),
  });

  register({
    name: 'heady_maid',
    description: 'System cleanup and scheduling — garbage collection, temp purge.',
    category: 'ops',
    phiTier: 3,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['clean', 'schedule', 'status'], default: 'status' },
        target: { type: 'string' },
      },
      required: ['action'],
    },
    handler: (args) => callService('heady-maid', '/clean', args),
  });

  // ═══════════════════════════════════════════════════════════════════
  // TIER 5 — MEMORY & SEARCH (φ^4 priority)
  // ═══════════════════════════════════════════════════════════════════

  register({
    name: 'heady_learn',
    description: 'Store a learning in 3D vector memory — directives, preferences, patterns.',
    category: 'memory',
    phiTier: 4,
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Content to learn' },
        category: { type: 'string', enum: ['directive', 'preference', 'interaction', 'decision', 'identity', 'pattern'], default: 'interaction' },
        metadata: { type: 'object' },
      },
      required: ['content'],
    },
    handler: (args) => callService('heady-memory', '/learn', args),
  });

  register({
    name: 'heady_recall',
    description: 'Search 3D vector memory for relevant past interactions and knowledge.',
    category: 'memory',
    phiTier: 4,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        topK: { type: 'integer', default: 5 },
      },
      required: ['query'],
    },
    handler: (args) => callService('heady-memory', '/recall', args),
  });

  register({
    name: 'heady_vector_store',
    description: 'Store a vector embedding in 3D GPU vector space (384D pgvector + HNSW).',
    category: 'memory',
    phiTier: 4,
    inputSchema: {
      type: 'object',
      properties: {
        embedding: { type: 'array', items: { type: 'number' }, description: '384D float array' },
        metadata: { type: 'object' },
      },
      required: ['embedding'],
    },
    handler: (args) => callService('heady-memory', '/vector/store', args),
  });

  register({
    name: 'heady_vector_search',
    description: 'Search 3D GPU vector space for similar vectors via HNSW.',
    category: 'memory',
    phiTier: 4,
    inputSchema: {
      type: 'object',
      properties: {
        embedding: { type: 'array', items: { type: 'number' } },
        topK: { type: 'integer', default: 5 },
      },
      required: ['embedding'],
    },
    handler: (args) => callService('heady-memory', '/vector/search', args),
  });

  register({
    name: 'heady_vector_stats',
    description: 'Get 3D vector space statistics — dimensions, count, memory usage.',
    category: 'memory',
    phiTier: 4,
    inputSchema: { type: 'object', properties: {} },
    handler: () => callService('heady-memory', '/vector/stats', {}, { method: 'GET' }),
  });

  register({
    name: 'heady_memory_stats',
    description: 'Get continuous learning stats — total memories, categories, storage.',
    category: 'memory',
    phiTier: 4,
    inputSchema: { type: 'object', properties: {} },
    handler: () => callService('heady-memory', '/stats', {}, { method: 'GET' }),
  });

  register({
    name: 'heady_search',
    description: 'Search Heady knowledge base, service catalog, docs, and registry.',
    category: 'search',
    phiTier: 4,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        scope: { type: 'string', enum: ['all', 'registry', 'docs', 'services', 'knowledge'], default: 'all' },
        limit: { type: 'integer', default: 10 },
      },
      required: ['query'],
    },
    handler: (args) => callService('search', '/query', args),
  });

  // ═══════════════════════════════════════════════════════════════════
  // TIER 6 — EDGE & INTEGRATIONS (φ^5 priority)
  // ═══════════════════════════════════════════════════════════════════

  register({
    name: 'heady_edge_ai',
    description: 'Cloudflare edge AI — embeddings, chat, classification, vector search at the edge.',
    category: 'edge',
    phiTier: 5,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['embed', 'chat', 'classify', 'vectorize-insert', 'vectorize-query', 'queue'] },
        text: { type: 'string' },
        message: { type: 'string' },
        model: { type: 'string' },
        topK: { type: 'number' },
      },
      required: ['action'],
    },
    handler: (args) => callService('edge-ai', '/process', args),
  });

  register({
    name: 'heady_lens',
    description: 'Visual analysis and image processing — object detection, OCR, classification.',
    category: 'specialized',
    phiTier: 5,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['analyze', 'process', 'detect'], default: 'analyze' },
        image_url: { type: 'string' },
        prompt: { type: 'string' },
      },
      required: ['action'],
    },
    handler: (args) => callService('heady-lens', '/process', args),
  });

  register({
    name: 'heady_notebooklm',
    description: 'Sync Heady Knowledge Vault to NotebookLM — bidirectional knowledge sync.',
    category: 'integrations',
    phiTier: 5,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['sync', 'status', 'health'], default: 'sync' },
      },
    },
    handler: (args) => callService('heady-brain', '/notion', args),
  });

  register({
    name: 'heady_jules_task',
    description: 'Dispatch async background coding task to Jules/Codex.',
    category: 'integrations',
    phiTier: 5,
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description' },
        repository: { type: 'string', description: 'GitHub repo' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
        autoCommit: { type: 'boolean', default: false },
      },
      required: ['task', 'repository'],
    },
    handler: (args) => callService('heady-coder', '/jules', args),
  });

  register({
    name: 'heady_huggingface_model',
    description: 'Search and interact with HuggingFace models — search, info, inference.',
    category: 'integrations',
    phiTier: 5,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'info', 'inference'] },
        modelId: { type: 'string' },
        query: { type: 'string' },
      },
      required: ['action'],
    },
    handler: (args) => callService('heady-brain', '/huggingface', args),
  });

  // ═══════════════════════════════════════════════════════════════════
  // TIER 7 — ORCHESTRATION & META (φ^6 priority)
  // ═══════════════════════════════════════════════════════════════════

  register({
    name: 'heady_orchestrator',
    description: 'HeadyOrchestrator — system-wide communication, alignment, coordination.',
    category: 'orchestration',
    phiTier: 6,
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        action: { type: 'string', enum: ['send', 'status', 'align'], default: 'send' },
        target: { type: 'string' },
      },
      required: ['message'],
    },
    handler: (args) => callService('heady-conductor', '/orchestrate', args),
  });

  register({
    name: 'heady_hcfp_status',
    description: 'HCFP auto-success engine status — pipeline metrics, queue depth, throughput.',
    category: 'orchestration',
    phiTier: 6,
    inputSchema: {
      type: 'object',
      properties: {
        detail: { type: 'string', enum: ['status', 'metrics', 'health'], default: 'status' },
      },
    },
    handler: (args) => callService('hcfp', '/status', args, { method: 'GET' }),
  });

  register({
    name: 'heady_telemetry',
    description: 'Get comprehensive telemetry — request rates, latencies, error budgets.',
    category: 'monitoring',
    phiTier: 6,
    inputSchema: { type: 'object', properties: {} },
    handler: () => callService('analytics', '/telemetry', {}, { method: 'GET' }),
  });

  register({
    name: 'heady_template_stats',
    description: 'Get template auto-generation stats — templates created, cache hits.',
    category: 'monitoring',
    phiTier: 6,
    inputSchema: { type: 'object', properties: {} },
    handler: () => callService('heady-brain', '/template-stats', {}, { method: 'GET' }),
  });

  register({
    name: 'heady_csl_engine',
    description: 'CSL Engine — Continuous Semantic Logic gates, resonance, superposition, entanglement.',
    category: 'intelligence',
    phiTier: 6,
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Input to evaluate' },
        gates: { type: 'array', items: { type: 'string' }, description: 'Specific gates to apply' },
        threshold: { type: 'number', description: 'Activation threshold' },
      },
      required: ['input'],
    },
    handler: (args) => callService('heady-brain', '/csl', args),
  });

  register({
    name: 'heady_agent_orchestration',
    description: 'Latent OS agent decomposition — planner-executor-validator with swarm coordination.',
    category: 'orchestration',
    phiTier: 6,
    inputSchema: {
      type: 'object',
      properties: {
        objective: { type: 'string', description: 'High-level objective' },
        max_agents: { type: 'number', default: 17, description: 'Max parallel agents (Fibonacci)' },
        strategy: { type: 'string', enum: ['parallel', 'sequential', 'hybrid'], default: 'hybrid' },
      },
      required: ['objective'],
    },
    handler: (args) => callService('heady-conductor', '/agent-orchestrate', args),
  });

  // ═══════════════════════════════════════════════════════════════════
  // DRUPAL CMS TOOLS — Content management across all HEADY sites
  // ═══════════════════════════════════════════════════════════════════

  for (const tool of DRUPAL_TOOLS) {
    register(tool);
  }

  // ═══════════════════════════════════════════════════════════════════
  // AEGIS — φ-resonant Infrastructure Health Monitor
  // ═══════════════════════════════════════════════════════════════════

  for (const tool of AEGIS_TOOLS) {
    register(tool);
  }

  // ═══════════════════════════════════════════════════════════════════
  // MANDALA — Sacred Geometry Computation Engine
  // ═══════════════════════════════════════════════════════════════════

  for (const tool of MANDALA_TOOLS) {
    register(tool);
  }

  // ═══════════════════════════════════════════════════════════════════
  // MNEMOSYNE — 3-Tier Memory Orchestrator
  // ═══════════════════════════════════════════════════════════════════

  for (const tool of MNEMOSYNE_TOOLS) {
    register(tool);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 55 NOVEL MCP TOOLS — Physical World, Creative, Science, Social,
  //   Legal, Health, Education, Business, DevOps, Wild Ideas
  // ═══════════════════════════════════════════════════════════════════

  const NOVEL_TOOL_MODULES = [
    PHYSICAL_WORLD_TOOLS,      // 7: Forge, Wing, Garage, Grid, PulseHealth, RoboHand, Sense
    CREATIVE_MEDIA_TOOLS,      // 7: Cut, Cast, Level, Type, Motion, Chroma, Runway
    SCIENCE_RESEARCH_TOOLS,    // 6: Molecule, Star, GenomeBio, Atmos, Matter, Physik
    SOCIAL_LEGAL_HEALTH_TOOLS, // 12: Relate, Podium, Lingua, Signal, Lex, RegWatch, Patent, Nourish, Lift, Circadian, Zen, Symptom
    EDUCATION_KNOWLEDGE_TOOLS, // 4: Socratic, SkillTree, Scholar, Flash
    BUSINESS_DEVOPS_TOOLS,     // 7: Intel, TAM, Price, Chaos, FinOps, Drift, Postmortem
    WILD_IDEAS_TOOLS,          // 12: Loom, Synapse, Orchid, Acoustica, Instrument, BioLight, TimeCapsule, Conlang, Escape, Brewmaster, DMX, Arborist
  ];

  for (const moduleTools of NOVEL_TOOL_MODULES) {
    for (const tool of moduleTools) {
      register(tool);
    }
  }

  return { tools, handlers };
}

module.exports = { createToolRegistry };
