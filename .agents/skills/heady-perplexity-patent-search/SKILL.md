---
name: heady-perplexity-patent-search
description: Skill for searching and analyzing patent landscapes using Perplexity for HeadySystems IP portfolio development. Use when asked to search for patents, analyze prior art, assess patentability, map the IP landscape, or research competitors' patent portfolios. HeadySystems holds 60+ provisional patents. Triggers on "patent", "prior art", "IP landscape", "patentability", "patent search", "provisional patent", or any intellectual property research task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: ip-strategy
---

# Heady Perplexity Patent Search

## When to Use This Skill

Use this skill when:

- Searching for prior art before filing new provisional patents
- Analyzing competitor patent portfolios (OpenAI, Anthropic, Google DeepMind, Mistral)
- Mapping white space in the AI agent orchestration patent landscape
- Evaluating claims for new HeadySystems innovations
- Researching φ-scaling, vector memory, and swarm orchestration patents
- Preparing IP landscape reports for investor presentations

## Core Patent Domains (HeadySystems Focus Areas)

| Domain | Description |
|--------|-------------|
| Vector Memory Architecture | 3D octree spatial retrieval, 384-dim CSL gates |
| Swarm Orchestration | 17-swarm concurrent dispatch, phi-ratio allocation |
| Sacred Geometry Scaling | φ-continuous parameter scaling in distributed systems |
| AutoContext Injection | Pre-action context enrichment middleware |
| CSL Routing | Cosine Similarity Layer for deterministic AI routing |
| Multi-model Council | Competitive AI provider evaluation systems |
| HCFullPipeline | 21-stage cognitive state machine |
| Bee Architecture | Hierarchical concurrent AI worker pools |

## Instructions

### Step 1 — Define Search Scope

For each patent search, document:
- **Innovation description**: 2-3 sentence plain-language summary
- **Claim elements**: list of specific technical elements
- **Key prior art dates**: when was this first implemented in Heady?
- **Classification codes** (IPC/CPC): G06N (AI), G06F (data processing), H04L (networks)

### Step 2 — Search Sources

Execute searches across:
1. **USPTO Full-Text** (patents.google.com): primary US patent database
2. **European Patent Office** (espacenet.com): EP and PCT applications
3. **Google Patents** (patents.google.com): broadest coverage
4. **Semantic Scholar**: for academic prior art
5. **ArXiv**: for algorithm prior art

Search queries should use both technical terms AND their synonyms:
- "cosine similarity routing" AND "semantic distance-based routing" AND "embedding-based request dispatch"

### Step 3 — Prior Art Assessment Matrix

For each found patent/paper:

| Field | Value |
|-------|-------|
| Patent/Paper ID | |
| Title | |
| Filing/Publication Date | |
| Claims Overlap % | 0-100 |
| Key Differentiator | What Heady does differently |
| Risk Level | None / Watch / Concern |

### Step 4 — Gap Analysis

Identify patentable white space by documenting:
- What exists in prior art
- What HeadySystems does differently (the delta)
- Why the delta is novel, non-obvious, and useful
- Provisional patent claim language draft (independent claim + 2 dependent claims)

### Step 5 — Output Format

```markdown
## Patent Landscape Report: {Innovation Name}

### Executive Summary
{2-3 sentences on patentability assessment}

### Prior Art Found ({N} references)
| ID | Date | Title | Overlap | Risk |

### White Space Analysis
{description of what is NOT covered by prior art}

### Draft Claim Language
Independent Claim 1: A method for {core innovation}...

### Recommendation
{STRONG / MODERATE / WEAK patentability with reasoning}

### Filing Timeline Suggestion
{based on provisonal → PCT → national phase timeline}
```

## Examples

**Input**: "Search for patents on phi-scaled timeout backoff in distributed systems"
**Output**: Prior art matrix showing no exact matches for φ-based retry intervals in AI agent systems, with draft claim language for provisional patent

**Input**: "Map competitor AI agent orchestration patents from 2020-2026"
**Output**: Landscape map of OpenAI, Google, Meta, Anthropic AI agent patents with HeadySystems differentiation analysis
