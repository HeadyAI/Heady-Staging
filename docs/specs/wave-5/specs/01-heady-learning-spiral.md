# Heady Learning Spiral — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headybuddy.org + headyme.com (Learning tab)  
**Heady Domain Anchor:** headybuddy-core, headyme-core  

---

## 1. Problem Statement

Adults who want to build skills — technical, creative, or professional — abandon structured courses at rates exceeding 90%. Static syllabi cannot adapt to what a learner already knows, how fast they are moving, or what just changed in the domain. Heady has persistent vector memory, multi-model routing, and a companion layer (HeadyBuddy) that is already trusted for ongoing dialogue. There is no path yet that turns that infrastructure into a personalized, spiral-structured learning journey that deepens over weeks and months.

**Cost of not solving it:** Learners stay dependent on external platforms with no ecosystem connection; Heady's companion relationship remains shallow; headybuddy.org misses its highest-engagement use case.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Increase mean HeadyBuddy session length | Session duration | +40% vs baseline within 60 days of launch |
| G2 | Drive sustained multi-week learner retention | % of learners active in week 4 | ≥ 55% |
| G3 | Deliver measurably improving user knowledge scores | Pre/post quiz delta | ≥ 25 percentile points per spiral cycle |
| G4 | Establish Heady as the preferred AI learning companion | NPS among learning-feature users | ≥ 60 |
| G5 | Seed headyio.com developer integrations | Third-party skill module submissions | ≥ 5 external modules in 90 days |

---

## 3. Non-Goals

- **Not a course marketplace.** Heady Learning Spiral does not sell or license external courses. Content is AI-generated and community-contributed, not a Udemy clone.
- **Not a credentialing engine.** V1 does not issue certificates, badges, or verifiable credentials (deferred to V2 pending HeadyAudit integration).
- **Not a classroom LMS.** Multi-instructor cohort scheduling, grade books, and institutional admin panels are out of scope.
- **Not a synchronous tutoring service.** Live human-AI hybrid sessions are a future phase; this spec covers asynchronous and async-companion delivery.
- **Not a replacement for heady-mentor-weave.** Mentor Weave handles human expert pairing; Learning Spiral handles AI-driven self-paced depth.

---

## 4. User Stories

**Core learner**
- As a learner starting a new topic, I want Heady to assess what I already know so that I do not repeat material I have mastered.
- As a learner returning after a gap, I want the spiral to re-anchor my position and recommend the highest-leverage next session.
- As a learner who absorbs material visually, I want the spiral to adapt its delivery format (diagram, text, analogy, quiz) to my preferred modality.
- As a learner completing a concept loop, I want a visible skill milestone marker so that I can see real progress accumulating over time.
- As a learner who is confused, I want to flag a concept and have HeadyBuddy explain it three different ways before moving on.

**Power user / developer**
- As a developer building on headyio.com, I want to publish a skill module so that Learning Spiral can incorporate it into learner paths.
- As a developer, I want access to the learner progress API so that my external app can display or branch on Heady-tracked milestones.

**Admin / ecosystem**
- As a HeadyConnection org admin, I want to provision learning spirals for community members and track cohort progress without accessing individual session content.

---

## 5. Requirements

### P0 — Must Have
- **Topic onboarding quiz:** 5–10 adaptive questions per topic to establish baseline placement. Stored in learner profile vector.
- **Spiral path generator:** Given a topic and baseline score, generate a 4–8 week path with spaced-repetition scheduling, using heady-ai.com model routing for content generation.
- **Session delivery engine:** Each session is a structured block: concept intro → example → analogy → micro-quiz → reflection prompt. Delivered conversationally inside HeadyBuddy.
- **Progress persistence:** All session completions, quiz scores, concept flags, and milestones stored in the learner's pgvector profile via latent-core-dev sync.
- **Spiral re-entry:** On return, system fetches last known position from vector store and contextualizes the next session to elapsed time and drift.
- **MCP tool hook:** `heady_learning_get_status`, `heady_learning_next_session`, `heady_learning_flag_concept` exposed on headymcp.com.

### P1 — Should Have
- **Modality adaptation:** Learner can set preferred format (visual-heavy, text-dense, Socratic). Session generator respects the preference in prompts.
- **Spiral visualization:** A D3.js spiral widget on headyme.com shows the learner's topic coverage arcs, completion rings, and open branches.
- **Community skill modules:** Developers can submit YAML-defined topic modules via headyio.com SDK; modules pass automated quality gate before activation.
- **Cross-topic dependency graph:** If Learner A is studying machine learning, the spiral notes that linear algebra is a dependency and can branch into it.

### P2 — Future
- **Verifiable completion records** anchored to HeadyAudit Forge (Wave 5).
- **Cohort spirals** where a group of learners shares a topic path and can see (opt-in) each other's progress.
- **Credential export** to open badge standards.

---

## 6. User Experience

**Entry point:** HeadyBuddy chat → "Start a Learning Spiral" intent, or headyme.com Learning tab.

**Flow:**
1. User types or selects a learning topic.
2. Baseline quiz runs conversationally in HeadyBuddy (5 questions, adaptive difficulty).
3. Spiral path is generated and displayed as a visual arc on the Learning tab.
4. Sessions are triggered by HeadyBuddy proactively ("Ready for your next session on gradient descent?") or on demand.
5. Each session is a 10–20 minute conversational block. User can pause/resume freely.
6. At cycle completion, a milestone card appears with a concept map and a recommended next arc.

**Empty state:** New user lands on a clean topic search with suggested popular spirals (e.g., "Python for data", "Startup finance", "AI safety primer").

---

## 7. Architecture

```
headybuddy.org (UI)
    │
    ▼
HeadyBuddy Chat Engine (headybuddy-core)
    │   ├─ Session Delivery Worker (Cloud Run)
    │   └─ Intent Router → "learning-spiral" intent class
    │
    ▼
Learning Spiral Service (new microservice, headyme-core domain)
    ├─ Topic Onboarding Module
    ├─ Spiral Path Generator (calls heady-ai.com multi-model router)
    ├─ Session Block Renderer (prompt templates + model calls)
    ├─ Progress Store (pgvector via latent-core-dev)
    └─ MCP Tool Adapter (headymcp-core, 3 tools)
```

**Model routing:** Complex content generation uses Claude Sonnet or GPT-5; quizzes use fast inference (Groq LPU or Gemini Flash).

**Storage:** Learner vector profile extended with `learning_spiral_state` JSONB column in pgvector. Spiral path stored as a directed acyclic graph (DAG) serialized to the Antigravity mirror.

---

## 8. Data Flows

```
User input (topic + quiz answers)
    → Learning Spiral Service
    → Baseline scorer
    → Path DAG generator (heady-ai.com)
    → pgvector write (learner profile)

Session start trigger (scheduled or on-demand)
    → pgvector read (last position, elapsed time)
    → Session Block Renderer
    → heady-ai.com model call
    → Rendered session → HeadyBuddy delivery
    → User response → quiz evaluator → score update → pgvector write

MCP call (external)
    → headymcp-core
    → Learning Spiral Service read-only API
    → JSON response (no PII in MCP layer)
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Learner profile sensitivity | Quiz answers and session content scoped to user's encrypted vector namespace; not accessible via public API |
| Model output quality | Session blocks pass a relevance+accuracy guard prompt before delivery; flagged outputs routed to human review queue |
| Developer module trust | Community modules isolated in sandboxed prompt templates; no direct code execution; quality gate required before activation |
| COPPA / minors | If user age <18 is detected, learning spiral operates in restricted mode with parental consent gate |
| Data retention | User can delete all Learning Spiral data from headyme.com profile settings at any time; pgvector rows hard-deleted within 24 hours |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| latent-core-dev pgvector schema extension | HeadyMe engineering | Yes — P0 |
| heady-ai.com multi-model router (stable API) | HeadyAI team | Yes — P0 |
| headymcp-core tool registration | HeadyMCP team | Yes (for MCP tools) |
| headybuddy-core intent classification | HeadyBuddy team | Yes — P0 |
| headyio.com SDK module submission flow | HeadyIO team | No — P1 |
| D3.js spiral visualization component | Frontend | No — P1 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- Core onboarding quiz + path generator for 3 seed topics (Python, AI safety, product management).
- Session delivery inside HeadyBuddy (text-only).
- Progress stored in pgvector.
- Internal dogfood with HeadySystems team.

**Phase 2 — Beta (Weeks 5–8)**
- Expand to 20 topics.
- Spiral visualization widget on headyme.com.
- MCP tools live.
- Invite-only beta via headyconnection.org community.

**Phase 3 — Public (Weeks 9–12)**
- Full topic search, modality adaptation.
- Developer module submission pipeline on headyio.com.
- Proactive session nudges from HeadyBuddy.
- Success metrics reviewed; path to V2 cohort features assessed.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| Session adoption | HeadyMetrics | 30 days | 15% of MAU | 30% |
| Week-4 retention | HeadyMetrics | 60 days | 55% | 70% |
| Quiz score delta | Internal scorer | Per cycle | +25 percentile | +40 |
| NPS (learning feature) | In-app survey | 90 days | 60 | 75 |
| Developer modules submitted | headyio.com | 90 days | 5 | 15 |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Should Learning Spiral paths be shareable/public? Privacy vs. virality tradeoff. | Product | No |
| OQ2 | What is the optimal session length for different topic categories? | Research | No |
| OQ3 | Will the module quality gate require human review or can it be automated? | Engineering | No |
| OQ4 | Should quiz scores be visible to HeadyConnection org admins for grant reporting? | Legal/Privacy | No |
