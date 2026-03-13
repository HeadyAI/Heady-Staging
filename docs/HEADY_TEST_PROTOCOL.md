# Heady™ Liquid Latent Dynamic Distributed Async Parallel Intelligent OS
## Comprehensive Test Protocol v1.0

> **Created**: 2026-03-12  
> **Scope**: Full system test protocol for all Heady inner workings  
> **Coverage**: MCP Server, Microservices, Liquid OS, UI/UX, Edge Layer, CMS

---

## 1. System Architecture Summary (Inner Workings)

### 1.1 MCP Server (Master Control Program)
- **Entry**: `services/heady-mcp-server/src/index.js`
- **Protocol**: JSON-RPC 2.0 over 3 transports (stdio, HTTP POST, SSE)
- **Tools**: 42 tools across 7 φ-tiered categories
- **Handler Flow**: `request → HeadyMCPProtocol.handleRequest() → tool registry → callService() → upstream microservice`
- **Sessions**: In-memory Map keyed by `session_${Date.now()}_${random}`

### 1.2 Tool Registry
- **Entry**: `services/heady-mcp-server/src/tools/registry.js`
- **Pattern**: `register({name, description, inputSchema, handler, category, phiTier})`
- **Tiers**: 0=Critical Intelligence, 1=Analysis, 2=Multi-Model AI, 3=Ops, 4=Memory, 5=Edge, 6=Orchestration
- **42 Tools**: 6 intelligence + 6 analysis/exec + 6 AI models + 4 ops + 7 memory + 5 edge + 5 orchestration + 3 CMS

### 1.3 Service Client
- **Entry**: `services/heady-mcp-server/src/tools/service-client.js`
- **Retry**: φ-scaled exponential backoff (delays = 1000 * φ^i ms)
- **Timeout**: φ²+1 ≈ 4.236s default
- **Headers**: `X-Heady-Source: mcp-server`, `X-Heady-Version: 5.0.0`
- **Error Handling**: Returns structured `{status: 'error', service, endpoint, error, attempts, hint}`

### 1.4 φ-Scaled Constants
- **PHI** = 1.618033988749895, **PSI** = 0.618033988749895
- **CSL Gates**: SUPPRESS=0.236, INCLUDE=0.382, BOOST=0.618, INJECT=0.718
- **Fibonacci**: [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987]
- **Ports**: MCP=3310, Brain=3311, Memory=3312, Manager=3313, Auth=3314, Gateway=3315...
- **Rate Limits**: Anon=34, Auth=55, Premium=89, Enterprise=144, Internal=233

### 1.5 Transports
- **stdio**: `services/heady-mcp-server/src/transports/stdio.js` — line-delimited JSON-RPC
- **HTTP**: `services/heady-mcp-server/src/transports/http.js` — Express, POST /mcp, GET /mcp/sse, GET /tools, GET /health
- **SSE**: Event-stream with `endpoint` event containing message URL, session-based routing

### 1.6 Service Architecture (20 registered services)
- Core: brain, memory, soul, vinci, conductor
- Execution: coder, battle, buddy
- Security: guard, maid, lens
- Infrastructure: auth-session, api-gateway, notification, billing, analytics, search, scheduler, hcfp, edge-ai

### 1.7 CMS Layer
- Drupal 11 headless via JSON:API
- 8 content types across 8 sites
- Drupal MCP tools: content CRUD, site management, task management

### 1.8 Edge Layer
- Cloudflare Workers (liquid-gateway-worker)
- 10 Cloudflare Pages projects
- Production routes: api/gateway/app/admin/metrics/ai.headysystems.com

### 1.9 Compute Layer
- 3 Google Colab A100 GPU runtimes
- Vertex AI (gemini-2.5-pro/flash)
- Neon Postgres + Upstash Redis

---

## 2. Test Categories & Protocols

### PROTOCOL A: MCP Protocol Compliance Tests
| ID | Test | Description | Priority |
|----|------|-------------|----------|
| A01 | Initialize handshake | Send `initialize` → verify protocolVersion, capabilities, serverInfo, instructions | P0 |
| A02 | Initialize session tracking | Verify session created in sessions Map | P0 |
| A03 | Initialized notification | Send `initialized` → verify `{acknowledged: true}` | P1 |
| A04 | tools/list complete | Verify 42 tools returned with name, description, inputSchema | P0 |
| A05 | tools/list pagination | Send cursor param → verify subset returned | P1 |
| A06 | tools/call valid tool | Call each tool → verify content array with text type | P0 |
| A07 | tools/call unknown tool | Call nonexistent tool → verify error message | P0 |
| A08 | resources/list | Verify 4 resources: status, services, architecture, phi-constants | P1 |
| A09 | resources/read status | Read heady://system/status → verify uptime, tools, phi | P0 |
| A10 | resources/read services | Read heady://system/services → verify all 20 services | P1 |
| A11 | resources/read phi-constants | Read heady://docs/phi-constants → verify PHI, PSI, CSL | P1 |
| A12 | resources/read architecture | Read heady://docs/architecture → verify markdown content | P2 |
| A13 | resources/read unknown | Read unknown URI → verify error | P1 |
| A14 | prompts/list | Verify 2 prompts: system-prompt, deep-analysis | P2 |
| A15 | prompts/get system-prompt | Get with focus arg → verify messages array | P2 |
| A16 | prompts/get deep-analysis | Get with target arg → verify messages with CSL references | P2 |
| A17 | ping | Send ping → verify status ok + uptime | P0 |
| A18 | Unknown method | Send unknown method → verify -32601 error | P0 |
| A19 | JSON-RPC id propagation | Verify response id matches request id | P0 |
| A20 | Notification handling | Send request with no id → verify null return | P1 |

### PROTOCOL B: Tool Registry Integrity Tests
| ID | Test | Description | Priority |
|----|------|-------------|----------|
| B01 | All 42 tools registered | Count tools array length = 42 | P0 |
| B02 | No duplicate names | Verify unique tool names | P0 |
| B03 | Valid inputSchema | Every tool has valid JSON Schema with type: 'object' | P0 |
| B04 | Required fields present | Every tool has name, description, inputSchema | P0 |
| B05 | Handlers mapped | Every tool name exists in handlers Map | P0 |
| B06 | Category assignment | Every handler has a category string | P1 |
| B07 | phiTier assignment | Every handler has numeric phiTier 0-6 | P1 |
| B08 | Tier distribution | Verify expected count per tier | P2 |
| B09 | Tool name convention | All names start with `heady_` | P1 |
| B10 | Description quality | All descriptions > 20 chars | P2 |

### PROTOCOL C: Service Client & Resilience Tests
| ID | Test | Description | Priority |
|----|------|-------------|----------|
| C01 | callService valid | Call with known service → verify structured response | P0 |
| C02 | callService unknown service | Call with unknown service → verify `{status: 'unavailable'}` | P0 |
| C03 | φ-retry delays | Verify phiRetryDelays produces [1000, 1618, 2618, 4236, 6854] | P0 |
| C04 | Timeout enforcement | Verify request aborted at φ²+1 seconds | P1 |
| C05 | Retry on failure | Mock failing endpoint → verify retry count | P1 |
| C06 | Error shape | Verify error has: status, service, endpoint, error, attempts, hint | P0 |
| C07 | Health check healthy | Mock 200 health → verify `{status: 'healthy'}` | P1 |
| C08 | Health check unhealthy | Mock timeout → verify `{status: 'unhealthy'}` | P1 |
| C09 | Headers sent | Verify X-Heady-Source and X-Heady-Version headers | P1 |
| C10 | GET method support | Verify GET requests don't send body | P2 |

### PROTOCOL D: φ-Constants Mathematical Integrity Tests
| ID | Test | Description | Priority |
|----|------|-------------|----------|
| D01 | PHI precision | PHI === 1.618033988749895 | P0 |
| D02 | PSI = 1/PHI | PSI === 1/PHI within ε | P0 |
| D03 | PSI2 = 1-PSI | PSI2 === 1-PSI within ε | P0 |
| D04 | PHI² = PHI+1 | Verify golden ratio property | P0 |
| D05 | Fibonacci correctness | FIB[i] = FIB[i-1] + FIB[i-2] for all i>1 | P0 |
| D06 | CSL gate thresholds ordered | SUPPRESS < INCLUDE < BOOST < INJECT | P0 |
| D07 | cslGate suppress | signal with confidence < 0.236 → returns 0 | P0 |
| D08 | cslGate include | confidence between SUPPRESS and threshold → signal * PSI2 | P0 |
| D09 | cslGate boost | confidence >= threshold → signal * confidence | P0 |
| D10 | cslGate inject | confidence >= 0.718 → signal * PHI | P0 |
| D11 | Port uniqueness | All PORTS values unique | P0 |
| D12 | Rate limit Fibonacci | Each rate limit is a Fibonacci number | P1 |
| D13 | Timeout φ-scaling | Each timeout = base * φ^tier | P1 |

### PROTOCOL E: HTTP Transport Tests
| ID | Test | Description | Priority |
|----|------|-------------|----------|
| E01 | GET /health | Returns 200 with status, version, tools count, phi | P0 |
| E02 | GET /tools | Returns all 42 tools with total count | P0 |
| E03 | GET /services | Returns all service endpoints | P1 |
| E04 | POST /mcp initialize | JSON-RPC initialize → valid response | P0 |
| E05 | POST /mcp tools/list | JSON-RPC tools/list → 42 tools | P0 |
| E06 | POST /mcp tools/call | JSON-RPC tool call → valid result | P0 |
| E07 | POST /mcp batch | Array of requests → array of responses | P1 |
| E08 | POST /mcp error | Invalid request → 500 with JSON-RPC error | P1 |
| E09 | GET /mcp/sse | Returns 200 text/event-stream with endpoint event | P0 |
| E10 | POST /mcp/message | Valid session → 202 accepted | P1 |
| E11 | POST /mcp/message invalid | Unknown session → 404 | P1 |
| E12 | GET /.well-known/mcp.json | MCP discovery document | P1 |
| E13 | CORS headers | Verify allowed origins include heady domains | P1 |
| E14 | GET / JSON | Accept: json → JSON landing | P2 |
| E15 | GET / HTML | Default → HTML landing page | P2 |

### PROTOCOL F: Website & UI/UX Functional Tests
| ID | Test | Description | Priority |
|----|------|-------------|----------|
| F01 | headysystems.com loads | HTTP 200 on root | P0 |
| F02 | headysystems.com/health | API health endpoint responsive | P0 |
| F03 | headyme.com loads | HTTP 200 on root | P0 |
| F04 | headyconnection.org loads | HTTP 200 on root | P1 |
| F05 | Onboarding flow entry | headyme.com → onboarding wizard accessible | P0 |
| F06 | Context switcher render | ContextSwitcher.tsx renders with contexts | P0 |
| F07 | Context switch action | Click context → loads correct config | P1 |
| F08 | Responsive layout | Pages render at 320, 768, 1024, 1440px | P1 |
| F09 | Accessibility (a11y) | WCAG 2.1 AA compliance on key pages | P2 |
| F10 | Performance budget | LCP < 2.5s, FID < 100ms, CLS < 0.1 | P1 |

### PROTOCOL G: Liquid OS Integration Tests
| ID | Test | Description | Priority |
|----|------|-------------|----------|
| G01 | Manifest loads | liquid-os-manifest.json parseable with correct structure | P0 |
| G02 | All domains listed | 10+ pages_projects in edge_layer | P0 |
| G03 | Service ports match | Origin layer ports match phi-constants | P0 |
| G04 | Auth layer config | Firebase project, auth/verify URLs present | P1 |
| G05 | CMS API routes | All 6 CMS API paths defined | P1 |
| G06 | GitHub org reference | github.org = "HeadyMe" | P1 |
| G07 | Monitoring config | Sentry DSN present and valid format | P1 |
| G08 | Compute runtimes | 3 Colab A100 runtimes with phi vectors | P2 |

---

## 3. Test Execution Priority

**Phase 1 (Critical Path — Day 1)**:  
A01-A04, A06-A07, A17-A19, B01-B05, C01-C03, C06, D01-D06, E01-E02, E04-E06, G01

**Phase 2 (Core Coverage — Day 2-3)**:  
A05, A08-A11, A13, A20, B06-B09, C04-C05, C07-C09, D07-D11, E03, E07-E13, F01-F03, F05-F07, G02-G06

**Phase 3 (Full Coverage — Day 4-5)**:  
All remaining: A12, A14-A16, B10, C10, D12-D13, E14-E15, F04, F08-F10, G07-G08

---

## 4. Environment Requirements

```bash
# Required env vars for full test suite
NODE_ENV=test
HEADY_MCP_TRANSPORT=http
HEADY_MCP_PORT=3310
HEADY_SERVICE_HOST=localhost
HEADY_TEST_URL=https://heady-manager-609590223909.us-central1.run.app
DRUPAL_BASE_URL=https://cms.headysystems.com
```

## 5. Test Runner

```bash
# Run all protocol tests
npx jest tests/protocol/ --verbose

# Run specific protocol
npx jest tests/protocol/mcp-protocol-compliance.test.js

# Run with coverage
npx jest tests/protocol/ --coverage --coverageDirectory=coverage/protocol
```
