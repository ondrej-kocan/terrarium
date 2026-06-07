import type { World } from '@/domain/world/types';
import { Ruleset } from '@/domain/ruleset/v1';
import { habitatSuitability, producerCapacity } from './formulas';
import { allocateSharedQuantity, roundHalfUp } from './allocation';

/**
 * Stage 3: Producer growth and shared capacity competition.
 *
 * For each region, producer species grow based on birth rate and suitability,
 * then compete for the region's total carrying capacity.
 *
 * populationDeltas maps speciesId → regionId → delta (new - old)
 */
export function growProducers(world: World): {
  world: World;
  populationDeltas: Map<string, Map<string, number>>;
} {
  // Build stage-start snapshot for all producers
  const producersByRegion = new Map<string, Array<{ speciesId: string; population: number; suitability: number; unconstrainedTarget: number }>>();

  for (const region of world.regions) {
    producersByRegion.set(region.id as string, []);
  }

  for (const sp of world.species) {
    if (sp.status !== 'extant' || sp.trophicRole !== 'producer') continue;

    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) <= 0) continue;
      const region = world.regions.find(r => (r.id as string) === rid);
      if (!region) continue;

      const population = pop!;
      const suitability = habitatSuitability(sp.habitatAffinity, sp.traits, region.conditions);
      const potentialBirths = roundHalfUp(population * Ruleset.PRODUCER_BIRTH_RATE / 100 * suitability / 100);
      const unconstrainedTarget = population + potentialBirths;

      const list = producersByRegion.get(rid) ?? [];
      list.push({ speciesId: sp.id as string, population, suitability, unconstrainedTarget });
      producersByRegion.set(rid, list);
    }
  }

  // Determine new populations for each region
  const newPopulations = new Map<string, Map<string, number>>(); // speciesId → regionId → newPop

  for (const [rid, producers] of producersByRegion) {
    if (producers.length === 0) continue;

    const region = world.regions.find(r => (r.id as string) === rid)!;
    const capacity = producerCapacity(region.conditions.fertility);
    const sumUnconstrained = producers.reduce((s, p) => s + p.unconstrainedTarget, 0);

    let allocations: Map<string, number>;

    if (sumUnconstrained <= capacity) {
      // Each gets its unconstrained target
      allocations = new Map(producers.map(p => [p.speciesId, p.unconstrainedTarget]));
    } else {
      // Allocate capacity by claim = unconstrainedTarget × suitability
      const claims = producers.map(p => ({
        id: p.speciesId,
        claim: p.unconstrainedTarget * p.suitability,
      }));
      allocations = allocateSharedQuantity(capacity, claims);
    }

    for (const [spId, newPop] of allocations) {
      if (!newPopulations.has(spId)) newPopulations.set(spId, new Map());
      newPopulations.get(spId)!.set(rid, newPop);
    }
  }

  // Build population deltas and update world
  const populationDeltas = new Map<string, Map<string, number>>();

  const updatedSpecies = world.species.map(sp => {
    if (sp.status !== 'extant' || sp.trophicRole !== 'producer') return sp;

    const regionUpdates = newPopulations.get(sp.id as string);
    if (!regionUpdates) return sp;

    const newPops: Record<string, number> = { ...sp.populations as Record<string, number> };
    const deltaMap = new Map<string, number>();

    for (const [rid, newPop] of regionUpdates) {
      const oldPop = (sp.populations as Record<string, number>)[rid] ?? 0;
      newPops[rid] = newPop;
      deltaMap.set(rid, newPop - oldPop);
    }

    populationDeltas.set(sp.id as string, deltaMap);

    return { ...sp, populations: newPops };
  });

  return {
    world: { ...world, species: updatedSpecies },
    populationDeltas,
  };
}
