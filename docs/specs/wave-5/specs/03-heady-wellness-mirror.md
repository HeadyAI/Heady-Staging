# Heady Wellness Mirror — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headybuddy.org + headyme.com (Wellness panel)  
**Heady Domain Anchor:** headybuddy-core, headyme-core  

---

## 1. Problem Statement

Mental wellness, physical energy, and cognitive performance are deeply interconnected, yet most people manage them in silos: a fitness app here, a meditation app there, a sleep tracker somewhere else. No persistent AI companion currently integrates across these streams to surface patterns, reflect them back to the user without judgment, and coach gentle behavioral adjustments over weeks and months. HeadyBuddy already holds ongoing conversational context; extending it into a Wellness Mirror creates a high-retention, high-value surface that serves HeadyConnection's nonprofit mission of broad benefit.

**Cost of not solving it:** HeadyBuddy remains a chat companion rather than a life-improving presence; the wellness category remains owned by competitors with no ecosystem intelligence.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Surface actionable wellness insights from self-reported and integrated data | User-reported insight utility rating | ≥ 4.2 / 5 |
| G2 | Drive daily engagement through lightweight check-ins | Check-in completion rate | ≥ 60% of opted-in users |
| G3 | Demonstrate measurable self-reported wellness improvement over 30 days | User self-assessment delta (validated scale) | ≥ 15% improvement |
| G4 | Position HeadyBuddy as a trusted wellness presence | 30-day retention for wellness users | ≥ 65% |
| G5 | Maintain strict user trust on sensitive health data | Data-handling complaints / incidents | Zero |

---

## 3. Non-Goals

- **Not a medical device.** Wellness Mirror does not diagnose, treat, or provide clinical guidance. All outputs carry a wellness-not-medical disclaimer.
- **Not a crisis intervention service.** If crisis signals are detected, Wellness Mirror redirects to professional resources (988, Crisis Text Line) and does not attempt to handle the session.
- **Not a calorie/macro tracker.** Nutrition logging is out of scope for V1.
- **Not a wearable OS.** Heady does not build hardware; wearable data is accepted via API integrations, not a custom device.
- **Not a therapy replacement.** Heady is explicitly a wellness mirror and coaching companion, not a licensed mental health provider.

---

## 4. User Stories

**Individual user**
- As a user who wants to build better sleep habits, I want Heady to track my self-reported sleep quality over time and reflect patterns back to me so that I can see what is actually affecting my rest.
- As a user feeling stressed, I want HeadyBuddy to gently check in, offer a breathing exercise, and note the event in my wellness log without me having to navigate to a separate app.
- As a user returning after a week away, I want Wellness Mirror to summarize how my energy, mood, and sleep trends looked during that period.
- As a user integrating a fitness tracker, I want my step count and HRV data to surface automatically in my mirror view so I do not have to enter it manually.

**Nonprofit / community admin (headyconnection.org)**
- As a community program coordinator, I want anonymized aggregate wellness trend data for our user cohort so that I can report outcomes to grant funders without accessing individual records.

---

## 5. Requirements

### P0 — Must Have
- **Daily check-in flow:** 2–3 question conversational check-in via HeadyBuddy covering mood, energy, and sleep quality (Likert scale). Completable in under 60 seconds.
- **Wellness log storage:** Check-in responses stored as time-series in user's pgvector profile with timestamps and optional free-text notes.
- **Pattern reflection:** Weekly auto-generated "mirror summary" surfaced in HeadyBuddy and the Wellness panel on headyme.com. Identifies high/low trends and correlations (e.g., "Your energy scores were lowest on days following less than 6 hours of sleep").
- **Crisis detection and redirect:** If check-in response or free-text contains crisis signals (keyword + context classifier), Wellness Mirror pauses, expresses care, and presents professional resource links. No autonomous escalation; user directs next action.
- **Privacy-first storage:** Wellness data stored in isolated, encrypted namespace. Not used for model training. Not shared with any third party.
- **MCP tool hook:** `heady_wellness_log_checkin`, `heady_wellness_get_trends`, `heady_wellness_get_summary` on headymcp.com.

### P1 — Should Have
- **Wearable integration:** Accept Apple HealthKit export (manual JSON upload in V1; HealthKit live stream in V2), Oura Ring API, and Fitbit API. Map to standard Wellness Mirror fields.
- **Coaching nudges:** Based on trend data, HeadyBuddy proactively suggests micro-interventions (box breathing, 10-min walk, hydration reminder). User can accept, dismiss, or snooze.
- **Custom wellness dimensions:** User can add up to 3 custom dimensions (e.g., "pain level", "creative energy") beyond the default mood/energy/sleep triad.
- **Anonymized cohort reporting:** Aggregate export (no individual PII) for org admins on headyconnection.org.

### P2 — Future
- **Longitudinal insight engine** comparing user data against anonymized cohort baselines.
- **HeadyLife OS Canvas integration** — Wellness Mirror feeds the Life OS as an active domain.
- **Voice check-in** via HeadyBuddy audio interface.

---

## 6. User Experience

**Entry point:** HeadyBuddy morning nudge ("Good morning — ready for your 30-second check-in?"), or headyme.com Wellness panel.

**Check-in flow:**
1. HeadyBuddy asks 3 questions conversationally (mood: 1–5, energy: 1–5, sleep hours: numeric).
2. Optional: "Anything on your mind?" free-text.
3. Submission confirmed with a brief encouraging response from HeadyBuddy.
4. Weekly: Mirror summary surfaces as a card in chat and the Wellness panel.

**Wellness panel (headyme.com):**
- Time-series charts for each dimension.
- Correlation card (top 2 detected correlations this week).
- Coaching nudge queue (accepted/dismissed history).
- Data export and deletion controls.

---

## 7. Architecture

```
headybuddy.org / headyme.com Wellness panel
    │
    ▼
Wellness Mirror Service (new microservice, Cloud Run)
    ├─ Check-in Flow Engine (intent: "wellness-checkin")
    ├─ Time-Series Store Writer (pgvector wellness_log table)
    ├─ Pattern Analyzer (scheduled, runs nightly)
    │   ├─ Trend detector (sliding window z-score)
    │   └─ Correlation engine (Pearson on paired dimensions)
    ├─ Mirror Summary Generator (heady-ai.com LLM call)
    ├─ Crisis Signal Classifier (lightweight local model + keyword layer)
    ├─ Wearable Adapter (HealthKit JSON parser, Oura API, Fitbit API)
    └─ MCP Tool Adapter (3 tools on headymcp-core)
```

**Data model:**
- `wellness_log`: user_id, timestamp, dimension, value (float), source (checkin|wearable), notes (text, nullable)
- `wellness_summary`: user_id, period_start, period_end, summary_json, generated_at

---

## 8. Data Flows

```
Check-in (daily)
    → HeadyBuddy intent: "wellness-checkin"
    → Check-in Flow Engine
    → 3 questions rendered conversationally
    → Responses validated + written to wellness_log (pgvector)
    → HeadyBuddy closing response generated

Pattern Analyzer (nightly cron)
    → Read wellness_log for all active users, past 7 days
    → Trend detection per dimension per user
    → Correlation detection across dimension pairs
    → Mirror Summary Generator: heady-ai.com LLM call
    → Write to wellness_summary table
    → Push notification trigger (in-app + optional push)

Wearable sync (on-demand or daily)
    → Wearable Adapter fetches/parses data
    → Normalized to wellness_log schema
    → Written to wellness_log (source: wearable)
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Health data sensitivity | Wellness data in isolated encrypted namespace, not co-mingled with general assistant memory |
| Crisis signal handling | Classifier is local/deterministic; no crisis content sent to external LLM providers without user consent |
| Wearable API tokens | OAuth tokens stored in Heady secrets manager (not pgvector); rotated on schedule |
| Aggregate reporting | Cohort exports enforce k-anonymity (minimum group size 20 before any dimension is surfaced) |
| HIPAA positioning | Wellness Mirror positioned as wellness tool, not covered entity; terms of service explicitly exclude medical/clinical use |
| Right to erasure | Full deletion of wellness_log and wellness_summary for a user completes within 24 hours of request |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| headybuddy-core intent classification ("wellness-checkin") | HeadyBuddy team | Yes — P0 |
| pgvector `wellness_log` + `wellness_summary` schema | HeadyMe engineering | Yes — P0 |
| heady-ai.com LLM router (summary generation) | HeadyAI | Yes — P0 |
| Crisis resource content (988, Crisis Text Line URLs) | Content/Legal | Yes — P0 |
| headymcp-core tool registration | HeadyMCP team | Yes (MCP tools) |
| Oura Ring API credentials | External (Oura) | No — P1 |
| Fitbit API credentials | External (Fitbit) | No — P1 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- Daily check-in (3 dimensions), log storage, basic weekly summary.
- Crisis redirect live on day 1.
- Internal HeadySystems team dogfood.

**Phase 2 — Beta (Weeks 5–8)**
- Pattern analyzer and correlation cards.
- Wellness panel on headyme.com.
- MCP tools live.
- Opt-in beta via headyconnection.org community.

**Phase 3 — Public (Weeks 9–12)**
- Wearable integrations (HealthKit JSON + Oura).
- Custom dimensions.
- Anonymized cohort reporting for org admins.
- Coaching nudges from HeadyBuddy.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| Check-in completion rate | HeadyMetrics | 30 days | 60% of opted-in users | 75% |
| Insight utility rating | In-app rating | 60 days | 4.2 / 5 | 4.6 / 5 |
| 30-day wellness improvement | Self-assessment delta | 60 days | 15% | 25% |
| 30-day retention (wellness users) | HeadyMetrics | 60 days | 65% | 78% |
| Data incidents | Incident log | Ongoing | 0 | 0 |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Should we use a validated psychometric scale (PHQ-2, GAD-2) for check-in questions, or build a proprietary one? | Research/Legal | No |
| OQ2 | What is the right trigger threshold for crisis signal detection to minimize false positives without missing true signals? | Research | No |
| OQ3 | Can aggregate wellness data be used in HeadyConnection grant reports under HIPAA and state privacy laws? | Legal | No |
| OQ4 | Should wearable data sync happen in real time or nightly batch? What are the cost tradeoffs? | Engineering | No |
