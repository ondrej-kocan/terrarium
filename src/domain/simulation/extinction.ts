import type { World } from '@/domain/world/types';

/**
 * Stage 10: Mark species with zero total population as extinct.
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

    if (totalPop === 0) {
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
