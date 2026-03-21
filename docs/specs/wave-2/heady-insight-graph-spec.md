# Feature Specification: Heady Insight Graph

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headyme.com / heady-ai.com / headysystems.com  
**Status:** Draft

---

## 1. Purpose

Heady Insight Graph is an automated knowledge graph and intelligence synthesis layer that builds a living, queryable map of everything the user has worked on, learned, created, and decided across their Heady history. It connects entities — people, projects, concepts, tools, decisions, and outcomes — into a structured graph, and uses that graph to surface non-obvious insights, recommend connections, and answer reflective questions like "What decisions have I made about my pricing strategy?" or "What patterns emerge across my last 30 research sessions?"

### Problem Statement
Users accumulate substantial intelligence through their Heady sessions — in memories, workspace files, genome outputs, and session histories — but this knowledge is siloed and unconnected. There is no way to query across it, discover patterns, or understand the evolution of one's thinking over time. The result is that users cannot leverage their own accumulated AI-assisted knowledge effectively, and the Heady ecosystem cannot help them do so.

### Goals
1. Automatically build and maintain an insight graph from user data sources (Memory Sanctum, SWC, session history) with no required user action.
2. Support natural-language queries against the graph ("What have I concluded about X?").
3. Surface proactive insight suggestions — weekly "intelligence digest" of notable patterns and connections.
4. Enable users to manually annotate, correct, or expand graph nodes.
5. Protect graph data as the most sensitive user data in the ecosystem — stricter controls than any other Heady service.

### Non-Goals
- Cross-user knowledge graphs or shared graph exploration (strictly private in v1).
- Real-time graph updates during session (batch update process; near-real-time in v2).
- Predictive or causal inference modeling (graph surfaces correlations and connections, not causal claims).
- Export to external graph tools (Neo4j, Obsidian) in v1.

---

## 2. User Experience

### User Personas
- **The Reflective Strategist** — wants to understand how their thinking on a topic has evolved and what decisions they've made.
- **The Knowledge Worker** — accumulates research across many sessions and wants to query it as a whole.
- **The Self-Optimizer** — interested in patterns across their own work habits, recurring themes, and knowledge gaps.

### Core UX Flows

**Insight Graph Explorer (headyme.com/insights)**
1. Graph view: interactive node-link diagram. Nodes represent entities (projects, concepts, people, decisions, tools). Edges represent relationships (informed, led to, depends on, contradicts, etc.).
2. Node types displayed in distinct colors: Project (blue), Concept (green), Decision (orange), Person (purple), Tool (gray), Outcome (red).
3. Click a node → Node Detail panel: entity name, type, a list of connected nodes, source sessions/files, AI-generated summary of what the user knows/concluded about this entity.
4. Search bar: "Find [entity]" with autocomplete across all graph nodes.
5. Timeline slider: replay the graph's growth over time ("show my graph as of 3 months ago").
6. Insight Cards carousel: AI-generated insight summaries — "You've referenced 'MCP protocol' in 14 sessions across 3 projects. Here's what you've concluded..."

**Natural-Language Graph Query**
1. User types a reflective question in a Heady session: "What have I decided about my pricing model?"
2. Agent detects insight-graph query intent.
3. Graph Query Engine searches graph for "pricing model" entity and connected Decision nodes.
4. Agent synthesizes a response drawing on graph data: "Across your 5 sessions on pricing, you've leaned toward usage-based pricing (3 sessions) but noted concerns about predictability in 2 sessions. Your most recent conclusion was..."
5. Agent cites specific source sessions/files for each claim.

**Weekly Intelligence Digest**
- Every Monday, user receives a digest card in their headyme.com dashboard (and optionally by email).
- Digest sections: "New connections found this week", "Concepts you've returned to most", "A decision worth revisiting", "Knowledge gap detected" (e.g., "You've referenced 'SOC 2' frequently but have no conclusion nodes on it").

**Manual Graph Editing**
- User can: rename a node, merge two nodes (e.g., "Heady Platform" and "Heady OS" are the same), add a manual edge with a custom relationship label, mark a node as "Resolved" or "Archived".
- AI-suggested merges: when the system detects likely duplicate nodes, it surfaces a suggestion: "These look like the same concept — merge?"

---

## 3. Architecture

### Components

| Component | Role | Domain |
|---|---|---|
| Graph Extraction Pipeline | Reads new session data, Memory Sanctum entries, and SWC files; extracts entities and relationships | headysystems.com |
| Knowledge Graph Store | Stores the entity-relationship graph (nodes + edges + attributes) | headysystems.com |
| Graph Query Engine | Processes natural-language queries against the graph | heady-ai.com |
| Insight Synthesizer | Generates AI-written insight summaries and weekly digest | heady-ai.com |
| Graph Explorer UI | Interactive node-link visualization in headyme.com | headyme.com |
| Manual Edit API | Allows user to rename, merge, annotate, archive nodes/edges | headyapi.com |
| Privacy Enforcer | Ensures graph data never leaves user namespace; strictest access controls | headysystems.com |

### Technology Choices
- **Graph Store:** Neo4j (self-hosted on Cloud Run) or PostgreSQL with pgvector + adjacency table for smaller scale. Neo4j preferred for query expressiveness.
- **Extraction:** LLM-based NER (named entity recognition) + relationship extraction over session summaries and memory text.
- **Graph Query:** Cypher query generation via LLM, executed against Neo4j.
- **Visualization:** D3.js force-directed graph in the Explorer UI.

### Entity Extraction Schema
```
Input: text (session summary, memory text, file content)
Output:
  entities: [{id, label, type: Project|Concept|Decision|Person|Tool|Outcome}]
  relationships: [{from_id, to_id, type: "informed"|"led_to"|"depends_on"|"contradicts"|"implements", evidence_text}]
```

---

## 4. Data Flows

### Graph Build Pipeline (Batch, nightly)
```
1. Pipeline triggers nightly (or on significant new data event)
2. Fetch new Memory Sanctum entries created since last run
3. Fetch new SWC file content created since last run
4. Fetch session summaries from last 24h
5. For each text chunk: LLM entity + relationship extraction call
6. Extracted entities deduplicated against existing graph (fuzzy name match + embedding similarity)
7. New nodes + edges upserted to Knowledge Graph Store
8. Insight Synthesizer generates updated node summaries for changed nodes
9. Weekly digest generation runs on Monday nightly build
```

### Graph Query Flow
```
1. User submits natural-language query in session or Graph Explorer
2. Graph Query Engine: query text → Cypher query (LLM call)
3. Cypher query executed against Knowledge Graph Store (user namespace)
4. Result set (nodes + edges) returned
5. Insight Synthesizer: result set → natural-language synthesis (LLM call)
6. Response returned to user with source citations (session IDs, file IDs, memory IDs)
```

### Manual Edit Flow
```
1. User performs edit action (rename, merge, add edge, archive)
2. POST /insight-graph/edit {user_id, action, node_ids, attributes}
3. Knowledge Graph Store updated
4. Edit event logged to audit trail
5. Affected node summaries invalidated; re-generated on next digest cycle
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| Strictest data classification | Insight graph is Tier 0 Personal Data — highest sensitivity; represents a map of the user's thinking and decisions |
| User namespace isolation | Graph is stored in a user-specific database or database partition; no cross-user queries possible |
| No external exposure | Graph data is never exposed via public API, shared links, or third-party integrations in v1 |
| No training use | Graph data is explicitly excluded from any AI training pipeline |
| Encryption | AES-256 at rest; TLS 1.3 in transit; database-level encryption |
| Audit trail | Every graph read and write logged; user-accessible in dashboard |
| Right to deletion | Graph purge completes within 24 hours of user request; no residual data in extraction pipeline |
| Agent access | No agent other than the Insight Synthesizer may read graph data; agents may only receive graph-derived natural-language synthesis |

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| Heady Memory Sanctum (primary data source for graph build) | Second-wave | Required for rich graph |
| Heady Sovereign Workspace Cloud (secondary data source) | Second-wave | Complementary |
| heady-ai.com LLM routing (extraction + synthesis calls) | heady-ai.com | Required |
| Knowledge Graph Store (Neo4j or PostgreSQL+pgvector) | Infrastructure | Required |
| headyme.com dashboard (Explorer UI) | headyme.com | Required |
| D3.js or equivalent visualization library | Frontend | Required |

---

## 7. Phased Rollout

### Phase 1 — Extraction Pipeline + Store (Weeks 1–6)
- Graph Extraction Pipeline (LLM-based NER + relationship extraction)
- Knowledge Graph Store (PostgreSQL + adjacency table for v1 scale)
- Basic extraction from Memory Sanctum entries
- Internal alpha: build graph from Heady team's own data; validate extraction quality
- Success gate: Extraction precision ≥75% (entities correct) on manual evaluation set; no false entity merges

### Phase 2 — Graph Query + Basic Explorer (Weeks 7–10)
- Graph Query Engine (natural-language → Cypher/SQL → synthesis)
- Graph Explorer UI (basic node list + detail panel; no visualization yet)
- Natural-language query in Heady sessions
- Closed beta: 30 users
- Success gate: ≥80% of natural-language queries return a relevant, source-cited response

### Phase 3 — Visual Explorer + Digest (Weeks 11–14)
- D3.js visual graph in Explorer UI
- Timeline slider
- Weekly Intelligence Digest (dashboard card + optional email)
- Insight Cards carousel
- SWC file content added as extraction source
- Open launch
- Success gate: ≥30% of active users view their graph within first 2 weeks; digest open rate ≥40%

### Phase 4 — Manual Editing + Advanced Insights (Weeks 15–18)
- Manual node/edge editing (rename, merge, annotate, archive)
- AI-suggested node merges
- Knowledge gap detection
- Node summary versioning (track how user's view of a concept has evolved)
- Success gate: ≥20% of users make at least one manual graph edit; knowledge gap alerts acted on ≥30% of the time

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Neo4j vs. PostgreSQL adjacency table — what is the scale decision point? | Engineering | Yes — before Phase 1 |
| What is acceptable extraction precision for launch? (≥75% suggested) | Product | Yes — before Phase 1 |
| Should Insight Digest be opt-in or opt-out? | Product | No |
| How many nodes constitute a "large" graph requiring UI performance optimization? | Engineering | No |
| Should weekly digest include competitor or market intelligence nodes (from web_search sessions)? | Product | No |

---

## 9. Success Metrics

| Metric | Target | Window |
|---|---|---|
| Extraction precision | ≥75% correct entities on manual eval set | Phase 1 alpha |
| Graph query relevance | ≥80% relevant, source-cited responses | 30 days post Phase 2 |
| Explorer engagement | ≥30% of active users view graph within 2 weeks of Phase 3 launch | Phase 3 launch +14 days |
| Digest open rate | ≥40% of digest recipients open within 48 hours | 30 days post Phase 3 |
| User-reported insight value | ≥4.0/5 "this insight was useful" rating | 60 days post Phase 3 |
| Zero unauthorized graph access incidents | 0 | Ongoing |
