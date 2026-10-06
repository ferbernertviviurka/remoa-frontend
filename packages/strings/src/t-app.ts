import { ptBRApp } from './app-full';
import { makeT, type Paths } from './make-t';

/** Dicionário do app inteiro (núcleo + `@remoa/strings/ns`): servidor e testes. Em componente cliente prefira `withStrings` (P-507). */
export const strings = ptBRApp;
export type StringKey = Paths<typeof ptBRApp>;
export const t = makeT(ptBRApp);
