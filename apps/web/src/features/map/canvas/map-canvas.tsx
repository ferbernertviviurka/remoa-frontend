'use client';

import '@xyflow/react/dist/style.css';
import './editor.css';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  applyEdgeChanges, applyNodeChanges, Background, BackgroundVariant, ConnectionMode, ReactFlow, ReactFlowProvider, useReactFlow, useStore,
  type Connection, type EdgeChange, type FitViewOptions, type NodeChange, type NodeMouseHandler, type OnConnectEnd, type ReactFlowInstance, type ReactFlowState,
  type XYPosition,
} from '@xyflow/react';
import {
  CARD_SIZE_MAX, CARD_SIZE_MIN, CHALLENGE_MIN_CARDS, MAX_CARDS_PER_BOARD, type BoardGraph, type ChallengeOptions, type CardDetail, type CardShape, type CardStudyAction, type CardStudyState, type CardSize, type CardType, type CoverageRow, type MapOp, type MatrixItem, type RetrievabilityMap, type SaveCardInput,
} from '@remoa/contracts';
import { t } from '@remoa/strings';
import {
  Button, CanvasToolbar, Dialog, Input, LayerSwitch, Legend, stepZoom, ZOOM_MAX, ZOOM_MIN, ZoomControl,
  useToast, type CommandItem, type NodeLayer, type ToolbarItem,
} from '@remoa/ui';
import { previewOf } from '@/features/cards/draft';
import { rememberBoard, track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { usePaywall } from '@/features/billing/paywall';
import { CanvasContext, endOfDay, isDue, type CanvasCtx } from './canvas-context';
import { ChallengePanel } from '@/features/challenge/challenge-panel';
import { useChallenge, type Scope } from '@/features/challenge/provider';
import { MatrixLinkButton } from '@/features/coverage/matrix-suggestions';
import { CanvasHeader, type Mode } from './canvas-header';
import { primeCardDetail } from './card-detail';
import { CardNodeView, FocusCard } from './card-node';
import { applyOps, freshen, invertAll, patchCard, snapPos, type CardCache, type CardNode, type Graph, type LinkEdge } from './graph';
import { emptyHistory, push, redo, undo, type History } from './history';
import { Inspector, type Connection as PanelConnection } from './inspector';
import { autoLayout, CARD_H, CARD_W, sizeOf } from './layout';
import { LinkEdgeView } from './link-edge';
import { quizView } from './quiz-view';
import { ChallengeSetupDialog } from '@/features/challenge/setup-dialog';
import { maybeShowChallengeTour } from '@/features/challenge/tour';
import { usePaletteCommands } from '@/features/shell/command-palette';
import { createOpQueue, type OpQueue, type QueueStatus } from './op-queue';
import { initialGraph, storage } from './initial-graph';
import { challengeZoom } from './challenge-camera';
import { cameraMove } from '../mobile/canvas/view';

const nodeTypes = { card: CardNodeView };
const edgeTypes = { link: LinkEdgeView };
const uuid = () => crypto.randomUUID();
const VIRTUALIZE_ABOVE = 150;
/** Below `md` the editor is the phone layout: compact header, panel as a bottom sheet (G02). */
const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
/**
 * Touch screens review, not edit (DESIGN): cards don't drag there, so a pinch or pan that starts on a card moves the map (P-083).
 * G04: only touch-first devices; a laptop with a touchscreen or pen can report `pointer: coarse` and must keep the drag.
 */
const TOUCH_ONLY = '(hover: none) and (pointer: coarse)';
const isTouch = () => typeof window !== 'undefined' && window.matchMedia(TOUCH_ONLY).matches;
type Insets = { top: number; left: number; right: number; bottom: number };
/**
 * Free area of the canvas: clear of the floating controls (layer bar on top, zoom/toolbar below) and of the card panel
 * (340 px on the right; bottom sheet on the phone), which only exists while a card is selected (D-098).
 * A map that fits at 100% lands where the mock draws it (top 120, left 64).
 */
function freeArea(panel: boolean, paneHeight = 0, challenge = false): Insets {
  if (isPhone()) return { top: challenge ? 16 : 72, left: 16, right: 16, bottom: panel ? Math.round(paneHeight * 0.55) + 16 : 96 };
  return { top: 120, left: 64, right: panel ? 432 : 64, bottom: 200 };
}
const fitOptions = (panel: boolean): FitViewOptions => {
  const a = freeArea(panel, 0);
  return { padding: { top: `${a.top}px`, left: `${a.left}px`, bottom: `${a.bottom}px`, right: `${a.right}px` }, maxZoom: 1, minZoom: ZOOM_MIN };
};
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
/** Zoom to `k` keeping the screen point (clientX/Y) still: Safari's pinch (gesture events) and pinches over the floating pieces. */
function zoomAt(rf: Pick<ReactFlowInstance, 'getViewport' | 'setViewport'>, el: Element, clientX: number, clientY: number, k: number) {
  const r = el.getBoundingClientRect();
  const { x, y, zoom } = rf.getViewport();
  const next = clampZoom(k);
  const px = clientX - r.left;
  const py = clientY - r.top;
  void rf.setViewport({ x: px - ((px - x) * next) / zoom, y: py - ((py - y) * next) / zoom, zoom: next });
}
type Tool = 'select' | 'move' | 'connect';
const notSelf = (c: { source: string; target: string }) => c.source !== c.target;
const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
/** D-202: what the resize handles report → a size the contract accepts (integer px within CARD_SIZE_MIN/MAX). */
export const toCardSize = (d: { width: number; height: number }): CardSize => ({
  w: clampInt(d.width, CARD_SIZE_MIN.w, CARD_SIZE_MAX.w),
  h: clampInt(d.height, CARD_SIZE_MIN.h, CARD_SIZE_MAX.h),
});
/** Card types created from the toolbar / palette, in menu order (G06 item 6). */
const CREATE_TYPES = ['concept', 'note', 'flow', 'case', 'image'] as const;
const createIcon = { concept: 'plus', note: 'file', flow: 'flow', case: 'case', image: 'image' } as const;
const createLabel = { concept: 'editor.addCardConcept', note: 'editor.addCardNote', flow: 'editor.addCardFlow', case: 'editor.addCardCase', image: 'editor.addCardImage' } as const;
const createCommand = { concept: 'newConcept', note: 'newNote', flow: 'newFlow', image: 'newImage', case: 'newCase' } as const;

const ariaLabelConfig = {
  'node.a11yDescription.default': t('map.a11y.node'),
  'node.a11yDescription.keyboardDisabled': t('map.a11y.nodeKeyboard'),
  'node.a11yDescription.ariaLiveMessage': ({ x, y }: { x: number; y: number }) => t('map.a11y.moved', { x, y }),
  'edge.a11yDescription.default': t('map.a11y.edge'),
  'handle.ariaLabel': t('map.a11y.handle'),
};

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
/** Keys inside a dialog (e.g. Delete in the mask editor) belong to the dialog, never to the canvas. */
const inDialog = (el: EventTarget | null) => el instanceof Element && !!el.closest('[role="dialog"]');

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

/** Cards due today (header CTA "Desafiar os N que vencem hoje"). */
export const countDue = (nodes: readonly { id: string }[], heat: RetrievabilityMap, endOfToday: number) =>
  nodes.reduce((n, c) => n + (isDue(heat[c.id]?.due, endOfToday) ? 1 : 0), 0);

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
  const paywall = usePaywall();
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
  /** D-202: size and position of each card being resized, as they were when the handle was grabbed (the undo). */
  const resizeStart = useRef(new Map<string, { size: CardSize | null; position: XYPosition }>());
  const draggedAt = useRef(-Infinity); // last drag that moved a card: its trailing dblclick is not "edit" (G04)
  const [layer, setLayer] = useState<NodeLayer>('recall');
  const [retrievability, setRetrievability] = useState<RetrievabilityMap>({});
  const [coverage, setCoverage] = useState<CoverageRow | null>(null);
  const [matrixItemId, setMatrixItemId] = useState(board.matrixItemId); // F07: set in place by a one-click link
  const [confirmDelete, setConfirmDelete] = useState<MapOp[] | null>(null);
  const [labelEdit, setLabelEdit] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [chOptions, setChOptions] = useState<ChallengeOptions | undefined>(undefined);
  const [editing, setEditing] = useState<string | null>(null);
  const [tool, setToolState] = useState<Tool>('select');
  const [touch] = useState(isTouch); // canvas is client-only (lazy, ssr: false), so no hydration mismatch
  const [endOfToday] = useState(() => endOfDay());
  const [linkFrom, setLinkFromState] = useState<string | null>(null); // "Ligar" tool: first card clicked
  const linkFromRef = useRef<string | null>(null);
  const setLinkFrom = useCallback((id: string | null) => {
    linkFromRef.current = id;
    setLinkFromState(id);
  }, []);
  const setTool = useCallback((next: Tool) => {
    setLinkFrom(null);
    setToolState(next);
  }, [setLinkFrom]);

  // --- autosave queue ---------------------------------------------------------
  useEffect(() => {
    const q = createOpQueue({
      boardId: board.id,
      send: async (ops) => {
        const r = await api<{ applied: string[] }>('/v1/boards/ops', { method: 'POST', body: JSON.stringify({ ops }) });
        if (!r.ok) paywall.handle(r.error); // 402: card quota; the queue drops the batch (dropped status)
        return r;
      },
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
  }, [board.id, init, paywall]);

  const opened = useRef(false);
  useEffect(() => {
    rememberBoard(board.id, board.area);
    return () => rememberBoard(null);
  }, [board.id, board.area]);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    rememberBoard(board.id, board.area);
    track('board_opened', { cards: data.cards.length, edges: data.edges.length });
  }, [data, board.id, board.area]);

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

  /** F03 FR-9: suspended flag on the node/cache; "reiniciar" drops the FSRS state, so the heat is reloaded. Not a map op. */
  const onCardStudy = useCallback(
    (st: CardStudyState, action: CardStudyAction) => {
      setGraph(patchCard(g.current, cache.current, st.cardId, { suspendedAt: st.suspendedAt }));
      if (action === 'reset') loadHeat();
    },
    [setGraph, loadHeat],
  );

  // Camada Cobertura + panel summary (D-081). Board without matrix item: nothing to fetch.
  useEffect(() => {
    if (!matrixItemId) return;
    let live = true;
    api<CoverageRow[]>('/v1/coverage')
      .then((r) => live && r.ok && setCoverage(r.data.find((row) => row.matrixItemId === matrixItemId) ?? null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [matrixItemId]);

  /** F07: one click links the map to a suggested matrix item; coverage reloads through the effect above. */
  const linkMatrix = useCallback(
    async (item: MatrixItem) => {
      try {
        const r = await api('/v1/matrix/links', { method: 'POST', body: JSON.stringify({ boardId: board.id, matrixItemId: item.id }) });
        if (!r.ok) throw new Error(r.error.code);
        track('board_linked_to_matrix', { count: 1, suggestedCount: 1 });
        setMatrixItemId(item.id);
      } catch {
        toast({ title: t('editor.linkError'), tone: 'danger' });
      }
    },
    [board.id, toast],
  );

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
      setGraph(
        patchCard(g.current, cache.current, d.id, {
          title: d.title, shape: d.shape, front: d.front, frontAssetId: d.frontAssetId, back: d.back, source: d.source, preview: d.preview ?? previewOf(input),
        }),
      );
    },
    [setGraph],
  );

  /** G04: shape preview while the editor autosaves it (and the rollback); sizeOf/nodeSize follow `card.shape`. */
  const onCardShape = useCallback(
    (id: string, shape: CardShape) => setGraph(patchCard(g.current, cache.current, id, { shape })),
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
      if (first) void rf.fitView({ ...fitOptions(true), duration: 200 }); // RF waits for the new node to be measured
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
      // D-202: the resize handles send `dimensions` changes with `resizing` (+ a position change from a top/left corner).
      // They become `card.size` (what the NodeCard draws), never node.width/height, so undo/reload/layout read one source.
      const live = new Map<string, CardSize>();
      const ended: string[] = [];
      for (const c of changes) {
        if (c.type !== 'dimensions' || c.resizing === undefined || !c.dimensions) continue;
        const node = before.nodes.find((n) => n.id === c.id);
        if (!node) continue;
        if (!resizeStart.current.has(c.id)) resizeStart.current.set(c.id, { size: node.data.card.size, position: node.position });
        live.set(c.id, toCardSize(c.dimensions));
        if (!c.resizing) ended.push(c.id);
      }
      for (const c of changes) {
        if (c.type !== 'position' || !c.position || resizeStart.current.has(c.id)) continue;
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
      const kept = live.size ? changes.filter((c) => !(c.type === 'dimensions' && c.resizing !== undefined)) : changes;
      let nodes = applyNodeChanges(kept, before.nodes);
      if (live.size) nodes = nodes.map((n) => (live.has(n.id) ? { ...n, data: { card: { ...n.data.card, size: live.get(n.id)! } } } : n));
      setGraph({ ...before, nodes });
      // pressing a card selects it (React Flow, selectNodesOnDrag): the editor stays open only for the card it belongs to
      if (changes.some((c) => c.type === 'select')) setEditing((cur) => (cur && nodes.some((n) => n.id === cur && n.selected) ? cur : null));
      if (moves.length) {
        draggedAt.current = performance.now();
        commit([{ op: 'moveCards', opId: uuid(), boardId: board.id, moves }], {
          undo: [{ op: 'moveCards', opId: uuid(), boardId: board.id, moves: undoMoves }],
        });
      }
      for (const id of ended) {
        const start = resizeStart.current.get(id)!;
        resizeStart.current.delete(id);
        const n = nodes.find((x) => x.id === id);
        if (!n) continue;
        const size = live.get(id)!;
        const position = snapPos(n.position);
        const same = (a: CardSize | null, b: CardSize | null) => a?.w === b?.w && a?.h === b?.h;
        const moved = position.x !== start.position.x || position.y !== start.position.y;
        if (same(start.size, size) && !moved) continue;
        const base = { boardId: board.id };
        draggedAt.current = performance.now(); // the dblclick that may follow a resize is not "edit"
        commit(
          [
            { ...base, op: 'resizeCards', opId: uuid(), sizes: [{ cardId: id, size }] },
            ...(moved ? [{ ...base, op: 'moveCards' as const, opId: uuid(), moves: [{ cardId: id, position }] }] : []),
          ],
          {
            undo: [
              { ...base, op: 'resizeCards', opId: uuid(), sizes: [{ cardId: id, size: start.size }] },
              ...(moved ? [{ ...base, op: 'moveCards' as const, opId: uuid(), moves: [{ cardId: id, position: start.position }] }] : []),
            ],
          },
        );
      }
    },
    [board.id, commit, setGraph],
  );

  /** D-202: card menu "Restaurar tamanho padrão" (size null), undoable like any map op. */
  const resetSize = useCallback(
    (id: string) => commit([{ op: 'resizeCards', opId: uuid(), boardId: board.id, sizes: [{ cardId: id, size: null }] }]),
    [board.id, commit],
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

  /**
   * G02: a drag from a port that ends on another card's body (not on its 14 px port) connects too; React Flow alone
   * only connects within `connectionRadius` of a port. Direction follows the port the drag started from.
   */
  const onConnectEnd = useCallback<OnConnectEnd>(
    (e, state) => {
      if (state.isValid || !state.fromNode) return;
      const pt = 'changedTouches' in e ? e.changedTouches[0] : e;
      const el = pt ? document.elementFromPoint(pt.clientX, pt.clientY) : null;
      const other = el?.closest<HTMLElement>('.react-flow__node')?.dataset.id;
      if (!other || other === state.fromNode.id) return;
      const from = state.fromNode.id;
      onConnect(state.fromHandle?.type === 'target' ? { source: other, target: from, sourceHandle: null, targetHandle: null } : { source: from, target: other, sourceHandle: null, targetHandle: null });
    },
    [onConnect],
  );

  const organize = useCallback(() => {
    const { nodes, edges } = g.current;
    const pos = autoLayout(nodes.map((n) => ({ id: n.id, width: n.measured?.width ?? sizeOf(n.data.card).w, height: n.measured?.height ?? sizeOf(n.data.card).h })), edges);
    const moves = nodes.flatMap((n) => {
      const p = pos.get(n.id)!;
      return p.x !== n.position.x || p.y !== n.position.y ? [{ cardId: n.id, position: p }] : [];
    });
    if (!moves.length) return;
    commit([{ op: 'moveCards', opId: uuid(), boardId: board.id, moves }]);
    requestAnimationFrame(() => void rf.fitView({ ...fitOptions(g.current.nodes.some((n) => n.selected)), duration: 300 }));
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
      if (isTyping(e.target) || inDialog(e.target) || confirmDelete) return;
      if (e.key === 'Escape') {
        // D-098: Esc closes the card panel (deselects); in "Ligar" it first drops the tool
        if (tool === 'connect') setTool('select');
        else if (g.current.nodes.some((n) => n.selected)) select(null);
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
  }, [confirmDelete, deleteSelection, step, tool, setTool, select]);

  const onDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.classList.contains('react-flow__pane')) return;
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      createCard('concept', { x: p.x - CARD_W / 2, y: p.y - 24 });
    },
    [createCard, rf],
  );

  /** Double-click a card = open it in the editor (the panel menu "Editar card" is the keyboard path). */
  const onNodeDoubleClick = useCallback<NodeMouseHandler<CardNode>>((_e, node) => {
    // a click and then a quick press-and-drag (or a trackpad tap-and-drag) ends in a dblclick: that was a move, not an edit
    if (performance.now() - draggedAt.current < 500) return;
    openCard(node.id);
  }, [openCard]);

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
  // G14 D-603/D-604: a board challenge needs CHALLENGE_MIN_CARDS live, non-note, active cards, and starts from the options dialog.
  // Direct links (`?modo=desafio` from Hoje, Progresso…) start with the defaults; the server re-checks the minimum (422).
  const challengeable = useMemo(() => graph.nodes.reduce((n, x) => n + (x.data.card.type !== 'note' && !x.data.card.suspendedAt ? 1 : 0), 0), [graph.nodes]);
  const missing = scope.kind === 'board' ? Math.max(0, CHALLENGE_MIN_CARDS - challengeable) : 0;
  const requestMode = useCallback(
    (m: Mode) => {
      if (m === 'explore') return setMode(m);
      if (missing === 0) setSetupOpen(true);
    },
    [setMode, missing],
  );
  const startChallenge = useCallback(
    (o: ChallengeOptions) => {
      setSetupOpen(false);
      setChOptions(o);
      resetChallenge(); // a new choice always starts a fresh session
      setMode('challenge');
    },
    [resetChallenge, setMode],
  );
  useEffect(() => {
    if (board.status === 'private') maybeShowChallengeTour(); // G14 ponto 19: once, on the student's first own map
  }, [board.status]);

  const retry = useCallback(() => {
    if (queue.current?.status().dropped) window.location.reload(); // the API rejected edits: resync with the server
    else void queue.current?.retry();
  }, []);

  /** "Ligar dois cards": click the source card, then the target (the hint above the toolbar says which). */
  const onNodeClick = useCallback<NodeMouseHandler<CardNode>>(
    (_e, node) => {
      const from = linkFromRef.current;
      if (!from || from === node.id) return setLinkFrom(node.id);
      setLinkFrom(null);
      onConnect({ source: from, target: node.id, sourceHandle: null, targetHandle: null });
    },
    [onConnect, setLinkFrom],
  );

  const enterChallenge = useCallback(() => requestMode('challenge'), [requestMode]);
  const reviewCard = enterChallenge; // ponytail: the session picks its items; F04 has no per-card session

  const goToCard = useCallback(
    (id: string) => {
      select(id);
      const n = g.current.nodes.find((x) => x.id === id);
      if (n) {
        const { w, h } = sizeOf(n.data.card);
        void rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: Math.max(rf.getZoom(), 1), duration: 300 });
      }
    },
    [rf, select],
  );

  useEffect(() => {
    if (mode === 'challenge' && missing === 0) ensureChallenge(scope, chOptions);
  }, [mode, scope, ensureChallenge, chOptions, missing]);
  const current = mode === 'challenge' && chState.phase === 'running' ? chState.items.find((i) => i.id === chState.queue[0]) : undefined;
  const quiz = useMemo(() => quizView(current, graph), [current, graph]);
  // D-689: each tested card gets a smooth zoom-in (450 ms, --map-ease; none with reduced motion), unless it is already well framed
  const currentCard = quiz?.cardId;
  useEffect(() => {
    const n = currentCard ? g.current.nodes.find((x) => x.id === currentCard) : undefined;
    const pane = wrap.current?.getBoundingClientRect();
    if (!n || !pane) return;
    const { w, h } = sizeOf(n.data.card);
    const a = rf.flowToScreenPosition(n.position);
    const b = rf.flowToScreenPosition({ x: n.position.x + w, y: n.position.y + h });
    // same free area as the fit: below the layers bar, above the toolbar, clear of the challenge panel
    const f = freeArea(true, pane.height, true);
    const inside = a.x >= pane.left + f.left && a.y >= pane.top + f.top && b.x <= pane.right - f.right && b.y <= pane.bottom - f.bottom;
    const target = challengeZoom({ card: { w, h }, free: { w: pane.width - f.left - f.right, h: pane.height - f.top - f.bottom }, zoom: rf.getZoom(), inside });
    if (target === null) return;
    const k = clampZoom(target);
    // centre of the free area (phone: above the sheet)
    void rf.setCenter(n.position.x + w / 2 + (f.right - f.left) / 2 / k, n.position.y + h / 2 + (f.bottom - f.top) / 2 / k, { zoom: k, ...cameraMove() });
  }, [currentCard, rf]);

  const edgeCountsRef = useRef<ReadonlyMap<string, number>>(new Map());
  const edgeCounts = useMemo(() => (edgeCountsRef.current = countEdges(graph.edges, edgeCountsRef.current)), [graph.edges]);
  const ctx = useMemo<CanvasCtx>(
    () => ({
      layer, challenge: mode === 'challenge', quiz, heat: retrievability, edgeCounts, coverageItem: coverage?.title ?? null, endOfToday,
      selectCard: select, editLabel: setLabelEdit, prepare: prepareCard,
      // D-202 + D-148: resize handles only where cards are edited with a mouse (not on touch, not in the challenge)
      resizable: !touch && mode === 'explore' && tool === 'select',
    }),
    [layer, mode, quiz, retrievability, edgeCounts, coverage, endOfToday, select, prepareCard, touch, tool],
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
  const due = useMemo(() => countDue(graph.nodes, retrievability, endOfToday), [graph.nodes, retrievability, endOfToday]);

  const commands = useMemo<CommandItem[]>(
    () => [
      ...CREATE_TYPES.map((type) => {
        const k = createCommand[type];
        return { id: `create:${type}`, group: t('palette.groups.create'), label: t(`palette.${k}.label`), hint: t(`palette.${k}.hint`) };
      }),
      ...(['link', 'organize', 'challenge'] as const).map((k) => ({ id: `map:${k}`, group: t('palette.groups.map'), label: t(`palette.${k}.label`), hint: t(`palette.${k}.hint`) })),
      ...(['structure', 'recall', 'coverage'] as const).map((k) => ({ id: `layer:${k}`, group: t('palette.groups.layers'), label: t(`palette.${k}.label`), hint: t(`palette.${k}.hint`) })),
      ...graph.nodes.map((n) => ({ id: `card:${n.id}`, group: t('palette.groups.cards'), label: n.data.card.title, hint: t('palette.card') })),
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
      else if (c.id === 'map:challenge') requestMode('challenge');
    },
    [changeLayer, createCard, goToCard, organize, requestMode, setTool],
  );
  usePaletteCommands(commands, runCommand); // D-607: the global ⌘K (navbar) gets this map's commands while it is open

  const tools = useMemo<ToolbarItem[]>(
    () => [
      { id: 'select', icon: 'cursor', label: t('canvas.toolbar.select'), hint: t('canvas.toolbar.hint.select'), pressed: tool === 'select' },
      { id: 'move', icon: 'move', label: t('canvas.toolbar.move'), hint: t('canvas.toolbar.hint.move'), pressed: tool === 'move' },
      { separator: true },
      ...CREATE_TYPES.map((type) => ({ id: type, icon: createIcon[type], label: t(createLabel[type]), hint: t(`canvas.toolbar.hint.${type}`) })),
      { separator: true },
      { id: 'connect', icon: 'link', label: t('canvas.toolbar.connect'), hint: t('canvas.toolbar.hint.connect'), pressed: tool === 'connect' },
      { id: 'organize', icon: 'tidy', label: t('canvas.toolbar.organize'), hint: t('canvas.toolbar.hint.organize') },
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
  const panelOpen = mode === 'challenge' || !!selected; // D-098: no selection, no panel
  const focusNode = quiz ? graph.nodes.find((n) => n.id === quiz.cardId) : undefined;
  const [initialFit] = useState(() => fitOptions(false));
  const fit = useCallback(() => void rf.fitView({ ...fitOptions(g.current.nodes.some((n) => n.selected)), duration: 200 }), [rf]);
  const onPaneClick = useCallback(() => select(null), [select]);

  // G06 item 2: the panel animates in/out (CanvasPanel data-state). Focus goes into it once it has finished opening (the
  // heading, so the screen reader reads the card/question), unless the user already moved focus somewhere on purpose
  // (into the panel, a field). Closing with focus inside returns it to the card that was selected.
  const panelWrap = useRef<HTMLDivElement>(null);
  const lastSelected = useRef<string | null>(null);
  useEffect(() => {
    if (selected) lastSelected.current = selected.id;
  }, [selected]);
  const focusPanel = useCallback(() => {
    const el = document.activeElement;
    if (!panelWrap.current || panelWrap.current.contains(el) || isTyping(el) || inDialog(el)) return;
    const h = panelWrap.current.querySelector<HTMLElement>('aside h2');
    if (!h) return;
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  }, []);
  const wasOpen = useRef(panelOpen);
  useEffect(() => {
    if (wasOpen.current === panelOpen) return;
    wasOpen.current = panelOpen;
    if (panelOpen) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) focusPanel(); // no animation, no animationend
      return;
    }
    if (!panelWrap.current?.contains(document.activeElement)) return;
    const id = lastSelected.current;
    const node = id ? wrap.current?.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(id)}"] button[aria-pressed]`) : null;
    node?.focus({ preventScroll: true });
  }, [panelOpen, focusPanel]);

  // G02 pinch: Chrome/Firefox send a trackpad pinch as ctrl+wheel, which React Flow only hears over its own pane; over the
  // floating pieces it zoomed the whole page. Safari sends gesture events (React Flow ignores them) and zoomed the page too.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let start = 1;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || (e.target instanceof Element && e.target.closest('.react-flow'))) return;
      e.preventDefault();
      zoomAt(rf, el, e.clientX, e.clientY, rf.getZoom() * 2 ** (-e.deltaY * 0.01));
    };
    type Gesture = UIEvent & { scale: number; clientX: number; clientY: number };
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      start = rf.getZoom();
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Gesture;
      zoomAt(rf, el, g.clientX, g.clientY, start * g.scale);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('gesturestart', onGestureStart);
    el.addEventListener('gesturechange', onGestureChange);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('gesturestart', onGestureStart);
      el.removeEventListener('gesturechange', onGestureChange);
    };
  }, [rf]);

  return (
    // The shell <main> pads its children: bleed to the edges (rail on the left), full viewport height.
    // touch-action: the page itself never pinch-zooms here (the map does); panels still scroll.
    <div className="relative -m-4 flex h-[calc(100dvh-80px)] min-h-[480px] flex-col bg-canvas [touch-action:pan-x_pan-y] md:-m-6 md:h-[calc(100dvh-4rem)]">
      <CanvasHeader
        board={board}
        coverage={coverage ? { pct: Math.round(coverage.coverage), item: coverage.title } : null}
        due={due}
        status={status}
        onRetry={retry}
        mode={mode}
        onMode={requestMode}
        missing={missing}
      />
      <section
        ref={wrap}
        aria-label={t('map.canvasLabel', { title: board.title })}
        data-tool={tool}
        data-focus={focusNode ? '' : undefined}
        className="cv-editor relative min-h-0 flex-1 overflow-hidden"
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
            onConnectEnd={onConnectEnd}
            connectionMode={ConnectionMode.Loose}
            isValidConnection={notSelf}
            onDoubleClick={onDoubleClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeClick={tool === 'connect' ? onNodeClick : undefined}
            onPaneClick={onPaneClick}
            nodesDraggable={tool === 'select' && !touch}
            // G04: threshold 0 = the card keeps the exact grab offset. With the default (1 px) React Flow measures the offset at
            // the first move, so a fast drag (or moves coalesced while the panel opens) left the card behind the pointer or still.
            // Pressing a card selects it, as a click would.
            nodeDragThreshold={0}
            snapToGrid
            snapGrid={[8, 8]}
            deleteKeyCode={null}
            selectionKeyCode="Shift"
            multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
            zoomOnDoubleClick={false}
            panOnScroll
            zoomOnPinch
            zoomActivationKeyCode={['Meta', 'Control']}
            minZoom={ZOOM_MIN}
            maxZoom={ZOOM_MAX}
            onlyRenderVisibleElements={graph.nodes.length > VIRTUALIZE_ABOVE}
            ariaLabelConfig={ariaLabelConfig}
            // only on load: an empty map fits once its first card exists (createCard)
            fitView={init.graph.nodes.length > 0}
            fitViewOptions={initialFit}
            proOptions={proOptions}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--grid-dot)" bgColor="#fbfafe" />
          </ReactFlow>
          {focusNode ? <FocusLayer node={focusNode} /> : null}
        </CanvasContext.Provider>
        {/* D-0xx T5: the legend follows the layer bar (the mock's fixed left: 400px covered "Cobertura"). Phone: one scrollable row. */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-3 overflow-x-auto p-4 md:right-auto md:p-5 [&>*]:pointer-events-auto [&>*]:shrink-0 ${
            mode === 'challenge' ? 'max-md:hidden' : '' // phone challenge: the tested card needs the room above the sheet
          }`}
        >
          <LayerSwitch label={t('editor.layers')} options={layerOptions} value={layer} onChange={changeLayer} />
          {layer === 'recall' && mode === 'explore' ? <Legend labels={legendLabels} aria-label={t('canvas.legend')} /> : null}
        </div>
        {!matrixItemId && mode === 'explore' ? (
          // F07 one-click link, top right where the panel opens (the panel covers it while a card is selected)
          <div className="absolute right-5 top-5 z-10 hidden lg:block">
            <MatrixLinkButton title={board.title} onPick={linkMatrix} />
          </div>
        ) : null}
        {/* zoom + toolbar share one row; on the phone the row scrolls instead of overlapping (hidden under the challenge sheet) */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 p-4 md:bottom-1 md:items-center md:p-5 [&>*]:pointer-events-auto ${
            // desktop: toolbar centred in the canvas; with the 340 px panel open (+20 gap, +20 margin) it centres in the space left of it
            panelOpen ? 'lg:pr-[380px]' : ''
          } ${
            mode === 'challenge' ? 'max-md:hidden' : ''
          }`}
        >
          {tool === 'connect' ? (
            <p role="status" className="m-0 rounded-pill bg-(--cv-panel-dark) px-3.5 py-2 text-[13px] font-semibold text-on-primary">
              {linkFrom ? t('canvas.connectFrom') : t('canvas.connectStart')}
            </p>
          ) : null}
          <div className="flex max-w-full items-end gap-[23px] overflow-x-auto md:overflow-visible [&>*]:shrink-0">
            {/* md+: zoom pinned to the corner so it never pushes the centred toolbar */}
            <div className="md:absolute md:bottom-5 md:left-5">
              <Zoom onFit={fit} />
            </div>
            <CanvasToolbar aria-label={t('canvas.toolbar.label')} items={tools} onSelect={onTool} />
          </div>
        </div>
        {/* desktop: floating 340 px panel on the right; phone: bottom sheet above the nav. The challenge needs more of the screen than a card. */}
        <div
          ref={panelWrap}
          onAnimationEnd={(e) => /^cv-(panel|sheet)-in$/.test(e.animationName) && focusPanel()}
          className={`pointer-events-none absolute inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 md:inset-x-auto md:bottom-5 md:right-5 md:top-5 md:h-auto [&>aside]:pointer-events-auto [&>aside]:max-md:w-full [&>aside]:max-md:rounded-b-none ${mode === 'challenge' ? 'h-[78%]' : 'h-[55%]'}`}
        >
            <Inspector
              board={board}
              challengePanel={
                mode === 'challenge' ? (
                  <ChallengePanel scope={scope} boardId={board.id} heat={retrievability} onExit={() => setMode('explore')} onRated={loadHeat} missing={missing} />
                ) : null
              }
              card={selected}
              entry={selected ? retrievability[selected.id] : undefined}
              connections={connections}
              endOfToday={endOfToday}
              editing={!!selected && editing === selected.id}
              onEdit={openCard}
              onClose={closeEditor}
              onSaved={onCardSaved}
              onShape={onCardShape}
              prepare={prepareCard}
              onDeselect={() => select(null)}
              onDelete={deleteCard}
              onReviewCard={reviewCard}
              onResetSize={resetSize}
              onStudy={onCardStudy}
            />
        </div>
      </section>
      <ChallengeSetupDialog open={setupOpen} onOpenChange={setSetupOpen} onStart={startChallenge} />
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

/**
 * D-097: the tested card drawn sharp over the blurred canvas, where React Flow draws it (flow → screen with the viewport
 * transform). Re-renders on pan/zoom only while a challenge item is open. Decorative copy: the real node stays in the
 * (blurred) canvas for keyboard and screen readers.
 */
const FocusLayer = memo(function FocusLayer({ node }: { node: CardNode }) {
  const [x, y, k] = useStore(transformOf);
  return (
    <div
      aria-hidden="true"
      inert
      data-testid="focus-card"
      className="pointer-events-none absolute left-0 top-0 z-[5] origin-top-left"
      style={{ transform: `translate(${node.position.x * k + x}px, ${node.position.y * k + y}px) scale(${k})` }}
    >
      <FocusCard node={node} />
    </div>
  );
});
const transformOf = (s: ReactFlowState) => s.transform;

/** Zoom 10–140% in 10% steps (ZoomControl v2); "Ajustar" fits the map. Re-renders only on zoom change. */
const Zoom = memo(function Zoom({ onFit }: { onFit: () => void }) {
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
      onFit={onFit}
    />
  );
});
