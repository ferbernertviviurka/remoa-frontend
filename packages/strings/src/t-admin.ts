import { ptBRCore } from './core-dict';
import { admin } from './admin';
import { adminBlog } from './admin-blog';
import { makeT, type Paths } from './make-t';

export const strings = { ...ptBRCore, admin, adminBlog } as const;
export type StringKey = Paths<typeof strings>;
export const t = makeT(strings);
