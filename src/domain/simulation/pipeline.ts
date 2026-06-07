import type { World } from '@/domain/world/types';
import type { DomainEvent } from '@/domain/events/types';
import { applyPressure } from './pressure';
import { growProducers } from './producers';
import { consumeHerbivores, consumePredators } from './consumption';
import type { FulfillmentMap } from './consumption';
import { resolveReproductionAndMortality } from './reproduction';
import { resolveMigration } from './migration';
import { resolveAdaptation } from './adaptation';
import { resolveIsolation } from './isolation';
import { resolveExtinction } from './extinction';

export function advanceEra(world: World): { world: World; events: readonly DomainEvent[] } {
  const nextEra = world.era + 1;

  // Capture era-start populations for migration decline trigger
  const eraStartPopulations = buildPopulationSnapshot(world);

  // Stage 1: Apply environmental pressure
  const { regions } = applyPressure(world, nextEra);
  let w: World = { ...world, regions };

  // Stage 3: Producer growth (stage 2 is implicit — suitability is recalculated from current conditions)
  const { world: w3 } = growProducers(w);
  w = w3;

  // Stage 4: Herbivore consumption
  const { world: w4, fulfillment: herbFulfillment } = consumeHerbivores(w);
  w = w4;

  // Stage 5: Predator consumption
  const { world: w5, fulfillment: predFulfillment } = consumePredators(w);
  w = w5;

  // Stage 6: Reproduction and mortality
  w = resolveReproductionAndMortality(w, herbFulfillment, predFulfillment);

  // Stage 7: Migration
  const { world: w7, migrations } = resolveMigration(
    w,
    eraStartPopulations,
    herbFulfillment,
    predFulfillment,
    nextEra,
  );
  w = w7;

  // Stage 8: Adaptation
  const { world: w8 } = resolveAdaptation(w, herbFulfillment, predFulfillment, nextEra);
  w = w8;

  // Stage 9: Isolation tracking + speciation
  const { world: w9 } = resolveIsolation(w, migrations, nextEra);
  w = w9;

  // Stage 10: Extinction
  const { world: w10 } = resolveExtinction(w, nextEra);
  w = w10;

  // Advance era counter
  const finalWorld: World = { ...w, era: nextEra };

  return { world: finalWorld, events: [] };
}

function buildPopulationSnapshot(world: World): Map<string, Map<string, number>> {
  const snapshot = new Map<string, Map<string, number>>();
  for (const sp of world.species) {
    const regionMap = new Map<string, number>();
    for (const [rid, pop] of Object.entries(sp.populations as Record<string, number>)) {
      if ((pop ?? 0) > 0) regionMap.set(rid, pop!);
    }
    snapshot.set(sp.id as string, regionMap);
  }
  return snapshot;
}
