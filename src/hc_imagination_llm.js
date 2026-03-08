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
// ║  FILE: src/hc_imagination_llm.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * Imagination Engine - LLM Integration Module
 * 
 * Future enhancement: Use Large Language Models for concept generation,
 * evaluation, and refinement. Currently a placeholder with interface definitions.
 * 
 * When LLM integration is enabled:
 * - Concept generation uses LLM prompts instead of template-based
 * - Novelty scoring uses embeddings from LLM
 * - Safety checking uses LLM classifier
 * - Claim drafting uses LLM for legal language
 */

class ImaginationLLMIntegration {
  constructor(config = {}) {
    this.enabled = config.enabled || false;
    this.modelEndpoint = config.modelEndpoint || null;
    this.apiKey = config.apiKey || null;
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Generate concept using LLM
   * 
   * Prompt template for concept generation:
   * "You are an inventive system. Given these technical primitives:
   * {primitives_list}
   * 
   * Generate a novel concept by combining these primitives. The concept should:
   * 1. Be technically plausible
   * 2. Be genuinely novel (not obvious combination)
   * 3. Have clear utility
   * 4. Respect safety constraints: {safety_rules}
   * 
   * Return JSON with:
   * - title: Short descriptive name
   * - summary: One-paragraph description
   * - mechanism: Technical explanation of how it works
   * - applications: Array of potential use cases
   * - novelty_statement: What makes this novel vs existing approaches"
   */
  async generateConceptWithLLM(primitives, safetyRules) {
    if (!this.enabled) {
      return null; // Fall back to template-based generation
    }

    const prompt = this.buildGenerationPrompt(primitives, safetyRules);
    
    try {
      const response = await this.callLLM(prompt);
      return this.parseConceptResponse(response);
    } catch (err) {
      console.error('[Imagination-LLM] Generation failed:', err);
      return null;
    }
  }

  /**
   * Evaluate concept using LLM
   * 
   * Prompt template for evaluation:
   * "Evaluate this concept for:
   * 1. Novelty (0-1): Is this genuinely new vs known approaches?
   * 2. Usefulness (0-1): Does this solve a real problem effectively?
   * 3. Risk (0-1): Are there safety, ethical, or misuse concerns?
   * 4. Feasibility (0-1): Can this be built with current technology?
   * 
   * Concept: {concept_description}
   * Similar prior work: {prior_work_summary}
   * 
   * Return JSON with scores and detailed justification for each."
   */
  async evaluateWithLLM(concept, similarWork = []) {
    if (!this.enabled) {
      return null; // Fall back to heuristic evaluation
    }

    const prompt = this.buildEvaluationPrompt(concept, similarWork);
    
    try {
      const response = await this.callLLM(prompt);
      return this.parseEvaluationResponse(response);
    } catch (err) {
      console.error('[Imagination-LLM] Evaluation failed:', err);
      return null;
    }
  }

  /**
   * Refine concept using LLM critique
   * 
   * Implements the "dreamer -> critic -> reviser" pattern
   */
  async refineWithLLM(concept, critiquePoints) {
    if (!this.enabled) {
      return null;
    }

    const prompt = `
You are refining an invention concept based on critique.

Original concept:
${JSON.stringify(concept, null, 2)}

Critique points:
${critiquePoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Please provide a refined version that addresses these critiques while preserving the core innovation.

Return JSON with:
- refined_title
- refined_summary  
- refined_mechanism
- changes_made: array of specific changes
- confidence: how well the refinements address critiques (0-1)
`;

    try {
      const response = await this.callLLM(prompt);
      return this.parseRefinementResponse(response);
    } catch (err) {
      console.error('[Imagination-LLM] Refinement failed:', err);
      return null;
    }
  }

  /**
   * Draft patent claims using LLM
   * 
   * Generates properly formatted patent claims with:
   * - Independent system claims
   * - Method claims
   * - Dependent claims
   * - Computer-readable medium claims (for software)
   */
  async draftClaimsWithLLM(concept, priorArt) {
    if (!this.enabled) {
      return null;
    }

    const prompt = `
Draft patent claims for this invention:

Title: ${concept.title}
Summary: ${concept.summary}
Mechanism: ${concept.mechanism}
Key features: ${concept.primitive_ids?.map(id => 'Feature from primitive ' + id).join(', ')}

Prior art to distinguish from:
${priorArt.map((p, i) => `${i + 1}. ${p.title}: ${p.description || 'N/A'}`).join('\n')}

Draft:
1. One independent system claim that broadly covers the invention
2. One method claim  
3. Two dependent claims adding specific limitations
4. For software: one computer-readable medium claim

Ensure claims are:
- Clear and definite
- Distinct from prior art
- Not overly broad but not too narrow
- Properly formatted with claim dependencies

Return JSON with claims array. Each claim needs: number, type (independent/dependent), depends_on (for dependent), and text.
`;

    try {
      const response = await this.callLLM(prompt);
      return this.parseClaimsResponse(response);
    } catch (err) {
      console.error('[Imagination-LLM] Claims drafting failed:', err);
      return null;
    }
  }

  /**
   * Check safety using LLM classifier
   * 
   * Uses LLM to analyze concept for:
   * - Dual-use concerns
   * - Potential for misuse
   * - Unintended negative consequences
   * - Bias or fairness issues
   */
  async safetyCheckWithLLM(concept, hardConstraints, amberZones) {
    if (!this.enabled) {
      return null; // Fall back to rule-based checking
    }

    const prompt = `
Analyze this concept for safety and ethical concerns:

Title: ${concept.title}
Summary: ${concept.summary}
Mechanism: ${concept.mechanism}
Potential applications: ${concept.possible_applications?.join(', ')}

Check against:
HARD CONSTRAINTS (must not violate):
${hardConstraints.map(c => `- ${c}`).join('\n')}

AMBER ZONES (elevated concern, requires review):
${amberZones.map(z => `- ${z}`).join('\n')}

Also check for:
- Dual-use potential (beneficial and harmful uses)
- Environmental impact
- Privacy implications
- Fairness across different populations
- Long-term societal effects

Return JSON with:
- safe_to_proceed: boolean
- hard_violations: array of violated hard constraints
- amber_concerns: array of amber zones triggered
- risk_score: 0-1 overall risk
- concerns: array of specific concerns
- mitigation_suggestions: array of ways to reduce risk
`;

    try {
      const response = await this.callLLM(prompt);
      return this.parseSafetyResponse(response);
    } catch (err) {
      console.error('[Imagination-LLM] Safety check failed:', err);
      return null;
    }
  }

  /**
   * Generate embeddings using LLM
   * 
   * For novelty calculation and similarity search
   */
  async generateEmbedding(text) {
    if (!this.enabled) {
      return null; // Fall back to random/simple embeddings
    }

    // This would call embedding API
    // Placeholder: returns null to trigger fallback
    return null;
  }

  /**
   * Search prior art using LLM
   * 
   * Analyzes concept and generates likely prior art references
   * (would integrate with actual patent databases in production)
   */
  async searchPriorArtWithLLM(concept) {
    if (!this.enabled) {
      return null;
    }

    const prompt = `
Based on this invention concept, what prior art or existing technologies might be relevant?

Concept: ${concept.title}
${concept.summary}

List likely relevant:
1. Existing patents or products in this space
2. Academic research
3. Open source projects
4. Industry standards

For each, estimate similarity (0-1) and explain potential overlap.

Return JSON array with: title, source_type, similarity_score, overlap_description.
`;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (err) {
      console.error('[Imagination-LLM] Prior art search failed:', err);
      return null;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  buildGenerationPrompt(primitives, safetyRules) {
    const primitivesText = primitives.map((p, i) => 
      `${i + 1}. [${p.kind}] ${p.description}`
    ).join('\n');

    return `
You are an inventive system participating in concept generation.

Given these technical primitives:
${primitivesText}

Generate a novel concept by recombining these primitives. The concept should:
1. Be technically plausible given current technology
2. Be genuinely novel (not an obvious combination)
3. Have clear utility and applications
4. Respect safety constraints: ${safetyRules.join(', ')}

Provide your response as JSON with these fields:
- title: Short, descriptive name (max 10 words)
- summary: One-paragraph description of what it does
- mechanism: Technical explanation of how it works
- applications: Array of 3-5 potential use cases
- novelty_statement: What makes this novel vs just combining the primitives
- assumptions: Array of key assumptions this relies on
`;
  }

  buildEvaluationPrompt(concept, similarWork) {
    const similarText = similarWork.length > 0 
      ? similarWork.map((s, i) => `${i + 1}. ${s.title}: ${s.summary || 'N/A'}`).join('\n')
      : 'No similar work provided.';

    return `
Evaluate this invention concept:

TITLE: ${concept.title}
SUMMARY: ${concept.summary}
MECHANISM: ${concept.mechanism}
APPLICATIONS: ${concept.possible_applications?.join(', ')}

Similar prior work:
${similarText}

Rate on these dimensions (0.0 to 1.0):
1. NOVELTY: Is this genuinely new compared to prior work? Higher = more novel.
2. USEFULNESS: Does this solve a real problem effectively? Higher = more useful.
3. FEASIBILITY: Can this be built with current technology? Higher = more feasible.
4. RISK: Are there safety, ethical, or misuse concerns? Higher = more risky (bad).

For each score, provide 2-3 sentences explaining your reasoning.

Return JSON format:
{
  "novelty": 0.0-1.0,
  "novelty_reasoning": "explanation",
  "usefulness": 0.0-1.0,
  "usefulness_reasoning": "explanation",
  "feasibility": 0.0-1.0,
  "feasibility_reasoning": "explanation",
  "risk": 0.0-1.0,
  "risk_reasoning": "explanation",
  "confidence": 0.0-1.0
}
`;
  }

  async callLLM(prompt) {
    // This would make actual API call to LLM service
    // Placeholder implementation
    if (!this.modelEndpoint) {
      throw new Error('No LLM endpoint configured');
    }

    // Example API call structure:
    // const response = await fetch(this.modelEndpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4',
    //     messages: [{ role: 'user', content: prompt }],
    //     temperature: this.temperature,
    //     max_tokens: this.maxTokens
    //   })
    // });
    // return response.choices[0].message.content;

    throw new Error('LLM integration not fully implemented - configure endpoint and API key');
  }

  parseConceptResponse(response) {
    try {
      return JSON.parse(response);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Could not parse LLM response as JSON');
    }
  }

  parseEvaluationResponse(response) {
    return this.parseConceptResponse(response);
  }

  parseRefinementResponse(response) {
    return this.parseConceptResponse(response);
  }

  parseClaimsResponse(response) {
    return this.parseConceptResponse(response);
  }

  parseSafetyResponse(response) {
    return this.parseConceptResponse(response);
  }
}

// Configuration for enabling LLM integration
const LLM_CONFIG = {
  enabled: false, // Set to true when LLM is configured
  modelEndpoint: process.env.LLM_ENDPOINT || null,
  apiKey: process.env.LLM_API_KEY || null,
  model: process.env.LLM_MODEL || 'gpt-4',
  maxTokens: 2000,
  temperature: 0.7
};

// Export
const imaginationLLM = new ImaginationLLMIntegration(LLM_CONFIG);

module.exports = {
  ImaginationLLMIntegration,
  imaginationLLM,
  LLM_CONFIG
};
