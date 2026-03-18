# Heady 17-Swarm Bee Catalog — Skill File 13

## Overview

The Heady 17-Swarm Matrix organizes 89 bee types (fib(11)) into functional clusters with max capacity of 6,765 concurrent bees (fib(20)).

## I. Management Core

### Swarm 1: OVERMIND (Decision)
| Bee | Role | Persistence |
|-----|------|-------------|
| OrchestratorBee | Primary task router — breaks intents into subtasks | Persistent |
| OvermindDirectorBee | Strategic planning — decides which swarms to activate | Persistent |
| PriorityResolverBee | CSL-scored priority ranking across competing tasks | Persistent |
| DecompositionBee | DAG generator — topologically-sorted subtask graphs | Ephemeral |
| EscalationBee | Detects stuck tasks, triggers human gate | Persistent |

### Swarm 2: GOVERNANCE (Security)
| Bee | Role | Persistence |
|-----|------|-------------|
| AuditBee | Records every action to immutable audit chain | Persistent |
| ComplianceBee | Verifies actions against regulatory rules | Persistent |
| PermissionGuardBee | RBAC enforcement — validates scoped tokens | Persistent |
| SecretScannerBee | Scans for leaked credentials in code/logs | Persistent |
| PatentZoneGuardBee | Protects Patent Lock zones (60+ provisionals) | Persistent |

## II. Functional Core

### Swarm 3: FORGE (Code Production)
ASTMutatorBee, HologramBee, ChaosTesterBee, ContextWeaverBee, RefactorBee, TestGeneratorBee, LiveCoderBee — all Ephemeral, scales 5–89.

### Swarm 4: EMISSARY (Docs/MCP/SDK)
DocumentationBee, MCPProtocolBee, SDKPublisherBee, OpenAPIBee, ChangelogBee.

### Swarm 5: FOUNDRY (Model Training)
DataCuratorBee, TrainingOrchestratorBee, EvalBee, SyntheticDataBee.

### Swarm 6: STUDIO (Audio/MIDI)
CloudMIDIBee, DAWBridgeBee (Ableton Link), SysExReceiverBee, SequencerBee, AudioAnalysisBee.

## III. Business & Ecosystem

### Swarm 7: ARBITER (Law & IP)
PatentHarvestBee, LicenseComplianceBee, IPProtectionBee, ContractAnalyzerBee.

### Swarm 8: DIPLOMAT (B2B)
ProcurementBee (Stripe/GCP billing), RateLimitNegotiatorBee, VendorHealthBee, PartnerOnboardingBee.

### Swarm 9: ORACLE (Economics)
CostTrackerBee, BudgetGuardianBee (φ-scaled thresholds: 38.2%, 61.8%, 80%), ROICalculatorBee, PricingModelBee.

### Swarm 10: QUANT (Trading)
MarketAnalyzerBee, RiskManagerBee (Monte Carlo), BacktestBee, SentimentBee (NLP), ExecutionBee.

## IV. Applied Reality & Defense

### Swarm 11: FABRICATOR (IoT/CAD)
IoTEnvironmentBee (Home Assistant), CADMutatorBee (STL/STEP), EnvironmentSensorBee, 3DPrintBee.

### Swarm 12: PERSONA (Cognitive Alignment)
BioSyncBee, PersonaPersistenceBee, PreferenceLearnerBee, EmotionDetectorBee, ContextContinuityBee.

### Swarm 13: SENTINEL (Defense)
ThreatDetectorBee, VulnScannerBee, IncidentResponderBee, ChaosEngineerBee, LocalhostScannerBee, IntrusionDetectorBee.

### Swarm 14: NEXUS (Web3)
SmartContractBee (Ethereum/Solana), TokenizationBee, DIDVerifierBee.

### Swarm 15: DREAMER (Simulations)
MonteCarloEngineBee (1K–10K scenarios), WhatIfPlannerBee, PredictiveBee, ShadowDeployBee.

## V. Mathematical Core

### Swarm 16: TENSOR (CSL Logic)
ResonanceBee (IF gate), SuperpositionBee (AND gate), OrthogonalBee (NOT gate), GateBee, EmbeddingBee (384-dim).

### Swarm 17: TOPOLOGY (Spatial)
ManifoldBee (PCA→k-means→Shannon), EntanglementBee, ProjectionBee (384→3D), OctantBee.

## Infrastructure Nodes

**Persistent (Always Running):** HeadyManager, HeadyMCP, HeadyEdge, HeadyBuddy, HeadyBrain, HeadySoul, HeadyVinci, HeadyConductor.

**Ephemeral (Burst — Colab Pro+):** VALU Tensor Core (A100), HeadySims (A100), HeadyBattle (T4), Foundry (A100), Local Dev (Ryzen 9/32GB).
