/**
 * PROTOCOL B: Tool Registry Integrity Tests
 * PROTOCOL D: φ-Constants Mathematical Integrity Tests
 * =====================================================
 * Validates all 42 tools are properly registered and all golden ratio
 * constants maintain mathematical consistency.
 *
 * @module tests/protocol/tool-registry-phi-constants.test.js
 */
'use strict';

const path = require('path');

const PHI_CONSTANTS_PATH = path.join(__dirname, '../../services/heady-mcp-server/src/config/phi-constants');
const REGISTRY_PATH = path.join(__dirname, '../../services/heady-mcp-server/src/tools/registry');

const { PHI, PSI, PSI2, FIB, CSL, TIMEOUTS, RATE_LIMITS, PORTS, phiRetryDelays, cslGate } = require(PHI_CONSTANTS_PATH);
const { createToolRegistry } = require(REGISTRY_PATH);

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL B: Tool Registry Integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('PROTOCOL B: Tool Registry Integrity', () => {
  let registry;

  beforeAll(() => {
    registry = createToolRegistry();
  });

  test('B01: 47 tools registered (42 core + 5 Drupal CMS)', () => {
    // Discovery: 42 core tools + 5 Drupal CMS tools = 47 total
    expect(registry.tools.length).toBe(47);
  });

  test('B02: no duplicate tool names', () => {
    const names = registry.tools.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
    if (unique.size !== names.length) {
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      throw new Error(`Duplicate tools: ${dupes.join(', ')}`);
    }
  });

  test('B03: all tools have valid inputSchema with type: object', () => {
    for (const tool of registry.tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  test('B04: all tools have name, description, inputSchema', () => {
    for (const tool of registry.tools) {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema).toBeDefined();
    }
  });

  test('B05: every tool name has a handler in handlers Map', () => {
    for (const tool of registry.tools) {
      const handler = registry.handlers.get(tool.name);
      expect(handler).toBeDefined();
      expect(typeof handler.handler).toBe('function');
    }
  });

  test('B06: every handler has a category string', () => {
    for (const [name, handler] of registry.handlers) {
      expect(typeof handler.category).toBe('string');
      expect(handler.category.length).toBeGreaterThan(0);
    }
  });

  test('B07: every handler has numeric phiTier 0-6', () => {
    for (const [name, handler] of registry.handlers) {
      expect(typeof handler.phiTier).toBe('number');
      expect(handler.phiTier).toBeGreaterThanOrEqual(0);
      expect(handler.phiTier).toBeLessThanOrEqual(6);
    }
  });

  test('B08: tier distribution has tools at each level', () => {
    const tiers = {};
    for (const [, handler] of registry.handlers) {
      tiers[handler.phiTier] = (tiers[handler.phiTier] || 0) + 1;
    }
    // At minimum tiers 0-6 should have at least 1 tool
    for (let t = 0; t <= 6; t++) {
      expect(tiers[t]).toBeGreaterThan(0);
    }
  });

  test('B09: all tool names follow heady_ convention', () => {
    for (const tool of registry.tools) {
      expect(tool.name.startsWith('heady_')).toBe(true);
    }
  });

  test('B10: all descriptions are meaningful (> 20 chars)', () => {
    for (const tool of registry.tools) {
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  test('B_EXTRA: tool categories cover expected domains', () => {
    const categories = new Set();
    for (const [, handler] of registry.handlers) {
      categories.add(handler.category);
    }
    const expected = ['intelligence', 'analysis', 'execution', 'ai', 'ops', 'memory', 'search', 'edge', 'orchestration', 'monitoring', 'cms'];
    for (const cat of expected) {
      expect(categories.has(cat)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL D: φ-Constants Mathematical Integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('PROTOCOL D: φ-Constants Mathematical Integrity', () => {
  const EPSILON = 1e-10;

  test('D01: PHI precision matches golden ratio', () => {
    expect(PHI).toBe(1.618033988749895);
    // Also verify against formula: (1 + √5) / 2
    const calculated = (1 + Math.sqrt(5)) / 2;
    expect(Math.abs(PHI - calculated)).toBeLessThan(EPSILON);
  });

  test('D02: PSI = 1/PHI', () => {
    expect(Math.abs(PSI - 1 / PHI)).toBeLessThan(EPSILON);
  });

  test('D03: PSI2 = 1 - PSI', () => {
    expect(Math.abs(PSI2 - (1 - PSI))).toBeLessThan(EPSILON);
  });

  test('D04: PHI² = PHI + 1 (golden ratio defining property)', () => {
    expect(Math.abs(PHI * PHI - (PHI + 1))).toBeLessThan(EPSILON);
  });

  test('D05: Fibonacci sequence correctness', () => {
    expect(FIB[0]).toBe(1);
    expect(FIB[1]).toBe(1);
    for (let i = 2; i < FIB.length; i++) {
      expect(FIB[i]).toBe(FIB[i - 1] + FIB[i - 2]);
    }
  });

  test('D06: CSL gate thresholds are properly ordered', () => {
    expect(CSL.SUPPRESS).toBeLessThan(CSL.INCLUDE);
    expect(CSL.INCLUDE).toBeLessThan(CSL.BOOST);
    expect(CSL.BOOST).toBeLessThan(CSL.INJECT);
  });

  test('D07: cslGate suppresses low confidence', () => {
    const result = cslGate(1.0, 0.1); // confidence < SUPPRESS (0.236)
    expect(result).toBe(0);
  });

  test('D08: cslGate includes with PSI2 weight', () => {
    const signal = 1.0;
    const confidence = 0.3; // between SUPPRESS and BOOST
    const result = cslGate(signal, confidence);
    expect(Math.abs(result - signal * PSI2)).toBeLessThan(EPSILON);
  });

  test('D09: cslGate boosts at threshold', () => {
    const signal = 1.0;
    const confidence = 0.65; // >= BOOST (0.618) but < INJECT (0.718)
    const result = cslGate(signal, confidence);
    expect(Math.abs(result - signal * confidence)).toBeLessThan(EPSILON);
  });

  test('D10: cslGate injects at high confidence', () => {
    const signal = 1.0;
    const confidence = 0.8; // >= INJECT (0.718)
    const result = cslGate(signal, confidence);
    expect(Math.abs(result - signal * PHI)).toBeLessThan(EPSILON);
  });

  test('D11: all port values are unique', () => {
    const portValues = Object.values(PORTS);
    const unique = new Set(portValues);
    expect(unique.size).toBe(portValues.length);
  });

  test('D12: rate limits use Fibonacci numbers', () => {
    const fibSet = new Set(FIB);
    for (const [tier, limit] of Object.entries(RATE_LIMITS)) {
      expect(fibSet.has(limit)).toBe(true);
    }
  });

  test('D13: phiRetryDelays produces φ-scaled delays', () => {
    const delays = phiRetryDelays(5);
    expect(delays.length).toBe(5);
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(Math.round(1000 * PHI));
    expect(delays[2]).toBe(Math.round(1000 * PHI * PHI));
    // Verify each delay is φ times the previous
    for (let i = 1; i < delays.length; i++) {
      const ratio = delays[i] / delays[i - 1];
      expect(Math.abs(ratio - PHI)).toBeLessThan(0.01);
    }
  });

  test('D_EXTRA: TIMEOUTS are φ-scaled from base', () => {
    expect(Math.abs(TIMEOUTS.CONNECT - PHI)).toBeLessThan(EPSILON);
    expect(TIMEOUTS.REQUEST).toBeCloseTo(PHI * PHI + 1, 2);
    expect(TIMEOUTS.IDLE).toBeCloseTo(PHI * 8, 2);
    expect(TIMEOUTS.LONG).toBeCloseTo(PHI * 21, 2);
    expect(TIMEOUTS.MAX).toBeCloseTo(PHI * 55, 2);
  });
});
