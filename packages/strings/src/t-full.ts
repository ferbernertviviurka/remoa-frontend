import { ptBR } from './pt-BR';
import { makeT, type Paths } from './make-t';

export const strings = ptBR;
export type StringKey = Paths<typeof strings>;
export const t = makeT(strings);
