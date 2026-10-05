import type { MapState } from '@remoa/contracts';

const fill: Record<MapState, string> = {
  review: 'var(--state-review-border)',
  watch: 'var(--state-watch-border)',
  steady: 'var(--state-steady-border)',
  unknown: 'var(--state-unknown-border)',
};

/** Thumbnail of the whole map for the aside (132 × 92): one rounded block per card, colored by state. Decorative. */
export function MapThumb({ nodes }: { nodes: readonly { x: number; y: number; state: MapState }[] }) {
  if (!nodes.length) return <svg viewBox="0 0 132 92" width="100%" height="100%" aria-hidden="true" />;
  const W = 152;
  const H = 124;
  const x0 = Math.min(...nodes.map((n) => n.x));
  const y0 = Math.min(...nodes.map((n) => n.y));
  const w = Math.max(...nodes.map((n) => n.x)) - x0 + W;
  const h = Math.max(...nodes.map((n) => n.y)) - y0 + H;
  const s = Math.min(132 / w, 92 / h) * 0.82;
  const ox = (132 - w * s) / 2;
  const oy = (92 - h * s) / 2;
  return (
    <svg viewBox="0 0 132 92" width="100%" height="100%" aria-hidden="true">
      {nodes.map((n, i) => (
        <rect key={i} x={ox + (n.x - x0) * s} y={oy + (n.y - y0) * s} width={W * s} height={H * s} rx={4} fill="var(--surface)" stroke={fill[n.state]} strokeWidth={2} />
      ))}
    </svg>
  );
}
