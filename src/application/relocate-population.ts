import type { RelocatePopulationCommand, CommandResult } from '@/domain/commands/types';
import type { World } from '@/domain/world/types';
import { eventId } from '@/domain/world/types';

export function handleRelocatePopulation(command: RelocatePopulationCommand, world: World): CommandResult {
  const { speciesId, fromRegionId, toRegionId, amount } = command;

  // Validate: intervention not already used
  if (world.interventionUsed) {
    return { success: false, reasons: ['Intervention already used'] };
  }

  // Validate: source and destination are different
  if ((fromRegionId as string) === (toRegionId as string)) {
    return { success: false, reasons: ['Source and destination are the same region'] };
  }

  // Validate: amount >= 1
  if (amount < 1) {
    return { success: false, reasons: ['Amount must be at least 1'] };
  }

  // Find species
  const sp = world.species.find(s => (s.id as string) === (speciesId as string));
  if (!sp || sp.status !== 'extant') {
    return { success: false, reasons: ['Species is extinct'] };
  }

  // Validate: species has population in fromRegionId
  const sourcePopBefore = (sp.populations as Record<string, number>)[fromRegionId as string] ?? 0;
  if (sourcePopBefore <= 0) {
    return { success: false, reasons: ['No population in source region'] };
  }

  // Find source region
  const sourceRegion = world.regions.find(r => (r.id as string) === (fromRegionId as string));
  if (!sourceRegion) {
    return { success: false, reasons: ['No population in source region'] };
  }

  // Validate: toRegionId is a neighbor of fromRegionId
  const isNeighbor = sourceRegion.neighborIds.some(nid => (nid as string) === (toRegionId as string));
  if (!isNeighbor) {
    return { success: false, reasons: ['Regions are not connected'] };
  }

  // Validate: amount <= source population
  if (amount > sourcePopBefore) {
    return { success: false, reasons: ['Amount exceeds available population'] };
  }

  // Find destination region
  const destRegion = world.regions.find(r => (r.id as string) === (toRegionId as string));
  const destPopBefore = (sp.populations as Record<string, number>)[toRegionId as string] ?? 0;

  const sourcePopAfter = sourcePopBefore - amount;
  const destPopAfter = destPopBefore + amount;

  // Apply the relocation
  const newPops: Record<string, number> = { ...sp.populations as Record<string, number> };
  newPops[fromRegionId as string] = sourcePopAfter;
  newPops[toRegionId as string] = destPopAfter;

  const updatedSpecies = world.species.map(s =>
    (s.id as string) === (speciesId as string)
      ? { ...s, populations: newPops }
      : s,
  );

  const updatedWorld: World = {
    ...world,
    species: updatedSpecies,
    interventionUsed: true,
  };

  const fromRegionName = sourceRegion.name;
  const destRegionName = destRegion?.name ?? (toRegionId as string);

  const event = {
    id: eventId(`${world.era}:population_relocated:${speciesId as string}:${fromRegionId as string}->${toRegionId as string}`),
    type: 'population_relocated' as const,
    era: world.era,
    subjectIds: {
      worldId: world.id,
      regionIds: [fromRegionId, toRegionId],
      speciesIds: [speciesId],
    },
    changes: {
      [`population:${fromRegionId as string}`]: { before: sourcePopBefore, after: sourcePopAfter },
      [`population:${toRegionId as string}`]: { before: destPopBefore, after: destPopAfter },
    },
    causes: [{
      type: 'player_relocation' as const,
      description: `Player relocated ${amount} individuals from ${fromRegionName} to ${destRegionName}`,
    }],
    contributingEventIds: [],
  };

  return { success: true, world: updatedWorld, events: [event] };
}
