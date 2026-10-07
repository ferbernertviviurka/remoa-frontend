'use client';

import { memo, useCallback, useContext, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { Handle, NodeResizeControl, Position, useStore, type ControlPosition, type NodeProps, type ReactFlowState } from '@xyflow/react';
import { CARD_SIZE_MAX, CARD_SIZE_MIN, caseStages, type Card, type CardDetail, type CardSize, type CaseStage as Stage, type MapState } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { CaseStageList, NodeCard, StepTimeline, nodeSize, type CaseStage, type NodeCardProps, type NodeLayer, type NodeStep } from '@remoa/ui';
import { useCardFace, type CardFace } from '@/features/cards/card-face';
import { useAsset, useAssets } from '@/features/cards/upload';
import { CanvasContext, isDue } from './canvas-context';
import { useCardDetail } from './card-detail';
import { heatOf, type CardNode } from './graph';

const t = withStrings({ canvas: more.canvas, cards: more.cards });

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
  const img = !!card.backAssetId; // D-201: an answer image alone is an answer too
  switch (card.type) {
    case 'concept':
      return !!face.answer || img;
    case 'flow':
      return (p?.steps ?? 0) > 0 || img;
    case 'case':
      return (p?.stages?.length ?? 0) > 0 || img;
    case 'image':
      return (p?.masks ?? 0) > 0;
    case 'note':
      return false; // D-200: Conteúdo has no back
  }
}

/** G06: the four stages of a clinical case, in order, with the tooltip text (what it is, what filling it changes). */
export function caseStageItems(
  filled: readonly string[] | undefined,
  detail: CardDetail | null,
  image?: (assetId: string, stage: string) => CaseStage['image'],
): (CaseStage & { key: Stage })[] {
  // a card born from a map op stores `{}` whatever its type (draft.ts): read the payload defensively
  const steps = detail?.type === 'case' ? (detail.payload.caseSteps ?? []) : undefined;
  return caseStages.map((key) => {
    const s = steps?.find((x) => x.stage === key);
    const label = t(`cards.case.stage.${key}`);
    return {
      key, label, hint: t(`cards.case.hint.${key}`), text: s?.text, filled: steps ? !!s : !!filled?.includes(key),
      ...(s?.assetId && image ? { image: image(s.assetId, label) } : {}),
    };
  });
}

const list = 'm-0 flex list-none flex-col gap-1 p-0';

/** When the user has not resized, grow concept/note height from question text (ENAMED seeds ship long fronts). */
function contentFitSize(card: Card, summary: string | null, showFrontImage: boolean): CardSize | null {
  if (card.size) return card.size;
  if (card.type !== 'concept' && card.type !== 'note') return null;
  const shape = card.shape ?? 'rect';
  const base = nodeSize(card.type, shape, { frontImage: showFrontImage });
  const chars = (card.title?.length ?? 0) + (summary?.length ?? 0);
  const extraLines = Math.max(0, Math.ceil(chars / 38) - 3);
  const h = Math.min(CARD_SIZE_MAX.h, base.h + extraLines * 18);
  return h > base.h ? { w: base.w, h } : null;
}

/** D-097: the back face. Flow steps, case stages and mask labels come from the card detail, fetched only once flipped. */
function Back({ card, face, detail, weak }: { card: Card; face: CardFace; detail: CardDetail | null; weak: (stepId: string) => boolean }): ReactNode {
  const ids = detail?.type === 'flow' ? (detail.payload.steps ?? []).map((s) => s.assetId) : detail?.type === 'case' ? (detail.payload.caseSteps ?? []).map((s) => s.assetId) : [];
  const assets = useAssets(ids);
  const src = (id: string) => assets.get(id)?.urls.w800 ?? null;
  if (card.type === 'concept') return face.answer ? <p className="m-0 whitespace-pre-wrap break-words">{face.answer}</p> : null;
  if (!detail) return <p className="m-0 text-muted">{t('canvas.backLoading')}</p>;
  if (detail.type === 'flow') {
    const steps: NodeStep[] = (detail.payload.steps ?? []).map((s, i) => ({
      text: s.text,
      tone: weak(s.id) ? 'weak' : 'default',
      ...(s.assetId ? { image: { src: src(s.assetId), alt: t('canvas.stepImageAlt', { n: i + 1, title: card.title }) } } : {}),
    }));
    return <StepTimeline steps={steps} />;
  }
  if (detail.type === 'case') {
    const stages = caseStageItems(undefined, detail, (id, stage) => ({ src: src(id), alt: t('canvas.stageImageAlt', { stage, title: card.title }) }));
    return <CaseStageList stages={stages.filter((s) => s.filled)} />;
  }
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
  // case front: stage texts only if already cached (no GET per mounted case card; the trail needs just which are filled)
  const cached = useCardDetail(card.type === 'case' ? id : null, prepare, false);
  const frontAsset = useAsset(card.frontAssetId);
  const backAsset = useAsset(showBack ? card.backAssetId : null);
  const showFrontImage = !!card.frontAssetId && card.type !== 'image';
  const subs = entry?.subs;
  const steps = useMemo<NodeStep[] | undefined>(
    () =>
      // challenge (next_step): only what the item reveals; the step asked is masked and the later ones (answers) stay out
      target && quiz.revealed ? [...quiz.revealed.map((text) => ({ text })), { text: t('quiz.hiddenStep'), tone: 'hidden' as const }] : undefined,
    [quiz, target],
  );
  const stages = useMemo(() => (card.type === 'case' ? caseStageItems(card.preview?.stages, cached) : undefined), [card.type, card.preview?.stages, cached]);
  const frontImage = useMemo(
    () => (card.frontAssetId ? { src: frontAsset?.urls.w800 ?? null, alt: t('cards.frontImage.alt', { title: card.title }) } : undefined),
    [card.frontAssetId, card.title, frontAsset],
  );
  const backImage = useMemo(
    () => (card.backAssetId && showBack ? { src: backAsset?.urls.w800 ?? null, alt: t('canvas.backImageAlt', { title: card.title }) } : undefined),
    [card.backAssetId, card.title, showBack, backAsset],
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
    footer: card.type === 'note' ? undefined : nodeFooter({ layer, state, r: entry?.r, due, edges: edgeCounts.get(id) ?? 0, item: coverageItem }),
    due,
    selected,
    challenge: target ? 'target' : undefined,
    summary: face.summary ?? undefined,
    caseStages: stages,
    size: contentFitSize(card, face.summary, showFrontImage) ?? undefined,
    backImage,
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

const corners: ControlPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

/**
 * D-202: resize handles on the selected card's corners (sides would sit on the connection ports). React Flow reports the
 * new size through onNodesChange, which turns it into `card.size` and, on release, a `resizeCards` op (map-canvas).
 * Circles keep their aspect ratio. Handles are mouse-only: hidden on touch and in the challenge (`resizable`).
 */
function Resizer({ circle }: { circle: boolean }) {
  return corners.map((pos) => (
    <NodeResizeControl
      key={pos}
      position={pos}
      className="cv-resize"
      minWidth={CARD_SIZE_MIN.w}
      minHeight={CARD_SIZE_MIN.h}
      maxWidth={CARD_SIZE_MAX.w}
      maxHeight={CARD_SIZE_MAX.h}
      keepAspectRatio={circle}
    />
  ));
}

/** D-339: below this zoom, in a big map (> LOD_MIN_NODES cards), cards render at reduced detail; a small map keeps its text when fitted far out. Boolean selector = re-render only when crossing it. */
export const LOD_ZOOM = 0.45;
const LOD_MIN_NODES = 40;
const lodLow = (s: ReactFlowState) => s.transform[2] < LOD_ZOOM && s.nodes.length > LOD_MIN_NODES;

/** React Flow node: Torph NodeCard (size per type/shape or the user's, layers without reflow) + connection ports. */
export const CardNodeView = memo(function CardNodeView({ id, data, selected }: NodeProps<CardNode>) {
  const full = useNodeCardProps(id, data.card, selected);
  const lod = useStore(lodLow);
  // D-339: far out (many cards on screen) only the title/colour block is drawn: no images, steps, summary or back
  const p = useMemo<NodeCardProps>(
    () => (lod ? { ...full, summary: undefined, caseStages: undefined, steps: undefined, image: undefined, frontImage: undefined, backImage: undefined, back: undefined, footer: undefined } : full),
    [lod, full],
  );
  const { resizable } = useContext(CanvasContext);
  const stop = useMemo(() => keepToCard(p.selectLabel), [p.selectLabel]);
  return (
    <>
      <Handle type="target" position={Position.Left} className={port} />
      <div onClick={stop} onDoubleClick={stop}>
        <NodeCard {...p} />
      </div>
      <Handle type="source" position={Position.Right} className={port} />
      {selected && resizable ? <Resizer circle={data.card.type === 'concept' && data.card.shape === 'circle'} /> : null}
    </>
  );
});

/** D-097: the tested card, drawn sharp over the blurred canvas (front only: `challenge` turns the back off). */
export const FocusCard = memo(function FocusCard({ node }: { node: CardNode }) {
  const p = useNodeCardProps(node.id, node.data.card, false);
  return <NodeCard {...p} />;
});
