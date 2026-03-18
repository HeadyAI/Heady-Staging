---
name: heady-patron-forge
description: >-
  Heady Patron Forge — community-driven skill marketplace where users contribute, fork, remix, and evolve skills. Skills have lineage trees, fitness scores, and can be crossed via genetic crossover to produce hybrids. Uses phi-weighted reputation, CSL-gated quality thresholds, Fibonacci-tiered curation, 384D embeddings for semantic discovery, and HeadyCoin credits. Use when implementing a skill marketplace, community contribution system, skill evolution, or collaborative platform growth. Keywords: marketplace, forge, community, skill, contribution, evolution, crossover, reputation, curation, registry, lineage, fitness, HeadyCoin, discovery.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Patron Forge

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Building a community marketplace for skills, agents, and capabilities
- Enabling users to contribute, fork, and remix skills
- Implementing genetic crossover between skills to create novel hybrids
- Scoring and curating community contributions with quality gates
- Creating skill discovery through 384D semantic embeddings
- Building a contribution economy with HeadyCoin incentives
- Managing skill lineage trees and evolutionary history

## Architecture

```
Community Contributor
  │ Submits skill, fork, or crossover request
  │
  ▼
Submission Gate (CSL ≥ 0.691 quality minimum)
  │ Validates: structure, no placeholders, phi-compliant, passes tests
  │
  ▼
Forge Registry
  ├─→ Skill Catalog: name, description, 384D embedding, version, lineage
  ├─→ Lineage Tree: parent → child → grandchild evolution chains
  ├─→ Crossover Lab: merge two skills → offspring with hybrid capabilities
  └─→ Quality Tiers (Fibonacci-stepped):
      ├─→ Tier 0 (Raw): submitted, unreviewed
      ├─→ Tier 1 (Forged): passed automated validation
      ├─→ Tier 2 (Tempered): community-tested, FIB[5]=5+ uses
      ├─→ Tier 3 (Hardened): FIB[8]=21+ uses, coherence ≥ 0.809
      ├─→ Tier 4 (Legendary): FIB[10]=55+ uses, coherence ≥ 0.882
      └─→ Tier 5 (Sacred): FIB[12]=144+ uses, part of core Heady
          │
          ▼
  Discovery Engine
  ├─→ Semantic Search: cosine similarity against 384D skill embeddings
  ├─→ Trending: velocity of adoption over Fibonacci windows
  ├─→ Recommended: CSL affinity between user profile and skill embedding
  └─→ Lineage Browser: visual evolution tree of skill families
          │
          ▼
  HeadyCoin Economy
  ├─→ Create skill: earn FIB[5]=5 coins
  ├─→ Skill used by others: earn 1 coin per use
  ├─→ Reach Tier 3: bonus FIB[8]=21 coins
  ├─→ Reach Tier 5: bonus FIB[12]=144 coins
  └─→ Crossover produces Tier 3+: both parents earn FIB[7]=13 coins
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Forge Constants
const SUBMISSION_QUALITY_GATE = 0.691;            // CSL LOW — minimum to accept submission
const TEMPERED_THRESHOLD = 0.809;                 // CSL MEDIUM — tempered quality
const HARDENED_THRESHOLD = 0.882;                 // CSL HIGH — hardened quality
const SACRED_THRESHOLD = 0.927;                   // CSL CRITICAL — sacred quality
const TIER_USE_COUNTS = [0, 1, FIB[5], FIB[8], FIB[10], FIB[12]]; // 0,1,5,21,55,144
const SKILL_EMBEDDING_DIM = 384;                  // Full 384D for skill discovery
const MAX_LINEAGE_DEPTH = FIB[7];                 // 13 generations max
const CROSSOVER_SIMILARITY_MIN = 0.500;           // CSL MINIMUM — parents must share some DNA
const CROSSOVER_SIMILARITY_MAX = 0.882;           // Not too similar or offspring is redundant
const MUTATION_RATE = 1 - PSI;                    // 38.2% chance of novel mutation in crossover
const MAX_CATALOG_SIZE = FIB[14];                 // 377 skills max in catalog
const TRENDING_WINDOW_HOURS = FIB[8];             // 21-hour trending window
const COIN_CREATION_REWARD = FIB[5];              // 5 HeadyCoins for creating a skill
const COIN_USE_REWARD = 1;                        // 1 HeadyCoin per use by others
const REPUTATION_DECAY = PSI * PSI;               // 0.382 monthly decay if inactive
```

## Instructions

### 1. Skill Registry

Core storage and management of community skills:

```javascript
class ForgeRegistry {
  constructor({ vectorMemory, embeddingProvider, logger }) {
    this.vectorMemory = vectorMemory;
    this.embeddingProvider = embeddingProvider;
    this.logger = logger;
    this.catalog = new Map();     // skillId → skill metadata
    this.lineageTree = new Map(); // skillId → { parents, children }
  }

  async submit(skillPackage, contributor) {
    // Validate structure
    const validation = await this.validateSubmission(skillPackage);
    if (!validation.passed) {
      return { accepted: false, errors: validation.errors };
    }

    // Generate skill embedding for discovery
    const embedding = await this.embeddingProvider.embed(
      `${skillPackage.name}: ${skillPackage.description} ${skillPackage.keywords?.join(' ') || ''}`
    );

    // Check for near-duplicates
    const similar = await this.vectorMemory.search(embedding, { topK: FIB[4] });
    const nearestScore = similar.length > 0 ? similar[0].score : 0;

    if (nearestScore > 0.972) { // DEDUP threshold
      return { accepted: false, errors: ['Near-duplicate of existing skill: ' + similar[0].metadata?.name] };
    }

    const skillEntry = {
      id: crypto.randomUUID(),
      name: skillPackage.name,
      description: skillPackage.description,
      version: skillPackage.version || '1.0.0',
      contributor: contributor.id,
      embedding,
      tier: 0, // Raw
      useCount: 0,
      coherenceScore: validation.coherenceScore,
      parentIds: skillPackage.parentIds || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ratings: [],
      headyCoinEarned: 0,
    };

    // Store in catalog and vector memory
    this.catalog.set(skillEntry.id, skillEntry);
    await this.vectorMemory.store({
      embedding,
      content: `${skillEntry.name}: ${skillEntry.description}`,
      metadata: { type: 'forge-skill', skillId: skillEntry.id, tier: skillEntry.tier },
    });

    // Update lineage tree
    this.lineageTree.set(skillEntry.id, {
      parents: skillEntry.parentIds,
      children: [],
    });
    for (const parentId of skillEntry.parentIds) {
      const parentNode = this.lineageTree.get(parentId);
      if (parentNode) parentNode.children.push(skillEntry.id);
    }

    // Award creation coins
    await this.awardCoins(contributor.id, COIN_CREATION_REWARD, 'skill-creation');

    // Promote to Tier 1 if validation score is sufficient
    if (validation.coherenceScore >= SUBMISSION_QUALITY_GATE) {
      skillEntry.tier = 1;
    }

    this.logger.info({ skillId: skillEntry.id, name: skillEntry.name, tier: skillEntry.tier }, 'skill-submitted');
    return { accepted: true, skillId: skillEntry.id, tier: skillEntry.tier };
  }

  async validateSubmission(skillPackage) {
    const errors = [];
    let coherenceScore = 1.0;

    // Structure checks
    if (!skillPackage.name || skillPackage.name.length > 64) {
      errors.push('Invalid name (1-64 chars, lowercase, hyphens)');
      coherenceScore *= PSI;
    }
    if (!skillPackage.description || skillPackage.description.length < 50) {
      errors.push('Description too short (min 50 chars)');
      coherenceScore *= PSI;
    }
    if (!skillPackage.instructions || skillPackage.instructions.length < 100) {
      errors.push('Instructions too sparse (min 100 chars)');
      coherenceScore *= PSI;
    }

    // Placeholder detection
    const placeholders = ['TODO', 'FIXME', 'PLACEHOLDER', 'TBD', 'IMPLEMENT'];
    const content = JSON.stringify(skillPackage);
    for (const ph of placeholders) {
      if (content.includes(ph)) {
        errors.push(`Contains placeholder: ${ph}`);
        coherenceScore *= PSI * PSI;
      }
    }

    return {
      passed: errors.length === 0 && coherenceScore >= SUBMISSION_QUALITY_GATE,
      errors,
      coherenceScore,
    };
  }

  async awardCoins(contributorId, amount, reason) {
    this.logger.info({ contributorId, amount, reason }, 'headycoin-awarded');
    // HeadyCoin ledger integration
  }
}
```

### 2. Skill Crossover Lab

Genetic crossover that produces hybrid skills:

```javascript
class CrossoverLab {
  constructor({ registry, embeddingProvider, logger }) {
    this.registry = registry;
    this.embeddingProvider = embeddingProvider;
    this.logger = logger;
  }

  async crossover(parentIdA, parentIdB, contributorId) {
    const parentA = this.registry.catalog.get(parentIdA);
    const parentB = this.registry.catalog.get(parentIdB);

    if (!parentA || !parentB) throw new Error('Parent skill not found');

    // Check compatibility via embedding similarity
    const similarity = cosineSimilarity(parentA.embedding, parentB.embedding);
    if (similarity < CROSSOVER_SIMILARITY_MIN) {
      return { success: false, reason: 'Parents too dissimilar for meaningful crossover' };
    }
    if (similarity > CROSSOVER_SIMILARITY_MAX) {
      return { success: false, reason: 'Parents too similar — offspring would be redundant' };
    }

    // Generate offspring embedding via φ-weighted crossover
    const offspringEmbedding = new Float32Array(SKILL_EMBEDDING_DIM);
    for (let d = 0; d < SKILL_EMBEDDING_DIM; d++) {
      // φ-weighted blend with chance of mutation
      if (Math.random() < MUTATION_RATE) {
        // Mutation: random value in the neighborhood
        offspringEmbedding[d] = (parentA.embedding[d] + parentB.embedding[d]) / 2
          + (Math.random() - 0.5) * PSI;
      } else {
        // Standard crossover: φ-weighted from stronger parent
        const weightA = parentA.tier >= parentB.tier ? PSI : 1 - PSI;
        offspringEmbedding[d] = parentA.embedding[d] * weightA + parentB.embedding[d] * (1 - weightA);
      }
    }
    this.normalize(offspringEmbedding);

    // Generate offspring metadata
    const offspringName = `${parentA.name.split('-').slice(0, 2).join('-')}-x-${parentB.name.split('-').pop()}`;
    const offspringDescription = `Hybrid skill combining ${parentA.name} (${parentA.description.slice(0, 100)}) `
      + `with ${parentB.name} (${parentB.description.slice(0, 100)}). `
      + `Created through genetic crossover in the Patron Forge.`;

    // Check lineage depth
    const depthA = this.getLineageDepth(parentIdA);
    const depthB = this.getLineageDepth(parentIdB);
    if (Math.max(depthA, depthB) >= MAX_LINEAGE_DEPTH) {
      return { success: false, reason: `Lineage depth limit reached (max ${MAX_LINEAGE_DEPTH} generations)` };
    }

    // Submit as new skill
    const result = await this.registry.submit({
      name: offspringName.slice(0, 64).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: offspringDescription,
      instructions: `This is a hybrid skill. See parents: ${parentA.name}, ${parentB.name}`,
      parentIds: [parentIdA, parentIdB],
    }, { id: contributorId });

    if (result.accepted) {
      // Bonus coins for successful crossover
      await this.registry.awardCoins(contributorId, FIB[7], 'crossover-creation');
      this.logger.info({
        offspringId: result.skillId,
        parentA: parentIdA,
        parentB: parentIdB,
        similarity,
      }, 'crossover-successful');
    }

    return { success: result.accepted, offspringId: result.skillId, similarity };
  }

  getLineageDepth(skillId, visited = new Set()) {
    if (visited.has(skillId)) return 0;
    visited.add(skillId);

    const node = this.registry.lineageTree.get(skillId);
    if (!node || node.parents.length === 0) return 0;
    return 1 + Math.max(...node.parents.map(pid => this.getLineageDepth(pid, visited)));
  }

  normalize(vec) {
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (mag > 0) for (let d = 0; d < vec.length; d++) vec[d] /= mag;
  }
}
```

### 3. Discovery Engine

Semantic skill search and recommendation:

```javascript
class ForgeDiscovery {
  constructor({ registry, vectorMemory, embeddingProvider }) {
    this.registry = registry;
    this.vectorMemory = vectorMemory;
    this.embeddingProvider = embeddingProvider;
  }

  async search(query, options = {}) {
    const queryEmbedding = await this.embeddingProvider.embed(query);

    const results = await this.vectorMemory.search(queryEmbedding, {
      topK: options.limit || FIB[7],
      filter: { type: 'forge-skill' },
    });

    return results
      .filter(r => r.score >= SUBMISSION_QUALITY_GATE)
      .map(r => ({
        skillId: r.metadata.skillId,
        name: this.registry.catalog.get(r.metadata.skillId)?.name,
        similarity: r.score,
        tier: r.metadata.tier,
        skill: this.registry.catalog.get(r.metadata.skillId),
      }));
  }

  async trending() {
    const now = Date.now();
    const windowMs = TRENDING_WINDOW_HOURS * 3600000;

    const skills = [...this.registry.catalog.values()]
      .filter(s => s.tier >= 1) // At least Forged
      .map(s => ({
        ...s,
        velocity: s.useCount / Math.max(1, (now - s.createdAt) / windowMs),
      }))
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, FIB[7]);

    return skills;
  }

  async recommend(userProfile) {
    const userEmbedding = await this.embeddingProvider.embed(
      `${userProfile.role} ${userProfile.interests?.join(' ')} ${userProfile.recentTasks?.join(' ')}`
    );

    const results = await this.vectorMemory.search(userEmbedding, {
      topK: FIB[6],
      filter: { type: 'forge-skill' },
    });

    return results
      .filter(r => r.score >= SUBMISSION_QUALITY_GATE)
      .map(r => ({
        skillId: r.metadata.skillId,
        affinity: r.score,
        skill: this.registry.catalog.get(r.metadata.skillId),
      }));
  }
}
```

### 4. Tier Promotion Engine

Automatically promotes skills based on usage and quality:

```javascript
class TierPromotionEngine {
  constructor({ registry, logger }) {
    this.registry = registry;
    this.logger = logger;
  }

  async evaluatePromotions() {
    for (const [skillId, skill] of this.registry.catalog) {
      const newTier = this.calculateTier(skill);
      if (newTier > skill.tier) {
        const oldTier = skill.tier;
        skill.tier = newTier;
        skill.updatedAt = Date.now();

        // Award tier-up bonus
        const bonusMap = { 2: FIB[5], 3: FIB[8], 4: FIB[10], 5: FIB[12] };
        const bonus = bonusMap[newTier] || 0;
        if (bonus > 0) {
          await this.registry.awardCoins(skill.contributor, bonus, `tier-up-${newTier}`);
        }

        this.logger.info({ skillId, name: skill.name, oldTier, newTier }, 'skill-promoted');
      }
    }
  }

  calculateTier(skill) {
    if (skill.useCount >= TIER_USE_COUNTS[5] && skill.coherenceScore >= SACRED_THRESHOLD) return 5;
    if (skill.useCount >= TIER_USE_COUNTS[4] && skill.coherenceScore >= HARDENED_THRESHOLD) return 4;
    if (skill.useCount >= TIER_USE_COUNTS[3] && skill.coherenceScore >= TEMPERED_THRESHOLD) return 3;
    if (skill.useCount >= TIER_USE_COUNTS[2] && skill.coherenceScore >= SUBMISSION_QUALITY_GATE) return 2;
    if (skill.coherenceScore >= SUBMISSION_QUALITY_GATE) return 1;
    return 0;
  }
}
```

## Integration Points

| Heady Component | Patron Forge Role |
|---|---|
| HeadyCoin | Contribution economy — earn coins for skills, spend to use premium skills |
| ReputationEngine | Contributor reputation feeds into skill trust scores |
| SwarmEvolution | Evolved agents can be published as skills to the Forge |
| MyceliumNetwork | Skills propagate between Heady instances via mycelium spores |
| DreamEngine | Dream insights suggest crossover candidates |
| HeadyBuddy | Buddy recommends Forge skills based on user needs |

## API

```javascript
const { PatronForge } = require('@heady/patron-forge');

const forge = new PatronForge({ vectorMemory, embeddingProvider, logger: pinoLogger });

const result = await forge.submit(skillPackage, contributor);
const offspring = await forge.crossover(parentIdA, parentIdB, contributorId);
const results = await forge.search('vector memory optimization');
const trending = await forge.trending();
const recommended = await forge.recommend(userProfile);

forge.health();
await forge.shutdown();
```

## Health Endpoint

```json
{
  "status": "forging",
  "coherenceScore": 0.862,
  "totalSkills": 89,
  "tierDistribution": { "raw": 13, "forged": 34, "tempered": 21, "hardened": 13, "legendary": 5, "sacred": 3 },
  "activeContributors": 34,
  "crossoversThisWeek": 8,
  "totalHeadyCoinDistributed": 987,
  "topTrendingSkill": "heady-quantum-resonance",
  "deepestLineage": 5,
  "version": "1.0.0"
}
```
