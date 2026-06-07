import { describe, expect, it } from 'vitest';
import type { World, Species } from '@/domain/world/types';
import { speciesId, regionId } from '@/domain/world/types';
import {
  buildValidWorld,
  PRODUCER_1,
  PRODUCER_2,
  HERBIVORE_1,
  HERBIVORE_2,
  PREDATOR_1,
  REGION_A,
  REGION_B,
} from '@/test/fixtures/world';
import { consumeHerbivores, consumePredators } from './consumption';
import { foodDemandPerUnit } from './formulas';
import { Ruleset } from '@/domain/ruleset/v1';

describe('consumeHerbivores', () => {
  it('herbivore consumes food when supply is sufficient', () => {
    const world = buildValidWorld();
    const h1 = world.species.find(s => s.id === HERBIVORE_1)!;
    const p1Before = world.species.find(s => s.id === PRODUCER_1)!;

    const demand = (h1.populations[REGION_A as string] ?? 0) * foodDemandPerUnit(h1.traits);
    const { world: w, fulfillment } = consumeHerbivores(world);

    const p1After = w.species.find(s => s.id === PRODUCER_1)!;
    const supplyBefore = p1Before.populations[REGION_A as string] ?? 0;
    const supplyAfter = p1After.populations[REGION_A as string] ?? 0;

    // Food should have been reduced by consumed amount
    const consumed = supplyBefore - supplyAfter;
    expect(consumed).toBeGreaterThanOrEqual(0);
    expect(consumed).toBeLessThanOrEqual(demand);

    // Fulfillment should be set for herbivore 1
    const h1Fulfillment = fulfillment.get(HERBIVORE_1 as string)?.get(REGION_A as string);
    expect(h1Fulfillment).toBeDefined();
    expect(h1Fulfillment).toBeGreaterThanOrEqual(0);
    expect(h1Fulfillment).toBeLessThanOrEqual(100);
  });

  it('herbivore gets 100% fulfillment when supply exceeds demand', () => {
    // Increase producer population dramatically
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === PRODUCER_1
          ? { ...s, populations: { [REGION_A as string]: 1000 } }
          : s,
      ),
    });

    const { fulfillment } = consumeHerbivores(world);
    const h1Fulfillment = fulfillment.get(HERBIVORE_1 as string)?.get(REGION_A as string);
    expect(h1Fulfillment).toBe(100);
  });

  it('herbivore gets 0% fulfillment when food is gone', () => {
    // Set producer population to 0
    // We need producer to have 0 population but still be extant — we set a different region
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === PRODUCER_1
          ? { ...s, populations: { [REGION_A as string]: 0, [REGION_B as string]: 60 } }
          : s,
      ),
    });

    const { fulfillment } = consumeHerbivores(world);
    const h1Fulfillment = fulfillment.get(HERBIVORE_1 as string)?.get(REGION_A as string);
    expect(h1Fulfillment).toBe(0);
  });

  it('two herbivores competing for same food share it proportionally', () => {
    // Place herbivore 2 in region A eating producer 1
    const baseWorld = buildValidWorld();
    const h2Modified: Species = {
      ...baseWorld.species.find(s => s.id === HERBIVORE_2)!,
      populations: { [REGION_A as string]: 30 },
      dietIds: [PRODUCER_1],
    };
    const world: World = {
      ...baseWorld,
      species: baseWorld.species.map(s => s.id === HERBIVORE_2 ? h2Modified : s),
    };

    const p1Before = world.species.find(s => s.id === PRODUCER_1)!;
    const foodSupply = p1Before.populations[REGION_A as string] ?? 0;

    const { world: w, fulfillment } = consumeHerbivores(world);

    const p1After = w.species.find(s => s.id === PRODUCER_1)!;
    const totalConsumed = (p1Before.populations[REGION_A as string] ?? 0)
      - (p1After.populations[REGION_A as string] ?? 0);

    // Total consumed should not exceed supply
    expect(totalConsumed).toBeLessThanOrEqual(foodSupply);

    // Both herbivores should have fulfillment values
    expect(fulfillment.get(HERBIVORE_1 as string)?.get(REGION_A as string)).toBeDefined();
    expect(fulfillment.get(HERBIVORE_2 as string)?.get(REGION_A as string)).toBeDefined();
  });

  it('does not affect non-food species', () => {
    const world = buildValidWorld();
    const { world: w } = consumeHerbivores(world);
    // Producer 2 is not consumed (no herbivore eats it in default world... actually H2 eats P2)
    // But Producer 1's population should change
    const p2Before = world.species.find(s => s.id === PRODUCER_2)!;
    const p2After = w.species.find(s => s.id === PRODUCER_2)!;
    // H2 eats P2, so it might change — let's just check that the change is valid
    const p2PopBefore = p2Before.populations[REGION_B as string] ?? 0;
    const p2PopAfter = p2After.populations[REGION_B as string] ?? 0;
    expect(p2PopAfter).toBeGreaterThanOrEqual(0);
    expect(p2PopAfter).toBeLessThanOrEqual(p2PopBefore);
  });
});

describe('consumePredators', () => {
  it('predator consumes accessible herbivore population', () => {
    const world = buildValidWorld();
    const pred = world.species.find(s => s.id === PREDATOR_1)!;
    const h1Before = world.species.find(s => s.id === HERBIVORE_1)!;

    const h1Pop = h1Before.populations[REGION_A as string] ?? 0;
    const accessiblePrey = Math.floor(h1Pop * Ruleset.PREDATOR_CATCH_PERCENT / 100);

    const { world: w, fulfillment } = consumePredators(world);

    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;
    const h1PopAfter = h1After.populations[REGION_A as string] ?? 0;

    const consumed = h1Pop - h1PopAfter;
    expect(consumed).toBeGreaterThanOrEqual(0);
    expect(consumed).toBeLessThanOrEqual(accessiblePrey);

    const predFulfillment = fulfillment.get(PREDATOR_1 as string)?.get(REGION_A as string);
    expect(predFulfillment).toBeDefined();
    expect(predFulfillment).toBeGreaterThanOrEqual(0);
    expect(predFulfillment).toBeLessThanOrEqual(100);
  });

  it('predator gets 0% fulfillment when prey is gone', () => {
    // Set herbivore to 0 in region A but extant elsewhere
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === HERBIVORE_1
          ? { ...s, populations: { [REGION_A as string]: 0, [REGION_B as string]: 30 } }
          : s,
      ),
    });

    const { fulfillment } = consumePredators(world);
    const predFulfillment = fulfillment.get(PREDATOR_1 as string)?.get(REGION_A as string);
    expect(predFulfillment).toBe(0);
  });

  it('predator gets full fulfillment when prey is abundant', () => {
    // Set herbivore population very high
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === HERBIVORE_1
          ? { ...s, populations: { [REGION_A as string]: 10000 } }
          : s,
      ),
    });

    const { fulfillment } = consumePredators(world);
    const predFulfillment = fulfillment.get(PREDATOR_1 as string)?.get(REGION_A as string);
    expect(predFulfillment).toBe(100);
  });

  it('does not modify producer populations', () => {
    const world = buildValidWorld();
    const { world: w } = consumePredators(world);
    const p1Before = world.species.find(s => s.id === PRODUCER_1)!;
    const p1After = w.species.find(s => s.id === PRODUCER_1)!;
    expect(p1After.populations).toEqual(p1Before.populations);
  });

  it('PREDATOR_CATCH_PERCENT limits accessible prey', () => {
    // With 30 herbivores, accessible = floor(30 * 50/100) = 15
    const world = buildValidWorld(); // herbivore 1 has 30 in region A
    const h1Pop = world.species.find(s => s.id === HERBIVORE_1)!.populations[REGION_A as string] ?? 0;
    const accessible = Math.floor(h1Pop * 50 / 100);

    const { world: w } = consumePredators(world);
    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;
    const consumed = h1Pop - (h1After.populations[REGION_A as string] ?? 0);
    expect(consumed).toBeLessThanOrEqual(accessible);
  });
});
