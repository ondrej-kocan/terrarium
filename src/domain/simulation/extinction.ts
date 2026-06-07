import type { World } from '@/domain/world/types';
import { Ruleset } from '@/domain/ruleset/v1';

/**
 * Stage 10: Mark species as extinct when total population falls below
 * MINIMUM_VIABLE_POPULATION. A remnant too small to breed is treated as gone.
 */
export function resolveExtinction(
  world: World,
  nextEra: number,
): { world: World; extinctions: string[] } {
  const extinctions: string[] = [];

  const updatedSpecies = world.species.map(sp => {
    if (sp.status !== 'extant') return sp;

    const totalPop = Object.values(sp.populations as Record<string, number>).reduce(
      (s, p) => s + (p ?? 0), 0,
    );

    if (totalPop < Ruleset.MINIMUM_VIABLE_POPULATION) {
      extinctions.push(sp.id as string);
      return {
        ...sp,
        status: 'extinct' as const,
        extinctionEra: nextEra,
        populations: {},
      };
    }

    return sp;
  });

  return { world: { ...world, species: updatedSpecies }, extinctions };
}
