'use client';

import '@xyflow/react/dist/style.css';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  applyEdgeChanges, applyNodeChanges, Background, BackgroundVariant, ReactFlow, ReactFlowProvider, useReactFlow, useStore,
  type Connection, type EdgeChange, type FitViewOptions, type NodeChange, type NodeMouseHandler, type ReactFlowState, type XYPosition,
} from '@xyflow/react';
import {
  MAX_CARDS_PER_BOARD, type BoardGraph, type CardDetail, type CardType, type CoverageRow, type MapOp, type MapState, type RetrievabilityMap, type SaveCardInput,
} from '@remoa/contracts';
import { t } from '@remoa/strings';
import {
  Button, CanvasToolbar, CommandPalette, Dialog, Input, LayerSwitch, Legend, stepZoom, ZOOM_MAX, ZOOM_MIN, ZoomControl,
  useToast, type CommandItem, type NodeLayer, type ToolbarItem,
} from '@remoa/ui';
import { previewOf } from '@/features/cards/draft';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { CanvasContext, endOfDay, isDue, type CanvasCtx } from './canvas-context';
import { ChallengePanel } from '@/features/challenge/challenge-panel';
import { useChallenge, type Scope } from '@/features/challenge/provider';
import { CanvasHeader, type Mode } from './canvas-header';
import { primeCardDetail } from './card-detail';
import { CardNodeView } from './card-node';
import { applyOps, freshen, heatOf, invertAll, patchCard, snapPos, toEdge, toNode, type CardCache, type CardNode, type Graph, type LinkEdge } from './graph';
import { emptyHistory, push, redo, undo, type History } from './history';
import { Inspector, type Connection as PanelConnection, type MapSummary } from './inspector';
import { autoLayout, CARD_H, CARD_W, NODE_H } from './layout';
import { LinkEdgeView } from './link-edge';
import { quizView } from './quiz-view';
import { createOpQueue, loadPending, type OpQueue, type QueueStatus } from './op-queue';

const nodeTypes = { card: CardNodeView };
const edgeTypes = { link: LinkEdgeView };
const uuid = () => crypto.randomUUID();
const VIRTUALIZE_ABOVE = 150;
/**
 * Keeps the cards clear of the floating controls (layer bar on top, zoom/toolbar below, 340 px panel on the right).
 * A map that fits at 100% lands where the mock draws it (top 120, left 64).
 */
const FIT: FitViewOptions = { padding: { top: '120px', left: '64px', bottom: '200px', right: '432px' }, maxZoom: 1, minZoom: ZOOM_MIN };
type Tool = 'select' | 'move' | 'connect';
const notSelf = (c: { source: string; target: string }) => c.source !== c.target;

const ariaLabelConfig = {
  'node.a11yDescription.default': t('map.a11y.node'),
  'node.a11yDescription.keyboardDisabled': t('map.a11y.nodeKeyboard'),
  'node.a11yDescription.ariaLiveMessage': ({ x, y }: { x: number; y: number }) => t('map.a11y.moved', { x, y }),
  'edge.a11yDescription.default': t('map.a11y.edge'),
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
/** Keys inside a dialog (e.g. Delete in the mask editor) belong to the dialog, never to the canvas. */
const inDialog = (el: EventTarget | null) => el instanceof Element && !!el.closest('[role="dialog"]');

/** Server graph → local graph: lays out cards without position (imports), then replays ops left offline. */
function initialGraph(data: BoardGraph, cache: CardCache): { graph: Graph; layout: MapOp[] } {
  const placed = data.cards.filter((c) => c.position);
  const loose = data.cards.filter((c) => !c.position);
  const right = placed.reduce((m, c) => Math.max(m, c.position!.x + CARD_W + 96), 0);
  const pos = loose.length
    ? autoLayout(loose.map((c) => ({ id: c.id, height: NODE_H[c.type] })), data.edges.map((e) => ({ source: e.fromCardId, target: e.toCardId })), { x: right, y: 0 })
    : new Map<string, XYPosition>();
  const nodes = data.cards.map((c) => toNode(c, c.position ?? pos.get(c.id)!));
  const layout: MapOp[] = loose.length
    ? [{ op: 'moveCards', opId: uuid(), boardId: data.board.id, moves: [...pos].map(([cardId, position]) => ({ cardId, position })) }]
    : [];
  const graph = applyOps({ nodes, edges: data.edges.map(toEdge) }, loadPending(data.board.id, storage()), cache);
  return { graph, layout };
}

/** Connections per card; returns `prev` when nothing changed so the node context (and every node) stays put. */
export function countEdges(edges: readonly { source: string; target: string }[], prev?: ReadonlyMap<string, number>): ReadonlyMap<string, number> {
  const next = new Map<string, number>();
  for (const e of edges) {
    next.set(e.source, (next.get(e.source) ?? 0) + 1);
    next.set(e.target, (next.get(e.target) ?? 0) + 1);
  }
  if (prev && prev.size === next.size && [...next].every(([k, v]) => prev.get(k) === v)) return prev;
  return next;
}

/** Panel summary: cards per state and how many are due today. */
export function summarize(nodes: readonly { id: string }[], edges: number, heat: RetrievabilityMap, endOfToday: number): MapSummary {
  const counts: Record<MapState, number> = { review: 0, watch: 0, steady: 0, unknown: 0 };
  let due = 0;
  for (const n of nodes) {
    counts[heatOf(n.id, heat)]++;
    if (isDue(heat[n.id]?.due, endOfToday)) due++;
  }
  return { cards: nodes.length, edges, counts, due };
}

export function MapCanvas({ graph }: { graph: BoardGraph }) {
  return (
    <ReactFlowProvider>
      <Canvas data={graph} />
    </ReactFlowProvider>
  );
}

const layerOptions = (['structure', 'recall', 'coverage'] as const).map((value) => ({ value, label: t(`canvas.layerSwitch.${value}`) }));
const legendLabels = { review: t('mapState.review'), watch: t('mapState.watch'), steady: t('mapState.steady'), unknown: t('mapState.unknown') };

function Canvas({ data }: { data: BoardGraph }) {
  const board = data.board;
  const rf = useReactFlow<CardNode, LinkEdge>();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const mode: Mode = search.get('modo') === 'desafio' ? 'challenge' : 'explore';
  const { state: chState, ensure: ensureChallenge, reset: resetChallenge } = useChallenge();
  // `?sessao=diaria`: the daily queue (Revisar), which moves from map to map; otherwise a session of this board
  const scope = useMemo<Scope>(() => (search.get('sessao') === 'diaria' ? { kind: 'daily' } : { kind: 'board', boardId: data.board.id }), [search, data.board.id]);
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
  const [layer, setLayer] = useState<NodeLayer>('recall');
  const [retrievability, setRetrievability] = useState<RetrievabilityMap>({});
  const [coverage, setCoverage] = useState<CoverageRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MapOp[] | null>(null);
  const [labelEdit, setLabelEdit] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [tool, setToolState] = useState<Tool>('select');
  const [endOfToday] = useState(() => endOfDay());
  const linkFrom = useRef<string | null>(null); // "Ligar" tool: first card clicked
  const setTool = useCallback((next: Tool) => {
    linkFrom.current = null;
    setToolState(next);
  }, []);

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

  // Any error = every card "Sem revisões" (D-039). Reloaded after each rating of the challenge.
  const loadHeat = useCallback(() => {
    let live = true;
    api<RetrievabilityMap>(`/v1/review/retrievability?boardId=${board.id}`)
      .then((r) => live && setRetrievability(r.ok ? r.data : {}))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [board.id]);
  useEffect(() => loadHeat(), [loadHeat]);

  // Camada Cobertura + panel summary (D-081). Board without matrix item: nothing to fetch.
  useEffect(() => {
    if (!board.matrixItemId) return;
    let live = true;
    api<CoverageRow[]>('/v1/coverage')
      .then((r) => live && r.ok && setCoverage(r.data.find((row) => row.matrixItemId === board.matrixItemId) ?? null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [board.matrixItemId]);

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
      setEditing((cur) => (cur === id ? cur : null));
    },
    [setGraph],
  );

  /** F02: select and open the card editor in the panel. */
  const openCard = useCallback(
    (id: string) => {
      select(id);
      setEditing(id);
    },
    [select],
  );

  const closeEditor = useCallback(() => setEditing(null), []);

  /** A card created on the map only exists server-side once its createCard op is sent: wait for it before GET/PUT. */
  const prepareCard = useCallback(
    (cardId: string) => queue.current?.sent((o) => o.op === 'createCard' && o.card.id === cardId) ?? Promise.resolve(false),
    [],
  );

  /** F02: reflect a saved card on the map at once; not a map op, so nothing is queued or undoable. */
  const onCardSaved = useCallback(
    (d: CardDetail, input: SaveCardInput) => {
      primeCardDetail(d);
      setGraph(patchCard(g.current, cache.current, d.id, { title: d.title, front: d.front, back: d.back, source: d.source, preview: d.preview ?? previewOf(input) }));
    },
    [setGraph],
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
        // centre of the free area (left of the 340 px panel)
        const c = rf.screenToFlowPosition({ x: (r?.left ?? 0) + Math.max(0, (r?.width ?? 0) - 380) / 2, y: (r?.top ?? 0) + (r?.height ?? 0) / 2 });
        p = { x: c.x - CARD_W / 2, y: c.y - CARD_H / 2 };
      }
      // toolbar cards all start at the same spot: slide along the grid until no other card sits (mostly) on it
      let pos = snapPos(p);
      const taken = (q: XYPosition) => g.current.nodes.some((n) => Math.abs(n.position.x - q.x) < CARD_W - 16 && Math.abs(n.position.y - q.y) < CARD_H - 16);
      for (let i = 0; i < 50 && !at && taken(pos); i++) pos = snapPos({ x: pos.x + CARD_W + 32, y: pos.y + (i % 2 ? CARD_H + 32 : 0) });
      const id = uuid();
      const first = g.current.nodes.length === 0;
      commit([{ op: 'createCard', opId: uuid(), boardId: board.id, card: { id, type, title: t(`map.newCardTitle.${type}`), position: pos } }]);
      track('card_created', { type, origin: 'manual' });
      openCard(id);
      if (first) void rf.fitView({ ...FIT, duration: 200 }); // RF waits for the new node to be measured
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
    const pos = autoLayout(nodes.map((n) => ({ id: n.id, height: n.measured?.height ?? NODE_H[n.data.card.type] })), edges);
    const moves = nodes.flatMap((n) => {
      const p = pos.get(n.id)!;
      return p.x !== n.position.x || p.y !== n.position.y ? [{ cardId: n.id, position: p }] : [];
    });
    if (!moves.length) return;
    commit([{ op: 'moveCards', opId: uuid(), boardId: board.id, moves }]);
    requestAnimationFrame(() => void rf.fitView({ ...FIT, duration: 300 }));
  }, [board.id, commit, rf]);

  /** Deletes cards/edges; asks first when a card still has connections (they go too). */
  const remove = useCallback((cardIds: string[], edgeIds: string[]) => {
    const { edges } = g.current;
    const ops: MapOp[] = [];
    if (edgeIds.length) ops.push({ op: 'deleteEdges', opId: uuid(), boardId: board.id, edgeIds });
    if (cardIds.length) ops.push({ op: 'deleteCards', opId: uuid(), boardId: board.id, cardIds });
    if (!ops.length) return;
    const ids = new Set(cardIds);
    const connected = edges.some((e) => !edgeIds.includes(e.id) && (ids.has(e.source) || ids.has(e.target)));
    if (connected) setConfirmDelete(ops);
    else commit(ops);
  }, [board.id, commit]);

  const deleteSelection = useCallback(() => {
    const { nodes, edges } = g.current;
    remove(nodes.filter((n) => n.selected).map((n) => n.id), edges.filter((e) => e.selected).map((e) => e.id));
  }, [remove]);

  const deleteCard = useCallback((id: string) => remove([id], []), [remove]);

  const step = useCallback(
    (dir: 'undo' | 'redo') => {
      const r = (dir === 'undo' ? undo : redo)(history.current, uuid);
      if (!r) return;
      history.current = r.history;
      commit(freshen(r.ops, cache.current, g.current), { record: false });
    },
    [commit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'k' && !inDialog(e.target)) { // ⌘K works while typing too, like the mock
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (isTyping(e.target) || inDialog(e.target) || confirmDelete) return;
      if (e.key === 'Escape' && tool === 'connect') {
        setTool('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
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
  }, [confirmDelete, deleteSelection, step, tool, setTool]);

  const onDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.classList.contains('react-flow__pane')) return;
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      createCard('concept', { x: p.x - CARD_W / 2, y: p.y - 24 });
    },
    [createCard, rf],
  );

  /** Double-click a card = open it in the editor (the panel menu "Editar card" is the keyboard path). */
  const onNodeDoubleClick = useCallback<NodeMouseHandler<CardNode>>((_e, node) => openCard(node.id), [openCard]);

  const changeLayer = useCallback((next: NodeLayer) => {
    setLayer(next);
    track('heat_toggled', { enabled: next === 'recall' });
  }, []);

  const setMode = useCallback(
    (m: Mode) => {
      if (m === 'explore') resetChallenge(); // leaving the challenge drops the session; entering always starts a fresh one
      router.replace(m === 'challenge' ? `${pathname}?modo=desafio` : pathname, { scroll: false });
    },
    [router, pathname, resetChallenge],
  );

  const retry = useCallback(() => {
    if (queue.current?.status().dropped) window.location.reload(); // the API rejected edits: resync with the server
    else void queue.current?.retry();
  }, []);

  /** "Ligar dois cards": click the source card, then the target. */
  const onNodeClick = useCallback<NodeMouseHandler<CardNode>>(
    (_e, node) => {
      const from = linkFrom.current;
      if (!from || from === node.id) {
        linkFrom.current = node.id;
        return;
      }
      linkFrom.current = null;
      onConnect({ source: from, target: node.id, sourceHandle: null, targetHandle: null });
    },
    [onConnect],
  );

  const enterChallenge = useCallback(() => setMode('challenge'), [setMode]);
  const reviewCard = enterChallenge; // ponytail: the session picks its items; F04 has no per-card session

  const goToCard = useCallback(
    (id: string) => {
      select(id);
      const n = g.current.nodes.find((x) => x.id === id);
      if (n) void rf.setCenter(n.position.x + CARD_W / 2, n.position.y + NODE_H[n.data.card.type] / 2, { zoom: Math.max(rf.getZoom(), 1), duration: 300 });
    },
    [rf, select],
  );

  useEffect(() => {
    if (mode === 'challenge') ensureChallenge(scope);
  }, [mode, scope, ensureChallenge]);
  const current = mode === 'challenge' && chState.phase === 'running' ? chState.items.find((i) => i.id === chState.queue[0]) : undefined;
  const quiz = useMemo(() => quizView(current, graph), [current, graph]);
  // the camera follows the tested card only when it is not already in the free area (the mock keeps the editor framing)
  const currentCard = quiz?.cardId;
  useEffect(() => {
    const n = currentCard ? g.current.nodes.find((x) => x.id === currentCard) : undefined;
    const pane = wrap.current?.getBoundingClientRect();
    if (!n || !pane) return;
    const h = NODE_H[n.data.card.type];
    const a = rf.flowToScreenPosition(n.position);
    const b = rf.flowToScreenPosition({ x: n.position.x + CARD_W, y: n.position.y + h });
    // same free area as FIT: below the layers bar, above the toolbar, left of the panel
    const visible = a.x >= pane.left + 64 && a.y >= pane.top + 120 && b.x <= pane.right - 432 && b.y <= pane.bottom - 200;
    if (!visible) void rf.setCenter(n.position.x + CARD_W / 2 + 190, n.position.y + h / 2, { zoom: 1, duration: 300 });
  }, [currentCard, rf]);

  const edgeCountsRef = useRef<ReadonlyMap<string, number>>(new Map());
  const edgeCounts = useMemo(() => (edgeCountsRef.current = countEdges(graph.edges, edgeCountsRef.current)), [graph.edges]);
  const ctx = useMemo<CanvasCtx>(
    () => ({
      layer, challenge: mode === 'challenge', quiz, heat: retrievability, edgeCounts, coverageItem: coverage?.title ?? null, endOfToday,
      selectCard: select, editLabel: setLabelEdit, prepare: prepareCard,
    }),
    [layer, mode, quiz, retrievability, edgeCounts, coverage, endOfToday, select, prepareCard],
  );

  const selectedNodes = graph.nodes.filter((n) => n.selected);
  const selected = selectedNodes.length === 1 ? selectedNodes[0]!.data.card : null;
  const titles = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n.data.card.title])), [graph.nodes]);
  const connections = useMemo<PanelConnection[]>(
    () =>
      selected
        ? graph.edges.flatMap((e): PanelConnection[] =>
            e.source === selected.id ? [{ id: e.id, dir: 'out' as const, title: titles.get(e.target) ?? '', label: e.data?.label ?? null }]
            : e.target === selected.id ? [{ id: e.id, dir: 'in' as const, title: titles.get(e.source) ?? '', label: e.data?.label ?? null }]
            : [],
          )
        : [],
    [selected, graph.edges, titles],
  );
  const summary = useMemo(() => summarize(graph.nodes, graph.edges.length, retrievability, endOfToday), [graph.nodes, graph.edges.length, retrievability, endOfToday]);

  const commands = useMemo<CommandItem[]>(
    () => [
      ...(['concept', 'flow', 'image', 'case'] as const).map((type) => {
        const k = ({ concept: 'newConcept', flow: 'newFlow', image: 'newImage', case: 'newCase' } as const)[type];
        return { id: `create:${type}`, group: t('palette.groups.create'), label: t(`palette.${k}.label`), hint: t(`palette.${k}.hint`) };
      }),
      ...(['link', 'organize', 'challenge'] as const).map((k) => ({ id: `map:${k}`, group: t('palette.groups.map'), label: t(`palette.${k}.label`), hint: t(`palette.${k}.hint`) })),
      ...(['structure', 'recall', 'coverage'] as const).map((k) => ({ id: `layer:${k}`, group: t('palette.groups.layers'), label: t(`palette.${k}.label`), hint: t(`palette.${k}.hint`) })),
      ...graph.nodes.map((n) => ({ id: `card:${n.id}`, group: t('palette.groups.cards'), label: n.data.card.title, hint: t('palette.card') })),
      ...(['home', 'maps', 'newMap', 'review'] as const).map((k) => ({ id: `go:${k}`, group: t('palette.groups.goTo'), label: t(`palette.${k}.label`), hint: t(`palette.${k}.hint`) })),
    ],
    [graph.nodes],
  );
  const runCommand = useCallback(
    (c: CommandItem) => {
      const [kind, arg = ''] = c.id.split(/:(.*)/s);
      if (kind === 'create') createCard(arg as CardType);
      else if (kind === 'layer') changeLayer(arg as NodeLayer);
      else if (kind === 'card') goToCard(arg);
      else if (c.id === 'map:link') setTool('connect');
      else if (c.id === 'map:organize') organize();
      else if (c.id === 'map:challenge') setMode('challenge');
      else router.push(({ home: '/', maps: '/mapas', newMap: '/mapas/novo', review: '/revisar' } as Record<string, string>)[arg] ?? '/');
    },
    [changeLayer, createCard, goToCard, organize, router, setMode, setTool],
  );

  const tools = useMemo<ToolbarItem[]>(
    () => [
      { id: 'select', icon: 'cursor', label: t('canvas.toolbar.select'), pressed: tool === 'select' },
      { id: 'move', icon: 'move', label: t('canvas.toolbar.move'), pressed: tool === 'move' },
      { separator: true },
      { id: 'concept', icon: 'plus', label: t('editor.addCardConcept') },
      { id: 'flow', icon: 'flow', label: t('editor.addCardFlow') },
      { id: 'image', icon: 'image', label: t('editor.addCardImage') },
      { id: 'case', icon: 'case', label: t('editor.addCardCase') },
      { separator: true },
      { id: 'connect', icon: 'link', label: t('canvas.toolbar.connect'), pressed: tool === 'connect' },
      { id: 'organize', icon: 'tidy', label: t('canvas.toolbar.organize') },
    ],
    [tool],
  );
  const onTool = useCallback(
    (id: string) => {
      if (id === 'select' || id === 'move' || id === 'connect') setTool(id);
      else if (id === 'organize') organize();
      else createCard(id as CardType);
    },
    [createCard, organize, setTool],
  );

  const editedEdge = labelEdit ? graph.edges.find((e) => e.id === labelEdit) : undefined;

  return (
    // The shell <main> pads its children: bleed to the edges (rail on the left), full viewport height.
    <div className="relative -m-4 flex h-[calc(100dvh-80px)] min-h-[480px] flex-col bg-canvas md:-m-6 md:h-dvh">
      <CanvasHeader board={board} status={status} onRetry={retry} mode={mode} onMode={setMode} onPalette={() => setPalette(true)} />
      <section
        ref={wrap}
        aria-label={t('map.canvasLabel', { title: board.title })}
        className={`relative min-h-0 flex-1 overflow-hidden ${tool === 'connect' ? '[&_.react-flow__node]:cursor-crosshair' : tool === 'move' ? '[&_.react-flow__node]:cursor-grab' : ''}`}
      >
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
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeClick={tool === 'connect' ? onNodeClick : undefined}
            nodesDraggable={tool === 'select'}
            snapToGrid
            snapGrid={[8, 8]}
            selectNodesOnDrag={false}
            deleteKeyCode={null}
            selectionKeyCode="Shift"
            multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
            zoomOnDoubleClick={false}
            panOnScroll
            zoomActivationKeyCode={['Meta', 'Control']}
            minZoom={ZOOM_MIN}
            maxZoom={ZOOM_MAX}
            onlyRenderVisibleElements={graph.nodes.length > VIRTUALIZE_ABOVE}
            ariaLabelConfig={ariaLabelConfig}
            // only on load: an empty map fits once its first card exists (createCard)
            fitView={init.graph.nodes.length > 0}
            fitViewOptions={FIT}
            proOptions={proOptions}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--grid-dot)" bgColor="#fbfafe" />
          </ReactFlow>
        </CanvasContext.Provider>
        {/* D-0xx T5: the legend follows the layer bar (the mock's fixed left: 400px covered "Cobertura"). */}
        <div className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-3 [&>*]:pointer-events-auto">
          <LayerSwitch label={t('editor.layers')} options={layerOptions} value={layer} onChange={changeLayer} />
          {layer === 'recall' && mode === 'explore' ? <Legend labels={legendLabels} aria-label={t('canvas.legend')} /> : null}
        </div>
        <div className="pointer-events-none absolute bottom-6 left-5 z-10 flex items-end gap-[23px] [&>*]:pointer-events-auto">
          <Zoom />
          <CanvasToolbar aria-label={t('canvas.toolbar.label')} items={tools} onSelect={onTool} />
        </div>
        <div className="absolute bottom-5 right-5 top-5 z-10">
          <Inspector
            board={board}
            challengePanel={
              mode === 'challenge' ? (
                <ChallengePanel scope={scope} boardId={board.id} heat={retrievability} onExit={() => setMode('explore')} onRated={loadHeat} />
              ) : null
            }
            summary={summary}
            coverage={coverage ? { pct: Math.round(coverage.coverage), item: coverage.title } : null}
            card={selected}
            entry={selected ? retrievability[selected.id] : undefined}
            connections={connections}
            endOfToday={endOfToday}
            editing={!!selected && editing === selected.id}
            onEdit={openCard}
            onClose={closeEditor}
            onSaved={onCardSaved}
            prepare={prepareCard}
            onDeselect={() => select(null)}
            onDelete={deleteCard}
            onChallenge={enterChallenge}
            onReviewCard={reviewCard}
          />
        </div>
      </section>
      <CommandPalette
        open={palette}
        onOpenChange={setPalette}
        title={t('editor.commandPalette')}
        inputLabel={t('palette.placeholder')}
        placeholder={t('editor.searchLabel')}
        escText={t('palette.esc')}
        emptyText={t('palette.notFound')}
        items={commands}
        onSelect={runCommand}
      />
      <Dialog
        open={!!editedEdge}
        onOpenChange={(o) => !o && setLabelEdit(null)}
        title={t('canvas.edgeDialog')}
        description={t('canvas.edgeDialogBody')}
        closeLabel={t('common.close')}
      >
        {editedEdge ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const v = String(new FormData(e.currentTarget).get('label') ?? '').trim().slice(0, 120) || null;
              if (v !== (editedEdge.data?.label ?? null)) saveLabel(editedEdge.id, v);
              setLabelEdit(null);
            }}
          >
            <Input name="label" label={t('map.edge.labelInput')} defaultValue={editedEdge.data?.label ?? ''} maxLength={120} autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setLabelEdit(null)}>{t('common.cancel')}</Button>
              <Button type="submit">{t('common.save')}</Button>
            </div>
          </form>
        ) : null}
      </Dialog>
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

const proOptions = { hideAttribution: true }; // D-073: attribution moved out of the canvas corner (see Pendências)
const zoomOf = (s: ReactFlowState) => s.transform[2];

/** Zoom 60–140% in 10% steps (ZoomControl v2); "Ajustar" fits the map. Re-renders only on zoom change. */
const Zoom = memo(function Zoom() {
  const rf = useReactFlow();
  const zoom = useStore(zoomOf);
  return (
    <ZoomControl
      aria-label={t('canvas.zoom.controls')}
      percent={t('canvas.zoom.percent', { n: Math.round(zoom * 100) })}
      zoomOutLabel={t('canvas.zoom.out')}
      zoomInLabel={t('canvas.zoom.in')}
      fitText={t('canvas.fitShort')}
      canZoomOut={zoom > ZOOM_MIN + 0.001}
      canZoomIn={zoom < ZOOM_MAX - 0.001}
      onZoomOut={() => void rf.zoomTo(stepZoom(zoom, -1), { duration: 150 })}
      onZoomIn={() => void rf.zoomTo(stepZoom(zoom, 1), { duration: 150 })}
      onFit={() => void rf.fitView({ ...FIT, duration: 200 })}
    />
  );
});
