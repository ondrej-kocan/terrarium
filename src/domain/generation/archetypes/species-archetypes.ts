import type { SpeciesArchetypeTemplate } from '../types';

const RIPARIAN_REED: SpeciesArchetypeTemplate = {
  id: 'riparian-reed',
  archetypeName: 'Riparian Reed',
  trophicRole: 'producer',
  preferredTemperature: { min: 4, max: 8 },
  preferredMoisture: { min: 5, max: 9 },
  coldTolerance: { min: 0, max: 1 },
  droughtTolerance: { min: 0, max: 1 },
  bodySize: { min: 0, max: 0 },
  mobility: { min: 0, max: 0 },
};

const HARDY_GROUNDCOVER: SpeciesArchetypeTemplate = {
  id: 'hardy-groundcover',
  archetypeName: 'Hardy Groundcover',
  trophicRole: 'producer',
  preferredTemperature: { min: 3, max: 7 },
  preferredMoisture: { min: 2, max: 6 },
  coldTolerance: { min: 1, max: 2 },
  droughtTolerance: { min: 2, max: 3 },
  bodySize: { min: 0, max: 0 },
  mobility: { min: 0, max: 0 },
};

const ALPINE_SEDGE: SpeciesArchetypeTemplate = {
  id: 'alpine-sedge',
  archetypeName: 'Alpine Sedge',
  trophicRole: 'producer',
  preferredTemperature: { min: 1, max: 5 },
  preferredMoisture: { min: 2, max: 6 },
  coldTolerance: { min: 2, max: 4 },
  droughtTolerance: { min: 1, max: 2 },
  bodySize: { min: 0, max: 0 },
  mobility: { min: 0, max: 0 },
};

const TROPICAL_FERN: SpeciesArchetypeTemplate = {
  id: 'tropical-fern',
  archetypeName: 'Tropical Fern',
  trophicRole: 'producer',
  preferredTemperature: { min: 6, max: 9 },
  preferredMoisture: { min: 4, max: 8 },
  coldTolerance: { min: 0, max: 0 },
  droughtTolerance: { min: 0, max: 1 },
  bodySize: { min: 0, max: 0 },
  mobility: { min: 0, max: 0 },
};

const GRAZER: SpeciesArchetypeTemplate = {
  id: 'grazer',
  archetypeName: 'Grazer',
  trophicRole: 'herbivore',
  preferredTemperature: { min: 3, max: 7 },
  preferredMoisture: { min: 2, max: 6 },
  coldTolerance: { min: 1, max: 2 },
  droughtTolerance: { min: 1, max: 2 },
  bodySize: { min: 2, max: 4 },
  mobility: { min: 2, max: 4 },
};

const BROWSER: SpeciesArchetypeTemplate = {
  id: 'browser',
  archetypeName: 'Browser',
  trophicRole: 'herbivore',
  preferredTemperature: { min: 4, max: 8 },
  preferredMoisture: { min: 4, max: 8 },
  coldTolerance: { min: 0, max: 2 },
  droughtTolerance: { min: 0, max: 2 },
  bodySize: { min: 3, max: 5 },
  mobility: { min: 1, max: 3 },
};

const MONTANE_FORAGER: SpeciesArchetypeTemplate = {
  id: 'montane-forager',
  archetypeName: 'Montane Forager',
  trophicRole: 'herbivore',
  preferredTemperature: { min: 1, max: 6 },
  preferredMoisture: { min: 2, max: 6 },
  coldTolerance: { min: 2, max: 4 },
  droughtTolerance: { min: 1, max: 3 },
  bodySize: { min: 1, max: 3 },
  mobility: { min: 2, max: 5 },
};

const STALKER: SpeciesArchetypeTemplate = {
  id: 'stalker',
  archetypeName: 'Stalker',
  trophicRole: 'predator',
  preferredTemperature: { min: 3, max: 7 },
  preferredMoisture: { min: 3, max: 7 },
  coldTolerance: { min: 1, max: 2 },
  droughtTolerance: { min: 1, max: 2 },
  bodySize: { min: 1, max: 3 },
  mobility: { min: 1, max: 4 },
};

export const SPECIES_ARCHETYPES = new Map<string, SpeciesArchetypeTemplate>([
  [RIPARIAN_REED.id, RIPARIAN_REED],
  [HARDY_GROUNDCOVER.id, HARDY_GROUNDCOVER],
  [ALPINE_SEDGE.id, ALPINE_SEDGE],
  [TROPICAL_FERN.id, TROPICAL_FERN],
  [GRAZER.id, GRAZER],
  [BROWSER.id, BROWSER],
  [MONTANE_FORAGER.id, MONTANE_FORAGER],
  [STALKER.id, STALKER],
]);
