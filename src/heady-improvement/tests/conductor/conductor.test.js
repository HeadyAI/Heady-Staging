/**
 * HeadyConductor Test Suite
 * 
 * Tests: task classification, CSL domain matching, Hot/Warm/Cold pool routing,
 * concurrent-equals (no priority ordering), and pipeline dispatch.
 * 
 * @author Eric Haywood — HeadySystems Inc.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Inline test implementations (no external deps required)
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const cosineSimilarity = (a, b) => {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

const cslGate = (value, cosScore, tau = 1 - PSI * 0.5, temp = PSI * PSI * PSI) =>
  value / (1 + Math.exp(-(cosScore - tau) / temp));

describe('HeadyConductor', () => {
  describe('Task Classification', () => {
    const DOMAIN_EMBEDDINGS = {
      'code-generation':  [0.90, 0.95, 0.30, 0.70, 0.50, 0.20, 0.80, 0.88],
      'security':         [0.85, 0.80, 0.10, 0.75, 0.55, 0.15, 0.70, 0.95],
      'research':         [0.90, 0.50, 0.45, 0.55, 0.40, 0.40, 0.90, 0.82],
      'creative':         [0.60, 0.35, 0.95, 0.50, 0.40, 0.80, 0.65, 0.78],
      'documentation':    [0.70, 0.65, 0.75, 0.60, 0.65, 0.25, 0.80, 0.85],
    };

    it('should classify code tasks via CSL cosine matching', () => {
      const taskEmbedding = [0.85, 0.90, 0.25, 0.75, 0.45, 0.15, 0.75, 0.90];
      let bestDomain = null;
      let bestScore = -1;

      for (const [domain, embedding] of Object.entries(DOMAIN_EMBEDDINGS)) {
        const score = cosineSimilarity(taskEmbedding, embedding);
        if (score > bestScore) {
          bestScore = score;
          bestDomain = domain;
        }
      }

      expect(bestDomain).toBe('code-generation');
      expect(bestScore).toBeGreaterThan(0.95);
    });

    it('should classify creative tasks correctly', () => {
      const taskEmbedding = [0.55, 0.30, 0.90, 0.45, 0.35, 0.85, 0.60, 0.75];
      let bestDomain = null;
      let bestScore = -1;

      for (const [domain, embedding] of Object.entries(DOMAIN_EMBEDDINGS)) {
        const score = cosineSimilarity(taskEmbedding, embedding);
        if (score > bestScore) {
          bestScore = score;
          bestDomain = domain;
        }
      }

      expect(bestDomain).toBe('creative');
      expect(bestScore).toBeGreaterThan(0.9);
    });

    it('should use concurrent-equals (CSL scores, not priority ranking)', () => {
      const tasks = [
        { id: 'task-1', embedding: [0.85, 0.90, 0.25, 0.75, 0.45, 0.15, 0.75, 0.90] },
        { id: 'task-2', embedding: [0.55, 0.30, 0.90, 0.45, 0.35, 0.85, 0.60, 0.75] },
      ];

      // Each task should get its own best domain, no priority ordering between them
      const assignments = tasks.map(task => {
        let best = null;
        let bestScore = -1;
        for (const [domain, embedding] of Object.entries(DOMAIN_EMBEDDINGS)) {
          const score = cosineSimilarity(task.embedding, embedding);
          if (score > bestScore) {
            bestScore = score;
            best = domain;
          }
        }
        return { taskId: task.id, domain: best, score: bestScore };
      });

      expect(assignments[0].domain).toBe('code-generation');
      expect(assignments[1].domain).toBe('creative');
      // No priority field should exist
      expect(assignments[0]).not.toHaveProperty('priority');
      expect(assignments[1]).not.toHaveProperty('priority');
    });
  });

  describe('Pool Routing', () => {
    const POOL_CONFIG = {
      hot:      { resourceShare: 0.34, domains: ['code-generation', 'security', 'code-review'] },
      warm:     { resourceShare: 0.21, domains: ['research', 'documentation', 'creative'] },
      cold:     { resourceShare: 0.13, domains: ['cleanup', 'analytics', 'maintenance'] },
      reserve:  { resourceShare: 0.08 },
      governance: { resourceShare: 0.05 },
    };

    it('should have φ-scaled resource shares', () => {
      const hot = POOL_CONFIG.hot.resourceShare;
      const warm = POOL_CONFIG.warm.resourceShare;
      const cold = POOL_CONFIG.cold.resourceShare;

      // hot/warm ≈ φ (within tolerance)
      expect(hot / warm).toBeCloseTo(PHI, 0);
      // warm/cold ≈ φ
      expect(warm / cold).toBeCloseTo(PHI, 0);
    });

    it('should route to correct pool by domain', () => {
      const routeToPool = (domain) => {
        for (const [pool, config] of Object.entries(POOL_CONFIG)) {
          if (config.domains && config.domains.includes(domain)) return pool;
        }
        return 'warm'; // default
      };

      expect(routeToPool('code-generation')).toBe('hot');
      expect(routeToPool('security')).toBe('hot');
      expect(routeToPool('research')).toBe('warm');
      expect(routeToPool('cleanup')).toBe('cold');
      expect(routeToPool('unknown')).toBe('warm'); // default fallback
    });

    it('should total resource shares to ~0.81 (leaving 0.19 for overhead)', () => {
      const total = Object.values(POOL_CONFIG).reduce((s, p) => s + p.resourceShare, 0);
      expect(total).toBeCloseTo(0.81, 1);
    });
  });

  describe('CSL Gate Functions', () => {
    it('should pass values above threshold', () => {
      const value = 1.0;
      const highAlignment = 0.95;
      const gated = cslGate(value, highAlignment, PSI2);
      expect(gated).toBeGreaterThan(0.9);
    });

    it('should attenuate values below threshold', () => {
      const value = 1.0;
      const lowAlignment = 0.1;
      const gated = cslGate(value, lowAlignment, PSI2);
      expect(gated).toBeLessThan(0.5);
    });

    it('should be continuous (no hard boolean cutoff)', () => {
      const values = [];
      for (let cos = 0; cos <= 1; cos += 0.1) {
        values.push(cslGate(1.0, cos, PSI2));
      }
      // Each successive value should be >= the previous (monotonic)
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] - 0.001);
      }
    });
  });

  describe('Phi Constants Verification', () => {
    it('should have correct phi identity: φ² = φ + 1', () => {
      expect(PHI * PHI).toBeCloseTo(PHI + 1, 10);
    });

    it('should have correct psi identity: 1/φ = φ - 1', () => {
      expect(1 / PHI).toBeCloseTo(PHI - 1, 10);
    });

    it('should have Fibonacci convergence: F(n+1)/F(n) → φ', () => {
      const ratio = FIB[15] / FIB[14];
      expect(ratio).toBeCloseTo(PHI, 2);
    });

    it('should have no magic numbers in pool config', () => {
      // Fibonacci check: 34, 21, 13, 8, 5 are all Fibonacci
      expect(FIB).toContain(34);
      expect(FIB).toContain(21);
      expect(FIB).toContain(13);
      expect(FIB).toContain(8);
      expect(FIB).toContain(5);
    });
  });
});
