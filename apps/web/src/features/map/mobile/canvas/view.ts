// F23 T5: pure helpers of the phone canvas (initial view, zoom steps, search).
import { MOBILE_MAP_ZOOM_MAX, MOBILE_MAP_ZOOM_MIN, type MobileMapView, type RetrievabilityMap } from '@remoa/contracts';

export const ZOOM_STEP = 0.25;
/** Cards above this render only when visible (Q-087). */
export const VIRTUALIZE_ABOVE = 150;

export const clampZoom = (z: number) => Math.min(MOBILE_MAP_ZOOM_MAX, Math.max(MOBILE_MAP_ZOOM_MIN, z));
/** −/+ buttons: 25% steps on the 25% grid (60% → 75%, 100% → 125%), inside 10–300% (below 25% the next step is the floor). */
export function stepZoom(z: number, dir: 1 | -1): number {
  const k = Math.round(z / ZOOM_STEP);
  const onGrid = Math.abs(z - k * ZOOM_STEP) < 0.001;
  const next = dir > 0 ? (onGrid ? k + 1 : Math.ceil(z / ZOOM_STEP)) : onGrid ? k - 1 : Math.floor(z / ZOOM_STEP);
  return clampZoom(next * ZOOM_STEP);
}
/** Phone card box (T4 MobileCardNode base size): the initial view centres on it before React Flow measures. */
export const MOBILE_CARD = { w: 152, h: 124 };

type Placed = { id: string; position: { x: number; y: number }; updatedAt?: Date | string; w: number; h: number };

/**
 * Q-083/D-667: the card the map opens on. Most overdue (earliest `due` up to now); none due → the most recently edited.
 * Returns its centre in flow coordinates, or null for an empty map.
 */
export function urgentCenter(cards: readonly Placed[], heat: RetrievabilityMap, now: number): { x: number; y: number } | null {
  let best: Placed | undefined;
  let bestDue = Infinity;
  for (const c of cards) {
    const due = heat[c.id]?.due;
    const at = due ? new Date(due).getTime() : Infinity;
    if (at <= now && at < bestDue) {
      best = c;
      bestDue = at;
    }
  }
  if (!best) best = [...cards].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())[0];
  return best ? { x: best.position.x + best.w / 2, y: best.position.y + best.h / 2 } : null;
}

/** Saved view (centre in flow coords) → React Flow viewport for a pane of `w`×`h` px. */
export const toViewport = (v: MobileMapView, w: number, h: number) => ({ x: w / 2 - v.x * v.zoom, y: h / 2 - v.y * v.zoom, zoom: v.zoom });
/** React Flow viewport → saved view (centre in flow coords). */
export const fromViewport = (vp: { x: number; y: number; zoom: number }, w: number, h: number): MobileMapView => ({
  x: (w / 2 - vp.x) / vp.zoom,
  y: (h / 2 - vp.y) / vp.zoom,
  zoom: clampZoom(vp.zoom),
});

/** `--map-ease` (cubic-bezier(.22,1,.36,1)) is easeOutQuint: same curve for React Flow's animated viewport. */
export const mapEase = (t: number) => 1 - (1 - t) ** 5;
/** motion.css rule: `data-motion` on <html> wins (reduced/full), otherwise the system preference. */
export function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const m = document.documentElement.dataset.motion;
  return m === 'reduced' || (m !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
/** 450 ms camera moves (FR "Pan, zoom e foco no card"); 0 with reduced motion. */
export const cameraMove = () => ({ duration: reducedMotion() ? 0 : 450, ease: mapEase });
