import type { Species, Traits, World } from './types';

export type InvariantViolation = {
  readonly invariant: string;
  readonly message: string;
};

// ── Value-range helpers ───────────────────────────────────────────────────────

function isConditionValue(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 10;
}

function isTraitValue(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 10;
}

function isNonNegativeInteger(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

function checkTraits(traits: Traits, label: string): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const [key, value] of Object.entries(traits)) {
    if (!isTraitValue(value)) {
      violations.push({
        invariant: 'TRAIT_RANGE',
        message: `${label} trait ${key} out of range: ${value}`,
      });
    }
  }
  return violations;
}

// ── Lineage cycle detection ───────────────────────────────────────────────────

function hasLineageCycle(species: readonly Species[]): boolean {
  const parentOf = new Map<string, string>(
    species
      .filter(s => s.parentSpeciesId !== null)
      .map(s => [s.id as string, s.parentSpeciesId as string]),
  );
  for (const start of species) {
    const visited = new Set<string>();
    let current: string | undefined = start.id as string;
    while (current !== undefined) {
      if (visited.has(current)) return true;
      visited.add(current);
      current = parentOf.get(current);
    }
  }
  return false;
}

// ── Main invariant check ──────────────────────────────────────────────────────

export function checkWorldInvariants(world: World): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Era is a non-negative integer.
  if (!isNonNegativeInteger(world.era)) {
    violations.push({ invariant: 'ERA_VALID', message: `era must be a non-negative integer, got ${world.era}` });
  }

  // Exactly three regions.
  if (world.regions.length !== 3) {
    violations.push({ invariant: 'REGION_COUNT', message: `expected 3 regions, got ${world.regions.length}` });
  }

  // Region IDs are unique.
  const regionIds = world.regions.map(r => r.id as string);
  if (new Set(regionIds).size !== regionIds.length) {
    violations.push({ invariant: 'REGION_IDS_UNIQUE', message: 'duplicate region IDs' });
  }

  const regionIdSet = new Set(regionIds);

  for (const region of world.regions) {
    // Neighbor IDs reference existing regions.
    for (const neighborId of region.neighborIds) {
      if (!regionIdSet.has(neighborId)) {
        violations.push({
          invariant: 'NEIGHBOR_EXISTS',
          message: `region ${region.id} references unknown neighbor ${neighborId}`,
        });
      }
      if (neighborId === region.id) {
        violations.push({
          invariant: 'NO_SELF_NEIGHBOR',
          message: `region ${region.id} lists itself as a neighbor`,
        });
      }
    }

    // Condition values in range.
    for (const [key, value] of Object.entries(region.conditions)) {
      if (!isConditionValue(value)) {
        violations.push({
          invariant: 'CONDITION_RANGE',
          message: `region ${region.id} condition ${key} out of range: ${value}`,
        });
      }
    }
    for (const [key, value] of Object.entries(region.baselineConditions)) {
      if (!isConditionValue(value)) {
        violations.push({
          invariant: 'BASELINE_CONDITION_RANGE',
          message: `region ${region.id} baseline condition ${key} out of range: ${value}`,
        });
      }
    }
  }

  // Species IDs are unique.
  const speciesIds = world.species.map(s => s.id as string);
  if (new Set(speciesIds).size !== speciesIds.length) {
    violations.push({ invariant: 'SPECIES_IDS_UNIQUE', message: 'duplicate species IDs' });
  }

  const speciesIdSet = new Set(speciesIds);

  for (const sp of world.species) {
    // Trait values in range.
    violations.push(...checkTraits(sp.traits, `species ${sp.id}`));
    violations.push(...checkTraits(sp.originTraits, `species ${sp.id} originTraits`));

    // Population values are non-negative integers.
    let totalPopulation = 0;
    for (const [rid, pop] of Object.entries(sp.populations)) {
      if (pop === undefined) continue;
      if (!isNonNegativeInteger(pop)) {
        violations.push({
          invariant: 'POPULATION_NON_NEGATIVE',
          message: `species ${sp.id} in region ${rid} has invalid population: ${pop}`,
        });
      }
      if (!regionIdSet.has(rid)) {
        violations.push({
          invariant: 'POPULATION_REGION_EXISTS',
          message: `species ${sp.id} has population in unknown region ${rid}`,
        });
      }
      totalPopulation += pop ?? 0;
    }

    // Extant species must have positive total population.
    if (sp.status === 'extant' && totalPopulation <= 0) {
      violations.push({
        invariant: 'EXTANT_HAS_POPULATION',
        message: `extant species ${sp.id} has zero total population`,
      });
    }

    // Extinct species must have zero total population.
    if (sp.status === 'extinct' && totalPopulation > 0) {
      violations.push({
        invariant: 'EXTINCT_HAS_NO_POPULATION',
        message: `extinct species ${sp.id} has positive total population: ${totalPopulation}`,
      });
    }

    // Consumers must reference valid food species.
    if (sp.trophicRole !== 'producer') {
      if (sp.dietIds.length === 0) {
        violations.push({
          invariant: 'CONSUMER_HAS_DIET',
          message: `consumer species ${sp.id} has no diet entries`,
        });
      }
      for (const foodId of sp.dietIds) {
        if (!speciesIdSet.has(foodId)) {
          violations.push({
            invariant: 'DIET_SPECIES_EXISTS',
            message: `species ${sp.id} diet references unknown species ${foodId}`,
          });
        }
      }
    }

    // Parent species must exist.
    if (sp.parentSpeciesId !== null && !speciesIdSet.has(sp.parentSpeciesId)) {
      violations.push({
        invariant: 'PARENT_EXISTS',
        message: `species ${sp.id} parent ${sp.parentSpeciesId} does not exist`,
      });
    }

    // Origin era is non-negative.
    if (!isNonNegativeInteger(sp.originEra)) {
      violations.push({
        invariant: 'ORIGIN_ERA_VALID',
        message: `species ${sp.id} originEra is invalid: ${sp.originEra}`,
      });
    }

    // Extinction era, if set, must be after origin era.
    if (sp.extinctionEra !== null) {
      if (!isNonNegativeInteger(sp.extinctionEra) || sp.extinctionEra < sp.originEra) {
        violations.push({
          invariant: 'EXTINCTION_ERA_VALID',
          message: `species ${sp.id} extinctionEra ${sp.extinctionEra} is invalid relative to originEra ${sp.originEra}`,
        });
      }
    }
  }

  // No cycles in the species lineage graph.
  if (hasLineageCycle(world.species)) {
    violations.push({ invariant: 'NO_LINEAGE_CYCLES', message: 'lineage graph contains a cycle' });
  }

  return violations;
}

export function assertWorldValid(world: World): void {
  const violations = checkWorldInvariants(world);
  if (violations.length > 0) {
    const messages = violations.map(v => `[${v.invariant}] ${v.message}`).join('\n');
    throw new Error(`World invariant violations:\n${messages}`);
  }
}
