import type { Region, Species, Traits, World } from '@/domain/world/types';
import { speciesId as makeSpeciesId } from '@/domain/world/types';
import { Ruleset } from '@/domain/ruleset/v1';
import { habitatSuitability } from './formulas';
import type { MigrationsThisEra } from './migration';

/**
 * Stage 9: Isolation tracking and speciation.
 */
export function resolveIsolation(
  world: World,
  migrationsThisEra: MigrationsThisEra,
  nextEra: number,
): {
  world: World;
  speciations: Array<{ parentId: string; childId: string; regionId: string }>;
} {
  const speciations: Array<{ parentId: string; childId: string; regionId: string }> = [];

  // Process each species for isolation updates
  let updatedSpecies = world.species.map(sp => {
    if (sp.status !== 'extant') return sp;

    // Find all occupied regions for this species
    const occupiedRegions: string[] = [];
    for (const [rid, pop] of Object.entries(sp.populations as Record<string, number>)) {
      if ((pop ?? 0) > 0) occupiedRegions.push(rid);
    }

    if (occupiedRegions.length === 0) return sp;

    const newIsolationEras: Record<string, number> = { ...sp.isolationEras as Record<string, number> };
    const newCandidateTraits: Record<string, Traits | null> = { ...sp.candidateTraits as Record<string, Traits | null> };

    for (const rid of occupiedRegions) {
      const pop = (sp.populations as Record<string, number>)[rid] ?? 0;
      if (pop <= 0) continue;

      const isolated = isRegionIsolated(sp, rid, occupiedRegions, migrationsThisEra, pop, world.regions);

      if (isolated) {
        const prevIsolationEras = newIsolationEras[rid] ?? 0;
        newIsolationEras[rid] = prevIsolationEras + 1;

        // If just starting isolation (was 0), initialize candidate traits
        if (prevIsolationEras === 0) {
          newCandidateTraits[rid] = { ...sp.traits };
        }

        // Every ADAPTATION_INTERVAL isolation eras, evolve the candidate traits
        const currentIsolationEras = newIsolationEras[rid]!;
        if (currentIsolationEras > 0 && currentIsolationEras % Ruleset.ADAPTATION_INTERVAL === 0) {
          const currentCandidate = newCandidateTraits[rid] ?? sp.traits;
          const region = world.regions.find(r => (r.id as string) === rid);
          if (region) {
            newCandidateTraits[rid] = evolveCandidate(
              currentCandidate,
              sp.habitatAffinity,
              sp.originTraits,
              region.conditions,
            );
          }
        }
      } else {
        // Not isolated: reset
        newIsolationEras[rid] = 0;
        newCandidateTraits[rid] = null;
      }
    }

    return { ...sp, isolationEras: newIsolationEras, candidateTraits: newCandidateTraits };
  });

  // Speciation check — after isolation updates
  const newChildSpecies: Species[] = [];

  updatedSpecies = updatedSpecies.map(sp => {
    if (sp.status !== 'extant') return sp;

    const totalPop = Object.values(sp.populations as Record<string, number>).reduce(
      (s, p) => s + (p ?? 0), 0,
    );

    type SpCandidate = {
      regionId: string;
      divergence: number;
      isolationEras: number;
      pop: number;
    };

    const qualifyingRegions: SpCandidate[] = [];

    for (const [rid, isolEras] of Object.entries(sp.isolationEras as Record<string, number>)) {
      if ((isolEras ?? 0) < Ruleset.SPECIATION_ISOLATION_ERAS) continue;

      const regionPop = (sp.populations as Record<string, number>)[rid] ?? 0;
      if (regionPop < Ruleset.SPECIATION_MIN_POPULATION) continue;

      // Parent must survive elsewhere
      if (totalPop - regionPop < Ruleset.SPECIATION_MIN_PARENT_POPULATION) continue;

      const candidateT = (sp.candidateTraits as Record<string, Traits | null>)[rid];
      if (!candidateT) continue;

      const divergence = computeDivergence(candidateT, sp.traits);
      if (divergence < Ruleset.SPECIATION_DIVERGENCE) continue;

      qualifyingRegions.push({
        regionId: rid,
        divergence,
        isolationEras: isolEras ?? 0,
        pop: regionPop,
      });
    }

    if (qualifyingRegions.length === 0) return sp;

    // Pick best: greatest divergence, then longest isolation, then highest population, then region ID
    qualifyingRegions.sort((a, b) => {
      if (b.divergence !== a.divergence) return b.divergence - a.divergence;
      if (b.isolationEras !== a.isolationEras) return b.isolationEras - a.isolationEras;
      if (b.pop !== a.pop) return b.pop - a.pop;
      return a.regionId < b.regionId ? -1 : a.regionId > b.regionId ? 1 : 0;
    });

    const best = qualifyingRegions[0]!;
    const { regionId: bid, pop: regionPop } = best;
    const candidateT = (sp.candidateTraits as Record<string, Traits | null>)[bid]!;

    const childId = makeSpeciesId(`${sp.id as string}-child-era-${nextEra}-${bid}`);
    const childName = `${sp.name} (Variant)`;

    const childSpecies: Species = {
      id: childId,
      name: childName,
      archetypeId: sp.archetypeId,
      trophicRole: sp.trophicRole,
      traits: candidateT,
      originTraits: candidateT,
      habitatAffinity: sp.habitatAffinity,
      dietIds: sp.dietIds,
      populations: { [bid]: regionPop },
      isolationEras: {},
      candidateTraits: {},
      lastMigrationEra: {},
      lastAdaptationEra: null,
      status: 'extant',
      parentSpeciesId: sp.id,
      originEra: nextEra,
      extinctionEra: null,
    };

    newChildSpecies.push(childSpecies);
    speciations.push({ parentId: sp.id as string, childId: childId as string, regionId: bid });

    // Remove isolated region from parent
    const newParentPops: Record<string, number> = { ...sp.populations as Record<string, number> };
    newParentPops[bid] = 0;

    const newIsolationEras: Record<string, number> = { ...sp.isolationEras as Record<string, number> };
    delete newIsolationEras[bid];

    const newCandidateTraits: Record<string, Traits | null> = { ...sp.candidateTraits as Record<string, Traits | null> };
    delete newCandidateTraits[bid];

    return {
      ...sp,
      populations: newParentPops,
      isolationEras: newIsolationEras,
      candidateTraits: newCandidateTraits,
    };
  });

  return {
    world: { ...world, species: [...updatedSpecies, ...newChildSpecies] },
    speciations,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRegionIsolated(
  sp: Species,
  regionId: string,
  occupiedRegions: string[],
  migrationsThisEra: MigrationsThisEra,
  pop: number,
  regions: readonly Region[],
): boolean {
  // Must exist in more than one region
  if (occupiedRegions.length <= 1) return false;

  // Population must be >= ISOLATION_MIN_TRACKED_POPULATION
  if (pop < Ruleset.ISOLATION_MIN_TRACKED_POPULATION) return false;

  // No migration involving this species in this region this era
  if (migrationsThisEra.has(`${sp.id as string}:${regionId}`)) return false;

  // No directly connected neighboring region contains this species with population > 0
  const region = regions.find(r => (r.id as string) === regionId);
  if (!region) return false;

  for (const neighborId of region.neighborIds) {
    const nid = neighborId as string;
    if (occupiedRegions.includes(nid)) {
      // A neighbor has this species → not isolated
      return false;
    }
  }

  return true;
}

function computeDivergence(candidateTraits: Traits, currentTraits: Traits): number {
  return (
    Math.abs(candidateTraits.bodySize - currentTraits.bodySize)
    + Math.abs(candidateTraits.mobility - currentTraits.mobility)
    + Math.abs(candidateTraits.coldTolerance - currentTraits.coldTolerance)
    + Math.abs(candidateTraits.droughtTolerance - currentTraits.droughtTolerance)
  );
}

function evolveCandidate(
  currentCandidate: Traits,
  habitatAffinity: Parameters<typeof habitatSuitability>[0],
  originTraits: Traits,
  conditions: Parameters<typeof habitatSuitability>[2],
): Traits {
  const currentSuit = habitatSuitability(habitatAffinity, currentCandidate, conditions);
  const currentUpkeep = computeTraitUpkeep(currentCandidate);

  type TraitKey = keyof Traits;
  const tiebreakKeyOrder: TraitKey[] = ['coldTolerance', 'droughtTolerance', 'mobility', 'bodySize'];

  type CandidateOpt = {
    traits: Traits;
    traitKey: TraitKey;
    direction: 1 | -1;
    netBenefit: number;
  };

  const candidates: CandidateOpt[] = [];

  for (const key of tiebreakKeyOrder) {
    for (const direction of [-1, 1] as const) {
      const newValue = currentCandidate[key] + direction;
      if (newValue < 0 || newValue > 10) continue;
      if (Math.abs(newValue - originTraits[key]) > Ruleset.ADAPTATION_LIMIT) continue;

      const candidateTraits: Traits = { ...currentCandidate, [key]: newValue };
      const newSuit = habitatSuitability(habitatAffinity, candidateTraits, conditions);
      const newUpkeep = computeTraitUpkeep(candidateTraits);

      const suitBenefit = newSuit - currentSuit;
      const upkeepDelta = newUpkeep - currentUpkeep;
      const netBenefit = suitBenefit - upkeepDelta;

      candidates.push({ traits: candidateTraits, traitKey: key, direction, netBenefit });
    }
  }

  const qualifying = candidates.filter(c => c.netBenefit >= Ruleset.ADAPTATION_MIN_BENEFIT);
  if (qualifying.length === 0) return currentCandidate;

  qualifying.sort((a, b) => {
    if (b.netBenefit !== a.netBenefit) return b.netBenefit - a.netBenefit;
    const aKeyIdx = tiebreakKeyOrder.indexOf(a.traitKey);
    const bKeyIdx = tiebreakKeyOrder.indexOf(b.traitKey);
    if (aKeyIdx !== bKeyIdx) return aKeyIdx - bKeyIdx;
    return a.direction - b.direction;
  });

  return qualifying[0]!.traits;
}

function computeTraitUpkeep(traits: Traits): number {
  return Math.floor(
    (traits.bodySize + traits.mobility + traits.coldTolerance + traits.droughtTolerance)
    / Ruleset.TRAIT_UPKEEP_DIVISOR,
  );
}
