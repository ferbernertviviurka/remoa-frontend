import { boundary } from './boundary';

/** P-410: the error boundaries ship on every route; this entry keeps the landing dictionary (~10 KB gz) and `format` out of them. */
export function t(key: `boundary.${keyof typeof boundary}`, vars?: { id: string }): string {
  const text: string = boundary[key.slice(9) as keyof typeof boundary];
  return vars ? text.replace('{id}', vars.id) : text;
}
