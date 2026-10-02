'use client';

import { memo, useCallback, useContext, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MapState } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { NodeCard, type NodeChip, type NodeLayer, type NodeStep } from '@remoa/ui';
import { useCardFace } from '@/features/cards/card-face';
import { CanvasContext, isDue } from './canvas-context';
import { useCardDetail } from './card-detail';
import { heatOf, type CardNode } from './graph';
import { quizRole } from './quiz-view';

// Ports only on hover/selection (D-075); dragging from them still connects.
const port = '!h-3 !w-3 !border-2 !border-surface !bg-primary opacity-0 transition-opacity [.react-flow__node:hover_&]:opacity-100 [.react-flow__node.selected_&]:opacity-100 [.react-flow__node:focus-within_&]:opacity-100';

type FooterInput = { layer: NodeLayer; state: MapState; r: number | undefined; due: boolean; edges: number; item: string | null };

/** Editor.dc.html footers: Lembrança = "Revisitar · 58% · vence hoje", Estrutura = "2 conexões", Cobertura = "Entra em {item}". */
export function nodeFooter({ layer, state, r, due, edges, item }: FooterInput): string {
  if (layer === 'structure') return t('canvas.footer.edges', { n: edges });
  if (layer === 'coverage') return item ? t('canvas.footer.coverage', { item }) : t('canvas.footer.noItem');
  if (state === 'unknown' || r === undefined) return t('canvas.footer.none');
  const text = t('canvas.footer.recall', { state: t(`mapState.${state}`), pct: Math.round(r * 100) });
  return due ? t('canvas.footer.due', { text }) : text;
}

/** React Flow node: Torph NodeCard (fixed size per type, layers without reflow) + connection ports. */
export const CardNodeView = memo(function CardNodeView({ id, data, selected }: NodeProps<CardNode>) {
  const { layer, challenge, quiz, heat, edgeCounts, coverageItem, endOfToday, selectCard, prepare } = useContext(CanvasContext);
  const { card } = data;
  const entry = heat[id];
  const state = heatOf(id, heat);
  const due = !challenge && isDue(entry?.due, endOfToday);
  const face = useCardFace(card);
  const detail = useCardDetail(card.type === 'flow' ? id : null, prepare);
  const subs = entry?.subs;
  const target = quiz?.cardId === id;
  const steps = useMemo<NodeStep[] | undefined>(() => {
    if (quiz) {
      // challenge: only what the item reveals; the step asked is masked and the later ones (other answers) stay out
      if (!target || !quiz.revealed) return undefined;
      return [...quiz.revealed.map((text) => ({ text })), { text: t('quiz.hiddenStep'), tone: 'hidden' as const }];
    }
    if (detail?.type !== 'flow') return undefined;
    // a flow created on the map has no payload until its first save
    return (detail.payload.steps ?? []).map((s) => ({ text: s.text, tone: layer === 'recall' && subs?.[s.id]?.state === 'review' ? 'weak' as const : 'default' as const }));
  }, [detail, layer, subs, quiz, target]);
  const chips = useMemo<NodeChip[] | undefined>(() => face.chips?.map((label) => ({ label })), [face.chips]);
  const title = target && quiz.hideTitle ? t('quiz.hiddenTitle') : card.title;
  const onSelect = useCallback(() => selectCard(id), [selectCard, id]);
  return (
    <>
      <Handle type="target" position={Position.Left} className={port} />
      <NodeCard
        type={card.type}
        typeLabel={t(`canvas.nodeType.${card.type}`)}
        title={title}
        selectLabel={t('canvas.selectCard', { title })}
        onSelect={onSelect}
        layer={layer}
        state={state}
        footer={nodeFooter({ layer, state, r: entry?.r, due, edges: edgeCounts.get(id) ?? 0, item: coverageItem })}
        due={due}
        selected={selected}
        challenge={quizRole(quiz, id)}
        summary={target && quiz.hideSummary ? undefined : (face.summary ?? undefined)}
        chips={chips}
        steps={steps}
        image={face.thumbnail}
      />
      <Handle type="source" position={Position.Right} className={port} />
    </>
  );
});
