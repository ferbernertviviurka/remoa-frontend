import { format, type Vars } from './format';

export type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** `t` tipado sobre `dict`; cada entrada (`index`, `t-admin`, ...) referencia só os namespaces que importa, para o tree-shaking do Next (G21, D-1019). */
export function makeT<D extends object>(dict: D) {
  return (key: Paths<D>, vars?: Vars): string => {
    let node: unknown = dict;
    for (const part of key.split('.')) node = (node as Record<string, unknown>)[part];
    const text = String(node);
    return vars ? format(text, vars) : text;
  };
}
