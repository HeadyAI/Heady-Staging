# Heady™ Platform — Priority Fixes Package
> **Generated:** 2026-03-07 | **Version:** 3.2.2-fixes | **Codename:** Aether-Patch

## What This Package Contains

All 5 priority actions from the operational health sweep, plus domain verification
and repo bootstrap tooling. Every file is production-ready with zero placeholders.

## Fix Summary

| Fix | Target | Issue | Solution |
|-----|--------|-------|----------|
| 1 | headyme.com | Onboarding skips to API key | 5-stage middleware + auth flow |
| 2 | headyos.com | 530 origin error | Cloudflare Worker + Pages deploy |
| 3 | heady-ai.com | DNS failure / no zone | DNS zone setup + Worker route |
| 4 | headycloud.com | 403 forbidden | WAF rule correction + Worker |
| 5 | HuggingFace Spaces | Both spaces unreachable | Wake/redeploy scripts |

## Additional Tools

| Tool | Purpose |
|------|---------|
| domain-verification/ | Test all 11+ domains end-to-end |
| repo-bootstrap/ | Unarchive repos + create active heady-production repo |
| deploy/ | Master deploy script for all fixes |

## Quick Start

```bash
# 1. Unzip
unzip heady-platform-fixes.zip
cd heady-platform-fixes

# 2. Run domain verification first (baseline)
node domain-verification/verify-all-domains.mjs

# 3. Deploy all fixes
bash deploy/deploy-all.sh

# 4. Re-run verification (confirm fixes)
node domain-verification/verify-all-domains.mjs
```

## Deployment Order (Recommended)

1. **Fix 2 + 3 + 4** — Domain/Cloudflare fixes (independent, deploy in parallel)
2. **Fix 5** — Wake HuggingFace Spaces
3. **Fix 1** — Onboarding flow (largest change, deploy after infra is stable)
4. **Repo Bootstrap** — Unarchive and restructure GitHub repos
5. **Domain Verification** — Final validation pass

## File Map

```
heady-platform-fixes/
├── README.md
├── fix-1-onboarding/          # headyme.com auth/onboarding fix
│   ├── src/
│   │   ├── middleware/
│   │   │   └── onboarding-guard.ts
│   │   ├── app/
│   │   │   ├── onboarding/
│   │   │   │   └── page.tsx
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       │   └── callback/route.ts
│   │   │       ├── onboarding/
│   │   │       │   └── route.ts
│   │   │       └── user/
│   │   │           └── route.ts
│   │   ├── components/
│   │   │   ├── OnboardingWizard.tsx
│   │   │   └── ContextSwitcher.tsx
│   │   └── lib/
│   │       ├── auth.ts
│   │       ├── onboarding-stages.ts
│   │       └── phi-utils.ts
│   └── prisma/
│       └── schema.prisma
├── fix-2-headyos/             # headyos.com 530 fix
│   ├── cloudflare/
│   │   └── worker.js
│   └── pages/
│       └── index.html
├── fix-3-heady-ai-org/        # heady-ai.com DNS fix
│   ├── cloudflare/
│   │   └── worker.js
│   └── dns/
│       └── setup-zone.sh
├── fix-4-headycloud/          # headycloud.com 403 fix
│   └── cloudflare/
│       ├── worker.js
│       └── fix-waf-rules.sh
├── fix-5-huggingface/         # HuggingFace Spaces wake
│   └── scripts/
│       ├── wake-spaces.sh
│       └── redeploy-spaces.py
├── domain-verification/
│   └── verify-all-domains.mjs
├── repo-bootstrap/
│   ├── scripts/
│   │   ├── unarchive-repos.sh
│   │   └── create-production-repo.sh
│   └── .github/
│       └── workflows/
│           └── ci.yml
└── deploy/
    └── deploy-all.sh
```
