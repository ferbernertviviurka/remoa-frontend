import { landing } from './landing';
import { mapState, challengeMode, challenge, editor, canvas, quiz, boundary } from './landing-shared';
import { format, type Vars } from './format';
export { format };

/** Subset of the dictionary used by the landing client components; `@remoa/strings/landing` keeps the rest of pt-BR out of the page bundle (P-174). */
export const strings = { landing, mapState, challengeMode, challenge, editor, canvas, quiz, boundary } as const;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type LandingStringKey = Paths<typeof strings>;

export function t(key: LandingStringKey, vars?: Vars): string {
  let node: unknown = strings;
  for (const part of key.split('.')) node = (node as Record<string, unknown>)[part];
  const text = String(node);
  return vars ? format(text, vars) : text;
}
