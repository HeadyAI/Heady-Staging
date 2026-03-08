<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: distribution/ide/windsurf/README.md                                                    ║
<!-- ║  LAYER: root                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# Heady + Windsurf Integration

Heady integrates with Windsurf via MCP Protocol — no separate extension needed.

## How It Works

Windsurf/Cascade already supports MCP servers natively. Heady exposes its capabilities as MCP tools that Windsurf can use directly.

## Setup

1. Add Heady MCP server to your Windsurf MCP config
2. Start heady-manager (`node heady-manager.js` or via Docker)
3. Windsurf can now use all Heady tools

## MCP Config for Windsurf

```json
{
  "mcpServers": {
    "heady": {
      "command": "node",
      "args": ["path/to/heady/mcp-servers/render-mcp-server.js"],
      "env": {
        "HEADY_API_URL": "http://manager.dev.local.heady.internal:3300"
      }
    }
  }
}
```

## Available Tools via MCP

- Chat with Heady agents
- RAG search across workspaces
- Monte Carlo plan optimization
- Pattern recognition insights
- Self-critique and diagnostics
- Layer switching (local/cloud)

## Workflows

Heady workflows in `.windsurf/workflows/` are directly usable by Cascade.
