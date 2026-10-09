import { questionsAdmin } from './questions-admin';
import { landing } from './landing';
import { referral } from './referral';
import { store } from './store';
import { legal } from './legal';
import { admin } from './admin';
import { blog } from './blog';
import { adminBlog } from './admin-blog';
import { ptBRApp } from './app-full';

/** Dicionário completo (servidor/testes). O bundle cliente usa `ptBRCore` + o namespace pesado de cada rota (G21, P-461). */
export const ptBR = { ...ptBRApp, landing, referral, store, legal, admin, blog, adminBlog, questionsAdmin } as const;

export type Dict = typeof ptBR;
