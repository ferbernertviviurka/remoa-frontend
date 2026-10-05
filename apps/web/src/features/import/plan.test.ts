import { describe, expect, it } from 'vitest';
import type { ApkgSummary } from '@remoa/contracts';
import { applyMapping, defaultBoardTitle, defaultPlan, estimate } from './plan';

const nt = (id: string, kind: ApkgSummary['noteTypes'][number]['kind'], fields: string[], samples: Record<string, string>[] = []) => ({ id, name: id, kind, fields, noteCount: 1, samples });
const summary: ApkgSummary = {
  decks: [{ id: 'a', name: 'CM', cardCount: 3, noteCount: 3 }, { id: 'b', name: 'CM::Sepse', cardCount: 4, noteCount: 4 }],
  noteTypes: [nt('1', 'basic', ['Front', 'Back']), nt('2', 'other', ['Only']), nt('3', 'cloze', ['Text', 'Extra']), nt('4', 'image_occlusion', ['Header', 'Image', 'Back']), nt('5', 'image_occlusion', ['Header', 'Masks'])],
  cardCount: 7,
  mediaCount: 0,
};

describe('defaultPlan', () => {
  it('selects all decks and maps by kind', () => {
    const p = defaultPlan(summary);
    expect(p.deckIds).toEqual(['a', 'b']);
    expect(p.mappings).toEqual([
      { noteTypeId: '1', cardType: 'concept', title: null, front: 'Front', back: 'Back' },
      { noteTypeId: '2', cardType: 'concept', title: null, front: 'Only', back: null },
      { noteTypeId: '3', cardType: 'concept', title: null, front: 'Text', back: 'Extra' },
      { noteTypeId: '4', cardType: 'image', title: null, front: 'Image', back: null },
      { noteTypeId: '5', cardType: 'image', title: null, front: 'Header', back: null },
    ]);
  });
});

describe('defaultMapping parity', () => {
  it('cloze takes Extra as back, image occlusion Image/Back Extra, basic back/answer fields', () => {
    const p = defaultPlan({ ...summary, noteTypes: [nt('c', 'cloze', ['Text', 'Extra']), nt('i', 'image_occlusion', ['Header', 'Image', 'Back Extra']), nt('b', 'basic', ['Front', 'Notas', 'Answer'], [{ Front: 'q', Notas: 'n', Answer: 'a' }])] });
    expect(p.mappings.map((m) => [m.front, m.back])).toEqual([['Text', 'Extra'], ['Image', 'Back Extra'], ['Front', 'Answer']]);
  });
});

describe('applyMapping', () => {
  const m = { noteTypeId: '1', cardType: 'concept' as const, title: null, front: 'F', back: 'B' };
  it('derives the title from the front, cut at 60 chars', () => {
    expect(applyMapping({ F: 'x'.repeat(80), B: 'b' }, m).title).toHaveLength(60);
  });
  it('uses the mapped title field', () => {
    expect(applyMapping({ F: 'f', B: 'b', T: 'tt' }, { ...m, title: 'T' })).toEqual({ title: 'tt', front: 'f', back: 'b' });
  });
  it('cloze: front hides gaps, back is the full text plus the extra field', () => {
    const s = { F: 'A {{c1::sepse}} e {{c2::choque::dica}}', E: 'nota' };
    expect(applyMapping(s, { ...m, back: null }, 'cloze')).toEqual({ title: 'A sepse e choque', front: 'A [...] e [dica]', back: 'A sepse e choque' });
    expect(applyMapping(s, { ...m, back: 'E' }, 'cloze').back).toBe('A sepse e choque\n\nnota');
  });
});

describe('estimate', () => {
  it('sums the selected decks', () => {
    expect(estimate(summary, ['b'])).toBe(4);
    expect(estimate(summary, ['a'])).toBe(7); // a parent includes its sub decks, as on the server
    expect(estimate(summary, ['a', 'b'])).toBe(7);
    expect(estimate(summary, [])).toBe(0);
  });
});

describe('defaultBoardTitle (F17 FR-3)', () => {
  it('one root with notes names the map; empty roots (Default) do not count', () => {
    expect(defaultBoardTitle({ ...summary, decks: [...summary.decks, { id: 'z', name: 'Default', cardCount: 0, noteCount: 0 }] }, 'x.apkg')).toBe('CM');
  });
  it('several roots: the file name without .apkg', () => {
    expect(defaultBoardTitle({ ...summary, decks: [...summary.decks, { id: 'p', name: 'Ped', cardCount: 1, noteCount: 1 }] }, 'Meu deck.APKG')).toBe('Meu deck');
  });
});
