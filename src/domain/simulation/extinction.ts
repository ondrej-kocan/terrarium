import type { World } from '@/domain/world/types';
import { eventId } from '@/domain/world/types';
import type { DomainEvent } from '@/domain/events/types';
import { Ruleset } from '@/domain/ruleset/v1';

/**
 * Stage 10: Mark species as extinct when total population falls below
 * MINIMUM_VIABLE_POPULATION. A remnant too small to breed is treated as gone.
 */
export function resolveExtinction(
  world: World,
  nextEra: number,
): { world: World; extinctions: string[]; events: DomainEvent[] } {
  const extinctions: string[] = [];
  const extinctSpecies: typeof world.species[0][] = [];

  const updatedSpecies = world.species.map(sp => {
    if (sp.status !== 'extant') return sp;

    const totalPop = Object.values(sp.populations as Record<string, number>).reduce(
      (s, p) => s + (p ?? 0), 0,
    );

    if (totalPop < Ruleset.MINIMUM_VIABLE_POPULATION) {
      extinctions.push(sp.id as string);
      extinctSpecies.push(sp);
      return {
        ...sp,
        status: 'extinct' as const,
        extinctionEra: nextEra,
        populations: {},
      };
    }

    return sp;
  });

  const events: DomainEvent[] = extinctSpecies.map(sp => ({
    id: eventId(`${nextEra}:species_extinct:${sp.id as string}`),
    type: 'species_extinct' as const,
    era: nextEra,
    subjectIds: { worldId: world.id, regionIds: [], speciesIds: [sp.id] },
    changes: { status: { before: 'extant', after: 'extinct' } },
    causes: [{ type: 'resource_shortage' as const, description: `${sp.name} population fell below minimum viable threshold` }],
    contributingEventIds: [],
  }));

  return { world: { ...world, species: updatedSpecies }, extinctions, events };
}
