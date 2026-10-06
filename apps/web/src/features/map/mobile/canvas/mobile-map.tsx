'use client';

// F23 T5: /app/mapas/[id] below 768 px (same route, same board/card/edge as the desktop editor). Full screen over the shell
// (the shell chrome hides itself through `[data-mobile-map]`, globals.css): pill header, undo/redo and zoom pills, the
// canvas, the floating bar. Nodes and edges are T4's, the create sheet + editor T7's, peek/connect T6's, aside/list T8's.
import '@xyflow/react/dist/style.css';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Background, BackgroundVariant, ReactFlow, ReactFlowProvider, useReactFlow, useStore, type ReactFlowState, type Viewport,
} from '@xyflow/react';
import { CHALLENGE_MIN_CARDS, MOBILE_MAP_ZOOM_MAX, MOBILE_MAP_ZOOM_MIN, type BoardGraph, type ReviewHub } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { CompactMapHeader, FloatingMapBar, IconPill, MapGlyph, useToast } from '@remoa/ui';
import { useMobileCardCreator } from '@/features/cards/mobile/mobile-card-creator';
import { placeCard } from '@/features/cards/mobile/place-card';
import { useChallenge } from '@/features/challenge/provider';
import { DEFAULT_CHIPS, computeQueue } from '@/features/review/hub-math';
import { api } from '@/lib/api';
import { endOfDay, isDue } from '../../canvas/canvas-context';
import type { CardNode } from '../../canvas/graph';
import { saveText } from '../../canvas/save-text';
import { MobileMapList, MobileMapMenu, useEdgeSwipe } from '../menu';
import { useMapSelection } from '../selection/use-map-selection';
import { MobileCardNode, MobileLinkEdge, MobileNodesContext, type MobileNodesCtx } from '../nodes';
import { useMobileMapPrefs, withViewport } from './prefs';
import { useMapDoc } from './use-map-doc';
import { cameraMove, fromViewport, MOBILE_CARD, stepZoom, toViewport, urgentCenter, VIRTUALIZE_ABOVE } from './view';

const t = withStrings({ mapMobile: more.mapMobile });

const nodeTypes = { card: MobileCardNode };
const edgeTypes = { link: MobileLinkEdge };
const proOptions = { hideAttribution: true };
const snapGrid: [number, number] = [8, 8];
/** Free area for "Ajustar": under the header and pills, above the floating bar (px). */
const FIT_PADDING = { top: '88px', bottom: '112px', left: '72px', right: '72px' } as const;

export function MobileMap({ graph }: { graph: BoardGraph }) {
  return (
    <ReactFlowProvider>
      <MobileMapInner data={graph} />
    </ReactFlowProvider>
  );
}

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

/** This map's share of the daily queue (same rule as /revisar, G15); null until it loads or when the hub fails. */
function useBoardQueueCount(boardId: string) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    api<ReviewHub>('/v1/review/hub')
      .then((r) => live && r.ok && setN(computeQueue(r.data, new Set([boardId]), DEFAULT_CHIPS).size))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [boardId]);
  return n;
}

function MobileMapInner({ data }: { data: BoardGraph }) {
  const board = data.board;
  const doc = useMapDoc(data);
  const { graph, graphRef } = doc;
  const rf = useReactFlow<CardNode>();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { reset: resetChallenge } = useChallenge();
  const [prefs, setPrefs] = useMobileMapPrefs();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [asideOpen, setAsideOpen] = useState(false);
  const [endOfToday] = useState(() => endOfDay());
  const now = useNow(30_000);
  const wrap = useRef<HTMLDivElement>(null);

  // --- initial view (Q-083): saved view of this map, else 100% on the most urgent card ----------------------------------
  const saved = prefs.viewports[board.id];
  const placed = useCallback(() => graphRef.current.nodes.map((n) => ({ id: n.id, position: n.position, updatedAt: n.data.card.updatedAt, ...MOBILE_CARD })), [graphRef]);
  const [defaultViewport] = useState<Viewport>(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (saved) return toViewport(saved, w, h);
    const c = urgentCenter(placed(), {}, Date.now()); // heat not loaded yet: most recently edited card
    return c ? toViewport({ ...c, zoom: 1 }, w, h) : { x: w / 2, y: h / 2, zoom: 1 };
  });
  const touched = useRef(!!saved); // the user (or a saved view) owns the camera: the heat must not move it
  useEffect(() => {
    if (touched.current || !doc.heatLoaded) return;
    touched.current = true;
    const c = urgentCenter(placed(), doc.heat, Date.now());
    if (c) void rf.setCenter(c.x, c.y, { zoom: 1, ...cameraMove() });
  }, [doc.heatLoaded, doc.heat, placed, rf]);
  const onMoveEnd = useCallback(
    (e: MouseEvent | TouchEvent | null, vp: Viewport) => {
      if (e) touched.current = true;
      const r = wrap.current?.getBoundingClientRect();
      if (r?.width && r.height) setPrefs((p) => withViewport(p, board.id, fromViewport(vp, r.width, r.height)));
    },
    [board.id, setPrefs],
  );

  // --- nodes: only the selected card drags (D-667); an unselected one is not draggable, so React Flow pans from it -------
  const derived = useRef(new WeakMap<CardNode, CardNode>());
  const nodes = useMemo(
    () =>
      graph.nodes.map((n) => {
        let m = derived.current.get(n);
        if (!m) derived.current.set(n, (m = { ...n, draggable: !!n.selected }));
        return m;
      }),
    [graph.nodes],
  );
  const selectedId = useMemo(() => graph.nodes.find((n) => n.selected)?.id ?? null, [graph.nodes]);

  const focusCard = useCallback(
    (id: string) => {
      doc.select(id);
      const n = graphRef.current.nodes.find((x) => x.id === id);
      if (!n) return;
      const w = n.measured?.width ?? MOBILE_CARD.w;
      const h = n.measured?.height ?? MOBILE_CARD.h;
      void rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1, ...cameraMove() });
    },
    [doc, graphRef, rf],
  );

  // --- review (FR-12/FR-19): this map's session through the existing challenge flow -------------------------------------
  const queueCount = useBoardQueueCount(board.id);
  const dueCount = queueCount ?? graph.nodes.reduce((k, n) => k + (isDue(doc.heat[n.id]?.due, endOfToday) ? 1 : 0), 0);
  const challengeable = useMemo(() => graph.nodes.reduce((k, n) => k + (n.data.card.type !== 'note' && !n.data.card.suspendedAt ? 1 : 0), 0), [graph.nodes]);
  const review = useCallback(() => {
    const missing = CHALLENGE_MIN_CARDS - challengeable;
    if (missing > 0) {
      toast({ title: missing === 1 ? t('challengeSetup.minCards.tooltipOne', { min: CHALLENGE_MIN_CARDS }) : t('challengeSetup.minCards.tooltip', { min: CHALLENGE_MIN_CARDS, n: missing }) });
      return;
    }
    resetChallenge();
    router.push(`${pathname}?modo=desafio`);
  }, [challengeable, pathname, resetChallenge, router, toast]);

  // FR-12: one bar; with the create sheet open a copy rides over the scrim (mock `mapa-mobile-criar`) and its "×" closes the sheet
  const list = prefs.view === 'list';
  const bar = (createOpen: boolean, onCreate: () => void, closeSheet?: () => void) => (
    <FloatingMapBar
      reviewLabel={t('mapMobile.floatingBar.review')}
      reviewAriaLabel={dueCount > 0 ? t('mapMobile.floatingBar.reviewLabel', { count: dueCount }) : t('mapMobile.floatingBar.reviewNoDueLabel')}
      dueCount={dueCount}
      onReview={() => {
        closeSheet?.();
        review();
      }}
      listLabel={list ? t('mapMobile.floatingBar.listLabelOff') : t('mapMobile.floatingBar.listLabel')}
      listActive={list}
      onToggleList={() => {
        closeSheet?.();
        setPrefs((p) => ({ ...p, view: p.view === 'list' ? 'canvas' : 'list' }));
      }}
      createLabel={t('mapMobile.floatingBar.createLabel')}
      onCreate={onCreate}
      createOpen={createOpen}
    />
  );

  // --- create (T7 owns the sheet and the editor; the map places the card) -------------------------------------------------
  const creator = useMobileCardCreator({
    createCard: (type) => {
      const sel = graphRef.current.nodes.find((n) => n.selected);
      const r = wrap.current?.getBoundingClientRect();
      const anchor = sel
        ? { x: sel.position.x + MOBILE_CARD.w / 2, y: sel.position.y + MOBILE_CARD.h * 1.75 }
        : rf.screenToFlowPosition({ x: (r?.left ?? 0) + (r?.width ?? 0) / 2, y: (r?.top ?? 0) + (r?.height ?? 0) / 2 });
      return doc.createCard(type, placeCard(anchor, graphRef.current.nodes.map((n) => n.position)));
    },
    discardCard: doc.discardCard,
    getCard: (id) => graphRef.current.nodes.find((n) => n.id === id)?.data.card,
    prepare: doc.prepareCard,
    onSaved: doc.onCardSaved,
    focusCard,
    subs: (id) => doc.heat[id]?.subs,
  }, (close, open) => bar(open, close, close));

  // T6: peek, hold-to-move, connect by touch and the label field
  const selection = useMapSelection({
    doc, wrap, heat: doc.heat, endOfToday, openEditor: creator.openEditor, review,
    active: prefs.view !== 'list' && !asideOpen && !creator.sheetOpen && !creator.editorOpen,
  });
  const { selectCard, editLabel, connectFrom, startConnect } = selection;
  const ctx = useMemo<MobileNodesCtx>(
    () => ({
      heat: doc.heat, query, heatLayer: prefs.heat, labels: prefs.labels, selectedId, endOfToday,
      selectCard, editLabel, prepare: doc.prepareCard, connectFrom, startConnect, resizeCard: doc.resizeCard,
    }),
    [doc.heat, query, prefs.heat, prefs.labels, selectedId, endOfToday, selectCard, editLabel, doc.prepareCard, connectFrom, startConnect, doc.resizeCard],
  );

  const fit = useCallback(() => void rf.fitView({ padding: FIT_PADDING, maxZoom: 1, minZoom: MOBILE_MAP_ZOOM_MIN, ...cameraMove() }), [rf]);
  const cards = useMemo(() => graph.nodes.map((n) => n.data.card), [graph.nodes]);
  const positions = useMemo(() => graph.nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })), [graph.nodes]);
  // FR-17: a list row hands the card to the map: back to the canvas, selected and centered once React Flow is there
  const pending = useRef<{ card?: string; fit?: boolean } | null>(null);
  useEffect(() => {
    const p = pending.current;
    if (list || !p) return;
    pending.current = null;
    touched.current = true;
    const id = setTimeout(() => (p.card ? focusCard(p.card) : fit()), 200); // ponytail: React Flow has no "ready" event for the first fit; 200 ms covers measuring
    return () => clearTimeout(id);
  }, [list, focusCard, fit]);
  const openFromList = useCallback(
    (id: string) => {
      pending.current = { card: id };
      doc.select(id);
      setPrefs((p) => ({ ...p, view: 'canvas' }));
    },
    [doc, setPrefs],
  );
  const fitFromAnywhere = useCallback(() => {
    if (prefs.view === 'list') {
      pending.current = { fit: true };
      setPrefs((p) => ({ ...p, view: 'canvas' }));
    } else fit();
  }, [fit, prefs.view, setPrefs]);
  const openAside = useCallback(() => {
    // the aside returns focus to whoever had it: iOS taps and the edge swipe do not focus the hamburger, so do it here (FR-15)
    document.querySelector<HTMLElement>('[data-mobile-map] header [aria-haspopup="dialog"]')?.focus();
    setAsideOpen(true);
  }, []);
  useEdgeSwipe(openAside, !asideOpen);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
  }, []);
  const status = doc.status.state;

  return (
    <div
      ref={wrap}
      data-mobile-map=""
      className="fixed inset-0 z-50 overflow-hidden bg-canvas text-text [touch-action:pan-x_pan-y]"
    >
      {list ? (
        <MobileMapList cards={cards} heat={doc.heat} endOfToday={endOfToday} onOpen={openFromList} />
      ) : (
        <section aria-label={t('mapMobile.a11y.canvasLabel')} className="absolute inset-0">
          <MobileNodesContext.Provider value={ctx}>
            <ReactFlow<CardNode>
              nodes={nodes}
              edges={graph.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={doc.onNodesChange}
              onPaneClick={() => doc.select(null)}
              nodesDraggable={false}
              nodesConnectable={false}
              nodeDragThreshold={6}
              paneClickDistance={6}
              selectNodesOnDrag={false}
              snapToGrid
              snapGrid={snapGrid}
              panOnDrag
              zoomOnPinch
              zoomOnDoubleClick
              deleteKeyCode={null}
              minZoom={MOBILE_MAP_ZOOM_MIN}
              maxZoom={MOBILE_MAP_ZOOM_MAX}
              defaultViewport={defaultViewport}
              onMoveEnd={onMoveEnd}
              onlyRenderVisibleElements={graph.nodes.length > VIRTUALIZE_ABOVE}
              proOptions={proOptions}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="var(--grid-dot)" />
            </ReactFlow>
          </MobileNodesContext.Provider>
        </section>
      )}

      <div className="absolute inset-x-3 top-[calc(12px+env(safe-area-inset-top))] z-10">
        <CompactMapHeader
          title={board.title}
          status={status}
          statusText={saveText(doc.status, board.updatedAt, now)}
          retryLabel={t('mapMobile.states.errorRetry')}
          onRetry={doc.retry}
          menuLabel={t('mapMobile.header.menuLabel')}
          onMenu={openAside}
          searchLabel={t('mapMobile.header.searchLabel')}
          searchPlaceholder={t('mapMobile.header.searchPlaceholder')}
          closeSearchLabel={t('mapMobile.header.searchCloseLabel')}
          searchOpen={searchOpen}
          onSearchOpen={() => setSearchOpen(true)}
          query={query}
          onQueryChange={setQuery}
          onSearchClose={closeSearch}
        />
      </div>

      {list ? null : (
        <>
          <div className="absolute left-3 top-[calc(80px+env(safe-area-inset-top))] z-10">
            <IconPill
              aria-label={t('mapMobile.undoRedo.groupLabel')}
              items={[
                { key: 'undo', label: t('mapMobile.undoRedo.undoLabel'), icon: <MapGlyph name="undo" />, onClick: () => doc.step('undo'), disabled: !doc.steps.undo },
                { key: 'redo', label: t('mapMobile.undoRedo.redoLabel'), icon: <MapGlyph name="redo" />, onClick: () => doc.step('redo'), disabled: !doc.steps.redo },
              ]}
            />
          </div>
          <div className="absolute right-3 top-[calc(80px+env(safe-area-inset-top))] z-10">
            <ZoomPill onFit={fit} />
          </div>
        </>
      )}

      {creator.editorOpen ? null : bar(creator.sheetOpen, creator.openSheet)}
      {creator.element}
      {selection.element}

      <MobileMapMenu
        open={asideOpen}
        onOpenChange={setAsideOpen}
        board={board}
        cards={cards}
        nodes={positions}
        edgeCount={graph.edges.length}
        heat={doc.heat}
        prefs={prefs}
        onPrefs={setPrefs}
        dueCount={dueCount}
        onReview={review}
        onFit={fitFromAnywhere}
        onCreate={creator.openSheet}
      />
    </div>
  );
}

const zoomOf = (s: ReactFlowState) => s.transform[2];

/** −, +, ajustar and the percentage (40–180%, 25% steps). Re-renders only on zoom change. */
const ZoomPill = memo(function ZoomPill({ onFit }: { onFit: () => void }) {
  const rf = useReactFlow();
  const zoom = useStore(zoomOf);
  // quick taps step from where the running animation is heading, not from a mid-flight value (118% → 100% instead of 75%)
  const heading = useRef<number | null>(null);
  const step = (dir: 1 | -1) => {
    const next = stepZoom(heading.current ?? zoom, dir);
    heading.current = next;
    void rf.zoomTo(next, cameraMove()).then(() => {
      if (heading.current === next) heading.current = null;
    });
  };
  return (
    <IconPill
      aria-label={t('mapMobile.zoom.groupLabel')}
      caption={t('mapMobile.zoom.percentage', { pct: Math.round(zoom * 100) })}
      items={[
        { key: 'in', label: t('mapMobile.zoom.inLabel'), icon: <MapGlyph name="plus" />, onClick: () => step(1), disabled: zoom >= MOBILE_MAP_ZOOM_MAX - 0.001 },
        { key: 'out', label: t('mapMobile.zoom.outLabel'), icon: <MapGlyph name="minus" />, onClick: () => step(-1), disabled: zoom <= MOBILE_MAP_ZOOM_MIN + 0.001 },
        { key: 'fit', label: t('mapMobile.zoom.fitLabel'), icon: <MapGlyph name="fit" />, onClick: onFit },
      ]}
    />
  );
});
