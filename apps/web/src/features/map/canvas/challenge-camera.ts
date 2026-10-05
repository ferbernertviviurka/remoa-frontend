// D-689: during a map challenge the camera zooms in on each tested card (Fernando: "zoom in no card em questão ... bem smooth").
/** The tested card is shown between 100% and 125%: as big as the free area allows, never smaller than 100% (it is a zoom in). */
export const CHALLENGE_ZOOM = 1.25;
const TOLERANCE = 0.1;

/**
 * Target zoom for the tested card, or null when it is already well framed (inside the free area and within 10% of the target),
 * so consecutive cards that sit together do not shake the camera.
 */
export function challengeZoom(o: { card: { w: number; h: number }; free: { w: number; h: number }; zoom: number; inside: boolean }): number | null {
  const k = Math.max(1, Math.min(CHALLENGE_ZOOM, o.free.w / o.card.w, o.free.h / o.card.h));
  return o.inside && Math.abs(o.zoom - k) / k < TOLERANCE ? null : k;
}
