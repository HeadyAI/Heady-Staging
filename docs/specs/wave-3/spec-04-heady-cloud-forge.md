# Spec 04 — Heady Cloud Forge

**Wave:** Third Wave  
**Domain:** headysystems.com / Cloud & DevOps  
**Primary Repos:** headysystems-core, heady-production, headymcp-core, headyio-core, latent-core-dev  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Cloud Forge is an AI-assisted cloud infrastructure provisioning and management system built into the Heady platform. It enables developers and operators to describe desired cloud resources in natural language or structured intent specs — and have those resources provisioned, validated, policy-checked, and deployed across Cloudflare, Google Cloud Run, and other providers via MCP tool dispatch. Cloud Forge is the "build the factory" layer: it creates, wires, and maintains the cloud substrate that Heady services run on.

Cloud Forge is grounded in headysystems-core's existing self-healing infrastructure and Sacred Geometry orchestration architecture, extending it with an intentional provisioning interface rather than purely automated self-healing repair.

**Why it matters:** The Heady platform spans multiple cloud services (Cloudflare Workers, Cloud Run, Postgres, R2, etc.) across multiple orgs. Provisioning today is manual and fragile. Cloud Forge converts ad-hoc cloud management into a reproducible, auditable, policy-gated workflow.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | Provision any standard Heady cloud resource (Worker, Cloud Run service, DB, R2 bucket) via intent spec in ≤ 5 minutes | P95 provisioning time |
| G2 | Zero unreviewed production changes — every provisioning action passes a policy gate before execution | Policy gate bypass count = 0 |
| G3 | 100% of provisioning actions produce an auditable Infrastructure Event in heady-production | Audit completeness rate |
| G4 | Reduce cloud provisioning errors by 80% vs. manual operations | Error rate comparison |
| G5 | Developers can declare infrastructure needs in natural language and receive valid Terraform/IaC output within 30 seconds | Generation latency |

---

## 3. Non-Goals

- **Cost optimization advisory** — Cloud Forge provisions; cost intelligence is a future capability.
- **Monitoring and observability** — That is Heady Deployment Pulse (Spec 05).
- **Application code deployment** — Cloud Forge manages infrastructure; code deployment is a CI/CD concern handled by heady-production pipeline gates.
- **Multi-cloud disaster recovery** — DR planning is out of scope for v1.

---

## 4. User Stories

**As a Heady developer,** I want to describe the infrastructure I need ("a Cloud Run service with 2 CPU, 4GB RAM, connected to the production Postgres instance, behind the API gateway") and receive a validated, policy-checked IaC plan ready for execution.

**As a platform operator,** I want every infrastructure change to pass a policy check (no dev resources in production, no public-facing storage without auth) before execution so that I never need to reverse a configuration accident.

**As an engineering lead,** I want a real-time view of all provisioned Heady cloud resources — their status, owner, cost tier, and last change — so that I can maintain situational awareness without digging through cloud consoles.

**As a new Heady contributor,** I want to provision a local-equivalent dev environment (sandbox + test DB + Worker playground) in one command so that onboarding takes hours, not days.

**As an auditor,** I want a complete Infrastructure Event log showing who requested what resource, what policy checks ran, who approved, and when the resource was created — for every change in the past 12 months.

---

## 5. Requirements

### P0 — Must Have

- **Intent Spec Parser:** Accepts natural language or structured YAML intent spec as input. Maps to a normalized resource request: provider, resource_type, config_params, environment, requestor.
- **IaC Generator:** headymcp-core tool `forge_resource(intent_spec)` — generates Terraform HCL or Cloudflare Workers config from normalized resource request. Uses latent-core-dev to retrieve similar past specs as few-shot examples.
- **Policy Gate Engine:** Before any IaC plan is executed, it passes through a policy rule set: no public S3/R2 buckets without auth, no direct production DB connections for dev resources, required tagging (owner, environment, cost_center), approved provider list. Policy violations block execution and surface a human-readable explanation.
- **Execution Adapter:** Connects to Terraform Cloud / Cloudflare API / Google Cloud APIs to apply validated plans. Execution is authenticated via headymcp-core secrets management.
- **Infrastructure Registry:** heady-production table tracking every provisioned resource: resource_id, provider, type, environment, owner, status, created_at, last_modified.
- **Infrastructure Event Log:** Append-only audit record: request, intent_spec, generated_plan, policy_result, approver, execution_status, timestamps.
- **Dev Environment Bootstrapper:** One-command CLI (`heady forge dev-env`) that provisions a standard sandbox (Cloudflare Worker playground + test DB + R2 bucket) for any new contributor.

### P1 — Should Have

- **Diff Preview:** Before execution, show a human-readable diff of what will change in the infrastructure. Require explicit confirmation.
- **Resource Tagging Enforcer:** Automatically inject required tags (owner, project, cost_center, wave) into all provisioned resources; fail if tags cannot be resolved from context.
- **Drift Detection:** Weekly job that compares Infrastructure Registry against actual cloud state; flags drifted resources for remediation.
- **Forge Templates Library:** Pre-built intent spec templates for common Heady patterns: new MCP server, new swarm bee, new micro-frontend, new API service. Accessible via headyio-core SDK.

### P2 — Future

- **Cost forecasting:** Before provisioning, estimate monthly cloud cost impact.
- **Auto-teardown:** Resources tagged with `lifecycle = ephemeral` are automatically deprovisioned after TTL.
- **Multi-provider federation:** Single intent spec that provisions across multiple cloud providers with provider-specific optimizations.

---

## 6. User Experience

1. **Entry point:** Cloud Forge panel in headysystems.com admin dashboard (`/forge`), and CLI via headyio-core SDK (`heady forge ...`).
2. **Intent input:** Text area with syntax hint. Accepts natural language ("I need a new Cloud Run service for the grant constellation discovery agent") or YAML intent spec.
3. **Plan preview:** Shows generated IaC plan in a syntax-highlighted diff view. Alongside it: policy check results (green checks or red violations with explanations).
4. **Approval flow:** For production environments, requires a named approver to confirm. For dev/sandbox, auto-approve if all policy checks pass.
5. **Execution tracker:** Real-time status view of the provisioning job — steps: Generate → Policy Check → [Approval] → Apply → Verify → Complete.
6. **Infrastructure Registry:** Filterable table of all provisioned resources by environment, provider, owner, and status. Click any resource to see its full event history.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│  headysystems.com UI (/forge) + heady CLI           │
│  (template-heady-ui / headyio-core SDK)             │
└──────────────────┬──────────────────────────────────┘
                   │ REST / CLI
┌──────────────────▼──────────────────────────────────┐
│             headysystems-core                        │
│  Intent Parser  │  Policy Gate Engine               │
│  IaC Generator  │  Execution Adapter                │
│  Forge Templates│  Dev Env Bootstrapper             │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
┌──────────▼──────────┐  ┌────────▼────────────────┐
│  heady-production   │  │  headymcp-core           │
│  infrastructure_    │  │  forge_resource tool     │
│  registry           │  │  secrets management      │
│  infra_event_log    │  └────────────┬─────────────┘
└──────────┬──────────┘               │
           │                  ┌───────▼──────────────┐
┌──────────▼──────────┐       │  Cloud Providers      │
│  latent-core-dev    │       │  Cloudflare API       │
│  Past spec examples │       │  Terraform Cloud      │
│  (few-shot context) │       │  Google Cloud API     │
└─────────────────────┘       └──────────────────────┘
```

---

## 8. Data Flows

**Provisioning request flow:**
```
Developer submits intent spec (UI or CLI)
  → Intent Parser normalizes to resource_request
  → headymcp-core: forge_resource(resource_request)
    → latent-core-dev: fetch similar past specs (few-shot)
    → LLM: generate IaC plan
    → Return plan
  → Policy Gate Engine validates plan against ruleset
    → If violations: return error report, halt
    → If clean: return validated plan
  → Diff preview shown to developer
  → If production: route to approval queue
  → If approved (or dev auto-approve):
    → Execution Adapter applies plan to cloud provider
    → Infrastructure Registry updated
    → Infrastructure Event Log entry written
```

**Drift detection flow (weekly):**
```
Scheduled Cloudflare Worker
  → For each resource in Infrastructure Registry
  → Query cloud provider API for current state
  → Compare against registry expected state
  → If drift detected: create drift_alert record
  → Notify platform operator via headybuddy-core
```

---

## 9. Security & Privacy

- All cloud provider API credentials stored in headymcp-core secrets management (Cloudflare Secrets), never in source code or IaC files.
- Policy Gate Engine is the primary security control. It runs before every execution. Policy rules are version-controlled in headysystems-core; changes require PR review.
- Infrastructure Registry and Event Log are accessible only to platform-operator and engineering-lead roles.
- Execution Adapter uses least-privilege service accounts for each cloud provider.
- Terraform state files stored encrypted in Cloudflare R2 with access restricted to Forge service identity.
- No infrastructure details (resource IDs, IP addresses, connection strings) are included in LLM prompt context.

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| headysystems-core — core service | Internal | Extend with Forge module |
| headymcp-core — `forge_resource` tool + secrets | Internal | New tool |
| latent-core-dev — past spec retrieval | Internal | Extend with infra spec corpus |
| heady-production — Postgres (new tables) | Internal | Migration required |
| headyio-core — CLI SDK | Internal | Add `heady forge` command group |
| Terraform Cloud API | External | Account + token required |
| Cloudflare API | External | Existing credentials in use |
| Google Cloud API (Cloud Run, SQL) | External | Service account required |

---

## 11. Phased Rollout

### Phase 1 — Core Forge (Weeks 1–4)
- Intent spec parser and IaC generator (Cloudflare Workers only)
- Policy Gate Engine with core ruleset
- Infrastructure Registry schema
- Infrastructure Event Log
- Dev Environment Bootstrapper CLI

### Phase 2 — Cloud Run + Approval Flow (Weeks 5–8)
- Extend IaC generator to Cloud Run and Postgres
- Diff preview UI
- Production approval flow
- Forge Templates Library

### Phase 3 — Intelligence + Drift (Weeks 9–12)
- Drift detection worker
- latent-core-dev few-shot spec retrieval
- Full headysystems.com UI panel
- headyio-core SDK integration
- First full platform audit cycle

---

## 12. Success Metrics

| Metric | Baseline | 90-Day Target |
|--------|---------|---------------|
| Provisioning time (P95) | Manual (hours) | ≤ 5 minutes |
| Policy gate bypass count | N/A (no gate) | 0 |
| Provisioning error rate | Unknown (manual) | -80% vs. baseline |
| IaC generation latency | N/A | ≤ 30 seconds |
| Dev env setup time (new contributor) | ~4 hours | ≤ 30 minutes |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| Is Terraform Cloud the preferred IaC execution engine, or is direct Cloudflare/GCP API preferred? | Eric / Engineering | Yes — determines execution adapter architecture |
| What is the minimum policy ruleset for v1? | Engineering Lead | Yes — must define before Policy Gate build |
| Should Forge be gated behind engineering-lead role only, or available to all developers? | Eric | No — default developer role for dev envs, gated for production |
| Are there existing Terraform configurations to import into the registry? | Engineering | No — can ingest in Phase 2 |
