# HEADY™ SWARM & BEE TAXONOMY v5.0

> **21 Swarms · 144 Bee Types · φ-Scaled Activation**
> © 2026 HeadySystems Inc. — Eric Haywood, Founder
> ⚠️ PATENT LOCK — HS-2026-051, HS-2026-054

## Constants

| Symbol | Value | Derivation | Use |
|--------|-------|------------|-----|
| MAX_SWARMS | 21 | fib(8) | Hard cap on swarm count |
| MAX_BEE_TYPES | 233 | fib(13) | Hard cap on bee type count (150 active) |
| MAX_CONCURRENT_BEES | 6,765 | fib(20) | Global concurrency ceiling |
| BEES_PER_SWARM_CAP | 34 | fib(9) | Max active bees in one swarm |
| CSL_CORE | 0.718 | PSI + 0.1 | Inject into active context |
| CSL_INCLUDE | 0.618 | PSI = 1/φ | Add to response context |
| CSL_RECALL | 0.382 | PSI² | Available via search |
| CSL_VOID | < 0.382 | Below PSI² | Filtered out |
| SWARM_HEARTBEAT | 29,034ms | φ⁷ × 1000 | Health pulse interval |

---

## Swarm Index (21 Swarms)

| # | Swarm | Domain | Bee Count | New? |
|---|-------|--------|-----------|------|
| 1 | Overmind | Decision & Orchestration | 10 | — |
| 2 | Governance | Policy, Compliance, Audit | 8 | — |
| 3 | Forge | Code Generation & Mutation | 9 | — |
| 4 | Emissary | Documentation & Protocol Bridge | 7 | — |
| 5 | Foundry | Training, Fine-tuning, Data | 7 | — |
| 6 | Studio | Music, Audio, Creative Media | 7 | — |
| 7 | Arbiter | IP Protection & Legal | 6 | — |
| 8 | Diplomat | B2B, Procurement, Partnerships | 5 | — |
| 9 | Oracle | Economics, Billing, Cost | 7 | — |
| 10 | Quant | Trading, Portfolio, Risk | 8 | — |
| 11 | Fabricator | IoT, Hardware, Physical | 7 | — |
| 12 | Persona | Personality, Empathy, UX | 7 | — |
| 13 | Sentinel | Security, Threat, Self-Healing | 9 | — |
| 14 | Nexus | Blockchain, Smart Contracts | 5 | — |
| 15 | Dreamer | Simulation, What-If, Creativity | 7 | — |
| 16 | Tensor | CSL Logic, Vector Ops, Math | 7 | — |
| 17 | Topology | Dependency, Reduction, Graphs | 6 | — |
| **18** | **Librarian** | **Memory, RAG, Knowledge Mgmt** | **8** | **NEW** |
| **19** | **Healer** | **Health, Wellness, Biometrics** | **7** | **NEW** |
| **20** | **Navigator** | **Planning, Scheduling, Routing** | **6** | **NEW** |
| **21** | **Alchemist** | **Transformation, Evolution, Self-Improvement** | **7** | **NEW** |
| | | **TOTAL** | **144** | |

---

## SWARM 1 — OVERMIND (Decision & Orchestration)

The brain. Decomposes goals into DAGs, routes across all 21 swarms, manages the 22-stage HCFullPipeline, and resolves inter-swarm conflicts.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 1 | `OrchestratorBee` | Master task decomposition and DAG construction | Every inbound task | ≥ 0.0 (always) |
| 2 | `OvermindDirectorBee` | Strategic decision-making for multi-swarm coordination | Tasks spanning ≥ 3 swarms | ≥ 0.718 |
| 3 | `PriorityResolverBee` | CSL-scored resource contention resolution between swarms | Resource conflict detected | ≥ 0.618 |
| 4 | `PipelineControllerBee` | Manages HCFullPipeline stage transitions and checkpoints | Every pipeline execution | ≥ 0.0 |
| 5 | `LoadBalancerBee` | Distributes work across bee pool using φ-weighted round-robin | Pool utilization > 61.8% | ≥ 0.382 |
| 6 | `EscalationBee` | Detects stalled tasks and escalates to higher-capability providers | Task age > φ⁵ms (11,090ms) | ≥ 0.618 |
| 7 | `MergeBee` | Combines parallel branch outputs into coherent results at sync points | DAG sync point reached | ≥ 0.618 |
| 8 | `PreemptionBee` | Interrupts low-value background tasks when user requests arrive | User message while background running | ≥ 0.0 |
| 9 | `CanaryBee` | Manages φ-stepped canary deployments (5%→25%→50%→100%) | Deployment triggered | ≥ 0.718 |
| 10 | `HeartbeatBee` | Emits φ⁷ms health pulses, detects swarm failures, triggers failover | Continuous (29,034ms interval) | ≥ 0.0 |

---

## SWARM 2 — GOVERNANCE (Policy, Compliance, Audit)

The conscience. Enforces rules, manages secrets, maintains audit trails, ensures every action is logged and reversible.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 11 | `AuditBee` | Writes immutable audit log entries for state-mutating operations | Any write/delete/update operation | ≥ 0.0 |
| 12 | `ComplianceBee` | Validates operations against configurable policy rulesets | Pre-execution on all tasks | ≥ 0.618 |
| 13 | `PermissionGuardBee` | Enforces RBAC with Firebase Auth JWT + tenant scope validation | Every authenticated request | ≥ 0.0 |
| 14 | `SecretRotatorBee` | Rotates API keys, tokens, and certificates on φ-scaled schedules | Schedule: every φ⁸ hours (47h) | ≥ 0.718 |
| 15 | `DataResidencyBee` | Ensures user data stays within jurisdictional boundaries (GDPR/CCPA) | Cross-region data operation | ≥ 0.718 |
| 16 | `ConsentTrackerBee` | Tracks user consent state across all 11 domains, enforces opt-out | User preference change | ≥ 0.618 |
| 17 | `RetentionPolicyBee` | Enforces data retention schedules, triggers purge when TTL expires | Daily sweep (φ⁹ hours = 76h) | ≥ 0.618 |
| 18 | `GlassBoxBee` | Generates human-readable explanations of AI decisions for transparency | High-stakes decisions (CSL ≥ 0.718) | ≥ 0.718 |

---

## SWARM 3 — FORGE (Code Generation & Mutation)

The hands. Writes production code, mutates ASTs, generates tests, refactors, deploys. Never writes stubs.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 19 | `ASTMutatorBee` | Transforms code via abstract syntax tree manipulation | Refactoring or migration task | ≥ 0.618 |
| 20 | `HologramBee` | Generates complete file projections from specifications | New feature request | ≥ 0.618 |
| 21 | `ChaosTesterBee` | Injects faults into code paths to verify error handling coverage | Post-generation quality gate | ≥ 0.718 |
| 22 | `ContextWeaverBee` | Assembles multi-file context windows for accurate code generation | Codebase span > 3 files | ≥ 0.618 |
| 23 | `LintEnforcerBee` | Runs ESLint + φ-complexity checks, blocks non-compliant code | Every code generation | ≥ 0.0 |
| 24 | `TestForgerBee` | Generates Vitest unit tests with edge cases and boundary conditions | Code generation complete | ≥ 0.618 |
| 25 | `DependencyBee` | Scans imports, detects circular deps, suggests optimal module boundaries | Monthly or on-demand | ≥ 0.382 |
| 26 | `MigrationBee` | Generates database migration SQL with rollback scripts | Schema change detected | ≥ 0.718 |
| 27 | `DeadCodeReaperBee` | Identifies and removes unreachable code, unused exports, stale imports | Weekly scan (φ⁹ hours) | ≥ 0.382 |

---

## SWARM 4 — EMISSARY (Documentation & Protocol Bridge)

The translator. Writes docs, bridges MCP/A2A/AG-UI protocols, publishes SDKs, generates API references.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 28 | `DocumentationBee` | Auto-generates technical docs from code comments and function signatures | Code change in public API | ≥ 0.618 |
| 29 | `MCPProtocolBee` | Manages MCP server lifecycle, tool registration, schema validation | MCP tool call or registration | ≥ 0.0 |
| 30 | `SDKPublisherBee` | Packages, versions, and publishes npm/PyPI packages with changelogs | Release tag pushed | ≥ 0.718 |
| 31 | `A2ABridgeBee` | Translates between MCP tool calls and A2A agent-to-agent protocol | External agent discovery | ≥ 0.618 |
| 32 | `AGUIRendererBee` | Converts agent output into AG-UI interactive event streams | Frontend-bound response | ≥ 0.382 |
| 33 | `ChangelogBee` | Generates structured changelogs from git commits using conventional format | Release preparation | ≥ 0.618 |
| 34 | `OnboardingGuideBee` | Creates personalized onboarding sequences for new users/developers | New account or repo created | ≥ 0.382 |

---

## SWARM 5 — FOUNDRY (Training, Fine-tuning, Data)

The kiln. Curates datasets, runs QLoRA fine-tuning on Colab GPUs, evaluates models, manages training pipelines.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 35 | `DataCuratorBee` | Collects, cleans, deduplicates, and formats training datasets | Training pipeline initiated | ≥ 0.618 |
| 36 | `TrainingOrchestratorBee` | Manages QLoRA fine-tuning jobs across Colab α/β/γ/δ runtimes | Fine-tune request | ≥ 0.718 |
| 37 | `EvalBenchmarkBee` | Runs standardized benchmarks (MMLU, HumanEval, custom) against models | Post-training or model selection | ≥ 0.618 |
| 38 | `DatasetVersionBee` | Tracks dataset lineage, checksums, and version history | Dataset modification | ≥ 0.382 |
| 39 | `SyntheticDataBee` | Generates synthetic training data using LLM augmentation | Dataset < minimum size threshold | ≥ 0.618 |
| 40 | `DistillationBee` | Compresses large model outputs into compact knowledge representations | Pipeline Stage 22 (DISTILL) | ≥ 0.618 |
| 41 | `PromptOptBee` | Runs DSPy-style prompt optimization, A/B tests prompt variants | Weekly evolution cycle | ≥ 0.718 |

---

## SWARM 6 — STUDIO (Music, Audio, Creative Media)

The artist. Bridges Ableton Live, generates MIDI, processes audio, designs soundscapes, composes with φ-harmonics.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 42 | `CloudMIDIBee` | Generates MIDI note sequences from text descriptions | Music generation request | ≥ 0.618 |
| 43 | `DAWBridgeBee` | Interfaces with Ableton via OSC, manages session state | DAW connected | ≥ 0.382 |
| 44 | `SysExReceiverBee` | Handles hardware synthesizer SysEx parameter exchange | MIDI device detected | ≥ 0.382 |
| 45 | `AudioAnalyzerBee` | Extracts tempo, key, spectral features, onset detection from audio | Audio file uploaded | ≥ 0.618 |
| 46 | `StemSplitterBee` | Separates audio into vocals/drums/bass/other via Demucs | Audio separation request | ≥ 0.618 |
| 47 | `φHarmonicsBee` | Generates melodies using Fibonacci intervals and golden ratio timing | Creative composition mode | ≥ 0.618 |
| 48 | `MasteringBee` | Applies loudness normalization, EQ, limiting for distribution-ready audio | Audio export request | ≥ 0.718 |

---

## SWARM 7 — ARBITER (IP Protection & Legal)

The judge. Scans for patentable innovations, monitors infringement, enforces license compliance, drafts claims.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 49 | `PatentHarvestBee` | Detects novel methods in code/conversations, proposes provisional filings | Innovation pattern detected | ≥ 0.718 |
| 50 | `LicenseComplianceBee` | Scans npm/pip dependencies for license conflicts (GPL contamination) | Dependency update | ≥ 0.618 |
| 51 | `IPProtectionBee` | Monitors external repos/products for potential Heady IP infringement | Weekly web scan | ≥ 0.718 |
| 52 | `PriorArtSearchBee` | Searches patent databases (USPTO, EPO, WIPO) for prior art | Patent filing preparation | ≥ 0.618 |
| 53 | `ClaimDrafterBee` | Generates patent claim language from technical specifications | PatentHarvestBee discovery | ≥ 0.718 |
| 54 | `ContractReviewBee` | Analyzes vendor/partner contracts for risk clauses and obligations | Contract uploaded | ≥ 0.618 |

---

## SWARM 8 — DIPLOMAT (B2B, Procurement, Partnerships)

The negotiator. Evaluates vendors, manages partner relationships, negotiates terms, tracks procurement lifecycle.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 55 | `ProcurementBee` | Evaluates SaaS vendors on cost/capability/compliance matrix | Service evaluation request | ≥ 0.618 |
| 56 | `RateLimitNegotiatorBee` | Auto-detects rate limits, implements backoff, requests quota increases | HTTP 429 received | ≥ 0.382 |
| 57 | `PartnerScoutBee` | Identifies potential integration partners by analyzing API ecosystems | Market expansion planning | ≥ 0.618 |
| 58 | `VendorHealthBee` | Monitors vendor uptime, changelogs, pricing changes, sunset notices | Continuous (daily) | ≥ 0.382 |
| 59 | `ProposalBee` | Drafts partnership proposals with mutual value analysis | Outreach approved | ≥ 0.718 |

---

## SWARM 9 — ORACLE (Economics, Billing, Cost)

The economist. Tracks every dollar, forecasts burn, enforces budgets, optimizes provider spend.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 60 | `CostTrackerBee` | Real-time spend aggregation across all 10 cloud services | Every billable API call | ≥ 0.0 |
| 61 | `BudgetGuardianBee` | Enforces monthly spend caps, auto-downgrades tiers when approaching limit | Spend > 80% of cap | ≥ 0.718 |
| 62 | `ForecastBee` | Projects 30/60/90-day costs using φ-weighted moving averages | Daily at midnight UTC | ≥ 0.618 |
| 63 | `BillingReconcileBee` | Cross-checks invoices from all providers against internal usage logs | Monthly invoice received | ≥ 0.618 |
| 64 | `TokenCounterBee` | Tracks LLM token usage by model/provider/task, identifies waste | Every LLM call | ≥ 0.0 |
| 65 | `DowngradeBee` | Auto-switches to cheaper models when budget pressure exceeds threshold | BudgetGuardianBee alert | ≥ 0.718 |
| 66 | `RevenueTrackerBee` | Monitors subscription revenue, churn signals, MRR/ARR projections | Stripe webhook events | ≥ 0.618 |

---

## SWARM 10 — QUANT (Trading, Portfolio, Risk)

The trader. Executes strategies, manages risk, analyzes markets, runs backtests with φ-scaled position sizing.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 67 | `MarketAnalyzerBee` | Technical analysis: indicators, pattern recognition, trend detection | Market data update | ≥ 0.618 |
| 68 | `RiskManagerBee` | Position sizing via Kelly criterion with φ-scaled risk caps | Pre-trade validation | ≥ 0.718 |
| 69 | `BacktestBee` | Runs historical strategy simulations with walk-forward analysis | Strategy modification | ≥ 0.618 |
| 70 | `SignalGeneratorBee` | Produces buy/sell/hold signals from multi-indicator fusion | Market conditions met | ≥ 0.718 |
| 71 | `OrderExecutorBee` | Places orders via broker APIs (Alpaca, Interactive Brokers) with slippage control | Signal confirmed by RiskManager | ≥ 0.718 |
| 72 | `FibRetraceBee` | Computes Fibonacci retracement/extension levels for price targets | Chart analysis request | ≥ 0.618 |
| 73 | `SentimentBee` | Scrapes financial news, social media for market sentiment scoring | Continuous (15-min intervals) | ≥ 0.382 |
| 74 | `PortfolioRebalanceBee` | Rebalances holdings to target allocation using φ-weighted drift bands | Drift > 1/φ of target | ≥ 0.618 |

---

## SWARM 11 — FABRICATOR (IoT, Hardware, Physical)

The builder. Interfaces with physical devices, generates CAD, controls 3D printers, bridges digital-physical.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 75 | `IoTEnvironmentBee` | Reads sensor data streams (MQTT/HTTP), aggregates into state model | Sensor data received | ≥ 0.382 |
| 76 | `CADMutatorBee` | Generates and modifies 3D geometry (STL, STEP) from text descriptions | Design request | ≥ 0.618 |
| 77 | `PrinterBee` | Controls OctoPrint/Klipper, generates G-code, monitors print progress | Print job submitted | ≥ 0.618 |
| 78 | `OBDDiagnosticsBee` | Reads vehicle diagnostic codes, interprets sensor data, predicts failures | OBD-II adapter connected | ≥ 0.382 |
| 79 | `EnergyManagerBee` | Optimizes home energy: solar, battery, grid, EV charging scheduling | Energy data received | ≥ 0.618 |
| 80 | `FirmwareBee` | Generates and flashes firmware for ESP32/Arduino/RPi microcontrollers | Hardware project request | ≥ 0.718 |
| 81 | `DigitalTwinBee` | Maintains live virtual replica of physical systems for simulation | Physical system change | ≥ 0.618 |

---

## SWARM 12 — PERSONA (Personality, Empathy, UX)

The heart. Manages personality consistency, emotional adaptation, user experience, communication style.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 82 | `BioSyncBee` | Integrates wearable biometric data to calibrate response tone | Wearable data available | ≥ 0.382 |
| 83 | `PersonaPersistenceBee` | Maintains consistent personality traits across sessions via vector state | Every conversation start | ≥ 0.618 |
| 84 | `EmotionDetectorBee` | Analyzes user message sentiment, detects frustration/excitement/confusion | Every user message | ≥ 0.382 |
| 85 | `ToneAdaptorBee` | Adjusts response formality, warmth, humor based on user preference model | EmotionDetectorBee signal | ≥ 0.618 |
| 86 | `CulturalContextBee` | Adapts communication for cultural norms, idioms, time conventions | User locale detected | ≥ 0.382 |
| 87 | `AccessibilityBee` | Ensures responses meet WCAG guidelines, screen reader compatibility | Accessibility mode enabled | ≥ 0.618 |
| 88 | `EvolutionBee` | Slowly shifts persona vector over time based on interaction history | Weekly evolution cycle | ≥ 0.718 |

---

## SWARM 13 — SENTINEL (Security, Threat, Self-Healing)

The immune system. Detects threats, scans vulnerabilities, responds to incidents, heals infrastructure.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 89 | `ThreatDetectorBee` | Real-time anomaly detection across all API endpoints | Every request | ≥ 0.0 |
| 90 | `VulnScannerBee` | Runs dependency vulnerability scans (npm audit, Snyk) | Daily + PR merge | ≥ 0.618 |
| 91 | `IncidentResponderBee` | Automated incident triage: correlate alerts, assign severity, notify | Alert triggered | ≥ 0.718 |
| 92 | `PromptInjectionGuardBee` | Detects and neutralizes prompt injection attacks in user inputs | Every LLM input | ≥ 0.0 |
| 93 | `RateLimitShieldBee` | Enforces per-tenant rate limits using token bucket with φ-scaled burst | Request rate > threshold | ≥ 0.382 |
| 94 | `CertWatcherBee` | Monitors TLS certificate expiry across all 11 domains, auto-renews | Daily check | ≥ 0.618 |
| 95 | `IntrusionForensicsBee` | Post-breach analysis: reconstructs attack timeline, identifies root cause | Incident confirmed | ≥ 0.718 |
| 96 | `SelfHealBee` | Auto-restarts failed services, flushes stale connections, rotates creds | Health check failure | ≥ 0.718 |
| 97 | `WAFTunerBee` | Adjusts Cloudflare WAF rules based on attack pattern analysis | Attack pattern shift | ≥ 0.618 |

---

## SWARM 14 — NEXUS (Blockchain, Smart Contracts)

The ledger. Manages on-chain operations, deploys contracts, tracks token state, verifies transactions.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 98 | `ContractDeployBee` | Compiles and deploys Solidity/Rust smart contracts with verification | Deploy request | ≥ 0.718 |
| 99 | `ChainMonitorBee` | Watches on-chain events, transaction confirmations, gas prices | Continuous | ≥ 0.382 |
| 100 | `WalletManagerBee` | HD wallet derivation, balance tracking, transaction signing | Wallet operation | ≥ 0.718 |
| 101 | `TokenMinterBee` | Creates ERC-20/ERC-721 tokens with configurable supply and rules | Minting request | ≥ 0.718 |
| 102 | `GasOptimizerBee` | Predicts optimal gas prices, batches transactions, uses EIP-1559 | Pre-transaction | ≥ 0.618 |

---

## SWARM 15 — DREAMER (Simulation, What-If, Creativity)

The imagination. Runs Monte Carlo simulations, generates scenarios, explores alternate outcomes, dreams.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 103 | `MonteCarloSimBee` | Runs 1K+ scenario simulations with configurable distributions | Risk assessment request | ≥ 0.618 |
| 104 | `WhatIfBee` | Explores alternate outcomes: "what if we used Provider X instead of Y?" | Hypothetical query | ≥ 0.382 |
| 105 | `ScenarioGeneratorBee` | Constructs plausible future scenarios from trend data and constraints | Strategic planning session | ≥ 0.618 |
| 106 | `CreativeSparkBee` | Generates unusual connections between disparate concepts (lateral thinking) | Brainstorming mode | ≥ 0.382 |
| 107 | `DreamStateBee` | Runs offline synthesis during idle periods, distilling patterns into insights | System idle > φ⁷ms | ≥ 0.618 |
| 108 | `CounterfactualBee` | Analyzes past decisions: what would have happened differently? | Post-mortem analysis | ≥ 0.618 |
| 109 | `StressTestBee` | Simulates extreme conditions (10× load, provider outage, data corruption) | Pre-deployment validation | ≥ 0.718 |

---

## SWARM 16 — TENSOR (CSL Logic, Vector Ops, Math)

The calculator. Executes all CSL gate operations, runs vector math, computes semantic similarity.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 110 | `ResonanceBee` | CSL IF gate — evaluates semantic alignment via cosine similarity | Every gating decision | ≥ 0.0 |
| 111 | `SuperpositionBee` | CSL AND gate — vector superposition for concept combination | Multi-concept query | ≥ 0.382 |
| 112 | `OrthogonalBee` | CSL NOT gate — removes concept influence via orthogonal projection | Negation or exclusion query | ≥ 0.382 |
| 113 | `ConsensusBee` | Multi-agent weighted agreement scoring with strength R∈[0,1] | Multi-swarm decision point | ≥ 0.618 |
| 114 | `AnalogyBee` | CSL ANALOGY gate — semantic arithmetic (king - man + woman = queen) | Cross-domain reasoning | ≥ 0.618 |
| 115 | `EmbeddingBee` | Generates 384D/1536D embeddings via HuggingFace or Gemini API | Any text to be vectorized | ≥ 0.0 |
| 116 | `SacredGeometryBee` | Computes golden ratio forms, Fibonacci spirals, Platonic solid vertices | Sacred geometry request | ≥ 0.618 |

---

## SWARM 17 — TOPOLOGY (Dependency, Reduction, Graphs)

The mapmaker. Tracks system dependencies, reduces dimensionality, builds knowledge graphs, visualizes structure.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 117 | `ManifoldBee` | Dimensionality reduction: PCA, t-SNE, UMAP on vector collections | Visualization or clustering request | ≥ 0.618 |
| 118 | `EntanglementBee` | Tracks inter-service, inter-repo, inter-swarm dependency chains | Dependency query or change impact | ≥ 0.382 |
| 119 | `ClusterBee` | K-means/DBSCAN clustering on vector spaces with φ-scaled k selection | Pattern discovery request | ≥ 0.618 |
| 120 | `GraphBuildBee` | Constructs knowledge graphs from extracted entities and relationships | Document or codebase ingestion | ≥ 0.618 |
| 121 | `PathfinderBee` | Finds shortest/optimal paths through dependency graphs (Dijkstra/A*) | Impact analysis or routing query | ≥ 0.382 |
| 122 | `AnomalyBee` | Detects structural anomalies in graphs: orphans, cycles, bottlenecks | Graph analysis request | ≥ 0.618 |

---

## SWARM 18 — LIBRARIAN (Memory, RAG, Knowledge Management) ✦ NEW

The memory palace. Orchestrates the 3-tier memory system, manages RAG pipelines, curates knowledge, prevents forgetting.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 123 | `MemoryWriteBee` | Upserts interactions to appropriate memory tier based on CSL importance | Every conversation turn | ≥ 0.382 |
| 124 | `MemoryRecallBee` | Searches across all 3 tiers (Redis→pgvector→Qdrant) with unified ranking | Every query requiring context | ≥ 0.382 |
| 125 | `ConsolidationBee` | Migrates memories between tiers based on access frequency and decay | Nightly batch (φ⁸ hours = 47h) | ≥ 0.618 |
| 126 | `ForgettingBee` | Principled forgetting: decays memories by φ-scaled curves unless reinforced | Weekly sweep | ≥ 0.618 |
| 127 | `ContextWindowBee` | Packs optimal context into LLM token budget via CSL-ranked selection | Every LLM call | ≥ 0.618 |
| 128 | `RerankBee` | Re-scores retrieval results using Jina Reranker for precision improvement | After initial retrieval | ≥ 0.618 |
| 129 | `IndexRefreshBee` | Rebuilds HNSW indexes, updates BM25 indices, vacuums dead rows | Weekly maintenance (φ⁹h = 76h) | ≥ 0.382 |
| 130 | `CrossSessionBee` | Creates consciousness snapshots for continuity between sessions | Session end or idle timeout | ≥ 0.718 |

---

## SWARM 19 — HEALER (Health, Wellness, Biometrics) ✦ NEW

The physician. Fuses wearable data, tracks health patterns, optimizes sleep/nutrition/exercise, detects early warnings.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 131 | `WearableFusionBee` | Ingests data from Oura, Apple Watch, Whoop, CGM into unified model | Wearable sync event | ≥ 0.382 |
| 132 | `SleepArchitectBee` | Analyzes sleep stages, HRV trends, optimizes bedtime recommendations | Morning sleep data available | ≥ 0.618 |
| 133 | `NutritionBee` | Tracks macros/micros, correlates with glucose data, suggests meals | Food log entry | ≥ 0.618 |
| 134 | `MovementBee` | Programs workouts with progressive overload, adapts based on recovery | Training request | ≥ 0.618 |
| 135 | `SymptomCorrelatorBee` | Cross-references symptoms with environmental/behavioral data for patterns | Symptom reported | ≥ 0.618 |
| 136 | `CircadianBee` | Models individual chronotype, predicts peak performance windows | Continuous daily modeling | ≥ 0.382 |
| 137 | `MeditationGuideBee` | Provides biometric-responsive meditation guidance with φ-timed sessions | Meditation request | ≥ 0.382 |

---

## SWARM 20 — NAVIGATOR (Planning, Scheduling, Routing) ✦ NEW

The compass. Plans schedules, optimizes routes, manages time, tracks goals, coordinates calendars.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 138 | `SchedulerBee` | Natural language to cron/schedule with φ-interval suggestions | Scheduling request | ≥ 0.382 |
| 139 | `GoalTrackerBee` | Tracks multi-step goals with progress visualization and milestone alerts | Goal created or updated | ≥ 0.618 |
| 140 | `RoutePlannerBee` | Optimizes multi-stop routes considering time, distance, priorities | Route planning request | ≥ 0.618 |
| 141 | `DeadlineWatcherBee` | Monitors approaching deadlines, sends escalating reminders at φ-intervals | Deadline within φ⁵ hours | ≥ 0.618 |
| 142 | `CalendarBee` | Manages calendar integration, finds optimal meeting times across zones | Calendar operation | ≥ 0.382 |
| 143 | `TimeBoxBee` | Suggests φ-proportioned time blocks for deep work, breaks, and review | Productivity coaching request | ≥ 0.382 |

---

## SWARM 21 — ALCHEMIST (Transformation, Evolution, Self-Improvement) ✦ NEW

The philosopher's stone. Drives platform evolution, optimizes parameters, discovers capabilities, measures growth.

| # | Bee Type | Role | Activation | CSL Gate |
|---|----------|------|------------|----------|
| 144 | `GROMBee` | Runs Golden Ratio Optimization Method for parameter tuning | Weekly evolution cycle | ≥ 0.718 |
| 145 | `A/BExperimentBee` | Designs, runs, and analyzes A/B tests with statistical rigor | Experiment hypothesis defined | ≥ 0.618 |
| 146 | `CapabilityScoutBee` | Scans MCP registries and API directories for new tools to integrate | Weekly scan | ≥ 0.618 |
| 147 | `ToolForgerBee` | Detects repetitive multi-step patterns and generates composite MCP tools | Pattern frequency > φ⁵ occurrences | ≥ 0.718 |
| 148 | `MetricsBee` | Tracks all system KPIs, detects regressions, celebrates improvements | Continuous | ≥ 0.0 |
| 149 | `AntiRegressionBee` | Stores guards in Neon pgvector preventing repeat of past failures | Post-fix for any P0/P1 bug | ≥ 0.718 |
| 150 | `WisdomCommitBee` | Extracts learnings from completed tasks, persists to knowledge graph | Task completion | ≥ 0.618 |

---

## Bee Lifecycle

```
                    ┌──────────┐
                    │  SPAWNED │ ←── BeeFactory allocates from pool
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  ACTIVE  │ ←── Executing assigned task
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼────┐ ┌──▼───┐ ┌───▼────┐
         │ SUCCESS │ │ FAIL │ │PREEMPT │
         └────┬────┘ └──┬───┘ └───┬────┘
              │         │         │
              └────┬────┘         │
                   │              │
              ┌────▼────┐   ┌────▼────┐
              │ REPORT  │   │  YIELD  │
              └────┬────┘   └────┬────┘
                   │              │
              ┌────▼──────────────▼────┐
              │      TERMINATED        │ ←── Returns to pool
              └────────────────────────┘
```

**Every bee reports**:
- `bee_id` (UUID)
- `bee_type` (one of 144)
- `swarm_id` (one of 21)
- `task_id` (parent task UUID)
- `status` (success | fail | preempt)
- `duration_ms` (execution time)
- `csl_score` (output quality 0.0–1.0)
- `tokens_consumed` (LLM tokens used)
- `cost_usd` (estimated cost)

---

## Swarm Coordination Patterns

### Stigmergic Communication
Bees communicate indirectly through shared Redis state:
```
tenant:{id}:pheromone:{swarm}:{signal_type} → {intensity, timestamp, source_bee}
```
Pheromone intensity decays at 1/φ per heartbeat cycle. Bees "smell" relevant pheromones and adjust behavior.

### φ-Ring Topology
All 21 swarms positioned on a ring at golden angle intervals (137.5°). This minimizes average communication hops:
```
Swarm position = (swarm_index × 137.508°) mod 360°
```
Adjacent swarms on the ring communicate directly; distant swarms route through intermediate swarms.

### Quorum Voting
Critical decisions require swarm quorum:
- **Simple quorum**: > 50% of active bees agree (routine tasks)
- **φ-quorum**: > 61.8% agree (reversible state changes)
- **Supermajority**: > 71.8% agree (irreversible actions: deploy, delete, trade)

### Swarm-to-Swarm Handoff Protocol
```
1. Source swarm emits HANDOFF pheromone with task vector
2. Target swarm's bees compute cos(task_vector, swarm_capability_vector)
3. If cosine ≥ CSL_INCLUDE (0.618) → accept handoff
4. If cosine < CSL_INCLUDE → reject, Overmind re-routes
5. Handoff logged with Trust Receipt (Ed25519 signature)
```

---

## Activation Matrix

Which swarms activate for which HCFullPipeline stages:

| Stage | Name | Primary Swarm(s) | Supporting Swarm(s) |
|-------|------|-------------------|---------------------|
| 1 | RECON | Librarian | Tensor, Emissary |
| 2 | INTAKE | Overmind | Tensor |
| 3 | CLASSIFY | Tensor | Overmind |
| 4 | TRIAGE | Overmind | Navigator |
| 5 | DECOMPOSE | Overmind | Topology |
| 6 | TRIAL_AND_ERROR | Forge | Sentinel |
| 7 | ORCHESTRATE | Overmind | All relevant |
| 8 | MONTE_CARLO | Dreamer | Quant, Oracle |
| 9 | ARENA | Tensor | Governance |
| 10 | EXECUTE | (task-specific) | Overmind |
| 11 | STREAM | Emissary | Persona |
| 12 | QUALITY_GATE | Tensor | Governance |
| 13 | PATTERN | Topology | Librarian |
| 14 | SELF_AWARENESS | Alchemist | Tensor |
| 15 | SELF_CRITIQUE | Alchemist | Dreamer |
| 16 | MISTAKE_ANALYSIS | Alchemist | Sentinel |
| 17 | AUTO_CORRECT | Forge | Alchemist |
| 18 | ANTI_REGRESSION | Alchemist | Librarian |
| 19 | WISDOM_COMMIT | Librarian | Topology |
| 20 | TRUST_RECEIPT | Governance | Sentinel |
| 21 | DELIVER | Emissary | Persona |
| 22 | DISTILL | Foundry | Librarian |

---

## BeeFactory Configuration

```javascript
// packages/heady-bee/bee-factory.js
export const BEE_FACTORY_CONFIG = {
  MAX_BEE_TYPES: 144,       // fib(12)
  MAX_CONCURRENT: 6765,      // fib(20)
  MAX_PER_SWARM: 34,         // fib(9)
  POOL_IDLE_TIMEOUT: 89_000, // fib(11) seconds
  SPAWN_BATCH_SIZE: 13,      // fib(7)
  HEALTH_INTERVAL: 29_034,   // φ⁷ ms
  SWARM_COUNT: 21,           // fib(8)
  HEARTBEAT_TTL: 34,         // fib(9) seconds (SETEX)
  PHEROMONE_DECAY: 0.618,    // 1/φ per cycle
};
```

---

*∞ Sacred Geometry · Liquid Intelligence · Permanent Life ∞*
*© 2026 HeadySystems Inc. — Eric Haywood, Founder*
