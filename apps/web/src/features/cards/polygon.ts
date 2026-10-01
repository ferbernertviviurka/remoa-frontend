// Pure geometry for occlusion masks. Every point is image-relative (0..1) so masks render at any size.
export type Pt = { x: number; y: number };
export type Box = { minX: number; minY: number; maxX: number; maxY: number };
type Rect = { left: number; top: number; width: number; height: number };

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const clampPt = (p: Pt): Pt => ({ x: clamp01(p.x), y: clamp01(p.y) });

/** Client (screen) point → 0..1 inside `rect` (the rendered image box), clamped. */
export function normalize(client: Pt, rect: Rect): Pt {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return clampPt({ x: (client.x - rect.left) / rect.width, y: (client.y - rect.top) / rect.height });
}

export function bbox(poly: Pt[]): Box {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/** Two opposite corners → 4-point polygon, clockwise from top-left. */
export function rectToPolygon(a: Pt, b: Pt): Pt[] {
  const p = clampPt(a);
  const q = clampPt(b);
  const minX = Math.min(p.x, q.x), maxX = Math.max(p.x, q.x), minY = Math.min(p.y, q.y), maxY = Math.max(p.y, q.y);
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

/** Axis-aligned 4-point polygon (what rectToPolygon makes): resized by corners instead of free vertices. */
export function isRect(poly: Pt[]): boolean {
  if (poly.length !== 4) return false;
  const b = bbox(poly);
  return poly.every((p) => (p.x === b.minX || p.x === b.maxX) && (p.y === b.minY || p.y === b.maxY));
}

/** Ray casting; points on the edge count as inside for hit-testing purposes only approximately. */
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Moves the polygon by (dx, dy), clamped so the whole shape stays inside the image (it never deforms). */
export function translate(poly: Pt[], dx: number, dy: number): Pt[] {
  const b = bbox(poly);
  const x = Math.min(1 - b.maxX, Math.max(-b.minX, dx));
  const y = Math.min(1 - b.maxY, Math.max(-b.minY, dy));
  return poly.map((p) => ({ x: p.x + x, y: p.y + y }));
}

/** Drags vertex `i` to `to`. For a rectangle the opposite corner stays fixed and it stays a rectangle. */
export function moveVertex(poly: Pt[], i: number, to: Pt): Pt[] {
  if (isRect(poly)) return rectToPolygon(poly[(i + 2) % 4]!, to);
  return poly.map((p, k) => (k === i ? clampPt(to) : p));
}

/** Index of the vertex within `radiusPx` of `p` (distances measured in pixels of `size`), or -1. */
export function nearestVertex(poly: Pt[], p: Pt, size: { width: number; height: number }, radiusPx: number): number {
  let best = -1;
  let bestD = radiusPx;
  poly.forEach((v, i) => {
    const d = Math.hypot((v.x - p.x) * size.width, (v.y - p.y) * size.height);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/** Too small to be a deliberate region (a click, not a drag). */
export function isTiny(poly: Pt[], min = 0.01): boolean {
  const b = bbox(poly);
  return b.maxX - b.minX < min || b.maxY - b.minY < min;
}

export const toPoints = (poly: Pt[]) => poly.map((p) => `${p.x},${p.y}`).join(' ');
