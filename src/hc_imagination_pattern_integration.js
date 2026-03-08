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
// ║  FILE: src/hc_imagination_pattern_integration.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * Imagination-Pattern Engine Integration
 * 
 * Connects the Imagination Engine with the Pattern Recognition Engine
 * to enable cross-learning and system-wide intelligence.
 */

const { imagination } = require('./hc_imagination');

// Try to load pattern engine if available
let patternEngine = null;
try {
  const { patternStore } = require('./hc_pattern_engine');
  patternEngine = patternStore;
} catch (e) {
  console.log('[Imagination-Pattern] Pattern engine not available');
}

class ImaginationPatternIntegration {
  constructor() {
    this.enabled = !!patternEngine;
    this.crossReferences = new Map(); // concept_id -> pattern_ids
  }

  /**
   * Cross-reference hot concepts with detected patterns
   * When a concept is marked hot, check if it relates to any system patterns
   */
  async crossReferenceHotConcepts() {
    if (!this.enabled) return [];
    
    const hotConcepts = imagination.getHotConcepts();
    const correlations = [];
    
    for (const concept of hotConcepts) {
      // Look for patterns with similar characteristics
      const relatedPatterns = this.findRelatedPatterns(concept);
      
      if (relatedPatterns.length > 0) {
        this.crossReferences.set(concept.id, relatedPatterns.map(p => p.id));
        
        correlations.push({
          concept_id: concept.id,
          concept_title: concept.title,
          patterns: relatedPatterns,
          insight: `Concept "${concept.title}" relates to ${relatedPatterns.length} detected patterns`
        });
        
        // Add pattern insights to concept
        concept.pattern_insights = relatedPatterns.map(p => ({
          pattern_id: p.id,
          pattern_type: p.category,
          relevance: p.confidence
        }));
      }
    }
    
    return correlations;
  }

  /**
   * Find patterns related to a concept
   */
  findRelatedPatterns(concept) {
    if (!patternEngine || !patternEngine.patterns) return [];
    
    const allPatterns = Array.from(patternEngine.patterns.values());
    const related = [];
    
    for (const pattern of allPatterns) {
      // Check for keyword overlap
      const conceptText = `${concept.title} ${concept.summary} ${concept.mechanism}`.toLowerCase();
      const patternText = `${pattern.name} ${pattern.description || ''}`.toLowerCase();
      
      const conceptWords = conceptText.split(/\s+/);
      const patternWords = patternText.split(/\s+/);
      
      const overlap = conceptWords.filter(w => patternWords.includes(w) && w.length > 4);
      
      if (overlap.length >= 2) {
        related.push({
          ...pattern,
          overlap_words: overlap,
          relevance_score: overlap.length / Math.max(conceptWords.length, patternWords.length)
        });
      }
    }
    
    return related.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 5);
  }

  /**
   * Feed concept outcomes back to pattern engine
   * When a concept succeeds or fails, create/update related patterns
   */
  async feedOutcomeToPatterns(conceptId, success, metrics = {}) {
    if (!this.enabled) return;
    
    const concept = imagination.concepts.get(conceptId);
    if (!concept) return;
    
    // Create or update a pattern based on concept outcome
    const patternData = {
      name: `Concept-${concept.recombination_op}-${success ? 'Success' : 'Failure'}`,
      category: success ? 'success' : 'reliability',
      description: `Concept "${concept.title}" using ${concept.recombination_op} ${success ? 'succeeded' : 'failed'}`,
      tags: [...concept.primitive_ids.map(id => {
        const prim = imagination.primitives.get(id);
        return prim ? prim.kind : 'unknown';
      }), concept.recombination_op],
      state: success ? 'converged' : 'degrading',
      confidence: concept.scores.confidence,
      metadata: {
        source_concept: conceptId,
        primitives_used: concept.primitive_ids,
        novelty_score: concept.scores.novelty,
        usefulness_score: concept.scores.usefulness,
        ...metrics
      }
    };
    
    // This would call pattern engine to record
    if (patternEngine && patternEngine.observe) {
      patternEngine.observe(patternData);
    }
  }

  /**
   * Use patterns to guide imagination
   * When patterns show degradation, generate concepts to address them
   */
  async generateInterventions() {
    if (!this.enabled) return [];
    
    const interventions = [];
    
    // Find degrading or stagnant patterns
    const problematicPatterns = Array.from(patternEngine.patterns?.values() || [])
      .filter(p => p.state === 'degrading' || p.state === 'stagnant');
    
    for (const pattern of problematicPatterns) {
      // Create a problem frame for this pattern
      imagination.addPrimitive(
        'problem_frame',
        `Address ${pattern.name}: ${pattern.description}`,
        'pattern_intervention',
        ['intervention', pattern.category, 'auto_generated']
      );
      
      // Generate concepts specifically targeting this problem
      const interventionConcepts = await imagination.imagine(3);
      
      interventions.push({
        pattern_id: pattern.id,
        pattern_name: pattern.name,
        generated_concepts: interventionConcepts.map(c => c.id),
        rationale: `Generated ${interventionConcepts.length} concepts to address ${pattern.state} pattern`
      });
    }
    
    return interventions;
  }

  /**
   * Detect emerging patterns from concept clusters
   * When many similar concepts emerge, promote to system pattern
   */
  detectEmergingPatterns() {
    const allConcepts = Array.from(imagination.concepts.values())
      .filter(c => c.status !== 'discarded');
    
    // Group by primitive combinations
    const primitiveGroups = {};
    for (const concept of allConcepts) {
      const key = [...concept.primitive_ids].sort().join(',');
      primitiveGroups[key] = primitiveGroups[key] || [];
      primitiveGroups[key].push(concept);
    }
    
    // Find groups with high success rate
    const emergingPatterns = [];
    for (const [key, concepts] of Object.entries(primitiveGroups)) {
      if (concepts.length >= 3) {
        const tested = concepts.filter(c => c.status === 'tested');
        const successful = tested.filter(c => {
          // Check if concept has positive feedback
          return c.human_tags && c.human_tags.includes('success');
        });
        
        const successRate = tested.length > 0 ? successful.length / tested.length : 0;
        
        if (successRate > 0.6 || concepts.length > 5) {
          emergingPatterns.push({
            primitive_combo: key,
            concept_count: concepts.length,
            tested_count: tested.length,
            success_rate: successRate,
            sample_concepts: concepts.slice(0, 3).map(c => c.title),
            recommendation: successRate > 0.6 
              ? 'Promote to recommended primitive combination'
              : 'Further testing needed'
          });
        }
      }
    }
    
    return emergingPatterns.sort((a, b) => b.success_rate - a.success_rate);
  }

  /**
   * Get imagination insights based on pattern analysis
   */
  getPatternGuidedSuggestions() {
    if (!this.enabled) return [];
    
    const suggestions = [];
    
    // Suggest based on converged patterns
    const convergedPatterns = Array.from(patternEngine.patterns?.values() || [])
      .filter(p => p.state === 'converged');
    
    for (const pattern of convergedPatterns) {
      suggestions.push({
        type: 'build_on_converged',
        message: `Pattern "${pattern.name}" is stable. Consider generating variations.`,
        action: 'Use EXTEND or SUBSTITUTE operators on related concepts',
        priority: 'medium'
      });
    }
    
    // Suggest based on improving patterns
    const improvingPatterns = Array.from(patternEngine.patterns?.values() || [])
      .filter(p => p.state === 'improving');
    
    for (const pattern of improvingPatterns) {
      suggestions.push({
        type: 'support_improvement',
        message: `Pattern "${pattern.name}" is improving. Generate complementary concepts.`,
        action: 'Generate concepts that enhance or leverage this trend',
        priority: 'high'
      });
    }
    
    return suggestions;
  }
}

// Export singleton
const imaginationPatternIntegration = new ImaginationPatternIntegration();

module.exports = {
  ImaginationPatternIntegration,
  imaginationPatternIntegration
};
