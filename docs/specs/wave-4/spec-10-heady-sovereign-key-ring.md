# Spec-10: Heady Sovereign Key Ring

**Wave:** Fourth  
**Feature Name:** Heady Sovereign Key Ring  
**Skill Counterpart:** `heady-sovereign-key-ring`  
**Surface Anchors:** headyme.com (command center), headysystems.com (core architecture), headyapi.com (public interface)  
**Repo Anchors:** `HeadyMe/heady-production`, `HeadyMe/headysystems-core`, `HeadyMe/headyapi-core`, `HeadyMe/heady-sentinel`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady Sovereign Key Ring is the cryptographic key lifecycle management system of the Heady ecosystem. It provides a secure, auditable, and policy-governed vault for generating, storing, rotating, distributing, and revoking all cryptographic keys, secrets, and certificates used across Heady services. Rather than spreading key management across individual Secret Manager instances, environment variables, and developer machines, Sovereign Key Ring centralizes the cryptographic material that gives the entire Heady platform its security guarantees — from Identity Loom's signing keys to Trust Fabric's attestation keys to the Monetization Matrix's Stripe webhook secrets.

**Problem Statement:**  
The Heady ecosystem relies on cryptographic keys distributed across Secret Manager entries, ad-hoc environment variables, and developer-maintained key files. There is no centralized policy for key rotation schedules, no audit log of key access, no automated rotation for expiring keys, and no single place to revoke compromised material across all services simultaneously. As the fourth-wave feature set introduces signing keys (Trust Fabric), payment secrets (Monetization Matrix), and voice/media provider API keys, the absence of a key lifecycle system becomes a significant security and compliance gap.

---

## 2. Goals

1. Provide a single authoritative registry of all Heady cryptographic keys and secrets, with metadata about each (owner service, type, rotation schedule, expiry, last accessed).
2. Support automated key rotation for all registered keys on configurable schedules, with zero-downtime rotation for active services.
3. Issue time-limited, scoped access tokens that allow services to retrieve key material for their authorized use only, never exposing raw keys in logs, APIs, or network transit.
4. Maintain an immutable audit log of every key creation, rotation, access, and revocation event — accessible to operators and exportable for compliance.
5. Enable emergency key revocation with propagation to all dependent services within 60 seconds.

### Non-Goals (v1)

- Hardware Security Module (HSM) integration for FIPS-certified key storage (Phase 2 — v1 uses cloud-based KMS).
- Certificate authority (CA) operations or PKI certificate issuance for TLS (Phase 2).
- End-user-controlled key management (users managing their own encryption keys) — this is platform-level key management.
- Multi-party computation (MPC) or threshold signing for keys.
- Cross-cloud key federation with non-GCP key stores.

---

## 3. User Stories

### Platform Operator

- **As a platform operator**, I want a dashboard showing all registered keys with their type, owning service, rotation schedule, days until expiry, and last access, so I can ensure no keys become stale or forgotten.
- **As an operator**, I want to manually trigger an emergency rotation of a specific key and have all services that use it automatically pick up the new key material within 60 seconds.
- **As an operator**, I want to export the key access audit log for a date range as CSV so I can provide it to a security auditor.

### Service / Agent

- **As a Heady service** (e.g., Identity Loom), I want to retrieve my current signing private key via an SDK call that automatically handles rotation so I never need to hardcode or cache key material beyond one request.
- **As a service**, I want to be notified via Signal Exchange when my key has been rotated so I can flush any in-memory key cache and pick up the new material.
- **As a swarm agent**, I want to retrieve a short-lived signing key for attaching integrity proofs to my outputs so downstream consumers can verify my work without trusting my identity assertion alone.

### Developer

- **As a headyio.com developer**, I want to register a service API key (e.g., my webhook secret) with Key Ring and retrieve it securely so I never store raw secrets in my application configuration files.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| KR-01 | Key Registry: central record of every managed key with `key_id`, `type` (signing/symmetric/api_key/certificate), `owner_service`, `algorithm`, `rotation_schedule_days`, `expires_at`, `created_at`. | Given key registration, when queried, then full metadata returned. |
| KR-02 | Secure Key Retrieval: `POST /keyring/access {key_id, purpose}` authenticated by Identity Loom; returns key material in response body over TLS; never logged. | Given valid access request, then key returned and access event recorded without key material in log. |
| KR-03 | Automated Rotation: Key Ring executes rotation on schedule; issues new key version; signals dependent services. | Given key with 30-day rotation, when schedule triggers, then new version created and `KEY_ROTATED` signal published. |
| KR-04 | Zero-Downtime Rotation: during rotation window, both old and new key versions are valid for verification; old version retired after configurable grace period. | Given key rotation, when new version issued, then old version still validates for grace period (default: 1 hour). |
| KR-05 | Emergency Revocation: `POST /keyring/revoke/{key_id}` immediately retires key; dependent services notified via Signal Exchange within 60s. | Given revocation, when dependent service polled within 60s, then revoked key no longer returned. |
| KR-06 | Key Access Audit Log: every key access event (service ID, purpose, timestamp, key_id version) stored immutably; exportable. | Given 100 access events, when audit log queried, then all 100 returned with correct metadata, no key material included. |
| KR-07 | Key Ring Dashboard (headyme.com): table of all keys with status, expiry countdown, rotation schedule, last accessed, access count. | Given dashboard load, then all registered keys shown with accurate metadata within 2s. |
| KR-08 | SDK: `@heady/keyring-sdk` (npm) exposes `getKey(key_id, purpose)` and `verifyKey(key_id, signature)` with automatic rotation-aware caching. | Given SDK getKey call, when key has rotated since last call, then SDK returns new version without caller intervention. |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| KR-09 | Key health alerts: alert operator when any key is within 7 days of expiry or has not been accessed in 30 days (potential orphan). |
| KR-10 | Multi-version key access: services can retrieve the N most recent versions for validation of signatures created before rotation. |
| KR-11 | Policy enforcement: rotation schedule and access scope policies enforced; key cannot be accessed by services outside its declared consumer list. |
| KR-12 | Developer secret registration: headyio.com developers can register named API secrets (webhook secrets, third-party keys) and retrieve them via SDK. |
| KR-13 | Audit log export: CSV/JSON export of audit log with date range filter from headyme.com. |

### P2 — Future

| ID | Requirement |
|----|-------------|
| KR-14 | HSM integration (FIPS 140-2 Level 3 hardware key storage). |
| KR-15 | PKI certificate issuance and management. |
| KR-16 | Multi-party threshold signing for high-value operations. |

---

## 5. User Experience

**Key Ring Dashboard (headyme.com /security/keyring)**

- Summary bar: total keys, expiring this week (amber badge), overdue rotation (red badge), orphaned (grey).
- Key table: columns for key_id (truncated + copy button), type badge, owner service, algorithm, rotation schedule, days until expiry (progress bar), last accessed, access count.
- Row actions: "Rotate Now" (with confirmation modal), "Revoke" (with confirmation + reason field), "View Access Log."
- "Register New Key" button → wizard: name, type, algorithm, owner service, consumer services, rotation schedule.

**Emergency Revocation Flow**

1. Operator clicks "Revoke" on a key row.
2. Modal: "This will immediately revoke this key. All dependent services will be notified. Enter reason:" [text field].
3. Operator submits → revocation logged → `KEY_REVOKED` signal published.
4. Dashboard key row immediately shows "REVOKED" status badge.
5. Dependent service notification confirmation appears in headyme.com notification tray.

**Developer Secret Management (headyio.com)**

- `/portal/secrets` tab: registered secrets with name, type, registered date, last accessed, action buttons (rotate, revoke).
- "Add Secret" modal: secret name, type (API key / webhook secret / signing key), auto-generate or paste value.
- Retrieve secret: `GET /keyring/access {key_id: "sec_xyz", purpose: "webhook_verification"}` via SDK.

---

## 6. Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│   Operators: headyme.com dashboard                               │
│   Services: Identity Loom | Trust Fabric | Monetization Matrix  │
│   | Voice Vessel | Signal Exchange | heady-production           │
└───────────────────────────┬───────────────────────────────────────┘
                            │ SDK / REST
┌───────────────────────────▼───────────────────────────────────────┐
│              Sovereign Key Ring Service (Cloud Run)              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  Key Registry    │  │  Rotation Engine  │  │  Audit Logger  │  │
│  │  (metadata +     │  │  (schedule, zero- │  │  (immutable,   │  │
│  │   version mgmt)  │  │   downtime)       │  │   no key data) │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘  │
│           │                     │                     │            │
│  ┌────────▼─────────────────────▼─────────────────────▼────────┐  │
│  │         Key Material Store (Cloud KMS + Key Ring DB)       │  │
│  │   Key metadata: PostgreSQL                                  │  │
│  │   Key material: Google Cloud KMS (encrypted, access-logged) │  │
│  └──────────────────────────────────────────────────────────┘   │
└────────────┬──────────────────────────────────────────────────┬──┘
             │ Rotation signals                                  │ Key material (TLS only)
┌────────────▼─────────────┐              ┌────────────────────────▼─┐
│  Signal Exchange         │              │  Consuming services       │
│  KEY_ROTATED |           │              │  (via SDK, never raw API) │
│  KEY_REVOKED signals     │              └──────────────────────────┘
└──────────────────────────┘
```

**Tech Stack:**
- Runtime: Cloud Run (Node.js / TypeScript)
- Key material backend: Google Cloud KMS (AES-256-GCM for symmetric keys; RSA-4096 / EC P-256 for signing keys)
- Key metadata: PostgreSQL
- Rotation scheduler: Cloud Scheduler + Cloud Tasks
- Audit log: BigQuery (append-only partition for compliance)
- Identity: Identity Loom JWT with `keyring:access` scope
- Signal publication: Signal Exchange (Spec-09) for KEY_ROTATED, KEY_REVOKED events
- SDK: `@heady/keyring-sdk` (npm), wraps REST API with rotation-aware in-memory cache

---

## 7. Data Flows

### Key Access Flow (Service Retrieves Signing Key)

```
Identity Loom: SDK getKey("id_loom_signing_key", "jwt_signing")
  → @heady/keyring-sdk: check in-memory cache (TTL 5min)
  → Cache miss: POST /keyring/access {key_id, purpose}
    → Identity Loom JWT validation (service identity)
    → Policy check: Identity Loom service in consumer list for this key
    → GCP KMS: decrypt and return key material
    → Audit Log: record {service_id, key_id, version, purpose, timestamp}
    → Return key material in response (TLS only; never logged)
  → SDK: cache key with TTL
  → Identity Loom: use key for JWT signing
```

### Automated Rotation Flow

```
Cloud Scheduler: trigger rotation check (hourly)
  → Rotation Engine: query keys with next_rotation_at <= now()
  → For each due key:
    → GCP KMS: generate new key version
    → Update key registry: new version = ACTIVE, old version = GRACE_PERIOD
    → Publish KEY_ROTATED signal via Signal Exchange:
      {key_id, new_version, old_version, grace_expires_at}
    → Consuming services (subscribed to KEY_ROTATED): flush SDK cache
    → After grace period: old version RETIRED in registry
```

### Emergency Revocation Flow

```
Operator: POST /keyring/revoke/{key_id} {reason: "suspected compromise"}
  → Identity Loom: validate operator JWT with keyring:revoke scope
  → Key registry: mark key status = REVOKED, all versions RETIRED
  → GCP KMS: disable key versions
  → Audit log: REVOCATION event with operator_id, reason, timestamp
  → Signal Exchange: publish KEY_REVOKED {key_id, reason}
  → Dependent services: receive signal, flush cache, call home for new key or halt
  → Operator: confirmation + dependent service notification count
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| Key material in logs | GCP KMS returns key material only via API; Key Ring never logs, caches in DB, or echoes key bytes in any API response other than the authorized access endpoint |
| Transport security | Key material returned only over TLS 1.3; mTLS enforced for service-to-Key-Ring calls |
| Access scope enforcement | Services can only access keys where they are listed in the consumer policy; enforced at registry lookup before GCP KMS call |
| Audit log immutability | Audit records written to BigQuery append-only partition; no UPDATE or DELETE allowed |
| Rotation continuity | Old key valid during grace period prevents hard failures during rolling deployments |
| Emergency revocation completeness | Revocation disables all versions in GCP KMS AND updates registry, so SDK cache misses always reflect revoked state |
| Key generation entropy | All key material generated by GCP KMS; no client-side key generation |
| Developer secret isolation | Developer secrets partitioned by account identity; cross-account access blocked by policy |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| Heady Identity Loom (Spec-02) | JWT validation and service identity verification | Phase 1 |
| Heady Signal Exchange (Spec-09) | KEY_ROTATED / KEY_REVOKED signal publishing | Phase 1 |
| Google Cloud KMS | Encrypted key material storage and management | Phase 1 |
| headyapi-core | API gateway for Key Ring endpoints | Phase 1 |
| PostgreSQL | Key registry metadata | Phase 1 |
| BigQuery | Immutable audit log | Phase 1 |
| Cloud Scheduler + Cloud Tasks | Rotation scheduling | Phase 1 |
| heady-sentinel | Security monitoring consumer of KEY_REVOKED signals | Phase 1 |
| All fourth-wave services | Consumers of Key Ring for their respective signing and API keys | Phase 1–2 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| Key access latency (p99, SDK cache miss) | < 100ms | 30 days post-launch |
| Zero-downtime rotation success rate | 100% — no service disruption during scheduled rotation | 30 days |
| Emergency revocation propagation time | < 60s from operator action to all dependent services | 30 days |
| Keys with overdue rotation | 0% — all keys rotated on schedule | Ongoing |
| Audit log completeness | 100% of access events captured | Ongoing |
| Orphaned key detection (unused > 30 days) | Flagged within 24 hours of crossing threshold | 30 days |

---

## 11. Phased Rollout

### Phase 1 — Core Key Management (Weeks 1–4)
- Sovereign Key Ring Service on Cloud Run
- GCP KMS integration
- Key Registry (PostgreSQL)
- Secure Key Access API
- `@heady/keyring-sdk` npm package
- Automated rotation (Cloud Scheduler)
- Emergency revocation
- Audit log (BigQuery)
- Key Ring Dashboard on headyme.com

### Phase 2 — Signal Integration + Developer Secrets (Weeks 5–8)
- Signal Exchange integration (KEY_ROTATED, KEY_REVOKED)
- Zero-downtime grace period rotation
- Developer secret registration (headyio.com)
- Key health alerts
- Audit log export UI
- Policy enforcement (consumer list)

### Phase 3 — HSM + Advanced (Weeks 9–16)
- HSM integration (FIPS 140-2 Level 3)
- PKI certificate management
- Multi-party threshold signing

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Should GCP KMS be used from day one, or is Secret Manager adequate for v1 with KMS migration in Phase 2? | Engineering / Security | Yes — Phase 1 design |
| What is the rotation schedule for each key type? (Signing keys: 90 days? API keys: 365 days? Symmetric: 30 days?) | Security | Yes |
| Should the Key Ring SDK support synchronous or async key retrieval? Synchronous simplifies consumers but may block. | Engineering | Yes |
| Who is the approval authority for emergency revocations — any operator, or a quorum? | Security / Eric | No (single operator for now; multi-party in Phase 3) |
