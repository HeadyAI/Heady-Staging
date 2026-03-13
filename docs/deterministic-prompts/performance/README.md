# MAXIMUM POTENTIAL v2 — Modular Deterministic Prompt System

## What This Is

A modular system prompt architecture for AI coding agents. Ten independent modules compose into four configurations, each with a built-in **verification handshake** — a systematic check-and-affirm sequence that proves all prompt-initiated changes were made correctly, deterministically, and at the performance level required by the Heady Latent OS execution model.

When you combine modules, their verification checks stack. At task completion, the agent runs every check in sequence. All checks are AND-gated — every one must pass. If any fails, the handshake halts, identifies the failure, and directs the agent back to the correct phase. The affirmation block at the end is formal proof that the work is correct, deterministic, and ready.

## The Ten Modules

**01 CORE_IDENTITY** — Behavioral invariants, prime directives, stack constraints (no React, Drupal+Heady, cutting-edge-first, 3D persistence). Always required.

**02 COGNITIVE_FRAMEWORK** — Six-layer mandatory reasoning sequence that ensures deterministic thinking before any code is written. Always required.

**03 EXECUTION_PIPELINE** — Six-phase build process with mandatory gate checks between phases. No phase can be skipped. No phase proceeds until the gate passes. Always required.

**04 VERIFICATION_ENGINE** — Five-pass verification protocol (structural integrity, behavioral correctness, test suite, invariant preservation, documentation). Runs after every change. Always required for determinism.

**05 DETERMINISTIC_GUARD** — Five guards that ensure the process itself is reproducible (reasoning trace, input completeness, order independence, environment isolation, idempotency). Always required for determinism.

**06 PERFORMANCE_LAYER** — Performance budgets, mathematically-derived constants (Fibonacci, golden ratio), Heady Latent OS integration (HeadyBee workers, GPU dispatch, latent space operations). For when speed is a correctness requirement.

**07 SECURITY_STANDARDS** — Security enforcement as mandatory gate checks: input validation, parameterized queries, CORS whitelists, auth token management, rate limiting, dependency audit, 3D persistence encryption. For when handling user data.

**08 QUALITY_STANDARDS** — Code quality (naming, functions, error handling), testing standards (deterministic, isolated, readable), documentation requirements (README, API ref, runbook, Drupal config docs, 3D persistence schemas). Recommended always.

**09 CONCURRENCY_ORCHESTRATOR** — DAG-based concurrent execution, independence verification, equivalence checking, capability-based routing, HeadyBee/HeadySwarm orchestration. For multi-service and distributed workloads.

**10 UI_ENGINEERING** — Drupal 11+ Twig rendering, Heady dynamic page delivery, 3D persistence storage model, cross-site task execution via authenticated schemas, design system (Fibonacci spacing, golden ratio typography, semantic colors, φ-derived motion), five-state component completeness, WCAG AA accessibility. For building the user-facing layer.

## The Four Zip Compositions

**`deterministic-core.zip`** (modules 01–05) — General-purpose deterministic coding. Use when you need reproducible, verified output but don't need domain-specific enforcement. The handshake runs 16 checks across pipeline gates, verification passes, and deterministic guards.

**`deterministic-secure.zip`** (modules 01–05 + 07) — Core plus security. Use when building anything that handles user data, exposes network endpoints, or processes authentication. Adds 11 security gates to the handshake.

**`deterministic-performance.zip`** (modules 01–05 + 06 + 09) — Core plus performance and concurrency. Use for high-throughput systems, GPU pipelines, or Heady Latent OS workloads. Adds performance budgets, concurrency equivalence verification, and HeadySwarm metrics.

**`deterministic-fullstack.zip`** (all 10 modules) — Everything. The complete 9-step handshake covering pipeline gates, verification passes, deterministic guards, performance budgets, security gates, quality standards, concurrency equivalence, UI engineering, and Heady Latent OS status. For production Drupal + Heady applications.

## How to Use

Pick the zip that matches your task scope. Open COMPOSE.md inside — it tells you the exact module load order and the full verification handshake protocol. Concatenate the modules in the specified order into a single system prompt and provide it to your AI coding agent. The agent follows the modules' instructions and emits the verification handshake affirmation at task completion.

## Architectural Decisions Baked Into Every Module

**No React, no frontend frameworks.** Drupal 11+ Twig templates, vanilla HTML5/CSS3/ES2024+ JavaScript. No build tools, no bundlers, no transpilers. Drupal's `*.libraries.yml` manages assets natively.

**Cutting-edge-first.** Default to the newest web platform APIs. Feature-detect with `@supports` and `typeof`. Degrade gracefully to stable fallbacks only when the target environment provably lacks support. The frontier is the starting position; stable technology is the safety net, not the default.

**3D persistence.** User state lives in a three-dimensional vector-addressable persistence layer — identity (who) × context (what) × time (when/version). Append-only writes. Full version history. Point-in-time recovery.

**Heady dynamic delivery.** Pages composed at request time by Heady's context-aware layer on top of Drupal's Twig rendering pipeline. Server-composed, client-enhanced. Progressive enhancement as architecture.

**Cross-site task execution.** Heady-delivered pages interact with external services via authenticated schemas stored encrypted in 3D persistence. OAuth2, API keys, sessions, and webhooks supported with auto-refresh and proxy capabilities.

**Determinism by design.** Every module contains deterministic checkpoints. COMPOSE files define handshake protocols that prove same-inputs-produce-same-outputs. The verification affirmation is the formal, auditable proof.
