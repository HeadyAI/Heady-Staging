# New Perplexity Computer Skills — Expansion Pack

## 8 New Skills for the Heady Ecosystem

---

### 1. **heady-ecosystem-auditor**
> Automated health check and gap analysis across the entire Heady ecosystem

**Purpose:** Runs comprehensive audits of service health, skill coverage, patent-code linkage, dependency freshness, and configuration drift across all 9 Heady domains.

**Triggers:** "audit the ecosystem", "check system health", "find gaps", "what's broken"

**Capabilities:**
- Scan all connected services (GitHub repos, Cloudflare Workers, Cloud Run, Neon DB) for health
- Cross-reference skill coverage against GAPS_FOUND.md
- Verify patent claims have corresponding reduction-to-practice code
- Detect stale dependencies, orphaned services, and configuration drift
- Generate prioritized remediation report with effort estimates

**Output:** Structured audit report (Markdown or PPTX) with severity-ranked findings

---

### 2. **heady-prompt-forge**
> Systematic prompt engineering, testing, and evolution for Heady system prompts

**Purpose:** Designs, tests, iterates, and evolves system prompts for HeadyBuddy, LLM routing, and agent instructions using structured frameworks.

**Triggers:** "optimize this prompt", "create a system prompt for", "test prompt variations", "evolve prompts"

**Capabilities:**
- Analyze existing prompts for clarity, completeness, and instruction-following potential
- Generate prompt variants using TRIZ-inspired mutation strategies
- A/B test prompt variants against evaluation criteria
- Maintain prompt version history with performance metrics
- Apply Heady-specific patterns (CSL gating language, phi-math constants, Sacred Geometry terminology)

**Output:** Optimized prompts with evaluation scorecards, variant comparison reports

---

### 3. **heady-visual-dashboard-builder**
> Generates live monitoring dashboards for Heady services using vanilla HTML/CSS/JS

**Purpose:** Creates deployable dashboard pages that visualize service health, coherence scores, swarm activity, pipeline throughput, and provider costs.

**Triggers:** "build a dashboard for", "visualize swarm activity", "show me system metrics", "create a monitoring page"

**Capabilities:**
- Generate interactive data visualization components (gauges, charts, heatmaps, topology maps)
- Connect to Heady's health endpoints and MCP services for live data
- Apply Sacred Geometry design system (dark glassmorphism, phi-proportioned layouts)
- Deploy as static sites via Cloudflare Pages or S3
- Auto-refresh with configurable Fibonacci-timed polling intervals

**Output:** Deployable HTML dashboard with real-time data connections

---

### 4. **heady-migration-planner**
> Plans and executes zero-downtime database and service migrations

**Purpose:** Designs migration strategies for schema changes, service upgrades, provider switches, and data transformations with rollback support.

**Triggers:** "plan a migration", "upgrade the database", "switch providers", "migrate data from X to Y"

**Capabilities:**
- Analyze current state via connected services (GitHub, Neon, Cloudflare)
- Design expand-contract migration strategies with blue-green deployment support
- Generate migration scripts with up/down functions and checksums
- Plan phi-staged rollouts (5% → 8% → 13% → 21% → 34% → 55% → 89% → 100%)
- Simulate migration via Neon branch testing before production execution

**Output:** Migration plan document, executable scripts, rollback procedures, risk assessment

---

### 5. **heady-patent-reducer**
> Reduction-to-practice documentation for Heady's 60+ provisional patents

**Purpose:** Generates detailed reduction-to-practice (RTP) documentation linking patent claims to actual implemented code in the Heady ecosystem.

**Triggers:** "document patent reduction", "link claims to code", "prepare patent filing", "prior art check"

**Capabilities:**
- Parse patent claim language and map to code implementations via semantic search
- Generate claim charts with code snippets, file paths, and CSL-scored relevance
- Run prior art searches using academic and patent databases
- Produce filing-ready RTP documents with proper legal structure
- Track patent portfolio status and upcoming deadlines

**Output:** Claim charts, RTP documents (DOCX), prior art analysis reports, portfolio tracker

---

### 6. **heady-connector-synthesizer**
> Dynamically creates new external service connectors using MCP patterns

**Purpose:** Given an API specification (OpenAPI/Swagger, GraphQL schema, or documentation URL), generates a complete MCP-compatible connector with tools, auth, and rate limiting.

**Triggers:** "connect to [service]", "create a connector for [API]", "integrate with [platform]"

**Capabilities:**
- Parse OpenAPI specs, GraphQL schemas, or scrape API documentation
- Generate MCP tool definitions with proper JSON schemas
- Implement OAuth2/API key authentication flows
- Add phi-scaled rate limiting and circuit breaker patterns
- Create health check endpoints and Server Card metadata
- Generate connector tests and usage documentation

**Output:** Complete MCP connector package (JS/TS files), documentation, test suite

---

### 7. **heady-war-room**
> Real-time incident response coordination using connected tools

**Purpose:** Orchestrates incident response across GitHub, Slack, monitoring tools, and Heady services — creating timelines, coordinating responders, and generating post-mortems.

**Triggers:** "incident in [service]", "something is broken", "start war room", "production issue"

**Capabilities:**
- Correlate alerts across connected monitoring services
- Create incident timeline from GitHub commits, deployments, and service logs
- Coordinate responder actions via Slack/messaging integrations
- Run forensic analysis using ForensicSwarm
- Generate post-mortem documents with root cause, timeline, and action items
- Update status pages and stakeholder communications

**Output:** Live incident dashboard, post-mortem document, remediation tickets

---

### 8. **heady-knowledge-weaver**
> Ingests multiple sources into unified, LLM-ready knowledge packages

**Purpose:** Takes repositories, documents, Notion pages, and web content and weaves them into structured knowledge packages optimized for LLM context consumption.

**Triggers:** "create a knowledge pack for", "compile docs from", "prepare briefing on", "ingest this repo"

**Capabilities:**
- Clone and analyze Git repositories for architecture understanding
- Extract and structure content from Notion, Google Docs, and web pages
- Generate executive summaries, technical deep-dives, and FAQ compilations
- Produce NotebookLM-compatible knowledge sources
- Create embedding-indexed knowledge bases for RAG retrieval
- Maintain version history as source materials update

**Output:** Knowledge package (ZIP with Markdown docs, embeddings, metadata), briefing document

---

## Skill Registration

All skills follow the standard Perplexity Computer skill format:

```yaml
# SKILL.md frontmatter
name: heady-ecosystem-auditor
version: 1.0.0
triggers:
  - audit the ecosystem
  - check system health
  - find gaps
requires:
  - github_mcp_direct
  - notion_mcp
```

Each skill is designed to work standalone or as part of the `heady-os-orchestrator` meta-skill that coordinates multi-domain work across the ecosystem.
