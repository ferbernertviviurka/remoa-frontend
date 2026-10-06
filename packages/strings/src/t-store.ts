import { ptBRCore } from './core-dict';
import { store } from './store';
import { makeT, type Paths } from './make-t';

export const strings = { ...ptBRCore, store } as const;
export type StringKey = Paths<typeof strings>;
export const t = makeT(strings);
