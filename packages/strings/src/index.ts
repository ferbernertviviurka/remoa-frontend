import { ptBR } from './pt-BR';

export const strings = ptBR;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type StringKey = Paths<typeof ptBR>;

// ponytail: no useStrings() hook (ARCHITECTURE mentions it); t() works in server and client components. Add if locale switching appears.
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let node: unknown = strings;
  for (const part of key.split('.')) node = (node as Record<string, unknown>)[part];
  const text = String(node);
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}
