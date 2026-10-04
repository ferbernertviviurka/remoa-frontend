import { describe, expect, it } from 'vitest';
import { newlyQualified } from './new-rewards';

const f = (id: string, status: 'invited' | 'signed_up' | 'qualified') => ({ id, status }) as never;

describe('newlyQualified', () => {
  it('não avisa sem registro anterior (só semeia)', () => {
    expect(newlyQualified(null, { friends: [f('a', 'qualified')] })).toEqual([]);
  });
  it('devolve só quem virou qualificado depois do registro', () => {
    const r = newlyQualified(new Set(['a']), { friends: [f('a', 'qualified'), f('b', 'qualified'), f('c', 'signed_up')] });
    expect(r.map((x) => x.id)).toEqual(['b']);
  });
});
