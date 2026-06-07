import { describe, expect, it } from 'vitest';
import { generate } from './index';
import { checkWorldInvariants } from '@/domain/world/invariants';
import { validateGeneratedWorld } from './validation';
import type { GenesisConfig } from '@/domain/world/types';

const ARCHETYPES = ['river-basin', 'volcanic-island', 'highland-valley'] as const;
const PRESSURES = ['increasing-drought', 'cooling-climate', 'extreme-seasons'] as const;
const SEEDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'test-seed-1', 'test-seed-2', 'abc', '123'];

function genesis(
  worldArchetypeId: string,
  environmentalPressureId: string,
  seed: string,
): GenesisConfig {
  return { worldArchetypeId, environmentalPressureId, seed };
}

describe('generate', () => {
  describe('all archetype × pressure combinations produce valid worlds', () => {
    for (const archetype of ARCHETYPES) {
      for (const pressure of PRESSURES) {
        it(`${archetype} + ${pressure}`, () => {
          const world = generate(genesis(archetype, pressure, 'test-seed'));
          expect(checkWorldInvariants(world)).toEqual([]);
          expect(validateGeneratedWorld(world)).toEqual([]);
        });
      }
    }
  });

  describe('determinism', () => {
    it('same genesis config always produces the same world', () => {
      const cfg = genesis('river-basin', 'increasing-drought', 'my-seed');
      const w1 = generate(cfg);
      const w2 = generate(cfg);
      expect(w1).toEqual(w2);
    });

    it('different seeds produce different worlds', () => {
      const w1 = generate(genesis('river-basin', 'increasing-drought', 'seed-one'));
      const w2 = generate(genesis('river-basin', 'increasing-drought', 'seed-two'));
      // At least some region conditions differ
      expect(JSON.stringify(w1.regions)).not.toBe(JSON.stringify(w2.regions));
    });

    it('different archetypes produce structurally different worlds', () => {
      const w1 = generate(genesis('river-basin', 'increasing-drought', 'seed'));
      const w2 = generate(genesis('volcanic-island', 'increasing-drought', 'seed'));
      expect(w1.regions[0]!.name).not.toBe(w2.regions[0]!.name);
    });
  });

  describe('world structure', () => {
    it('generates exactly 3 regions', () => {
      const world = generate(genesis('river-basin', 'increasing-drought', 'x'));
      expect(world.regions).toHaveLength(3);
    });

    it('generates exactly 5 species', () => {
      const world = generate(genesis('river-basin', 'increasing-drought', 'x'));
      expect(world.species).toHaveLength(5);
    });

    it('has 2 producers, 2 herbivores, and 1 predator', () => {
      const world = generate(genesis('river-basin', 'increasing-drought', 'x'));
      expect(world.species.filter(s => s.trophicRole === 'producer')).toHaveLength(2);
      expect(world.species.filter(s => s.trophicRole === 'herbivore')).toHaveLength(2);
      expect(world.species.filter(s => s.trophicRole === 'predator')).toHaveLength(1);
    });

    it('starts at era 0 with intervention unused', () => {
      const world = generate(genesis('river-basin', 'increasing-drought', 'x'));
      expect(world.era).toBe(0);
      expect(world.interventionUsed).toBe(false);
    });

    it('reflects the genesis config in the world', () => {
      const cfg = genesis('volcanic-island', 'cooling-climate', 'my-world');
      const world = generate(cfg);
      expect(world.genesisConfig).toEqual(cfg);
    });

    it('linear region topology: first and last have 1 neighbor, middle has 2', () => {
      const world = generate(genesis('river-basin', 'increasing-drought', 'topology-test'));
      expect(world.regions[0]!.neighborIds).toHaveLength(1);
      expect(world.regions[1]!.neighborIds).toHaveLength(2);
      expect(world.regions[2]!.neighborIds).toHaveLength(1);
    });

    it('neighbor references are symmetric', () => {
      const world = generate(genesis('highland-valley', 'cooling-climate', 'sym-test'));
      const regionIdSet = new Set(world.regions.map(r => r.id));
      for (const region of world.regions) {
        for (const nid of region.neighborIds) {
          expect(regionIdSet.has(nid)).toBe(true);
          const neighbor = world.regions.find(r => r.id === nid)!;
          expect(neighbor.neighborIds).toContain(region.id);
        }
      }
    });
  });

  describe('species placement', () => {
    it('all extant species have positive total population', () => {
      const world = generate(genesis('river-basin', 'increasing-drought', 'pop-test'));
      for (const sp of world.species.filter(s => s.status === 'extant')) {
        const total = Object.values(sp.populations).reduce<number>((s, p) => s + (p ?? 0), 0);
        expect(total).toBeGreaterThan(0);
      }
    });

    it('herbivores are co-located with their food source', () => {
      const world = generate(genesis('river-basin', 'increasing-drought', 'coloc-test'));
      for (const herbivore of world.species.filter(s => s.trophicRole === 'herbivore')) {
        const foodId = herbivore.dietIds[0]!;
        const food = world.species.find(s => s.id === foodId)!;
        const herbRegions = Object.keys(herbivore.populations).filter(r => (herbivore.populations[r] ?? 0) > 0);
        for (const rid of herbRegions) {
          const foodPop = food.populations[rid] ?? 0;
          expect(foodPop).toBeGreaterThan(0);
        }
      }
    });

    it('predator is co-located with its prey', () => {
      const world = generate(genesis('river-basin', 'increasing-drought', 'pred-test'));
      const predator = world.species.find(s => s.trophicRole === 'predator')!;
      const prey = world.species.find(s => s.id === predator.dietIds[0])!;
      const predRegions = Object.keys(predator.populations).filter(r => (predator.populations[r] ?? 0) > 0);
      for (const rid of predRegions) {
        const preyPop = prey.populations[rid] ?? 0;
        expect(preyPop).toBeGreaterThan(0);
      }
    });

    it('herbivores eat distinct producers', () => {
      const world = generate(genesis('river-basin', 'increasing-drought', 'diet-test'));
      const herbivores = world.species.filter(s => s.trophicRole === 'herbivore');
      const diets = herbivores.map(h => h.dietIds[0]);
      expect(new Set(diets).size).toBe(diets.length);
    });
  });

  describe('many-seed property test', () => {
    it('all combinations pass invariants across many seeds', () => {
      for (const seed of SEEDS) {
        for (const archetype of ARCHETYPES) {
          for (const pressure of PRESSURES) {
            const world = generate(genesis(archetype, pressure, seed));
            const violations = checkWorldInvariants(world);
            const genViolations = validateGeneratedWorld(world);
            expect(violations, `${archetype}+${pressure}+${seed} invariants`).toEqual([]);
            expect(genViolations, `${archetype}+${pressure}+${seed} generation`).toEqual([]);
          }
        }
      }
    });
  });

  describe('error handling', () => {
    it('throws for unknown world archetype', () => {
      expect(() => generate(genesis('unknown-archetype', 'increasing-drought', 'x'))).toThrow();
    });
  });
});
