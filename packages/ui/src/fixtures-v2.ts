/** Dados de exemplo dos mocks v2, só para stories e testes (os textos finais vêm de @remoa/strings). */
import type { ConstellationNode } from './constellation';

export const sepsePreview = {
  nodes: [
    { x: 0.43, y: 0.43, state: 'steady' as const }, { x: 0.1, y: 0.18, state: 'watch' as const }, { x: 0.72, y: 0.14, state: 'watch' as const },
    { x: 0.04, y: 0.76, state: 'review' as const }, { x: 0.33, y: 0.83, state: 'review' as const }, { x: 0.64, y: 0.72, state: 'unknown' as const },
  ],
  edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]] as [number, number][],
};

export const constellationNodes: ConstellationNode[] = [
  { x: 60, y: 64, size: 18, state: 'review', pulse: true, label: 'Choque séptico' },
  { x: 150, y: 122, size: 26, state: 'steady', label: 'Sepse' },
  { x: 240, y: 58, size: 16, state: 'watch' },
  { x: 305, y: 142, size: 22, state: 'review', pulse: true, label: 'Pacote da 1ª hora', labelSide: 'left' },
  { x: 72, y: 178, size: 16, state: 'unknown' },
  { x: 344, y: 52, size: 12, state: 'steady' },
];
export const constellationEdges: [number, number][] = [[1, 0], [1, 2], [1, 3], [1, 4], [2, 5], [2, 3]];
