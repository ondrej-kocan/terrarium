import { regionId, speciesId, worldId } from '@/domain/world/types';
import type { Region, Species, Traits, World } from '@/domain/world/types';

const defaultTraits: Traits = {
  bodySize: 2,
  mobility: 2,
  coldTolerance: 1,
  droughtTolerance: 1,
};

export const REGION_A = regionId('region-a');
export const REGION_B = regionId('region-b');
export const REGION_C = regionId('region-c');

export const PRODUCER_1 = speciesId('producer-1');
export const PRODUCER_2 = speciesId('producer-2');
export const HERBIVORE_1 = speciesId('herbivore-1');
export const HERBIVORE_2 = speciesId('herbivore-2');
export const PREDATOR_1 = speciesId('predator-1');

function makeRegion(id: ReturnType<typeof regionId>, neighborIds: ReturnType<typeof regionId>[]): Region {
  return {
    id,
    name: `Region ${id}`,
    role: 'test',
    neighborIds,
    conditions: { temperature: 5, moisture: 5, fertility: 5, shelter: 5 },
    baselineConditions: { temperature: 5, moisture: 5, fertility: 5, shelter: 5 },
  };
}

function makeProducer(id: ReturnType<typeof speciesId>, regionId_: ReturnType<typeof regionId>, population = 60): Species {
  return {
    id,
    name: `Producer ${id}`,
    archetypeId: 'test-producer',
    trophicRole: 'producer',
    traits: { bodySize: 0, mobility: 0, coldTolerance: 1, droughtTolerance: 1 },
    originTraits: { bodySize: 0, mobility: 0, coldTolerance: 1, droughtTolerance: 1 },
    habitatAffinity: {
      preferredTemperatureMin: 3,
      preferredTemperatureMax: 7,
      preferredMoistureMin: 3,
      preferredMoistureMax: 7,
    },
    dietIds: [],
    populations: { [regionId_]: population },
    isolationEras: {},
    candidateTraits: {},
    lastMigrationEra: {},
    lastAdaptationEra: null,
    status: 'extant',
    parentSpeciesId: null,
    originEra: 0,
    extinctionEra: null,
  };
}

function makeHerbivore(
  id: ReturnType<typeof speciesId>,
  regionId_: ReturnType<typeof regionId>,
  foodId: ReturnType<typeof speciesId>,
  population = 30,
): Species {
  return {
    id,
    name: `Herbivore ${id}`,
    archetypeId: 'test-herbivore',
    trophicRole: 'herbivore',
    traits: defaultTraits,
    originTraits: defaultTraits,
    habitatAffinity: {
      preferredTemperatureMin: 3,
      preferredTemperatureMax: 7,
      preferredMoistureMin: 3,
      preferredMoistureMax: 7,
    },
    dietIds: [foodId],
    populations: { [regionId_]: population },
    isolationEras: {},
    candidateTraits: {},
    lastMigrationEra: {},
    lastAdaptationEra: null,
    status: 'extant',
    parentSpeciesId: null,
    originEra: 0,
    extinctionEra: null,
  };
}

function makePredator(
  id: ReturnType<typeof speciesId>,
  regionId_: ReturnType<typeof regionId>,
  preyId: ReturnType<typeof speciesId>,
  population = 15,
): Species {
  return {
    id,
    name: `Predator ${id}`,
    archetypeId: 'test-predator',
    trophicRole: 'predator',
    traits: defaultTraits,
    originTraits: defaultTraits,
    habitatAffinity: {
      preferredTemperatureMin: 3,
      preferredTemperatureMax: 7,
      preferredMoistureMin: 3,
      preferredMoistureMax: 7,
    },
    dietIds: [preyId],
    populations: { [regionId_]: population },
    isolationEras: {},
    candidateTraits: {},
    lastMigrationEra: {},
    lastAdaptationEra: null,
    status: 'extant',
    parentSpeciesId: null,
    originEra: 0,
    extinctionEra: null,
  };
}

// buildValidWorld returns a minimal world that should pass all invariant checks.
// Linear topology: A — B — C
export function buildValidWorld(overrides?: Partial<World>): World {
  return {
    id: worldId('test-world'),
    rulesetVersion: '1.0.0',
    genesisConfig: {
      worldArchetypeId: 'river-basin',
      environmentalPressureId: 'increasing-drought',
      seed: 'test-seed',
    },
    name: 'Test World',
    era: 0,
    regions: [
      makeRegion(REGION_A, [REGION_B]),
      makeRegion(REGION_B, [REGION_A, REGION_C]),
      makeRegion(REGION_C, [REGION_B]),
    ],
    species: [
      makeProducer(PRODUCER_1, REGION_A),
      makeProducer(PRODUCER_2, REGION_B),
      makeHerbivore(HERBIVORE_1, REGION_A, PRODUCER_1),
      makeHerbivore(HERBIVORE_2, REGION_B, PRODUCER_2),
      makePredator(PREDATOR_1, REGION_A, HERBIVORE_1),
    ],
    interventionUsed: false,
    ...overrides,
  };
}
