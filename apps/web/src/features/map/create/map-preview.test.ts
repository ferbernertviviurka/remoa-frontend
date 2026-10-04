import { describe, expect, it } from 'vitest';
import { parseInitial, parsePath } from './map-preview';

describe('parsePath (?caminho=)', () => {
  it('aceita os 4 caminhos, "pronto" como alias de seed, e cai em blank', () => {
    expect(['pdf', 'anki', 'blank', 'seed', 'pronto', 'x', undefined].map(parsePath)).toEqual(['pdf', 'anki', 'blank', 'seed', 'seed', 'blank', 'blank']);
  });
});

describe('parseInitial (?item=)', () => {
  const items = [{ id: 'i1' }, { id: 'i2' }];
  it('item válido: pré-seleciona, Em branco, passo Detalhes; caminho tem prioridade no caminho', () => {
    expect(parseInitial(undefined, 'i2', items)).toEqual({ path: 'blank', itemId: 'i2', step: 1 });
    expect(parseInitial('pdf', 'i2', items)).toEqual({ path: 'pdf', itemId: 'i2', step: 1 });
  });
  it('item desconhecido é ignorado em silêncio', () => {
    expect(parseInitial(undefined, 'zzz', items)).toEqual({ path: undefined, itemId: undefined, step: 0 });
    expect(parseInitial('anki', undefined, items)).toEqual({ path: 'anki', itemId: undefined, step: 0 });
    expect(parseInitial('seed', undefined, items)).toEqual({ path: 'seed', itemId: undefined, step: 1 });
    expect(parseInitial('pronto', 'i1', items)).toEqual({ path: 'seed', itemId: 'i1', step: 1 });
  });
});
