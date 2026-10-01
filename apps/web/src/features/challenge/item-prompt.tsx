import { caseStages, type ChallengeItemPublic } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Skeleton, Tag } from '@remoa/ui';
import { MaskOverlay } from '@/features/cards/mask-editor';
import { useAsset } from '@/features/cards/upload';

function Occlusion({ image }: { image: NonNullable<ChallengeItemPublic['context']['image']> }) {
  const asset = useAsset(image.assetId);
  const masks = image.masks.map((m) => ({ ...m, label: '' }));
  return (
    <div className="relative overflow-hidden rounded-map border border-border bg-canvas">
      {asset ? <img src={asset.urls.w1600} srcSet={`${asset.urls.w800} 800w, ${asset.urls.w1600} 1600w`} sizes="(min-width: 1024px) 640px, 100vw" alt={t('challenge.imageAlt')} className="block w-full" /> : <div className="p-6" role="status"><Skeleton lines={4} /></div>}
      {asset ? <MaskOverlay masks={masks} selected={image.maskId} /> : null}
    </div>
  );
}

/** What is asked, per mode. Never shows the answer: the server already left it out. */
export function ItemPrompt({ item, headingRef }: { item: ChallengeItemPublic; headingRef: React.Ref<HTMLHeadingElement> }) {
  const { mode, context: c } = item;
  const ask =
    mode === 'next_step'
      ? t('challenge.nextStepAsk')
      : mode === 'case' && c.stage
        ? t('challenge.stageAsk', { stage: t(`cards.case.stage.${c.stage}`) })
        : mode === 'edge' && c.edge
          ? t('challenge.edgeAsk', { from: c.edge.fromTitle, to: c.edge.toTitle })
          : null;
  const main = ask && mode === 'edge' ? ask : item.prompt;
  return (
    <div className="flex flex-col gap-4">
      <h2 ref={headingRef} tabIndex={-1} className="font-display text-xl font-bold text-text outline-none">
        {main}
      </h2>
      {mode === 'next_step' && c.revealed?.length ? (
        <ol aria-label={t('challenge.stepsLabel')} className="list-decimal pl-6 text-text">
          {c.revealed.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : null}
      {mode === 'case' && c.revealed?.length ? (
        <ul aria-label={t('challenge.stagesLabel')} className="flex flex-col gap-2">
          {c.revealed.map((s, i) => (
            <li key={i} className="flex flex-col items-start gap-1">
              {caseStages[i] ? <Tag>{t(`cards.case.stage.${caseStages[i]}`)}</Tag> : null}
              <span className="text-text">{s}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {mode === 'occlusion' && c.image ? <Occlusion image={c.image} /> : null}
      {ask && mode !== 'edge' ? <p className="font-semibold text-text">{ask}</p> : null}
    </div>
  );
}
