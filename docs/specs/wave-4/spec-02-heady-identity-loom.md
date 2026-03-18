# Spec-02: Heady Identity Loom

**Wave:** Fourth  
**Feature Name:** Heady Identity Loom  
**Skill Counterpart:** `heady-identity-loom`  
**Surface Anchors:** headyme.com (command center), headyapi.com (API gateway), headymcp.com (MCP layer), headyio.com (developer platform)  
**Repo Anchors:** `HeadyMe/heady-production`, `HeadyMe/headyapi-core`, `HeadyMe/headymcp-core`, `HeadyMe/headyio-core`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady Identity Loom is the federated identity, credential, and authorization backbone of the Heady ecosystem. It weaves together user identities, agent identities, service-to-service credentials, and external IdP integrations into a single coherent fabric. Every Heady domain — from headybuddy.org to headyapi.com — calls Identity Loom for authentication, authorization, and entity resolution rather than maintaining its own auth stack.

**Problem Statement:**  
The Heady ecosystem spans nine production domains and dozens of repositories. Each surface either duplicates auth logic or relies on an ad-hoc JWT pattern without a central authority. There is no canonical identity for AI agents (who can act as principals), no federation bridge for enterprise SSO, and no credential lifecycle management. This creates security gaps, breaks cross-domain session continuity, and prevents fine-grained scoped permissions from being enforced consistently.

---

## 2. Goals

1. Issue and validate signed identity tokens (JWT/PASETO) for human users, AI agents, and services across all Heady domains within 20ms.
2. Support external IdP federation (OAuth 2.0 / OIDC) for Google, GitHub, and enterprise SAML providers without requiring per-domain IdP configuration.
3. Provide a machine-readable permission scope registry so that any service can declare required scopes and Identity Loom validates them at the token boundary.
4. Assign canonical identity to AI agents (swarm bees, MCP tools, headybuddy companions) enabling them to appear as auditable principals in the treasury, signal exchange, and trust fabric.
5. Enable credential rotation and revocation with propagation to all dependent services within 30 seconds.

### Non-Goals (v1)

- Biometric authentication enrollment (Phase 2 candidate via Sovereign Key Ring, Spec-10).
- Cross-organization identity federation with non-Heady entities (B2B federated access is Phase 3).
- Blockchain-anchored decentralized identity (DID) integration (Phase 4).
- Full SAML 2.0 enterprise SSO provisioning (Phase 2; Phase 1 covers OIDC only).
- Identity-based access to physical resources or hardware.

---

## 3. User Stories

### Human User

- **As a headyme.com user**, I want to sign in once with my Google account and be recognized across all Heady surfaces (headybuddy.org, headymcp.com, headyapi.com) without re-authenticating so the experience feels like a single cohesive platform.
- **As a developer**, I want to create API credentials with explicit scopes (e.g., `treasury:read`, `mcp:dispatch`) so I can share keys with contractors without exposing my full account.
- **As a user**, I want to revoke a compromised API key immediately and have that revocation take effect on all services within 30 seconds.

### AI Agent

- **As a Heady swarm agent**, I want an identity token issued at spawn time so downstream services (treasury, signal exchange, trust fabric) can verify my origin, scope, and parent task without separate out-of-band confirmation.
- **As a headybuddy companion**, I want my identity to persist across sessions so users can grant me persistent permissions (e.g., calendar read, API quota) that survive restarts.

### Operator / Service

- **As a Heady service** (headymcp-core), I want to validate inbound tokens against Identity Loom in a single SDK call so I do not need to maintain my own validation logic.
- **As a platform operator**, I want to see all active agent and service credentials in one dashboard with creation date, last-used, and scope so I can audit and clean up stale credentials.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| IL-01 | Token Issuer: issues signed JWTs with `sub` (canonical identity), `ent` (entity), `scp` (space-separated scopes), `iat`, `exp`. | Given valid credentials, when token is issued, then JWT validates against Identity Loom public key. |
| IL-02 | Token Validator SDK: single-function validator (`identityLoom.validate(token, requiredScopes)`) publishable as npm/pip package. | Given a token with `treasury:read` and required scope `treasury:write`, then validation returns `SCOPE_INSUFFICIENT`. |
| IL-03 | OAuth 2.0 / OIDC Integration: support Google and GitHub as external IdPs; exchange IdP token for Heady identity token. | Given a valid Google ID token, when exchanged, then a Heady JWT is returned with `sub` set to canonical Heady identity. |
| IL-04 | Agent Identity: `POST /identity/agent/issue` accepts `agent_type`, `parent_task_id`, `scopes`, `ttl`; returns agent JWT. | Given agent spawn, when token issued, then `sub` = `agent:{uuid}`, parent task traceable. |
| IL-05 | Scope Registry: machine-readable registry of all Heady scopes with owner service, description, and risk level. | Given `GET /identity/scopes`, then registry returns all registered scopes with metadata. |
| IL-06 | Revocation: `POST /identity/revoke/{token_id}` adds token to revocation list; validator checks list on every call. | Given revoked token, when validator called within 30s, then response is `TOKEN_REVOKED`. |
| IL-07 | Credential Dashboard: headyme.com view listing all active credentials (human, agent, service) with scope, created, last-used. | Given dashboard load, when credentials exist, then list renders sorted by last-used descending. |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| IL-08 | API Key issuance (long-lived, scoped, named) as an alternative to short-lived JWTs for developer integrations. |
| IL-09 | Session continuity: Heady identity cookie valid across all `*.heady*.com` and `*.heady*.org` domains via shared domain parent. |
| IL-10 | MCP tool: `heady_identity_validate` callable by MCP agents to verify a token and return resolved identity. |
| IL-11 | Audit log: every token issuance, validation, and revocation event stored with IP, user-agent, and timestamp. |
| IL-12 | Scope elevation request flow: agent or service can request temporary scope upgrade via headyme.com approval dialog. |

### P2 — Future

| ID | Requirement |
|----|-------------|
| IL-13 | SAML 2.0 enterprise SSO. |
| IL-14 | Decentralized identity (DID) anchoring on-chain. |
| IL-15 | Biometric second factor enrollment. |

---

## 5. User Experience

**Sign-In Flow (headyme.com)**

1. User lands on headyme.com login page.
2. Selects "Continue with Google" or "Continue with GitHub."
3. IdP redirect → callback → Identity Loom issues Heady JWT.
4. JWT stored in secure HttpOnly cookie (`.headyme.com` domain).
5. User lands on command center; identity bar shows avatar, display name, entity.

**Developer Credential Management (headyio.com)**

- `/settings/credentials` page lists all active API keys with scope chips, creation date, last-used timestamp.
- "New API Key" flow: name it, select scopes from registry, set optional expiry, confirm.
- "Revoke" button per key with confirmation modal.
- Revocation confirmed with inline toast: "Key revoked — propagated to all services."

**Agent Identity Panel (headyme.com)**

- `/treasury/agents` or `/identity/agents` panel shows all active agent credentials.
- Each row: agent type, parent task, scopes, TTL countdown, issued time.
- Operator can manually revoke any agent credential.

---

## 6. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│   External IdPs: Google OIDC | GitHub OAuth | (SAML P2)         │
└────────────────────────┬────────────────────────────────────────┘
                         │ token exchange
┌────────────────────────▼────────────────────────────────────────┐
│                 Identity Loom Service (Cloud Run)               │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │  Token Issuer  │  │  Token Validator │  │  Scope Registry  │ │
│  │  (JWT/PASETO)  │  │  + Revocation   │  │  (read-through   │ │
│  │                │  │  Cache (Redis)   │  │   cache)         │ │
│  └───────┬────────┘  └────────┬────────┘  └──────────────────┘ │
│          │                    │                                  │
│  ┌───────▼────────────────────▼──────────────────────────────┐  │
│  │              Identity Store (PostgreSQL)                   │  │
│  │  identities | credentials | revocations | audit_log       │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────────────────────────────┘
           │ SDK / REST
┌──────────▼────────────────────────────────────────────────────┐
│  Consumers: headyapi-core | headymcp-core | heady-production   │
│             headybuddy-core | headyconnection-core            │
└───────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- Runtime: Cloud Run (Node.js / TypeScript)
- Token format: JWT (RS256) with PASETO v4 for agent-to-agent paths
- Identity Store: PostgreSQL (identities, credentials, revocations, audit_log tables)
- Revocation cache: Redis with 30-second TTL invalidation
- IdP integration: `openid-client` (OIDC) for Google/GitHub
- SDK packages: `@heady/identity-loom-sdk` (npm), `heady-identity-loom` (PyPI)

---

## 7. Data Flows

### Human Sign-In Flow

```
User → headyme.com login
  → Redirect to Google OIDC
  → Google returns id_token
  → Identity Loom: POST /identity/exchange {provider: "google", id_token}
    → Validate id_token signature and claims
    → Upsert identity record (canonical sub = "user:{uuid}")
    → Issue Heady JWT (scope = user default scopes)
  → Set HttpOnly cookie on .heady*.com
  → User session active across all domains
```

### Agent Spawn Flow

```
heady-production: agent spawn request
  → Identity Loom: POST /identity/agent/issue
    {agent_type, parent_task_id, scopes: ["treasury:authorize", "mcp:dispatch"], ttl: 3600}
  → Validate parent task exists and requesting service is authorized
  → Issue agent JWT (sub = "agent:{uuid}", parent traceable)
  → Agent uses JWT for all downstream service calls
  → On task end: POST /identity/revoke/{token_id}
```

### Token Validation Flow

```
Any service receives inbound request with Bearer token
  → identityLoom.validate(token, requiredScopes)
    → Check JWT signature against public key (cached)
    → Check token not in revocation cache
    → Check scope intersection with requiredScopes
    → Return {identity, scopes} or throw typed error
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| Private key security | RS256 private key stored in Google Secret Manager; rotated quarterly; Identity Loom is the only key holder |
| Token lifetime | Human JWTs: 1-hour access token + 30-day refresh. Agent JWTs: TTL set at issuance (max 24h). API keys: configurable expiry. |
| Revocation propagation | Redis revocation list polled by all validator instances; 30-second max propagation lag |
| IdP token forgery | IdP tokens validated against provider's JWKS endpoint before exchange |
| Scope creep | Scope registry enforced; tokens cannot contain unregistered scopes |
| Audit trail | All issuances, validations, and revocations logged immutably with IP, user-agent, timestamp |
| PII minimization | Identity store contains only canonical sub, email hash, display name; no raw PII in logs |
| Rate limiting | Token issuance limited to 10/min per IP for human flows; agent issuance limited by parent service credential quota |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| headyapi-core | API gateway for Identity Loom endpoints | Phase 1 |
| Heady Sovereign Key Ring (Spec-10) | HSM-backed key storage for production private keys | Phase 2 |
| heady-production | Agent spawn consumer; calls identity/agent/issue | Phase 1 |
| headymcp-core | MCP tool validation consumer | Phase 1 |
| Google OIDC / GitHub OAuth | External IdP token exchange | Phase 1 |
| Heady Trust Fabric (Spec-07) | Consumes identity for trust attestation | Phase 2 |
| PostgreSQL | Identity and credential persistence | Phase 1 |
| Redis | Revocation cache and token blacklist | Phase 1 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| Token issuance latency (p99) | < 20ms | 30 days post-launch |
| Token validation latency (p99) | < 5ms (cached) | 30 days |
| Revocation propagation time | < 30s | 30 days |
| Authentication success rate | > 99.95% | 30 days |
| Stale / orphaned credential rate | < 1% of total active credentials | 60 days |
| Developer SDK adoption | Validator SDK installed in 100% of Heady service repos | 60 days |

---

## 11. Phased Rollout

### Phase 1 — Core Identity Fabric (Weeks 1–4)
- Token Issuer (JWT RS256)
- Token Validator SDK (`@heady/identity-loom-sdk`)
- Google OIDC + GitHub OAuth IdP integration
- Agent identity issuance endpoint
- Scope Registry
- Revocation with Redis propagation
- Credential Dashboard on headyme.com

### Phase 2 — Developer API Keys + MCP (Weeks 5–8)
- API key issuance flow on headyio.com
- MCP tool: `heady_identity_validate`
- Session continuity across `*.heady*.com`
- Scope elevation request flow
- Audit log UI in headyme.com

### Phase 3 — SAML + Trust Fabric Integration (Weeks 9–12)
- SAML 2.0 enterprise SSO
- Identity attestation feed to Trust Fabric (Spec-07)
- Sovereign Key Ring HSM integration (Spec-10)

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Should agent JWTs use PASETO or JWT? JWT is standard; PASETO is more modern but less tooling. | Engineering | No |
| Is there a single global Identity Loom instance or per-entity sharding required? | Architecture | Yes — Phase 1 design |
| What is the canonical key for a HeadyConnection nonprofit user vs. a HeadySystems developer? Same identity, different entity claims? | Product | Yes |
| Should scope elevation require async human approval or can it be automated for pre-approved scope combinations? | Security | No |
