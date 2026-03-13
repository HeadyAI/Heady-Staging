// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  FILE: tests/packages/pd04-codec.test.js                        ║
// ║  LAYER: testing                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const { PD04Codec, Vec3, TernaryOps, LEVELS } = require('../../packages/pd04-codec');

describe('Vec3', () => {
  test('constructs with default values', () => {
    const v = new Vec3();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  test('constructs with given values', () => {
    const v = new Vec3(1, 2, 3);
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
    expect(v.z).toBe(3);
  });

  test('add returns correct vector', () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(4, 5, 6);
    const c = a.add(b);
    expect(c.x).toBe(5);
    expect(c.y).toBe(7);
    expect(c.z).toBe(9);
  });

  test('sub returns correct vector', () => {
    const a = new Vec3(5, 7, 9);
    const b = new Vec3(1, 2, 3);
    const c = a.sub(b);
    expect(c.x).toBe(4);
    expect(c.y).toBe(5);
    expect(c.z).toBe(6);
  });

  test('scale multiplies by scalar', () => {
    const v = new Vec3(1, 2, 3).scale(2);
    expect(v.x).toBe(2);
    expect(v.y).toBe(4);
    expect(v.z).toBe(6);
  });

  test('dot product', () => {
    const a = new Vec3(1, 0, 0);
    const b = new Vec3(0, 1, 0);
    expect(a.dot(b)).toBe(0);
    expect(a.dot(a)).toBe(1);
  });

  test('cross product', () => {
    const x = new Vec3(1, 0, 0);
    const y = new Vec3(0, 1, 0);
    const z = x.cross(y);
    expect(z.x).toBe(0);
    expect(z.y).toBe(0);
    expect(z.z).toBe(1);
  });

  test('magnitude', () => {
    const v = new Vec3(3, 4, 0);
    expect(v.magnitude()).toBe(5);
  });

  test('normalize', () => {
    const v = new Vec3(3, 0, 0).normalize();
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });

  test('normalize zero vector returns zero', () => {
    const v = new Vec3(0, 0, 0).normalize();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  test('distance', () => {
    const a = new Vec3(0, 0, 0);
    const b = new Vec3(3, 4, 0);
    expect(a.distance(b)).toBe(5);
  });

  test('toArray', () => {
    const v = new Vec3(1, 2, 3);
    expect(v.toArray()).toEqual([1, 2, 3]);
  });

  test('toTernary quantizes to {-1, 0, 1}', () => {
    const v = new Vec3(5, -3, 0);
    const t = v.toTernary();
    expect(t.x).toBe(1);
    expect(t.y).toBe(-1);
    expect(t.z).toBe(0);
  });
});

describe('TernaryOps', () => {
  test('tadd clamps to [-1, 1]', () => {
    expect(TernaryOps.tadd(1, 1)).toBe(1);
    expect(TernaryOps.tadd(-1, -1)).toBe(-1);
    expect(TernaryOps.tadd(1, -1)).toBe(0);
    expect(TernaryOps.tadd(0, 0)).toBe(0);
  });

  test('tmul', () => {
    expect(TernaryOps.tmul(1, 1)).toBe(1);
    expect(TernaryOps.tmul(1, -1)).toBe(-1);
    expect(TernaryOps.tmul(0, 1)).toBe(0);
  });

  test('tnot negates', () => {
    expect(TernaryOps.tnot(1)).toBe(-1);
    expect(TernaryOps.tnot(-1)).toBe(1);
    expect(Object.is(TernaryOps.tnot(0), 0) || TernaryOps.tnot(0) === 0).toBe(true);
  });

  test('tcomp comparison', () => {
    expect(TernaryOps.tcomp(1, 0)).toBe(1);
    expect(TernaryOps.tcomp(0, 1)).toBe(-1);
    expect(TernaryOps.tcomp(1, 1)).toBe(0);
  });

  test('tpack and tunpack roundtrip', () => {
    const values = [1, 0, -1, 1, 0];
    const packed = TernaryOps.tpack(values);
    const unpacked = TernaryOps.tunpack(packed, values.length);
    expect(unpacked).toEqual(values);
  });

  test('tquant quantizes float to ternary', () => {
    expect(TernaryOps.tquant(0.9)).toBe(1);
    expect(TernaryOps.tquant(-0.9)).toBe(-1);
    expect(TernaryOps.tquant(0.1)).toBe(0);
  });
});

describe('PD04Codec', () => {
  let codec;

  beforeEach(() => {
    codec = new PD04Codec();
  });

  test('encode produces valid packet structure', () => {
    const packet = codec.encode({
      position: new Vec3(1, 2, 3),
      intent: 'build frontend',
      level: LEVELS.NODE,
      data: { test: true },
    });

    expect(packet).toHaveProperty('pd04');
    expect(packet).toHaveProperty('position');
    expect(packet).toHaveProperty('intentVector');
    expect(packet).toHaveProperty('level');
    expect(packet).toHaveProperty('data');
    expect(packet).toHaveProperty('watermark');
    expect(packet).toHaveProperty('hash');
    expect(packet.pd04).toBe('1.0.0');
  });

  test('encode uses correct level', () => {
    const packet = codec.encode({ position: new Vec3(), level: LEVELS.GALAXY });
    expect(packet.level).toBe(LEVELS.GALAXY);
  });

  test('watermark is generated', () => {
    const packet = codec.encode({ position: new Vec3(1, 1, 1), intent: 'test' });
    expect(packet.watermark).toBeDefined();
    expect(packet.watermark).not.toBeUndefined();
  });

  test('encode and decode roundtrip preserves data', () => {
    const packet = codec.encode({
      position: new Vec3(1.5, 2.5, 3.5),
      intent: 'analyze code',
      level: LEVELS.BLOCK,
      data: { key: 'value', num: 42 },
    });

    const decoded = codec.decode(packet);

    expect(decoded.position.x).toBeCloseTo(1.5);
    expect(decoded.position.y).toBeCloseTo(2.5);
    expect(decoded.position.z).toBeCloseTo(3.5);
    expect(decoded.data).toEqual({ key: 'value', num: 42 });
    expect(decoded.intent).toBe('analyze code');
  });

  test('decode rejects packet without pd04 field', () => {
    expect(() => codec.decode({ header: 'INVALID' })).toThrow('Not a PD04 packet');
  });

  test('decode validates watermark', () => {
    const packet = codec.encode({ position: new Vec3(1, 2, 3), intent: 'test' });
    const decoded = codec.decode(packet);
    expect(decoded.watermarkValid).toBe(true);
  });

  test('distance between two packets', () => {
    const p1 = codec.encode({ position: new Vec3(0, 0, 0) });
    const p2 = codec.encode({ position: new Vec3(3, 4, 0) });
    expect(codec.distance(p1, p2)).toBe(5);
  });
});
