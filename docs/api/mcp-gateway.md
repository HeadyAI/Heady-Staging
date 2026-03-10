# MCP Gateway API Reference

**Base:** `http://localhost:3301/mcp/v1`
**Auth:** `Authorization: Bearer <MCP_BEARER_TOKEN>`

## Endpoints

### List Tools
`GET /mcp/v1/tools/list` → `{ tools: [...] }`

### Get Schema
`GET /mcp/v1/tools/:toolName/schema` → `{ name, description, inputSchema }`

### Invoke Tool
`POST /mcp/v1/tools/:toolName` with `{ arguments: {...} }` → `{ result: {...} }`

## Built-in Tools
| Tool | Description |
|---|---|
| `memory_ingest` | Store a memory with embedding |
| `memory_query` | Search the vector memory store |
| `agent_list` | List all registered agents |
| `agent_status` | Get agent status by ID |
| `health_check` | System health check |

## Error Codes
| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request |
| 401 | Unauthorized |
| 404 | Tool not found |
| 429 | Rate limited |
| 500 | Internal error |

## IDE Integration
See `.mcp/config.example.json` for Windsurf/Cursor/VS Code configuration.
