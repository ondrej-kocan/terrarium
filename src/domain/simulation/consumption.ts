import type { World } from '@/domain/world/types';
import { foodDemandPerUnit, foodFulfillmentPercent } from './formulas';
import { allocateSharedQuantity } from './allocation';

/**
 * FulfillmentMap: speciesId → regionId → food fulfillment percent (0–100)
 */
export type FulfillmentMap = Map<string, Map<string, number>>;

/**
 * Stage 4: Herbivore consumption.
 *
 * For each region, herbivores consume producers. Multiple herbivores sharing
 * the same food source have their demand allocated proportionally.
 */
export function consumeHerbivores(world: World): { world: World; fulfillment: FulfillmentMap } {
  // Build stage-start snapshot of populations
  const startPops = buildPopSnapshot(world);

  // For each region, figure out how much each herbivore eats
  // Group herbivores by region and food species
  type HerbivoreEntry = {
    speciesId: string;
    population: number;
    demand: number;
    foodSpeciesId: string;
  };

  // Map: regionId → foodSpeciesId → list of herbivore entries
  const herbsByRegionAndFood = new Map<string, Map<string, HerbivoreEntry[]>>();

  for (const sp of world.species) {
    if (sp.status !== 'extant' || sp.trophicRole !== 'herbivore') continue;
    if (sp.dietIds.length === 0) continue;

    const foodId = sp.dietIds[0] as string;

    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) <= 0) continue;
      const population = pop!;
      const demand = population * foodDemandPerUnit(sp.traits);

      if (!herbsByRegionAndFood.has(rid)) herbsByRegionAndFood.set(rid, new Map());
      const foodMap = herbsByRegionAndFood.get(rid)!;
      if (!foodMap.has(foodId)) foodMap.set(foodId, []);
      foodMap.get(foodId)!.push({
        speciesId: sp.id as string,
        population,
        demand,
        foodSpeciesId: foodId,
      });
    }
  }

  // Calculate consumption for each herbivore and food species losses
  // foodLosses: foodSpeciesId → regionId → amount consumed
  const foodLosses = new Map<string, Map<string, number>>();
  // herbFulfillment: speciesId → regionId → fulfillment percent
  const herbFulfillment: FulfillmentMap = new Map();

  for (const [rid, foodMap] of herbsByRegionAndFood) {
    for (const [foodId, herbs] of foodMap) {
      const foodSupply = startPops.get(foodId)?.get(rid) ?? 0;

      if (herbs.length === 1) {
        // Single herbivore eating this food
        const herb = herbs[0]!;
        const consumed = Math.min(foodSupply, herb.demand);
        const fulfillment = foodFulfillmentPercent(consumed, herb.demand);

        recordFoodLoss(foodLosses, foodId, rid, consumed);
        recordFulfillment(herbFulfillment, herb.speciesId, rid, fulfillment);
      } else {
        // Multiple herbivores competing for same food — allocate proportional to demand
        const totalDemand = herbs.reduce((s, h) => s + h.demand, 0);
        const actualSupply = Math.min(foodSupply, totalDemand);

        const claims = herbs.map(h => ({ id: h.speciesId, claim: h.demand }));
        const allocations = allocateSharedQuantity(Math.floor(actualSupply), claims);

        let totalConsumed = 0;
        for (const herb of herbs) {
          const consumed = allocations.get(herb.speciesId) ?? 0;
          totalConsumed += consumed;
          const fulfillment = foodFulfillmentPercent(consumed, herb.demand);
          recordFulfillment(herbFulfillment, herb.speciesId, rid, fulfillment);
        }

        recordFoodLoss(foodLosses, foodId, rid, totalConsumed);
      }
    }
  }

  // Apply food losses to world
  const updatedSpecies = world.species.map(sp => {
    const losses = foodLosses.get(sp.id as string);
    if (!losses) return sp;

    const newPops: Record<string, number> = { ...sp.populations as Record<string, number> };
    for (const [rid, loss] of losses) {
      const current = newPops[rid] ?? 0;
      newPops[rid] = Math.max(0, current - loss);
    }
    return { ...sp, populations: newPops };
  });

  // Ensure all herbivores with populations have a fulfillment entry
  // (if no consumption happened, they get 100% fulfillment if demand=0, or 0% if supply=0)
  for (const sp of world.species) {
    if (sp.status !== 'extant' || sp.trophicRole !== 'herbivore') continue;
    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) <= 0) continue;
      if (!(herbFulfillment.get(sp.id as string)?.has(rid))) {
        // herbivore exists but wasn't processed (e.g., no dietIds matched)
        const demand = pop! * foodDemandPerUnit(sp.traits);
        recordFulfillment(herbFulfillment, sp.id as string, rid, foodFulfillmentPercent(0, demand));
      }
    }
  }

  return { world: { ...world, species: updatedSpecies }, fulfillment: herbFulfillment };
}

/**
 * Stage 5: Predator consumption.
 *
 * Predators eat herbivores. Only PREDATOR_CATCH_PERCENT of the prey is accessible.
 */
export function consumePredators(world: World): { world: World; fulfillment: FulfillmentMap } {
  // Build stage-start snapshot of populations
  const startPops = buildPopSnapshot(world);

  // Group predators by region and prey species
  type PredatorEntry = {
    speciesId: string;
    population: number;
    demand: number;
    preySpeciesId: string;
  };

  const predsByRegionAndPrey = new Map<string, Map<string, PredatorEntry[]>>();

  for (const sp of world.species) {
    if (sp.status !== 'extant' || sp.trophicRole !== 'predator') continue;
    if (sp.dietIds.length === 0) continue;

    const preyId = sp.dietIds[0] as string;

    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) <= 0) continue;
      const population = pop!;
      const demand = population * foodDemandPerUnit(sp.traits);

      if (!predsByRegionAndPrey.has(rid)) predsByRegionAndPrey.set(rid, new Map());
      const preyMap = predsByRegionAndPrey.get(rid)!;
      if (!preyMap.has(preyId)) preyMap.set(preyId, []);
      preyMap.get(preyId)!.push({ speciesId: sp.id as string, population, demand, preySpeciesId: preyId });
    }
  }

  const preyLosses = new Map<string, Map<string, number>>();
  const predFulfillment: FulfillmentMap = new Map();

  const CATCH_PERCENT = 50; // Ruleset.PREDATOR_CATCH_PERCENT

  for (const [rid, preyMap] of predsByRegionAndPrey) {
    for (const [preyId, preds] of preyMap) {
      const preyPop = startPops.get(preyId)?.get(rid) ?? 0;
      const accessiblePrey = Math.floor(preyPop * CATCH_PERCENT / 100);

      if (preds.length === 1) {
        const pred = preds[0]!;
        const consumed = Math.min(accessiblePrey, pred.demand);
        const fulfillment = foodFulfillmentPercent(consumed, pred.demand);

        recordFoodLoss(preyLosses, preyId, rid, consumed);
        recordFulfillment(predFulfillment, pred.speciesId, rid, fulfillment);
      } else {
        // Multiple predators on same prey — allocate accessible prey proportional to demand
        const totalDemand = preds.reduce((s, p) => s + p.demand, 0);
        const actualAccessible = Math.min(accessiblePrey, totalDemand);

        const claims = preds.map(p => ({ id: p.speciesId, claim: p.demand }));
        const allocations = allocateSharedQuantity(Math.floor(actualAccessible), claims);

        let totalConsumed = 0;
        for (const pred of preds) {
          const consumed = allocations.get(pred.speciesId) ?? 0;
          totalConsumed += consumed;
          const fulfillment = foodFulfillmentPercent(consumed, pred.demand);
          recordFulfillment(predFulfillment, pred.speciesId, rid, fulfillment);
        }

        recordFoodLoss(preyLosses, preyId, rid, totalConsumed);
      }
    }
  }

  // Apply prey losses
  const updatedSpecies = world.species.map(sp => {
    const losses = preyLosses.get(sp.id as string);
    if (!losses) return sp;

    const newPops: Record<string, number> = { ...sp.populations as Record<string, number> };
    for (const [rid, loss] of losses) {
      const current = newPops[rid] ?? 0;
      newPops[rid] = Math.max(0, current - loss);
    }
    return { ...sp, populations: newPops };
  });

  // Ensure all predators with populations have a fulfillment entry
  for (const sp of world.species) {
    if (sp.status !== 'extant' || sp.trophicRole !== 'predator') continue;
    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) <= 0) continue;
      if (!(predFulfillment.get(sp.id as string)?.has(rid))) {
        const demand = pop! * foodDemandPerUnit(sp.traits);
        recordFulfillment(predFulfillment, sp.id as string, rid, foodFulfillmentPercent(0, demand));
      }
    }
  }

  return { world: { ...world, species: updatedSpecies }, fulfillment: predFulfillment };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPopSnapshot(world: World): Map<string, Map<string, number>> {
  const snap = new Map<string, Map<string, number>>();
  for (const sp of world.species) {
    if (sp.status !== 'extant') continue;
    const regionMap = new Map<string, number>();
    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) > 0) regionMap.set(rid, pop!);
    }
    if (regionMap.size > 0) snap.set(sp.id as string, regionMap);
  }
  return snap;
}

function recordFoodLoss(
  losses: Map<string, Map<string, number>>,
  foodId: string,
  rid: string,
  amount: number,
): void {
  if (!losses.has(foodId)) losses.set(foodId, new Map());
  const existing = losses.get(foodId)!.get(rid) ?? 0;
  losses.get(foodId)!.set(rid, existing + amount);
}

function recordFulfillment(
  fulfillment: FulfillmentMap,
  speciesId: string,
  rid: string,
  percent: number,
): void {
  if (!fulfillment.has(speciesId)) fulfillment.set(speciesId, new Map());
  fulfillment.get(speciesId)!.set(rid, percent);
}
