import type { Era, EventId, RegionId, SpeciesId, WorldId } from '@/domain/world/types';

export type EventType =
  | 'world_started'
  | 'species_discovered'
  | 'environment_changed'
  | 'resource_capacity_changed'
  | 'food_shortage'
  | 'population_increased'
  | 'population_declined'
  | 'predation_occurred'
  | 'competition_occurred'
  | 'population_migrated'
  | 'species_adapted'
  | 'species_speciated'
  | 'species_extinct'
  | 'population_relocated';

export type CauseRecord = {
  readonly type:
    | 'environmental_change'
    | 'resource_shortage'
    | 'predation_pressure'
    | 'competition_pressure'
    | 'habitat_mismatch'
    | 'isolation'
    | 'player_relocation'
    | 'prior_event';
  readonly description: string;
  readonly measuredValue?: number;
};

export type DomainEvent = {
  readonly id: EventId;
  readonly type: EventType;
  readonly era: Era;
  readonly subjectIds: {
    readonly worldId: WorldId;
    readonly regionIds: readonly RegionId[];
    readonly speciesIds: readonly SpeciesId[];
  };
  // Before/after pairs keyed by field name; typed as unknown to keep the event
  // structure generic while still being serialisable.
  readonly changes: Readonly<Record<string, { readonly before: unknown; readonly after: unknown }>>;
  readonly causes: readonly CauseRecord[];
  // IDs of earlier events in the same era (or prior eras) that contributed.
  readonly contributingEventIds: readonly EventId[];
};
