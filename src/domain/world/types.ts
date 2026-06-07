// Branded ID types prevent accidental mixing of region, species, world, and event IDs.
export type WorldId = string & { readonly _brand: 'WorldId' };
export type RegionId = string & { readonly _brand: 'RegionId' };
export type SpeciesId = string & { readonly _brand: 'SpeciesId' };
export type EventId = string & { readonly _brand: 'EventId' };

export const worldId = (id: string): WorldId => id as WorldId;
export const regionId = (id: string): RegionId => id as RegionId;
export const speciesId = (id: string): SpeciesId => id as SpeciesId;
export const eventId = (id: string): EventId => id as EventId;

// Semantic aliases — integers validated by invariant checks, not the type system.
export type TraitValue = number;     // 0–10 integer
export type ConditionValue = number; // 0–10 integer
export type Population = number;     // non-negative integer
export type Era = number;            // non-negative integer

export type TrophicRole = 'producer' | 'herbivore' | 'predator';
export type SpeciesStatus = 'extant' | 'extinct';

export type Traits = {
  readonly bodySize: TraitValue;
  readonly mobility: TraitValue;
  readonly coldTolerance: TraitValue;
  readonly droughtTolerance: TraitValue;
};

export type HabitatAffinity = {
  readonly preferredTemperatureMin: ConditionValue;
  readonly preferredTemperatureMax: ConditionValue;
  readonly preferredMoistureMin: ConditionValue;
  readonly preferredMoistureMax: ConditionValue;
};

export type RegionConditions = {
  readonly temperature: ConditionValue;
  readonly moisture: ConditionValue;
  readonly fertility: ConditionValue;
  readonly shelter: ConditionValue;
};

export type Region = {
  readonly id: RegionId;
  readonly name: string;
  readonly role: string;
  readonly neighborIds: readonly RegionId[];
  readonly conditions: RegionConditions;
  // Stored so Extreme Seasons can oscillate around the generated baseline.
  readonly baselineConditions: RegionConditions;
};

// PerRegion<T> maps region IDs to per-population values (only occupied regions present).
export type PerRegion<T> = Readonly<Partial<Record<string, T>>>;

export type Species = {
  readonly id: SpeciesId;
  readonly name: string;
  readonly archetypeId: string;
  readonly trophicRole: TrophicRole;
  readonly traits: Traits;
  // Origin traits set at generation; adaptation is bounded by ADAPTATION_LIMIT from these.
  readonly originTraits: Traits;
  readonly habitatAffinity: HabitatAffinity;
  // Exactly one entry for MVP (single primary food species per consumer).
  readonly dietIds: readonly SpeciesId[];
  readonly populations: PerRegion<Population>;
  // Consecutive era counts of qualifying isolation per occupied region.
  readonly isolationEras: PerRegion<number>;
  // Candidate trait vector per isolated region; null before isolation begins.
  readonly candidateTraits: PerRegion<Traits | null>;
  // Last era in which each regional population migrated; drives the cooldown check.
  readonly lastMigrationEra: PerRegion<Era>;
  readonly lastAdaptationEra: Era | null;
  readonly status: SpeciesStatus;
  readonly parentSpeciesId: SpeciesId | null;
  readonly originEra: Era;
  readonly extinctionEra: Era | null;
};

export type GenesisConfig = {
  readonly worldArchetypeId: string;
  readonly environmentalPressureId: string;
  readonly seed: string;
};

export type World = {
  readonly id: WorldId;
  readonly rulesetVersion: string;
  readonly genesisConfig: GenesisConfig;
  readonly name: string;
  readonly era: Era;
  readonly regions: readonly Region[];
  readonly species: readonly Species[];
  readonly interventionUsed: boolean;
};
