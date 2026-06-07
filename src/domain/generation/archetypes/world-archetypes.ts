import type { WorldArchetypeTemplate } from '../types';

const RIVER_BASIN: WorldArchetypeTemplate = {
  id: 'river-basin',
  name: 'River Basin',
  description:
    'A temperate lowland fed by tributaries. The moisture gradient is the dominant ecological axis.',
  regions: [
    {
      role: 'upland-margin',
      displayName: 'Upland Margin',
      temperature: { min: 4, max: 7 },
      moisture: { min: 2, max: 5 },
      fertility: { min: 3, max: 5 },
      shelter: { min: 2, max: 4 },
    },
    {
      role: 'floodplain',
      displayName: 'Floodplain',
      temperature: { min: 4, max: 7 },
      moisture: { min: 5, max: 8 },
      fertility: { min: 7, max: 9 },
      shelter: { min: 2, max: 4 },
    },
    {
      role: 'riparian-forest',
      displayName: 'Riparian Forest',
      temperature: { min: 3, max: 6 },
      moisture: { min: 6, max: 9 },
      fertility: { min: 5, max: 7 },
      shelter: { min: 6, max: 8 },
    },
  ],
  producerArchetypeIds: ['riparian-reed', 'hardy-groundcover'],
  herbivoreArchetypeIds: ['grazer', 'browser'],
  predatorArchetypeId: 'stalker',
  dietPairings: [
    { herbivoreArchetypeId: 'grazer', producerArchetypeId: 'riparian-reed' },
    { herbivoreArchetypeId: 'browser', producerArchetypeId: 'hardy-groundcover' },
  ],
  naming: {
    descriptors: ['River', 'Marsh', 'Upland', 'Reed', 'Fallow', 'Broad', 'Long', 'Slow', 'Brown', 'Grey'],
    animalNouns: ['Hopper', 'Grazer', 'Drifter', 'Stalker', 'Runner', 'Lurker', 'Creeper', 'Walker'],
    plantNouns: ['Reed', 'Grass', 'Sedge', 'Rush', 'Herb', 'Cover', 'Weed'],
  },
};

const VOLCANIC_ISLAND: WorldArchetypeTemplate = {
  id: 'volcanic-island',
  name: 'Volcanic Island',
  description:
    'A young tropical island with a pronounced elevation gradient. The summit is a natural isolation zone.',
  regions: [
    {
      role: 'shore',
      displayName: 'Shore',
      temperature: { min: 6, max: 9 },
      moisture: { min: 5, max: 8 },
      fertility: { min: 4, max: 6 },
      shelter: { min: 3, max: 5 },
    },
    {
      role: 'midslope',
      displayName: 'Midslope',
      temperature: { min: 4, max: 7 },
      moisture: { min: 4, max: 7 },
      fertility: { min: 5, max: 7 },
      shelter: { min: 4, max: 6 },
    },
    {
      role: 'summit',
      displayName: 'Summit',
      temperature: { min: 1, max: 4 },
      moisture: { min: 2, max: 5 },
      fertility: { min: 2, max: 4 },
      shelter: { min: 2, max: 4 },
    },
  ],
  producerArchetypeIds: ['tropical-fern', 'alpine-sedge'],
  herbivoreArchetypeIds: ['browser', 'montane-forager'],
  predatorArchetypeId: 'stalker',
  dietPairings: [
    { herbivoreArchetypeId: 'browser', producerArchetypeId: 'tropical-fern' },
    { herbivoreArchetypeId: 'montane-forager', producerArchetypeId: 'alpine-sedge' },
  ],
  naming: {
    descriptors: ['Shore', 'Summit', 'Ridge', 'Coastal', 'Alpine', 'Banded', 'Crested', 'Swift', 'Dark', 'Stone'],
    animalNouns: ['Climber', 'Diver', 'Hopper', 'Stalker', 'Glider', 'Forager', 'Skimmer'],
    plantNouns: ['Fern', 'Frond', 'Cane', 'Brush', 'Tuft', 'Creeper'],
  },
};

const HIGHLAND_VALLEY: WorldArchetypeTemplate = {
  id: 'highland-valley',
  name: 'Highland Valley',
  description:
    'A deep sheltered valley flanked by two exposed highland ridges. The symmetric topology makes speciation possible on either ridge.',
  regions: [
    {
      role: 'western-ridge',
      displayName: 'Western Ridge',
      temperature: { min: 2, max: 5 },
      moisture: { min: 3, max: 6 },
      fertility: { min: 3, max: 5 },
      shelter: { min: 1, max: 3 },
    },
    {
      role: 'valley-floor',
      displayName: 'Valley Floor',
      temperature: { min: 4, max: 7 },
      moisture: { min: 5, max: 8 },
      fertility: { min: 7, max: 9 },
      shelter: { min: 6, max: 8 },
    },
    {
      role: 'eastern-ridge',
      displayName: 'Eastern Ridge',
      temperature: { min: 2, max: 5 },
      moisture: { min: 3, max: 6 },
      fertility: { min: 3, max: 5 },
      shelter: { min: 1, max: 3 },
    },
  ],
  producerArchetypeIds: ['hardy-groundcover', 'alpine-sedge'],
  herbivoreArchetypeIds: ['grazer', 'montane-forager'],
  predatorArchetypeId: 'stalker',
  dietPairings: [
    { herbivoreArchetypeId: 'grazer', producerArchetypeId: 'hardy-groundcover' },
    { herbivoreArchetypeId: 'montane-forager', producerArchetypeId: 'alpine-sedge' },
  ],
  naming: {
    descriptors: ['Valley', 'Ridge', 'Highland', 'Fell', 'Moorland', 'Stocky', 'Mottled', 'Hardy', 'Grey', 'Brown'],
    animalNouns: ['Grazer', 'Forager', 'Stalker', 'Runner', 'Plodder', 'Rover', 'Climber'],
    plantNouns: ['Grass', 'Sedge', 'Cover', 'Heath', 'Bracken', 'Tuft'],
  },
};

export const WORLD_ARCHETYPES = new Map<string, WorldArchetypeTemplate>([
  [RIVER_BASIN.id, RIVER_BASIN],
  [VOLCANIC_ISLAND.id, VOLCANIC_ISLAND],
  [HIGHLAND_VALLEY.id, HIGHLAND_VALLEY],
]);
