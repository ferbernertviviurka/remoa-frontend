import { describe, expect, it } from 'vitest';
import { CARD_SIZE_MAX, CARD_SIZE_MIN } from '@remoa/contracts';
import { mobileSizeOf, resizedBy } from './resize';

describe('tamanho do card no celular (D-1207)', () => {
  it('sem tamanho salvo usa o padrão do tipo; com tamanho salvo usa o salvo', () => {
    expect(mobileSizeOf({ type: 'concept', size: null })).toEqual({ w: 152, h: 124 });
    expect(mobileSizeOf({ type: 'flow', size: null })).toEqual({ w: 152, h: 172 });
    expect(mobileSizeOf({ type: 'concept', size: { w: 300, h: 200 } })).toEqual({ w: 300, h: 200 });
  });
  it('o dedo em px de tela vira px do mapa pelo zoom e cai na grade de 8', () => {
    expect(resizedBy({ w: 152, h: 124 }, 50, 30, 1)).toEqual({ w: 200, h: 152 });
    expect(resizedBy({ w: 152, h: 124 }, 100, 100, 2)).toEqual({ w: 200, h: 176 });
  });
  it('fica dentro do mínimo e do máximo do contrato', () => {
    expect(resizedBy({ w: 152, h: 124 }, -1000, -1000, 1)).toEqual({ w: CARD_SIZE_MIN.w, h: CARD_SIZE_MIN.h });
    expect(resizedBy({ w: 152, h: 124 }, 5000, 5000, 1)).toEqual({ w: CARD_SIZE_MAX.w, h: CARD_SIZE_MAX.h });
  });
});
