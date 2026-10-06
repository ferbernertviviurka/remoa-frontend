import { ptBRCore } from './core-dict';
import { account } from './account';
import { referral } from './referral';
import { makeT, type Paths } from './make-t';

// P-507: núcleo enxuto + `account` (o convite usa account.profile.name) + referral.
export const strings = { ...ptBRCore, account, referral } as const;
export type StringKey = Paths<typeof strings>;
export const t = makeT(strings);
