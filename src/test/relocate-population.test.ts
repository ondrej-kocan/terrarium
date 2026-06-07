import { describe, it, expect } from 'vitest';
import { handleRelocatePopulation } from '@/application/relocate-population';
import { buildValidWorld, REGION_A, REGION_B, REGION_C, HERBIVORE_1, HERBIVORE_2 } from './fixtures/world';
import { worldId, speciesId, regionId } from '@/domain/world/types';
import type { RelocatePopulationCommand } from '@/domain/commands/types';

function makeCommand(overrides: Partial<RelocatePopulationCommand> = {}): RelocatePopulationCommand {
  return {
    type: 'RelocatePopulation',
    worldId: worldId('test-world'),
    speciesId: HERBIVORE_1,
    fromRegionId: REGION_A,
    toRegionId: REGION_B,
    amount: 10,
    ...overrides,
  };
}

describe('handleRelocatePopulation', () => {
  it('valid relocation succeeds and moves population correctly', () => {
    const world = buildValidWorld();
    const command = makeCommand({ amount: 10 });
    const result = handleRelocatePopulation(command, world);

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Source population decreased
    const sp = result.world.species.find(s => (s.id as string) === (HERBIVORE_1 as string))!;
    const sourcePop = (sp.populations as Record<string, number>)[REGION_A as string] ?? 0;
    const destPop = (sp.populations as Record<string, number>)[REGION_B as string] ?? 0;

    expect(sourcePop).toBe(30 - 10); // default herbivore pop is 30
    expect(destPop).toBe(10); // previously no population in B

    // interventionUsed should be true
    expect(result.world.interventionUsed).toBe(true);

    // One event emitted
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.type).toBe('population_relocated');
  });

  it('rejects when interventionUsed is true', () => {
    const world = buildValidWorld({ interventionUsed: true });
    const command = makeCommand();
    const result = handleRelocatePopulation(command, world);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reasons).toContain('Intervention already used');
  });

  it('rejects when species is extinct', () => {
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        (s.id as string) === (HERBIVORE_1 as string)
          ? { ...s, status: 'extinct' as const, extinctionEra: 1, populations: {} }
          : s,
      ),
    });
    const command = makeCommand();
    const result = handleRelocatePopulation(command, world);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reasons).toContain('Species is extinct');
  });

  it('rejects when amount exceeds source population', () => {
    const world = buildValidWorld();
    const command = makeCommand({ amount: 999 });
    const result = handleRelocatePopulation(command, world);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reasons).toContain('Amount exceeds available population');
  });

  it('rejects when regions are not connected', () => {
    // In the test world: A-B-C linear topology, so A and C are not connected
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        (s.id as string) === (HERBIVORE_1 as string)
          ? { ...s, populations: { [REGION_A as string]: 30, [REGION_C as string]: 10 } }
          : s,
      ),
    });
    const command = makeCommand({
      fromRegionId: REGION_A,
      toRegionId: REGION_C, // not a neighbor of A
    });
    const result = handleRelocatePopulation(command, world);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reasons).toContain('Regions are not connected');
  });

  it('rejects when no population in source region', () => {
    const world = buildValidWorld();
    // HERBIVORE_2 is in REGION_B, not REGION_A
    const command = makeCommand({
      speciesId: HERBIVORE_2,
      fromRegionId: REGION_A, // HERBIVORE_2 has no population here
      toRegionId: REGION_B,
    });
    const result = handleRelocatePopulation(command, world);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reasons).toContain('No population in source region');
  });

  it('rejects when amount is less than 1', () => {
    const world = buildValidWorld();
    const command = makeCommand({ amount: 0 });
    const result = handleRelocatePopulation(command, world);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reasons).toContain('Amount must be at least 1');
  });

  it('rejects when source and destination are the same region', () => {
    const world = buildValidWorld();
    const command = makeCommand({ fromRegionId: REGION_A, toRegionId: REGION_A });
    const result = handleRelocatePopulation(command, world);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reasons).toContain('Source and destination are the same region');
  });

  it('adds to existing destination population', () => {
    // Give HERBIVORE_1 populations in both A and B
    const world = buildValidWorld({
      species: buildValidWorld().species.map(s =>
        (s.id as string) === (HERBIVORE_1 as string)
          ? { ...s, populations: { [REGION_A as string]: 30, [REGION_B as string]: 5 } }
          : s,
      ),
    });
    const command = makeCommand({ amount: 10 });
    const result = handleRelocatePopulation(command, world);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const sp = result.world.species.find(s => (s.id as string) === (HERBIVORE_1 as string))!;
    expect((sp.populations as Record<string, number>)[REGION_A as string]).toBe(20);
    expect((sp.populations as Record<string, number>)[REGION_B as string]).toBe(15);
  });
});
