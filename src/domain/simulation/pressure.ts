import type { Region, World } from '@/domain/world/types';
import { eventId } from '@/domain/world/types';
import type { DomainEvent } from '@/domain/events/types';
import { Ruleset } from '@/domain/ruleset/v1';
import { clamp } from './formulas';

/**
 * Stage 1: Apply the selected environmental pressure to region conditions.
 * Advancing from era N to nextEra = N+1.
 */
export function applyPressure(
  world: World,
  nextEra: number,
): { regions: readonly Region[]; pressureChanged: boolean; events: DomainEvent[] } {
  const pressureId = world.genesisConfig.environmentalPressureId;

  switch (pressureId) {
    case 'increasing-drought':
      return applyIncreasingDrought(world, nextEra);
    case 'cooling-climate':
      return applyCoolingClimate(world, nextEra);
    case 'extreme-seasons':
      return applyExtremeSeasons(world, nextEra);
    default:
      // Unknown pressure: no change
      return { regions: world.regions, pressureChanged: false, events: [] };
  }
}

function buildPressureEvents(
  world: World,
  nextEra: number,
  oldRegions: readonly Region[],
  newRegions: readonly Region[],
): DomainEvent[] {
  const pressureId = world.genesisConfig.environmentalPressureId;
  const events: DomainEvent[] = [];

  for (let i = 0; i < newRegions.length; i++) {
    const oldRegion = oldRegions[i]!;
    const newRegion = newRegions[i]!;
    const oldConditions = oldRegion.conditions;
    const newConditions = newRegion.conditions;

    // Only emit if conditions actually changed
    const changed =
      oldConditions.temperature !== newConditions.temperature ||
      oldConditions.moisture !== newConditions.moisture ||
      oldConditions.fertility !== newConditions.fertility ||
      oldConditions.shelter !== newConditions.shelter;

    if (changed) {
      events.push({
        id: eventId(`${nextEra}:environment_changed:${newRegion.id as string}`),
        type: 'environment_changed',
        era: nextEra,
        subjectIds: { worldId: world.id, regionIds: [newRegion.id], speciesIds: [] },
        changes: { conditions: { before: oldConditions, after: newConditions } },
        causes: [{ type: 'environmental_change', description: `${pressureId} pressure altered conditions` }],
        contributingEventIds: [],
      });
    }
  }

  return events;
}

function applyIncreasingDrought(
  world: World,
  nextEra: number,
): { regions: readonly Region[]; pressureChanged: boolean; events: DomainEvent[] } {
  // On every DROUGHT_STEP_INTERVAL eras (nextEra % 2 === 0)
  if (nextEra % Ruleset.DROUGHT_STEP_INTERVAL !== 0) {
    return { regions: world.regions, pressureChanged: false, events: [] };
  }

  const regions = world.regions.map(region => {
    const oldMoisture = region.conditions.moisture;
    const newMoisture = oldMoisture <= Ruleset.DROUGHT_MOISTURE_FLOOR
      ? oldMoisture
      : Math.max(Ruleset.DROUGHT_MOISTURE_FLOOR, oldMoisture - 1);
    let newFertility = region.conditions.fertility;
    if (newMoisture < oldMoisture && newMoisture <= Ruleset.DROUGHT_FERTILITY_THRESHOLD) {
      newFertility = clamp(0, 10, newFertility - 1);
    }
    return {
      ...region,
      conditions: {
        ...region.conditions,
        moisture: newMoisture,
        fertility: newFertility,
      },
    };
  });

  const events = buildPressureEvents(world, nextEra, world.regions, regions);
  return { regions, pressureChanged: true, events };
}

function applyCoolingClimate(
  world: World,
  nextEra: number,
): { regions: readonly Region[]; pressureChanged: boolean; events: DomainEvent[] } {
  // On every COOLING_STEP_INTERVAL eras (nextEra % 2 === 0)
  if (nextEra % Ruleset.COOLING_STEP_INTERVAL !== 0) {
    return { regions: world.regions, pressureChanged: false, events: [] };
  }

  const regions = world.regions.map(region => {
    const oldTemperature = region.conditions.temperature;
    const newTemperature = oldTemperature <= Ruleset.COOLING_TEMPERATURE_FLOOR
      ? oldTemperature
      : Math.max(Ruleset.COOLING_TEMPERATURE_FLOOR, oldTemperature - 1);
    let newFertility = region.conditions.fertility;
    if (newTemperature < oldTemperature && newTemperature <= Ruleset.COOLING_FERTILITY_THRESHOLD) {
      newFertility = clamp(0, 10, newFertility - 1);
    }
    return {
      ...region,
      conditions: {
        ...region.conditions,
        temperature: newTemperature,
        fertility: newFertility,
      },
    };
  });

  const events = buildPressureEvents(world, nextEra, world.regions, regions);
  return { regions, pressureChanged: true, events };
}

function applyExtremeSeasons(
  world: World,
  nextEra: number,
): { regions: readonly Region[]; pressureChanged: boolean; events: DomainEvent[] } {
  const isOdd = nextEra % 2 !== 0;

  const regions = world.regions.map(region => {
    const baseline = region.baselineConditions;
    let newTemperature: number;
    let newMoisture: number;

    if (isOdd) {
      // Odd eras: temperature = baseline + SHIFT, moisture = baseline - SHIFT
      newTemperature = clamp(0, 10, baseline.temperature + Ruleset.EXTREME_TEMPERATURE_SHIFT);
      newMoisture = clamp(0, 10, baseline.moisture - Ruleset.EXTREME_MOISTURE_SHIFT);
    } else {
      // Even eras: temperature = baseline - SHIFT, moisture = baseline + SHIFT
      newTemperature = clamp(0, 10, baseline.temperature - Ruleset.EXTREME_TEMPERATURE_SHIFT);
      newMoisture = clamp(0, 10, baseline.moisture + Ruleset.EXTREME_MOISTURE_SHIFT);
    }

    return {
      ...region,
      conditions: {
        ...region.conditions,
        temperature: newTemperature,
        moisture: newMoisture,
      },
    };
  });

  const events = buildPressureEvents(world, nextEra, world.regions, regions);
  return { regions, pressureChanged: true, events };
}
