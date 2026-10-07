import { strings } from '@remoa/strings/landing';
import type { PublicSeed } from '@/features/library/public-seeds';

export type EnamedTone = 'cm' | 'sc' | 'mfc' | 'ped';
export type EnamedSlide = {
  slug: string;
  title: string;
  blurb: string;
  areaLabel: string;
  tone: EnamedTone;
};

const catalog = strings.landing.enamed.themes;

const areaLabelOf = (code: string) => {
  const areas = strings.landing.enamed.areas;
  return code in areas ? areas[code as keyof typeof areas] : code;
};

export const toneOf = (label: string): EnamedTone => {
  if (label.includes('Pediatria')) return 'ped';
  if (label.includes('Família')) return 'mfc';
  if (label.includes('Coletiva') || label.includes('Preventiva')) return 'sc';
  return 'cm';
};

/** Slides follow published top-10 maps, in the catalog order. Nothing is invented when a map is not published. */
export function enamedSlides(seeds: readonly Pick<PublicSeed, 'title' | 'slug' | 'badges' | 'area' | 'topicArea'>[]): EnamedSlide[] {
  const published = new Map(
    seeds.filter((s) => s.slug && s.badges.includes('top10_enamed')).map((s) => [s.title.trim().toLowerCase(), s]),
  );
  return catalog.flatMap((item) => {
    const seed = published.get(item.title.trim().toLowerCase());
    if (!seed?.slug) return [];
    const areaLabel = seed.topicArea?.trim() || areaLabelOf(seed.area);
    return [{ slug: seed.slug, title: seed.title, blurb: item.blurb, areaLabel, tone: toneOf(areaLabel) }];
  });
}
