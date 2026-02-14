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
<!-- ║  FILE: docs/quickstarts/HEADYMCP.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# HeadyMCP Quickstart - Manager Control Plane

## Overview
Central orchestration service for Heady ecosystem. Manages:
- Task scheduling
- Resource allocation
- Service discovery
- Pattern recognition

## Installation
```bash
# Clone repository
git clone https://github.com/HeadySystems/heady-mcp

# Install dependencies
cd heady-mcp
npm install

# Start service
node heady-manager.js
```

## Configuration
Edit `configs/mcp-core.yaml`:
```yaml
port: 3300
databases:
  main: postgres://user:pass@api.headysystems.com:5432/heady
```

## API Access
```bash
# Health check
curl http://api.headysystems.com:3300/api/health

# Get active patterns
curl http://api.headysystems.com:3300/api/patterns
```

## Integration
Set `MCP_URL` in environment variables of dependent services:
```ini
MCP_URL=http://api.headysystems.com:3300
```

## Monitoring
Access dashboard at: `http://api.headysystems.com:3300/dashboard`
