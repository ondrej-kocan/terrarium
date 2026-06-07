import type { HabitatAffinity, RegionConditions, Traits } from '@/domain/world/types';
import { Ruleset } from '@/domain/ruleset/v1';

export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function rangeGap(value: number, min: number, max: number): number {
  return Math.max(min - value, 0, value - max);
}

export function habitatSuitability(
  affinity: HabitatAffinity,
  traits: Pick<Traits, 'coldTolerance' | 'droughtTolerance'>,
  conditions: RegionConditions,
): number {
  const toleratedTempMin = affinity.preferredTemperatureMin - traits.coldTolerance;
  const toleratedMoistMin = affinity.preferredMoistureMin - traits.droughtTolerance;

  const tempGap = rangeGap(conditions.temperature, toleratedTempMin, affinity.preferredTemperatureMax);
  const moistGap = rangeGap(conditions.moisture, toleratedMoistMin, affinity.preferredMoistureMax);

  const shelterBuffer = Math.floor(conditions.shelter / Ruleset.SHELTER_BUFFER_DIVISOR);
  const unbufferedGap = Math.max(0, tempGap + moistGap - shelterBuffer);

  return clamp(0, 100, 100 - unbufferedGap * Ruleset.SUITABILITY_PENALTY_PER_GAP);
}

export function foodDemandPerUnit(traits: Pick<Traits, 'bodySize' | 'mobility'>): number {
  return (
    Ruleset.FOOD_BASE +
    Math.floor(traits.bodySize / Ruleset.BODY_DEMAND_DIVISOR) +
    Math.floor(traits.mobility / Ruleset.MOBILITY_DEMAND_DIVISOR)
  );
}

export function producerCapacity(fertility: number): number {
  return fertility * Ruleset.PRODUCER_CAPACITY_PER_FERTILITY;
}

export function foodFulfillmentPercent(supply: number, demand: number): number {
  if (demand === 0) return 100;
  return clamp(0, 100, Math.round((supply / demand) * 100));
}
