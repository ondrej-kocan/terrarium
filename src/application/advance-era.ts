import type { AdvanceEraCommand, CommandResult } from '@/domain/commands/types';
import type { World } from '@/domain/world/types';
import { advanceEra } from '@/domain/simulation/pipeline';

export function handleAdvanceEra(command: AdvanceEraCommand, world: World): CommandResult {
  if (world.era !== command.expectedEra) {
    return {
      success: false,
      reasons: [`Expected era ${command.expectedEra} but world is at era ${world.era}`],
    };
  }

  const result = advanceEra(world);
  return { success: true, world: result.world, events: result.events };
}
