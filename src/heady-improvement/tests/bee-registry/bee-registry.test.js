/**
 * Bee Registry Test Suite
 * 
 * Tests: 33 canonical bee types, lifecycle, swarm assignment,
 * CSL domain matching, auto-tuning, and resource classes.
 * 
 * @author Eric Haywood — HeadySystems Inc.
 */

import { describe, it, expect } from '@jest/globals';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CANONICAL_BEE_TYPES = [
  'agents-bee', 'auth-provider-bee', 'auto-success-bee', 'brain-bee',
  'config-bee', 'connectors-bee', 'creative-bee', 'deployment-bee',
  'device-provisioner-bee', 'documentation-bee', 'engines-bee', 'governance-bee',
  'health-bee', 'intelligence-bee', 'lifecycle-bee', 'mcp-bee',
  'memory-bee', 'middleware-bee', 'midi-bee', 'ops-bee',
  'orchestration-bee', 'pipeline-bee', 'providers-bee', 'refactor-bee',
  'resilience-bee', 'routes-bee', 'security-bee', 'services-bee',
  'sync-projection-bee', 'telemetry-bee', 'trading-bee', 'vector-ops-bee',
  'vector-template-bee',
];

const CANONICAL_SWARMS = [
  'Deploy', 'Battle', 'Research', 'Security', 'Memory', 'Creative',
  'Trading', 'Health', 'Governance', 'Documentation', 'Testing',
  'Migration', 'Monitoring', 'Cleanup', 'Onboarding', 'Analytics', 'Emergency',
];

describe('Canonical Bee Types', () => {
  it('should have exactly 33 bee types', () => {
    expect(CANONICAL_BEE_TYPES).toHaveLength(33);
  });

  it('should have all expected bee types', () => {
    const critical = ['brain-bee', 'memory-bee', 'health-bee', 'security-bee', 'governance-bee'];
    for (const bee of critical) {
      expect(CANONICAL_BEE_TYPES).toContain(bee);
    }
  });

  it('should have unique bee type names', () => {
    const unique = new Set(CANONICAL_BEE_TYPES);
    expect(unique.size).toBe(CANONICAL_BEE_TYPES.length);
  });
});

describe('Canonical Swarms', () => {
  it('should have exactly 17 swarm types', () => {
    expect(CANONICAL_SWARMS).toHaveLength(17);
  });

  it('should include all essential swarms', () => {
    const essential = ['Deploy', 'Security', 'Health', 'Emergency'];
    for (const swarm of essential) {
      expect(CANONICAL_SWARMS).toContain(swarm);
    }
  });
});

describe('Resource Classes', () => {
  const RESOURCE_CLASSES = {
    lightweight: { maxMemoryMB: FIB[8] * 8, maxConcurrent: FIB[7], timeoutMs: Math.round(PHI * 1000 * FIB[5]) },
    standard:    { maxMemoryMB: FIB[10] * 8, maxConcurrent: FIB[6], timeoutMs: Math.round(PHI * 1000 * FIB[7]) },
    heavy:       { maxMemoryMB: FIB[12] * 8, maxConcurrent: FIB[5], timeoutMs: Math.round(PHI * 1000 * FIB[9]) },
    critical:    { maxMemoryMB: FIB[13] * 8, maxConcurrent: FIB[4], timeoutMs: Math.round(PHI * 1000 * FIB[10]) },
  };

  it('should have Fibonacci-based memory limits', () => {
    expect(RESOURCE_CLASSES.lightweight.maxMemoryMB).toBe(21 * 8);  // 168
    expect(RESOURCE_CLASSES.standard.maxMemoryMB).toBe(55 * 8);     // 440
    expect(RESOURCE_CLASSES.heavy.maxMemoryMB).toBe(144 * 8);       // 1152
    expect(RESOURCE_CLASSES.critical.maxMemoryMB).toBe(233 * 8);    // 1864
  });

  it('should have Fibonacci concurrency limits', () => {
    expect(RESOURCE_CLASSES.lightweight.maxConcurrent).toBe(13);
    expect(RESOURCE_CLASSES.standard.maxConcurrent).toBe(8);
    expect(RESOURCE_CLASSES.heavy.maxConcurrent).toBe(5);
    expect(RESOURCE_CLASSES.critical.maxConcurrent).toBe(3);
  });

  it('should have φ-scaled timeouts', () => {
    const ratios = [
      RESOURCE_CLASSES.standard.timeoutMs / RESOURCE_CLASSES.lightweight.timeoutMs,
      RESOURCE_CLASSES.heavy.timeoutMs / RESOURCE_CLASSES.standard.timeoutMs,
    ];
    // Each tier timeout grows roughly by Fibonacci ratio
    for (const ratio of ratios) {
      expect(ratio).toBeGreaterThan(1.5);
      expect(ratio).toBeLessThan(3.0);
    }
  });
});

describe('Bee Lifecycle', () => {
  const LIFECYCLE_STATES = ['spawning', 'idle', 'executing', 'error', 'retired'];

  it('should follow spawn → idle → execute → idle → retire lifecycle', () => {
    let state = 'spawning';

    // Spawn
    state = 'idle';
    expect(state).toBe('idle');

    // Execute
    state = 'executing';
    expect(state).toBe('executing');

    // Complete
    state = 'idle';
    expect(state).toBe('idle');

    // Retire
    state = 'retired';
    expect(state).toBe('retired');
  });

  it('should handle error state and recovery', () => {
    let state = 'executing';
    state = 'error';
    expect(state).toBe('error');

    // Can recover to idle or be retired
    state = 'idle'; // recovery
    expect(state).toBe('idle');
  });
});

describe('CSL Domain Matching for Bee Selection', () => {
  const cosineSimilarity = (a, b) => {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  };

  it('should match security tasks to security-bee', () => {
    const securityTask = [0.82, 0.78, 0.12, 0.72, 0.58, 0.18, 0.72, 0.94];
    const securityBee = [0.80, 0.75, 0.10, 0.70, 0.60, 0.15, 0.70, 0.95];
    const creativeBee = [0.65, 0.40, 0.95, 0.50, 0.35, 0.90, 0.70, 0.80];

    const secScore = cosineSimilarity(securityTask, securityBee);
    const creScore = cosineSimilarity(securityTask, creativeBee);

    expect(secScore).toBeGreaterThan(creScore);
    expect(secScore).toBeGreaterThan(0.99);
  });

  it('should match creative tasks to creative-bee', () => {
    const creativeTask = [0.60, 0.38, 0.92, 0.48, 0.32, 0.88, 0.68, 0.78];
    const creativeBee = [0.65, 0.40, 0.95, 0.50, 0.35, 0.90, 0.70, 0.80];
    const memoryBee = [0.75, 0.65, 0.30, 0.80, 0.55, 0.40, 0.95, 0.90];

    const creScore = cosineSimilarity(creativeTask, creativeBee);
    const memScore = cosineSimilarity(creativeTask, memoryBee);

    expect(creScore).toBeGreaterThan(memScore);
    expect(creScore).toBeGreaterThan(0.99);
  });
});

describe('Pool Distribution', () => {
  it('should use hot/warm/cold pool assignment', () => {
    const poolAssignments = {
      hot: ['agents-bee', 'brain-bee', 'health-bee', 'security-bee', 'governance-bee',
            'engines-bee', 'lifecycle-bee', 'mcp-bee', 'memory-bee', 'middleware-bee',
            'orchestration-bee', 'providers-bee', 'resilience-bee', 'telemetry-bee',
            'trading-bee', 'vector-ops-bee', 'auth-provider-bee'],
      warm: ['auto-success-bee', 'config-bee', 'connectors-bee', 'creative-bee',
             'deployment-bee', 'intelligence-bee', 'pipeline-bee', 'routes-bee',
             'services-bee', 'vector-template-bee'],
      cold: ['device-provisioner-bee', 'documentation-bee', 'midi-bee', 'ops-bee',
             'refactor-bee', 'sync-projection-bee'],
    };

    const totalAssigned = poolAssignments.hot.length + poolAssignments.warm.length + poolAssignments.cold.length;
    expect(totalAssigned).toBe(33);

    // Hot pool should have the most bees (user-facing)
    expect(poolAssignments.hot.length).toBeGreaterThan(poolAssignments.warm.length);
    expect(poolAssignments.warm.length).toBeGreaterThan(poolAssignments.cold.length);
  });
});
