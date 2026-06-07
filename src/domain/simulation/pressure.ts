import type { Region, World } from '@/domain/world/types';
import { Ruleset } from '@/domain/ruleset/v1';
import { clamp } from './formulas';

/**
 * Stage 1: Apply the selected environmental pressure to region conditions.
 * Advancing from era N to nextEra = N+1.
 */
export function applyPressure(
  world: World,
  nextEra: number,
): { regions: readonly Region[]; pressureChanged: boolean } {
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
      return { regions: world.regions, pressureChanged: false };
  }
}

function applyIncreasingDrought(
  world: World,
  nextEra: number,
): { regions: readonly Region[]; pressureChanged: boolean } {
  // On every DROUGHT_STEP_INTERVAL eras (nextEra % 2 === 0)
  if (nextEra % Ruleset.DROUGHT_STEP_INTERVAL !== 0) {
    return { regions: world.regions, pressureChanged: false };
  }

  const regions = world.regions.map(region => {
    const newMoisture = clamp(0, 10, region.conditions.moisture - 1);
    let newFertility = region.conditions.fertility;
    if (newMoisture <= Ruleset.DROUGHT_FERTILITY_THRESHOLD) {
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

  return { regions, pressureChanged: true };
}

function applyCoolingClimate(
  world: World,
  nextEra: number,
): { regions: readonly Region[]; pressureChanged: boolean } {
  // On every COOLING_STEP_INTERVAL eras (nextEra % 2 === 0)
  if (nextEra % Ruleset.COOLING_STEP_INTERVAL !== 0) {
    return { regions: world.regions, pressureChanged: false };
  }

  const regions = world.regions.map(region => {
    const newTemperature = clamp(0, 10, region.conditions.temperature - 1);
    let newFertility = region.conditions.fertility;
    if (newTemperature <= Ruleset.COOLING_FERTILITY_THRESHOLD) {
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

  return { regions, pressureChanged: true };
}

function applyExtremeSeasons(
  world: World,
  nextEra: number,
): { regions: readonly Region[]; pressureChanged: boolean } {
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

  return { regions, pressureChanged: true };
}
