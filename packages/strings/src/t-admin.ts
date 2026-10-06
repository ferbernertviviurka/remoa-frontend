import { ptBRCore } from './core-dict';
import { boards } from './ns-parts/boards';
import { admin } from './admin';
import { adminBlog } from './admin-blog';
import { makeT, type Paths } from './make-t';

// P-507: núcleo enxuto + `boards` (área dos mapas nas listas do admin) + admin.
export const strings = { ...ptBRCore, boards, admin, adminBlog } as const;
export type StringKey = Paths<typeof strings>;
export const t = makeT(strings);
