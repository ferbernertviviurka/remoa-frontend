import type { BoardSummary, Entitlements } from '@remoa/contracts';

/** F14 FR-11: local to the home feature (D-112). */
export type MapSlide =
  | { kind: 'map'; board: BoardSummary }
  | { kind: 'new'; remaining: number | null }
  | { kind: 'locked'; max: number };

/** FR-17: due today first (more due first), then last access; `new` and `locked` always last. */
export function buildMapSlides({ maps, entitlements }: { maps: BoardSummary[]; entitlements: Entitlements | null }): MapSlide[] {
  const sorted = [...maps].sort((a, b) => (b.dueCount > 0 ? 1 : 0) - (a.dueCount > 0 ? 1 : 0) || b.dueCount - a.dueCount || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const slides: MapSlide[] = sorted.map((board) => ({ kind: 'map', board }));
  const max = entitlements?.limits.boards ?? null; // null = unlimited (Pro); also the fallback while entitlements are unknown
  if (max === null) {
    if (maps.length < 3) slides.push({ kind: 'new', remaining: null });
    return slides;
  }
  if (maps.length < max) slides.push({ kind: 'new', remaining: max - maps.length });
  slides.push({ kind: 'locked', max });
  return slides;
}

/** FR-20: Free at the limit. */
export const atBoardLimit = (count: number, entitlements: Entitlements | null) => {
  const max = entitlements?.limits.boards ?? null;
  return max !== null && count >= max;
};
