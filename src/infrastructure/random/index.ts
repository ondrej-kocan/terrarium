// djb2 string hash — deterministic across platforms.
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

// Mulberry32 PRNG — fast, single 32-bit state, good statistical properties.
function mulberry32(seed: number): () => number {
  let s = seed;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  };
}

// SeededRandom is the only permitted source of randomness in generation.
// Era simulation uses zero random rolls — all seeded variation is in generation only.
export class SeededRandom {
  private readonly _next: () => number;

  constructor(readonly seed: string) {
    this._next = mulberry32(hashString(seed));
  }

  // Derives a new independent stream for a named purpose.
  // Example keys: 'generation:regions', 'generation:species', 'generation:names'
  derive(key: string): SeededRandom {
    return new SeededRandom(`${this.seed}:${key}`);
  }

  // Returns a float in [0, 1).
  nextFloat(): number {
    return this._next();
  }

  // Returns an integer in [min, max] inclusive.
  nextInt(min: number, max: number): number {
    if (min > max) throw new RangeError(`nextInt: min (${min}) > max (${max})`);
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  // Returns a random element from a non-empty readonly array.
  nextItem<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('nextItem: array is empty');
    const index = this.nextInt(0, items.length - 1);
    return items[index] as T;
  }

  // Returns true with the given probability in [0, 1].
  nextBoolean(probability = 0.5): boolean {
    return this.nextFloat() < probability;
  }

  // Fisher-Yates shuffle — returns a new array, does not mutate the input.
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const tmp = result[i] as T;
      result[i] = result[j] as T;
      result[j] = tmp;
    }
    return result;
  }
}
