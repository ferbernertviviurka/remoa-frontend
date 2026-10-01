'use client';

import { memo, useContext } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { t } from '@remoa/strings';
import { MapCard } from '@remoa/ui';
import { useCardFace } from '@/features/cards/card-face';
import { CanvasContext } from './canvas-context';
import { heatOf, type CardNode } from './graph';

const port = '!h-3 !w-3 !border-2 !border-surface !bg-primary';

/** React Flow node: Torph MapCard + connection ports (target left, source right). */
export const CardNodeView = memo(function CardNodeView({ id, data, selected }: NodeProps<CardNode>) {
  const { heat, openCard } = useContext(CanvasContext);
  const { card } = data;
  const type = t(`map.cardType.${card.type}`);
  const state = heat ? heatOf(id, heat) : null;
  const face = useCardFace(card);
  return (
    <>
      <Handle type="target" position={Position.Left} className={port} />
      <MapCard
        label={t('map.card.label', { type, title: card.title })}
        typeLabel={type}
        title={card.title}
        openLabel={t('map.card.open')}
        openAriaLabel={t('map.card.openLabel', { title: card.title })}
        onOpen={() => openCard(id)}
        state={state}
        stateLabel={state ? t(`mapState.${state}`) : undefined}
        selected={selected}
        {...face}
      />
      <Handle type="source" position={Position.Right} className={port} />
    </>
  );
});
