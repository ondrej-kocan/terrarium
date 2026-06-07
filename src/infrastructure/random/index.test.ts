import { describe, expect, it } from 'vitest';
import { SeededRandom } from './index';

describe('SeededRandom', () => {
  describe('determinism', () => {
    it('produces the same sequence from the same seed', () => {
      const a = new SeededRandom('hello');
      const b = new SeededRandom('hello');
      for (let i = 0; i < 100; i++) {
        expect(a.nextFloat()).toBe(b.nextFloat());
      }
    });

    it('produces different sequences from different seeds', () => {
      const a = new SeededRandom('seed-a');
      const b = new SeededRandom('seed-b');
      const resultsA = Array.from({ length: 20 }, () => a.nextFloat());
      const resultsB = Array.from({ length: 20 }, () => b.nextFloat());
      expect(resultsA).not.toEqual(resultsB);
    });

    it('instances with the same seed are independent — advancing one does not affect the other', () => {
      const a = new SeededRandom('shared');
      const b = new SeededRandom('shared');
      a.nextFloat(); // advance a
      a.nextFloat();
      // b is unaffected; its step-0 value must match a fresh instance's step-0 value
      const reference = new SeededRandom('shared');
      expect(b.nextFloat()).toBe(reference.nextFloat());
      expect(b.nextFloat()).toBe(reference.nextFloat());
    });
  });

  describe('derived streams', () => {
    it('produce the same sequence for the same key', () => {
      const a = new SeededRandom('base').derive('generation:regions');
      const b = new SeededRandom('base').derive('generation:regions');
      for (let i = 0; i < 50; i++) {
        expect(a.nextFloat()).toBe(b.nextFloat());
      }
    });

    it('produce different sequences for different keys', () => {
      const base = new SeededRandom('base');
      const regions = base.derive('generation:regions');
      const species = base.derive('generation:species');
      expect(regions.nextFloat()).not.toBe(species.nextFloat());
    });

    it('are independent of the parent stream state', () => {
      const parent1 = new SeededRandom('root');
      parent1.nextFloat(); // advance parent before deriving
      const child1 = parent1.derive('stream');

      const parent2 = new SeededRandom('root');
      // do NOT advance parent2
      const child2 = parent2.derive('stream');

      // Both derived streams should be identical regardless of parent state.
      for (let i = 0; i < 20; i++) {
        expect(child1.nextFloat()).toBe(child2.nextFloat());
      }
    });

    it('support era-namespaced keys', () => {
      const a = new SeededRandom('world-1').derive('simulation:era:3:migration');
      const b = new SeededRandom('world-1').derive('simulation:era:3:migration');
      const c = new SeededRandom('world-1').derive('simulation:era:4:migration');
      expect(a.nextFloat()).toBe(b.nextFloat());
      expect(a.nextFloat()).not.toBe(c.nextFloat());
    });
  });

  describe('nextInt', () => {
    it('always returns a value within [min, max]', () => {
      const rng = new SeededRandom('bounds');
      for (let i = 0; i < 1000; i++) {
        const v = rng.nextInt(3, 8);
        expect(v).toBeGreaterThanOrEqual(3);
        expect(v).toBeLessThanOrEqual(8);
        expect(Number.isInteger(v)).toBe(true);
      }
    });

    it('can return the boundary values', () => {
      const rng = new SeededRandom('boundaries');
      const values = new Set<number>();
      for (let i = 0; i < 10000; i++) {
        values.add(rng.nextInt(0, 5));
      }
      expect(values.has(0)).toBe(true);
      expect(values.has(5)).toBe(true);
    });

    it('throws when min > max', () => {
      const rng = new SeededRandom('err');
      expect(() => rng.nextInt(10, 5)).toThrow(RangeError);
    });

    it('works for a single-value range', () => {
      const rng = new SeededRandom('single');
      for (let i = 0; i < 10; i++) {
        expect(rng.nextInt(7, 7)).toBe(7);
      }
    });
  });

  describe('nextItem', () => {
    it('returns elements from the array', () => {
      const rng = new SeededRandom('items');
      const arr = ['a', 'b', 'c', 'd'] as const;
      for (let i = 0; i < 100; i++) {
        expect(arr).toContain(rng.nextItem(arr));
      }
    });

    it('throws on an empty array', () => {
      const rng = new SeededRandom('empty');
      expect(() => rng.nextItem([])).toThrow(RangeError);
    });
  });

  describe('shuffle', () => {
    it('returns an array of the same length with the same elements', () => {
      const rng = new SeededRandom('shuffle');
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(original);
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual([...original].sort());
    });

    it('does not mutate the input array', () => {
      const rng = new SeededRandom('immutable');
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      rng.shuffle(original);
      expect(original).toEqual(copy);
    });

    it('produces the same shuffle from the same seed', () => {
      const arr = [10, 20, 30, 40, 50];
      const a = new SeededRandom('same').shuffle(arr);
      const b = new SeededRandom('same').shuffle(arr);
      expect(a).toEqual(b);
    });
  });

  describe('nextFloat distribution', () => {
    it('produces values in [0, 1)', () => {
      const rng = new SeededRandom('range');
      for (let i = 0; i < 10000; i++) {
        const v = rng.nextFloat();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });
});
