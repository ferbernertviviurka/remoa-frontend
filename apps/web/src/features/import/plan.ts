import type { ApkgSummary, FieldMapping } from '@remoa/contracts';

type NoteType = ApkgSummary['noteTypes'][number];
export type Preview = { title: string; front: string; back: string };

const BACKISH = /^(back|verso|answer|resposta)$/i;
const pick = (fields: string[], names: string[]) => names.map((n) => fields.find((f) => f.toLowerCase() === n)).find(Boolean) ?? null;
const hasText = (nt: NoteType, f: string) => nt.samples.some((s) => (s[f] ?? '') !== '');

/** Mirrors the server's defaultMapping (remoa-backend packages/anki), so the preview shows what an untouched import does. */
export function defaultMapping(nt: NoteType): FieldMapping {
  const filled = nt.fields.filter((f) => hasText(nt, f));
  const first = filled[0] ?? nt.fields[0] ?? '';
  const base = { noteTypeId: nt.id, title: null };
  if (nt.kind === 'image_occlusion') {
    const front = nt.fields.find((f) => /^image$/i.test(f)) ?? nt.fields.find((f) => /image|imagem/i.test(f) && !/mask|occlusion/i.test(f)) ?? first;
    return { ...base, cardType: 'image', front, back: pick(nt.fields, ['back extra', 'remarks', 'comments']) };
  }
  if (nt.kind === 'cloze') {
    const front = nt.samples.length ? (nt.fields.find((f) => nt.samples.some((s) => /\{\{c\d+::/.test(s[f] ?? ''))) ?? first) : first;
    return { ...base, cardType: 'concept', front, back: nt.fields.find((f) => /^(back extra|extra|verso extra)$/i.test(f) && f !== front) ?? null };
  }
  if (nt.kind === 'basic') {
    const front = hasText(nt, nt.fields[0] ?? '') || !filled.length ? (nt.fields[0] ?? '') : first;
    const back = nt.fields.find((f) => BACKISH.test(f) && f !== front) ?? filled.find((f) => f !== front) ?? nt.fields.find((f) => f !== front) ?? null;
    return { ...base, cardType: 'concept', front, back };
  }
  return { ...base, cardType: 'concept', front: first, back: filled.find((f) => f !== first) ?? null };
}

/** All decks selected; one mapping per note type. */
export function defaultPlan(summary: ApkgSummary): { deckIds: string[]; mappings: FieldMapping[] } {
  return { deckIds: summary.decks.map((d) => d.id), mappings: summary.noteTypes.map(defaultMapping) };
}

const CLOZE = /\{\{c\d+::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g;
const TITLE_MAX = 60;

/**
 * Sample-only preview, same rules as the server. Cloze: front hides the gaps (`[hint]` or `[...]`), back is always the
 * full text (answers revealed) plus the mapped extra field. No title mapped = derived (60 chars).
 */
export function applyMapping(sample: Record<string, string>, mapping: FieldMapping, kind?: NoteType['kind']): Preview {
  const raw = (f: string | null) => (f ? (sample[f] ?? '') : '');
  const clip = (x: string) => x.slice(0, TITLE_MAX);
  if (kind === 'cloze') {
    const src = raw(mapping.front);
    const full = src.replace(CLOZE, (_m, a: string) => a);
    const extra = mapping.back && mapping.back !== mapping.front ? raw(mapping.back) : '';
    return {
      title: mapping.title ? raw(mapping.title) : clip(full),
      front: src.replace(CLOZE, (_m, _a: string, h?: string) => (h ? `[${h}]` : '[...]')),
      back: extra ? `${full}\n\n${extra}` : full,
    };
  }
  const front = raw(mapping.front);
  return { title: mapping.title ? raw(mapping.title) : clip(front), front, back: raw(mapping.back) };
}

/** Notes in the selected decks (and their sub decks, like the server): one Remoa card per note. */
export function estimate(summary: ApkgSummary, deckIds: string[]): number {
  const picked = summary.decks.filter((d) => deckIds.includes(d.id));
  return summary.decks.filter((d) => picked.some((p) => d.name === p.name || d.name.startsWith(`${p.name}::`))).reduce((n, d) => n + d.noteCount, 0);
}

/** F17 FR-3: the single root deck with notes names the map; several roots (or none) fall back to the file name without `.apkg`. */
export function defaultBoardTitle(summary: ApkgSummary, fileName: string): string {
  const roots = summary.decks.filter((d) => !d.name.includes('::') && estimate(summary, [d.id]) > 0);
  const name = (roots.length === 1 ? roots[0]!.name : fileName.replace(/\.apkg$/i, '')).trim();
  return name.slice(0, 120);
}
