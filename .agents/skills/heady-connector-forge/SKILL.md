---
name: heady-connector-forge
description: Use when dynamically generating, deploying, and managing connectors to any external service, API, or platform. Handles the full ConnectorForgeSwarm lifecycle — API discovery, schema extraction, auth pattern detection, code generation, security scanning, integration testing, and deployment. Keywords include connector forge, generate connector, build integration, API adapter, dynamic MCP server, connector factory.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: ConnectorForgeSwarm
  absorption_source: "§6.3 — Dynamic Connector Generation (v7)"
  super_prompt_section: "§6"
---

# Heady™ Connector Forge (ConnectorForgeSwarm)

## When to Use This Skill

Use this skill when:
- A user asks to connect Heady to a new external service
- No built-in connector exists for the target API
- An existing connector is degraded and needs regeneration
- Building a custom MCP server from an OpenAPI spec

## Architecture

### ConnectorForgeSwarm Bee Roster

| Bee | Role | Output |
|---|---|---|
| **APIDiscoveryBee** | Search API docs, OpenAPI specs, MCP Registry (19K+) | Found spec or "undocumented" flag |
| **SchemaExtractionBee** | Parse spec → extract endpoints, auth, types | Typed schema manifest |
| **AuthPatternBee** | Detect OAuth2/API-key/JWT/mTLS | Auth flow config |
| **ConnectorCodeGenBee** | Generate MCP server from `template-mcp-server` | Runnable MCP server code |
| **SecurityScanBee** | WASM sandbox + TruffleHog + SSRF/XSS analysis | Security report |
| **IntegrationTestBee** | Live API testing (sandboxed) | Test results |
| **DeploymentBee** | Register as liquid node → deploy to CF Worker/Cloud Run | Live URL |

### Resolution Chain (§6.4)

1. Check built-in connectors (89 types)
2. Search MCP registries: Glama (19K+), FastMCP (1,864+), official MCP server list
3. Search OpenClaw ClawHub (13,700+ skills) → adapt with WASM isolation
4. Dynamic generation via ConnectorForgeSwarm

### Performance Targets

| Scenario | Target |
|---|---|
| Documented API with OpenAPI spec | < 60 seconds |
| Undocumented API (screen scraping) | < 5 minutes |
| Existing MCP server found | < 10 seconds (consume directly) |

## Instructions

### Generating a New Connector

1. Receive user intent: "Connect Heady to [Service X]"
2. Run resolution chain — check built-ins first, then registries, then forge
3. If forging: spawn ConnectorForgeSwarm with all 7 bees
4. APIDiscoveryBee searches for OpenAPI/Swagger specs, REST docs, GraphQL schemas
5. SchemaExtractionBee parses spec into typed endpoint manifest
6. AuthPatternBee detects auth mechanism and generates flow config
7. ConnectorCodeGenBee generates MCP server from `template-mcp-server`
8. SecurityScanBee runs WASM sandbox + TruffleHog for credential leaks + SSRF/XSS analysis
9. IntegrationTestBee runs live tests against sandboxed API
10. DeploymentBee deploys to CF Worker or Cloud Run and registers as liquid node

### Security Requirements

All external MCP servers pass through **LiquidGateway**:
- OAuth authentication
- Request/response audit trails
- Rate limiting per connector
- Policy enforcement via CSL gates
- Data leak detection (sub-3ms latency)

## Output Format

- MCP Server Code (TypeScript)
- Auth Configuration (JSON)
- Security Scan Report
- Integration Test Results
- Deployment URL
- Liquid Node Registration Receipt
