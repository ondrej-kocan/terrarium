/**
 * Shared quantity allocation using the largest-remainder (Hamilton) method.
 * Each claimant gets its proportional floor; remaining units are given one
 * at a time to the largest fractional remainders, with ties broken by ID.
 */

export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

export function allocateSharedQuantity(
  total: number,
  claims: readonly { id: string; claim: number }[],
): Map<string, number> {
  const result = new Map<string, number>();

  if (claims.length === 0) return result;

  // Total = 0 → everyone gets 0
  if (total === 0) {
    for (const c of claims) result.set(c.id, 0);
    return result;
  }

  const totalClaim = claims.reduce((sum, c) => sum + c.claim, 0);

  // Zero-claim case: all claims are 0 → allocate equally (floor split, remainders by ID)
  if (totalClaim === 0) {
    const base = Math.floor(total / claims.length);
    let remainder = total - base * claims.length;
    // Sort by ID for stable allocation
    const sorted = [...claims].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    for (const c of sorted) {
      result.set(c.id, base + (remainder > 0 ? 1 : 0));
      if (remainder > 0) remainder--;
    }
    return result;
  }

  // Standard largest-remainder allocation
  const shares = claims.map(c => ({
    id: c.id,
    exact: (c.claim / totalClaim) * total,
    floor: Math.floor((c.claim / totalClaim) * total),
    fraction: ((c.claim / totalClaim) * total) % 1,
  }));

  const sumFloors = shares.reduce((s, x) => s + x.floor, 0);
  let remaining = Math.round(total - sumFloors);

  // Sort by descending fraction, then ascending ID for ties
  const sorted = [...shares].sort((a, b) => {
    if (b.fraction !== a.fraction) return b.fraction - a.fraction;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]!;
    result.set(item.id, item.floor + (i < remaining ? 1 : 0));
  }

  return result;
}
