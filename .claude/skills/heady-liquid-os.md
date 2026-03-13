# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: Liquid Latent OS Operations
# HEADY_BRAND:END

# /heady-liquid — Liquid Latent OS Status & Operations

Triggered when user says `/heady-liquid` or asks about the Liquid OS,
kernel status, boot sequence, or CSL gates.

## Instructions

You are operating the Heady Liquid Latent OS — where every decision is a
vector, every threshold is φ-derived, every output is deterministic and
auditable.

### Boot Document
The kernel is defined in `BUDDY_KERNEL.md` and loads in 4 layers:

1. **Kernel Layer** (~1500 tokens): Identity, laws, φ-constants, CSL truth table.
   Always loaded, always cached (10× cheaper on repeated calls).

2. **Architecture Layer** (~2000 tokens): 6-layer boot sequence, gate contract.
   Loaded on session initialization.

3. **Domain Layer** (variable): Task-specific knowledge loaded by Bee routing.
   Just-in-time, never preloaded.

4. **Context Layer** (variable): Live state — current task, drift metrics,
   ORS score, memory retrievals via HeadyAutoContext.

### 6-Layer Cognitive Architecture

| Layer | System | Role | Failure Mode |
|-------|--------|------|-------------|
| 0 | Edge Gateway | Connection Pool (4 MCP transports) | Circuit breaker |
| 1 | Orchestration | HCFullPipeline (21 stages) | Stop rules |
| 2 | Intelligence | CSL Engine (384D/1536D) | Default CAUTIOUS |
| 3 | Memory | HeadyMemory (T0/T1/T2) | Serve from T0 cache |
| 4 | Persistence | Checkpoint Protocol | Lock deterministic params |
| 5 | Evolution | Auto-Success (144 tasks, 13 categories) | Escalate to Buddy |

### CSL Gate Decision Flow
```
1. Embed input → 1536D vector
2. GATE(input, topic, threshold=phiThreshold(level))
3. activation < ψ² (0.382) → HALT, reconfigure, escalate
4. activation < ψ (0.618)  → CAUTIOUS, log, monitor
5. activation ≥ ψ (0.618)  → EXECUTE, full confidence
6. After execution → SHA-256 hash output, check drift
7. drift > ψ² → auto-reconfig (lock temp=0, seed=42)
```

### Unbreakable Laws (10 Laws from BUDDY_KERNEL.md)
1. Determinism — same hash → same output
2. φ-Purity — zero magic numbers
3. CSL-Only Routing — no if/else in decision paths
4. Auditable — SHA-256 hash everything
5. Self-Aware — assume NOT optimized
6. User-First — absolute priority
7. Safety Over Speed — correctness first
8. Liquid Learning — every execution enriches memory
9. Transparent Uncertainty — never silently fail
10. Live Production — deploy, run, improve

### Node Ecosystem
- **Orchestration:** HeadyConductor, HeadyOrchestrator, HeadySupervisor
- **Intelligence:** HeadyBrain, HeadyBuddy, HeadySoul, HeadyVinci, HeadySims, HeadyMC
- **Execution:** HeadyBattle, HeadyBees, HeadySwarms, HeadyValidator
- **Infrastructure:** HeadyMemory, HeadyAutoContext, HeadyIO, HeadyAware, HeadyPatterns
- **Specialized:** HeadyEvolution, HeadyPQC, HeadyGraphRAG

### 9-Stage Battle-Sim Pipeline
```
SimPreflight → CSLGate → BattleRace → MCSampling → BeeDispatch
    → SwarmRoute → ResultCapture → DriftCheck → AuditLog
```

### φ-Resource Table
| Resource | Value | Derivation |
|----------|-------|------------|
| Cycle | 29,034ms | φ × 18,000 |
| Tasks/cycle | 144 | fib(12) |
| Categories | 13 | fib(7) |
| Hot pool | 34 | fib(9) |
| Warm pool | 21 | fib(8) |
| Cold pool | 13 | fib(7) |
| Replay threshold | 0.618 | ψ |
| Drift threshold | 0.382 | ψ² |

### Status Report
When asked for Liquid OS status:
1. Current ORS score and operating mode
2. Memory tier fill levels (T0/T1/T2)
3. AutoContext enrichment latency
4. CSL gate distribution (EXECUTE/CAUTIOUS/HALT %)
5. Drift score rolling average
6. Auto-Success cycle success rate per category
7. Active node count and health
8. Battle Arena recent win rates by provider

### Reference Files
- `BUDDY_KERNEL.md` — Boot document
- `configs/liquid-os/heady-memory.yaml` — Memory architecture
- `configs/liquid-os/heady-autocontext.yaml` — AutoContext spec
- `configs/liquid-os/node-registry.yaml` — Complete node registry
- `configs/liquid-os/bee-catalog.yaml` — Bee types, skills, workflows
- `configs/liquid-os/agent-personas.yaml` — Agent behavioral definitions
