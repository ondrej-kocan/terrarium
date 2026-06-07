import { describe, expect, it } from 'vitest';
import { buildValidWorld } from '@/test/fixtures/world';
import { applyPressure } from './pressure';

function makeWorld(pressureId: string, conditions: { temperature: number; moisture: number; fertility: number; shelter: number }) {
  const world = buildValidWorld({
    genesisConfig: {
      worldArchetypeId: 'test',
      environmentalPressureId: pressureId,
      seed: 'test',
    },
    regions: buildValidWorld().regions.map(r => ({
      ...r,
      conditions: { ...conditions },
      baselineConditions: { ...conditions },
    })),
  });
  return world;
}

describe('applyPressure — increasing-drought', () => {
  it('makes no change on odd eras', () => {
    const world = makeWorld('increasing-drought', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions, pressureChanged } = applyPressure(world, 1);
    expect(pressureChanged).toBe(false);
    expect(regions[0]!.conditions.moisture).toBe(5);
    expect(regions[0]!.conditions.fertility).toBe(5);
  });

  it('reduces moisture by 1 on step eras', () => {
    const world = makeWorld('increasing-drought', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions, pressureChanged } = applyPressure(world, 3);
    expect(pressureChanged).toBe(true);
    expect(regions[0]!.conditions.moisture).toBe(4);
  });

  it('does not reduce fertility when moisture stays above threshold', () => {
    // Threshold is 3; moisture goes from 5 to 4, which is > 3
    const world = makeWorld('increasing-drought', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 3);
    expect(regions[0]!.conditions.fertility).toBe(5); // unchanged
  });

  it('reduces fertility when post-reduction moisture <= DROUGHT_FERTILITY_THRESHOLD (3)', () => {
    // Moisture 4 → 3 after reduction, which is <= 3
    const world = makeWorld('increasing-drought', { temperature: 5, moisture: 4, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 3);
    expect(regions[0]!.conditions.moisture).toBe(3);
    expect(regions[0]!.conditions.fertility).toBe(4); // reduced
  });

  it('holds moisture at floor (1) without dropping fertility', () => {
    // Moisture already at floor: cannot decrease further, so no fertility impact
    const world = makeWorld('increasing-drought', { temperature: 5, moisture: 1, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 3);
    expect(regions[0]!.conditions.moisture).toBe(1); // floored
    expect(regions[0]!.conditions.fertility).toBe(5); // no change: moisture didn't decrease
  });

  it('clamps fertility at 0', () => {
    const world = makeWorld('increasing-drought', { temperature: 5, moisture: 3, fertility: 0, shelter: 5 });
    const { regions } = applyPressure(world, 3);
    expect(regions[0]!.conditions.fertility).toBe(0); // already 0, stays 0
  });

  it('applies to all three regions', () => {
    const world = makeWorld('increasing-drought', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 3);
    expect(regions).toHaveLength(3);
    for (const r of regions) {
      expect(r.conditions.moisture).toBe(4);
    }
  });
});

describe('applyPressure — cooling-climate', () => {
  it('makes no change on odd eras', () => {
    const world = makeWorld('cooling-climate', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { pressureChanged } = applyPressure(world, 1);
    expect(pressureChanged).toBe(false);
  });

  it('reduces temperature by 1 on step eras', () => {
    const world = makeWorld('cooling-climate', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 3);
    expect(regions[0]!.conditions.temperature).toBe(4);
  });

  it('does not reduce fertility when temperature stays above threshold', () => {
    // Threshold is 2; temp 5 → 4, which is > 2
    const world = makeWorld('cooling-climate', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 3);
    expect(regions[0]!.conditions.fertility).toBe(5);
  });

  it('reduces fertility when post-reduction temperature <= COOLING_FERTILITY_THRESHOLD (2)', () => {
    // Temp 3 → 2 after reduction, which is <= 2
    const world = makeWorld('cooling-climate', { temperature: 3, moisture: 5, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 3);
    expect(regions[0]!.conditions.temperature).toBe(2);
    expect(regions[0]!.conditions.fertility).toBe(4); // reduced
  });

  it('holds temperature at floor (1) without dropping fertility', () => {
    // Temperature already at floor: cannot decrease further, so no fertility impact
    const world = makeWorld('cooling-climate', { temperature: 1, moisture: 5, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 3);
    expect(regions[0]!.conditions.temperature).toBe(1); // floored
    expect(regions[0]!.conditions.fertility).toBe(5); // no change: temperature didn't decrease
  });
});

describe('applyPressure — extreme-seasons', () => {
  it('odd era: temperature = baseline + 2, moisture = baseline - 1', () => {
    // baseline temp=5, moisture=5
    const world = makeWorld('extreme-seasons', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions, pressureChanged } = applyPressure(world, 1);
    expect(pressureChanged).toBe(true);
    expect(regions[0]!.conditions.temperature).toBe(7); // 5 + 2
    expect(regions[0]!.conditions.moisture).toBe(4);   // 5 - 1
  });

  it('even era: temperature = baseline - 2, moisture = baseline + 1', () => {
    const world = makeWorld('extreme-seasons', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 2);
    expect(regions[0]!.conditions.temperature).toBe(3); // 5 - 2
    expect(regions[0]!.conditions.moisture).toBe(6);   // 5 + 1
  });

  it('resets to baseline each era (not cumulative)', () => {
    const world = makeWorld('extreme-seasons', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions: r1 } = applyPressure(world, 1);
    const world2 = { ...world, regions: r1 };
    const { regions: r2 } = applyPressure(world2, 2);
    // Even era uses BASELINE (stored in baselineConditions), not the odd-era result
    expect(r2[0]!.conditions.temperature).toBe(3); // 5 - 2, not 7 - 2 = 5
    expect(r2[0]!.conditions.moisture).toBe(6);   // 5 + 1
  });

  it('clamps temperature at maximum 10', () => {
    const world = makeWorld('extreme-seasons', { temperature: 9, moisture: 5, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 1);
    expect(regions[0]!.conditions.temperature).toBe(10); // clamp(0,10, 9+2=11)
  });

  it('clamps moisture at minimum 0', () => {
    const world = makeWorld('extreme-seasons', { temperature: 5, moisture: 0, fertility: 5, shelter: 5 });
    const { regions } = applyPressure(world, 1);
    expect(regions[0]!.conditions.moisture).toBe(0); // clamp(0,10, 0-1=-1)
  });

  it('does not change fertility', () => {
    const world = makeWorld('extreme-seasons', { temperature: 5, moisture: 5, fertility: 7, shelter: 5 });
    const { regions } = applyPressure(world, 1);
    expect(regions[0]!.conditions.fertility).toBe(7);
  });
});

describe('applyPressure — unknown pressure', () => {
  it('returns regions unchanged with pressureChanged=false', () => {
    const world = makeWorld('no-pressure', { temperature: 5, moisture: 5, fertility: 5, shelter: 5 });
    const { regions, pressureChanged } = applyPressure(world, 2);
    expect(pressureChanged).toBe(false);
    expect(regions[0]!.conditions.temperature).toBe(5);
  });
});
