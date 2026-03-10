# GAPS_FOUND

## Issues found during this pass

### 1. Root local runtime artifacts were missing
- Problem: the bundle had no `docker-compose.yml`, no CI workflow, no shared `.env.example`, and no collector config.
- Impact: the project could describe a 50-service stack but not provide a concrete local orchestration path.
- Resolution: added all four artifacts.

### 2. Root workflow scripts were incomplete
- Problem: the root `package.json` only exposed `build:sites`, `build:services`, `test`, and `validate`.
- Impact: there was no standard root entry point for stack startup, lint/compliance validation, compose control, or health sweeping.
- Resolution: added `dev`, `build`, `start`, `lint`, `compose:up`, `compose:down`, `health:all`, and `test:ci`.

### 3. Generated Dockerfiles were not workspace-complete
- Problem: service Dockerfiles only installed the shared platform workspace and did not install the target service workspace package.
- Impact: runtime dependencies such as `express` would be missing inside generated containers.
- Resolution: updated the generator to copy each service package manifest, install both workspaces, and run from the proper workspace path.

### 4. Runtime-critical localhost contamination remained
- Problem: the shared platform config defaults, OTEL defaults, Envoy bootstrap, a skill artifact, and all generated Docker healthchecks still contained `localhost` or `127.0.0.1` references.
- Impact: the code contradicted the bundle’s own zero-localhost claims and made compliance validation unreliable.
- Resolution: replaced those runtime-critical references with service-DNS or bind-all alternatives.

### 5. Source headers still carried stale patent-count wording
- Problem: repeated service and platform file headers still said `60+ Provisional Patents`, which conflicted with the user-provided `51 Provisional Patents` instruction set.
- Impact: the bundle mixed conflicting IP-count language even though the rest of the build had been normalized around Eric Haywood and the updated operating prompt.
- Resolution: normalized the repeated headers to `51 Provisional Patents` and verified the stale wording no longer remains.

## Remaining limits after this pass

- The service implementations are still scaffold-heavy and many `/process` handlers remain generic instead of domain-complete.
- The local stack has been made much more runnable on paper, but a full 50-service `docker compose up --build` execution was not completed in this pass because Docker tooling is unavailable in this environment.
- Full end-to-end browser auth propagation with real cookie issuance, Drupal webhook verification, and live mesh certificate validation still remain for a later runtime wave.
- The repo still lacks deeper domain-specific tests for many individual services beyond structural and compliance coverage.
- The site registry source file still contains many placeholder or legacy anchors, so the generator now compensates for them at build time rather than relying on the source data being fully normalized.
