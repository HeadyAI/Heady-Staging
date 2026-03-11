# CHANGES

## Maximum-potential pass
- Implemented concrete HeadyAutoContext enrichment endpoints: `/context/enrich`, `/context/index-batch`, `/context/remove`, and `/context/query`.
- Added in-memory vector source indexing with deterministic seed vectors, CSL-style scoring, and source summaries for downstream services.
- Expanded `heady-auth` with Google and GitHub OAuth launch plus callback routes guarded by signed flow cookies, redirect allowlists, and nonce/state preservation.
- Removed browser storage dependence from the client AutoContext bridge. Context now stays in memory and syncs across active tabs/windows via `BroadcastChannel` and `postMessage`.
- Cleaned the site generator so future auth surfaces do not reintroduce browser storage or alert-based OAuth placeholders.
- Added a root documentation tree for architecture, ADRs, security posture, onboarding, runbooks, and error catalog material.
- Added validation tests and a local validation script for auth, AutoContext, bundle structure, and storage-policy enforcement.
