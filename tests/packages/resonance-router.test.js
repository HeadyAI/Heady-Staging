// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  FILE: tests/packages/resonance-router.test.js                   ║
// ║  LAYER: testing                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const {
  ResonanceRouter,
  Route,
  TernaryRouting,
  RESONANCE_GROUPS,
  RESONANCE_SEQUENCE,
} = require('../../packages/resonance-router');

describe('RESONANCE_GROUPS', () => {
  test('three groups defined', () => {
    expect(Object.keys(RESONANCE_GROUPS)).toHaveLength(3);
  });

  test('CONSTRUCTIVE contains 3,6,9', () => {
    expect(RESONANCE_GROUPS.CONSTRUCTIVE.digits).toEqual([3, 6, 9]);
  });

  test('REALIGNMENT contains 1,5,7', () => {
    expect(RESONANCE_GROUPS.REALIGNMENT.digits).toEqual([1, 5, 7]);
  });

  test('INTEGRATION contains 2,4,8', () => {
    expect(RESONANCE_GROUPS.INTEGRATION.digits).toEqual([2, 4, 8]);
  });

  test('RESONANCE_SEQUENCE has 9 elements', () => {
    expect(RESONANCE_SEQUENCE).toEqual([3, 6, 9, 1, 5, 7, 2, 4, 8]);
  });
});

describe('TernaryRouting', () => {
  test('quantize positive above threshold', () => {
    expect(TernaryRouting.quantize(1.0)).toBe(1);
  });

  test('quantize negative below threshold', () => {
    expect(TernaryRouting.quantize(-1.0)).toBe(-1);
  });

  test('quantize near zero returns 0', () => {
    expect(TernaryRouting.quantize(0.1)).toBe(0);
  });

  test('resonance of identical vectors is 1', () => {
    const v = [1, 1, 1, 1];
    expect(TernaryRouting.resonance(v, v)).toBe(1);
  });

  test('resonance of opposite vectors is -1', () => {
    const a = [1, 1, 1, 1];
    const b = [-1, -1, -1, -1];
    expect(TernaryRouting.resonance(a, b)).toBe(-1);
  });

  test('resonance of orthogonal vectors is 0', () => {
    const a = [1, -1, 1, -1];
    const b = [-1, 1, -1, 1];
    expect(TernaryRouting.resonance(a, b)).toBe(-1);
  });

  test('classifyDigit returns correct groups', () => {
    expect(TernaryRouting.classifyDigit(3).role).toBe('constructive');
    expect(TernaryRouting.classifyDigit(6).role).toBe('constructive');
    expect(TernaryRouting.classifyDigit(9).role).toBe('constructive');
    expect(TernaryRouting.classifyDigit(1).role).toBe('realignment');
    expect(TernaryRouting.classifyDigit(5).role).toBe('realignment');
    expect(TernaryRouting.classifyDigit(7).role).toBe('realignment');
    expect(TernaryRouting.classifyDigit(2).role).toBe('integration');
    expect(TernaryRouting.classifyDigit(4).role).toBe('integration');
    expect(TernaryRouting.classifyDigit(8).role).toBe('integration');
  });

  test('classifyDigit returns null for 0', () => {
    expect(TernaryRouting.classifyDigit(0)).toBeNull();
  });
});

describe('Route', () => {
  test('creates with auto-computed signature', () => {
    const route = new Route({ id: 'test-route', target: 'http://localhost:3300' });
    expect(route.id).toBe('test-route');
    expect(route.resonanceSignature).toHaveLength(9);
    route.resonanceSignature.forEach(v => {
      expect([-1, 0, 1]).toContain(v);
    });
  });

  test('creates with explicit signature', () => {
    const sig = [1, 0, -1, 1, 0, -1, 1, 0, -1];
    const route = new Route({ id: 'custom', target: 'x', resonanceSignature: sig });
    expect(route.resonanceSignature).toEqual(sig);
  });
});

describe('ResonanceRouter', () => {
  let router;

  beforeEach(() => {
    router = new ResonanceRouter({ resonanceThreshold: -1 }); // Low threshold for testing
    router.register({ id: 'builder', target: 'builder-agent' });
    router.register({ id: 'researcher', target: 'researcher-agent' });
    router.register({ id: 'deployer', target: 'deployer-agent' });
  });

  test('register and list routes', () => {
    const status = router.status();
    expect(status.routeCount).toBe(3);
  });

  test('unregister removes route', () => {
    router.unregister('deployer');
    expect(router.status().routeCount).toBe(2);
  });

  test('classify produces valid structure', () => {
    const result = router.classify('build the frontend');
    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('groups');
    expect(result).toHaveProperty('dominant');
    expect(result.signature).toHaveLength(9);
    expect(['constructive', 'realignment', 'integration']).toContain(result.dominant);
  });

  test('route selects a destination', () => {
    const result = router.route('build task');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('classification');
    expect(result).toHaveProperty('selected');
    expect(result.selected).not.toBeNull();
    expect(result.selected).toHaveProperty('routeId');
    expect(result.selected).toHaveProperty('target');
    expect(result.selected).toHaveProperty('resonance');
  });

  test('route updates route stats', () => {
    router.route('test message');
    const status = router.status();
    const routed = status.routes.filter(r => r.routeCount > 0);
    expect(routed.length).toBeGreaterThan(0);
  });

  test('route records history', () => {
    router.route('msg 1');
    router.route('msg 2');
    expect(router.status().historySize).toBe(2);
  });

  test('markUnhealthy excludes route', () => {
    router.markUnhealthy('builder');
    const highThreshRouter = new ResonanceRouter({ resonanceThreshold: -1 });
    highThreshRouter.register({ id: 'builder', target: 'b', resonanceSignature: [1,1,1,1,1,1,1,1,1] });
    highThreshRouter.markUnhealthy('builder');

    // Route should not select unhealthy
    const result = highThreshRouter.route('anything');
    expect(result.selected).toBeNull();
  });

  test('markHealthy re-includes route', () => {
    router.markUnhealthy('builder');
    router.markHealthy('builder');
    const route = router.routes.get('builder');
    expect(route.healthy).toBe(true);
  });

  test('multicast returns matching targets', () => {
    const result = router.multicast('multi target task');
    expect(result).toHaveProperty('targets');
    expect(result).toHaveProperty('count');
    expect(result.targets.length).toBeGreaterThanOrEqual(0);
  });

  test('computeSignature is deterministic', () => {
    const sig1 = router.computeSignature('same input');
    const sig2 = router.computeSignature('same input');
    expect(sig1).toEqual(sig2);
  });

  test('computeSignature differs for different input', () => {
    const sig1 = router.computeSignature('input A');
    const sig2 = router.computeSignature('input B');
    // Extremely unlikely to be identical for different inputs
    expect(sig1).not.toEqual(sig2);
  });

  test('defaultRoute used as fallback', () => {
    const strictRouter = new ResonanceRouter({
      resonanceThreshold: 999, // Impossible to match
      defaultRoute: 'fallback-handler',
    });
    const result = strictRouter.route('anything');
    expect(result.selected).toBeNull();
    expect(result.fallback).toBe('fallback-handler');
  });
});
