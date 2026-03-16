# Heady Full Rebuild Brief

## Primary target repository
- Primary rebuild target: https://github.com/HeadyMe/headyos-core
- Adjacent central repos likely to influence interfaces and contracts:
  - https://github.com/HeadyMe/headysystems-core
  - https://github.com/HeadyMe/headymcp-core
  - https://github.com/HeadyMe/headyapi-core

## Parent objective
Rebuild the primary Heady project from scratch optimally as a clean latent operating system and control plane, replacing weak or shallow structure with a coherent production-ready architecture. The result should express dynamic intelligent async parallel execution, liquid node orchestration, capability-based routing, proper observability, secure configuration, complete documentation, and strong UI and link integrity where the repo includes user-facing surfaces.

## Rebuild stance
This is not a bugfix pass. It is a greenfield-quality re-architecture inside the existing repository, preserving only pieces that are genuinely useful and coherent. Prefer clean replacement over incremental patching if the current layout is fragmented or misleading.

## Target architecture
Build toward these layers if consistent with the repo’s purpose:

1. Interface and edge layer
- clear HTTP API surface
- health, status, readiness endpoints
- docs and service map endpoints
- zero localhost contamination in production paths

2. Gateway and routing layer
- capability-based task routing
- explicit orchestration contracts
- async execution coordinator with concurrency where dependency-free
- no arbitrary HIGH/MEDIUM/LOW priority systems unless there is a hard technical need

3. Execution and liquid node layer
- well-defined node or worker abstraction
- spawn, route, retire lifecycle for liquid nodes or bee-like workers if appropriate
- graceful shutdown and fault containment
- clear task envelope or job contract types

4. Memory and state layer
- clean state abstractions for runtime memory, vector or graph integration points if supported
- environment-driven adapters instead of hardcoded providers
- explicit interfaces even if backing providers are not fully implemented in this repo

5. Observability and control plane
- structured JSON logging with correlation IDs
- metrics or at least clear metrics integration points
- error taxonomy and typed operational errors
- runtime status reporting and diagnostics

6. Security and config layer
- centralized validated configuration
- env-driven CORS allowlist
- secure defaults and headers
- input validation on external interfaces
- no secrets in code

## UI and docs expectations
If the repo has UI or docs surfaces, ensure:
- navigation is coherent
- links work
- auth and protected-route behavior are consistent if auth exists
- docs are accessible and explain architecture, configuration, services, deployment, and operations

## Agent-orchestration policy to implement where appropriate
- planner or router decides by capability match and relevance
- executor nodes process independent work concurrently
- validator or verifier stage checks outputs before completion
- handoff contracts are explicit and typed
- runtime policy defines when nodes are spawned, reused, or retired

## Colab and remote runtime guidance
Only integrate 3 Colab Pro+ or remote latent-space runtime concepts if the existing codebase already has remote worker, provider, compute pool, or runtime adapter abstractions. If not, create clean extension points and documentation rather than fake integrations.

## Required engineering standards
- production-grade code only
- no placeholders, TODOs, FIXME, or mock architecture descriptions left behind
- explicit config validation
- no console.log in production code
- no localhost or hardcoded dev URLs in production behavior or docs
- Docker and deployment artifacts should be coherent if the repo uses containers
- tests for critical paths
- exact verification summary with commands run

## Deliverables from coding agent
1. Rebuilt project structure and code changes in the repo
2. Concise architecture summary
3. List of major files or modules created or replaced
4. Verification commands and outcomes
5. Remaining blockers requiring external infrastructure or cross-repo work
6. Save a full report to /home/user/workspace/headyos-core-rebuild-summary.md

## Acceptance threshold
The repo should look and behave like a real operating-system-grade Heady core, not a marketing shell or minimal server. Prefer a small but coherent real system over a large but shallow one.
