# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: HeadyMemory Operations
# HEADY_BRAND:END

# /heady-memory — HeadyMemory 3-Tier Vector Memory Operations

Triggered when user says `/heady-memory` or asks about memory, latent space,
vector storage, consolidation, or memory tiers.

## Instructions

You are operating the HeadyMemory system — the 3-tier latent-space vector
memory that gives HeadyBuddy persistent learning across sessions.

### Memory Tier Architecture

#### T0: Working Memory (In-Memory + Redis)
- **Capacity:** 21 context capsules (fib(8))
- **TTL:** Session-bound
- **Embedding:** 1536D
- **Contents per capsule:** task_vector, active_bee_roster, pipeline_stage,
  drift_window (last 11 hashes), confidence_state, autocontext_payload
- **Eviction:** φ-weighted score = f(c) × r(c) × CSL(c, task) / φ
  - Lowest score evicted when count > 21

#### T1: Short-Term Memory (PostgreSQL + pgvector HNSW)
- **Capacity:** 144K vectors (fib(12) × 1000)
- **TTL:** 47 hours (φ⁸)
- **HNSW config:** m=16, ef_construction=64, ef_search=89 (fib(11))
- **Consolidation weights:** access_freq (0.415), reinforcement (0.256),
  importance (0.159), similarity_to_T2 (0.170)
- **Promote to T2:** score ≥ ψ (0.618)
- **Allow to expire:** score < ψ² (0.382)
- **TTL extension:** φ⁴ ≈ 6.85 hours if between thresholds

#### T2: Long-Term Memory (PostgreSQL + pgvector, partitioned)
- **Capacity:** Unlimited (partitioned by epoch)
- **Sub-spaces:**
  - **Semantic:** Facts, knowledge, patterns (decay: ψ⁴ = 0.146/epoch)
  - **Episodic:** Executions, conversations, incidents (decay: ψ² = 0.382/epoch)
  - **Procedural:** Optimal configs per domain (decay: 0 — write-once-update-only)
- **Partitions:** Hot (0-21d), Warm (21-55d), Cold (55-144d), Archive (144d+)
- **ef_search per partition:** 144, 89, 55, 34 (Fibonacci sequence)

### Consolidation Cycles
| Cycle | Interval | Action |
|-------|----------|--------|
| T0 → T1 | 21 hours (fib(8)) | Evict stale capsules |
| T1 → T2 | 6.85 hours (φ⁴) | Score-based promotion sweep |
| T2 Hot → Warm | 55 hours (fib(10)) | Partition transition |
| T2 Warm → Cold | 144 hours (fib(12)) | Partition transition |
| T2 Cold → Archive | 377 hours (fib(14)) | Archive + HNSW rebuild |

### φ-Decay Field Dynamics
The memory field evolves according to:
```
∂ϕ/∂t = D/(1+αI) ∇²ϕ - λ/(1+αI) ϕ + S(x, t)
```
- **Diffusion:** Memories spread semantic influence to neighbors
- **Decay:** Unaccessed memories fade exponentially
- **Importance:** High-importance memories resist spreading and forgetting
- **Source injection:** New memories enter as Gaussian perturbations

Importance evolution:
```
∂I/∂t = -ψ² × I + φ × A(x, t)
```
- Decay rate: ψ² = 0.382 baseline
- Access boost: φ = 1.618 per access event

### 3D Latent Space Projection
Vectors stored at full 1536D. 3D projection for visualization:
- **X axis:** Semantic domain (what it's about)
- **Y axis:** Temporal recency (when last accessed)
- **Z axis:** Importance / access frequency

### Operations
When asked about memory:
1. Report current fill levels per tier (T0 capsules, T1 vectors, T2 partitions)
2. Show consolidation schedule and last cycle timestamps
3. Report drift scores from drift window
4. Show top-k memories by importance in each sub-space
5. Diagnose any memory health issues (orphaned vectors, failed consolidations)

### Reference Config
Full specification: `configs/liquid-os/heady-memory.yaml`
