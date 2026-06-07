import type { Traits, World } from '@/domain/world/types';
import { Ruleset } from '@/domain/ruleset/v1';
import { habitatSuitability, foodDemandPerUnit, clamp } from './formulas';
import type { FulfillmentMap } from './consumption';

/**
 * Stage 8: Species-level trait adaptation.
 *
 * Each eligible species may gain one trait point if it improves their net benefit.
 */
export function resolveAdaptation(
  world: World,
  herbivoreFulfillment: FulfillmentMap,
  predatorFulfillment: FulfillmentMap,
  nextEra: number,
): {
  world: World;
  adaptations: Array<{ speciesId: string; oldTraits: Traits; newTraits: Traits }>;
} {
  const adaptations: Array<{ speciesId: string; oldTraits: Traits; newTraits: Traits }> = [];

  const updatedSpecies = world.species.map(sp => {
    if (sp.status !== 'extant') return sp;

    // Check total population > 0
    const totalPop = Object.values(sp.populations as Record<string, number>).reduce(
      (s, p) => s + (p ?? 0), 0,
    );
    if (totalPop <= 0) return sp;

    // Eligibility: interval check
    const eligible = sp.lastAdaptationEra === null
      || nextEra - sp.lastAdaptationEra >= Ruleset.ADAPTATION_INTERVAL;
    if (!eligible) return sp;

    // Compute occupied regions
    const occupiedRegions: Array<{ regionId: string; pop: number; region: typeof world.regions[0] }> = [];
    for (const [rid, pop] of Object.entries(sp.populations as Record<string, number>)) {
      if ((pop ?? 0) <= 0) continue;
      const region = world.regions.find(r => (r.id as string) === rid);
      if (!region) continue;
      occupiedRegions.push({ regionId: rid, pop: pop!, region });
    }

    if (occupiedRegions.length === 0) return sp;

    // Compute population-weighted average suitability
    const currentWeightedSuit = computeWeightedSuitability(sp.traits, sp.habitatAffinity, occupiedRegions, totalPop);

    // Eligibility: suitability trigger check
    if (currentWeightedSuit >= Ruleset.ADAPTATION_SUITABILITY_TRIGGER) return sp;

    // Get food fulfillment for this species (average across occupied regions)
    const fulfillmentMap = sp.trophicRole === 'herbivore'
      ? herbivoreFulfillment
      : sp.trophicRole === 'predator'
        ? predatorFulfillment
        : null;

    let averageFoodFulfillment = 100;
    if (fulfillmentMap) {
      const fulfillments = occupiedRegions
        .map(({ regionId }) => fulfillmentMap.get(sp.id as string)?.get(regionId) ?? 100);
      averageFoodFulfillment = fulfillments.reduce((s, f) => s + f, 0) / fulfillments.length;
    }

    const currentFoodDeficit = Math.max(0, 100 - averageFoodFulfillment);

    // Current trait upkeep
    const currentTraitUpkeep = computeTraitUpkeep(sp.traits);
    const currentFoodDemand = foodDemandPerUnit(sp.traits);

    // Generate candidate trait changes
    type TraitKey = keyof Traits;
    const traitKeys: TraitKey[] = ['coldTolerance', 'droughtTolerance', 'mobility', 'bodySize'];

    type Candidate = {
      traits: Traits;
      traitKey: TraitKey;
      direction: 1 | -1;
      netBenefit: number;
    };

    const candidates: Candidate[] = [];

    for (const key of traitKeys) {
      for (const direction of [-1, 1] as const) {
        const newValue = sp.traits[key] + direction;

        // Reject out-of-range
        if (newValue < 0 || newValue > 10) continue;

        // Reject if beyond ADAPTATION_LIMIT from originTraits
        if (Math.abs(newValue - sp.originTraits[key]) > Ruleset.ADAPTATION_LIMIT) continue;

        const candidateTraits: Traits = { ...sp.traits, [key]: newValue };

        // New weighted suitability
        const newWeightedSuit = computeWeightedSuitability(
          candidateTraits,
          sp.habitatAffinity,
          occupiedRegions,
          totalPop,
        );

        const suitabilityBenefit = newWeightedSuit - currentWeightedSuit;

        const newTraitUpkeep = computeTraitUpkeep(candidateTraits);
        const traitUpkeepDelta = newTraitUpkeep - currentTraitUpkeep;

        let netBenefit = suitabilityBenefit - traitUpkeepDelta;

        // Food-stress addition for bodySize and mobility changes
        if ((key === 'bodySize' || key === 'mobility') && currentFoodDeficit > 0) {
          const newFoodDemand = foodDemandPerUnit(candidateTraits);
          if (newFoodDemand < currentFoodDemand && currentFoodDemand > 0) {
            const demandReductionPercent = ((currentFoodDemand - newFoodDemand) / currentFoodDemand) * 100;
            const foodStressBenefit = currentFoodDeficit * demandReductionPercent / 100;
            netBenefit += foodStressBenefit;
          }
        }

        candidates.push({ traits: candidateTraits, traitKey: key, direction, netBenefit });
      }
    }

    // Filter to minimum benefit
    const qualifying = candidates.filter(c => c.netBenefit >= Ruleset.ADAPTATION_MIN_BENEFIT);
    if (qualifying.length === 0) return sp;

    // Select best: highest netBenefit, tiebreak by preferred key order then decrease before increase
    // Tiebreak order: coldTolerance, droughtTolerance, mobility, bodySize; prefer decrease before increase
    const tiebreakKeyOrder: TraitKey[] = ['coldTolerance', 'droughtTolerance', 'mobility', 'bodySize'];

    qualifying.sort((a, b) => {
      if (b.netBenefit !== a.netBenefit) return b.netBenefit - a.netBenefit;
      // Same netBenefit: prefer by key order
      const aKeyIdx = tiebreakKeyOrder.indexOf(a.traitKey);
      const bKeyIdx = tiebreakKeyOrder.indexOf(b.traitKey);
      if (aKeyIdx !== bKeyIdx) return aKeyIdx - bKeyIdx;
      // Same key: prefer decrease (-1) before increase (+1)
      return a.direction - b.direction;
    });

    const best = qualifying[0]!;
    const oldTraits = sp.traits;

    adaptations.push({ speciesId: sp.id as string, oldTraits, newTraits: best.traits });

    return { ...sp, traits: best.traits, lastAdaptationEra: nextEra };
  });

  return { world: { ...world, species: updatedSpecies }, adaptations };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeWeightedSuitability(
  traits: Traits,
  habitatAffinity: Parameters<typeof habitatSuitability>[0],
  occupiedRegions: Array<{ pop: number; region: { conditions: Parameters<typeof habitatSuitability>[2] } }>,
  totalPop: number,
): number {
  if (totalPop === 0) return 0;
  let weighted = 0;
  for (const { pop, region } of occupiedRegions) {
    const suit = habitatSuitability(habitatAffinity, traits, region.conditions);
    weighted += pop * suit;
  }
  return weighted / totalPop;
}

function computeTraitUpkeep(traits: Traits): number {
  return Math.floor(
    (traits.bodySize + traits.mobility + traits.coldTolerance + traits.droughtTolerance)
    / Ruleset.TRAIT_UPKEEP_DIVISOR,
  );
}
