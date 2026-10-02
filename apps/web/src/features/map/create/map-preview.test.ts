import { describe, expect, it } from 'vitest';
import { parsePath } from './map-preview';

describe('parsePath (?caminho=)', () => {
  it('aceita os 4 caminhos, "pronto" como alias de seed, e cai em blank', () => {
    expect(['pdf', 'anki', 'blank', 'seed', 'pronto', 'x', undefined].map(parsePath)).toEqual(['pdf', 'anki', 'blank', 'seed', 'seed', 'blank', 'blank']);
  });
});
