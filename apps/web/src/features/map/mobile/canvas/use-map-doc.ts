'use client';

// F23 T5: the phone map's document state. Same graph, ops, autosave queue and undo history as the desktop editor
// (graph.ts, op-queue.ts, history.ts); no second copy of the data (FRD "Regras").
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyNodeChanges, type NodeChange, type XYPosition } from '@xyflow/react';
import { MAX_CARDS_PER_BOARD, type BoardGraph, type CardDetail, type CardSize, type CardType, type MapOp, type RetrievabilityMap, type SaveCardInput } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { useToast } from '@remoa/ui';
import { previewOf } from '@/features/cards/draft';
import { usePaywall } from '@/features/billing/paywall';
import { rememberBoard, track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { primeCardDetail } from '../../canvas/card-detail';
import { applyOps, freshen, invertAll, patchCard, snapPos, type CardCache, type CardNode, type Graph } from '../../canvas/graph';
import { emptyHistory, push, redo, undo, type History } from '../../canvas/history';
import { initialGraph, storage } from '../../canvas/initial-graph';
import { createOpQueue, type OpQueue, type QueueStatus } from '../../canvas/op-queue';

const uuid = () => crypto.randomUUID();

export function useMapDoc(data: BoardGraph) {
  const boardId = data.board.id;
  const { toast } = useToast();
  const paywall = usePaywall();
  const cache = useRef<CardCache>(new Map(data.cards.map((c) => [c.id, c])));
  const [init] = useState(() => initialGraph(data, cache.current));
  const [graph, setGraphState] = useState(init.graph);
  const g = useRef(graph);
  const setGraph = useCallback((next: Graph) => {
    g.current = next;
    setGraphState(next);
  }, []);
  const history = useRef<History>(emptyHistory);
  const [steps, setSteps] = useState({ undo: false, redo: false });
  const setHistory = (h: History) => {
    history.current = h;
    setSteps({ undo: h.past.length > 0, redo: h.future.length > 0 });
  };
  const queue = useRef<OpQueue | null>(null);
  const [status, setStatus] = useState<QueueStatus>({ state: 'saved', savedAt: null, pending: 0, dropped: false });
  const [heat, setHeat] = useState<RetrievabilityMap>({});
  const [heatLoaded, setHeatLoaded] = useState(false);
  const dragStart = useRef(new Map<string, XYPosition>());

  useEffect(() => {
    const q = createOpQueue({
      boardId,
      send: async (ops) => {
        const r = await api<{ applied: string[] }>('/v1/boards/ops', { method: 'POST', body: JSON.stringify({ ops }) });
        if (!r.ok) paywall.handle(r.error);
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
      void q.flush();
      q.dispose();
    };
  }, [boardId, init, paywall]);

  const opened = useRef(false);
  useEffect(() => {
    rememberBoard(boardId, data.board.area);
    if (!opened.current) {
      opened.current = true;
      track('board_opened', { cards: data.cards.length, edges: data.edges.length });
    }
    return () => rememberBoard(null);
  }, [boardId, data]);

  const loadHeat = useCallback(() => {
    let live = true;
    api<RetrievabilityMap>(`/v1/review/retrievability?boardId=${boardId}`)
      .then((r) => live && setHeat(r.ok ? r.data : {}))
      .catch(() => undefined)
      .finally(() => live && setHeatLoaded(true));
    return () => {
      live = false;
    };
  }, [boardId]);
  useEffect(() => loadHeat(), [loadHeat]);

  /** Applies ops locally, queues them for the API and (unless undo/redo) records them in the history (50, FR-11). */
  const commit = useCallback(
    (ops: MapOp[], opts: { undo?: MapOp[]; record?: boolean } = {}) => {
      if (!ops.length) return;
      const undoOps = opts.record === false ? [] : (opts.undo ?? invertAll(g.current, ops, cache.current, uuid));
      setGraph(applyOps(g.current, ops, cache.current));
      queue.current?.enqueue(ops);
      if (opts.record !== false) setHistory(push(history.current, { redo: ops, undo: undoOps }));
    },
    [setGraph],
  );

  const step = useCallback(
    (dir: 'undo' | 'redo') => {
      const r = (dir === 'undo' ? undo : redo)(history.current, uuid);
      if (!r) return;
      setHistory(r.history);
      commit(freshen(r.ops, cache.current, g.current), { record: false });
    },
    [commit],
  );

  const select = useCallback(
    (id: string | null) => {
      const nodes = g.current.nodes.map((n) => (!!n.selected === (n.id === id) ? n : { ...n, selected: n.id === id }));
      setGraph({ ...g.current, nodes });
    },
    [setGraph],
  );

  /** Drag end = one undoable moveCards (snap 8 px); selection changes pass through. */
  const onNodesChange = useCallback(
    (changes: NodeChange<CardNode>[]) => {
      const before = g.current;
      const moves: { cardId: string; position: XYPosition }[] = [];
      const back: typeof moves = [];
      for (const c of changes) {
        if (c.type !== 'position' || !c.position) continue;
        const prev = dragStart.current.get(c.id) ?? before.nodes.find((n) => n.id === c.id)?.position;
        if (c.dragging) {
          if (prev && !dragStart.current.has(c.id)) dragStart.current.set(c.id, prev);
          continue;
        }
        dragStart.current.delete(c.id);
        const position = snapPos(c.position);
        if (prev && (prev.x !== position.x || prev.y !== position.y)) {
          moves.push({ cardId: c.id, position });
          back.push({ cardId: c.id, position: prev });
        }
      }
      setGraph({ ...before, nodes: applyNodeChanges(changes, before.nodes) });
      if (moves.length) {
        commit([{ op: 'moveCards', opId: uuid(), boardId, moves }], { undo: [{ op: 'moveCards', opId: uuid(), boardId, moves: back }] });
      }
    },
    [boardId, commit, setGraph],
  );

  /** Creates a card at `position` (flow coords, top-left), selected. Returns its id, or null at the 500-card cap (F01 FR-11). */
  const createCard = useCallback(
    (type: CardType, position: XYPosition, title = t(`map.newCardTitle.${type}`)): string | null => {
      if (g.current.nodes.length >= MAX_CARDS_PER_BOARD) {
        toast({ title: t('map.limit', { max: MAX_CARDS_PER_BOARD }), tone: 'danger' });
        return null;
      }
      const id = uuid();
      commit([{ op: 'createCard', opId: uuid(), boardId, card: { id, type, title, position: snapPos(position) } }]);
      track('card_created', { type, origin: 'manual' });
      select(id);
      return id;
    },
    [boardId, commit, select, toast],
  );

  /** F23 T6 (Q-086): connects two cards by touch. Refuses itself and a repeated direction (same rule as the desktop). */
  const createEdge = useCallback(
    (from: string, to: string): { ok: true; id: string } | { ok: false; reason: 'self' | 'duplicate' } => {
      if (from === to) return { ok: false, reason: 'self' };
      if (g.current.edges.some((e) => e.source === from && e.target === to)) return { ok: false, reason: 'duplicate' };
      const id = uuid();
      commit([{ op: 'createEdge', opId: uuid(), boardId, edge: { id, fromCardId: from, toCardId: to, label: null } }]);
      track('edge_created', { hasLabel: false });
      return { ok: true, id };
    },
    [boardId, commit],
  );

  /** D-1207: the corner handle let go = one undoable resizeCards (same op and `card.size` as the desktop, D-202). */
  const resizeCard = useCallback(
    (cardId: string, size: CardSize) => {
      const cur = g.current.nodes.find((n) => n.id === cardId)?.data.card.size;
      if (cur?.w === size.w && cur?.h === size.h) return;
      commit([{ op: 'resizeCards', opId: uuid(), boardId, sizes: [{ cardId, size }] }]);
    },
    [boardId, commit],
  );

  /** Edge label (empty = none). Its own undo step, after the one of the edge. */
  const setEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      const next = label.trim() || null;
      if (g.current.edges.find((e) => e.id === edgeId)?.data?.label === next) return;
      commit([{ op: 'updateEdgeLabel', opId: uuid(), boardId, edgeId, label: next }]);
    },
    [boardId, commit],
  );

  /** A card created on the map exists server-side only once its createCard op is sent: wait before GET/PUT (T7 editor). */
  const prepareCard = useCallback(
    (cardId: string) => queue.current?.sent((o) => o.op === 'createCard' && o.card.id === cardId) ?? Promise.resolve(false),
    [],
  );

  /** The T7 editor saved a card: reflect it on the map (not a map op: nothing queued or undoable). */
  const onCardSaved = useCallback(
    (d: CardDetail, input: SaveCardInput) => {
      primeCardDetail(d);
      setGraph(patchCard(g.current, cache.current, d.id, {
        title: d.title, shape: d.shape, front: d.front, frontAssetId: d.frontAssetId, back: d.back, source: d.source, preview: d.preview ?? previewOf(input),
      }));
    },
    [setGraph],
  );

  /** T7: an abandoned new card goes away (undoable like any delete). */
  const discardCard = useCallback(
    (cardId: string) => {
      if (g.current.nodes.some((n) => n.id === cardId)) commit([{ op: 'deleteCards', opId: uuid(), boardId, cardIds: [cardId] }]);
    },
    [boardId, commit],
  );

  const retry = useCallback(() => {
    if (queue.current?.status().dropped) window.location.reload(); // the API rejected edits: resync with the server
    else void queue.current?.retry();
  }, []);

  return { graph, graphRef: g, cache, status, heat, heatLoaded, loadHeat, steps, step, select, onNodesChange, createEdge, resizeCard, setEdgeLabel, createCard, discardCard, prepareCard, onCardSaved, retry, initiallyEmpty: init.graph.nodes.length === 0 };
}

export type MapDoc = ReturnType<typeof useMapDoc>;
