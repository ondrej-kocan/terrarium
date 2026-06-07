import type { SeededRandom } from '@/infrastructure/random';
import type { NamingVocabulary } from '../types';

function pickUnique(pool: readonly string[], count: number, rng: SeededRandom): string[] {
  const shuffled = rng.shuffle([...pool]);
  return shuffled.slice(0, count);
}

export type GeneratedNames = {
  readonly plantNames: readonly string[];
  readonly animalNames: readonly string[];
};

export function generateSpeciesNames(
  vocabulary: NamingVocabulary,
  plantCount: number,
  animalCount: number,
  rng: SeededRandom,
): GeneratedNames {
  const plantDescriptors = pickUnique(vocabulary.descriptors, plantCount, rng.derive('plant-descriptors'));
  const plantNouns = pickUnique(vocabulary.plantNouns, plantCount, rng.derive('plant-nouns'));

  const animalDescriptors = pickUnique(vocabulary.descriptors, animalCount, rng.derive('animal-descriptors'));
  const animalNouns = pickUnique(vocabulary.animalNouns, animalCount, rng.derive('animal-nouns'));

  return {
    plantNames: plantDescriptors.map((d, i) => `${d} ${plantNouns[i]}`),
    animalNames: animalDescriptors.map((d, i) => `${d} ${animalNouns[i]}`),
  };
}
