// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/hc_imagination.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * Heady Imagination Engine (hc_imagination.js)
 * 
 * Autonomous concept generation system for IP discovery and innovation.
 * Implements: Primitive library, Concept generation, Recombination operators,
 * Novelty/Usefulness/Risk evaluation, IP-aware filtering, Safety constraints.
 * 
 * Based on: DABUS/Imagination Engines architecture + structured recombination
 * research + patent-system constraints.
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Primitive - Atomic building block for concepts
 * @typedef {Object} Primitive
 * @property {string} id - Unique identifier
 * @property {string} kind - Type: 'code', 'pattern', 'metaphor', 'mechanism', 'constraint', 'ip_fragment', 'ux_pattern', 'business_rule', 'failure_mode', 'edge_case'
 * @property {string} description - Human-readable description
 * @property {string} source_ref - Where this came from
 * @property {string[]} tags - Categorization tags
 * @property {number[]} embedding - Vector embedding for similarity
 * @property {number} weight - Recombination preference weight (learned)
 * @property {number} success_count - Times used in successful concepts
 * @property {number} fail_count - Times used in failed concepts
 * @property {Date} created_at - Creation timestamp
 * @property {Date} last_used - Last usage timestamp
 */

/**
 * Concept - Generated idea combining primitives
 * @typedef {Object} Concept
 * @property {string} id - Unique identifier
 * @property {string} title - Short title
 * @property {string} summary - One-paragraph description
 * @property {string[]} primitive_ids - Source primitives
 * @property {string} mechanism - How it works technically
 * @property {string[]} possible_applications - Use cases
 * @property {string[]} assumptions - What it assumes
 * @property {string[]} risk_notes - Potential harms or concerns
 * @property {Object} scores - Evaluation scores
 * @property {number} scores.novelty - 0-1 novelty score
 * @property {number} scores.usefulness - 0-1 usefulness score
 * @property {number} scores.risk - 0-1 risk score (lower is better)
 * @property {number} scores.confidence - Confidence in scores
 * @property {string} status - 'raw', 'refined', 'hot', 'discarded', 'ready_for_review', 'tested', 'implemented'
 * @property {string} recombination_op - Which operator created this
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update
 */

/**
 * Experiment - Test of a concept
 * @typedef {Object} Experiment
 * @property {string} id - Unique identifier
 * @property {string} concept_id - Concept being tested
 * @property {string} hypothesis - What we're testing
 * @property {string} test_type - 'code', 'prototype', 'simulation', 'thought_experiment', 'user_study'
 * @property {string} test_min_version - Minimal testable version
 * @property {string} status - 'pending', 'running', 'passed', 'failed', 'inconclusive'
 * @property {Object} result - Test results
 * @property {string} notes - Observations
 * @property {Date} created_at - Creation timestamp
 * @property {Date} completed_at - Completion timestamp
 */

/**
 * PatentAnchor - Prior art reference
 * @typedef {Object} PatentAnchor
 * @property {string} id - Patent number or reference
 * @property {string} jurisdiction - US, EP, WO, etc.
 * @property {string} title - Patent title
 * @property {string} assignee - Patent owner
 * @property {Date} filing_date - Filing date
 * @property {string[]} claim_elements - Key claim elements
 * @property {number[]} embedding - Vector embedding
 * @property {number} similarity_score - Similarity to concept
 * @property {string} conflict_type - 'prior_art', 'FTO_issue', 'white_space_boundary'
 */

/**
 * IPPackage - Draft patent materials
 * @typedef {Object} IPPackage
 * @property {string} id - Unique identifier
 * @property {string} concept_id - Source concept
 * @property {Object[]} claims - Patent claims
 * @property {Object} specification - Patent specification sections
 * @property {string[]} drawings_prompts - Drawing descriptions
 * @property {PatentAnchor[]} prior_art_list - Prior art references
 * @property {string} human_review_status - 'pending', 'approved', 'rejected', 'needs_revision'
 * @property {string} ip_posture - 'patent', 'trade_secret', 'defensive_publication', 'open_license', 'commons'
 * @property {Date} created_at - Creation timestamp
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  // Storage paths
  primitivesPath: './.heady_cache/imagination/primitives.json',
  conceptsPath: './.heady_cache/imagination/concepts.json',
  experimentsPath: './.heady_cache/imagination/experiments.json',
  ipPackagesPath: './.heady_cache/imagination/ip_packages.json',
  
  // Recombination settings
  recombinationIntervalMinutes: 30,
  conceptsPerBatch: 5,
  maxPrimitivesPerConcept: 5,
  minPrimitivesPerConcept: 2,
  
  // Scoring thresholds
  noveltyThreshold: 0.6,
  usefulnessThreshold: 0.5,
  riskThreshold: 0.7, // Max acceptable risk
  
  // Hot button settings
  hotNoveltyThreshold: 0.8,
  hotUsefulnessThreshold: 0.7,
  elaborationBudget: 3, // How many hot concepts to elaborate per cycle
  
  // Learning settings
  successWeightBoost: 1.2,
  failWeightDecay: 0.8,
  diversityPressure: 0.1, // Probability of forcing cross-domain mix
  
  // Safety settings
  hardConstraints: [
    'no_weapons',
    'no_surveillance_exploitation', 
    'no_discriminatory_systems',
    'no_environmental_harm',
    'no_human_rights_abuse'
  ],
  amberZones: [
    'surveillance_technology',
    'automated_decision_making',
    'biometric_systems',
    'social_scoring'
  ],
  
  // IP settings
  autoPriorArtSearch: true,
  maxPriorArtResults: 10,
  ipPosturePreferences: ['open_license', 'defensive_publication', 'patent'], // In order of preference
  
  // Embedding model (placeholder - would integrate with actual model)
  embeddingDimension: 384,
};

// ============================================================================
// IMAGINATION ENGINE CLASS
// ============================================================================

class ImaginationEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.primitives = new Map();
    this.concepts = new Map();
    this.experiments = new Map();
    this.ipPackages = new Map();
    this.operatorStats = {
      BLEND: { uses: 0, successes: 0 },
      SUBSTITUTE: { uses: 0, successes: 0 },
      EXTEND: { uses: 0, successes: 0 },
      INVERT: { uses: 0, successes: 0 },
      MORPH: { uses: 0, successes: 0 }
    };
    this.initialized = false;
  }

  // =========================================================================
  // INITIALIZATION & PERSISTENCE
  // =========================================================================

  async init() {
    if (this.initialized) return;
    
    // Ensure cache directory exists
    const cacheDir = path.dirname(this.config.primitivesPath);
    try {
      await fs.mkdir(cacheDir, { recursive: true });
    } catch (e) {
      // Directory may already exist
    }
    
    // Load persisted state
    await this.loadPrimitives();
    await this.loadConcepts();
    await this.loadExperiments();
    await this.loadIPPackages();
    
    this.initialized = true;
    console.log(`[Imagination] Initialized with ${this.primitives.size} primitives, ${this.concepts.size} concepts`);
  }

  async loadPrimitives() {
    try {
      const data = await fs.readFile(this.config.primitivesPath, 'utf8');
      const primitives = JSON.parse(data);
      for (const p of primitives) {
        p.created_at = new Date(p.created_at);
        p.last_used = new Date(p.last_used);
        this.primitives.set(p.id, p);
      }
    } catch (e) {
      // No existing primitives
    }
  }

  async savePrimitives() {
    const data = JSON.stringify(Array.from(this.primitives.values()), null, 2);
    await fs.writeFile(this.config.primitivesPath, data);
  }

  async loadConcepts() {
    try {
      const data = await fs.readFile(this.config.conceptsPath, 'utf8');
      const concepts = JSON.parse(data);
      for (const c of concepts) {
        c.created_at = new Date(c.created_at);
        c.updated_at = new Date(c.updated_at);
        this.concepts.set(c.id, c);
      }
    } catch (e) {
      // No existing concepts
    }
  }

  async saveConcepts() {
    const data = JSON.stringify(Array.from(this.concepts.values()), null, 2);
    await fs.writeFile(this.config.conceptsPath, data);
  }

  async loadExperiments() {
    try {
      const data = await fs.readFile(this.config.experimentsPath, 'utf8');
      const experiments = JSON.parse(data);
      for (const e of experiments) {
        e.created_at = new Date(e.created_at);
        if (e.completed_at) e.completed_at = new Date(e.completed_at);
        this.experiments.set(e.id, e);
      }
    } catch (e) {
      // No existing experiments
    }
  }

  async saveExperiments() {
    const data = JSON.stringify(Array.from(this.experiments.values()), null, 2);
    await fs.writeFile(this.config.experimentsPath, data);
  }

  async loadIPPackages() {
    try {
      const data = await fs.readFile(this.config.ipPackagesPath, 'utf8');
      const packages = JSON.parse(data);
      for (const p of packages) {
        p.created_at = new Date(p.created_at);
        this.ipPackages.set(p.id, p);
      }
    } catch (e) {
      // No existing IP packages
    }
  }

  async saveIPPackages() {
    const data = JSON.stringify(Array.from(this.ipPackages.values()), null, 2);
    await fs.writeFile(this.config.ipPackagesPath, data);
  }

  // =========================================================================
  // PRIMITIVE MANAGEMENT
  // =========================================================================

  /**
   * Add a new primitive to the library
   */
  addPrimitive(kind, description, sourceRef, tags = [], embedding = null) {
    const id = `prim_${crypto.randomUUID()}`;
    const primitive = {
      id,
      kind,
      description,
      source_ref: sourceRef,
      tags,
      embedding: embedding || this.generateRandomEmbedding(),
      weight: 1.0,
      success_count: 0,
      fail_count: 0,
      created_at: new Date(),
      last_used: new Date()
    };
    this.primitives.set(id, primitive);
    return primitive;
  }

  /**
   * Extract primitives from code/text automatically
   */
  async extractPrimitives(source, sourceType = 'code') {
    // This would integrate with LLM or pattern matching
    // For now, placeholder implementation
    const extracted = [];
    
    if (sourceType === 'code') {
      // Extract functions, patterns, design decisions
      const functionMatches = source.match(/function\s+(\w+)/g) || [];
      for (const match of functionMatches) {
        const name = match.replace('function ', '');
        extracted.push(this.addPrimitive(
          'code',
          `Function: ${name}`,
          'code_extraction',
          ['function', 'code_block']
        ));
      }
    }
    
    if (sourceType === 'patent') {
      // Extract claim elements, mechanisms
      const claimMatches = source.match(/claim\s+\d+:\s*(.+?)(?=claim|$)/gi) || [];
      for (const match of claimMatches.slice(0, 3)) {
        extracted.push(this.addPrimitive(
          'ip_fragment',
          `Patent concept: ${match.substring(0, 100)}...`,
          'patent_extraction',
          ['patent', 'claim_element']
        ));
      }
    }
    
    await this.savePrimitives();
    return extracted;
  }

  /**
   * Select primitives for recombination (weighted by success, with diversity pressure)
   */
  selectPrimitives(count, diversityPressure = null) {
    const pressure = diversityPressure !== null ? diversityPressure : this.config.diversityPressure;
    const allPrimitives = Array.from(this.primitives.values());
    
    if (allPrimitives.length === 0) return [];
    
    const selected = [];
    const usedDomains = new Set();
    
    for (let i = 0; i < count; i++) {
      let candidates = allPrimitives.filter(p => !selected.includes(p));
      
      // Apply diversity pressure: prefer unused domains
      if (Math.random() < pressure && usedDomains.size > 0) {
        const unused = candidates.filter(p => !usedDomains.has(p.kind));
        if (unused.length > 0) candidates = unused;
      }
      
      // Weighted random selection
      const totalWeight = candidates.reduce((sum, p) => sum + p.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const p of candidates) {
        random -= p.weight;
        if (random <= 0) {
          selected.push(p);
          usedDomains.add(p.kind);
          p.last_used = new Date();
          break;
        }
      }
    }
    
    return selected;
  }

  /**
   * Update primitive weights based on concept outcomes
   */
  updatePrimitiveWeights(conceptId, success) {
    const concept = this.concepts.get(conceptId);
    if (!concept) return;
    
    for (const primId of concept.primitive_ids) {
      const prim = this.primitives.get(primId);
      if (!prim) continue;
      
      if (success) {
        prim.success_count++;
        prim.weight = Math.min(prim.weight * this.config.successWeightBoost, 5.0);
      } else {
        prim.fail_count++;
        prim.weight = Math.max(prim.weight * this.config.failWeightDecay, 0.1);
      }
    }
  }

  // =========================================================================
  // RECOMBINATION OPERATORS
  // =========================================================================

  /**
   * BLEND: Merge roles or combine mechanisms of two primitives
   */
  blend(primitiveA, primitiveB) {
    this.operatorStats.BLEND.uses++;
    
    const title = `${primitiveA.kind}_${primitiveB.kind}_hybrid`;
    const summary = `A system combining ${primitiveA.description.substring(0, 50)} with ${primitiveB.description.substring(0, 50)}`;
    const mechanism = `Operates by merging the mechanism of ${primitiveA.kind} with ${primitiveB.kind}, allowing cross-domain functionality`;
    
    return this.createConcept(
      [primitiveA.id, primitiveB.id],
      'BLEND',
      title,
      summary,
      mechanism,
      [`${primitiveA.kind} applications`, `${primitiveB.kind} applications`, 'hybrid systems']
    );
  }

  /**
   * SUBSTITUTE: Replace component from one concept with another primitive
   */
  substitute(concept, newPrimitive) {
    this.operatorStats.SUBSTITUTE.uses++;
    
    // Replace last primitive with new one
    const newPrimitives = [...concept.primitive_ids.slice(0, -1), newPrimitive.id];
    
    const title = `Modified_${concept.title}`;
    const summary = `Variation of "${concept.summary.substring(0, 50)}" using ${newPrimitive.description.substring(0, 50)} instead`;
    const mechanism = `Same as base concept but with ${newPrimitive.kind} substituted for improved ${newPrimitive.kind} characteristics`;
    
    return this.createConcept(
      newPrimitives,
      'SUBSTITUTE',
      title,
      summary,
      mechanism,
      concept.possible_applications
    );
  }

  /**
   * EXTEND: Add new primitive to existing concept
   */
  extend(concept, newPrimitive) {
    this.operatorStats.EXTEND.uses++;
    
    const newPrimitives = [...concept.primitive_ids, newPrimitive.id];
    
    const title = `Enhanced_${concept.title}`;
    const summary = `"${concept.summary.substring(0, 50)}" extended with ${newPrimitive.description.substring(0, 50)} capabilities`;
    const mechanism = `Base mechanism enhanced by adding ${newPrimitive.kind}: ${newPrimitive.description}`;
    
    return this.createConcept(
      newPrimitives,
      'EXTEND',
      title,
      summary,
      mechanism,
      [...concept.possible_applications, `${newPrimitive.kind} benefits`]
    );
  }

  /**
   * INVERT: Flip an assumption
   */
  invert(primitive) {
    this.operatorStats.INVERT.uses++;
    
    const title = `Inverted_${primitive.kind}`;
    const summary = `Instead of "${primitive.description.substring(0, 50)}", do the opposite: inverse approach to ${primitive.kind}`;
    const mechanism = `Reverses the standard ${primitive.kind} approach, potentially unlocking new solution spaces`;
    
    return this.createConcept(
      [primitive.id],
      'INVERT',
      title,
      summary,
      mechanism,
      ['inverse_problems', 'contrarian_solutions', 'constraint_relaxation']
    );
  }

  /**
   * MORPH: Interpolate between two concepts
   */
  morph(conceptA, conceptB, alpha = 0.5) {
    this.operatorStats.MORPH.uses++;
    
    const allPrimitives = [...new Set([...conceptA.primitive_ids, ...conceptB.primitive_ids])];
    
    const title = `Morph_${conceptA.title}_${conceptB.title}`;
    const summary = `Intermediate form (${Math.round(alpha*100)}%) between "${conceptA.summary.substring(0, 30)}" and "${conceptB.summary.substring(0, 30)}"`;
    const mechanism = `Blends mechanisms from both parent concepts with weighting favoring ${alpha > 0.5 ? 'second' : 'first'} concept`;
    
    return this.createConcept(
      allPrimitives,
      'MORPH',
      title,
      summary,
      mechanism,
      [...conceptA.possible_applications, ...conceptB.possible_applications]
    );
  }

  /**
   * Create a new concept from primitives
   */
  createConcept(primitiveIds, operator, title, summary, mechanism, applications) {
    const id = `concept_${crypto.randomUUID()}`;
    const concept = {
      id,
      title,
      summary,
      primitive_ids: primitiveIds,
      mechanism,
      possible_applications: applications || [],
      assumptions: [],
      risk_notes: [],
      scores: {
        novelty: 0,
        usefulness: 0,
        risk: 0,
        confidence: 0
      },
      status: 'raw',
      recombination_op: operator,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.concepts.set(id, concept);
    return concept;
  }

  // =========================================================================
  // IMAGINATION LOOP
  // =========================================================================

  /**
   * Run one imagination cycle: generate new concepts
   */
  async imagine(batchSize = null) {
    const size = batchSize || this.config.conceptsPerBatch;
    const newConcepts = [];
    
    // Select primitives for recombination
    const primitives = this.selectPrimitives(this.config.maxPrimitivesPerConcept);
    if (primitives.length < this.config.minPrimitivesPerConcept) {
      console.log('[Imagination] Not enough primitives for recombination');
      return [];
    }
    
    // Generate concepts using different operators
    for (let i = 0; i < size; i++) {
      const op = this.selectOperator();
      let concept;
      
      switch (op) {
        case 'BLEND':
          if (primitives.length >= 2) {
            concept = this.blend(primitives[0], primitives[1]);
          }
          break;
        case 'SUBSTITUTE':
          const existing = this.selectExistingConcept();
          if (existing && primitives.length > 0) {
            concept = this.substitute(existing, primitives[0]);
          }
          break;
        case 'EXTEND':
          const base = this.selectExistingConcept();
          if (base && primitives.length > 0) {
            concept = this.extend(base, primitives[0]);
          }
          break;
        case 'INVERT':
          if (primitives.length > 0) {
            concept = this.invert(primitives[0]);
          }
          break;
        case 'MORPH':
          const c1 = this.selectExistingConcept();
          const c2 = this.selectExistingConcept();
          if (c1 && c2 && c1.id !== c2.id) {
            concept = this.morph(c1, c2, Math.random());
          }
          break;
      }
      
      if (concept) {
        newConcepts.push(concept);
      }
    }
    
    // Evaluate all new concepts
    for (const concept of newConcepts) {
      await this.evaluateConcept(concept);
    }
    
    // Identify and mark "hot" concepts
    this.identifyHotConcepts();
    
    await this.saveConcepts();
    await this.savePrimitives();
    
    console.log(`[Imagination] Generated ${newConcepts.length} new concepts`);
    return newConcepts;
  }

  /**
   * Select recombination operator based on historical success
   */
  selectOperator() {
    const operators = Object.keys(this.operatorStats);
    const weights = operators.map(op => {
      const stats = this.operatorStats[op];
      if (stats.uses === 0) return 1.0;
      return (stats.successes / stats.uses) + 0.1; // Base rate + small boost
    });
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < operators.length; i++) {
      random -= weights[i];
      if (random <= 0) return operators[i];
    }
    
    return operators[0];
  }

  /**
   * Select existing concept for modification operations
   */
  selectExistingConcept() {
    const all = Array.from(this.concepts.values());
    if (all.length === 0) return null;
    
    // Weight by score, preferring medium-high scored concepts
    const weighted = all.map(c => ({
      concept: c,
      weight: c.scores.novelty * c.scores.usefulness + 0.1
    }));
    
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const w of weighted) {
      random -= w.weight;
      if (random <= 0) return w.concept;
    }
    
    return all[Math.floor(Math.random() * all.length)];
  }

  // =========================================================================
  // EVALUATION SYSTEM
  // =========================================================================

  /**
   * Evaluate a concept for novelty, usefulness, and risk
   */
  async evaluateConcept(concept) {
    // Novelty: distance from existing concepts
    concept.scores.novelty = this.calculateNovelty(concept);
    
    // Usefulness: based on primitive success, domain relevance
    concept.scores.usefulness = this.calculateUsefulness(concept);
    
    // Risk: safety/ethics filter
    concept.scores.risk = await this.calculateRisk(concept);
    
    // Confidence based on data availability
    concept.scores.confidence = this.calculateConfidence(concept);
    
    // Update status based on scores
    if (concept.scores.risk > this.config.riskThreshold) {
      concept.status = 'discarded';
      concept.risk_notes.push('Auto-discarded: risk score exceeds threshold');
    } else if (concept.scores.novelty < 0.3 && concept.scores.usefulness < 0.3) {
      concept.status = 'discarded';
    }
    
    concept.updated_at = new Date();
  }

  /**
   * Calculate novelty as distance from nearest existing concept
   */
  calculateNovelty(concept) {
    if (this.concepts.size <= 1) return 1.0;
    
    let maxSimilarity = 0;
    
    for (const [id, other] of this.concepts) {
      if (id === concept.id) continue;
      
      // Jaccard similarity of primitive sets
      const common = concept.primitive_ids.filter(p => other.primitive_ids.includes(p)).length;
      const union = new Set([...concept.primitive_ids, ...other.primitive_ids]).size;
      const similarity = union > 0 ? common / union : 0;
      
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    // Novelty is inverse of max similarity
    return 1 - maxSimilarity;
  }

  /**
   * Calculate usefulness based on primitive history and applications
   */
  calculateUsefulness(concept) {
    if (concept.primitive_ids.length === 0) return 0;
    
    let totalSuccess = 0;
    let totalAttempts = 0;
    
    for (const primId of concept.primitive_ids) {
      const prim = this.primitives.get(primId);
      if (prim) {
        totalSuccess += prim.success_count;
        totalAttempts += prim.success_count + prim.fail_count;
      }
    }
    
    // Base usefulness from primitive track record
    const baseUsefulness = totalAttempts > 0 ? totalSuccess / totalAttempts : 0.5;
    
    // Boost for having clear applications
    const applicationBoost = Math.min(concept.possible_applications.length * 0.1, 0.3);
    
    return Math.min(baseUsefulness + applicationBoost, 1.0);
  }

  /**
   * Calculate risk score using safety filters
   */
  async calculateRisk(concept) {
    let risk = 0;
    const riskNotes = [];
    
    // Check against hard constraints (immediate high risk)
    for (const constraint of this.config.hardConstraints) {
      const violation = await this.checkConstraintViolation(concept, constraint);
      if (violation) {
        risk = 1.0;
        riskNotes.push(`HARD CONSTRAINT VIOLATION: ${constraint}`);
        break;
      }
    }
    
    // Check amber zones (elevated risk)
    for (const zone of this.config.amberZones) {
      const match = await this.checkAmberZone(concept, zone);
      if (match) {
        risk = Math.max(risk, 0.6);
        riskNotes.push(`AMBER ZONE: ${zone} - requires review`);
      }
    }
    
    // Check for missing safety considerations
    if (!concept.assumptions.some(a => a.toLowerCase().includes('safety'))) {
      risk += 0.1;
    }
    
    concept.risk_notes = riskNotes;
    return Math.min(risk, 1.0);
  }

  /**
   * Check if concept violates a hard constraint
   */
  async checkConstraintViolation(concept, constraint) {
    // This would integrate with LLM or rule-based checking
    // Placeholder: check concept text against constraint keywords
    const text = `${concept.title} ${concept.summary} ${concept.mechanism}`.toLowerCase();
    
    const constraintKeywords = {
      'no_weapons': ['weapon', 'arms', 'munition', 'ballistic', 'explosive'],
      'no_surveillance_exploitation': ['mass surveillance', 'covert tracking', 'spy'],
      'no_discriminatory_systems': ['discriminat', 'biases', 'racial profiling'],
      'no_environmental_harm': ['toxic waste', 'deforestation', 'carbon intensive'],
      'no_human_rights_abuse': ['torture', 'forced labor', 'oppression']
    };
    
    const keywords = constraintKeywords[constraint] || [];
    return keywords.some(kw => text.includes(kw));
  }

  /**
   * Check if concept falls into an amber zone
   */
  async checkAmberZone(concept, zone) {
    const text = `${concept.title} ${concept.summary}`.toLowerCase();
    
    const zoneKeywords = {
      'surveillance_technology': ['monitor', 'track', 'observ', 'camera'],
      'automated_decision_making': ['automated decision', 'algorithmic choice', 'auto-approve'],
      'biometric_systems': ['biometric', 'fingerprint', 'facial recognition', 'retina'],
      'social_scoring': ['social score', 'credit score', 'behavior rating']
    };
    
    const keywords = zoneKeywords[zone] || [];
    return keywords.some(kw => text.includes(kw));
  }

  /**
   * Calculate confidence in scores
   */
  calculateConfidence(concept) {
    // More primitives = more confident (diverse sources)
    // More applications = more confident (clearer use)
    const primitiveFactor = Math.min(concept.primitive_ids.length * 0.2, 0.6);
    const applicationFactor = Math.min(concept.possible_applications.length * 0.1, 0.3);
    return Math.min(primitiveFactor + applicationFactor + 0.1, 1.0);
  }

  /**
   * Identify and mark "hot" concepts for elaboration
   */
  identifyHotConcepts() {
    for (const [id, concept] of this.concepts) {
      if (concept.status === 'discarded') continue;
      
      const isHot = concept.scores.novelty >= this.config.hotNoveltyThreshold &&
                    concept.scores.usefulness >= this.config.hotUsefulnessThreshold;
      
      if (isHot && concept.status === 'raw') {
        concept.status = 'hot';
        console.log(`[Imagination] Hot concept identified: ${concept.title}`);
      }
    }
  }

  // =========================================================================
  // META-LEARNING & SELF-EVALUATION
  // =========================================================================

  /**
   * Update operator statistics based on concept outcomes
   */
  updateOperatorStats(operator, success) {
    if (this.operatorStats[operator]) {
      this.operatorStats[operator].uses++;
      if (success) this.operatorStats[operator].successes++;
    }
  }

  /**
   * Get imagination system statistics
   */
  getStats() {
    const conceptsByStatus = {};
    for (const c of this.concepts.values()) {
      conceptsByStatus[c.status] = (conceptsByStatus[c.status] || 0) + 1;
    }
    
    return {
      primitives: this.primitives.size,
      concepts: this.concepts.size,
      experiments: this.experiments.size,
      ipPackages: this.ipPackages.size,
      conceptsByStatus,
      operatorStats: this.operatorStats,
      avgNovelty: this.getAverageNovelty(),
      avgUsefulness: this.getAverageUsefulness()
    };
  }

  getAverageNovelty() {
    const concepts = Array.from(this.concepts.values());
    if (concepts.length === 0) return 0;
    return concepts.reduce((sum, c) => sum + c.scores.novelty, 0) / concepts.length;
  }

  getAverageUsefulness() {
    const concepts = Array.from(this.concepts.values());
    if (concepts.length === 0) return 0;
    return concepts.reduce((sum, c) => sum + c.scores.usefulness, 0) / concepts.length;
  }

  /**
   * Run a tournament to compare and select best concepts
   */
  runTournament(conceptIds) {
    const concepts = conceptIds.map(id => this.concepts.get(id)).filter(Boolean);
    if (concepts.length < 2) return concepts[0]?.id;
    
    // Pairwise comparison
    const scores = {};
    for (const c of concepts) scores[c.id] = 0;
    
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const winner = this.compareConcepts(concepts[i], concepts[j]);
        scores[winner.id]++;
      }
    }
    
    // Return ID with most wins
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  compareConcepts(a, b) {
    const scoreA = a.scores.novelty * 0.4 + a.scores.usefulness * 0.4 - a.scores.risk * 0.2;
    const scoreB = b.scores.novelty * 0.4 + b.scores.usefulness * 0.4 - b.scores.risk * 0.2;
    return scoreA > scoreB ? a : b;
  }

  // =========================================================================
  // IP DISCOVERY MODULE (Placeholder - would integrate with patent APIs)
  // =========================================================================

  /**
   * Search for prior art related to a concept
   */
  async searchPriorArt(conceptId) {
    const concept = this.concepts.get(conceptId);
    if (!concept) return [];
    
    // This would integrate with patent search APIs (USPTO, EPO, etc.)
    // For now, return simulated results
    return [
      {
        id: 'US12345678',
        title: 'Similar system for ' + concept.title,
        similarity: 0.6,
        filing_date: '2020-01-01'
      }
    ];
  }

  /**
   * Create IP package for a concept
   */
  async createIPPackage(conceptId) {
    const concept = this.concepts.get(conceptId);
    if (!concept) return null;
    
    // Search prior art
    const priorArt = await this.searchPriorArt(conceptId);
    
    // Generate claims
    const claims = [
      {
        number: 1,
        type: 'independent',
        text: `A system comprising: ${concept.mechanism.substring(0, 100)}...`,
        elements: concept.primitive_ids.map(p => this.primitives.get(p)?.kind).filter(Boolean)
      },
      {
        number: 2,
        type: 'dependent',
        depends_on: 1,
        text: 'The system of claim 1, wherein the mechanism further includes...'
      }
    ];
    
    // Generate specification sections
    const specification = {
      title: concept.title,
      background: `Field of invention relates to ${concept.primitive_ids[0] ? this.primitives.get(concept.primitive_ids[0])?.kind : 'novel systems'}`,
      summary: concept.summary,
      detailed_description: concept.mechanism,
      examples: concept.possible_applications
    };
    
    // Determine IP posture
    const ipPosture = this.selectIPPosture(concept, priorArt);
    
    const pkg = {
      id: `ip_${crypto.randomUUID()}`,
      concept_id: conceptId,
      claims,
      specification,
      drawings_prompts: [`Figure 1: Block diagram of ${concept.title}`],
      prior_art_list: priorArt,
      human_review_status: 'pending',
      ip_posture: ipPosture,
      created_at: new Date()
    };
    
    this.ipPackages.set(pkg.id, pkg);
    await this.saveIPPackages();
    
    return pkg;
  }

  /**
   * Select IP posture based on concept characteristics
   */
  selectIPPosture(concept, priorArt) {
    // High social impact, low need for exclusivity -> open/defensive
    // High commercial potential, clear novelty -> patent
    
    const hasClosePriorArt = priorArt.some(p => p.similarity > 0.7);
    
    if (concept.scores.novelty > 0.8 && !hasClosePriorArt) {
      return 'patent';
    } else if (concept.possible_applications.some(a => a.includes('social') || a.includes('public'))) {
      return 'open_license';
    } else if (hasClosePriorArt) {
      return 'defensive_publication';
    }
    
    return 'trade_secret';
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  generateRandomEmbedding() {
    // Placeholder - would use actual embedding model
    return Array(this.config.embeddingDimension).fill(0).map(() => Math.random() - 0.5);
  }

  /**
   * Get top concepts by score
   */
  getTopConcepts(count = 10, minStatus = 'raw') {
    const statusOrder = ['raw', 'refined', 'hot', 'tested', 'ready_for_review', 'implemented'];
    const minIndex = statusOrder.indexOf(minStatus);
    
    return Array.from(this.concepts.values())
      .filter(c => statusOrder.indexOf(c.status) >= minIndex && c.status !== 'discarded')
      .map(c => ({
        ...c,
        compositeScore: c.scores.novelty * 0.4 + c.scores.usefulness * 0.4 - c.scores.risk * 0.2
      }))
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, count);
  }

  /**
   * Get hot concepts for elaboration
   */
  getHotConcepts() {
    return Array.from(this.concepts.values())
      .filter(c => c.status === 'hot')
      .sort((a, b) => (b.scores.novelty + b.scores.usefulness) - (a.scores.novelty + a.scores.usefulness));
  }
}

// Export singleton
const imagination = new ImaginationEngine();

module.exports = { ImaginationEngine, imagination };
