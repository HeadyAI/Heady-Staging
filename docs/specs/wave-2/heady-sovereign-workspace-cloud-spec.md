# Feature Specification: Heady Sovereign Workspace Cloud

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headyme.com / headysystems.com / headyio.com  
**Status:** Draft

---

## 1. Purpose

Heady Sovereign Workspace Cloud (SWC) is a user-sovereign, AI-native file and artifact storage layer purpose-built for the Heady ecosystem. Unlike general-purpose cloud storage (Dropbox, Google Drive), the SWC is designed to store, version, and make AI-accessible every artifact the Heady ecosystem produces or consumes: documents, code, knowledge files, task genome outputs, simulation traces, memory exports, and structured data. Users own their data absolutely — it is not used by Heady for training, is fully exportable, and can be deleted at will.

### Problem Statement
Heady agents currently produce outputs (drafts, reports, code, summaries) that disappear at session end. Users have no organized, searchable, AI-queryable store for the work they've done with Heady. They copy outputs to external tools, creating fragmentation. Agents also cannot access prior outputs without the user manually re-pasting them. This breaks the continuity that makes AI useful for long-horizon work.

### Goals
1. Give every Heady user a persistent, AI-queryable workspace for storing session outputs and uploaded files.
2. Enable any Heady agent to read from and write to the SWC with user-granted permission in ≤ 500ms.
3. Provide full-text and semantic search across all workspace content from within the Heady ecosystem.
4. Guarantee 100% user data portability: full workspace export in < 24 hours on request.
5. Achieve zero data loss incidents with ≥99.9% availability.

### Non-Goals
- Real-time collaborative editing of files (v2; single-user workspace in v1).
- SWC as a replacement for a full office suite (files are stored and retrieved, not live-edited in rich UI).
- Public file sharing or publishing from SWC (deferred — SWC is private workspace only in v1).
- Blockchain-based data sovereignty proofs (out of scope; sovereignty is enforced by policy and architecture).

---

## 2. User Experience

### User Personas
- **The Output Collector** — wants every AI-generated output automatically saved to an organized workspace without thinking about it.
- **The Long-Horizon Project Worker** — building a multi-week project with Heady and needs all prior artifacts accessible to the AI and to themselves.
- **The Privacy Maximalist** — wants all their AI work stored in a system they control, with no ambiguity about how it is used.

### Core UX Flows

**Auto-Save of Session Outputs**
1. At session end (or at any point via "Save to Workspace" button), any AI-generated artifact (document, code snippet, table, summary) is automatically saved to the user's SWC.
2. Save modal: auto-suggested file name and folder path (e.g., `Projects / MCP Competitor Research / 2026-03-17_summary.md`), editable.
3. Tags auto-suggested from session context (e.g., "research", "MCP", "competitor").
4. File appears in Workspace Browser immediately.

**Workspace Browser (headyme.com/workspace)**
- Sidebar: folder tree (user-organized) with "Recent" and "AI-Generated" smart folders.
- File list: name, type icon, size, created/modified date, source (session ID), tags.
- Preview pane: inline preview for Markdown, code, JSON, images, PDFs.
- Search bar: full-text + semantic search ("find my notes about authentication").
- "Ask about this file" button: opens a session with the file pre-loaded as context.
- Multi-select + bulk operations: delete, move, tag, export.

**Agent File Access**
1. Agent in any session requests file access: "Do you want me to read your previous competitor analysis?"
2. User grants: "Yes, use [file name]" or "Yes, use all files tagged 'MCP'".
3. Agent calls SWC Read API with user's granted permission.
4. File content injected into session context.
5. Agent can also write: "I'll save this report to your workspace" → auto-saves on completion.

**Workspace Export**
- headyme.com/workspace/settings → "Export all" button.
- Export package: ZIP with all files in original format + a `manifest.json` with metadata.
- Delivered to user's email within 24 hours (or direct download for small workspaces < 500MB).

---

## 3. Architecture

### Components

| Component | Role | Domain |
|---|---|---|
| SWC Storage Layer | Object storage for all workspace files (binary-safe) | headysystems.com |
| SWC Metadata DB | Structured store for file metadata: name, path, tags, source, versions | headysystems.com |
| SWC Vector Index | Semantic embeddings of file content for similarity search | headysystems.com |
| SWC Access Control | Per-file, per-session, per-agent permission enforcement | headysystems.com |
| SWC API | Read/write/search/delete endpoints for agents and UI | headyapi.com |
| Auto-Save Service | Listens to session output events and triggers saves | heady-ai.com |
| Workspace Browser UI | headyme.com/workspace frontend | headyme.com |
| Export Service | Generates and delivers workspace export packages | headysystems.com |

### Storage Architecture
- **Object store:** Cloudflare R2 (zero-egress cost) or AWS S3, per-user bucket prefix for isolation.
- **Metadata DB:** PostgreSQL with row-level security on user_id.
- **Vector index:** Same infrastructure as Memory Sanctum (reuse embedding pipeline).
- **Versioning:** Object store versioning enabled; up to 10 versions per file retained.

### File Type Support (v1)
Markdown, plain text, JSON, YAML, HTML, PDF (read-only), PNG/JPG/WEBP (read-only preview), code files (.py, .js, .ts, .sql, etc.)

---

## 4. Data Flows

### Write Flow (Auto-Save from Session)
```
1. Session end or "Save to Workspace" trigger
2. Auto-Save Service receives artifact payload {user_id, content, suggested_name, session_id, tags}
3. POST /swc/write {user_id, path, content, tags, source_session_id}
4. SWC Access Control validates JWT and write permission
5. Content stored in Object Store at user-namespaced path
6. Metadata row inserted in Metadata DB
7. Content → Embedding Model → vector stored in Vector Index
8. 200 OK {file_id, path, version}
```

### Read Flow (Agent Access)
```
1. Agent requests file: POST /swc/read {user_id, file_id OR path OR semantic_query}
2. SWC Access Control validates JWT + active session permission grant
3. If semantic_query: Vector Index search → top-K file_ids → fetch content
4. If file_id/path: direct fetch from Object Store
5. Content returned to agent (streaming for large files)
6. Access event logged to audit trail
```

### Search Flow (User UI)
```
1. User types in Workspace Browser search bar
2. GET /swc/search {user_id, q, tags, type, date_range}
3. SWC API: parallel full-text search (Metadata DB) + semantic search (Vector Index)
4. Results merged and ranked by relevance + recency
5. Returned as paginated file cards with highlighted matches
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| User namespace isolation | Each user's files stored in isolated object store prefix; no cross-user path access possible |
| Encryption at rest | AES-256 on all stored files and metadata |
| Encryption in transit | TLS 1.3 on all SWC API endpoints |
| Agent access is session-scoped | An agent can only access files the user explicitly grants in the current session; grants expire at session end |
| No training use | SWC file content is never used for AI model training without a separate, explicit, reversible opt-in |
| Immutable audit log | Every file read, write, and delete is logged with timestamp, actor (user or agent_id), and session_id |
| Data deletion | User-initiated delete triggers immediate soft-delete; hard-delete within 72 hours; export package available for 7 days after delete request |
| Data residency | US-only default; EU residency flag available at account level |
| Portability | Full workspace export in standard formats; no proprietary lock-in |

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| Object storage (Cloudflare R2 or AWS S3) | Infrastructure | Required |
| PostgreSQL (metadata DB) | headysystems.com | Required |
| Embedding pipeline (reuse from Memory Sanctum) | headysystems.com | Complementary — improves search quality |
| headyapi.com API gateway | headyapi.com | Required |
| heady-ai.com session orchestrator (for auto-save triggers) | heady-ai.com | Required |
| headyme.com dashboard (Workspace Browser UI) | headyme.com | Required |
| Heady Task Genome (file_read/file_write tasks point to SWC) | Second-wave | Complementary |

---

## 7. Phased Rollout

### Phase 1 — Core Storage + Write/Read API (Weeks 1–4)
- SWC Storage Layer + Metadata DB
- SWC API: write, read, delete
- SWC Access Control
- Manual save only (no auto-save)
- Internal alpha: Heady team stores session outputs
- Success gate: Write/read latency < 500ms P99; zero data loss in alpha

### Phase 2 — Auto-Save + Browser UI (Weeks 5–8)
- Auto-Save Service integration with session orchestrator
- Workspace Browser UI (basic file list, preview pane)
- Tag management
- Closed beta: 100 users
- Success gate: ≥80% of session outputs auto-saved without user action

### Phase 3 — Semantic Search + Agent Access (Weeks 9–12)
- SWC Vector Index
- Semantic search in Workspace Browser and SWC API
- Agent file access with session-scoped permission grants
- "Ask about this file" session integration
- Open launch
- Success gate: Search surfaces relevant files for ≥85% of test queries; agent access tested across headybot.com and heady-ai.com

### Phase 4 — Export + Versioning UI (Weeks 13–16)
- Full workspace export (ZIP + manifest)
- Version history UI in file detail
- Bulk operations (tag, move, export selection)
- Storage quota UI with upgrade path
- Success gate: Export tested for workspaces up to 10GB; version history available for all files

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Storage quota per user at launch? (Suggest 5GB free) | Product/Business | Yes — needed before Phase 1 |
| Should auto-save create a new file per session or append to an existing project file? | Product | Yes — before Phase 2 |
| How are large file uploads (PDFs, images) handled? Direct upload or presigned URL? | Engineering | No — use presigned URL pattern |
| What is the retention policy for deleted files after hard-delete? (Backups?) | Legal/Infrastructure | No — needed before open launch |
| Should agent file access require per-file grants or per-tag grants? | Product | No — per-tag grants acceptable for power users |

---

## 9. Success Metrics

| Metric | Target | Window |
|---|---|---|
| Write/read latency P99 | < 500ms | Ongoing |
| Availability | ≥99.9% | Ongoing |
| Data loss incidents | 0 | Ongoing |
| Auto-save adoption | ≥80% of session outputs auto-saved | 30 days post Phase 2 |
| Workspace search accuracy | ≥85% relevant results for test query set | 30 days post Phase 3 |
| Export request fulfillment | 100% of exports delivered within 24 hours | Ongoing |
| User data portability satisfaction | ≥4.5/5 in post-export survey | 30 days post Phase 4 |
