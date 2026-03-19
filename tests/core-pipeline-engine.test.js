/**
 * Heady™ Core Pipeline Engine — Test Suite
 * ═════════════════════════════════════════
 *
 * Tests core/pipeline/engine.js (PipelineEngine) with
 * core/pipeline/stages.js (21-stage definitions).
 */
'use strict';

const { PipelineEngine, RUN_STATE } = require('../core/pipeline/engine');
const { STAGES, STAGE_NAMES, VARIANTS } = require('../core/pipeline/stages');

describe('Core PipelineEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PipelineEngine({ maxConcurrentRuns: 3, maxRetries: 1 });
  });

  // ─── Instantiation ──────────────────────────────────────────────

  test('instantiates without error', () => {
    expect(engine).toBeDefined();
    expect(engine.totalRuns).toBe(0);
    expect(engine.totalCompleted).toBe(0);
    expect(engine.totalFailed).toBe(0);
  });

  test('rejects registration of unknown stage names', () => {
    expect(() => engine.registerStage('NONEXISTENT', async () => {})).toThrow('Unknown stage');
  });

  test('accepts registration of valid stage names', () => {
    expect(() => engine.registerStage('INTAKE', async () => ({ status: 'ok' }))).not.toThrow();
  });

  // ─── Execution ──────────────────────────────────────────────────

  test('FAST variant completes with correct 8 stages', async () => {
    // Register handlers for all FAST stages
    for (const name of VARIANTS.FAST) {
      engine.registerStage(name, async (ctx) => ({
        stage: name,
        confidence: 0.85,
      }));
    }

    const result = await engine.execute({ task: 'test' }, { variant: 'FAST' });
    expect(result.state).toBe(RUN_STATE.COMPLETED);
    expect(result.variant).toBe('FAST');
    expect(result.stages).toEqual(VARIANTS.FAST);
    expect(result.elapsed).toBeGreaterThanOrEqual(0);
  });

  test('STANDARD variant completes with correct 13 stages', async () => {
    for (const name of VARIANTS.STANDARD) {
      engine.registerStage(name, async (ctx) => ({
        stage: name,
        confidence: 0.85,
      }));
    }

    const result = await engine.execute({ task: 'test' }, { variant: 'STANDARD' });
    expect(result.state).toBe(RUN_STATE.COMPLETED);
    expect(result.variant).toBe('STANDARD');
    expect(result.stages).toHaveLength(13);
  });

  test('executeHCFP maps to STANDARD variant', async () => {
    for (const name of VARIANTS.STANDARD) {
      engine.registerStage(name, async (ctx) => ({
        stage: name,
        confidence: 0.85,
      }));
    }

    const result = await engine.executeHCFP({ task: 'hcfp-test' });
    expect(result.variant).toBe('STANDARD');
    expect(result.state).toBe(RUN_STATE.COMPLETED);
  });

  // ─── Stage Skip ─────────────────────────────────────────────────

  test('stage with no handler is skipped (not failed)', async () => {
    // Only register CHANNEL_ENTRY, leave RECON unregistered
    engine.registerStage('CHANNEL_ENTRY', async () => ({ status: 'ok', confidence: 0.9 }));
    // RECON has no handler — should be skipped
    engine.registerStage('INTAKE', async () => ({ status: 'ok', confidence: 0.9 }));

    // Use a custom mini-variant to test
    const result = await engine.execute({ task: 'test' }, { variant: 'FAST' });
    expect(result.state).toBe(RUN_STATE.COMPLETED);

    // RECON should be skipped in results
    expect(result.results.RECON).toEqual(
      expect.objectContaining({ skipped: true, reason: 'no_handler' })
    );
  });

  // ─── Health ─────────────────────────────────────────────────────

  test('health() returns correct shape', () => {
    const health = engine.health();
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('totalRuns', 0);
    expect(health).toHaveProperty('totalCompleted', 0);
    expect(health).toHaveProperty('totalFailed', 0);
    expect(health).toHaveProperty('activeRuns');
    expect(health).toHaveProperty('queuedRuns');
    expect(health).toHaveProperty('circuitBreakers');
  });

  // ─── Cancel ─────────────────────────────────────────────────────

  test('cancel returns false for unknown runId', () => {
    expect(engine.cancel('nonexistent')).toBe(false);
  });

  // ─── Run Status ─────────────────────────────────────────────────

  test('getRunStatus returns null for unknown runId', () => {
    expect(engine.getRunStatus('nonexistent')).toBeNull();
  });

  // ─── Error Handling ─────────────────────────────────────────────

  test('rejects unknown variant', async () => {
    await expect(
      engine.execute({ task: 'test' }, { variant: 'NONEXISTENT' })
    ).rejects.toThrow('Unknown variant');
  });

  // ─── Event Emission ─────────────────────────────────────────────

  test('emits run:start and run:complete events', async () => {
    const events = [];
    engine.on('run:start', (e) => events.push('start'));
    engine.on('run:complete', (e) => events.push('complete'));

    for (const name of VARIANTS.FAST) {
      engine.registerStage(name, async () => ({ confidence: 0.9 }));
    }

    await engine.execute({ task: 'test' }, { variant: 'FAST' });
    expect(events).toContain('start');
    expect(events).toContain('complete');
  });

  // ─── Stage Constants ────────────────────────────────────────────

  test('STAGES has 21 stage definitions', () => {
    expect(STAGE_NAMES).toHaveLength(21);
  });

  test('every stage has id, phase, timeout, and csl', () => {
    for (const [name, config] of Object.entries(STAGES)) {
      expect(config).toHaveProperty('id');
      expect(config).toHaveProperty('phase');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('csl');
    }
  });

  test('VARIANTS has 5 variants', () => {
    expect(Object.keys(VARIANTS)).toHaveLength(5);
    expect(Object.keys(VARIANTS)).toEqual(
      expect.arrayContaining(['FAST', 'STANDARD', 'FULL', 'ARENA', 'LEARNING'])
    );
  });
});
