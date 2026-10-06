'use client';

import { createContext } from 'react';
import type { CardSize, RetrievabilityMap } from '@remoa/contracts';

/**
 * Lido pelos nós e conexões do mapa no celular (T5 monta o provider). Muda só com busca, camadas, seleção ou dados;
 * o zoom NUNCA entra aqui (ele vem do seletor booleano do React Flow, `useIsOverview`).
 */
export type MobileNodesCtx = {
  heat: RetrievabilityMap;
  /** Busca (FR-3): vazio = nada esmaecido. */
  query: string;
  /** Camada "Mapa de calor da memória" (FR-16/FR-18). */
  heatLayer: boolean;
  /** Camada "Rótulos das conexões" (FR-7). */
  labels: boolean;
  /** Card selecionado (as conexões dele ficam na cor da marca e mais grossas). */
  selectedId: string | null;
  /** Fim de hoje em ms: `due` até aqui = "vence hoje". */
  endOfToday: number;
  selectCard: (cardId: string) => void;
  /** Se presente, o rótulo da conexão vira botão (editar/adicionar rótulo). */
  editLabel?: (edgeId: string) => void;
  /** Espera o card criado no mapa chegar à API antes de buscar o detalhe (passos do fluxograma). */
  prepare: (cardId: string) => Promise<boolean>;
  /** Modo conectar: card de origem (os outros viram destino). */
  connectFrom?: string | null;
  /** D-1207: se presentes, o card selecionado mostra a bolinha de conectar e a alça de tamanho. */
  startConnect?: (cardId: string) => void;
  resizeCard?: (cardId: string, size: CardSize) => void;
};

const noop = () => undefined;
export const MobileNodesContext = createContext<MobileNodesCtx>({
  heat: {}, query: '', heatLayer: true, labels: true, selectedId: null, endOfToday: 0, selectCard: noop, prepare: () => Promise.resolve(false),
});
