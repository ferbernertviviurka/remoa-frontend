'use client';

// F23 T6: what happens when a card is touched on the phone map: peek (FR-8), hold-to-move (FR-9), connect by touch and the
// label field (FR-10). `selectCard`/`editLabel` go into MobileNodesContext; `element` renders once inside the map.
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react';
import { useReactFlow, type NodeChange } from '@xyflow/react';
import type { Card, CardDetail, RetrievabilityMap } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { CardPeek, ConnectBanner, EdgeLabelField, useToast, type MapCardState } from '@remoa/ui';
import { useCardFace, type CardFace } from '@/features/cards/card-face';
import { isDue } from '../../canvas/canvas-context';
import { useCardDetail } from '../../canvas/card-detail';
import { caseStageItems, hasAnswer } from '../../canvas/card-answer';
import { heatOf, type CardNode } from '../../canvas/graph';
import type { MapDoc } from '../canvas/use-map-doc';
import { cameraMove } from '../canvas/view';
import { useHoldMove } from './use-hold-move';

const t = withStrings({ mapMobile: more.mapMobile });

/** Screen px the header (and its 12 px inset) takes at the top, and the gap kept above the peek. */
const TOP = 80;
const GAP = 12;
/** Below this the card is too small to read: it may then be partly under the peek, which scrolls. */
const MIN_ZOOM = 0.45;

/**
 * D-1572: zoom and flow-y shift for `setCenter` so a `card` (flow px) sits whole between the header and the peek's top
 * (`peekTop`, px from the pane's top; null = not mounted, assume the lower 40%). At most 100%, smaller when it does not fit.
 */
export function peekView(card: { w: number; h: number }, paneW: number, paneH: number, peekTop: number | null) {
  const bottom = (peekTop ?? paneH * 0.6) - GAP;
  const room = { w: paneW - 24, h: bottom - TOP };
  const zoom = Math.max(MIN_ZOOM, Math.min(1, room.w / card.w, room.h / card.h));
  const target = room.h >= card.h * zoom ? (TOP + bottom) / 2 : TOP + (card.h * zoom) / 2; // too tall: top edge under the header
  return { zoom, shift: (paneH / 2 - target) / zoom };
}

type Args = {
  doc: MapDoc;
  wrap: RefObject<HTMLElement | null>;
  heat: RetrievabilityMap;
  endOfToday: number;
  /** Canvas visible and nothing else (aside, list, create sheet, editor) on top. */
  active: boolean;
  openEditor: (cardId: string) => void;
  review: () => void;
  /** FR-1: Desafiar this card. */
  onChallenge: (cardId: string) => void;
};

export function useMapSelection({ doc, wrap, heat, endOfToday, active, openEditor, review, onChallenge }: Args) {
  const rf = useReactFlow<CardNode>();
  const { toast } = useToast();
  const { graph, graphRef } = doc;
  const [from, setFrom] = useState<string | null>(null);
  const [label, setLabel] = useState<{ edgeId: string; initial: string } | null>(null);
  const selectedId = graph.nodes.find((n) => n.selected)?.id ?? null;
  const titleOf = useCallback((id: string) => graphRef.current.nodes.find((n) => n.id === id)?.data.card.title ?? '', [graphRef]);

  // --- hold to move (unselected card) ---
  useHoldMove({
    wrap,
    enabled: active && from === null,
    zoom: () => rf.getZoom(),
    position: (id) => graphRef.current.nodes.find((n) => n.id === id)?.position,
    select: doc.select,
    move: (id, position, dragging) => doc.onNodesChange([{ type: 'position', id, position, dragging }] satisfies NodeChange<CardNode>[]),
  });

  // --- tap on a card: select + centre (peek), or the target of a connection ---
  const selectCard = useCallback(
    (id: string) => {
      if (from !== null) {
        const r = doc.createEdge(from, id);
        if (!r.ok) return toast({ title: t(r.reason === 'self' ? 'mapMobile.connect.self' : 'mapMobile.connect.duplicate'), tone: 'danger' });
        setFrom(null);
        doc.select(id);
        setLabel({ edgeId: r.id, initial: '' });
        return;
      }
      doc.select(id);
      const n = graphRef.current.nodes.find((x) => x.id === id);
      if (!n) return;
      const w = n.measured?.width ?? 152;
      const h = n.measured?.height ?? 124;
      // D-1572: wait for the peek to mount, then fit the card between the header and the peek's real top (Safari's bars and
      // a tall peek used to leave it underneath)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const pane = wrap.current;
          const peek = pane?.querySelector<HTMLElement>('[data-card-peek]');
          const v = peekView({ w, h }, pane?.clientWidth ?? 0, pane?.clientHeight ?? 0, peek?.offsetTop ?? null);
          void rf.setCenter(n.position.x + w / 2, n.position.y + h / 2 + v.shift, { zoom: v.zoom, ...cameraMove() });
        }),
      );
    },
    [doc, from, graphRef, rf, toast, wrap],
  );

  const editLabel = useCallback(
    (edgeId: string) => setLabel({ edgeId, initial: graphRef.current.edges.find((e) => e.id === edgeId)?.data?.label ?? '' }),
    [graphRef],
  );

  useEffect(() => {
    if (from === null) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setFrom(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [from]);
  // the connection source vanished (undo of its creation, delete): leave the mode
  const gone = from !== null && !graph.nodes.some((n) => n.id === from);
  useEffect(() => {
    if (gone) setFrom(null);
  }, [gone]);

  const card = selectedId ? graph.nodes.find((n) => n.id === selectedId) : undefined;
  const element: ReactNode = !active ? null : (
    <>
      {from !== null ? (
        <ConnectBanner text={t('mapMobile.connect.tooltip', { from: titleOf(from) })} cancelLabel={t('mapMobile.connect.cancelLabel')} onCancel={() => setFrom(null)} />
      ) : null}
      {label ? (
        <EdgeLabelField
          key={label.edgeId}
          ariaLabel={t('mapMobile.connect.labelGroup')}
          inputLabel={t('mapMobile.connect.labelField')}
          placeholder={t('mapMobile.connect.labelPlaceholder')}
          initial={label.initial}
          saveLabel={t('mapMobile.connect.labelSave')}
          skipLabel={t('mapMobile.connect.labelSkip')}
          onSave={(v) => {
            doc.setEdgeLabel(label.edgeId, v);
            setLabel(null);
          }}
          onSkip={() => setLabel(null)}
        />
      ) : null}
      {card && from === null && !label ? (
        <Peek
          key={card.id}
          node={card}
          heat={heat}
          endOfToday={endOfToday}
          prepare={doc.prepareCard}
          onClose={() => doc.select(null)}
          onReview={review}
          onEdit={() => openEditor(card.id)}
          onConnect={() => setFrom(card.id)}
          onChallenge={() => onChallenge(card.id)}
        />
      ) : null}
    </>
  );
  return { selectCard, editLabel, connectFrom: from, startConnect: setFrom, element };
}

/** D-1572: the back as plain text for the peek's "Ver resposta" (same cards as the desktop flip, `hasAnswer`); null = no answer. */
function answerText(card: Card, face: CardFace, detail: CardDetail | null): string | null {
  if (!hasAnswer(card, face)) return null;
  if (card.type === 'concept') return face.answer ?? null;
  if (!detail) return t('mapMobile.peek.answerLoading');
  if (detail.type === 'flow') return (detail.payload.steps ?? []).map((s, i) => `${i + 1}. ${s.text}`).join('\n') || null;
  if (detail.type === 'case') return caseStageItems(undefined, detail).filter((s) => s.filled && s.text).map((s) => `${s.label}: ${s.text}`).join('\n\n') || null;
  if (detail.type === 'image') return (detail.payload.masks ?? []).map((m) => m.label).join('\n') || null;
  return null;
}

function Peek({ node, heat, endOfToday, prepare, onClose, onReview, onEdit, onConnect, onChallenge }: { node: CardNode; heat: RetrievabilityMap; endOfToday: number; prepare: (id: string) => Promise<boolean>; onClose: () => void; onReview: () => void; onEdit: () => void; onConnect: () => void; onChallenge: () => void }) {
  const { card } = node.data;
  const face = useCardFace(card);
  const detail = useCardDetail(card.type !== 'concept' && hasAnswer(card, face) ? card.id : null, prepare);
  const answer = answerText(card, face, detail);
  const entry = heat[card.id];
  const state: MapCardState = heatOf(card.id, heat);
  const pct = entry && state !== 'unknown' ? Math.round(entry.r * 100) : null;
  const nextLabel =
    pct === null ? t('mapMobile.peek.noReviews')
    : isDue(entry?.due, endOfToday) ? t('mapMobile.peek.dueToday', { pct })
    : entry?.due ? t('mapMobile.peek.nextReview', { pct, date: new Date(entry.due).toLocaleDateString('pt-BR') })
    : t('mapMobile.card.recall', { pct });
  const summary = face.summary ?? face.meta ?? '';
  return (
    <CardPeek
      ariaLabel={t('mapMobile.peek.ariaLabel')}
      typeLabel={t(`mapMobile.card.typeLabel.${card.type}`)}
      state={state}
      stateLabel={t(`mapMobile.card.stateLabel.${state}`)}
      title={card.title}
      {...(summary ? { summary } : {})}
      {...(answer ? { answer, showAnswerLabel: t('mapMobile.peek.showAnswer'), hideAnswerLabel: t('mapMobile.peek.hideAnswer'), answerLabel: t('mapMobile.peek.answerLabel') } : {})}
      recall={pct === null ? null : pct / 100}
      nextLabel={nextLabel}
      closeLabel={t('mapMobile.peek.closeLabel')}
      reviewLabel={t('mapMobile.peek.reviewAction')}
      editLabel={t('mapMobile.peek.editLabel')}
      editText={t('mapMobile.peek.editText')}
      connectLabel={t('mapMobile.peek.connectLabel')}
      connectText={t('mapMobile.peek.connectText')}
      challengeLabel={t('challengeAi.open')}
      onClose={onClose}
      onReview={onReview}
      onEdit={onEdit}
      onConnect={onConnect}
      onChallenge={onChallenge}
    />
  );
}
