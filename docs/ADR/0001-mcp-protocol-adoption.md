# ADR-0001: Adopt MCP as Unified Tool Gateway
**Date:** 2025-01-15 | **Status:** Accepted

## Context
20+ services each with custom APIs. High maintenance burden.

## Decision
Adopt MCP with bearer-token auth, routed through HeadyManager.

## Consequences
### Positive
- Single auth/routing layer
- IDE compatible (Windsurf, Cursor, VS Code)
- Standard tool discovery

### Negative
- ~5-10ms latency per request
- MCP spec still evolving
