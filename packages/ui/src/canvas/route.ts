/** Roteamento ortogonal das conexões (porte de `route()` do Editor.dc.html). Funções puras. */
export type Side = 'l' | 'r' | 't' | 'b';
export type Rect = { x: number; y: number; w: number; h: number };
export type Point = readonly [number, number];
export type Route = { d: string; lx: number; ly: number };

export const MAX_RADIUS = 14;

/** Ponto de ancoragem no meio do lado `side` do retângulo. */
export function anchor(n: Rect, side: Side): Point {
  if (side === 'l') return [n.x, n.y + n.h / 2];
  if (side === 'r') return [n.x + n.w, n.y + n.h / 2];
  if (side === 't') return [n.x + n.w / 2, n.y];
  return [n.x + n.w / 2, n.y + n.h];
}

/** Caminho entre dois pontos já ancorados (`maxRadius`: 14 no desktop, 12 no celular). `as` (lado de saída) decide a orientação: l/r = horizontal-vertical-horizontal. */
export function routePoints(p: Point, as: Side, q: Point, maxRadius: number = MAX_RADIUS): Route {
  const [x1, y1] = p;
  const [x2, y2] = q;
  if (as === 'l' || as === 'r') {
    const xm = (x1 + x2) / 2;
    const dy = y2 - y1;
    const dx = x2 - x1;
    if (Math.abs(dy) < 1) return { d: `M ${x1} ${y1} L ${x2} ${y2}`, lx: xm, ly: y1 };
    const r = Math.min(maxRadius, Math.abs(dy) / 2, Math.abs(dx) / 2);
    const sy = dy > 0 ? 1 : -1;
    const sx = dx > 0 ? 1 : -1;
    return {
      d: `M ${x1} ${y1} L ${xm - sx * r} ${y1} Q ${xm} ${y1} ${xm} ${y1 + sy * r} L ${xm} ${y2 - sy * r} Q ${xm} ${y2} ${xm + sx * r} ${y2} L ${x2} ${y2}`,
      lx: xm,
      ly: (y1 + y2) / 2,
    };
  }
  const ym = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) < 1) return { d: `M ${x1} ${y1} L ${x2} ${y2}`, lx: x1, ly: ym };
  const r = Math.min(maxRadius, Math.abs(dx) / 2, Math.abs(dy) / 2);
  const sx = dx > 0 ? 1 : -1;
  const sy = dy > 0 ? 1 : -1;
  return {
    d: `M ${x1} ${y1} L ${x1} ${ym - sy * r} Q ${x1} ${ym} ${x1 + sx * r} ${ym} L ${x2 - sx * r} ${ym} Q ${x2} ${ym} ${x2} ${ym + sy * r} L ${x2} ${y2}`,
    lx: (x1 + x2) / 2,
    ly: ym,
  };
}

/** Rota entre dois nós (retângulos) pelos lados `as` e `bs`. `d` é o `path` da aresta; `lx/ly` o ponto da pílula. */
export function route(a: Rect, as: Side, b: Rect, bs: Side): Route {
  return routePoints(anchor(a, as), as, anchor(b, bs));
}
