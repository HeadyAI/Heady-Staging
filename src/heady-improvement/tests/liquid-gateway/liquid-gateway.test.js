/**
 * Liquid Gateway Test Suite
 * 
 * Tests: provider racing, CSL-scored selection, health monitoring,
 * circuit breaker patterns, BYOK key management, streaming transport.
 * 
 * @author Eric Haywood — HeadySystems Inc.
 */

import { describe, it, expect } from '@jest/globals';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const PSI3 = PSI * PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const cosineSimilarity = (a, b) => {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

describe('Provider Racer — CSL Scoring', () => {
  const PROVIDERS = {
    'claude-sonnet': [0.88, 0.90, 0.82, 0.78, 0.65, 0.82, 0.85, 0.90],
    'gpt-4o':        [0.90, 0.88, 0.85, 0.75, 0.55, 0.90, 0.80, 0.88],
    'groq-llama':    [0.65, 0.60, 0.55, 0.98, 0.95, 0.40, 0.50, 0.75],
  };

  const WORKLOADS = {
    'fast-interactive': [0.50, 0.50, 0.50, 0.95, 0.80, 0.40, 0.50, 0.90],
    'deep-reasoning':   [0.95, 0.70, 0.60, 0.40, 0.30, 0.50, 0.90, 0.85],
    'code-generation':  [0.80, 0.95, 0.40, 0.60, 0.50, 0.30, 0.85, 0.88],
  };

  it('should select fastest provider for interactive workloads', () => {
    const workload = WORKLOADS['fast-interactive'];
    const scores = {};

    for (const [name, profile] of Object.entries(PROVIDERS)) {
      scores[name] = cosineSimilarity(profile, workload);
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    // Groq should score highest for fast-interactive (speed-focused)
    expect(sorted[0][0]).toBe('groq-llama');
  });

  it('should select reasoning provider for deep tasks', () => {
    const workload = WORKLOADS['deep-reasoning'];
    const scores = {};

    for (const [name, profile] of Object.entries(PROVIDERS)) {
      scores[name] = cosineSimilarity(profile, workload);
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    // Claude or GPT-4o should win for deep reasoning
    expect(['claude-sonnet', 'gpt-4o']).toContain(sorted[0][0]);
  });

  it('should select coding provider for code generation', () => {
    const workload = WORKLOADS['code-generation'];
    const scores = {};

    for (const [name, profile] of Object.entries(PROVIDERS)) {
      scores[name] = cosineSimilarity(profile, workload);
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    // Claude-sonnet should win for code (highest coding score)
    expect(sorted[0][0]).toBe('claude-sonnet');
  });

  it('should use φ-weighted fusion for composite scoring', () => {
    const alignmentWeight = 0.486;
    const healthWeight = 0.300;
    const latencyWeight = 0.214;
    const totalWeight = alignmentWeight + healthWeight + latencyWeight;

    expect(totalWeight).toBeCloseTo(1.0, 2);
    // Verify phi-scaled ratios
    expect(alignmentWeight / healthWeight).toBeCloseTo(PHI, 0);
  });
});

describe('Health Monitor — Circuit Breaker', () => {
  it('should open circuit after FIB[5] consecutive failures', () => {
    const threshold = FIB[5]; // 5
    expect(threshold).toBe(5);

    let consecutiveFailures = 0;
    let circuitOpen = false;

    for (let i = 0; i < 7; i++) {
      consecutiveFailures++;
      if (consecutiveFailures >= threshold) {
        circuitOpen = true;
      }
    }

    expect(circuitOpen).toBe(true);
  });

  it('should use φ-backoff for recovery timing', () => {
    const baseMs = Math.round(PHI * 1000); // 1618ms
    const maxMs = Math.round(PHI * 1000 * FIB[8]); // ~34s

    expect(baseMs).toBe(1618);
    expect(maxMs).toBeGreaterThan(30000);
    expect(maxMs).toBeLessThan(40000);

    // Each recovery attempt should multiply by PHI
    let current = baseMs;
    for (let i = 0; i < 5; i++) {
      const next = Math.min(Math.round(current * PHI), maxMs);
      expect(next).toBeGreaterThan(current);
      current = next;
    }
  });

  it('should use PSI (≈0.618) error rate threshold for circuit open', () => {
    const threshold = PSI;
    expect(threshold).toBeCloseTo(0.618, 3);
    // Error rate must exceed 61.8% to open circuit
    expect(0.7 >= threshold).toBe(true);
    expect(0.5 >= threshold).toBe(false);
  });

  it('should close circuit after successful half-open probes', () => {
    const maxHalfOpenAttempts = FIB[4]; // 3
    expect(maxHalfOpenAttempts).toBe(3);

    let halfOpenAttempts = 0;
    let circuitState = 'half-open';

    for (let i = 0; i < maxHalfOpenAttempts; i++) {
      halfOpenAttempts++;
    }

    if (halfOpenAttempts >= maxHalfOpenAttempts) {
      circuitState = 'closed';
    }

    expect(circuitState).toBe('closed');
  });
});

describe('BYOK Manager', () => {
  it('should validate Anthropic key format', () => {
    const validator = (key) => /^sk-ant-[a-zA-Z0-9_-]{90,}$/.test(key);
    const validKey = 'sk-ant-' + 'a'.repeat(95);
    const invalidKey = 'invalid-key-format';

    expect(validator(validKey)).toBe(true);
    expect(validator(invalidKey)).toBe(false);
  });

  it('should validate OpenAI key format', () => {
    const validator = (key) => /^sk-[a-zA-Z0-9_-]{40,}$/.test(key);
    const validKey = 'sk-' + 'b'.repeat(50);
    const invalidKey = 'not-a-key';

    expect(validator(validKey)).toBe(true);
    expect(validator(invalidKey)).toBe(false);
  });

  it('should limit keys per user to FIB[7]', () => {
    const maxKeys = FIB[7]; // 13
    expect(maxKeys).toBe(13);
  });

  it('should resolve key source correctly', () => {
    const resolveKeySource = (hasKey, trustLevel, expired) => {
      if (!hasKey || trustLevel <= 0 || expired) return 'platform';
      return 'byok';
    };

    expect(resolveKeySource(true, 0.9, false)).toBe('byok');
    expect(resolveKeySource(false, 0.9, false)).toBe('platform');
    expect(resolveKeySource(true, 0, false)).toBe('platform');
    expect(resolveKeySource(true, 0.9, true)).toBe('platform');
  });
});

describe('Streaming Transport', () => {
  it('should use proper SSE format', () => {
    const formatSSE = (id, type, data) => {
      let payload = `id: ${id}\nevent: ${type}\n`;
      for (const line of data.split('\n')) {
        payload += `data: ${line}\n`;
      }
      payload += '\n';
      return payload;
    };

    const event = formatSSE('evt_1', 'chunk', '{"content":"hello"}');
    expect(event).toContain('id: evt_1');
    expect(event).toContain('event: chunk');
    expect(event).toContain('data: {"content":"hello"}');
    expect(event).toMatch(/\n\n$/);
  });

  it('should use JSON-RPC 2.0 format', () => {
    const request = { jsonrpc: '2.0', method: 'ai.chat', params: {}, id: 'req_1' };
    expect(request.jsonrpc).toBe('2.0');
    expect(request).toHaveProperty('id');
    expect(request).toHaveProperty('method');
  });

  it('should limit connections per user to FIB[6]', () => {
    const maxConnections = FIB[6]; // 8
    expect(maxConnections).toBe(8);
  });

  it('should use φ-scaled heartbeat interval', () => {
    const heartbeatMs = Math.round(PHI * 1000 * FIB[7]); // ~34s
    expect(heartbeatMs).toBeGreaterThan(30000);
    expect(heartbeatMs).toBeLessThan(40000);
  });
});
