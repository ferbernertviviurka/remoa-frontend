'use client';

import { createContext } from 'react';
import type { RetrievabilityMap } from '@remoa/contracts';

/** Read by every node/edge. Value changes only when the heat toggle/data changes; callbacks are stable. */
export type CanvasCtx = {
  /** null = "Lembrança estimada" off. */
  heat: RetrievabilityMap | null;
  openCard: (cardId: string) => void;
  saveLabel: (edgeId: string, label: string | null) => void;
};

export const CanvasContext = createContext<CanvasCtx>({ heat: null, openCard: () => undefined, saveLabel: () => undefined });
