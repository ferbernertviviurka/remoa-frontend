'use client';

import { memo, useCallback, useContext, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Card, CardDetail, MapState } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { NodeCard, type NodeCardProps, type NodeChip, type NodeLayer, type NodeStep } from '@remoa/ui';
import { useCardFace, type CardFace } from '@/features/cards/card-face';
import { useAsset } from '@/features/cards/upload';
import { CanvasContext, isDue } from './canvas-context';
import { useCardDetail } from './card-detail';
import { heatOf, type CardNode } from './graph';

/**
 * Ports (D-075 → G02): faint at rest so they can be found, solid on hover/selection; above the NodeCard select button
 * (z-10) so the target port is reachable. Dropping on a card body also connects (map-canvas `onConnectEnd`).
 */
const port = 'cv-port !z-10 !h-3.5 !w-3.5 !border-2 !border-surface !bg-primary'; // opacity rules in editor.css

type FooterInput = { layer: NodeLayer; state: MapState; r: number | undefined; due: boolean; edges: number; item: string | null };

/** Editor.dc.html footers: Lembrança = "Revisitar · 58% · vence hoje", Estrutura = "2 conexões", Cobertura = "Entra em {item}". */
export function nodeFooter({ layer, state, r, due, edges, item }: FooterInput): string {
  if (layer === 'structure') return t('canvas.footer.edges', { n: edges });
  if (layer === 'coverage') return item ? t('canvas.footer.coverage', { item }) : t('canvas.footer.noItem');
  if (state === 'unknown' || r === undefined) return t('canvas.footer.none');
  const text = t('canvas.footer.recall', { state: t(`mapState.${state}`), pct: Math.round(r * 100) });
  return due ? t('canvas.footer.due', { text }) : text;
}

/** Whether the card has an answer to show on the back (from what the map already has; the text loads on flip). */
export function hasAnswer(card: Card, face: Pick<CardFace, 'answer'>): boolean {
  const p = card.preview;
  switch (card.type) {
    case 'concept':
      return !!face.answer;
    case 'flow':
      return (p?.steps ?? 0) > 0;
    case 'case':
      return (p?.stages?.length ?? 0) > 0;
    case 'image':
      return (p?.masks ?? 0) > 0;
  }
}

const list = 'm-0 flex list-none flex-col gap-1 p-0';

/** D-097: the back face. Flow steps, case stages and mask labels come from the card detail, fetched only once flipped. */
function Back({ card, face, detail, weak }: { card: Card; face: CardFace; detail: CardDetail | null; weak: (stepId: string) => boolean }): ReactNode {
  if (card.type === 'concept') return <p className="m-0 line-clamp-6">{face.answer}</p>;
  if (!detail) return <p className="m-0 text-muted">{t('canvas.backLoading')}</p>;
  if (detail.type === 'flow')
    return (
      <ol className={list}>
        {(detail.payload.steps ?? []).map((s, i) => (
          <li key={s.id} className={`flex gap-2 ${weak(s.id) ? 'text-review-text' : ''}`}>
            <span className="font-bold text-primary-deep">{i + 1}</span>
            <span className="line-clamp-2">{s.text}</span>
          </li>
        ))}
      </ol>
    );
  if (detail.type === 'case')
    return (
      <ul className={list}>
        {(detail.payload.caseSteps ?? []).map((s) => (
          <li key={s.stage} className="line-clamp-2">
            <span className="font-bold">{t(`cards.case.stage.${s.stage}`)}:</span> {s.text}
          </li>
        ))}
      </ul>
    );
  if (detail.type === 'image')
    return (
      <ul className={list}>
        {(detail.payload.masks ?? []).map((m) => (
          <li key={m.id} className="truncate">{m.label}</li>
        ))}
      </ul>
    );
  return <p className="m-0 text-muted">{t('canvas.backEmpty')}</p>;
}

/** NodeCard props for a map card: shared by the React Flow node and the sharp copy drawn over the blurred canvas (challenge). */
export function useNodeCardProps(id: string, card: Card, selected: boolean): NodeCardProps {
  const { layer, challenge, quiz, heat, edgeCounts, coverageItem, endOfToday, selectCard, prepare } = useContext(CanvasContext);
  const [flipped, setFlipped] = useState(false); // local only (D-097): never persisted, reset when the node unmounts
  const entry = heat[id];
  const state = heatOf(id, heat);
  const due = !challenge && isDue(entry?.due, endOfToday);
  const face = useCardFace(card);
  const target = quiz?.cardId === id;
  const showBack = flipped && !challenge;
  const detail = useCardDetail(showBack && card.type !== 'concept' ? id : null, prepare);
  const frontAsset = useAsset(card.frontAssetId);
  const subs = entry?.subs;
  const steps = useMemo<NodeStep[] | undefined>(
    () =>
      // challenge (next_step): only what the item reveals; the step asked is masked and the later ones (answers) stay out
      target && quiz.revealed ? [...quiz.revealed.map((text) => ({ text })), { text: t('quiz.hiddenStep'), tone: 'hidden' as const }] : undefined,
    [quiz, target],
  );
  const chips = useMemo<NodeChip[] | undefined>(() => face.chips?.map((label) => ({ label })), [face.chips]);
  const frontImage = useMemo(
    () => (card.frontAssetId ? { src: frontAsset?.urls.w800 ?? null, alt: t('cards.frontImage.alt', { title: card.title }) } : undefined),
    [card.frontAssetId, card.title, frontAsset],
  );
  const image = useMemo(() => (target && quiz.hideImage && face.thumbnail ? { ...face.thumbnail, src: null } : face.thumbnail), [face.thumbnail, quiz, target]);
  const title = target && quiz.hideTitle ? t('quiz.hiddenTitle') : card.title;
  const onSelect = useCallback(() => selectCard(id), [selectCard, id]);
  const onFlip = useCallback(() => setFlipped((f) => !f), []);
  const answer = !challenge && hasAnswer(card, face);
  // NodeCard shows the flip button whenever `back` is set; the content is only built while flipped ('' until then)
  const back = useMemo(
    () => (!answer ? undefined : showBack ? <Back card={card} face={face} detail={detail} weak={(s) => layer === 'recall' && subs?.[s]?.state === 'review'} /> : ''),
    [answer, showBack, card, face, detail, layer, subs],
  );
  return {
    type: card.type,
    shape: card.shape,
    typeLabel: t(`canvas.nodeType.${card.type}`),
    title,
    selectLabel: t('canvas.selectCard', { title }),
    onSelect,
    layer,
    state,
    footer: nodeFooter({ layer, state, r: entry?.r, due, edges: edgeCounts.get(id) ?? 0, item: coverageItem }),
    due,
    selected,
    challenge: target ? 'target' : undefined,
    summary: face.summary ?? undefined,
    chips,
    steps,
    image,
    frontImage,
    back,
    flipped: showBack,
    onFlip,
    flipLabel: t('canvas.flip'),
    unflipLabel: t('canvas.unflip'),
  };
}

/** Clicks on the card's own buttons other than "Selecionar" (the flip) must not reach React Flow (select/open/link). */
const keepToCard = (selectLabel: string) => (e: MouseEvent) => {
  const b = e.target instanceof Element ? e.target.closest('button') : null;
  if (b && b.getAttribute('aria-label') !== selectLabel) e.stopPropagation();
};

/** React Flow node: Torph NodeCard (fixed size per type/shape, layers without reflow) + connection ports. */
export const CardNodeView = memo(function CardNodeView({ id, data, selected }: NodeProps<CardNode>) {
  const p = useNodeCardProps(id, data.card, selected);
  const stop = useMemo(() => keepToCard(p.selectLabel), [p.selectLabel]);
  return (
    <>
      <Handle type="target" position={Position.Left} className={port} />
      <div onClick={stop} onDoubleClick={stop}>
        <NodeCard {...p} />
      </div>
      <Handle type="source" position={Position.Right} className={port} />
    </>
  );
});

/** D-097: the tested card, drawn sharp over the blurred canvas (front only: `challenge` turns the back off). */
export const FocusCard = memo(function FocusCard({ node }: { node: CardNode }) {
  const p = useNodeCardProps(node.id, node.data.card, false);
  return <NodeCard {...p} />;
});
