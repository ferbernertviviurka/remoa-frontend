import { describe, expect, it } from 'vitest';
import { strings, t } from './index';

function leaves(o: unknown): string[] {
  return typeof o === 'string' ? [o] : Object.values(o as object).flatMap(leaves);
}

describe('t()', () => {
  it('resolves keys', () => {
    expect(t('revisar.hoje')).toBe('Revisar hoje');
    expect(t('grade.again')).toBe('Não lembrei');
  });
  it('interpolates and keeps unknown vars', () => {
    expect(t('shell.header.savedAgo', { tempo: '2 min' })).toBe('Salvo há 2 min');
    expect(t('shell.header.savedAgo')).toBe('Salvo há {tempo}');
  });
});

describe('dictionary', () => {
  it('has no banned words', () => {
    for (const v of leaves(strings)) expect(v).not.toMatch(/flashcard|\bdeck\b|\bsrs\b/i);
  });
});
