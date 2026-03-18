# Spec 03 — Heady Donor Resonance Engine

**Wave:** Third Wave  
**Domain:** headyconnection.org / HeadyConnection nonprofit  
**Primary Repos:** headyconnection-core, heady-production, latent-core-dev, headymcp-core, headybuddy-core  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Donor Resonance Engine is an AI-powered donor intelligence and engagement system that transforms HeadyConnection's donor relationships from transactional to resonant. It maintains a living semantic profile for each donor — their interests, giving history, communication preferences, and values alignment — and uses this to generate highly personalized cultivation messages, thank-you letters, impact updates, and stewardship sequences. The "resonance" metaphor reflects the goal: communications that genuinely match what a donor cares about, not generic mass emails.

**Why it matters:** Nonprofit donor retention rates average 40–50%. The leading cause of lapse is donors feeling their gift didn't matter. Resonance Engine closes that loop by ensuring every donor receives communications that feel personally relevant, grounded in real impact data from the Heady Impact Ledger.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | Increase donor retention rate by 15 percentage points year-over-year | Donor retention rate tracked in Donor Registry |
| G2 | Achieve average email open rate ≥ 40% for AI-personalized communications | Open rate measured via email send platform |
| G3 | Generate a personalized impact update for every donor within 7 days of each gift | Days-to-update metric per gift |
| G4 | Reduce donor communication prep time by 65% | Staff hours tracked against baseline |
| G5 | Maintain 100% opt-out compliance with no communications after unsubscribe | Zero opt-out violations |

---

## 3. Non-Goals

- **Payment processing or donation intake** — Handled by existing donation platform (e.g., Stripe, Every.org). Resonance Engine reads gift data; it does not process payments.
- **Major gift solicitation strategy** — The Engine supports the relationship; major gift strategy decisions remain with human development staff.
- **Grant relationship management** — Grant funder relationships are handled by Grant Constellation.
- **Board member communications** — Board communications are a distinct workflow.

---

## 4. User Stories

**As a development director,** I want to open a donor profile and see their complete giving history, interests, resonance score, and a suggested next communication — so that every touchpoint is informed.

**As a program director,** I want new impact stories and outcomes from the Impact Ledger to automatically flow into donor update templates so that I don't have to manually curate content for donor emails.

**As a development staff member,** I want to trigger a personalized thank-you letter for any gift and receive a draft within 60 seconds, pre-populated with the donor's name, giving history, and a relevant impact story matched to their interests.

**As a donor,** I want to receive communications that feel like they understand why I give — not generic blast emails — so that I feel valued and continue to give.

**As a compliance officer,** I want every outbound communication to be logged with the donor ID, template used, AI generation parameters, human reviewer, and send timestamp so that we maintain full compliance records.

---

## 5. Requirements

### P0 — Must Have

- **Donor Registry:** Structured profile store for each donor: name, contact info, gift history, interest tags, communication preferences, opt-out status, resonance score, and last communication date.
- **Resonance Profile Engine:** On each gift or interaction, AI updates the donor's interest vector (latent-core-dev) by analyzing giving history, notes, and any shared content preferences. Resonance score reflects alignment between donor values and HeadyConnection's current programs.
- **Impact Story Library:** Pull from Heady Impact Ledger (Spec 02) — a curated set of program outcomes with narrative summaries, keyed by program area. Refreshes automatically as new outcomes are recorded.
- **Personalized Communication Generator:** headymcp-core tool `generate_donor_message(donor_id, message_type)` — message types: thank_you, impact_update, cultivation, annual_report, re-engagement. Returns a personalized draft.
- **Human Review + Send Queue:** All generated messages go into a review queue before sending. Staff approve, edit, and authorize sends. Batch review UX for high-volume campaigns.
- **Opt-Out Enforcement:** Resonance Engine checks opt-out status before generating any message. Any donor with opt_out=true is permanently excluded from all generated communications.
- **Communication Log:** Append-only log of every sent communication: donor ID, message type, generation timestamp, reviewer identity, send timestamp, open/click status (from email platform webhook).

### P1 — Should Have

- **Resonance Map:** Visual representation of donor base — clusters by interest area, giving level, and retention risk score. Useful for board presentations and campaign planning.
- **Re-engagement Sequences:** Automated identification of lapsed donors (no gift in 12 months) with a 3-touch re-engagement sequence — each message references a specific impact relevant to their history.
- **Campaign Builder:** Create a targeted campaign (e.g., "year-end giving push for technology donors") by selecting a donor segment and a message template; Resonance Engine generates personalized versions for each donor in the segment.
- **Email Platform Integration:** Send via Mailchimp or SendGrid API directly from the review queue after human approval. Track open/click events back to Communication Log.

### P2 — Future

- **Voice/audio donor thank-you messages** generated via HeadyBuddy voice stack.
- **Predictive giving model** — estimate likelihood of next gift based on engagement signals.
- **Donor self-service portal** where donors can update interests and view their personal impact story.

---

## 6. User Experience

1. **Entry point:** Donor Resonance section of headyconnection.org admin (`/donors`).
2. **Donor list:** Searchable table with columns: Name, Total Given, Last Gift, Resonance Score, Last Contacted, Retention Risk flag.
3. **Donor profile page:** 
   - Header: name, photo (if uploaded), total lifetime giving, resonance score badge.
   - Tabs: Overview | Giving History | Communications | Notes | Settings.
   - Overview shows: interest tags, resonance explanation ("This donor gives primarily to technology education programs with a secondary interest in community events"), next suggested action.
4. **Quick-generate message:** "Draft Message" button on any donor profile. Select message type → draft appears in side panel within ~10 seconds. Edit inline → approve → routes to send queue.
5. **Resonance Map:** Interactive bubble chart — each bubble is a donor segment, sized by total giving volume, positioned by primary interest. Click to drill into the segment's donor list.
6. **Campaign Builder:** Select segment → select message type → preview personalized samples for 3 donors in the segment → approve batch → routes to send queue.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│          headyconnection.org UI (/donors)            │
│          (template-heady-ui micro-frontend)          │
└──────────────────┬──────────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────────┐
│            headyconnection-core API                  │
│  Donor Registry service                             │
│  Communication queue service                        │
│  Resonance profile service                          │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
┌──────────▼──────────┐  ┌────────▼────────────────┐
│  heady-production   │  │  headymcp-core           │
│  donor_profiles     │  │  generate_donor_message  │
│  gift_history       │  │  tool                    │
│  comm_log           │  └────────────┬─────────────┘
│  impact_story_cache │               │
└──────────┬──────────┘               │ LLM call
           │                  ┌───────▼──────────────┐
┌──────────▼──────────┐       │  LLM Provider        │
│  latent-core-dev    │       │  (with PII-stripped   │
│  Donor interest     │       │  prompt context)      │
│  vectors            │       └──────────────────────┘
│  Impact story index │
└──────────┬──────────┘
           │
┌──────────▼──────────┐  ┌──────────────────────────┐
│  Impact Ledger API  │  │  Email Platform           │
│  (Spec 02 — impact  │  │  (Mailchimp / SendGrid)   │
│  story feed)        │  │  Webhook back to comm_log │
└─────────────────────┘  └──────────────────────────┘
```

---

## 8. Data Flows

**Donor profile update (post-gift):**
```
Gift recorded in donation platform
  → Webhook to headyconnection-core
  → Append to gift_history
  → Trigger resonance_profile_refresh(donor_id)
  → Re-embed donor interest vector via latent-core-dev
  → Update resonance_score
  → Add to "generate thank-you" queue
```

**Personalized message generation:**
```
Staff triggers generate_donor_message(donor_id, "thank_you")
  → Fetch donor profile + gift context
  → Fetch top-3 impact stories matching donor interest vector
  → Compose prompt (PII anonymized in LLM call — use "the donor" not name in model context)
  → LLM returns draft with placeholder tokens
  → headyconnection-core substitutes real name/amount
  → Draft stored in comm_queue with status = "Pending Review"
```

**Review and send:**
```
Staff opens comm_queue
  → Reviews / edits draft
  → Approves → send_communication(comm_id)
  → Email platform API call (with from_address = HeadyConnection)
  → Delivery event logged to comm_log
  → Open/click webhooks update comm_log in real time
```

---

## 9. Security & Privacy

- All donor PII (name, email, phone, giving history) stored in heady-production with row-level security restricted to HeadyConnection principals.
- LLM calls use anonymized prompts — donor identity never passed to external model providers.
- Opt-out enforcement is a hard gate in the communication queue service, not a UI preference. A donor with opt_out=true cannot receive any generated message regardless of campaign configuration.
- CAN-SPAM and GDPR compliance: unsubscribe link required in every outbound email; unsubscribe events processed within 10 minutes.
- Resonance profiles (interest vectors) are used only for internal personalization; they are never sold, shared, or exposed via public API.
- Communication Log is readable by development and compliance roles only; not accessible to program staff.

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| headyconnection-core — donor registry + auth | Internal | Extend with donor service |
| heady-production — Postgres (new tables) | Internal | Migration required |
| latent-core-dev — donor interest vectors | Internal | Extend with donor corpus |
| headymcp-core — `generate_donor_message` tool | Internal | New tool |
| Heady Impact Ledger API (Spec 02) | Internal | Spec 02 Phase 2+ |
| Email platform (Mailchimp or SendGrid) | External | Select + procurement |
| Donation platform webhook (Every.org, Stripe) | External | Configure inbound webhook |

---

## 11. Phased Rollout

### Phase 1 — Donor Registry (Weeks 1–4)
- Build donor_profiles and gift_history schema
- Manual donor import (CSV)
- Basic resonance score from interest tags
- Thank-you letter generator (manual trigger)

### Phase 2 — Personalization Engine (Weeks 5–8)
- Donation platform webhook integration
- latent-core-dev interest vector pipeline
- Impact story library pull from Ledger API
- Communication log and opt-out enforcement

### Phase 3 — Campaign + Scale (Weeks 9–12)
- Email platform integration (Mailchimp/SendGrid)
- Campaign Builder UI
- Resonance Map visualization
- Re-engagement sequence automation
- Open/click feedback loop to Communication Log

---

## 12. Success Metrics

| Metric | Baseline | 90-Day Target |
|--------|---------|---------------|
| Donor retention rate | ~40–50% (sector avg) | +15 pts |
| Email open rate (AI-personalized) | Unknown (no current personalization) | ≥ 40% |
| Days-to-thank-you post-gift | 3–7 days (manual) | ≤ 1 day |
| Donor comm prep hours/quarter | ~20 hrs | ≤ 7 hrs |
| Opt-out violations | 0 | 0 |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| Which donation intake platform does HeadyConnection currently use? | Eric | Yes — determines webhook path |
| Which email platform is preferred? | Eric | Yes — determines send integration |
| Should resonance scores be visible to all development staff or only the director? | Eric | No — configurable in Phase 1 |
| Is there existing donor data to import, and in what format? | Eric | Yes — affects Phase 1 migration scope |
