import type { PressureArchetypeTemplate } from '../types';

const INCREASING_DROUGHT: PressureArchetypeTemplate = {
  id: 'increasing-drought',
  name: 'Increasing Drought',
  description:
    'Moisture levels fall steadily each era. Drought-sensitive species retreat toward wetter regions, and producer capacity collapses once fertility thresholds are crossed.',
};

const COOLING_CLIMATE: PressureArchetypeTemplate = {
  id: 'cooling-climate',
  name: 'Cooling Climate',
  description:
    'Temperature falls across all regions each era. Cold-sensitive species lose suitability and capacity in exposed regions, driving migration toward warmer, more sheltered areas.',
};

const EXTREME_SEASONS: PressureArchetypeTemplate = {
  id: 'extreme-seasons',
  name: 'Extreme Seasons',
  description:
    'Temperature and moisture oscillate each era between a harsh season and a mild season. Food web boom and bust cycles propagate through the ecosystem.',
};

export const PRESSURE_ARCHETYPES = new Map<string, PressureArchetypeTemplate>([
  [INCREASING_DROUGHT.id, INCREASING_DROUGHT],
  [COOLING_CLIMATE.id, COOLING_CLIMATE],
  [EXTREME_SEASONS.id, EXTREME_SEASONS],
]);
