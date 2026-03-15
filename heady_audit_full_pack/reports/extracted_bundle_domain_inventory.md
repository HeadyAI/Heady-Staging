# Extracted Bundle — Domain & Site Inventory

**Audit date:** 2026-03-10
**Bundles analyzed:**
- `heady-perplexity-full-system-context` (Perplexity bundle)
- `heady-system-build-current-state` (System-build bundle)
- `heady-full-rebuild-context` (Full-rebuild bundle)

---

## 1. Perplexity Bundle — Site Registry

**Source:** `heady-perplexity-bundle/01-site-registry.json`

9 preconfigured sites with full UI definitions (features, stats, nav links, footer).

| Domain | Role | Vertical | Tagline |
|---|---|---|---|
| headyme.com | personal-cloud | consumer | Your AI Operating System |
| headysystems.com | infrastructure | enterprise | Enterprise AI Orchestration |
| heady-ai.com | research | research | The Science Behind HeadyOS |
| headyos.com | operating-system | developer | The AI Operating System for Developers |
| headyconnection.org | community | nonprofit | AI for Everyone — Non-Profit AI Access |
| headyconnection.com | community-portal | community | The Heady Community Portal |
| headyex.com | marketplace | fintech | AI Agent Marketplace & Token Platform |
| headyfinance.com | investor-relations | finance | Invest in the Future of AI |
| admin.headysystems.com | admin | internal | Internal Operations Dashboard |

**Domain aliases** (`heady-perplexity-bundle/17-domain-aliases.json`): Maps `www.*` variants to canonical domains. Also maps `manager.headysystems.com` → `admin.headysystems.com`.

---

## 2. System-Build Bundle — Built Sites

**Source:** `heady-system-build/apps/sites/` (10 site directories)

Each site contains at minimum `index.html`, `robots.txt`, `sitemap.xml`, and a `shared/` directory with common assets.

| Site Directory | Maps To Domain |
|---|---|
| `headyme/` | headyme.com |
| `headysystems/` | headysystems.com |
| `heady-ai/` | heady-ai.com |
| `headyos/` | headyos.com (implied) |
| `headyconnection-org/` | headyconnection.org |
| `headyconnection-com/` | headyconnection.com |
| `headyex/` | headyex.com |
| `headyfinance/` | headyfinance.com |
| `admin-headysystems/` | admin.headysystems.com |
| `auth-headysystems/` | auth.headysystems.com |

**Note:** `auth-headysystems` (auth.headysystems.com) has a built site directory but is not listed in the Perplexity site-registry. It includes `relay.html`, suggesting it serves as an OAuth/OIDC relay endpoint.

---

## 3. Full-Rebuild Bundle — Domain Registry

**Source:** `heady-full-rebuild/configs/domains.yaml` (v3.2.3)

9 domains with full infrastructure specifications (platform, SSL, CORS, routing rules, circuit breakers, health endpoints).

| Domain | Role | Platform | Environment |
|---|---|---|---|
| headyme.com | Command Center | Cloudflare Pages + Workers | production |
| headysystems.com | Core Architecture Engine | Cloud Run (us-central1) | production |
| headyconnection.org | Nonprofit & Community | Cloudflare Pages + Workers | production |
| headybuddy.org | AI Companion Experience | Cloud Run + CF Workers | production |
| headymcp.com | MCP Layer | Cloud Run (us-central1) | production |
| headyio.com | Developer Platform | Cloud Run (us-central1) | production |
| headybot.com | Automation & Agents | Cloud Run (us-central1) | production |
| headyapi.com | Public Intelligence Interface | Cloud Run (us-central1) | production |
| headyai.com | Intelligence Routing Hub | Cloudflare Workers (pure edge) | production |

### Full-Rebuild Registry Domains

**Source:** `heady-full-rebuild/configs/heady-registry.json`

A separate set of 9 domains focused on service endpoints.

| Domain | Role | Subdomains |
|---|---|---|
| headysystems.com | primary | manager, api, conductor, web |
| headymcp.com | mcp | mcp |
| headybuddy.org | companion | buddy |
| headyconnection.org | community | root |
| headybee.co | agents | root |
| headylens.ai | ar_overlay | root |
| headyarena.io | evaluation | root |
| headyvinci.com | pattern_engine | root |
| headysoul.ai | intelligence | root |

---

## 4. System-Build SERVICE_INDEX — Service-to-Domain Mapping

**Source:** `heady-system-build/services/SERVICE_INDEX.json`

Unique domains referenced as service targets:

| Domain | Services Mapped |
|---|---|
| headysystems.com | 27 services (manager, brain, orchestration, router, auth, vector-memory, embeddings, inference-gateway, model-router, battle, council, mc, circuit-breaker, saga, bulkhead, event-store, cqrs, self-healing, auto-tuner, pool-router, pipeline-core, csl-judge, auto-success, hallucination-watchdog, evolution-engine, budget-tracker, receipt-signer, observability, telemetry, cf-worker, snapshot, cache) |
| headybee.co | 3 services (hive, bee-factory, swarm-coordinator, seventeen-swarm) |
| headymcp.com | 1 service (mcp) |
| headyapi.com | 1 service (gateway) |
| headyme.com | 4 services (soul, persona-router, trader, ableton) |
| headybuddy.com | 1 service (buddy) |
| heady.io | 3 services (coder, researcher, federation, sandbox) |
| headyconnection.org | 2 services (drupal, drupal-proxy) |
| headylens.ai | 1 service (lens) |

---

## 5. Cross-Bundle Domain Comparison

### Presence Matrix

| Domain | Perplexity Site-Registry | System-Build Sites | Full-Rebuild domains.yaml | Full-Rebuild registry | System-Build SERVICE_INDEX |
|---|---|---|---|---|---|
| headyme.com | Yes | Yes | Yes | — | Yes |
| headysystems.com | Yes | Yes | Yes | Yes | Yes |
| headyconnection.org | Yes | Yes | Yes | Yes | Yes |
| headyconnection.com | Yes | Yes | — | — | — |
| heady-ai.com | Yes | Yes | Yes (as headyai.com) | — | — |
| headyos.com | Yes | Yes | — | — | — |
| headyex.com | Yes | Yes | — | — | — |
| headyfinance.com | Yes | Yes | — | — | — |
| admin.headysystems.com | Yes | Yes | — | — | — |
| auth.headysystems.com | — | Yes | — | — | — |
| headybuddy.org | — | — | Yes | Yes | — |
| headybuddy.com | — | — | — | — | Yes |
| headymcp.com | — | — | Yes | Yes | Yes |
| headyio.com | — | — | Yes | — | — |
| heady.io | — | — | — | — | Yes |
| headybot.com | — | — | Yes | — | — |
| headyapi.com | — | — | Yes | — | Yes |
| headyai.com | — | — | Yes | — | — |
| headybee.co | — | — | — | Yes | Yes |
| headylens.ai | — | — | — | Yes | Yes |
| headyarena.io | — | — | — | Yes | — |
| headyvinci.com | — | — | — | Yes | — |
| headysoul.ai | — | — | — | Yes | — |

### Key Mismatches

1. **Three distinct domain sets with minimal overlap.** Only `headyme.com`, `headysystems.com`, and `headyconnection.org` appear in all three bundles. The bundles represent different architectural views:
   - Perplexity: **public website** domains (9 consumer/business sites)
   - Full-rebuild domains.yaml: **infrastructure** domains (9 service endpoints)
   - Full-rebuild registry: **internal service** domains (9 node-facing endpoints)

2. **heady-ai.com vs headyai.com.** Perplexity and system-build use `heady-ai.com` (hyphenated). Full-rebuild domains.yaml uses `headyai.com` (no hyphen). These may be the same property or separate domains.

3. **headybuddy.org vs headybuddy.com.** Full-rebuild domains.yaml and registry use `headybuddy.org`. System-build SERVICE_INDEX uses `headybuddy.com`. Neither appears in the Perplexity site-registry.

4. **headyio.com vs heady.io.** Full-rebuild domains.yaml defines `headyio.com` as "Developer Platform." System-build SERVICE_INDEX maps coder/researcher/federation/sandbox to `heady.io`. These may be aliases or distinct properties.

5. **Consumer-facing domains absent from infrastructure bundles.** `headyex.com`, `headyfinance.com`, `headyos.com` appear only in the Perplexity site-registry and system-build built sites — they have no corresponding services or infrastructure definitions in either full-rebuild config.

6. **Infrastructure domains absent from consumer bundles.** `headybee.co`, `headylens.ai`, `headyarena.io`, `headyvinci.com`, `headysoul.ai` appear only in full-rebuild/system-build service configs — they have no consumer-facing site definitions.

7. **auth.headysystems.com exists only in system-build.** It has a built site (with `relay.html`) but is not listed in any registry or domain config.

8. **Total unique domains across all bundles: 23.**
