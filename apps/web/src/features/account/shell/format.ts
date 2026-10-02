const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

/** "setembro de 2026". */
export const formatMonth = (d: Date | string) => month.format(new Date(d));
/** "9 de outubro de 2026". */
export const formatDay = (d: Date | string) => day.format(new Date(d));

/** Up to two initials from the name; falls back to the e-mail's first letter. */
export function initialsOf(name: string | null, email: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const src = words.length ? (words.length > 1 ? [words[0]!, words[words.length - 1]!] : [words[0]!]) : [email];
  return src.map((w) => Array.from(w)[0] ?? '').join('').toLocaleUpperCase('pt-BR');
}
