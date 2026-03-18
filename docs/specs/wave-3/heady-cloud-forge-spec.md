# Heady Cloud Forge
### Feature Specification — Third Wave
**Version:** 1.0  
**Date:** 2026-03-17  
**Owner:** headysystems.com / headyio.com  
**Domain:** headysystems.com, headyio.com, headyapi.com  
**Skill Target:** heady-cloud-forge

---

## 1. Purpose

Heady Cloud Forge is a self-service infrastructure provisioning and configuration management layer for the Heady ecosystem. It provides a unified control plane for spinning up, configuring, and wiring together Cloud Run services, Cloudflare Workers, R2 buckets, DNS records, and secret management resources — all from declarative YAML or a conversational UI driven by HeadyAI. Cloud Forge eliminates the manual, context-switching overhead of managing multiple cloud consoles and brings infrastructure lifecycle management in line with Heady's developer-first ethos.

**Problem Statement:**  
The Heady ecosystem spans multiple Google Cloud projects, Cloudflare zones, and external API dependencies. Provisioning new services currently requires manual work across GCP Console, Cloudflare Dashboard, and Secret Manager — a fragmented workflow that slows deployments and creates configuration drift. Cloud Forge centralizes this into a declarative, auditable, AI-assisted provisioning layer so that any Heady service can be deployed in minutes with zero console clicking.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Reduce new service provisioning time from hours to under 15 minutes | Measured from first deploy request to live endpoint |
| G2 | Eliminate configuration drift across all managed Heady services | 100% of resources tracked in Cloud Forge state; zero out-of-band manual changes |
| G3 | Enable AI-assisted provisioning: describe a service, get a deployment plan | At least 80% of routine provisioning tasks completable via conversational input |
| G4 | Maintain a complete audit log of all infrastructure changes | 100% of provisioning events captured with actor, timestamp, and resource delta |
| G5 | Support rollback to any prior infrastructure state within 5 minutes | Rollback test in each environment type |

---

## 3. Non-Goals

- **Not a CI/CD pipeline.** Application code build and test pipelines are handled by GitHub Actions or Cloud Build. Cloud Forge handles infrastructure, not application code.
- **Not a cost management tool.** Billing optimization and cost alerting are separate concerns.
- **Not a multi-cloud abstraction layer.** v1 targets GCP + Cloudflare only; AWS and Azure are out of scope.
- **Not a Kubernetes orchestrator.** Container orchestration at the pod/cluster level is out of scope; Cloud Run handles container runtime.
- **Not a monitoring system.** Observability and alerting are handled by Heady Deployment Pulse.

---

## 4. User Stories

### DevOps / Platform Engineer
- As a platform engineer, I want to define a new Cloud Run service in YAML and have it deployed with DNS, secrets, and IAM configured automatically so that I do not have to click through multiple consoles.
- As a platform engineer, I want to roll back an infrastructure change to a previous state in under 5 minutes so that I can recover quickly from a misconfiguration.
- As a platform engineer, I want to see a diff of what will change before any provisioning operation is applied so that I can catch unintended side effects.

### Developer
- As a developer, I want to describe the infrastructure I need to an AI interface and receive a validated provisioning plan so that I can stand up new services without deep GCP/Cloudflare expertise.
- As a developer, I want to clone an existing service's infrastructure profile and deploy a new instance so that I do not have to start from scratch for similar services.

### Engineering Lead
- As an engineering lead, I want an audit trail of every infrastructure change (who, what, when) so that I can diagnose incidents and enforce change management.

---

## 5. Requirements

### P0 — Must Have
- **Resource Manifest Format:** YAML-based declarative format covering: Cloud Run services (image, env vars, scaling), Cloudflare Workers (script, routes, bindings), R2 buckets, DNS records, Secret Manager secrets.
- **Plan / Apply Workflow (Terraform-inspired):** `forge plan` shows a diff of current vs. desired state; `forge apply` executes changes. No changes applied without explicit plan approval.
- **State Store:** Persistent record of all managed resources and their current configuration, stored in Cloud Storage with versioning.
- **AI Provisioning Assistant:** Conversational interface (via HeadyAI) to describe a service and receive a draft resource manifest ready for review and apply.
- **Audit Log:** Immutable record of every plan + apply operation: actor, timestamp, resource delta, approval status.
- **Rollback Command:** `forge rollback [resource] [version]` restores a resource to any prior state store snapshot.
- **Secret Management Integration:** Forge reads/writes secrets in Google Secret Manager; secrets referenced by name in manifests, never stored in state.

### P1 — Should Have
- **Service Cloning:** `forge clone [service]` generates a new manifest based on an existing service's configuration.
- **Environment Promotion:** Promote a manifest from dev → staging → prod with per-environment variable overrides.
- **Drift Detection:** Scheduled job detects out-of-band manual changes and flags them in the Forge dashboard.
- **Cost Estimate:** Pre-apply cost projection for new or changed resources using GCP Pricing API.
- **CLI + Web UI:** `heady-forge` CLI for terminal users; web dashboard for visual management.

### P2 — Future Considerations
- Terraform provider compatibility layer.
- Multi-region deployment coordination.
- GitHub Actions integration for IaC-as-code workflows.
- AWS and Azure resource support.

---

## 6. User Experience

### Web Dashboard
- Resource inventory: list of all managed services, workers, buckets, and DNS records with current state badges (Healthy, Drifted, Pending Apply, Error).
- "New Resource" wizard: choose resource type → fill guided form → AI drafts manifest → preview diff → apply.
- Change history timeline: scrollable log of all past applies with actor badges and rollback buttons.

### CLI (`heady-forge`)
```
heady-forge plan --file services/heady-grant-constellation.yaml
heady-forge apply --file services/heady-grant-constellation.yaml
heady-forge rollback heady-grant-constellation --version 3
heady-forge clone heady-impact-ledger --name heady-new-service
heady-forge drift-check --all
```

### AI Provisioning Chat (embedded in HeadyAI)
- "Spin up a new Cloud Run service called heady-token-vault with 512MB memory, connected to Secret Manager, at token-vault.headysystems.com."
- AI returns: validated manifest YAML + plan diff preview + estimated cost.
- User approves → Forge executes.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Heady Cloud Forge                         │
│                                                                 │
│  ┌───────────────┐   ┌──────────────────┐                       │
│  │  CLI          │   │  Web Dashboard   │                       │
│  │  (heady-forge)│   │  (React / CF)    │                       │
│  └───────┬───────┘   └────────┬─────────┘                       │
│          └────────────────────┘                                 │
│                       │                                         │
│                       ▼                                         │
│            ┌──────────────────────┐                             │
│            │  Forge API           │                             │
│            │  (Cloud Run)         │                             │
│            │  Plan / Apply /      │                             │
│            │  Rollback / Drift    │                             │
│            └──────────┬───────────┘                             │
│                       │                                         │
│     ┌─────────────────┼──────────────────────┐                  │
│     ▼                 ▼                      ▼                  │
│  ┌────────┐   ┌────────────────┐   ┌──────────────────┐        │
│  │ State  │   │  Provisioner   │   │  AI Manifest     │        │
│  │ Store  │   │  Adapters      │   │  Generator       │        │
│  │ (GCS)  │   │  GCP │ CF      │   │  (HeadyAI)       │        │
│  └────────┘   └────────────────┘   └──────────────────┘        │
│                       │                                         │
│          ┌────────────┼────────────────┐                        │
│          ▼            ▼                ▼                        │
│  ┌──────────┐  ┌────────────┐  ┌────────────────┐              │
│  │ Cloud    │  │ Cloudflare │  │ Secret Manager │              │
│  │ Run API  │  │ API        │  │ API            │              │
│  └──────────┘  └────────────┘  └────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:**
- Forge API: Cloud Run (Node.js / TypeScript)
- State Store: Google Cloud Storage (versioned bucket, JSON state files)
- Provisioner Adapters: GCP SDK (Cloud Run, Cloud DNS, Secret Manager); Cloudflare API client
- AI Layer: HeadyAI for manifest generation and natural language provisioning
- CLI: Node.js CLI published via npm (`heady-forge`)
- Frontend: React SPA on Cloudflare Pages
- Auth: Heady identity layer + GCP service account for provisioner

---

## 8. Data Flows

### Plan + Apply Flow
1. User runs `heady-forge plan --file service.yaml` or clicks "Preview Changes" in UI.
2. Forge API fetches current state from State Store; diffs against desired manifest.
3. Diff rendered as human-readable change set.
4. User approves via `forge apply` or dashboard button.
5. Forge API calls relevant provisioner adapters (GCP/Cloudflare) to create/update resources.
6. State Store updated with new resource snapshot; audit log entry written.

### AI Provisioning Flow
1. User sends natural language request to HeadyAI.
2. HeadyAI routes to Cloud Forge skill; generates draft manifest YAML.
3. Manifest returned to user for review; Forge API validates syntax and checks for conflicts.
4. User approves → standard Plan + Apply flow.

### Drift Detection Flow
1. Scheduled job (Cloud Scheduler, hourly) calls Forge drift-check.
2. Forge API queries live GCP/Cloudflare APIs for actual resource configuration.
3. Compares to State Store; flags discrepancies as "Drifted" resources.
4. Alert pushed to Heady Deployment Pulse dashboard and Forge UI.

---

## 9. Security & Privacy

| Concern | Mitigation |
|---------|------------|
| Credential management | All cloud API credentials in Secret Manager; Forge service account uses least-privilege IAM |
| State file security | GCS state bucket encrypted at rest; access restricted to Forge service account + Admin role |
| Provisioner authorization | All apply operations require authenticated Heady user + MFA for production environments |
| Audit immutability | Audit log appended to a separate, write-once GCS bucket; no delete permission on log bucket |
| Secret exposure | Secrets referenced by name only in manifests; values never in state files or logs |
| Plan approval gates | Production applies require explicit approval from Engineering Lead role |

---

## 10. Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| Google Cloud Run API | External infrastructure | Low — stable API |
| Cloudflare API | External infrastructure | Low — stable API |
| Google Secret Manager | External infrastructure | Low — managed service |
| Google Cloud Storage | External infrastructure | Low — managed service |
| HeadyAI routing layer | Internal | Medium — AI provisioning degrades to manual YAML if unavailable |
| Heady identity layer | Internal | Low — standard auth |
| Heady Deployment Pulse | Internal downstream | Low — Forge publishes drift events; Pulse is consumer |

---

## 11. Phased Rollout

### Phase 1 — Core Engine (Weeks 1–4)
- Resource manifest format definition (Cloud Run, Secrets, DNS).
- Forge API: plan + apply + state store.
- CLI: `heady-forge plan`, `forge apply`, `forge rollback`.
- Basic web dashboard: resource inventory + change history.
- Audit log.

### Phase 2 — Intelligence (Weeks 5–8)
- AI manifest generator via HeadyAI.
- Drift detection and alerting.
- Service cloning.
- Cloudflare Workers support.

### Phase 3 — DevOps Integration (Weeks 9–12)
- Environment promotion (dev → staging → prod).
- Cost estimation pre-apply.
- GitHub Actions integration.
- R2 bucket management.

### Phase 4 — Enhancement (Post-launch)
- Terraform compatibility layer.
- Multi-region deployment coordination.
- Additional cloud provider adapters.

---

## 12. Success Metrics

| Metric | Target | Window |
|--------|--------|--------|
| New service provisioning time | ≤ 15 minutes end-to-end | 30 days post-launch |
| Drift incidents resolved | ≤ 2 hours average time to resolution | Ongoing |
| Configuration drift rate | < 5% of managed resources drifted at any time | 90 days post-launch |
| AI provisioning adoption | ≥ 60% of new services started via AI chat | 90 days |
| Rollback success rate | 100% of tested rollbacks succeed within 5 min | At launch |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Which GCP projects should be in-scope for Forge v1? | Eric / Platform | Yes (Phase 1) |
| What Cloudflare zones and account IDs are in scope? | Eric | Yes (Phase 1) |
| Should production applies require a separate approval step or same-session approval? | Eric | Yes (Phase 1) |
| What is the state store bucket naming convention? | Platform | No |
