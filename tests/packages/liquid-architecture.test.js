// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  FILE: tests/packages/liquid-architecture.test.js                ║
// ║  LAYER: testing                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const {
  LiquidArchitectureService,
  TemplateRegistry,
  ProjectionInstance,
  StaleAssetGovernor,
} = require('../../packages/liquid-architecture');

describe('TemplateRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  test('register and retrieve template', () => {
    const t = registry.register({ id: 'tmpl-1', name: 'Test Template' });
    expect(t.id).toBe('tmpl-1');
    expect(t.version).toBe(1);
    expect(registry.get('tmpl-1')).toBe(t);
  });

  test('register requires id and name', () => {
    expect(() => registry.register({})).toThrow('Template requires id and name');
  });

  test('update bumps version', () => {
    registry.register({ id: 'tmpl-1', name: 'Original' });
    const updated = registry.update('tmpl-1', { name: 'Updated' });
    expect(updated.version).toBe(2);
    expect(updated.name).toBe('Updated');
  });

  test('update preserves id', () => {
    registry.register({ id: 'tmpl-1', name: 'Original' });
    const updated = registry.update('tmpl-1', { id: 'hijacked', name: 'Sneaky' });
    expect(updated.id).toBe('tmpl-1');
  });

  test('update throws for missing template', () => {
    expect(() => registry.update('nonexistent', {})).toThrow('not found');
  });

  test('list returns all templates', () => {
    registry.register({ id: 't1', name: 'A' });
    registry.register({ id: 't2', name: 'B' });
    expect(registry.list()).toHaveLength(2);
  });

  test('get returns null for missing template', () => {
    expect(registry.get('nope')).toBeNull();
  });
});

describe('ProjectionInstance', () => {
  const mockTemplate = { id: 'tmpl-1', version: 1, dimensions: 3 };

  test('creates with default position', () => {
    const inst = new ProjectionInstance(mockTemplate);
    expect(inst.position).toEqual([0, 0, 0]);
    expect(inst.state).toBe('active');
    expect(inst.dimensions).toBe(3);
  });

  test('inject stores data and increments access count', () => {
    const inst = new ProjectionInstance(mockTemplate);
    inst.inject({ key: 'value' });
    expect(inst.data).toEqual({ key: 'value' });
    expect(inst.accessCount).toBe(1);
  });

  test('inject with transform function', () => {
    const inst = new ProjectionInstance(mockTemplate);
    const transform = (data) => ({ ...data, transformed: true });
    inst.inject({ key: 'value' }, transform);
    expect(inst.data.transformed).toBe(true);
  });

  test('isExpired returns true after TTL', () => {
    const inst = new ProjectionInstance(mockTemplate, { ttl: 1 });
    // Should expire almost immediately with 1ms TTL
    return new Promise(resolve => setTimeout(() => {
      expect(inst.isExpired()).toBe(true);
      resolve();
    }, 5));
  });

  test('bounds computes bounding box', () => {
    const inst = new ProjectionInstance(mockTemplate, {
      position: [0, 0, 0],
      scale: [1, 1, 1],
    });
    const b = inst.bounds();
    expect(b.min).toHaveLength(3);
    expect(b.max).toHaveLength(3);
    expect(b.max[0]).toBeGreaterThan(b.min[0]);
  });

  test('snapshot returns correct structure', () => {
    const inst = new ProjectionInstance(mockTemplate);
    const snap = inst.snapshot();
    expect(snap).toHaveProperty('id');
    expect(snap).toHaveProperty('templateId', 'tmpl-1');
    expect(snap).toHaveProperty('state', 'active');
    expect(snap).toHaveProperty('dimensions', 3);
  });

  test('4D template includes time properties', () => {
    const tmpl4d = { id: 'tmpl-4d', version: 1, dimensions: 4 };
    const inst = new ProjectionInstance(tmpl4d);
    expect(inst.timeOffset).toBe(0);
    expect(inst.timeScale).toBe(1.0);
  });
});

describe('StaleAssetGovernor', () => {
  test('audit classifies instances correctly', () => {
    const gov = new StaleAssetGovernor({ staleThreshold: 10 });
    const mockTemplate = { id: 't', version: 1, dimensions: 3 };

    const healthy = new ProjectionInstance(mockTemplate);
    const expired = new ProjectionInstance(mockTemplate, { ttl: 1 });

    // Force expired
    expired.createdAt = Date.now() - 10000;

    const result = gov.audit([healthy, expired]);
    expect(result.expired).toHaveLength(1);
    expect(result.total).toBe(2);
  });

  test('evict removes expired instances', () => {
    const gov = new StaleAssetGovernor();
    const mockTemplate = { id: 't', version: 1, dimensions: 3 };

    const expired = new ProjectionInstance(mockTemplate, { ttl: 1 });
    expired.createdAt = Date.now() - 10000;

    const evicted = gov.evict([expired]);
    expect(evicted).toContain(expired.id);
    expect(expired.state).toBe('evicted');
  });
});

describe('LiquidArchitectureService', () => {
  let service;

  beforeEach(() => {
    service = new LiquidArchitectureService();
  });

  test('register template and project instance', () => {
    service.registerTemplate({ id: 'cube-tmpl', name: 'Cube Template', dimensions: 3 });
    const instance = service.project('cube-tmpl', { position: [1, 2, 3] });
    expect(instance).toBeInstanceOf(ProjectionInstance);
    expect(instance.position).toEqual([1, 2, 3]);
  });

  test('project throws for unknown template', () => {
    expect(() => service.project('nonexistent')).toThrow('not found');
  });

  test('inject data into projection', () => {
    service.registerTemplate({ id: 't1', name: 'Test' });
    const inst = service.project('t1');
    service.inject(inst.id, { hello: 'world' });
    expect(inst.data).toEqual({ hello: 'world' });
  });

  test('inject throws for unknown instance', () => {
    expect(() => service.inject('bad-id', {})).toThrow('not found');
  });

  test('govern evicts expired instances', () => {
    service.registerTemplate({ id: 't1', name: 'Test' });
    const inst = service.project('t1', { ttl: 1 });
    inst.createdAt = Date.now() - 10000; // Force expired

    const result = service.govern();
    expect(result.evicted).toBe(1);
    expect(result.remaining).toBe(0);
  });

  test('status reports correct counts', () => {
    service.registerTemplate({ id: 't1', name: 'A' });
    service.registerTemplate({ id: 't2', name: 'B' });
    service.project('t1');
    service.project('t2');

    const status = service.status();
    expect(status.templates).toBe(2);
    expect(status.activeInstances).toBe(2);
    expect(status.totalProjections).toBe(2);
  });
});
