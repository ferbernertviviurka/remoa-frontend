import { describe, expect, it } from 'vitest';
import { countDue, countEdges } from './map-canvas';
import { floatingEnds, labelsVisible } from './link-edge';
import { nodeFooter } from './card-node';
import { endOfDay, isDue } from './canvas-context';
import { saveText } from './canvas-header';

const at = (zoom: number) => ({ transform: [0, 0, zoom] as [number, number, number] });

describe('canvas view rules (G01)', () => {
  it('rótulos de conexão somem abaixo de 70% de zoom', () => {
    expect(labelsVisible(at(0.69))).toBe(false);
    expect(labelsVisible(at(0.7))).toBe(true);
    expect(labelsVisible(at(1))).toBe(true);
  });
  it('conexão sai e entra pelos lados que se encaram', () => {
    const card = (x: number, y: number) => ({ x, y, w: 216, h: 120 });
    const right = floatingEnds(card(0, 0), card(400, 30));
    expect([right.sourcePosition, right.targetPosition, right.sourceX, right.targetX]).toEqual(['right', 'left', 216, 400]);
    const left = floatingEnds(card(400, 0), card(0, 0));
    expect([left.sourcePosition, left.targetPosition]).toEqual(['left', 'right']);
    const down = floatingEnds(card(0, 0), card(40, 300));
    expect([down.sourcePosition, down.targetPosition, down.sourceY, down.targetY]).toEqual(['bottom', 'top', 120, 300]);
    const up = floatingEnds(card(0, 300), card(0, 0));
    expect([up.sourcePosition, up.targetPosition]).toEqual(['top', 'bottom']);
  });
});

describe('T5: rodapé dos nós por camada (Editor.dc.html)', () => {
  const base = { state: 'review' as const, r: 0.58, due: true, edges: 2, item: 'Sepse e choque séptico' };
  it('Lembrança: estado · % · vence hoje; sem revisão', () => {
    expect(nodeFooter({ ...base, layer: 'recall' })).toBe('Revisitar · 58% · vence hoje');
    expect(nodeFooter({ ...base, layer: 'recall', due: false, state: 'steady', r: 0.94 })).toBe('Mais estável · 94%');
    expect(nodeFooter({ ...base, layer: 'recall', state: 'unknown', r: undefined })).toBe('Sem revisões ainda');
  });
  it('Estrutura: conexões com plural; Cobertura: item da matriz', () => {
    expect(nodeFooter({ ...base, layer: 'structure' })).toBe('2 conexões');
    expect(nodeFooter({ ...base, layer: 'structure', edges: 1 })).toBe('1 conexão');
    expect(nodeFooter({ ...base, layer: 'structure', edges: 0 })).toBe('0 conexões');
    expect(nodeFooter({ ...base, layer: 'coverage' })).toBe('Entra em Sepse e choque séptico');
    expect(nodeFooter({ ...base, layer: 'coverage', item: null })).toBe('Fora da matriz do Enamed');
  });
});

describe('T5: dados derivados do painel', () => {
  const eod = endOfDay(new Date('2026-10-01T10:00:00'));
  it('vence hoje = due até o fim do dia (atrasado conta)', () => {
    expect(isDue('2026-10-01T22:00:00', eod)).toBe(true);
    expect(isDue('2026-09-20T08:00:00', eod)).toBe(true);
    expect(isDue('2026-10-02T00:30:00', eod)).toBe(false);
    expect(isDue(null, eod)).toBe(false);
  });
  it('vencidos hoje (CTA do cabeçalho)', () => {
    const heat = {
      a: { r: 0.5, state: 'review' as const, due: new Date('2026-10-01T09:00:00') },
      b: { r: 0.9, state: 'steady' as const, due: new Date('2026-10-09T09:00:00') },
    };
    expect(countDue([{ id: 'a' }, { id: 'b' }, { id: 'c' }], heat, eod)).toBe(1);
  });
  it('contagem de conexões mantém a referência quando nada mudou (nós não re-renderizam)', () => {
    const e = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }];
    const first = countEdges(e);
    expect([...first]).toEqual([['a', 1], ['b', 2], ['c', 1]]);
    expect(countEdges([...e], first)).toBe(first);
    expect(countEdges(e.slice(1), first)).not.toBe(first);
  });
  it('"Salvo há N min" a partir do autosave ou do updatedAt do mapa', () => {
    const now = new Date('2026-10-01T10:00:00').getTime();
    expect(saveText({ state: 'saved', savedAt: now - 2 * 60_000 }, new Date(0), now)).toBe('Salvo há 2 min');
    expect(saveText({ state: 'saved', savedAt: null }, new Date(now - 30_000), now)).toBe('Salvo agora');
    expect(saveText({ state: 'saved', savedAt: null }, new Date(now - 3 * 3600_000), now)).toBe('Salvo há 3 h');
    expect(saveText({ state: 'saving', savedAt: null }, new Date(0), now)).toBe('Salvando…');
    expect(saveText({ state: 'offline', savedAt: null }, new Date(0), now)).toBe('Sem conexão, salvando depois');
  });
});
