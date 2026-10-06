'use client';

import { memo, useCallback, useContext, useState } from 'react';
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react';
import type { CardSize } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { CardHandles, MapCard, type MapCardProps } from '@remoa/ui';
import { useCardFace } from '@/features/cards/card-face';
import { useAsset } from '@/features/cards/upload';
import { useCardDetail } from '../../canvas/card-detail';
import { heatOf, type CardNode } from '../../canvas/graph';
import { MobileNodesContext } from './mobile-nodes-context';
import { mobileSizeOf, resizedBy } from './resize';
import { useIsOverview } from './semantic-zoom';

const t = withStrings({ mapMobile: more.mapMobile });

const KEY_STEP = 8;

const SHOWN_STEPS = 3;

/** Busca (FR-3): título + resumo, sem acento nem caixa. */
export const matchesQuery = (q: string, ...texts: (string | null | undefined)[]): boolean => {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const needle = norm(q.trim());
  return !needle || texts.some((x) => !!x && norm(x).includes(needle));
};

/**
 * Nó do mapa no celular: `MapCard` do Torph + zoom semântico por seletor booleano. As alças do React Flow ficam ocultas
 * (conectar é por toque, D-667); o card selecionado mostra as alças do Torph para conectar e mudar o tamanho (D-1207).
 */
export const MobileCardNode = memo(function MobileCardNode({ id, data, selected }: NodeProps<CardNode>) {
  const { card } = data;
  const ctx = useContext(MobileNodesContext);
  const overview = useIsOverview();
  // only the selected card follows the zoom (its handles stay finger-sized); the others never re-render on zoom
  // an unmeasured canvas (fitView at 0×0) leaves the zoom NaN: resizing would then compute NaN sizes and do nothing
  const zoom = useStore((s) => (selected && Number.isFinite(s.transform[2]) && s.transform[2] > 0 ? s.transform[2] : 1));
  const [live, setLive] = useState<CardSize | null>(null);
  const questionImage = card.type !== 'image' && !!card.frontAssetId;
  const size = live ?? card.size ?? (questionImage ? mobileSizeOf(card) : null);
  const frontAsset = useAsset(questionImage ? card.frontAssetId : null);
  const connecting = ctx.connectFrom != null;
  const handles = !!selected && !connecting && !!ctx.startConnect && !!ctx.resizeCard;
  const onResize = useCallback(
    (dx: number, dy: number, done: boolean) => {
      const next = resizedBy(mobileSizeOf(card), dx, dy, zoom);
      if (!done) return setLive(next);
      setLive(null);
      ctx.resizeCard?.(id, next);
    },
    [card, ctx, id, zoom],
  );
  const onResizeStep = useCallback(
    (dw: number, dh: number) => ctx.resizeCard?.(id, resizedBy(mobileSizeOf(card), dw * KEY_STEP, dh * KEY_STEP, 1)),
    [card, ctx, id],
  );
  const face = useCardFace(card);
  const detail = useCardDetail(card.type === 'flow' && !overview ? id : null, ctx.prepare, false);
  const entry = ctx.heat[id];
  const state = heatOf(id, ctx.heat);
  const pct = state === 'unknown' || entry?.r === undefined ? null : Math.round(entry.r * 100);
  const typeLabel = t(`mapMobile.card.typeLabel.${card.type}`);
  const stateLabel = t(`mapMobile.card.stateLabel.${state}`);
  const select = useCallback(() => ctx.selectCard(id), [ctx, id]);

  const total = card.preview?.steps ?? 0;
  const texts = detail?.type === 'flow' ? (detail.payload.steps ?? []).map((s) => s.text) : [];
  const flow: Pick<MapCardProps, 'steps' | 'stepsMore'> =
    card.type !== 'flow' ? {}
    : texts.length ? { steps: texts.slice(0, SHOWN_STEPS), ...(texts.length > SHOWN_STEPS ? { stepsMore: t('mapMobile.card.flowMore', { n: texts.length - SHOWN_STEPS }) } : {}) }
    : total ? { stepsMore: t('mapMobile.card.flowCount', { n: total }) } : {};

  const due = !!entry?.due && new Date(entry.due).getTime() <= ctx.endOfToday;
  const label = t('mapMobile.canvas.cardSelectLabel', {
    title: card.title, type: typeLabel, state: stateLabel,
    retrievability: (pct === null ? '' : t('mapMobile.card.recallSuffix', { pct })) + (due ? t('mapMobile.card.dueSuffix') : ''),
  });
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} className="!pointer-events-none !opacity-0" />
      <MapCard
        type={card.type}
        typeLabel={typeLabel}
        title={card.title}
        state={state}
        stateLabel={stateLabel}
        {...(pct === null ? {} : { recallLabel: t('mapMobile.card.recall', { pct }) })}
        {...(face.summary ? { summary: face.summary } : {})}
        {...flow}
        {...(face.thumbnail ? { image: face.thumbnail } : {})}
        {...(questionImage ? { image: { src: frontAsset?.urls.w800 ?? null, alt: t('mapMobile.card.imageAlt', { title: card.title }) } } : {})}
        level={overview ? 'overview' : 'full'}
        selected={selected}
        dimmed={!matchesQuery(ctx.query, card.title, face.summary)}
        heat={ctx.heatLayer}
        {...(size ? { size } : {})}
        target={connecting && ctx.connectFrom !== id}
        selectLabel={label}
        onSelect={select}
      />
      {handles ? (
        <CardHandles
          connectLabel={t('mapMobile.canvas.connectHandle', { title: card.title })}
          resizeLabel={t('mapMobile.canvas.resizeHandle', { title: card.title })}
          scale={1 / zoom}
          onConnect={() => ctx.startConnect?.(id)}
          onResize={onResize}
          onResizeStep={onResizeStep}
        />
      ) : null}
      <Handle type="source" position={Position.Right} isConnectable={false} className="!pointer-events-none !opacity-0" />
    </>
  );
});
