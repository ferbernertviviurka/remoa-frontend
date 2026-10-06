import { CARD_SIZE_MAX, CARD_SIZE_MIN, type CardSize, type CardType } from '@remoa/contracts';
import { MAP_CARD_H, MAP_CARD_W } from '@remoa/ui';

const GRID = 8;
const fit = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v / GRID) * GRID));

/** Size the phone card draws: the saved one or the type default (F23 FR-5). */
export const mobileSizeOf = (card: { type: CardType; size: CardSize | null }): CardSize => card.size ?? { w: MAP_CARD_W, h: MAP_CARD_H[card.type] };

/** D-1207: `start` grown by the finger's (dx, dy) screen px at `zoom`, on the 8 px grid, within what the contract accepts. */
export const resizedBy = (start: CardSize, dx: number, dy: number, zoom: number): CardSize => ({
  w: fit(start.w + dx / zoom, CARD_SIZE_MIN.w, CARD_SIZE_MAX.w),
  h: fit(start.h + dy / zoom, CARD_SIZE_MIN.h, CARD_SIZE_MAX.h),
});
