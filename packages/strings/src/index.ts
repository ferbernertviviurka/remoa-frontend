import { ptBR } from './pt-BR';

export const strings = ptBR;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type StringKey = Paths<typeof ptBR>;

// ponytail: no useStrings() hook (ARCHITECTURE mentions it); t() works in server and client components. Add if locale switching appears.

type Vars = Record<string, string | number>;

const plural = new Intl.PluralRules('pt-BR');

/** Index of the `}` closing the `{` at `open` (or -1). */
function closeOf(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

/**
 * Minimal ICU: `{var}` and `{n, plural, =0 {…} one {…} other {…}}` (`#` = n formatted pt-BR; branches may hold `{var}`).
 * pt-BR CLDR: select(0) === 'one' and select(1.5) === 'one' (0 and 1 are singular), so use `=0 {…}` when zero needs its own text.
 */
function format(text: string, vars: Vars): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') { out += text[i]; continue; }
    const end = closeOf(text, i);
    if (end < 0) { out += text.slice(i); break; }
    const inner = text.slice(i + 1, end);
    const head = /^\s*(\w+)\s*,\s*plural\s*,/.exec(inner);
    if (head) {
      const n = Number(vars[head[1]!]);
      const branches = new Map<string, string>();
      let rest = inner.slice(head[0].length);
      for (let m = /^\s*(=\d+|\w+)\s*\{/.exec(rest); m; m = /^\s*(=\d+|\w+)\s*\{/.exec(rest)) {
        const open = m[0].length - 1;
        const close = closeOf(rest, open);
        if (close < 0) break;
        branches.set(m[1]!, rest.slice(open + 1, close));
        rest = rest.slice(close + 1);
      }
      const branch = branches.get(`=${n}`) ?? branches.get(plural.select(n)) ?? branches.get('other') ?? '';
      out += format(branch.replace(/#/g, n.toLocaleString('pt-BR')), vars);
    } else {
      out += inner in vars ? String(vars[inner]) : `{${inner}}`;
    }
    i = end;
  }
  return out;
}

export function t(key: StringKey, vars?: Vars): string {
  let node: unknown = strings;
  for (const part of key.split('.')) node = (node as Record<string, unknown>)[part];
  const text = String(node);
  return vars ? format(text, vars) : text;
}
