# Heady™ Claude Skills & Agents Manifest

## Skills (6 total)

| Skill | MCP Tools | Description |
|-------|-----------|-------------|
| **heady-intelligence** | deep_scan, analyze, risks, patterns, refactor | Deep analysis, pattern detection, risk assessment |
| **heady-memory** | memory, embed, learn, recall, vector_store/search/stats, memory_stats | Persistent vector memory and knowledge management |
| **heady-orchestrator** | auto_flow, orchestrator, hcfp_status, csl_engine, agent_orchestration | Multi-step workflows and pipeline execution |
| **heady-coder** | coder, battle, buddy, chat, claude, openai, gemini, groq, complete | Multi-model code generation and competition |
| **heady-ops** | deploy, health, ops, maintenance, maid, telemetry, edge_ai, search, template_stats | DevOps, deployment, monitoring, maintenance |
| **heady-cms** | cms_content, cms_taxonomy, cms_media, cms_views, cms_search | Drupal CMS content management for 9 websites |

## Agents (4 total)

| Agent | Role | Primary Skills |
|-------|------|---------------|
| **Heady Brain** | Central cognitive engine | All 47 tools |
| **Heady Researcher** | Autonomous research | intelligence, memory |
| **Heady DevOps** | Platform operations | ops, memory |
| **Heady Content** | Content management | cms, memory, intelligence |

## MCP Connection

### Claude Desktop / Claude Code (stdio)
```json
{
  "mcpServers": {
    "heady": {
      "command": "node",
      "args": ["path/to/services/heady-mcp-server/src/index.js"],
      "env": { "HEADY_MCP_TRANSPORT": "stdio" }
    }
  }
}
```

### Cursor (stdio)
```json
{
  "mcpServers": {
    "heady": {
      "command": "node",
      "args": ["path/to/services/heady-mcp-server/src/index.js"],
      "env": { "HEADY_MCP_TRANSPORT": "stdio" }
    }
  }
}
```

### Remote HTTP (Streamable HTTP)
```json
{
  "mcpServers": {
    "heady": {
      "url": "http://localhost:3310/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

### SSE (Legacy)
```json
{
  "mcpServers": {
    "heady": {
      "url": "http://localhost:3310/mcp/sse",
      "transport": "sse"
    }
  }
}
```

## Service Topology

```
HeadyMCP Server (3310) ─── 47 MCP Tools
  ├── Intelligence: Brain (3311), Soul (3321), Vinci (3322)
  ├── Memory: Memory (3312), Vector Store
  ├── Orchestration: Conductor (3323), HCFP (3330)
  ├── Execution: Coder (3324), Battle (3325), Buddy (3326)
  ├── Security: Guard (3329), Auth (3314)
  ├── Infrastructure: Gateway (3315), Analytics (3318), Search (3319)
  ├── Operations: Maid (3328), Scheduler (3320), Edge (3331)
  └── CMS: Drupal JSON:API (9 sites)
```

## Quick Start

1. Install: `cd services/heady-mcp-server && npm install`
2. Start: `./scripts/heady-start.sh stdio`
3. Add to Claude Desktop config
4. Use any skill: "Scan my project", "Remember this", "Deploy to production"
