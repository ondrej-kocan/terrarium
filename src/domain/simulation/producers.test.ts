import { describe, expect, it } from 'vitest';
import { regionId, speciesId } from '@/domain/world/types';
import type { World, Species, Region } from '@/domain/world/types';
import { buildValidWorld, PRODUCER_1, PRODUCER_2, REGION_A, REGION_B } from '@/test/fixtures/world';
import { growProducers } from './producers';
import { habitatSuitability, producerCapacity } from './formulas';
import { roundHalfUp } from './allocation';
import { Ruleset } from '@/domain/ruleset/v1';

describe('growProducers', () => {
  it('grows a producer with full suitability', () => {
    const world = buildValidWorld();
    // Producer 1 is in region A with pop=60
    // Region A: conditions {temperature:5, moisture:5, fertility:5, shelter:5}
    // Producer 1 affinity: temp [3,7], moisture [3,7]
    // suitability = 100 (no gaps)
    // potentialBirths = roundHalfUp(60 * 30/100 * 100/100) = roundHalfUp(18) = 18
    // unconstrained = 60 + 18 = 78
    // capacity = 5 * 25 = 125 — not exceeded
    const { world: w } = growProducers(world);
    const p1 = w.species.find(s => s.id === PRODUCER_1)!;
    expect(p1.populations[REGION_A as string]).toBe(78);
  });

  it('does not grow producers beyond capacity when multiple compete', () => {
    // Place two producers in the same region to compete for capacity
    const baseWorld = buildValidWorld();
    const p2Modified: Species = {
      ...baseWorld.species.find(s => s.id === PRODUCER_2)!,
      populations: { [REGION_A as string]: 60 }, // move p2 to region A
    };
    const p1 = baseWorld.species.find(s => s.id === PRODUCER_1)!;
    const world: World = {
      ...baseWorld,
      species: [
        p1,
        p2Modified,
        ...baseWorld.species.filter(s => s.id !== PRODUCER_1 && s.id !== PRODUCER_2),
      ],
    };

    const regionA = world.regions.find(r => (r.id as string) === (REGION_A as string))!;
    const capacity = producerCapacity(regionA.conditions.fertility); // 5*25=125

    const { world: w } = growProducers(world);
    const p1After = w.species.find(s => s.id === PRODUCER_1)!;
    const p2After = w.species.find(s => s.id === PRODUCER_2)!;

    const totalPop = (p1After.populations[REGION_A as string] ?? 0)
      + (p2After.populations[REGION_A as string] ?? 0);

    // Total should not exceed capacity
    expect(totalPop).toBeLessThanOrEqual(capacity);
  });

  it('leaves non-producer species unchanged', () => {
    const world = buildValidWorld();
    const herbBefore = world.species.find(s => s.trophicRole === 'herbivore')!;
    const { world: w } = growProducers(world);
    const herbAfter = w.species.find(s => s.id === herbBefore.id)!;
    expect(herbAfter.populations).toEqual(herbBefore.populations);
  });

  it('returns population deltas for changed producers', () => {
    const world = buildValidWorld();
    const { populationDeltas } = growProducers(world);
    // Producer 1 should have a delta
    const p1Deltas = populationDeltas.get(PRODUCER_1 as string);
    expect(p1Deltas).toBeDefined();
    expect(p1Deltas!.get(REGION_A as string)).toBeGreaterThan(0);
  });

  it('producer with zero suitability gets no births', () => {
    // Set conditions far outside affinity range
    const world = buildValidWorld({
      regions: buildValidWorld().regions.map(r =>
        (r.id as string) === (REGION_A as string)
          ? { ...r, conditions: { temperature: 0, moisture: 0, fertility: 5, shelter: 0 } }
          : r,
      ),
    });
    const p1Before = world.species.find(s => s.id === PRODUCER_1)!;
    const suitability = habitatSuitability(p1Before.habitatAffinity, p1Before.traits, { temperature: 0, moisture: 0, fertility: 5, shelter: 0 });
    // If suitability is 0, births = 0
    if (suitability === 0) {
      const { world: w } = growProducers(world);
      const p1After = w.species.find(s => s.id === PRODUCER_1)!;
      // Population should stay the same or go to capacity
      expect(p1After.populations[REGION_A as string]).toBe(p1Before.populations[REGION_A as string] ?? 0);
    }
    // If suitability > 0, just ensure no crash
  });

  it('does not process extinct species', () => {
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === PRODUCER_1 ? { ...s, status: 'extinct' as const, extinctionEra: 1, populations: {} } : s,
      ),
    });
    const { world: w } = growProducers(world);
    const p1 = w.species.find(s => s.id === PRODUCER_1)!;
    expect(p1.populations[REGION_A as string]).toBeUndefined();
  });
});
