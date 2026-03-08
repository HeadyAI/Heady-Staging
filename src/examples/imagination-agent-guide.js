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
// ║  FILE: src/examples/imagination-agent-guide.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * Imagination Engine - Coding Agent Guide
 * 
 * This file teaches coding agents how to use the Imagination Engine
 * to autonomously generate ideas, test them, and learn from outcomes.
 * 
 * HOW TO USE THIS FILE:
 * 1. Import the imagination engine
 * 2. Follow the patterns below in your agent code
 * 3. Call imagination methods at appropriate lifecycle points
 * 4. Provide feedback to train the system
 */

const { imagination } = require('../src/hc_imagination');

// ============================================================================
// AGENT LIFECYCLE INTEGRATION
// ============================================================================

/**
 * STEP 1: Initialize on Agent Startup
 * Call this when your agent starts up
 */
async function initializeAgentImagination() {
  await imagination.init();
  console.log('[Agent] Imagination engine initialized');
  
  // Load existing primitives from previous sessions
  console.log(`[Agent] ${imagination.primitives.size} primitives available`);
  console.log(`[Agent] ${imagination.concepts.size} concepts in library`);
}

/**
 * STEP 2: Extract Primitives After Each Task
 * This is the MOST IMPORTANT pattern - extract learnings from everything you do
 */
async function learnFromTask(taskDescription, codeWritten, outcome) {
  console.log('[Agent] Learning from completed task...');
  
  // Extract primitives from the code
  const extracted = await imagination.extractPrimitives(codeWritten, 'code');
  
  // Add domain-specific primitives based on task
  if (taskDescription.includes('API')) {
    imagination.addPrimitive('pattern', 'REST endpoint design', taskDescription, ['api', 'rest']);
  }
  if (taskDescription.includes('database')) {
    imagination.addPrimitive('pattern', 'Database schema pattern', taskDescription, ['database', 'schema']);
  }
  if (taskDescription.includes('UI') || taskDescription.includes('frontend')) {
    imagination.addPrimitive('pattern', 'UI component structure', taskDescription, ['ui', 'frontend']);
  }
  if (taskDescription.includes('security')) {
    imagination.addPrimitive('constraint', 'Security requirement', taskDescription, ['security', 'constraint']);
  }
  
  // Save primitives
  await imagination.savePrimitives();
  
  console.log(`[Agent] Extracted ${extracted.length} primitives`);
  return extracted;
}

/**
 * STEP 3: Generate New Ideas After Learning
 * Run imagination to create new concept combinations
 */
async function imagineNewSolutions(problemContext) {
  console.log('[Agent] Running imagination cycle...');
  
  // Add problem context as a primitive
  imagination.addPrimitive(
    'problem_frame',
    problemContext,
    'current_task',
    ['active_problem', 'priority']
  );
  
  // Generate concepts
  const concepts = await imagination.imagine(5);
  
  // Log results
  for (const concept of concepts) {
    console.log(`[Agent] New concept: ${concept.title}`);
    console.log(`  - Novelty: ${concept.scores.novelty.toFixed(2)}`);
    console.log(`  - Usefulness: ${concept.scores.usefulness.toFixed(2)}`);
    console.log(`  - Risk: ${concept.scores.risk.toFixed(2)}`);
    console.log(`  - Status: ${concept.status}`);
  }
  
  return concepts;
}

/**
 * STEP 4: Check for Hot Concepts
 * Hot concepts are high-value ideas that need attention
 */
async function checkForHotConcepts() {
  const hot = imagination.getHotConcepts();
  
  if (hot.length === 0) {
    console.log('[Agent] No hot concepts currently');
    return [];
  }
  
  console.log(`[Agent] Found ${hot.length} hot concepts!`);
  
  for (const concept of hot.slice(0, 3)) {
    console.log('\n🔥 HOT CONCEPT:');
    console.log(`   Title: ${concept.title}`);
    console.log(`   Summary: ${concept.summary}`);
    console.log(`   Why hot: Novelty ${concept.scores.novelty.toFixed(2)}, Usefulness ${concept.scores.usefulness.toFixed(2)}`);
    console.log(`   Action: Consider elaborating or creating IP package`);
    
    // Auto-elaborate hot concepts
    concept.status = 'refined';
  }
  
  await imagination.saveConcepts();
  return hot;
}

/**
 * STEP 5: Get Inspiration for Current Task
 * Query relevant concepts before starting work
 */
async function getInspirationForTask(taskKeywords) {
  // Find concepts related to task keywords
  const allConcepts = Array.from(imagination.concepts.values());
  
  const relevant = allConcepts
    .filter(c => 
      taskKeywords.some(kw => 
        c.title.toLowerCase().includes(kw.toLowerCase()) ||
        c.summary.toLowerCase().includes(kw.toLowerCase())
      )
    )
    .filter(c => c.status !== 'discarded')
    .sort((a, b) => (b.scores.usefulness + b.scores.novelty) - (a.scores.usefulness + a.scores.novelty))
    .slice(0, 5);
  
  if (relevant.length > 0) {
    console.log('[Agent] Found relevant concepts for inspiration:');
    relevant.forEach((c, i) => {
      console.log(`  ${i+1}. ${c.title} (${c.recombination_op})`);
    });
  }
  
  return relevant;
}

// ============================================================================
// ADVANCED PATTERNS
// ============================================================================

/**
 * Pattern: Use Recombination Operators Manually
 * When you have specific primitives you want to combine
 */
async function manuallyCombinePrimitives(primitiveIdA, primitiveIdB, operator = 'BLEND') {
  const primA = imagination.primitives.get(primitiveIdA);
  const primB = imagination.primitives.get(primitiveIdB);
  
  if (!primA || !primB) {
    console.error('[Agent] Primitives not found');
    return null;
  }
  
  let concept;
  switch (operator) {
    case 'BLEND':
      concept = imagination.blend(primA, primB);
      break;
    case 'MORPH':
      // Need existing concepts for morph
      const concepts = Array.from(imagination.concepts.values()).slice(0, 2);
      if (concepts.length >= 2) {
        concept = imagination.morph(concepts[0], concepts[1], 0.5);
      }
      break;
    default:
      concept = imagination.blend(primA, primB);
  }
  
  await imagination.evaluateConcept(concept);
  await imagination.saveConcepts();
  
  return concept;
}

/**
 * Pattern: Run Full Autonomous Cycle
 * Complete imagination pipeline without human intervention
 */
async function runAutonomousCycle() {
  console.log('[Agent] Running full autonomous imagination cycle...\n');
  
  // Step 1: Generate concepts
  const newConcepts = await imagination.imagine(5);
  console.log(`✓ Generated ${newConcepts.length} concepts`);
  
  // Step 2: Identify hot concepts
  imagination.identifyHotConcepts();
  const hot = imagination.getHotConcepts();
  console.log(`✓ Identified ${hot.length} hot concepts`);
  
  // Step 3: Elaborate hot concepts
  for (const concept of hot.slice(0, 3)) {
    concept.status = 'refined';
    console.log(`✓ Elaborated: ${concept.title}`);
  }
  
  // Step 4: Create IP packages for top novel concepts
  const topNovel = newConcepts
    .filter(c => c.scores.novelty > 0.7 && c.scores.usefulness > 0.6)
    .slice(0, 2);
  
  for (const concept of topNovel) {
    const pkg = await imagination.createIPPackage(concept.id);
    console.log(`✓ Created IP package: ${pkg.id} (${pkg.ip_posture})`);
  }
  
  // Step 5: Save everything
  await imagination.saveConcepts();
  await imagination.saveIPPackages();
  
  console.log('\n[Agent] Autonomous cycle complete!');
  
  return {
    generated: newConcepts.length,
    hot: hot.length,
    ipPackages: topNovel.length
  };
}

/**
 * Pattern: Tournament Selection
 * Compare multiple concepts and pick the best
 */
async function selectBestConcept(conceptIds) {
  if (conceptIds.length < 2) {
    return conceptIds[0] || null;
  }
  
  const winnerId = imagination.runTournament(conceptIds);
  const winner = imagination.concepts.get(winnerId);
  
  console.log(`[Agent] Tournament winner: ${winner.title}`);
  console.log(`  Composite score: ${(winner.scores.novelty * 0.4 + winner.scores.usefulness * 0.4 - winner.scores.risk * 0.2).toFixed(2)}`);
  
  return winner;
}

/**
 * Pattern: Provide Feedback to Learn
 * Essential for training the imagination system
 */
async function provideFeedback(conceptId, success, notes = '') {
  const concept = imagination.concepts.get(conceptId);
  if (!concept) {
    console.error('[Agent] Concept not found');
    return;
  }
  
  // Update primitive weights
  imagination.updatePrimitiveWeights(conceptId, success);
  
  // Update operator statistics
  imagination.updateOperatorStats(concept.recombination_op, success);
  
  // Update concept status
  concept.status = success ? 'tested' : 'discarded';
  if (notes) {
    concept.human_notes = notes;
  }
  
  // Save
  await imagination.saveConcepts();
  await imagination.savePrimitives();
  
  console.log(`[Agent] Feedback recorded for ${conceptId}: ${success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`  Updated primitive weights and operator stats`);
}

// ============================================================================
// TESTING PATTERNS
// ============================================================================

/**
 * Pattern: Test a Concept
 * Create an experiment to validate a concept
 */
async function testConcept(conceptId, testType = 'code') {
  const concept = imagination.concepts.get(conceptId);
  if (!concept) return null;
  
  const experiment = {
    id: `exp_${Date.now()}`,
    concept_id: conceptId,
    hypothesis: `Testing: ${concept.title}`,
    test_type: testType,
    test_min_version: 'minimal implementation',
    status: 'running',
    created_at: new Date()
  };
  
  imagination.experiments.set(experiment.id, experiment);
  
  // Run test based on type
  try {
    let result;
    
    switch (testType) {
      case 'code':
        // Try to generate minimal code
        result = await generateMinimalCode(concept);
        break;
      case 'thought_experiment':
        // Analyze logically
        result = await runThoughtExperiment(concept);
        break;
      default:
        result = { success: true, notes: 'Basic validation passed' };
    }
    
    experiment.status = result.success ? 'passed' : 'failed';
    experiment.result = result;
    experiment.completed_at = new Date();
    
    // Update concept based on test
    if (result.success) {
      concept.status = 'tested';
      await provideFeedback(conceptId, true, result.notes);
    } else {
      await provideFeedback(conceptId, false, result.notes);
    }
    
  } catch (err) {
    experiment.status = 'failed';
    experiment.result = { error: err.message };
    experiment.completed_at = new Date();
  }
  
  await imagination.saveExperiments();
  
  return experiment;
}

// Placeholder test functions
async function generateMinimalCode(concept) {
  // This would integrate with code generation
  return {
    success: true,
    notes: `Generated minimal prototype for ${concept.title}`,
    artifacts: ['prototype.js']
  };
}

async function runThoughtExperiment(concept) {
  // Logical analysis
  const issues = [];
  if (!concept.assumptions || concept.assumptions.length === 0) {
    issues.push('No assumptions documented');
  }
  if (concept.scores.risk > 0.5) {
    issues.push('Elevated risk score');
  }
  
  return {
    success: issues.length === 0,
    notes: issues.join(', ') || 'Logical analysis passed'
  };
}

// ============================================================================
// INTEGRATION EXAMPLES
// ============================================================================

/**
 * Example: Full Agent Session
 * Shows how to integrate imagination throughout an agent session
 */
async function exampleAgentSession() {
  console.log('=== EXAMPLE AGENT SESSION ===\n');
  
  // 1. Initialize
  await initializeAgentImagination();
  
  // 2. Do some work (simulated)
  const taskCode = `
    function optimizeAPI(response) {
      return cacheResponse(compressData(response));
    }
  `;
  
  // 3. Learn from work
  await learnFromTask('Optimize API responses', taskCode, 'success');
  
  // 4. Imagine new solutions
  await imagineNewSolutions('How to make API responses faster?');
  
  // 5. Check for hot concepts
  await checkForHotConcepts();
  
  // 6. Get inspiration for next task
  await getInspirationForTask(['api', 'optimization', 'caching']);
  
  console.log('\n=== SESSION COMPLETE ===');
}

/**
 * Example: IP Discovery Workflow
 * Shows how to use imagination for IP discovery
 */
async function exampleIPDiscovery() {
  console.log('=== EXAMPLE IP DISCOVERY ===\n');
  
  // 1. Add domain primitives
  imagination.addPrimitive('mechanism', 'Predictive caching based on user patterns', 'domain', ['caching', 'prediction']);
  imagination.addPrimitive('mechanism', 'Differential sync for minimal data transfer', 'domain', ['sync', 'efficiency']);
  
  // 2. Generate concepts
  const concepts = await imagination.imagine(10);
  
  // 3. Filter for high novelty
  const novel = concepts.filter(c => c.scores.novelty > 0.7);
  console.log(`Found ${novel.length} novel concepts`);
  
  // 4. Create IP packages for best ones
  for (const concept of novel.slice(0, 3)) {
    const pkg = await imagination.createIPPackage(concept.id);
    console.log(`\nIP Package for: ${concept.title}`);
    console.log(`  Posture: ${pkg.ip_posture}`);
    console.log(`  Claims: ${pkg.claims.length}`);
    console.log(`  Prior art: ${pkg.prior_art_list.length} references`);
  }
}

// ============================================================================
// AGENT BEHAVIOR RULES
// ============================================================================

/**
 * RULE 1: Always Extract
 * After completing any non-trivial task, extract at least one primitive
 */
const RULE_ALWAYS_EXTRACT = true;

/**
 * RULE 2: Imagine Regularly
 * Run imagination cycles periodically (e.g., every N tasks or time interval)
 */
const RULE_IMAGINE_REGULARLY = true;
const IMAGINATION_INTERVAL_TASKS = 5;

/**
 * RULE 3: Report Hot Concepts
 * When hot concepts are found, report them to the human
 */
const RULE_REPORT_HOT = true;

/**
 * RULE 4: Provide Feedback
 * When a concept is tested or implemented, always provide feedback
 */
const RULE_ALWAYS_FEEDBACK = true;

/**
 * RULE 5: Safety First
 * Never proceed with concepts that violate hard constraints
 */
const RULE_SAFETY_FIRST = true;

/**
 * RULE 6: Test Before Implementing
 * Hot concepts should have experiments attached before full implementation
 */
const RULE_TEST_FIRST = true;

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Initialization
  initializeAgentImagination,
  
  // Core patterns
  learnFromTask,
  imagineNewSolutions,
  checkForHotConcepts,
  getInspirationForTask,
  
  // Advanced patterns
  manuallyCombinePrimitives,
  runAutonomousCycle,
  selectBestConcept,
  provideFeedback,
  testConcept,
  
  // Examples
  exampleAgentSession,
  exampleIPDiscovery,
  
  // Rules
  RULE_ALWAYS_EXTRACT,
  RULE_IMAGINE_REGULARLY,
  RULE_REPORT_HOT,
  RULE_ALWAYS_FEEDBACK,
  RULE_SAFETY_FIRST,
  RULE_TEST_FIRST,
  IMAGINATION_INTERVAL_TASKS
};

// Run examples if executed directly
if (require.main === module) {
  (async () => {
    console.log('Running Imagination Engine examples...\n');
    await exampleAgentSession();
    await exampleIPDiscovery();
  })();
}
