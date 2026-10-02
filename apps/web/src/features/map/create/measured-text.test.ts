import { describe, expect, it } from 'vitest';
import { splitLines } from './measured-text';

const widths = (s: string) => s.length * 10; // fake measure: 10 px per character

describe('splitLines', () => {
  it('breaks greedily at the measured width', () => {
    expect(splitLines('aaa bbb ccc ddd', 70, widths)).toEqual(['aaa bbb', 'ccc ddd']);
    expect(splitLines('aaa bbb ccc ddd', 1000, widths)).toEqual(['aaa bbb ccc ddd']);
  });
  it('a word wider than the line sits alone; empty text has no lines', () => {
    expect(splitLines('a muitolongapalavra b', 50, widths)).toEqual(['a', 'muitolongapalavra', 'b']);
    expect(splitLines('', 50, widths)).toEqual([]);
  });
  it('reflows when the width changes', () => {
    expect(splitLines('aa bb cc', 50, widths)).toEqual(['aa bb', 'cc']);
    expect(splitLines('aa bb cc', 30, widths)).toEqual(['aa', 'bb', 'cc']);
  });
});
