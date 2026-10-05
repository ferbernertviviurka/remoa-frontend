import { ptBR } from './pt-BR';
import { format, type Vars } from './format';

export const strings = ptBR;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type StringKey = Paths<typeof ptBR>;

// ponytail: no useStrings() hook (ARCHITECTURE mentions it); t() works in server and client components. Add if locale switching appears.

export function t(key: StringKey, vars?: Vars): string {
  let node: unknown = strings;
  for (const part of key.split('.')) node = (node as Record<string, unknown>)[part];
  const text = String(node);
  return vars ? format(text, vars) : text;
}
