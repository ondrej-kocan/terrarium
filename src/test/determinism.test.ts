// Determinism contract: identical seed + key always produces identical output.
// This suite proves the guarantee holds across restarts and across derived streams.
import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/infrastructure/random';

function collectSequence(rng: SeededRandom, count: number): number[] {
  return Array.from({ length: count }, () => rng.nextFloat());
}

describe('Determinism contract', () => {
  it('same seed → identical float sequence', () => {
    expect(collectSequence(new SeededRandom('world-abc-era-0'), 200))
      .toEqual(collectSequence(new SeededRandom('world-abc-era-0'), 200));
  });

  it('same seed → identical integer sequence', () => {
    const a = new SeededRandom('int-seed');
    const b = new SeededRandom('int-seed');
    const seq = Array.from({ length: 200 }, () => a.nextInt(0, 10));
    expect(seq).toEqual(Array.from({ length: 200 }, () => b.nextInt(0, 10)));
  });

  it('same seed → identical shuffle', () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);
    expect(new SeededRandom('shuf').shuffle(arr))
      .toEqual(new SeededRandom('shuf').shuffle(arr));
  });

  it('derived streams are deterministic and independent of each other', () => {
    const root = 'genesis-seed';
    const keys = ['generation:regions', 'generation:species', 'generation:names'];

    // Each key produces the same sequence regardless of which instance derives it.
    for (const key of keys) {
      const s1 = new SeededRandom(root).derive(key);
      const s2 = new SeededRandom(root).derive(key);
      expect(collectSequence(s1, 50)).toEqual(collectSequence(s2, 50));
    }

    // All keys produce different sequences from each other.
    const sequences = keys.map(k => collectSequence(new SeededRandom(root).derive(k), 50));
    for (let i = 0; i < sequences.length; i++) {
      for (let j = i + 1; j < sequences.length; j++) {
        expect(sequences[i]).not.toEqual(sequences[j]);
      }
    }
  });

  it('era-namespaced streams are independent across eras', () => {
    const root = 'sim-seed';
    const era3 = new SeededRandom(root).derive('simulation:era:3:migration');
    const era4 = new SeededRandom(root).derive('simulation:era:4:migration');
    const era3again = new SeededRandom(root).derive('simulation:era:3:migration');

    expect(collectSequence(era3, 30)).toEqual(collectSequence(era3again, 30));
    expect(collectSequence(new SeededRandom(root).derive('simulation:era:3:migration'), 30))
      .not.toEqual(collectSequence(era4, 30));
  });

  it('different genesis seeds produce different worlds (no hash collision for common seeds)', () => {
    const seeds = ['river-basin-1', 'volcanic-island-1', 'highland-valley-1', 'abc', '123', 'test'];
    const sequences = seeds.map(s => collectSequence(new SeededRandom(s), 10));
    const unique = new Set(sequences.map(s => JSON.stringify(s)));
    expect(unique.size).toBe(seeds.length);
  });
});
