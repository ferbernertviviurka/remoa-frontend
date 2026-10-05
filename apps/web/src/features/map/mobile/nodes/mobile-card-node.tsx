'use client';

import { memo, useCallback, useContext } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { t } from '@remoa/strings';
import { MapCard, type MapCardProps } from '@remoa/ui';
import { useCardFace } from '@/features/cards/card-face';
import { useCardDetail } from '../../canvas/card-detail';
import { heatOf, type CardNode } from '../../canvas/graph';
import { MobileNodesContext } from './mobile-nodes-context';
import { useIsOverview } from './semantic-zoom';

const SHOWN_STEPS = 3;

/** Busca (FR-3): título + resumo, sem acento nem caixa. */
export const matchesQuery = (q: string, ...texts: (string | null | undefined)[]): boolean => {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const needle = norm(q.trim());
  return !needle || texts.some((x) => !!x && norm(x).includes(needle));
};

/** Nó do mapa no celular: `MapCard` do Torph + zoom semântico por seletor booleano. Sem alças visíveis (conectar é por toque, D-667). */
export const MobileCardNode = memo(function MobileCardNode({ id, data, selected }: NodeProps<CardNode>) {
  const { card } = data;
  const ctx = useContext(MobileNodesContext);
  const overview = useIsOverview();
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
        level={overview ? 'overview' : 'full'}
        selected={selected}
        dimmed={!matchesQuery(ctx.query, card.title, face.summary)}
        heat={ctx.heatLayer}
        selectLabel={label}
        onSelect={select}
      />
      <Handle type="source" position={Position.Right} isConnectable={false} className="!pointer-events-none !opacity-0" />
    </>
  );
});
