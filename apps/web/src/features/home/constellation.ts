import type { BoardSummary } from '@remoa/contracts';
import type { ConstellationProps } from '@remoa/ui';

const W = 380;
const H = 300;

/** Mapa vivo do Hero: prévia do mapa (x/y 0..1) distribuída em 380 × 300; o nó mais ligado é o hub, com o nome do mapa. */
export function toConstellation(board: Pick<BoardSummary, 'title' | 'preview'> | undefined): ConstellationProps {
  const { nodes, edges } = board?.preview ?? { nodes: [], edges: [] };
  if (nodes.length === 0) return { nodes: [], edges: [] };
  const degree = nodes.map(() => 0);
  for (const [a, b] of edges) {
    if (degree[a] !== undefined) degree[a]++;
    if (degree[b] !== undefined) degree[b]++;
  }
  const hub = degree.indexOf(Math.max(...degree));
  return {
    edges,
    nodes: nodes.map((n, i) => {
      const x = Math.round(60 + n.x * (W - 120));
      const isHub = i === hub;
      return {
        x,
        y: Math.round(48 + n.y * (H - 96)),
        size: isHub ? 26 : n.state === 'review' ? 18 : 16,
        state: n.state,
        pulse: n.state === 'review',
        ...(isHub ? { label: board!.title, labelSide: x > 230 ? ('left' as const) : ('right' as const) } : {}),
      };
    }),
  };
}
