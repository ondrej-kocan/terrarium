import type { TrophicRole } from '@/domain/world/types';

export type ConditionRange = {
  readonly min: number;
  readonly max: number;
};

export type TraitRange = {
  readonly min: number;
  readonly max: number;
};

export type RegionTemplate = {
  readonly role: string;
  readonly displayName: string;
  readonly temperature: ConditionRange;
  readonly moisture: ConditionRange;
  readonly fertility: ConditionRange;
  readonly shelter: ConditionRange;
};

export type DietPairing = {
  readonly herbivoreArchetypeId: string;
  readonly producerArchetypeId: string;
};

export type NamingVocabulary = {
  readonly descriptors: readonly string[];
  readonly animalNouns: readonly string[];
  readonly plantNouns: readonly string[];
};

export type WorldArchetypeTemplate = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  // Always exactly 3 regions in linear topology: [0] ↔ [1] ↔ [2]
  readonly regions: readonly [RegionTemplate, RegionTemplate, RegionTemplate];
  readonly producerArchetypeIds: readonly [string, string];
  readonly herbivoreArchetypeIds: readonly [string, string];
  readonly predatorArchetypeId: string;
  // Fixed diet pairing per archetype: herbivore[i] eats producer defined here
  readonly dietPairings: readonly [DietPairing, DietPairing];
  readonly naming: NamingVocabulary;
};

export type SpeciesArchetypeTemplate = {
  readonly id: string;
  readonly archetypeName: string;
  readonly trophicRole: TrophicRole;
  readonly preferredTemperature: ConditionRange;
  readonly preferredMoisture: ConditionRange;
  readonly coldTolerance: TraitRange;
  readonly droughtTolerance: TraitRange;
  readonly bodySize: TraitRange;
  readonly mobility: TraitRange;
};

export type PressureArchetypeTemplate = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};
