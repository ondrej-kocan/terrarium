import type { StartWorldCommand, CommandResult } from '@/domain/commands/types';
import { generate } from '@/domain/generation';
import { WORLD_ARCHETYPES } from '@/domain/generation/archetypes/world-archetypes';
import { PRESSURE_ARCHETYPES } from '@/domain/generation/archetypes/pressure-archetypes';

export function handleStartWorld(command: StartWorldCommand): CommandResult {
  const { genesisConfig } = command;

  if (!genesisConfig.seed.trim()) {
    return { success: false, reasons: ['Seed must not be empty'] };
  }
  if (!WORLD_ARCHETYPES.has(genesisConfig.worldArchetypeId)) {
    return { success: false, reasons: [`Unknown world archetype: ${genesisConfig.worldArchetypeId}`] };
  }
  if (!PRESSURE_ARCHETYPES.has(genesisConfig.environmentalPressureId)) {
    return { success: false, reasons: [`Unknown pressure: ${genesisConfig.environmentalPressureId}`] };
  }

  try {
    const world = generate(genesisConfig);
    return { success: true, world, events: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, reasons: [message] };
  }
}
