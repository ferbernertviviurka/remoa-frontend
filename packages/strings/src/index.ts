import { ptBRCore } from './core-dict';
import { makeT, type Paths } from './make-t';

/** Núcleo do dicionário: o que as telas do app (`/app/*`) usam. Namespaces pesados (admin, landing, legal, blog, referral, store) ficam nas entradas `@remoa/strings/{admin,landing,referral,store,full}` (G21, D-1019). */
export const strings = ptBRCore;

export type StringKey = Paths<typeof ptBRCore>;

// ponytail: no useStrings() hook (ARCHITECTURE mentions it); t() works in server and client components. Add if locale switching appears.

export const t = makeT(ptBRCore);
