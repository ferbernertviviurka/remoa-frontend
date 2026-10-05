import type { ReactFlowState } from '@xyflow/react';
import { useStore } from '@xyflow/react';
import { MOBILE_MAP_SEMANTIC_ZOOM } from '@remoa/contracts';

/** F23 FR-6: abaixo de 80% entra a visão geral (só tipo, título maior e estado; sem resumo nem rótulos de conexão). */
export const isOverviewZoom = (zoom: number): boolean => zoom < MOBILE_MAP_SEMANTIC_ZOOM;

/** Seletor booleano (como o LOD do desktop, D-339): re-renderiza só ao cruzar 80%, não a cada frame do pan/pinça. */
const overview = (s: Pick<ReactFlowState, 'transform'>) => isOverviewZoom(s.transform[2]);
export const useIsOverview = (): boolean => useStore(overview);
