import type { Species, World } from '@/domain/world/types';
import { Ruleset } from '@/domain/ruleset/v1';
import { habitatSuitability, foodDemandPerUnit, foodFulfillmentPercent } from '@/domain/simulation/formulas';

export type GenerationViolation = {
  readonly check: string;
  readonly message: string;
};

function regionById(world: World, regionId: string) {
  return world.regions.find(r => (r.id as string) === regionId);
}

function speciesById(world: World, speciesId: string): Species | undefined {
  return world.species.find(s => (s.id as string) === speciesId);
}

function checkSpeciesSuitability(world: World): GenerationViolation[] {
  const violations: GenerationViolation[] = [];

  for (const sp of world.species) {
    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) <= 0) continue;
      const region = regionById(world, rid);
      if (!region) continue;

      const suitability = habitatSuitability(sp.habitatAffinity, sp.traits, region.conditions);
      const minSuitability =
        sp.trophicRole === 'producer'
          ? Ruleset.STARTING_FOOD_FULFILLMENT
          : Ruleset.STARTING_FOOD_FULFILLMENT;

      if (suitability < minSuitability) {
        violations.push({
          check: 'MIN_STARTING_SUITABILITY',
          message: `${sp.name} (${sp.id}) has suitability ${suitability}% in region ${region.name}, minimum is ${minSuitability}%`,
        });
      }
    }
  }

  return violations;
}

function checkHerbivoreFoodFulfillment(world: World): GenerationViolation[] {
  const violations: GenerationViolation[] = [];

  for (const herbivore of world.species.filter(s => s.trophicRole === 'herbivore')) {
    const foodId = herbivore.dietIds[0];
    if (!foodId) continue;
    const food = speciesById(world, foodId as string);
    if (!food) continue;

    for (const [rid, herbPop] of Object.entries(herbivore.populations)) {
      if ((herbPop ?? 0) <= 0) continue;
      const producerPop = food.populations[rid] ?? 0;
      const demand = foodDemandPerUnit(herbivore.traits);
      const totalDemand = (herbPop ?? 0) * demand;
      const fulfillment = foodFulfillmentPercent(producerPop, totalDemand);

      if (fulfillment < Ruleset.STARTING_FOOD_FULFILLMENT) {
        const region = regionById(world, rid);
        violations.push({
          check: 'MIN_HERBIVORE_FOOD_FULFILLMENT',
          message: `${herbivore.name} food fulfillment in ${region?.name ?? rid}: ${fulfillment}% (needs ${Ruleset.STARTING_FOOD_FULFILLMENT}%)`,
        });
      }
    }
  }

  return violations;
}

function checkPredatorFoodFulfillment(world: World): GenerationViolation[] {
  const violations: GenerationViolation[] = [];

  for (const predator of world.species.filter(s => s.trophicRole === 'predator')) {
    const preyId = predator.dietIds[0];
    if (!preyId) continue;
    const prey = speciesById(world, preyId as string);
    if (!prey) continue;

    for (const [rid, predPop] of Object.entries(predator.populations)) {
      if ((predPop ?? 0) <= 0) continue;
      const preyPop = prey.populations[rid] ?? 0;
      const accessible = Math.floor(preyPop * Ruleset.PREDATOR_CATCH_PERCENT / 100);
      const demand = foodDemandPerUnit(predator.traits);
      const totalDemand = (predPop ?? 0) * demand;
      const fulfillment = foodFulfillmentPercent(accessible, totalDemand);

      if (fulfillment < Ruleset.STARTING_FOOD_FULFILLMENT) {
        const region = regionById(world, rid);
        violations.push({
          check: 'MIN_PREDATOR_FOOD_FULFILLMENT',
          message: `${predator.name} food fulfillment in ${region?.name ?? rid}: ${fulfillment}% (needs ${Ruleset.STARTING_FOOD_FULFILLMENT}%)`,
        });
      }
    }
  }

  return violations;
}

export function validateGeneratedWorld(world: World): GenerationViolation[] {
  return [
    ...checkSpeciesSuitability(world),
    ...checkHerbivoreFoodFulfillment(world),
    ...checkPredatorFoodFulfillment(world),
  ];
}
