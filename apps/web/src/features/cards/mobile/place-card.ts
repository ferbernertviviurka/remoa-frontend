export type Pt = { x: number; y: number };
const snap = (n: number) => Math.round(n / 8) * 8;

/**
 * Where a new card goes: centred on `anchor` (selected card, else the view centre), then slid along the grid until
 * no other card sits (mostly) on it. `size` = the mobile card box (152 × 124, T4).
 */
export function placeCard(anchor: Pt, taken: Pt[], size = { w: 152, h: 124 }): Pt {
  let p = { x: snap(anchor.x - size.w / 2), y: snap(anchor.y - size.h / 2) };
  const hit = (q: Pt) => taken.some((n) => Math.abs(n.x - q.x) < size.w - 16 && Math.abs(n.y - q.y) < size.h - 16);
  for (let i = 0; i < 50 && hit(p); i++) p = { x: snap(p.x + size.w + 32), y: snap(p.y + (i % 2 ? size.h + 32 : 0)) };
  return p;
}
