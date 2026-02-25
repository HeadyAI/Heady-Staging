<!--
  © 2026 Heady Systems LLC.
  PROPRIETARY AND CONFIDENTIAL.
  Unauthorized copying, modification, or distribution is strictly prohibited.
-->
# HeadyMCP — Quick Start Guide

> Last updated: February 2026

## What is HeadyMCP?

HeadyMCP is the Heady AI connector marketplace — a verified registry of 40+ MCP tools that extend AI assistant capabilities with real Heady infrastructure access.

**Live at:** <https://headymcp.com>

## Installation

HeadyMCP tools are consumed via the MCP (Model Context Protocol) standard. Add the Heady MCP server to your AI assistant's configuration:

### For AntiGravity / Windsurf / VS Code

Edit `~/.config/windsurf-next/mcp_config.json`:

```json
{
  "mcpServers": {
    "heady-local": {
      "command": "node",
      "args": ["/home/headyme/Heady/src/mcp/heady-mcp-server.js"],
      "env": {
        "HEADY_BRAIN_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| **Chat & Reasoning** | `heady_chat`, `heady_claude`, `heady_gemini`, `heady_groq`, `heady_openai` | Multi-provider AI chat through the Liquid Gateway |
| **Code Generation** | `heady_coder`, `heady_codex`, `heady_copilot` | Code generation, transformation, and inline suggestions |
| **Analysis** | `heady_analyze`, `heady_patterns`, `heady_risks` | Code analysis, pattern detection, risk assessment |
| **Operations** | `heady_deploy`, `heady_ops`, `heady_maintenance`, `heady_maid` | Deployment, infrastructure, monitoring, cleanup |
| **Research** | `heady_perplexity_research`, `heady_search` | Deep research and knowledge base search |
| **Memory** | `heady_embed`, `heady_deep_scan`, `heady_soul`, `heady_vinci` | Embeddings, workspace mapping, learning, prediction |
| **Creative** | `heady_lens`, `heady_edge_ai` | Vision analysis, edge AI inference |
| **Battle** | `heady_battle`, `heady_auto_flow` | Arena mode competition, automated workflows |
| **Integration** | `heady_notion`, `heady_huggingface_model`, `heady_jules_task` | Third-party service integration |

## Example Usage

### Chat with HeadyBrain

```
heady_chat: "Explain the HeadyConductor routing architecture"
```

### Run Arena Mode Battle

```
heady_battle: { action: "arena", task: "Optimize this React component" }
```

### Deep Research

```
heady_perplexity_research: { query: "post-quantum cryptography standards 2026", mode: "deep" }
```

### Deploy a Service

```
heady_deploy: { action: "deploy", service: "heady-conductor" }
```

## Security

All MCP tool invocations pass through:

- **PQC-signed handshake** verification
- **Redis-backed rate limiting** (sliding window)
- **IP classification** enforcement (PROPRIETARY tools blocked in pub context)
- **mTLS** for inter-service communication

## Governance

Tool access is governed by subscription tier:

| Tier | Available Tools |
|------|----------------|
| Free | `heady_chat`, `heady_search`, `heady_analyze` |
| Pro | All tools except `heady_battle` arena mode |
| Enterprise | Full access including custom tool registration |
