import { describe, expect, it } from 'vitest';
import { allocateSharedQuantity, roundHalfUp } from './allocation';

describe('roundHalfUp', () => {
  it('rounds 0.5 up', () => {
    expect(roundHalfUp(0.5)).toBe(1);
  });

  it('rounds 1.5 up', () => {
    expect(roundHalfUp(1.5)).toBe(2);
  });

  it('floors values below .5', () => {
    expect(roundHalfUp(1.4)).toBe(1);
    expect(roundHalfUp(1.49)).toBe(1);
  });

  it('rounds integers unchanged', () => {
    expect(roundHalfUp(3)).toBe(3);
    expect(roundHalfUp(0)).toBe(0);
  });

  it('handles negative values correctly', () => {
    // Math.floor(-0.5 + 0.5) = Math.floor(0) = 0
    expect(roundHalfUp(-0.5)).toBe(0);
  });
});

describe('allocateSharedQuantity', () => {
  it('returns empty map for empty claims', () => {
    const result = allocateSharedQuantity(100, []);
    expect(result.size).toBe(0);
  });

  it('returns zero for everyone when total is 0', () => {
    const result = allocateSharedQuantity(0, [
      { id: 'a', claim: 10 },
      { id: 'b', claim: 20 },
    ]);
    expect(result.get('a')).toBe(0);
    expect(result.get('b')).toBe(0);
  });

  it('allocates equally when all claims are zero', () => {
    const result = allocateSharedQuantity(10, [
      { id: 'a', claim: 0 },
      { id: 'b', claim: 0 },
      { id: 'c', claim: 0 },
    ]);
    // 10 / 3 = 3 each, 1 remainder goes to first by ID
    expect(result.get('a')).toBe(4); // 'a' gets the remainder
    expect(result.get('b')).toBe(3);
    expect(result.get('c')).toBe(3);
    expect((result.get('a') ?? 0) + (result.get('b') ?? 0) + (result.get('c') ?? 0)).toBe(10);
  });

  it('allocates equally when all claims are zero — ID order determines remainder', () => {
    const result = allocateSharedQuantity(7, [
      { id: 'z', claim: 0 },
      { id: 'a', claim: 0 },
    ]);
    // 7 / 2 = 3 each, 1 remainder goes to 'a' (alphabetically first)
    expect(result.get('a')).toBe(4);
    expect(result.get('z')).toBe(3);
  });

  it('single claimant gets everything', () => {
    const result = allocateSharedQuantity(50, [{ id: 'solo', claim: 10 }]);
    expect(result.get('solo')).toBe(50);
  });

  it('proportional allocation — basic two-way split', () => {
    const result = allocateSharedQuantity(100, [
      { id: 'a', claim: 1 },
      { id: 'b', claim: 3 },
    ]);
    // a gets 25, b gets 75
    expect(result.get('a')).toBe(25);
    expect(result.get('b')).toBe(75);
  });

  it('largest-remainder handles fractional remainder correctly', () => {
    // 10 total, claims: a=1, b=1, c=1 → each gets 3.33...
    // floors: a=3, b=3, c=3 → sum=9, 1 remainder → goes to a (or first by fraction tie)
    const result = allocateSharedQuantity(10, [
      { id: 'a', claim: 1 },
      { id: 'b', claim: 1 },
      { id: 'c', claim: 1 },
    ]);
    const total = (result.get('a') ?? 0) + (result.get('b') ?? 0) + (result.get('c') ?? 0);
    expect(total).toBe(10);
    // Each should get at least 3
    expect(result.get('a')).toBeGreaterThanOrEqual(3);
    expect(result.get('b')).toBeGreaterThanOrEqual(3);
    expect(result.get('c')).toBeGreaterThanOrEqual(3);
  });

  it('remainder goes to largest fraction first, then by ID for ties', () => {
    // Claims: a=2, b=2, c=6 → total claim=10 → out of 10
    // exact: a=2, b=2, c=6 → no remainder
    const result = allocateSharedQuantity(10, [
      { id: 'a', claim: 2 },
      { id: 'b', claim: 2 },
      { id: 'c', claim: 6 },
    ]);
    expect(result.get('a')).toBe(2);
    expect(result.get('b')).toBe(2);
    expect(result.get('c')).toBe(6);
  });

  it('total sum of allocations equals total', () => {
    const claims = [
      { id: 'x', claim: 7 },
      { id: 'y', claim: 3 },
      { id: 'z', claim: 11 },
    ];
    for (let total = 1; total <= 30; total++) {
      const result = allocateSharedQuantity(total, claims);
      const sum = [...result.values()].reduce((s, v) => s + v, 0);
      expect(sum).toBe(total);
    }
  });

  it('allocations are non-negative', () => {
    const result = allocateSharedQuantity(5, [
      { id: 'a', claim: 100 },
      { id: 'b', claim: 1 },
    ]);
    expect(result.get('a')).toBeGreaterThanOrEqual(0);
    expect(result.get('b')).toBeGreaterThanOrEqual(0);
  });

  it('ties in fractional remainder broken by ascending ID', () => {
    // 2 total, 3 equal claims → each should get floor(0.667) = 0, 2 remainders
    // → 2 of the 3 get 1, broken by ID: 'a' and 'b' get 1, 'c' gets 0
    const result = allocateSharedQuantity(2, [
      { id: 'c', claim: 1 },
      { id: 'a', claim: 1 },
      { id: 'b', claim: 1 },
    ]);
    expect(result.get('a')).toBe(1);
    expect(result.get('b')).toBe(1);
    expect(result.get('c')).toBe(0);
  });
});
