import { describe, expect, it } from 'vitest';
import { buildValidWorld } from '@/test/fixtures/world';
import { advanceEra } from './pipeline';
import { checkWorldInvariants } from '@/domain/world/invariants';

describe('advanceEra (pipeline integration)', () => {
  it('increments the era', () => {
    const world = buildValidWorld({ era: 0 });
    const { world: w } = advanceEra(world);
    expect(w.era).toBe(1);
  });

  it('produces no invariant violations after one era', () => {
    const world = buildValidWorld();
    const { world: w } = advanceEra(world);
    const violations = checkWorldInvariants(w);
    expect(violations).toEqual([]);
  });

  it('produces no invariant violations after multiple eras', () => {
    let world = buildValidWorld();
    for (let i = 0; i < 10; i++) {
      const { world: w } = advanceEra(world);
      world = w;
      const violations = checkWorldInvariants(world);
      if (violations.length > 0) {
        throw new Error(`Invariant violation at era ${world.era}: ${violations.map(v => v.message).join(', ')}`);
      }
    }
    expect(world.era).toBe(10);
  });

  it('populations change after advancing era', () => {
    const world = buildValidWorld();
    const { world: w } = advanceEra(world);

    // At least one species should have a different total population
    let changed = false;
    for (const spBefore of world.species) {
      const spAfter = w.species.find(s => s.id === spBefore.id);
      if (!spAfter) continue;
      const totalBefore = Object.values(spBefore.populations as Record<string, number>).reduce((s, p) => s + (p ?? 0), 0);
      const totalAfter = Object.values(spAfter.populations as Record<string, number>).reduce((s, p) => s + (p ?? 0), 0);
      if (totalBefore !== totalAfter) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it('events array is returned (even if empty for now)', () => {
    const world = buildValidWorld();
    const { events } = advanceEra(world);
    expect(Array.isArray(events)).toBe(true);
  });

  it('preserves world id, name, and genesis config', () => {
    const world = buildValidWorld();
    const { world: w } = advanceEra(world);
    expect(w.id).toBe(world.id);
    expect(w.name).toBe(world.name);
    expect(w.genesisConfig).toEqual(world.genesisConfig);
  });

  it('does not mutate input world', () => {
    const world = buildValidWorld();
    const eraBefore = world.era;
    advanceEra(world);
    expect(world.era).toBe(eraBefore);
  });

  it('handles cooling climate pressure over multiple eras', () => {
    let world = buildValidWorld({
      genesisConfig: {
        worldArchetypeId: 'test',
        environmentalPressureId: 'cooling-climate',
        seed: 'test',
      },
    });

    // Advance 6 eras without invariant violations
    for (let i = 0; i < 6; i++) {
      const { world: w } = advanceEra(world);
      world = w;
      const violations = checkWorldInvariants(world);
      expect(violations).toEqual([]);
    }
  });

  it('handles extreme-seasons pressure over multiple eras', () => {
    let world = buildValidWorld({
      genesisConfig: {
        worldArchetypeId: 'test',
        environmentalPressureId: 'extreme-seasons',
        seed: 'test',
      },
    });

    for (let i = 0; i < 6; i++) {
      const { world: w } = advanceEra(world);
      world = w;
      const violations = checkWorldInvariants(world);
      expect(violations).toEqual([]);
    }
  });

  it('populations are non-negative integers after each era', () => {
    let world = buildValidWorld();
    for (let i = 0; i < 5; i++) {
      const { world: w } = advanceEra(world);
      world = w;

      for (const sp of world.species) {
        for (const [rid, pop] of Object.entries(sp.populations as Record<string, number>)) {
          expect(pop).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(pop)).toBe(true);
        }
      }
    }
  });

  it('extant species have positive total population', () => {
    let world = buildValidWorld();
    for (let i = 0; i < 5; i++) {
      const { world: w } = advanceEra(world);
      world = w;

      for (const sp of world.species) {
        if (sp.status === 'extant') {
          const total = Object.values(sp.populations as Record<string, number>).reduce(
            (s, p) => s + (p ?? 0), 0,
          );
          expect(total).toBeGreaterThan(0);
        }
      }
    }
  });

  it('extinct species have zero total population', () => {
    let world = buildValidWorld();
    for (let i = 0; i < 10; i++) {
      const { world: w } = advanceEra(world);
      world = w;

      for (const sp of world.species) {
        if (sp.status === 'extinct') {
          const total = Object.values(sp.populations as Record<string, number>).reduce(
            (s, p) => s + (p ?? 0), 0,
          );
          expect(total).toBe(0);
        }
      }
    }
  });
});
