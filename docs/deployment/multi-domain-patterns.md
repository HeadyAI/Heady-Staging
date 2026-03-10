# Multi-Domain Deployment Patterns — What Successful Platforms Do

> And why Heady™'s approach is superior.

## Problem Statement

How do you serve 15+ branded websites from a single container, with per-domain
branding, auth, and AI chat — deployed on Google Cloud Run with auto-TLS?

## Successful Public Domain Patterns

### 1. Ghost CMS — Multi-Instance (❌ NOT Multi-Tenant)

Ghost does **not** support multi-site from a single instance. Each Ghost
blog requires its own container/process. Multi-domain is achieved via:

- Nginx reverse proxy routing `Host:` → different Ghost processes
- Per-instance theme deployment via Admin API

**Why Heady is better:** One process, one container, 15 sites, zero proxy.

### 2. Vercel — Edge Host Routing

Vercel handles multi-domain at the CDN edge:

- Each deployment is immutable, stored on global edge
- Custom domains map to deployments via DNS CNAME
- Host header checked at edge → routes to correct deployment
- TLS automatic via Let's Encrypt

**Pattern borrowed:** DNS CNAME → single service with Host routing.

### 3. WordPress.com VIP — Host→Site ID Lookup

```
Request → CDN edge → Host header → site ID lookup → config load → render
```

WordPress VIP serves millions of sites from shared infrastructure.
The key pattern: Host header maps to a site configuration that drives
template selection, theme, and branding.

**Pattern borrowed:** `SITES[host]` registry with per-domain config.

### 4. Cloud Run — Single Container + Domain Mapping

Production-proven pattern (what Heady uses):

```bash
# Map each domain to the same service
gcloud run domain-mappings create \
  --service=heady-sites \
  --domain=headyme.com \
  --region=us-central1

# Repeat for each domain — auto-TLS included
```

**Key facts:**

- No limit on domain mappings per service
- Auto-TLS via Google-managed certificates
- Zero additional cost for domain mappings
- Domain verification via DNS TXT record

### 5. Strapi Multi-Tenant — Middleware Pattern

```javascript
// Strapi-style middleware for multi-tenant routing
app.use((req, res, next) => {
  const host = req.headers.host;
  const tenant = tenantRegistry[host];
  if (tenant) {
    req.tenant = tenant;
    req.dbConnection = getTenantDB(tenant.id);
  }
  next();
});
```

**Pattern borrowed:** `resolveSite(host)` middleware-style lookup.

---

## Why Heady™'s Approach is Superior

| Feature | Ghost | Vercel | WordPress VIP | Heady™ |
|---------|-------|--------|---------------|--------|
| Single container | ❌ | ❌ (per-deploy) | ✅ | ✅ |
| Host header routing | ❌ (needs proxy) | ✅ (edge) | ✅ | ✅ (in-app) |
| 25 auth providers | ❌ | ❌ | ❌ | ✅ |
| AI chat widget | ❌ | ❌ | ❌ | ✅ (HeadyBuddy) |
| φ-scaled constants | ❌ | ❌ | ❌ | ✅ (Sacred Geometry) |
| Zero-dependency rendering | ❌ | ❌ | ❌ | ✅ (raw Node.js http) |
| Auto-TLS per domain | ❌ (manual) | ✅ | ✅ | ✅ (Cloud Run managed) |

### Architecture

```
Internet → Cloudflare (WAF/CDN) → Cloud Run (heady-sites)
                                      ↓
                              Host: headyme.com
                                      ↓
                          SITES['headyme.com'] → config
                                      ↓
                              renderSite(config) → HTML
                              (with HeadyBuddy + Auth)
```

### 15 Mapped Domains

| # | Domain | Brand |
|---|--------|-------|
| 1 | headyme.com | HeadyMe |
| 2 | headysystems.com | HeadySystems |
| 3 | headyconnection.org | HeadyConnection |
| 4 | headybuddy.org | HeadyBuddy |
| 5 | headymcp.com | HeadyMCP |
| 6 | headyio.com | HeadyIO |
| 7 | headybot.com | HeadyBot |
| 8 | headyapi.com | HeadyAPI |
| 9 | headysense.com | HeadyLens |
| 10 | heady-ai.com | HeadyAI |
| 11 | perfecttrader.com | PerfectTrader |
| 12 | headyos.com | HeadyOS |
| 13 | headyex.com | HeadyExchange |
| 14 | headyfinance.com | HeadyFinance |
| 15 | headyconnection.com | HeadyConnect |
