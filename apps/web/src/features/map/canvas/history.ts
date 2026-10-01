// Undo/redo history (FR-7): pure, capped at 50 entries. Each entry keeps the ops to redo and their inverse.
import type { MapOp } from '@remoa/contracts';

export const HISTORY_LIMIT = 50;
export type HistoryEntry = { redo: MapOp[]; undo: MapOp[] };
export type History = { past: HistoryEntry[]; future: HistoryEntry[] };

export const emptyHistory: History = { past: [], future: [] };

export function push(h: History, e: HistoryEntry): History {
  if (!e.redo.length) return h;
  return { past: [...h.past, e].slice(-HISTORY_LIMIT), future: [] };
}

/** Ops are re-sent with fresh opIds: the API ignores an opId it has already seen. */
const restamp = (ops: MapOp[], newId: () => string): MapOp[] => ops.map((o) => ({ ...o, opId: newId() }));

export function undo(h: History, newId: () => string): { history: History; ops: MapOp[] } | null {
  const e = h.past.at(-1);
  if (!e) return null;
  return { history: { past: h.past.slice(0, -1), future: [...h.future, e] }, ops: restamp(e.undo, newId) };
}

export function redo(h: History, newId: () => string): { history: History; ops: MapOp[] } | null {
  const e = h.future.at(-1);
  if (!e) return null;
  return { history: { past: [...h.past, e], future: h.future.slice(0, -1) }, ops: restamp(e.redo, newId) };
}
