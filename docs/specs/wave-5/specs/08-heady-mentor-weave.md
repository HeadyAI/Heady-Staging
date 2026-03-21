# Heady Mentor Weave — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headyme.com (Mentor tab) + headyconnection.org  
**Heady Domain Anchor:** headyconnection-core, headyme-core, headybuddy-core  

---

## 1. Problem Statement

Mentorship is one of the highest-leverage accelerants for professional and personal growth, yet access to high-quality mentors is unevenly distributed — concentrated in elite networks, expensive coaching relationships, or pure luck. Heady is a community and AI platform simultaneously. HeadyConnection exists to broaden access to beneficial AI and community resources. Mentor Weave is the connective tissue that pairs people who want guidance with those who have it — structured, tracked, and augmented by AI coaching intelligence so that mentorship sessions are more productive, mentors are more effective, and the relationship is sustained over time rather than abandoned after an initial meeting.

**Cost of not solving it:** HeadyConnection's community value proposition remains unfulfilled; headybuddy.org's companion role does not extend into career/life guidance; the platform's network effects do not compound.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Match mentees with mentors within 72 hours of request | Median match time | ≤ 72 hours |
| G2 | Drive sustained mentorship relationships | % of matches active at week 8 | ≥ 50% |
| G3 | Improve session quality via AI preparation and reflection | Mentor + mentee session satisfaction score | ≥ 4.4 / 5 |
| G4 | Demonstrate measurable mentee goal progress | Mentee self-reported goal progress at 90 days | ≥ 65% report meaningful progress |
| G5 | Expand HeadyConnection mentor network | Active mentors registered | ≥ 200 within 6 months |

---

## 3. Non-Goals

- **Not a job placement service.** Mentor Weave does not facilitate hiring, referrals, or employment contracts.
- **Not a paid coaching marketplace.** V1 Mentor Weave is community-based; paid mentor tiers are a future consideration.
- **Not a therapy platform.** Mental health support is covered by Wellness Mirror's crisis redirect; Mentor Weave focuses on professional and life skills guidance.
- **Not a group cohort program.** One-to-one mentorship only in V1; group mentoring circles are a future phase.
- **Not a certification provider.** Mentor credentials and mentee completion certificates are out of scope for V1.

---

## 4. User Stories

**Mentee**
- As a mentee, I want to describe my growth goal and background and receive 3–5 matched mentor recommendations within 24 hours so that I can start a meaningful conversation quickly.
- As a mentee preparing for a session, I want HeadyBuddy to help me formulate 3 clear questions and a session goal so that I do not waste my mentor's time.
- As a mentee after a session, I want to capture my key takeaways and commitments in a session log so that I can track what I said I would do.

**Mentor**
- As a mentor, I want to see a mentee brief (background, goal, recent session history) before each session so that I arrive prepared without needing a 15-minute catch-up.
- As a mentor, I want to log notes after a session and send a follow-up nudge to the mentee automatically so that they stay accountable between sessions.
- As a mentor, I want to set my availability and session cadence preferences so that I am not overcommitted.

**Admin (headyconnection.org)**
- As a community admin, I want to see aggregate match rates, session counts, and progress scores for our mentor network so that I can report outcomes to grant funders.

---

## 5. Requirements

### P0 — Must Have
- **Mentor profile:** Name, expertise domains (up to 5), availability (sessions per month, preferred formats), bio, opt-in fields (company, years experience). Stored in headyconnection-core database.
- **Mentee goal statement:** Structured form capturing: primary goal, background context (3–5 sentences), preferred mentor style (advisory|challenging|supportive), preferred session format (async text|video|voice).
- **Match engine:** Embedding-based semantic matching between mentee goal statement and mentor expertise domains. Return top-5 matches ranked by semantic similarity + availability. Manual curation override by community admin.
- **Session lifecycle:** Pre-session prep (HeadyBuddy), session scheduling (external calendar link or Calendly integration), post-session log (structured notes + commitments), follow-up nudge to mentee (automated, 3 days post-session).
- **Session log storage:** Session notes and commitments stored in pgvector, linked to mentee+mentor pair. Accessible to both parties.
- **MCP tool hook:** `heady_mentor_get_brief`, `heady_mentor_log_session`, `heady_mentor_get_commitments` on headymcp-core.

### P1 — Should Have
- **AI session prep brief:** HeadyBuddy generates a 1-page prep brief for mentor (mentee background, recent session summary, suggested focus areas) and for mentee (3-question starter, session goal prompt) the morning of each session.
- **Progress tracking:** Mentee's stated goal tracked across sessions. Each session log includes a 1–5 progress rating. Trend visible to both parties.
- **Mentor capacity dashboard:** Mentor sees their current mentee load, upcoming sessions, and burnout-warning signal if capacity threshold approached.
- **Matching transparency:** Mentee can see why they were matched to each mentor (top 3 matching dimensions shown).

### P2 — Future
- **Peer mentor circles** — small groups (4–6) with a shared goal, AI-facilitated async discussion.
- **Learning Spiral integration** — if a mentee's Learning Spiral topic aligns with a mentor's expertise, Mentor Weave can proactively suggest the connection.
- **Mentor training resources** — curated AI coaching guidance for new mentors via Learning Spiral.

---

## 6. User Experience

**Mentee entry point:** headyconnection.org → "Find a Mentor" → Goal statement form → Mentor recommendations.

**Mentor entry point:** headyconnection.org → "Become a Mentor" → Profile setup (5-minute form).

**Pre-session (mentee):**
1. HeadyBuddy nudge day before: "Your session with [Mentor Name] is tomorrow — want to prep?"
2. 3-question conversation: What do you want to get out of this session? What's most stuck right now? What would a great outcome look like?
3. Session goal card generated and available to share with mentor.

**Post-session:**
1. Immediately after: "How did your session go?" → 1–5 rating + free-text.
2. HeadyBuddy extracts commitments from the notes.
3. Follow-up nudge in 3 days: "You committed to [X] — how's it going?"

---

## 7. Architecture

```
headyconnection.org (Mentor Weave portal)
headyme.com (Mentor tab for logged-in users)
    │
    ▼
Mentor Weave Service (new microservice, Cloud Run)
    ├─ Mentor Profile Store (pgvector, mentor_profiles table)
    ├─ Mentee Goal Store (pgvector, mentee_goals table)
    ├─ Match Engine (embedding similarity, pgvector ANN search)
    ├─ Session Lifecycle Manager
    │   ├─ Pre-session prep generator (heady-ai.com LLM)
    │   ├─ Session log writer (pgvector, sessions table)
    │   ├─ Commitment extractor (heady-ai.com LLM)
    │   └─ Follow-up nudge scheduler (Cloud Tasks)
    ├─ Progress Tracker (per-pair trend from session ratings)
    └─ MCP Tool Adapter (3 tools on headymcp-core)

Calendly / external calendar integration
    └─ Webhook receiver for session confirmation events
```

---

## 8. Data Flows

```
Mentor registration
    → Profile form submission
    → Expertise domains embedded (text-embedding-3-large)
    → Written to mentor_profiles (pgvector)

Mentee match request
    → Goal statement submitted
    → Goal embedded
    → pgvector ANN search against mentor_profiles (top-5)
    → Availability filter applied
    → Match recommendations returned to mentee

Pre-session prep
    → Scheduled trigger (morning of session)
    → heady-ai.com LLM: generate mentor brief + mentee session goal card
    → Push to both parties via HeadyBuddy / email

Post-session
    → Session log submitted by both parties
    → Commitment extractor: heady-ai.com LLM identifies action items
    → commitments written to sessions table
    → Cloud Task created for 3-day follow-up nudge
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Session note confidentiality | Notes visible only to the mentor+mentee pair; no admin access to session content |
| Mentor profile visibility | Mentor profiles visible to matched mentees only; not publicly indexed |
| Minors in the platform | Age gate on mentor/mentee registration; under-18 users require guardian consent gate |
| Background check for mentors | V1: community vouching (opt-in LinkedIn verification); V2: third-party background check integration |
| Data retention for sessions | Session logs retained for 2 years by default; configurable deletion on request |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| headyconnection-core database + profile infrastructure | HeadyConnection team | Yes — P0 |
| pgvector mentor/mentee/session schema | HeadyMe engineering | Yes — P0 |
| heady-ai.com LLM (prep + commitment extraction) | HeadyAI | Yes — P0 |
| headybuddy-core nudge/notification system | HeadyBuddy team | Yes — P0 |
| headymcp-core tool registration | HeadyMCP team | Yes (MCP tools) |
| Calendly webhook integration | External (Calendly) | No — P1 |
| Learning Spiral cross-feature API | Learning Spiral team | No — P2 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- Mentor profile + mentee goal form.
- Basic embedding match engine.
- Session log (manual entry only; no pre-session AI prep yet).
- 20-mentor pilot via headyconnection.org community.

**Phase 2 — Beta (Weeks 5–8)**
- AI pre-session prep briefs.
- Commitment extractor + follow-up nudge.
- Progress tracking.
- MCP tools live.
- 50-mentor beta.

**Phase 3 — Public (Weeks 9–12)**
- Full match transparency (top 3 matching dimensions shown).
- Mentor capacity dashboard.
- Calendly integration.
- Aggregate reporting for org admins.
- Open registration for mentors and mentees.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| Median match time | HeadyMetrics | 30 days | ≤ 72 hours | ≤ 24 hours |
| Week-8 relationship retention | HeadyMetrics | 60 days | 50% | 65% |
| Session satisfaction | In-app rating | 60 days | 4.4 / 5 | 4.7 / 5 |
| Mentee goal progress (90 days) | Survey | 90 days | 65% | 80% |
| Active mentors | Registration | 6 months | 200 | 500 |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Should we allow a mentee to request a specific mentor, bypassing the match engine? | Product | No |
| OQ2 | What is the safeguarding policy for mentor/mentee pairs involving users under 18? | Legal/Safety | Yes — pre-launch |
| OQ3 | Should mentors receive recognition or incentive for session volume and mentee outcomes? | Product | No |
| OQ4 | Is there a capacity ceiling per mentor (e.g., max 3 active mentees) that should be enforced by the platform? | Product | No |
