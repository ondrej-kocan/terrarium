import type { DomainEvent } from '@/domain/events/types';
import type { Era, GenesisConfig, RegionId, SpeciesId, World, WorldId } from '@/domain/world/types';

export type StartWorldCommand = {
  readonly type: 'StartWorld';
  readonly genesisConfig: GenesisConfig;
};

export type AdvanceEraCommand = {
  readonly type: 'AdvanceEra';
  readonly worldId: WorldId;
  // Caller must supply the expected current era to prevent stale-command races.
  readonly expectedEra: Era;
};

export type RelocatePopulationCommand = {
  readonly type: 'RelocatePopulation';
  readonly worldId: WorldId;
  readonly speciesId: SpeciesId;
  readonly fromRegionId: RegionId;
  readonly toRegionId: RegionId;
  readonly amount: number;
};

export type Command = StartWorldCommand | AdvanceEraCommand | RelocatePopulationCommand;

export type CommandSuccess = {
  readonly success: true;
  readonly world: World;
  readonly events: readonly DomainEvent[];
};

export type CommandFailure = {
  readonly success: false;
  readonly reasons: readonly string[];
};

export type CommandResult = CommandSuccess | CommandFailure;

export function succeeded(result: CommandResult): result is CommandSuccess {
  return result.success;
}

export function failed(result: CommandResult): result is CommandFailure {
  return !result.success;
}
