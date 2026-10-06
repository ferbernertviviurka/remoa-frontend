import { describe, expect, it } from 'vitest';
import { t } from './t-app';

// t() only accepts real keys, so exercise the formatter through a cast on a throwaway key.
import { ptBR } from './pt-BR';

const fmt = (text: string, vars: Record<string, string | number>) => {
  (ptBR.common as Record<string, string>).__tmp = text;
  return t('common.__tmp' as never, vars);
};
const P = '{n, plural, =0 {nenhuma conexão} one {# conexão} other {# conexões}}';

describe('t() ICU', () => {
  it('plural pt-BR', () => {
    expect(new Intl.PluralRules('pt-BR').select(0)).toBe('one'); // documented: 0 is singular in pt
    expect(fmt(P, { n: 0 })).toBe('nenhuma conexão');
    expect(fmt(P, { n: 1 })).toBe('1 conexão');
    expect(fmt(P, { n: 2 })).toBe('2 conexões');
    expect(fmt(P, { n: 1200 })).toBe('1.200 conexões');
  });
  it('sem =0, 0 cai em one (CLDR)', () => {
    expect(fmt('{n, plural, one {# card} other {# cards}}', { n: 0 })).toBe('0 card');
  });
  it('mantém {var} e aninha {var} nos ramos', () => {
    expect(fmt('{a} e {n, plural, one {# em {b}} other {# em {b}}}', { a: 'X', b: 'Sepse', n: 3 })).toBe('X e 3 em Sepse');
    expect(fmt('{missing}', {})).toBe('{missing}');
  });
  it('weekStreak (dias seguidos)', () => {
    const W = '{n, plural, =0 {0 dias seguidos} one {# dia seguido} other {# dias seguidos}}';
    expect(fmt(W, { n: 0 })).toBe('0 dias seguidos');
    expect(fmt(W, { n: 1 })).toBe('1 dia seguido');
    expect(fmt(W, { n: 4 })).toBe('4 dias seguidos');
  });
  it('library.summary (mapas, cards, vencimentos)', () => {
    const S = '{n, plural, one {# mapa} other {# mapas}} · {cards} cards · {due, plural, =0 {sem vencimentos} one {# vence} other {# vencem}} hoje';
    expect(fmt(S, { n: 1, cards: '6', due: 0 })).toBe('1 mapa · 6 cards · sem vencimentos hoje');
    expect(fmt(S, { n: 2, cards: '12', due: 1 })).toBe('2 mapas · 12 cards · 1 vence hoje');
    expect(fmt(S, { n: 3, cards: '42', due: 5 })).toBe('3 mapas · 42 cards · 5 vencem hoje');
  });
  it('home.greeting concorda o verbo', () => {
    expect(t('home.greeting', { periodo: 'tarde', n: 12 })).toBe('Boa tarde. 12 conceitos esperam por você.');
    expect(t('home.greeting', { periodo: 'tarde', n: 1 })).toBe('Boa tarde. 1 conceito espera por você.');
    expect(t('home.greeting', { periodo: 'noite', n: 0 })).toBe('Boa noite. Nenhum conceito espera por você.');
  });
});
