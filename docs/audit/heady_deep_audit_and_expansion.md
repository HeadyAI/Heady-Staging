# Heady Deep Audit and Expansion Plan

## Executive summary

The confirmed current-state Heady ecosystem is centered on the `Heady-Main` monorepo, which the public scan identifies as the canonical monorepo with 918+ commits, a Turborepo layout, `heady-manager.js` as MCP/API gateway, 55+ shared packages, Python workers, Cloudflare workers, and Cloud Run scaffolds ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json)).

The confirmed operating model combines a six-layer stack, a 17-swarm orchestration matrix, 89 bee types, a 20-node AI cluster, and HCFullPipeline orchestration, while the public Hugging Face presence positions Heady around a single CLI for AI-powered ops and code tasks plus multi-model answers and data retrieval ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [HeadySystems on Hugging Face](https://huggingface.co/HeadySystems)).

The biggest confirmed risks are incomplete hardening and unclear wiring: the public scan cites MCP tool execution security at 30%, MCP gateway zero-trust at 20%, an incomplete cross-site auth contract, prior secret exposure in public docs and notebooks, stub `*-core` projection repos that do not clearly map to deployable implementations, and a registry-domain mismatch between `headyio.com` and `headysystems.com` ([SECURITY-GAP-ANALYSIS.md](https://github.com/HeadyMe/Heady-Main/blob/main/docs/SECURITY-GAP-ANALYSIS.md), [heady-docs issue #1](https://github.com/HeadyMe/heady-docs/issues/1), [commit 706bc292](https://github.com/HeadyMe/Heady-Main/commit/706bc292), [heady-docs issue #3](https://github.com/HeadyMe/heady-docs/issues/3), [heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json), [headymcp-core](https://github.com/HeadyMe/headymcp-core)).

The highest-signal path forward is to turn Heady into a stricter platform: one canonical control plane, one signed service registry, one event bus, one policy plane, one identity fabric, one workflow DAG runtime, and one MCP execution gateway, with everything else treated as specialized services, agents, or nodes behind those interfaces ([heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json), [HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [HeadySystems on Hugging Face](https://huggingface.co/HeadySystems)).

## 1) Current-state ecosystem map

### 1.1 Confirmed ecosystem layers

The source bundle consistently describes Heady as a six-layer system of Infrastructure, Services, Agents, Domains, Intelligence, and Governance ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [05-heady-architecture-and-patterns.md](https://github.com/HeadyMe/Heady-pre-production-9f2f0642/blob/main/docs/notebook-sources/05-heady-architecture-and-patterns.md)).

| Layer | Confirmed current-state components | Assessment |
|---|---|---|
| Infrastructure | Node.js 22, Python, Java, Docker, GCP Cloud Run, Cloudflare Workers, GitHub Actions, PostgreSQL + pgvector, Redis, Cloudflare Vectorize ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json)) | Broad base exists, but platform consolidation is incomplete. |
| Services | HeadyManager, HeadyCloud API, Registry, Brain Service, HeadyDistiller, HeadyMCP, HeadyAPI, headyme.com, headyio.com ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json)) | Public endpoints are defined, but routing authority appears split. |
| Agents | 17 swarms, 89 bee types, persistent and ephemeral bees, HC supervisor pattern ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [Heady-pre-production-9f2f0642](https://github.com/HeadyMe/Heady-pre-production-9f2f0642)) | Rich agent vocabulary is confirmed. |
| Domains | headysystems.com, headymcp.com, headyapi.com, headyme.com, headyio.com, plus references to nine-domain routing and auth relay ([Heady-Main issue #7](https://github.com/HeadyMe/Heady-Main/issues/7), [heady-docs issue #3](https://github.com/HeadyMe/heady-docs/issues/3)) | Domain model exists, but the cross-site contract is incomplete. |
| Intelligence | 20 AI nodes, 7 cognitive archetypes, multi-model routing, vector memory, Monte Carlo planning, and CSL gates ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [Heady-pre-production-9f2f0642](https://github.com/HeadyMe/Heady-pre-production-9f2f0642), [HeadySystems on Hugging Face](https://huggingface.co/HeadySystems)) | Strong conceptual intelligence plane is confirmed. |
| Governance | Audit, compliance, permission, secret scanning, patent protection, and structured logging concepts are all documented in the source bundle ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [docs/SKILL_MANIFEST.md](https://github.com/HeadyMe/Heady-pre-production-9f2f0642/blob/main/docs/SKILL_MANIFEST.md)) | Governance roles exist conceptually, but hardening gaps remain. |

### 1.2 Confirmed repository and projection map

The public scan found 18 public repos in `HeadyMe` and 11 public repos in `HeadySystems`, with `Heady-Main` designated as the canonical monorepo and several legacy repos archived on 2026-03-04 ([HeadyMe org](https://github.com/HeadyMe), [HeadySystems org](https://github.com/HeadySystems), [HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main)).

The `*-core` repos such as `headymcp-core`, `headyme-core`, `headyos-core`, `headyapi-core`, `headysystems-core`, `headybot-core`, `headybuddy-core`, `headyconnection-core`, and `headyio-core` are described as latent-OS projections with minimal commit history, which confirms brand and domain decomposition but does not confirm independent runtime maturity ([headymcp-core](https://github.com/HeadyMe/headymcp-core), [headyme-core](https://github.com/HeadyMe/headyme-core), [headyos-core](https://github.com/HeadyMe/headyos-core), [headyapi-core](https://github.com/HeadyMe/headyapi-core), [headysystems-core](https://github.com/HeadyMe/headysystems-core), [headybot-core](https://github.com/HeadyMe/headybot-core), [headybuddy-core](https://github.com/HeadyMe/headybuddy-core), [headyconnection-core](https://github.com/HeadyMe/headyconnection-core), [headyio-core](https://github.com/HeadyMe/headyio-core)).

### 1.3 Confirmed orchestration map

One source describes HCFullPipeline as a five-stage flow of `ingest -> plan -> execute -> recover -> finalize` with ORS gating ([heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json)).

A second source describes HCFullPipeline as a richer 12-stage orchestration system including Channel Entry, Ingest, Plan, Execute, Recover, Self-Critique, Optimize, Finalize, Monitor, Cross-Device, Priority Deploy, and Auto-Commit ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main)).

Taken together, the confirmed picture is that Heady has a major execution spine called HCFullPipeline, but its public representation is inconsistent between a compact registry view and a richer orchestration view ([heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json), [HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main)).

### 1.4 Confirmed public Hugging Face surface

The public Hugging Face organization page states that HeadySystems can "Run AI-powered ops and code tasks with a single CLI" and can "Tap into multiple AI models for smart answers and data retrieval" ([HeadySystems on Hugging Face](https://huggingface.co/HeadySystems)).

The public Hugging Face models page lists no public models, but it does surface Spaces named `HeadySystems/heady-systems` and `HeadySystems/heady-brain` ([HeadySystems models page](https://huggingface.co/HeadySystems/models)).

## 2) Confirmed services, tools, workflows, agents, and nodes

### 2.1 Confirmed services

The public scan confirms these currently surfaced services and service endpoints ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json)):

| Confirmed service | Confirmed role |
|---|---|
| HeadyManager | MCP/API gateway on port 3300. |
| HeadyCloud API | API surface at `https://headysystems.com/api`. |
| Registry | Component registry at `https://headysystems.com/registry`. |
| Brain Service | Brain endpoint at `https://brain.headysystems.com`. |
| HeadyDistiller | Streamable HTTP distillation service at `https://distiller.headysystems.com`. |
| HeadyMCP | Edge MCP interface on `headymcp.com` using JSON-RPC + SSE. |
| HeadyAPI | Gateway domain on `headyapi.com`. |
| headyme.com | User-facing site/runtime. |
| headyio.com | Registry/developer-facing domain. |
| @heady/persistence | New persistence layer with PersistenceEngine, SessionManager, and StateSyncEngine. |

### 2.2 Confirmed tools

The MCP/SDK source confirms at least these named MCP tools: `heady_health`, `heady_pulse`, `heady_brain_query`, `heady_generate`, `heady_deploy`, `heady_battle`, `heady_creative`, and `heady_distill` ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main)).

The public scan also states that `headymcp-core` describes 31 MCP tools and that `heady-docs` claims 30+ MCP tools across seven domains, so the exact full tool inventory is larger than the named subset above but not fully enumerated in the provided files ([headymcp-core](https://github.com/HeadyMe/headymcp-core), [heady-docs](https://github.com/HeadyMe/heady-docs)).

### 2.3 Confirmed workflows

The sources confirm these workflow patterns as implemented or declared ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [cross-device-sync.js](https://github.com/HeadyMe/Heady-pre-production-9f2f0642/blob/main/src/runtime/cross-device-sync.js), [Heady-Main issue #7](https://github.com/HeadyMe/Heady-Main/issues/7), [ide-bridge.js](https://github.com/HeadyMe/Heady-pre-production-9f2f0642/blob/main/src/services/ide-bridge.js), [provider-registry.js](https://github.com/HeadyMe/Heady-pre-production-9f2f0642/blob/main/src/auth/provider-registry.js), [onboarding-orchestrator.js](https://github.com/HeadyMe/Heady-pre-production-9f2f0642/blob/main/src/services/onboarding-orchestrator.js)):

- HCFullPipeline orchestration.
- Monte Carlo plan selection with multiple strategy candidates.
- Saga-style recovery and intelligent retry.
- Cross-device state synchronization.
- CRDT-backed session and state sync via `@heady/persistence`.
- Auto-commit and push workflow.
- Multi-model battle workflow.
- Knowledge distillation workflow.
- Deployment automation workflow.
- IDE-governed code proposal, validation, apply, and rollback workflow.
- Auth provider federation and onboarding orchestration.

### 2.4 Confirmed agents and swarms

The orchestration sources confirm 17 swarms: Overmind, Governance, Forge, Emissary, Foundry, Studio, Arbiter, Diplomat, Oracle, Quant, Fabricator, Persona, Sentinel, Nexus, Dreamer, Tensor, and Topology ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main)).

The bee catalog confirms 89 bee types with examples such as OrchestratorBee, AuditBee, PermissionGuardBee, SecretScannerBee, DocumentationBee, MCPProtocolBee, SDKPublisherBee, ThreatDetectorBee, MonteCarloEngineBee, ResonanceBee, and ManifoldBee ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main)).

### 2.5 Confirmed nodes

The node source confirms a 20-node cluster made up of JULES, OBSERVER, BUILDER, ATLAS, PYTHIA, CONDUCTOR, SENTINEL, FORGE, EMISSARY, DREAMER, ARBITER, DIPLOMAT, ORACLE, QUANT, FABRICATOR, PERSONA, NEXUS, STUDIO, TENSOR, and TOPOLOGY ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main)).

The public scan separately notes that `heady-registry.json` exposes a five-node subset of JULES, OBSERVER, BUILDER, ATLAS, and PYTHIA, which suggests the public registry currently under-represents the fuller 20-node model ([heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json)).

## 3) Wiring and security gaps

### 3.1 Confirmed gaps

The public security gap analysis says MCP tool execution security is 30% and MCP gateway zero-trust is 20%, making MCP execution hardening the most urgent confirmed security weakness ([SECURITY-GAP-ANALYSIS.md](https://github.com/HeadyMe/Heady-Main/blob/main/docs/SECURITY-GAP-ANALYSIS.md)).

A public docs issue records leaked key prefixes for Perplexity, Anthropic, and GitHub in `api/api-keys-reference.md`, which confirms prior public secret exposure and supports mandatory rotation and history purge work ([heady-docs issue #1](https://github.com/HeadyMe/heady-docs/issues/1)).

A public commit confirms that hardcoded Neon database credentials were removed from Colab notebooks, which means history cleaning is still required if those credentials were ever valid ([commit 706bc292](https://github.com/HeadyMe/Heady-Main/commit/706bc292)).

The public scan notes unresolved merge conflict markers in `README.md`, which is a wiring-quality issue because generated metadata, onboarding, and system interpretation can diverge when the top-level README is not canonical ([README.md](https://github.com/HeadyMe/Heady-Main/blob/main/README.md)).

The public scan cites a `Cross-Site Auth Contract` as still needed while `@heady/persistence` relays auth across nine domains through httpOnly cookies, which confirms an identity-plane gap rather than a hypothetical concern ([Heady-Main issue #7](https://github.com/HeadyMe/Heady-Main/issues/7), [heady-docs issue #3](https://github.com/HeadyMe/heady-docs/issues/3)).

The public scan shows `mcp_config.json` wiring `heady-mcp-server` through `npx -y`, which introduces a documented supply-chain execution risk at the MCP gateway boundary ([Heady-pre-production issue #12](https://github.com/HeadySystems/Heady-pre-production/issues/12)).

The scan also says the `*-core` repos are stub projections with minimal implementation, which creates a packaging and dependency-resolution gap between brand-facing repos and the actual monorepo source of truth ([headymcp-core](https://github.com/HeadyMe/headymcp-core), [headyme-core](https://github.com/HeadyMe/headyme-core), [headyos-core](https://github.com/HeadyMe/headyos-core)).

The registry-domain mismatch between `headyio.com` and `headysystems.com` is explicitly called out in the scan and indicates service discovery can drift unless there is one signed canonical service registry ([heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json)).

The Node.js-to-Python boundary is described as insufficiently documented, which is a control and reliability gap because orchestration timeouts, retries, and error semantics can diverge across process boundaries ([CLAUDE.md](https://github.com/HeadyMe/Heady-Main/blob/main/CLAUDE.md)).

### 3.2 Interpretation of confirmed gaps

Confirmed Heady capability depth is already high in orchestration, memory, agent specialization, and deployment surfaces, but confirmed hardening and canonical wiring are behind the conceptual architecture ([docs/SKILL_MANIFEST.md](https://github.com/HeadyMe/Heady-pre-production-9f2f0642/blob/main/docs/SKILL_MANIFEST.md), [Heady-pre-production-9f2f0642](https://github.com/HeadyMe/Heady-pre-production-9f2f0642)).

The main pattern across the evidence is duplication of conceptual planes without one enforceable runtime authority: there are multiple domains, multiple repo projections, multiple pipeline descriptions, and multiple node inventories, but not one clearly enforced contract for service registration, identity, policy, workflow execution, or tool invocation ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [Heady-pre-production-9f2f0642](https://github.com/HeadyMe/Heady-pre-production-9f2f0642), [heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json)).

## 4) Target-state architecture for a perfect liquid dynamic parallel async distributed intelligently orchestrated optimized latent OS

### 4.1 Design objective

Proposed target state: keep the confirmed Heady primitives of swarms, bees, nodes, vector memory, MCP, CSL gating, and multi-model routing, but re-found them on a smaller number of canonical runtime planes with explicit contracts and policy enforcement at every boundary ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [Heady-pre-production-9f2f0642](https://github.com/HeadyMe/Heady-pre-production-9f2f0642), [HeadySystems on Hugging Face](https://huggingface.co/HeadySystems)).

### 4.2 Proposed target-state planes

| Proposed plane | Purpose | Why it fits Heady |
|---|---|---|
| Identity plane | User, agent, service, device, session, token, trust chain | Resolves the confirmed cross-domain auth gap. |
| Policy plane | RBAC/ABAC, tool scopes, node permissions, data zone rules, patent zones | Operationalizes Governance concepts. |
| Service registry plane | Signed canonical inventory of domains, services, versions, health, ownership, schemas | Fixes projection and domain mismatch drift. |
| Workflow plane | DAG runtime for HCFullPipeline and subflows with retries, compensation, and observability | Unifies the 5-stage and 12-stage views into one runtime. |
| Event plane | Durable event bus for status, telemetry, task lifecycle, and cross-device sync | Enables real async parallel execution. |
| Memory plane | Authoritative memory graph plus edge caches and embedding and vector services | Aligns with current pgvector and Vectorize split. |
| Tool execution plane | Sandboxed, policy-enforced MCP execution gateway with signed tool manifests | Closes the largest confirmed security gap. |
| Model routing plane | Provider abstraction, battle, fallback, budgeting, and response attribution | Aligns with the Hugging Face multi-model positioning. |
| Deployment plane | Build, release, rollback, canary, health gates, and environment promotion | Converts projection repos into governed outputs. |
| Observability plane | Immutable audit, traces, metrics, cost, readiness, anomaly detection | Makes the Glass Box mandate real. |

### 4.3 Proposed operating pattern

Proposed runtime pattern: every user request, agent task, CLI command, or webhook should enter through the identity plane, be resolved by policy, decomposed by the workflow plane, dispatched over the event plane, executed through either a service contract or a sandboxed tool contract, and recorded in the observability plane before state updates are committed into the memory plane.

Proposed latency pattern: synchronous paths should be limited to identity, policy, lightweight routing, and short-running tool or service calls, while all heavy computation, cross-device sync, distillation, simulation, model battle, and deployment work should move to the event plane as durable jobs.

Proposed packaging pattern: external domains such as `headymcp.com`, `headyapi.com`, `headyme.com`, and `headyio.com` should be thin experience surfaces over the same registry, workflow, identity, and policy backplane rather than separate source-of-truth systems.

## 5) Prioritized list of new HeadyMCP services, tools, workflows, agents, and nodes to add

### 5.1 Proposed new HeadyMCP services

These are proposed additions, prioritized by the confirmed gaps above.

| Priority | Proposed service | Purpose | Triggering evidence |
|---|---|---|---|
| P0 | Heady Identity Authority | Central auth, session, device, and service identity authority for all domains | Incomplete cross-site auth contract ([heady-docs issue #3](https://github.com/HeadyMe/heady-docs/issues/3)). |
| P0 | Heady Policy Decision Point | Real-time authorization for users, bees, tools, services, and nodes | MCP zero-trust gap ([SECURITY-GAP-ANALYSIS.md](https://github.com/HeadyMe/Heady-Main/blob/main/docs/SECURITY-GAP-ANALYSIS.md)). |
| P0 | Heady Tool Sandbox Gateway | Signed, isolated MCP execution service with per-tool scopes and brokered secrets | MCP tool execution at 30% coverage ([SECURITY-GAP-ANALYSIS.md](https://github.com/HeadyMe/Heady-Main/blob/main/docs/SECURITY-GAP-ANALYSIS.md)). |
| P1 | Heady Canonical Registry | Signed service, domain, tool, workflow, and node catalog with versioned schemas | Registry mismatch and stub projection confusion ([heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json), [headymcp-core](https://github.com/HeadyMe/headymcp-core)). |
| P1 | Heady Event Mesh | Durable event bus with replay, ordering keys, and dead-letter handling | Needed for async cross-device and swarm execution ([Heady-Main issue #7](https://github.com/HeadyMe/Heady-Main/issues/7), [cross-device-sync.js](https://github.com/HeadyMe/Heady-pre-production-9f2f0642/blob/main/src/runtime/cross-device-sync.js)). |
| P1 | Heady Workflow Engine | Single DAG runtime for HCFullPipeline and sub-pipelines | Conflicting 5-stage versus richer orchestration views ([heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json), [HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main)). |
| P1 | Heady Secret Broker | Runtime secret leasing, rotation, and audit service | Prior secret exposure and notebook credentials ([heady-docs issue #1](https://github.com/HeadyMe/heady-docs/issues/1), [commit 706bc292](https://github.com/HeadyMe/Heady-Main/commit/706bc292)). |
| P2 | Heady Packaging Publisher | Converts canonical packages into trustworthy public projections, SDKs, and site artifacts | `*-core` stub problem ([headymcp-core](https://github.com/HeadyMe/headymcp-core)). |
| P2 | Heady Contract Bridge | Strongly typed Node-to-Python process and service bridge | Node and Python boundary gap ([CLAUDE.md](https://github.com/HeadyMe/Heady-Main/blob/main/CLAUDE.md)). |
| P2 | Heady Cost and Quota Controller | Unified budget, token, model, and compute budgeting service | Existing cost and economics concepts deserve runtime enforcement ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [Heady-pre-production-9f2f0642](https://github.com/HeadyMe/Heady-pre-production-9f2f0642)). |

### 5.2 Proposed new HeadyMCP tools

These are proposed tools to expose through the hardened MCP layer.

- `heady_auth_introspect`: inspect user, device, service, and bee identity context.
- `heady_policy_simulate`: dry-run authorization before execution.
- `heady_tool_exec`: brokered execution through the tool sandbox only.
- `heady_registry_resolve`: resolve canonical service, tool, workflow, and domain metadata.
- `heady_workflow_run`: submit a workflow run to the DAG engine.
- `heady_workflow_status`: get structured workflow state, retries, compensation, and output pointers.
- `heady_event_publish`: publish approved events onto the event mesh.
- `heady_secret_lease`: request temporary credentials scoped to a tool or workflow.
- `heady_contract_validate`: validate payloads against service or workflow contracts.
- `heady_release_promote`: promote artifacts across dev, staging, and production with policy checks.
- `heady_cost_guard`: show estimated and live cost before expensive model, simulation, or deployment actions.
- `heady_trace_replay`: replay a workflow, tool call, or incident timeline from immutable audit events.

### 5.3 Proposed new workflows

These are proposed workflows that should become first-class and versioned.

1. Identity bootstrap and device trust enrollment.
2. Cross-domain login and session continuity.
3. Tool execution approval and isolated run.
4. Agent swarm decomposition and DAG execution.
5. Multi-model battle with budget caps and promotion criteria.
6. Cross-device handoff and state reconciliation.
7. Canonical release projection to `*-core`, SDK, and site targets.
8. Secret rotation and blast-radius verification.
9. Incident response and security rollback.
10. Contract migration for service, tool, and workflow schemas.

### 5.4 Proposed new agents

These are proposed agent roles, distinct from the confirmed existing swarms.

- ContractBrokerAgent: owns schema negotiation and backward compatibility.
- PolicyEnforcerAgent: evaluates every execution request against central policy.
- SecretCustodianAgent: rotates and leases secrets with audit trails.
- ReleaseProjectionAgent: produces verified public projections from canonical builds.
- EventReliabilityAgent: manages retries, dead letters, and replay health.
- IdentityContinuityAgent: owns session handoff and device trust continuity.
- CostGuardAgent: blocks expensive or runaway multi-model and simulation fanout.
- RuntimeForensicsAgent: reconstructs incidents from traces and audit logs.

### 5.5 Proposed new nodes

These are proposed additions to the node catalog if Heady wants runtime planes mapped directly onto nodes.

- STEWARD: canonical registry and schema stewardship.
- CUSTODIAN: secrets, keys, and trust material lifecycle.
- BROKER: event mesh and delivery guarantees.
- JUDGE: policy decisions and execution authorization.
- COURIER: cross-domain and cross-device continuity.
- LEDGER: immutable audit and replay services.

## 6) Concrete wiring plan

### 6.1 Canonical communication model

Proposed rule 1: all interactive clients, CLIs, IDE plugins, browser extensions, and websites should talk first to one API ingress that fronts the identity plane and canonical registry.

Proposed rule 2: the ingress should never execute privileged tools directly; instead it should mint an execution request that the policy plane evaluates and the tool sandbox gateway fulfills.

Proposed rule 3: all long-running tasks should be materialized as workflow jobs on the workflow plane and emitted as events on the event mesh.

Proposed rule 4: all services should register health, schema, ownership, dependency edges, and deployment state into the canonical registry before they are discoverable.

Proposed rule 5: all cross-language traffic between Node services and Python workers should move through a typed bridge contract with explicit timeout, idempotency key, and retry semantics.

### 6.2 Recommended service-to-service wiring

| From | To | Recommended protocol | Reason |
|---|---|---|---|
| Web, CLI, IDE, extension | API ingress | HTTPS plus OAuth, OIDC session, or signed API token | Centralized auth and telemetry. |
| API ingress | Policy Decision Point | low-latency RPC | Fast authorization at request time. |
| API ingress | Canonical Registry | read-only RPC or cache | Deterministic discovery. |
| API ingress | Workflow Engine | async submission API | Prevents blocking user paths. |
| Workflow Engine | Event Mesh | durable event publish and consume | Parallel async fanout. |
| Workflow Engine | Tool Sandbox Gateway | signed execution contract | Controlled tool invocation. |
| Workflow Engine | Model Router | brokered inference RPC | Multi-model routing with budgets. |
| Workflow Engine | Memory Plane | append and read APIs with schema versioning | Stable context updates. |
| Node services | Python workers | typed contract bridge over RPC or queue | Removes undocumented IPC ambiguity. |
| Release services | Packaging Publisher | signed artifact pipeline | Trustworthy projections. |
| Observability plane | Ledger and audit store | append-only event sink | Glass Box enforcement. |

### 6.3 Recommended domain wiring

Proposed role split:

- `headysystems.com`: corporate and platform overview plus status and registry browsing.
- `headymcp.com`: hardened MCP gateway and developer console.
- `headyapi.com`: public API facade and tokenized access surface.
- `headyme.com`: authenticated personal command center.
- `headyio.com`: SDK, docs, contracts, and package discovery.
- Hugging Face Spaces: demo and inference showcase surfaces, not control-plane authorities ([HeadySystems models page](https://huggingface.co/HeadySystems/models)).

### 6.4 Recommended tool execution wiring

Proposed safe path: client request -> identity evaluation -> policy check -> workflow creation -> isolated tool execution -> event emission -> result persistence -> user notification.

Proposed non-negotiables: signed tool manifests, per-tool scopes, brokered secrets only, network egress policy, filesystem isolation, audit span IDs, and kill-switch support for every tool runtime.

## 7) Dependency and control-plane model

### 7.1 Proposed dependency model

| Dependency tier | Contents | Rule |
|---|---|---|
| Tier 0 control plane | identity, policy, canonical registry, event mesh, workflow engine, secret broker, audit ledger | Nothing bypasses Tier 0 for privileged execution. |
| Tier 1 platform services | memory, model router, distiller, brain, deployment, packaging publisher, contract bridge | Tier 1 depends on Tier 0 contracts. |
| Tier 2 experience surfaces | websites, HeadyBuddy, IDE plugins, CLI, dashboards, Spaces | Tier 2 consumes Tier 0 and Tier 1 only through published interfaces. |
| Tier 3 projections | `*-core` repos, generated packages, demos, mirrored sites | Tier 3 is generated from upstream artifacts and cannot become source of truth. |

### 7.2 Proposed control-plane behaviors

- The identity plane should issue short-lived workload identities for bees, nodes, tools, and services.
- The policy plane should combine RBAC, ABAC, environment, node role, patent zone, and data-sensitivity constraints.
- The registry should be signed and versioned, and should publish service contracts, tool manifests, workflow definitions, and ownership metadata.
- The workflow engine should own orchestration state, retries, compensations, concurrency budgets, and checkpointing.
- The event mesh should carry all important state transitions and support replay.
- The secret broker should be the only component allowed to vend third-party credentials.
- The audit ledger should receive every tool call, workflow transition, policy decision, secret lease, and deployment promotion.

### 7.3 Proposed mapping of confirmed Heady concepts into the control plane

The confirmed Governance concepts map naturally to policy, secrets, and audit; Emissary concepts map to contracts, MCP, and SDK publication; Overmind maps to workflow planning; Sentinel maps to runtime defense; Oracle maps to cost governance; and the 20-node attribution system can become the operator-visible control-plane taxonomy for every action ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [Heady-pre-production-9f2f0642](https://github.com/HeadyMe/Heady-pre-production-9f2f0642)).

## 8) Phased roadmap

### Phase 0: Stop-risk work

1. Rotate all exposed Perplexity, Anthropic, GitHub, and database credentials and purge sensitive git history where exposure was confirmed ([heady-docs issue #1](https://github.com/HeadyMe/heady-docs/issues/1), [commit 706bc292](https://github.com/HeadyMe/Heady-Main/commit/706bc292)).
2. Eliminate `npx -y` runtime installation for `heady-mcp-server` and pin verified artifacts instead ([Heady-pre-production issue #12](https://github.com/HeadySystems/Heady-pre-production/issues/12)).
3. Resolve README merge conflicts and publish a canonical architecture and endpoint map ([README.md](https://github.com/HeadyMe/Heady-Main/blob/main/README.md)).
4. Freeze privileged MCP execution behind an allowlist until the sandbox gateway and policy plane exist ([SECURITY-GAP-ANALYSIS.md](https://github.com/HeadyMe/Heady-Main/blob/main/docs/SECURITY-GAP-ANALYSIS.md)).

### Phase 1: Canonical control plane

1. Launch the identity authority, policy decision point, secret broker, canonical registry, and audit ledger.
2. Define one signed contract schema format for services, tools, workflows, events, and nodes.
3. Publish the cross-site auth contract for all domains before expanding cross-domain session features further ([heady-docs issue #3](https://github.com/HeadyMe/heady-docs/issues/3)).

### Phase 2: Workflow and event unification

1. Recast HCFullPipeline into one versioned workflow engine that can represent both the compact five-stage public view and the richer orchestration view ([heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json), [HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main)).
2. Move cross-device sync, distillation, multi-model battle, deployment, and recovery onto the event mesh ([cross-device-sync.js](https://github.com/HeadyMe/Heady-pre-production-9f2f0642/blob/main/src/runtime/cross-device-sync.js), [HeadySystems on Hugging Face](https://huggingface.co/HeadySystems)).
3. Add deterministic job IDs, replay, compensation, and concurrency budgets.

### Phase 3: Hardened execution and packaging

1. Replace direct privileged tool runs with the tool sandbox gateway.
2. Stand up the contract bridge for Node-to-Python execution.
3. Introduce the packaging publisher so all `*-core` repos and SDK artifacts are generated from verified builds rather than drifting shells ([headymcp-core](https://github.com/HeadyMe/headymcp-core), [headyme-core](https://github.com/HeadyMe/headyme-core)).

### Phase 4: Experience and ecosystem expansion

1. Align `headyme.com`, `headymcp.com`, `headyapi.com`, `headysystems.com`, and `headyio.com` to the same backplane contracts.
2. Upgrade Hugging Face Spaces into controlled demos of `heady-systems` and `heady-brain`, while keeping product authority in the canonical registry and API surfaces ([HeadySystems models page](https://huggingface.co/HeadySystems/models)).
3. Expand public docs around auth, domains, contracts, workflows, and SDKs to reduce architecture ambiguity ([heady-docs issue #2](https://github.com/HeadyMe/heady-docs/issues/2), [heady-docs issue #3](https://github.com/HeadyMe/heady-docs/issues/3)).

## Confirmed vs proposed summary

### Confirmed

Confirmed: the monorepo, the six-layer framing, the 17 swarms, the 89 bee types, the 20-node model, the existence of MCP tools, the public domains and services, the persistence layer, and the key wiring and security gaps are all evidenced in the provided source files or the two Hugging Face pages ([HeadyMe/Heady-Main](https://github.com/HeadyMe/Heady-Main), [Heady-pre-production-9f2f0642](https://github.com/HeadyMe/Heady-pre-production-9f2f0642), [heady-registry.json](https://github.com/HeadyMe/Heady-Main/blob/main/heady-registry.json), [headymcp-core](https://github.com/HeadyMe/headymcp-core), [HeadySystems on Hugging Face](https://huggingface.co/HeadySystems), [HeadySystems models page](https://huggingface.co/HeadySystems/models)).

### Proposed

Proposed: the canonical control-plane refactor, the exact new services, tools, workflows, agents, nodes, event-mesh-first communication model, contract bridge, and phased roadmap are implementation recommendations derived from the confirmed evidence above.
