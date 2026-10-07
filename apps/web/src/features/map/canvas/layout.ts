// Auto-layout (FR-10): dagre left-to-right. Pure; returns top-left positions snapped to the 8px grid.
import dagre from '@dagrejs/dagre';
import { CARD_SIZE_MAX, type Card, type Position } from '@remoa/contracts';
import { nodeSize } from '@remoa/ui';
import { snapPos } from './graph';

/** Defaults for a node of unknown size (the widest/tallest of the compact cards). */
export const CARD_W = 248;
export const CARD_H = 176;

type Sized = Pick<Card, 'type' | 'shape' | 'frontAssetId'> & Partial<Pick<Card, 'size' | 'title' | 'front' | 'preview'>>;

/** Ready-map width: images and flows wide, a question as wide as its text (short ones compact, long ones spread). */
const trailWidth = (c: Sized) => {
  if (c.type === 'image') return 432;
  if (c.type === 'flow') return 368;
  if (c.type === 'case') return 336;
  const len = (c.title?.length ?? 0) + (c.front?.length ?? 0);
  return len < 80 ? 248 : len < 115 ? 296 : len < 150 ? 344 : 392;
};
/** Lines a text takes in the NodeCard (17.5 px padding each side); `px` = average glyph width of the font. */
const linesOf = (text: string | null | undefined, w: number, px: number) => (text ? Math.ceil((text.length * px) / (w - 35)) : 0);

/**
 * Size grown from the content when the user has not resized (null = the type's default fits). `trail` (a ready map or
 * its copy, F31: `board.path`) gives a width by type and text length and a height for the whole title + question, steps, case trail or picture; other cards only
 * grow concept/note height for long questions. Heights follow the NodeCard's free-size line budget (summary 18 px a line,
 * ~100 px of label/footer/padding, 3 title lines of 22 px from 200 px).
 */
export function contentSize(c: Sized, trail = false): Card['size'] {
  if (c.size) return c.size;
  const base = nodeSize(c.type, c.shape, { frontImage: !!c.frontAssetId });
  const rect = (c.shape ?? 'rect') === 'rect';
  if (!trail || !rect || (c.frontAssetId && c.type !== 'image')) {
    if (c.type !== 'concept' && c.type !== 'note') return null;
    const extra = Math.max(0, Math.ceil(((c.title?.length ?? 0) + (c.front?.length ?? 0)) / 38) - 3);
    const h = Math.min(CARD_SIZE_MAX.h, base.h + extra * 18);
    return h > base.h ? { w: base.w, h } : null;
  }
  const w = trailWidth(c);
  const title = linesOf(c.title, w, 9.6);
  const titleH = 66; // from 200 px the NodeCard reserves 3 title lines before the summary
  const body =
    c.type === 'flow' ? 24 * (c.preview?.steps ?? 3) :
    c.type === 'case' ? 96 :
    c.type === 'image' ? Math.round((w - 35) * 0.6) :
    18 * linesOf(c.front, w, 7.2); // 12.5 px averages ~6.5 per glyph; the slack covers words that wrap early
  const h = Math.max(base.h, title > 2 ? 200 : 0, 100 + titleH + body + 8);
  return { w, h: Math.min(CARD_SIZE_MAX.h, Math.ceil(h / 8) * 8) };
}

/** D-095/D-096/D-202: the user's size, the content-fitted one, or the default per type + shape (+ question image); the same the NodeCard draws. */
export const sizeOf = (c: Sized, trail = false) => contentSize(c, trail) ?? nodeSize(c.type, c.shape, { frontImage: !!c.frontAssetId });

export function autoLayout(
  nodes: { id: string; width?: number; height?: number }[],
  edges: { source: string; target: string }[],
  origin: Position = { x: 0, y: 0 },
): Map<string, Position> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 96, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) g.setNode(n.id, { width: n.width ?? CARD_W, height: n.height ?? CARD_H });
  for (const e of edges) if (ids.has(e.source) && ids.has(e.target) && e.source !== e.target) g.setEdge(e.source, e.target);
  dagre.layout(g);
  const out = new Map<string, Position>();
  for (const n of nodes) {
    const p = g.node(n.id);
    // dagre gives centres; snapping moves each corner ≤ 4px, gaps stay ≥ 32px.
    out.set(n.id, snapPos({ x: origin.x + p.x - p.width / 2, y: origin.y + p.y - p.height / 2 }));
  }
  return out;
}
