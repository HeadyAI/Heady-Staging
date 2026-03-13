// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  FILE: tests/packages/spatial-orchestrator.test.js               ║
// ║  LAYER: testing                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const { SpatialOrchestrator, MetatronsCube, PlatonicArchetype, PHI, PSI } = require('../../packages/spatial-orchestrator');

describe('MetatronsCube', () => {
  let cube;

  beforeEach(() => {
    cube = new MetatronsCube();
  });

  test('has exactly 13 spheres', () => {
    expect(cube.spheres.size).toBe(13);
  });

  test('center sphere at origin', () => {
    const center = cube.spheres.get(0);
    expect(center.position).toEqual([0, 0, 0]);
    expect(center.ring).toBe('center');
  });

  test('inner ring has 6 spheres', () => {
    let count = 0;
    for (const [, s] of cube.spheres) {
      if (s.ring === 'inner') count++;
    }
    expect(count).toBe(6);
  });

  test('outer ring has 6 spheres', () => {
    let count = 0;
    for (const [, s] of cube.spheres) {
      if (s.ring === 'outer') count++;
    }
    expect(count).toBe(6);
  });

  test('center connects to all inner spheres', () => {
    const center = cube.spheres.get(0);
    expect(center.connections).toHaveLength(6);
    for (let i = 1; i <= 6; i++) {
      expect(center.connections).toContain(i);
    }
  });

  test('inner spheres at unit distance from center', () => {
    for (let i = 1; i <= 6; i++) {
      const s = cube.spheres.get(i);
      const dist = Math.sqrt(s.position[0] ** 2 + s.position[1] ** 2 + s.position[2] ** 2);
      expect(dist).toBeCloseTo(1.0, 5);
    }
  });

  test('outer spheres at PHI distance from center', () => {
    for (let i = 7; i <= 12; i++) {
      const s = cube.spheres.get(i);
      const dist = Math.sqrt(s.position[0] ** 2 + s.position[1] ** 2 + s.position[2] ** 2);
      expect(dist).toBeCloseTo(PHI, 5);
    }
  });

  test('assign agent to sphere', () => {
    cube.assignAgent(0, 'agent-central', PlatonicArchetype.DODECAHEDRON);
    const sphere = cube.spheres.get(0);
    expect(sphere.agent).toBe('agent-central');
    expect(sphere.archetype).toBe(PlatonicArchetype.DODECAHEDRON);
  });

  test('route finds shortest path', () => {
    const path = cube.route(0, 7);
    expect(path).not.toBeNull();
    expect(path[0]).toBe(0);
    expect(path[path.length - 1]).toBe(7);
    expect(path.length).toBeLessThanOrEqual(3);
  });

  test('route from sphere to itself', () => {
    expect(cube.route(5, 5)).toEqual([5]);
  });

  test('snapshot returns correct structure', () => {
    const snap = cube.snapshot();
    expect(snap.sphereCount).toBe(13);
    expect(snap.nodes).toHaveLength(13);
    expect(snap.edgeCount).toBeGreaterThan(0);
  });
});

describe('PlatonicArchetype', () => {
  test('all 5 archetypes defined', () => {
    expect(Object.keys(PlatonicArchetype)).toHaveLength(5);
  });

  test('each archetype has role and element', () => {
    for (const key of Object.keys(PlatonicArchetype)) {
      const a = PlatonicArchetype[key];
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('faces');
      expect(a).toHaveProperty('vertices');
      expect(a).toHaveProperty('role');
      expect(a).toHaveProperty('element');
    }
  });
});

describe('SpatialOrchestrator', () => {
  let orch;

  beforeEach(() => {
    orch = new SpatialOrchestrator();
  });

  test('register agent assigns to topology', () => {
    const sphere = orch.registerAgent('builder', PlatonicArchetype.CUBE);
    expect(sphere.agent).toBe('builder');
    expect(sphere.archetype).toBe(PlatonicArchetype.CUBE);
  });

  test('register multiple agents', () => {
    orch.registerAgent('agent-1');
    orch.registerAgent('agent-2');
    orch.registerAgent('agent-3');
    const groups = orch.agentsByArchetype();
    expect(groups['untyped']).toHaveLength(3);
  });

  test('route task between agents', () => {
    orch.registerAgent('sender');
    orch.registerAgent('receiver');
    const result = orch.routeTask({
      from: 'sender',
      to: 'receiver',
      payload: { data: 'hello' },
    });
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('path');
    expect(result.from).toBe('sender');
    expect(result.to).toBe('receiver');
    expect(result.hops).toBeGreaterThanOrEqual(0);
  });

  test('route task fails for unknown agent', () => {
    orch.registerAgent('known');
    expect(() => orch.routeTask({ from: 'known', to: 'unknown', payload: {} }))
      .toThrow('Agent unknown not in topology');
  });

  test('status returns comprehensive data', () => {
    orch.registerAgent('a1', PlatonicArchetype.ICOSAHEDRON);
    const status = orch.status();
    expect(status.topology.sphereCount).toBe(13);
    expect(status.agentsByArchetype).toHaveProperty('icosahedron');
  });

  test('throws when all spheres occupied', () => {
    for (let i = 0; i < 13; i++) {
      orch.registerAgent(`agent-${i}`);
    }
    expect(() => orch.registerAgent('overflow')).toThrow('No available spheres');
  });
});
