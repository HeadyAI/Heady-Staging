/**
 * @fileoverview PersonaRouter — Implements Directive 6: Empathic Masking.
 *
 * Routes outputs through one of five persona modes based on CSL cosine scoring
 * against intent-classification embeddings. Switching is gated at
 * CSL_THRESHOLDS.MEDIUM (≈ 0.809); all transitions are logged in
 * HeadyAutobiographer format.
 *
 * @module services/persona-router
 * @version 1.0.0
 */

'use strict';

import {
  PSI,
  PSI2,
  fib,
  cosineSimilarity,
  CSL_THRESHOLDS,
  cslBlend,
  phiFusionWeights,
} from '../shared/phi-math.js';

// ─── Persona Registry ─────────────────────────────────────────────────────────

/**
 * The five canonical persona modes of Directive 6.
 * triggerEmbedding is a 384-dim conceptual placeholder; replace with real
 * sentence-transformer output in production.
 *
 * @type {Record<string, PersonaDefinition>}
 */
const PERSONA_DEFINITIONS = {
  EMPATHIC_SAFE_SPACE: {
    id:          'EMPATHIC_SAFE_SPACE',
    name:        'Empathic Safe Space',
    description: 'Warm, supportive, and validating. Prioritises emotional safety over efficiency.',
    triggerKeywords: ['feel', 'stress', 'anxiety', 'personal', 'overwhelmed', 'sad', 'help', 'hurt', 'scared', 'worried'],
    responseStyle: {
      tone:                'warm, gentle, affirming',
      verbosity:           'moderate',         // fib(8)=21 sentence range
      technicalDepth:      0,                  // no jargon
      emotionalIntelligence: 1.0,              // maximum EI
    },
    maskingRules: [
      { type: 'HIDE',      target: 'raw_errors',         reason: 'Protect emotional state' },
      { type: 'TRANSLATE', target: 'technical_jargon',   to: 'accessible_language' },
      { type: 'AMPLIFY',   target: 'validation',         reason: 'Reinforce safety' },
      { type: 'SUPPRESS',  target: 'criticism',          reason: 'Non-judgmental stance' },
    ],
    activationThreshold: CSL_THRESHOLDS.MEDIUM,  // ≈ 0.809
  },

  ANALYTICAL_COACH: {
    id:          'ANALYTICAL_COACH',
    name:        'Analytical Coach',
    description: 'Clear, structured, and Socratic. Guides the user to derive solutions.',
    triggerKeywords: ['debug', 'error', 'code', 'technical', 'how', 'why', 'solve', 'fix', 'implement', 'function'],
    responseStyle: {
      tone:                'precise, constructive, neutral',
      verbosity:           'high',             // fib(9)=34 sentence range
      technicalDepth:      0.8,
      emotionalIntelligence: 0.3,
    },
    maskingRules: [
      { type: 'SHOW',    target: 'stack_traces',     reason: 'Diagnostic transparency' },
      { type: 'SHOW',    target: 'code_snippets',    reason: 'Concrete examples' },
      { type: 'HIDE',    target: 'emotional_weight', reason: 'Focus on logic' },
      { type: 'ENHANCE', target: 'reasoning_chain',  reason: 'Socratic scaffolding' },
    ],
    activationThreshold: CSL_THRESHOLDS.MEDIUM,
  },

  ENVIRONMENTAL_ACTUATOR: {
    id:          'ENVIRONMENTAL_ACTUATOR',
    name:        'Environmental Actuator',
    description: 'Silent execution with minimal user interruption. For hardware, IoT, and MIDI tasks.',
    triggerKeywords: ['midi', 'gpio', 'sensor', 'actuate', 'hardware', 'iot', 'device', 'serial', 'firmware', 'signal'],
    responseStyle: {
      tone:                'terse, action-oriented',
      verbosity:           'minimal',          // fib(5)=5 sentence max
      technicalDepth:      1.0,
      emotionalIntelligence: 0.0,
    },
    maskingRules: [
      { type: 'SUPPRESS', target: 'pleasantries',    reason: 'Zero latency overhead' },
      { type: 'SUPPRESS', target: 'explanations',    reason: 'Silent execution mode' },
      { type: 'SHOW',     target: 'status_codes',    reason: 'Machine-readable output' },
      { type: 'SHOW',     target: 'timing_data',     reason: 'Hardware diagnostics' },
    ],
    activationThreshold: CSL_THRESHOLDS.MEDIUM,
  },

  CREATIVE_COLLABORATOR: {
    id:          'CREATIVE_COLLABORATOR',
    name:        'Creative Collaborator',
    description: 'Enthusiastic and generative. Fuels ideation, design, and brainstorming.',
    triggerKeywords: ['idea', 'design', 'brainstorm', 'create', 'imagine', 'concept', 'creative', 'vision', 'art', 'invent'],
    responseStyle: {
      tone:                'enthusiastic, expansive, playful',
      verbosity:           'high',             // fib(9)=34 sentence range
      technicalDepth:      0.4,
      emotionalIntelligence: 0.7,
    },
    maskingRules: [
      { type: 'AMPLIFY',   target: 'possibilities',  reason: 'Expand solution space' },
      { type: 'SUPPRESS',  target: 'constraints',    reason: 'Ideation-first stance' },
      { type: 'SHOW',      target: 'analogies',      reason: 'Cross-domain inspiration' },
      { type: 'TRANSLATE', target: 'technical_limits', to: 'creative_challenges' },
    ],
    activationThreshold: CSL_THRESHOLDS.MEDIUM,
  },

  EXECUTIVE_STRATEGIST: {
    id:          'EXECUTIVE_STRATEGIST',
    name:        'Executive Strategist',
    description: 'Professional and data-driven. Handles business, IP, patents, and market analysis.',
    triggerKeywords: ['business', 'strategy', 'patent', 'ip', 'market', 'revenue', 'roi', 'investor', 'legal', 'contract'],
    responseStyle: {
      tone:                'formal, authoritative, concise',
      verbosity:           'moderate',         // fib(8)=21 sentence range
      technicalDepth:      0.6,
      emotionalIntelligence: 0.2,
    },
    maskingRules: [
      { type: 'ENHANCE',  target: 'data_citations',    reason: 'Executive credibility' },
      { type: 'SUPPRESS', target: 'speculation',       reason: 'Risk-managed comms' },
      { type: 'SHOW',     target: 'risk_assessments',  reason: 'Due diligence' },
      { type: 'HIDE',     target: 'internal_process',  reason: 'Need-to-know only' },
    ],
    activationThreshold: CSL_THRESHOLDS.MEDIUM,
  },
};

/** Default fallback persona when no trigger exceeds the activation threshold. */
const DEFAULT_PERSONA_ID = 'ANALYTICAL_COACH';

/** Maximum transition log entries (fib(11)=89). */
const MAX_TRANSITION_LOG = fib(11); // 89

/** Embedding dimension placeholder. */
const EMBEDDING_DIM = 384;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic 384-dim unit vector from a list of keyword strings.
 * In production, replace with a batched sentence-transformer call.
 *
 * @param {string[]} keywords
 * @returns {number[]}
 */
function generateTriggerEmbedding(keywords) {
  const text = keywords.join(' ');
  const vec  = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % EMBEDDING_DIM] += text.charCodeAt(i) / 255;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

/**
 * Generate a placeholder embedding for free-form input text.
 * @param {string} text
 * @returns {number[]}
 */
function generateInputEmbedding(text) {
  return generateTriggerEmbedding(text.split(/\s+/).slice(0, 50));
}

/**
 * Current ISO timestamp.
 * @returns {string}
 */
function now() {
  return new Date().toISOString();
}

// ─── Class ────────────────────────────────────────────────────────────────────

/**
 * @class PersonaRouter
 * @description Routes LLM outputs through empathic persona modes.
 * Implements Directive 6: Empathic Masking.
 *
 * Persona selection uses CSL cosine scoring: the persona whose trigger embedding
 * has the highest cosine similarity to the input embedding, above
 * CSL_THRESHOLDS.MEDIUM (≈ 0.809), becomes active.
 */
export class PersonaRouter {
  /**
   * @param {object} [config={}]
   * @param {boolean} [config.verbose=false]
   */
  constructor(config = {}) {
    /** @type {boolean} */
    this._verbose = config.verbose ?? false;

    /**
     * Fully hydrated persona map with computed trigger embeddings.
     * @type {Map<string, Persona>}
     */
    this._personas = new Map();

    // Build personas with computed embeddings
    for (const [id, def] of Object.entries(PERSONA_DEFINITIONS)) {
      /** @type {Persona} */
      this._personas.set(id, {
        ...def,
        triggerEmbedding: generateTriggerEmbedding(def.triggerKeywords),
      });
    }

    /** @type {string} */
    this._activePersonaId = DEFAULT_PERSONA_ID;

    /** @type {number} */
    this._activeConfidence = 0;

    /**
     * Bounded log of persona transitions (HeadyAutobiographer format).
     * @type {TransitionEntry[]}
     */
    this._transitionLog = [];

    this._log('PersonaRouter initialised', {
      personas:          [...this._personas.keys()],
      defaultPersona:    DEFAULT_PERSONA_ID,
      activationGate:    CSL_THRESHOLDS.MEDIUM,
      maxTransitionLog:  MAX_TRANSITION_LOG,
    });
  }

  // ─── Intent Classification ───────────────────────────────────────────────

  /**
   * Classify an input text (and optional context embedding) to the best persona.
   *
   * Algorithm:
   *  1. Compute cosine(inputEmbedding, persona.triggerEmbedding) for all personas.
   *  2. Select the persona with the highest score above activationThreshold.
   *  3. If none exceeds threshold, default to ANALYTICAL_COACH.
   *  4. If the selected persona differs from current, log the transition.
   *
   * @param {string}   inputText
   * @param {number[]|null} [contextEmbedding=null] - Optional pre-computed context embedding.
   * @returns {{ persona: Persona, score: number, scores: Record<string, number> }}
   */
  classifyIntent(inputText, contextEmbedding = null) {
    const inputEmbedding  = generateInputEmbedding(inputText);

    // Optionally blend input with context using phi-weights
    let queryEmbedding = inputEmbedding;
    if (contextEmbedding && contextEmbedding.length === EMBEDDING_DIM) {
      const [wInput, wCtx] = phiFusionWeights(2); // [0.618, 0.382]
      queryEmbedding = inputEmbedding.map((v, i) => v * wInput + contextEmbedding[i] * wCtx);
      // Re-normalise
      const norm = Math.sqrt(queryEmbedding.reduce((s, v) => s + v * v, 0)) || 1;
      queryEmbedding = queryEmbedding.map(v => v / norm);
    }

    /** @type {Record<string, number>} */
    const scores = {};
    let bestScore = -Infinity;
    let bestId    = null;

    for (const [id, persona] of this._personas.entries()) {
      const score = cosineSimilarity(queryEmbedding, persona.triggerEmbedding);
      scores[id]  = score;
      if (score > bestScore) {
        bestScore = score;
        bestId    = id;
      }
    }

    // Apply CSL gate: must exceed activationThreshold
    const threshold = this._personas.get(bestId).activationThreshold;
    const selectedId = bestScore >= threshold ? bestId : DEFAULT_PERSONA_ID;
    const finalScore = scores[selectedId];

    // Log transition if persona changed
    if (selectedId !== this._activePersonaId) {
      this._logTransition(this._activePersonaId, selectedId, finalScore, inputText.slice(0, 80));
      this._activePersonaId  = selectedId;
      this._activeConfidence = finalScore;
    } else {
      this._activeConfidence = finalScore;
    }

    this._log('Intent classified', { selected: selectedId, score: finalScore.toFixed(4), scores });
    return { persona: this._personas.get(selectedId), score: finalScore, scores };
  }

  // ─── Persona Access ───────────────────────────────────────────────────────

  /**
   * Return the currently active persona.
   * @returns {Persona}
   */
  getActivePersona() {
    return this._personas.get(this._activePersonaId);
  }

  /**
   * Manually switch to a named persona (bypasses CSL gate).
   *
   * @param {string} personaId - Must be a key in PERSONA_DEFINITIONS.
   * @returns {Persona}
   * @throws {Error} If personaId is unrecognised.
   */
  switchPersona(personaId) {
    if (!this._personas.has(personaId)) {
      throw new Error(`PersonaRouter.switchPersona: unknown persona '${personaId}'`);
    }
    if (personaId !== this._activePersonaId) {
      this._logTransition(this._activePersonaId, personaId, 1.0, 'manual-override');
      this._activePersonaId  = personaId;
      this._activeConfidence = 1.0;
    }
    return this._personas.get(personaId);
  }

  // ─── Masking ─────────────────────────────────────────────────────────────

  /**
   * Apply the active persona's masking rules to a raw LLM output string.
   *
   * Masking operations (in order):
   *  - HIDE:      Strip matched patterns from output.
   *  - SUPPRESS:  Remove matched sections.
   *  - TRANSLATE: Replace technical text with accessible alternatives.
   *  - AMPLIFY:   Prepend a validation/reinforcement phrase.
   *  - ENHANCE:   Append a structured annotation.
   *  - SHOW:      No-op (transparency marker, included for audit trail).
   *
   * @param {string}  rawOutput - Raw text from the LLM.
   * @param {Persona} [persona] - Override persona (defaults to active).
   * @returns {{ output: string, appliedRules: string[], persona: string }}
   */
  applyMasking(rawOutput, persona) {
    const activePersona = persona ?? this.getActivePersona();
    const appliedRules  = [];
    let output          = rawOutput;

    for (const rule of activePersona.maskingRules) {
      switch (rule.type) {
        case 'HIDE':
        case 'SUPPRESS':
          // In production: run NER/pattern matching to locate and remove target
          // Placeholder: mark rule as applied, output unchanged
          appliedRules.push(`${rule.type}:${rule.target}`);
          break;

        case 'TRANSLATE':
          // In production: call a secondary LLM pass to rephrase technical content
          appliedRules.push(`TRANSLATE:${rule.target}→${rule.to}`);
          break;

        case 'AMPLIFY':
          if (rule.target === 'validation' && activePersona.id === 'EMPATHIC_SAFE_SPACE') {
            output = `I hear you, and that makes complete sense. ${output}`;
          }
          appliedRules.push(`AMPLIFY:${rule.target}`);
          break;

        case 'ENHANCE':
          if (rule.target === 'data_citations' && activePersona.id === 'EXECUTIVE_STRATEGIST') {
            output = `${output}\n\n[Note: All claims should be verified against primary sources.]`;
          } else if (rule.target === 'reasoning_chain' && activePersona.id === 'ANALYTICAL_COACH') {
            output = `${output}\n\nThink about: what assumption are we testing here?`;
          }
          appliedRules.push(`ENHANCE:${rule.target}`);
          break;

        case 'SHOW':
          appliedRules.push(`SHOW:${rule.target}`);
          break;

        default:
          this._log(`Unknown masking rule type: ${rule.type}`);
      }
    }

    return { output, appliedRules, persona: activePersona.id };
  }

  // ─── Scoring & Blending ───────────────────────────────────────────────────

  /**
   * Compute phi-weighted persona scores for the given context embedding.
   *
   * @param {number[]} contextEmbedding - 384-dim vector.
   * @returns {Array<{ personaId: string, score: number, weight: number }>}
   */
  getPersonaWeights(contextEmbedding) {
    const results = [];

    for (const [id, persona] of this._personas.entries()) {
      const rawScore = cosineSimilarity(contextEmbedding, persona.triggerEmbedding);
      results.push({ personaId: id, score: rawScore, weight: 0 });
    }

    // Sort by score descending and apply phi-fusion weights
    results.sort((a, b) => b.score - a.score);
    const weights = phiFusionWeights(results.length);
    results.forEach((r, i) => { r.weight = weights[i]; });

    return results;
  }

  /**
   * Blend two personas into a mixed response style using cslBlend.
   *
   * @param {string} primaryId
   * @param {string} secondaryId
   * @param {number} [blendRatio=PSI] - Weight of primary vs secondary (default ψ=0.618).
   * @returns {BlendedPersona}
   */
  blendPersonas(primaryId, secondaryId, blendRatio = PSI) {
    const primary   = this._personas.get(primaryId);
    const secondary = this._personas.get(secondaryId);

    if (!primary)   throw new Error(`PersonaRouter.blendPersonas: unknown persona '${primaryId}'`);
    if (!secondary) throw new Error(`PersonaRouter.blendPersonas: unknown persona '${secondaryId}'`);

    // Blend numerical responseStyle fields using cslBlend
    const blendedStyle = {
      tone: `${primary.responseStyle.tone} (blended with ${secondary.responseStyle.tone})`,
      verbosity: blendRatio > PSI ? primary.responseStyle.verbosity : secondary.responseStyle.verbosity,
      technicalDepth: cslBlend(
        primary.responseStyle.technicalDepth,
        secondary.responseStyle.technicalDepth,
        blendRatio,
        PSI,
      ),
      emotionalIntelligence: cslBlend(
        primary.responseStyle.emotionalIntelligence,
        secondary.responseStyle.emotionalIntelligence,
        blendRatio,
        PSI,
      ),
    };

    // Merge masking rules (primary takes precedence for HIDE/SUPPRESS conflicts)
    const mergedRules = [
      ...primary.maskingRules,
      ...secondary.maskingRules.filter(sr =>
        !primary.maskingRules.some(pr => pr.target === sr.target && pr.type === sr.type),
      ),
    ];

    /** @type {BlendedPersona} */
    return {
      id:           `${primaryId}+${secondaryId}`,
      name:         `${primary.name} / ${secondary.name}`,
      description:  `Phi-blended persona (ratio=${blendRatio.toFixed(3)})`,
      isPrimary:    primaryId,
      isSecondary:  secondaryId,
      blendRatio,
      responseStyle: blendedStyle,
      maskingRules:  mergedRules,
      activationThreshold: CSL_THRESHOLDS.MEDIUM,
    };
  }

  // ─── Transition History ───────────────────────────────────────────────────

  /**
   * Return the bounded transition log.
   * @returns {TransitionEntry[]}
   */
  getTransitionHistory() {
    return [...this._transitionLog];
  }

  /**
   * Return full PersonaRouter status.
   * @returns {PersonaRouterStatus}
   */
  getStatus() {
    const active = this.getActivePersona();
    return {
      activePersona:     active.id,
      activeName:        active.name,
      activeConfidence:  this._activeConfidence,
      activationGate:    CSL_THRESHOLDS.MEDIUM,
      personaCount:      this._personas.size,
      recentTransitions: this._transitionLog.slice(-fib(7)), // last 13
      personas: Object.fromEntries(
        [...this._personas.entries()].map(([id, p]) => [id, {
          name:        p.name,
          description: p.description,
          threshold:   p.activationThreshold,
          maskingRulesCount: p.maskingRules.length,
        }]),
      ),
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Append a transition entry in HeadyAutobiographer format.
   * @private
   * @param {string} fromId
   * @param {string} toId
   * @param {number} score
   * @param {string} context
   */
  _logTransition(fromId, toId, score, context) {
    /** @type {TransitionEntry} */
    const entry = {
      timestamp:    now(),
      event:        'PERSONA_TRANSITION',
      from:         fromId,
      to:           toId,
      score:        score,
      trigger:      context,
      sessionAgent: 'heady-latent-os',
      directive:    'D6_EMPATHIC_MASKING',
    };

    this._transitionLog.push(entry);

    // Bound log size
    if (this._transitionLog.length > MAX_TRANSITION_LOG) {
      this._transitionLog.splice(0, this._transitionLog.length - MAX_TRANSITION_LOG);
    }

    this._log('Persona transition logged', { from: fromId, to: toId, score: score.toFixed(4) });
  }

  /**
   * Conditional verbose logger.
   * @private
   */
  _log(msg, meta = {}) {
    if (this._verbose) {
      process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), level: 'debug', service: 'PersonaRouter', message: msg, ...meta }) + '\n');
    }
  }
}

// ─── JSDoc Type Definitions ───────────────────────────────────────────────────

/**
 * @typedef {object} PersonaDefinition
 * @property {string}   id
 * @property {string}   name
 * @property {string}   description
 * @property {string[]} triggerKeywords
 * @property {ResponseStyle} responseStyle
 * @property {MaskingRule[]} maskingRules
 * @property {number}   activationThreshold
 */

/**
 * @typedef {PersonaDefinition & { triggerEmbedding: number[] }} Persona
 */

/**
 * @typedef {object} ResponseStyle
 * @property {string} tone
 * @property {string} verbosity
 * @property {number} technicalDepth       - 0 (none) to 1 (maximum).
 * @property {number} emotionalIntelligence - 0 (none) to 1 (maximum).
 */

/**
 * @typedef {object} MaskingRule
 * @property {'HIDE'|'SUPPRESS'|'TRANSLATE'|'AMPLIFY'|'ENHANCE'|'SHOW'} type
 * @property {string} target
 * @property {string} [to]      - For TRANSLATE rules.
 * @property {string} [reason]
 */

/**
 * @typedef {object} BlendedPersona
 * @property {string}       id
 * @property {string}       name
 * @property {string}       description
 * @property {string}       isPrimary
 * @property {string}       isSecondary
 * @property {number}       blendRatio
 * @property {ResponseStyle} responseStyle
 * @property {MaskingRule[]} maskingRules
 * @property {number}       activationThreshold
 */

/**
 * @typedef {object} TransitionEntry
 * @property {string} timestamp
 * @property {string} event
 * @property {string} from
 * @property {string} to
 * @property {number} score
 * @property {string} trigger
 * @property {string} sessionAgent
 * @property {string} directive
 */

/**
 * @typedef {object} PersonaRouterStatus
 * @property {string}  activePersona
 * @property {string}  activeName
 * @property {number}  activeConfidence
 * @property {number}  activationGate
 * @property {number}  personaCount
 * @property {TransitionEntry[]} recentTransitions
 * @property {object}  personas
 */

// ─── Re-export persona IDs for external consumers ────────────────────────────

/** Canonical persona ID constants. */
export const PERSONAS = Object.freeze({
  EMPATHIC_SAFE_SPACE:    'EMPATHIC_SAFE_SPACE',
  ANALYTICAL_COACH:       'ANALYTICAL_COACH',
  ENVIRONMENTAL_ACTUATOR: 'ENVIRONMENTAL_ACTUATOR',
  CREATIVE_COLLABORATOR:  'CREATIVE_COLLABORATOR',
  EXECUTIVE_STRATEGIST:   'EXECUTIVE_STRATEGIST',
});
