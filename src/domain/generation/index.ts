import type {
  GenesisConfig,
  HabitatAffinity,
  RegionConditions,
  Species,
  Traits,
  World,
} from '@/domain/world/types';
import { regionId, speciesId, worldId } from '@/domain/world/types';
import { Ruleset, RULESET_VERSION } from '@/domain/ruleset/v1';
import { SeededRandom } from '@/infrastructure/random';
import { habitatSuitability } from '@/domain/simulation/formulas';
import { checkWorldInvariants } from '@/domain/world/invariants';
import { validateGeneratedWorld } from './validation';
import { generateSpeciesNames } from './naming';
import { WORLD_ARCHETYPES } from './archetypes/world-archetypes';
import { SPECIES_ARCHETYPES } from './archetypes/species-archetypes';
import type { SpeciesArchetypeTemplate, WorldArchetypeTemplate } from './types';

export { WORLD_ARCHETYPES } from './archetypes/world-archetypes';
export { SPECIES_ARCHETYPES } from './archetypes/species-archetypes';
export { PRESSURE_ARCHETYPES } from './archetypes/pressure-archetypes';

const MAX_ATTEMPTS = 10;

function affinityFrom(template: SpeciesArchetypeTemplate): HabitatAffinity {
  return {
    preferredTemperatureMin: template.preferredTemperature.min,
    preferredTemperatureMax: template.preferredTemperature.max,
    preferredMoistureMin: template.preferredMoisture.min,
    preferredMoistureMax: template.preferredMoisture.max,
  };
}

function pickBestRegionIndex(
  affinityAffinity: HabitatAffinity,
  traits: Pick<Traits, 'coldTolerance' | 'droughtTolerance'>,
  conditions: RegionConditions[],
): number {
  let bestIdx = 0;
  let bestSuit = -1;
  let bestFertility = -1;

  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i]!;
    const suit = habitatSuitability(affinityAffinity, traits, cond);
    if (suit > bestSuit || (suit === bestSuit && cond.fertility > bestFertility)) {
      bestSuit = suit;
      bestFertility = cond.fertility;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function tryGenerate(
  archetype: WorldArchetypeTemplate,
  genesisConfig: GenesisConfig,
  attempt: number,
): World | null {
  const root = new SeededRandom(genesisConfig.seed).derive(`generation:attempt:${attempt}`);
  const regionRng = root.derive('regions');
  const speciesRng = root.derive('species');
  const namingRng = root.derive('naming');

  // ── Generate region conditions ──────────────────────────────────────────────
  const conditions: RegionConditions[] = archetype.regions.map(rt => ({
    temperature: regionRng.nextInt(rt.temperature.min, rt.temperature.max),
    moisture: regionRng.nextInt(rt.moisture.min, rt.moisture.max),
    fertility: regionRng.nextInt(rt.fertility.min, rt.fertility.max),
    shelter: regionRng.nextInt(rt.shelter.min, rt.shelter.max),
  }));

  const regionIds = archetype.regions.map(rt => regionId(rt.role));

  // ── Generate species traits ─────────────────────────────────────────────────
  const allArchetypeIds = [
    ...archetype.producerArchetypeIds,
    ...archetype.herbivoreArchetypeIds,
    archetype.predatorArchetypeId,
  ];

  const traitMap = new Map<string, Traits>();
  for (const aid of allArchetypeIds) {
    const tmpl = SPECIES_ARCHETYPES.get(aid);
    if (!tmpl) throw new Error(`Unknown species archetype: ${aid}`);
    traitMap.set(aid, {
      bodySize: speciesRng.nextInt(tmpl.bodySize.min, tmpl.bodySize.max),
      mobility: speciesRng.nextInt(tmpl.mobility.min, tmpl.mobility.max),
      coldTolerance: speciesRng.nextInt(tmpl.coldTolerance.min, tmpl.coldTolerance.max),
      droughtTolerance: speciesRng.nextInt(tmpl.droughtTolerance.min, tmpl.droughtTolerance.max),
    });
  }

  // ── Generate names ──────────────────────────────────────────────────────────
  const producerCount = archetype.producerArchetypeIds.length;
  const animalCount = archetype.herbivoreArchetypeIds.length + 1; // herbivores + predator
  const names = generateSpeciesNames(archetype.naming, producerCount, animalCount, namingRng);

  // ── Place producers ─────────────────────────────────────────────────────────
  // Each producer placed in the region with highest suitability (ties broken by fertility).
  const producerRegionIndices: number[] = [];
  for (const aid of archetype.producerArchetypeIds) {
    const tmpl = SPECIES_ARCHETYPES.get(aid)!;
    const traits = traitMap.get(aid)!;
    const bestIdx = pickBestRegionIndex(affinityFrom(tmpl), traits, conditions);
    producerRegionIndices.push(bestIdx);
  }

  // ── Place herbivores (co-located with their food producer) ──────────────────
  const herbivoreRegionIndices: number[] = [];
  for (const [i, aid] of archetype.herbivoreArchetypeIds.entries()) {
    const pairing = archetype.dietPairings.find(p => p.herbivoreArchetypeId === aid);
    if (!pairing) throw new Error(`No diet pairing for herbivore: ${aid}`);
    const producerIdx = archetype.producerArchetypeIds.indexOf(pairing.producerArchetypeId);
    if (producerIdx === -1) throw new Error(`Diet pairing references unknown producer: ${pairing.producerArchetypeId}`);
    herbivoreRegionIndices.push(producerRegionIndices[producerIdx]!);
    void i; // suppress unused variable warning — index needed for mapping
  }

  // ── Place predator in best region that contains a herbivore ─────────────────
  const predAid = archetype.predatorArchetypeId;
  const predTmpl = SPECIES_ARCHETYPES.get(predAid)!;
  const predTraits = traitMap.get(predAid)!;
  const predAffinity = affinityFrom(predTmpl);

  // Score each herbivore's region by predator suitability; pick the best.
  // If tied, prefer the herbivore with lower archetype ID (stable sort).
  let predatorRegionIdx = herbivoreRegionIndices[0]!;
  let predatorPreyArchetypeId = archetype.herbivoreArchetypeIds[0]!;
  let bestPredSuit = habitatSuitability(predAffinity, predTraits, conditions[predatorRegionIdx]!);

  for (let i = 1; i < herbivoreRegionIndices.length; i++) {
    const ridx = herbivoreRegionIndices[i]!;
    const suit = habitatSuitability(predAffinity, predTraits, conditions[ridx]!);
    const hAid = archetype.herbivoreArchetypeIds[i]!;
    if (suit > bestPredSuit || (suit === bestPredSuit && hAid < predatorPreyArchetypeId)) {
      bestPredSuit = suit;
      predatorRegionIdx = ridx;
      predatorPreyArchetypeId = hAid;
    }
  }

  // ── Build regions ───────────────────────────────────────────────────────────
  const builtRegions = archetype.regions.map((rt, i) => ({
    id: regionIds[i]!,
    name: rt.displayName,
    role: rt.role,
    neighborIds:
      i === 0
        ? [regionIds[1]!]
        : i === archetype.regions.length - 1
          ? [regionIds[i - 1]!]
          : [regionIds[i - 1]!, regionIds[i + 1]!],
    conditions: conditions[i]!,
    baselineConditions: conditions[i]!,
  }));

  // ── Build species ───────────────────────────────────────────────────────────
  const builtSpecies: Species[] = [];

  // Producers
  // Seed the primary (best) region at full starting population, plus any other
  // region with suitability >= 30% at a proportionally smaller population.
  // This ensures every region has some producer biomass so relocated consumers
  // always find food, and the world feels naturally inhabited from the start.
  for (const [i, aid] of archetype.producerArchetypeIds.entries()) {
    const tmpl = SPECIES_ARCHETYPES.get(aid)!;
    const traits = traitMap.get(aid)!;
    const regionIndex = producerRegionIndices[i]!;

    const populations: Record<string, number> = {};
    for (let j = 0; j < conditions.length; j++) {
      const rj = regionIds[j] as string;
      const suit = habitatSuitability(affinityFrom(tmpl), traits, conditions[j]!);
      if (j === regionIndex) {
        populations[rj] = Ruleset.STARTING_PRODUCER_POPULATION;
      } else if (suit >= 30) {
        populations[rj] = Math.round(Ruleset.STARTING_PRODUCER_POPULATION * suit / 100);
      }
    }

    builtSpecies.push({
      id: speciesId(aid),
      name: names.plantNames[i] ?? aid,
      archetypeId: aid,
      trophicRole: 'producer',
      traits,
      originTraits: traits,
      habitatAffinity: affinityFrom(tmpl),
      dietIds: [],
      populations,
      isolationEras: {},
      candidateTraits: {},
      lastMigrationEra: {},
      lastAdaptationEra: null,
      status: 'extant',
      parentSpeciesId: null,
      originEra: 0,
      extinctionEra: null,
    });
  }

  // Herbivores
  for (const [i, aid] of archetype.herbivoreArchetypeIds.entries()) {
    const traits = traitMap.get(aid)!;
    const regionIndex = herbivoreRegionIndices[i]!;
    const rid = regionIds[regionIndex]!;
    const pairing = archetype.dietPairings.find(p => p.herbivoreArchetypeId === aid)!;

    builtSpecies.push({
      id: speciesId(aid),
      name: names.animalNames[i] ?? aid,
      archetypeId: aid,
      trophicRole: 'herbivore',
      traits,
      originTraits: traits,
      habitatAffinity: affinityFrom(SPECIES_ARCHETYPES.get(aid)!),
      dietIds: [speciesId(pairing.producerArchetypeId)],
      populations: { [rid]: Ruleset.STARTING_HERBIVORE_POPULATION },
      isolationEras: {},
      candidateTraits: {},
      lastMigrationEra: {},
      lastAdaptationEra: null,
      status: 'extant',
      parentSpeciesId: null,
      originEra: 0,
      extinctionEra: null,
    });
  }

  // Predator
  {
    const traits = traitMap.get(predAid)!;
    const rid = regionIds[predatorRegionIdx]!;
    const herbivoreCount = archetype.herbivoreArchetypeIds.length;

    builtSpecies.push({
      id: speciesId(predAid),
      name: names.animalNames[herbivoreCount] ?? predAid,
      archetypeId: predAid,
      trophicRole: 'predator',
      traits,
      originTraits: traits,
      habitatAffinity: affinityFrom(predTmpl),
      dietIds: [speciesId(predatorPreyArchetypeId)],
      populations: { [rid]: Ruleset.STARTING_PREDATOR_POPULATION },
      isolationEras: {},
      candidateTraits: {},
      lastMigrationEra: {},
      lastAdaptationEra: null,
      status: 'extant',
      parentSpeciesId: null,
      originEra: 0,
      extinctionEra: null,
    });
  }

  // ── Assemble world ──────────────────────────────────────────────────────────
  const world: World = {
    id: worldId(`${genesisConfig.worldArchetypeId}:${genesisConfig.environmentalPressureId}:${genesisConfig.seed}`),
    rulesetVersion: RULESET_VERSION,
    genesisConfig,
    name: archetype.name,
    era: 0,
    regions: builtRegions,
    species: builtSpecies,
    interventionUsed: false,
  };

  // ── Validate ────────────────────────────────────────────────────────────────
  const invariantViolations = checkWorldInvariants(world);
  if (invariantViolations.length > 0) return null;

  const generationViolations = validateGeneratedWorld(world);
  if (generationViolations.length > 0) return null;

  return world;
}

export function generate(genesisConfig: GenesisConfig): World {
  const archetype = WORLD_ARCHETYPES.get(genesisConfig.worldArchetypeId);
  if (!archetype) {
    throw new Error(`Unknown world archetype: ${genesisConfig.worldArchetypeId}`);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const world = tryGenerate(archetype, genesisConfig, attempt);
    if (world) return world;
  }

  throw new Error(
    `Generation failed after ${MAX_ATTEMPTS} attempts for genesis config: ${JSON.stringify(genesisConfig)}`,
  );
}
