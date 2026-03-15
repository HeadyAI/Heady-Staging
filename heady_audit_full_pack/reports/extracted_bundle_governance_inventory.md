# Extracted Bundle — Governance Inventory

**Audit date:** 2026-03-10
**Bundles analyzed:**
- `heady-perplexity-full-system-context` (Perplexity bundle)
- `heady-system-build-current-state` (System-build bundle)
- `heady-full-rebuild-context` (Full-rebuild bundle)

---

## 1. Prime Directive & Master Directives

### Presence Across Bundles

| Document | Perplexity Bundle | Full-Rebuild Bundle |
|---|---|---|
| SYSTEM_PRIME_DIRECTIVE | `02-SYSTEM_PRIME_DIRECTIVE.md` | `prompts/SYSTEM_PRIME_DIRECTIVE.md` |
| UNBREAKABLE_LAWS | `03-UNBREAKABLE_LAWS.md` | `prompts/UNBREAKABLE_LAWS.md` |
| MASTER_DIRECTIVES | `04-MASTER_DIRECTIVES.md` | `prompts/MASTER_DIRECTIVES.md` |

The system-build bundle does not contain its own copies of these governance documents.

---

## 2. Laws (LAW-01 through LAW-08)

### Full-Rebuild Bundle — `laws/` Directory

**Source:** `heady-full-rebuild/laws/`

Contains 12 files — 8 laws with some having two naming variants (a longer canonical name and a shorter alias).

| Law | Canonical File | Alias File |
|---|---|---|
| LAW-01 | `LAW-01-thoroughness-over-speed.md` | `LAW-01-thoroughness.md` |
| LAW-02 | `LAW-02-solutions-not-workarounds.md` | `LAW-02-solutions-only.md` |
| LAW-03 | `LAW-03-context-maximization.md` | — |
| LAW-04 | `LAW-04-implementation-completeness.md` | — |
| LAW-05 | `LAW-05-cross-environment-purity.md` | `LAW-05-environment-purity.md` |
| LAW-06 | `LAW-06-ten-thousand-bee-scale.md` | — |
| LAW-07 | `LAW-07-auto-success-engine.md` | — |
| LAW-08 | `LAW-08-arena-mode-default.md` | `LAW-08-arena-mode.md` |

**Observation:** LAW-01, LAW-02, LAW-05, and LAW-08 each have two file variants. This suggests either an incomplete rename or intentional short/long alias pairs. The file contents may differ.

### Perplexity Bundle — Laws

Only LAW-07 is present as an individual file: `13-animal-archetypes/LAW-07-auto-success-engine.md`. The full law set is embedded within `03-UNBREAKABLE_LAWS.md`.

### System-Build Bundle — Laws

No standalone law files. Laws would be consumed from the upstream Perplexity or full-rebuild bundles.

---

## 3. Directives

### Full-Rebuild Bundle — `directives/` Directory

**Source:** `heady-full-rebuild/directives/`

4 consolidated directive files, grouping 10 directives into thematic clusters:

| File | Directives Covered | Theme |
|---|---|---|
| `DIR-01-02-03-awareness-generation-security.md` | DIR-01, DIR-02, DIR-03 | Awareness, generation, security |
| `DIR-04-05-orchestration-lifecycle.md` | DIR-04, DIR-05 | Orchestration, lifecycle |
| `DIR-06-07-08-persona-pipeline-learning.md` | DIR-06, DIR-07, DIR-08 | Persona, pipeline, learning |
| `DIR-09-10-multimodel-sacred-geometry.md` | DIR-09, DIR-10 | Multi-model, sacred geometry |

### Perplexity Bundle — Directives

No standalone directive files. Directive content is embedded within `04-MASTER_DIRECTIVES.md`.

### Reconciliation Document

`heady-perplexity-bundle/13-animal-archetypes/RECONCILIATION_DECISIONS.md` — documents conflict resolution decisions between directive sources.

---

## 4. Animal Archetypes & Personas

### Perplexity Bundle — 7 Animal Layers

**Source:** `heady-perplexity-bundle/13-animal-archetypes/`

| File | Animal | Layer Role |
|---|---|---|
| `ANT_TASK_LAYER.md` | Ant | Task decomposition and execution |
| `BEAVER_BUILD_LAYER.md` | Beaver | Build and construction |
| `DOLPHIN_CREATIVITY_LAYER.md` | Dolphin | Creative output |
| `EAGLE_OMNISCIENCE_LAYER.md` | Eagle | Omniscient awareness/monitoring |
| `ELEPHANT_MEMORY_LAYER.md` | Elephant | Long-term memory |
| `OWL_WISDOM_LAYER.md` | Owl | Wisdom and decision-making |
| `RABBIT_MULTIPLICATION_LAYER.md` | Rabbit | Scaling/replication |

### Full-Rebuild Bundle — 5 Archetype Files + 10 Personas

**Source:** `heady-full-rebuild/archetypes/`

| File | Animals Covered |
|---|---|
| `ARCH-01-owl-wisdom.md` | Owl |
| `ARCH-02-eagle-omniscience.md` | Eagle |
| `ARCH-03-dolphin-creativity.md` | Dolphin |
| `ARCH-04-rabbit-ant-elephant-beaver.md` | Rabbit, Ant, Elephant, Beaver (combined) |
| `ARCH-05-fox-lion-bee.md` | Fox, Lion, Bee (3 additional animals) |

**Source:** `heady-full-rebuild/personas/`

| File | Persona |
|---|---|
| `HEADY_MASTER_PROMPT.md` | Master prompt template |
| `HEADY_IMPLEMENTATION_GUIDE.md` | Implementation guide |
| `HEADY_PERSONA_OWL.md` | Owl persona |
| `HEADY_PERSONA_EAGLE.md` | Eagle persona |
| `HEADY_PERSONA_DOLPHIN.md` | Dolphin persona |
| `HEADY_PERSONA_RABBIT.md` | Rabbit persona |
| `HEADY_PERSONA_ANT.md` | Ant persona |
| `HEADY_PERSONA_ELEPHANT.md` | Elephant persona |
| `HEADY_PERSONA_BEAVER.md` | Beaver persona |
| `HEADY_PERSONA_FOX.md` | Fox persona |
| `HEADY_PERSONA_LION.md` | Lion persona |
| `HEADY_PERSONA_BEE.md` | Bee persona |

**Observation:** The full-rebuild bundle has 10 animal personas (7 original + Fox, Lion, Bee). The Perplexity bundle only has the original 7 animal layers (no Fox, Lion, Bee).

---

## 5. Pipeline References

### Perplexity Bundle

| File | Purpose |
|---|---|
| `05-heady-auto-context.js` | Auto-context engine (pipeline pre-processing) |
| `08-bee-factory.js` | Bee factory (pipeline worker spawning) |
| `09-swarm-coordinator.js` | Swarm coordinator (pipeline dispatch) |
| `10-seventeen-swarm-orchestrator.js` | 17-swarm orchestrator (pipeline orchestration) |
| `11-HEADY_CONTEXT.md` | System context document for pipeline awareness |

### Full-Rebuild Bundle

| File | Purpose |
|---|---|
| `source-reference/pipeline-core.js` | Pipeline core implementation |
| `source-reference/hc-full-pipeline-v3.js` | Full pipeline v3 |
| `configs/hcfullpipeline-canonical.json` | Canonical pipeline config |
| `shared/csl-engine.js` | CSL engine (pipeline gate logic) |
| `shared/phi-math.js` | Phi-math constants (pipeline timing) |
| `shared/sacred-geometry.js` | Sacred geometry computations |

### System-Build Bundle

| File | Purpose |
|---|---|
| `services/heady-pipeline-core/` | Pipeline core service scaffold (port 3332) |
| `services/heady-manager/` | Manager service (21-stage pipeline controller) |

### Pipeline Stage Prompts (Full-Rebuild Only)

**Source:** `heady-full-rebuild/stage-prompts/`

7 stage prompt files defining pipeline execution stages:

| File | Pipeline Stage |
|---|---|
| `STAGE_RECON.md` | Reconnaissance — initial information gathering |
| `STAGE_SELF_AWARENESS.md` | Self-awareness — system state assessment |
| `STAGE_TRIAL_AND_ERROR.md` | Trial and error — experimental execution |
| `STAGE_MISTAKE_ANALYSIS.md` | Mistake analysis — error evaluation |
| `STAGE_CONTINUOUS_SEARCH.md` | Continuous search — ongoing refinement |
| `STAGE_OPTIMIZATION_OPS.md` | Optimization — performance tuning |
| `STAGE_EVOLUTION.md` | Evolution — adaptation and learning |

---

## 6. Enforcement & Compliance

### Full-Rebuild Bundle

| File | Purpose |
|---|---|
| `enforcement/ENF-anti-shortcut-no-placeholder.md` | Anti-shortcut enforcement rule |
| `configs/self-healing.yaml` | Self-healing configuration |
| `configs/slo-definitions.yaml` | SLO definitions |
| `configs/supervisor-hierarchy.yaml` | Supervisor hierarchy |
| `configs/workload-partitioning.yaml` | Workload partitioning rules |
| `configs/phi-scales.yaml` | Phi-scale constants |
| `configs/sacred-geometry.yaml` | Sacred geometry constants |

### Full-Rebuild Audit Reports

**Source:** `heady-full-rebuild/audit/`

| File | Purpose |
|---|---|
| `DEEP-SCAN-AUDIT-REPORT.md` | Deep scan audit results |
| `HEADY_DEEP_SCAN_ANALYSIS.md` | Deep scan analysis |
| `RECONCILIATION-MATRIX.md` | Cross-source reconciliation matrix |
| `UNIMPLEMENTED_SERVICES_AUDIT.md` | Unimplemented services audit |
| `repo-scan-report.md` | Repository scan report |

### Full-Rebuild Documentation

**Source:** `heady-full-rebuild/docs/`

| File | Purpose |
|---|---|
| `COGNITION-README.md` | Cognitive system documentation |
| `MIGRATION-GUIDE.md` | Migration guide |
| `PHI_COMPLIANCE_SCORECARD.md` | Phi-math compliance scorecard |
| `WIRING_GUIDE.md` | Service wiring guide |

### Full-Rebuild Cognitive Prompts

| File | Purpose |
|---|---|
| `prompts/COGNITIVE_FUSION_RUNTIME.md` | Cognitive fusion runtime prompt |
| `prompts/NODE_TOPOLOGY.md` | Node topology reference |

---

## 7. Perplexity Bundle — Drupal CMS Governance

**Source:** `heady-perplexity-bundle/14-drupal-config/`

Drupal modules providing platform governance and content management:

| Module | Purpose |
|---|---|
| `heady_admin` | Admin dashboard, service management, HeadyLens, HCFP views, access control |
| `heady_cms` | Content manager, task browser, Liquid dashboard, clipboard, content API |
| `heady_control` | Operational dashboard |
| `heady_config` | Configuration management |
| `heady_content` | Content types and schemas |
| `heady_sites` | Multi-site taxonomy |
| `heady_tasks` | Task management |

Includes `setup-heady-drupal.sh` bootstrap script and `docker-compose.yml` for local Drupal setup.

---

## 8. System-Build Bundle — Gap Analysis & Status

**Source:** `heady-system-build/GAPS_FOUND.md`

Documented issues found during the most recent build pass:

| # | Issue | Resolution |
|---|---|---|
| 1 | `headyos.com` contained forbidden wording (`hot-reload`) in site-registry | Replaced with `live sync` |
| 2 | Service generator count mismatch (51 vs 50) | Removed extra entry |
| 3 | Python `.format()` template bug in service generator | Escaped template braces |
| 4 | Stale language in docs (`CLOSED/OPEN/HALF_OPEN`, `heady-hot-cold-router`) | Updated to concurrent-equals wording |

**Remaining gaps** (not verified in the build pass):
- No simultaneous launch of all 50 services
- No full docker-compose bring-up
- No full health sweep across all services
- No cross-domain browser sign-in verification
- No Drupal content-type install verification
- No infrastructure validation (certificates, Consul mesh, OTLP export)

---

## 9. Cross-Bundle Governance Mismatches

### Animal Count Discrepancy
- **Perplexity:** 7 animals (Ant, Beaver, Dolphin, Eagle, Elephant, Owl, Rabbit)
- **Full-rebuild archetypes:** 10 animals (adds Fox, Lion, Bee)
- **Full-rebuild personas:** 10 personas (same 10 as archetypes)
- Fox, Lion, and Bee are absent from the Perplexity bundle entirely.

### Law File Duplication
- Full-rebuild `laws/` has 12 files for 8 laws (4 laws have two naming variants).
- The canonical names (`-thoroughness-over-speed`, `-solutions-not-workarounds`, `-cross-environment-purity`, `-arena-mode-default`) and short names (`-thoroughness`, `-solutions-only`, `-environment-purity`, `-arena-mode`) coexist. This may indicate incomplete migration from short to long names.

### Directive Organization
- Perplexity embeds all directives inline within `MASTER_DIRECTIVES.md`.
- Full-rebuild splits them into 4 thematic files (DIR-01-02-03, DIR-04-05, DIR-06-07-08, DIR-09-10) plus keeps a `prompts/MASTER_DIRECTIVES.md` copy.
- Potential for the split versions and the monolithic version to drift.

### Configuration Version Alignment
- Perplexity registry: v3.2.0 (updated 2026-02-08)
- System-build SERVICE_INDEX: v3.2.3 (generated 2026-03-09)
- Full-rebuild domains.yaml: v3.2.3
- Full-rebuild heady-registry.json: v3.2.3 (updated 2025-01-01 — stale `updatedAt` field)
- The Perplexity bundle is one minor version behind the other two.

### MCP Tool Count
- Perplexity registry: "31 registered tools"
- Full-rebuild registry: "31 registered tools"
- System-build SERVICE_INDEX: "42 registered MCP tools"
- System-build claims 11 more MCP tools than the other two sources.

### Prompt Context Document
The Perplexity bundle includes `00-THIS-PROMPT.md` and `11-HEADY_CONTEXT.md` — framing documents that provide system prompt context for Perplexity sessions. These have no counterpart in the other bundles and represent a Perplexity-specific integration layer.
