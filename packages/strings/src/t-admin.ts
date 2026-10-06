import { ptBRApp } from './app-full';
import { admin } from './admin';
import { adminBlog } from './admin-blog';
import { makeT, type Paths } from './make-t';

export const strings = { ...ptBRApp, admin, adminBlog } as const;
export type StringKey = Paths<typeof strings>;
export const t = makeT(strings);
