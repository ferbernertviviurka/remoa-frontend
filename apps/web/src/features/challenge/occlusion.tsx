import type { ChallengeItemPublic } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Skeleton } from '@remoa/ui';
import { MaskOverlay } from '@/features/cards/mask-editor';
import { useAsset } from '@/features/cards/upload';

const t = withStrings({ challenge: more.challenge });

/** occlusion: the image with every mask polygon (labels are answers: the server sends polygons only). */
export function Occlusion({ image }: { image: NonNullable<ChallengeItemPublic['context']['image']> }) {
  const asset = useAsset(image.assetId);
  const masks = image.masks.map((m) => ({ ...m, label: '' }));
  return (
    <div className="relative overflow-hidden rounded-map border border-border bg-canvas">
      {asset ? <img src={asset.urls.w800} alt={t('challenge.imageAlt')} className="block w-full" /> : <div className="p-6" role="status"><Skeleton lines={3} /></div>}
      {asset ? <MaskOverlay masks={masks} selected={image.maskId} /> : null}
    </div>
  );
}
