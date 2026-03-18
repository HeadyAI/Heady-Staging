# Spec-06: Heady Monetization Matrix

**Wave:** Fourth  
**Feature Name:** Heady Monetization Matrix  
**Skill Counterpart:** `heady-monetization-matrix`  
**Surface Anchors:** headyme.com (command center), headyapi.com (API Agora), headyio.com (developer platform), headybuddy.org (companion)  
**Repo Anchors:** `HeadyMe/heady-production`, `HeadyMe/headyapi-core`, `HeadyMe/headyio-core`, `HeadyMe/headyme-core`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady Monetization Matrix is the revenue infrastructure layer of the Heady ecosystem. It manages subscription plans, usage-based billing, credit top-ups, invoicing, payment processing, and revenue routing across all Heady commercial surfaces. Rather than letting each product surface (headybuddy.org, headyapi.com, headyio.com) build its own checkout and billing flow, the Matrix provides a single billing engine that any Heady service can hook into, producing consistent pricing, invoicing, and revenue visibility across the platform.

**Problem Statement:**  
Heady has no production billing infrastructure. There is no way to charge for API access, companion subscriptions, or usage beyond manual invoicing. As capabilities like Voice Vessel, Avatar Forge, and API Agora go live, they need a metered billing engine that deducts usage, triggers payments, issues receipts, and feeds revenue data to the Treasury Nexus and to operator dashboards. Without this, monetization requires manual intervention for every customer transaction.

---

## 2. Goals

1. Support three billing models — subscription (flat recurring), usage-based (per-credit or per-call), and hybrid (base subscription + overage) — all enforced automatically.
2. Integrate with Stripe (primary) as the payment processor with PCI-compliant card data handling fully offloaded to Stripe.
3. Produce itemized invoices (PDF and JSON) for every billing cycle, accessible to customers and operators.
4. Feed every successful payment as a credit issuance event to Heady Treasury Nexus, closing the loop between payment and platform access.
5. Enable operators to configure pricing plans via a headyme.com admin interface without code changes.

### Non-Goals (v1)

- Cryptocurrency or stablecoin payment acceptance (Phase 3 via Treasury Nexus on-chain).
- Multi-currency billing beyond USD (Phase 2).
- Enterprise custom contracts, POs, or net-30 invoicing (Phase 2 — handled offline with manual credit issuance).
- Tax computation and jurisdiction-specific tax filing (Phase 2; v1 passes tax calculation to Stripe Tax).
- Affiliate or referral revenue tracking (Phase 2).

---

## 3. User Stories

### Developer / Subscriber

- **As a headyapi.com developer**, I want to upgrade from Free to Developer plan with a credit card in under 2 minutes so I can immediately access higher API quotas.
- **As a subscriber**, I want to receive an itemized invoice by email at the end of each billing cycle so I can reconcile my usage with my finance team.
- **As a user**, I want to top up my Heady credit balance in set amounts ($10, $25, $50, $100) at any time so I can pre-pay for usage without a recurring subscription.
- **As a user**, I want to set a monthly spending cap so I am never charged more than my budgeted amount without explicit approval.

### Operator

- **As a platform operator**, I want to create and edit pricing plans (name, price, included credits, overage rate) in a headyme.com admin UI so I can iterate on pricing without code deploys.
- **As an operator**, I want to see a revenue dashboard: MRR, ARR, new subscriptions, churn, and usage-based overage revenue — all updated in near real time.
- **As an operator**, I want to issue a courtesy credit to a specific account (e.g., after a service incident) without triggering a payment flow.

### HeadyConnection Nonprofit

- **As a HeadyConnection administrator**, I want donors to be able to make one-time and recurring donations through a headyconnection.org giving page backed by the same billing infrastructure, with receipts for tax purposes.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| MM-01 | Subscription Checkout: hosted checkout page for plan upgrade (Stripe Checkout); on success, plan activated immediately. | Given valid card + plan selection, when payment succeeds, then plan activates within 10s. |
| MM-02 | Subscription Management: upgrade, downgrade, cancel from headyme.com/portal/billing; changes take effect at period end for downgrades. | Given cancel request, then subscription cancels at period end with confirmation email. |
| MM-03 | Usage-Based Billing: end-of-cycle invoice includes itemized usage charges from Treasury Nexus ledger events. | Given 500 API calls × $0.001, then invoice line shows $0.50 correctly. |
| MM-04 | Credit Top-Up: `POST /billing/topup {amount_usd, payment_method}` issues credits to Treasury Nexus on payment success. | Given $25 top-up, then Treasury Nexus receives CREDIT event for equivalent credit amount. |
| MM-05 | Invoicing: PDF and JSON invoices generated and stored per billing cycle; accessible via `/billing/invoices`. | Given billing cycle close, then PDF invoice generated and emailed within 5 minutes. |
| MM-06 | Spending Cap: users can set monthly cap; when cap is reached, usage is throttled (not charged) until next cycle or manual increase. | Given cap = $50, when $50 charged, then subsequent usage returns 402 SPENDING_CAP_REACHED. |
| MM-07 | Revenue Dashboard: headyme.com operator view with MRR, active subscribers, churn rate, and overage revenue. | Given dashboard load, then metrics current within 1-hour lag. |
| MM-08 | Courtesy Credit Issuance: operator can POST /billing/credit {account_id, amount, reason} to issue credits without payment. | Given operator call, then credit appears in account balance and is labeled "Courtesy credit - {reason}." |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| MM-09 | Stripe Tax integration: tax calculated and shown at checkout; tax IDs accepted for B2B buyers. |
| MM-10 | Dunning management: failed payment retried 3× (day 1, 3, 7); email notification at each attempt; subscription suspended on final failure. |
| MM-11 | Donation flow for headyconnection.org: one-time and recurring donations with donation receipt email. |
| MM-12 | Plan change prorations: mid-cycle upgrades prorated and reflected on next invoice. |
| MM-13 | Billing portal: Stripe Customer Portal embedded in developer portal for self-service card updates and invoice history. |

### P2 — Future

| ID | Requirement |
|----|-------------|
| MM-14 | Multi-currency billing (Phase 2). |
| MM-15 | Crypto payment acceptance (Phase 3). |
| MM-16 | Enterprise net-30 invoicing and PO-based accounts (Phase 2). |

---

## 5. User Experience

**Upgrade Flow (headyapi.com or headyme.com)**

1. User clicks "Upgrade to Developer" on plan comparison page.
2. Redirected to Stripe Checkout with pre-filled plan details.
3. Enters card → payment confirmed → redirect back to portal.
4. Success page: "You're on Developer plan. Your API quotas have been increased." Treasury Nexus shows new credit balance.
5. Confirmation email sent with invoice.

**Billing Dashboard (developer portal)**

- Current plan card: plan name, renewal date, price, included credits, used credits, overage.
- Top-up widget: amount buttons ($10 / $25 / $50 / $100) + custom amount + "Add Credits" button.
- Spending cap widget: current cap, % consumed, "Edit Cap" link.
- Invoice history: table with date, amount, status (Paid/Pending), PDF download.

**Operator Revenue Dashboard (headyme.com /admin/billing)**

- MRR sparkline, subscriber count, churn rate (last 30 days).
- Plan distribution pie chart.
- Top accounts by spend table.
- "Issue Courtesy Credit" action panel.

---

## 6. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│   Clients: headyme.com | headyapi.com | headyconnection.org     │
└────────────────────────┬─────────────────────────────────────────┘
                         │ REST
┌────────────────────────▼─────────────────────────────────────────┐
│           Monetization Matrix Service (Cloud Run)               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Subscription   │  │  Usage Invoicing  │  │  Revenue      │  │
│  │  Engine         │  │  (cycle close)   │  │  Analytics    │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                    │                     │           │
│  ┌────────▼────────────────────▼─────────────────────▼───────┐  │
│  │             Billing Store (PostgreSQL)                    │  │
│  │   subscriptions | plans | invoices | credits | payments   │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────────────────────┬──┘
             │                                                   │
┌────────────▼─────────────┐              ┌──────────────────────▼─┐
│   Stripe (Payment)       │              │   Treasury Nexus       │
│   Checkout | Webhooks    │              │   (credit issuance on  │
│   Tax | Portal           │              │    payment success)     │
└──────────────────────────┘              └────────────────────────┘
```

**Tech Stack:**
- Runtime: Cloud Run (Node.js / TypeScript)
- Payment processor: Stripe (Checkout, Billing, Tax, Customer Portal, Webhooks)
- Billing store: PostgreSQL
- Usage data source: Treasury Nexus ledger (queried at cycle close)
- Invoice generation: Pdfmake or WeasyPrint via Cloud Run sidecar
- Identity: Identity Loom JWT
- Event bus: Pub/Sub for `PAYMENT_SUCCESS`, `SUBSCRIPTION_CHANGED`, `INVOICE_GENERATED` events

---

## 7. Data Flows

### Subscription Upgrade Flow

```
User: clicks "Upgrade to Developer" in portal
  → Monetization Matrix: POST /billing/checkout {plan_id: "developer_monthly"}
  → Stripe: create Checkout Session with plan price_id
  → Redirect user to Stripe Checkout
  → User completes payment
  → Stripe: POST /billing/webhook {type: "checkout.session.completed"}
  → Monetization Matrix: activate subscription, update plan record
  → Identity Loom: update user's plan scope claim
  → headyapi-core: refresh rate limit quotas for account
  → Treasury Nexus: issue included monthly credits to account
  → Send confirmation email with invoice PDF
```

### Usage Billing Cycle Close Flow

```
Cron: cycle close trigger (monthly or configurable interval)
  → Monetization Matrix: initiate cycle close for all subscriptions
  → Query Treasury Nexus ledger: usage events since cycle start
  → Calculate overage (usage beyond plan credits × overage rate)
  → Create invoice record with line items
  → If overage > 0: charge Stripe stored payment method
  → On payment success: issue any included credits for new cycle
  → Generate PDF invoice → store → email to customer
  → Publish INVOICE_GENERATED event to Pub/Sub
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| PCI compliance | Card data never touches Heady systems; all handled by Stripe Checkout and Customer Portal |
| Webhook signature | All Stripe webhooks verified with Stripe-Signature header using webhook secret |
| Spending cap enforcement | Cap checked by headyapi-core at request time (not post-hoc); 402 returned before charge |
| Invoice access | Invoices accessible only to account owner (Identity Loom scope `billing:read`) and operators (`billing:admin`) |
| Courtesy credit audit | All courtesy credit issuances logged with operator ID, reason, and timestamp; visible in operator audit log |
| Refund policy | Refunds processed through Stripe only by operators with `billing:refund` scope |
| Encryption at rest | Billing store encrypted with AES-256 |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| Heady Treasury Nexus (Spec-01) | Credit issuance on payment, usage data source | Phase 1 |
| Heady Identity Loom (Spec-02) | Account identity, plan scope updates | Phase 1 |
| headyapi-core | Plan quota enforcement at gateway | Phase 1 |
| Heady API Agora (Spec-05) | Consumer of billing for plan management UI | Phase 1 |
| Stripe | Payment processing, invoicing, tax | Phase 1 |
| PostgreSQL | Billing data persistence | Phase 1 |
| headyconnection-core | Donation flow integration | Phase 2 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| Checkout-to-activation time | < 10s after Stripe webhook | 30 days post-launch |
| Invoice delivery success rate | > 99.9% | 30 days |
| Failed payment recovery (dunning) | > 40% recovered within 7-day retry window | 60 days |
| Monthly Revenue Recognized (MRR) | $10K by 90 days post-launch | 90 days |
| Spending cap breach rate | < 1% of accounts exceed cap | 60 days |
| Operator dashboard data freshness | Usage data < 1-hour lag | 30 days |

---

## 11. Phased Rollout

### Phase 1 — Core Billing (Weeks 1–5)
- Stripe integration (Checkout, Webhooks, Customer Portal)
- Subscription engine (Free, Developer, Pro plans)
- Credit top-up flow
- Spending cap enforcement
- Invoice generation + email delivery
- Revenue dashboard in headyme.com
- Treasury Nexus credit issuance on payment

### Phase 2 — Advanced Billing (Weeks 6–10)
- Stripe Tax integration
- Dunning management
- Plan change prorations
- Donation flow for HeadyConnection
- Multi-currency support

### Phase 3 — Crypto + Enterprise (Post-v1)
- Cryptocurrency payment acceptance
- Enterprise net-30 invoicing
- Affiliate/referral tracking

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| What is the credit-to-USD exchange rate that converts Stripe payments to Treasury Nexus credits? | Finance / Eric | Yes — Phase 1 design |
| What are the exact plan prices for Developer and Pro tiers? | Eric / Product | Yes |
| Should billing be a separate legal entity from HeadySystems Inc. for each Heady domain, or one Stripe account for all? | Legal | Yes — before payment goes live |
| Is there a free trial period for Developer or Pro plans? | Product | No |
