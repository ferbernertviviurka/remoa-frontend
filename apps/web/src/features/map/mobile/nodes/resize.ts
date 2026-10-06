import { CARD_SIZE_MAX, CARD_SIZE_MIN, type Card, type CardSize, type CardType } from '@remoa/contracts';
import { MAP_CARD_H, MAP_CARD_W } from '@remoa/ui';
import type { ImageFrame } from '../../canvas/image-fit';

const GRID = 8;
/** Image slot of the phone card: 54 px tall, 11 px from each side, 7 px under the text. */
const IMAGE = { h: 54, padX: 22, gap: 7 };
const fit = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v / GRID) * GRID));

/** Size the phone card draws: the saved one, or the type default (F23 FR-5) plus room for a question image. */
export const mobileSizeOf = (card: { type: CardType; size: CardSize | null; frontAssetId?: string | null }): CardSize =>
  card.size ?? { w: MAP_CARD_W, h: MAP_CARD_H[card.type] + (card.type !== 'image' && card.frontAssetId ? IMAGE.h + IMAGE.gap : 0) };

/** D-1207: `start` grown by the finger's (dx, dy) screen px at `zoom`, on the 8 px grid, within what the contract accepts. */
export const resizedBy = (start: CardSize, dx: number, dy: number, zoom: number): CardSize => ({
  w: fit(start.w + dx / zoom, CARD_SIZE_MIN.w, CARD_SIZE_MAX.w),
  h: fit(start.h + dy / zoom, CARD_SIZE_MIN.h, CARD_SIZE_MAX.h),
});

/** D-1211: the phone card's image slot (MapCard), for `fitToImages`. */
export const mobileFrame = (c: Pick<Card, 'type'>): ImageFrame =>
  c.type === 'image'
    ? { padX: IMAGE.padX, chrome: MAP_CARD_H.image - IMAGE.h, minImage: IMAGE.h }
    : { padX: IMAGE.padX, chrome: MAP_CARD_H[c.type] + IMAGE.gap, minImage: IMAGE.h };
