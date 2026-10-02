'use client';

import { createContext } from 'react';
import type { NodeLayer } from '@remoa/ui';
import type { RetrievabilityMap } from '@remoa/contracts';
import type { QuizView } from './quiz-view';

/**
 * Read by every node/edge. The value changes only on layer/mode switch, data load or a topology change (edge counts);
 * callbacks are stable. Never put the selection or the viewport here (every node would re-render).
 */
export type CanvasCtx = {
  /** D-078: Estrutura / Lembrança / Cobertura. */
  layer: NodeLayer;
  /** `?modo=desafio`: turns pulse off. */
  challenge: boolean;
  /** The open challenge item as the map shows it (masks, roles); null = none. */
  quiz: QuizView | null;
  heat: RetrievabilityMap;
  /** Connections per card (Estrutura footer). */
  edgeCounts: ReadonlyMap<string, number>;
  /** Matrix item title of the board (Cobertura footer); null = board not linked. */
  coverageItem: string | null;
  /** End of today (ms): `due` at or before it = "vence hoje". */
  endOfToday: number;
  selectCard: (cardId: string) => void;
  editLabel: (edgeId: string) => void;
  prepare: (cardId: string) => Promise<boolean>;
};

const noop = () => undefined;
export const CanvasContext = createContext<CanvasCtx>({
  layer: 'recall',
  challenge: false,
  quiz: null,
  heat: {},
  edgeCounts: new Map(),
  coverageItem: null,
  endOfToday: 0,
  selectCard: noop,
  editLabel: noop,
  prepare: () => Promise.resolve(false),
});

/** "vence hoje": due today or overdue. */
export const isDue = (due: Date | string | null | undefined, endOfToday: number) => !!due && new Date(due).getTime() <= endOfToday;

export function endOfDay(now = new Date()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
