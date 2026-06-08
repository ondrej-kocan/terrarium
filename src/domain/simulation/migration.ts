import type { RegionId, World } from '@/domain/world/types';
import { eventId, regionId as makeRegionId } from '@/domain/world/types';
import type { DomainEvent } from '@/domain/events/types';
import { Ruleset } from '@/domain/ruleset/v1';
import { habitatSuitability, foodDemandPerUnit, clamp } from './formulas';
import { roundHalfUp } from './allocation';
import type { FulfillmentMap } from './consumption';

/**
 * MigrationsThisEra tracks which (speciesId, regionId) pairs were involved in
 * a migration event (either as source or destination) this era.
 * Format: "${speciesId}:${regionId}"
 */
export type MigrationsThisEra = Set<string>;

/**
 * Stage 7: Migration.
 *
 * For each extant species × occupied region (using PRE-MIGRATION snapshot):
 * - Check trigger conditions
 * - Score neighbors
 * - Migrate to best qualifying destination
 */
export function resolveMigration(
  world: World,
  eraStartPopulations: Map<string, Map<string, number>>,
  herbivoreFulfillment: FulfillmentMap,
  predatorFulfillment: FulfillmentMap,
  nextEra: number,
): { world: World; migrations: MigrationsThisEra; events: DomainEvent[] } {
  // Build pre-migration snapshot of current populations
  const preMigrationPops = buildPopSnapshot(world);

  // Collect all migration moves to apply together
  type MigrationMove = {
    speciesId: string;
    sourceRegionId: string;
    destRegionId: string;
    amount: number;
    popBefore: number;
    destBefore: number;
    trigger: 'habitat' | 'food' | 'decline';
  };

  const moves: MigrationMove[] = [];
  const migrations: MigrationsThisEra = new Set();

  for (const sp of world.species) {
    if (sp.status !== 'extant') continue;

    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) <= 0) continue;
      const sourcePop = pop!;

      // Check: source population >= MIGRATION_MIN_SOURCE_POPULATION
      if (sourcePop < Ruleset.MIGRATION_MIN_SOURCE_POPULATION) continue;

      // Check: cooldown not active
      const lastMigEra = (sp.lastMigrationEra as Record<string, number>)[rid] ?? 0;
      if (lastMigEra >= nextEra - Ruleset.MIGRATION_COOLDOWN_ERAS) continue;

      const sourceRegion = world.regions.find(r => (r.id as string) === rid);
      if (!sourceRegion) continue;

      // Get food fulfillment for this species in source region
      let sourceFoodFulfillment = 100;
      if (sp.trophicRole === 'herbivore') {
        sourceFoodFulfillment = herbivoreFulfillment.get(sp.id as string)?.get(rid) ?? 100;
      } else if (sp.trophicRole === 'predator') {
        sourceFoodFulfillment = predatorFulfillment.get(sp.id as string)?.get(rid) ?? 100;
      }

      const sourceSuitability = habitatSuitability(sp.habitatAffinity, sp.traits, sourceRegion.conditions);

      // Check trigger conditions
      const eraStartPop = eraStartPopulations.get(sp.id as string)?.get(rid) ?? sourcePop;
      const populationDeclinePct = eraStartPop > 0
        ? ((eraStartPop - sourcePop) / eraStartPop) * 100
        : 0;

      const habitatTriggered = sourceSuitability < Ruleset.MIGRATION_TRIGGER;
      const foodTriggered = sourceFoodFulfillment < Ruleset.MIGRATION_TRIGGER;
      const declineTriggered = populationDeclinePct >= Ruleset.POPULATION_DECLINE_TRIGGER;

      if (!habitatTriggered && !foodTriggered && !declineTriggered) continue;

      const trigger: MigrationMove['trigger'] = habitatTriggered ? 'habitat' : foodTriggered ? 'food' : 'decline';

      // Compute origin score
      const originFoodProspect = computeFoodProspect(
        sp,
        rid,
        sourcePop,
        preMigrationPops,
        0, // no migrants for origin scoring
      );
      const originScore = roundHalfUp((sourceSuitability + originFoodProspect) / 2);

      // Migration amount
      const migrationPct = clamp(
        Ruleset.MIGRATION_MIN_PERCENT,
        Ruleset.MIGRATION_MAX_PERCENT,
        Ruleset.MIGRATION_BASE_PERCENT + sp.traits.mobility * Ruleset.MIGRATION_MOBILITY_EFFECT,
      );
      const rawAmount = roundHalfUp(sourcePop * migrationPct / 100);
      const migratingAmount = Math.min(rawAmount, sourcePop - 1);

      if (migratingAmount <= 0) continue;

      // Score each neighboring region
      type ScoredDest = {
        regionId: string;
        score: number;
      };

      const qualifyingDests: ScoredDest[] = [];

      for (const neighborId of sourceRegion.neighborIds) {
        const nid = neighborId as string;
        const destRegion = world.regions.find(r => (r.id as string) === nid);
        if (!destRegion) continue;

        const destSuitability = habitatSuitability(sp.habitatAffinity, sp.traits, destRegion.conditions);
        const destFoodProspect = computeFoodProspect(
          sp,
          nid,
          preMigrationPops.get(sp.id as string)?.get(nid) ?? 0,
          preMigrationPops,
          migratingAmount,
        );

        const destScore = roundHalfUp((destSuitability + destFoodProspect) / 2);

        if (destScore >= originScore + Ruleset.MIGRATION_MIN_ADVANTAGE) {
          qualifyingDests.push({ regionId: nid, score: destScore });
        }
      }

      if (qualifyingDests.length === 0) continue;

      // Best destination: highest score, ties by region ID ascending
      qualifyingDests.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.regionId < b.regionId ? -1 : a.regionId > b.regionId ? 1 : 0;
      });

      const bestDest = qualifyingDests[0]!;
      const destBefore = preMigrationPops.get(sp.id as string)?.get(bestDest.regionId) ?? 0;

      moves.push({
        speciesId: sp.id as string,
        sourceRegionId: rid,
        destRegionId: bestDest.regionId,
        amount: migratingAmount,
        popBefore: sourcePop,
        destBefore,
        trigger,
      });
    }
  }

  // Apply all migrations together
  // Build mutable population maps
  const populationChanges = new Map<string, Map<string, number>>(); // speciesId → regionId → delta
  const newLastMigrationEras = new Map<string, Map<string, number>>(); // speciesId → regionId → era

  for (const move of moves) {
    if (!populationChanges.has(move.speciesId)) populationChanges.set(move.speciesId, new Map());
    const deltas = populationChanges.get(move.speciesId)!;

    const srcDelta = deltas.get(move.sourceRegionId) ?? 0;
    deltas.set(move.sourceRegionId, srcDelta - move.amount);

    const dstDelta = deltas.get(move.destRegionId) ?? 0;
    deltas.set(move.destRegionId, dstDelta + move.amount);

    if (!newLastMigrationEras.has(move.speciesId)) newLastMigrationEras.set(move.speciesId, new Map());
    newLastMigrationEras.get(move.speciesId)!.set(move.sourceRegionId, nextEra);

    migrations.add(`${move.speciesId}:${move.sourceRegionId}`);
    migrations.add(`${move.speciesId}:${move.destRegionId}`);
  }

  const updatedSpecies = world.species.map(sp => {
    const deltas = populationChanges.get(sp.id as string);
    const migEras = newLastMigrationEras.get(sp.id as string);

    if (!deltas && !migEras) return sp;

    const newPops: Record<string, number> = { ...sp.populations as Record<string, number> };
    if (deltas) {
      for (const [rid, delta] of deltas) {
        const current = newPops[rid] ?? 0;
        newPops[rid] = Math.max(0, current + delta);
      }
    }

    const newLastMigEras: Record<string, number> = { ...sp.lastMigrationEra as Record<string, number> };
    if (migEras) {
      for (const [rid, era] of migEras) {
        newLastMigEras[rid] = era;
      }
    }

    return { ...sp, populations: newPops, lastMigrationEra: newLastMigEras };
  });

  // Build migration events
  const events: DomainEvent[] = [];
  for (const move of moves) {
    const sp = world.species.find(s => (s.id as string) === move.speciesId);
    if (!sp) continue;

    const popAfter = move.popBefore - move.amount;
    const destAfter = move.destBefore + move.amount;

    events.push({
      id: eventId(`${nextEra}:population_migrated:${move.speciesId}:${move.sourceRegionId}->${move.destRegionId}`),
      type: 'population_migrated',
      era: nextEra,
      subjectIds: {
        worldId: world.id,
        regionIds: [makeRegionId(move.sourceRegionId), makeRegionId(move.destRegionId)] as readonly RegionId[],
        speciesIds: [sp.id],
      },
      changes: {
        [`population:${move.sourceRegionId}`]: { before: move.popBefore, after: popAfter },
        [`population:${move.destRegionId}`]: { before: move.destBefore, after: destAfter },
      },
      causes: [{
        type: 'habitat_mismatch',
        description: move.trigger === 'habitat'
          ? `poor habitat in ${world.regions.find(r => (r.id as string) === move.sourceRegionId)?.name ?? move.sourceRegionId}`
          : move.trigger === 'food'
            ? `food shortage in ${world.regions.find(r => (r.id as string) === move.sourceRegionId)?.name ?? move.sourceRegionId}`
            : `population crash in ${world.regions.find(r => (r.id as string) === move.sourceRegionId)?.name ?? move.sourceRegionId}`,
      }],
      contributingEventIds: [],
    });
  }

  return {
    world: { ...world, species: updatedSpecies },
    migrations,
    events,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPopSnapshot(world: World): Map<string, Map<string, number>> {
  const snap = new Map<string, Map<string, number>>();
  for (const sp of world.species) {
    if (sp.status !== 'extant') continue;
    const regionMap = new Map<string, number>();
    for (const [rid, pop] of Object.entries(sp.populations)) {
      if ((pop ?? 0) > 0) regionMap.set(rid, pop!);
    }
    snap.set(sp.id as string, regionMap);
  }
  return snap;
}

/**
 * Compute food prospect for a species in a region.
 * Producers: 100
 * Consumers: clamp(0,100, (edibleFood × 100) / projectedTotalDemandAfterArrival)
 */
function computeFoodProspect(
  sp: { trophicRole: string; dietIds: readonly { toString(): string }[]; traits: { bodySize: number; mobility: number } },
  regionId: string,
  currentPop: number,
  allPops: Map<string, Map<string, number>>,
  migratingAmount: number,
): number {
  if (sp.trophicRole === 'producer') return 100;
  if (sp.dietIds.length === 0) return 0;

  const foodId = sp.dietIds[0]!.toString();
  const edibleFood = allPops.get(foodId)?.get(regionId) ?? 0;

  const popAfterArrival = currentPop + migratingAmount;
  const projectedDemand = popAfterArrival * foodDemandPerUnit(sp.traits);

  if (projectedDemand === 0) return 100;

  return clamp(0, 100, Math.floor((edibleFood * 100) / projectedDemand));
}
