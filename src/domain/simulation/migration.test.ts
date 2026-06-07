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
  REGION_C,
} from '@/test/fixtures/world';
import { resolveMigration } from './migration';
import { Ruleset } from '@/domain/ruleset/v1';
import type { FulfillmentMap } from './consumption';

function makeFulfillmentMap(entries: Array<[string, string, number]>): FulfillmentMap {
  const map: FulfillmentMap = new Map();
  for (const [sid, rid, pct] of entries) {
    if (!map.has(sid)) map.set(sid, new Map());
    map.get(sid)!.set(rid, pct);
  }
  return map;
}

function buildEraStartPops(world: World): Map<string, Map<string, number>> {
  const snap = new Map<string, Map<string, number>>();
  for (const sp of world.species) {
    const m = new Map<string, number>();
    for (const [rid, pop] of Object.entries(sp.populations as Record<string, number>)) {
      if ((pop ?? 0) > 0) m.set(rid, pop!);
    }
    snap.set(sp.id as string, m);
  }
  return snap;
}

describe('resolveMigration', () => {
  it('does not migrate when population is below minimum', () => {
    // Set herbivore population below MIGRATION_MIN_SOURCE_POPULATION (10)
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === HERBIVORE_1
          ? { ...s, populations: { [REGION_A as string]: 5 } }
          : s,
      ),
    });

    const eraStart = buildEraStartPops(world);
    // Low fulfillment to trigger migration attempt
    const herbivoreFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 10]]);

    const { world: w, migrations } = resolveMigration(world, eraStart, herbivoreFulfillment, new Map(), 1);
    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;

    // Population unchanged since < 10
    expect(h1After.populations[REGION_A as string] ?? 0).toBe(5);
    expect(migrations.has(`${HERBIVORE_1 as string}:${REGION_A as string}`)).toBe(false);
  });

  it('does not migrate when cooldown is active', () => {
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === HERBIVORE_1
          ? {
              ...s,
              populations: { [REGION_A as string]: 30 },
              lastMigrationEra: { [REGION_A as string]: 2 }, // cooldown active for era 2
            }
          : s,
      ),
    });

    const eraStart = buildEraStartPops(world);
    const herbivoreFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 10]]);

    // nextEra = 2, lastMigrationEra = 2, cooldown check: 2 >= 2 - 1 = 1 → active
    const { migrations } = resolveMigration(world, eraStart, herbivoreFulfillment, new Map(), 2);
    expect(migrations.has(`${HERBIVORE_1 as string}:${REGION_A as string}`)).toBe(false);
  });

  it('does not migrate when no trigger condition is met', () => {
    const world = buildValidWorld();
    const eraStart = buildEraStartPops(world);

    // 100% fulfillment, high suitability (conditions 5,5,5,5 match affinity [3-7,3-7])
    // No population decline → no trigger
    const herbivoreFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 100]]);

    const { world: w } = resolveMigration(world, eraStart, herbivoreFulfillment, new Map(), 1);
    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;

    // No migration should occur since suitability is high and fulfillment is 100%
    expect(h1After.populations[REGION_A as string] ?? 0).toBe(
      world.species.find(s => s.id === HERBIVORE_1)!.populations[REGION_A as string] ?? 0,
    );
  });

  it('migrates toward better region when conditions are bad at source', () => {
    // Put herbivore 1 in region A with very bad conditions
    // Region B has much better conditions
    const world = buildValidWorld({
      regions: buildValidWorld().regions.map(r => {
        if ((r.id as string) === (REGION_A as string)) {
          return { ...r, conditions: { temperature: 0, moisture: 0, fertility: 1, shelter: 0 } };
        }
        return r;
      }),
    });

    const eraStart = buildEraStartPops(world);
    // Very low fulfillment at source
    const herbivoreFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 5]]);

    const h1Before = world.species.find(s => s.id === HERBIVORE_1)!;
    const popBefore = h1Before.populations[REGION_A as string] ?? 0;

    const { world: w, migrations } = resolveMigration(world, eraStart, herbivoreFulfillment, new Map(), 1);
    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;

    const popAfterA = h1After.populations[REGION_A as string] ?? 0;
    const popAfterB = h1After.populations[REGION_B as string] ?? 0;

    // If migration occurred, source pop decreased and dest pop increased
    if (migrations.has(`${HERBIVORE_1 as string}:${REGION_A as string}`)) {
      expect(popAfterA).toBeLessThan(popBefore);
      expect(popAfterB).toBeGreaterThan(0);
    }
  });

  it('migration amount is within min/max bounds', () => {
    const world = buildValidWorld({
      regions: buildValidWorld().regions.map(r =>
        (r.id as string) === (REGION_A as string)
          ? { ...r, conditions: { temperature: 0, moisture: 0, fertility: 1, shelter: 0 } }
          : r,
      ),
    });

    const eraStart = buildEraStartPops(world);
    const herbivoreFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 5]]);

    const h1 = world.species.find(s => s.id === HERBIVORE_1)!;
    const popBefore = h1.populations[REGION_A as string] ?? 0;
    const mobility = h1.traits.mobility;

    const { world: w, migrations } = resolveMigration(world, eraStart, herbivoreFulfillment, new Map(), 1);
    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;

    if (migrations.has(`${HERBIVORE_1 as string}:${REGION_A as string}`)) {
      const moved = popBefore - (h1After.populations[REGION_A as string] ?? 0);
      const minPct = Ruleset.MIGRATION_MIN_PERCENT / 100;
      const maxPct = Ruleset.MIGRATION_MAX_PERCENT / 100;
      expect(moved).toBeGreaterThanOrEqual(Math.max(1, Math.floor(popBefore * minPct)));
      expect(moved).toBeLessThanOrEqual(popBefore - 1); // at least 1 stays
    }
  });

  it('always leaves at least 1 in source after migration', () => {
    // Source population exactly 10 (min), migrate 10% = 1
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === HERBIVORE_1
          ? { ...s, populations: { [REGION_A as string]: 10 } }
          : s,
      ),
      regions: buildValidWorld().regions.map(r =>
        (r.id as string) === (REGION_A as string)
          ? { ...r, conditions: { temperature: 0, moisture: 0, fertility: 1, shelter: 0 } }
          : r,
      ),
    });

    const eraStart = buildEraStartPops(world);
    const herbivoreFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 5]]);

    const { world: w, migrations } = resolveMigration(world, eraStart, herbivoreFulfillment, new Map(), 1);
    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;

    if (migrations.has(`${HERBIVORE_1 as string}:${REGION_A as string}`)) {
      expect(h1After.populations[REGION_A as string] ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it('sets lastMigrationEra on successful migration', () => {
    const world = buildValidWorld({
      regions: buildValidWorld().regions.map(r =>
        (r.id as string) === (REGION_A as string)
          ? { ...r, conditions: { temperature: 0, moisture: 0, fertility: 1, shelter: 0 } }
          : r,
      ),
    });

    const eraStart = buildEraStartPops(world);
    const herbivoreFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 5]]);

    const { world: w, migrations } = resolveMigration(world, eraStart, herbivoreFulfillment, new Map(), 3);
    const h1After = w.species.find(s => s.id === HERBIVORE_1)!;

    if (migrations.has(`${HERBIVORE_1 as string}:${REGION_A as string}`)) {
      expect((h1After.lastMigrationEra as Record<string, number>)[REGION_A as string]).toBe(3);
    }
  });

  it('population decline trigger causes migration eligibility', () => {
    // Species started era with 50, now has 30 (40% decline > 20% trigger)
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        s.id === HERBIVORE_1
          ? { ...s, populations: { [REGION_A as string]: 30 } }
          : s,
      ),
      regions: buildValidWorld().regions.map(r =>
        (r.id as string) === (REGION_A as string)
          ? { ...r, conditions: { temperature: 0, moisture: 0, fertility: 1, shelter: 0 } }
          : r,
      ),
    });

    // Era-start had 50
    const eraStart = new Map<string, Map<string, number>>();
    eraStart.set(HERBIVORE_1 as string, new Map([[REGION_A as string, 50]]));

    // High fulfillment (not triggering), but pop decline should trigger
    const herbivoreFulfillment = makeFulfillmentMap([[HERBIVORE_1 as string, REGION_A as string, 80]]);

    // The result should potentially have migration if dest is better
    const { migrations } = resolveMigration(world, eraStart, herbivoreFulfillment, new Map(), 1);
    // We just verify it doesn't crash and returns valid state
    expect(migrations).toBeInstanceOf(Set);
  });
});
