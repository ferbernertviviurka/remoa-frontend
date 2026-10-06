import { CARD_SIZE_MAX, type Card, type CardSize } from '@remoa/contracts';
import { nodeSize } from '@remoa/ui';

const GRID = 8;
const MAX_IMAGE_H = 400;

/** Where a card draws its image: side padding, height of everything that is not the image, smallest image slot. */
export type ImageFrame = { padX: number; chrome: number; minImage: number };
type Dims = { width: number; height: number };
type CardImages = Pick<Card, 'type' | 'frontAssetId' | 'backAssetId' | 'preview'>;

/** Image assets a card shows: the image card's picture, the question image and (desktop, on the back) the answer image. */
export const imageIdsOf = (c: CardImages, back = true): string[] =>
  [c.type === 'image' ? c.preview?.assetId : null, c.frontAssetId, back ? c.backAssetId : null].filter((x): x is string => !!x);

/** D-1211: an image the card did not have before this save (a new upload or a swap). */
export const hasNewImage = (before: CardImages | undefined, after: CardImages, back = true): boolean => {
  const old = new Set(before ? imageIdsOf(before, back) : []);
  return imageIdsOf(after, back).some((id) => !old.has(id));
};

/**
 * D-1211: the size that shows every image whole at its own aspect ratio, keeping the card's width (8 px grid, within the
 * contract's maximum). `null` = the card is already tall enough.
 */
export function fitToImages(cur: CardSize, images: Dims[], f: ImageFrame): CardSize | null {
  const valid = images.filter((i) => i.width > 0 && i.height > 0);
  if (!valid.length) return null;
  const inner = cur.w - f.padX;
  const imageH = Math.max(...valid.map((i) => Math.min(MAX_IMAGE_H, Math.max(f.minImage, (inner * i.height) / i.width))));
  const h = Math.min(CARD_SIZE_MAX.h, Math.ceil((f.chrome + imageH) / GRID) * GRID);
  return h > cur.h ? { w: cur.w, h } : null;
}

/** Desktop NodeCard: 17.5 px padding each side; the image card's slot is 84 px of its 206; other types add the image under the text. */
export const desktopFrame = (c: Pick<Card, 'type' | 'shape'>): ImageFrame =>
  c.type === 'image'
    ? { padX: 35, chrome: nodeSize('image').h - 84, minImage: 84 }
    : { padX: 35, chrome: nodeSize(c.type, c.shape).h + 6, minImage: 84 };
