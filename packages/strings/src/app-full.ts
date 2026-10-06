import { ptBRCore } from './core-dict';
import * as more from './ns';

/** Núcleo + todos os namespaces de telas (o antigo `ptBRCore`, antes de P-507). Para servidor, testes e as entradas admin/referral/store. */
export const ptBRApp = { ...ptBRCore, ...more } as const;
