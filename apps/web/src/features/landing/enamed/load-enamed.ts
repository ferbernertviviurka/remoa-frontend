import { getPublicSeeds } from '@/features/library/public-api';
import { enamedSlides, type EnamedSlide } from './slides';

export async function loadEnamedSlides(): Promise<EnamedSlide[]> {
  try {
    return enamedSlides(await getPublicSeeds());
  } catch {
    return [];
  }
}
