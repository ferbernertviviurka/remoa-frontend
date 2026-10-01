'use client';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  applyEdgeChanges, applyNodeChanges, Background, BackgroundVariant, MiniMap, Panel, ReactFlow, ReactFlowProvider, useReactFlow,
  type Connection, type EdgeChange, type NodeChange, type XYPosition,
} from '@xyflow/react';
import { MAX_CARDS_PER_BOARD, type BoardGraph, type CardType, type MapOp, type RetrievabilityMap } from '@remoa/contracts';
import { cardTypes } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Dialog, IconButton, Switch, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { CanvasContext, type CanvasCtx } from './canvas-context';
import { CanvasHeader } from './canvas-header';
import { CardNodeView } from './card-node';
import { applyOps, invertAll, snapPos, toEdge, toNode, type CardCache, type CardNode, type Graph, type LinkEdge } from './graph';
import { emptyHistory, push, redo, undo, type History } from './history';
import { Inspector } from './inspector';
import { autoLayout, CARD_H, CARD_W } from './layout';
import { LinkEdgeView } from './link-edge';
import { createOpQueue, loadPending, type OpQueue, type QueueStatus } from './op-queue';

const nodeTypes = { card: CardNodeView };
const edgeTypes = { link: LinkEdgeView };
const uuid = () => crypto.randomUUID();
const VIRTUALIZE_ABOVE = 150;
const notSelf = (c: { source: string; target: string }) => c.source !== c.target;

const ariaLabelConfig = {
  'node.a11yDescription.default': t('map.a11y.node'),
  'node.a11yDescription.keyboardDisabled': t('map.a11y.nodeKeyboard'),
  'node.a11yDescription.ariaLiveMessage': ({ x, y }: { x: number; y: number }) => t('map.a11y.moved', { x, y }),
  'edge.a11yDescription.default': t('map.a11y.edge'),
  'minimap.ariaLabel': t('map.zoom.minimap'),
  'handle.ariaLabel': t('map.a11y.handle'),
};

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** Server graph → local graph: lays out cards without position (imports), then replays ops left offline. */
function initialGraph(data: BoardGraph, cache: CardCache): { graph: Graph; layout: MapOp[] } {
  const placed = data.cards.filter((c) => c.position);
  const loose = data.cards.filter((c) => !c.position);
  const right = placed.reduce((m, c) => Math.max(m, c.position!.x + CARD_W + 96), 0);
  const pos = loose.length
    ? autoLayout(loose, data.edges.map((e) => ({ source: e.fromCardId, target: e.toCardId })), { x: right, y: 0 })
    : new Map<string, XYPosition>();
  const nodes = data.cards.map((c) => toNode(c, c.position ?? pos.get(c.id)!));
  const layout: MapOp[] = loose.length
    ? [{ op: 'moveCards', opId: uuid(), boardId: data.board.id, moves: [...pos].map(([cardId, position]) => ({ cardId, position })) }]
    : [];
  const graph = applyOps({ nodes, edges: data.edges.map(toEdge) }, loadPending(data.board.id, storage()), cache);
  return { graph, layout };
}

export function MapCanvas({ graph }: { graph: BoardGraph }) {
  return (
    <ReactFlowProvider>
      <Canvas data={graph} />
    </ReactFlowProvider>
  );
}

function Canvas({ data }: { data: BoardGraph }) {
  const board = data.board;
  const rf = useReactFlow<CardNode, LinkEdge>();
  const { toast } = useToast();
  const cache = useRef<CardCache>(new Map(data.cards.map((c) => [c.id, c])));
  const [init] = useState(() => initialGraph(data, cache.current));
  const [graph, setGraphState] = useState(init.graph);
  const g = useRef(graph); // always the latest graph (handlers read it synchronously)
  const setGraph = useCallback((next: Graph) => {
    g.current = next;
    setGraphState(next);
  }, []);
  const history = useRef<History>(emptyHistory);
  const queue = useRef<OpQueue | null>(null);
  const [status, setStatus] = useState<QueueStatus>({ state: 'saved', savedAt: null, pending: 0, dropped: false });
  const wrap = useRef<HTMLElement>(null);
  const dragStart = useRef(new Map<string, XYPosition>());
  const [heatOn, setHeatOn] = useState(false);
  const [retrievability, setRetrievability] = useState<RetrievabilityMap>({});
  const [confirmDelete, setConfirmDelete] = useState<MapOp[] | null>(null);

  // --- autosave queue ---------------------------------------------------------
  useEffect(() => {
    const q = createOpQueue({
      boardId: board.id,
      send: (ops) => api<{ applied: string[] }>('/v1/boards/ops', { method: 'POST', body: JSON.stringify({ ops }) }),
      onStatus: setStatus,
      storage: storage(),
      events: window,
    });
    queue.current = q;
    setStatus(q.status());
    if (init.layout.length) q.enqueue(init.layout);
    return () => {
      void q.flush(); // best effort on navigation; whatever is left stays in storage for the next visit
      q.dispose();
    };
  }, [board.id, init]);

  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track('board_opened', { cards: data.cards.length, edges: data.edges.length });
  }, [data]);

  // F03 owns the endpoint; until it exists (or on any error) every card is "Sem revisões".
  useEffect(() => {
    let live = true;
    api<RetrievabilityMap>(`/v1/review/retrievability?boardId=${board.id}`)
      .then((r) => live && setRetrievability(r.ok ? r.data : {}))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [board.id]);

  // --- mutations ----------------------------------------------------------------
  /** Applies ops locally, queues them for the API and (unless undo/redo) records them in the history. */
  const commit = useCallback(
    (ops: MapOp[], opts: { undo?: MapOp[]; record?: boolean } = {}) => {
      if (!ops.length) return;
      const undoOps = opts.record === false ? [] : (opts.undo ?? invertAll(g.current, ops, cache.current, uuid));
      setGraph(applyOps(g.current, ops, cache.current));
      queue.current?.enqueue(ops);
      if (opts.record !== false) history.current = push(history.current, { redo: ops, undo: undoOps });
    },
    [setGraph],
  );

  const select = useCallback(
    (id: string | null) => {
      const nodes = g.current.nodes.map((n) => (!!n.selected === (n.id === id) ? n : { ...n, selected: n.id === id }));
      const edges = g.current.edges.map((e) => (e.selected ? { ...e, selected: false } : e));
      setGraph({ nodes, edges });
    },
    [setGraph],
  );

  const openCard = useCallback(
    (id: string) => {
      select(id);
      // F02: open the card editor for `id` here (the inspector already shows it).
    },
    [select],
  );

  const createCard = useCallback(
    (type: CardType, at?: XYPosition) => {
      if (g.current.nodes.length >= MAX_CARDS_PER_BOARD) {
        toast({ title: t('map.limit', { max: MAX_CARDS_PER_BOARD }), tone: 'danger' });
        return;
      }
      let p = at;
      if (!p) {
        const r = wrap.current?.getBoundingClientRect();
        const c = rf.screenToFlowPosition({ x: (r?.left ?? 0) + (r?.width ?? 0) / 2, y: (r?.top ?? 0) + (r?.height ?? 0) / 2 });
        p = { x: c.x - CARD_W / 2, y: c.y - CARD_H / 2 };
      }
      const id = uuid();
      commit([{ op: 'createCard', opId: uuid(), boardId: board.id, card: { id, type, title: t(`map.newCardTitle.${type}`), position: snapPos(p) } }]);
      track('card_created', { type, origin: 'manual' });
      openCard(id);
    },
    [board.id, commit, openCard, rf, toast],
  );

  const saveLabel = useCallback(
    (edgeId: string, label: string | null) => commit([{ op: 'updateEdgeLabel', opId: uuid(), boardId: board.id, edgeId, label }]),
    [board.id, commit],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<CardNode>[]) => {
      const before = g.current;
      const moves: { cardId: string; position: XYPosition }[] = [];
      const undoMoves: typeof moves = [];
      for (const c of changes) {
        if (c.type !== 'position' || !c.position) continue;
        const prev = dragStart.current.get(c.id) ?? before.nodes.find((n) => n.id === c.id)?.position;
        if (c.dragging) {
          if (prev && !dragStart.current.has(c.id)) dragStart.current.set(c.id, prev);
          continue;
        }
        // drag end or keyboard move: persist
        dragStart.current.delete(c.id);
        const position = snapPos(c.position);
        if (prev && (prev.x !== position.x || prev.y !== position.y)) {
          moves.push({ cardId: c.id, position });
          undoMoves.push({ cardId: c.id, position: prev });
        }
      }
      setGraph({ ...before, nodes: applyNodeChanges(changes, before.nodes) });
      if (moves.length)
        commit([{ op: 'moveCards', opId: uuid(), boardId: board.id, moves }], {
          undo: [{ op: 'moveCards', opId: uuid(), boardId: board.id, moves: undoMoves }],
        });
    },
    [board.id, commit, setGraph],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<LinkEdge>[]) => setGraph({ ...g.current, edges: applyEdgeChanges(changes, g.current.edges) }),
    [setGraph],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target || g.current.edges.some((e) => e.source === c.source && e.target === c.target)) return;
      commit([{ op: 'createEdge', opId: uuid(), boardId: board.id, edge: { id: uuid(), fromCardId: c.source, toCardId: c.target, label: null } }]);
      track('edge_created', { hasLabel: false });
    },
    [board.id, commit],
  );

  const organize = useCallback(() => {
    const { nodes, edges } = g.current;
    const pos = autoLayout(nodes.map((n) => ({ id: n.id, height: n.measured?.height })), edges);
    const moves = nodes.flatMap((n) => {
      const p = pos.get(n.id)!;
      return p.x !== n.position.x || p.y !== n.position.y ? [{ cardId: n.id, position: p }] : [];
    });
    if (!moves.length) return;
    commit([{ op: 'moveCards', opId: uuid(), boardId: board.id, moves }]);
    requestAnimationFrame(() => void rf.fitView({ duration: 300 }));
  }, [board.id, commit, rf]);

  const deleteSelection = useCallback(() => {
    const { nodes, edges } = g.current;
    const cardIds = nodes.filter((n) => n.selected).map((n) => n.id);
    const edgeIds = edges.filter((e) => e.selected).map((e) => e.id);
    const ops: MapOp[] = [];
    if (edgeIds.length) ops.push({ op: 'deleteEdges', opId: uuid(), boardId: board.id, edgeIds });
    if (cardIds.length) ops.push({ op: 'deleteCards', opId: uuid(), boardId: board.id, cardIds });
    if (!ops.length) return;
    const ids = new Set(cardIds);
    const connected = edges.some((e) => !edgeIds.includes(e.id) && (ids.has(e.source) || ids.has(e.target)));
    if (connected) setConfirmDelete(ops);
    else commit(ops);
  }, [board.id, commit]);

  const step = useCallback(
    (dir: 'undo' | 'redo') => {
      const r = (dir === 'undo' ? undo : redo)(history.current, uuid);
      if (!r) return;
      history.current = r.history;
      commit(r.ops, { record: false });
    },
    [commit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || confirmDelete) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
      } else if (mod && key === 'z') {
        e.preventDefault();
        step(e.shiftKey ? 'redo' : 'undo');
      } else if (mod && key === 'y') {
        e.preventDefault();
        step('redo');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDelete, deleteSelection, step]);

  const onDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.classList.contains('react-flow__pane')) return;
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      createCard('concept', { x: p.x - CARD_W / 2, y: p.y - 24 });
    },
    [createCard, rf],
  );

  const toggleHeat = useCallback((enabled: boolean) => {
    setHeatOn(enabled);
    track('heat_toggled', { enabled });
  }, []);

  const retry = useCallback(() => {
    if (queue.current?.status().dropped) window.location.reload(); // the API rejected edits: resync with the server
    else void queue.current?.retry();
  }, []);

  const ctx = useMemo<CanvasCtx>(() => ({ heat: heatOn ? retrievability : null, openCard, saveLabel }), [heatOn, retrievability, openCard, saveLabel]);

  const selectedNodes = graph.nodes.filter((n) => n.selected);
  const selected = selectedNodes.length === 1 ? selectedNodes[0]!.data.card : null;

  return (
    <div className="flex h-[calc(100dvh-56px-112px)] min-h-[480px] flex-col gap-3 md:h-[calc(100dvh-56px-48px)]">
      <CanvasHeader board={board} cards={graph.nodes.length} edges={graph.edges.length} status={status} onRetry={retry} />
      <div role="group" aria-label={t('map.toolbar.label')} className="flex flex-wrap items-center gap-2">
        {cardTypes.map((type) => (
          <Button key={type} variant="secondary" aria-label={t('map.toolbar.add', { type: t(`map.toolbar.${type}`) })} onClick={() => createCard(type)}>
            {`+ ${t(`map.toolbar.${type}`)}`}
          </Button>
        ))}
        <Button variant="quiet" onClick={organize}>
          {t('map.toolbar.organize')}
        </Button>
        <div className="ml-auto">
          <Switch label={t('map.toolbar.heat')} checked={heatOn} onCheckedChange={toggleHeat} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        <section ref={wrap} aria-label={t('map.canvasLabel', { title: board.title })} className="relative min-w-0 flex-1 overflow-hidden rounded-map border border-border bg-canvas">
          <CanvasContext.Provider value={ctx}>
            <ReactFlow<CardNode, LinkEdge>
              nodes={graph.nodes}
              edges={graph.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={notSelf}
              onDoubleClick={onDoubleClick}
              snapToGrid
              snapGrid={[8, 8]}
              selectNodesOnDrag={false}
              deleteKeyCode={null}
              selectionKeyCode="Shift"
              multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
              zoomOnDoubleClick={false}
              panOnScroll
              zoomActivationKeyCode={['Meta', 'Control']}
              minZoom={0.2}
              maxZoom={2}
              onlyRenderVisibleElements={graph.nodes.length > VIRTUALIZE_ABOVE}
              ariaLabelConfig={ariaLabelConfig}
              fitView
              fitViewOptions={{ maxZoom: 1 }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--grid)" />
              <MiniMap pannable zoomable bgColor="var(--surface)" nodeColor="var(--border)" maskColor="rgba(20,43,60,.08)" />
              <Panel position="bottom-left">
                <ZoomControls />
              </Panel>
            </ReactFlow>
          </CanvasContext.Provider>
        </section>
        <Inspector board={board} card={selected} entry={selected ? retrievability[selected.id] : undefined} />
      </div>
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t('map.delete.title')}
        description={t('map.delete.body')}
        closeLabel={t('common.close')}
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) commit(confirmDelete);
              setConfirmDelete(null);
            }}
          >
            {t('map.delete.confirm')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function ZoomControls() {
  const rf = useReactFlow();
  return (
    <div role="group" aria-label={t('map.zoom.controls')} className="flex flex-col gap-1 rounded-btn border border-border bg-surface p-1 shadow-card">
      <IconButton aria-label={t('map.zoom.in')} onClick={() => void rf.zoomIn({ duration: 150 })}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </IconButton>
      <IconButton aria-label={t('map.zoom.out')} onClick={() => void rf.zoomOut({ duration: 150 })}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </IconButton>
      <IconButton aria-label={t('map.zoom.fit')} onClick={() => void rf.fitView({ duration: 200, maxZoom: 1 })}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </IconButton>
    </div>
  );
}
