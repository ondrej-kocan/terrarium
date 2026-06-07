import type { World } from '@/domain/world/types';
import { Ruleset } from '@/domain/ruleset/v1';
import { habitatSuitability, foodDemandPerUnit, clamp } from './formulas';
import { roundHalfUp } from './allocation';
import type { FulfillmentMap } from './consumption';

/**
 * Stage 6: Consumer births and all-species mortality.
 *
 * Births: consumers only (producers grew in stage 3).
 * Mortality: all species (producers + consumers).
 */
export function resolveReproductionAndMortality(
  world: World,
  herbivoreFulfillment: FulfillmentMap,
  predatorFulfillment: FulfillmentMap,
): World {
  const updatedSpecies = world.species.map(sp => {
    if (sp.status !== 'extant') return sp;

    const newPops: Record<string, number> = { ...sp.populations as Record<string, number> };

    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) <= 0) continue;
      const population = pop!;

      const region = world.regions.find(r => (r.id as string) === rid);
      if (!region) continue;

      const suitability = habitatSuitability(sp.habitatAffinity, sp.traits, region.conditions);

      // Get food fulfillment for consumers; producers get 100
      let foodFulfillment = 100;
      if (sp.trophicRole === 'herbivore') {
        foodFulfillment = herbivoreFulfillment.get(sp.id as string)?.get(rid) ?? 100;
      } else if (sp.trophicRole === 'predator') {
        foodFulfillment = predatorFulfillment.get(sp.id as string)?.get(rid) ?? 100;
      }

      // Births (consumers only)
      let popAfterBirths = population;
      if (sp.trophicRole !== 'producer') {
        const birthRate = sp.trophicRole === 'herbivore'
          ? Ruleset.HERBIVORE_BIRTH_RATE
          : Ruleset.PREDATOR_BIRTH_RATE;
        const births = roundHalfUp(
          population * birthRate / 100 * suitability / 100 * foodFulfillment / 100,
        );
        popAfterBirths = population + births;
      }

      // Mortality (all species)
      const traitUpkeep = Math.floor(
        (sp.traits.bodySize + sp.traits.mobility + sp.traits.coldTolerance + sp.traits.droughtTolerance)
        / Ruleset.TRAIT_UPKEEP_DIVISOR,
      );

      const habitatMortality = roundHalfUp(
        (100 - suitability) * Ruleset.MAX_HABITAT_MORTALITY / 100,
      );

      // Starvation mortality: 0 for producers
      const starvationMortality = sp.trophicRole === 'producer'
        ? 0
        : roundHalfUp((100 - foodFulfillment) * Ruleset.MAX_STARVATION_MORTALITY / 100);

      const totalMortalityPct = clamp(
        0,
        100,
        Ruleset.BASE_MORTALITY + traitUpkeep + habitatMortality + starvationMortality,
      );

      const deaths = roundHalfUp(popAfterBirths * totalMortalityPct / 100);
      const finalPop = Math.max(0, popAfterBirths - deaths);

      newPops[rid] = finalPop;
    }

    return { ...sp, populations: newPops };
  });

  return { ...world, species: updatedSpecies };
}
