import { ptBRCore } from './core-dict';
import { referral } from './referral';
import { makeT, type Paths } from './make-t';

export const strings = { ...ptBRCore, referral } as const;
export type StringKey = Paths<typeof strings>;
export const t = makeT(strings);
