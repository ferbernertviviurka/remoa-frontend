'use client';

// F23 T6: what happens when a card is touched on the phone map: peek (FR-8), hold-to-move (FR-9), connect by touch and the
// label field (FR-10). `selectCard`/`editLabel` go into MobileNodesContext; `element` renders once inside the map.
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react';
import { useReactFlow, type NodeChange } from '@xyflow/react';
import type { RetrievabilityMap } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { CardPeek, ConnectBanner, EdgeLabelField, useToast, type MapCardState } from '@remoa/ui';
import { useCardFace } from '@/features/cards/card-face';
import { isDue } from '../../canvas/canvas-context';
import { heatOf, type CardNode } from '../../canvas/graph';
import type { MapDoc } from '../canvas/use-map-doc';
import { cameraMove } from '../canvas/view';
import { useHoldMove } from './use-hold-move';

/** Screen px the card sits above the centre so the peek (≈ 260 px at the bottom) does not cover it. */
const PEEK_SHIFT = 120;

type Args = {
  doc: MapDoc;
  wrap: RefObject<HTMLElement | null>;
  heat: RetrievabilityMap;
  endOfToday: number;
  /** Canvas visible and nothing else (aside, list, create sheet, editor) on top. */
  active: boolean;
  openEditor: (cardId: string) => void;
  review: () => void;
};

export function useMapSelection({ doc, wrap, heat, endOfToday, active, openEditor, review }: Args) {
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
      void rf.setCenter(n.position.x + w / 2, n.position.y + h / 2 + PEEK_SHIFT, { zoom: 1, ...cameraMove() });
    },
    [doc, from, graphRef, rf, toast],
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
          onClose={() => doc.select(null)}
          onReview={review}
          onEdit={() => openEditor(card.id)}
          onConnect={() => setFrom(card.id)}
        />
      ) : null}
    </>
  );
  return { selectCard, editLabel, connectFrom: from, startConnect: setFrom, element };
}

function Peek({ node, heat, endOfToday, onClose, onReview, onEdit, onConnect }: { node: CardNode; heat: RetrievabilityMap; endOfToday: number; onClose: () => void; onReview: () => void; onEdit: () => void; onConnect: () => void }) {
  const { card } = node.data;
  const face = useCardFace(card);
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
      recall={pct === null ? null : pct / 100}
      nextLabel={nextLabel}
      closeLabel={t('mapMobile.peek.closeLabel')}
      reviewLabel={t('mapMobile.peek.reviewAction')}
      editLabel={t('mapMobile.peek.editLabel')}
      editText={t('mapMobile.peek.editText')}
      connectLabel={t('mapMobile.peek.connectLabel')}
      connectText={t('mapMobile.peek.connectText')}
      onClose={onClose}
      onReview={onReview}
      onEdit={onEdit}
      onConnect={onConnect}
    />
  );
}
