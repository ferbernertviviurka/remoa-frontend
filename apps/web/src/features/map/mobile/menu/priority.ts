// F23 FR-17: card order for the phone list (urgency first) and the map summary the aside shows. Pure, no React.
import type { MapState, RetrievabilityMap } from '@remoa/contracts';

export const STATE_ORDER: readonly MapState[] = ['review', 'watch', 'steady', 'unknown'];

type Entry = RetrievabilityMap[string] | undefined;
const stateOf = (e: Entry): MapState => e?.state ?? 'unknown';

/** Revisitar, Acompanhar, Mais estável, Sem revisões; inside a state, the most overdue first (lowest `due`, then lowest recall). */
export function sortByPriority<T extends { id: string; title: string }>(cards: readonly T[], heat: RetrievabilityMap): T[] {
  const key = (c: T) => {
    const e = heat[c.id];
    return { s: STATE_ORDER.indexOf(stateOf(e)), due: e?.due ? e.due.getTime() : Infinity, r: e?.r ?? 1 };
  };
  return cards
    .map((c) => ({ c, k: key(c) }))
    .sort((a, b) => a.k.s - b.k.s || a.k.due - b.k.due || a.k.r - b.k.r || a.c.title.localeCompare(b.c.title, 'pt-BR'))
    .map((x) => x.c);
}

export type MapSummary = { average: number; counts: Record<MapState, number> };

/** Mean recall over cards that have one (0 when none) and the card count per state. */
export function summarize(cards: readonly { id: string }[], heat: RetrievabilityMap): MapSummary {
  const counts: Record<MapState, number> = { review: 0, watch: 0, steady: 0, unknown: 0 };
  let sum = 0;
  let n = 0;
  for (const c of cards) {
    const e = heat[c.id];
    counts[stateOf(e)]++;
    if (e) {
      sum += e.r;
      n++;
    }
  }
  return { average: n ? (sum / n) * 100 : 0, counts };
}
