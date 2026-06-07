import { describe, expect, it } from 'vitest';
import {
  HERBIVORE_1,
  PREDATOR_1,
  PRODUCER_1,
  PRODUCER_2,
  REGION_A,
  REGION_B,
  REGION_C,
  buildValidWorld,
} from '@/test/fixtures/world';
import { regionId, speciesId } from './types';
import { assertWorldValid, checkWorldInvariants } from './invariants';

describe('checkWorldInvariants', () => {
  it('passes for a valid world', () => {
    expect(checkWorldInvariants(buildValidWorld())).toEqual([]);
  });

  describe('region invariants', () => {
    it('flags wrong region count', () => {
      const world = buildValidWorld({ regions: buildValidWorld().regions.slice(0, 2) });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'REGION_COUNT')).toBe(true);
    });

    it('flags duplicate region IDs', () => {
      const regions = buildValidWorld().regions;
      const world = buildValidWorld({
        regions: [regions[0]!, { ...regions[1]!, id: regions[0]!.id }, regions[2]!],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'REGION_IDS_UNIQUE')).toBe(true);
    });

    it('flags a neighbor that does not exist', () => {
      const regions = buildValidWorld().regions;
      const world = buildValidWorld({
        regions: [
          { ...regions[0]!, neighborIds: [regionId('nonexistent')] },
          regions[1]!,
          regions[2]!,
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'NEIGHBOR_EXISTS')).toBe(true);
    });

    it('flags a self-neighbor', () => {
      const regions = buildValidWorld().regions;
      const world = buildValidWorld({
        regions: [
          { ...regions[0]!, neighborIds: [REGION_A] },
          regions[1]!,
          regions[2]!,
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'NO_SELF_NEIGHBOR')).toBe(true);
    });

    it('flags a condition value out of range', () => {
      const regions = buildValidWorld().regions;
      const world = buildValidWorld({
        regions: [
          { ...regions[0]!, conditions: { ...regions[0]!.conditions, temperature: 11 } },
          regions[1]!,
          regions[2]!,
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'CONDITION_RANGE')).toBe(true);
    });

    it('flags a negative condition value', () => {
      const regions = buildValidWorld().regions;
      const world = buildValidWorld({
        regions: [
          { ...regions[0]!, conditions: { ...regions[0]!.conditions, moisture: -1 } },
          regions[1]!,
          regions[2]!,
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'CONDITION_RANGE')).toBe(true);
    });
  });

  describe('species invariants', () => {
    it('flags duplicate species IDs', () => {
      const species = buildValidWorld().species;
      const world = buildValidWorld({
        species: [species[0]!, { ...species[1]!, id: species[0]!.id }, ...species.slice(2)],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'SPECIES_IDS_UNIQUE')).toBe(true);
    });

    it('flags a trait value out of range', () => {
      const species = buildValidWorld().species;
      const world = buildValidWorld({
        species: [
          species[0]!,
          { ...species[1]!, traits: { ...species[1]!.traits, bodySize: 11 } },
          ...species.slice(2),
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'TRAIT_RANGE')).toBe(true);
    });

    it('flags a negative population value', () => {
      const species = buildValidWorld().species;
      const world = buildValidWorld({
        species: [
          { ...species[0]!, populations: { [REGION_A]: -1 } },
          ...species.slice(1),
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'POPULATION_NON_NEGATIVE')).toBe(true);
    });

    it('flags an extant species with zero population', () => {
      const species = buildValidWorld().species;
      const world = buildValidWorld({
        species: [
          { ...species[0]!, populations: {}, status: 'extant' },
          ...species.slice(1),
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'EXTANT_HAS_POPULATION')).toBe(true);
    });

    it('flags an extinct species with positive population', () => {
      const species = buildValidWorld().species;
      const world = buildValidWorld({
        species: [
          { ...species[0]!, populations: { [REGION_A]: 10 }, status: 'extinct', extinctionEra: 1 },
          ...species.slice(1),
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'EXTINCT_HAS_NO_POPULATION')).toBe(true);
    });

    it('flags a consumer with an empty diet', () => {
      const species = buildValidWorld().species;
      const herbivore = species.find(s => s.trophicRole === 'herbivore')!;
      const world = buildValidWorld({
        species: [
          ...species.filter(s => s.id !== herbivore.id),
          { ...herbivore, dietIds: [] },
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'CONSUMER_HAS_DIET')).toBe(true);
    });

    it('flags a diet that references a nonexistent species', () => {
      const species = buildValidWorld().species;
      const herbivore = species.find(s => s.trophicRole === 'herbivore' && s.id === HERBIVORE_1)!;
      const world = buildValidWorld({
        species: [
          ...species.filter(s => s.id !== herbivore.id),
          { ...herbivore, dietIds: [speciesId('ghost-species')] },
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'DIET_SPECIES_EXISTS')).toBe(true);
    });

    it('flags a parent species that does not exist', () => {
      const species = buildValidWorld().species;
      const child = species[0]!;
      const world = buildValidWorld({
        species: [
          { ...child, parentSpeciesId: speciesId('ghost-parent') },
          ...species.slice(1),
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'PARENT_EXISTS')).toBe(true);
    });

    it('flags a lineage cycle', () => {
      const base = buildValidWorld();
      const p1 = base.species.find(s => s.id === PRODUCER_1)!;
      const p2 = base.species.find(s => s.id === PRODUCER_2)!;
      const world = buildValidWorld({
        species: [
          { ...p1, parentSpeciesId: PRODUCER_2 },
          { ...p2, parentSpeciesId: PRODUCER_1 },
          ...base.species.filter(s => s.id !== PRODUCER_1 && s.id !== PRODUCER_2),
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'NO_LINEAGE_CYCLES')).toBe(true);
    });

    it('flags a population in a nonexistent region', () => {
      const species = buildValidWorld().species;
      const world = buildValidWorld({
        species: [
          { ...species[0]!, populations: { [regionId('ghost-region')]: 10 } },
          ...species.slice(1),
        ],
      });
      const vs = checkWorldInvariants(world);
      expect(vs.some(v => v.invariant === 'POPULATION_REGION_EXISTS')).toBe(true);
    });
  });

  describe('assertWorldValid', () => {
    it('does not throw for a valid world', () => {
      expect(() => assertWorldValid(buildValidWorld())).not.toThrow();
    });

    it('throws with a descriptive message for an invalid world', () => {
      const world = buildValidWorld({ regions: buildValidWorld().regions.slice(0, 2) });
      expect(() => assertWorldValid(world)).toThrow(/REGION_COUNT/);
    });
  });
});
