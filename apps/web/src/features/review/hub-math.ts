import type { QueueItem, ReviewHub } from '@remoa/contracts';

export type Reason = QueueItem['reason'];
export type Chips = Record<Reason, boolean>;
export const DEFAULT_CHIPS: Chips = { due: true, new: true, weak: false }; // Q-071: "em atenção" starts off

type HubItem = ReviewHub['queue']['items'][number];

/** Same rule as the server (`filter`): keep the items of the chosen boards, take the first `newRemaining` of the `new` ones (null = unlimited: take all). No request. */
export function selectByBoards(items: ReadonlyArray<HubItem>, boardIds: ReadonlySet<string>, newRemaining: number | null): HubItem[] {
  let fresh = 0;
  return items.filter((i) => boardIds.has(i.boardId) && (i.reason !== 'new' || newRemaining === null || fresh++ < newRemaining));
}

export const countReasons = (items: ReadonlyArray<HubItem>): Record<Reason, number> => ({
  due: items.filter((i) => i.reason === 'due').length,
  new: items.filter((i) => i.reason === 'new').length,
  weak: items.filter((i) => i.reason === 'weak').length,
});

/** Queue after maps and chips: counts per reason (what the chips show), the size of the session and the minutes. */
export function computeQueue(hub: ReviewHub, boardIds: ReadonlySet<string>, chips: Chips) {
  const picked = selectByBoards(hub.queue.items, boardIds, hub.queue.newRemaining);
  const counts = countReasons(picked);
  const size = (chips.due ? counts.due : 0) + (chips.new ? counts.new : 0) + (chips.weak ? counts.weak : 0);
  const minutes = Math.max(1, Math.round((size * hub.queue.secondsPerCard) / 60));
  const firstDue = hub.maps.filter((m) => boardIds.has(m.boardId) && m.due > 0).sort((a, b) => b.due - a.due)[0];
  return { counts, size, minutes, firstDue };
}

/** FR-13: weakest first; areas without cards go last. */
export const sortAreas = (areas: ReviewHub['areas']) =>
  [...areas].sort((a, b) => {
    if ((a.cards > 0) !== (b.cards > 0)) return a.cards > 0 ? -1 : 1;
    return (a.accuracy ?? 1) - (b.accuracy ?? 1);
  });
