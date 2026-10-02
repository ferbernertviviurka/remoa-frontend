import type { BoardSummary, CoverageRow, MatrixItem } from '@remoa/contracts';

export type GapGroup = { group: MatrixItem | null; topics: MatrixItem[] };

/** Topics of the area (groups are items with children) that no map is linked to, grouped by parent. */
export function computeGaps(items: MatrixItem[], rows: CoverageRow[]): GapGroup[] {
  const linked = new Set(rows.map((r) => r.matrixItemId));
  const byId = new Map(items.map((i) => [i.id, i]));
  const groups = new Map<string | null, MatrixItem[]>();
  for (const i of items) {
    if (items.some((c) => c.parentId === i.id) || linked.has(i.id)) continue;
    groups.set(i.parentId, [...(groups.get(i.parentId) ?? []), i]);
  }
  return [...groups].map(([pid, topics]) => ({ group: pid ? (byId.get(pid) ?? null) : null, topics }));
}

/** Empty state: the 3 topics with the highest target (stable, so catalog order breaks ties). */
export const suggestTopics = (items: MatrixItem[]): MatrixItem[] =>
  items.filter((i) => !items.some((c) => c.parentId === i.id)).sort((a, b) => b.targetCards - a.targetCards).slice(0, 3);

/** Weakest coverage first, so the next action is the top row. */
export const sortWeakestFirst = (rows: CoverageRow[]): CoverageRow[] => [...rows].sort((a, b) => a.coverage - b.coverage);

/** Maps that can be linked: live and not yet linked to any topic (a board has one topic; ponytail: no "move" flow). */
export const linkableBoards = (boards: BoardSummary[]): BoardSummary[] => boards.filter((b) => b.matrixItemId === null);

export const boardsOfItem = (boards: BoardSummary[], itemId: string): BoardSummary[] => boards.filter((b) => b.matrixItemId === itemId);

export type TopicState = 'gap' | 'partial' | 'covered';
export type TopicEntry = { item: MatrixItem; row: CoverageRow | null; state: TopicState };
export type TopicGroup = { group: MatrixItem | null; topics: TopicEntry[]; pct: number };

/** No map linked = gap; linked but below the target = partial; at or above the target = covered. */
export const topicState = (row: CoverageRow | null): TopicState => (!row ? 'gap' : row.coverage >= 100 ? 'covered' : 'partial');

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Topics of the area grouped by parent. Unlinked topics count 0 in the group mean (same rule as the overall catalog %); the mean ignores filter and search. */
export function buildGroups(items: MatrixItem[], rows: CoverageRow[], filter: TopicState | 'all', query: string): TopicGroup[] {
  const byRow = new Map(rows.map((r) => [r.matrixItemId, r]));
  const byId = new Map(items.map((i) => [i.id, i]));
  const q = norm(query.trim());
  const all = new Map<string | null, TopicEntry[]>();
  for (const item of items) {
    if (items.some((c) => c.parentId === item.id)) continue;
    const row = byRow.get(item.id) ?? null;
    all.set(item.parentId, [...(all.get(item.parentId) ?? []), { item, row, state: topicState(row) }]);
  }
  return [...all].flatMap(([pid, entries]) => {
    const topics = entries
      .filter((e) => (filter === 'all' || e.state === filter) && (!q || norm(e.item.title).includes(q)))
      .sort((a, b) => (a.row?.coverage ?? 0) - (b.row?.coverage ?? 0));
    const pct = entries.reduce((n, e) => n + (e.row?.coverage ?? 0), 0) / entries.length;
    return topics.length ? [{ group: pid ? (byId.get(pid) ?? null) : null, topics, pct }] : [];
  });
}

export function countStates(items: MatrixItem[], rows: CoverageRow[]): Record<TopicState, number> {
  const byRow = new Map(rows.map((r) => [r.matrixItemId, r]));
  const out = { gap: 0, partial: 0, covered: 0 };
  for (const i of items) if (!items.some((c) => c.parentId === i.id)) out[topicState(byRow.get(i.id) ?? null)]++;
  return out;
}
