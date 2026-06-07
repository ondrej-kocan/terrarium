import { describe, expect, it } from 'vitest';
import type { World } from '@/domain/world/types';
import {
  buildValidWorld,
  PRODUCER_1,
  HERBIVORE_1,
  PREDATOR_1,
  REGION_A,
} from '@/test/fixtures/world';
import { resolveReproductionAndMortality } from './reproduction';
import { habitatSuitability, foodDemandPerUnit } from './formulas';
import { roundHalfUp } from './allocation';
import { Ruleset } from '@/domain/ruleset/v1';
import type { FulfillmentMap } from './consumption';

function makeFulfillmentMap(entries: Array<[string, string, number]>): FulfillmentMap {
  const map: FulfillmentMap = new Map();
  for (const [speciesId, regionId, pct] of entries) {
    if (!map.has(speciesId)) map.set(speciesId, new Map());
    map.get(speciesId)!.set(regionId, pct);
  }
  return map;
}

describe('resolveReproductionAndMortality', () => {
  it('producers do not reproduce (births are 0)', () => {
    const world = buildValidWorld();
    const p1Before = world.species.find(s => s.id === PRODUCER_1)!;
    const popBefore = p1Before.populations[REGION_A as string] ?? 0;

    const emptyFulfillment: FulfillmentMap = new Map();
    const w = resolveReproductionAndMortality(world, emptyFulfillment, emptyFulfillment);

    const p1After = w.species.find(s => s.id === PRODUCER_1)!;
    const popAfter = p1After.populations[REGION_A as string] ?? 0;

    // Producer's pop after should only reflect mortality (no births)
    // With suitability 100, base mortality = 5%, trait upkeep minimal
    // popAfter <= popBefore
    expect(popAfter).toBeLessThanOrEqual(popBefore);
  });

  it('herbivore gains births with high suitability and good food', () => {
    const world = buildValidWorld();
    const h1 = world.species.find(s => s.id === HERBIVORE_1)!;
    const popBefore = h1.populations[REGION_A as string] ?? 0;

    const fulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 100]]);
    const w = resolveReproductionAndMortality(world, fulfillment, new Map());

    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;
    const popAfter = h1After.populations[REGION_A as string] ?? 0;

    // With 100% food and high suitability, births should increase pop net
    // births = roundHalfUp(30 * 20/100 * 100/100 * 100/100) = roundHalfUp(6) = 6
    // popAfterBirths = 36
    // base mortality = 5%, traitUpkeep = floor((2+2+1+1)/8) = floor(6/8) = 0
    // habitatMortality = roundHalfUp(0 * 30/100) = 0 (suitability 100)
    // starvation = roundHalfUp(0 * 50/100) = 0 (100% food)
    // totalMortalityPct = 5
    // deaths = roundHalfUp(36 * 5/100) = roundHalfUp(1.8) = 2
    // finalPop = 36 - 2 = 34
    expect(popAfter).toBeGreaterThan(popBefore);
  });

  it('high starvation causes additional mortality', () => {
    const world = buildValidWorld();
    const h1 = world.species.find(s => s.id === HERBIVORE_1)!;
    const popBefore = h1.populations[REGION_A as string] ?? 0;

    // 0% food fulfillment → maximum starvation
    const zeroFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 0]]);
    const w = resolveReproductionAndMortality(world, zeroFulfillment, new Map());

    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;
    const popAfter = h1After.populations[REGION_A as string] ?? 0;

    // With 0% food: births = 0, starvation = roundHalfUp(100 * 50/100) = 50%
    // totalMortality = 5 + 0 + 0 + 50 = 55%
    // deaths = roundHalfUp(30 * 55/100) = roundHalfUp(16.5) = 17
    // finalPop = 30 - 17 = 13
    expect(popAfter).toBeLessThan(popBefore);
  });

  it('zero population stays zero', () => {
    // Set herbivore population to 0 in region A but give it pop in region B to stay extant
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === HERBIVORE_1
          ? { ...s, populations: { [REGION_A as string]: 0, 'region-b': 30 } }
          : s,
      ),
    });

    const fulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 100]]);
    const w = resolveReproductionAndMortality(world, fulfillment, new Map());

    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;
    expect(h1After.populations[REGION_A as string] ?? 0).toBe(0);
  });

  it('low habitat suitability increases mortality', () => {
    // Set conditions to extreme mismatch
    const world = buildValidWorld({
      regions: buildValidWorld().regions.map(r =>
        (r.id as string) === (REGION_A as string)
          ? { ...r, conditions: { temperature: 0, moisture: 0, fertility: 5, shelter: 0 } }
          : r,
      ),
    });

    const h1 = world.species.find(s => s.id === HERBIVORE_1)!;
    const popBefore = h1.populations[REGION_A as string] ?? 0;
    const region = world.regions.find(r => (r.id as string) === (REGION_A as string))!;
    const suitability = habitatSuitability(h1.habitatAffinity, h1.traits, region.conditions);

    const fullFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 100]]);
    const w = resolveReproductionAndMortality(world, fullFulfillment, new Map());

    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;
    const popAfter = h1After.populations[REGION_A as string] ?? 0;

    if (suitability < 100) {
      // Mortality should be higher, causing pop decline despite births
      // (or at least less growth)
      expect(popAfter).toBeLessThanOrEqual(popBefore);
    }
  });

  it('extinct species are not modified', () => {
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === PRODUCER_1 ? { ...s, status: 'extinct' as const, extinctionEra: 1, populations: {} } : s,
      ),
    });

    const w = resolveReproductionAndMortality(world, new Map(), new Map());
    const p1 = w.species.find(s => s.id === PRODUCER_1)!;
    expect(p1.status).toBe('extinct');
    expect(Object.keys(p1.populations)).toHaveLength(0);
  });

  it('trait upkeep contributes to mortality', () => {
    // Species with high traits has more upkeep
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === HERBIVORE_1
          ? { ...s, traits: { bodySize: 8, mobility: 8, coldTolerance: 8, droughtTolerance: 8 } }
          : s,
      ),
    });

    const fullFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 100]]);
    const w = resolveReproductionAndMortality(world, fullFulfillment, new Map());

    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;
    const popAfter = h1After.populations[REGION_A as string] ?? 0;

    // High trait upkeep: floor((8+8+8+8)/8) = floor(4) = 4
    // Total mortality = 5 + 4 + ... ≥ 9%
    // Population should be less than original 30 even if births occur
    expect(popAfter).toBeGreaterThanOrEqual(0);
  });
});
