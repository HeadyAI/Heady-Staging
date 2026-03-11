# Heady audit brief

Target repo: https://github.com/HeadyMe/Heady-pre-production

User goal:
- Scan all directives, laws, tools, skills, services, and workflows of Heady for maximum intelligence.
- Use secrets already managed outside the repo as needed; do not hardcode secrets.
- Ensure all UIs are fully functional and optimally implemented.
- Ensure proper liquid nodes are in place.
- Optimize the system for dynamic intelligent async parallel task execution.
- Use HeadyBee and HeadySwarms where beneficial.
- Move the system toward operating cleanly in vector space.
- Design for 3 Colab Pro+ memberships/runtimes as latent-space ops if beneficial.
- Ensure sites, auth, links, and documentation are comprehensive, accessible, and easy to understand.

Required output from coding agent:
1. Audit the repository architecture and identify the highest-impact broken, stubbed, missing, or miswired areas.
2. Implement concrete fixes directly in the repo where feasible within one pass.
3. Prioritize end-to-end correctness over speculative expansion.
4. Focus especially on auth wiring, links/navigation, UI functionality, health/observability, docs organization, service integration points, removal of placeholders/TODOs where possible, and concurrency/orchestration architecture.
5. Validate by running available tests/build/lint or targeted verification commands.
6. Produce a concise implementation summary with files changed, tests run, remaining risks, and next recommended work.

Architectural preferences:
- No localhost contamination in production paths.
- Explicit env/config validation.
- Structured logging and health endpoints where applicable.
- Capability/relevance routing over arbitrary priority enums.
- Concurrency where independent tasks allow it.
- Avoid stubs, placeholder text, and dead links.
- Keep docs organized and accessible.
