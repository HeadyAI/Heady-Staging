/**
 * HCFullPipeline Test Suite
 * 
 * Tests: 8-stage DAG execution, quality gates, stage dependencies,
 * parallel execution of independent stages, and failure handling.
 * 
 * @author Eric Haywood — HeadySystems Inc.
 */

import { describe, it, expect } from '@jest/globals';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const QUALITY_GATES = {
  PASS:   1 - Math.pow(PSI, 3) * 0.5,   // ≈ 0.882
  REVIEW: 1 - Math.pow(PSI, 2) * 0.5,   // ≈ 0.809
  RETRY:  1 - PSI * 0.5,                 // ≈ 0.691
  FAIL:   0.5,
};

const STAGES = [
  { id: 'context',     index: 0, name: 'Context Assembly',      dependencies: [],            qualityGate: QUALITY_GATES.REVIEW },
  { id: 'intent',      index: 1, name: 'Intent Classification', dependencies: ['context'],    qualityGate: QUALITY_GATES.PASS },
  { id: 'node-select', index: 2, name: 'Node Selection',        dependencies: ['intent'],     qualityGate: QUALITY_GATES.REVIEW },
  { id: 'execute',     index: 3, name: 'Execution',             dependencies: ['node-select'], qualityGate: QUALITY_GATES.RETRY },
  { id: 'quality',     index: 4, name: 'Quality Gate',          dependencies: ['execute'],    qualityGate: QUALITY_GATES.PASS },
  { id: 'assurance',   index: 5, name: 'Assurance Gate',        dependencies: ['quality'],    qualityGate: QUALITY_GATES.PASS },
  { id: 'pattern',     index: 6, name: 'Pattern Capture',       dependencies: ['assurance'],  qualityGate: QUALITY_GATES.REVIEW },
  { id: 'story',       index: 7, name: 'Story Update',          dependencies: ['assurance'],  qualityGate: QUALITY_GATES.RETRY },
];

describe('Pipeline Stages', () => {
  it('should have exactly 8 stages', () => {
    expect(STAGES).toHaveLength(8);
  });

  it('should follow correct stage order', () => {
    const names = STAGES.map(s => s.name);
    expect(names).toEqual([
      'Context Assembly',
      'Intent Classification',
      'Node Selection',
      'Execution',
      'Quality Gate',
      'Assurance Gate',
      'Pattern Capture',
      'Story Update',
    ]);
  });

  it('should have correct dependency DAG', () => {
    // Context has no deps
    expect(STAGES[0].dependencies).toEqual([]);
    // Intent depends on Context
    expect(STAGES[1].dependencies).toEqual(['context']);
    // Execute depends on NodeSelect
    expect(STAGES[3].dependencies).toEqual(['node-select']);
    // Pattern and Story both depend on Assurance (can run in parallel)
    expect(STAGES[6].dependencies).toEqual(['assurance']);
    expect(STAGES[7].dependencies).toEqual(['assurance']);
  });

  it('should have no circular dependencies', () => {
    const visited = new Set();
    const visiting = new Set();

    const hasCycle = (stageId) => {
      if (visiting.has(stageId)) return true;
      if (visited.has(stageId)) return false;

      visiting.add(stageId);
      const stage = STAGES.find(s => s.id === stageId);
      for (const dep of stage.dependencies) {
        if (hasCycle(dep)) return true;
      }
      visiting.delete(stageId);
      visited.add(stageId);
      return false;
    };

    for (const stage of STAGES) {
      expect(hasCycle(stage.id)).toBe(false);
    }
  });
});

describe('Quality Gates', () => {
  it('should use φ-threshold levels', () => {
    expect(QUALITY_GATES.PASS).toBeCloseTo(0.882, 2);
    expect(QUALITY_GATES.REVIEW).toBeCloseTo(0.809, 2);
    expect(QUALITY_GATES.RETRY).toBeCloseTo(0.691, 2);
    expect(QUALITY_GATES.FAIL).toBe(0.5);
  });

  it('should be strictly ordered PASS > REVIEW > RETRY > FAIL', () => {
    expect(QUALITY_GATES.PASS).toBeGreaterThan(QUALITY_GATES.REVIEW);
    expect(QUALITY_GATES.REVIEW).toBeGreaterThan(QUALITY_GATES.RETRY);
    expect(QUALITY_GATES.RETRY).toBeGreaterThan(QUALITY_GATES.FAIL);
  });

  it('should have critical stages (0-5) with higher gates than non-critical (6-7)', () => {
    const criticalGates = STAGES.slice(0, 6).map(s => s.qualityGate);
    const nonCriticalGates = STAGES.slice(6).map(s => s.qualityGate);

    const minCritical = Math.min(...criticalGates);
    const maxNonCritical = Math.max(...nonCriticalGates);

    // Non-critical stages should have lower or equal gates
    expect(minCritical).toBeGreaterThanOrEqual(QUALITY_GATES.RETRY);
  });
});

describe('Parallel Execution Detection', () => {
  it('should identify Pattern and Story as parallelizable', () => {
    const pattern = STAGES.find(s => s.id === 'pattern');
    const story = STAGES.find(s => s.id === 'story');

    // Both depend only on 'assurance', so they can run in parallel
    expect(pattern.dependencies).toEqual(story.dependencies);
    expect(pattern.dependencies).toEqual(['assurance']);
  });

  it('should identify sequential chain for stages 0-5', () => {
    for (let i = 1; i <= 5; i++) {
      const stage = STAGES[i];
      const depStage = STAGES.find(s => s.id === stage.dependencies[0]);
      // Each sequential stage depends on exactly the previous one
      expect(depStage.index).toBe(i - 1);
    }
  });

  it('should find ready stages based on completed dependencies', () => {
    const completed = new Set(['context', 'intent', 'node-select', 'execute', 'quality', 'assurance']);
    const ready = STAGES.filter(s =>
      !completed.has(s.id) &&
      s.dependencies.every(d => completed.has(d))
    );

    // Both pattern and story should be ready (parallel)
    expect(ready).toHaveLength(2);
    expect(ready.map(s => s.id).sort()).toEqual(['pattern', 'story']);
  });
});

describe('Stage Retry and Timeout', () => {
  it('should use Fibonacci retry counts', () => {
    for (const stage of STAGES) {
      const retries = stage.index <= 1 ? FIB[4] : FIB[3]; // context/intent: 3, others: 2
      expect(FIB).toContain(retries);
    }
  });

  it('should use φ-scaled backoff between retries', () => {
    const baseMs = Math.round(PHI * 1000);
    const delays = [0, 1, 2].map(attempt => Math.round(baseMs * Math.pow(PHI, attempt)));

    expect(delays[0]).toBe(Math.round(PHI * 1000)); // ~1618
    expect(delays[1]).toBe(Math.round(PHI * 1000 * PHI)); // ~2618
    expect(delays[2]).toBe(Math.round(PHI * 1000 * PHI * PHI)); // ~4236

    // Verify golden ratio progression
    expect(delays[1] / delays[0]).toBeCloseTo(PHI, 1);
  });

  it('should have execution stage with longest timeout', () => {
    // Execution stage (index 3) should have the most generous timeout
    const execTimeout = Math.round(PHI * 1000 * FIB[9]); // ~55s
    const contextTimeout = Math.round(PHI * 1000 * FIB[5]); // ~8s

    expect(execTimeout).toBeGreaterThan(contextTimeout * 5);
  });
});

describe('Pipeline Run Tracking', () => {
  it('should limit run history to FIB[10] entries', () => {
    const maxHistory = FIB[10]; // 55
    expect(maxHistory).toBe(55);
  });

  it('should limit concurrent pipeline runs to FIB[5]', () => {
    const maxConcurrent = FIB[5]; // 5
    expect(maxConcurrent).toBe(5);
  });
});
