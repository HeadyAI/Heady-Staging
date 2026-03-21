# Heady Decision Theater — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headyme.com (Decision Theater panel) + headybuddy.org  
**Heady Domain Anchor:** headyme-core, headybuddy-core, heady-montecarlo  

---

## 1. Problem Statement

High-stakes decisions — career pivots, product strategy choices, investment decisions, major life transitions — are rarely made with structured analytical rigor. People consult friends, rely on gut instinct, or defer indefinitely. Frameworks like decision trees, pre-mortems, and scenario analysis exist in business schools and strategic planning offices but are inaccessible to most individuals. Heady has heady-montecarlo (probabilistic modeling), headybuddy-core (trusted conversational companion), and the Life OS Canvas (user context and values). Decision Theater weaves these together into an immersive, AI-facilitated decision process that takes a user from a half-formed choice to a clear, well-reasoned decision with a documented rationale — suitable for personal, business, and governance decisions alike.

**Cost of not solving it:** HeadyBuddy remains reactive and advisory rather than a true decision partner; heady-montecarlo's probabilistic engine sits underutilized; headyme.com lacks a flagship power-user feature.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Help users reach a clear, documented decision outcome | % of Decision Theater sessions that produce a logged decision | ≥ 70% |
| G2 | Improve user confidence in their decisions | Post-session confidence rating | ≥ 4.3 / 5 |
| G3 | Drive repeat usage for ongoing and sequential decisions | Users with ≥ 3 sessions | ≥ 20% of MAU within 90 days |
| G4 | Demonstrate measurably better decision quality vs. unassisted | User 30-day retrospective rating of decision outcome quality | ≥ 4.0 / 5 |
| G5 | Establish Decision Theater as a flagship headyme.com feature | Feature-driven MAU lift | ≥ 10% headyme.com MAU increase in 90 days |

---

## 3. Non-Goals

- **Not an investment advisor.** Decision Theater does not provide financial advice, portfolio recommendations, or tax guidance.
- **Not a legal advisory tool.** Decisions with legal implications are flagged for legal review but Decision Theater does not provide legal analysis.
- **Not a group decision management platform.** V1 is single-user; collaborative decision sessions are a future phase.
- **Not a deterministic prediction engine.** Decision Theater models uncertainty; it does not predict outcomes with false precision.
- **Not a replacement for professional judgment.** For medical, legal, or financial decisions, Decision Theater provides a structured thinking framework, not a professional opinion.

---

## 4. User Stories

**Individual user**
- As a user facing a major career decision, I want Decision Theater to help me map out my options, the key uncertainties, and my values so that I can make a choice I will be at peace with.
- As a user who has defined my options, I want to run a pre-mortem on each option so that I can surface risks I have not thought of.
- As a user who uses heady-montecarlo, I want to feed my decision's financial scenario into a Monte Carlo simulation and see the probability distribution of outcomes.
- As a user who has made a decision, I want to log it with my rationale so that I can review it in 30 days and learn from the outcome.

**Team leader / executive**
- As an executive, I want to structure a strategic decision with my values, constraints, and key uncertainties mapped so that my team can see the reasoning, not just the outcome.

**Developer**
- As a developer, I want to call the Decision Theater API with a structured decision payload and receive a scenario analysis and pre-mortem output so that I can embed decision facilitation in my enterprise tool.

---

## 5. Requirements

### P0 — Must Have
- **Decision frame builder:** HeadyBuddy-facilitated flow that elicits: decision statement, options (2–5), key criteria, values at stake (linked to Life OS Canvas if available), time horizon, and reversibility.
- **Option analysis:** For each option: pros/cons generation (LLM), key assumption identification, and an "inversion test" (what would have to be true for this option to be the wrong choice?).
- **Pre-mortem module:** For the leading option, generate a structured pre-mortem: imagine the decision was made 12 months ago and it failed — what went wrong? 5–8 failure modes with likelihood tagging (high/medium/low).
- **Decision log:** Every completed Decision Theater session saved to the user's Decision Log on headyme.com. Record includes: frame, option analysis, pre-mortem, chosen option (or "deferred"), rationale, timestamp.
- **30-day retrospective trigger:** 30 days after a logged decision, HeadyBuddy asks: "You decided to [X] a month ago — how did it go?" Response logged to the decision record.
- **MCP tool hook:** `heady_decision_get_frame`, `heady_decision_log_decision`, `heady_decision_get_log` on headymcp-core.

### P1 — Should Have
- **Monte Carlo integration:** For decisions with quantifiable financial or probabilistic outcomes, launch a heady-montecarlo simulation from within Decision Theater. Results displayed as probability distributions inline.
- **Life OS Canvas context injection:** If the user has an active Canvas, Decision Theater pre-loads relevant domain goals and values as framing context.
- **Criteria weighting:** User can weight criteria (e.g., financial security 40%, autonomy 35%, impact 25%) and see each option scored against the weighted criteria matrix.
- **Competing values audit:** If options map to conflicting user values (e.g., stability vs. growth), Decision Theater surfaces the value tension explicitly.

### P2 — Future
- **Collaborative session** — invite one other party to a shared Decision Theater session for joint framing.
- **Decision pattern analytics** — across a user's decision log, surface recurring patterns (e.g., "You consistently overweight short-term risk and underweight long-term opportunity").
- **Scenario playbook library** — pre-built decision frameworks for common archetypes (hiring your first employee, choosing a co-founder, pivoting a product).

---

## 6. User Experience

**Entry point:** headyme.com → Decision Theater → "Start a New Decision"; or HeadyBuddy → "Help me think through a decision."

**Decision framing flow (HeadyBuddy-facilitated):**
1. "What's the decision you're facing?" — free-text.
2. "What are your main options?" — up to 5, typed or dictated.
3. "What matters most to you in making this choice?" — Buddy maps to criteria and optionally pulls from Life OS Canvas values.
4. Frame confirmation: user reviews and edits the structured frame.

**Analysis view (headyme.com):**
- Options displayed in a side-by-side card layout.
- Each card: pros/cons, assumption flags, inversion test result.
- Pre-mortem displayed below the leading option.
- Monte Carlo widget (if applicable) embedded inline.

**Decision log:**
- Timeline view of all past decisions.
- Click-through to full session detail.
- 30-day retrospective entries shown as follow-up cards.

---

## 7. Architecture

```
headyme.com Decision Theater panel + headybuddy.org
    │
    ▼
Decision Theater Service (new microservice, Cloud Run)
    ├─ Decision Frame Orchestrator (HeadyBuddy intent: "decision-frame")
    ├─ Option Analyzer (heady-ai.com LLM: pros/cons, assumptions, inversion test)
    ├─ Pre-Mortem Generator (heady-ai.com LLM, structured failure mode output)
    ├─ Criteria Weighter (user-configured weights → option scoring matrix)
    ├─ Life OS Canvas Context Fetcher (reads Canvas summary for active domains)
    ├─ Monte Carlo Dispatcher (calls heady-montecarlo service via headyapi.com)
    ├─ Decision Log Store (pgvector, decision_sessions table)
    ├─ Retrospective Scheduler (Cloud Tasks, 30-day trigger)
    └─ MCP Tool Adapter (3 tools on headymcp-core)
```

**heady-montecarlo linkage:** Decision Theater calls heady-montecarlo as an optional module; montecarlo returns a probability distribution payload that Decision Theater renders as a chart.

---

## 8. Data Flows

```
Decision frame creation (HeadyBuddy)
    → Intent: "decision-frame"
    → Frame Orchestrator: 4-step dialogue
    → Structured frame JSON built
    → Life OS Canvas Context Fetcher: pull domain goals/values (if Canvas active)
    → Frame enriched with Canvas context
    → Written to decision_sessions table (status: framed)

Option analysis
    → Option Analyzer: heady-ai.com LLM per option (pros/cons, assumptions, inversion)
    → Pre-Mortem Generator: heady-ai.com LLM for leading option
    → Results written to decision_sessions (status: analyzed)
    → Rendered in Decision Theater UI

Monte Carlo (if triggered)
    → User configures financial parameters
    → Decision Theater → headyapi.com → heady-montecarlo
    → Distribution payload returned
    → Rendered as inline chart

Decision logged
    → User selects option (or "deferred") + writes rationale
    → decision_sessions updated (status: decided, chosen_option, rationale)
    → Cloud Task created: 30-day retrospective trigger

Retrospective (30 days later)
    → HeadyBuddy nudge
    → User response → retrospective_rating + free-text appended to decision_sessions
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Decision content sensitivity | Decision sessions stored in encrypted user namespace; no sharing or aggregation |
| Life OS Canvas context | Canvas summary injected locally; not sent to external APIs beyond the standard heady-ai.com model call context |
| Decision log permanence | User can delete individual decision sessions or the full log at any time |
| Monte Carlo financial parameters | Parameters scoped to user session; not retained after session closes unless user explicitly saves |
| Legal/financial decision disclaimer | All Decision Theater sessions open with a brief disclaimer: "This is a structured thinking tool, not professional legal, medical, or financial advice" |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| headybuddy-core intent classification ("decision-frame") | HeadyBuddy team | Yes — P0 |
| pgvector decision_sessions table schema | HeadyMe engineering | Yes — P0 |
| heady-ai.com LLM (option analysis + pre-mortem) | HeadyAI | Yes — P0 |
| headymcp-core tool registration | HeadyMCP team | Yes (MCP tools) |
| Life OS Canvas Context API | Life OS Canvas team (Wave 5) | No — P1 |
| heady-montecarlo API (probabilistic modeling) | heady-montecarlo team | No — P1 |
| Cloud Tasks (retrospective scheduler) | Infrastructure | Yes — P0 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- Decision frame builder + option analysis + pre-mortem.
- Decision log (manual save).
- Internal HeadySystems team dogfood.

**Phase 2 — Beta (Weeks 5–8)**
- Criteria weighting + scoring matrix.
- Life OS Canvas context injection.
- 30-day retrospective trigger.
- MCP tools live.
- Invite-only beta.

**Phase 3 — Public (Weeks 9–12)**
- Monte Carlo integration.
- Full decision log UI with retrospective cards.
- Decision Theater as featured headyme.com launch.
- Success metrics review.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| Session decision completion rate | HeadyMetrics | 30 days | 70% | 85% |
| Post-session confidence | In-app rating | 30 days | 4.3 / 5 | 4.7 / 5 |
| Users with ≥3 sessions | HeadyMetrics | 90 days | 20% of MAU | 35% |
| 30-day outcome quality rating | Survey | 120 days | 4.0 / 5 | 4.5 / 5 |
| MAU lift (Decision Theater driven) | HeadyMetrics | 90 days | +10% | +20% |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Should Decision Theater offer a "blind" mode where the user commits to a decision before seeing the AI analysis, to reduce anchoring bias? | Product | No |
| OQ2 | How should we handle decisions that loop back — user returns weeks later with new information and wants to re-evaluate? | Product | No |
| OQ3 | Should pre-mortem failure modes be seeded with domain-specific patterns (e.g., startup failure modes vs. career-change failure modes)? | Engineering | No |
| OQ4 | Is heady-montecarlo's API ready for external service calls in Phase 3? What is the current state of the API contract? | Engineering/heady-montecarlo | No |
