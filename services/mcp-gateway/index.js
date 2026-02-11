/**
 * Heady MCP Gateway — Optimized Model Context Protocol Server
 * 
 * Canonical MCP entry point for the Heady foundation. Exposes all
 * core tools (filesystem, terminal, browser, github, slack, etc.)
 * and routes MCP requests through the HCSysOrchestrator for brain-
 * aware tool execution.
 * 
 * Endpoints:
 *   GET  /health              — Gateway health
 *   GET  /tools               — List available MCP tools
 *   POST /tools/:toolId/call  — Execute a tool
 *   GET  /resources           — List MCP resources
 *   POST /prompts/:promptId   — Execute a prompt template
 *   WS   /mcp                 — MCP protocol websocket
 * 
 * @module MCPGateway
 */

const express = require('express');
const cors = require('cors');
const { HCSysOrchestrator } = require('../orchestrator/hc-sys-orchestrator');

const app = express();
const PORT = process.env.MCP_PORT || 3500;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Initialize Orchestrator ──────────────────────────────────────────
const orchestrator = new HCSysOrchestrator();

// ─── MCP Tool Registry ────────────────────────────────────────────────
const TOOL_REGISTRY = {
  filesystem: {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Read, write, list, and search files on the local filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['read', 'write', 'list', 'search', 'stat'] },
        path: { type: 'string' },
        content: { type: 'string' },
        query: { type: 'string' },
      },
      required: ['action', 'path'],
    },
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    description: 'Execute shell commands with safety controls',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        cwd: { type: 'string' },
        timeout: { type: 'number', default: 30000 },
      },
      required: ['command'],
    },
  },
  browser: {
    id: 'browser',
    name: 'Browser',
    description: 'Navigate, screenshot, and interact with web pages',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['navigate', 'screenshot', 'click', 'type', 'extract'] },
        url: { type: 'string' },
        selector: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['action'],
    },
  },
  github: {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repos, issues, PRs, and actions on GitHub',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list-repos', 'get-repo', 'create-issue', 'list-issues', 'create-pr', 'get-pr', 'list-actions'] },
        owner: { type: 'string' },
        repo: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['action'],
    },
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages, list channels, and manage Slack workspace',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['send', 'list-channels', 'read-channel', 'search'] },
        channel: { type: 'string' },
        message: { type: 'string' },
        query: { type: 'string' },
      },
      required: ['action'],
    },
  },
  drive: {
    id: 'drive',
    name: 'Drive',
    description: 'Access and manage Google Drive files',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'read', 'search', 'upload'] },
        fileId: { type: 'string' },
        query: { type: 'string' },
      },
      required: ['action'],
    },
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    description: 'Query and update Notion databases and pages',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['query-db', 'get-page', 'create-page', 'update-page', 'search'] },
        databaseId: { type: 'string' },
        pageId: { type: 'string' },
        query: { type: 'string' },
      },
      required: ['action'],
    },
  },
  docker: {
    id: 'docker',
    name: 'Docker',
    description: 'Manage Docker containers, images, and compose stacks',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['ps', 'up', 'down', 'logs', 'build', 'exec'] },
        service: { type: 'string' },
        compose_file: { type: 'string' },
        command: { type: 'string' },
      },
      required: ['action'],
    },
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    description: 'Manage calendar events and scheduling',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'update', 'delete', 'find-free'] },
        title: { type: 'string' },
        start: { type: 'string' },
        end: { type: 'string' },
      },
      required: ['action'],
    },
  },
  heady_registry: {
    id: 'heady_registry',
    name: 'Heady Registry',
    description: 'Query and update HeadyRegistry — the central service catalog',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'search', 'update-status'] },
        service_id: { type: 'string' },
        query: { type: 'string' },
      },
      required: ['action'],
    },
  },
  heady_pipeline: {
    id: 'heady_pipeline',
    name: 'HCFullPipeline',
    description: 'Trigger and monitor HCFullPipeline runs',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['run', 'status', 'history', 'cancel'] },
        run_id: { type: 'string' },
        lane: { type: 'string' },
      },
      required: ['action'],
    },
  },
  heady_brain: {
    id: 'heady_brain',
    name: 'HeadyBrain',
    description: 'Request plan from HeadyBrain orchestrator',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['plan', 'feedback', 'arena', 'health'] },
        message: { type: 'string' },
        workspace_id: { type: 'string' },
        brain_profile_id: { type: 'string' },
        task_type: { type: 'string' },
      },
      required: ['action'],
    },
  },
};

// ─── ROUTES ───────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'mcp-gateway',
    version: '1.0.0',
    tools_count: Object.keys(TOOL_REGISTRY).length,
    orchestrator: orchestrator.getHealth(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/tools', (req, res) => {
  const tools = Object.values(TOOL_REGISTRY).map(t => ({
    name: t.id,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
  res.json({ tools });
});

app.post('/tools/:toolId/call', async (req, res) => {
  const { toolId } = req.params;
  const tool = TOOL_REGISTRY[toolId];

  if (!tool) {
    return res.status(404).json({ error: `Tool '${toolId}' not found` });
  }

  const workspaceId = req.headers['x-workspace-id'] || 'default';
  const brainProfile = req.headers['x-brain-profile'] || null;

  try {
    // Route through orchestrator for brain-aware execution
    const result = await orchestrator.routeTask({
      workspace_id: workspaceId,
      brain_profile_id: brainProfile,
      task_type: 'TOOL_CALL',
      message: JSON.stringify({ tool: toolId, args: req.body }),
      channel: 'mcp',
    });

    res.json({
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
      isError: !result.success,
    });
  } catch (err) {
    res.status(500).json({
      content: [{
        type: 'text',
        text: `Tool execution error: ${err.message}`,
      }],
      isError: true,
    });
  }
});

app.get('/resources', (req, res) => {
  res.json({
    resources: [
      { uri: 'heady://registry', name: 'Heady Registry', mimeType: 'application/json' },
      { uri: 'heady://pipeline/status', name: 'Pipeline Status', mimeType: 'application/json' },
      { uri: 'heady://brain/health', name: 'Brain Health', mimeType: 'application/json' },
      { uri: 'heady://metrics', name: 'System Metrics', mimeType: 'application/json' },
    ],
  });
});

app.post('/prompts/:promptId', async (req, res) => {
  const { promptId } = req.params;
  const { arguments: args } = req.body;

  const result = await orchestrator.routeTask({
    task_type: 'PROMPT',
    message: JSON.stringify({ prompt: promptId, args }),
    channel: 'mcp',
  });

  res.json({
    messages: [{
      role: 'assistant',
      content: { type: 'text', text: JSON.stringify(result) },
    }],
  });
});

// Mount orchestrator routes
app.use('/api/orchestrator', orchestrator.createRouter());

// ─── START ────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[MCP Gateway] Running on port ${PORT}`);
    console.log(`[MCP Gateway] Tools: ${Object.keys(TOOL_REGISTRY).length}`);
    console.log(`[MCP Gateway] Orchestrator: ${JSON.stringify(orchestrator.getHealth().metrics)}`);
  });
}

module.exports = { app, TOOL_REGISTRY, orchestrator };
